/**
 * Model Version Synchronization Utility
 * 
 * This utility ensures consistent model versions are used across
 * various components of the CodeQual system, including DeepWiki
 * integration, PR analysis, and repository analysis.
 */

// Import directly from relative paths to avoid path resolution issues
import { Logger } from '../../utils/logger';

// Define repository model configuration types here to avoid circular imports
export type RepositorySizeCategory = 'small' | 'medium' | 'large';

export enum TestingStatus {
  UNTESTED = 'untested',
  PLANNED = 'planned',
  TESTED = 'tested'
}

export interface TestResults {
  status: TestingStatus;
  avgResponseTime: number;
  avgResponseSize: number;
  qualityScore?: number;
  testCount: number;
  lastTested: string;
}

export interface RepositoryModelConfig {
  provider: string;
  model: string;
  testResults?: TestResults;
  notes?: string;
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
  STANDARD = 'standard',
  PREMIUM = 'premium',
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
 * Canonical model versions used across the system
 */
export const CANONICAL_MODEL_VERSIONS: Record<string, ModelVersionInfo> = {
  // OpenAI models
  'openai/gpt-4o': {
    provider: 'openai',
    model: 'gpt-4o',
    versionId: '', // OpenAI doesn't use explicit version IDs
    releaseDate: '2025-03-15',
    description: 'OpenAI GPT-4o model with updated context window and improved capabilities',
    capabilities: {
      codeQuality: 8.5,
      speed: 9.0,
      contextWindow: 128000,
      reasoning: 8.7,
      detailLevel: 8.0
    },
    pricing: {
      input: 10.00,
      output: 30.00
    },
    tier: ModelTier.PREMIUM,
    preferredFor: ['small_repositories', 'quick_analysis', 'typescript']
  },
  
  // Anthropic models
  'anthropic/claude-3-7-sonnet': {
    provider: 'anthropic',
    model: 'claude-3-7-sonnet',
    versionId: 'claude-3-7-sonnet-20250219',
    releaseDate: '2025-02-19',
    description: 'Anthropic Claude 3.7 Sonnet - reasoning optimized model with improved code understanding',
    capabilities: {
      codeQuality: 9.2,
      speed: 7.5,
      contextWindow: 200000,
      reasoning: 9.5,
      detailLevel: 9.3
    },
    pricing: {
      input: 15.00,
      output: 75.00
    },
    tier: ModelTier.PREMIUM,
    preferredFor: ['medium_repositories', 'large_repositories', 'detailed_analysis', 'python', 'javascript']
  },
  
  // Google models
  'google/gemini-2.5-pro-preview-05-06': {
    provider: 'google',
    model: 'gemini-2.5-pro-preview-05-06',
    versionId: 'gemini-2.5-pro-preview-05-06-20250506',
    releaseDate: '2025-05-06',
    description: 'Google Gemini 2.5 Pro Preview with enhanced code understanding and multi-language support',
    capabilities: {
      codeQuality: 8.8,
      speed: 8.2,
      contextWindow: 100000,
      reasoning: 8.9,
      detailLevel: 8.5
    },
    pricing: {
      input: 7.00,
      output: 21.00
    },
    tier: ModelTier.PREMIUM,
    preferredFor: ['large_repositories', 'balanced_analysis', 'typescript']
  },
  
  // DeepSeek models
  'deepseek/deepseek-coder': {
    provider: 'deepseek',
    model: 'deepseek-coder',
    versionId: '1.5-instruct-20250420',
    releaseDate: '2025-04-20',
    description: 'DeepSeek Coder - general purpose code model. This is the only working DeepSeek model as of May 13, 2025',
    capabilities: {
      codeQuality: 8.7,
      speed: 7.8,
      contextWindow: 32000,
      reasoning: 8.2,
      detailLevel: 8.3
    },
    pricing: {
      input: 0.7,
      output: 1.0
    },
    tier: ModelTier.STANDARD,
    preferredFor: ['medium_repositories', 'java', 'c', 'cpp', 'rust']
  },
  
  // Google Gemini 2.5 Flash for RESEARCHER agent
  'google/gemini-2.5-flash': {
    provider: 'google',
    model: 'gemini-2.5-flash',
    versionId: 'gemini-2.5-flash-20250602',
    releaseDate: '2025-06-02',
    description: 'Google Gemini 2.5 Flash - Optimized for RESEARCHER agent: fast model research, cost analysis, and configuration updates',
    capabilities: {
      codeQuality: 8.5,
      speed: 9.2,
      contextWindow: 100000,
      reasoning: 8.8,
      detailLevel: 8.0
    },
    pricing: {
      input: 0.075,
      output: 0.30
    },
    tier: ModelTier.STANDARD,
    preferredFor: ['researcher', 'model_research', 'cost_optimization', 'configuration_updates', 'scheduled_tasks']
  },

  // OpenRouter models
  'openrouter/anthropic/claude-3.7-sonnet': {
    provider: 'openrouter',
    model: 'anthropic/claude-3.7-sonnet',
    versionId: 'claude-3-7-sonnet-20250219',
    releaseDate: '2025-02-19',
    description: 'Anthropic Claude 3.7 Sonnet via OpenRouter',
    capabilities: {
      codeQuality: 9.0,
      speed: 7.3,
      contextWindow: 200000,
      reasoning: 9.3,
      detailLevel: 9.1
    },
    pricing: {
      input: 18.00,
      output: 85.00
    },
    tier: ModelTier.PREMIUM,
    preferredFor: ['medium_repositories', 'large_repositories', 'detailed_analysis', 'python', 'javascript']
  },
  'openrouter/openai/gpt-4o': {
    provider: 'openrouter',
    model: 'openai/gpt-4o',
    versionId: '',
    releaseDate: '2025-03-15',
    description: 'OpenAI GPT-4o via OpenRouter',
    capabilities: {
      codeQuality: 8.4,
      speed: 8.8,
      contextWindow: 128000,
      reasoning: 8.6,
      detailLevel: 7.9
    },
    pricing: {
      input: 12.00,
      output: 36.00
    },
    tier: ModelTier.PREMIUM,
    preferredFor: ['small_repositories', 'quick_analysis']
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
  /**
   * Constructor
   * @param logger Logger instance
   */
  constructor(private logger: Logger) {
    this.logger.info('ModelVersionSync initialized');
  }
  
  /**
   * Register a new model in the canonical versions
   * This updates the CANONICAL_MODEL_VERSIONS registry
   * 
   * @param modelInfo Model version information
   * @returns Whether the registration was successful
   */
  registerModel(modelInfo: ModelVersionInfo): boolean {
    try {
      const key = `${modelInfo.provider}/${modelInfo.model}`;
      
      // Check if the model already exists
      if (CANONICAL_MODEL_VERSIONS[key]) {
        this.logger.warn(`Model ${key} already exists. Use updateModelVersion to update it.`);
        return false;
      }
      
      // Basic validation
      if (!modelInfo.provider || !modelInfo.model) {
        this.logger.error('Invalid model information: provider and model fields are required');
        return false;
      }
      
      // Register the model
      (CANONICAL_MODEL_VERSIONS as Record<string, ModelVersionInfo>)[key] = modelInfo;
      
      this.logger.info(`Model ${key} registered successfully`);
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
  updateModelVersion(modelInfo: ModelVersionInfo): boolean {
    try {
      const key = `${modelInfo.provider}/${modelInfo.model}`;
      
      // Check if the model exists
      if (!CANONICAL_MODEL_VERSIONS[key]) {
        this.logger.warn(`Model ${key} does not exist. Use registerModel to add it.`);
        return false;
      }
      
      // Preserve existing fields that might not be provided in the update
      const existingModel = CANONICAL_MODEL_VERSIONS[key];
      const updatedModel = { ...existingModel, ...modelInfo };
      
      // Update the model
      (CANONICAL_MODEL_VERSIONS as Record<string, ModelVersionInfo>)[key] = updatedModel;
      
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
  deprecateModel(provider: string, model: string, replacementKey?: string): boolean {
    try {
      const key = `${provider}/${model}`;
      
      // Check if the model exists
      if (!CANONICAL_MODEL_VERSIONS[key]) {
        this.logger.warn(`Model ${key} does not exist.`);
        return false;
      }
      
      // Get the existing model
      const modelInfo = { ...CANONICAL_MODEL_VERSIONS[key] };
      
      // Mark as deprecated
      modelInfo.deprecated = true;
      
      // Update the model
      (CANONICAL_MODEL_VERSIONS as Record<string, ModelVersionInfo>)[key] = modelInfo;
      
      if (replacementKey && CANONICAL_MODEL_VERSIONS[replacementKey]) {
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
  registerProvider(plugin: ModelProviderPlugin): number {
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
        if (this.registerModel(model)) {
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
  getCanonicalVersion(provider: string, model: string): ModelVersionInfo | null {
    const key = `${provider}/${model}`;
    
    // Handle OpenRouter special case
    if (provider === 'openrouter' && model.includes('/')) {
      // For OpenRouter, the model name includes the provider
      const fullKey = `openrouter/${model}`;
      return CANONICAL_MODEL_VERSIONS[fullKey] || null;
    }
    
    return CANONICAL_MODEL_VERSIONS[key] || null;
  }
  
  /**
   * Standardize a model configuration to use the canonical version
   * 
   * @param config Model configuration
   * @returns Standardized model configuration
   */
  standardizeModelConfig(config: RepositoryModelConfig): RepositoryModelConfig {
    const canonicalVersion = this.getCanonicalVersion(config.provider, config.model);
    
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
  standardizeConfigMap(
    configMap: Record<string, Record<RepositorySizeCategory, RepositoryModelConfig>>
  ): Record<string, Record<RepositorySizeCategory, RepositoryModelConfig>> {
    const standardizedMap = { ...configMap };
    
    for (const [language, sizeConfigs] of Object.entries(standardizedMap)) {
      standardizedMap[language] = { ...sizeConfigs };
      
      for (const [sizeCategory, config] of Object.entries(sizeConfigs)) {
        if (standardizedMap[language] && typeof standardizedMap[language] === 'object') {
          (standardizedMap[language] as Record<string, RepositoryModelConfig>)[sizeCategory] = this.standardizeModelConfig(config);
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
      const openRouterVersions = Object.values(CANONICAL_MODEL_VERSIONS)
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
    const versions = Object.values(CANONICAL_MODEL_VERSIONS)
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
    const providerValues = Object.values(CANONICAL_MODEL_VERSIONS).map(v => v.provider);
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
    return Object.values(CANONICAL_MODEL_VERSIONS)
      .filter(m => m.provider === provider && m.deprecated !== true);
  }
  
  /**
   * Find the optimal model for a given repository context
   * 
   * @param context Repository context
   * @param preferredProvider Optional preferred provider
   * @returns Best model for this context
   */
  findOptimalModel(context: RepositoryContext, preferredProvider?: string): ModelVersionInfo | null {
    try {
      // Get all active (non-deprecated) models
      const activeModels = Object.values(CANONICAL_MODEL_VERSIONS)
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
        const matchesTags = context.tags && model.preferredFor
          ? context.tags.some(tag => {
              // We've already checked model.preferredFor exists above
              return model.preferredFor && model.preferredFor.includes(tag.toLowerCase());
            })
          : true;
        
        return (matchesLanguage || matchesSize) && matchesTags;
      });
      
      if (matchingModels.length === 0) {
        this.logger.info('No preferred models found for context, using fallback logic', { context });
        
        // Use fallback logic - sort by capabilities
        const sortedByCapabilities = [...candidateModels].sort((a, b) => {
          const aScore = this.calculateModelScore(a, context);
          const bScore = this.calculateModelScore(b, context);
          return bScore - aScore; // Descending order
        });
        
        return sortedByCapabilities.length > 0 ? sortedByCapabilities[0] : null;
      }
      
      // Sort matching models by suitability score
      const sortedMatches = [...matchingModels].sort((a, b) => {
        const aScore = this.calculateModelScore(a, context);
        const bScore = this.calculateModelScore(b, context);
        return bScore - aScore; // Descending order
      });
      
      return sortedMatches.length > 0 ? sortedMatches[0] : null;
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
    
    // Base scores for different size categories
    const sizeWeights: Record<RepositorySizeCategory, Record<string, number>> = {
      'small': { codeQuality: 0.3, speed: 0.4, contextWindow: 0.1, reasoning: 0.1, detailLevel: 0.1 },
      'medium': { codeQuality: 0.4, speed: 0.2, contextWindow: 0.1, reasoning: 0.2, detailLevel: 0.1 },
      'large': { codeQuality: 0.3, speed: 0.1, contextWindow: 0.2, reasoning: 0.2, detailLevel: 0.2 }
    };
    
    // Get weights for this size category
    const weights = sizeWeights[context.sizeCategory] || sizeWeights.medium;
    
    // Calculate weighted score
    let score = 0;
    const c = model.capabilities;
    
    if (c.codeQuality) score += c.codeQuality * weights.codeQuality;
    if (c.speed) score += c.speed * weights.speed;
    if (c.contextWindow) {
      // Normalize context window size to 0-10 scale
      const normalizedContextWindow = Math.min(10, c.contextWindow / 20000);
      score += normalizedContextWindow * weights.contextWindow;
    }
    if (c.reasoning) score += c.reasoning * weights.reasoning;
    if (c.detailLevel) score += c.detailLevel * weights.detailLevel;
    
    return score;
  }
  
  /**
   * Generate model configuration map for all repository contexts
   * 
   * @returns Complete configuration map for all language/size combinations
   */
  generateCompleteConfigMap(): Record<string, Record<RepositorySizeCategory, RepositoryModelConfig>> {
    try {
      const configMap: Record<string, Record<RepositorySizeCategory, RepositoryModelConfig>> = {};
      const languages = ['javascript', 'typescript', 'python', 'java', 'ruby', 'go', 'rust', 'csharp', 'php', 'default'];
      const sizeCategories: RepositorySizeCategory[] = ['small', 'medium', 'large'];
      
      // Generate configurations for each language and size category
      for (const language of languages) {
        configMap[language] = {} as Record<RepositorySizeCategory, RepositoryModelConfig>;
        
        for (const sizeCategory of sizeCategories) {
          const model = this.findOptimalModel({
            language,
            sizeCategory,
            tags: []
          });
          
          if (model) {
            configMap[language][sizeCategory] = {
              provider: model.provider as string,
              model: model.model as string,
              testResults: {
                status: TestingStatus.TESTED,
                avgResponseTime: 0,
                avgResponseSize: 0,
                testCount: 0,
                lastTested: new Date().toISOString()
              },
              notes: `Auto-selected based on model capabilities for ${language}/${sizeCategory}`
            };
          } else {
            // Fallback to default
            const defaultModel = CANONICAL_MODEL_VERSIONS['openai/gpt-4o'];
            if (defaultModel) {
              configMap[language][sizeCategory] = {
                provider: defaultModel.provider as string,
                model: defaultModel.model as string,
                testResults: {
                  status: TestingStatus.UNTESTED,
                  avgResponseTime: 0,
                  avgResponseSize: 0,
                  testCount: 0,
                  lastTested: new Date().toISOString()
                },
                notes: `Default model (optimal model not found)`
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
