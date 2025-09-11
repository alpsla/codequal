/**
 * Model Availability Validator
 * 
 * Validates that models are actually available on OpenRouter before selection
 * Prevents 404 errors and "No endpoints found" issues
 * 
 * FIX FOR BUG-034: Primary model google/gemini-2.5-pro-exp-03-25 not available
 */

import axios from 'axios';
import { createLogger } from '@codequal/core/utils';
import { ModelVersionInfo } from '@codequal/core';

const logger = createLogger('ModelAvailabilityValidator');

interface ModelStatus {
  modelId: string;
  available: boolean;
  error?: string;
  lastChecked: Date;
}

export class ModelAvailabilityValidator {
  private statusCache: Map<string, ModelStatus> = new Map();
  private cacheExpiry = 5 * 60 * 1000; // 5 minutes
  private openRouterApiKey: string;
  
  constructor(openRouterApiKey?: string) {
    this.openRouterApiKey = openRouterApiKey || process.env.OPENROUTER_API_KEY || '';
  }
  
  /**
   * Check if a model is available on OpenRouter
   */
  async isModelAvailable(modelId: string): Promise<boolean> {
    // Check cache first
    const cached = this.statusCache.get(modelId);
    if (cached && this.isCacheValid(cached)) {
      return cached.available;
    }
    
    try {
      // Make a lightweight test request to check availability
      const available = await this.checkModelAvailability(modelId);
      
      // Cache the result
      this.statusCache.set(modelId, {
        modelId,
        available,
        lastChecked: new Date()
      });
      
      return available;
    } catch (error) {
      logger.error(`Failed to check availability for ${modelId}:`, error);
      
      // Cache the failure
      this.statusCache.set(modelId, {
        modelId,
        available: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        lastChecked: new Date()
      });
      
      return false;
    }
  }
  
  /**
   * Validate multiple models and filter out unavailable ones
   */
  async filterAvailableModels(models: ModelVersionInfo[]): Promise<ModelVersionInfo[]> {
    const availableModels: ModelVersionInfo[] = [];
    
    for (const model of models) {
      const modelId = this.getModelId(model);
      const isAvailable = await this.isModelAvailable(modelId);
      
      if (isAvailable) {
        availableModels.push(model);
        logger.debug(`✅ Model ${modelId} is available`);
      } else {
        logger.warn(`❌ Model ${modelId} is NOT available - filtering out`);
      }
    }
    
    logger.info(`Filtered models: ${availableModels.length}/${models.length} available`);
    return availableModels;
  }
  
  /**
   * Get list of known unavailable models to pre-filter
   */
  getKnownUnavailableModels(): string[] {
    return [
      'google/gemini-2.5-pro-exp-03-25', // BUG-034: This model doesn't exist
      'google/gemini-2.5-pro-exp',       // Experimental models often unavailable
      'openai/gpt-5-turbo',               // Doesn't exist yet
      'anthropic/claude-opus-5',         // Doesn't exist
    ];
  }
  
  /**
   * Pre-filter models before availability check
   */
  preFilterModels(models: ModelVersionInfo[]): ModelVersionInfo[] {
    const blacklist = this.getKnownUnavailableModels();
    
    return models.filter(model => {
      const modelId = this.getModelId(model);
      
      // Filter out known unavailable models
      if (blacklist.some(blocked => modelId.includes(blocked))) {
        logger.warn(`⚠️ Pre-filtering known unavailable model: ${modelId}`);
        return false;
      }
      
      // Filter out experimental models with specific date codes (often unavailable)
      if (modelId.match(/exp-\d{2}-\d{2}$/)) {
        logger.warn(`⚠️ Pre-filtering experimental model with date code: ${modelId}`);
        return false;
      }
      
      return true;
    });
  }
  
  /**
   * Perform actual availability check
   */
  private async checkModelAvailability(modelId: string): Promise<boolean> {
    if (!this.openRouterApiKey) {
      logger.warn('No OpenRouter API key configured - assuming model is available');
      return true;
    }
    
    try {
      // First, try to get the model from OpenRouter's model list
      const modelsResponse = await axios.get('https://openrouter.ai/api/v1/models', {
        headers: {
          'Authorization': `Bearer ${this.openRouterApiKey}`,
          'HTTP-Referer': 'https://codequal.ai',
          'X-Title': 'CodeQual Model Validator'
        },
        timeout: 5000
      });
      
      const models = modelsResponse.data.data || [];
      const modelExists = models.some((m: any) => m.id === modelId);
      
      if (!modelExists) {
        logger.debug(`Model ${modelId} not found in OpenRouter model list`);
        return false;
      }
      
      // Optionally, make a minimal test request to verify the model actually works
      // This is more expensive but more reliable
      if (process.env.ENABLE_DEEP_MODEL_VALIDATION === 'true') {
        return await this.deepValidateModel(modelId);
      }
      
      return true;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          logger.debug(`Model ${modelId} returned 404 - not available`);
          return false;
        }
        if (error.response?.data?.error?.includes('No endpoints found')) {
          logger.debug(`Model ${modelId} has no endpoints - not available`);
          return false;
        }
      }
      throw error;
    }
  }
  
  /**
   * Deep validation by making a minimal test request
   */
  private async deepValidateModel(modelId: string): Promise<boolean> {
    try {
      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: modelId,
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 1,
          temperature: 0
        },
        {
          headers: {
            'Authorization': `Bearer ${this.openRouterApiKey}`,
            'HTTP-Referer': 'https://codequal.ai',
            'X-Title': 'CodeQual Model Validator',
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
      
      return response.status === 200;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.error || error.message;
        logger.debug(`Deep validation failed for ${modelId}: ${errorMessage}`);
      }
      return false;
    }
  }
  
  /**
   * Get model ID from ModelVersionInfo
   */
  private getModelId(model: ModelVersionInfo): string {
    return model.model || `${model.provider}/${model.versionId || 'latest'}`;
  }
  
  /**
   * Check if cache entry is still valid
   */
  private isCacheValid(status: ModelStatus): boolean {
    const age = Date.now() - status.lastChecked.getTime();
    return age < this.cacheExpiry;
  }
  
  /**
   * Clear the cache
   */
  clearCache(): void {
    this.statusCache.clear();
    logger.info('Model availability cache cleared');
  }
  
  /**
   * Get cache statistics
   */
  getCacheStats(): { total: number; available: number; unavailable: number } {
    let available = 0;
    let unavailable = 0;
    
    this.statusCache.forEach(status => {
      if (status.available) {
        available++;
      } else {
        unavailable++;
      }
    });
    
    return {
      total: this.statusCache.size,
      available,
      unavailable
    };
  }
}

// Export singleton instance
export const modelAvailabilityValidator = new ModelAvailabilityValidator();