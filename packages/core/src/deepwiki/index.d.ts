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
export * from './DeepWikiClient';
export * from './ThreeTierAnalysisService';
export * from './DeepWikiChatService';
export * from './RepositorySizeDetector';
export * from './RepositoryCacheManager';
export * from './initialization';
export * from './env-helpers';
import { Logger } from '../utils/logger';
export { ModelConfigManager, default as ModelConfigManagerDefault } from './model-configs-update';
/**
 * Initialize the DeepWiki integration using the old syntax (deprecated)
 *
 * @deprecated Use initializeDeepWikiIntegration from './initialization' instead
 * @param options Configuration options
 * @returns DeepWiki integration components
 */
export declare function initializeDeepWiki(options: {
    apiUrl: string;
    supabaseUrl?: string;
    supabaseKey?: string;
    logger: Logger;
    cacheConfig?: Record<string, unknown>;
}): Promise<{
    client: import("./DeepWikiClient").DeepWikiClient;
    sizeDetector: import("./RepositorySizeDetector").RepositorySizeDetector;
    cacheManager: any;
    analysisService: import("./ThreeTierAnalysisService").ThreeTierAnalysisService;
    chatService: import("./DeepWikiChatService").DeepWikiChatService;
}>;
