/**
 * Model Version Synchronization Utility
 * 
 * This utility ensures consistent model versions are used across
 * various components of the CodeQual system, including DeepWiki
 * integration, PR analysis, and repository analysis.
 */

// Import directly from relative paths to avoid path resolution issues
import { Logger } from '../../utils/logger';
import { 
  RepositorySizeCategory, 
  TestingStatus, 
  RepositoryModelConfig,
  RepositoryProvider
} from '../../config/models/repository-model-config';
import { ModelConfigStore } from './ModelConfigStore';

// Export types for other modules
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
export enum ModelTier {
  PREMIUM = 'premium',
  ADVANCED = 'advanced',
  STANDARD = 'standard',
  SPECIALIZED = 'specialized',
  ECONOMY = 'economy',
  ENTERPRISE = 'enterprise'
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
 * Fallback model configurations for emergency use
 * These are ONLY used when database is completely unavailable
 */
const EMERGENCY_FALLBACK_MODELS: Record<string, ModelVersionInfo> = {
  'openai/gpt-4o-2025-07': {
    provider: 'openai',
    model: 'gpt-4o-2025-07',
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

export class ModelVersionSync {
  private modelConfigStore?: ModelConfigStore;
  private cachedModels: Record<string, ModelVersionInfo> = {};
  private lastCacheUpdate = 0;
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache

  /**
   * Constructor
   * @param logger Logger instance
   * @param supabaseUrl Optional Supabase URL for database access
   * @param supabaseKey Optional Supabase key for database access
   */
  constructor(
    private logger: Logger,
    private supabaseUrl?: string,
    private supabaseKey?: string
  ) {
    this.logger.info('ModelVersionSync initialized');
    
    // Initialize model config store if credentials provided
    if (supabaseUrl && supabaseKey) {
      this.initializeModelConfigStore(supabaseUrl, supabaseKey);
    }
  }

  /**
   * Initialize the model config store for database access
   */
  private async initializeModelConfigStore(url: string, key: string): Promise<void> {
    try {
      this.modelConfigStore = new ModelConfigStore(this.logger, url, key);
      await this.modelConfigStore.init();
      this.logger.info('ModelConfigStore initialized successfully');
      
      // Load initial models from database
      await this.refreshModelCache();
    } catch (error) {
      this.logger.error('Failed to initialize ModelConfigStore', { error });
      // Fall back to hardcoded models
    }
  }

  /**
   * Refresh the model cache from database
   */
  private async refreshModelCache(): Promise<void> {
    if (!this.modelConfigStore) return;

    try {
      const dbConfigs = await this.modelConfigStore.getAllModelConfigs();
      const models: Record<string, ModelVersionInfo> = {};
      const modelContextMap = new Map<string, Set<string>>();

      // Convert database configs to ModelVersionInfo format
      for (const [language, sizeConfigs] of Object.entries(dbConfigs)) {
        for (const [size, config] of Object.entries(sizeConfigs)) {
          const modelConfig = config as any;
          const key = `${modelConfig.provider}/${modelConfig.model}`;
          
          // Track all contexts where this model is used
          if (!modelContextMap.has(key)) {
            modelContextMap.set(key, new Set());
          }
          modelContextMap.get(key)!.add(language);
          modelContextMap.get(key)!.add(`${size}_repositories`);
          
          // Create or update ModelVersionInfo
          if (!models[key]) {
            // First time seeing this model - create full entry
            const pricing = modelConfig.testResults?.pricing || this.getPricingForModel(modelConfig.provider, modelConfig.model);
            
            // Debug logging
            if (key.includes('nano')) {
              this.logger.info('Loading model with pricing', {
                model: key,
                testResultsPricing: modelConfig.testResults?.pricing,
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
          models[key].preferredFor = Array.from(modelContextMap.get(key)!);
        }
      }

      // Use database models exclusively
      this.cachedModels = models;
      this.lastCacheUpdate = Date.now();
      
      this.logger.info('Model cache refreshed from database', {
        databaseModels: Object.keys(models).length,
        totalModels: Object.keys(this.cachedModels).length
      });
    } catch (error) {
      this.logger.error('Failed to refresh model cache', { error });
    }
  }

  /**
   * Get pricing information for a model
   */
  private getPricingForModel(provider: string, model: string): { input: number; output: number } | undefined {
    // Check if we have pricing in cached models
    const canonicalKey = `${provider}/${model}`;
    const canonical = this.cachedModels[canonicalKey];
    if (canonical?.pricing) return canonical.pricing;

    // Default pricing based on provider
    const defaultPricing: Record<string, { input: number; output: number }> = {
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
  private async getAvailableModels(): Promise<Record<string, ModelVersionInfo>> {
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
  async registerModel(modelInfo: ModelVersionInfo): Promise<boolean> {
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
    } catch (error) {
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
  async updateModelVersion(modelInfo: ModelVersionInfo): Promise<boolean> {
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
    } catch (error) {
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
  async deprecateModel(provider: string, model: string, replacementKey?: string): Promise<boolean> {
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
      } else {
        this.logger.info(`Model ${key} deprecated`);
      }
      
      return true;
    } catch (error) {
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
  async registerProvider(plugin: ModelProviderPlugin): Promise<number> {
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
    } catch (error) {
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
  async getCanonicalVersion(provider: string, model: string): Promise<ModelVersionInfo | null> {
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
  async standardizeModelConfig(config: RepositoryModelConfig): Promise<RepositoryModelConfig> {
    const canonicalVersion = await this.getCanonicalVersion(config.provider as string, config.model || '');
    
    if (!canonicalVersion) {
      this.logger.warn(`No canonical version found for ${config.provider}/${config.model}`);
      return config;
    }
    
    // Clone the configuration to avoid modifying the original
    const standardizedConfig = { ...config };
    
    // Ensure model name and provider match the canonical version
    standardizedConfig.provider = canonicalVersion.provider as RepositoryProvider;
    standardizedConfig.model = canonicalVersion.model;
    
    return standardizedConfig;
  }
  
  /**
   * Standardize a full configuration map to use canonical versions
   * 
   * @param configMap Configuration map by language and size
   * @returns Standardized configuration map
   */
  async standardizeConfigMap(
    configMap: Record<string, Record<RepositorySizeCategory, RepositoryModelConfig>>
  ): Promise<Record<string, Record<RepositorySizeCategory, RepositoryModelConfig>>> {
    const standardizedMap = { ...configMap };
    
    for (const [language, sizeConfigs] of Object.entries(standardizedMap)) {
      standardizedMap[language] = { ...sizeConfigs };
      
      for (const [sizeCategory, config] of Object.entries(sizeConfigs)) {
        if (standardizedMap[language] && typeof standardizedMap[language] === 'object') {
          (standardizedMap[language] as Record<string, RepositoryModelConfig>)[sizeCategory] = await this.standardizeModelConfig(config);
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
  getLatestVersionsByProvider(provider: string): Record<string, ModelVersionInfo> {
    const result: Record<string, ModelVersionInfo> = {};
    
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
  logModelVersionReport(): void {
    // Get unique providers without using Set
    const providerValues = Object.values(this.cachedModels).map(v => v.provider);
    const providers: string[] = [];
    
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
  getModelsForProvider(provider: string): ModelVersionInfo[] {
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
  async findOptimalModel(context: RepositoryContext, preferredProvider?: string, includeFallback?: boolean): Promise<ModelVersionInfo | ModelVersionInfo[] | null> {
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
        if (!model.preferredFor) return false;
        
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
    } catch (error) {
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
  private calculateModelScore(model: ModelVersionInfo, context: RepositoryContext): number {
    if (!model.capabilities) return 0;
    
    // Determine cost weight based on repository size
    const costWeights: Record<RepositorySizeCategory, number> = {
      [RepositorySizeCategory.SMALL]: 0.4,      // 40% cost weight for small repos
      [RepositorySizeCategory.MEDIUM]: 0.25,     // 25% cost weight for medium repos
      [RepositorySizeCategory.LARGE]: 0.15,      // 15% cost weight for large repos
      [RepositorySizeCategory.EXTRA_LARGE]: 0.1  // 10% cost weight for extra large repos
    };
    
    // Get cost weight for this size category
    const costWeight = costWeights[context.sizeCategory] || 0.25;
    const capabilityWeight = 1 - costWeight;
    
    // Base scores for different size categories (normalized to sum to 1)
    const capabilityWeights: Record<RepositorySizeCategory, Record<string, number>> = {
      [RepositorySizeCategory.SMALL]: { codeQuality: 0.3, speed: 0.4, contextWindow: 0.1, reasoning: 0.1, detailLevel: 0.1 },
      [RepositorySizeCategory.MEDIUM]: { codeQuality: 0.4, speed: 0.2, contextWindow: 0.1, reasoning: 0.2, detailLevel: 0.1 },
      [RepositorySizeCategory.LARGE]: { codeQuality: 0.3, speed: 0.1, contextWindow: 0.2, reasoning: 0.2, detailLevel: 0.2 },
      [RepositorySizeCategory.EXTRA_LARGE]: { codeQuality: 0.3, speed: 0.1, contextWindow: 0.2, reasoning: 0.3, detailLevel: 0.1 }
    };
    
    // Get weights for this size category
    const weights = capabilityWeights[context.sizeCategory] || capabilityWeights[RepositorySizeCategory.MEDIUM];
    
    // Calculate capability score
    let capabilityScore = 0;
    const c = model.capabilities;
    
    if (c.codeQuality) capabilityScore += c.codeQuality * weights.codeQuality;
    if (c.speed) capabilityScore += c.speed * weights.speed;
    if (c.contextWindow) {
      // Normalize context window size to 0-10 scale
      const normalizedContextWindow = Math.min(10, c.contextWindow / 20000);
      capabilityScore += normalizedContextWindow * weights.contextWindow;
    }
    if (c.reasoning) capabilityScore += c.reasoning * weights.reasoning;
    if (c.detailLevel) capabilityScore += c.detailLevel * weights.detailLevel;
    
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
  async generateCompleteConfigMap(): Promise<Record<string, Record<RepositorySizeCategory, RepositoryModelConfig>>> {
    try {
      const configMap: Record<string, Record<RepositorySizeCategory, RepositoryModelConfig>> = {};
      const languages = ['javascript', 'typescript', 'python', 'java', 'ruby', 'go', 'rust', 'csharp', 'php', 'default'];
      const sizeCategories: RepositorySizeCategory[] = [RepositorySizeCategory.SMALL, RepositorySizeCategory.MEDIUM, RepositorySizeCategory.LARGE];
      
      // Generate configurations for each language and size category
      for (const language of languages) {
        configMap[language] = {} as Record<RepositorySizeCategory, RepositoryModelConfig>;
        
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
              provider: primaryModel.provider as RepositoryProvider,
              primary_language: language,
              languages: [language],
              size_category: sizeCategory,
              framework_stack: [],
              complexity_score: 0.5,
              model: primaryModel.model as string,
              testResults: {
                status: TestingStatus.TESTED,
                avgResponseTime: 0,
                avgResponseSize: 0,
                testCount: 0,
                lastTested: new Date().toISOString()
              },
              notes: `Auto-selected based on model capabilities for ${language}/${sizeCategory}`,
              optimal_models: {},
              testing_status: TestingStatus.TESTED,
              last_calibration: new Date().toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
          } else {
            // Fallback to default
            const defaultModel = EMERGENCY_FALLBACK_MODELS['openai/gpt-4o'];
            if (defaultModel) {
              configMap[language][sizeCategory] = {
                id: `default-${Date.now()}-${language}-${sizeCategory}`,
                repository_url: '',
                repository_name: '',
                provider: defaultModel.provider as RepositoryProvider,
                primary_language: language,
                languages: [language],
                size_category: sizeCategory,
                framework_stack: [],
                complexity_score: 0.5,
                model: defaultModel.model as string,
                testResults: {
                  status: TestingStatus.NOT_TESTED,
                  avgResponseTime: 0,
                  avgResponseSize: 0,
                  testCount: 0,
                  lastTested: new Date().toISOString()
                },
                notes: `Default model (optimal model not found)`,
                optimal_models: {},
                testing_status: TestingStatus.NOT_TESTED,
                last_calibration: null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              };
            }
          }
        }
      }
      
      return configMap;
    } catch (error) {
      this.logger.error('Error generating complete config map', { error });
      return {};
    }
  }
}

/**
 * Create a DeepWiki-compatible model config from a canonical version
 * 
 * @param versionInfo Model version information
 * @returns DeepWiki model configuration
 */
export function createDeepWikiModelConfig(versionInfo: ModelVersionInfo): Record<string, string> {
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
