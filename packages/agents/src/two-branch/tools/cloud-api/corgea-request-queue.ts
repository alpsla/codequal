/**
 * Corgea Request Queue
 *
 * Rate-limited queue for managing Corgea API requests:
 * - Enforces rate limits (hourly/daily)
 * - Priority-based processing
 * - Redis-backed for distributed processing
 * - Automatic retry with backoff
 *
 * @since Session 63
 */

import { Redis } from 'ioredis';
import { EventEmitter } from 'events';
import { CorgeaFixer, CorgeaFix, CorgeaFixRequest } from './corgea-fixer';
import { getCorgeaUsageTracker, CorgeaUsageTracker } from './corgea-usage-tracker';
import { getCorgeaFixCache, CorgeaFixCache } from './corgea-fix-cache';
import { BatchedRequest, CorgeaSmartBatcher, createSmartBatcher } from './corgea-smart-batcher';
import { Issue } from '../../analyzers/v9-types';

// ============================================================
// TYPES
// ============================================================

export interface QueuedRequest {
  id: string;
  userId: string;
  organizationId: string;
  priority: 1 | 2 | 3 | 4 | 5; // 1 = highest
  issues: Issue[];
  language: string;
  repositoryUrl?: string;
  branch?: string;
  createdAt: Date;
  attempts: number;
  maxAttempts: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'rate_limited';
  result?: QueueResult;
  error?: string;
}

export interface QueueResult {
  fixes: CorgeaFix[];
  cachedFixes: number;
  generatedFixes: number;
  failedIssues: number;
  processingTimeMs: number;
  apiCallsMade: number;
  estimatedCost: number;
}

export interface QueueConfig {
  redisUrl?: string;
  maxConcurrent: number;
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  maxRetries: number;
  retryDelayMs: number;
  processingTimeoutMs: number;
}

const DEFAULT_CONFIG: QueueConfig = {
  maxConcurrent: 3,
  requestsPerMinute: 10,
  requestsPerHour: 100,
  requestsPerDay: 1000,
  maxRetries: 3,
  retryDelayMs: 5000,
  processingTimeoutMs: 300000 // 5 minutes
};

// ============================================================
// REQUEST QUEUE CLASS
// ============================================================

export class CorgeaRequestQueue extends EventEmitter {
  private config: QueueConfig;
  private redis: Redis | null = null;
  private fixer: CorgeaFixer | null = null;
  private usageTracker: CorgeaUsageTracker;
  private fixCache: CorgeaFixCache;
  private batcher: CorgeaSmartBatcher;

  private queue: QueuedRequest[] = [];
  private processing = new Set<string>();
  private isRunning = false;
  private processInterval: NodeJS.Timeout | null = null;

  // Rate limit counters
  private minuteCounter = 0;
  private hourCounter = 0;
  private dayCounter = 0;
  private lastMinuteReset = Date.now();
  private lastHourReset = Date.now();
  private lastDayReset = Date.now();

  constructor(config: Partial<QueueConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.usageTracker = getCorgeaUsageTracker();
    this.fixCache = getCorgeaFixCache();
    this.batcher = createSmartBatcher();
    this.initRedis();
    this.initFixer();
  }

  private initRedis(): void {
    const redisUrl = this.config.redisUrl || process.env.REDIS_URL;
    if (redisUrl) {
      try {
        this.redis = new Redis(redisUrl, {
          maxRetriesPerRequest: 3
        });
      } catch (error) {
        console.warn('[CorgeaQueue] Failed to connect to Redis:', error);
      }
    }
  }

  private initFixer(): void {
    const apiKey = process.env.CORGEA_API_KEY;
    if (apiKey) {
      this.fixer = new CorgeaFixer({ apiKey });
    }
  }

  /**
   * Add a request to the queue
   */
  async enqueue(request: Omit<QueuedRequest, 'id' | 'createdAt' | 'attempts' | 'status'>): Promise<string> {
    const id = `req-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    const queuedRequest: QueuedRequest = {
      ...request,
      id,
      createdAt: new Date(),
      attempts: 0,
      maxAttempts: request.maxAttempts || this.config.maxRetries,
      status: 'pending'
    };

    // Check cache first
    const { cached, uncached } = await this.fixCache.getMultiple(request.issues);

    if (uncached.length === 0) {
      // All issues have cached fixes
      queuedRequest.status = 'completed';
      queuedRequest.result = {
        fixes: Array.from(cached.values()),
        cachedFixes: cached.size,
        generatedFixes: 0,
        failedIssues: 0,
        processingTimeMs: 0,
        apiCallsMade: 0,
        estimatedCost: 0
      };
      this.emit('completed', queuedRequest);
      return id;
    }

    // Update request with only uncached issues
    queuedRequest.issues = uncached;

    // Add to queue based on priority
    this.insertByPriority(queuedRequest);

    // Store in Redis if available
    if (this.redis) {
      await this.redis.hset('corgea:queue', id, JSON.stringify(queuedRequest));
    }

    this.emit('enqueued', queuedRequest);
    return id;
  }

  /**
   * Insert request by priority
   */
  private insertByPriority(request: QueuedRequest): void {
    const insertIndex = this.queue.findIndex(r => r.priority > request.priority);
    if (insertIndex === -1) {
      this.queue.push(request);
    } else {
      this.queue.splice(insertIndex, 0, request);
    }
  }

  /**
   * Start processing the queue
   */
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    this.processInterval = setInterval(() => {
      this.processQueue();
    }, 1000);

    this.emit('started');
  }

  /**
   * Stop processing the queue
   */
  stop(): void {
    this.isRunning = false;
    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = null;
    }
    this.emit('stopped');
  }

  /**
   * Process the queue
   */
  private async processQueue(): Promise<void> {
    if (!this.fixer) {
      return; // No fixer configured
    }

    // Reset rate limit counters
    this.resetCountersIfNeeded();

    // Check rate limits
    if (!this.canMakeRequest()) {
      return;
    }

    // Check concurrent limit
    if (this.processing.size >= this.config.maxConcurrent) {
      return;
    }

    // Get next request
    const request = this.queue.shift();
    if (!request) {
      return;
    }

    // Mark as processing
    request.status = 'processing';
    this.processing.add(request.id);

    try {
      await this.processRequest(request);
    } catch (error) {
      this.handleError(request, error as Error);
    } finally {
      this.processing.delete(request.id);
    }
  }

  /**
   * Process a single request
   */
  private async processRequest(request: QueuedRequest): Promise<void> {
    const startTime = Date.now();
    request.attempts++;

    // Batch issues
    const batchResult = this.batcher.batch(request.issues);
    const fixes: CorgeaFix[] = [];
    let apiCallsMade = 0;
    let failedIssues = 0;

    for (const batch of batchResult.batches) {
      // Check rate limit before each batch
      if (!this.canMakeRequest()) {
        request.status = 'rate_limited';
        this.queue.unshift(request); // Put back at front
        this.emit('rateLimited', request);
        return;
      }

      try {
        // Make API call
        this.incrementCounters();
        const result = await this.fixer!.execute({
          issues: batch.issues,
          language: request.language,
          repositoryUrl: request.repositoryUrl,
          branch: request.branch
        });

        apiCallsMade++;

        if (result.success && result.fixes) {
          fixes.push(...result.fixes as CorgeaFix[]);

          // Cache successful fixes
          for (let i = 0; i < result.fixes.length; i++) {
            if (i < batch.issues.length) {
              await this.fixCache.set(batch.issues[i], result.fixes[i] as CorgeaFix);
            }
          }
        } else {
          failedIssues += batch.issues.length;
        }

        // Record usage
        await this.usageTracker.recordUsage({
          userId: request.userId,
          organizationId: request.organizationId,
          timestamp: new Date(),
          endpoint: '/fix',
          requestType: 'fix_generation',
          issueCount: batch.issues.length,
          fixesGenerated: result.fixes?.length || 0,
          responseTimeMs: result.duration,
          success: result.success,
          errorCode: result.errorCode
        });

      } catch (error) {
        failedIssues += batch.issues.length;
        console.error('[CorgeaQueue] Batch failed:', error);
      }
    }

    // Complete request
    request.status = 'completed';
    request.result = {
      fixes,
      cachedFixes: 0, // Already handled before queueing
      generatedFixes: fixes.length,
      failedIssues,
      processingTimeMs: Date.now() - startTime,
      apiCallsMade,
      estimatedCost: apiCallsMade * 10 // 10 cents per call
    };

    // Update Redis
    if (this.redis) {
      await this.redis.hset('corgea:queue', request.id, JSON.stringify(request));
    }

    this.emit('completed', request);
  }

  /**
   * Handle error
   */
  private handleError(request: QueuedRequest, error: Error): void {
    request.error = error.message;

    if (request.attempts < request.maxAttempts) {
      // Retry with exponential backoff
      request.status = 'pending';
      const delay = this.config.retryDelayMs * Math.pow(2, request.attempts - 1);

      setTimeout(() => {
        this.insertByPriority(request);
      }, delay);

      this.emit('retry', request, request.attempts);
    } else {
      request.status = 'failed';
      this.emit('failed', request, error);
    }
  }

  /**
   * Check if we can make a request
   */
  private canMakeRequest(): boolean {
    return (
      this.minuteCounter < this.config.requestsPerMinute &&
      this.hourCounter < this.config.requestsPerHour &&
      this.dayCounter < this.config.requestsPerDay
    );
  }

  /**
   * Increment rate limit counters
   */
  private incrementCounters(): void {
    this.minuteCounter++;
    this.hourCounter++;
    this.dayCounter++;
  }

  /**
   * Reset counters if time window passed
   */
  private resetCountersIfNeeded(): void {
    const now = Date.now();

    if (now - this.lastMinuteReset >= 60000) {
      this.minuteCounter = 0;
      this.lastMinuteReset = now;
    }

    if (now - this.lastHourReset >= 3600000) {
      this.hourCounter = 0;
      this.lastHourReset = now;
    }

    if (now - this.lastDayReset >= 86400000) {
      this.dayCounter = 0;
      this.lastDayReset = now;
    }
  }

  /**
   * Get queue status
   */
  getStatus(): {
    isRunning: boolean;
    queueLength: number;
    processingCount: number;
    rateLimits: {
      minuteUsed: number;
      minuteLimit: number;
      hourUsed: number;
      hourLimit: number;
      dayUsed: number;
      dayLimit: number;
    };
  } {
    return {
      isRunning: this.isRunning,
      queueLength: this.queue.length,
      processingCount: this.processing.size,
      rateLimits: {
        minuteUsed: this.minuteCounter,
        minuteLimit: this.config.requestsPerMinute,
        hourUsed: this.hourCounter,
        hourLimit: this.config.requestsPerHour,
        dayUsed: this.dayCounter,
        dayLimit: this.config.requestsPerDay
      }
    };
  }

  /**
   * Get request status
   */
  async getRequest(id: string): Promise<QueuedRequest | null> {
    // Check in-memory queue
    const inQueue = this.queue.find(r => r.id === id);
    if (inQueue) return inQueue;

    // Check Redis
    if (this.redis) {
      const stored = await this.redis.hget('corgea:queue', id);
      if (stored) {
        return JSON.parse(stored);
      }
    }

    return null;
  }

  /**
   * Cancel a request
   */
  async cancel(id: string): Promise<boolean> {
    const index = this.queue.findIndex(r => r.id === id);
    if (index !== -1) {
      this.queue.splice(index, 1);
      if (this.redis) {
        await this.redis.hdel('corgea:queue', id);
      }
      this.emit('cancelled', id);
      return true;
    }
    return false;
  }

  /**
   * Clear the queue
   */
  async clear(): Promise<void> {
    this.queue = [];
    if (this.redis) {
      await this.redis.del('corgea:queue');
    }
    this.emit('cleared');
  }

  /**
   * Disconnect
   */
  async disconnect(): Promise<void> {
    this.stop();
    if (this.redis) {
      await this.redis.quit();
    }
    await this.fixCache.disconnect();
  }
}

// ============================================================
// SINGLETON INSTANCE
// ============================================================

let queueInstance: CorgeaRequestQueue | null = null;

export function getCorgeaRequestQueue(): CorgeaRequestQueue {
  if (!queueInstance) {
    queueInstance = new CorgeaRequestQueue();
  }
  return queueInstance;
}
