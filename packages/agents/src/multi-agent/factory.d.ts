import { Agent } from '../agent';
import { AgentConfig, MultiAgentConfig, AgentPosition, AnalysisStrategy } from './types';
import { AgentProvider, AgentRole } from '@codequal/core/config/agent-registry';
import { RepositoryContext, PRContext, UserPreferences } from './evaluation/agent-evaluation-data';
/**
 * Factory class for creating multi-agent configurations and instances
 */
export declare class MultiAgentFactory {
    private logger;
    private agentSelector;
    constructor();
    /**
     * Creates a set of agent configurations for a multi-agent analysis
     * @param analysisType Type of analysis to perform
     * @param primaryConfig Primary agent configuration
     * @param secondaryConfigs Secondary agent configurations
     * @param options Additional options
     * @returns Multi-agent configuration
     */
    createConfiguration(analysisType: string, primaryConfig: AgentConfig, secondaryConfigs?: AgentConfig[], options?: {
        fallbackEnabled?: boolean;
        fallbackAgents?: AgentConfig[];
        combineResults?: boolean;
        strategy?: AnalysisStrategy;
    }): MultiAgentConfig;
    /**
     * Creates a set of agents for a specific multi-agent configuration
     * @param config Multi-agent configuration
     * @returns Map of agent instances
     */
    createAgents(config: MultiAgentConfig): Map<string, Agent>;
    /**
     * Creates an agent from a configuration
     * @param config Agent configuration
     * @param name Agent name
     * @returns Agent instance
     */
    private createAgentFromConfig;
    /**
     * Gets fallback agents for a specific multi-agent configuration
     * @param config Multi-agent configuration
     * @returns Array of fallback agent configurations
     */
    getFallbackAgents(config: MultiAgentConfig): AgentConfig[];
    /**
     * Creates a configuration with fallbacks
     * @param name Configuration name
     * @param strategy Analysis strategy
     * @param primaryAgentSelection Primary agent selection
     * @param secondaryAgentSelections Secondary agent selections
     * @param options Additional options
     * @returns Multi-agent configuration
     */
    createConfigWithFallbacks(name: string, strategy: AnalysisStrategy, primaryAgentSelection: {
        provider: AgentProvider;
        role: AgentRole;
        position?: AgentPosition;
    }, secondaryAgentSelections?: Array<{
        provider: AgentProvider;
        role: AgentRole;
        position?: AgentPosition;
    }>, options?: {
        description?: string;
        fallbackTimeout?: number;
        maxConcurrentAgents?: number;
    }): MultiAgentConfig;
    /**
     * Creates a configuration without fallbacks
     * @param name Configuration name
     * @param strategy Analysis strategy
     * @param primaryConfig Primary agent configuration
     * @param secondaryConfigs Secondary agent configurations
     * @param fallbackConfigs Fallback agent configurations
     * @param options Additional options
     * @returns Multi-agent configuration
     */
    createConfig(name: string, strategy: AnalysisStrategy, primaryConfig: {
        provider: AgentProvider;
        role: AgentRole;
        position: AgentPosition;
    }, secondaryConfigs: Array<{
        provider: AgentProvider;
        role: AgentRole;
        position: AgentPosition;
    }>, fallbackConfigs?: Array<{
        provider: AgentProvider;
        role: AgentRole;
        position: AgentPosition;
        priority?: number;
    }>, options?: {
        description?: string;
        fallbackEnabled?: boolean;
        fallbackTimeout?: number;
        maxConcurrentAgents?: number;
    }): MultiAgentConfig;
    /**
     * Create adaptive configuration based on repository and PR context
     * Uses the agent evaluation system to select optimal agents
     * @param name Name of the configuration
     * @param strategy Analysis strategy
     * @param roles Roles to analyze
     * @param repoContext Repository context
     * @param prContext PR context
     * @param options Optional configuration options
     * @returns Multi-agent configuration
     */
    createAdaptiveConfig(name: string, strategy: AnalysisStrategy, roles: AgentRole[], repoContext: RepositoryContext, prContext: PRContext, userPreferences?: UserPreferences, options?: {
        fallbackEnabled?: boolean;
        fallbackTimeout?: number;
        fallbackRetries?: number;
        includeSecondary?: boolean;
        maxCost?: number;
    }): MultiAgentConfig;
    /**
     * Generate fallback providers excluding the ones already in use
     * @param primaryProvider Primary provider
     * @param secondaryProviders Secondary providers
     * @returns Array of fallback providers
     */
    private generateFallbackProviders;
}
