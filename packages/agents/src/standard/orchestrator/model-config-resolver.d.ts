/**
 * Model Configuration Resolver
 *
 * Handles model configuration retrieval with automatic fallback to research
 * when configurations are missing from Supabase.
 */
export interface ModelConfiguration {
    role: string;
    language: string;
    size_category: string;
    primary_provider: string;
    primary_model: string;
    fallback_provider: string;
    fallback_model: string;
    weights: {
        quality: number;
        speed: number;
        cost: number;
        freshness: number;
        contextWindow: number;
    };
    min_requirements?: any;
    reasoning: string[];
}
export declare class ModelConfigResolver {
    private logger?;
    private supabase;
    private researcher;
    private cache;
    constructor(logger?: any | undefined);
    /**
     * Get model configuration for a specific context
     * Automatically researches and creates missing configurations
     */
    getModelConfiguration(role: string, language: string, size: string): Promise<ModelConfiguration>;
    /**
     * Research optimal models for a specific context
     */
    private researchModelForContext;
    /**
     * Store configuration in Supabase
     */
    private storeConfiguration;
    /**
     * Transform database record to ModelConfiguration
     */
    private transformConfig;
    /**
     * Trigger urgent model research for a specific context
     */
    private triggerUrgentModelResearch;
    /**
     * Get default configuration as ultimate fallback
     * Uses actual API call to get available models dynamically
     */
    private getDefaultConfiguration;
    /**
     * Extract provider from model ID
     */
    private extractProvider;
    /**
     * Get priority for a role
     */
    private getPriorityForRole;
    /**
     * Calculate weights for a role and size
     */
    private calculateWeightsForRole;
    /**
     * Get minimum requirements for a role and size
     */
    private getMinRequirements;
    /**
     * Get default weights
     */
    private getDefaultWeights;
    /**
     * Get fallback model from existing configurations or research
     */
    private getFallbackModelFromConfig;
    /**
     * Clear cache
     */
    clearCache(): void;
    /**
     * Log helper
     */
    private log;
}
