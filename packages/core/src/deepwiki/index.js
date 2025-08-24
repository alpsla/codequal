"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelConfigManagerDefault = exports.ModelConfigManager = void 0;
exports.initializeDeepWiki = initializeDeepWiki;
// Client for interacting with DeepWiki API
__exportStar(require("./DeepWikiClient"), exports);
// Three-tier analysis service
__exportStar(require("./ThreeTierAnalysisService"), exports);
// Chat service for interactive repository exploration
__exportStar(require("./DeepWikiChatService"), exports);
// Repository size detection utility
__exportStar(require("./RepositorySizeDetector"), exports);
// Cache management utility
__exportStar(require("./RepositoryCacheManager"), exports);
// Initialization helpers
__exportStar(require("./initialization"), exports);
// Environment variable helpers
__exportStar(require("./env-helpers"), exports);
// Export specific items from model-configs-update to avoid naming conflicts
var model_configs_update_1 = require("./model-configs-update");
Object.defineProperty(exports, "ModelConfigManager", { enumerable: true, get: function () { return model_configs_update_1.ModelConfigManager; } });
Object.defineProperty(exports, "ModelConfigManagerDefault", { enumerable: true, get: function () { return model_configs_update_1.default; } });
/**
 * Initialize the DeepWiki integration using the old syntax (deprecated)
 *
 * @deprecated Use initializeDeepWikiIntegration from './initialization' instead
 * @param options Configuration options
 * @returns DeepWiki integration components
 */
async function initializeDeepWiki(options) {
    const { apiUrl, supabaseUrl, supabaseKey, logger, cacheConfig } = options;
    // Create client
    const { DeepWikiClient } = await Promise.resolve().then(() => require('./DeepWikiClient.js'));
    const client = new DeepWikiClient(apiUrl, logger);
    // Create size detector
    const { RepositorySizeDetector } = await Promise.resolve().then(() => require('./RepositorySizeDetector.js'));
    const sizeDetector = new RepositorySizeDetector(logger);
    // Create cache manager if Supabase config is provided
    let cacheManager = null;
    if (supabaseUrl && supabaseKey) {
        const { RepositoryCacheManager } = await Promise.resolve().then(() => require('./RepositoryCacheManager.js'));
        cacheManager = new RepositoryCacheManager(supabaseUrl, supabaseKey, logger, cacheConfig);
    }
    // Create analysis service
    const { ThreeTierAnalysisService } = await Promise.resolve().then(() => require('./ThreeTierAnalysisService.js'));
    const analysisService = new ThreeTierAnalysisService(client, logger);
    // Create chat service
    const { DeepWikiChatService } = await Promise.resolve().then(() => require('./DeepWikiChatService.js'));
    const chatService = new DeepWikiChatService(client, logger);
    return {
        client,
        sizeDetector,
        cacheManager,
        analysisService,
        chatService
    };
}
