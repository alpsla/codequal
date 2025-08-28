/**
 * Cache Integration Example
 * 
 * Shows how to integrate SmartCacheManager with the analysis pipeline
 * to prevent stale data issues
 */

import { SmartCacheManager } from './smart-cache-manager';
import { DirectDeepWikiApiWithLocationV4 } from './direct-deepwiki-api-with-location-v4';
import Redis from 'ioredis';

export class CachedAnalysisService {
  private cacheManager: SmartCacheManager;
  private deepWikiApi: DirectDeepWikiApiWithLocationV4;
  private redis?: Redis;
  
  constructor() {
    // Initialize Redis (optional)
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 3,
      lazyConnect: true
    });
    
    // Initialize cache manager with smart strategies
    this.cacheManager = new SmartCacheManager(this.redis, {
      clearAfterDelivery: true,     // Clear immediately after report sent
      ttl: 300,                     // 5 minutes for quick re-runs
      invalidateOnError: true,      // Don't cache failed analyses
      keepSuccessfulOnly: true,     // Only cache good data
      maxCacheSize: 50              // Limit memory usage
    });
    
    // Initialize DeepWiki API
    this.deepWikiApi = new DirectDeepWikiApiWithLocationV4();
  }
  
  /**
   * Analyze repository with smart caching
   */
  async analyzeRepository(
    repoUrl: string,
    options?: {
      branch?: string;
      prNumber?: number;
      useCache?: boolean;
      forceRefresh?: boolean;
    }
  ): Promise<any> {
    const branch = options?.branch || 'main';
    const useCache = options?.useCache ?? true;
    const forceRefresh = options?.forceRefresh ?? false;
    
    // Generate cache key
    const cacheKey = this.cacheManager.generateKey(repoUrl, branch);
    const analysisId = `analysis-${Date.now()}`;
    
    console.log(`\n🔍 Starting analysis ${analysisId}`);
    console.log(`📦 Cache strategy: ${useCache ? 'enabled' : 'disabled'}, force refresh: ${forceRefresh}`);
    
    try {
      // Step 1: Check cache (unless force refresh)
      if (useCache && !forceRefresh) {
        const cached = await this.cacheManager.get(cacheKey);
        if (cached) {
          console.log(`✅ Using cached analysis (key: ${cacheKey})`);
          
          // Still mark as delivered since we're returning it
          await this.cacheManager.markDelivered(cacheKey);
          return cached;
        }
      }
      
      // Step 2: Clear old cache for this repo if force refresh
      if (forceRefresh) {
        console.log(`🗑️ Force refresh: clearing old cache for ${repoUrl}`);
        await this.cacheManager.clearRepository(repoUrl, branch);
      }
      
      // Step 3: Run analysis
      console.log(`🚀 Running fresh analysis...`);
      const result = await this.deepWikiApi.analyzeRepository(repoUrl, options);
      
      // Step 4: Cache successful result
      if (result && result.issues && result.issues.length > 0) {
        console.log(`💾 Caching successful analysis`);
        await this.cacheManager.set(cacheKey, result, {
          repoUrl,
          branch,
          analysisId,
          ttl: 300 // 5 minutes
        });
      } else {
        console.log(`⚠️ Not caching: empty or invalid result`);
      }
      
      return result;
      
    } catch (error) {
      console.error(`❌ Analysis failed: ${error}`);
      
      // Mark as failed to prevent caching bad data
      await this.cacheManager.markFailed(cacheKey, String(error));
      
      throw error;
    }
  }
  
  /**
   * Generate and deliver report
   */
  async generateReport(
    analysisResult: any,
    cacheKey?: string
  ): Promise<string> {
    console.log(`\n📄 Generating report...`);
    
    // Generate report (simplified example)
    const report = this.formatReport(analysisResult);
    
    // Mark as delivered and clear cache
    if (cacheKey) {
      console.log(`✅ Report delivered, clearing cache as per strategy`);
      await this.cacheManager.markDelivered(cacheKey);
    }
    
    return report;
  }
  
  /**
   * Analyze PR with dual branch caching
   */
  async analyzePullRequest(
    repoUrl: string,
    prNumber: number,
    options?: {
      clearAfterDelivery?: boolean;
    }
  ): Promise<{
    mainAnalysis: any;
    prAnalysis: any;
    comparison: any;
    report: string;
  }> {
    const clearAfter = options?.clearAfterDelivery ?? true;
    
    console.log(`\n🔀 Analyzing PR #${prNumber}`);
    
    // Generate cache keys for both branches
    const mainKey = this.cacheManager.generateKey(repoUrl, 'main');
    const prKey = this.cacheManager.generateKey(repoUrl, `pr-${prNumber}`);
    
    try {
      // Analyze both branches
      const [mainAnalysis, prAnalysis] = await Promise.all([
        this.analyzeRepository(repoUrl, { branch: 'main' }),
        this.analyzeRepository(repoUrl, { branch: `pull/${prNumber}/head` })
      ]);
      
      // Compare results
      const comparison = this.compareAnalyses(mainAnalysis, prAnalysis);
      
      // Generate report
      const report = await this.generateReport(comparison);
      
      // Clear cache after delivery if requested
      if (clearAfter) {
        console.log(`\n🗑️ Clearing cache after PR report delivery`);
        await Promise.all([
          this.cacheManager.markDelivered(mainKey),
          this.cacheManager.markDelivered(prKey)
        ]);
      }
      
      return {
        mainAnalysis,
        prAnalysis,
        comparison,
        report
      };
      
    } catch (error) {
      // Mark both as failed
      await Promise.all([
        this.cacheManager.markFailed(mainKey),
        this.cacheManager.markFailed(prKey)
      ]);
      
      throw error;
    }
  }
  
  /**
   * Get cache statistics
   */
  getCacheStats(): any {
    return this.cacheManager.getStats();
  }
  
  /**
   * Manual cache management
   */
  async clearCache(repoUrl?: string, branch?: string): Promise<void> {
    if (repoUrl) {
      await this.cacheManager.clearRepository(repoUrl, branch);
    } else {
      await this.cacheManager.clearAll();
    }
  }
  
  /**
   * Format report (simplified)
   */
  private formatReport(data: any): string {
    return `
# Analysis Report
Generated: ${new Date().toISOString()}

## Issues Found: ${data.issues?.length || 0}

${data.issues?.map((issue: any) => 
  `- ${issue.severity}: ${issue.title} (${issue.location?.file})`
).join('\n')}

## Scores
- Overall: ${data.scores?.overall || 0}
- Security: ${data.scores?.security || 0}
`;
  }
  
  /**
   * Compare analyses (simplified)
   */
  private compareAnalyses(main: any, pr: any): any {
    return {
      mainIssues: main.issues || [],
      prIssues: pr.issues || [],
      newIssues: pr.issues?.filter((i: any) => 
        !main.issues?.some((m: any) => m.title === i.title)
      ) || [],
      fixedIssues: main.issues?.filter((i: any) => 
        !pr.issues?.some((p: any) => p.title === i.title)
      ) || [],
      issues: pr.issues || []
    };
  }
}

// Usage example
export async function demonstrateCacheManagement() {
  const service = new CachedAnalysisService();
  
  console.log('🎯 Demonstrating Smart Cache Management\n');
  
  // Example 1: Normal analysis with caching
  console.log('1️⃣ First analysis - will be cached');
  const result1 = await service.analyzeRepository('https://github.com/sindresorhus/ky');
  
  // Example 2: Second analysis - uses cache
  console.log('\n2️⃣ Second analysis - should use cache');
  const result2 = await service.analyzeRepository('https://github.com/sindresorhus/ky');
  
  // Example 3: Force refresh
  console.log('\n3️⃣ Force refresh - ignores cache');
  const result3 = await service.analyzeRepository('https://github.com/sindresorhus/ky', {
    forceRefresh: true
  });
  
  // Example 4: PR analysis with auto-clear
  console.log('\n4️⃣ PR analysis - clears after delivery');
  const prResult = await service.analyzePullRequest(
    'https://github.com/sindresorhus/ky',
    700,
    { clearAfterDelivery: true }
  );
  
  // Example 5: Check cache stats
  console.log('\n5️⃣ Cache statistics:');
  const stats = service.getCacheStats();
  console.log(stats);
  
  // Example 6: Manual cache clear
  console.log('\n6️⃣ Manual cache clear');
  await service.clearCache('https://github.com/sindresorhus/ky');
  
  console.log('\n✅ Cache management demonstration complete!');
}

export default CachedAnalysisService;