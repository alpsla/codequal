/**
 * Context-Aware Model Selector
 * 
 * Uses the 400 configurations stored by the researcher
 * to select optimal models based on role, language, and repository size
 */

import { ModelVersionSync, ModelVersionInfo, Logger, createLogger } from '@codequal/core';
import { VectorStorageService } from '@codequal/database';
import { UnifiedModelSelector, RepositoryContext, UnifiedModelSelection } from './unified-model-selector';

// Global logger instance removed - using instance logger instead

// Configuration constants (must match researcher)
const SUPPORTED_LANGUAGES = [
  'javascript', 'typescript', 'python', 'java', 'rust',
  'go', 'csharp', 'ruby', 'php', 'swift'
] as const;

const REPOSITORY_SIZES = [
  'small', 'medium', 'large', 'extra_large'
] as const;

interface StoredConfiguration {
  role: string;
  language: string;
  repositorySize: string;
  contextKey: string;
  primary: ModelVersionInfo;
  fallback: ModelVersionInfo;
  reasoning: string[];
  contextSpecificWeights?: Record<string, number>;
  lastUpdated: string;
  modelSelectionVersion?: string;
}

export class ContextAwareModelSelector extends UnifiedModelSelector {
  private configurationCache: Map<string, StoredConfiguration> = new Map();
  private lastCacheRefresh: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly RESEARCHER_CONFIG_REPO_ID = '00000000-0000-0000-0000-000000000001';

  private logger: Logger;

  constructor(
    modelVersionSync: ModelVersionSync,
    vectorStorage: VectorStorageService,
    logger?: Logger
  ) {
    super(modelVersionSync, vectorStorage);
    this.logger = logger || createLogger('ContextAwareModelSelector');
  }

  /**
   * Select model with context awareness
   */
  async selectModelForContext(
    role: string,
    repositoryContext?: RepositoryContext
  ): Promise<UnifiedModelSelection> {
    try {
      // Determine language and size from context
      const language = this.normalizeLanguage(repositoryContext?.primaryLanguage || 'javascript');
      const size = this.normalizeSize(repositoryContext?.size || 'medium');
      
      // Try to get context-specific configuration
      const contextConfig = await this.getContextConfiguration(role, language, size);
      
      if (contextConfig) {
        this.logger.info(`Using context-specific configuration for ${role}/${language}/${size}`, {
          primary: `${contextConfig.primary.provider}/${contextConfig.primary.model}`,
          fallback: `${contextConfig.fallback.provider}/${contextConfig.fallback.model}`
        });
        
        return {
          primary: contextConfig.primary,
          fallback: contextConfig.fallback,
          reasoning: [
            `Selected using context-specific configuration for ${role}/${language}/${size}`,
            ...contextConfig.reasoning
          ],
          scores: {
            primary: {
              id: `${contextConfig.primary.provider}/${contextConfig.primary.model}`,
              provider: contextConfig.primary.provider,
              model: contextConfig.primary.model,
              inputCost: 5.0, // Default values for researcher-selected models
              outputCost: 15.0,
              avgCost: 10.0,
              contextWindow: 128000,
              quality: 0.9, // High confidence in researcher-selected models
              speed: 0.8,
              cost: 0.85,
              priceScore: 0.85,
              compositeScore: 0.88
            },
            fallback: {
              id: `${contextConfig.fallback.provider}/${contextConfig.fallback.model}`,
              provider: contextConfig.fallback.provider,
              model: contextConfig.fallback.model,
              inputCost: 10.0,
              outputCost: 30.0,
              avgCost: 20.0,
              contextWindow: 128000,
              quality: 0.85,
              speed: 0.75,
              cost: 0.8,
              priceScore: 0.8,
              compositeScore: 0.8
            }
          }
        };
      }
      
      // Fall back to base unified selector if no context config found
      this.logger.warn(`No context-specific configuration found for ${role}/${language}/${size}, using default selection`);
      return super.selectModel(role as any, repositoryContext);
      
    } catch (error) {
      this.logger.error('Error in context-aware model selection', { error, role });
      // Fall back to base selector on any error
      return super.selectModel(role as any, repositoryContext);
    }
  }

  /**
   * Get context-specific configuration from Vector DB
   */
  private async getContextConfiguration(
    role: string,
    language: string,
    size: string
  ): Promise<StoredConfiguration | null> {
    const contextKey = `${role}_${language}_${size}`;
    
    // Check cache first
    if (this.configurationCache.has(contextKey) && 
        Date.now() - this.lastCacheRefresh < this.CACHE_TTL) {
      return this.configurationCache.get(contextKey)!;
    }
    
    try {
      // TODO: Fix Vector DB search - method signature mismatch
      // Query Vector DB for configuration
      const query = `model configuration for ${role} ${language} ${size}`;
      const results: any[] = []; // Temporarily disabled due to method signature issue
      /* const results = await this.vectorStorage.searchSimilar(
        this.RESEARCHER_CONFIG_REPO_ID,
        query,
        {
          limit: 10,
          filters: {
            'metadata.type': 'model_configuration_v2',
            'metadata.contextKey': contextKey
          }
        }
      ); */
      
      if (results && results.length > 0) {
        // Find exact match
        const exactMatch = results.find(r => 
          r.metadata?.contextKey === contextKey
        );
        
        if (exactMatch) {
          const config = JSON.parse(exactMatch.content) as StoredConfiguration;
          
          // Validate configuration has required fields
          if (config.primary && config.fallback) {
            // Cache the configuration
            this.configurationCache.set(contextKey, config);
            this.lastCacheRefresh = Date.now();
            
            return config;
          }
        }
      }
      
      // TODO: Fix alternative search
      // Try alternative search without exact context key
      const alternativeResults: any[] = []; // Temporarily disabled
      /* const alternativeResults = await this.vectorStorage.searchSimilar(
        this.RESEARCHER_CONFIG_REPO_ID,
        query,
        {
          limit: 5,
          filters: {
            'metadata.type': 'model_configuration_v2',
            'metadata.role': role
          }
        }
      );
      
      // Find best match based on metadata
      const bestMatch = alternativeResults?.find(r => 
        r.metadata?.role === role &&
        r.metadata?.language === language
      );
      
      if (bestMatch) {
        const config = JSON.parse(bestMatch.content) as StoredConfiguration;
        if (config.primary && config.fallback) {
          this.logger.info(`Using approximate match for ${contextKey}`, {
            foundKey: config.contextKey
          });
          return config;
        }
      } */
      
    } catch (error) {
      this.logger.error('Failed to retrieve context configuration', { 
        error, 
        contextKey,
        role,
        language,
        size 
      });
    }
    
    return null;
  }

  /**
   * Refresh configuration cache
   */
  async refreshConfigurations(): Promise<void> {
    this.logger.info('Refreshing context-aware configurations...');
    
    try {
      // Clear existing cache
      this.configurationCache.clear();
      
      // TODO: Fix load all configurations from Vector DB
      const allConfigs: any[] = []; // Temporarily disabled
      /* const allConfigs = await this.vectorStorage.searchSimilar(
        this.RESEARCHER_CONFIG_REPO_ID,
        'model configuration',
        {
          limit: 500, // Get all configurations
          filters: {
            'metadata.type': 'model_configuration_v2'
          }
        }
      ); */
      
      if (allConfigs) {
        for (const result of allConfigs) {
          try {
            const config = JSON.parse(result.content) as StoredConfiguration;
            if (config.contextKey && config.primary && config.fallback) {
              this.configurationCache.set(config.contextKey, config);
            }
          } catch (parseError) {
            this.logger.warn('Failed to parse configuration', { parseError });
          }
        }
      }
      
      this.lastCacheRefresh = Date.now();
      this.logger.info(`Loaded ${this.configurationCache.size} configurations into cache`);
      
    } catch (error) {
      this.logger.error('Failed to refresh configurations', { error });
    }
  }

  /**
   * Normalize language name to match researcher configuration
   */
  private normalizeLanguage(language: string): string {
    const normalized = language.toLowerCase().trim();
    
    // Handle common aliases
    const aliases: Record<string, string> = {
      'js': 'javascript',
      'ts': 'typescript',
      'py': 'python',
      'rb': 'ruby',
      'cs': 'csharp',
      'c#': 'csharp',
      'golang': 'go'
    };
    
    const mapped = aliases[normalized] || normalized;
    
    // Return if it's a supported language
    if (SUPPORTED_LANGUAGES.includes(mapped as any)) {
      return mapped;
    }
    
    // Default to javascript for unknown languages
    this.logger.info(`Unknown language '${language}', defaulting to javascript`);
    return 'javascript';
  }

  /**
   * Normalize repository size
   */
  private normalizeSize(size: string): string {
    const normalized = size.toLowerCase().trim();
    
    // Map enterprise to extra_large
    if (normalized === 'enterprise') {
      return 'extra_large';
    }
    
    // Return if it's a supported size
    if (REPOSITORY_SIZES.includes(normalized as any)) {
      return normalized;
    }
    
    // Default to medium for unknown sizes
    this.logger.info(`Unknown size '${size}', defaulting to medium`);
    return 'medium';
  }

  /**
   * Get statistics about loaded configurations
   */
  getConfigurationStats(): {
    totalConfigurations: number;
    byRole: Record<string, number>;
    byLanguage: Record<string, number>;
    bySize: Record<string, number>;
    cacheAge: number;
  } {
    const stats = {
      totalConfigurations: this.configurationCache.size,
      byRole: {} as Record<string, number>,
      byLanguage: {} as Record<string, number>,
      bySize: {} as Record<string, number>,
      cacheAge: Date.now() - this.lastCacheRefresh
    };
    
    for (const [key, config] of this.configurationCache) {
      // Count by role
      stats.byRole[config.role] = (stats.byRole[config.role] || 0) + 1;
      
      // Count by language
      stats.byLanguage[config.language] = (stats.byLanguage[config.language] || 0) + 1;
      
      // Count by size
      stats.bySize[config.repositorySize] = (stats.bySize[config.repositorySize] || 0) + 1;
    }
    
    return stats;
  }
}

/**
 * Create context-aware model selector
 */
export function createContextAwareModelSelector(
  modelVersionSync: ModelVersionSync,
  vectorStorage: VectorStorageService,
  logger?: Logger
): ContextAwareModelSelector {
  return new ContextAwareModelSelector(modelVersionSync, vectorStorage, logger);
}