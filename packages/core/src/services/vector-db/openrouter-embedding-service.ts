/**
 * OpenRouter Embedding Service
 * 
 * NOTE: As of July 2025, OpenRouter doesn't support embedding models, only chat models.
 * This service currently uses OpenAI API directly for embeddings, but is designed
 * to easily switch to OpenRouter when they add embedding support, or to add
 * alternative providers like Together AI for specialized models (e.g., Voyage Code-2).
 * 
 * The name is kept as "OpenRouterEmbeddingService" to maintain consistency with
 * our plan to use OpenRouter for unified billing when they support embeddings.
 */

import { createLogger } from '../../utils/logger';
import OpenAI from 'openai';
import { embeddingConfigService, EmbeddingConfiguration } from './embedding-config-service';

export interface EmbeddingConfig {
  provider: string;
  model: string;
  dimensions: number;
  maxTokens: number;
  costPerMillion: number;
  embeddingType: 'text' | 'code' | 'multimodal';
}

export interface EmbeddingProvider {
  name: string;
  baseURL: string;
  apiKey: string;
  models: Map<string, EmbeddingConfig>;
}

export class OpenRouterEmbeddingService {
  private logger = createLogger('OpenRouterEmbeddingService');
  private providers: Map<string, EmbeddingProvider> = new Map();
  private openRouterClient: OpenAI;
  private togetherClient?: OpenAI;
  private voyageClient?: any; // Will be VoyageAIClient when available
  private currentConfig: EmbeddingConfig;
  
  private dbConfigLoaded = false;

  constructor() {
    // Load configuration from database on next tick to avoid initialization issues
    process.nextTick(() => this.loadConfigFromDatabase());
    // Initialize OpenAI client for embeddings (OpenRouter doesn't support embeddings yet)
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      throw new Error('OPENAI_API_KEY is required for embeddings');
    }
    
    // Using OpenAI directly for embeddings until OpenRouter supports them
    this.openRouterClient = new OpenAI({
      apiKey: openaiKey
    });
    
    // Initialize Together AI client if API key is available
    const togetherKey = process.env.TOGETHER_API_KEY;
    if (togetherKey) {
      this.togetherClient = new OpenAI({
        apiKey: togetherKey,
        baseURL: 'https://api.together.xyz/v1'
      });
      this.logger.info('Together AI client initialized');
    }
    
    // Initialize Voyage AI client if API key is available
    const voyageKey = process.env.VOYAGE_API_KEY;
    if (voyageKey) {
      // For now, we'll use fetch API directly until voyageai package is installed
      this.voyageClient = {
        apiKey: voyageKey,
        embed: async (input: string, model: string) => {
          const response = await fetch('https://api.voyageai.com/v1/embeddings', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${voyageKey}`
            },
            body: JSON.stringify({
              input: [input],
              model: model,
              input_type: 'document'
            })
          });
          
          if (!response.ok) {
            throw new Error(`Voyage AI error: ${response.statusText}`);
          }
          
          const data = await response.json();
          return data.data[0].embedding;
        }
      };
      this.logger.info('Voyage AI client initialized for code embeddings');
    }
    
    // Initialize providers
    this.initializeProviders();
    
    // Set default configuration
    this.currentConfig = this.getDefaultConfig();
    
    this.logger.info('Initialized embedding service', {
      defaultModel: `${this.currentConfig.provider}/${this.currentConfig.model}`,
      dimensions: this.currentConfig.dimensions,
      togetherEnabled: !!togetherKey,
      voyageEnabled: !!voyageKey
    });
  }
  
  /**
   * Initialize available providers and their models
   */
  private initializeProviders() {
    // OpenRouter provider (for models available via OpenRouter)
    const openRouterModels = new Map<string, EmbeddingConfig>();
    
    // OpenAI models via OpenRouter
    openRouterModels.set('text-embedding-3-small', {
      provider: 'openai',
      model: 'text-embedding-3-small',
      dimensions: 1536,
      maxTokens: 8191,
      costPerMillion: 0.02,
      embeddingType: 'text'
    });
    
    openRouterModels.set('text-embedding-3-large', {
      provider: 'openai',
      model: 'text-embedding-3-large',
      dimensions: 3072,
      maxTokens: 8191,
      costPerMillion: 0.13,
      embeddingType: 'text'
    });
    
    // Cohere models via OpenRouter (if available)
    openRouterModels.set('embed-english-v3.0', {
      provider: 'cohere',
      model: 'embed-english-v3.0',
      dimensions: 1024,
      maxTokens: 512,
      costPerMillion: 0.10,
      embeddingType: 'text'
    });
    
    this.providers.set('openrouter', {
      name: 'OpenRouter',
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY!,
      models: openRouterModels
    });
    
    // Voyage AI provider (if API key is available)
    if (process.env.VOYAGE_API_KEY) {
      const voyageModels = new Map<string, EmbeddingConfig>();
      
      voyageModels.set('voyage-code-2', {
        provider: 'voyage',
        model: 'voyage-code-2',
        dimensions: 1536,
        maxTokens: 16000,
        costPerMillion: 0.12,
        embeddingType: 'code'
      });
      
      // Latest model as of 2025
      voyageModels.set('voyage-code-3', {
        provider: 'voyage',
        model: 'voyage-code-3',
        dimensions: 1024,
        maxTokens: 32000,
        costPerMillion: 0.12,
        embeddingType: 'code'
      });
      
      this.providers.set('voyage', {
        name: 'Voyage AI',
        baseURL: 'https://api.voyageai.com/v1',
        apiKey: process.env.VOYAGE_API_KEY,
        models: voyageModels
      });
    }
  }
  
  /**
   * Get default embedding configuration
   */
  private getDefaultConfig(): EmbeddingConfig {
    // Default to OpenAI text-embedding-3-large for better performance
    return {
      provider: 'openai',
      model: 'text-embedding-3-large',
      dimensions: 3072,
      maxTokens: 8191,
      costPerMillion: 0.13,
      embeddingType: 'text'
    };
  }
  
  /**
   * Create embedding for text
   */
  async createEmbedding(text: string, options?: {
    model?: string;
    contentType?: string;
  }): Promise<number[]> {
    const startTime = Date.now();
    
    try {
      
      // Determine which model to use (with database override)
      const modelConfig = options?.model 
        ? this.findModelConfig(options.model)
        : await this.getConfigForContentWithDbOverride(options?.contentType);
      
      // Log the embedding request
      this.logger.debug('Creating embedding', {
        model: `${modelConfig.provider}/${modelConfig.model}`,
        textLength: text.length,
        contentType: options?.contentType
      });
      
      // Create embedding based on provider
      let embedding: number[];
      
      if (this.isOpenRouterModel(modelConfig)) {
        // Use OpenRouter
        embedding = await this.createOpenRouterEmbedding(text, modelConfig);
      } else {
        // Use alternative provider (Together AI for Voyage)
        embedding = await this.createAlternativeEmbedding(text, modelConfig);
      }
      
      const duration = Date.now() - startTime;
      
      const tokensEstimate = Math.ceil(text.length / 4);
      
      this.logger.info('Embedding created successfully', {
        model: `${modelConfig.provider}/${modelConfig.model}`,
        dimensions: embedding.length,
        duration: `${duration}ms`,
        tokensEstimate
      });
      
      // Record metrics
      await this.recordMetrics(modelConfig, duration, tokensEstimate, true);
      
      return embedding;
      
    } catch (error) {
      this.logger.error('Failed to create embedding', { error });
      
      // Try to record failure metrics
      if (options?.contentType || options?.model) {
        const modelConfig = options?.model 
          ? this.findModelConfig(options.model)
          : await this.getConfigForContentWithDbOverride(options?.contentType);
        
        await this.recordMetrics(
          modelConfig, 
          Date.now() - startTime, 
          0, 
          false, 
          error instanceof Error ? error.message : String(error)
        );
      }
      
      throw error;
    }
  }
  
  /**
   * Create embedding via OpenAI (until OpenRouter supports embeddings)
   */
  private async createOpenRouterEmbedding(
    text: string, 
    config: EmbeddingConfig
  ): Promise<number[]> {
    // Use direct model name for OpenAI, not provider/model format
    const response = await this.openRouterClient.embeddings.create({
      model: config.model,
      input: text,
      dimensions: config.dimensions
    });
    
    return response.data[0].embedding;
  }
  
  /**
   * Create embedding via alternative provider (Voyage AI or Together AI)
   */
  private async createAlternativeEmbedding(
    text: string,
    config: EmbeddingConfig
  ): Promise<number[]> {
    // Handle Voyage AI
    if (config.provider === 'voyage') {
      if (!this.voyageClient) {
        throw new Error('Voyage AI client not initialized. Please set VOYAGE_API_KEY.');
      }
      
      // Use Voyage AI client
      return await this.voyageClient.embed(text, config.model);
    }
    
    // Handle Together AI (if they add embedding support)
    if (this.togetherClient) {
      const response = await this.togetherClient.embeddings.create({
        model: `${config.provider}/${config.model}`,
        input: text
      });
      
      return response.data[0].embedding;
    }
    
    throw new Error(`Alternative provider ${config.provider} not available`);
  }
  
  /**
   * Check if model is available via OpenRouter
   */
  private isOpenRouterModel(config: EmbeddingConfig): boolean {
    const openRouterProvider = this.providers.get('openrouter');
    if (!openRouterProvider) return false;
    
    return Array.from(openRouterProvider.models.values())
      .some(m => m.provider === config.provider && m.model === config.model);
  }
  
  /**
   * Find model configuration by name
   */
  private findModelConfig(modelName: string): EmbeddingConfig {
    for (const provider of this.providers.values()) {
      const config = provider.models.get(modelName);
      if (config) return config;
    }
    
    // Fallback to default
    this.logger.warn(`Model ${modelName} not found, using default`);
    return this.getDefaultConfig();
  }
  
  /**
   * Get appropriate model configuration for content type
   */
  private getConfigForContent(contentType?: string): EmbeddingConfig {
    // Use different models based on content type
    if (contentType === 'code') {
      // First choice: Voyage Code-3 (latest and best for code)
      if (process.env.VOYAGE_API_KEY) {
        const voyageCode3 = this.findModelConfig('voyage-code-3');
        if (voyageCode3) {
          this.logger.debug('Using voyage-code-3 for code content');
          return voyageCode3;
        }
        
        // Fallback to voyage-code-2 if code-3 not available
        const voyageCode2 = this.findModelConfig('voyage-code-2');
        if (voyageCode2) {
          this.logger.debug('Using voyage-code-2 for code content');
          return voyageCode2;
        }
      }
      
      // Fallback: Use text-embedding-3-large for code when Voyage not available
      const largeConfig = this.findModelConfig('text-embedding-3-large');
      if (largeConfig) {
        this.logger.debug('Using text-embedding-3-large for code content (Voyage not available)');
        return largeConfig;
      }
    }
    
    // Use text-embedding-3-large for documentation and general text (better performance)
    return this.currentConfig;
  }
  
  /**
   * Update current configuration (e.g., from Vector DB)
   */
  updateConfiguration(config: Partial<EmbeddingConfig>) {
    this.currentConfig = {
      ...this.currentConfig,
      ...config
    };
    
    this.logger.info('Updated embedding configuration', {
      model: `${this.currentConfig.provider}/${this.currentConfig.model}`
    });
  }
  
  /**
   * Get current configuration
   */
  getConfiguration(): EmbeddingConfig {
    return { ...this.currentConfig };
  }
  
  /**
   * Estimate cost for embedding text
   */
  estimateCost(text: string, config?: EmbeddingConfig): number {
    const cfg = config || this.currentConfig;
    const tokenEstimate = Math.ceil(text.length / 4); // Rough estimate
    return (tokenEstimate / 1_000_000) * cfg.costPerMillion;
  }
  
  /**
   * Get available models
   */
  getAvailableModels(): Array<{
    provider: string;
    model: string;
    available: boolean;
    config: EmbeddingConfig;
  }> {
    const models: Array<any> = [];
    
    for (const [providerKey, provider] of this.providers) {
      for (const [modelKey, config] of provider.models) {
        models.push({
          provider: config.provider,
          model: config.model,
          available: providerKey === 'openrouter' || !!provider.apiKey,
          config
        });
      }
    }
    
    return models;
  }

  /**
   * Load configuration from database
   */
  private async loadConfigFromDatabase(): Promise<void> {
    try {
      // Get default configuration from database
      const defaultConfig = await embeddingConfigService.getDefaultConfig();
      
      if (defaultConfig) {
        this.logger.info('Loading embedding configuration from database', {
          config: defaultConfig.config_name,
          provider: defaultConfig.provider,
          model: defaultConfig.model_name
        });

        // Update default configuration
        this.currentConfig = {
          provider: defaultConfig.provider,
          model: defaultConfig.model_name,
          dimensions: defaultConfig.dimensions,
          maxTokens: defaultConfig.max_tokens,
          costPerMillion: (defaultConfig.cost_per_1k_tokens || 0) * 1000,
          embeddingType: 'text'
        };

        // Also load content-specific configurations
        const codeConfig = await embeddingConfigService.getConfigForContentType('code');
        if (codeConfig && codeConfig.provider === 'voyage') {
          // Update Voyage configuration for code
          this.logger.info('Loaded code-specific embedding config', {
            config: codeConfig.config_name,
            model: codeConfig.model_name
          });
        }

        this.dbConfigLoaded = true;
      } else {
        this.logger.warn('No default embedding configuration found in database, using hardcoded defaults');
      }
    } catch (error) {
      this.logger.error('Failed to load embedding configuration from database', { error });
      // Continue with hardcoded configuration
    }
  }

  /**
   * Get configuration for content type with database override
   */
  async getConfigForContentWithDbOverride(contentType?: string): Promise<EmbeddingConfig> {
    // If database config is loaded, check for content-specific override
    if (this.dbConfigLoaded && contentType) {
      const dbConfig = await embeddingConfigService.getConfigForContentType(contentType);
      if (dbConfig) {
        return {
          provider: dbConfig.provider,
          model: dbConfig.model_name,
          dimensions: dbConfig.dimensions,
          maxTokens: dbConfig.max_tokens,
          costPerMillion: (dbConfig.cost_per_1k_tokens || 0) * 1000,
          embeddingType: 'text'
        };
      }
    }

    // Fall back to existing logic
    return this.getConfigForContent(contentType);
  }

  /**
   * Record embedding metrics
   */
  private async recordMetrics(
    config: EmbeddingConfig | EmbeddingConfiguration,
    latencyMs: number,
    tokensUsed: number,
    success: boolean,
    errorMessage?: string
  ): Promise<void> {
    // Only record if we have a database configuration
    if (this.dbConfigLoaded) {
      try {
        // Find the configuration ID - try to match by model name first
        const modelName = 'model' in config ? config.model : config.model_name;
        
        // Get all active configs and find matching one
        const configs = await embeddingConfigService.getActiveConfigs();
        const dbConfig = configs.find(c => c.model_name === modelName);
        
        if (dbConfig) {
          await embeddingConfigService.recordMetrics(dbConfig.id, {
            latencyMs,
            tokensUsed,
            success,
            errorMessage
          });
        }
      } catch (error) {
        // Don't fail the main operation
        this.logger.debug('Failed to record metrics', { error });
      }
    }
  }
}

// Export singleton instance
export const openRouterEmbeddingService = new OpenRouterEmbeddingService();