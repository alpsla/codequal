/**
 * Connection Resilience Manager
 * 
 * Centralized connection management with enhanced resilience for:
 * - DeepWiki API connections
 * - Redis connections
 * - Network interruption recovery
 * 
 * Fixes: BUG-079, BUG-081, BUG-086
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import Redis from 'ioredis';
import { EventEmitter } from 'events';

export interface ConnectionConfig {
  deepWiki?: {
    url: string;
    apiKey?: string;
    timeout?: number;
    maxRetries?: number;
  };
  redis?: {
    url: string;
    password?: string;
    maxRetries?: number;
    enableFallback?: boolean;
  };
  monitoring?: {
    enabled: boolean;
    alertThreshold?: number;
  };
}

export interface ConnectionHealth {
  deepWiki: 'healthy' | 'degraded' | 'offline';
  redis: 'healthy' | 'degraded' | 'offline';
  lastCheck: Date;
  errors: string[];
}

export class ConnectionResilienceManager extends EventEmitter {
  private axiosInstance?: AxiosInstance;
  private redis?: Redis;
  private config: ConnectionConfig;
  private health: ConnectionHealth;
  private memoryCache: Map<string, any> = new Map();
  private retryCounters: Map<string, number> = new Map();
  private circuitBreaker: Map<string, CircuitBreakerState> = new Map();
  
  constructor(config: ConnectionConfig) {
    super();
    this.config = config;
    this.health = {
      deepWiki: 'offline',
      redis: 'offline',
      lastCheck: new Date(),
      errors: []
    };
    
    this.initializeConnections();
  }
  
  /**
   * Initialize all connections with resilience patterns
   */
  private async initializeConnections() {
    // Initialize DeepWiki connection
    if (this.config.deepWiki) {
      this.initializeDeepWiki();
    }
    
    // Initialize Redis connection
    if (this.config.redis) {
      await this.initializeRedis();
    }
    
    // Start health monitoring
    this.startHealthMonitoring();
  }
  
  /**
   * Initialize DeepWiki API client with circuit breaker
   */
  private initializeDeepWiki() {
    const config = this.config.deepWiki!;
    
    this.axiosInstance = axios.create({
      baseURL: config.url,
      timeout: config.timeout || 120000,
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey && { 'Authorization': `Bearer ${config.apiKey}` })
      }
    });
    
    // Add request interceptor for circuit breaker
    this.axiosInstance.interceptors.request.use(
      (config) => {
        const state = this.getCircuitBreakerState('deepwiki');
        if (state.status === 'open') {
          throw new Error('Circuit breaker is open - DeepWiki unavailable');
        }
        return config;
      },
      (error) => Promise.reject(error)
    );
    
    // Add response interceptor for retry logic
    this.axiosInstance.interceptors.response.use(
      (response) => {
        this.recordSuccess('deepwiki');
        return response;
      },
      async (error) => {
        return this.handleDeepWikiError(error);
      }
    );
    
    this.health.deepWiki = 'healthy';
    console.log('✅ DeepWiki connection initialized with resilience patterns');
  }
  
  /**
   * Initialize Redis with fallback to memory cache
   */
  private async initializeRedis(): Promise<void> {
    const config = this.config.redis!;
    
    return new Promise((resolve) => {
      this.redis = new Redis(config.url, {
        password: config.password,
        connectTimeout: 10000,
        commandTimeout: 10000,
        maxRetriesPerRequest: config.maxRetries || 3,
        retryStrategy: (times: number) => {
          if (times > 3) {
            console.log('⚠️ Redis unavailable, using memory cache fallback');
            this.health.redis = 'offline';
            return null;
          }
          return Math.min(times * 200, 3000);
        },
        reconnectOnError: (err) => {
          return err.message.includes('ECONNRESET') || 
                 err.message.includes('ETIMEDOUT');
        },
        lazyConnect: true,
        enableOfflineQueue: false // Don't queue when offline
      });
      
      this.redis.on('connect', () => {
        this.health.redis = 'healthy';
        console.log('✅ Redis connected');
        resolve();
      });
      
      this.redis.on('error', (err) => {
        this.health.redis = 'degraded';
        this.health.errors.push(`Redis: ${err.message}`);
        
        if (this.config.redis?.enableFallback) {
          console.log('⚠️ Redis error, falling back to memory cache');
        }
      });
      
      this.redis.on('close', () => {
        this.health.redis = 'offline';
      });
      
      // Try to connect
      this.redis.connect().catch(() => {
        console.log('⚠️ Redis connection failed, using memory cache only');
        this.health.redis = 'offline';
        resolve();
      });
      
      // Timeout connection attempt
      setTimeout(() => resolve(), 5000);
    });
  }
  
  /**
   * Execute DeepWiki API call with resilience
   */
  async callDeepWiki<T>(
    path: string,
    data: any,
    options?: AxiosRequestConfig
  ): Promise<T> {
    const maxRetries = this.config.deepWiki?.maxRetries || 5;
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Check circuit breaker
        const breaker = this.getCircuitBreakerState('deepwiki');
        if (breaker.status === 'open') {
          if (Date.now() - breaker.lastFailure > 30000) { // 30s cooldown
            breaker.status = 'half-open';
            breaker.attempts = 0;
          } else {
            throw new Error('Circuit breaker open - service unavailable');
          }
        }
        
        // Make the request
        const response = await this.axiosInstance!.post(path, data, {
          ...options,
          timeout: options?.timeout || 120000
        });
        
        // Success - reset circuit breaker
        this.recordSuccess('deepwiki');
        return response.data;
        
      } catch (error: any) {
        lastError = error;
        
        // Record failure
        this.recordFailure('deepwiki', error);
        
        // Check if retryable
        if (!this.isRetryableError(error) || attempt === maxRetries) {
          throw error;
        }
        
        // Calculate delay with exponential backoff
        const delay = Math.min(Math.pow(2, attempt - 1) * 1000, 10000);
        console.log(`⚠️ DeepWiki attempt ${attempt}/${maxRetries} failed, retrying in ${delay}ms...`);
        await this.delay(delay);
      }
    }
    
    throw lastError;
  }
  
  /**
   * Get data from cache with Redis fallback to memory
   */
  async getCached(key: string): Promise<any | null> {
    // Try Redis first if available
    if (this.redis && this.health.redis !== 'offline') {
      try {
        const cached = await this.redis.get(key);
        if (cached) return JSON.parse(cached);
      } catch (error) {
        console.log('⚠️ Redis read failed, checking memory cache');
      }
    }
    
    // Fall back to memory cache
    return this.memoryCache.get(key) || null;
  }
  
  /**
   * Set data in cache with automatic fallback
   */
  async setCached(key: string, value: any, ttl = 3600): Promise<void> {
    const serialized = JSON.stringify(value);
    
    // Always store in memory cache
    this.memoryCache.set(key, value);
    
    // Expire from memory after TTL
    setTimeout(() => this.memoryCache.delete(key), ttl * 1000);
    
    // Try to store in Redis if available
    if (this.redis && this.health.redis !== 'offline') {
      try {
        await this.redis.setex(key, ttl, serialized);
      } catch (error) {
        console.log('⚠️ Redis write failed, data cached in memory only');
      }
    }
  }
  
  /**
   * Handle DeepWiki API errors with intelligent retry
   */
  private async handleDeepWikiError(error: any): Promise<any> {
    const config = error.config;
    const retryCount = this.getRetryCount('deepwiki');
    
    if (!this.isRetryableError(error) || retryCount >= 5) {
      throw error;
    }
    
    // Increment retry counter
    this.incrementRetryCount('deepwiki');
    
    // Wait with exponential backoff
    const delay = Math.min(Math.pow(2, retryCount) * 1000, 10000);
    await this.delay(delay);
    
    // Retry the request
    return this.axiosInstance!.request(config);
  }
  
  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    const retryableCodes = ['ECONNRESET', 'EPIPE', 'ETIMEDOUT', 'ECONNREFUSED', 'ENOTFOUND'];
    const retryableStatus = [500, 502, 503, 504, 429];
    
    return retryableCodes.includes(error.code) ||
           retryableStatus.includes(error.response?.status) ||
           error.message?.includes('socket hang up') ||
           error.message?.includes('timeout');
  }
  
  /**
   * Circuit breaker state management
   */
  private getCircuitBreakerState(service: string): CircuitBreakerState {
    if (!this.circuitBreaker.has(service)) {
      this.circuitBreaker.set(service, {
        status: 'closed',
        failures: 0,
        lastFailure: 0,
        attempts: 0
      });
    }
    return this.circuitBreaker.get(service)!;
  }
  
  private recordSuccess(service: string) {
    const state = this.getCircuitBreakerState(service);
    state.failures = 0;
    state.status = 'closed';
    this.resetRetryCount(service);
  }
  
  private recordFailure(service: string, error: any) {
    const state = this.getCircuitBreakerState(service);
    state.failures++;
    state.lastFailure = Date.now();
    
    if (state.failures >= 5) {
      state.status = 'open';
      console.log(`⚠️ Circuit breaker opened for ${service}`);
      this.emit('circuit-breaker-open', { service, error });
    }
  }
  
  /**
   * Health monitoring
   */
  private startHealthMonitoring() {
    setInterval(async () => {
      await this.checkHealth();
    }, 30000); // Check every 30 seconds
  }
  
  private async checkHealth() {
    const previousHealth = { ...this.health };
    
    // Check DeepWiki
    if (this.axiosInstance) {
      try {
        await this.axiosInstance.get('/health', { timeout: 5000 });
        this.health.deepWiki = 'healthy';
      } catch {
        this.health.deepWiki = 'degraded';
      }
    }
    
    // Check Redis
    if (this.redis) {
      try {
        await this.redis.ping();
        this.health.redis = 'healthy';
      } catch {
        this.health.redis = 'degraded';
      }
    }
    
    this.health.lastCheck = new Date();
    
    // Emit health change events
    if (previousHealth.deepWiki !== this.health.deepWiki) {
      this.emit('health-change', { service: 'deepwiki', status: this.health.deepWiki });
    }
    if (previousHealth.redis !== this.health.redis) {
      this.emit('health-change', { service: 'redis', status: this.health.redis });
    }
  }
  
  /**
   * Get current health status
   */
  getHealth(): ConnectionHealth {
    return { ...this.health };
  }
  
  /**
   * Retry counter management
   */
  private getRetryCount(key: string): number {
    return this.retryCounters.get(key) || 0;
  }
  
  private incrementRetryCount(key: string): void {
    this.retryCounters.set(key, this.getRetryCount(key) + 1);
  }
  
  private resetRetryCount(key: string): void {
    this.retryCounters.delete(key);
  }
  
  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Cleanup connections
   */
  async cleanup(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
    }
    this.removeAllListeners();
    this.memoryCache.clear();
  }
}

interface CircuitBreakerState {
  status: 'closed' | 'open' | 'half-open';
  failures: number;
  lastFailure: number;
  attempts: number;
}

export default ConnectionResilienceManager;