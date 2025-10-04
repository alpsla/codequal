/**
 * Skill Score Manager
 *
 * Handles developer skill tracking with Supabase persistence:
 * - Baseline score retrieval (average of last 5 PRs)
 * - Score trend tracking
 * - Database persistence
 * - Developer metrics aggregation
 * - Leaderboard ranking
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { SkillScore } from '../analyzers/v9-types';

export interface SkillScoreData {
  developerEmail: string;
  developerName?: string;
  repository: string;  // Will be stored as 'repo_name' in database
  prNumber: number;
  branch?: string;
  overallScore: number;
  qualityScore?: number;
  categoryScores: {
    security: number;
    performance: number;
    architecture: number;
    dependency: number;
    codeQuality: number;
  };
  issueCounts: {
    new: number;
    resolved: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  language?: string;
  analysisDuration?: number;
}

export class SkillScoreManager {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Get baseline score (average of last 5 analyses)
   * Returns 50 for first-time developers
   */
  async getBaselineScore(
    developerEmail: string,
    repository: string
  ): Promise<number> {
    try {
      const { data, error} = await this.supabase
        .from('skill_scores')
        .select('overall_score')
        .eq('developer_email', developerEmail)
        .eq('repo_name', repository)  // Fixed: use 'repo_name' column
        .order('analyzed_at', { ascending: false })
        .limit(5);

      if (error) {
        console.warn('[SkillScoreManager] Error fetching baseline:', error.message);
        return 50; // Default baseline for first-time users
      }

      if (!data || data.length === 0) {
        console.log(`[SkillScoreManager] No previous scores for ${developerEmail} in ${repository} - using default baseline 50`);
        return 50; // First analysis - default baseline
      }

      const avgScore = data.reduce((sum, r) => sum + r.overall_score, 0) / data.length;
      const baseline = Math.round(avgScore);

      console.log(`[SkillScoreManager] Baseline for ${developerEmail}: ${baseline} (from ${data.length} previous PRs)`);
      return baseline;
    } catch (error) {
      console.error('[SkillScoreManager] Unexpected error fetching baseline:', error);
      return 50;
    }
  }

  /**
   * Get score trend (last N scores)
   * Returns empty array if no history exists
   */
  async getScoreTrend(
    developerEmail: string,
    repository: string,
    limit: number = 5
  ): Promise<number[]> {
    try {
      const { data, error } = await this.supabase
        .from('skill_scores')
        .select('overall_score')
        .eq('developer_email', developerEmail)
        .eq('repo_name', repository)  // Fixed: use 'repo_name' column
        .order('analyzed_at', { ascending: true })
        .limit(limit);

      if (error) {
        console.warn('[SkillScoreManager] Error fetching trend:', error.message);
        return [];
      }

      if (!data || data.length === 0) {
        return [];
      }

      const trend = data.map(r => r.overall_score);
      console.log(`[SkillScoreManager] Trend for ${developerEmail}: [${trend.join(', ')}]`);
      return trend;
    } catch (error) {
      console.error('[SkillScoreManager] Unexpected error fetching trend:', error);
      return [];
    }
  }

  /**
   * Save skill score to database
   * Also updates aggregated developer metrics
   */
  async saveSkillScore(scoreData: SkillScoreData): Promise<void> {
    try {
      console.log(`[SkillScoreManager] Saving skill score for ${scoreData.developerEmail} (PR #${scoreData.prNumber}): ${scoreData.overallScore}/100`);

      const { error } = await this.supabase.from('skill_scores').insert({
        developer_email: scoreData.developerEmail,
        developer_name: scoreData.developerName,
        repo_name: scoreData.repository,  // Fixed: use 'repo_name' column
        pr_number: scoreData.prNumber,
        branch: scoreData.branch,
        overall_score: scoreData.overallScore,
        quality_score: scoreData.qualityScore,
        security_score: scoreData.categoryScores.security,
        performance_score: scoreData.categoryScores.performance,
        architecture_score: scoreData.categoryScores.architecture,
        dependency_score: scoreData.categoryScores.dependency,
        code_quality_score: scoreData.categoryScores.codeQuality,
        new_issues_count: scoreData.issueCounts.new,
        resolved_issues_count: scoreData.issueCounts.resolved,
        critical_issues_count: scoreData.issueCounts.critical,
        high_issues_count: scoreData.issueCounts.high,
        medium_issues_count: scoreData.issueCounts.medium,
        low_issues_count: scoreData.issueCounts.low,
        language: scoreData.language,
        analysis_duration_ms: scoreData.analysisDuration,
        analyzed_at: new Date().toISOString()
      });

      if (error) {
        console.error('[SkillScoreManager] Error saving skill score:', error);
        throw new Error(`Failed to save skill score: ${error.message}`);
      }

      console.log('[SkillScoreManager] Skill score saved successfully');

      // Update aggregated developer metrics
      await this.updateDeveloperMetrics(
        scoreData.developerEmail,
        scoreData.developerName,
        scoreData.overallScore,
        scoreData.categoryScores,
        scoreData.issueCounts
      );
    } catch (error) {
      console.error('[SkillScoreManager] Failed to save skill score:', error);
      // Don't throw - allow analysis to continue even if DB save fails
    }
  }

  /**
   * Update aggregated developer metrics
   * Creates new record if developer doesn't exist
   */
  private async updateDeveloperMetrics(
    developerEmail: string,
    developerName: string | undefined,
    newScore: number,
    categoryScores: SkillScoreData['categoryScores'],
    issueCounts: SkillScoreData['issueCounts']
  ): Promise<void> {
    try {
      // Get or create developer metrics
      const { data: existing, error: fetchError } = await this.supabase
        .from('developer_metrics')
        .select('*')
        .eq('developer_email', developerEmail)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        // PGRST116 = no rows returned (not an error for new developers)
        console.error('[SkillScoreManager] Error fetching developer metrics:', fetchError);
        return;
      }

      if (existing) {
        // Update existing metrics
        const totalPrs = existing.total_prs_analyzed + 1;
        const newAverage = Math.round(
          (existing.average_score * existing.total_prs_analyzed + newScore) / totalPrs
        );

        // Update category averages
        const avgSecurity = Math.round(
          (existing.avg_security_score * existing.total_prs_analyzed + categoryScores.security) / totalPrs
        );
        const avgPerformance = Math.round(
          (existing.avg_performance_score * existing.total_prs_analyzed + categoryScores.performance) / totalPrs
        );
        const avgArchitecture = Math.round(
          (existing.avg_architecture_score * existing.total_prs_analyzed + categoryScores.architecture) / totalPrs
        );
        const avgDependency = Math.round(
          (existing.avg_dependency_score * existing.total_prs_analyzed + categoryScores.dependency) / totalPrs
        );
        const avgCodeQuality = Math.round(
          (existing.avg_code_quality_score * existing.total_prs_analyzed + categoryScores.codeQuality) / totalPrs
        );

        const { error: updateError } = await this.supabase
          .from('developer_metrics')
          .update({
            developer_name: developerName || existing.developer_name,
            current_score: newScore,
            best_score: Math.max(existing.best_score, newScore),
            average_score: newAverage,
            avg_security_score: avgSecurity,
            avg_performance_score: avgPerformance,
            avg_architecture_score: avgArchitecture,
            avg_dependency_score: avgDependency,
            avg_code_quality_score: avgCodeQuality,
            total_prs_analyzed: totalPrs,
            total_issues_resolved: existing.total_issues_resolved + issueCounts.resolved,
            total_issues_introduced: existing.total_issues_introduced + issueCounts.new,
            last_analysis_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('developer_email', developerEmail);

        if (updateError) {
          console.error('[SkillScoreManager] Error updating developer metrics:', updateError);
        } else {
          console.log(`[SkillScoreManager] Updated metrics for ${developerEmail}: ${newAverage} avg (${totalPrs} PRs)`);
        }
      } else {
        // Create new metrics
        const { error: insertError } = await this.supabase
          .from('developer_metrics')
          .insert({
            developer_email: developerEmail,
            developer_name: developerName,
            current_score: newScore,
            best_score: newScore,
            average_score: newScore,
            avg_security_score: categoryScores.security,
            avg_performance_score: categoryScores.performance,
            avg_architecture_score: categoryScores.architecture,
            avg_dependency_score: categoryScores.dependency,
            avg_code_quality_score: categoryScores.codeQuality,
            total_prs_analyzed: 1,
            total_issues_resolved: issueCounts.resolved,
            total_issues_introduced: issueCounts.new,
            first_analysis_at: new Date().toISOString(),
            last_analysis_at: new Date().toISOString()
          });

        if (insertError) {
          console.error('[SkillScoreManager] Error creating developer metrics:', insertError);
        } else {
          console.log(`[SkillScoreManager] Created new metrics for ${developerEmail}: ${newScore}/100`);
        }
      }
    } catch (error) {
      console.error('[SkillScoreManager] Unexpected error updating developer metrics:', error);
    }
  }

  /**
   * Calculate score delta compared to baseline
   */
  async calculateDelta(
    developerEmail: string,
    repository: string,
    currentScore: number
  ): Promise<{ delta: number; baseline: number }> {
    const baseline = await this.getBaselineScore(developerEmail, repository);
    const delta = currentScore - baseline;

    console.log(`[SkillScoreManager] Delta for ${developerEmail}: ${delta > 0 ? '+' : ''}${delta} (${currentScore} vs baseline ${baseline})`);

    return { delta, baseline };
  }

  /**
   * Get developer ranking (leaderboard position)
   * Returns -1 if developer not found
   */
  async getDeveloperRank(developerEmail: string): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .from('developer_metrics')
        .select('developer_email, current_score')
        .order('current_score', { ascending: false });

      if (error) {
        console.warn('[SkillScoreManager] Error fetching leaderboard:', error.message);
        return -1;
      }

      if (!data || data.length === 0) {
        return -1;
      }

      const rank = data.findIndex(d => d.developer_email === developerEmail);
      if (rank === -1) {
        return -1;
      }

      console.log(`[SkillScoreManager] ${developerEmail} rank: ${rank + 1}/${data.length}`);
      return rank + 1; // 1-indexed
    } catch (error) {
      console.error('[SkillScoreManager] Unexpected error fetching rank:', error);
      return -1;
    }
  }

  /**
   * Get top N developers (leaderboard)
   */
  async getLeaderboard(limit: number = 10): Promise<Array<{
    email: string;
    name?: string;
    score: number;
    avgScore: number;
    totalPRs: number;
  }>> {
    try {
      const { data, error } = await this.supabase
        .from('developer_metrics')
        .select('developer_email, developer_name, current_score, average_score, total_prs_analyzed')
        .order('current_score', { ascending: false })
        .limit(limit);

      if (error) {
        console.warn('[SkillScoreManager] Error fetching leaderboard:', error.message);
        return [];
      }

      return (data || []).map(d => ({
        email: d.developer_email,
        name: d.developer_name,
        score: d.current_score,
        avgScore: d.average_score,
        totalPRs: d.total_prs_analyzed
      }));
    } catch (error) {
      console.error('[SkillScoreManager] Unexpected error fetching leaderboard:', error);
      return [];
    }
  }
}
