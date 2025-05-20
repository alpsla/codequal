/**
 * OpenAI Model Provider Plugin
 * 
 * This file implements the ModelProviderPlugin interface for OpenAI models,
 * defining available models and their capabilities.
 */

import { ModelProviderPlugin, ModelVersionInfo, ModelTier } from '../ModelVersionSync';

/**
 * OpenAI model provider plugin
 */
export class OpenAIModelProvider implements ModelProviderPlugin {
  /**
   * Provider name
   */
  readonly provider = 'openai';
  
  /**
   * Register OpenAI models
   * @returns Array of model version information
   */
  registerModels(): ModelVersionInfo[] {
    return [
      // GPT-4o
      {
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
      
      // GPT-4o mini
      {
        provider: 'openai',
        model: 'gpt-4o-mini',
        versionId: '',
        releaseDate: '2025-04-01',
        description: 'Faster, more cost-effective GPT-4o variant for simpler tasks',
        capabilities: {
          codeQuality: 7.8,
          speed: 9.5,
          contextWindow: 128000,
          reasoning: 7.5,
          detailLevel: 7.0
        },
        pricing: {
          input: 5.00,
          output: 15.00
        },
        tier: ModelTier.STANDARD,
        preferredFor: ['small_repositories', 'quick_analysis']
      },
      
      // GPT-4 Turbo
      {
        provider: 'openai',
        model: 'gpt-4-turbo',
        versionId: '',
        releaseDate: '2024-10-15',
        description: 'Previous generation GPT-4 model, maintained for compatibility',
        capabilities: {
          codeQuality: 8.0,
          speed: 8.5,
          contextWindow: 128000,
          reasoning: 8.0,
          detailLevel: 7.5
        },
        pricing: {
          input: 10.00,
          output: 30.00
        },
        tier: ModelTier.PREMIUM,
        deprecated: true
      }
    ];
  }
  
  /**
   * Validate OpenAI model configuration
   * @param config Model configuration
   * @returns Whether the configuration is valid
   */
  validateModelConfig(config: ModelVersionInfo): boolean {
    // Check required fields
    if (!config.provider || !config.model) {
      return false;
    }
    
    // Check provider
    if (config.provider !== this.provider) {
      return false;
    }
    
    // All OpenAI models should have these capabilities
    if (!config.capabilities || !config.pricing) {
      return false;
    }
    
    // Additional custom validations as needed
    return true;
  }
}