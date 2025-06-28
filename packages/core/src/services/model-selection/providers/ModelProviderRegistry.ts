/**
 * Model Provider Registry
 * 
 * This module provides a centralized registry for model providers,
 * making it easy to register and retrieve model provider plugins.
 */

import { ModelProviderPlugin } from '../ModelVersionSync';
import { ModelVersionSync } from '../ModelVersionSync';
import { Logger } from '../../../utils/logger';

// Import provider plugins
import { OpenAIModelProvider } from './OpenAIModelProvider';
import { AnthropicModelProvider } from './AnthropicModelProvider';

/**
 * Model provider registry
 */
export class ModelProviderRegistry {
  /**
   * Available provider plugins
   */
  private providers: ModelProviderPlugin[] = [];
  
  /**
   * Constructor
   * 
   * @param logger Logger instance
   * @param modelVersionSync Model version synchronizer
   */
  constructor(
    private logger: Logger,
    private modelVersionSync: ModelVersionSync
  ) {
    this.logger.info('ModelProviderRegistry initialized');
  }
  
  /**
   * Register a provider plugin
   * 
   * @param provider Provider plugin
   * @returns Count of models registered
   */
  async registerProvider(provider: ModelProviderPlugin): Promise<number> {
    try {
      // Add to list of providers
      this.providers.push(provider);
      
      // Register the provider's models
      const count = await this.modelVersionSync.registerProvider(provider);
      
      this.logger.info(`Registered provider ${provider.provider} with ${count} models`);
      
      return count;
    } catch (error) {
      this.logger.error('Error registering provider', { 
        provider: provider.provider, 
        error 
      });
      return 0;
    }
  }
  
  /**
   * Get all registered providers
   * 
   * @returns Array of registered provider plugins
   */
  getProviders(): ModelProviderPlugin[] {
    return [...this.providers];
  }
  
  /**
   * Get a specific provider by name
   * 
   * @param providerName Provider name
   * @returns Provider plugin or undefined if not found
   */
  getProvider(providerName: string): ModelProviderPlugin | undefined {
    return this.providers.find(p => p.provider === providerName);
  }
  
  /**
   * Register all default providers
   * 
   * @returns Total count of models registered
   */
  async registerDefaultProviders(): Promise<number> {
    let totalCount = 0;
    
    // Register OpenAI provider
    totalCount += await this.registerProvider(new OpenAIModelProvider());
    
    // Register Anthropic provider
    totalCount += await this.registerProvider(new AnthropicModelProvider());
    
    this.logger.info(`Registered ${this.providers.length} default providers with ${totalCount} total models`);
    
    return totalCount;
  }
}

/**
 * Create and initialize the provider registry with default providers
 * 
 * @param logger Logger instance
 * @param modelVersionSync Model version synchronizer
 * @returns Initialized provider registry
 */
export function createProviderRegistry(
  logger: Logger,
  modelVersionSync: ModelVersionSync
): ModelProviderRegistry {
  const registry = new ModelProviderRegistry(logger, modelVersionSync);
  registry.registerDefaultProviders();
  return registry;
}