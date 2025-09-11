/**
 * Smart Cache Manager
 * 
 * Intelligent cache lifecycle management:
 * - Clear after successful delivery
 * - Selective invalidation
 * - TTL-based expiration
 * - Prevents stale data issues
 */

import Redis from 'ioredis';
import crypto from 'crypto';

export interface CacheStrategy {
  clearAfterDelivery: boolean;      // Clear immediately after report delivery
  ttl: number;                      // Time to live in seconds
  invalidateOnError: boolean;       // Clear if analysis fails
  keepSuccessfulOnly: boolean;      // Only cache successful analyses
  maxCacheSize?: number;            // Max items in memory cache
}

export interface CacheMetadata {
  key: string;
  createdAt: Date;
  expiresAt: Date;
  repoUrl: string;
  branch: string;
  analysisId?: string;
  delivered: boolean;
  success: boolean;
}

export class SmartCacheManager {
  private redis?: Redis;
  private memoryCache: Map<string, any> = new Map();
  private metadata: Map<string, CacheMetadata> = new Map();
  private strategy: CacheStrategy;
  private deliveryCallbacks: Map<string, () => void> = new Map();
  
  constructor(redis?: Redis, strategy?: Partial<CacheStrategy>) {
    this.redis = redis;
    this.strategy = {
      clearAfterDelivery: true,      // Default: clear after delivery
      ttl: 300,                      // Default: 5 minutes
      invalidateOnError: true,       // Default: clear bad data
      keepSuccessfulOnly: true,      // Default: only cache good data
      maxCacheSize: 100,            // Default: max 100 items
      ...strategy
    };
    
    // Start cleanup interval
    this.startCleanupInterval();
  }
  
  /**
   * Generate cache key for analysis
   */
  generateKey(repoUrl: string, branch: string, prefix = 'analysis'): string {
    const data = `${prefix}:${repoUrl}:${branch}:${Date.now()}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }
  
  /**
   * Set cache with metadata tracking
   */
  async set(
    key: string,
    value: any,
    options: {
      repoUrl: string;
      branch: string;
      analysisId?: string;
      ttl?: number;
    }
  ): Promise<void> {
    const ttl = options.ttl || this.strategy.ttl;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttl * 1000);
    
    // Store metadata
    const metadata: CacheMetadata = {
      key,
      createdAt: now,
      expiresAt,
      repoUrl: options.repoUrl,
      branch: options.branch,
      analysisId: options.analysisId,
      delivered: false,
      success: true
    };
    
    this.metadata.set(key, metadata);
    
    // Store in memory cache
    this.memoryCache.set(key, value);
    
    // Store in Redis if available
    if (this.redis) {
      try {
        await this.redis.setex(`cache:${key}`, ttl, JSON.stringify(value));
        await this.redis.setex(`meta:${key}`, ttl, JSON.stringify(metadata));
      } catch (error) {
        console.log('⚠️ Redis cache write failed, using memory only');
      }
    }
    
    // Enforce max cache size
    this.enforceMaxCacheSize();
    
    // Set up auto-clear after TTL
    setTimeout(() => this.invalidate(key), ttl * 1000);
  }
  
  /**
   * Get from cache
   */
  async get(key: string): Promise<any | null> {
    const metadata = this.metadata.get(key);
    
    // Check if expired
    if (metadata && new Date() > metadata.expiresAt) {
      await this.invalidate(key);
      return null;
    }
    
    // Try memory first
    if (this.memoryCache.has(key)) {
      return this.memoryCache.get(key);
    }
    
    // Try Redis
    if (this.redis) {
      try {
        const cached = await this.redis.get(`cache:${key}`);
        if (cached) {
          const value = JSON.parse(cached);
          this.memoryCache.set(key, value); // Restore to memory
          return value;
        }
      } catch {
        // Redis failed, return null
      }
    }
    
    return null;
  }
  
  /**
   * Mark analysis as delivered and optionally clear
   */
  async markDelivered(key: string): Promise<void> {
    const metadata = this.metadata.get(key);
    if (!metadata) return;
    
    metadata.delivered = true;
    console.log(`✅ Analysis ${key} marked as delivered`);
    
    // Clear if strategy says so
    if (this.strategy.clearAfterDelivery) {
      console.log(`🗑️ Clearing cache after delivery (strategy: clearAfterDelivery)`);
      await this.invalidate(key);
    } else {
      // Update metadata in Redis
      if (this.redis) {
        try {
          await this.redis.set(`meta:${key}`, JSON.stringify(metadata));
        } catch {}
      }
    }
    
    // Execute any delivery callbacks
    const callback = this.deliveryCallbacks.get(key);
    if (callback) {
      callback();
      this.deliveryCallbacks.delete(key);
    }
  }
  
  /**
   * Mark analysis as failed and optionally clear
   */
  async markFailed(key: string, error?: string): Promise<void> {
    const metadata = this.metadata.get(key);
    if (!metadata) return;
    
    metadata.success = false;
    console.log(`❌ Analysis ${key} marked as failed: ${error}`);
    
    // Clear if strategy says so
    if (this.strategy.invalidateOnError) {
      console.log(`🗑️ Clearing cache after error (strategy: invalidateOnError)`);
      await this.invalidate(key);
    }
  }
  
  /**
   * Invalidate specific cache entry
   */
  async invalidate(key: string): Promise<void> {
    // Remove from memory
    this.memoryCache.delete(key);
    this.metadata.delete(key);
    this.deliveryCallbacks.delete(key);
    
    // Remove from Redis
    if (this.redis) {
      try {
        await this.redis.del(`cache:${key}`, `meta:${key}`);
      } catch {}
    }
    
    console.log(`🗑️ Cache invalidated: ${key}`);
  }
  
  /**
   * Clear all cache for a repository
   */
  async clearRepository(repoUrl: string, branch?: string): Promise<void> {
    const keysToDelete: string[] = [];
    
    for (const [key, metadata] of this.metadata) {
      if (metadata.repoUrl === repoUrl) {
        if (!branch || metadata.branch === branch) {
          keysToDelete.push(key);
        }
      }
    }
    
    console.log(`🗑️ Clearing ${keysToDelete.length} cache entries for ${repoUrl}${branch ? `:${branch}` : ''}`);
    
    for (const key of keysToDelete) {
      await this.invalidate(key);
    }
  }
  
  /**
   * Clear all stale cache entries
   */
  async clearStale(): Promise<void> {
    const now = new Date();
    const staleKeys: string[] = [];
    
    for (const [key, metadata] of this.metadata) {
      if (now > metadata.expiresAt) {
        staleKeys.push(key);
      }
    }
    
    if (staleKeys.length > 0) {
      console.log(`🗑️ Clearing ${staleKeys.length} stale cache entries`);
      for (const key of staleKeys) {
        await this.invalidate(key);
      }
    }
  }
  
  /**
   * Clear all delivered analyses
   */
  async clearDelivered(): Promise<void> {
    const deliveredKeys: string[] = [];
    
    for (const [key, metadata] of this.metadata) {
      if (metadata.delivered) {
        deliveredKeys.push(key);
      }
    }
    
    if (deliveredKeys.length > 0) {
      console.log(`🗑️ Clearing ${deliveredKeys.length} delivered cache entries`);
      for (const key of deliveredKeys) {
        await this.invalidate(key);
      }
    }
  }
  
  /**
   * Register callback for when analysis is delivered
   */
  onDelivery(key: string, callback: () => void): void {
    this.deliveryCallbacks.set(key, callback);
  }
  
  /**
   * Get cache statistics
   */
  getStats(): {
    totalEntries: number;
    deliveredEntries: number;
    failedEntries: number;
    memorySize: number;
    oldestEntry?: Date;
    newestEntry?: Date;
  } {
    let oldest: Date | undefined;
    let newest: Date | undefined;
    let delivered = 0;
    let failed = 0;
    
    for (const metadata of this.metadata.values()) {
      if (!oldest || metadata.createdAt < oldest) oldest = metadata.createdAt;
      if (!newest || metadata.createdAt > newest) newest = metadata.createdAt;
      if (metadata.delivered) delivered++;
      if (!metadata.success) failed++;
    }
    
    return {
      totalEntries: this.metadata.size,
      deliveredEntries: delivered,
      failedEntries: failed,
      memorySize: this.memoryCache.size,
      oldestEntry: oldest,
      newestEntry: newest
    };
  }
  
  /**
   * Enforce maximum cache size
   */
  private enforceMaxCacheSize(): void {
    if (!this.strategy.maxCacheSize) return;
    
    if (this.memoryCache.size > this.strategy.maxCacheSize) {
      // Remove oldest entries first
      const sortedKeys = Array.from(this.metadata.entries())
        .sort((a, b) => a[1].createdAt.getTime() - b[1].createdAt.getTime())
        .map(([key]) => key);
      
      const toRemove = this.memoryCache.size - this.strategy.maxCacheSize;
      for (let i = 0; i < toRemove; i++) {
        if (sortedKeys[i]) {
          this.invalidate(sortedKeys[i]);
        }
      }
    }
  }
  
  /**
   * Start periodic cleanup
   */
  private startCleanupInterval(): void {
    setInterval(async () => {
      await this.clearStale();
      
      // Also clear delivered if strategy says so
      if (this.strategy.clearAfterDelivery) {
        await this.clearDelivered();
      }
    }, 60000); // Run every minute
  }
  
  /**
   * Clear all cache
   */
  async clearAll(): Promise<void> {
    const count = this.metadata.size;
    
    // Clear memory
    this.memoryCache.clear();
    this.metadata.clear();
    this.deliveryCallbacks.clear();
    
    // Clear Redis
    if (this.redis) {
      try {
        const keys = await this.redis.keys('cache:*');
        const metaKeys = await this.redis.keys('meta:*');
        if (keys.length > 0 || metaKeys.length > 0) {
          await this.redis.del(...keys, ...metaKeys);
        }
      } catch {}
    }
    
    console.log(`🗑️ Cleared all cache (${count} entries)`);
  }
}

export default SmartCacheManager;