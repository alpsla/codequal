import { Logger } from '../utils/logger';
import { RepositoryContext } from './DeepWikiClient';
import { AnalysisResult } from './ThreeTierAnalysisService';
interface ExtendedAnalysisResult extends AnalysisResult {
    primaryLanguage?: string;
}
export interface CacheData {
    analysis_id?: string;
    is_cache_valid?: boolean;
    latest_commit_hash?: string;
    latest_analysis_timestamp?: string;
    commits_since_analysis?: number;
    significant_changes_detected?: boolean;
    cache_expiry?: string;
    last_commit_hash?: string;
    expiry_date?: string;
    cached_at?: string;
    [key: string]: unknown;
}
/**
 * Cache status information
 */
export interface CacheStatus {
    /**
     * Is the cache valid?
     */
    isValid: boolean;
    /**
     * Latest commit hash for the analysis
     */
    latestCommitHash?: string;
    /**
     * Timestamp of the latest analysis
     */
    latestAnalysisTimestamp?: Date;
    /**
     * Number of commits since the analysis
     */
    commitsSinceAnalysis?: number;
    /**
     * Whether significant changes were detected
     */
    significantChangesDetected?: boolean;
    /**
     * When the cache expires
     */
    cacheExpiry?: Date;
}
/**
 * Cache invalidation options
 */
export interface CacheInvalidationOptions {
    /**
     * Maximum commits before invalidation
     */
    maxCommitsBeforeInvalidation?: number;
    /**
     * Maximum age in milliseconds before invalidation
     */
    maxAgeMs?: number;
    /**
     * Whether to automatically invalidate on significant changes
     */
    invalidateOnSignificantChanges?: boolean;
}
/**
 * Repository analysis cache manager
 */
export declare class RepositoryCacheManager {
    private supabase;
    private logger;
    private invalidationOptions;
    /**
     * Constructor
     * @param supabaseUrl Supabase URL
     * @param supabaseKey Supabase key
     * @param logger Logger instance
     * @param invalidationOptions Optional cache invalidation options
     */
    constructor(supabaseUrl: string, supabaseKey: string, logger: Logger, invalidationOptions?: CacheInvalidationOptions);
    /**
     * Check if a valid cached analysis exists for a repository
     * @param repository Repository context
     * @param branch Repository branch
     * @returns Cache status
     */
    checkCacheStatus(repository: RepositoryContext, branch: string): Promise<CacheStatus>;
    /**
     * Get cached repository analysis
     * @param repository Repository context
     * @param branch Repository branch
     * @returns Cached analysis or null if not found
     */
    getCachedAnalysis(repository: RepositoryContext, branch: string): Promise<ExtendedAnalysisResult | null>;
    /**
     * Store repository analysis in cache
     * @param repository Repository context
     * @param branch Repository branch
     * @param commitHash Commit hash for the analysis
     * @param result Analysis result
     * @param provider Provider used for the analysis
     * @param model Model used for the analysis
     * @returns Success status
     */
    storeAnalysis(repository: RepositoryContext, branch: string, commitHash: string, result: ExtendedAnalysisResult, provider: string, model: string): Promise<boolean>;
    /**
     * Invalidate repository cache
     * @param repository Repository context
     * @param branch Repository branch
     * @param reason Reason for invalidation
     * @returns Success status
     */
    invalidateCache(repository: RepositoryContext, branch: string, reason: string): Promise<boolean>;
    /**
     * Update commit count for a repository
     * @param repository Repository context
     * @param branch Repository branch
     * @param commitCount Number of new commits
     * @param significantChanges Whether significant changes were detected
     * @returns Updated cache status
     */
    updateCommitCount(repository: RepositoryContext, branch: string, commitCount: number, significantChanges: boolean): Promise<CacheStatus>;
    /**
     * Update cache hit metrics
     * @param repository Repository context
     * @param branch Repository branch
     */
    private updateCacheHitMetrics;
    /**
     * Check if cache should be invalidated
     * @param cacheData Cache data
     * @returns Whether cache should be invalidated and reason
     */
    private shouldInvalidateCache;
    /**
     * Build repository URL from context
     * @param repository Repository context
     * @returns Repository URL
     */
    private buildRepositoryUrl;
    /**
     * Update invalidation options
     * @param options New invalidation options
     */
    updateInvalidationOptions(options: CacheInvalidationOptions): void;
}
export {};
