import Redis from 'ioredis';
import { Logger, createLogger, LoggableData } from '../../utils/logger';

export interface DeepWikiReport {
  prId: string;
  repositoryUrl: string;
  mainBranchAnalysis: {
    branch: string;
    commit: string;
    analyzedAt: string;
    scores: Record<string, number>;
    patterns: any[];
    summary: string;
  };
  featureBranchAnalysis: {
    branch: string;
    commit: string;
    analyzedAt: string;
    scores: Record<string, number>;
    patterns: any[];
    summary: string;
  };
  comparison: {
    addedPatterns: any[];
    removedPatterns: any[];
    scoreChanges: Record<string, { before: number; after: number; change: number }>;
    recommendations: string[];
  };
  timestamp: string;
  cacheTTL?: number;
}

export interface CacheService {
  setReport(prId: string, report: DeepWikiReport, ttl?: number): Promise<void>;
  getReport(prId: string): Promise<DeepWikiReport | null>;
  isReportAvailable(prId: string): Promise<boolean>;
  cleanExpired(): Promise<void>;
  getStats(): Promise<CacheStats>;
  disconnect(): Promise<void>;
}

export interface CacheStats {
  totalReports: number;
  memoryUsage: number;
  oldestReport: string | null;
  hitRate?: number;
  avgRetrievalTime?: number;
}

export class RedisCacheService implements CacheService {
  private client: Redis;
  private logger: Logger;
  private defaultTTL: number;
  private metricsClient?: Redis;

  constructor(
    redisUrl: string,
    options: {
      defaultTTL?: number;
      logger?: Logger;
      enableMetrics?: boolean;
    } = {}
  ) {
    this.defaultTTL = options.defaultTTL || 1800; // 30 minutes default
    this.logger = options.logger || createLogger('RedisCacheService');

    // Main Redis client
    this.client = new Redis(redisUrl, {
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        this.logger.warn(`Redis connection retry ${times}, delay: ${delay}ms`);
        return delay;
      },
      reconnectOnError: (err) => {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          this.logger.warn('Redis READONLY error, reconnecting...');
          return true;
        }
        return false;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
    });

    // Metrics client (separate connection for metrics)
    if (options.enableMetrics) {
      this.metricsClient = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        enableReadyCheck: true,
        lazyConnect: true,
      });
    }

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.client.on('error', (err) => {
      this.logger.error('Redis Client Error:', err as LoggableData);
    });

    this.client.on('connect', () => {
      this.logger.info('Redis Client Connected');
    });

    this.client.on('ready', () => {
      this.logger.info('Redis Client Ready');
    });

    this.client.on('close', () => {
      this.logger.warn('Redis Client Connection Closed');
    });

    this.client.on('reconnecting', (delay: number) => {
      this.logger.info(`Redis Client Reconnecting in ${delay}ms`);
    });
  }

  async setReport(
    prId: string,
    report: DeepWikiReport,
    ttl: number = this.defaultTTL
  ): Promise<void> {
    const startTime = Date.now();
    const key = this.getReportKey(prId);

    try {
      // Store the report with TTL
      const value = JSON.stringify(report);
      await this.client.setex(key, ttl, value);

      // Store metadata for monitoring
      const metadata = {
        prId,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + ttl * 1000).toISOString(),
        size: value.length,
        repositoryUrl: report.repositoryUrl,
      };

      await this.client.hset(
        'deepwiki:reports:meta',
        prId,
        JSON.stringify(metadata)
      );

      // Update metrics
      if (this.metricsClient) {
        await this.updateMetrics('set', Date.now() - startTime);
      }

      this.logger.info(`Report cached for PR ${prId} with TTL ${ttl}s`);
    } catch (error) {
      this.logger.error(`Failed to cache report for PR ${prId}:`, error as LoggableData);
      throw error;
    }
  }

  async getReport(prId: string): Promise<DeepWikiReport | null> {
    const startTime = Date.now();
    const key = this.getReportKey(prId);

    try {
      const value = await this.client.get(key);

      if (!value) {
        if (this.metricsClient) {
          await this.updateMetrics('miss', Date.now() - startTime);
        }
        return null;
      }

      const report = JSON.parse(value) as DeepWikiReport;

      // Update metrics
      if (this.metricsClient) {
        await this.updateMetrics('hit', Date.now() - startTime);
      }

      this.logger.debug(`Report retrieved for PR ${prId}`);
      return report;
    } catch (error) {
      this.logger.error(`Failed to retrieve report for PR ${prId}:`, error as LoggableData);

      if (this.metricsClient) {
        await this.updateMetrics('error', Date.now() - startTime);
      }

      return null;
    }
  }

  async isReportAvailable(prId: string): Promise<boolean> {
    const key = this.getReportKey(prId);

    try {
      const exists = await this.client.exists(key);
      return exists === 1;
    } catch (error) {
      this.logger.error(`Failed to check report availability for PR ${prId}:`, error as LoggableData);
      return false;
    }
  }

  async cleanExpired(): Promise<void> {
    try {
      // Redis automatically handles TTL expiration
      // This method cleans up metadata for expired entries
      const meta = await this.client.hgetall('deepwiki:reports:meta');
      const now = new Date();
      let cleanedCount = 0;

      for (const [prId, metaStr] of Object.entries(meta)) {
        try {
          const metadata = JSON.parse(metaStr);
          const expiresAt = new Date(metadata.expiresAt);

          if (expiresAt < now) {
            await this.client.hdel('deepwiki:reports:meta', prId);
            cleanedCount++;
          }
        } catch (error) {
          this.logger.error(`Failed to clean metadata for PR ${prId}:`, error as LoggableData);
          // Remove corrupted metadata
          await this.client.hdel('deepwiki:reports:meta', prId);
        }
      }

      this.logger.info(`Cleaned ${cleanedCount} expired metadata entries`);
    } catch (error) {
      this.logger.error('Failed to clean expired entries:', error as LoggableData);
    }
  }

  async getStats(): Promise<CacheStats> {
    try {
      // Get memory info
      const info = await this.client.info('memory');
      const memoryMatch = info.match(/used_memory:(\d+)/);
      const memoryUsage = memoryMatch ? parseInt(memoryMatch[1], 10) : 0;

      // Get metadata
      const meta = await this.client.hgetall('deepwiki:reports:meta');
      const totalReports = Object.keys(meta).length;

      // Find oldest report
      let oldestReport: string | null = null;
      let oldestTime = Infinity;

      for (const [prId, metaStr] of Object.entries(meta)) {
        try {
          const metadata = JSON.parse(metaStr);
          const createdAt = new Date(metadata.createdAt).getTime();
          if (createdAt < oldestTime) {
            oldestTime = createdAt;
            oldestReport = prId;
          }
        } catch (error) {
          // Skip invalid entries
        }
      }

      // Get metrics if available
      let hitRate: number | undefined;
      let avgRetrievalTime: number | undefined;

      if (this.metricsClient) {
        const hits = parseInt(await this.metricsClient.get('metrics:hits') || '0', 10);
        const misses = parseInt(await this.metricsClient.get('metrics:misses') || '0', 10);
        const totalTime = parseInt(await this.metricsClient.get('metrics:total_time') || '0', 10);
        const totalRequests = hits + misses;

        if (totalRequests > 0) {
          hitRate = (hits / totalRequests) * 100;
          avgRetrievalTime = totalTime / totalRequests;
        }
      }

      return {
        totalReports,
        memoryUsage,
        oldestReport,
        hitRate,
        avgRetrievalTime,
      };
    } catch (error) {
      this.logger.error('Failed to get cache stats:', error as LoggableData);
      return {
        totalReports: 0,
        memoryUsage: 0,
        oldestReport: null,
      };
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.client.quit();
      if (this.metricsClient) {
        await this.metricsClient.quit();
      }
      this.logger.info('Redis connections closed');
    } catch (error) {
      this.logger.error('Error disconnecting from Redis:', error as LoggableData);
    }
  }

  private getReportKey(prId: string): string {
    return `deepwiki:report:${prId}`;
  }

  private async updateMetrics(
    type: 'hit' | 'miss' | 'set' | 'error',
    duration: number
  ): Promise<void> {
    if (!this.metricsClient) return;

    try {
      const pipeline = this.metricsClient.pipeline();

      switch (type) {
        case 'hit':
          pipeline.incr('metrics:hits');
          break;
        case 'miss':
          pipeline.incr('metrics:misses');
          break;
        case 'set':
          pipeline.incr('metrics:sets');
          break;
        case 'error':
          pipeline.incr('metrics:errors');
          break;
      }

      pipeline.incrby('metrics:total_time', duration);
      pipeline.incr('metrics:total_requests');

      await pipeline.exec();
    } catch (error) {
      // Don't throw on metrics errors
      this.logger.debug('Failed to update metrics:', error as LoggableData);
    }
  }
}

// In-memory cache fallback for development
export class InMemoryCacheService implements CacheService {
  private cache: Map<string, { report: DeepWikiReport; expiresAt: number }> = new Map();
  private logger: Logger;
  private defaultTTL: number;

  constructor(options: { defaultTTL?: number; logger?: Logger } = {}) {
    this.defaultTTL = options.defaultTTL || 1800;
    this.logger = options.logger || createLogger('InMemoryCacheService');
    this.logger.warn('Using in-memory cache. This is not recommended for production!');

    // Cleanup expired entries every minute
    setInterval(() => {
      this.cleanExpired();
    }, 60000);
  }

  async setReport(
    prId: string,
    report: DeepWikiReport,
    ttl: number = this.defaultTTL
  ): Promise<void> {
    const expiresAt = Date.now() + ttl * 1000;
    this.cache.set(prId, { report, expiresAt });
    this.logger.info(`Report cached in memory for PR ${prId} with TTL ${ttl}s`);
  }

  async getReport(prId: string): Promise<DeepWikiReport | null> {
    const entry = this.cache.get(prId);

    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(prId);
      return null;
    }

    return entry.report;
  }

  async isReportAvailable(prId: string): Promise<boolean> {
    const report = await this.getReport(prId);
    return report !== null;
  }

  async cleanExpired(): Promise<void> {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [prId, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(prId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug(`Cleaned ${cleanedCount} expired entries from memory cache`);
    }
  }

  async getStats(): Promise<CacheStats> {
    const reports = Array.from(this.cache.entries());
    let oldestReport: string | null = null;
    let oldestTime = Infinity;

    for (const [prId, entry] of reports) {
      const createdAt = entry.expiresAt - this.defaultTTL * 1000;
      if (createdAt < oldestTime) {
        oldestTime = createdAt;
        oldestReport = prId;
      }
    }

    return {
      totalReports: this.cache.size,
      memoryUsage: 0, // Not easily calculable for in-memory
      oldestReport,
    };
  }

  async disconnect(): Promise<void> {
    this.cache.clear();
    this.logger.info('In-memory cache cleared');
  }
}

// Factory function
export function createCacheService(
  redisUrl?: string,
  options?: {
    defaultTTL?: number;
    logger?: Logger;
    enableMetrics?: boolean;
  }
): CacheService {
  if (redisUrl && redisUrl !== 'memory://') {
    try {
      return new RedisCacheService(redisUrl, options);
    } catch (error) {
      console.error('Failed to create Redis cache service:', error);
      console.log('Falling back to in-memory cache');
    }
  }

  return new InMemoryCacheService(options);
}