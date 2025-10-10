/**
 * Simple operation cache to avoid duplicate expensive operations
 */
export declare class OperationCache {
    private cache;
    private logger;
    private ttl;
    constructor(ttlMs?: number);
    /**
     * Get cached result or execute operation
     */
    getOrExecute<T>(key: string, operation: () => Promise<T>, forceRefresh?: boolean): Promise<T>;
    /**
     * Clear specific cache entry
     */
    invalidate(key: string): void;
    /**
     * Clear all cache entries
     */
    clear(): void;
    /**
     * Get cache statistics
     */
    getStats(): {
        size: number;
        keys: string[];
        memoryUsage: number;
    };
}
export declare const gitOperationCache: OperationCache;
//# sourceMappingURL=operation-cache.d.ts.map