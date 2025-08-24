"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeDeepWikiWithEnvVars = initializeDeepWikiWithEnvVars;
exports.setDeepWikiAPIKeys = setDeepWikiAPIKeys;
const DeepWikiClient_1 = require("./DeepWikiClient");
const RepositorySizeDetector_1 = require("./RepositorySizeDetector");
const RepositoryCacheManager_1 = require("./RepositoryCacheManager");
const ThreeTierAnalysisService_1 = require("./ThreeTierAnalysisService");
/**
 * Initialize the DeepWiki integration with environment variables
 *
 * This function creates all necessary components for DeepWiki integration
 * and directly loads API keys from environment variables to avoid issues
 * with .env file parsing.
 *
 * @returns DeepWiki integration components
 */
function initializeDeepWikiWithEnvVars(options) {
    const { apiUrl, logger, supabaseUrl, supabaseKey, cacheConfig } = options;
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
    const client = new DeepWikiClient_1.DeepWikiClient(apiUrl, logger);
    // Create size detector
    const sizeDetector = new RepositorySizeDetector_1.RepositorySizeDetector(logger);
    // Create cache manager if Supabase config is provided
    let cacheManager = null;
    if (supabaseUrl && supabaseKey) {
        cacheManager = new RepositoryCacheManager_1.RepositoryCacheManager(supabaseUrl, supabaseKey, logger, cacheConfig);
    }
    // Create analysis service
    const analysisService = new ThreeTierAnalysisService_1.ThreeTierAnalysisService(client, logger);
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
function setDeepWikiAPIKeys(apiKeys) {
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
