/**
 * Anthropic Model Provider Plugin
 * 
 * This file implements the ModelProviderPlugin interface for Anthropic models,
 * defining available models and their capabilities.
 */

import { ModelProviderPlugin, ModelVersionInfo, ModelTier } from '../ModelVersionSync';

/**
 * Anthropic model provider plugin
 */
export class AnthropicModelProvider implements ModelProviderPlugin {
  /**
   * Provider name
   */
  readonly provider = 'anthropic';
  
  /**
   * Register Anthropic models
   * @returns Array of model version information
   */
  registerModels(): ModelVersionInfo[] {
    return [
      // Claude 3.7 Sonnet
      {
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
      
      // Claude 3.7 Haiku
      {
        provider: 'anthropic',
        model: 'claude-3-7-haiku',
        versionId: 'claude-3-7-haiku-20250219',
        releaseDate: '2025-02-19',
        description: 'Fast and cost-effective Claude variant for high-volume analysis',
        capabilities: {
          codeQuality: 8.3,
          speed: 9.2,
          contextWindow: 200000,
          reasoning: 8.0,
          detailLevel: 7.5
        },
        pricing: {
          input: 3.00,
          output: 15.00
        },
        tier: ModelTier.STANDARD,
        preferredFor: ['small_repositories', 'quick_analysis']
      },
      
      // Claude 3.7 Opus
      {
        provider: 'anthropic',
        model: 'claude-3-7-opus',
        versionId: 'claude-3-7-opus-20250219',
        releaseDate: '2025-02-19',
        description: 'Most advanced Claude model with unparalleled reasoning and analysis',
        capabilities: {
          codeQuality: 9.7,
          speed: 6.5,
          contextWindow: 200000,
          reasoning: 9.8,
          detailLevel: 9.9
        },
        pricing: {
          input: 30.00,
          output: 120.00
        },
        tier: ModelTier.ENTERPRISE,
        preferredFor: ['large_repositories', 'complex_analysis', 'java', 'cpp', 'complex_architecture']
      }
    ];
  }
  
  /**
   * Validate Anthropic model configuration
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
    
    // Check model naming convention (claude-*)
    if (!config.model.startsWith('claude-')) {
      return false;
    }
    
    // All Anthropic models should have these fields
    if (!config.capabilities || !config.pricing || !config.versionId) {
      return false;
    }
    
    return true;
  }
}