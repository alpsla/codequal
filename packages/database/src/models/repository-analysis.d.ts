/**
 * Repository analyzer type
 */
export declare enum RepositoryAnalyzer {
    DEEPWIKI = "deepwiki",
    STATIC_ANALYZER = "static_analyzer"
}
/**
 * Interface for repository analysis
 */
export interface RepositoryAnalysis {
    id: string;
    repositoryId: string;
    analyzer: RepositoryAnalyzer;
    analysisData: Record<string, any>;
    metadata?: Record<string, any>;
    cachedUntil: Date;
    executionTimeMs?: number;
    tokenCount?: number;
    createdAt: Date;
    updatedAt: Date;
}
/**
 * Repository analysis model for database operations
 */
export declare class RepositoryAnalysisModel {
    /**
     * Get latest repository analysis by repository ID and analyzer
     * @param repositoryId Repository ID
     * @param analyzer Repository analyzer
     * @returns Repository analysis or null if not found
     */
    static getLatest(repositoryId: string, analyzer: RepositoryAnalyzer): Promise<RepositoryAnalysis | null>;
    /**
     * Get valid cached repository analysis by repository ID and analyzer
     * @param repositoryId Repository ID
     * @param analyzer Repository analyzer
     * @returns Repository analysis or null if no valid cache exists
     */
    static getValidCache(repositoryId: string, analyzer: RepositoryAnalyzer): Promise<RepositoryAnalysis | null>;
    /**
     * Store repository analysis
     * @param repositoryId Repository ID
     * @param analyzer Repository analyzer
     * @param analysisData Analysis data
     * @param cacheTTL Cache time-to-live in seconds (default: 24 hours)
     * @param metadata Metadata (optional)
     * @param executionTimeMs Execution time in milliseconds (optional)
     * @param tokenCount Token count (optional)
     * @returns Created repository analysis
     */
    static store(repositoryId: string, analyzer: RepositoryAnalyzer, analysisData: Record<string, any>, cacheTTL?: number, // 24 hours in seconds
    metadata?: Record<string, any>, executionTimeMs?: number, tokenCount?: number): Promise<RepositoryAnalysis>;
    /**
     * Invalidate cache for repository analysis
     * @param repositoryId Repository ID
     * @param analyzer Repository analyzer (optional)
     */
    static invalidateCache(repositoryId: string, analyzer?: RepositoryAnalyzer): Promise<void>;
    /**
     * Map database record to repository analysis
     * @param data Database record
     * @returns Repository analysis
     */
    private static mapToRepositoryAnalysis;
}
//# sourceMappingURL=repository-analysis.d.ts.map