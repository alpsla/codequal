/**
 * DeepWiki Integration
 * 
 * This module exports all components for integrating with DeepWiki.
 * The DeepWiki integration provides repository analysis capabilities
 * with three analysis depths:
 * 
 * 1. Quick analysis: Fast, PR-only analysis
 * 2. Comprehensive analysis: Full repository + PR analysis
 * 3. Targeted analysis: Deep dives into specific architectural perspectives
 * 
 * @module @codequal/core/deepwiki
 */

// Client for interacting with DeepWiki API
export * from './DeepWikiClient';

// Three-tier analysis service
export * from './ThreeTierAnalysisService';

// Repository size detection utility
export * from './RepositorySizeDetector';

// Cache management utility
export * from './RepositoryCacheManager';

// Initialization helpers
export * from './initialization';

// Environment variable helpers
export * from './env-helpers';

// Export model configs update with test results
export * from './model-configs-update';

/**
 * Initialize the DeepWiki integration using the old syntax (deprecated)
 * 
 * @deprecated Use initializeDeepWikiIntegration from './initialization' instead
 * @param options Configuration options
 * @returns DeepWiki integration components
 */
export function initializeDeepWiki(options: {
  apiUrl: string;
  supabaseUrl?: string;
  supabaseKey?: string;
  logger: any;
  cacheConfig?: any;
}) {
  const {
    apiUrl,
    supabaseUrl,
    supabaseKey,
    logger,
    cacheConfig
  } = options;
  
  // Create client
  const client = new (require('./DeepWikiClient')).DeepWikiClient(apiUrl, logger);
  
  // Create size detector
  const sizeDetector = new (require('./RepositorySizeDetector')).RepositorySizeDetector(logger);
  
  // Create cache manager if Supabase config is provided
  let cacheManager = null;
  if (supabaseUrl && supabaseKey) {
    cacheManager = new (require('./RepositoryCacheManager')).RepositoryCacheManager(
      supabaseUrl, 
      supabaseKey, 
      logger, 
      cacheConfig
    );
  }
  
  // Create analysis service
  const analysisService = new (require('./ThreeTierAnalysisService')).ThreeTierAnalysisService(
    client, 
    logger
  );
  
  return {
    client,
    sizeDetector,
    cacheManager,
    analysisService
  };
}