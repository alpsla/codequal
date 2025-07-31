import { RedisCacheService, DeepWikiReport } from './cache/RedisCacheService';
import { Logger } from '../utils/logger';
import { DeepWikiClient, RepositoryContext, ChatMessage } from '../deepwiki/DeepWikiClient';
import { DeepWikiChatService, ChatResponse } from '../deepwiki/DeepWikiChatService';

export interface CacheIntegratedChatConfig {
  cacheService: RedisCacheService;
  deepWikiClient: DeepWikiClient;
  cacheTTL?: number; // seconds, default 1800 (30 minutes)
  logger: Logger;
}

/**
 * DeepWiki Chat Service with Redis Cache Integration
 * Replaces Vector DB dependency with high-performance cache
 */
export class DeepWikiChatCacheService {
  private cache: RedisCacheService;
  private chatService: DeepWikiChatService;
  private logger: Logger;
  private cacheTTL: number;
  private deepWikiClient: DeepWikiClient;

  constructor(config: CacheIntegratedChatConfig) {
    this.cache = config.cacheService;
    this.deepWikiClient = config.deepWikiClient;
    this.chatService = new DeepWikiChatService(config.deepWikiClient, config.logger);
    this.logger = config.logger;
    this.cacheTTL = config.cacheTTL || 1800; // 30 minutes default
  }

  /**
   * Get repository context from cache or trigger analysis
   */
  async getRepositoryContext(
    repoUrl: string, 
    prId?: string,
    branch?: string
  ): Promise<DeepWikiReport | null> {
    const cacheKey = this.generateCacheKey(repoUrl, prId, branch);
    
    try {
      // 1. Check cache first
      this.logger.info(`Checking cache for key: ${cacheKey}`);
      const cachedReport = await this.cache.getReport(cacheKey);
      
      if (cachedReport) {
        this.logger.info(`Cache hit for ${cacheKey}`);
        return cachedReport;
      }
      
      // 2. Cache miss - check if analysis is in progress
      this.logger.info(`Cache miss for ${cacheKey}`);
      const lockKey = `lock:${cacheKey}`;
      const isLocked = await this.cache.exists(lockKey);
      
      if (isLocked) {
        this.logger.info(`Analysis in progress for ${cacheKey}, waiting...`);
        return this.waitForAnalysis(cacheKey);
      }
      
      // 3. Acquire lock and trigger analysis
      await this.cache.set(lockKey, '1', 300); // 5 min lock
      
      try {
        this.logger.info(`Triggering DeepWiki analysis for ${repoUrl}`);
        const report = await this.triggerDeepWikiAnalysis(repoUrl, prId, branch);
        
        // 4. Store in cache
        await this.cache.setReport(cacheKey, report, this.cacheTTL);
        this.logger.info(`Stored report in cache with key: ${cacheKey}`);
        
        // 5. Release lock
        await this.cache.delete(lockKey);
        
        return report;
      } catch (error) {
        // Ensure lock is released on error
        await this.cache.delete(lockKey);
        throw error;
      }
    } catch (error) {
      this.logger.error(`Error getting repository context: ${error}`);
      throw error;
    }
  }

  /**
   * Chat with repository using cached context
   */
  async chatWithRepository(
    repoUrl: string,
    message: string,
    history?: ChatMessage[],
    prId?: string
  ): Promise<ChatResponse> {
    try {
      // Get repository context from cache
      const context = await this.getRepositoryContext(repoUrl, prId);
      
      if (!context) {
        throw new Error('Failed to get repository context');
      }
      
      // Create repository context for chat
      const repository: RepositoryContext = this.parseRepositoryUrl(repoUrl);
      
      // Use the chat service with context
      const response = await this.chatService.sendMessage(
        repository,
        message,
        history,
        {
          // Add repository analysis context to enhance responses
          systemPromptAddition: `
Repository Analysis Context:
Main Branch: ${context.mainBranchAnalysis.summary}
Scores: ${JSON.stringify(context.mainBranchAnalysis.scores, null, 2)}

Feature Branch: ${context.featureBranchAnalysis.summary}
Scores: ${JSON.stringify(context.featureBranchAnalysis.scores, null, 2)}

Comparison:
${JSON.stringify(context.comparison, null, 2)}

Use this context to provide accurate and specific answers about the repository.
          `
        } as any
      );
      
      return response;
    } catch (error) {
      this.logger.error(`Error in chat: ${error}`);
      throw error;
    }
  }

  /**
   * Generate cache key based on repository and context
   */
  private generateCacheKey(repoUrl: string, prId?: string, branch?: string): string {
    if (prId) {
      return `pr:${repoUrl}:${prId}`;
    }
    if (branch && branch !== 'main' && branch !== 'master') {
      return `branch:${repoUrl}:${branch}`;
    }
    return `repo:${repoUrl}`;
  }

  /**
   * Wait for ongoing analysis to complete
   */
  private async waitForAnalysis(
    cacheKey: string, 
    maxWaitTime = 60000
  ): Promise<DeepWikiReport | null> {
    const startTime = Date.now();
    const checkInterval = 2000; // Check every 2 seconds
    
    while (Date.now() - startTime < maxWaitTime) {
      await this.sleep(checkInterval);
      
      const report = await this.cache.getReport(cacheKey);
      if (report) {
        return report;
      }
      
      // Check if lock still exists
      const lockKey = `lock:${cacheKey}`;
      const isLocked = await this.cache.exists(lockKey);
      if (!isLocked) {
        // Lock released but no report - analysis might have failed
        return null;
      }
    }
    
    this.logger.warn(`Timeout waiting for analysis: ${cacheKey}`);
    return null;
  }

  /**
   * Trigger DeepWiki analysis
   */
  private async triggerDeepWikiAnalysis(
    repoUrl: string,
    prId?: string,
    branch?: string
  ): Promise<DeepWikiReport> {
    // Parse repository information
    const repository = this.parseRepositoryUrl(repoUrl);
    
    // Trigger analysis via DeepWiki client
    const analysisOptions = {
      branch: branch || (prId ? `pr-${prId}` : 'main'),
      includePRAnalysis: !!prId
    };
    
    // Note: This is a placeholder - actual DeepWiki API call would go here
    // In real implementation, this would call the DeepWiki analysis service
    const mockReport: DeepWikiReport = {
      prId: prId || '',
      repositoryUrl: repoUrl,
      mainBranchAnalysis: {
        branch: 'main',
        commit: 'mock-commit-main',
        analyzedAt: new Date().toISOString(),
        scores: {
          overall: 85,
          security: 90,
          performance: 80,
          maintainability: 85
        },
        patterns: ['MVC', 'Repository Pattern'],
        summary: 'Main branch analysis completed'
      },
      featureBranchAnalysis: {
        branch: analysisOptions.branch,
        commit: 'mock-commit-feature',
        analyzedAt: new Date().toISOString(),
        scores: {
          overall: 87,
          security: 92,
          performance: 82,
          maintainability: 86
        },
        patterns: ['MVC', 'Repository Pattern', 'Observer Pattern'],
        summary: 'Feature branch analysis completed'
      },
      comparison: {
        addedPatterns: ['Observer Pattern'],
        removedPatterns: [],
        scoreChanges: {
          overall: { before: 85, after: 87, change: 2 },
          security: { before: 90, after: 92, change: 2 },
          performance: { before: 80, after: 82, change: 2 },
          maintainability: { before: 85, after: 86, change: 1 }
        },
        recommendations: [
          'Good improvement in security score',
          'Performance slightly improved',
          'New Observer Pattern implementation looks good'
        ]
      },
      timestamp: new Date().toISOString()
    };
    
    return mockReport;
  }

  /**
   * Parse repository URL to extract owner and repo name
   */
  private parseRepositoryUrl(repoUrl: string): RepositoryContext {
    // Handle various URL formats
    const patterns = [
      /github\.com\/([^/]+)\/([^/]+)/,
      /gitlab\.com\/([^/]+)\/([^/]+)/,
      /^([^/]+)\/([^/]+)$/
    ];
    
    for (const pattern of patterns) {
      const match = repoUrl.match(pattern);
      if (match) {
        return {
          owner: match[1],
          repo: match[2].replace(/\.git$/, ''),
          repoType: repoUrl.includes('gitlab') ? 'gitlab' : 'github'
        };
      }
    }
    
    throw new Error(`Invalid repository URL: ${repoUrl}`);
  }

  /**
   * Helper sleep function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Warm cache for active PRs
   */
  async warmCache(repositories: string[], prIds?: string[]): Promise<void> {
    this.logger.info(`Warming cache for ${repositories.length} repositories`);
    
    const warmingPromises = [];
    
    for (const repo of repositories) {
      // Warm main branch
      warmingPromises.push(
        this.getRepositoryContext(repo).catch(err => 
          this.logger.error(`Failed to warm cache for ${repo}: ${err}`)
        )
      );
      
      // Warm PRs if provided
      if (prIds) {
        for (const prId of prIds) {
          warmingPromises.push(
            this.getRepositoryContext(repo, prId).catch(err =>
              this.logger.error(`Failed to warm cache for ${repo} PR ${prId}: ${err}`)
            )
          );
        }
      }
    }
    
    await Promise.all(warmingPromises);
    this.logger.info('Cache warming completed');
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    size: number;
    keys: string[];
    hitRate?: number;
  }> {
    const keys = await this.cache.getAllKeys();
    
    return {
      size: keys.length,
      keys: keys.filter(k => !k.startsWith('lock:')),
      // Hit rate would be calculated from metrics in production
    };
  }
}