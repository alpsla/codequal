/**
 * DeepWiki Integration
 * 
 * This module exports all components for integrating with DeepWiki.
 * The DeepWiki integration provides repository analysis capabilities
 * with three analysis depths and a chat interface for repository exploration:
 * 
 * 1. Quick analysis: Fast, PR-only analysis
 * 2. Comprehensive analysis: Full repository + PR analysis
 * 3. Targeted analysis: Deep dives into specific architectural perspectives
 * 4. Chat interface: Interactive exploration of repository knowledge
 * 
 * @module @codequal/core/deepwiki
 */

// Client for interacting with DeepWiki API
export * from './DeepWikiClient.js';

// Three-tier analysis service
export * from './ThreeTierAnalysisService.js';

// Chat service for interactive repository exploration
export * from './DeepWikiChatService.js';

// Repository size detection utility
export * from './RepositorySizeDetector.js';

// Cache management utility
export * from './RepositoryCacheManager.js';

// Initialization helpers
export * from './initialization.js';

// Environment variable helpers
export * from './env-helpers.js';

// Export specific items from model-configs-update to avoid naming conflicts
export { 
  ModelConfigManager,
  default as ModelConfigManagerDefault
} from './model-configs-update.js';

/**
 * Initialize the DeepWiki integration using the old syntax (deprecated)
 * 
 * @deprecated Use initializeDeepWikiIntegration from './initialization' instead
 * @param options Configuration options
 * @returns DeepWiki integration components
 */
export async function initializeDeepWiki(options: {
  apiUrl: string;
  supabaseUrl?: string;
  supabaseKey?: string;
  logger: Record<string, unknown>;
  cacheConfig?: Record<string, unknown>;
}) {
  const {
    apiUrl,
    supabaseUrl,
    supabaseKey,
    logger,
    cacheConfig
  } = options;
  
  // Create client
  const { DeepWikiClient } = await import('./DeepWikiClient.js');
  const client = new DeepWikiClient(apiUrl, logger);
  
  // Create size detector
  const { RepositorySizeDetector } = await import('./RepositorySizeDetector.js');
  const sizeDetector = new RepositorySizeDetector(logger);
  
  // Create cache manager if Supabase config is provided
  let cacheManager = null;
  if (supabaseUrl && supabaseKey) {
    const { RepositoryCacheManager } = await import('./RepositoryCacheManager.js');
    cacheManager = new RepositoryCacheManager(
      supabaseUrl, 
      supabaseKey, 
      logger, 
      cacheConfig
    );
  }
  
  // Create analysis service
  const { ThreeTierAnalysisService } = await import('./ThreeTierAnalysisService.js');
  const analysisService = new ThreeTierAnalysisService(
    client, 
    logger
  );
  
  // Create chat service
  const { DeepWikiChatService } = await import('./DeepWikiChatService.js');
  const chatService = new DeepWikiChatService(
    client,
    logger
  );
  
  return {
    client,
    sizeDetector,
    cacheManager,
    analysisService,
    chatService
  };
}