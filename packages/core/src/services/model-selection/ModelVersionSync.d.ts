/**
 * Model Version Synchronization Utility
 *
 * This utility ensures consistent model versions are used across
 * various components of the CodeQual system, including DeepWiki
 * integration, PR analysis, and repository analysis.
 */
import { Logger } from '../../utils/logger';
import { RepositorySizeCategory, TestingStatus, RepositoryModelConfig } from '../../config/models/repository-model-config';
export { RepositorySizeCategory } from '../../config/models/repository-model-config';
export interface TestResults {
    status: TestingStatus;
    avgResponseTime: number;
    avgResponseSize: number;
    qualityScore?: number;
    testCount: number;
    lastTested: string;
}
/**
 * Model capability ratings
 */
export interface ModelCapabilities {
    /**
     * Quality of code understanding (1-10)
     */
    codeQuality?: number;
    /**
     * Speed of response (1-10, higher is faster)
     */
    speed?: number;
    /**
     * Context window size in tokens
     */
    contextWindow?: number;
    /**
     * Model reasoning ability (1-10)
     */
    reasoning?: number;
    /**
     * Detail level in responses (1-10)
     */
    detailLevel?: number;
}
/**
 * Model pricing information
 */
export interface ModelPricing {
    /**
     * Input cost per 1M tokens in USD
     */
    input: number;
    /**
     * Output cost per 1M tokens in USD
     */
    output: number;
}
/**
 * Model usage tier classification
 */
export declare enum ModelTier {
    PREMIUM = "premium",
    ADVANCED = "advanced",
    STANDARD = "standard",
    SPECIALIZED = "specialized",
    ECONOMY = "economy",
    ENTERPRISE = "enterprise"
}
/**
 * Version information for a specific model
 */
export interface ModelVersionInfo {
    /**
     * Provider name
     */
    provider: string;
    /**
     * Model name
     */
    model: string;
    /**
     * Current version ID (if applicable)
     */
    versionId?: string;
    /**
     * Release date of this version
     */
    releaseDate?: string;
    /**
     * Description of changes in this version
     */
    description?: string;
    /**
     * Model capabilities rating
     */
    capabilities?: ModelCapabilities;
    /**
     * Pricing information
     */
    pricing?: ModelPricing;
    /**
     * Usage tier
     */
    tier?: ModelTier;
    /**
     * Whether this model is preferred for specific use cases
     */
    preferredFor?: string[];
    /**
     * Deprecated flag - if true, this model is scheduled for removal
     */
    deprecated?: boolean;
}
/**
 * Model version synchronization service
 */
/**
 * Model provider plugin interface for registering models
 */
export interface ModelProviderPlugin {
    /**
     * Provider name
     */
    provider: string;
    /**
     * Register models from this provider
     * @returns Array of model version information
     */
    registerModels(): ModelVersionInfo[];
    /**
     * Optional function to validate model configuration
     * @param config Model configuration
     * @returns Whether the config is valid
     */
    validateModelConfig?(config: ModelVersionInfo): boolean;
}
/**
 * Repository context classification
 */
export interface RepositoryContext {
    /**
     * Repository language
     */
    language: string;
    /**
     * Repository size category
     */
    sizeCategory: RepositorySizeCategory;
    /**
     * Additional context tags
     */
    tags?: string[];
}
export declare class ModelVersionSync {
    private logger;
    private supabaseUrl?;
    private supabaseKey?;
    private modelConfigStore?;
    private cachedModels;
    private lastCacheUpdate;
    private readonly CACHE_TTL_MS;
    /**
     * Constructor
     * @param logger Logger instance
     * @param supabaseUrl Optional Supabase URL for database access
     * @param supabaseKey Optional Supabase key for database access
     */
    constructor(logger: Logger, supabaseUrl?: string, supabaseKey?: string);
    /**
     * Initialize the model config store for database access
     */
    private initializeModelConfigStore;
    /**
     * Refresh the model cache from database
     */
    private refreshModelCache;
    /**
     * Get pricing information for a model
     */
    private getPricingForModel;
    /**
     * Get all available models (from cache or hardcoded)
     */
    private getAvailableModels;
    /**
     * Register a new model in the database
     * This method now stores models in the database via ModelConfigStore
     *
     * @param modelInfo Model version information
     * @returns Whether the registration was successful
     */
    registerModel(modelInfo: ModelVersionInfo): Promise<boolean>;
    /**
     * Update an existing model version
     *
     * @param modelInfo Model version information
     * @returns Whether the update was successful
     */
    updateModelVersion(modelInfo: ModelVersionInfo): Promise<boolean>;
    /**
     * Deprecate a model version
     *
     * @param provider Provider name
     * @param model Model name
     * @param replacementKey Optional replacement model key
     * @returns Whether the deprecation was successful
     */
    deprecateModel(provider: string, model: string, replacementKey?: string): Promise<boolean>;
    /**
     * Register models from a provider plugin
     *
     * @param plugin Provider plugin
     * @returns Number of models registered
     */
    registerProvider(plugin: ModelProviderPlugin): Promise<number>;
    /**
     * Get the canonical version information for a model
     *
     * @param provider Provider name
     * @param model Model name
     * @returns Canonical version information or null if not found
     */
    getCanonicalVersion(provider: string, model: string): Promise<ModelVersionInfo | null>;
    /**
     * Standardize a model configuration to use the canonical version
     *
     * @param config Model configuration
     * @returns Standardized model configuration
     */
    standardizeModelConfig(config: RepositoryModelConfig): Promise<RepositoryModelConfig>;
    /**
     * Standardize a full configuration map to use canonical versions
     *
     * @param configMap Configuration map by language and size
     * @returns Standardized configuration map
     */
    standardizeConfigMap(configMap: Record<string, Record<RepositorySizeCategory, RepositoryModelConfig>>): Promise<Record<string, Record<RepositorySizeCategory, RepositoryModelConfig>>>;
    /**
     * Get the latest model version for a provider
     *
     * @param provider Provider name
     * @returns Latest model version information by model
     */
    getLatestVersionsByProvider(provider: string): Record<string, ModelVersionInfo>;
    /**
     * Log a report of the currently used model versions
     */
    logModelVersionReport(): void;
    /**
     * Get all models for a provider sorted by suitability for a repository
     *
     * @param provider Provider name
     * @returns Models for this provider
     */
    getModelsForProvider(provider: string): ModelVersionInfo[];
    /**
     * Find the optimal model for a given repository context
     * Returns both primary and fallback models when includeFallback is true
     *
     * @param context Repository context
     * @param preferredProvider Optional preferred provider
     * @param includeFallback Whether to return fallback model as well
     * @returns Best model for this context, or array of [primary, fallback] if includeFallback is true
     */
    findOptimalModel(context: RepositoryContext, preferredProvider?: string, includeFallback?: boolean): Promise<ModelVersionInfo | ModelVersionInfo[] | null>;
    /**
     * Calculate a suitability score for a model given a repository context
     *
     * @param model Model info
     * @param context Repository context
     * @returns Suitability score (higher is better)
     */
    private calculateModelScore;
    /**
     * Generate model configuration map for all repository contexts
     *
     * @returns Complete configuration map for all language/size combinations
     */
    generateCompleteConfigMap(): Promise<Record<string, Record<RepositorySizeCategory, RepositoryModelConfig>>>;
    /**
     * Store a model version with OpenRouter validation
     * This ensures only valid OpenRouter model names are stored in Vector DB
     */
    storeValidatedModel(modelInfo: ModelVersionInfo, language: string, sizeCategory: RepositorySizeCategory): Promise<ModelVersionInfo | null>;
}
/**
 * Create a DeepWiki-compatible model config from a canonical version
 *
 * @param versionInfo Model version information
 * @returns DeepWiki model configuration
 */
export declare function createDeepWikiModelConfig(versionInfo: ModelVersionInfo): Record<string, string>;
