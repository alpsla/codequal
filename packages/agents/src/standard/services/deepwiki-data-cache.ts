/**
 * DeepWiki Data Cache Service
 * 
 * Centralized cache for DeepWiki analysis results to ensure data integrity
 * across different code units and prevent data loss in the pipeline
 */

import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

export interface CachedIssue {
  // Core identification
  id: string;
  hash: string; // For deduplication
  
  // Issue details from DeepWiki
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  type: string;
  
  // Location data
  location: {
    file: string;
    line: number;
    column?: number;
    method?: string;
  };
  
  // Code context
  codeSnippet?: string;
  codeContext?: string[];
  realCode?: boolean; // Whether we extracted real code vs DeepWiki's generic
  
  // Metadata
  source: 'deepwiki' | 'extracted' | 'enhanced';
  confidence?: number;
  timestamp: string;
  
  // Fix suggestions (cached separately)
  fixSuggestionId?: string;
}

export interface CachedAnalysis {
  // Analysis identification
  id: string;
  repositoryUrl: string;
  branch: string;
  prNumber?: number;
  
  // Analysis results
  issues: CachedIssue[];
  
  // Metadata
  timestamp: string;
  iterations: number;
  converged: boolean;
  deepwikiVersion?: string;
  
  // Performance metrics
  analysisTime: number;
  issuesFound: number;
  realCodeExtracted: number;
}

export interface PRComparisonCache {
  id: string;
  repositoryUrl: string;
  prNumber: number;
  
  // Branch analyses
  mainAnalysis: CachedAnalysis;
  prAnalysis: CachedAnalysis;
  
  // Categorized results
  newIssues: CachedIssue[];
  fixedIssues: CachedIssue[];
  unchangedIssues: CachedIssue[];
  
  // Metadata
  timestamp: string;
  qualityScore: number;
  netImpact: number;
}

export class DeepWikiDataCache {
  private cacheDir: string;
  private supabase: any;
  private memoryCache: Map<string, any> = new Map();
  
  constructor() {
    // Local file cache directory
    this.cacheDir = path.join(process.cwd(), '.deepwiki-cache');
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
    
    // Supabase for persistent storage
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      this.supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
    }
  }
  
  /**
   * Generate a unique key for caching
   * Enhanced to handle PR branches properly and avoid collisions
   */
  private generateCacheKey(repo: string, branch: string, prNumber?: number): string {
    const repoKey = repo.replace(/[^a-zA-Z0-9]/g, '_');
    const branchKey = branch.replace(/[^a-zA-Z0-9]/g, '_');
    
    if (prNumber) {
      return `${repoKey}_pr_${prNumber}_${branchKey}`;
    }
    
    // Handle special branch names that might indicate PRs
    if (branch.includes('pull/') || branch.includes('pr-')) {
      const prMatch = branch.match(/(?:pull\/(\d+)\/head|pr-(\d+))/);
      if (prMatch) {
        const detectedPR = prMatch[1] || prMatch[2];
        return `${repoKey}_pr_${detectedPR}_${branchKey}`;
      }
    }
    
    return `${repoKey}_${branchKey}_main`;
  }
  
  /**
   * Store analysis results with proper structure
   */
  async storeAnalysis(
    repo: string,
    branch: string,
    rawDeepWikiData: any,
    options: {
      prNumber?: number;
      iterations?: number;
      analysisTime?: number;
    } = {}
  ): Promise<CachedAnalysis> {
    const cacheKey = this.generateCacheKey(repo, branch, options.prNumber);
    
    // Structure the data properly
    const structuredIssues: CachedIssue[] = this.structureIssues(rawDeepWikiData.issues || []);
    
    const cachedAnalysis: CachedAnalysis = {
      id: cacheKey,
      repositoryUrl: repo,
      branch,
      prNumber: options.prNumber,
      issues: structuredIssues,
      timestamp: new Date().toISOString(),
      iterations: options.iterations || 1,
      converged: rawDeepWikiData.converged || false,
      analysisTime: options.analysisTime || 0,
      issuesFound: structuredIssues.length,
      realCodeExtracted: structuredIssues.filter(i => i.realCode).length
    };
    
    // Store in multiple places for redundancy
    await this.storeInMemory(cacheKey, cachedAnalysis);
    await this.storeInFile(cacheKey, cachedAnalysis);
    await this.storeInDatabase(cacheKey, cachedAnalysis);
    
    return cachedAnalysis;
  }
  
  /**
   * Structure raw DeepWiki issues into consistent format
   */
  private structureIssues(rawIssues: any[]): CachedIssue[] {
    return rawIssues.map((issue, index) => {
      // Extract all possible fields from different DeepWiki response formats
      const structured: CachedIssue = {
        id: issue.id || `issue-${Date.now()}-${index}`,
        hash: this.generateIssueHash(issue),
        
        // Try multiple field names DeepWiki might use
        title: issue.title || issue.name || issue.message || issue.description || 'Untitled Issue',
        description: issue.description || issue.details || issue.message || issue.explanation || '',
        severity: this.normalizeSeverity(issue.severity || issue.level || issue.priority),
        category: issue.category || issue.type || issue.kind || 'code-quality',
        type: issue.type || issue.issueType || issue.category || 'issue',
        
        // Location handling - try multiple formats
        location: this.extractLocation(issue),
        
        // Code snippet handling
        codeSnippet: issue.codeSnippet || issue.code || issue.snippet || issue.problematicCode,
        codeContext: issue.codeContext || issue.context || [],
        realCode: this.isRealCode(issue.codeSnippet || issue.code),
        
        // Metadata
        source: 'deepwiki',
        confidence: issue.confidence || issue.certainty || 50,
        timestamp: new Date().toISOString()
      };
      
      return structured;
    });
  }
  
  /**
   * Extract location from various formats
   */
  private extractLocation(issue: any): CachedIssue['location'] {
    // Direct location object
    if (issue.location?.file) {
      return {
        file: issue.location.file,
        line: issue.location.line || 0,
        column: issue.location.column,
        method: issue.location.method
      };
    }
    
    // Flat fields
    if (issue.file || issue.filePath) {
      return {
        file: issue.file || issue.filePath,
        line: issue.line || issue.lineNumber || 0,
        column: issue.column,
        method: issue.method || issue.function
      };
    }
    
    // Parse from description if needed
    const fileMatch = issue.description?.match(/(?:file|File|FILE):\s*([^\s,]+)/);
    const lineMatch = issue.description?.match(/(?:line|Line|LINE):\s*(\d+)/);
    
    return {
      file: fileMatch?.[1] || 'unknown',
      line: lineMatch ? parseInt(lineMatch[1]) : 0
    };
  }
  
  /**
   * Normalize severity levels
   */
  private normalizeSeverity(severity: any): CachedIssue['severity'] {
    const s = String(severity).toLowerCase();
    if (s.includes('critical') || s.includes('blocker')) return 'critical';
    if (s.includes('high') || s.includes('major')) return 'high';
    if (s.includes('medium') || s.includes('moderate')) return 'medium';
    return 'low';
  }
  
  /**
   * Check if code snippet is real or generic
   */
  private isRealCode(code?: string): boolean {
    if (!code) return false;
    
    const genericPatterns = [
      'YOUR_API_KEY',
      'example.com',
      '[exact code not provided]',
      'TODO',
      'FIXME',
      '// Code location:',
      'vulnerable code here'
    ];
    
    return !genericPatterns.some(pattern => code.includes(pattern));
  }
  
  /**
   * Generate hash for issue deduplication
   */
  private generateIssueHash(issue: any): string {
    const key = `${issue.title || ''}${issue.description || ''}${issue.file || ''}${issue.line || ''}`;
    return Buffer.from(key).toString('base64').substring(0, 8);
  }
  
  /**
   * Retrieve analysis from cache with comprehensive fallback strategy
   * This method is designed for cross-service access by different code units
   */
  async getAnalysis(repo: string, branch: string, prNumber?: number): Promise<CachedAnalysis | null> {
    const cacheKey = this.generateCacheKey(repo, branch, prNumber);
    
    try {
      // Try memory first (fastest)
      const memCache = this.memoryCache.get(cacheKey);
      if (memCache) {
        console.log(`📦 Cache hit (Memory): ${cacheKey}`);
        return memCache;
      }
      
      // Try file cache
      const fileCache = await this.loadFromFile(cacheKey);
      if (fileCache) {
        console.log(`📦 Cache hit (File): ${cacheKey}`);
        this.memoryCache.set(cacheKey, fileCache);
        return fileCache;
      }
      
      // Try database
      const dbCache = await this.loadFromDatabase(cacheKey);
      if (dbCache) {
        console.log(`📦 Cache hit (Database): ${cacheKey}`);
        this.memoryCache.set(cacheKey, dbCache);
        await this.storeInFile(cacheKey, dbCache);
        return dbCache;
      }
      
      console.log(`📦 Cache miss: ${cacheKey}`);
      return null;
      
    } catch (error: any) {
      console.error(`📦 Cache retrieval error for ${cacheKey}:`, error.message);
      
      // Try alternative cache keys as fallback (for different code units that might use different naming)
      const alternativeKeys = this.generateAlternativeCacheKeys(repo, branch, prNumber);
      
      for (const altKey of alternativeKeys) {
        try {
          const altCache = this.memoryCache.get(altKey) || await this.loadFromFile(altKey);
          if (altCache) {
            console.log(`📦 Cache hit (Alternative key): ${altKey}`);
            // Store under the requested key for future access
            await this.storeInMemory(cacheKey, altCache);
            return altCache;
          }
        } catch {
          // Continue to next alternative
        }
      }
      
      return null;
    }
  }
  
  /**
   * Generate alternative cache keys for different naming conventions
   * Used when different code units might reference the same data differently
   */
  private generateAlternativeCacheKeys(repo: string, branch: string, prNumber?: number): string[] {
    const alternatives: string[] = [];
    const repoKey = repo.replace(/[^a-zA-Z0-9]/g, '_');
    const branchKey = branch.replace(/[^a-zA-Z0-9]/g, '_');
    
    // Try different naming patterns
    alternatives.push(`${repoKey}_${branchKey}`);
    alternatives.push(`${repoKey}_main_${branchKey}`);
    
    if (prNumber) {
      alternatives.push(`${repoKey}_${prNumber}_${branchKey}`);
      alternatives.push(`${repoKey}_pull_${prNumber}_head`);
    }
    
    // Try with 'main' suffix variations
    if (!branch.includes('main')) {
      alternatives.push(`${repoKey}_${branchKey}_main`);
    }
    
    return alternatives;
  }
  
  /**
   * Store PR comparison results
   */
  async storePRComparison(
    repo: string,
    prNumber: number,
    mainAnalysis: CachedAnalysis,
    prAnalysis: CachedAnalysis,
    categorization: {
      newIssues: any[];
      fixedIssues: any[];
      unchangedIssues: any[];
      qualityScore: number;
    }
  ): Promise<PRComparisonCache> {
    const cacheKey = `pr_${this.generateCacheKey(repo, 'comparison', prNumber)}`;
    
    // Check if issues are already structured (have proper location data)
    const areIssuesStructured = (issues: any[]) => {
      return issues.length === 0 || (issues[0]?.location?.file && issues[0]?.location?.file !== 'unknown');
    };
    
    const comparison: PRComparisonCache = {
      id: cacheKey,
      repositoryUrl: repo,
      prNumber,
      mainAnalysis,
      prAnalysis,
      // Only structure if not already structured (preserve existing data)
      newIssues: areIssuesStructured(categorization.newIssues) ? categorization.newIssues : this.structureIssues(categorization.newIssues),
      fixedIssues: areIssuesStructured(categorization.fixedIssues) ? categorization.fixedIssues : this.structureIssues(categorization.fixedIssues),
      unchangedIssues: areIssuesStructured(categorization.unchangedIssues) ? categorization.unchangedIssues : this.structureIssues(categorization.unchangedIssues),
      timestamp: new Date().toISOString(),
      qualityScore: categorization.qualityScore,
      netImpact: categorization.fixedIssues.length - categorization.newIssues.length
    };
    
    await this.storeInMemory(cacheKey, comparison);
    await this.storeInFile(cacheKey, comparison);
    
    return comparison;
  }
  
  /**
   * Get PR comparison from cache
   */
  async getPRComparison(repo: string, prNumber: number): Promise<PRComparisonCache | null> {
    const cacheKey = `pr_${this.generateCacheKey(repo, 'comparison', prNumber)}`;
    
    const cache = this.memoryCache.get(cacheKey) || await this.loadFromFile(cacheKey);
    return cache;
  }
  
  /**
   * Update issues with extracted real code
   */
  async updateIssuesWithRealCode(
    repo: string,
    branch: string,
    issuesWithCode: CachedIssue[],
    prNumber?: number
  ): Promise<void> {
    const analysis = await this.getAnalysis(repo, branch, prNumber);
    if (!analysis) return;
    
    // Update each issue with real code if found
    analysis.issues = analysis.issues.map(issue => {
      const updated = issuesWithCode.find(i => i.id === issue.id || i.hash === issue.hash);
      if (updated && updated.codeSnippet && updated.realCode) {
        return {
          ...issue,
          codeSnippet: updated.codeSnippet,
          codeContext: updated.codeContext,
          realCode: true,
          source: 'enhanced' as const
        };
      }
      return issue;
    });
    
    // Re-save the updated analysis
    await this.storeAnalysis(repo, branch, { issues: analysis.issues }, { prNumber });
  }
  
  // Storage implementations
  private async storeInMemory(key: string, data: any): Promise<void> {
    this.memoryCache.set(key, data);
  }
  
  private async storeInFile(key: string, data: any): Promise<void> {
    const filePath = path.join(this.cacheDir, `${key}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  }
  
  private async storeInDatabase(key: string, data: any): Promise<void> {
    if (!this.supabase) return;
    
    try {
      await this.supabase
        .from('deepwiki_cache')
        .upsert({
          id: key,
          data,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Failed to store in database:', error);
    }
  }
  
  private async loadFromFile(key: string): Promise<any> {
    const filePath = path.join(this.cacheDir, `${key}.json`);
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data);
    }
    return null;
  }
  
  private async loadFromDatabase(key: string): Promise<any> {
    if (!this.supabase) return null;
    
    try {
      const { data } = await this.supabase
        .from('deepwiki_cache')
        .select('data')
        .eq('id', key)
        .single();
      
      return data?.data;
    } catch (error) {
      return null;
    }
  }
  
  /**
   * Clear cache for a specific analysis
   */
  async clearCache(repo: string, branch: string, prNumber?: number): Promise<void> {
    const cacheKey = this.generateCacheKey(repo, branch, prNumber);
    
    this.memoryCache.delete(cacheKey);
    
    const filePath = path.join(this.cacheDir, `${cacheKey}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    if (this.supabase) {
      await this.supabase
        .from('deepwiki_cache')
        .delete()
        .eq('id', cacheKey);
    }
  }
  
  /**
   * Get cache statistics
   */
  getCacheStats(): {
    memoryCacheSize: number;
    fileCacheSize: number;
    analyses: string[];
  } {
    const files = fs.readdirSync(this.cacheDir)
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''));
    
    return {
      memoryCacheSize: this.memoryCache.size,
      fileCacheSize: files.length,
      analyses: files
    };
  }
}

// Singleton instance
let cacheInstance: DeepWikiDataCache | null = null;

export function getDeepWikiCache(): DeepWikiDataCache {
  if (!cacheInstance) {
    cacheInstance = new DeepWikiDataCache();
  }
  return cacheInstance;
}