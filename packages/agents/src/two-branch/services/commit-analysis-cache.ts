/**
 * Commit-Based Analysis Cache
 *
 * Caches analysis results by commit SHA to avoid re-analyzing unchanged code.
 * Applies to:
 * - PR analysis (code quality)
 * - User skill scoring
 * - App/repository scoring
 *
 * Cache Strategy:
 * - Key: commit SHA + analysis type
 * - TTL: 30 days (configurable)
 * - Storage: Supabase
 *
 * Benefits:
 * - Skip re-analysis of same commit
 * - Instant results for unchanged code
 * - Cost savings (no AI calls)
 * - Performance improvement (no tool execution)
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export interface CachedAnalysisResult {
  commitSha: string;
  analysisType: 'pr_analysis' | 'skill_scoring' | 'app_scoring';
  repositoryUrl: string;
  prNumber?: number;

  // Analysis results (JSON)
  result: any;

  // Metadata
  analyzedAt: string;
  cacheVersion: string;  // For cache invalidation if analysis logic changes

  // Stats for monitoring
  duration?: string;
  cost?: number;
  issueCount?: number;
}

export interface CacheOptions {
  ttlDays?: number;        // Default: 30 days
  cacheVersion?: string;   // Default: 'v9.0'
  skipCache?: boolean;     // Force fresh analysis
}

const DEFAULT_TTL_DAYS = 30;
const DEFAULT_CACHE_VERSION = 'v9.0';

export class CommitAnalysisCache {
  private supabase: SupabaseClient;
  private cacheVersion: string;

  constructor(supabaseUrl?: string, supabaseKey?: string, cacheVersion = DEFAULT_CACHE_VERSION) {
    const url = supabaseUrl || process.env.SUPABASE_URL;
    const key = supabaseKey || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error('Supabase credentials not provided');
    }

    this.supabase = createClient(url, key);
    this.cacheVersion = cacheVersion;
  }

  /**
   * Get cached analysis result for a commit
   *
   * IMPORTANT: Cache is keyed by COMMIT SHA, not PR number
   *
   * This means:
   * - Same commit = cache HIT → instant result
   * - New commit (after fixes) = cache MISS → fresh analysis
   * - No risk of stale results when code changes
   *
   * Example:
   *   PR #123 at commit abc123 → analyze and cache
   *   User re-requests PR #123 at abc123 → cache HIT (instant)
   *   User pushes fixes, new commit def456 → cache MISS (fresh analysis)
   *
   * Returns null if not found or expired
   */
  async get(
    commitSha: string,
    analysisType: CachedAnalysisResult['analysisType'],
    options: CacheOptions = {}
  ): Promise<any | null> {
    const { skipCache = false, cacheVersion = this.cacheVersion, ttlDays = DEFAULT_TTL_DAYS } = options;

    if (skipCache) {
      console.log('[CommitCache] ⏭️  Skipping cache (skipCache=true)');
      return null;
    }

    try {
      const cacheKey = this.generateCacheKey(commitSha, analysisType);

      console.log(`[CommitCache] 🔍 Checking cache for ${cacheKey}...`);
      console.log(`[CommitCache]   • Commit: ${commitSha.substring(0, 12)}...`);

      const { data, error } = await this.supabase
        .from('commit_analysis_cache')
        .select('*')
        .eq('cache_key', cacheKey)
        .eq('cache_version', cacheVersion)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found (expected for new commits)
          console.log('[CommitCache] ⚪ Cache miss - this commit not analyzed yet');
          console.log('[CommitCache]   → Will run fresh analysis');
          return null;
        }
        console.error('[CommitCache] ❌ Cache lookup error:', error);
        return null;
      }

      // Check if expired
      const analyzedAt = new Date(data.analyzed_at);
      const expiresAt = new Date(analyzedAt.getTime() + ttlDays * 24 * 60 * 60 * 1000);
      const now = new Date();

      if (now > expiresAt) {
        console.log('[CommitCache] 🕐 Cache expired (TTL exceeded)');
        console.log('[CommitCache]   → Will run fresh analysis');
        return null;
      }

      console.log('[CommitCache] ✅ Cache hit!');
      console.log(`[CommitCache]   • Analyzed: ${data.analyzed_at}`);
      console.log(`[CommitCache]   • Issues: ${data.issue_count || 'unknown'}`);
      console.log(`[CommitCache]   • Duration: ${data.duration || 'unknown'}`);
      console.log(`[CommitCache]   • Savings: Skipped full analysis (instant result)`);

      return data.result;

    } catch (err) {
      console.error('[CommitCache] ❌ Unexpected error:', err);
      return null;
    }
  }

  /**
   * Store analysis result in cache
   */
  async set(
    commitSha: string,
    analysisType: CachedAnalysisResult['analysisType'],
    result: any,
    metadata: {
      repositoryUrl: string;
      prNumber?: number;
      duration?: string;
      cost?: number;
      issueCount?: number;
    },
    options: CacheOptions = {}
  ): Promise<void> {
    const { cacheVersion = this.cacheVersion } = options;

    try {
      const cacheKey = this.generateCacheKey(commitSha, analysisType);

      console.log(`[CommitCache] 💾 Storing cache for ${cacheKey}...`);

      const cacheEntry = {
        cache_key: cacheKey,
        commit_sha: commitSha,
        analysis_type: analysisType,
        repository_url: metadata.repositoryUrl,
        pr_number: metadata.prNumber,
        result,
        analyzed_at: new Date().toISOString(),
        cache_version: cacheVersion,
        duration: metadata.duration,
        cost: metadata.cost,
        issue_count: metadata.issueCount,
      };

      const { error } = await this.supabase
        .from('commit_analysis_cache')
        .upsert(cacheEntry, {
          onConflict: 'cache_key',
        });

      if (error) {
        console.error('[CommitCache] ❌ Cache write error:', error);
        return;
      }

      console.log('[CommitCache] ✅ Cache stored successfully');
      console.log(`[CommitCache]   • Commit: ${commitSha.substring(0, 8)}...`);
      console.log(`[CommitCache]   • Type: ${analysisType}`);
      console.log(`[CommitCache]   • Issues: ${metadata.issueCount || 0}`);

    } catch (err) {
      console.error('[CommitCache] ❌ Unexpected error:', err);
    }
  }

  /**
   * Invalidate cache for a specific commit
   * Useful when analysis logic changes
   */
  async invalidate(
    commitSha: string,
    analysisType: CachedAnalysisResult['analysisType']
  ): Promise<void> {
    try {
      const cacheKey = this.generateCacheKey(commitSha, analysisType);

      console.log(`[CommitCache] 🗑️  Invalidating cache for ${cacheKey}...`);

      const { error } = await this.supabase
        .from('commit_analysis_cache')
        .delete()
        .eq('cache_key', cacheKey);

      if (error) {
        console.error('[CommitCache] ❌ Cache invalidation error:', error);
        return;
      }

      console.log('[CommitCache] ✅ Cache invalidated');

    } catch (err) {
      console.error('[CommitCache] ❌ Unexpected error:', err);
    }
  }

  /**
   * Invalidate all cache entries for a specific cache version
   * Use when upgrading analysis logic (e.g., v9.0 → v9.1)
   */
  async invalidateVersion(cacheVersion: string): Promise<void> {
    try {
      console.log(`[CommitCache] 🗑️  Invalidating all cache for version ${cacheVersion}...`);

      const { error } = await this.supabase
        .from('commit_analysis_cache')
        .delete()
        .eq('cache_version', cacheVersion);

      if (error) {
        console.error('[CommitCache] ❌ Version invalidation error:', error);
        return;
      }

      console.log('[CommitCache] ✅ Version cache invalidated');

    } catch (err) {
      console.error('[CommitCache] ❌ Unexpected error:', err);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    totalEntries: number;
    byAnalysisType: Record<string, number>;
    oldestEntry?: string;
    newestEntry?: string;
  }> {
    try {
      const { data, error } = await this.supabase
        .from('commit_analysis_cache')
        .select('analysis_type, analyzed_at');

      if (error) {
        console.error('[CommitCache] ❌ Stats error:', error);
        return {
          totalEntries: 0,
          byAnalysisType: {},
        };
      }

      const byAnalysisType: Record<string, number> = {};
      let oldestEntry: Date | undefined;
      let newestEntry: Date | undefined;

      data.forEach(entry => {
        byAnalysisType[entry.analysis_type] = (byAnalysisType[entry.analysis_type] || 0) + 1;

        const date = new Date(entry.analyzed_at);
        if (!oldestEntry || date < oldestEntry) oldestEntry = date;
        if (!newestEntry || date > newestEntry) newestEntry = date;
      });

      return {
        totalEntries: data.length,
        byAnalysisType,
        oldestEntry: oldestEntry?.toISOString(),
        newestEntry: newestEntry?.toISOString(),
      };

    } catch (err) {
      console.error('[CommitCache] ❌ Unexpected error:', err);
      return {
        totalEntries: 0,
        byAnalysisType: {},
      };
    }
  }

  /**
   * Generate unique cache key
   */
  private generateCacheKey(commitSha: string, analysisType: string): string {
    return `${analysisType}:${commitSha}`;
  }
}
