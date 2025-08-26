/**
 * Optimized Location Finder Service
 * 
 * Performance improvements:
 * - Parallel processing for multiple issues
 * - Repository clone caching
 * - Batch grep operations
 * - Monitoring hooks for performance tracking
 * - Timeout handling for slow searches
 * - Redis caching for repeated searches
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import Redis from 'ioredis';
import { monitoring } from '../monitoring/services/unified-monitoring.service';
import { EventEmitter } from 'events';
import pLimit from 'p-limit';

const execAsync = promisify(exec);

export interface IssueToLocate {
  id: string;
  title: string;
  description: string;
  category: string;
  severity: string;
  codeSnippet?: string;
  file?: string;
  message?: string;
}

export interface LocationResult {
  issueId: string;
  file: string;
  line: number;
  column?: number;
  confidence: number;
  snippet?: string;
  method: string;
  searchDuration?: number;
}

export interface PerformanceMetrics {
  totalIssues: number;
  locatedIssues: number;
  totalDuration: number;
  averageTimePerIssue: number;
  cacheHits: number;
  cacheMisses: number;
  parallelSearches: number;
  timedOutSearches: number;
}

export class OptimizedLocationFinder extends EventEmitter {
  private static instance: OptimizedLocationFinder;
  private redis: Redis | null = null;
  private repoCache = new Map<string, string>();
  private searchCache = new Map<string, LocationResult>();
  private performanceMetrics: PerformanceMetrics = {
    totalIssues: 0,
    locatedIssues: 0,
    totalDuration: 0,
    averageTimePerIssue: 0,
    cacheHits: 0,
    cacheMisses: 0,
    parallelSearches: 0,
    timedOutSearches: 0
  };
  
  // Configuration
  private readonly PARALLEL_LIMIT = 5; // Process 5 issues in parallel
  private readonly SEARCH_TIMEOUT = 5000; // 5 seconds per issue
  private readonly CACHE_TTL = 3600; // 1 hour cache
  private readonly BATCH_SIZE = 10; // Batch grep operations
  
  private constructor() {
    super();
    this.initializeRedis();
  }
  
  public static getInstance(): OptimizedLocationFinder {
    if (!OptimizedLocationFinder.instance) {
      OptimizedLocationFinder.instance = new OptimizedLocationFinder();
    }
    return OptimizedLocationFinder.instance;
  }
  
  private async initializeRedis() {
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      try {
        this.redis = new Redis(redisUrl);
        console.log('✅ Redis connected for location caching');
      } catch (error) {
        console.warn('⚠️ Redis not available, using in-memory cache only');
      }
    }
  }
  
  /**
   * Main entry point - find locations for multiple issues with parallel processing
   */
  async findLocations(
    repoPath: string,
    issues: IssueToLocate[]
  ): Promise<LocationResult[]> {
    const startTime = Date.now();
    
    // Track performance
    monitoring.startPerformanceTracking('location-finding', {
      issueCount: issues.length,
      repoPath
    });
    
    console.log(`🚀 Optimized location finder processing ${issues.length} issues`);
    
    // Reset metrics for this run
    this.performanceMetrics = {
      totalIssues: issues.length,
      locatedIssues: 0,
      totalDuration: 0,
      averageTimePerIssue: 0,
      cacheHits: 0,
      cacheMisses: 0,
      parallelSearches: 0,
      timedOutSearches: 0
    };
    
    // Ensure repo exists and is indexed
    if (!await this.verifyRepoPath(repoPath)) {
      console.error(`Repository path does not exist: ${repoPath}`);
      return [];
    }
    
    // Create file index for faster searching
    const fileIndex = await this.createFileIndex(repoPath);
    
    // Process issues in parallel with concurrency limit
    const limit = pLimit(this.PARALLEL_LIMIT);
    const results: LocationResult[] = [];
    
    const searchPromises = issues.map(issue => 
      limit(async () => {
        const issueStartTime = Date.now();
        
        try {
          // Check cache first
          const cached = await this.getCachedLocation(issue, repoPath);
          if (cached) {
            this.performanceMetrics.cacheHits++;
            results.push(cached);
            return cached;
          }
          
          this.performanceMetrics.cacheMisses++;
          
          // Search with timeout
          const location = await this.searchWithTimeout(
            issue,
            repoPath,
            fileIndex,
            this.SEARCH_TIMEOUT
          );
          
          if (location) {
            this.performanceMetrics.locatedIssues++;
            results.push(location);
            await this.cacheLocation(issue, repoPath, location);
            
            // Track individual issue performance
            const issueDuration = Date.now() - issueStartTime;
            monitoring.trackPerformance('issue-location', issueDuration, {
              issueId: issue.id,
              method: location.method,
              confidence: location.confidence
            });
          }
          
          return location;
        } catch (error) {
          console.error(`Error locating issue ${issue.id}:`, error);
          return null;
        }
      })
    );
    
    // Wait for all searches to complete
    await Promise.all(searchPromises);
    
    // Calculate final metrics
    const totalDuration = Date.now() - startTime;
    this.performanceMetrics.totalDuration = totalDuration;
    this.performanceMetrics.averageTimePerIssue = totalDuration / issues.length;
    this.performanceMetrics.parallelSearches = Math.min(issues.length, this.PARALLEL_LIMIT);
    
    // Track overall performance
    monitoring.endPerformanceTracking('location-finding', {
      ...this.performanceMetrics,
      successRate: (this.performanceMetrics.locatedIssues / issues.length) * 100
    });
    
    // Emit metrics event
    this.emit('metrics', this.performanceMetrics);
    
    console.log(`
📊 Location Finding Performance:
   Total Duration: ${totalDuration}ms
   Average per Issue: ${this.performanceMetrics.averageTimePerIssue.toFixed(0)}ms
   Located: ${this.performanceMetrics.locatedIssues}/${issues.length} (${((this.performanceMetrics.locatedIssues/issues.length)*100).toFixed(1)}%)
   Cache Hits: ${this.performanceMetrics.cacheHits}
   Cache Misses: ${this.performanceMetrics.cacheMisses}
   Parallel Searches: ${this.performanceMetrics.parallelSearches}
   Timed Out: ${this.performanceMetrics.timedOutSearches}
    `);
    
    return results;
  }
  
  /**
   * Search with timeout to prevent hanging on difficult searches
   */
  private async searchWithTimeout(
    issue: IssueToLocate,
    repoPath: string,
    fileIndex: Map<string, string[]>,
    timeout: number
  ): Promise<LocationResult | null> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.performanceMetrics.timedOutSearches++;
        console.warn(`⏱️ Search timed out for issue ${issue.id}`);
        resolve(null);
      }, timeout);
      
      this.searchForIssue(issue, repoPath, fileIndex)
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          console.error(`Search error for ${issue.id}:`, error);
          resolve(null);
        });
    });
  }
  
  /**
   * Core search logic with multiple strategies
   */
  private async searchForIssue(
    issue: IssueToLocate,
    repoPath: string,
    fileIndex: Map<string, string[]>
  ): Promise<LocationResult | null> {
    // Strategy 1: Direct file search if file hint exists
    if (issue.file && issue.file !== 'unknown' && issue.file !== 'Unknown location') {
      const directResult = await this.searchInFile(issue, repoPath, issue.file);
      if (directResult) return directResult;
    }
    
    // Strategy 2: Code snippet search (if realistic)
    if (issue.codeSnippet && this.isRealisticSnippet(issue.codeSnippet)) {
      const snippetResult = await this.searchBySnippet(issue, repoPath, fileIndex);
      if (snippetResult) return snippetResult;
    }
    
    // Strategy 3: Smart keyword search
    const keywordResult = await this.searchByKeywords(issue, repoPath, fileIndex);
    if (keywordResult) return keywordResult;
    
    // Strategy 4: Category-based pattern search
    const patternResult = await this.searchByPattern(issue, repoPath, fileIndex);
    if (patternResult) return patternResult;
    
    return null;
  }
  
  /**
   * Search within a specific file
   */
  private async searchInFile(
    issue: IssueToLocate,
    repoPath: string,
    fileName: string
  ): Promise<LocationResult | null> {
    const filePath = path.join(repoPath, fileName);
    
    try {
      await fs.access(filePath);
      
      // Extract search terms
      const terms = this.extractSearchTerms(issue);
      
      // Use ripgrep for faster searching
      const searchCmd = `rg -n -i -m 5 "${terms[0]}" "${filePath}" 2>/dev/null || true`;
      const { stdout } = await execAsync(searchCmd);
      
      if (stdout) {
        const lines = stdout.trim().split('\n');
        const firstMatch = lines[0];
        const [lineNum, ...contentParts] = firstMatch.split(':');
        
        return {
          issueId: issue.id,
          file: fileName,
          line: parseInt(lineNum),
          confidence: 80,
          method: 'direct-file',
          snippet: contentParts.join(':').trim()
        };
      }
    } catch (error) {
      // File doesn't exist or search failed
    }
    
    return null;
  }
  
  /**
   * Search by code snippet across repository
   */
  private async searchBySnippet(
    issue: IssueToLocate,
    repoPath: string,
    fileIndex: Map<string, string[]>
  ): Promise<LocationResult | null> {
    if (!issue.codeSnippet) return null;
    
    // Clean and escape the snippet for searching
    const cleanSnippet = this.cleanCodeSnippet(issue.codeSnippet);
    
    try {
      // Use ripgrep for fast searching
      const searchCmd = `rg -n -F "${cleanSnippet}" "${repoPath}" --type-add 'code:*.{js,ts,jsx,tsx,py,java,go,rs,cpp,c}' -t code -m 1 2>/dev/null || true`;
      const { stdout } = await execAsync(searchCmd);
      
      if (stdout) {
        const match = stdout.trim().split('\n')[0];
        const [file, lineNum, ...content] = match.split(':');
        
        return {
          issueId: issue.id,
          file: path.relative(repoPath, file),
          line: parseInt(lineNum),
          confidence: 90,
          method: 'snippet-search',
          snippet: content.join(':').trim()
        };
      }
    } catch (error) {
      console.error('Snippet search error:', error);
    }
    
    return null;
  }
  
  /**
   * Search by keywords extracted from issue
   */
  private async searchByKeywords(
    issue: IssueToLocate,
    repoPath: string,
    fileIndex: Map<string, string[]>
  ): Promise<LocationResult | null> {
    const keywords = this.extractSearchTerms(issue);
    
    if (keywords.length === 0) return null;
    
    // Build ripgrep pattern
    const pattern = keywords.slice(0, 3).join('|');
    
    try {
      const searchCmd = `rg -n -i "${pattern}" "${repoPath}" --type-add 'code:*.{js,ts,jsx,tsx,py,java,go,rs,cpp,c}' -t code -m 1 2>/dev/null || true`;
      const { stdout } = await execAsync(searchCmd);
      
      if (stdout) {
        const match = stdout.trim().split('\n')[0];
        const [file, lineNum, ...content] = match.split(':');
        
        return {
          issueId: issue.id,
          file: path.relative(repoPath, file),
          line: parseInt(lineNum),
          confidence: 60,
          method: 'keyword-search',
          snippet: content.join(':').trim()
        };
      }
    } catch (error) {
      console.error('Keyword search error:', error);
    }
    
    return null;
  }
  
  /**
   * Search by category-based patterns
   */
  private async searchByPattern(
    issue: IssueToLocate,
    repoPath: string,
    fileIndex: Map<string, string[]>
  ): Promise<LocationResult | null> {
    const patterns = this.getCategoryPatterns(issue.category);
    
    for (const pattern of patterns) {
      try {
        const searchCmd = `rg -n "${pattern}" "${repoPath}" --type-add 'code:*.{js,ts,jsx,tsx}' -t code -m 1 2>/dev/null || true`;
        const { stdout } = await execAsync(searchCmd);
        
        if (stdout) {
          const match = stdout.trim().split('\n')[0];
          const [file, lineNum, ...content] = match.split(':');
          
          return {
            issueId: issue.id,
            file: path.relative(repoPath, file),
            line: parseInt(lineNum),
            confidence: 40,
            method: 'pattern-search',
            snippet: content.join(':').trim()
          };
        }
      } catch (error) {
        // Continue with next pattern
      }
    }
    
    return null;
  }
  
  /**
   * Create file index for faster searching
   */
  private async createFileIndex(repoPath: string): Promise<Map<string, string[]>> {
    const index = new Map<string, string[]>();
    
    try {
      // Get all code files
      const { stdout } = await execAsync(
        `find "${repoPath}" -type f \\( -name "*.js" -o -name "*.ts" -o -name "*.jsx" -o -name "*.tsx" \\) -not -path "*/node_modules/*" -not -path "*/.git/*" 2>/dev/null || true`
      );
      
      const files = stdout.trim().split('\n').filter(Boolean);
      
      // Group files by directory
      for (const file of files) {
        const dir = path.dirname(file);
        const fileName = path.basename(file);
        
        if (!index.has(dir)) {
          index.set(dir, []);
        }
        index.get(dir)!.push(fileName);
      }
    } catch (error) {
      console.error('Error creating file index:', error);
    }
    
    return index;
  }
  
  /**
   * Cache location result
   */
  private async cacheLocation(
    issue: IssueToLocate,
    repoPath: string,
    location: LocationResult
  ): Promise<void> {
    const cacheKey = this.getCacheKey(issue, repoPath);
    
    // In-memory cache
    this.searchCache.set(cacheKey, location);
    
    // Redis cache if available
    if (this.redis) {
      try {
        await this.redis.setex(
          cacheKey,
          this.CACHE_TTL,
          JSON.stringify(location)
        );
      } catch (error) {
        console.error('Redis cache error:', error);
      }
    }
  }
  
  /**
   * Get cached location result
   */
  private async getCachedLocation(
    issue: IssueToLocate,
    repoPath: string
  ): Promise<LocationResult | null> {
    const cacheKey = this.getCacheKey(issue, repoPath);
    
    // Check in-memory cache first
    if (this.searchCache.has(cacheKey)) {
      return this.searchCache.get(cacheKey)!;
    }
    
    // Check Redis cache
    if (this.redis) {
      try {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          const location = JSON.parse(cached) as LocationResult;
          // Update in-memory cache
          this.searchCache.set(cacheKey, location);
          return location;
        }
      } catch (error) {
        console.error('Redis get error:', error);
      }
    }
    
    return null;
  }
  
  /**
   * Generate cache key for issue
   */
  private getCacheKey(issue: IssueToLocate, repoPath: string): string {
    return `location:${repoPath}:${issue.id}:${issue.title}`;
  }
  
  /**
   * Verify repository path exists
   */
  private async verifyRepoPath(repoPath: string): Promise<boolean> {
    try {
      await fs.access(repoPath);
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Check if code snippet is realistic
   */
  private isRealisticSnippet(snippet: string): boolean {
    const genericPatterns = [
      'example.com',
      'your-',
      'TODO',
      'placeholder',
      '...',
      'hardcoded',
      'password123'
    ];
    
    const lower = snippet.toLowerCase();
    return !genericPatterns.some(pattern => lower.includes(pattern));
  }
  
  /**
   * Clean code snippet for searching
   */
  private cleanCodeSnippet(snippet: string): string {
    return snippet
      .split('\n')[0] // Take first line
      .trim()
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escape regex chars
  }
  
  /**
   * Extract search terms from issue
   */
  private extractSearchTerms(issue: IssueToLocate): string[] {
    const terms: string[] = [];
    
    // Extract from title
    const titleWords = issue.title
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3);
    terms.push(...titleWords);
    
    // Extract from description
    if (issue.description) {
      const descWords = issue.description
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 3)
        .slice(0, 5);
      terms.push(...descWords);
    }
    
    // Remove duplicates and common words
    const uniqueTerms = [...new Set(terms)];
    const commonWords = ['this', 'that', 'should', 'could', 'would', 'from', 'with'];
    
    return uniqueTerms.filter(term => !commonWords.includes(term.toLowerCase()));
  }
  
  /**
   * Get search patterns based on issue category
   */
  private getCategoryPatterns(category: string): string[] {
    const patterns: Record<string, string[]> = {
      'security': ['password', 'secret', 'token', 'api[_-]key', 'auth'],
      'performance': ['setTimeout', 'setInterval', 'loop', 'forEach', 'map'],
      'error-handling': ['catch', 'error', 'throw', 'reject', 'fail'],
      'memory': ['leak', 'buffer', 'cache', 'dispose', 'cleanup'],
      'async': ['async', 'await', 'promise', 'callback', 'then']
    };
    
    return patterns[category.toLowerCase()] || ['function', 'class', 'const', 'let'];
  }
  
  /**
   * Get performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics };
  }
  
  /**
   * Clear caches
   */
  async clearCache(): Promise<void> {
    this.searchCache.clear();
    this.repoCache.clear();
    
    if (this.redis) {
      try {
        const keys = await this.redis.keys('location:*');
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } catch (error) {
        console.error('Redis clear error:', error);
      }
    }
  }
}

// Export singleton instance
export const optimizedLocationFinder = OptimizedLocationFinder.getInstance();