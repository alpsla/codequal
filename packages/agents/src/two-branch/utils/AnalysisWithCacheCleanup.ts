/**
 * Analysis wrapper with automatic cache cleanup
 * Ensures cache is cleared after each analysis run
 */

import { getCacheManager, CacheManager } from '../cache/CacheManager';
import { CloudExecutionWrapper } from './CloudExecutionWrapper';

export interface AnalysisOptions {
  clearCache?: boolean;
  cacheCleanupDelay?: number; // milliseconds to wait before cleanup
  preserveRepoCache?: boolean; // Keep repository clone cache
}

export class AnalysisWithCacheCleanup {
  private cacheManager: CacheManager;
  private cloudExecutor?: CloudExecutionWrapper;
  
  constructor(
    private options: AnalysisOptions = {}
  ) {
    this.cacheManager = getCacheManager({
      enableAutoCleanup: true,
      cleanupInterval: 3600000 // 1 hour
    });
    
    if (process.env.CLOUD_EXECUTION === 'true') {
      this.cloudExecutor = new CloudExecutionWrapper({
        enabled: true,
        namespace: process.env.CLOUD_NAMESPACE || 'codequal-dev',
        podName: process.env.CLOUD_POD_NAME || 'analysis-minimal'
      });
    }
  }
  
  /**
   * Wrap analysis function with automatic cache cleanup
   */
  async runWithCleanup<T>(
    analysisFunc: () => Promise<T>,
    analysisId: string
  ): Promise<T> {
    console.log(`[Cache] Starting analysis: ${analysisId}`);
    const startTime = Date.now();
    
    try {
      // Run the actual analysis
      const result = await analysisFunc();
      
      // Log cache statistics before cleanup
      const stats = this.cacheManager.getStatistics();
      console.log('[Cache] Pre-cleanup statistics:', {
        hitRate: `${stats.hitRate.toFixed(2)}%`,
        totalHits: stats.totalHits,
        totalMisses: stats.totalMisses
      });
      
      // Perform cache cleanup if enabled
      if (this.options.clearCache !== false) {
        await this.performCacheCleanup();
      }
      
      console.log(`[Cache] Analysis completed in ${Date.now() - startTime}ms`);
      return result;
      
    } catch (error) {
      console.error('[Cache] Analysis failed:', error);
      
      // Still try to clean up on failure
      if (this.options.clearCache !== false) {
        try {
          await this.performCacheCleanup();
        } catch (cleanupError) {
          console.error('[Cache] Cleanup failed after error:', cleanupError);
        }
      }
      
      throw error;
    }
  }
  
  /**
   * Perform cache cleanup
   */
  private async performCacheCleanup(): Promise<void> {
    const delay = this.options.cacheCleanupDelay || 5000; // Default 5 seconds
    
    console.log(`[Cache] Scheduling cleanup in ${delay}ms...`);
    
    await new Promise(resolve => setTimeout(resolve, delay));
    
    console.log('[Cache] Starting cache cleanup...');
    
    // Clear Redis cache
    if (this.cacheManager.isRedisConnected()) {
      await this.cacheManager.clearAll();
      console.log('[Cache] ✅ Redis cache cleared');
    } else {
      console.log('[Cache] ⚠️ Redis not connected, skipping Redis cleanup');
    }
    
    // Clear cloud pod cache if applicable
    if (this.cloudExecutor && !this.options.preserveRepoCache) {
      await this.clearCloudPodCache();
    } else if (this.options.preserveRepoCache) {
      console.log('[Cache] 📦 Preserving repository cache for next run');
    }
    
    // Reset statistics
    this.cacheManager.resetStatistics();
    console.log('[Cache] ✅ Cache cleanup complete');
  }
  
  /**
   * Clear cache on cloud pod
   */
  private async clearCloudPodCache(): Promise<void> {
    if (!this.cloudExecutor) return;
    
    try {
      console.log('[Cache] Clearing cloud pod cache...');
      
      // Clear analysis indices but preserve repository clones
      const commands = [
        // Clear indices
        'find /analysis/cache -name ".file-index" -delete',
        'find /analysis/cache -name ".unsafe-index" -delete',
        'find /analysis/cache -name ".unwrap-index" -delete',
        'find /analysis/cache -name ".cache-metadata.json" -delete',
        
        // Clear temporary files
        'find /analysis/cache -name "*.tmp" -delete',
        'find /analysis/cache -name "*.log" -delete',
        
        // Report remaining cache size
        'du -sh /analysis/cache/* 2>/dev/null | head -5'
      ];
      
      for (const cmd of commands) {
        try {
          const result = await this.cloudExecutor.execute(cmd, { timeout: 10000 });
          if (cmd.includes('du -sh')) {
            console.log('[Cache] Remaining cache:', result.trim());
          }
        } catch (error) {
          console.warn(`[Cache] Command failed: ${cmd}`, error);
        }
      }
      
      console.log('[Cache] ✅ Cloud pod cache cleaned');
      
    } catch (error) {
      console.error('[Cache] Failed to clear cloud pod cache:', error);
    }
  }
  
  /**
   * Get cache statistics
   */
  getStatistics() {
    return this.cacheManager.getStatistics();
  }
  
  /**
   * Shutdown and cleanup
   */
  async shutdown(): Promise<void> {
    await this.cacheManager.shutdown();
  }
}

/**
 * Factory function for creating analysis wrapper
 */
export function createAnalysisWithCleanup(options?: AnalysisOptions): AnalysisWithCacheCleanup {
  return new AnalysisWithCacheCleanup(options);
}

/**
 * Decorator for adding cache cleanup to analysis functions
 */
export function withCacheCleanup(options: AnalysisOptions = {}) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const wrapper = createAnalysisWithCleanup(options);
      
      try {
        return await wrapper.runWithCleanup(
          () => originalMethod.apply(this, args),
          `${target.constructor.name}.${propertyKey}`
        );
      } finally {
        await wrapper.shutdown();
      }
    };
    
    return descriptor;
  };
}