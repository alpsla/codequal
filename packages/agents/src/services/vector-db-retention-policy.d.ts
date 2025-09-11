/**
 * Vector DB Retention Policy Service
 * Manages data lifecycle and prevents exponential growth
 */
export interface RetentionPolicyConfig {
    toolResults: {
        maxAgeInDays: number;
        maxRecordsPerRepo: number;
        keepCriticalFindings: boolean;
        aggregateBeforeDelete: boolean;
    };
    analysisResults: {
        maxAgeInDays: number;
        maxAnalysesPerRepo: number;
        keepFailedAnalyses: boolean;
    };
    embeddings: {
        compactionEnabled: boolean;
        similarityThreshold: number;
        maxEmbeddingsPerCategory: number;
    };
    storage: {
        maxTotalRecords: number;
        warningThreshold: number;
        criticalThreshold: number;
    };
}
export interface RetentionStats {
    totalRecords: number;
    recordsByAge: Record<string, number>;
    recordsByType: Record<string, number>;
    storageUsagePercent: number;
    lastCleanup: Date;
    nextScheduledCleanup: Date;
}
export declare class VectorDBRetentionPolicy {
    private readonly supabase;
    private readonly config;
    private readonly logger;
    private cronJob?;
    private isRunning;
    private readonly defaultConfig;
    constructor(supabase: any, config?: Partial<RetentionPolicyConfig>);
    /**
     * Start the retention policy cron job
     */
    startRetentionPolicy(schedule?: string): void;
    /**
     * Stop the retention policy
     */
    stopRetentionPolicy(): void;
    /**
     * Execute retention policy
     */
    executeRetentionPolicy(): Promise<void>;
    /**
     * Clean up old tool results
     */
    private cleanupOldToolResults;
    /**
     * Clean up old analysis results
     */
    private cleanupOldAnalysisResults;
    /**
     * Compact similar embeddings to save space
     */
    private compactEmbeddings;
    /**
     * Enforce per-repository limits
     */
    private enforcePerRepositoryLimits;
    /**
     * Create aggregated summaries before deletion
     */
    private createAggregatedSummaries;
    /**
     * Create aggregated content from records
     */
    private createAggregatedContent;
    /**
     * Get retention statistics
     */
    getRetentionStats(): Promise<RetentionStats>;
    /**
     * Manually trigger cleanup if needed
     */
    triggerEmergencyCleanup(): Promise<void>;
}
/**
 * Get or create retention policy instance
 */
export declare function getVectorDBRetentionPolicy(supabase: any, config?: Partial<RetentionPolicyConfig>): VectorDBRetentionPolicy;
