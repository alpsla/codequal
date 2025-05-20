/**
 * Repository Model Selection Service
 * 
 * This service helps select the most appropriate model for analyzing
 * repositories and pull requests based on language, size, and analysis type.
 * It leverages the comprehensive testing data and configurations to make
 * optimal model selection decisions.
 */

import { REPOSITORY_MODEL_CONFIGS, RepositoryModelConfig, RepositorySizeCategory } from '../config/models/repository-model-config';
import { RepositoryContext } from '../types/repository';
import { Logger } from '../utils/logger';

/**
 * Analysis tiers for different depths of repository analysis
 */
export enum AnalysisTier {
  QUICK = 'quick',           // Fast PR-only analysis
  COMPREHENSIVE = 'comprehensive', // Full repository + PR analysis
  TARGETED = 'targeted'      // Deep dives into specific architectural aspects
}

/**
 * Model selection strategy options
 */
export enum ModelSelectionStrategy {
  PERFORMANCE = 'performance',  // Prioritize speed (for quick analysis)
  BALANCED = 'balanced',        // Balance between speed and detail
  DETAIL = 'detail'             // Prioritize detail (for comprehensive analysis)
}

/**
 * Service for selecting optimal models for repository analysis
 */
export class RepositoryModelSelectionService {
  /**
   * Constructor
   * @param logger Logger instance
   */
  constructor(private logger: Logger) {
    this.logger.info('RepositoryModelSelectionService initialized');
  }

  /**
   * Get the optimal model configuration for a repository
   * 
   * @param repository Repository context object
   * @param tier Analysis tier (quick, comprehensive, targeted)
   * @param strategy Optional strategy override
   * @returns The recommended model configuration
   */
  getModelForRepository(
    repository: RepositoryContext,
    tier: AnalysisTier = AnalysisTier.COMPREHENSIVE,
    strategy?: ModelSelectionStrategy
  ): RepositoryModelConfig {
    // Determine size category
    const sizeCategory = this.getSizeCategory(repository.sizeBytes || 0);
    
    // Determine strategy based on tier if not explicitly provided
    const selectionStrategy = strategy || this.getStrategyForTier(tier);
    
    // Log selection parameters
    this.logger.info('Selecting model for repository', {
      repository: `${repository.owner}/${repository.repo}`,
      language: repository.language,
      sizeCategory,
      tier,
      strategy: selectionStrategy
    });
    
    // Get model configuration
    const modelConfig = this.selectModelConfig(repository.language, sizeCategory, selectionStrategy);
    
    // Log selected model
    this.logger.info('Selected model', {
      provider: modelConfig.provider,
      model: modelConfig.model,
      notes: modelConfig.notes
    });
    
    return modelConfig;
  }
  
  /**
   * Get the optimal model configuration for a PR analysis
   * 
   * @param repository Repository context
   * @param prSize Size of PR changes in bytes
   * @param tier Analysis tier
   * @param strategy Optional strategy override
   * @returns The recommended model configuration
   */
  getModelForPR(
    repository: RepositoryContext,
    prSize: number,
    tier: AnalysisTier = AnalysisTier.QUICK,
    strategy?: ModelSelectionStrategy
  ): RepositoryModelConfig {
    // For PR analysis, we may prioritize speed more than repository analysis
    // so we adjust the strategy accordingly
    let selectionStrategy = strategy || this.getStrategyForTier(tier);
    
    // For quick tier, always prioritize performance unless explicitly overridden
    if (tier === AnalysisTier.QUICK && !strategy) {
      selectionStrategy = ModelSelectionStrategy.PERFORMANCE;
    }
    
    // For small PRs, optimize for speed regardless of repository size
    // unless we're doing a comprehensive or targeted analysis
    const sizeCategory = tier === AnalysisTier.QUICK && prSize < 500 * 1024 
      ? 'small' as RepositorySizeCategory
      : this.getSizeCategory(repository.sizeBytes || 0);
    
    // Log selection parameters
    this.logger.info('Selecting model for PR analysis', {
      repository: `${repository.owner}/${repository.repo}`,
      language: repository.language,
      sizeCategory,
      prSizeBytes: prSize,
      tier,
      strategy: selectionStrategy
    });
    
    // Get model configuration
    const modelConfig = this.selectModelConfig(repository.language, sizeCategory, selectionStrategy);
    
    // Log selected model
    this.logger.info('Selected model for PR', {
      provider: modelConfig.provider,
      model: modelConfig.model,
      notes: modelConfig.notes
    });
    
    return modelConfig;
  }
  
  /**
   * Select the model configuration based on language, size category, and strategy
   * 
   * @param language Primary repository language
   * @param sizeCategory Size category of repository
   * @param strategy Selection strategy
   * @returns Recommended model configuration
   */
  private selectModelConfig(
    language: string,
    sizeCategory: RepositorySizeCategory,
    strategy: ModelSelectionStrategy
  ): RepositoryModelConfig {
    // Normalize language
    const normalizedLang = language?.toLowerCase() || 'default';
    
    // Get the baseline configuration
    const config = REPOSITORY_MODEL_CONFIGS[normalizedLang]?.[sizeCategory] 
      || REPOSITORY_MODEL_CONFIGS.default[sizeCategory];
    
    // For performance strategy, prioritize OpenAI for speed
    if (strategy === ModelSelectionStrategy.PERFORMANCE) {
      // Small repositories always use OpenAI for speed
      if (sizeCategory === 'small') {
        return REPOSITORY_MODEL_CONFIGS.default.small;
      }
      
      // For medium repositories, use OpenAI if testing status is not completed
      if (sizeCategory === 'medium' && 
          config.testResults?.status !== 'tested') {
        return REPOSITORY_MODEL_CONFIGS.default.small;
      }
      
      // Return the standard config for this language/size
      return config;
    }
    
    // For detail strategy, use the most detailed model for the language
    if (strategy === ModelSelectionStrategy.DETAIL) {
      // For medium/large repositories, use Claude for maximum detail
      // unless the language has a tested configuration
      if ((sizeCategory === 'medium' || sizeCategory === 'large') && 
          config.testResults?.status !== 'tested') {
        return REPOSITORY_MODEL_CONFIGS.default.medium; // Claude has best detail for unknown langs
      }
      
      // Return the standard config for this language/size
      return config;
    }
    
    // For balanced strategy (default), use the standard config
    return config;
  }
  
  /**
   * Get the size category for a repository based on its size in bytes
   * 
   * @param sizeBytes Repository size in bytes
   * @returns Size category
   */
  private getSizeCategory(sizeBytes: number): RepositorySizeCategory {
    if (sizeBytes < 5 * 1024 * 1024) { // Less than 5MB
      return 'small';
    } else if (sizeBytes < 50 * 1024 * 1024) { // Between 5MB and 50MB
      return 'medium';
    } else {
      return 'large';
    }
  }
  
  /**
   * Get the default model selection strategy for an analysis tier
   * 
   * @param tier Analysis tier
   * @returns Selection strategy
   */
  private getStrategyForTier(tier: AnalysisTier): ModelSelectionStrategy {
    switch (tier) {
      case AnalysisTier.QUICK:
        return ModelSelectionStrategy.PERFORMANCE;
      case AnalysisTier.COMPREHENSIVE:
        return ModelSelectionStrategy.BALANCED;
      case AnalysisTier.TARGETED:
        return ModelSelectionStrategy.DETAIL;
      default:
        return ModelSelectionStrategy.BALANCED;
    }
  }
}
