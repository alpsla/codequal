/**
 * Model Configuration Factory
 * 
 * This module provides factory functions for creating various model configurations
 * based on the centralized ModelVersionSync registry.
 */

import { ModelVersionSync, ModelVersionInfo, RepositoryContext, ModelTier } from './ModelVersionSync';
import { REPOSITORY_MODEL_CONFIGS, RepositoryModelConfig, RepositorySizeCategory, TestingStatus, RepositoryProvider } from '../../config/models/repository-model-config';
import { Logger } from '../../utils/logger';

/**
 * Repository model configuration factory
 */
export class ModelConfigurationFactory {
  /**
   * Constructor
   * 
   * @param logger Logger instance
   * @param modelVersionSync Model version synchronizer
   */
  constructor(
    private logger: Logger,
    private modelVersionSync: ModelVersionSync
  ) {
    this.logger.info('ModelConfigurationFactory initialized');
  }
  
  /**
   * Create repository model configuration for a specific context
   * 
   * @param context Repository context
   * @param preferredProvider Optional preferred provider
   * @returns Repository model configuration
   */
  async createRepositoryModelConfig(
    context: RepositoryContext,
    preferredProvider?: string
  ): Promise<RepositoryModelConfig | null> {
    try {
      // Find the optimal model for this context
      const optimalModel = await this.modelVersionSync.findOptimalModel(context, preferredProvider);
      
      if (!optimalModel) {
        this.logger.warn('No suitable model found for repository context', { context });
        return null;
      }
      
      const model = Array.isArray(optimalModel) ? optimalModel[0] : optimalModel;
      
      // Create a repository model config with all required properties
      return {
        id: `auto-${Date.now()}`,
        repository_url: '',
        repository_name: '',
        provider: model.provider as RepositoryProvider,
        primary_language: context.language,
        languages: [context.language],
        size_category: context.sizeCategory,
        framework_stack: [],
        complexity_score: 0.5,
        model: model.model,
        testResults: {
          status: TestingStatus.TESTED,
          avgResponseTime: model.capabilities?.speed ? 10 - model.capabilities.speed : 5, // Convert speed (10=fastest) to response time in seconds
          avgResponseSize: model.capabilities?.detailLevel ? model.capabilities.detailLevel * 200 : 1000, // Estimate response size based on detail level
          qualityScore: model.capabilities?.codeQuality,
          testCount: 1,
          lastTested: new Date().toISOString()
        },
        notes: `Auto-selected based on capabilities for ${context.language}/${context.sizeCategory}`,
        optimal_models: {},
        testing_status: TestingStatus.TESTED,
        last_calibration: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('Error creating repository model config', { context, error });
      return null;
    }
  }
  
  /**
   * Generate complete model configuration map for all supported languages and sizes
   * 
   * @returns Complete configuration map
   */
  generateCompleteModelConfigs(): Record<string, Record<RepositorySizeCategory, RepositoryModelConfig>> {
    // Use type assertion to handle the RepositoryProvider type issue
    return this.modelVersionSync.generateCompleteConfigMap() as unknown as Record<string, Record<RepositorySizeCategory, RepositoryModelConfig>>;
  }
  
  /**
   * Create DeepWiki-compatible model config
   * 
   * @param modelInfo Model version information
   * @returns DeepWiki model configuration
   */
  createDeepWikiModelConfig(modelInfo: ModelVersionInfo): Record<string, unknown> {
    // OpenRouter requires special handling
    if (modelInfo.provider === 'openrouter') {
      return {
        provider: 'openrouter',
        model: modelInfo.model, // Already includes the upstream provider
        apiKey: process.env.OPENROUTER_API_KEY
      };
    }
    
    // Standard model configuration with appropriate API key
    const config = {
      provider: modelInfo.provider,
      model: modelInfo.model
    };
    
    // Add API key based on provider
    switch (modelInfo.provider) {
      case 'openai':
        return { ...config, apiKey: process.env.OPENAI_API_KEY };
      case 'anthropic':
        return { ...config, apiKey: process.env.ANTHROPIC_API_KEY };
      case 'google':
        return { ...config, apiKey: process.env.GEMINI_API_KEY };
      case 'deepseek':
        return { ...config, apiKey: process.env.DEEPSEEK_API_KEY };
      default:
        return config;
    }
  }
  
  /**
   * Create an agent-compatible model configuration
   * 
   * @param modelInfo Model version information
   * @returns Agent model configuration
   */
  createAgentModelConfig(modelInfo: ModelVersionInfo): Record<string, unknown> {
    const config = {
      provider: modelInfo.provider,
      model: modelInfo.model,
      tier: modelInfo.tier || ModelTier.STANDARD,
      pricing: modelInfo.pricing ? {
        inputCost: modelInfo.pricing.input,
        outputCost: modelInfo.pricing.output
      } : undefined
    };
    
    return config;
  }
  
  /**
   * Get calibration models based on canonical versions
   * 
   * @returns Record of provider to model names for calibration
   */
  getCalibrationModels(): Record<string, string[]> {
    const result: Record<string, string[]> = {};
    // Get unique providers from canonical models
    const providers = Array.from(new Set(Object.values(this.modelVersionSync.getLatestVersionsByProvider('openai')).map(v => v.provider)));
    // Add other known providers that might not be in the result from above
    const allProviders = Array.from(new Set([...providers, 'openai', 'anthropic', 'google', 'deepseek', 'openrouter']));
    
    for (const provider of allProviders) {
      // Get models for this provider
      const models = this.modelVersionSync.getModelsForProvider(provider);
      
      // Filter deprecated models
      const activeModels = models.filter(m => !m.deprecated);
      
      // Sort by premium tier first, then by capabilities
      const sortedModels = activeModels.sort((a, b) => {
        // Sort by tier first
        const tierOrder: Record<string, number> = { 
          [ModelTier.PREMIUM]: 3, 
          [ModelTier.STANDARD]: 2, 
          [ModelTier.ENTERPRISE]: 1 
        };
        const aTierValue = a.tier && tierOrder[a.tier] ? tierOrder[a.tier] : 0;
        const bTierValue = b.tier && tierOrder[b.tier] ? tierOrder[b.tier] : 0;
        
        if (aTierValue !== bTierValue) {
          return bTierValue - aTierValue;
        }
        
        // If same tier, sort by code quality
        const aQuality = a.capabilities?.codeQuality || 0;
        const bQuality = b.capabilities?.codeQuality || 0;
        
        return bQuality - aQuality;
      });
      
      // Take at most 2 models per provider for calibration
      result[provider] = sortedModels.slice(0, 2).map(m => m.model);
    }
    
    return result;
  }
  
  /**
   * Update the static REPOSITORY_MODEL_CONFIGS with the latest model configurations
   */
  updateStaticModelConfigs(): void {
    const updatedConfigs = this.generateCompleteModelConfigs();
    
    // Update the static configuration with the generated one
    for (const [language, sizeConfigs] of Object.entries(updatedConfigs)) {
      // Create a mutable copy of REPOSITORY_MODEL_CONFIGS
      const mutableConfigs = { ...REPOSITORY_MODEL_CONFIGS } as unknown as Record<string, Record<RepositorySizeCategory, RepositoryModelConfig>>;
      
      if (!mutableConfigs[language]) {
        mutableConfigs[language] = {} as Record<RepositorySizeCategory, RepositoryModelConfig>;
      }
      
      for (const [sizeCategory, config] of Object.entries(sizeConfigs)) {
        mutableConfigs[language][sizeCategory as RepositorySizeCategory] = config;
      }
      
      // Update the original reference
      Object.assign(REPOSITORY_MODEL_CONFIGS, mutableConfigs);
    }
    
    this.logger.info('Static REPOSITORY_MODEL_CONFIGS updated with latest configurations');
  }
}