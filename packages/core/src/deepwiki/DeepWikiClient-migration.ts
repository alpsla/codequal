/**
 * Migration plan for DeepWikiClient to use dynamic model selection
 * 
 * This file shows how to update DeepWikiClient to use the ContextAwareModelSelector
 * instead of hardcoded MODEL_CONFIGS
 */

import { Logger } from '../utils/logger';
import { VectorStorageService } from '@codequal/database';
// Import from agents package - commented out as it causes circular dependency
// import { ContextAwareModelSelector } from '@codequal/agents/model-selection';
type ContextAwareModelSelector = any; // Temporary type to avoid circular dependency

// Updated constructor that accepts model selector
export class DeepWikiClientV2 {
  private client: any; // AxiosInstance
  private logger: Logger;
  private modelSelector?: ContextAwareModelSelector;
  
  constructor(
    baseUrl: string, 
    logger: Logger,
    modelSelector?: ContextAwareModelSelector // Optional for backward compatibility
  ) {
    this.logger = logger;
    this.modelSelector = modelSelector;
    // ... rest of initialization
  }
  
  /**
   * Get model configuration dynamically
   */
  private async getModelConfiguration(
    language: string, 
    sizeCategory: 'small' | 'medium' | 'large'
  ): Promise<{ provider: string; model: string }> {
    // If we have a model selector, use it
    if (this.modelSelector) {
      const context = {
        primaryLanguage: language,
        size: sizeCategory as any
      };
      
      const selection = await this.modelSelector.selectModelForContext('deepwiki', context);
      
      return {
        provider: selection.primary.provider,
        model: selection.primary.model
      };
    }
    
    // Fallback to a sensible default if no selector available
    // This ensures backward compatibility
    this.logger.warn('No model selector available, using default model');
    return {
      provider: 'google',
      model: 'gemini-2.5-flash' // Safe default from our configurations
    };
  }
  
  /**
   * Analyze repository - updated to use dynamic model selection
   */
  async analyzeRepository(request: any): Promise<any> {
    const { url, primaryLanguage } = request.repository;
    const sizeCategory = this.calculateSizeCategory(request.repository);
    
    // Get model configuration dynamically
    const modelConfig = await this.getModelConfiguration(
      primaryLanguage || 'javascript',
      sizeCategory
    );
    
    // Use the selected model for analysis
    const analysisRequest = {
      ...request,
      model_config: modelConfig
    };
    
    // ... rest of the analysis logic
  }
  
  private calculateSizeCategory(repository: any): 'small' | 'medium' | 'large' {
    // Implementation from original file
    const totalSize = repository.totalSize || 0;
    const fileCount = repository.fileCount || 0;
    
    if (totalSize > 50 * 1024 * 1024 || fileCount > 500) return 'large';
    if (totalSize > 1024 * 1024 || fileCount > 50) return 'medium';
    return 'small';
  }
}

// Example of how to update the factory/initialization
export function createDeepWikiClient(
  baseUrl: string,
  logger: Logger,
  vectorStorage?: VectorStorageService,
  modelVersionSync?: any
): DeepWikiClientV2 {
  let modelSelector: ContextAwareModelSelector | undefined;
  
  if (vectorStorage && modelVersionSync) {
    // modelSelector = new ContextAwareModelSelector(modelVersionSync, vectorStorage, logger);
    // TODO: Instantiate ContextAwareModelSelector when circular dependency is resolved
  }
  
  return new DeepWikiClientV2(baseUrl, logger, modelSelector);
}

/**
 * MIGRATION STEPS:
 * 
 * 1. Remove the hardcoded MODEL_CONFIGS property
 * 2. Add optional modelSelector parameter to constructor
 * 3. Replace getModelConfiguration to use dynamic selection
 * 4. Update all places that create DeepWikiClient to pass modelSelector
 * 5. Ensure backward compatibility for existing code
 * 
 * BENEFITS:
 * - No more hardcoded models
 * - Automatically uses latest model selections from Vector DB
 * - Updates quarterly with researcher agent
 * - Supports all 400 configurations (10 roles × 10 languages × 4 sizes)
 */