/**
 * RESEARCHER Agent - Continuously researches and updates optimal AI model configurations
 *
 * This agent:
 * 1. Researches current AI models from all major providers
 * 2. Analyzes pricing, performance, and capabilities
 * 3. Generates optimal configurations for all agent roles, languages, and repository sizes
 * 4. Updates the CANONICAL_MODEL_VERSIONS collection dynamically
 * 5. Runs on scheduled intervals to keep configurations current
 */
import { AuthenticatedUser } from '../../../core/src/types';
import { ModelVersionInfo, ModelCapabilities, ModelPricing, ModelTier, RepositorySizeCategory } from '../../../core/src/services/model-selection/ModelVersionSync';
/**
 * Research configuration for the RESEARCHER agent
 */
export interface ResearchConfig {
    /**
     * Whether to include experimental/beta models
     */
    includeExperimental: boolean;
    /**
     * Maximum cost per 1M tokens for consideration
     */
    maxCostPerMillion: number;
    /**
     * Minimum performance threshold (1-10 scale)
     */
    minPerformanceThreshold: number;
    /**
     * Whether to prioritize cost over performance
     */
    prioritizeCost: boolean;
    /**
     * Model providers to research
     */
    providers: string[];
    /**
     * Research depth level
     */
    researchDepth: 'quick' | 'comprehensive' | 'deep' | 'dynamic_discovery';
}
/**
 * Persistent cache configuration for the researcher model
 */
export interface ResearcherCache {
    /**
     * Current researcher model being used
     */
    currentModel: ModelVersionInfo;
    /**
     * When the template was cached
     */
    templateCachedAt: Date;
    /**
     * Template ID for referencing cached content
     */
    templateId: string;
    /**
     * Session ID for conversation continuity
     */
    sessionId: string;
    /**
     * Total requests made using this cached researcher
     */
    requestCount: number;
    /**
     * Whether template is currently cached and active
     */
    isActive: boolean;
    /**
     * No expiration - cache until explicit upgrade
     */
    expiresAt: null;
    /**
     * Database configuration ID for synchronization
     */
    dbConfigId?: string;
}
/**
 * Meta-research result for evaluating the researcher itself
 */
export interface MetaResearchResult {
    /**
     * Current researcher model evaluation
     */
    currentModel: {
        provider: string;
        model: string;
        researchScore: number;
        strengths: string[];
        weaknesses: string[];
    };
    /**
     * Recommendation for researcher upgrade
     */
    recommendation: {
        shouldUpgrade: boolean;
        primary?: {
            provider: string;
            model: string;
            version: string;
            researchScore: number;
            whyBetterForResearch: string;
            costImplication: string;
        };
        fallback?: {
            provider: string;
            model: string;
            researchScore: number;
            whyFallback: string;
        };
    };
    /**
     * Upgrade recommendation details
     */
    upgradeRecommendation: {
        urgency: 'high' | 'medium' | 'low';
        reasoning: string;
        migrationEffort: string;
        expectedImprovement: string;
    };
    /**
     * When this meta-research was conducted
     */
    researchedAt: Date;
    /**
     * Confidence in the recommendation
     */
    confidence: number;
}
/**
 * Research result for a specific model
 */
export interface ModelResearchResult {
    /**
     * Model information discovered
     */
    model: ModelVersionInfo;
    /**
     * Confidence in this information (0-1)
     */
    confidence: number;
    /**
     * Source of the information
     */
    source: string;
    /**
     * Timestamp of research
     */
    researchedAt: Date;
    /**
     * Cost-effectiveness score (0-10)
     */
    costEffectivenessScore: number;
    /**
     * Recommended use cases
     */
    recommendedUseCases: string[];
}
/**
 * Configuration update recommendation
 */
export interface ConfigurationUpdate {
    /**
     * Context this update applies to
     */
    context: {
        language: string;
        sizeCategory: RepositorySizeCategory;
        agentRole: string;
    };
    /**
     * Current model configuration
     */
    currentModel: ModelVersionInfo | null;
    /**
     * Recommended new model
     */
    recommendedModel: ModelVersionInfo;
    /**
     * Reason for the recommendation
     */
    reason: string;
    /**
     * Expected improvement metrics
     */
    expectedImprovement: {
        costSaving?: number;
        performanceGain?: number;
        reliabilityGain?: number;
    };
    /**
     * Priority of this update (1-10)
     */
    priority: number;
}
/**
 * RESEARCHER Agent implementation
 */
export declare class ResearcherAgent {
    private authenticatedUser;
    private logger;
    private modelVersionSync;
    private researchConfig;
    private researcherCache;
    constructor(authenticatedUser: AuthenticatedUser, config?: Partial<ResearchConfig>);
    /**
     * Main research and update workflow
     * This is the primary method that orchestrates the entire research process
     */
    conductResearchAndUpdate(): Promise<{
        researchResults: ModelResearchResult[];
        configurationUpdates: ConfigurationUpdate[];
        summary: {
            modelsResearched: number;
            configurationsUpdated: number;
            totalCostSavings: number;
            performanceImprovements: number;
        };
    }>;
    /**
     * Research current AI models using dynamic discovery - no hardcoded limitations
     */
    private researchCurrentModels;
    /**
     * Perform dynamic model discovery - find models not in hardcoded lists
     */
    private dynamicModelDiscovery;
    /**
     * Extract unique providers from discovery results
     */
    private extractProvidersFromDiscovery;
    /**
     * Research models from a specific provider
     */
    private researchProviderModels;
    /**
     * Get latest OpenAI models with updated pricing and capabilities
     */
    private getOpenAIModels;
    /**
     * Get latest Anthropic models
     */
    private getAnthropicModels;
    /**
     * Get latest Google models
     */
    private getGoogleModels;
    /**
     * Get latest DeepSeek models
     */
    private getDeepSeekModels;
    /**
     * Get latest OpenRouter models
     */
    private getOpenRouterModels;
    /**
     * Analyze and score models for cost-effectiveness and performance
     */
    private analyzeAndScoreModels;
    /**
     * Calculate comprehensive model score balancing quality, recency, performance, and cost
     */
    private calculateCostEffectiveness;
    /**
     * Calculate recency score based on release date
     */
    private calculateRecencyScore;
    /**
     * Normalize context window to 0-10 scale
     */
    private normalizeContextWindow;
    /**
     * Calculate cost score (higher score = better value)
     */
    private calculateCostScore;
    /**
     * Generate configuration recommendations using role-specific cross-market research
     */
    private generateConfigurationRecommendations;
    /**
     * Generate cross-market recommendations for a specific agent role
     */
    private generateRoleSpecificRecommendations;
    /**
     * Get the appropriate research prompt for a specific agent role
     */
    private getRoleSpecificPrompt;
    /**
     * Get specific requirements for each agent role
     */
    private getRoleSpecificRequirements;
    /**
     * Perform cross-market research for a specific agent role
     */
    private crossMarketRoleResearch;
    /**
     * Simulate what cross-market research would find for each role
     */
    private simulateCrossMarketResearch;
    /**
     * Evaluate if the role-specific model is better than current configuration
     */
    private evaluateRoleSpecificUpdate;
    /**
     * Generate recommendation for a specific context
     */
    private generateContextualRecommendation;
    /**
     * Find the best model for a specific context from research results
     */
    private findBestModelForContext;
    /**
     * Calculate improvement metrics between current and recommended model
     */
    private calculateImprovement;
    /**
     * Calculate overall performance score for a model
     */
    private calculateOverallPerformance;
    /**
     * Calculate priority for an update (1-10 scale)
     */
    private calculateUpdatePriority;
    /**
     * Apply configuration updates to the CANONICAL_MODEL_VERSIONS
     */
    private applyConfigurationUpdates;
    /**
     * Generate research summary
     */
    private generateResearchSummary;
    /**
     * Schedule regular research updates for repository model configurations
     */
    scheduleRegularUpdates(intervalHours?: number): Promise<void>;
    /**
     * Schedule quarterly meta-research to evaluate the researcher itself
     * Based on realistic AI model release patterns (major releases every 3-4 months)
     */
    scheduleQuarterlyMetaResearch(intervalDays?: number): Promise<void>;
    /**
     * Store meta-research results for manual review and decision-making
     */
    private storeMetaResearchResult;
    /**
     * Initialize persistent cache for the researcher model
     * Cache once and use until explicit upgrade - no expiration
     */
    private initializePersistentCache;
    /**
     * Load existing cache from storage (persistent across restarts)
     */
    private loadExistingCache;
    /**
     * Save cache to persistent storage
     */
    private saveCache;
    /**
     * Find current researcher model from configuration
     */
    private findCurrentResearcherModel;
    /**
     * Use cached researcher for context requests (with template reference)
     * This is where the token savings happen - only send context, not full template
     * Includes automatic cache-DB synchronization
     */
    useResearcherForContext(language: string, sizeCategory: RepositorySizeCategory, agentRole: string, frameworks: string[], complexity: number): Promise<{
        prompt: string;
        tokensUsed: number;
        templateReused: boolean;
    }>;
    /**
     * Check if cache is synchronized with database configuration
     */
    isCacheSyncWithDB(): Promise<boolean>;
    /**
     * Synchronize cache with database configuration
     */
    syncCacheWithDB(): Promise<void>;
    /**
     * Load researcher configuration from database
     */
    private loadDBConfig;
    /**
     * Save researcher configuration to database
     */
    private saveDBConfig;
    /**
     * Re-cache template with new researcher model
     */
    private cacheTemplateWithNewResearcher;
    /**
     * Generate context-specific request that references cached template
     */
    private generateContextRequest;
    /**
     * Get role-specific evaluation criteria
     */
    private getEvaluationCriteria;
    /**
     * Conduct meta-research: Have the researcher research itself
     * This is separate from the context loop and evaluates research capabilities
     */
    conductMetaResearch(): Promise<MetaResearchResult>;
    /**
     * Generate meta-research prompt for the researcher to evaluate itself
     */
    private generateMetaResearchPrompt;
    /**
     * Simulate meta-research response (in production, this would be actual AI response)
     */
    private simulateMetaResearchResponse;
    /**
     * Explicitly upgrade the researcher model with atomic DB-cache coordination
     */
    upgradeResearcher(newProvider: string, newModel: string, newVersion: string, reason: string, capabilities?: ModelCapabilities, pricing?: ModelPricing, tier?: ModelTier): Promise<{
        success: boolean;
        oldModel: string;
        newModel: string;
        requiresRecaching: boolean;
        dbConfigId?: string;
    }>;
    /**
     * Find model information for upgrade
     */
    private findModelInfo;
    /**
     * Get cache statistics
     */
    getCacheStats(): {
        isActive: boolean;
        model: string;
        cachedSince: Date | null;
        requestCount: number;
        sessionId: string | null;
        templateId: string | null;
        dbConfigId: string | null;
        tokensSaved: number;
        isSyncWithDB?: boolean;
    };
    private generateNewSessionId;
    private generateNewTemplateId;
    private generateNewConfigId;
}
