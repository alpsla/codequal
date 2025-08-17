/**
 * DeepWiki Context Manager Service
 * Manages repository context for chat interactions and persistent analysis
 */

import { createClient, RedisClientType } from 'redis';
import axios from 'axios';
import { ILogger } from '../../services/interfaces/logger.interface';
import { 
  ContextMetadata, 
  ContextStatus, 
  RepositoryContext,
  ContextCheckResult 
} from '../interfaces/context.interface';

export class DeepWikiContextManager {
  private redisClient?: RedisClientType;
  private deepwikiUrl: string;
  private deepwikiApiKey: string;
  private logger: ILogger;
  
  // Context expiration times
  private readonly CONTEXT_TTL = 3600; // 1 hour in seconds
  private readonly CONTEXT_CHECK_INTERVAL = 300; // 5 minutes
  
  constructor(logger: ILogger) {
    this.logger = logger;
    this.deepwikiUrl = process.env.DEEPWIKI_API_URL || 'http://localhost:8001';
    this.deepwikiApiKey = process.env.DEEPWIKI_API_KEY || 'dw-key-e48329b6c05b4a36a18d65af21ac3c2f';
    
    this.initializeRedis();
  }
  
  private async initializeRedis(): Promise<void> {
    if (process.env.REDIS_URL) {
      try {
        this.redisClient = createClient({ url: process.env.REDIS_URL });
        this.redisClient.on('error', (err) => {
          this.logger.warn('Redis Client Error', { error: err });
        });
        await this.redisClient.connect();
        this.logger.info('Redis connected for context management');
      } catch (error) {
        this.logger.warn('Failed to connect to Redis, using in-memory fallback', { error });
      }
    }
  }
  
  /**
   * Check if context is available for a repository
   */
  async checkContextAvailable(repositoryUrl: string): Promise<ContextCheckResult> {
    try {
      // Check local cache first
      const cachedStatus = await this.getCachedContextStatus(repositoryUrl);
      if (cachedStatus && cachedStatus.status === 'active') {
        return {
          available: true,
          status: 'active',
          metadata: cachedStatus.metadata
        };
      }
      
      // Check with DeepWiki API
      const apiStatus = await this.checkDeepWikiContext(repositoryUrl);
      
      // Update cache
      if (apiStatus.available) {
        await this.cacheContextStatus(repositoryUrl, apiStatus);
      }
      
      return apiStatus;
    } catch (error) {
      this.logger.error('Failed to check context availability', { repositoryUrl, error });
      return {
        available: false,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Create context for a repository by triggering analysis
   */
  async createContext(repositoryUrl: string, options?: {
    branch?: string;
    prNumber?: number;
    forceRefresh?: boolean;
  }): Promise<ContextMetadata> {
    try {
      this.logger.info('Creating context for repository', { repositoryUrl, options });
      
      // Check if context already exists and not forcing refresh
      if (!options?.forceRefresh) {
        const existing = await this.checkContextAvailable(repositoryUrl);
        if (existing.available && existing.metadata) {
          this.logger.info('Using existing context', { repositoryUrl });
          return existing.metadata;
        }
      }
      
      // Trigger DeepWiki analysis to create context
      const response = await axios.post(
        `${this.deepwikiUrl}/chat/completions/stream`,
        {
          repo_url: repositoryUrl,
          messages: [{
            role: 'system',
            content: 'Initialize repository context for analysis'
          }, {
            role: 'user',
            content: `Analyze the repository structure and prepare context for future queries. Branch: ${options?.branch || 'main'}`
          }],
          stream: false,
          provider: 'openrouter',
          model: 'openai/gpt-4o',
          temperature: 0.1,
          max_tokens: 1000,
          response_format: { type: "json_object" }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.deepwikiApiKey}`
          },
          timeout: 120000 // 2 minutes for initial analysis
        }
      );
      
      const metadata: ContextMetadata = {
        repositoryUrl,
        contextId: `ctx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + this.CONTEXT_TTL * 1000),
        status: 'active',
        branch: options?.branch || 'main',
        analysisDepth: 'comprehensive'
      };
      
      // Cache the context metadata
      await this.cacheContextStatus(repositoryUrl, {
        available: true,
        status: 'active',
        metadata
      });
      
      this.logger.info('Context created successfully', { repositoryUrl, contextId: metadata.contextId });
      return metadata;
      
    } catch (error) {
      this.logger.error('Failed to create context', { repositoryUrl, error });
      throw new Error(`Failed to create context: ${error}`);
    }
  }
  
  /**
   * Refresh context for a repository
   */
  async refreshContext(repositoryUrl: string): Promise<ContextMetadata> {
    this.logger.info('Refreshing context', { repositoryUrl });
    return this.createContext(repositoryUrl, { forceRefresh: true });
  }
  
  /**
   * Get context metadata for a repository
   */
  async getContextMetadata(repositoryUrl: string): Promise<ContextMetadata | null> {
    const result = await this.checkContextAvailable(repositoryUrl);
    return result.metadata || null;
  }
  
  /**
   * Check DeepWiki API for context availability
   */
  private async checkDeepWikiContext(repositoryUrl: string): Promise<ContextCheckResult> {
    try {
      // Try a simple query to check if context exists
      const response = await axios.post(
        `${this.deepwikiUrl}/chat/completions/stream`,
        {
          repo_url: repositoryUrl,
          messages: [{
            role: 'user',
            content: 'What is the main programming language used in this repository?'
          }],
          stream: false,
          provider: 'openrouter',
          model: 'openai/gpt-4o',
          temperature: 0.1,
          max_tokens: 100
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.deepwikiApiKey}`
          },
          timeout: 10000 // Short timeout for context check
        }
      );
      
      // Check if response indicates context is available
      const responseText = response.data?.choices?.[0]?.message?.content || '';
      
      // If we get a meaningful response, context exists
      if (responseText && !responseText.includes('not analyzed') && !responseText.includes('no context')) {
        return {
          available: true,
          status: 'active',
          metadata: {
            repositoryUrl,
            contextId: `ctx_existing_${Date.now()}`,
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + this.CONTEXT_TTL * 1000),
            status: 'active',
            branch: 'main',
            analysisDepth: 'comprehensive'
          }
        };
      }
      
      return {
        available: false,
        status: 'not_found'
      };
      
    } catch (error: any) {
      // If we get a specific error about missing context, it's not available
      if (error.response?.data?.detail?.includes('context') || 
          error.response?.data?.error?.includes('not analyzed')) {
        return {
          available: false,
          status: 'not_found'
        };
      }
      
      // Other errors
      return {
        available: false,
        status: 'error',
        error: error.message
      };
    }
  }
  
  /**
   * Cache context status in Redis
   */
  private async cacheContextStatus(
    repositoryUrl: string, 
    status: ContextCheckResult
  ): Promise<void> {
    if (!this.redisClient) return;
    
    try {
      const key = `deepwiki:context:${repositoryUrl}`;
      await this.redisClient.setEx(
        key,
        this.CONTEXT_TTL,
        JSON.stringify(status)
      );
    } catch (error) {
      this.logger.warn('Failed to cache context status', { error });
    }
  }
  
  /**
   * Get cached context status from Redis
   */
  private async getCachedContextStatus(
    repositoryUrl: string
  ): Promise<ContextCheckResult | null> {
    if (!this.redisClient) return null;
    
    try {
      const key = `deepwiki:context:${repositoryUrl}`;
      const cached = await this.redisClient.get(key);
      
      if (cached && typeof cached === 'string') {
        return JSON.parse(cached);
      }
    } catch (error) {
      this.logger.warn('Failed to get cached context status', { error });
    }
    
    return null;
  }
  
  /**
   * Monitor context expiration and refresh if needed
   */
  async monitorContextExpiration(repositoryUrls: string[]): Promise<void> {
    setInterval(async () => {
      for (const repoUrl of repositoryUrls) {
        const metadata = await this.getContextMetadata(repoUrl);
        
        if (metadata && metadata.expiresAt) {
          const timeUntilExpiry = metadata.expiresAt.getTime() - Date.now();
          
          // Refresh if less than 10 minutes until expiry
          if (timeUntilExpiry < 600000) {
            this.logger.info('Context expiring soon, refreshing', { 
              repositoryUrl: repoUrl,
              expiresIn: timeUntilExpiry 
            });
            await this.refreshContext(repoUrl);
          }
        }
      }
    }, this.CONTEXT_CHECK_INTERVAL * 1000);
  }
  
  /**
   * Clear context for a repository
   */
  async clearContext(repositoryUrl: string): Promise<void> {
    if (this.redisClient) {
      try {
        const key = `deepwiki:context:${repositoryUrl}`;
        await this.redisClient.del(key);
        this.logger.info('Context cleared', { repositoryUrl });
      } catch (error) {
        this.logger.warn('Failed to clear context', { error });
      }
    }
  }
}