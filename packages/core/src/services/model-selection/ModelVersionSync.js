"use strict";
/**
 * Model Version Synchronization Utility
 *
 * This utility ensures consistent model versions are used across
 * various components of the CodeQual system, including DeepWiki
 * integration, PR analysis, and repository analysis.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelVersionSync = exports.ModelTier = exports.RepositorySizeCategory = void 0;
exports.createDeepWikiModelConfig = createDeepWikiModelConfig;
const repository_model_config_1 = require("../../config/models/repository-model-config");
const ModelConfigStore_1 = require("./ModelConfigStore");
const openrouter_model_validator_1 = require("./openrouter-model-validator");
// Export types for other modules
var repository_model_config_2 = require("../../config/models/repository-model-config");
Object.defineProperty(exports, "RepositorySizeCategory", { enumerable: true, get: function () { return repository_model_config_2.RepositorySizeCategory; } });
/**
 * Model usage tier classification
 */
var ModelTier;
(function (ModelTier) {
    ModelTier["PREMIUM"] = "premium";
    ModelTier["ADVANCED"] = "advanced";
    ModelTier["STANDARD"] = "standard";
    ModelTier["SPECIALIZED"] = "specialized";
    ModelTier["ECONOMY"] = "economy";
    ModelTier["ENTERPRISE"] = "enterprise";
})(ModelTier || (exports.ModelTier = ModelTier = {}));
/**
 * Fallback model configurations for emergency use
 * These are ONLY used when database is completely unavailable
 */
const EMERGENCY_FALLBACK_MODELS = {
    'openai/gpt-4o': {
        provider: 'openai',
        model: 'gpt-4o',
        versionId: 'emergency-fallback',
        releaseDate: '2025-07-01',
        description: 'Emergency fallback model - database unavailable',
        capabilities: {
            codeQuality: 8.0,
            speed: 8.0,
            contextWindow: 128000,
            reasoning: 8.0,
            detailLevel: 8.0
        },
        pricing: {
            input: 10.00,
            output: 30.00
        },
        tier: ModelTier.STANDARD,
        preferredFor: ['emergency_fallback']
    }
};
class ModelVersionSync {
    /**
     * Constructor
     * @param logger Logger instance
     * @param supabaseUrl Optional Supabase URL for database access
     * @param supabaseKey Optional Supabase key for database access
     */
    constructor(logger, supabaseUrl, supabaseKey) {
        this.logger = logger;
        this.supabaseUrl = supabaseUrl;
        this.supabaseKey = supabaseKey;
        this.cachedModels = {};
        this.lastCacheUpdate = 0;
        this.CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache
        this.logger.info('ModelVersionSync initialized');
        // Initialize model config store if credentials provided
        if (supabaseUrl && supabaseKey) {
            this.initializeModelConfigStore(supabaseUrl, supabaseKey);
        }
    }
    /**
     * Initialize the model config store for database access
     */
    async initializeModelConfigStore(url, key) {
        try {
            this.modelConfigStore = new ModelConfigStore_1.ModelConfigStore(this.logger, url, key);
            await this.modelConfigStore.init();
            this.logger.info('ModelConfigStore initialized successfully');
            // Load initial models from database
            await this.refreshModelCache();
        }
        catch (error) {
            this.logger.error('Failed to initialize ModelConfigStore', { error });
            // Fall back to hardcoded models
        }
    }
    /**
     * Refresh the model cache from database
     */
    async refreshModelCache() {
        if (!this.modelConfigStore)
            return;
        try {
            const dbConfigs = await this.modelConfigStore.getAllModelConfigs();
            const models = {};
            const modelContextMap = new Map();
            // Convert database configs to ModelVersionInfo format
            for (const [language, sizeConfigs] of Object.entries(dbConfigs)) {
                for (const [size, config] of Object.entries(sizeConfigs)) {
                    const modelConfig = config;
                    const key = `${modelConfig.provider}/${modelConfig.model}`;
                    // Track all contexts where this model is used
                    if (!modelContextMap.has(key)) {
                        modelContextMap.set(key, new Set());
                    }
                    const contextSet = modelContextMap.get(key);
                    if (contextSet) {
                        contextSet.add(language);
                        contextSet.add(`${size}_repositories`);
                    }
                    // Create or update ModelVersionInfo
                    if (!models[key]) {
                        // First time seeing this model - create full entry
                        const pricing = modelConfig.pricing || this.getPricingForModel(modelConfig.provider, modelConfig.model);
                        // Debug logging
                        if (key.includes('nano')) {
                            this.logger.info('Loading model with pricing', {
                                model: key,
                                testResultsPricing: modelConfig.pricing,
                                finalPricing: pricing
                            });
                        }
                        models[key] = {
                            provider: modelConfig.provider,
                            model: modelConfig.model,
                            versionId: modelConfig.model,
                            releaseDate: modelConfig.testResults?.lastTested || new Date().toISOString(),
                            description: modelConfig.notes || `${modelConfig.provider} ${modelConfig.model}`,
                            capabilities: {
                                codeQuality: modelConfig.testResults?.qualityScore || 8.0,
                                speed: 8.0,
                                contextWindow: 128000,
                                reasoning: 8.0,
                                detailLevel: 8.0
                            },
                            pricing: pricing,
                            tier: ModelTier.STANDARD,
                            preferredFor: []
                        };
                    }
                    // Update preferredFor with all contexts
                    const contexts = modelContextMap.get(key);
                    if (contexts) {
                        models[key].preferredFor = Array.from(contexts);
                    }
                }
            }
            // Use database models exclusively
            this.cachedModels = models;
            this.lastCacheUpdate = Date.now();
            this.logger.info('Model cache refreshed from database', {
                databaseModels: Object.keys(models).length,
                totalModels: Object.keys(this.cachedModels).length
            });
        }
        catch (error) {
            this.logger.error('Failed to refresh model cache', { error });
        }
    }
    /**
     * Get pricing information for a model
     */
    getPricingForModel(provider, model) {
        // Check if we have pricing in cached models
        const canonicalKey = `${provider}/${model}`;
        const canonical = this.cachedModels[canonicalKey];
        if (canonical?.pricing)
            return canonical.pricing;
        // Default pricing based on provider
        const defaultPricing = {
            'openai': { input: 5.0, output: 15.0 },
            'anthropic': { input: 15.0, output: 75.0 },
            'google': { input: 7.0, output: 21.0 },
            'deepseek': { input: 0.7, output: 1.0 },
            'openrouter': { input: 10.0, output: 30.0 }
        };
        return defaultPricing[provider] || { input: 5.0, output: 15.0 };
    }
    /**
     * Get all available models (from cache or hardcoded)
     */
    async getAvailableModels() {
        // Check if cache needs refresh
        if (this.modelConfigStore && Date.now() - this.lastCacheUpdate > this.CACHE_TTL_MS) {
            await this.refreshModelCache();
        }
        // Return cached models if available, otherwise emergency fallback
        return Object.keys(this.cachedModels).length > 0 ? this.cachedModels : EMERGENCY_FALLBACK_MODELS;
    }
    /**
     * Register a new model in the database
     * This method now stores models in the database via ModelConfigStore
     *
     * @param modelInfo Model version information
     * @returns Whether the registration was successful
     */
    async registerModel(modelInfo) {
        try {
            if (!this.modelConfigStore) {
                this.logger.error('ModelConfigStore not initialized - cannot register models');
                return false;
            }
            const key = `${modelInfo.provider}/${modelInfo.model}`;
            // Check if the model already exists in cache
            if (this.cachedModels[key]) {
                this.logger.warn(`Model ${key} already exists. Use updateModelVersion to update it.`);
                return false;
            }
            // Basic validation
            if (!modelInfo.provider || !modelInfo.model) {
                this.logger.error('Invalid model information: provider and model fields are required');
                return false;
            }
            // Store in cache immediately
            this.cachedModels[key] = modelInfo;
            // TODO: Store in database via ModelConfigStore
            // This would require adding a method to ModelConfigStore to store individual models
            this.logger.info(`Model ${key} registered successfully in cache`);
            this.logger.warn('Database storage for individual model registration not yet implemented');
            return true;
        }
        catch (error) {
            this.logger.error('Error registering model', { error });
            return false;
        }
    }
    /**
     * Update an existing model version
     *
     * @param modelInfo Model version information
     * @returns Whether the update was successful
     */
    async updateModelVersion(modelInfo) {
        try {
            const key = `${modelInfo.provider}/${modelInfo.model}`;
            // Check if the model exists in cache
            if (!this.cachedModels[key]) {
                this.logger.warn(`Model ${key} does not exist. Use registerModel to add it.`);
                return false;
            }
            // Preserve existing fields that might not be provided in the update
            const existingModel = this.cachedModels[key];
            const updatedModel = { ...existingModel, ...modelInfo };
            // Update the model in cache
            this.cachedModels[key] = updatedModel;
            this.logger.info(`Model ${key} updated successfully`);
            return true;
        }
        catch (error) {
            this.logger.error('Error updating model version', { error });
            return false;
        }
    }
    /**
     * Deprecate a model version
     *
     * @param provider Provider name
     * @param model Model name
     * @param replacementKey Optional replacement model key
     * @returns Whether the deprecation was successful
     */
    async deprecateModel(provider, model, replacementKey) {
        try {
            const key = `${provider}/${model}`;
            // Check if the model exists in cache
            if (!this.cachedModels[key]) {
                this.logger.warn(`Model ${key} does not exist.`);
                return false;
            }
            // Get the existing model
            const modelInfo = { ...this.cachedModels[key] };
            // Mark as deprecated
            modelInfo.deprecated = true;
            // Update the model in cache
            this.cachedModels[key] = modelInfo;
            if (replacementKey && this.cachedModels[replacementKey]) {
                this.logger.info(`Model ${key} deprecated and replaced by ${replacementKey}`);
            }
            else {
                this.logger.info(`Model ${key} deprecated`);
            }
            return true;
        }
        catch (error) {
            this.logger.error('Error deprecating model', { error });
            return false;
        }
    }
    /**
     * Register models from a provider plugin
     *
     * @param plugin Provider plugin
     * @returns Number of models registered
     */
    async registerProvider(plugin) {
        try {
            // Get models from the plugin
            const models = plugin.registerModels();
            let registerCount = 0;
            // Register each model
            for (const model of models) {
                // Validate using the plugin's validator if available
                if (plugin.validateModelConfig && !plugin.validateModelConfig(model)) {
                    this.logger.warn(`Model validation failed for ${model.provider}/${model.model}`);
                    continue;
                }
                // Register the model
                if (await this.registerModel(model)) {
                    registerCount++;
                }
            }
            this.logger.info(`Registered ${registerCount} models from provider ${plugin.provider}`);
            return registerCount;
        }
        catch (error) {
            this.logger.error('Error registering provider', {
                provider: plugin.provider,
                error
            });
            return 0;
        }
    }
    /**
     * Get the canonical version information for a model
     *
     * @param provider Provider name
     * @param model Model name
     * @returns Canonical version information or null if not found
     */
    async getCanonicalVersion(provider, model) {
        const key = `${provider}/${model}`;
        // Get available models (includes database models if available)
        const availableModels = await this.getAvailableModels();
        // Handle OpenRouter special case
        if (provider === 'openrouter' && model.includes('/')) {
            // For OpenRouter, the model name includes the provider
            const fullKey = `openrouter/${model}`;
            return availableModels[fullKey] || null;
        }
        return availableModels[key] || null;
    }
    /**
     * Standardize a model configuration to use the canonical version
     *
     * @param config Model configuration
     * @returns Standardized model configuration
     */
    async standardizeModelConfig(config) {
        const canonicalVersion = await this.getCanonicalVersion(config.provider, config.model || '');
        if (!canonicalVersion) {
            this.logger.warn(`No canonical version found for ${config.provider}/${config.model}`);
            return config;
        }
        // Clone the configuration to avoid modifying the original
        const standardizedConfig = { ...config };
        // Ensure model name and provider match the canonical version
        standardizedConfig.provider = canonicalVersion.provider;
        standardizedConfig.model = canonicalVersion.model;
        return standardizedConfig;
    }
    /**
     * Standardize a full configuration map to use canonical versions
     *
     * @param configMap Configuration map by language and size
     * @returns Standardized configuration map
     */
    async standardizeConfigMap(configMap) {
        const standardizedMap = { ...configMap };
        for (const [language, sizeConfigs] of Object.entries(standardizedMap)) {
            standardizedMap[language] = { ...sizeConfigs };
            for (const [sizeCategory, config] of Object.entries(sizeConfigs)) {
                if (standardizedMap[language]) {
                    standardizedMap[language][sizeCategory] = await this.standardizeModelConfig(config);
                }
            }
        }
        return standardizedMap;
    }
    /**
     * Get the latest model version for a provider
     *
     * @param provider Provider name
     * @returns Latest model version information by model
     */
    getLatestVersionsByProvider(provider) {
        const result = {};
        // Handle OpenRouter special case
        if (provider === 'openrouter') {
            // For OpenRouter, filter by provider prefix
            const openRouterVersions = Object.values(this.cachedModels)
                .filter(v => v.provider === 'openrouter');
            // Group by upstream model
            for (const version of openRouterVersions) {
                const modelParts = version.model.split('/');
                if (modelParts.length === 2) {
                    const [upstreamProvider, upstreamModel] = modelParts;
                    const key = `${upstreamProvider}/${upstreamModel}`;
                    result[key] = version;
                }
            }
            return result;
        }
        // For regular providers
        const versions = Object.values(this.cachedModels)
            .filter(v => v.provider === provider);
        for (const version of versions) {
            result[version.model] = version;
        }
        return result;
    }
    /**
     * Log a report of the currently used model versions
     */
    logModelVersionReport() {
        // Get unique providers without using Set
        const providerValues = Object.values(this.cachedModels).map(v => v.provider);
        const providers = [];
        // Manual deduplication
        for (const provider of providerValues) {
            if (!providers.includes(provider)) {
                providers.push(provider);
            }
        }
        this.logger.info('Current model version report:');
        for (const provider of providers) {
            const versions = this.getLatestVersionsByProvider(provider);
            this.logger.info(`Provider: ${provider}`);
            for (const [model, version] of Object.entries(versions)) {
                this.logger.info(`  ${model}: ${version.versionId || 'latest'} (${version.releaseDate})`);
            }
        }
    }
    /**
     * Get all models for a provider sorted by suitability for a repository
     *
     * @param provider Provider name
     * @returns Models for this provider
     */
    getModelsForProvider(provider) {
        // Filter models by provider
        return Object.values(this.cachedModels)
            .filter(m => m.provider === provider && m.deprecated !== true);
    }
    /**
     * Find the optimal model for a given repository context
     * Returns both primary and fallback models when includeFallback is true
     *
     * @param context Repository context
     * @param preferredProvider Optional preferred provider
     * @param includeFallback Whether to return fallback model as well
     * @returns Best model for this context, or array of [primary, fallback] if includeFallback is true
     */
    async findOptimalModel(context, preferredProvider, includeFallback) {
        try {
            // Get all available models (from database or hardcoded)
            const availableModels = await this.getAvailableModels();
            // Get all active (non-deprecated) models
            const activeModels = Object.values(availableModels)
                .filter(m => m.deprecated !== true);
            // If preferred provider is specified, prioritize those models
            const candidateModels = preferredProvider
                ? [...activeModels.filter(m => m.provider === preferredProvider), ...activeModels.filter(m => m.provider !== preferredProvider)]
                : activeModels;
            // Filter models that match the repository context
            const matchingModels = candidateModels.filter(model => {
                if (!model.preferredFor)
                    return false;
                // Check if model is preferred for this language
                const matchesLanguage = model.preferredFor.includes(context.language.toLowerCase());
                // Check if model is preferred for this size category
                const matchesSize = model.preferredFor.includes(`${context.sizeCategory}_repositories`);
                // Check for tag matches if provided
                // Tags are optional - if no tags match, we still consider the model
                const matchesTags = context.tags && model.preferredFor && context.tags.length > 0
                    ? context.tags.some(tag => {
                        // We've already checked model.preferredFor exists above
                        return model.preferredFor && model.preferredFor.includes(tag.toLowerCase());
                    })
                    : true; // If no tags provided or model doesn't support tags, consider it a match
                // Return true if language or size matches
                // Tags are used as a bonus filter but not required
                return (matchesLanguage || matchesSize);
            });
            if (matchingModels.length === 0) {
                this.logger.info('No preferred models found for context, using fallback logic', { context });
                // Use fallback logic - sort by capabilities
                const sortedByCapabilities = [...candidateModels].sort((a, b) => {
                    const aScore = this.calculateModelScore(a, context);
                    const bScore = this.calculateModelScore(b, context);
                    return bScore - aScore; // Descending order
                });
                if (sortedByCapabilities.length === 0) {
                    // Last resort - use emergency fallback
                    const emergencyModel = EMERGENCY_FALLBACK_MODELS['openai/gpt-4o'];
                    return includeFallback ? [emergencyModel, emergencyModel] : emergencyModel;
                }
                // Return primary and fallback if requested
                if (includeFallback && sortedByCapabilities.length > 1) {
                    return [sortedByCapabilities[0], sortedByCapabilities[1]];
                }
                return sortedByCapabilities[0];
            }
            // Sort matching models by suitability score
            const sortedMatches = [...matchingModels].sort((a, b) => {
                const aScore = this.calculateModelScore(a, context);
                const bScore = this.calculateModelScore(b, context);
                return bScore - aScore; // Descending order
            });
            if (sortedMatches.length === 0) {
                return null;
            }
            // Return primary and fallback if requested
            if (includeFallback && sortedMatches.length > 1) {
                return [sortedMatches[0], sortedMatches[1]];
            }
            return sortedMatches[0];
        }
        catch (error) {
            this.logger.error('Error finding optimal model', { context, error });
            return null;
        }
    }
    /**
     * Calculate a suitability score for a model given a repository context
     *
     * @param model Model info
     * @param context Repository context
     * @returns Suitability score (higher is better)
     */
    calculateModelScore(model, context) {
        if (!model.capabilities)
            return 0;
        // Determine cost weight based on repository size
        const costWeights = {
            [repository_model_config_1.RepositorySizeCategory.SMALL]: 0.4, // 40% cost weight for small repos
            [repository_model_config_1.RepositorySizeCategory.MEDIUM]: 0.25, // 25% cost weight for medium repos
            [repository_model_config_1.RepositorySizeCategory.LARGE]: 0.15, // 15% cost weight for large repos
            [repository_model_config_1.RepositorySizeCategory.EXTRA_LARGE]: 0.1 // 10% cost weight for extra large repos
        };
        // Get cost weight for this size category
        const costWeight = costWeights[context.sizeCategory] || 0.25;
        const capabilityWeight = 1 - costWeight;
        // Base scores for different size categories (normalized to sum to 1)
        const capabilityWeights = {
            [repository_model_config_1.RepositorySizeCategory.SMALL]: { codeQuality: 0.3, speed: 0.4, contextWindow: 0.1, reasoning: 0.1, detailLevel: 0.1 },
            [repository_model_config_1.RepositorySizeCategory.MEDIUM]: { codeQuality: 0.4, speed: 0.2, contextWindow: 0.1, reasoning: 0.2, detailLevel: 0.1 },
            [repository_model_config_1.RepositorySizeCategory.LARGE]: { codeQuality: 0.3, speed: 0.1, contextWindow: 0.2, reasoning: 0.2, detailLevel: 0.2 },
            [repository_model_config_1.RepositorySizeCategory.EXTRA_LARGE]: { codeQuality: 0.3, speed: 0.1, contextWindow: 0.2, reasoning: 0.3, detailLevel: 0.1 }
        };
        // Get weights for this size category
        const weights = capabilityWeights[context.sizeCategory] || capabilityWeights[repository_model_config_1.RepositorySizeCategory.MEDIUM];
        // Calculate capability score
        let capabilityScore = 0;
        const c = model.capabilities;
        if (c.codeQuality)
            capabilityScore += c.codeQuality * weights.codeQuality;
        if (c.speed)
            capabilityScore += c.speed * weights.speed;
        if (c.contextWindow) {
            // Normalize context window size to 0-10 scale
            const normalizedContextWindow = Math.min(10, c.contextWindow / 20000);
            capabilityScore += normalizedContextWindow * weights.contextWindow;
        }
        if (c.reasoning)
            capabilityScore += c.reasoning * weights.reasoning;
        if (c.detailLevel)
            capabilityScore += c.detailLevel * weights.detailLevel;
        // Calculate cost score (inverse of cost, normalized to 0-10 scale)
        let costScore = 10;
        if (model.pricing) {
            const avgCost = (model.pricing.input + model.pricing.output) / 2;
            // Convert to 0-10 scale where lower cost = higher score
            // Log scale to handle wide range of costs
            costScore = Math.max(0, 10 - Math.log10(Math.max(0.1, avgCost)) * 2.5);
        }
        // Combine scores with weights
        const finalScore = (capabilityScore * capabilityWeight) + (costScore * costWeight);
        return finalScore;
    }
    /**
     * Generate model configuration map for all repository contexts
     *
     * @returns Complete configuration map for all language/size combinations
     */
    async generateCompleteConfigMap() {
        try {
            const configMap = {};
            const languages = ['javascript', 'typescript', 'python', 'java', 'ruby', 'go', 'rust', 'csharp', 'php', 'default'];
            const sizeCategories = [repository_model_config_1.RepositorySizeCategory.SMALL, repository_model_config_1.RepositorySizeCategory.MEDIUM, repository_model_config_1.RepositorySizeCategory.LARGE];
            // Generate configurations for each language and size category
            for (const language of languages) {
                configMap[language] = {};
                for (const sizeCategory of sizeCategories) {
                    const model = await this.findOptimalModel({
                        language,
                        sizeCategory,
                        tags: []
                    });
                    if (model) {
                        // Handle array return type from findOptimalModel
                        const primaryModel = Array.isArray(model) ? model[0] : model;
                        configMap[language][sizeCategory] = {
                            id: `auto-${Date.now()}-${language}-${sizeCategory}`,
                            repository_url: '',
                            repository_name: '',
                            provider: primaryModel.provider,
                            primary_language: language,
                            languages: [language],
                            size_category: sizeCategory,
                            framework_stack: [],
                            complexity_score: 0.5,
                            model: primaryModel.model,
                            testResults: {
                                status: repository_model_config_1.TestingStatus.TESTED,
                                avgResponseTime: 0,
                                avgResponseSize: 0,
                                testCount: 0,
                                lastTested: new Date().toISOString()
                            },
                            notes: `Auto-selected based on model capabilities for ${language}/${sizeCategory}`,
                            optimal_models: {},
                            testing_status: repository_model_config_1.TestingStatus.TESTED,
                            last_calibration: new Date().toISOString(),
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        };
                    }
                    else {
                        // Fallback to default
                        const defaultModel = EMERGENCY_FALLBACK_MODELS['openai/gpt-4o'];
                        if (defaultModel) {
                            configMap[language][sizeCategory] = {
                                id: `default-${Date.now()}-${language}-${sizeCategory}`,
                                repository_url: '',
                                repository_name: '',
                                provider: defaultModel.provider,
                                primary_language: language,
                                languages: [language],
                                size_category: sizeCategory,
                                framework_stack: [],
                                complexity_score: 0.5,
                                model: defaultModel.model,
                                testResults: {
                                    status: repository_model_config_1.TestingStatus.NOT_TESTED,
                                    avgResponseTime: 0,
                                    avgResponseSize: 0,
                                    testCount: 0,
                                    lastTested: new Date().toISOString()
                                },
                                notes: `Default model (optimal model not found)`,
                                optimal_models: {},
                                testing_status: repository_model_config_1.TestingStatus.NOT_TESTED,
                                last_calibration: null,
                                created_at: new Date().toISOString(),
                                updated_at: new Date().toISOString()
                            };
                        }
                    }
                }
            }
            return configMap;
        }
        catch (error) {
            this.logger.error('Error generating complete config map', { error });
            return {};
        }
    }
    /**
     * Store a model version with OpenRouter validation
     * This ensures only valid OpenRouter model names are stored in Vector DB
     */
    async storeValidatedModel(modelInfo, language, sizeCategory) {
        try {
            // For OpenRouter models, validate the model ID exists
            if (modelInfo.provider === 'openrouter' || modelInfo.model.includes('/')) {
                const validatedName = await openrouter_model_validator_1.openRouterModelValidator.normalizeModelName(modelInfo.model);
                if (!validatedName) {
                    this.logger.error(`Invalid OpenRouter model: ${modelInfo.model}`);
                    return null;
                }
                // Update the model name with the validated version
                modelInfo.model = validatedName;
                this.logger.info(`Validated model name: ${validatedName}`);
            }
            // Store in cache
            const key = `${modelInfo.provider}/${modelInfo.model}`;
            this.cachedModels[key] = modelInfo;
            // Store in database if ModelConfigStore is available
            if (this.modelConfigStore) {
                const success = await this.modelConfigStore.storeValidatedModel(modelInfo.provider, modelInfo.model, language, sizeCategory, modelInfo.description || `Validated ${modelInfo.provider} model`);
                if (success) {
                    this.logger.info(`Model stored in database: ${key}`);
                }
                else {
                    this.logger.warn(`Failed to store model in database: ${key}`);
                }
            }
            else {
                this.logger.warn('ModelConfigStore not available for database storage');
            }
            return modelInfo;
        }
        catch (error) {
            this.logger.error('Failed to store validated model:', error);
            return null;
        }
    }
}
exports.ModelVersionSync = ModelVersionSync;
/**
 * Create a DeepWiki-compatible model config from a canonical version
 *
 * @param versionInfo Model version information
 * @returns DeepWiki model configuration
 */
function createDeepWikiModelConfig(versionInfo) {
    // OpenRouter requires special handling
    if (versionInfo.provider === 'openrouter') {
        return {
            provider: 'openrouter',
            model: versionInfo.model // Already includes the upstream provider
        };
    }
    // Standard model configuration
    return {
        provider: versionInfo.provider,
        model: versionInfo.model
    };
}
