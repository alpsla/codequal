import { MultiAgentConfig, MultiAgentResult, RepositoryData } from './types';
/**
 * Execution options
 */
export interface ExecutionOptions {
    /**
     * Enable debug logging
     */
    debug?: boolean;
    /**
     * Timeout in milliseconds
     */
    timeout?: number;
    /**
     * Maximum number of retries
     */
    maxRetries?: number;
    /**
     * Retry delay in milliseconds
     */
    retryDelay?: number;
    /**
     * Custom context to pass to agents
     */
    context?: Record<string, any>;
}
/**
 * Multi-agent executor
 */
export declare class MultiAgentExecutor {
    private logger;
    private config;
    private repositoryData;
    private options;
    private agents;
    private results;
    /**
     * Constructor
     * @param config Multi-agent configuration
     * @param repositoryData Repository data
     * @param options Execution options
     */
    constructor(config: MultiAgentConfig, repositoryData: RepositoryData, options?: ExecutionOptions);
    /**
     * Execute the multi-agent analysis
     * @returns Analysis result
     */
    execute(): Promise<MultiAgentResult>;
    /**
     * Create agents from configuration
     */
    private createAgents;
    /**
     * Create an agent from configuration
     * @param config Agent configuration
     * @param name Agent name for logging
     * @returns Agent instance
     */
    private createAgent;
    /**
     * Execute repository data provider
     * @returns Repository data or undefined if not available
     */
    private executeRepositoryProvider;
    /**
     * Execute agents in parallel
     * @param repoData Repository data
     */
    private executeParallel;
    /**
     * Execute agents sequentially
     * @param repoData Repository data
     */
    private executeSequential;
    /**
     * Execute agents in hybrid mode
     * @param repoData Repository data
     */
    private executeHybrid;
    /**
     * Execute agents in specialized mode
     * @param repoData Repository data
     */
    private executeSpecialized;
    /**
     * Execute orchestrator
     * @returns Orchestrated results or undefined if orchestrator not available
     */
    private executeOrchestrator;
    /**
     * Execute reporter
     * @param orchestratedResults Orchestrated results or undefined
     * @returns Reporter results or undefined if reporter not available
     */
    private executeReporter;
    /**
     * Execute repository interaction agent
     * @param finalResults Final results
     */
    private executeRepositoryInteraction;
    /**
     * Execute a single agent
     * @param agent Agent instance
     * @param name Agent name
     * @param data Data to analyze
     * @returns true if the agent executed successfully, false if it failed and fallback failed too
     */
    private executeAgent;
    /**
     * Collect results from all agents
     * @returns Collected results
     */
    private collectResults;
    /**
     * Collect results from all agents as a map for the new result format
     * @returns Collected results as a map
     */
    private collectResultsAsMap;
    /**
     * Execute fallback agent for a failed agent
     * @param failedAgentName The name of the failed agent
     * @param data The data to analyze
     * @returns Fallback execution result or undefined if all fallbacks failed
     */
    private executeFallback;
    /**
     * Calculate token usage
     * @returns Token usage
     */
    private calculateTokenUsage;
}
