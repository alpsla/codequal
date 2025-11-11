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
  skillCategoryScores?: {
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
      
      // BUG FIX #10, #50, SESSION_13_FIX#1: Reconstruct categoryScores from individual columns
      // Use nullish coalescing to allow 0 scores (not falsy fallback)
      // SESSION 13 FIX: Categories without issues should show 100/100 (perfect score), not 50/100
      const categoryScores = {
        security: appScore.security_score ?? 100,
        performance: appScore.performance_score ?? 100,
        architecture: appScore.architecture_score ?? 100,
        dependency: appScore.dependency_score ?? 100,
        codeQuality: appScore.code_quality_score ?? 100
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
    // APP Score: Uses ALL issues (repository health)
    const issuesByCategory = {
      security: issues.filter(i => i.detectedCategory === 'Security'),
      performance: issues.filter(i => i.detectedCategory === 'Performance'),
      architecture: issues.filter(i => i.detectedCategory === 'Architecture'),
      dependency: issues.filter(i => i.detectedCategory === 'Dependencies'),
      codeQuality: issues.filter(i => i.detectedCategory === 'Code Quality')
    };
    
    // SKILL Score: Only issues developer is responsible for (fair scoring)
    const developerIssues = issues.filter(i => i.category === 'NEW' || i.category === 'EXISTING_MODIFIED');
    const developerIssuesByCategory = {
      security: developerIssues.filter(i => i.detectedCategory === 'Security'),
      performance: developerIssues.filter(i => i.detectedCategory === 'Performance'),
      architecture: developerIssues.filter(i => i.detectedCategory === 'Architecture'),
      dependency: developerIssues.filter(i => i.detectedCategory === 'Dependencies'),
      codeQuality: developerIssues.filter(i => i.detectedCategory === 'Code Quality')
    };
    
    // SESSION 13 FIX: Calculate category scores for APP (base=100)
    const appCategoryScores = {
      security: calculateCategoryScore(issuesByCategory.security, 100),
      performance: calculateCategoryScore(issuesByCategory.performance, 100),
      architecture: calculateCategoryScore(issuesByCategory.architecture, 100),
      dependency: calculateCategoryScore(issuesByCategory.dependency, 100),
      codeQuality: calculateCategoryScore(issuesByCategory.codeQuality, 100)
    };

    // SKILL SCORE FIX: Use developer-responsible issues only (NEW + EXISTING_MODIFIED)
    // This ensures developers are only penalized for issues they can control
    const skillCategoryScores = {
      security: calculateCategoryScore(developerIssuesByCategory.security, 50),
      performance: calculateCategoryScore(developerIssuesByCategory.performance, 50),
      architecture: calculateCategoryScore(developerIssuesByCategory.architecture, 50),
      dependency: calculateCategoryScore(developerIssuesByCategory.dependency, 50),
      codeQuality: calculateCategoryScore(developerIssuesByCategory.codeQuality, 50)
    };

    // BUG FIX #44: Calculate APP score (minimum of categories - weakest link)
    const appScore = Math.min(
      appCategoryScores.security,
      appCategoryScores.performance,
      appCategoryScores.architecture,
      appCategoryScores.dependency,
      appCategoryScores.codeQuality
    );

    // SESSION 13 FIX: Calculate Skill score with base=50 categories
    const skillScore = Math.round(
      (skillCategoryScores.security + skillCategoryScores.performance +
       skillCategoryScores.architecture + skillCategoryScores.dependency +
       skillCategoryScores.codeQuality) / 5
    );

    // Use appCategoryScores for saving to database (repository health)
    const categoryScores = appCategoryScores;

    // FIX BUG #2: Calculate blocking issues (NEW + EXISTING_MODIFIED with CRITICAL/HIGH)
    const blockingIssuesCount = issues.filter(i =>
      (i.category === 'NEW' || i.category === 'EXISTING_MODIFIED') &&
      (i.severity === 'critical' || i.severity === 'high')
    ).length;

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
        // FIX BUG #2: Decision based on blocking issues, not score
        decision: blockingIssuesCount > 0 ? 'DECLINED' : 'APPROVED',
        quality_score: appScore,
        analyzed_at: new Date().toISOString(),
        new_issues_count: newIssues.length,
        existing_issues_count: existingModified.length + existingRest.length,
        resolved_issues_count: resolvedIssues.length,
        // FIX BUG #2: Use correct blocking issues count
        blocking_issues_count: blockingIssuesCount
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
        // BUG FIX #90: Use skillCategoryScores (base=50) for skill_scores table
        security_score: skillCategoryScores.security,
        performance_score: skillCategoryScores.performance,
        architecture_score: skillCategoryScores.architecture,
        dependency_score: skillCategoryScores.dependency,
        code_quality_score: skillCategoryScores.codeQuality,
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
      skillCategoryScores,
      appScore,
      skillScore,
      breakdown: {
        baseScore: 100,
        categoryScores,
        skillCategoryScores,
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
export function calculateCategoryScore(categoryIssues: EnrichedIssue[], baseScore = 100): number {
  // SESSION 13 FIX: Use provided baseScore (100 for APP, 50 for Skill)
  let score = baseScore;
  
  categoryIssues.forEach(issue => {
    // User-specified deduction values
    const deduction = {
      critical: 5.0,    // -5 points
      high: 3.0,        // -3 points
      medium: 1.0,      // -1 point
      low: 0.5          // -0.5 points
    }[issue.severity] || 1.0;
    
    // Handle RESOLVED issues (bonus) vs other issues (penalty)
    if (issue.category === 'RESOLVED') {
      score += deduction;  // Bonus for fixes
    } else {
      // NEW, EXISTING_MODIFIED, EXISTING_REST all deduct
      score -= deduction;
    }
  });
  
  // Ensure score stays within 0-100 range
  return Math.max(0, Math.min(100, Math.round(score)));
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
  
  // Apply severity weights to calculate deduction
  // All categories have equal weight (100%) - only blocking decision differs
  issues.forEach(issue => {
    // Severity weight
    const severityWeight = {
      critical: 5.0,
      high: 3.0,
      medium: 1.0,
      low: 0.5
    }[issue.severity] || 1.0;

    // All categories count equally toward score - no category multiplier
    // Only difference: NEW and EXISTING_MODIFIED can block PR (decision logic)
    deduction += severityWeight;
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
  // All categories use 100% weight (equal impact on score)
  const newIssuesDeduction = newIssues.reduce((sum, i) => {
    const weight = { critical: 5, high: 3, medium: 1, low: 0.5 }[i.severity] || 1;
    return sum + weight;
  }, 0);

  const existingModifiedDeduction = existingModified.reduce((sum, i) => {
    const weight = { critical: 5, high: 3, medium: 1, low: 0.5 }[i.severity] || 1;
    return sum + weight;
  }, 0);

  const existingRestDeduction = existingRest.reduce((sum, i) => {
    const weight = { critical: 5, high: 3, medium: 1, low: 0.5 }[i.severity] || 1;
    return sum + weight;
  }, 0);
  
  // P0 FIX: Calculate category scores even without Supabase
  // Group issues by detectedCategory (Security, Performance, etc.)
  const issuesByCategory: Record<string, EnrichedIssue[]> = {
    security: issues.filter(i => i.detectedCategory === 'Security'),
    performance: issues.filter(i => i.detectedCategory === 'Performance'),
    architecture: issues.filter(i => i.detectedCategory === 'Architecture'),
    dependency: issues.filter(i => i.detectedCategory === 'Dependency' || i.detectedCategory === 'Dependencies'),
    codeQuality: issues.filter(i => i.detectedCategory === 'Code Quality')
  };
  
  // Calculate score for each category with base=100 (for APP Score)
  const categoryScores = {
    security: calculateCategoryScore(issuesByCategory.security, 100),
    performance: calculateCategoryScore(issuesByCategory.performance, 100),
    architecture: calculateCategoryScore(issuesByCategory.architecture, 100),
    dependency: calculateCategoryScore(issuesByCategory.dependency, 100),
    codeQuality: calculateCategoryScore(issuesByCategory.codeQuality, 100)
  };

  // P0 ISSUE #3 FIX: Calculate skill category scores with base=50 (for Skill Score)
  // Skill Score uses base=50 to distinguish developers: 0 issues = 50/100 (passing threshold)
  // Developers with issues score <50 (clear signal of problems needing improvement)
  const skillCategoryScores = {
    security: calculateCategoryScore(issuesByCategory.security, 50),
    performance: calculateCategoryScore(issuesByCategory.performance, 50),
    architecture: calculateCategoryScore(issuesByCategory.architecture, 50),
    dependency: calculateCategoryScore(issuesByCategory.dependency, 50),
    codeQuality: calculateCategoryScore(issuesByCategory.codeQuality, 50)
  };

  // APP Score = MIN of all categories (weakest link)
  const appScore = Math.min(
    categoryScores.security,
    categoryScores.performance,
    categoryScores.architecture,
    categoryScores.dependency,
    categoryScores.codeQuality
  );

  // Skill Score = AVG of skill category scores (base=50)
  const skillScore = Math.round(
    (skillCategoryScores.security + skillCategoryScores.performance + skillCategoryScores.architecture +
     skillCategoryScores.dependency + skillCategoryScores.codeQuality) / 5
  );
  
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
    },
    // P0 FIX: Include category scores even without Supabase
    categoryScores,      // APP Score uses base=100
    skillCategoryScores, // Skill Score uses base=50
    appScore,
    skillScore
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
