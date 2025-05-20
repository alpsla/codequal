import { DeepWikiClient, RepositorySizeDetector, ThreeTierAnalysisService } from './';
import { RepositoryCacheManager } from './RepositoryCacheManager';
import { Logger } from '../utils/logger';

/**
 * DeepWiki integration initialization options
 */
export interface DeepWikiIntegrationOptions {
  /**
   * DeepWiki API URL
   */
  apiUrl: string;
  
  /**
   * Logger instance
   */
  logger: Logger;
  
  /**
   * Supabase URL for cache storage (optional)
   */
  supabaseUrl?: string;
  
  /**
   * Supabase key for cache storage (optional)
   */
  supabaseKey?: string;
  
  /**
   * API keys for different providers (optional)
   */
  apiKeys?: {
    openai?: string;
    google?: string;
    anthropic?: string;
    openrouter?: string;
  };
  
  /**
   * Cache invalidation settings (optional)
   */
  cacheConfig?: {
    maxCommitsBeforeInvalidation?: number;
    maxAgeMs?: number;
    invalidateOnSignificantChanges?: boolean;
  };
}

/**
 * Initialize the DeepWiki integration
 * 
 * This helper function creates all the necessary components for the DeepWiki integration,
 * with proper configuration and error handling.
 * 
 * @param options Initialization options
 * @returns DeepWiki integration components
 */
export function initializeDeepWikiIntegration(options: DeepWikiIntegrationOptions) {
  const {
    apiUrl,
    logger,
    supabaseUrl,
    supabaseKey,
    apiKeys,
    cacheConfig
  } = options;
  
  // Log initialization
  logger.info('Initializing DeepWiki integration', {
    apiUrl,
    hasSupabase: !!(supabaseUrl && supabaseKey),
    availableProviders: apiKeys ? Object.keys(apiKeys).filter(k => !!apiKeys[k as keyof typeof apiKeys]) : []
  });
  
  // Create DeepWiki client
  const client = new DeepWikiClient(apiUrl, logger);
  
  // Create repository size detector
  const sizeDetector = new RepositorySizeDetector(logger);
  
  // Create cache manager if Supabase config is provided
  let cacheManager: RepositoryCacheManager | undefined;
  if (supabaseUrl && supabaseKey) {
    try {
      cacheManager = new RepositoryCacheManager(
        supabaseUrl,
        supabaseKey,
        logger,
        cacheConfig
      );
      logger.info('Repository cache manager initialized', { 
        supabaseUrl,
        cacheConfig
      });
    } catch (error) {
      logger.error('Failed to initialize repository cache manager', { error });
      // Continue without cache manager
    }
  }
  
  // Create analysis service
  const analysisService = new ThreeTierAnalysisService(client, logger);
  
  // Log successful initialization
  logger.info('DeepWiki integration initialized successfully');
  
  // Return all components
  return {
    client,
    sizeDetector,
    cacheManager,
    analysisService
  };
}

/**
 * Attempt to load API keys from environment variables
 * 
 * This helper function tries to load API keys from the following environment variables:
 * - OPENAI_API_KEY
 * - GOOGLE_API_KEY
 * - ANTHROPIC_API_KEY
 * - OPENROUTER_API_KEY
 * 
 * @returns Object with available API keys
 */
export function loadApiKeysFromEnvironment(): Record<string, string | undefined> {
  return {
    openai: process.env.OPENAI_API_KEY,
    google: process.env.GOOGLE_API_KEY,
    anthropic: process.env.ANTHROPIC_API_KEY,
    openrouter: process.env.OPENROUTER_API_KEY
  };
}