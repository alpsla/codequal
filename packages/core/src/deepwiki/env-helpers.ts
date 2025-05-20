import { DeepWikiClient } from './DeepWikiClient';
import { RepositorySizeDetector } from './RepositorySizeDetector';
import { RepositoryCacheManager } from './RepositoryCacheManager';
import { ThreeTierAnalysisService } from './ThreeTierAnalysisService';
import { Logger } from '../utils/logger';

/**
 * Initialize the DeepWiki integration with environment variables
 * 
 * This function creates all necessary components for DeepWiki integration
 * and directly loads API keys from environment variables to avoid issues
 * with .env file parsing.
 * 
 * @returns DeepWiki integration components
 */
export function initializeDeepWikiWithEnvVars(options: {
  apiUrl: string;
  logger: Logger;
  supabaseUrl?: string;
  supabaseKey?: string;
  cacheConfig?: Record<string, unknown>;
}) {
  const {
    apiUrl,
    logger,
    supabaseUrl,
    supabaseKey,
    cacheConfig
  } = options;
  
  // Directly access environment variables
  const apiKeys = {
    openai: process.env.OPENAI_API_KEY,
    google: process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY,
    anthropic: process.env.ANTHROPIC_API_KEY,
    openrouter: process.env.OPENROUTER_API_KEY
  };
  
  // Log available API keys (safely)
  logger.info('Initializing DeepWiki with environment variables', {
    apiUrl,
    hasSupabase: !!(supabaseUrl && supabaseKey),
    availableProviders: Object.entries(apiKeys)
      .filter(([_, key]) => !!key)
      .map(([provider]) => provider)
  });
  
  // Create client with API keys
  const client = new DeepWikiClient(apiUrl, logger);
  
  // Create size detector
  const sizeDetector = new RepositorySizeDetector(logger);
  
  // Create cache manager if Supabase config is provided
  let cacheManager = null;
  if (supabaseUrl && supabaseKey) {
    cacheManager = new RepositoryCacheManager(
      supabaseUrl, 
      supabaseKey, 
      logger, 
      cacheConfig
    );
  }
  
  // Create analysis service
  const analysisService = new ThreeTierAnalysisService(
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

/**
 * Set environment variables for DeepWiki API keys
 * 
 * This function provides a way to set API keys directly in the environment,
 * which can be useful when the .env file isn't being parsed correctly.
 * 
 * @param apiKeys API keys for different providers
 */
export function setDeepWikiAPIKeys(apiKeys: {
  openai?: string;
  google?: string;
  anthropic?: string;
  openrouter?: string;
}) {
  if (apiKeys.openai) {
    process.env.OPENAI_API_KEY = apiKeys.openai;
  }
  
  if (apiKeys.google) {
    process.env.GOOGLE_API_KEY = apiKeys.google;
    process.env.GEMINI_API_KEY = apiKeys.google;
  }
  
  if (apiKeys.anthropic) {
    process.env.ANTHROPIC_API_KEY = apiKeys.anthropic;
  }
  
  if (apiKeys.openrouter) {
    process.env.OPENROUTER_API_KEY = apiKeys.openrouter;
  }
}
