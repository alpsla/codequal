/**
 * OpenRouter Model Validator
 * 
 * Validates and normalizes model names against OpenRouter's available models
 * This ensures that the Researcher agent only stores valid model names in Vector DB
 */

import { createLogger } from '../../utils';
import axios from 'axios';

const logger = createLogger('openrouter-model-validator');

interface OpenRouterModel {
  id: string;
  name: string;
  created?: number;
  context_length?: number;
  pricing?: {
    prompt: string;
    completion: string;
  };
}

export class OpenRouterModelValidator {
  private static instance: OpenRouterModelValidator;
  private availableModels: Map<string, OpenRouterModel> = new Map();
  private lastFetchTime = 0;
  private readonly CACHE_DURATION = 3600000; // 1 hour cache
  private readonly OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
  
  private constructor() {
    // Private constructor for singleton pattern
  }
  
  static getInstance(): OpenRouterModelValidator {
    if (!OpenRouterModelValidator.instance) {
      OpenRouterModelValidator.instance = new OpenRouterModelValidator();
    }
    return OpenRouterModelValidator.instance;
  }
  
  /**
   * Fetch available models from OpenRouter API
   */
  private async fetchAvailableModels(): Promise<void> {
    try {
      const response = await axios.get('https://openrouter.ai/api/v1/models', {
        headers: {
          'Authorization': `Bearer ${this.OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://github.com/codequal/codequal',
          'X-Title': 'CodeQual Model Validator'
        }
      });
      
      if (response.data && response.data.data) {
        this.availableModels.clear();
        response.data.data.forEach((model: OpenRouterModel) => {
          this.availableModels.set(model.id, model);
          
          // Also store without provider prefix for flexibility
          const modelName = model.id.split('/').pop();
          if (modelName && !this.availableModels.has(modelName)) {
            this.availableModels.set(modelName, model);
          }
        });
        
        this.lastFetchTime = Date.now();
        logger.info(`Loaded ${this.availableModels.size} models from OpenRouter`);
      }
    } catch (error) {
      logger.error('Failed to fetch OpenRouter models:', error as Error);
      // Fall back to known models if API fails
      this.loadFallbackModels();
    }
  }
  
  /**
   * Load fallback models in case API is unavailable
   */
  private loadFallbackModels(): void {
    const fallbackModels = [
      'openai/gpt-4o',
      'openai/gpt-4-turbo',
      'anthropic/claude-3-opus',
      'anthropic/claude-3.5-sonnet',
      'google/gemini-pro',
      'google/gemini-2.0-flash',
      'deepseek/deepseek-r1',
      'meta-llama/llama-3.1-405b-instruct'
    ];
    
    fallbackModels.forEach(modelId => {
      this.availableModels.set(modelId, {
        id: modelId,
        name: modelId
      });
    });
    
    logger.warn('Using fallback model list');
  }
  
  /**
   * Ensure models are loaded (with caching)
   */
  private async ensureModelsLoaded(): Promise<void> {
    const now = Date.now();
    if (this.availableModels.size === 0 || (now - this.lastFetchTime) > this.CACHE_DURATION) {
      await this.fetchAvailableModels();
    }
  }
  
  /**
   * Validate if a model exists in OpenRouter
   */
  async isValidModel(modelId: string): Promise<boolean> {
    await this.ensureModelsLoaded();
    return this.availableModels.has(modelId);
  }
  
  /**
   * Normalize a model name to OpenRouter format
   * Attempts to find the correct OpenRouter model ID for a given model name
   */
  async normalizeModelName(modelName: string): Promise<string | null> {
    await this.ensureModelsLoaded();
    
    // Direct match
    if (this.availableModels.has(modelName)) {
      return modelName;
    }
    
    // Try lowercase
    const lowercase = modelName.toLowerCase();
    if (this.availableModels.has(lowercase)) {
      return lowercase;
    }
    
    // Try to find by partial match
    const modelNameParts = modelName.toLowerCase().split(/[/-]/);
    
    for (const [id, model] of this.availableModels) {
      const idParts = id.toLowerCase().split(/[/-]/);
      
      // Check if all parts of the input name are in the model ID
      if (modelNameParts.every(part => idParts.includes(part))) {
        logger.info(`Normalized "${modelName}" to "${id}"`);
        return id;
      }
    }
    
    // Special cases for common variations
    const replacements: Record<string, string> = {
      'gpt-4o-2025-07': 'openai/gpt-4o',
      'gpt-4o-2025': 'openai/gpt-4o',
      'claude-3.7-sonnet': 'anthropic/claude-3.5-sonnet',
      'claude-4': 'anthropic/claude-3-opus', // Latest Claude until v4 is released
      'gemini-2': 'google/gemini-2.0-flash'
    };
    
    const replacement = replacements[modelName.toLowerCase()];
    if (replacement && this.availableModels.has(replacement)) {
      logger.info(`Mapped "${modelName}" to "${replacement}"`);
      return replacement;
    }
    
    logger.warn(`Could not normalize model name: ${modelName}`);
    return null;
  }
  
  /**
   * Get all available models
   */
  async getAvailableModels(): Promise<string[]> {
    await this.ensureModelsLoaded();
    return Array.from(this.availableModels.keys()).filter(id => id.includes('/'));
  }
  
  /**
   * Get model info
   */
  async getModelInfo(modelId: string): Promise<OpenRouterModel | null> {
    await this.ensureModelsLoaded();
    return this.availableModels.get(modelId) || null;
  }
  
  /**
   * Validate and normalize a model name (alias for normalizeModelName)
   * This is the primary method the Researcher agent should use
   */
  async validateAndNormalize(modelName: string): Promise<string | null> {
    return this.normalizeModelName(modelName);
  }
}

// Export singleton instance
export const openRouterModelValidator = OpenRouterModelValidator.getInstance();