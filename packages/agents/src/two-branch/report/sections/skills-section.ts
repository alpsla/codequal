/**
 * Skills & Achievements Section Generator
 *
 * Generates the SkillsAndAchievements section showing user progress,
 * skill levels, XP earned, and achievements.
 *
 * @see unified-report-types.ts for type definitions
 */

import {
  SkillsAndAchievements,
  CategorySkill,
  XPBreakdownItem,
  UnlockedAchievement,
  InProgressAchievement,
  CommunityImpact,
  UserSkills,
  UserAchievements,
  V9AnalysisResultInput,
  FixOrchestrationResultInput,
  IssueCategory,
  ReportTier,
} from '../unified-report-types';

/**
 * XP rewards for different actions
 */
const XP_REWARDS = {
  ANALYSIS_COMPLETED: 10,
  ISSUE_FIXED: 5,
  CRITICAL_ISSUE_FIXED: 20,
  HIGH_ISSUE_FIXED: 15,
  SECURITY_ISSUE_FIXED: 10,
  PATTERN_CONTRIBUTED: 50,
  PERFECT_SCORE: 100,
  SCORE_IMPROVEMENT: 25,
  // SESSION 69: XP for developer-resolved issues (issues they fixed in their PR)
  ISSUE_RESOLVED_BY_DEV: 5,           // Base XP per resolved issue
  CRITICAL_RESOLVED_BY_DEV: 20,       // Bonus for resolving critical issues
  SECURITY_RESOLVED_BY_DEV: 10,       // Bonus for resolving security issues
};

/**
 * Level thresholds (XP required for each level)
 */
const LEVEL_THRESHOLDS = [
  0,      // Level 1
  100,    // Level 2
  250,    // Level 3
  500,    // Level 4
  1000,   // Level 5
  2000,   // Level 6
  4000,   // Level 7
  8000,   // Level 8
  16000,  // Level 9
  32000,  // Level 10
];

/**
 * Level titles
 */
const LEVEL_TITLES = [
  'Code Novice',
  'Code Apprentice',
  'Code Practitioner',
  'Code Specialist',
  'Code Expert',
  'Code Master',
  'Code Sage',
  'Code Guru',
  'Code Legend',
  'Code Virtuoso',
];

/**
 * Skill score labels
 */
function getSkillLabel(score: number): string {
  if (score >= 90) return 'Expert';
  if (score >= 75) return 'Proficient';
  if (score >= 60) return 'Competent';
  if (score >= 40) return 'Learning';
  return 'Beginner';
}

/**
 * Generate the skills and achievements section
 */
export function generateSkillsSection(
  skills: UserSkills,
  achievements: UserAchievements,
  analysis: V9AnalysisResultInput,
  fixResult: FixOrchestrationResultInput | undefined,
  tier: ReportTier
): SkillsAndAchievements {
  // Calculate XP earned this session
  const xpEarned = calculateXPEarned(analysis, fixResult);

  // Calculate updated total XP
  const newTotalXp = skills.totalXp + xpEarned.total;

  // Calculate level from XP
  const level = calculateLevel(newTotalXp);

  // Calculate skill updates
  const updatedSkills = calculateSkillUpdates(skills, analysis, fixResult);

  // Check for new achievements
  const newAchievements = checkNewAchievements(
    skills,
    achievements,
    analysis,
    fixResult,
    newTotalXp
  );

  // Calculate community impact (available for ALL tiers - no additional cost)
  const communityImpact = calculateCommunityImpact(fixResult);

  return {
    level: {
      current: level.level,
      title: LEVEL_TITLES[level.level - 1] || 'Code Master',
      xp: newTotalXp,
      xpForCurrentLevel: level.xpForCurrentLevel,
      xpForNextLevel: level.xpForNextLevel,
      progressPercent: level.progressPercent,
    },
    skills: updatedSkills,
    xpEarned,
    achievements: {
      unlocked: [
        ...achievements.unlocked,
        ...newAchievements.map((a) => ({ ...a, isNew: true })),
      ],
      inProgress: achievements.inProgress,
      totalUnlocked: achievements.totalUnlocked + newAchievements.length,
      totalAvailable: achievements.totalAvailable,
    },
    communityImpact,
  };
}

/**
 * Calculate XP earned from this analysis session
 */
function calculateXPEarned(
  analysis: V9AnalysisResultInput,
  fixResult?: FixOrchestrationResultInput
): SkillsAndAchievements['xpEarned'] {
  const breakdown: XPBreakdownItem[] = [];
  let total = 0;

  // XP for completing analysis
  total += XP_REWARDS.ANALYSIS_COMPLETED;
  breakdown.push({
    action: 'analysis_completed',
    description: 'Completed code analysis',
    amount: XP_REWARDS.ANALYSIS_COMPLETED,
  });

  // SESSION 69: XP for issues the developer resolved BEFORE analysis (proactive fixes)
  // These are issues that existed in the codebase but the developer fixed in their PR
  const resolvedIssues = analysis.issues.filter((i) => i.status === 'resolved');
  if (resolvedIssues.length > 0) {
    // Base XP for all resolved issues
    const resolvedXp = resolvedIssues.length * XP_REWARDS.ISSUE_RESOLVED_BY_DEV;
    total += resolvedXp;
    breakdown.push({
      action: 'issues_resolved_by_dev',
      description: `Proactively resolved ${resolvedIssues.length} issues`,
      amount: resolvedXp,
    });

    // Bonus XP for critical issues resolved by developer
    const criticalResolved = resolvedIssues.filter((i) => i.severity === 'critical').length;
    if (criticalResolved > 0) {
      const bonusXp = criticalResolved * XP_REWARDS.CRITICAL_RESOLVED_BY_DEV;
      total += bonusXp;
      breakdown.push({
        action: 'critical_resolved_by_dev',
        description: `Proactively resolved ${criticalResolved} critical issues`,
        amount: bonusXp,
      });
    }

    // Bonus XP for security issues resolved by developer
    const securityResolved = resolvedIssues.filter((i) => i.category === 'security').length;
    if (securityResolved > 0) {
      const bonusXp = securityResolved * XP_REWARDS.SECURITY_RESOLVED_BY_DEV;
      total += bonusXp;
      breakdown.push({
        action: 'security_resolved_by_dev',
        description: `Proactively resolved ${securityResolved} security issues`,
        amount: bonusXp,
      });
    }
  }

  if (fixResult) {
    // XP for fixed issues
    const fixedCount = fixResult.execution.totalFixesApplied;
    if (fixedCount > 0) {
      const issueXp = fixedCount * XP_REWARDS.ISSUE_FIXED;
      total += issueXp;
      breakdown.push({
        action: 'issues_fixed',
        description: `Fixed ${fixedCount} issues`,
        amount: issueXp,
      });
    }

    // Bonus XP for critical fixes
    const criticalFixes = fixResult.fixes.filter((f) => {
      const issue = analysis.issues.find((i) => i.id === f.issueId);
      return issue?.severity === 'critical';
    }).length;
    if (criticalFixes > 0) {
      const bonusXp = criticalFixes * XP_REWARDS.CRITICAL_ISSUE_FIXED;
      total += bonusXp;
      breakdown.push({
        action: 'critical_fixes',
        description: `Fixed ${criticalFixes} critical issues`,
        amount: bonusXp,
      });
    }

    // Bonus XP for security fixes
    const securityFixes = fixResult.fixes.filter((f) => {
      const issue = analysis.issues.find((i) => i.id === f.issueId);
      return issue?.category === 'security';
    }).length;
    if (securityFixes > 0) {
      const bonusXp = securityFixes * XP_REWARDS.SECURITY_ISSUE_FIXED;
      total += bonusXp;
      breakdown.push({
        action: 'security_fixes',
        description: `Fixed ${securityFixes} security issues`,
        amount: bonusXp,
      });
    }

    // Bonus XP for score improvement
    if (fixResult.score > analysis.score) {
      total += XP_REWARDS.SCORE_IMPROVEMENT;
      breakdown.push({
        action: 'score_improvement',
        description: `Improved score from ${analysis.score} to ${fixResult.score}`,
        amount: XP_REWARDS.SCORE_IMPROVEMENT,
      });
    }

    // Bonus XP for perfect score
    if (fixResult.score >= 95) {
      total += XP_REWARDS.PERFECT_SCORE;
      breakdown.push({
        action: 'perfect_score',
        description: 'Achieved near-perfect score (95+)',
        amount: XP_REWARDS.PERFECT_SCORE,
      });
    }
  }

  return { total, breakdown };
}

/**
 * Calculate level from total XP
 */
function calculateLevel(totalXp: number): {
  level: number;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
  progressPercent: number;
} {
  let level = 1;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalXp >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
      break;
    }
  }

  const xpForCurrentLevel = LEVEL_THRESHOLDS[level - 1] || 0;
  const xpForNextLevel = LEVEL_THRESHOLDS[level] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] * 2;

  const progressInLevel = totalXp - xpForCurrentLevel;
  const xpNeededForNext = xpForNextLevel - xpForCurrentLevel;
  const progressPercent = Math.min(100, Math.round((progressInLevel / xpNeededForNext) * 100));

  return {
    level,
    xpForCurrentLevel,
    xpForNextLevel,
    progressPercent,
  };
}

/**
 * Calculate skill updates based on analysis
 */
function calculateSkillUpdates(
  skills: UserSkills,
  analysis: V9AnalysisResultInput,
  fixResult?: FixOrchestrationResultInput
): Record<IssueCategory, CategorySkill> {
  const categories: IssueCategory[] = [
    'security',
    'code_quality',
    'performance',
    'architecture',
    'dependencies',
  ];

  const result: Record<IssueCategory, CategorySkill> = {} as Record<IssueCategory, CategorySkill>;

  for (const category of categories) {
    const currentScore = getCategoryScore(skills, category);

    // Count issues and fixes for this category
    const categoryIssues = analysis.issues.filter((i) => i.category === category);
    const fixedCount = fixResult
      ? fixResult.fixes.filter((f) => {
          const issue = analysis.issues.find((i) => i.id === f.issueId);
          return issue?.category === category;
        }).length
      : 0;

    // Calculate score change based on fix ratio
    const fixRatio = categoryIssues.length > 0 ? fixedCount / categoryIssues.length : 0;
    const scoreChange = Math.round(fixRatio * 5); // Max +5 points per session

    // Determine trend
    let trend: 'improving' | 'declining' | 'stable';
    if (scoreChange > 0) {
      trend = 'improving';
    } else if (categoryIssues.length > 10 && fixedCount === 0) {
      trend = 'declining';
    } else {
      trend = 'stable';
    }

    const newScore = Math.min(100, Math.max(0, currentScore + scoreChange));

    result[category] = {
      score: newScore,
      scoreLabel: getSkillLabel(newScore),
      trend,
      trendValue: scoreChange,
      issuesFixedLifetime: getCategoryFixCount(skills, category) + fixedCount,
      issuesFixedThisSession: fixedCount,
    };
  }

  return result;
}

/**
 * Get category score from user skills
 */
function getCategoryScore(skills: UserSkills, category: IssueCategory): number {
  const scoreMap: Record<IssueCategory, number> = {
    security: skills.securityScore,
    code_quality: skills.codeQualityScore,
    performance: skills.performanceScore,
    architecture: skills.architectureScore,
    dependencies: skills.dependenciesScore,
  };
  return scoreMap[category];
}

/**
 * Get category fix count (placeholder - would come from detailed stats)
 */
function getCategoryFixCount(skills: UserSkills, _category: IssueCategory): number {
  // This would ideally be tracked per-category
  return Math.round(skills.issuesFixedTotal / 5); // Rough estimate
}

/**
 * Check for newly unlocked achievements
 */
function checkNewAchievements(
  skills: UserSkills,
  achievements: UserAchievements,
  analysis: V9AnalysisResultInput,
  fixResult: FixOrchestrationResultInput | undefined,
  newTotalXp: number
): UnlockedAchievement[] {
  const newAchievements: UnlockedAchievement[] = [];
  const unlockedIds = new Set(achievements.unlocked.map((a) => a.id));

  // First analysis achievement
  if (skills.analysesCompleted === 0 && !unlockedIds.has('early-adopter')) {
    newAchievements.push({
      id: 'early-adopter',
      name: 'Early Adopter',
      description: 'Completed first analysis',
      icon: '\u{1F680}', // Rocket emoji
      rarity: 'common',
      unlockedAt: new Date().toISOString(),
      isNew: true,
    });
  }

  // First security fix
  if (fixResult && !unlockedIds.has('first-blood')) {
    const securityFixes = fixResult.fixes.filter((f) => {
      const issue = analysis.issues.find((i) => i.id === f.issueId);
      return issue?.category === 'security';
    });
    if (securityFixes.length > 0) {
      newAchievements.push({
        id: 'first-blood',
        name: 'First Security Fix',
        description: 'Fixed your first security vulnerability',
        icon: '\u{1F6E1}', // Shield emoji
        rarity: 'common',
        unlockedAt: new Date().toISOString(),
        isNew: true,
      });
    }
  }

  // Perfect score achievement
  if (fixResult && fixResult.score >= 95 && !unlockedIds.has('zero-issues')) {
    newAchievements.push({
      id: 'zero-issues',
      name: 'Flawless Code',
      description: 'Achieved near-perfect score (95+)',
      icon: '\u2B50', // Star emoji
      rarity: 'rare',
      unlockedAt: new Date().toISOString(),
      isNew: true,
    });
  }

  return newAchievements;
}

/**
 * Calculate community impact metrics (PRO only)
 */
function calculateCommunityImpact(
  fixResult?: FixOrchestrationResultInput
): CommunityImpact | undefined {
  if (!fixResult) return undefined;

  // Count pattern contributions (fixes that used pattern matching)
  const patternFixes = fixResult.fixes.filter(
    (f) => f.tier === 'tier2_5_pattern'
  ).length;

  // These would come from actual community data
  return {
    patternsContributed: 0, // Would be tracked in database
    patternsContributedThisSession: patternFixes > 3 ? 1 : 0, // Simplified: contribute if 3+ similar fixes
    developersHelped: 0, // Would be tracked in database
    timeSavedForOthers: '0 hours', // Would be calculated from pattern reuse
  };
}
