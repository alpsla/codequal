"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeDeepWikiIntegration = initializeDeepWikiIntegration;
exports.loadApiKeysFromEnvironment = loadApiKeysFromEnvironment;
const _1 = require("./");
const RepositoryCacheManager_1 = require("./RepositoryCacheManager");
/**
 * Initialize the DeepWiki integration
 *
 * This helper function creates all the necessary components for the DeepWiki integration,
 * with proper configuration and error handling.
 *
 * @param options Initialization options
 * @returns DeepWiki integration components
 */
function initializeDeepWikiIntegration(options) {
    const { apiUrl, logger, modelSelector, supabaseUrl, supabaseKey, apiKeys, cacheConfig } = options;
    // Log initialization
    logger.info('Initializing DeepWiki integration', {
        apiUrl,
        hasModelSelector: !!modelSelector,
        hasSupabase: !!(supabaseUrl && supabaseKey),
        availableProviders: apiKeys ? Object.keys(apiKeys).filter(k => !!apiKeys[k]) : []
    });
    // Create DeepWiki client with optional model selector
    const client = new _1.DeepWikiClient(apiUrl, logger, modelSelector);
    // Create repository size detector
    const sizeDetector = new _1.RepositorySizeDetector(logger);
    // Create cache manager if Supabase config is provided
    let cacheManager;
    if (supabaseUrl && supabaseKey) {
        try {
            cacheManager = new RepositoryCacheManager_1.RepositoryCacheManager(supabaseUrl, supabaseKey, logger, cacheConfig);
            logger.info('Repository cache manager initialized', {
                supabaseUrl,
                cacheConfig
            });
        }
        catch (error) {
            logger.error('Failed to initialize repository cache manager', { error });
            // Continue without cache manager
        }
    }
    // Create analysis service
    const analysisService = new _1.ThreeTierAnalysisService(client, logger);
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
function loadApiKeysFromEnvironment() {
    return {
        openai: process.env.OPENAI_API_KEY,
        google: process.env.GOOGLE_API_KEY,
        anthropic: process.env.ANTHROPIC_API_KEY,
        openrouter: process.env.OPENROUTER_API_KEY
    };
}
