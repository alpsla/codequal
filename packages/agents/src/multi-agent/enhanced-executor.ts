import { Agent } from '../agent';
import { createLogger, LoggableData } from '@codequal/core/utils';
import { v4 as uuidv4 } from 'uuid';
import { 
  AgentConfig, 
  AnalysisStrategy,
  MultiAgentConfig, 
  MultiAgentResult, 
  RepositoryData,
  AuthenticatedUser,
  SecurityEvent,
  AuthenticationError
} from './types';
import { MultiAgentValidator } from './validator';
import { VectorContextService } from './vector-context-service';
import { MCPContextManager, MCPCoordinationStrategy } from './mcp-context-manager';

/**
 * Vector DB search result for agent context
 * 🔒 SECURITY: Designed to prevent sensitive data exposure
 */
export interface VectorSearchResult {
  content: string; // Content should be sanitized by VectorContextService
  metadata: {
    repository_id: string; // Only populated if user has access to repository
    content_type: string;
    file_path?: string; // 🔒 Should be omitted for cross-repository results
    language?: string;
    framework?: string;
    analysis_type?: string;
    severity?: string;
    importance_score?: number;
    created_at: string;
    // 🔒 SECURITY NOTE: No user_id or sensitive identifiers should be exposed
  };
  similarity_score: number;
}

/**
 * Repository context from Vector DB
 */
export interface RepositoryVectorContext {
  repositoryId: string;
  recentAnalysis: VectorSearchResult[];
  historicalPatterns: VectorSearchResult[];
  similarIssues: VectorSearchResult[];
  confidenceScore: number;
  lastUpdated: Date;
}

/**
 * Model blacklist manager interface
 */
export interface ModelBlacklistManager {
  isBlacklisted(provider: string, role: string): boolean;
  addToBlacklist(provider: string, role: string, reason: string): Promise<void>;
  getAvailableModelsForRole(role: string): string[];
  findReplacement(failedProvider: string, role: string): Promise<string | null>;
}

/**
 * Enhanced agent context with repository data and cross-repo patterns
 */
export interface EnhancedAgentContext {
  prData: RepositoryData;
  vectorContext: RepositoryVectorContext;
  crossRepoPatterns: VectorSearchResult[];
  additionalContext?: Record<string, any>;
}

/**
 * Enhanced execution options with smart resource management
 */
export interface EnhancedExecutionOptions {
  /** Enable debug logging */
  debug?: boolean;
  
  /** Global timeout in milliseconds (default: 5 minutes) */
  timeout?: number;
  
  /** Per-agent timeout in milliseconds (default: 2 minutes) */
  agentTimeout?: number;
  
  /** Maximum number of retries per agent */
  maxRetries?: number;
  
  /** Retry delay in milliseconds */
  retryDelay?: number;
  
  /** Maximum concurrent agents (resource management) */
  maxConcurrentAgents?: number;
  
  /** Per-model token limits (prevent inefficient models) */
  modelTokenLimits?: Record<string, number>;
  
  /** Custom context to pass to agents */
  context?: Record<string, any>;
  
  /** Priority-based execution (higher priority agents get resources first) */
  priorityBasedExecution?: boolean;
  
  /** Enable detailed performance monitoring */
  enableMetrics?: boolean;
  
  /** Callback for progress updates */
  onProgress?: (progress: ExecutionProgress) => void;
  
  /** Resource optimization strategy */
  resourceStrategy?: 'balanced' | 'speed' | 'cost-optimized';
  
  /** Model blacklist manager */
  modelBlacklist?: ModelBlacklistManager;
  
  /** Enable Model Context Protocol (MCP) coordination (default: true) */
  enableMCP?: boolean;
}

/**
 * Execution progress information
 */
export interface ExecutionProgress {
  /** Total agents to execute */
  totalAgents: number;
  
  /** Completed agents */
  completedAgents: number;
  
  /** Failed agents */
  failedAgents: number;
  
  /** Currently running agents */
  runningAgents: string[];
  
  /** Overall progress percentage */
  progressPercentage: number;
  
  /** Current execution phase */
  phase: 'initialization' | 'repository-provider' | 'primary-execution' | 'secondary-execution' | 'orchestration' | 'reporting' | 'complete';
  
  /** Token usage so far */
  tokenUsage: {
    input: number;
    output: number;
    total: number;
    estimatedCost: number;
  };
  
  /** Execution start time */
  startTime: number;
  
  /** Estimated completion time */
  estimatedCompletion?: number;
}

/**
 * Enhanced agent execution result with detailed metrics
 */
export interface EnhancedAgentExecutionResult {
  /** Agent configuration */
  config: AgentConfig;
  
  /** Analysis result */
  result: any;
  
  /** Error if any */
  error?: Error;
  
  /** Execution timing */
  timing: {
    startTime: number;
    endTime: number;
    duration: number;
    queueTime?: number; // Time spent waiting in queue
  };
  
  /** Resource usage */
  resources: {
    tokenUsage?: {
      input: number;
      output: number;
      total: number;
    };
    estimatedCost?: number;
    memoryUsage?: number;
  };
  
  /** Execution metadata */
  metadata: {
    executionId: string;
    retryCount: number;
    usedFallback: boolean;
    fallbackAgent?: string;
    fallbackAttempts: number;
    priority?: number;
    timeoutOccurred: boolean;
  };
  
  /** Performance metrics */
  performance: {
    throughput?: number; // tokens per second
    efficiency?: number; // useful output ratio
    reliability?: number; // success rate
  };
}

/**
 * Smart resource manager for controlling agent execution with model efficiency tracking
 */
class SmartResourceManager {
  private readonly maxConcurrent: number;
  private readonly modelLimits: Record<string, number>;
  private readonly blacklistManager?: ModelBlacklistManager;
  private readonly logger = createLogger('SmartResourceManager');
  
  private currentExecutions = new Set<string>();
  private modelTokenUsage = new Map<string, number>();
  private executionQueue: Array<{
    agentId: string;
    priority: number;
    execute: () => Promise<any>;
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }> = [];
  
  constructor(
    maxConcurrent = 5, 
    modelLimits: Record<string, number> = {},
    blacklistManager?: ModelBlacklistManager
  ) {
    this.maxConcurrent = maxConcurrent;
    this.modelLimits = modelLimits;
    this.blacklistManager = blacklistManager;
  }
  
  /**
   * Request execution slot for an agent
   */
  async requestExecution<T>(
    agentId: string,
    priority: number,
    executor: () => Promise<T>
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.executionQueue.push({
        agentId,
        priority,
        execute: executor,
        resolve,
        reject
      });
      
      // Sort queue by priority (higher priority first)
      this.executionQueue.sort((a, b) => b.priority - a.priority);
      
      this.processQueue();
    });
  }
  
  /**
   * Process the execution queue
   */
  private async processQueue(): Promise<void> {
    if (this.currentExecutions.size >= this.maxConcurrent || this.executionQueue.length === 0) {
      return;
    }
    
    const item = this.executionQueue.shift();
    if (!item) return;
    
    this.currentExecutions.add(item.agentId);
    
    try {
      const result = await item.execute();
      item.resolve(result);
    } catch (error) {
      item.reject(error);
    } finally {
      this.currentExecutions.delete(item.agentId);
      // Process next item in queue
      setImmediate(() => this.processQueue());
    }
  }
  
  /**
   * Check if model is within efficiency limits
   */
  async checkModelEfficiency(provider: string, role: string, estimatedTokens: number): Promise<{ canUse: boolean, replacement?: string }> {
    // Check blacklist first
    if (this.blacklistManager?.isBlacklisted(provider, role)) {
      const replacement = await this.blacklistManager.findReplacement(provider, role);
      return { canUse: false, replacement: replacement || undefined };
    }
    
    // Check model-specific token limits
    const limit = this.modelLimits[provider];
    if (limit && estimatedTokens > limit) {
      this.logger.warn(`Model ${provider} estimated ${estimatedTokens} tokens, exceeds limit ${limit}`);
      
      // Track inefficiency and potentially blacklist
      await this.trackModelInefficiency(provider, role, estimatedTokens, limit);
      
      const replacement = await this.blacklistManager?.findReplacement(provider, role);
      return { canUse: false, replacement: replacement || undefined };
    }
    
    return { canUse: true };
  }
  
  /**
   * Track model token usage for efficiency monitoring
   */
  trackModelUsage(provider: string, actualTokens: number): void {
    const currentUsage = this.modelTokenUsage.get(provider) || 0;
    this.modelTokenUsage.set(provider, currentUsage + actualTokens);
  }
  
  /**
   * Track model inefficiency and potentially blacklist
   */
  private async trackModelInefficiency(provider: string, role: string, estimatedTokens: number, limit: number): Promise<void> {
    const ratio = estimatedTokens / limit;
    
    if (ratio > 2.0 && this.blacklistManager) {
      // Model is using more than 2x the expected tokens - blacklist it
      await this.blacklistManager.addToBlacklist(
        provider, 
        role, 
        `Excessive token usage: ${estimatedTokens} tokens (${ratio.toFixed(1)}x limit)`
      );
      
      this.logger.warn(`Blacklisted ${provider} for role ${role} due to excessive token usage`);
    }
  }
  
  /**
   * Get current resource status
   */
  getStatus() {
    return {
      currentExecutions: this.currentExecutions.size,
      maxConcurrent: this.maxConcurrent,
      queueLength: this.executionQueue.length,
      modelUsage: Object.fromEntries(this.modelTokenUsage),
      modelLimits: this.modelLimits
    };
  }
}

/**
 * Performance monitor for tracking execution metrics
 */
class PerformanceMonitor {
  private readonly logger = createLogger('PerformanceMonitor');
  private metrics: Map<string, any> = new Map();
  private startTime: number = Date.now();
  
  /**
   * Start monitoring an agent execution
   */
  startAgentExecution(agentId: string, config: AgentConfig): void {
    this.metrics.set(agentId, {
      config,
      startTime: Date.now(),
      retryCount: 0,
      status: 'running'
    });
  }
  
  /**
   * Record agent completion
   */
  completeAgentExecution(
    agentId: string, 
    result: any, 
    tokenUsage?: { input: number; output: number }
  ): void {
    const metric = this.metrics.get(agentId);
    if (metric) {
      metric.endTime = Date.now();
      metric.duration = metric.endTime - metric.startTime;
      metric.status = 'completed';
      metric.tokenUsage = tokenUsage;
      metric.result = result;
    }
  }
  
  /**
   * Record agent failure
   */
  failAgentExecution(agentId: string, error: Error): void {
    const metric = this.metrics.get(agentId);
    if (metric) {
      metric.endTime = Date.now();
      metric.duration = metric.endTime - metric.startTime;
      metric.status = 'failed';
      metric.error = error;
    }
  }
  
  /**
   * Record retry attempt
   */
  recordRetry(agentId: string): void {
    const metric = this.metrics.get(agentId);
    if (metric) {
      metric.retryCount++;
    }
  }
  
  /**
   * Get execution statistics
   */
  getStatistics() {
    const totalDuration = Date.now() - this.startTime;
    const agents = Array.from(this.metrics.values());
    
    return {
      totalDuration,
      totalAgents: agents.length,
      completedAgents: agents.filter(a => a.status === 'completed').length,
      failedAgents: agents.filter(a => a.status === 'failed').length,
      averageDuration: agents.length > 0 ? 
        agents.reduce((sum, a) => sum + (a.duration || 0), 0) / agents.length : 0,
      totalTokens: agents.reduce((sum, a) => 
        sum + ((a.tokenUsage?.input || 0) + (a.tokenUsage?.output || 0)), 0),
      successRate: agents.length > 0 ? 
        agents.filter(a => a.status === 'completed').length / agents.length : 0
    };
  }
}

/**
 * Enhanced Multi-Agent Executor with improved resource management,
 * performance monitoring, and execution strategies
 */
export class EnhancedMultiAgentExecutor {
  private readonly logger = createLogger('EnhancedMultiAgentExecutor');
  private readonly config: MultiAgentConfig;
  private readonly repositoryData: RepositoryData;
  private readonly authenticatedUser: AuthenticatedUser;
  private readonly options: Required<Omit<EnhancedExecutionOptions, 'modelBlacklist'>> & { modelBlacklist?: ModelBlacklistManager };
  private readonly toolResults: Record<string, any>;
  private readonly deepWikiReportRetriever?: (agentRole: string, context: any) => Promise<any>;
  
  private readonly resourceManager: SmartResourceManager;
  private readonly performanceMonitor: PerformanceMonitor;
  private readonly vectorContextService: VectorContextService;
  private readonly mcpContextManager: MCPContextManager;
  
  private agents: Map<string, Agent> = new Map();
  private results: Map<string, EnhancedAgentExecutionResult> = new Map();
  private progress: ExecutionProgress;
  
  constructor(
    config: MultiAgentConfig,
    repositoryData: RepositoryData,
    vectorContextService: VectorContextService,
    authenticatedUser: AuthenticatedUser,
    options: EnhancedExecutionOptions = {},
    toolResults: Record<string, any> = {},
    deepWikiReportRetriever?: (agentRole: string, context: any) => Promise<any>
  ) {
    // Validate configuration
    const validation = MultiAgentValidator.validateConfig(config);
    if (!validation.valid) {
      throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
    }
    
    if (validation.warnings.length > 0) {
      this.logger.warn(`Configuration warnings: ${validation.warnings.join(', ')}`);
    }
    
    this.config = config;
    this.repositoryData = repositoryData;
    this.vectorContextService = vectorContextService;
    this.authenticatedUser = authenticatedUser;
    this.toolResults = toolResults;
    this.deepWikiReportRetriever = deepWikiReportRetriever;
    
    // Initialize MCP Context Manager for multi-agent coordination
    this.mcpContextManager = new MCPContextManager(
      authenticatedUser,
      {
        repositoryId: `${repositoryData.owner}/${repositoryData.repo}`,
        recentAnalysis: [],
        historicalPatterns: [],
        similarIssues: [],
        confidenceScore: 0.8,
        lastUpdated: new Date()
      }
    );
    
    // 🔒 SECURITY: Validate repository access before proceeding
    this.validateRepositoryAccess();
    
    // Set default options with smart resource management
    this.options = {
      debug: options.debug ?? false,
      timeout: options.timeout ?? 300000, // 5 minutes
      agentTimeout: options.agentTimeout ?? 120000, // 2 minutes
      maxRetries: options.maxRetries ?? 3,
      retryDelay: options.retryDelay ?? 1000,
      maxConcurrentAgents: options.maxConcurrentAgents ?? 5,
      modelTokenLimits: options.modelTokenLimits ?? {
        'claude-3-opus': 25000,
        'gpt-4': 20000,
        'deepseek-coder': 30000,
        'gemini-pro': 22000
      },
      context: options.context ?? {},
      priorityBasedExecution: options.priorityBasedExecution ?? true,
      enableMetrics: options.enableMetrics ?? true,
      enableMCP: options.enableMCP ?? true,
      onProgress: options.onProgress || (() => { /* Progress callback will be implemented */ }),
      resourceStrategy: options.resourceStrategy ?? 'balanced',
      modelBlacklist: options.modelBlacklist
    };
    
    // Initialize smart resource manager
    this.resourceManager = new SmartResourceManager(
      this.options.maxConcurrentAgents,
      this.options.modelTokenLimits,
      this.options.modelBlacklist
    );
    
    this.performanceMonitor = new PerformanceMonitor();
    
    // Initialize progress tracking
    this.progress = {
      totalAgents: config.agents.length,
      completedAgents: 0,
      failedAgents: 0,
      runningAgents: [],
      progressPercentage: 0,
      phase: 'initialization',
      tokenUsage: { input: 0, output: 0, total: 0, estimatedCost: 0 },
      startTime: Date.now()
    };
    
    if (this.options.debug) {
      this.logger.info('Enhanced executor initialized', {
        agentCount: config.agents.length,
        strategy: config.strategy,
        resourceLimits: {
          maxConcurrent: this.options.maxConcurrentAgents,
          modelLimits: this.options.modelTokenLimits
        }
      } as LoggableData);
    }
  }
  
  /**
   * Execute the multi-agent analysis with enhanced monitoring and resource management
   */
  async execute(): Promise<MultiAgentResult> {
    const executionId = uuidv4();
    const startTime = Date.now();
    
    try {
      this.updateProgress('initialization');
      
      // Initialize agents
      await this.initializeAgents();
      
      // Update MCP context with repository information
      const primaryLanguage = this.detectPrimaryLanguage();
      if (primaryLanguage) {
        this.mcpContextManager.updateRepositoryContext(
          `${this.repositoryData.owner}/${this.repositoryData.repo}`,
          primaryLanguage,
          this.determineSizeCategory()
        );
      }

      // Execute using MCP-aware coordination strategies
      const analysisMode = this.determineAnalysisMode();
      let executionResult: any;
      
      if (this.options.enableMCP !== false) {
        // Use MCP coordination strategy
        executionResult = await this.executeMCPCoordinatedStrategy(analysisMode);
      } else {
        // Fall back to traditional strategy execution
        const strategy = this.config.strategy || AnalysisStrategy.PARALLEL;
        switch (strategy) {
          case AnalysisStrategy.PARALLEL:
            executionResult = await this.executeParallelStrategy();
            break;
          case AnalysisStrategy.SEQUENTIAL:
            executionResult = await this.executeSequentialStrategy();
            break;
          case AnalysisStrategy.SPECIALIZED:
            executionResult = await this.executeSpecializedStrategy();
            break;
          default:
            executionResult = await this.executeParallelStrategy();
        }
      }
      
      this.updateProgress('complete');
      
      // Generate final result
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      const result: MultiAgentResult = {
        analysisId: executionId,
        strategy: this.config.strategy,
        config: this.config,
        results: this.convertResultsToExpectedFormat(),
        combinedResult: executionResult,
        successful: true,
        duration,
        totalCost: this.calculateTotalTokenUsage().estimatedCost,
        usedFallback: Array.from(this.results.values()).some(r => r.metadata.usedFallback),
        fallbackStats: this.calculateFallbackStats(),
        metadata: {
          timestamp: new Date().toISOString(),
          duration,
          config: this.config,
          tokenUsage: {
            input: this.calculateTotalTokenUsage().input,
            output: this.calculateTotalTokenUsage().output,
            totalCost: this.calculateTotalTokenUsage().estimatedCost
          }
        }
      };
      
      if (this.options.debug) {
        this.logger.info('Execution completed successfully', {
          executionId,
          duration,
          successfulAgents: this.results.size,
          totalAgents: this.config.agents.length
        } as LoggableData);
      }
      
      return result;
      
    } catch (error) {
      this.logger.error('Execution failed', { error: error instanceof Error ? error.message : error });
      
      return {
        analysisId: executionId,
        strategy: this.config.strategy,
        config: this.config,
        results: this.convertResultsToExpectedFormat(),
        successful: false,
        duration: Date.now() - startTime,
        totalCost: this.calculateTotalTokenUsage().estimatedCost,
        usedFallback: Array.from(this.results.values()).some(r => r.metadata.usedFallback),
        errors: [error instanceof Error ? error : new Error(String(error))],
        metadata: {
          timestamp: new Date().toISOString(),
          duration: Date.now() - startTime,
          config: this.config,
          tokenUsage: {
            input: this.calculateTotalTokenUsage().input,
            output: this.calculateTotalTokenUsage().output,
            totalCost: this.calculateTotalTokenUsage().estimatedCost
          },
          errors: [error instanceof Error ? error : new Error(String(error))]
        }
      };
    }
  }
  
  /**
   * Initialize all agents
   */
  private async initializeAgents(): Promise<void> {
    // Implementation will create agents using the existing factory
    // This is a placeholder for the actual agent creation logic
    this.logger.info('Initializing agents', { count: this.config.agents.length });
  }
  
  /**
   * Execute agents in parallel with resource management
   */
  private async executeParallelStrategy(): Promise<any> {
    this.updateProgress('primary-execution');
    
    const executionPromises = this.config.agents.map(agentConfig => 
      this.executeAgentWithResourceManagement(agentConfig)
    );
    
    const results = await Promise.allSettled(executionPromises);
    
    // Process results and handle failures
    return this.aggregateResults(results);
  }
  
  /**
   * Execute agents sequentially with enhanced context passing
   */
  private async executeSequentialStrategy(): Promise<any> {
    this.updateProgress('primary-execution');
    
    let aggregatedContext = { ...this.options.context };
    const results = [];
    
    for (const agentConfig of this.config.agents) {
      try {
        const result = await this.executeAgentWithResourceManagement(
          agentConfig,
          aggregatedContext
        );
        results.push(result);
        
        // Enhance context with previous results
        aggregatedContext = { ...aggregatedContext, previousResults: results };
        
      } catch (error) {
        this.logger.warn('Agent failed in sequential execution', {
          agent: agentConfig.provider,
          error: error instanceof Error ? error.message : error
        });
        
        if (!this.config.fallbackEnabled) {
          throw error;
        }
      }
    }
    
    return this.aggregateResults(results);
  }
  
  /**
   * Execute specialized agents based on file patterns
   */
  private async executeSpecializedStrategy(): Promise<any> {
    this.updateProgress('primary-execution');
    
    // Group agents by their specialization
    const specializedAgents = this.config.agents.filter(agent => 
      agent.filePatterns && agent.filePatterns.length > 0
    );
    
    const generalAgents = this.config.agents.filter(agent => 
      !agent.filePatterns || agent.filePatterns.length === 0
    );
    
    // Execute specialized agents on relevant files
    const specializedPromises = specializedAgents.map(agentConfig =>
      this.executeSpecializedAgent(agentConfig)
    );
    
    // Execute general agents on all data
    const generalPromises = generalAgents.map(agentConfig =>
      this.executeAgentWithResourceManagement(agentConfig)
    );
    
    const allResults = await Promise.allSettled([
      ...specializedPromises,
      ...generalPromises
    ]);
    
    return this.aggregateResults(allResults);
  }
  
  /**
   * Execute an agent with resource management and monitoring
   */
  private async executeAgentWithResourceManagement(
    agentConfig: AgentConfig,
    additionalContext?: Record<string, any>
  ): Promise<any> {
    const agentId = `${agentConfig.provider}-${agentConfig.role}`;
    const priority = agentConfig.priority || 0;
    
    return this.resourceManager.requestExecution(
      agentId,
      priority,
      async () => {
        this.performanceMonitor.startAgentExecution(agentId, agentConfig);
        this.progress.runningAgents.push(agentId);
        
        try {
          // Check model efficiency instead of hard token budget
          const estimatedTokens = agentConfig.maxTokens || 15000;
          const efficiency = await this.resourceManager.checkModelEfficiency(
            agentConfig.provider, 
            agentConfig.role, 
            estimatedTokens
          );
          
          if (!efficiency.canUse && efficiency.replacement) {
            // Use replacement model if available
            this.logger.info(`Switching to replacement model: ${efficiency.replacement} for ${agentId}`);
          } else if (!efficiency.canUse) {
            throw new Error(`Model ${agentConfig.provider} unavailable for agent ${agentId}`);
          }
          
          // Execute agent with timeout
          const result = await this.executeAgentWithTimeout(agentConfig, additionalContext);
          
          this.performanceMonitor.completeAgentExecution(agentId, result);
          this.progress.completedAgents++;
          
          return result;
          
        } catch (error) {
          this.performanceMonitor.failAgentExecution(agentId, error as Error);
          this.progress.failedAgents++;
          throw error;
          
        } finally {
          this.progress.runningAgents = this.progress.runningAgents.filter(id => id !== agentId);
          this.updateProgressPercentage();
          
          if (this.options.onProgress) {
            this.options.onProgress(this.progress);
          }
        }
      }
    );
  }
  
  /**
   * Execute a specialized agent on specific files
   */
  private async executeSpecializedAgent(agentConfig: AgentConfig): Promise<any> {
    if (!agentConfig.filePatterns) {
      return this.executeAgentWithResourceManagement(agentConfig);
    }
    
    // Filter repository data based on file patterns
    const relevantFiles = this.repositoryData.files.filter(file =>
      agentConfig.filePatterns!.some(pattern => 
        file.path.match(new RegExp(pattern))
      )
    );
    
    if (relevantFiles.length === 0) {
      this.logger.info('No relevant files found for specialized agent', {
        agent: agentConfig.provider,
        patterns: agentConfig.filePatterns
      });
      return null;
    }
    
    // Create specialized context
    const specializedContext = {
      ...this.options.context,
      relevantFiles,
      focusAreas: agentConfig.focusAreas || []
    };
    
    return this.executeAgentWithResourceManagement(agentConfig, specializedContext);
  }
  
  /**
   * Execute agent with timeout protection
   */
  private async executeAgentWithTimeout(
    agentConfig: AgentConfig,
    additionalContext?: Record<string, any>
  ): Promise<any> {
    // Prepare agent context with Vector DB data
    const enhancedContext = await this.prepareAgentContext(
      agentConfig.role,
      this.authenticatedUser,
      additionalContext
    );
    
    // This is a placeholder for the actual agent execution
    // The real implementation would use the existing agent factory
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Agent execution timeout: ${agentConfig.provider}`));
      }, this.options.agentTimeout);
      
      // Simulate agent execution with Vector DB context
      setTimeout(() => {
        clearTimeout(timeout);
        resolve({
          agentConfig,
          analysis: 'Mock analysis result with Vector DB context',
          context: enhancedContext
        });
      }, Math.random() * 1000 + 500); // Random delay 0.5-1.5s
    });
  }

  /**
   * Prepare enhanced agent context with Vector DB data
   * 🔒 SECURITY: Ensures proper access control for cross-repository data
   */
  private async prepareAgentContext(
    agentRole: string,
    authenticatedUser: AuthenticatedUser,
    additionalContext?: Record<string, any>
  ): Promise<EnhancedAgentContext> {
    try {
      // Get repository ID from owner/repo
      const repositoryId = `${this.repositoryData.owner}/${this.repositoryData.repo}`;
      
      // 🔒 SECURITY: Get repository context with proper access control
      const vectorContext = await this.vectorContextService.getRepositoryContext(
        repositoryId,
        agentRole as any,
        authenticatedUser,
        {
          maxResults: 10,
          minSimilarity: 0.7,
          includeHistorical: true
        }
      );

      // 🔒 SECURITY: Get cross-repository patterns with strict access control
      const crossRepoPatterns = await this.vectorContextService.getCrossRepositoryPatterns(
        agentRole as any,
        `${agentRole} analysis patterns`,
        authenticatedUser,
        {
          maxResults: 5,
          excludeRepositoryId: repositoryId,
          // 🔒 CRITICAL: Ensure only user-accessible repositories
          respectUserPermissions: true,
          // 🔒 SECURITY: Sanitize content to prevent data leakage
          sanitizeContent: true,
          // 🔒 SECURITY: Remove sensitive metadata
          anonymizeMetadata: true
        }
      );

      // Get tool results for this agent role if available
      const agentToolResults = this.toolResults[agentRole];
      let toolAnalysisContext = '';
      
      if (agentToolResults) {
        // Format tool results for agent consumption
        toolAnalysisContext = this.formatToolResultsForAgent(agentToolResults);
        this.logger.debug('Added tool results to agent context', {
          role: agentRole,
          toolCount: agentToolResults.toolResults?.length || 0,
          hasResults: !!agentToolResults
        });
      }

      // Get relevant DeepWiki report sections for this agent role
      let deepWikiContext = '';
      if (this.deepWikiReportRetriever) {
        try {
          const requestContext = {
            agentRole,
            changedFiles: this.repositoryData.files?.map(f => f.path) || [],
            prContext: additionalContext,
            repositoryId: `${this.repositoryData.owner}/${this.repositoryData.repo}`
          };
          
          const relevantReport = await this.deepWikiReportRetriever(agentRole, requestContext);
          if (relevantReport) {
            deepWikiContext = this.formatDeepWikiReportForAgent(agentRole, relevantReport);
            this.logger.debug('Added DeepWiki report context to agent', {
              role: agentRole,
              hasReport: !!relevantReport,
              reportSections: Object.keys(relevantReport || {}).length
            });
          }
        } catch (error) {
          this.logger.warn('Failed to retrieve DeepWiki report for agent', {
            role: agentRole,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      const enhancedContext: EnhancedAgentContext = {
        prData: this.repositoryData,
        vectorContext,
        crossRepoPatterns,
        additionalContext: {
          ...additionalContext,
          toolAnalysis: toolAnalysisContext,
          deepWikiAnalysis: deepWikiContext,
          hasToolResults: !!agentToolResults,
          hasDeepWikiReport: !!deepWikiContext,
          dataQuality: {
            vectorConfidence: vectorContext.confidenceScore,
            crossRepoMatches: crossRepoPatterns.length,
            hasRecentData: vectorContext.recentAnalysis.length > 0,
            hasToolData: !!agentToolResults,
            hasRepositoryAnalysis: !!deepWikiContext
          }
        }
      };

      this.logger.debug('Prepared agent context', {
        role: agentRole,
        repositoryId,
        vectorConfidence: vectorContext.confidenceScore,
        recentAnalysisCount: vectorContext.recentAnalysis.length,
        crossRepoCount: crossRepoPatterns.length
      });

      return enhancedContext;
    } catch (error) {
      this.logger.error('Failed to prepare agent context', {
        role: agentRole,
        error: error instanceof Error ? error.message : String(error)
      });

      // Return minimal context on error
      return {
        prData: this.repositoryData,
        vectorContext: {
          repositoryId: `${this.repositoryData.owner}/${this.repositoryData.repo}`,
          recentAnalysis: [],
          historicalPatterns: [],
          similarIssues: [],
          confidenceScore: 0,
          lastUpdated: new Date()
        },
        crossRepoPatterns: [],
        additionalContext
      };
    }
  }
  
  /**
   * Aggregate results from multiple agents
   */
  private aggregateResults(results: any[]): any {
    // Placeholder for result aggregation logic
    return {
      aggregatedInsights: results.filter(r => r != null),
      totalResults: results.length,
      successfulResults: results.filter(r => r != null).length
    };
  }
  
  /**
   * Update execution progress
   */
  private updateProgress(phase: ExecutionProgress['phase']): void {
    this.progress.phase = phase;
    this.updateProgressPercentage();
    
    if (this.options.onProgress) {
      this.options.onProgress(this.progress);
    }
  }
  
  /**
   * Update progress percentage
   */
  private updateProgressPercentage(): void {
    const completed = this.progress.completedAgents + this.progress.failedAgents;
    this.progress.progressPercentage = (completed / this.progress.totalAgents) * 100;
    
    // Update token usage
    this.progress.tokenUsage = this.calculateTotalTokenUsage();
  }
  
  /**
   * Calculate total token usage across all agents
   */
  private calculateTotalTokenUsage() {
    const stats = this.performanceMonitor.getStatistics();
    return {
      input: 0, // Would be calculated from actual results
      output: 0, // Would be calculated from actual results
      total: stats.totalTokens,
      estimatedCost: stats.totalTokens * 0.002 // Example cost calculation
    };
  }

  /**
   * Convert enhanced results to expected format
   */
  private convertResultsToExpectedFormat(): { [key: string]: any } {
    const converted: { [key: string]: any } = {};
    
    for (const [agentId, result] of this.results.entries()) {
      converted[agentId] = {
        result: result.result,
        error: result.error,
        duration: result.timing.duration,
        agentConfig: result.config,
        tokenUsage: result.resources.tokenUsage,
        cost: result.resources.estimatedCost,
        usedFallback: result.metadata.usedFallback,
        fallbackAgent: result.metadata.fallbackAgent,
        fallbackAttempts: result.metadata.fallbackAttempts
      };
    }
    
    return converted;
  }

  /**
   * Calculate fallback statistics
   */
  private calculateFallbackStats() {
    const results = Array.from(this.results.values());
    const fallbackResults = results.filter(r => r.metadata.usedFallback);
    
    return {
      totalFallbackAttempts: results.reduce((sum, r) => sum + r.metadata.fallbackAttempts, 0),
      successfulFallbacks: fallbackResults.filter(r => !r.error).length,
      failedFallbacks: fallbackResults.filter(r => r.error).length
    };
  }

  /**
   * Validate repository access for the authenticated user
   * 🔒 SECURITY: Ensures user has permission to access the repository
   */
  private validateRepositoryAccess(): void {
    const repositoryId = `${this.repositoryData.owner}/${this.repositoryData.repo}`;
    
    // Check if user has read access to the repository
    const repositoryPermissions = this.authenticatedUser.permissions.repositories[repositoryId];
    
    if (!repositoryPermissions || !repositoryPermissions.read) {
      const _securityEvent: SecurityEvent = {
        type: 'ACCESS_DENIED',
        userId: this.authenticatedUser.id,
        sessionId: this.authenticatedUser.session.fingerprint,
        repositoryId,
        ipAddress: this.authenticatedUser.session.ipAddress,
        userAgent: this.authenticatedUser.session.userAgent,
        timestamp: new Date(),
        details: {
          reason: 'Repository access denied',
          requiredPermission: 'read',
          userPermissions: repositoryPermissions || {}
        },
        severity: 'high'
      };

      this.logger.error('Repository access denied', {
        userId: this.authenticatedUser.id,
        repositoryId,
        permissions: repositoryPermissions
      });

      throw new Error(`${AuthenticationError.REPOSITORY_ACCESS_DENIED}: User ${this.authenticatedUser.id} does not have read access to repository ${repositoryId}`);
    }

    // Validate session is still active
    if (new Date() > this.authenticatedUser.session.expiresAt) {
      const _securityEvent: SecurityEvent = {
        type: 'SESSION_EXPIRED',
        userId: this.authenticatedUser.id,
        sessionId: this.authenticatedUser.session.fingerprint,
        repositoryId,
        ipAddress: this.authenticatedUser.session.ipAddress,
        userAgent: this.authenticatedUser.session.userAgent,
        timestamp: new Date(),
        details: {
          reason: 'Session expired during execution',
          expiresAt: this.authenticatedUser.session.expiresAt,
          currentTime: new Date()
        },
        severity: 'medium'
      };

      this.logger.warn('Session expired during execution', {
        userId: this.authenticatedUser.id,
        expiresAt: this.authenticatedUser.session.expiresAt
      });

      throw new Error(`${AuthenticationError.EXPIRED_SESSION}: User session expired at ${this.authenticatedUser.session.expiresAt}`);
    }

    this.logger.debug('Repository access validated', {
      userId: this.authenticatedUser.id,
      repositoryId,
      permissions: repositoryPermissions
    });
  }

  /**
   * Log security events for audit purposes
   * 🔒 SECURITY: Comprehensive audit logging for compliance
   */
  private async logSecurityEvent(event: SecurityEvent): Promise<void> {
    // TODO: Integrate with actual security logging service
    this.logger.info('Security event logged', event as any);
  }

  /**
   * Determine analysis mode based on configuration and context
   */
  private determineAnalysisMode(): string {
    switch (this.config.strategy) {
      case AnalysisStrategy.PARALLEL:
        return this.config.agents.length <= 2 ? 'quick' : 'comprehensive';
      case AnalysisStrategy.SEQUENTIAL:
        return 'comprehensive';
      case AnalysisStrategy.SPECIALIZED:
        return 'deep';
      default:
        return 'comprehensive';
    }
  }

  /**
   * Execute agents using MCP coordination strategy
   */
  private async executeMCPCoordinatedStrategy(analysisMode: string): Promise<any> {
    const coordinationStrategy = this.mcpContextManager.getCoordinationStrategy(analysisMode);
    
    this.logger.info('Executing MCP-coordinated strategy', {
      analysisMode,
      strategyName: coordinationStrategy.name,
      totalAgents: coordinationStrategy.execution_order.length
    });

    const results: Record<string, any> = {};
    const startTime = Date.now();

    try {
      // Execute agents based on parallel groups and dependencies
      for (const parallelGroup of coordinationStrategy.parallel_groups) {
        const groupPromises: Promise<any>[] = [];
        
        for (const agentName of parallelGroup) {
          // Check if agent is available to execute
          const nextAgents = this.mcpContextManager.getNextAgentsToExecute(coordinationStrategy);
          
          if (nextAgents.includes(agentName)) {
            this.mcpContextManager.registerAgent(agentName);
            
            const agentPromise = this.executeAgentWithMCPContext(agentName, coordinationStrategy)
              .then(result => {
                this.mcpContextManager.completeAgent(agentName, result);
                results[agentName] = result;
                return result;
              })
              .catch(error => {
                this.logger.error(`Agent ${agentName} failed in MCP execution`, { error: error.message });
                throw error;
              });
            
            groupPromises.push(agentPromise);
          }
        }
        
        // Wait for current parallel group to complete before moving to next group
        if (groupPromises.length > 0) {
          await Promise.allSettled(groupPromises);
        }
      }

      const totalDuration = Date.now() - startTime;
      
      this.logger.info('MCP-coordinated execution completed', {
        totalDuration,
        completedAgents: Object.keys(results).length,
        analysisMode
      });

      return {
        strategy: 'mcp_coordinated',
        analysisMode,
        coordinationStrategy: coordinationStrategy.name,
        agentResults: results,
        mcpContext: this.mcpContextManager.getContext(),
        progressSummary: this.mcpContextManager.getProgressSummary(),
        totalDuration
      };

    } catch (error) {
      this.logger.error('MCP-coordinated execution failed', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        analysisMode,
        completedAgents: Object.keys(results).length
      });
      throw error;
    } finally {
      // Clean up MCP resources
      this.mcpContextManager.cleanup();
    }
  }

  /**
   * Execute individual agent with MCP context
   */
  private async executeAgentWithMCPContext(
    agentName: string, 
    coordinationStrategy: MCPCoordinationStrategy
  ): Promise<any> {
    const agentConfig = this.config.agents.find(a => a.role.toString() === agentName);
    if (!agentConfig) {
      throw new Error(`Agent configuration not found for: ${agentName}`);
    }

    const mcpContext = this.mcpContextManager.getContext();
    
    // Subscribe agent to MCP messages for cross-agent coordination
    this.mcpContextManager.subscribe(agentName, (message) => {
      this.logger.debug(`Agent ${agentName} received MCP message`, {
        messageType: message.type,
        sourceAgent: message.source_agent
      });
    });

    try {
      // Enhance agent context with MCP shared findings
      const baseContext = await this.prepareAgentContext(
        agentName,
        this.authenticatedUser
      );
      const enhancedContext = {
        ...baseContext,
        mcpContext: mcpContext,
        sharedFindings: mcpContext.shared_findings,
        crossAgentInsights: mcpContext.shared_findings.cross_agent_insights,
        coordinationStrategy: coordinationStrategy.name
      };

      // Execute agent with enhanced context
      const result = await this.executeAgentWithTimeout(
        agentConfig,
        enhancedContext
      );

      // Add any cross-agent insights discovered during execution
      if (result.crossAgentInsights) {
        for (const insight of result.crossAgentInsights) {
          this.mcpContextManager.addCrossAgentInsight(
            agentName,
            insight.targetAgent || 'all',
            insight.data
          );
        }
      }

      return result;

    } finally {
      // Unsubscribe from MCP messages
      this.mcpContextManager.unsubscribe(agentName);
    }
  }

  /**
   * Get MCP context manager for external access
   */
  public getMCPContextManager(): MCPContextManager {
    return this.mcpContextManager;
  }

  /**
   * Get current MCP coordination status
   */
  public getMCPStatus(): {
    isEnabled: boolean;
    currentContext: any;
    progressSummary: any;
  } {
    return {
      isEnabled: this.options.enableMCP !== false,
      currentContext: this.mcpContextManager.getContext(),
      progressSummary: this.mcpContextManager.getProgressSummary()
    };
  }

  /**
   * Detect primary language from repository files
   */
  private detectPrimaryLanguage(): string | null {
    if (!this.repositoryData.files || this.repositoryData.files.length === 0) {
      return null;
    }

    const languageCount: Record<string, number> = {};
    
    for (const file of this.repositoryData.files) {
      const extension = file.path.split('.').pop()?.toLowerCase();
      if (!extension) continue;

      let language: string | null = null;
      switch (extension) {
        case 'ts':
        case 'tsx':
          language = 'typescript';
          break;
        case 'js':
        case 'jsx':
          language = 'javascript';
          break;
        case 'py':
          language = 'python';
          break;
        case 'java':
          language = 'java';
          break;
        case 'go':
          language = 'go';
          break;
        case 'rs':
          language = 'rust';
          break;
        case 'cpp':
        case 'cc':
        case 'cxx':
          language = 'cpp';
          break;
        case 'c':
          language = 'c';
          break;
        case 'cs':
          language = 'csharp';
          break;
        case 'php':
          language = 'php';
          break;
        case 'rb':
          language = 'ruby';
          break;
      }

      if (language) {
        languageCount[language] = (languageCount[language] || 0) + 1;
      }
    }

    // Return the most common language
    let maxCount = 0;
    let primaryLanguage: string | null = null;
    for (const [lang, count] of Object.entries(languageCount)) {
      if (count > maxCount) {
        maxCount = count;
        primaryLanguage = lang;
      }
    }

    return primaryLanguage;
  }

  /**
   * Determine repository size category based on file count
   */
  private determineSizeCategory(): 'small' | 'medium' | 'large' {
    const fileCount = this.repositoryData.files?.length || 0;
    
    if (fileCount <= 10) {
      return 'small';
    } else if (fileCount <= 50) {
      return 'medium';
    } else {
      return 'large';
    }
  }

  /**
   * Format tool results for agent consumption
   */
  private formatToolResultsForAgent(agentToolResults: any): string {
    if (!agentToolResults || !agentToolResults.toolResults) {
      return 'No automated tool analysis available.';
    }

    let formatted = `## Automated Tool Analysis Results\n\n`;
    formatted += `**Last Analysis:** ${new Date(agentToolResults.lastExecuted).toLocaleString()}\n`;
    formatted += `**Tools Executed:** ${agentToolResults.toolResults.length}\n\n`;

    if (agentToolResults.summary?.keyFindings?.length > 0) {
      formatted += `**Key Findings:**\n`;
      agentToolResults.summary.keyFindings.forEach((finding: string) => {
        formatted += `- ${finding}\n`;
      });
      formatted += '\n';
    }

    // Add detailed tool results
    agentToolResults.toolResults.forEach((result: any) => {
      formatted += `### ${result.toolId.toUpperCase()} Analysis\n`;
      if (result.metadata.score !== undefined) {
        formatted += `**Score:** ${result.metadata.score}/10\n`;
      }
      formatted += `${result.content}\n\n`;
    });

    formatted += `*Use this automated analysis to inform your assessment of the current PR changes.*\n`;

    return formatted;
  }

  /**
   * Format DeepWiki report sections for specific agent role
   */
  private formatDeepWikiReportForAgent(agentRole: string, report: any): string {
    if (!report) {
      return 'No repository analysis report available.';
    }

    let formatted = `## Repository Analysis Report\n\n`;

    // Include role-specific sections
    switch (agentRole) {
      case 'security':
        formatted += this.formatSecurityReportSection(report);
        break;
      case 'architecture':
        formatted += this.formatArchitectureReportSection(report);
        break;
      case 'dependency':
        formatted += this.formatDependencyReportSection(report);
        break;
      case 'performance':
        formatted += this.formatPerformanceReportSection(report);
        break;
      case 'codeQuality':
        formatted += this.formatCodeQualityReportSection(report);
        break;
      default:
        formatted += this.formatGeneralReportSection(report);
    }

    formatted += `\n*Use this repository context to understand the broader codebase when analyzing PR changes.*\n`;

    return formatted;
  }

  /**
   * Format security-specific sections from DeepWiki report
   */
  private formatSecurityReportSection(report: any): string {
    let section = '';
    
    if (report.security) {
      section += `### Security Analysis\n${report.security}\n\n`;
    }
    
    if (report.dependencies?.security) {
      section += `### Dependency Security\n${report.dependencies.security}\n\n`;
    }
    
    if (report.vulnerabilities) {
      section += `### Known Vulnerabilities\n${report.vulnerabilities}\n\n`;
    }
    
    return section || '### No Security Analysis Available\n\n';
  }

  /**
   * Format architecture-specific sections from DeepWiki report
   */
  private formatArchitectureReportSection(report: any): string {
    let section = '';
    
    if (report.architecture) {
      section += `### Architecture Overview\n${report.architecture}\n\n`;
    }
    
    if (report.structure) {
      section += `### Code Structure\n${report.structure}\n\n`;
    }
    
    if (report.patterns) {
      section += `### Design Patterns\n${report.patterns}\n\n`;
    }
    
    return section || '### No Architecture Analysis Available\n\n';
  }

  /**
   * Format dependency-specific sections from DeepWiki report
   */
  private formatDependencyReportSection(report: any): string {
    let section = '';
    
    if (report.dependencies) {
      section += `### Dependencies Analysis\n${report.dependencies}\n\n`;
    }
    
    if (report.packages) {
      section += `### Package Management\n${report.packages}\n\n`;
    }
    
    if (report.licenses) {
      section += `### License Information\n${report.licenses}\n\n`;
    }
    
    return section || '### No Dependency Analysis Available\n\n';
  }

  /**
   * Format performance-specific sections from DeepWiki report
   */
  private formatPerformanceReportSection(report: any): string {
    let section = '';
    
    if (report.performance) {
      section += `### Performance Analysis\n${report.performance}\n\n`;
    }
    
    if (report.optimization) {
      section += `### Optimization Opportunities\n${report.optimization}\n\n`;
    }
    
    return section || '### No Performance Analysis Available\n\n';
  }

  /**
   * Format code quality sections from DeepWiki report
   */
  private formatCodeQualityReportSection(report: any): string {
    let section = '';
    
    if (report.codeQuality) {
      section += `### Code Quality Analysis\n${report.codeQuality}\n\n`;
    }
    
    if (report.maintainability) {
      section += `### Maintainability\n${report.maintainability}\n\n`;
    }
    
    if (report.testing) {
      section += `### Testing Coverage\n${report.testing}\n\n`;
    }
    
    return section || '### No Code Quality Analysis Available\n\n';
  }

  /**
   * Format general sections from DeepWiki report
   */
  private formatGeneralReportSection(report: any): string {
    let section = '';
    
    if (report.summary) {
      section += `### Repository Summary\n${report.summary}\n\n`;
    }
    
    if (report.overview) {
      section += `### Overview\n${report.overview}\n\n`;
    }
    
    return section || '### No General Analysis Available\n\n';
  }
}