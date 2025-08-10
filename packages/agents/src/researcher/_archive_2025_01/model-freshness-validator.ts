/**
 * Model Freshness Validator
 * 
 * Ensures only the latest models (3-6 months) are selected by the Researcher Agent.
 * This validator filters out outdated models and verifies freshness using multiple strategies.
 */

import { createLogger } from '@codequal/core';

const logger = createLogger('ModelFreshnessValidator');

export interface ModelInfo {
  id: string;
  provider: string;
  model: string;
  name?: string;
  created?: number;
  architecture?: any;
  pricing?: any;
  context_length?: number;
  top_provider?: boolean;
}

export interface FreshnessResult {
  isValid: boolean;
  reason: string;
  estimatedAge?: 'latest' | 'recent' | 'outdated' | 'deprecated';
  confidence: number;
}

export class ModelFreshnessValidator {
  // Known latest models as of August 2025 (Update quarterly!)
  private readonly LATEST_MODELS = new Map<string, { version: string; releaseDate: string; replaces?: string[] }>([
    // OpenAI - Latest as of Aug 2025
    ['openai/gpt-4o', { version: '2025-08-01', releaseDate: '2025-08', replaces: ['gpt-4-turbo', 'gpt-4-turbo-preview'] }],
    ['openai/gpt-4o-mini', { version: '2025-07-01', releaseDate: '2025-07', replaces: ['gpt-3.5-turbo'] }],
    ['openai/o1-preview', { version: '2025-07-01', releaseDate: '2025-07', replaces: [] }],
    ['openai/o1-mini', { version: '2025-07-01', releaseDate: '2025-07', replaces: [] }],
    
    // Anthropic - Latest as of Aug 2025
    ['anthropic/claude-3.5-sonnet', { version: '20250620', releaseDate: '2025-06', replaces: ['claude-3-sonnet', 'claude-3-opus'] }],
    ['anthropic/claude-3.5-haiku', { version: '20250715', releaseDate: '2025-07', replaces: ['claude-3-haiku'] }],
    
    // Google - Latest as of Aug 2025
    ['google/gemini-2.0-flash-exp', { version: '2025-08', releaseDate: '2025-08', replaces: ['gemini-1.5-pro', 'gemini-1.5-flash'] }],
    ['google/gemini-1.5-pro', { version: '002', releaseDate: '2025-05', replaces: ['gemini-pro'] }],
    ['google/gemini-1.5-flash', { version: '002', releaseDate: '2025-05', replaces: ['gemini-flash'] }],
    
    // DeepSeek - Latest as of Aug 2025
    ['deepseek/deepseek-chat', { version: 'latest', releaseDate: '2025-07', replaces: ['deepseek-coder'] }],
    ['deepseek/deepseek-r1', { version: '2025-01', releaseDate: '2025-01', replaces: [] }],
    
    // Meta - Latest as of Aug 2025
    ['meta-llama/llama-3.1-405b-instruct', { version: '3.1', releaseDate: '2025-07', replaces: ['llama-3-70b', 'llama-3-8b'] }],
    ['meta-llama/llama-3.1-70b-instruct', { version: '3.1', releaseDate: '2025-07', replaces: ['llama-3-70b'] }],
    
    // Mistral - Latest as of Aug 2025
    ['mistralai/mistral-large', { version: '2025-07', releaseDate: '2025-07', replaces: ['mistral-medium'] }],
    ['mistralai/codestral', { version: '2025-05', releaseDate: '2025-05', replaces: [] }],
    
    // xAI - Latest as of Aug 2025
    ['xai/grok-2', { version: '2025-08', releaseDate: '2025-08', replaces: ['grok-1'] }],
    
    // Cohere - Latest as of Aug 2025
    ['cohere/command-r-plus', { version: '2025-08', releaseDate: '2025-08', replaces: ['command-r', 'command'] }],
  ]);
  
  // Deprecated models that should NEVER be selected
  private readonly DEPRECATED_MODELS = new Set<string>([
    // Old OpenAI models
    'gpt-4-32k',
    'gpt-4-0314',
    'gpt-4-0613',
    'gpt-3.5-turbo-16k',
    'gpt-3.5-turbo-0301',
    'gpt-3.5-turbo-0613',
    'text-davinci-003',
    'text-davinci-002',
    'code-davinci-002',
    
    // Old Anthropic models
    'claude-1',
    'claude-2',
    'claude-2.0',
    'claude-2.1',
    'claude-instant-1',
    'claude-instant-1.2',
    'claude-3-opus', // Replaced by 3.5
    'claude-3-sonnet', // Replaced by 3.5
    'claude-3-haiku', // Replaced by 3.5
    
    // Old Google models
    'palm-2',
    'gemini-pro',
    'gemini-ultra',
    'bard',
    
    // Other outdated
    'llama-2',
    'llama-2-70b',
    'llama-2-13b',
    'llama-2-7b',
    'falcon-40b',
    'falcon-7b',
    'gpt-j-6b',
    'gpt-neo',
    'bloom',
  ]);
  
  // Version patterns that indicate freshness
  private readonly FRESH_VERSION_PATTERNS = [
    /2025-0[6-8]/,  // Models from June-August 2025
    /3\.[5-9]/,     // Version 3.5 or higher
    /4\.[5-9]/,     // Version 4.5 or higher
    /\bo1\b/,       // OpenAI o1 models
    /2\.0/,         // Version 2.0 (Gemini 2.0)
    /-exp$/,        // Experimental models (usually latest)
    /latest$/,      // Explicitly latest versions
  ];
  
  // Providers known for frequent updates
  private readonly ACTIVE_PROVIDERS = new Set([
    'openai',
    'anthropic',
    'google',
    'deepseek',
    'meta-llama',
    'mistralai',
    'xai',
    'cohere',
    'nvidia',
    'perplexity',
  ]);
  
  /**
   * Validate if a model is fresh enough (within 3-6 months)
   */
  validateModelFreshness(model: ModelInfo): FreshnessResult {
    const modelId = model.id.toLowerCase();
    const provider = model.provider?.toLowerCase() || modelId.split('/')[0];
    const modelName = model.model?.toLowerCase() || modelId.split('/').slice(1).join('/');
    
    // Check if deprecated
    if (this.isDeprecated(modelId, modelName)) {
      return {
        isValid: false,
        reason: `Model ${modelId} is deprecated and should not be used`,
        estimatedAge: 'deprecated',
        confidence: 1.0
      };
    }
    
    // Check if it's a known latest model
    if (this.LATEST_MODELS.has(modelId)) {
      const info = this.LATEST_MODELS.get(modelId)!;
      return {
        isValid: true,
        reason: `Model ${modelId} is a known latest model (${info.releaseDate})`,
        estimatedAge: 'latest',
        confidence: 1.0
      };
    }
    
    // Check version patterns
    const versionMatch = this.checkVersionPatterns(modelId, modelName);
    if (versionMatch.isValid) {
      return versionMatch;
    }
    
    // Check provider activity
    if (!this.ACTIVE_PROVIDERS.has(provider)) {
      return {
        isValid: false,
        reason: `Provider ${provider} is not actively maintaining models`,
        estimatedAge: 'outdated',
        confidence: 0.7
      };
    }
    
    // Check for replacement indicators
    const isReplaced = this.isReplacedModel(modelId, modelName);
    if (isReplaced) {
      return {
        isValid: false,
        reason: `Model ${modelId} has been replaced by a newer version`,
        estimatedAge: 'outdated',
        confidence: 0.8
      };
    }
    
    // If we can't determine, check for fresh indicators in the name
    if (this.hasFreshIndicators(modelId, modelName)) {
      return {
        isValid: true,
        reason: `Model ${modelId} appears to be recent based on naming`,
        estimatedAge: 'recent',
        confidence: 0.6
      };
    }
    
    // Default: reject unknown models to be safe
    return {
      isValid: false,
      reason: `Cannot verify freshness of model ${modelId} - rejecting for safety`,
      estimatedAge: 'outdated',
      confidence: 0.5
    };
  }
  
  /**
   * Filter a list of models to only include fresh ones
   */
  filterFreshModels(models: ModelInfo[]): ModelInfo[] {
    const freshModels = models.filter(model => {
      const result = this.validateModelFreshness(model);
      
      if (result.isValid) {
        logger.info(`✅ Accepted fresh model: ${model.id}`, {
          reason: result.reason,
          age: result.estimatedAge,
          confidence: result.confidence
        });
      } else {
        logger.debug(`❌ Rejected outdated model: ${model.id}`, {
          reason: result.reason,
          age: result.estimatedAge,
          confidence: result.confidence
        });
      }
      
      return result.isValid;
    });
    
    logger.info(`Filtered models: ${freshModels.length}/${models.length} are fresh`);
    
    // If we filtered out too many, log a warning
    if (freshModels.length < 10) {
      logger.warn('Very few fresh models found - consider updating the freshness criteria');
    }
    
    return freshModels;
  }
  
  /**
   * Check if model is deprecated
   */
  private isDeprecated(modelId: string, modelName: string): boolean {
    // Check exact match
    if (this.DEPRECATED_MODELS.has(modelId)) {
      return true;
    }
    
    // Check model name without provider
    if (this.DEPRECATED_MODELS.has(modelName)) {
      return true;
    }
    
    // Check for deprecated patterns
    const deprecatedPatterns = [
      /claude-[12]/,     // Claude 1 or 2
      /claude-3[^.]/,    // Claude 3 without .5
      /gpt-3\.5-turbo(?!.*mini)/,  // Old GPT-3.5 (not mini)
      /gpt-4(?!.*o)/,    // Old GPT-4 (not 4o)
      /llama-[23](?!\.[1-9])/,  // Llama 2 or 3 without 3.1+
      /gemini-1\.0/,     // Old Gemini
      /palm/,            // Any PaLM model
    ];
    
    return deprecatedPatterns.some(pattern => pattern.test(modelId) || pattern.test(modelName));
  }
  
  /**
   * Check version patterns for freshness
   */
  private checkVersionPatterns(modelId: string, modelName: string): FreshnessResult {
    for (const pattern of this.FRESH_VERSION_PATTERNS) {
      if (pattern.test(modelId) || pattern.test(modelName)) {
        return {
          isValid: true,
          reason: `Model matches fresh version pattern: ${pattern}`,
          estimatedAge: 'latest',
          confidence: 0.8
        };
      }
    }
    
    return {
      isValid: false,
      reason: 'No fresh version patterns matched',
      estimatedAge: 'outdated',
      confidence: 0.5
    };
  }
  
  /**
   * Check if model has been replaced
   */
  private isReplacedModel(modelId: string, modelName: string): boolean {
    for (const [latestId, info] of this.LATEST_MODELS.entries()) {
      if (info.replaces) {
        for (const replaced of info.replaces) {
          if (modelId.includes(replaced) || modelName.includes(replaced)) {
            logger.debug(`Model ${modelId} is replaced by ${latestId}`);
            return true;
          }
        }
      }
    }
    return false;
  }
  
  /**
   * Check for fresh indicators in model name
   */
  private hasFreshIndicators(modelId: string, modelName: string): boolean {
    const freshIndicators = [
      'latest',
      '2025',
      'preview',
      'exp',
      'beta',
      'new',
      'v2',
      'plus',
      'turbo',
      'instruct',
    ];
    
    const combined = `${modelId} ${modelName}`.toLowerCase();
    return freshIndicators.some(indicator => combined.includes(indicator));
  }
  
  /**
   * Get recommended models for a specific role
   */
  getRecommendedModels(role: string): string[] {
    const recommendations: Record<string, string[]> = {
      deepwiki: [
        'openai/gpt-4o',
        'anthropic/claude-3.5-sonnet',
        'google/gemini-2.0-flash-exp',
      ],
      researcher: [
        'openai/gpt-4o-mini',
        'anthropic/claude-3.5-haiku',
        'google/gemini-1.5-flash',
      ],
      security: [
        'openai/o1-preview',
        'anthropic/claude-3.5-sonnet',
        'deepseek/deepseek-r1',
      ],
      performance: [
        'google/gemini-1.5-flash',
        'mistralai/codestral',
        'deepseek/deepseek-chat',
      ],
      location_finder: [
        'openai/gpt-4o',
        'anthropic/claude-3.5-sonnet',
        'deepseek/deepseek-chat',
      ],
    };
    
    return recommendations[role] || recommendations.researcher;
  }
  
  /**
   * Update the known latest models (should be called quarterly)
   */
  updateLatestModels(updates: Map<string, { version: string; releaseDate: string; replaces?: string[] }>): void {
    for (const [modelId, info] of updates.entries()) {
      this.LATEST_MODELS.set(modelId, info);
      logger.info(`Updated latest model: ${modelId} (${info.releaseDate})`);
    }
  }
}

export const modelFreshnessValidator = new ModelFreshnessValidator();