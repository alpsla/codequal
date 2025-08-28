/**
 * Two-Branch Analysis Cache Manager
 * High-level cache management for the analysis system
 */

import { AnalysisCacheService } from './AnalysisCacheService';
import { 
  BranchAnalysisResult, 
  ToolResult, 
  ComparisonResult,
  PRAnalysisReport,
  CacheConfig
} from '../types';

export interface CacheManagerOptions extends CacheConfig {
  enableAutoCleanup?: boolean;
  cleanupInterval?: number; // in milliseconds
}

export class CacheManager {
  private cacheService: AnalysisCacheService;
  private cleanupTimer?: NodeJS.Timeout;
  
  // Cache hit/miss tracking for monitoring
  private stats = {
    branchHits: 0,
    branchMisses: 0,
    toolHits: 0,
    toolMisses: 0,
    comparisonHits: 0,
    comparisonMisses: 0
  };
  
  constructor(options: CacheManagerOptions = {}) {
    this.cacheService = new AnalysisCacheService(options);
    
    if (options.enableAutoCleanup) {
      const interval = options.cleanupInterval || 3600000; // Default 1 hour
      this.cleanupTimer = setInterval(() => this.performCleanup(), interval);
    }
  }
  
  /**
   * Get or compute branch analysis with caching
   */
  async getOrComputeBranchAnalysis(
    repo: string,
    branch: string,
    compute: () => Promise<BranchAnalysisResult>
  ): Promise<BranchAnalysisResult> {
    // Try to get from cache first
    const cached = await this.cacheService.getCachedBranchAnalysis(repo, branch);
    
    if (cached) {
      this.stats.branchHits++;
      console.log(`Cache hit for branch analysis: ${repo}/${branch}`);
      return cached;
    }
    
    // Cache miss, compute and cache
    this.stats.branchMisses++;
    console.log(`Cache miss for branch analysis: ${repo}/${branch}, computing...`);
    
    const result = await compute();
    await this.cacheService.cacheBranchAnalysis(repo, branch, result);
    
    return result;
  }
  
  /**
   * Get or compute tool result with caching
   */
  async getOrComputeToolResult(
    repo: string,
    branch: string,
    tool: string,
    compute: () => Promise<ToolResult>
  ): Promise<ToolResult> {
    // Try to get from cache first
    const cached = await this.cacheService.getCachedToolResult(repo, branch, tool);
    
    if (cached) {
      this.stats.toolHits++;
      console.log(`Cache hit for tool ${tool} on ${repo}/${branch}`);
      return cached;
    }
    
    // Cache miss, compute and cache
    this.stats.toolMisses++;
    console.log(`Cache miss for tool ${tool} on ${repo}/${branch}, computing...`);
    
    const result = await compute();
    await this.cacheService.cacheToolResult(repo, branch, tool, result);
    
    return result;
  }
  
  /**
   * Get or compute comparison result with caching
   */
  async getOrComputeComparisonResult(
    repo: string,
    prNumber: number,
    compute: () => Promise<ComparisonResult>
  ): Promise<ComparisonResult> {
    // Try to get from cache first
    const cached = await this.cacheService.getCachedComparisonResult(repo, prNumber);
    
    if (cached) {
      this.stats.comparisonHits++;
      console.log(`Cache hit for PR comparison: ${repo}#${prNumber}`);
      return cached;
    }
    
    // Cache miss, compute and cache
    this.stats.comparisonMisses++;
    console.log(`Cache miss for PR comparison: ${repo}#${prNumber}, computing...`);
    
    const result = await compute();
    await this.cacheService.cacheComparisonResult(repo, prNumber, result);
    
    return result;
  }
  
  /**
   * Batch get tool results for multiple tools
   */
  async getBatchToolResults(
    repo: string,
    branch: string,
    tools: string[]
  ): Promise<Map<string, ToolResult | null>> {
    const keys = tools.map(tool => 
      this.cacheService.generateCacheKey('tool', { repo, branch, tool })
    );
    
    const results = await this.cacheService.mget<ToolResult>(keys);
    const resultMap = new Map<string, ToolResult | null>();
    
    tools.forEach((tool, index) => {
      resultMap.set(tool, results[index]);
      if (results[index]) {
        this.stats.toolHits++;
      } else {
        this.stats.toolMisses++;
      }
    });
    
    return resultMap;
  }
  
  /**
   * Cache multiple tool results at once
   */
  async cacheBatchToolResults(
    repo: string,
    branch: string,
    results: Map<string, ToolResult>
  ): Promise<void> {
    const entries = Array.from(results.entries()).map(([tool, result]) => ({
      key: this.cacheService.generateCacheKey('tool', { repo, branch, tool }),
      data: result,
      ttl: 7 * 24 * 3600 // 7 days for tool results
    }));
    
    await this.cacheService.mset(entries);
  }
  
  /**
   * Cache complete PR analysis report
   */
  async cachePRReport(
    repo: string,
    prNumber: number,
    report: PRAnalysisReport
  ): Promise<void> {
    const key = this.cacheService.generateCacheKey('comparison', { repo, prNumber });
    
    // Cache the full report with short TTL (5 minutes)
    await this.cacheService.set(key + ':report', report, 300);
    
    // Also cache the comparison result separately with standard TTL
    const comparison: ComparisonResult = {
      newIssues: report.newIssues,
      fixedIssues: report.fixedIssues,
      unchangedIssues: report.unchangedIssues,
      metrics: report.metrics
    };
    
    await this.cacheService.cacheComparisonResult(repo, prNumber, comparison);
  }
  
  /**
   * Get cached PR report
   */
  async getCachedPRReport(
    repo: string,
    prNumber: number
  ): Promise<PRAnalysisReport | null> {
    const key = this.cacheService.generateCacheKey('comparison', { repo, prNumber });
    return await this.cacheService.get<PRAnalysisReport>(key + ':report');
  }
  
  /**
   * Invalidate all cache for a repository
   */
  async invalidateRepository(repoUrl: string): Promise<void> {
    console.log(`Invalidating all cache for repository: ${repoUrl}`);
    await this.cacheService.invalidateRepo(repoUrl);
  }
  
  /**
   * Invalidate cache for a specific branch
   */
  async invalidateBranch(repo: string, branch: string): Promise<void> {
    const key = this.cacheService.generateCacheKey('branch', { repo, branch });
    await this.cacheService.set(key, null, 0); // Set with 0 TTL to expire immediately
  }
  
  /**
   * Get cache statistics
   */
  getStatistics() {
    const cacheMetrics = this.cacheService.getMetrics();
    
    return {
      ...this.stats,
      totalHits: this.stats.branchHits + this.stats.toolHits + this.stats.comparisonHits,
      totalMisses: this.stats.branchMisses + this.stats.toolMisses + this.stats.comparisonMisses,
      hitRate: this.calculateHitRate(),
      cacheMetrics
    };
  }
  
  /**
   * Reset statistics
   */
  resetStatistics(): void {
    this.stats = {
      branchHits: 0,
      branchMisses: 0,
      toolHits: 0,
      toolMisses: 0,
      comparisonHits: 0,
      comparisonMisses: 0
    };
    
    this.cacheService.resetMetrics();
  }
  
  /**
   * Check if Redis is connected
   */
  isRedisConnected(): boolean {
    return this.cacheService.isRedisConnected();
  }
  
  /**
   * Clear all cache
   */
  async clearAll(): Promise<void> {
    console.log('Clearing all cache...');
    await this.cacheService.clear();
    this.resetStatistics();
  }
  
  /**
   * Shutdown cache manager
   */
  async shutdown(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    await this.cacheService.disconnect();
  }
  
  /**
   * Private helper methods
   */
  
  private calculateHitRate(): number {
    const totalHits = this.stats.branchHits + this.stats.toolHits + this.stats.comparisonHits;
    const totalMisses = this.stats.branchMisses + this.stats.toolMisses + this.stats.comparisonMisses;
    const total = totalHits + totalMisses;
    
    if (total === 0) return 0;
    return (totalHits / total) * 100;
  }
  
  private async performCleanup(): Promise<void> {
    // This could be extended to clean up old cache entries
    // For now, it just logs statistics
    const stats = this.getStatistics();
    console.log('Cache cleanup - Current statistics:', {
      hitRate: `${stats.hitRate.toFixed(2)}%`,
      totalHits: stats.totalHits,
      totalMisses: stats.totalMisses
    });
  }
}

// Singleton instance
let managerInstance: CacheManager | null = null;

/**
 * Get or create cache manager instance
 */
export function getCacheManager(options?: CacheManagerOptions): CacheManager {
  if (!managerInstance) {
    managerInstance = new CacheManager(options);
  }
  return managerInstance;
}

// Export for convenience
export default CacheManager;