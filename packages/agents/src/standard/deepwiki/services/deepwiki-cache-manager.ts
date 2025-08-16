/**
 * DeepWiki Cache Manager
 * Manages caching of analysis results and context data
 */

import { createClient, RedisClientType } from 'redis';
import { ILogger } from '../../services/interfaces/logger.interface';
import { AnalysisResult, CodeIssue } from '../interfaces/analysis.interface';
import { ContextMetadata } from '../interfaces/context.interface';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  namespace?: string;
  compress?: boolean;
}

export class DeepWikiCacheManager {
  private redisClient?: RedisClientType;
  private logger: ILogger;
  private inMemoryCache: Map<string, { data: any; expires: number }>;
  
  // Default TTL values
  private readonly DEFAULT_ANALYSIS_TTL = 3600; // 1 hour
  private readonly DEFAULT_CONTEXT_TTL = 1800; // 30 minutes
  private readonly DEFAULT_CHAT_TTL = 600; // 10 minutes
  
  constructor(logger: ILogger) {
    this.logger = logger;
    this.inMemoryCache = new Map();
    this.initializeRedis();
    
    // Clean up expired in-memory cache periodically
    setInterval(() => this.cleanupInMemoryCache(), 60000); // Every minute
  }
  
  private async initializeRedis(): Promise<void> {
    if (process.env.REDIS_URL) {
      try {
        this.redisClient = createClient({ url: process.env.REDIS_URL });
        this.redisClient.on('error', (err) => {
          this.logger.warn('Redis Client Error', { error: err });
        });
        await this.redisClient.connect();
        this.logger.info('Redis connected for cache management');
      } catch (error) {
        this.logger.warn('Failed to connect to Redis, using in-memory cache', { error });
      }
    }
  }
  
  /**
   * Cache analysis result
   */
  async cacheAnalysis(
    repositoryUrl: string,
    branch: string,
    result: AnalysisResult,
    options?: CacheOptions
  ): Promise<void> {
    const key = this.buildKey('analysis', repositoryUrl, branch);
    const ttl = options?.ttl || this.DEFAULT_ANALYSIS_TTL;
    
    await this.set(key, result, ttl);
    this.logger.debug('Cached analysis result', { repositoryUrl, branch, ttl });
  }
  
  /**
   * Get cached analysis result
   */
  async getCachedAnalysis(
    repositoryUrl: string,
    branch: string
  ): Promise<AnalysisResult | null> {
    const key = this.buildKey('analysis', repositoryUrl, branch);
    const cached = await this.get<AnalysisResult>(key);
    
    if (cached) {
      this.logger.debug('Cache hit for analysis', { repositoryUrl, branch });
    }
    
    return cached;
  }
  
  /**
   * Cache context metadata
   */
  async cacheContext(
    repositoryUrl: string,
    metadata: ContextMetadata,
    options?: CacheOptions
  ): Promise<void> {
    const key = this.buildKey('context', repositoryUrl);
    const ttl = options?.ttl || this.DEFAULT_CONTEXT_TTL;
    
    await this.set(key, metadata, ttl);
    this.logger.debug('Cached context metadata', { repositoryUrl, contextId: metadata.contextId });
  }
  
  /**
   * Get cached context metadata
   */
  async getCachedContext(repositoryUrl: string): Promise<ContextMetadata | null> {
    const key = this.buildKey('context', repositoryUrl);
    return await this.get<ContextMetadata>(key);
  }
  
  /**
   * Cache individual issues for quick lookup
   */
  async cacheIssues(
    repositoryUrl: string,
    issues: CodeIssue[],
    options?: CacheOptions
  ): Promise<void> {
    const ttl = options?.ttl || this.DEFAULT_ANALYSIS_TTL;
    
    // Cache by file for quick file-based lookups
    const issuesByFile = new Map<string, CodeIssue[]>();
    
    for (const issue of issues) {
      const file = issue.location.file;
      if (!issuesByFile.has(file)) {
        issuesByFile.set(file, []);
      }
      issuesByFile.get(file)!.push(issue);
    }
    
    // Cache each file's issues
    for (const [file, fileIssues] of issuesByFile) {
      const key = this.buildKey('issues', repositoryUrl, file);
      await this.set(key, fileIssues, ttl);
    }
    
    this.logger.debug('Cached issues by file', { 
      repositoryUrl, 
      fileCount: issuesByFile.size,
      totalIssues: issues.length 
    });
  }
  
  /**
   * Get cached issues for a specific file
   */
  async getCachedIssuesForFile(
    repositoryUrl: string,
    file: string
  ): Promise<CodeIssue[] | null> {
    const key = this.buildKey('issues', repositoryUrl, file);
    return await this.get<CodeIssue[]>(key);
  }
  
  /**
   * Cache chat response
   */
  async cacheChatResponse(
    sessionId: string,
    question: string,
    response: string,
    options?: CacheOptions
  ): Promise<void> {
    const key = this.buildKey('chat', sessionId, this.hashString(question));
    const ttl = options?.ttl || this.DEFAULT_CHAT_TTL;
    
    await this.set(key, { question, response, timestamp: Date.now() }, ttl);
  }
  
  /**
   * Get cached chat response
   */
  async getCachedChatResponse(
    sessionId: string,
    question: string
  ): Promise<{ question: string; response: string; timestamp: number } | null> {
    const key = this.buildKey('chat', sessionId, this.hashString(question));
    return await this.get(key);
  }
  
  /**
   * Invalidate cache for a repository
   */
  async invalidateRepository(repositoryUrl: string): Promise<void> {
    const pattern = `deepwiki:*:${this.sanitizeKey(repositoryUrl)}:*`;
    
    if (this.redisClient) {
      try {
        const keys = await this.redisClient.keys(pattern);
        if (keys.length > 0) {
          await this.redisClient.del(keys);
          this.logger.info('Invalidated cache for repository', { 
            repositoryUrl, 
            keysDeleted: keys.length 
          });
        }
      } catch (error) {
        this.logger.warn('Failed to invalidate Redis cache', { error });
      }
    }
    
    // Also clear in-memory cache
    const memKeys = Array.from(this.inMemoryCache.keys()).filter(k => k.includes(repositoryUrl));
    memKeys.forEach(k => this.inMemoryCache.delete(k));
  }
  
  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    redisConnected: boolean;
    inMemorySize: number;
    redisSize?: number;
  }> {
    const stats = {
      redisConnected: !!this.redisClient,
      inMemorySize: this.inMemoryCache.size
    };
    
    if (this.redisClient) {
      try {
        const info = await this.redisClient.dbSize();
        return { ...stats, redisSize: info };
      } catch (error) {
        this.logger.warn('Failed to get Redis stats', { error });
      }
    }
    
    return stats;
  }
  
  /**
   * Set value in cache
   */
  private async set(key: string, value: any, ttl: number): Promise<void> {
    const serialized = JSON.stringify(value);
    
    // Try Redis first
    if (this.redisClient) {
      try {
        await this.redisClient.setEx(key, ttl, serialized);
        return;
      } catch (error) {
        this.logger.warn('Failed to set in Redis, using in-memory cache', { error });
      }
    }
    
    // Fall back to in-memory cache
    this.inMemoryCache.set(key, {
      data: value,
      expires: Date.now() + (ttl * 1000)
    });
  }
  
  /**
   * Get value from cache
   */
  private async get<T>(key: string): Promise<T | null> {
    // Try Redis first
    if (this.redisClient) {
      try {
        const cached = await this.redisClient.get(key);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (error) {
        this.logger.warn('Failed to get from Redis, checking in-memory cache', { error });
      }
    }
    
    // Check in-memory cache
    const memCached = this.inMemoryCache.get(key);
    if (memCached) {
      if (memCached.expires > Date.now()) {
        return memCached.data;
      } else {
        // Expired, remove it
        this.inMemoryCache.delete(key);
      }
    }
    
    return null;
  }
  
  /**
   * Build cache key
   */
  private buildKey(namespace: string, ...parts: string[]): string {
    const sanitized = parts.map(p => this.sanitizeKey(p));
    return `deepwiki:${namespace}:${sanitized.join(':')}`;
  }
  
  /**
   * Sanitize key part
   */
  private sanitizeKey(key: string): string {
    return key.replace(/[^a-zA-Z0-9_-]/g, '_');
  }
  
  /**
   * Hash string for cache key
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }
  
  /**
   * Clean up expired in-memory cache entries
   */
  private cleanupInMemoryCache(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, value] of this.inMemoryCache) {
      if (value.expires <= now) {
        this.inMemoryCache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      this.logger.debug('Cleaned up expired in-memory cache entries', { count: cleaned });
    }
  }
}