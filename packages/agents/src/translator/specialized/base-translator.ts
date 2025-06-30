import { createLogger } from '@codequal/core/utils';
import OpenAI from 'openai';
import { TranslatorResearcher } from '../translator-researcher';
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
  protected openai: OpenAI;
  protected researcher: TranslatorResearcher;
  protected cache = new Map<string, any>();
  protected modelCache = new Map<string, any>();
  protected modelConfig?: ModelConfig;
  
  constructor(protected name: string) {
    this.logger = createLogger(`Translator:${name}`);
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });
    this.researcher = new TranslatorResearcher();
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
    this.logger.info(`Model configuration updated`, {
      provider: config.provider,
      model: config.model
    });
    
    // Clear model cache when configuration changes
    this.modelCache.clear();
  }
  
  /**
   * Get current model configuration
   */
  getModelConfig(): ModelConfig | undefined {
    return this.modelConfig;
  }
  
  /**
   * Get preferred model ID based on configuration
   */
  protected getPreferredModelId(): string {
    if (this.modelConfig) {
      return this.modelConfig.model;
    }
    
    // Fallback to researcher selection
    return 'gpt-3.5-turbo';
  }
}