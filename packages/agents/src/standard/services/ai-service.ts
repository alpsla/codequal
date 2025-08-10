/**
 * Standard AI Service for LLM Calls
 * 
 * Provides a unified interface for making AI/LLM calls using models
 * selected by the ResearcherAgent and stored in Supabase.
 * 
 * This service:
 * - Uses models from UnifiedModelSelector (no hardcoded models)
 * - Supports primary and fallback models
 * - Integrates with OpenRouter API
 * - Provides cost tracking and monitoring
 */

import { ModelVersionInfo } from '@codequal/core';
import { createLogger } from '@codequal/core/utils';

const logger = createLogger('AIService');

export interface AIServiceConfig {
  openRouterApiKey?: string;
  maxRetries?: number;
  timeout?: number;
  temperature?: number;
  maxTokens?: number;
}

export interface AIRequest {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stream?: boolean;
  jsonMode?: boolean;
}

export interface AIResponse {
  content: string;
  model: string;
  provider: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  cost?: number;
  latency?: number;
}

export interface ModelPair {
  primary: ModelVersionInfo;
  fallback: ModelVersionInfo;
}

/**
 * Standard AI Service for making LLM calls
 */
export class AIService {
  private config: AIServiceConfig;
  private apiKey: string;
  
  constructor(config: AIServiceConfig = {}) {
    this.config = {
      maxRetries: 2,
      timeout: 60000,
      temperature: 0.1,
      maxTokens: 2000,
      ...config
    };
    
    this.apiKey = config.openRouterApiKey || process.env.OPENROUTER_API_KEY || '';
    
    if (!this.apiKey) {
      logger.warn('OpenRouter API key not configured - AI calls will fail');
    }
  }
  
  /**
   * Make an AI call using the provided model
   */
  async call(
    model: ModelVersionInfo,
    request: AIRequest
  ): Promise<AIResponse> {
    const startTime = Date.now();
    const modelIdentifier = this.getModelIdentifier(model);
    
    logger.debug(`Calling model: ${modelIdentifier}`, {
      temperature: request.temperature || this.config.temperature,
      maxTokens: request.maxTokens || this.config.maxTokens
    });
    
    try {
      const response = await this.makeOpenRouterRequest(modelIdentifier, request);
      
      const latency = Date.now() - startTime;
      const result: AIResponse = {
        content: response.content,
        model: model.model,
        provider: model.provider,
        usage: response.usage,
        cost: this.calculateCost(response.usage, model),
        latency
      };
      
      logger.info('AI call successful', {
        model: modelIdentifier,
        tokens: response.usage?.totalTokens,
        cost: result.cost,
        latency
      });
      
      return result;
    } catch (error) {
      logger.error(`AI call failed for ${modelIdentifier}:`, error as Error);
      throw error;
    }
  }
  
  /**
   * Make an AI call with automatic fallback
   */
  async callWithFallback(
    models: ModelPair,
    request: AIRequest
  ): Promise<AIResponse> {
    try {
      // Try primary model first
      return await this.call(models.primary, request);
    } catch (primaryError) {
      logger.warn('Primary model failed, trying fallback', {
        primary: this.getModelIdentifier(models.primary),
        fallback: this.getModelIdentifier(models.fallback),
        error: primaryError
      });
      
      try {
        // Try fallback model
        const response = await this.call(models.fallback, request);
        response.model = `${response.model} (fallback)`;
        return response;
      } catch (fallbackError) {
        logger.error('Both primary and fallback models failed', {
          primary: this.getModelIdentifier(models.primary),
          fallback: this.getModelIdentifier(models.fallback),
          primaryError,
          fallbackError
        });
        throw new Error('All models failed: ' + (fallbackError as Error).message);
      }
    }
  }
  
  /**
   * Make request to OpenRouter API
   */
  private async makeOpenRouterRequest(
    modelIdentifier: string,
    request: AIRequest
  ): Promise<any> {
    const messages = [];
    
    if (request.systemPrompt) {
      messages.push({
        role: 'system',
        content: request.systemPrompt
      });
    }
    
    messages.push({
      role: 'user',
      content: request.prompt
    });
    
    const body: any = {
      model: modelIdentifier,
      messages,
      temperature: request.temperature ?? this.config.temperature,
      max_tokens: request.maxTokens ?? this.config.maxTokens,
      top_p: request.topP ?? 0.95,
      stream: request.stream ?? false
    };
    
    // Add response format for JSON mode
    if (request.jsonMode) {
      body.response_format = { type: 'json_object' };
    }
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://codequal.com',
        'X-Title': 'CodeQual AI Service'
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.config.timeout!)
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter API error (${response.status}): ${error}`);
    }
    
    const data = await response.json();
    
    if (!data.choices?.[0]?.message?.content) {
      throw new Error('Invalid response from OpenRouter');
    }
    
    return {
      content: data.choices[0].message.content,
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens
      } : undefined
    };
  }
  
  /**
   * Get OpenRouter model identifier
   */
  private getModelIdentifier(model: ModelVersionInfo): string {
    // Handle various model ID formats
    const modelId = (model as any).model_id || model.model;
    
    // Some models already include provider prefix
    if (modelId.includes('/')) {
      return modelId;
    }
    
    // Construct provider/model format for OpenRouter
    return `${model.provider}/${modelId}`;
  }
  
  /**
   * Calculate cost based on usage and model pricing
   */
  private calculateCost(
    usage: any,
    model: ModelVersionInfo
  ): number {
    if (!usage || !model.pricing) {
      return 0;
    }
    
    const inputCost = (usage.promptTokens / 1_000_000) * model.pricing.input;
    const outputCost = (usage.completionTokens / 1_000_000) * model.pricing.output;
    
    return inputCost + outputCost;
  }
  
  /**
   * Validate that API key is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }
  
  /**
   * Update configuration
   */
  updateConfig(config: Partial<AIServiceConfig>): void {
    this.config = { ...this.config, ...config };
    if (config.openRouterApiKey) {
      this.apiKey = config.openRouterApiKey;
    }
  }
}

/**
 * Factory function to create AI Service
 */
export function createAIService(config?: AIServiceConfig): AIService {
  return new AIService(config);
}

/**
 * Singleton instance for shared use
 */
let sharedInstance: AIService | null = null;

export function getSharedAIService(config?: AIServiceConfig): AIService {
  if (!sharedInstance) {
    sharedInstance = createAIService(config);
  } else if (config) {
    sharedInstance.updateConfig(config);
  }
  return sharedInstance;
}