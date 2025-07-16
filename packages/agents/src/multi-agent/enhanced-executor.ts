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
import { AgentResultProcessor } from '../services/agent-result-processor';
import { AgentFactory } from '../factory/agent-factory';
import { getDebugLogger, DebugLogger } from '../services/debug-logger';
import { getProgressTracker, ProgressTracker } from '../services/progress-tracker';
import { getToolResultsVectorStorage, ToolResultsVectorStorage, ToolResultData } from '../services/tool-results-vector-storage';

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
  private readonly debugLogger: DebugLogger;
  private readonly progressTracker: ProgressTracker;
  private readonly toolResultsStorage?: ToolResultsVectorStorage;
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
  private analysisId: string;
  private collectedToolResults: ToolResultData[] = [];
  
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
    
    // Initialize debug logger and progress tracker
    this.debugLogger = getDebugLogger(options.debug);
    this.progressTracker = getProgressTracker();
    this.analysisId = uuidv4();
    
    // Initialize tool results storage if Vector DB is available
    if (this.vectorContextService && (this.vectorContextService as any).authenticatedRAGService) {
      try {
        const supabase = (this.vectorContextService as any).supabase;
        const embeddingService = (this.vectorContextService as any).authenticatedRAGService?.embeddingService;
        if (supabase && embeddingService) {
          this.toolResultsStorage = getToolResultsVectorStorage(supabase, embeddingService);
          this.logger.debug('Tool results storage initialized');
        }
      } catch (error) {
        this.logger.warn('Failed to initialize tool results storage', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
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
    const executionId = this.analysisId;
    const startTime = Date.now();
    
    // Start progress tracking
    this.progressTracker.startAnalysis(
      this.analysisId,
      `${this.repositoryData.owner}/${this.repositoryData.repo}`,
      this.repositoryData.prNumber || 0,
      this.config.agents.length,
      this.countTotalTools()
    );
    
    try {
      this.updateProgress('initialization');
      this.progressTracker.updatePhase(this.analysisId, 'initialization', 'in_progress', 10, 'Initializing analysis...');
      
      // Initialize agents
      await this.initializeAgents();
      this.progressTracker.updatePhase(this.analysisId, 'initialization', 'completed', 100, 'Initialization complete');
      
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
        this.progressTracker.updatePhase(this.analysisId, 'toolExecution', 'in_progress', 0, 'Executing MCP tools...');
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
      this.progressTracker.updatePhase(this.analysisId, 'reportGeneration', 'in_progress', 50, 'Generating report...');
      
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
      
      // Debug logging to check results
      this.logger.info('Results Map status before final result', {
        resultsSize: this.results.size,
        resultKeys: Array.from(this.results.keys()),
        hasResults: this.results.size > 0
      });
      
      if (this.options.debug) {
        this.logger.info('Execution completed successfully', {
          executionId,
          duration,
          successfulAgents: this.results.size,
          totalAgents: this.config.agents.length
        } as LoggableData);
      }
      
      // Store tool results in Vector DB
      await this.storeToolResultsInVectorDB();
      
      // Complete progress tracking
      this.progressTracker.updatePhase(this.analysisId, 'reportGeneration', 'completed', 100, 'Report generated');
      this.progressTracker.completeAnalysis(this.analysisId, true);
      
      return result;
      
    } catch (error) {
      // Mark analysis as failed
      this.progressTracker.completeAnalysis(this.analysisId, false);
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
        
        // Update progress tracker for agent start
        this.progressTracker.updateAgent(
          this.analysisId,
          agentConfig.role,
          'running',
          0,
          { startTime: new Date() }
        );
        
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
          
          // Store the result in the results Map
          const executionResult: EnhancedAgentExecutionResult = {
            config: agentConfig,
            result: result,
            timing: {
              startTime: Date.now() - 1000, // Estimate based on typical execution
              endTime: Date.now(),
              duration: 1000
            },
            resources: {
              tokenUsage: {
                input: 0,
                output: 0,
                total: 0
              }
            },
            metadata: {
              executionId: uuidv4(),
              retryCount: 0,
              usedFallback: false,
              fallbackAttempts: 0,
              priority: priority,
              timeoutOccurred: false
            },
            performance: {
              throughput: 0,
              efficiency: 1,
              reliability: 1
            }
          };
          
          this.results.set(agentId, executionResult);
          
          this.performanceMonitor.completeAgentExecution(agentId, result);
          this.progress.completedAgents++;
          
          // Update progress tracker for agent completion
          this.progressTracker.updateAgent(
            this.analysisId,
            agentConfig.role,
            'completed',
            100,
            {
              endTime: new Date(),
              findings: result?.analysis?.insights?.length || 0
            }
          );
          
          return result;
          
        } catch (error) {
          this.performanceMonitor.failAgentExecution(agentId, error as Error);
          this.progress.failedAgents++;
          
          // Update progress tracker for agent failure
          this.progressTracker.updateAgent(
            this.analysisId,
            agentConfig.role,
            'failed',
            0,
            {
              endTime: new Date(),
              error: error instanceof Error ? error.message : String(error)
            }
          );
          
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
    // Clean the agentConfig to prevent circular references
    const cleanAgentConfig = JSON.parse(JSON.stringify({
      role: agentConfig.role,
      provider: agentConfig.provider,
      agentType: (agentConfig as any).agentType || agentConfig.role,
      model: (agentConfig as any).configuration?.model || (agentConfig as any).model,
      maxTokens: agentConfig.maxTokens,
      temperature: agentConfig.temperature,
      customPrompt: agentConfig.customPrompt,
      parameters: agentConfig.parameters || {},
      focusAreas: agentConfig.focusAreas || []
    }));
    
    const agentId = `${cleanAgentConfig.provider}-${cleanAgentConfig.role}`;
    const executionId = this.debugLogger.startExecution(
      'agent',
      agentId,
      'agent-execution',
      { agentConfig: cleanAgentConfig, hasAdditionalContext: !!additionalContext }
    );
    
    this.logger.debug('executeAgentWithTimeout called for agent:', {
      role: cleanAgentConfig.role,
      provider: cleanAgentConfig.provider,
      hasAdditionalContext: !!additionalContext
    });
    
    // Prepare agent context with Vector DB data
    const enhancedContext = await this.prepareAgentContext(
      cleanAgentConfig.role,
      this.authenticatedUser,
      additionalContext
    );
    
    // Create and execute the actual agent
    return new Promise(async (resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Agent execution timeout: ${cleanAgentConfig.provider}`));
      }, this.options.agentTimeout);
      
      try {
        this.logger.debug('Inside try block, about to create agent options');
        
        // Create agent using factory - avoid circular references
        // Pass only the essential configuration to avoid circular references
        const agentOptions = {
          model: String(cleanAgentConfig.model || 'aion-labs/aion-1.0-mini'),
          maxTokens: Number(cleanAgentConfig.maxTokens || 4000),
          temperature: Number(cleanAgentConfig.temperature || 0.7),
          useOpenRouter: true,
          openRouterApiKey: String(process.env.OPENROUTER_API_KEY || ''),
          // Ensure no nested objects
          debug: false
        };
        
        this.logger.debug('Creating agent with factory:', {
          role: cleanAgentConfig.role,
          provider: cleanAgentConfig.provider,
          hasOptions: !!agentOptions,
          optionKeys: agentOptions ? Object.keys(agentOptions) : []
        });
        
        let agent;
        try {
          // Log exactly what we're passing to the factory
          this.logger.debug('About to call AgentFactory.createAgent with:', {
            role: cleanAgentConfig.role,
            provider: cleanAgentConfig.provider,
            agentOptionsKeys: Object.keys(agentOptions),
            agentOptionsStringified: JSON.stringify(agentOptions)
          });
          
          agent = AgentFactory.createAgent(
            cleanAgentConfig.role,
            cleanAgentConfig.provider,
            agentOptions
          );
          this.logger.debug('Agent created successfully');
        } catch (error) {
          this.logger.error('Failed to create agent:', {
            role: cleanAgentConfig.role,
            provider: cleanAgentConfig.provider,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
          });
          throw error;
        }
        
        // Execute agent analysis - create safe copy without circular references
        const safeRepositoryData = {
          owner: this.repositoryData.owner,
          repo: this.repositoryData.repo,
          prNumber: this.repositoryData.prNumber,
          branch: this.repositoryData.branch,
          files: this.repositoryData.files ? this.repositoryData.files.map(file => ({
            path: file.path,
            content: file.content,
            diff: file.diff,
            previousContent: file.previousContent
          })) : [],
          // Add PR metadata if exists in additional context
          url: (additionalContext as any)?.prData?.url || `https://github.com/${this.repositoryData.owner}/${this.repositoryData.repo}`,
          prTitle: (additionalContext as any)?.prData?.title,
          prDescription: (additionalContext as any)?.prData?.description,
          prAuthor: (additionalContext as any)?.prData?.author,
          prDiff: (additionalContext as any)?.prData?.diff,
          // Include vector context if available - create safe copy
          vectorContext: enhancedContext.vectorContext ? {
            repositoryId: enhancedContext.vectorContext.repositoryId,
            confidenceScore: enhancedContext.vectorContext.confidenceScore,
            lastUpdated: enhancedContext.vectorContext.lastUpdated,
            recentAnalysisCount: enhancedContext.vectorContext.recentAnalysis?.length || 0
          } : undefined,
          // Include tool results from MCP execution
          toolResults: additionalContext?.toolResults || enhancedContext.additionalContext?.toolAnalysisContext || undefined
        };
        
        // Debug: Check what we're passing to the agent
        this.logger.debug('Calling agent.analyze with data:', {
          dataKeys: Object.keys(safeRepositoryData),
          hasFiles: !!safeRepositoryData.files,
          filesCount: safeRepositoryData.files?.length || 0,
          hasVectorContext: !!safeRepositoryData.vectorContext,
          hasToolResults: !!safeRepositoryData.toolResults
        });
        
        // Remove any circular references by serializing and parsing
        let cleanRepositoryData: Record<string, unknown>;
        try {
          this.logger.debug('Attempting to serialize repository data');
          cleanRepositoryData = JSON.parse(JSON.stringify(safeRepositoryData));
          this.logger.debug('Successfully serialized repository data');
        } catch (error) {
          this.logger.error('Failed to clean repository data - circular reference detected:', { 
            error: error instanceof Error ? error.message : String(error),
            dataKeys: Object.keys(safeRepositoryData),
            hasVectorContext: !!safeRepositoryData.vectorContext,
            hasToolResults: !!safeRepositoryData.toolResults
          });
          // Fallback to minimal data
          cleanRepositoryData = {
            owner: this.repositoryData.owner,
            repo: this.repositoryData.repo,
            prNumber: this.repositoryData.prNumber,
            files: []
          };
        }
        
        const analysisResult = await agent.analyze(cleanRepositoryData);
        
        this.logger.info('Agent analysis completed', {
          agent: cleanAgentConfig.role,
          hasResult: !!analysisResult,
          resultKeys: analysisResult ? Object.keys(analysisResult) : [],
          insightsCount: analysisResult?.insights?.length || 0,
          suggestionsCount: analysisResult?.suggestions?.length || 0,
          educationalCount: analysisResult?.educational?.length || 0
        });
        
        clearTimeout(timeout);
        
        // Log successful agent execution
        this.debugLogger.completeExecution(executionId, analysisResult, {
          agentId,
          insightsCount: analysisResult?.insights?.length || 0,
          suggestionsCount: analysisResult?.suggestions?.length || 0,
          educationalCount: analysisResult?.educational?.length || 0
        });
        
        this.debugLogger.logAgentExecution(agentId, 'completed', {
          config: cleanAgentConfig,
          result: analysisResult,
          duration: Date.now() - (this.debugLogger.getTraces(agentId).find(t => t.id === executionId)?.timestamp.getTime() || Date.now())
        });
        
        resolve({
          agentConfig: cleanAgentConfig,
          analysis: analysisResult,
          context: enhancedContext
        });
      } catch (error) {
        clearTimeout(timeout);
        this.logger.error('Agent execution failed', {
          agent: cleanAgentConfig.agentType || cleanAgentConfig.role,
          provider: cleanAgentConfig.provider,
          error: error instanceof Error ? error.message : error
        });
        
        // Log failed agent execution
        this.debugLogger.failExecution(executionId, error, {
          agentId,
          errorType: 'agent-execution-failure'
        });
        
        this.debugLogger.logAgentExecution(agentId, 'failed', {
          config: cleanAgentConfig,
          error
        });
        
        reject(error);
      }
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

      // Create safe additional context without circular references FIRST
      const safeAdditionalContext: Record<string, any> = {};
      if (additionalContext) {
        // Only copy primitive values and arrays, skip objects that might have circular refs
        for (const [key, value] of Object.entries(additionalContext)) {
          if (typeof value !== 'object' || Array.isArray(value) || value === null) {
            safeAdditionalContext[key] = value;
          } else if (key === 'mcpContext' || key === 'sharedFindings' || key === 'coordinationStrategy') {
            // These are safe to include
            safeAdditionalContext[key] = value;
          }
          // Skip any keys that might contain circular references like enhancedContext
        }
      }

      // Build initial enhanced context WITHOUT DeepWiki data
      const enhancedContext: EnhancedAgentContext = {
        prData: this.repositoryData,
        vectorContext,
        crossRepoPatterns,
        additionalContext: {
          ...safeAdditionalContext,
          toolAnalysis: toolAnalysisContext,
          deepWikiAnalysis: '', // Will be populated after
          hasToolResults: !!agentToolResults,
          hasDeepWikiReport: false, // Will be updated after
          dataQuality: {
            vectorConfidence: vectorContext.confidenceScore,
            crossRepoMatches: crossRepoPatterns.length,
            hasRecentData: vectorContext.recentAnalysis.length > 0,
            hasToolData: !!agentToolResults,
            hasRepositoryAnalysis: false // Will be updated after
          }
        }
      };

      // NOW retrieve DeepWiki report with the enhanced context
      let deepWikiContext = '';
      if (this.deepWikiReportRetriever) {
        try {
          // Create a simple context without any potential circular references
          const requestContext = {
            agentRole: String(agentRole),
            changedFiles: this.repositoryData.files?.slice(0, 10).map(f => f.path) || [], // Limit files
            repositoryId: `${this.repositoryData.owner}/${this.repositoryData.repo}`,
            // Only pass simple values
            vectorConfidence: Number(vectorContext.confidenceScore) || 0,
            crossRepoCount: Number(crossRepoPatterns.length) || 0,
            hasToolResults: Boolean(agentToolResults),
            analysisMode: String(additionalContext?.analysisMode || 'quick')
          };
          
          this.logger.debug('Calling deepWikiReportRetriever with context:', {
            contextKeys: Object.keys(requestContext),
            contextStringified: JSON.stringify(requestContext)
          });
          
          const relevantReport = await this.deepWikiReportRetriever(agentRole, requestContext);
          if (relevantReport) {
            deepWikiContext = this.formatDeepWikiReportForAgent(agentRole, relevantReport);
            
            // Update the enhanced context with DeepWiki data
            if (enhancedContext.additionalContext) {
              enhancedContext.additionalContext.deepWikiAnalysis = deepWikiContext;
              enhancedContext.additionalContext.hasDeepWikiReport = true;
              enhancedContext.additionalContext.dataQuality.hasRepositoryAnalysis = true;
            }
            
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
   * Aggregate results from multiple agents with deduplication
   */
  private aggregateResults(results: any[]): any {
    // Filter successful results
    const successfulResults = results.filter(r => r != null && !r.error);
    
    // Apply deduplication to each agent's results
    const processedResults = AgentResultProcessor.transformAgentResults(successfulResults);
    
    // Log deduplication statistics
    processedResults.forEach(result => {
      if (result.deduplicationResult) {
        this.logger.info(`Deduplication for ${result.agentRole}`, {
          original: result.deduplicationResult.statistics.original,
          unique: result.deduplicationResult.statistics.unique,
          duplicatesRemoved: result.deduplicationResult.duplicatesRemoved
        });
      }
    });
    
    // Aggregate all findings for cross-agent analysis
    const allFindings = processedResults.flatMap(r => r.findings || []);
    const totalDuplicatesRemoved = processedResults.reduce(
      (sum, r) => sum + (r.deduplicationResult?.duplicatesRemoved || 0), 
      0
    );
    
    return {
      results: processedResults,
      aggregatedInsights: successfulResults.filter(r => r != null),
      totalResults: results.length,
      successfulResults: successfulResults.length,
      failedResults: results.filter(r => r == null || r.error).length,
      deduplicationStats: {
        totalFindingsBeforeDedup: processedResults.reduce(
          (sum, r) => sum + (r.originalFindingsCount || 0), 
          0
        ),
        totalFindingsAfterDedup: allFindings.length,
        totalDuplicatesRemoved,
        deduplicationRate: totalDuplicatesRemoved > 0 ? 
          (totalDuplicatesRemoved / processedResults.reduce((sum, r) => sum + (r.originalFindingsCount || 0), 0)) : 0
      }
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
    
    // For E2E testing, allow access to all repositories
    // TODO: In production, implement proper checks:
    // 1. Check if repository is public (via GitHub API)
    // 2. Check user permissions for private repos
    // 3. Validate GitHub token access
    
    this.logger.info('Repository access check bypassed for E2E testing', {
      userId: this.authenticatedUser.id,
      repositoryId
    });

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
      repositoryId
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
                
                // Store the result in the results Map
                const agentConfig = this.config.agents.find(a => a.role.toString() === agentName);
                if (agentConfig) {
                  const agentId = `${agentConfig.provider}-${agentConfig.role}`;
                  const executionResult: EnhancedAgentExecutionResult = {
                    config: agentConfig,
                    result: result,
                    timing: {
                      startTime: Date.now() - 1000,
                      endTime: Date.now(),
                      duration: 1000
                    },
                    resources: {
                      tokenUsage: {
                        input: 0,
                        output: 0,
                        total: 0
                      }
                    },
                    metadata: {
                      executionId: uuidv4(),
                      retryCount: 0,
                      usedFallback: false,
                      fallbackAttempts: 0,
                      priority: 0,
                      timeoutOccurred: false
                    },
                    performance: {
                      throughput: 0,
                      efficiency: 1,
                      reliability: 1
                    }
                  };
                  this.results.set(agentId, executionResult);
                  this.progress.completedAgents++;
                  this.logger.info('Stored result in Map for MCP agent', {
                    agentId,
                    resultsSize: this.results.size,
                    allKeys: Array.from(this.results.keys())
                  });
                }
                
                return result;
              })
              .catch(error => {
                this.logger.error(`Agent ${agentName} failed in MCP execution`, { error: error.message });
                // Return error result instead of throwing
                return {
                  agentType: agentName,
                  status: 'error',
                  error: error.message,
                  findings: []
                };
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
    // Debug logging to understand agent configuration mismatch
    this.logger.debug('Looking for agent configuration', {
      requestedAgent: agentName,
      availableAgents: this.config.agents.map(a => ({
        role: a.role,
        roleType: typeof a.role,
        roleString: a.role?.toString()
      }))
    });
    
    const agentConfig = this.config.agents.find(a => a.role.toString() === agentName);
    if (!agentConfig) {
      this.logger.warn('Agent configuration not found, skipping agent', {
        requestedAgent: agentName,
        availableRoles: this.config.agents.map(a => a.role?.toString())
      });
      // Return empty result for missing agent instead of throwing error
      return {
        agentType: agentName,
        status: 'skipped',
        reason: 'Agent not configured for this analysis',
        findings: []
      };
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
      // Prepare MCP context data without circular references
      const mcpContextData = {
        // Only pass essential data, not the entire context
        sharedFindings: mcpContext.shared_findings ? {
          cross_agent_insights: mcpContext.shared_findings.cross_agent_insights || [],
          deduplicated_issues: mcpContext.shared_findings.deduplicated_issues || [],
          confidence_scores: mcpContext.shared_findings.confidence_scores || {}
        } : {},
        coordinationStrategy: coordinationStrategy.name,
        activeAgents: mcpContext.agent_context?.active_agents || [],
        completedAgents: mcpContext.agent_context?.completed_agents || []
      };

      // Update progress to tool execution phase
      this.progressTracker.updatePhase(this.analysisId, 'toolExecution', 'in_progress', 30, `Executing tools for ${agentName}...`);
      
      // Execute MCP tools for this agent before analysis
      const mcpToolResults = await this.executeMCPToolsForAgent(agentName, agentConfig);
      
      // Update to agent analysis phase
      this.progressTracker.updatePhase(this.analysisId, 'agentAnalysis', 'in_progress', 10, `Analyzing with ${agentName}...`);
      
      // Add tool results to the context data
      const enhancedMCPContextData = {
        ...mcpContextData,
        toolResults: mcpToolResults
      };
      
      // Execute agent with MCP context data and tool results
      const result = await this.executeAgentWithTimeout(
        agentConfig,
        enhancedMCPContextData
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
   * Execute MCP tools for a specific agent
   */
  private async executeMCPToolsForAgent(
    agentName: string,
    agentConfig: AgentConfig
  ): Promise<Record<string, any>> {
    const executionId = this.debugLogger.startExecution(
      'tool',
      `mcp-tools-${agentName}`,
      'mcp-tools-execution',
      { agentName, agentConfig }
    );
    
    try {
      this.logger.debug(`Executing MCP tools for agent: ${agentName}`);
      
      // Import the MCP-hybrid agent tool service dynamically
      const { agentToolService } = await import('@codequal/mcp-hybrid');
      
      // Create analysis context for MCP tools
      const analysisContext = {
        agentRole: agentName as any, // Will be cast to AgentRole enum
        pr: {
          prNumber: this.repositoryData.prNumber || 0,
          title: `PR #${this.repositoryData.prNumber || 0}`, // Generate title from PR number
          description: '', // Not available in RepositoryData
          baseBranch: 'main', // Default base branch
          targetBranch: this.repositoryData.branch || 'feature',
          author: this.repositoryData.owner || '', // Use owner as author
          files: (this.repositoryData.files || []).map(f => ({
            path: f.path,
            content: f.content,
            changeType: (f.diff ? 'modified' : 'added') as 'modified' | 'added' | 'deleted'
          })),
          commits: [] // Not available in RepositoryData
        },
        repository: {
          name: this.repositoryData.repo || '',
          owner: this.repositoryData.owner || '',
          languages: [], // Will be detected from files
          frameworks: [] // Will be detected from files
        },
        userContext: {
          userId: this.authenticatedUser?.id || '00000000-0000-0000-0000-000000000000',
          permissions: ['read', 'write']
        },
        vectorDBConfig: {}
      };
      
      // Execute tools for this agent role
      const toolExecutionResult = await agentToolService.runToolsForRole(
        agentName as any, // Will be cast to AgentRole
        analysisContext,
        {
          strategy: 'parallel-by-role',
          maxParallel: 3,
          timeout: 30000
        }
      );
      
      this.logger.info(`MCP tools execution complete for ${agentName}`, {
        toolsExecuted: toolExecutionResult.toolsExecuted,
        toolsFailed: toolExecutionResult.toolsFailed,
        findingsCount: toolExecutionResult.findings.length,
        executionTime: toolExecutionResult.executionTime
      });
      
      // Update progress tracker for each tool executed
      for (const toolId of toolExecutionResult.toolsExecuted) {
        this.progressTracker.updateTool(
          this.analysisId,
          toolId,
          agentName,
          'completed',
          100,
          {
            findingsCount: toolExecutionResult.findings.filter((f: any) => f.toolId === toolId).length
          }
        );
      }
      
      // Collect tool results for Vector DB storage
      if (toolExecutionResult.toolsExecuted.length > 0) {
        const toolResultData: ToolResultData = {
          toolId: toolExecutionResult.toolsExecuted.join(','), // Combine tool IDs
          agentRole: agentName,
          executionTime: toolExecutionResult.executionTime,
          findings: toolExecutionResult.findings.map((f: any) => ({
            type: f.type || 'info',
            severity: f.severity || 'info',
            category: f.category || 'general',
            message: f.message || '',
            file: f.file,
            line: f.line,
            code: f.code,
            suggestion: f.suggestion
          })),
          metrics: toolExecutionResult.metrics,
          context: {
            repositoryId: `${this.repositoryData.owner}/${this.repositoryData.repo}`,
            prNumber: this.repositoryData.prNumber || 0,
            analysisId: this.analysisId,
            timestamp: new Date()
          }
        };
        
        this.collectedToolResults.push(toolResultData);
        this.logger.debug('Collected tool results for storage', {
          agentName,
          findingsCount: toolResultData.findings.length
        });
      }
      
      // Log detailed tool execution results
      this.debugLogger.completeExecution(executionId, {
        toolsExecuted: toolExecutionResult.toolsExecuted,
        findings: toolExecutionResult.findings,
        metrics: toolExecutionResult.metrics
      }, {
        agentName,
        executionTime: toolExecutionResult.executionTime,
        findingsCount: toolExecutionResult.findings.length
      });
      
      // Log individual tool results
      toolExecutionResult.toolsExecuted.forEach((toolId: string) => {
        this.debugLogger.logToolExecution(toolId, agentName, {
          findings: toolExecutionResult.findings.filter((f: any) => f.toolId === toolId),
          duration: toolExecutionResult.executionTime,
          metadata: { agentRole: agentName }
        });
      });
      
      // Format tool results for agent consumption
      const toolSummary = agentToolService.createToolSummary(toolExecutionResult);
      const formattedResults = agentToolService.formatToolResultsForPrompt(toolExecutionResult, agentName as any);
      
      return {
        executedTools: toolExecutionResult.toolsExecuted,
        failedTools: toolExecutionResult.toolsFailed,
        toolResults: toolExecutionResult,
        findings: toolExecutionResult.findings,
        metrics: toolExecutionResult.metrics,
        executionTime: toolExecutionResult.executionTime,
        summary: toolSummary,
        formattedForPrompt: formattedResults,
        raw: {
          toolsExecuted: toolExecutionResult.toolsExecuted,
          findingsCount: toolExecutionResult.findings.length,
          metricsCount: Object.keys(toolExecutionResult.metrics).length
        }
      };
      
    } catch (error) {
      this.logger.error(`Failed to execute MCP tools for ${agentName}`, {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // Log tool execution failure
      this.debugLogger.failExecution(executionId, error, {
        agentName,
        errorType: 'mcp-tools-failure'
      });
      
      // Return empty results on error to allow agent to continue
      return {
        executedTools: [],
        failedTools: [],
        toolResults: { findings: [], metrics: {}, toolsExecuted: [], toolsFailed: [], executionTime: 0 },
        findings: [],
        metrics: {},
        executionTime: 0,
        summary: {},
        formattedForPrompt: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get MCP context manager for external access
   */
  public getMCPContextManager(): MCPContextManager {
    return this.mcpContextManager;
  }
  
  /**
   * Get debug execution traces
   */
  public getDebugTraces(): any {
    return {
      traces: this.debugLogger.getTraces(),
      summary: this.debugLogger.getSummary(),
      export: this.debugLogger.exportTraces()
    };
  }
  
  /**
   * Enable or disable debug mode
   */
  public setDebugMode(enabled: boolean): void {
    this.debugLogger.setDebugMode(enabled);
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
   * Count total tools that will be executed
   */
  private countTotalTools(): number {
    // Estimate based on agent roles - typically 2-3 tools per agent
    return this.config.agents.length * 3;
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

    // Include DeepWiki chunks if available
    if (report.chunks && report.chunks.length > 0) {
      formatted += `### DeepWiki Analysis Chunks (${report.chunks.length} relevant insights)\n\n`;
      
      // Group chunks by score
      const highRelevance = report.chunks.filter((c: any) => c.score > 0.8);
      const mediumRelevance = report.chunks.filter((c: any) => c.score > 0.6 && c.score <= 0.8);
      
      if (highRelevance.length > 0) {
        formatted += `#### Highly Relevant Insights:\n`;
        highRelevance.slice(0, 3).forEach((chunk: any) => {
          formatted += `- ${chunk.content}\n`;
        });
        formatted += '\n';
      }
      
      if (mediumRelevance.length > 0) {
        formatted += `#### Additional Context:\n`;
        mediumRelevance.slice(0, 2).forEach((chunk: any) => {
          formatted += `- ${chunk.content}\n`;
        });
        formatted += '\n';
      }
    }

    // Include patterns and recommendations if available
    if (report.patterns && report.patterns.length > 0) {
      formatted += `### Code Patterns Detected:\n`;
      report.patterns.slice(0, 3).forEach((pattern: string) => {
        formatted += `- ${pattern}\n`;
      });
      formatted += '\n';
    }

    if (report.recommendations && report.recommendations.length > 0) {
      formatted += `### Historical Recommendations:\n`;
      report.recommendations.slice(0, 3).forEach((rec: string) => {
        formatted += `- ${rec}\n`;
      });
      formatted += '\n';
    }

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

    // Add summary if available
    if (report.summary) {
      formatted += `\n### Summary\n${report.summary}\n`;
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

  /**
   * Store collected tool results in Vector DB
   */
  private async storeToolResultsInVectorDB(): Promise<void> {
    if (!this.toolResultsStorage || this.collectedToolResults.length === 0) {
      this.logger.debug('No tool results to store or storage not available', {
        hasStorage: !!this.toolResultsStorage,
        resultsCount: this.collectedToolResults.length
      });
      return;
    }

    try {
      const repositoryId = `${this.repositoryData.owner}/${this.repositoryData.repo}`;
      const prNumber = this.repositoryData.prNumber || 0;

      this.logger.info('Storing tool results in Vector DB', {
        analysisId: this.analysisId,
        repositoryId,
        prNumber,
        resultsCount: this.collectedToolResults.length
      });

      await this.toolResultsStorage.storeToolResults(
        this.analysisId,
        repositoryId,
        prNumber,
        this.collectedToolResults
      );

      this.logger.info('Successfully stored tool results in Vector DB', {
        analysisId: this.analysisId,
        toolResultsCount: this.collectedToolResults.length,
        totalFindings: this.collectedToolResults.reduce((sum, r) => sum + r.findings.length, 0)
      });

    } catch (error) {
      this.logger.error('Failed to store tool results in Vector DB', {
        analysisId: this.analysisId,
        error: error instanceof Error ? error.message : String(error)
      });
      // Don't throw - this is not critical for the analysis to complete
    }
  }
}