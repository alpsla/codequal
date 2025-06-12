/**
 * Shared Tool Results Cache
 * Allows expensive tools to run once and share results across agents
 */

import { ToolResult, AnalysisContext } from '../../core/interfaces';

interface CachedResult {
  toolId: string;
  context: string; // Hash of context for cache key
  result: ToolResult;
  timestamp: number;
  accessCount: number;
}

export class SharedToolResultsCache {
  private static instance: SharedToolResultsCache;
  private cache = new Map<string, CachedResult>();
  private readonly maxAge = 300000; // 5 minutes
  
  private constructor() {
    // Private constructor for singleton pattern
  }
  
  static getInstance(): SharedToolResultsCache {
    if (!SharedToolResultsCache.instance) {
      SharedToolResultsCache.instance = new SharedToolResultsCache();
    }
    return SharedToolResultsCache.instance;
  }
  
  /**
   * Generate cache key from tool ID and context
   */
  private generateCacheKey(toolId: string, context: AnalysisContext): string {
    // Create a stable hash from relevant context properties
    const contextKey = JSON.stringify({
      prNumber: context.pr.prNumber,
      files: context.pr.files.map(f => f.path).sort(),
      repository: context.repository.name
    });
    
    return `${toolId}:${this.hashString(contextKey)}`;
  }
  
  /**
   * Simple string hash function
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
   * Get cached result if available and not expired
   */
  get(toolId: string, context: AnalysisContext): ToolResult | null {
    const key = this.generateCacheKey(toolId, context);
    const cached = this.cache.get(key);
    
    if (!cached) return null;
    
    // Check if expired
    if (Date.now() - cached.timestamp > this.maxAge) {
      this.cache.delete(key);
      return null;
    }
    
    // Increment access count
    cached.accessCount++;
    
    // Return a copy to prevent mutations
    return JSON.parse(JSON.stringify(cached.result));
  }
  
  /**
   * Store result in cache
   */
  set(toolId: string, context: AnalysisContext, result: ToolResult): void {
    const key = this.generateCacheKey(toolId, context);
    
    this.cache.set(key, {
      toolId,
      context: key,
      result: JSON.parse(JSON.stringify(result)), // Store a copy
      timestamp: Date.now(),
      accessCount: 0
    });
    
    // Clean up old entries
    this.cleanupExpired();
  }
  
  /**
   * Check if result exists in cache
   */
  has(toolId: string, context: AnalysisContext): boolean {
    const key = this.generateCacheKey(toolId, context);
    const cached = this.cache.get(key);
    
    if (!cached) return false;
    
    // Check if expired
    if (Date.now() - cached.timestamp > this.maxAge) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }
  
  /**
   * Clear all cached results
   */
  clear(): void {
    this.cache.clear();
  }
  
  /**
   * Clean up expired entries
   */
  private cleanupExpired(): void {
    const now = Date.now();
    
    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp > this.maxAge) {
        this.cache.delete(key);
      }
    }
  }
  
  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    entries: Array<{
      toolId: string;
      age: number;
      accessCount: number;
    }>;
  } {
    const now = Date.now();
    const entries = Array.from(this.cache.values()).map(cached => ({
      toolId: cached.toolId,
      age: now - cached.timestamp,
      accessCount: cached.accessCount
    }));
    
    return {
      size: this.cache.size,
      entries
    };
  }
}

/**
 * Enhanced base adapter that uses shared cache
 */
export abstract class CachedDirectAdapter {
  protected cache = SharedToolResultsCache.getInstance();
  
  abstract readonly id: string;
  abstract readonly name: string;
  
  /**
   * Wrap analyze method with caching
   */
  async analyzeWithCache(
    context: AnalysisContext,
    analyzeFunc: (context: AnalysisContext) => Promise<ToolResult>
  ): Promise<ToolResult> {
    // Check cache first
    const cached = this.cache.get(this.id, context);
    if (cached) {
      console.log(`Using cached result for ${this.id}`);
      return cached;
    }
    
    // Run analysis
    const result = await analyzeFunc(context);
    
    // Cache successful results
    if (result.success) {
      this.cache.set(this.id, context, result);
    }
    
    return result;
  }
}
