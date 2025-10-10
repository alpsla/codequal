/**
 * App Score Manager
 *
 * Handles repository/application health scoring with Supabase persistence:
 * - Baseline score retrieval (100 for first-time repos, average of last 5 PR states)
 * - Score trend tracking (repository health over time)
 * - Database persistence (pr_analysis_history table)
 * - Weakest link calculation (overall = min of category scores)
 *
 * KEY DIFFERENCE from SkillScoreManager:
 * - APP scoring measures repository health (baseline = 100)
 * - Uses EXISTING issues for first-time analysis
 * - Overall score = LOWEST category (weakest link principle)
 */

import { SupabaseClient } from '@supabase/supabase-js';

export interface AppScoreData {
  repository: string;
  prNumber: number;
  prTitle?: string;
  prAuthor?: string;
  branch?: string;
  baseBranch?: string;

  // Decision
  decision: 'APPROVED' | 'DECLINED';
  confidence?: number;
  reason?: string;

  // Quality score (from V9)
  qualityScore: number;
  grade?: string;

  // APP category scores (repository health)
  appOverallScore: number;  // min(category scores) - weakest link
  appCategoryScores: {
    security: number;
    performance: number;
    architecture: number;
    dependency: number;
    codeQuality: number;
  };

  // Issue counts
  issueCounts: {
    new: number;
    existing: number;
    resolved: number;
    blocking: number;
  };

  // Metadata
  language?: string;
  analysisDuration?: number;
  toolsUsed?: string[];
  fullReportJson?: any;
  markdownReport?: string;
}

export class AppScoreManager {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Get baseline APP score for a repository
   * Returns 100 for first-time repos, average of last 5 PR states for existing repos
   */
  async getAppBaseline(repository: string): Promise<{
    overall: number;
    security: number;
    performance: number;
    architecture: number;
    dependency: number;
    codeQuality: number;
  }> {
    try {
      const { data, error } = await this.supabase
        .from('pr_analysis_history')
        .select('app_overall_score, app_security_score, app_performance_score, app_architecture_score, app_dependency_score, app_code_quality_score')
        .eq('repo_name', repository)
        .order('analyzed_at', { ascending: false })
        .limit(5);

      if (error) {
        console.warn('[AppScoreManager] Error fetching baseline:', error.message);
        return this.getDefaultBaseline();
      }

      if (!data || data.length === 0) {
        console.log(`[AppScoreManager] No previous APP scores for ${repository} - using default baseline 100`);
        return this.getDefaultBaseline();
      }

      // Calculate average of last 5 PR states
      const baseline = {
        overall: Math.round(data.reduce((sum, r) => sum + (r.app_overall_score || 100), 0) / data.length),
        security: Math.round(data.reduce((sum, r) => sum + (r.app_security_score || 100), 0) / data.length),
        performance: Math.round(data.reduce((sum, r) => sum + (r.app_performance_score || 100), 0) / data.length),
        architecture: Math.round(data.reduce((sum, r) => sum + (r.app_architecture_score || 100), 0) / data.length),
        dependency: Math.round(data.reduce((sum, r) => sum + (r.app_dependency_score || 100), 0) / data.length),
        codeQuality: Math.round(data.reduce((sum, r) => sum + (r.app_code_quality_score || 100), 0) / data.length)
      };

      console.log(`[AppScoreManager] APP baseline for ${repository}:`, baseline);
      return baseline;
    } catch (error) {
      console.error('[AppScoreManager] Unexpected error fetching baseline:', error);
      return this.getDefaultBaseline();
    }
  }

  /**
   * Default baseline for first-time repositories
   * APP starts at 100 (perfect health) and degrades based on issues
   */
  private getDefaultBaseline() {
    return {
      overall: 100,
      security: 100,
      performance: 100,
      architecture: 100,
      dependency: 100,
      codeQuality: 100
    };
  }

  /**
   * Calculate overall APP score using WEAKEST LINK principle
   * Repository health is only as good as its worst category
   */
  calculateOverallScore(categoryScores: {
    security: number;
    performance: number;
    architecture: number;
    dependency: number;
    codeQuality: number;
  }): number {
    // Weakest link = minimum category score
    const scores = Object.values(categoryScores);
    const weakestLink = Math.min(...scores);

    console.log(`[AppScoreManager] APP Overall (weakest link): ${weakestLink} from ${JSON.stringify(categoryScores)}`);
    return weakestLink;
  }

  /**
   * Get APP score trend (last N PR states)
   * Returns empty array if no history exists
   */
  async getAppTrend(
    repository: string,
    limit = 5
  ): Promise<{
    overall: number[];
    security: number[];
    performance: number[];
    architecture: number[];
    dependency: number[];
    codeQuality: number[];
  }> {
    try {
      const { data, error } = await this.supabase
        .from('pr_analysis_history')
        .select('app_overall_score, app_security_score, app_performance_score, app_architecture_score, app_dependency_score, app_code_quality_score')
        .eq('repo_name', repository)
        .order('analyzed_at', { ascending: true })
        .limit(limit);

      if (error || !data || data.length === 0) {
        return {
          overall: [],
          security: [],
          performance: [],
          architecture: [],
          dependency: [],
          codeQuality: []
        };
      }

      const trend = {
        overall: data.map(r => r.app_overall_score || 100),
        security: data.map(r => r.app_security_score || 100),
        performance: data.map(r => r.app_performance_score || 100),
        architecture: data.map(r => r.app_architecture_score || 100),
        dependency: data.map(r => r.app_dependency_score || 100),
        codeQuality: data.map(r => r.app_code_quality_score || 100)
      };

      console.log(`[AppScoreManager] APP trend for ${repository}: ${trend.overall.join(' → ')}`);
      return trend;
    } catch (error) {
      console.error('[AppScoreManager] Error fetching trend:', error);
      return {
        overall: [],
        security: [],
        performance: [],
        architecture: [],
        dependency: [],
        codeQuality: []
      };
    }
  }

  /**
   * Save APP score to Supabase (pr_analysis_history table)
   */
  async saveAppScore(data: AppScoreData): Promise<void> {
    try {
      console.log(`[AppScoreManager] Saving APP score for ${data.repository} (PR #${data.prNumber}): ${data.appOverallScore}/100`);

      const { error } = await this.supabase
        .from('pr_analysis_history')
        .upsert({
          repo_name: data.repository,
          pr_number: data.prNumber,
          pr_title: data.prTitle,
          pr_author: data.prAuthor,
          branch: data.branch,
          base_branch: data.baseBranch || 'main',

          // Decision
          decision: data.decision,
          confidence: data.confidence,
          reason: data.reason,

          // Quality score
          quality_score: data.qualityScore,
          grade: data.grade,

          // APP scores
          app_overall_score: data.appOverallScore,
          app_security_score: data.appCategoryScores.security,
          app_performance_score: data.appCategoryScores.performance,
          app_architecture_score: data.appCategoryScores.architecture,
          app_dependency_score: data.appCategoryScores.dependency,
          app_code_quality_score: data.appCategoryScores.codeQuality,

          // Issue counts
          new_issues_count: data.issueCounts.new,
          existing_issues_count: data.issueCounts.existing,
          resolved_issues_count: data.issueCounts.resolved,
          blocking_issues_count: data.issueCounts.blocking,

          // Metadata
          language: data.language,
          analyzed_at: new Date().toISOString(),
          analysis_duration_ms: data.analysisDuration,
          tools_used: data.toolsUsed,
          full_report_json: data.fullReportJson,
          markdown_report: data.markdownReport
        }, {
          onConflict: 'repo_name,pr_number'
        });

      if (error) {
        console.error('[AppScoreManager] Error saving APP score:', error);
        throw new Error(`Failed to save APP score: ${error.message}`);
      }

      console.log('[AppScoreManager] APP score saved successfully');
    } catch (error) {
      console.error('[AppScoreManager] Unexpected error saving APP score:', error);
      throw error;
    }
  }

  /**
   * Get repository health summary
   */
  async getRepositoryHealthSummary(repository: string): Promise<{
    currentScore: number;
    bestScore: number;
    worstScore: number;
    averageScore: number;
    totalAnalyses: number;
    weakestCategory: string;
    trend: 'improving' | 'declining' | 'stable';
  } | null> {
    try {
      const { data, error } = await this.supabase
        .from('pr_analysis_history')
        .select('app_overall_score, app_security_score, app_performance_score, app_architecture_score, app_dependency_score, app_code_quality_score')
        .eq('repo_name', repository)
        .order('analyzed_at', { ascending: false });

      if (error || !data || data.length === 0) {
        return null;
      }

      const scores = data.map(r => r.app_overall_score || 100);
      const currentScore = scores[0];
      const bestScore = Math.max(...scores);
      const worstScore = Math.min(...scores);
      const averageScore = Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length);

      // Find weakest category in current state
      const current = data[0];
      const categories = {
        security: current.app_security_score || 100,
        performance: current.app_performance_score || 100,
        architecture: current.app_architecture_score || 100,
        dependency: current.app_dependency_score || 100,
        codeQuality: current.app_code_quality_score || 100
      };
      const weakestCategory = Object.entries(categories).reduce((min, [cat, score]) =>
        score < categories[min] ? cat : min
      , 'security');

      // Determine trend (last 5 vs previous 5)
      let trend: 'improving' | 'declining' | 'stable' = 'stable';
      if (scores.length >= 10) {
        const recentAvg = scores.slice(0, 5).reduce((sum, s) => sum + s, 0) / 5;
        const previousAvg = scores.slice(5, 10).reduce((sum, s) => sum + s, 0) / 5;
        if (recentAvg > previousAvg + 2) trend = 'improving';
        else if (recentAvg < previousAvg - 2) trend = 'declining';
      }

      return {
        currentScore,
        bestScore,
        worstScore,
        averageScore,
        totalAnalyses: data.length,
        weakestCategory,
        trend
      };
    } catch (error) {
      console.error('[AppScoreManager] Error fetching repository summary:', error);
      return null;
    }
  }
}
