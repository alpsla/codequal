import { DeepWikiClient } from './DeepWikiClient';
import { RepositorySizeDetector } from './RepositorySizeDetector';
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
export declare function initializeDeepWikiWithEnvVars(options: {
    apiUrl: string;
    logger: Logger;
    supabaseUrl?: string;
    supabaseKey?: string;
    cacheConfig?: Record<string, unknown>;
}): {
    client: DeepWikiClient;
    sizeDetector: RepositorySizeDetector;
    cacheManager: any;
    analysisService: ThreeTierAnalysisService;
};
/**
 * Set environment variables for DeepWiki API keys
 *
 * This function provides a way to set API keys directly in the environment,
 * which can be useful when the .env file isn't being parsed correctly.
 *
 * @param apiKeys API keys for different providers
 */
export declare function setDeepWikiAPIKeys(apiKeys: {
    openai?: string;
    google?: string;
    anthropic?: string;
    openrouter?: string;
}): void;
