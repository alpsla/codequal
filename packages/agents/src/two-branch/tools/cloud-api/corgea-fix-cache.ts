/**
 * Corgea Fix Cache
 *
 * Caches fixes for identical code patterns to avoid redundant API calls.
 * Uses Redis for distributed caching with fallback to in-memory.
 *
 * Cache key: hash(ruleId + normalizedCode)
 * Cache value: { fix, confidence, timestamp, hitCount }
 *
 * @since Session 63
 */

import { createHash } from 'crypto';
import { Redis } from 'ioredis';
import { CorgeaFix } from './corgea-fixer';
import { Issue } from '../../analyzers/v9-types';

// ============================================================
// TYPES
// ============================================================

export interface CachedFix {
  fix: CorgeaFix;
  cacheKey: string;
  createdAt: Date;
  lastAccessedAt: Date;
  hitCount: number;
  sourceIssue: {
    ruleId: string;
    codeSnippet: string;
    file: string;
    line: number;
  };
}

export interface CacheStats {
  totalEntries: number;
  hitCount: number;
  missCount: number;
  hitRate: number;
  avgHitsPerEntry: number;
  oldestEntry: Date | null;
  newestEntry: Date | null;
  memoryUsageBytes: number;
  savedApiCalls: number;
  estimatedSavings: number; // in cents
}

export interface CacheConfig {
  redisUrl?: string;
  ttlSeconds: number; // Time to live for cache entries
  maxEntries: number; // Max entries in memory cache
  minConfidence: number; // Min confidence to cache a fix
}

const DEFAULT_CONFIG: CacheConfig = {
  ttlSeconds: 7 * 24 * 60 * 60, // 7 days
  maxEntries: 10000,
  minConfidence: 70
};

// ============================================================
// FIX CACHE CLASS
// ============================================================

export class CorgeaFixCache {
  private config: CacheConfig;
  private redis: Redis | null = null;
  private memoryCache = new Map<string, CachedFix>();
  private stats = {
    hits: 0,
    misses: 0,
    savedApiCalls: 0
  };

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initRedis();
  }

  private initRedis(): void {
    const redisUrl = this.config.redisUrl || process.env.REDIS_URL;
    if (redisUrl) {
      try {
        this.redis = new Redis(redisUrl, {
          maxRetriesPerRequest: 3,
          retryStrategy: (times) => Math.min(times * 100, 3000)
        });
        this.redis.on('error', (err) => {
          console.warn('[CorgeaFixCache] Redis error:', err.message);
        });
      } catch (error) {
        console.warn('[CorgeaFixCache] Failed to connect to Redis:', error);
      }
    }
  }

  /**
   * Generate cache key for an issue
   */
  generateKey(issue: Issue): string {
    const ruleId = issue.rule || 'unknown';
    const snippet = this.normalizeCode(issue.codeSnippet || issue.description || '');

    return createHash('sha256')
      .update(`${ruleId}|${snippet}`)
      .digest('hex')
      .substring(0, 32);
  }

  /**
   * Normalize code for comparison
   */
  private normalizeCode(code: string): string {
    return code
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/['"`]/g, '"') // Normalize quotes
      .replace(/\b\w+\s*=\s*/g, 'VAR=') // Normalize variable names
      .replace(/\d+/g, 'N') // Normalize numbers
      .trim()
      .toLowerCase()
      .substring(0, 500); // Limit length
  }

  /**
   * Check if a fix exists in cache
   */
  async get(issue: Issue): Promise<CorgeaFix | null> {
    const key = this.generateKey(issue);

    // Try Redis first
    if (this.redis) {
      try {
        const cached = await this.redis.get(`corgea:fix:${key}`);
        if (cached) {
          const data = JSON.parse(cached) as CachedFix;
          this.stats.hits++;
          this.stats.savedApiCalls++;

          // Update access time
          data.lastAccessedAt = new Date();
          data.hitCount++;
          await this.redis.setex(
            `corgea:fix:${key}`,
            this.config.ttlSeconds,
            JSON.stringify(data)
          );

          return data.fix;
        }
      } catch (error) {
        console.warn('[CorgeaFixCache] Redis get error:', error);
      }
    }

    // Try memory cache
    const memoryCached = this.memoryCache.get(key);
    if (memoryCached) {
      this.stats.hits++;
      this.stats.savedApiCalls++;
      memoryCached.lastAccessedAt = new Date();
      memoryCached.hitCount++;
      return memoryCached.fix;
    }

    this.stats.misses++;
    return null;
  }

  /**
   * Store a fix in cache
   */
  async set(issue: Issue, fix: CorgeaFix): Promise<void> {
    // Only cache fixes above confidence threshold
    if (fix.confidence < this.config.minConfidence) {
      return;
    }

    const key = this.generateKey(issue);
    const now = new Date();

    const cached: CachedFix = {
      fix,
      cacheKey: key,
      createdAt: now,
      lastAccessedAt: now,
      hitCount: 0,
      sourceIssue: {
        ruleId: issue.rule || 'unknown',
        codeSnippet: (issue.codeSnippet || '').substring(0, 200),
        file: issue.file || 'unknown',
        line: issue.line || 0
      }
    };

    // Store in Redis
    if (this.redis) {
      try {
        await this.redis.setex(
          `corgea:fix:${key}`,
          this.config.ttlSeconds,
          JSON.stringify(cached)
        );
      } catch (error) {
        console.warn('[CorgeaFixCache] Redis set error:', error);
      }
    }

    // Store in memory cache
    this.memoryCache.set(key, cached);

    // Prune memory cache if too large
    if (this.memoryCache.size > this.config.maxEntries) {
      this.pruneMemoryCache();
    }
  }

  /**
   * Check cache for multiple issues at once
   */
  async getMultiple(issues: Issue[]): Promise<{
    cached: Map<string, CorgeaFix>;
    uncached: Issue[];
  }> {
    const cached = new Map<string, CorgeaFix>();
    const uncached: Issue[] = [];

    for (const issue of issues) {
      const fix = await this.get(issue);
      if (fix) {
        cached.set(issue.id || this.generateKey(issue), fix);
      } else {
        uncached.push(issue);
      }
    }

    return { cached, uncached };
  }

  /**
   * Store multiple fixes
   */
  async setMultiple(fixes: Array<{ issue: Issue; fix: CorgeaFix }>): Promise<void> {
    for (const { issue, fix } of fixes) {
      await this.set(issue, fix);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    let redisEntries = 0;
    let oldestRedis: Date | null = null;
    let newestRedis: Date | null = null;

    // Get Redis stats if available
    if (this.redis) {
      try {
        const keys = await this.redis.keys('corgea:fix:*');
        redisEntries = keys.length;

        if (keys.length > 0) {
          // Sample a few entries for date info
          const sampleKeys = keys.slice(0, 10);
          for (const key of sampleKeys) {
            const data = await this.redis.get(key);
            if (data) {
              const cached = JSON.parse(data) as CachedFix;
              const createdAt = new Date(cached.createdAt);
              if (!oldestRedis || createdAt < oldestRedis) oldestRedis = createdAt;
              if (!newestRedis || createdAt > newestRedis) newestRedis = createdAt;
            }
          }
        }
      } catch (error) {
        console.warn('[CorgeaFixCache] Failed to get Redis stats:', error);
      }
    }

    // Get memory cache stats
    let oldestMemory: Date | null = null;
    let newestMemory: Date | null = null;
    let totalHits = 0;
    let memorySize = 0;

    for (const cached of this.memoryCache.values()) {
      const createdAt = cached.createdAt;
      if (!oldestMemory || createdAt < oldestMemory) oldestMemory = createdAt;
      if (!newestMemory || createdAt > newestMemory) newestMemory = createdAt;
      totalHits += cached.hitCount;
      memorySize += JSON.stringify(cached).length;
    }

    const totalEntries = redisEntries + this.memoryCache.size;
    const hitCount = this.stats.hits;
    const missCount = this.stats.misses;
    const hitRate = (hitCount + missCount) > 0
      ? hitCount / (hitCount + missCount)
      : 0;

    const avgHitsPerEntry = totalEntries > 0 ? totalHits / totalEntries : 0;
    const savedApiCalls = this.stats.savedApiCalls;
    const estimatedSavings = savedApiCalls * 10; // 10 cents per API call

    return {
      totalEntries,
      hitCount,
      missCount,
      hitRate,
      avgHitsPerEntry,
      oldestEntry: oldestRedis || oldestMemory,
      newestEntry: newestRedis || newestMemory,
      memoryUsageBytes: memorySize,
      savedApiCalls,
      estimatedSavings
    };
  }

  /**
   * Clear the cache
   */
  async clear(): Promise<void> {
    this.memoryCache.clear();
    this.stats = { hits: 0, misses: 0, savedApiCalls: 0 };

    if (this.redis) {
      try {
        const keys = await this.redis.keys('corgea:fix:*');
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } catch (error) {
        console.warn('[CorgeaFixCache] Failed to clear Redis:', error);
      }
    }
  }

  /**
   * Prune old entries from memory cache
   */
  private pruneMemoryCache(): void {
    const entries = Array.from(this.memoryCache.entries());

    // Sort by last access time, oldest first
    entries.sort((a, b) =>
      a[1].lastAccessedAt.getTime() - b[1].lastAccessedAt.getTime()
    );

    // Remove oldest 20%
    const toRemove = Math.floor(entries.length * 0.2);
    for (let i = 0; i < toRemove; i++) {
      this.memoryCache.delete(entries[i][0]);
    }
  }

  /**
   * Warm up cache from Supabase pattern store
   */
  async warmupFromPatterns(patterns: Array<{
    ruleId: string;
    codePattern: string;
    fix: string;
    confidence: number;
  }>): Promise<number> {
    let loaded = 0;

    for (const pattern of patterns) {
      // Create synthetic fix
      const fix: CorgeaFix = {
        issueId: `pattern-${pattern.ruleId}`,
        ruleId: pattern.ruleId,
        file: 'pattern',
        line: 0,
        originalCode: pattern.codePattern,
        fixedCode: pattern.fix,
        explanation: 'Cached pattern from fix registry',
        confidence: pattern.confidence,
        safeForAutoApply: pattern.confidence >= 80,
        corgeaIssueId: '',
        syntaxVerified: true,
        testVerified: false
      };

      // Create synthetic issue for key generation
      const issue: Issue = {
        id: `pattern-${pattern.ruleId}`,
        category: 'Quality',
        severity: 'medium',
        status: 'new',
        title: pattern.ruleId,
        description: '',
        file: 'pattern',
        line: 0,
        tool: 'pattern-registry',
        agent: 'QualityAgent',
        impact: '',
        businessImpact: '',
        rule: pattern.ruleId,
        codeSnippet: pattern.codePattern
      };

      await this.set(issue, fix);
      loaded++;
    }

    return loaded;
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
    }
  }
}

// ============================================================
// SINGLETON INSTANCE
// ============================================================

let cacheInstance: CorgeaFixCache | null = null;

export function getCorgeaFixCache(): CorgeaFixCache {
  if (!cacheInstance) {
    cacheInstance = new CorgeaFixCache();
  }
  return cacheInstance;
}
