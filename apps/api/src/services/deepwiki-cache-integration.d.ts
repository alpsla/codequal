import { CacheService } from '@codequal/core/services/cache/RedisCacheService';
import { DeepWikiAnalysisResult } from '../types/deepwiki';
export interface CachedDeepWikiReport {
    id: string;
    repositoryUrl: string;
    branch: string;
    analysis: DeepWikiAnalysisResult;
    createdAt: string;
    expiresAt: string;
}
/**
 * Service to integrate DeepWiki with Redis cache
 * Handles storing and retrieving DeepWiki analysis reports
 */
export declare class DeepWikiCacheIntegration {
    private cache;
    private defaultTTL;
    constructor(cache: CacheService);
    /**
     * Generate cache key for a repository analysis
     */
    private getCacheKey;
    /**
     * Store DeepWiki analysis in cache
     */
    storeAnalysis(repositoryUrl: string, analysis: DeepWikiAnalysisResult, options?: {
        branch?: string;
        prId?: string;
        ttl?: number;
    }): Promise<void>;
    /**
     * Retrieve DeepWiki analysis from cache
     */
    getAnalysis(repositoryUrl: string, options?: {
        branch?: string;
        prId?: string;
    }): Promise<DeepWikiAnalysisResult | null>;
    /**
     * Check if analysis exists in cache
     */
    hasAnalysis(repositoryUrl: string, options?: {
        branch?: string;
        prId?: string;
    }): Promise<boolean>;
    /**
     * Delete analysis from cache
     */
    deleteAnalysis(repositoryUrl: string, options?: {
        branch?: string;
        prId?: string;
    }): Promise<void>;
    /**
     * Get both main and feature branch analyses for comparison
     */
    getAnalysesForComparison(repositoryUrl: string, mainBranch: string | undefined, featureBranch: string): Promise<{
        main: DeepWikiAnalysisResult | null;
        feature: DeepWikiAnalysisResult | null;
    }>;
    /**
     * Store both main and feature branch analyses
     */
    storeAnalysesForComparison(repositoryUrl: string, mainAnalysis: DeepWikiAnalysisResult, featureAnalysis: DeepWikiAnalysisResult, featureBranch: string, options?: {
        prId?: string;
        ttl?: number;
    }): Promise<void>;
    /**
     * Warm cache for active PRs
     */
    warmCacheForPR(repositoryUrl: string, prId: string, branches: {
        main: string;
        feature: string;
    }, analysisProvider: (branch: string) => Promise<DeepWikiAnalysisResult>): Promise<void>;
}
//# sourceMappingURL=deepwiki-cache-integration.d.ts.map