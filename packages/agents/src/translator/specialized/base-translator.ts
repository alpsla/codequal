import { createLogger } from '@codequal/core/utils';
import OpenAI from 'openai';
import { SupportedLanguage } from '../translator-agent';

export interface TranslationResult {
  translated: string | object;
  confidence: number;
  modelUsed: string;
  processingTime: number;
  cached: boolean;
}

export interface ModelConfig {
  provider: string;
  model: string;
  capabilities?: any;
  pricing?: any;
}

export abstract class BaseTranslator {
  protected logger;
  protected openai?: OpenAI;
  protected cache = new Map<string, any>();
  protected modelCache = new Map<string, any>();
  protected modelConfig?: ModelConfig;
  
  constructor(protected name: string) {
    this.logger = createLogger(`Translator:${name}`);
    // OpenAI client will NOT be initialized until model config is set
    this.logger.info('Translator created, waiting for model configuration from Vector DB');
  }
  
  /**
   * Initialize OpenAI client based on model configuration
   */
  private initializeOpenAIClient(): void {
    if (!this.modelConfig) {
      throw new Error('Cannot initialize OpenAI client without model configuration');
    }
    
    // Always use OpenRouter for translation models
    const apiKey = process.env.OPENROUTER_API_KEY;
    
    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY is required for translation service');
    }
    
    this.openai = new OpenAI({
      apiKey: apiKey,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': 'https://codequal.ai',
        'X-Title': 'CodeQual Translation Service'
      }
    } as any);
    
    this.logger.info('Initialized OpenAI client for OpenRouter', { 
      provider: this.modelConfig.provider,
      model: this.modelConfig.model
    });
  }
  
  /**
   * Translate content - must be implemented by subclasses
   */
  abstract translate(
    content: string | object,
    targetLanguage: SupportedLanguage,
    options?: any
  ): Promise<TranslationResult>;
  
  /**
   * Get the context type for this translator
   */
  abstract getContext(): string;
  
  /**
   * Get cache TTL for this translator
   */
  abstract getCacheTTL(): number;
  
  /**
   * Pre-process content before translation
   */
  protected preProcess(content: string | object): string | object {
    return content;
  }
  
  /**
   * Post-process translation result
   */
  protected postProcess(result: string, targetLanguage: SupportedLanguage): string {
    return result;
  }
  
  /**
   * Generate cache key
   */
  protected getCacheKey(
    content: string | object,
    targetLanguage: SupportedLanguage,
    options?: any
  ): string {
    const contentHash = typeof content === 'string' 
      ? content.substring(0, 100) // Use first 100 chars for key
      : JSON.stringify(content).substring(0, 100);
    
    const optionsHash = options ? JSON.stringify(options) : '';
    return `${this.name}-${targetLanguage}-${contentHash}-${optionsHash}`;
  }
  
  /**
   * Get from cache with TTL check
   */
  protected getFromCache(key: string): any {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    const { value, timestamp, ttl } = cached;
    const age = Date.now() - timestamp;
    
    if (age > ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return value;
  }
  
  /**
   * Set cache with TTL
   */
  protected setCache(key: string, value: any, ttl?: number): void {
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl: ttl || this.getCacheTTL()
    });
  }
  
  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    this.modelCache.clear();
  }
  
  /**
   * Get statistics
   */
  getStats(): {
    cacheSize: number;
    modelCacheSize: number;
    cacheHitRate: number;
  } {
    // Implementation would track hits/misses
    return {
      cacheSize: this.cache.size,
      modelCacheSize: this.modelCache.size,
      cacheHitRate: 0 // Would be calculated from tracking
    };
  }
  
  /**
   * Set model configuration from Vector DB
   */
  setModelConfig(config: ModelConfig): void {
    this.modelConfig = config;
    this.logger.info(`Model configuration updated from Vector DB`, {
      provider: config.provider,
      model: config.model,
      capabilities: config.capabilities
    });
    
    // Clear model cache when configuration changes
    this.modelCache.clear();
    
    // Initialize OpenAI client with the new configuration
    this.initializeOpenAIClient();
  }
  
  /**
   * Get current model configuration
   */
  getModelConfig(): ModelConfig | undefined {
    return this.modelConfig;
  }
  
  /**
   * Get model ID from configuration (required)
   */
  protected getModelId(): string {
    if (!this.modelConfig) {
      throw new Error('Model configuration not set. Translator must be initialized with Vector DB configuration.');
    }
    
    const modelId = this.modelConfig.model;
    const provider = this.modelConfig.provider;
    
    // OpenRouter expects format like "openai/gpt-3.5-turbo" or "anthropic/claude-3-opus"
    if (!modelId.includes('/')) {
      return `${provider}/${modelId}`;
    }
    
    return modelId;
  }
  
  /**
   * Ensure OpenAI client is initialized
   */
  protected ensureClient(): OpenAI {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized. Model configuration must be set first.');
    }
    return this.openai;
  }
}