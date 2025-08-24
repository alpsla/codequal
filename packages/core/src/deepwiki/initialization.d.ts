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
     * Model selector for dynamic model selection (optional)
     * If provided, will use context-aware model selection from Vector DB
     */
    modelSelector?: any;
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
export declare function initializeDeepWikiIntegration(options: DeepWikiIntegrationOptions): {
    client: DeepWikiClient;
    sizeDetector: RepositorySizeDetector;
    cacheManager: RepositoryCacheManager;
    analysisService: ThreeTierAnalysisService;
};
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
export declare function loadApiKeysFromEnvironment(): Record<string, string | undefined>;
