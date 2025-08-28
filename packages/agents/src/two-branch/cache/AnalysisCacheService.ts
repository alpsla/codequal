/**
 * Two-Branch Analysis Cache Service
 * 
 * Provides Redis-based caching for two-branch analysis to ensure
 * consistent results and improve performance.
 * 
 * Features:
 * - TTL-based cache expiration with different strategies per data type
 * - Automatic fallback to in-memory cache if Redis unavailable
 * - Cache key generation for repositories, branches, and tools
 * - Metrics tracking for cache hits/misses
 * - Batch operations for efficiency
 */

import Redis from 'ioredis';
import { createHash } from 'crypto';
import { 
  BranchAnalysisResult, 
  ToolResult, 
  ComparisonResult,
  CacheConfig,
  CacheMetrics,
  CacheEntry
} from '../types';

export class AnalysisCacheService {
  private redis?: Redis;
  private memoryCache: Map<string, CacheEntry> = new Map();
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
  
  // Different TTLs for different data types
  private static readonly TTL_STRATEGY = {
    toolResult: 7 * 24 * 3600,      // 7 days - tool results rarely change
    branchAnalysis: 3600,            // 1 hour - may have new commits
    prComparison: 300,               // 5 minutes - real-time updates
    fileContent: 24 * 3600,          // 24 hours - file content cache
    repositoryInfo: 12 * 3600        // 12 hours - repo metadata
  };
  
  constructor(config: CacheConfig = {}) {
    this.config = {
      redisUrl: config.redisUrl || process.env.REDIS_URL || '',
      ttl: config.ttl ?? 3600,
      keyPrefix: config.keyPrefix ?? 'two-branch:',
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
        console.log('Connected to Redis for two-branch analysis caching');
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
   * Generate cache key for different data types
   */
  generateCacheKey(
    type: 'branch' | 'tool' | 'comparison' | 'file' | 'repo',
    params: {
      repo: string;
      branch?: string;
      tool?: string;
      prNumber?: number;
      filePath?: string;
    }
  ): string {
    const parts = [this.config.keyPrefix, type];
    
    // Normalize repo URL
    const normalizedRepo = params.repo.toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\.git$/, '')
      .replace(/\//g, ':');
    
    parts.push(normalizedRepo);
    
    if (params.branch) {
      parts.push(params.branch);
    }
    
    if (params.tool) {
      parts.push(params.tool);
    }
    
    if (params.prNumber) {
      parts.push(`pr-${params.prNumber}`);
    }
    
    if (params.filePath) {
      const fileHash = this.hashContent(params.filePath);
      parts.push(fileHash.substring(0, 8));
    }
    
    return parts.join(':');
  }
  
  /**
   * Cache branch analysis result
   */
  async cacheBranchAnalysis(
    repo: string,
    branch: string,
    result: BranchAnalysisResult
  ): Promise<void> {
    const key = this.generateCacheKey('branch', { repo, branch });
    await this.set(key, result, AnalysisCacheService.TTL_STRATEGY.branchAnalysis);
  }
  
  /**
   * Get cached branch analysis
   */
  async getCachedBranchAnalysis(
    repo: string,
    branch: string
  ): Promise<BranchAnalysisResult | null> {
    const key = this.generateCacheKey('branch', { repo, branch });
    return await this.get(key);
  }
  
  /**
   * Cache tool result
   */
  async cacheToolResult(
    repo: string,
    branch: string,
    tool: string,
    result: ToolResult
  ): Promise<void> {
    const key = this.generateCacheKey('tool', { repo, branch, tool });
    await this.set(key, result, AnalysisCacheService.TTL_STRATEGY.toolResult);
  }
  
  /**
   * Get cached tool result
   */
  async getCachedToolResult(
    repo: string,
    branch: string,
    tool: string
  ): Promise<ToolResult | null> {
    const key = this.generateCacheKey('tool', { repo, branch, tool });
    return await this.get(key);
  }
  
  /**
   * Cache comparison result
   */
  async cacheComparisonResult(
    repo: string,
    prNumber: number,
    result: ComparisonResult
  ): Promise<void> {
    const key = this.generateCacheKey('comparison', { repo, prNumber });
    await this.set(key, result, AnalysisCacheService.TTL_STRATEGY.prComparison);
  }
  
  /**
   * Get cached comparison result
   */
  async getCachedComparisonResult(
    repo: string,
    prNumber: number
  ): Promise<ComparisonResult | null> {
    const key = this.generateCacheKey('comparison', { repo, prNumber });
    return await this.get(key);
  }
  
  /**
   * Generic get method
   */
  async get<T = any>(key: string): Promise<T | null> {
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
        // Check if not expired
        if (!memoryCached.ttl || Date.now() < memoryCached.timestamp + (memoryCached.ttl * 1000)) {
          this.metrics.hits++;
          this.metrics.memoryFallbacks++;
          if (memoryCached.hits !== undefined) {
            memoryCached.hits++;
          }
          this.updateAvgTime('hit', Date.now() - startTime);
          return memoryCached.data as T;
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
   * Generic set method
   */
  async set<T = any>(key: string, data: T, ttl?: number): Promise<void> {
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
      this.addToMemoryCache(key, data, effectiveTtl);
    } catch (error) {
      this.metrics.errors++;
      console.error('Cache set error:', error);
      // Still try to store in memory cache
      this.addToMemoryCache(key, data, effectiveTtl);
    }
  }
  
  /**
   * Invalidate cache for a repository
   */
  async invalidateRepo(repoUrl: string): Promise<void> {
    const normalizedRepo = repoUrl.toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\.git$/, '')
      .replace(/\//g, ':');
    
    if (!this.isRedisAvailable || !this.redis) {
      // Clear memory cache entries for this repo
      for (const key of this.memoryCache.keys()) {
        if (key.includes(normalizedRepo)) {
          this.memoryCache.delete(key);
        }
      }
      return;
    }
    
    try {
      // Find and delete all keys for this repository
      const pattern = `${this.config.keyPrefix}*${normalizedRepo}*`;
      const keys = await this.redis.keys(pattern);
      
      if (keys.length > 0) {
        await this.redis.del(...keys);
        console.log(`Invalidated ${keys.length} cache entries for ${repoUrl}`);
      }
      
      // Also clear from memory cache
      for (const key of this.memoryCache.keys()) {
        if (key.includes(normalizedRepo)) {
          this.memoryCache.delete(key);
        }
      }
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }
  
  /**
   * Batch get multiple cache entries
   */
  async mget<T = any>(keys: string[]): Promise<(T | null)[]> {
    if (!this.isRedisAvailable || !this.redis) {
      return keys.map(key => {
        const cached = this.memoryCache.get(key);
        if (cached && (!cached.ttl || Date.now() < cached.timestamp + (cached.ttl * 1000))) {
          return cached.data as T;
        }
        return null;
      });
    }
    
    try {
      const values = await this.redis.mget(...keys);
      return values.map(val => {
        if (!val) return null;
        try {
          return JSON.parse(val) as T;
        } catch {
          return this.decompress(val) as T;
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
  async mset<T = any>(entries: Array<{ key: string; data: T; ttl?: number }>): Promise<void> {
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
  
  private addToMemoryCache<T = any>(key: string, data: T, ttl?: number): void {
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
      ttl,
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
  
  private hashContent(content: string): string {
    return createHash('md5').update(content).digest('hex');
  }
  
  private compress(data: string): string {
    // Simple compression using base64 encoding
    // TODO: In production, use proper compression like gzip
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
let cacheInstance: AnalysisCacheService | null = null;

/**
 * Get or create cache service instance
 */
export function getAnalysisCache(config?: CacheConfig): AnalysisCacheService {
  if (!cacheInstance) {
    cacheInstance = new AnalysisCacheService(config);
  }
  return cacheInstance;
}

// Export for convenience
export default AnalysisCacheService;