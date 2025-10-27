/**
 * Score Calculator Service
 * 
 * Handles all quality score calculations including:
 * - Full V9 category-based scoring with Supabase
 * - Cached score retrieval
 * - Simplified scoring (fallback)
 * - Score interpretation
 * 
 * Phase 9 of v9-grouped-report-formatter.ts refactoring
 */

import { EnrichedIssue } from './types';

/**
 * Calculate overall quality score with full V9 scoring or simplified fallback
 */
export async function calculateQualityScore(
  issues: EnrichedIssue[],
  metadata: { repository?: string; prNumber?: number; commitSHA?: string; prAuthor?: string; prAuthorEmail?: string },
  appScoreManager: any,
  skillScoreManager: any
): Promise<{ 
  score: number; 
  grade: string; 
  breakdown: any;
  categoryScores?: {
    security: number;
    performance: number;
    architecture: number;
    dependency: number;
    codeQuality: number;
  };
  appScore?: number;
  skillScore?: number;
}> {
  // Use full V9 scoring if Supabase is available
  if (appScoreManager && skillScoreManager && metadata.repository) {
    // BUG FIX #9: Check for cached scores if commit SHA provided (prevents score decay on re-runs)
    if (metadata.commitSHA && metadata.prNumber) {
      const cached = await checkCachedScoresForCommit(metadata, appScoreManager, skillScoreManager);
      if (cached) {
        console.log(`[ScoreCalculator] ⚡ Using cached scores for commit ${metadata.commitSHA.slice(0, 7)} - no recalculation needed`);
        return cached;
      }
    }
    
    return await calculateFullV9Score(issues, metadata, appScoreManager, skillScoreManager);
  }
  
  // Fall back to simplified scoring
  return calculateSimplifiedScore(issues);
}

/**
 * Check if we already have scores for this exact commit
 * Prevents score decay when re-running analysis on unchanged code
 * 
 * BUG FIX #9: Commit SHA caching
 */
export async function checkCachedScoresForCommit(
  metadata: { repository?: string; prNumber?: number; commitSHA?: string; prAuthorEmail?: string },
  appScoreManager: any,
  skillScoreManager: any
): Promise<any | null> {
  if (!appScoreManager || !skillScoreManager || !metadata.commitSHA) {
    return null;
  }
  
  try {
    const supabase = (appScoreManager as any).supabase;
    
    // Query both scores in parallel
    const [appResult, skillResult] = await Promise.all([
      supabase
        .from('app_scores')
        .select('*')
        .eq('repo_name', metadata.repository)
        .eq('pr_number', metadata.prNumber)
        .eq('commit_sha', metadata.commitSHA)
        .order('analyzed_at', { ascending: false })
        .limit(1)
        .single(),
      supabase
        .from('skill_scores')
        .select('*')
        .eq('developer_email', metadata.prAuthorEmail)
        .eq('repo_name', metadata.repository)
        .eq('pr_number', metadata.prNumber)
        .eq('commit_sha', metadata.commitSHA)
        .order('analyzed_at', { ascending: false })
        .limit(1)
        .single()
    ]);
    
    const appScore = appResult.data;
    const skillScore = skillResult.data;
    
    // Only use cache if BOTH scores exist
    if (appScore && skillScore) {
      console.log(`[ScoreCalculator] ✅ Found cached scores - APP: ${appScore.overall_score}, Skill: ${skillScore.overall_score}`);
      
      // BUG FIX #10, #50: Reconstruct categoryScores from individual columns
      // Use nullish coalescing to allow 0 scores (not falsy fallback)
      const categoryScores = {
        security: appScore.security_score ?? 50,
        performance: appScore.performance_score ?? 50,
        architecture: appScore.architecture_score ?? 50,
        dependency: appScore.dependency_score ?? 50,
        codeQuality: appScore.code_quality_score ?? 50
      };
      
      // Determine grade
      const score = appScore.overall_score;
      let grade: string;
      if (score >= 90) grade = 'A';
      else if (score >= 80) grade = 'B';
      else if (score >= 70) grade = 'C';
      else if (score >= 60) grade = 'D';
      else grade = 'F';
      
      return {
        score: appScore.overall_score,
        grade,
        categoryScores,
        appScore: appScore.overall_score,
        skillScore: skillScore.overall_score,
        fromCache: true,
        breakdown: {
          baseScore: 50,
          categoryScores,
          overallMethod: 'APP = MIN(categories) - weakest link',
          skillScoreMethod: 'Skill = AVG(categories)',
          cachedFromCommit: metadata.commitSHA.slice(0, 7)
        }
      };
    }
    
    return null;
  } catch (error: any) {
    // No cached scores found or error - will calculate fresh
    if (error.code !== 'PGRST116') { // Not a "no rows" error
      console.log(`[ScoreCalculator] Cache lookup error:`, error.message);
    }
    return null;
  }
}

/**
 * Full V9 category-based scoring with Supabase persistence
 * 
 * BUG FIXES INCLUDED:
 * - #7: Baseline 50 (prevents score decay)
 * - #8: Save actual PR number (not 0)
 * - #9: Save commit SHA for caching
 */
export async function calculateFullV9Score(
  issues: EnrichedIssue[],
  metadata: { repository?: string; prNumber?: number; commitSHA?: string; prAuthor?: string; prAuthorEmail?: string },
  appScoreManager: any,
  skillScoreManager: any
): Promise<any> {
  try {
    // Separate issues by type
    const newIssues = issues.filter(i => i.category === 'NEW');
    const existingModified = issues.filter(i => i.category === 'EXISTING_MODIFIED');
    const existingRest = issues.filter(i => i.category === 'EXISTING_REST');
    const resolvedIssues = issues.filter(i => i.category === 'RESOLVED');
    
    // Group issues by detected category (Security, Performance, etc.)
    const issuesByCategory = {
      security: issues.filter(i => i.detectedCategory === 'Security'),
      performance: issues.filter(i => i.detectedCategory === 'Performance'),
      architecture: issues.filter(i => i.detectedCategory === 'Architecture'),
      dependency: issues.filter(i => i.detectedCategory === 'Dependencies'),
      codeQuality: issues.filter(i => i.detectedCategory === 'Code Quality')
    };
    
    // Calculate per-category scores
    const categoryScores = {
      security: calculateCategoryScore(issuesByCategory.security),
      performance: calculateCategoryScore(issuesByCategory.performance),
      architecture: calculateCategoryScore(issuesByCategory.architecture),
      dependency: calculateCategoryScore(issuesByCategory.dependency),
      codeQuality: calculateCategoryScore(issuesByCategory.codeQuality)
    };
    
    // BUG FIX #44: Calculate APP score (minimum of categories - weakest link)
    const appScore = Math.min(
      categoryScores.security,
      categoryScores.performance,
      categoryScores.architecture,
      categoryScores.dependency,
      categoryScores.codeQuality
    );
    
    // BUG FIX #44: Calculate Skill score (AVERAGE of category scores)
    const skillScore = Math.round(
      (categoryScores.security + categoryScores.performance + categoryScores.architecture + 
       categoryScores.dependency + categoryScores.codeQuality) / 5
    );
    
    // Save to Supabase with commit SHA for caching (BUG FIXES #7, #8, #9, #10)
    if (appScoreManager && metadata.repository) {
      console.log(`[ScoreCalculator] 💾 Saving APP score: ${appScore}/100 for ${metadata.repository} PR #${metadata.prNumber || 0} (commit: ${metadata.commitSHA?.slice(0, 7) || 'unknown'})`);
      
      const supabase = (appScoreManager as any).supabase;
      const { error } = await supabase.from('app_scores').insert({
        repo_name: metadata.repository,
        pr_number: metadata.prNumber || 0,
        commit_sha: metadata.commitSHA || null,
        overall_score: appScore,
        // BUG FIX #10: Map categoryScores to individual columns (not JSONB)
        security_score: categoryScores.security,
        performance_score: categoryScores.performance,
        architecture_score: categoryScores.architecture,
        dependency_score: categoryScores.dependency,
        code_quality_score: categoryScores.codeQuality,
        decision: appScore >= 70 ? 'APPROVED' : 'DECLINED',
        quality_score: appScore,
        analyzed_at: new Date().toISOString(),
        new_issues_count: newIssues.length,
        existing_issues_count: existingModified.length + existingRest.length,
        resolved_issues_count: resolvedIssues.length,
        blocking_issues_count: newIssues.filter(i => i.severity === 'critical' || i.severity === 'high').length
      });
      
      if (error) {
        console.error('[ScoreCalculator] ❌ Failed to save APP score:', error.message);
      } else {
        console.log('[ScoreCalculator] ✅ APP score saved successfully');
      }
    }
    
    if (skillScoreManager && metadata.prAuthorEmail && metadata.repository) {
      console.log(`[ScoreCalculator] 💾 Saving Skill score: ${skillScore}/100 for ${metadata.prAuthorEmail} PR #${metadata.prNumber || 0} (commit: ${metadata.commitSHA?.slice(0, 7) || 'unknown'})`);
      
      const supabase = (skillScoreManager as any).supabase;
      const { error } = await supabase.from('skill_scores').insert({
        developer_email: metadata.prAuthorEmail,
        developer_name: metadata.prAuthor || metadata.prAuthorEmail,
        repo_name: metadata.repository,
        pr_number: metadata.prNumber || 0,
        commit_sha: metadata.commitSHA || null,
        overall_score: skillScore,
        // BUG FIX #10: Map categoryScores to individual columns (not JSONB)
        security_score: categoryScores.security,
        performance_score: categoryScores.performance,
        architecture_score: categoryScores.architecture,
        dependency_score: categoryScores.dependency,
        code_quality_score: categoryScores.codeQuality,
        analyzed_at: new Date().toISOString(),
        new_issues_count: newIssues.length,
        resolved_issues_count: resolvedIssues.length,
        critical_issues_count: issues.filter(i => i.severity === 'critical').length,
        high_issues_count: issues.filter(i => i.severity === 'high').length,
        medium_issues_count: issues.filter(i => i.severity === 'medium').length,
        low_issues_count: issues.filter(i => i.severity === 'low').length
      });
      
      if (error) {
        console.error('[ScoreCalculator] ❌ Failed to save Skill score:', error.message);
      } else {
        console.log('[ScoreCalculator] ✅ Skill score saved successfully');
      }
    }
    
    // Determine grade based on appScore
    let grade: string;
    if (appScore >= 90) grade = 'A';
    else if (appScore >= 80) grade = 'B';
    else if (appScore >= 70) grade = 'C';
    else if (appScore >= 60) grade = 'D';
    else grade = 'F';
    
    return {
      score: appScore,
      grade,
      categoryScores,
      appScore,
      skillScore,
      breakdown: {
        baseScore: 100,
        categoryScores,
        overallMethod: 'APP = MIN(categories) - weakest link',
        skillScoreMethod: 'Skill = AVG(categories)'
      }
    };
  } catch (error) {
    console.error('[ScoreCalculator] Error calculating full V9 score:', error);
    // Fall back to simplified scoring
    return calculateSimplifiedScore(issues);
  }
}

/**
 * Calculate APP SCORE for a single category (Security, Performance, etc.)
 * BUG FIXES #20-23: Simplified scoring logic
 * 
 * Base: 100/100 (app health per category)
 * Counts ALL issues: NEW, EXISTING_MODIFIED, EXISTING_REST, RESOLVED
 * All have same weight (only sign differs)
 */
export function calculateCategoryScore(categoryIssues: EnrichedIssue[]): number {
  const BASE = 50;  // BUG FIX #35: Universal baseline 50/100 for all categories (neutral)
  let adjustment = 0;
  
  categoryIssues.forEach(issue => {
    const weight = {
      critical: 5.0,
      high: 3.0,
      medium: 1.0,
      low: 0.5
    }[issue.severity] || 1.0;
    
    // Simple logic: All issues affect app health equally
    if (issue.category === 'RESOLVED') {
      adjustment += weight;  // Bonus for fixes
    } else {
      // NEW, EXISTING_MODIFIED, EXISTING_REST all get -weight
      adjustment -= weight;
    }
  });
  
  return Math.max(0, Math.min(100, Math.round(BASE + adjustment)));
}

/**
 * Simplified scoring (fallback when Supabase unavailable)
 */
export function calculateSimplifiedScore(issues: EnrichedIssue[]): any {
  const baseScore = 100.0;
  let deduction = 0;
  
  // Separate issues by category for breakdown
  const newIssues = issues.filter(i => i.category === 'NEW');
  const existingModified = issues.filter(i => i.category === 'EXISTING_MODIFIED');
  const existingRest = issues.filter(i => i.category === 'EXISTING_REST');
  const resolvedIssues = issues.filter(i => i.category === 'RESOLVED');
  
  // Count blocking issues (critical or high severity NEW/EXISTING_MODIFIED)
  const blockingIssues = issues.filter(i => 
    (i.severity === 'critical' || i.severity === 'high') && 
    (i.category === 'NEW' || i.category === 'EXISTING_MODIFIED')
  );
  
  // Apply severity and category weights to calculate deduction
  issues.forEach(issue => {
    // Severity weight
    const severityWeight = {
      critical: 5.0,
      high: 3.0,
      medium: 1.0,
      low: 0.5
    }[issue.severity] || 1.0;
    
    // Category weight - NEW issues get full deduction, existing get reduced impact
    const categoryWeight = {
      'NEW': 1.0,                    // Full deduction (introduced in this PR)
      'EXISTING_MODIFIED': 0.5,      // 50% deduction (existing but touched)
      'EXISTING_REST': 0.1           // 10% deduction (existing, untouched)
    }[issue.category] || 0.1;
    
    deduction += severityWeight * categoryWeight;
  });
  
  // Extra penalty for blocking issues
  const blockingPenalty = blockingIssues.length * 2.5;
  deduction += blockingPenalty;
  
  // Bonus for resolved issues (encourage fixing existing problems)
  const bonus = resolvedIssues.reduce((sum, issue) => {
    const weight = { critical: 5, high: 3, medium: 1, low: 0.5 }[issue.severity] || 1;
    return sum + weight;
  }, 0);
  
  // Calculate final score
  let finalScore = baseScore - deduction + bonus;
  
  // Clamp score between 0 and 100
  finalScore = Math.max(0, Math.min(100, finalScore));
  
  // Determine grade
  let grade: string;
  if (finalScore >= 90) grade = 'A';
  else if (finalScore >= 80) grade = 'B';
  else if (finalScore >= 70) grade = 'C';
  else if (finalScore >= 60) grade = 'D';
  else grade = 'F';
  
  // Calculate individual category deductions for breakdown
  const newIssuesDeduction = newIssues.reduce((sum, i) => {
    const weight = { critical: 5, high: 3, medium: 1, low: 0.5 }[i.severity] || 1;
    return sum + (weight * 1.0);
  }, 0);
  
  const existingModifiedDeduction = existingModified.reduce((sum, i) => {
    const weight = { critical: 5, high: 3, medium: 1, low: 0.5 }[i.severity] || 1;
    return sum + (weight * 0.5);
  }, 0);
  
  const existingRestDeduction = existingRest.reduce((sum, i) => {
    const weight = { critical: 5, high: 3, medium: 1, low: 0.5 }[i.severity] || 1;
    return sum + (weight * 0.1);
  }, 0);
  
  return {
    score: Math.round(finalScore * 10) / 10,  // Round to 1 decimal
    grade,
    breakdown: {
      baseScore,
      newIssuesDeduction: -newIssuesDeduction,
      existingModifiedDeduction: -existingModifiedDeduction,
      existingRestDeduction: -existingRestDeduction,
      blockingPenalty: -blockingPenalty,
      resolutionBonus: bonus,
      totalDeduction: -deduction,
      finalScore: Math.round(finalScore * 10) / 10
    }
  };
}

/**
 * Get quality score interpretation
 */
export function getScoreInterpretation(score: number): { emoji: string; label: string; description: string } {
  if (score >= 90) {
    return {
      emoji: '🏆',
      label: 'Excellent',
      description: 'Outstanding code quality with minimal issues'
    };
  } else if (score >= 80) {
    return {
      emoji: '✨',
      label: 'Good',
      description: 'High code quality with minor improvements needed'
    };
  } else if (score >= 70) {
    return {
      emoji: '👍',
      label: 'Fair',
      description: 'Acceptable quality but consider addressing issues'
    };
  } else if (score >= 60) {
    return {
      emoji: '⚠️',
      label: 'Poor',
      description: 'Multiple issues need attention'
    };
  } else {
    return {
      emoji: '❌',
      label: 'Critical',
      description: 'Significant quality issues require immediate action'
    };
  }
}
