/**
 * Model Researcher Service
 *
 * Responsibilities:
 * 1. Research and evaluate latest AI models quarterly
 * 2. Store model configurations in Supabase
 * 3. Provide cached model selections for different contexts
 * 4. Handle orchestrator requests for specific context research
 */
interface ContextRequest {
    language: string;
    repo_size: string;
    framework?: string;
    task_type?: string;
    specific_requirements?: string[];
}
export declare class ModelResearcherService {
    private supabase;
    private readonly RESEARCH_INTERVAL_DAYS;
    private readonly QUALITY_WEIGHT;
    private readonly SPEED_WEIGHT;
    private readonly PRICE_WEIGHT;
    constructor();
    /**
     * Get optimal model for context - uses cached research from Supabase
     */
    getOptimalModelForContext(context: ContextRequest): Promise<string>;
    /**
     * Check if research data is fresh (within quarterly window)
     */
    private checkResearchFreshness;
    /**
     * Conduct quarterly research on all available models
     * This should be scheduled to run every 90 days
     */
    conductQuarterlyResearch(): Promise<void>;
    /**
     * Search the web for latest AI models using web search
     * This is Step 1 of the proper flow: Web Search → OpenRouter validation
     */
    private searchWebForLatestModels;
    /**
     * Parse WebSearch results to extract model information
     * NO hardcoded model names - dynamically extract from search results
     */
    private parseWebSearchResults;
    /**
     * Match web-discovered models with OpenRouter catalog
     * This validates that the models found on the web are available in OpenRouter
     */
    private matchWebModelsWithOpenRouter;
    /**
     * Research a specific model's capabilities
     */
    private researchModel;
    /**
     * Request specific context research from orchestrator
     * Called when cached research doesn't cover the needed context
     */
    requestSpecificContextResearch(context: ContextRequest): Promise<string>;
    /**
     * Research models for a specific context
     */
    private researchSpecificContext;
    /**
     * Calculate context-specific score for a model
     */
    private calculateContextSpecificScore;
    /**
     * Store research results in Supabase
     */
    private storeResearchResults;
    /**
     * Store specific context research
     */
    private storeSpecificResearch;
    /**
     * Update research metadata
     */
    private updateResearchMetadata;
    /**
     * Notify orchestrator about research needs
     */
    private notifyOrchestrator;
    /**
     * Fetch available models from OpenRouter API
     */
    private fetchAvailableModels;
    /**
     * Calculate quality score for a model
     */
    private calculateQualityScore;
    /**
     * Calculate speed score for a model
     */
    private calculateSpeedScore;
    /**
     * Calculate price score for a model
     */
    private calculatePriceScore;
    /**
     * Determine optimal use cases for a model
     */
    private determineOptimalUseCases;
    /**
     * Detect model specializations
     */
    private detectSpecializations;
    /**
     * Get fallback model for emergencies
     */
    private getFallbackModel;
    /**
     * Get total model count
     */
    private getModelCount;
}
export {};
