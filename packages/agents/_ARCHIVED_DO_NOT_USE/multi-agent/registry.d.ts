import { AgentProvider, AgentRole } from '@codequal/core/config/agent-registry';
import { AnalysisStrategy, MultiAgentConfig } from './types';
/**
 * Registry of predefined multi-agent configurations
 */
export declare class MultiAgentRegistry {
    private configs;
    private factory;
    private logger;
    constructor();
    /**
     * Initialize default configuration presets
     */
    private initializeDefaultConfigs;
    /**
     * Get all registered configurations
     */
    getAllConfigs(): Record<string, MultiAgentConfig>;
    /**
     * Get a specific configuration by name
     */
    getConfig(name: string): MultiAgentConfig | undefined;
    /**
     * Register a new configuration
     */
    registerConfig(name: string, config: MultiAgentConfig): void;
    /**
     * Find configurations that match certain criteria
     */
    findConfigs(criteria: {
        strategy?: AnalysisStrategy;
        primaryProvider?: AgentProvider;
        primaryRole?: AgentRole;
    }): MultiAgentConfig[];
    /**
     * Get recommended configuration for a specific role
     */
    getRecommendedConfig(role: AgentRole): MultiAgentConfig;
}
/**
 * Get the multi-agent registry instance
 */
export declare function getMultiAgentRegistry(): MultiAgentRegistry;
