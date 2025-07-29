/**
 * Simple operation cache to avoid duplicate expensive operations
 */

import { logging } from '@codequal/core';

export class OperationCache {
  private cache = new Map<string, { result: any; timestamp: number }>();
  private logger = logging.createLogger('OperationCache');
  private ttl: number;
  
  constructor(ttlMs: number = 5 * 60 * 1000) { // 5 minutes default
    this.ttl = ttlMs;
  }
  
  /**
   * Get cached result or execute operation
   */
  async getOrExecute<T>(
    key: string,
    operation: () => Promise<T>,
    forceRefresh = false
  ): Promise<T> {
    if (!forceRefresh) {
      const cached = this.cache.get(key);
      if (cached && (Date.now() - cached.timestamp) < this.ttl) {
        this.logger.info(`Cache hit for ${key}`);
        return cached.result as T;
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
  invalidate(key: string): void {
    this.cache.delete(key);
  }
  
  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }
  
  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    keys: string[];
    memoryUsage: number;
  } {
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

// Singleton instance for git operations
export const gitOperationCache = new OperationCache(10 * 60 * 1000); // 10 minutes for git ops