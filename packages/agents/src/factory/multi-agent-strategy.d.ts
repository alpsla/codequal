import { AgentProvider, AgentRole } from '@codequal/core/config/agent-registry';
import { AnalysisResult } from '../../../core/src';
import { Agent } from '../agent';
/**
 * Multi-agent strategy options
 */
export declare enum MultiAgentStrategy {
    PARALLEL = "parallel",
    SEQUENTIAL = "sequential",
    SPECIALIZED = "specialized"
}
/**
 * Configuration for multi-agent strategy
 */
export interface MultiAgentConfig {
    strategy: MultiAgentStrategy;
    primaryProvider: AgentProvider;
    secondaryProviders: AgentProvider[];
    role: AgentRole;
    config?: Record<string, unknown>;
}
/**
 * Class for managing multi-agent strategies
 */
export declare class MultiAgentManager {
    private logger;
    /**
     * Create a multi-agent strategy
     * @param config Multi-agent configuration
     * @returns Multi-agent strategy instance
     */
    createMultiAgentStrategy(config: MultiAgentConfig): MultiAgent;
    /**
     * Default multi-agent configurations for each role
     */
    private static readonly RECOMMENDED_CONFIGURATIONS;
    /**
     * Default multi-agent configuration to use when no specific configuration is found
     */
    private static readonly DEFAULT_CONFIGURATION;
    /**
     * Get a recommended multi-agent strategy for a role
     * @param role Agent role
     * @returns Multi-agent configuration
     */
    getRecommendedStrategyForRole(role: AgentRole): MultiAgentConfig;
}
/**
 * Base class for multi-agent strategies
 */
export declare abstract class MultiAgent implements Agent {
    protected primaryAgent: Agent;
    protected secondaryAgents: Agent[];
    protected config: MultiAgentConfig;
    protected logger: import("@codequal/core/utils").Logger;
    /**
     * Constructor
     * @param config Multi-agent configuration
     */
    constructor(config: MultiAgentConfig);
    /**
     * Analyze data using the multi-agent strategy
     * @param data Data to analyze
     * @returns Analysis result
     */
    abstract analyze(data: Record<string, unknown>): Promise<AnalysisResult>;
    /**
     * Log an informational message
     * @param message Message
     * @param data Additional data
     */
    log(message: string, data?: unknown): void;
    /**
     * Log an error message
     * @param message Message
     * @param error Error object
     */
    error(message: string, error: unknown): void;
}
/**
 * Parallel multi-agent strategy
 *
 * Runs all agents in parallel and combines results
 */
export declare class ParallelMultiAgent extends MultiAgent {
    /**
     * Analyze data using parallel agents
     * @param data Data to analyze
     * @returns Combined analysis result
     */
    analyze(data: Record<string, unknown>): Promise<AnalysisResult>;
    /**
     * Combine multiple analysis results
     * @param results Analysis results
     * @returns Combined result
     */
    private combineResults;
}
/**
 * Sequential multi-agent strategy
 *
 * Runs primary agent first, then passes results to secondary agents for enhancement
 */
export declare class SequentialMultiAgent extends MultiAgent {
    /**
     * Analyze data using sequential agents
     * @param data Data to analyze
     * @returns Enhanced analysis result
     */
    analyze(data: Record<string, unknown>): Promise<AnalysisResult>;
    /**
     * Merge primary and enhanced results
     * @param primary Primary result
     * @param enhanced Enhanced result
     * @returns Merged result
     */
    private mergeResults;
}
/**
 * Specialized multi-agent strategy
 *
 * Uses each agent for its specialty and combines results
 */
export declare class SpecializedMultiAgent extends MultiAgent {
    /**
     * Analyze data using specialized agents with context enrichment
     * @param data Data to analyze
     * @returns Combined analysis result with domain-specific insights
     */
    analyze(data: Record<string, unknown>): Promise<AnalysisResult>;
    /**
     * Get focus area based on role
     * @param role Agent role
     * @returns Focus area for specialized context
     */
    private getRoleFocusArea;
    /**
     * Combine specialized results with domain weighting
     * @param results Results from different agents
     * @returns Combined results with specialty weighting
     */
    private combineSpecializedResults;
}
