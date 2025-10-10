"use strict";
/**
 * Simple operation cache to avoid duplicate expensive operations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.gitOperationCache = exports.OperationCache = void 0;
const core_1 = require("@codequal/core");
class OperationCache {
    constructor(ttlMs = 5 * 60 * 1000) {
        this.cache = new Map();
        this.logger = core_1.logging.createLogger('OperationCache');
        this.ttl = ttlMs;
    }
    /**
     * Get cached result or execute operation
     */
    async getOrExecute(key, operation, forceRefresh = false) {
        if (!forceRefresh) {
            const cached = this.cache.get(key);
            if (cached && (Date.now() - cached.timestamp) < this.ttl) {
                this.logger.info(`Cache hit for ${key}`);
                return cached.result;
            }
        }
        this.logger.info(`Cache miss for ${key}, executing operation`);
        const result = await operation();
        this.cache.set(key, {
            result,
            timestamp: Date.now()
        });
        return result;
    }
    /**
     * Clear specific cache entry
     */
    invalidate(key) {
        this.cache.delete(key);
    }
    /**
     * Clear all cache entries
     */
    clear() {
        this.cache.clear();
    }
    /**
     * Get cache statistics
     */
    getStats() {
        const keys = Array.from(this.cache.keys());
        const memoryUsage = keys.reduce((total, key) => {
            const entry = this.cache.get(key);
            return total + JSON.stringify(entry).length;
        }, 0);
        return {
            size: this.cache.size,
            keys,
            memoryUsage
        };
    }
}
exports.OperationCache = OperationCache;
// Singleton instance for git operations
exports.gitOperationCache = new OperationCache(10 * 60 * 1000); // 10 minutes for git ops
//# sourceMappingURL=operation-cache.js.map