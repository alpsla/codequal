# DeepWiki Chat Cache Integration Design
**Created: July 30, 2025**

## Overview

This document outlines the design for integrating the DeepWiki chat service with the Redis cache infrastructure, replacing the current Vector DB dependency for report retrieval.

## Current Architecture

```
User Query → DeepWiki Chat Service → Vector DB (reports) → Response
```

## New Architecture

```
User Query → DeepWiki Chat Service → Redis Cache → Response
                                          ↓ (cache miss)
                                    DeepWiki Analysis → Cache → Response
```

## Integration Components

### 1. DeepWikiChatService Updates

```typescript
interface DeepWikiChatServiceConfig {
  cacheService: RedisCacheService;
  deepWikiManager: DeepWikiManager;
  cacheTTL: number; // 30 minutes default
}

class DeepWikiChatService {
  private cache: RedisCacheService;
  private deepWikiManager: DeepWikiManager;
  
  async getRepositoryContext(repoUrl: string, prId?: string): Promise<DeepWikiReport> {
    // 1. Check cache first
    const cacheKey = prId || repoUrl;
    const cachedReport = await this.cache.getReport(cacheKey);
    
    if (cachedReport) {
      return cachedReport;
    }
    
    // 2. Cache miss - trigger DeepWiki analysis
    const report = await this.deepWikiManager.analyzeRepository(repoUrl, {
      branch: prId ? `pr-${prId}` : 'main'
    });
    
    // 3. Store in cache
    await this.cache.setReport(cacheKey, report, this.cacheTTL);
    
    return report;
  }
  
  async chatWithRepository(
    repoUrl: string,
    message: string,
    history?: ChatMessage[]
  ): Promise<ChatResponse> {
    // Get repository context from cache
    const context = await this.getRepositoryContext(repoUrl);
    
    // Use context to enhance the chat response
    return this.processChat(context, message, history);
  }
}
```

### 2. Cache Key Strategy

```typescript
// Cache keys for different scenarios
const cacheKeys = {
  // Repository analysis (main branch)
  repository: (repoUrl: string) => `repo:${repoUrl}`,
  
  // PR analysis
  pullRequest: (repoUrl: string, prId: string) => `pr:${repoUrl}:${prId}`,
  
  // Branch analysis  
  branch: (repoUrl: string, branch: string) => `branch:${repoUrl}:${branch}`,
  
  // Comparison analysis
  comparison: (repoUrl: string, base: string, head: string) => 
    `compare:${repoUrl}:${base}...${head}`
};
```

### 3. Cache Miss Regeneration

```typescript
class CacheMissHandler {
  constructor(
    private cache: RedisCacheService,
    private deepWikiManager: DeepWikiManager,
    private logger: Logger
  ) {}
  
  async handleCacheMiss(key: string, options: AnalysisOptions): Promise<DeepWikiReport> {
    try {
      // 1. Log cache miss
      this.logger.info(`Cache miss for key: ${key}`);
      
      // 2. Check if analysis is already in progress
      const lockKey = `lock:${key}`;
      const isLocked = await this.cache.exists(lockKey);
      
      if (isLocked) {
        // Wait for ongoing analysis
        return this.waitForAnalysis(key);
      }
      
      // 3. Acquire lock
      await this.cache.set(lockKey, '1', 300); // 5 min lock
      
      // 4. Trigger analysis
      const report = await this.deepWikiManager.analyzeRepository(
        options.repoUrl,
        options
      );
      
      // 5. Store in cache
      await this.cache.setReport(key, report);
      
      // 6. Release lock
      await this.cache.delete(lockKey);
      
      return report;
    } catch (error) {
      // Ensure lock is released on error
      await this.cache.delete(`lock:${key}`);
      throw error;
    }
  }
}
```

### 4. Cache Warming Strategy

```typescript
class CacheWarmer {
  constructor(
    private cache: RedisCacheService,
    private deepWikiManager: DeepWikiManager
  ) {}
  
  // Warm cache for active PRs
  async warmActivePRs(repos: string[]): Promise<void> {
    for (const repo of repos) {
      const prs = await this.getActivePRs(repo);
      
      for (const pr of prs) {
        const key = cacheKeys.pullRequest(repo, pr.id);
        const exists = await this.cache.isReportAvailable(key);
        
        if (!exists) {
          // Queue for background analysis
          await this.queueAnalysis(repo, pr);
        }
      }
    }
  }
  
  // Pre-warm popular repositories
  async warmPopularRepos(): Promise<void> {
    const popularRepos = await this.getPopularRepos();
    
    for (const repo of popularRepos) {
      const key = cacheKeys.repository(repo.url);
      const exists = await this.cache.isReportAvailable(key);
      
      if (!exists) {
        await this.queueAnalysis(repo.url);
      }
    }
  }
}
```

## Implementation Steps

1. **Update DeepWikiChatService**
   - Add RedisCacheService dependency
   - Implement getRepositoryContext method
   - Update chat methods to use cache

2. **Create CacheMissHandler**
   - Implement regeneration logic
   - Add locking mechanism
   - Handle concurrent requests

3. **Implement CacheWarmer**
   - Create warming strategies
   - Add background job support
   - Monitor cache hit rates

4. **Update API Endpoints**
   - Modify chat endpoints to use new service
   - Add cache status endpoints
   - Implement cache management APIs

## Performance Targets

- **Cache Hit**: <50ms response time
- **Cache Miss**: <5s for analysis trigger
- **TTL**: 30 minutes for PR reports
- **Hit Rate**: >80% for active PRs

## Migration Plan

1. **Phase 1**: Deploy cache-enabled chat service
2. **Phase 2**: Monitor and tune cache performance
3. **Phase 3**: Deprecate Vector DB report storage
4. **Phase 4**: Clean Vector DB of report data

## Monitoring

```typescript
interface CacheMetrics {
  hitRate: number;
  missRate: number;
  avgHitLatency: number;
  avgMissLatency: number;
  totalRequests: number;
  cacheSize: number;
  evictions: number;
}
```

## Error Handling

- Cache connection failures → Fallback to direct DeepWiki calls
- Analysis failures → Return cached stale data if available
- Lock timeouts → Force unlock after 5 minutes
- Memory limits → LRU eviction policy