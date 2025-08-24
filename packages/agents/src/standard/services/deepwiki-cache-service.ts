/**
 * DeepWiki Cache Service
 * 
 * Provides Redis-based caching for DeepWiki API responses to ensure
 * consistent results and improve performance.
 * 
 * Features:
 * - TTL-based cache expiration
 * - Automatic fallback to in-memory cache if Redis unavailable
 * - Cache key generation based on request parameters
 * - Metrics tracking for cache hits/misses
 * - Batch operations for efficiency
 */

import Redis from 'ioredis';
import { createHash } from 'crypto';

export interface CacheConfig {
  redisUrl?: string;
  ttl?: number; // Time to live in seconds
  keyPrefix?: string;
  enableMetrics?: boolean;
  maxMemoryCacheSize?: number;
  compressionThreshold?: number; // Compress if larger than this (bytes)
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  errors: number;
  avgHitTime: number;
  avgMissTime: number;
  memoryFallbacks: number;
  compressionSaves: number;
}

interface MemoryCacheEntry {
  data: any;
  timestamp: number;
  hits: number;
}

export class DeepWikiCacheService {
  private redis?: Redis;
  private memoryCache: Map<string, MemoryCacheEntry> = new Map();
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    errors: 0,
    avgHitTime: 0,
    avgMissTime: 0,
    memoryFallbacks: 0,
    compressionSaves: 0
  };
  
  private readonly config: Required<CacheConfig>;
  private isRedisAvailable = false;
  
  constructor(config: CacheConfig = {}) {
    this.config = {
      redisUrl: config.redisUrl || process.env.REDIS_URL || '',
      ttl: config.ttl ?? 3600, // 1 hour default
      keyPrefix: config.keyPrefix ?? 'deepwiki:',
      enableMetrics: config.enableMetrics ?? true,
      maxMemoryCacheSize: config.maxMemoryCacheSize ?? 100,
      compressionThreshold: config.compressionThreshold ?? 10240 // 10KB
    };
    
    this.initializeRedis();
  }
  
  private async initializeRedis(): Promise<void> {
    if (!this.config.redisUrl) {
      console.log('Redis URL not provided, using in-memory cache only');
      return;
    }
    
    try {
      this.redis = new Redis(this.config.redisUrl, {
        retryStrategy: (times) => {
          if (times > 3) {
            console.warn('Redis connection failed, falling back to memory cache');
            this.isRedisAvailable = false;
            return null;
          }
          return Math.min(times * 100, 3000);
        },
        maxRetriesPerRequest: 1,
        enableReadyCheck: true,
        lazyConnect: false
      });
      
      this.redis.on('connect', () => {
        this.isRedisAvailable = true;
        console.log('Connected to Redis for DeepWiki caching');
      });
      
      this.redis.on('error', (error) => {
        console.warn('Redis error, using memory cache:', error.message);
        this.isRedisAvailable = false;
        this.metrics.errors++;
      });
      
      // Test connection
      await this.redis.ping();
      this.isRedisAvailable = true;
    } catch (error) {
      console.warn('Failed to connect to Redis, using memory cache:', error);
      this.isRedisAvailable = false;
    }
  }
  
  /**
   * Generate cache key from DeepWiki request parameters
   */
  generateCacheKey(params: {
    repoUrl: string;
    branch?: string;
    prNumber?: number;
    issueTypes?: string[];
    context?: string;
  }): string {
    const normalized = {
      repo: params.repoUrl.toLowerCase().replace(/\.git$/, ''),
      branch: params.branch || 'main',
      pr: params.prNumber || 0,
      types: (params.issueTypes || []).sort().join(','),
      context: params.context || ''
    };
    
    const hash = createHash('md5')
      .update(JSON.stringify(normalized))
      .digest('hex');
    
    return `${this.config.keyPrefix}${hash}`;
  }
  
  /**
   * Get cached DeepWiki response
   */
  async get(key: string): Promise<any | null> {
    const startTime = Date.now();
    
    try {
      // Try Redis first
      if (this.isRedisAvailable && this.redis) {
        const cached = await this.redis.get(key);
        if (cached) {
          this.metrics.hits++;
          this.updateAvgTime('hit', Date.now() - startTime);
          
          try {
            return JSON.parse(cached);
          } catch {
            // Try decompressing if JSON parse fails
            return this.decompress(cached);
          }
        }
      }
      
      // Fallback to memory cache
      const memoryCached = this.memoryCache.get(key);
      if (memoryCached) {
        // Check if not expired (use same TTL)
        if (Date.now() - memoryCached.timestamp < this.config.ttl * 1000) {
          this.metrics.hits++;
          this.metrics.memoryFallbacks++;
          memoryCached.hits++;
          this.updateAvgTime('hit', Date.now() - startTime);
          return memoryCached.data;
        }
        // Remove expired entry
        this.memoryCache.delete(key);
      }
      
      this.metrics.misses++;
      this.updateAvgTime('miss', Date.now() - startTime);
      return null;
    } catch (error) {
      this.metrics.errors++;
      console.error('Cache get error:', error);
      return null;
    }
  }
  
  /**
   * Set DeepWiki response in cache
   */
  async set(key: string, data: any, ttl?: number): Promise<void> {
    const effectiveTtl = ttl ?? this.config.ttl;
    
    try {
      const serialized = JSON.stringify(data);
      const shouldCompress = serialized.length > this.config.compressionThreshold;
      const toStore = shouldCompress ? this.compress(serialized) : serialized;
      
      if (shouldCompress) {
        this.metrics.compressionSaves++;
      }
      
      // Store in Redis if available
      if (this.isRedisAvailable && this.redis) {
        await this.redis.setex(key, effectiveTtl, toStore);
      }
      
      // Also store in memory cache as backup
      this.addToMemoryCache(key, data);
    } catch (error) {
      this.metrics.errors++;
      console.error('Cache set error:', error);
      // Still try to store in memory cache
      this.addToMemoryCache(key, data);
    }
  }
  
  /**
   * Cache DeepWiki analysis result
   */
  async cacheAnalysis(
    params: {
      repoUrl: string;
      branch?: string;
      prNumber?: number;
    },
    result: any,
    ttl?: number
  ): Promise<void> {
    const key = this.generateCacheKey(params);
    await this.set(key, result, ttl);
  }
  
  /**
   * Get cached DeepWiki analysis
   */
  async getCachedAnalysis(params: {
    repoUrl: string;
    branch?: string;
    prNumber?: number;
  }): Promise<any | null> {
    const key = this.generateCacheKey(params);
    return this.get(key);
  }
  
  /**
   * Invalidate cache for a repository
   */
  async invalidateRepo(repoUrl: string): Promise<void> {
    if (!this.isRedisAvailable || !this.redis) {
      // Clear memory cache entries for this repo
      const prefix = this.generateCacheKey({ repoUrl }).substring(0, 20);
      for (const key of this.memoryCache.keys()) {
        if (key.includes(prefix)) {
          this.memoryCache.delete(key);
        }
      }
      return;
    }
    
    try {
      // Find and delete all keys for this repository
      const pattern = `${this.config.keyPrefix}*`;
      const keys = await this.redis.keys(pattern);
      
      // Filter keys that match this repo
      const repoKeys = [];
      for (const key of keys) {
        const cached = await this.redis.get(key);
        if (cached) {
          try {
            const data = JSON.parse(cached);
            if (data.repoUrl === repoUrl || data.repository === repoUrl) {
              repoKeys.push(key);
            }
          } catch {
            // Skip invalid entries
          }
        }
      }
      
      if (repoKeys.length > 0) {
        await this.redis.del(...repoKeys);
        console.log(`Invalidated ${repoKeys.length} cache entries for ${repoUrl}`);
      }
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }
  
  /**
   * Batch get multiple cache entries
   */
  async mget(keys: string[]): Promise<(any | null)[]> {
    if (!this.isRedisAvailable || !this.redis) {
      return keys.map(key => {
        const cached = this.memoryCache.get(key);
        return cached && (Date.now() - cached.timestamp < this.config.ttl * 1000) 
          ? cached.data 
          : null;
      });
    }
    
    try {
      const values = await this.redis.mget(...keys);
      return values.map(val => {
        if (!val) return null;
        try {
          return JSON.parse(val);
        } catch {
          return this.decompress(val);
        }
      });
    } catch (error) {
      this.metrics.errors++;
      return keys.map(() => null);
    }
  }
  
  /**
   * Batch set multiple cache entries
   */
  async mset(entries: Array<{ key: string; data: any; ttl?: number }>): Promise<void> {
    // Set each with individual TTL
    await Promise.all(
      entries.map(entry => this.set(entry.key, entry.data, entry.ttl))
    );
  }
  
  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    this.memoryCache.clear();
    
    if (this.isRedisAvailable && this.redis) {
      try {
        const keys = await this.redis.keys(`${this.config.keyPrefix}*`);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } catch (error) {
        console.error('Cache clear error:', error);
      }
    }
  }
  
  /**
   * Get cache metrics
   */
  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }
  
  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      errors: 0,
      avgHitTime: 0,
      avgMissTime: 0,
      memoryFallbacks: 0,
      compressionSaves: 0
    };
  }
  
  /**
   * Check if Redis is available
   */
  isRedisConnected(): boolean {
    return this.isRedisAvailable;
  }
  
  /**
   * Close Redis connection
   */
  async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.isRedisAvailable = false;
    }
  }
  
  /**
   * Private helper methods
   */
  
  private addToMemoryCache(key: string, data: any): void {
    // Implement LRU eviction
    if (this.memoryCache.size >= this.config.maxMemoryCacheSize) {
      // Remove least recently used
      let lruKey: string | null = null;
      let lruTime = Date.now();
      
      for (const [k, v] of this.memoryCache.entries()) {
        if (v.timestamp < lruTime) {
          lruTime = v.timestamp;
          lruKey = k;
        }
      }
      
      if (lruKey) {
        this.memoryCache.delete(lruKey);
      }
    }
    
    this.memoryCache.set(key, {
      data,
      timestamp: Date.now(),
      hits: 0
    });
  }
  
  private updateAvgTime(type: 'hit' | 'miss', time: number): void {
    if (!this.config.enableMetrics) return;
    
    if (type === 'hit') {
      const total = this.metrics.hits;
      this.metrics.avgHitTime = 
        (this.metrics.avgHitTime * (total - 1) + time) / total;
    } else {
      const total = this.metrics.misses;
      this.metrics.avgMissTime = 
        (this.metrics.avgMissTime * (total - 1) + time) / total;
    }
  }
  
  private compress(data: string): string {
    // Simple compression using base64 encoding
    // In production, use proper compression like gzip
    return Buffer.from(data).toString('base64');
  }
  
  private decompress(data: string): any {
    try {
      const decompressed = Buffer.from(data, 'base64').toString('utf-8');
      return JSON.parse(decompressed);
    } catch {
      return null;
    }
  }
}

// Singleton instance
let cacheInstance: DeepWikiCacheService | null = null;

/**
 * Get or create cache service instance
 */
export function getDeepWikiCache(config?: CacheConfig): DeepWikiCacheService {
  if (!cacheInstance) {
    cacheInstance = new DeepWikiCacheService(config);
  }
  return cacheInstance;
}

// Export for convenience
export default DeepWikiCacheService;