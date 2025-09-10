import { AgentConfig, MultiAgentConfig, MultiAgentResult, RepositoryData, AuthenticatedUser } from './types';
import { VectorContextService } from './vector-context-service';
import { MCPContextManager } from './mcp-context-manager';
/**
 * Vector DB search result for agent context
 * 🔒 SECURITY: Designed to prevent sensitive data exposure
 */
export interface VectorSearchResult {
    content: string;
    metadata: {
        repository_id: string;
        content_type: string;
        file_path?: string;
        language?: string;
        framework?: string;
        analysis_type?: string;
        severity?: string;
        importance_score?: number;
        created_at: string;
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
        queueTime?: number;
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
        throughput?: number;
        efficiency?: number;
        reliability?: number;
    };
}
/**
 * Enhanced Multi-Agent Executor with improved resource management,
 * performance monitoring, and execution strategies
 */
export declare class EnhancedMultiAgentExecutor {
    private readonly logger;
    private readonly debugLogger;
    private readonly progressTracker;
    private readonly toolResultsStorage?;
    private readonly tokenTracker?;
    private readonly config;
    private readonly repositoryData;
    private readonly authenticatedUser;
    private readonly options;
    private readonly toolResults;
    private readonly deepWikiReportRetriever?;
    private readonly resourceManager;
    private readonly performanceMonitor;
    private readonly vectorContextService;
    private readonly mcpContextManager;
    private agents;
    private results;
    private progress;
    private analysisId;
    private collectedToolResults;
    constructor(config: MultiAgentConfig, repositoryData: RepositoryData, vectorContextService: VectorContextService, authenticatedUser: AuthenticatedUser, options?: EnhancedExecutionOptions, toolResults?: Record<string, any>, deepWikiReportRetriever?: (agentRole: string, context: any) => Promise<any>);
    /**
     * Execute the multi-agent analysis with enhanced monitoring and resource management
     */
    execute(): Promise<MultiAgentResult>;
    /**
     * Initialize all agents
     */
    private initializeAgents;
    /**
     * Execute agents in parallel with resource management
     */
    private executeParallelStrategy;
    /**
     * Execute agents sequentially with enhanced context passing
     */
    private executeSequentialStrategy;
    /**
     * Execute specialized agents based on file patterns
     */
    private executeSpecializedStrategy;
    /**
     * Execute an agent with resource management and monitoring
     */
    private executeAgentWithResourceManagement;
    /**
     * Execute a specialized agent on specific files
     */
    private executeSpecializedAgent;
    /**
     * Execute agent with timeout protection and fallback support
     */
    private executeAgentWithTimeout;
    /**
     * Prepare enhanced agent context with Vector DB data
     * 🔒 SECURITY: Ensures proper access control for cross-repository data
     */
    private prepareAgentContext;
    /**
     * Aggregate results from multiple agents with deduplication
     */
    private aggregateResults;
    /**
     * Update execution progress
     */
    private updateProgress;
    /**
     * Update progress percentage
     */
    private updateProgressPercentage;
    /**
     * Calculate total token usage across all agents
     */
    private calculateTotalTokenUsage;
    /**
     * Convert enhanced results to expected format
     */
    private convertResultsToExpectedFormat;
    /**
     * Calculate fallback statistics
     */
    private calculateFallbackStats;
    /**
     * Validate repository access for the authenticated user
     * 🔒 SECURITY: Ensures user has permission to access the repository
     */
    private validateRepositoryAccess;
    /**
     * Log security events for audit purposes
     * 🔒 SECURITY: Comprehensive audit logging for compliance
     */
    private logSecurityEvent;
    /**
     * Determine analysis mode based on configuration and context
     */
    private determineAnalysisMode;
    /**
     * Execute agents using MCP coordination strategy
     */
    private executeMCPCoordinatedStrategy;
    /**
     * Execute individual agent with MCP context
     */
    private executeAgentWithMCPContext;
    /**
     * Execute MCP tools for a specific agent
     */
    private executeMCPToolsForAgent;
    /**
     * Get MCP context manager for external access
     */
    getMCPContextManager(): MCPContextManager;
    /**
     * Get debug execution traces
     */
    getDebugTraces(): any;
    /**
     * Enable or disable debug mode
     */
    setDebugMode(enabled: boolean): void;
    /**
     * Get current MCP coordination status
     */
    getMCPStatus(): {
        isEnabled: boolean;
        currentContext: any;
        progressSummary: any;
    };
    /**
     * Detect primary language from repository files
     */
    private detectPrimaryLanguage;
    /**
     * Determine repository size category based on file count
     */
    private determineSizeCategory;
    /**
     * Count total tools that will be executed
     */
    private countTotalTools;
    /**
     * Format tool results for agent consumption
     */
    private formatToolResultsForAgent;
    /**
     * Format DeepWiki report sections for specific agent role
     */
    private formatDeepWikiReportForAgent;
    /**
     * Format security-specific sections from DeepWiki report
     */
    private formatSecurityReportSection;
    /**
     * Format architecture-specific sections from DeepWiki report
     */
    private formatArchitectureReportSection;
    /**
     * Format dependency-specific sections from DeepWiki report
     */
    private formatDependencyReportSection;
    /**
     * Format performance-specific sections from DeepWiki report
     */
    private formatPerformanceReportSection;
    /**
     * Format code quality sections from DeepWiki report
     */
    private formatCodeQualityReportSection;
    /**
     * Format general sections from DeepWiki report
     */
    private formatGeneralReportSection;
    /**
     * Store collected tool results in Vector DB
     */
    private storeToolResultsInVectorDB;
}
