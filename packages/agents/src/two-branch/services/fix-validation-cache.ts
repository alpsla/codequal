/**
 * Fix Validation Cache - Redis-based
 *
 * Purpose: Store LAST PR analysis for comparison when user re-analyzes
 *
 * Flow:
 * 1. First analysis → Store in Redis
 * 2. User fixes issues
 * 3. Second analysis → Compare with cached, store telemetry, replace cache
 *
 * Storage: Redis (in-memory, fast, cheap)
 * TTL: 180 days (6 months max for slow PRs)
 * Key format: `fix_validation:{repoUrl}:{prNumber}`
 *
 * Benefits:
 * - No Supabase storage needed
 * - Fast comparison (< 1ms)
 * - Automatic expiration (TTL)
 * - Works for all users and PRs
 */

import Redis from 'ioredis';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface CachedAnalysisForComparison {
  // Identifiers
  repositoryUrl: string;
  prNumber: number;
  commitSha: string;
  analyzedAt: string;

  // Issues with fix recommendations
  issues: Array<{
    id: string;
    file: string;
    line: number;
    rule: string;
    severity: string;
    message: string;

    // Fix recommendation (what we suggested)
    fixSuggestion?: {
      correctedCode: string;
      issueDescription?: {
        what: string;
        why: string;
        impact: string;
      };
    };

    // Original code (for comparison)
    codeSnippet?: string;
  }>;

  // Summary stats
  totalIssues: number;
  issuesWithFixes: number;

  // Metadata
  language: string;
  tools: string[];
}

export interface FixComparisonResult {
  // Summary
  totalIssuesInPrevious: number;
  totalIssuesInCurrent: number;
  issuesResolved: number;
  issuesNew: number;
  issuesRemaining: number;

  // Fix adoption breakdown
  fixAdoption: {
    exact: number;        // Used our fix exactly
    modified: number;     // Used our fix with tweaks
    different: number;    // Used different fix
    notFixed: number;     // Issue still present
  };

  // Detailed per-issue comparison
  details: Array<{
    issueId: string;
    rule: string;
    status: 'resolved' | 'new' | 'remaining';
    fixApproach?: 'exact' | 'modified' | 'different' | 'not_fixed';
  }>;
}

const DEFAULT_TTL_DAYS = 180;  // 6 months for slow PRs

export class FixValidationCache {
  private redis: Redis;
  private supabase: SupabaseClient;
  private ttlSeconds: number;

  constructor(redisUrl?: string, ttlDays = DEFAULT_TTL_DAYS) {
    const url = redisUrl || process.env.REDIS_URL || 'redis://localhost:6379';
    this.redis = new Redis(url);
    this.ttlSeconds = ttlDays * 24 * 60 * 60;

    this.redis.on('error', (err) => {
      console.error('[FixValidationCache] Redis error:', err);
    });

    this.redis.on('connect', () => {
      console.log('[FixValidationCache] ✅ Connected to Redis');
    });

    // Initialize Supabase for telemetry storage
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.warn('[FixValidationCache] ⚠️  Supabase credentials not found - telemetry storage disabled');
      // Create a mock client that won't fail but won't store data
      this.supabase = null as any;
    } else {
      this.supabase = createClient(supabaseUrl, supabaseKey);
      console.log('[FixValidationCache] ✅ Connected to Supabase for telemetry');
    }
  }

  /**
   * Get previous analysis for comparison
   */
  async getPreviousAnalysis(
    repositoryUrl: string,
    prNumber: number
  ): Promise<CachedAnalysisForComparison | null> {
    const key = this.generateKey(repositoryUrl, prNumber);

    try {
      console.log(`[FixValidation] 🔍 Checking for previous analysis: ${key}`);

      const cached = await this.redis.get(key);

      if (!cached) {
        console.log('[FixValidation] ⚪ No previous analysis found (first analysis)');
        return null;
      }

      const data = JSON.parse(cached);
      console.log('[FixValidation] ✅ Found previous analysis!');
      console.log(`[FixValidation]   • Analyzed: ${data.analyzedAt}`);
      console.log(`[FixValidation]   • Commit: ${data.commitSha.substring(0, 12)}...`);
      console.log(`[FixValidation]   • Issues: ${data.totalIssues}`);
      console.log(`[FixValidation]   • With fixes: ${data.issuesWithFixes}`);

      return data;

    } catch (err) {
      console.error('[FixValidation] ❌ Error reading cache:', err);
      return null;
    }
  }

  /**
   * Store current analysis for future comparison
   */
  async storeAnalysis(
    analysis: CachedAnalysisForComparison
  ): Promise<void> {
    const key = this.generateKey(analysis.repositoryUrl, analysis.prNumber);

    try {
      console.log(`[FixValidation] 💾 Storing analysis for future comparison: ${key}`);
      console.log(`[FixValidation]   • Commit: ${analysis.commitSha.substring(0, 12)}...`);
      console.log(`[FixValidation]   • Issues: ${analysis.totalIssues}`);
      console.log(`[FixValidation]   • With fixes: ${analysis.issuesWithFixes}`);
      console.log(`[FixValidation]   • TTL: ${DEFAULT_TTL_DAYS} days`);

      await this.redis.setex(
        key,
        this.ttlSeconds,
        JSON.stringify(analysis)
      );

      console.log('[FixValidation] ✅ Analysis stored');

    } catch (err) {
      console.error('[FixValidation] ❌ Error storing cache:', err);
    }
  }

  /**
   * Compare previous analysis with current analysis
   */
  compareAnalyses(
    previous: CachedAnalysisForComparison,
    current: CachedAnalysisForComparison
  ): FixComparisonResult {
    console.log('[FixValidation] 📊 Comparing analyses...');
    console.log(`[FixValidation]   • Previous: ${previous.totalIssues} issues`);
    console.log(`[FixValidation]   • Current: ${current.totalIssues} issues`);

    // Create maps for fast lookup
    const previousIssues = new Map(
      previous.issues.map(issue => [this.getIssueKey(issue), issue])
    );

    const currentIssues = new Map(
      current.issues.map(issue => [this.getIssueKey(issue), issue])
    );

    // Initialize counters
    const result: FixComparisonResult = {
      totalIssuesInPrevious: previous.totalIssues,
      totalIssuesInCurrent: current.totalIssues,
      issuesResolved: 0,
      issuesNew: 0,
      issuesRemaining: 0,
      fixAdoption: {
        exact: 0,
        modified: 0,
        different: 0,
        notFixed: 0,
      },
      details: [],
    };

    // Check each previous issue
    for (const [issueKey, prevIssue] of previousIssues) {
      const currIssue = currentIssues.get(issueKey);

      if (!currIssue) {
        // Issue resolved!
        result.issuesResolved++;

        // Determine how it was fixed
        const fixApproach = this.determineFixApproach(prevIssue);

        if (fixApproach) {
          result.fixAdoption[fixApproach]++;
        }

        result.details.push({
          issueId: prevIssue.id,
          rule: prevIssue.rule,
          status: 'resolved',
          fixApproach,
        });

      } else {
        // Issue still present
        result.issuesRemaining++;
        result.fixAdoption.notFixed++;

        result.details.push({
          issueId: prevIssue.id,
          rule: prevIssue.rule,
          status: 'remaining',
          fixApproach: 'not_fixed',
        });
      }
    }

    // Check for new issues
    for (const [issueKey, currIssue] of currentIssues) {
      if (!previousIssues.has(issueKey)) {
        result.issuesNew++;

        result.details.push({
          issueId: currIssue.id,
          rule: currIssue.rule,
          status: 'new',
        });
      }
    }

    // Log results
    console.log('[FixValidation] ✅ Comparison complete:');
    console.log(`[FixValidation]   • Resolved: ${result.issuesResolved}`);
    console.log(`[FixValidation]   • New: ${result.issuesNew}`);
    console.log(`[FixValidation]   • Remaining: ${result.issuesRemaining}`);
    console.log(`[FixValidation]   • Fix adoption:`);
    console.log(`[FixValidation]     - Exact: ${result.fixAdoption.exact}`);
    console.log(`[FixValidation]     - Modified: ${result.fixAdoption.modified}`);
    console.log(`[FixValidation]     - Different: ${result.fixAdoption.different}`);
    console.log(`[FixValidation]     - Not fixed: ${result.fixAdoption.notFixed}`);

    return result;
  }

  /**
   * Determine how an issue was fixed (if we have the fix suggestion)
   * Returns null if we can't determine (no fix suggestion was provided)
   */
  private determineFixApproach(
    issue: CachedAnalysisForComparison['issues'][0]
  ): 'exact' | 'modified' | 'different' | null {
    // If we didn't provide a fix suggestion, we can't determine the approach
    if (!issue.fixSuggestion?.correctedCode) {
      return null;
    }

    // In reality, we'd need to fetch the actual fixed code from the new commit
    // For now, we assume if issue is gone, they used SOME fix
    // We can't tell exact vs modified vs different without the actual code

    // This is a placeholder - in production you'd:
    // 1. Fetch the file content from the new commit SHA
    // 2. Compare with our suggested fix
    // 3. Return 'exact', 'modified', or 'different'

    return 'different';  // Conservative estimate
  }

  /**
   * Generate unique issue key for comparison
   * Format: "{file}:{line}:{rule}"
   */
  private getIssueKey(issue: CachedAnalysisForComparison['issues'][0]): string {
    return `${issue.file}:${issue.line}:${issue.rule}`;
  }

  /**
   * Generate Redis cache key
   */
  private generateKey(repositoryUrl: string, prNumber: number): string {
    // Normalize repo URL (remove .git, https://, etc.)
    const normalizedUrl = repositoryUrl
      .replace(/^https?:\/\//, '')
      .replace(/\.git$/, '')
      .replace(/\//g, ':');

    return `fix_validation:${normalizedUrl}:pr${prNumber}`;
  }

  /**
   * Delete cached analysis (manual cleanup)
   */
  async delete(repositoryUrl: string, prNumber: number): Promise<void> {
    const key = this.generateKey(repositoryUrl, prNumber);

    try {
      await this.redis.del(key);
      console.log(`[FixValidation] 🗑️  Deleted cache: ${key}`);
    } catch (err) {
      console.error('[FixValidation] ❌ Error deleting cache:', err);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    totalEntries: number;
    keys: string[];
  }> {
    try {
      const keys = await this.redis.keys('fix_validation:*');

      return {
        totalEntries: keys.length,
        keys: keys.slice(0, 10),  // First 10 as sample
      };
    } catch (err) {
      console.error('[FixValidation] ❌ Error getting stats:', err);
      return {
        totalEntries: 0,
        keys: [],
      };
    }
  }

  /**
   * Store telemetry data in Supabase after comparison
   */
  async storeTelemetry(
    comparison: FixComparisonResult,
    metadata: {
      repositoryUrl: string;
      prNumber: number;
      commitShaPrevious: string;
      commitShaCurrent: string;
      language?: string;
      toolsUsed?: string[];
      analysisDurationPrevious?: string;
      analysisDurationCurrent?: string;
    }
  ): Promise<void> {
    if (!this.supabase) {
      console.log('[FixValidation] ⚠️  Telemetry storage disabled (no Supabase connection)');
      return;
    }

    try {
      console.log('[FixValidation] 💾 Storing telemetry in Supabase...');

      const { data, error } = await this.supabase
        .from('fix_telemetry')
        .insert({
          repository_url: metadata.repositoryUrl,
          pr_number: metadata.prNumber,
          commit_sha_previous: metadata.commitShaPrevious,
          commit_sha_current: metadata.commitShaCurrent,

          total_issues_previous: comparison.totalIssuesInPrevious,
          total_issues_current: comparison.totalIssuesInCurrent,
          issues_resolved: comparison.issuesResolved,
          issues_new: comparison.issuesNew,
          issues_remaining: comparison.issuesRemaining,

          fixes_exact: comparison.fixAdoption.exact,
          fixes_modified: comparison.fixAdoption.modified,
          fixes_different: comparison.fixAdoption.different,
          fixes_not_fixed: comparison.fixAdoption.notFixed,

          language: metadata.language,
          tools_used: metadata.toolsUsed,

          analysis_duration_previous: metadata.analysisDurationPrevious,
          analysis_duration_current: metadata.analysisDurationCurrent,
        })
        .select();

      if (error) {
        console.error('[FixValidation] ❌ Error storing telemetry:', error);
        return;
      }

      console.log('[FixValidation] ✅ Telemetry stored successfully');
      console.log(`[FixValidation]   • Record ID: ${data[0]?.id}`);
      console.log(`[FixValidation]   • Fix adoption rate: ${data[0]?.fix_adoption_rate}%`);
      console.log(`[FixValidation]   • Resolution rate: ${data[0]?.resolution_rate}%`);

    } catch (err) {
      console.error('[FixValidation] ❌ Unexpected error storing telemetry:', err);
    }
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    await this.redis.quit();
    console.log('[FixValidation] 👋 Redis connection closed');
  }
}
