/**
 * Unified Report Generator
 *
 * Main entry point for generating unified reports for both BASIC and PRO tiers.
 * Coordinates all section generators and handles user context.
 *
 * @see unified-report-types.ts for type definitions
 */

import {
  UnifiedReport,
  GenerateReportInput,
  GenerateReportDependencies,
  ReportTier,
  V9AnalysisResultInput,
  FixOrchestrationResultInput,
  HistoricalAnalysis,
  UserPreferences,
  UserSkills,
  UserAchievements,
} from './unified-report-types';

import {
  generateHeaderSection,
  generateProgressSection,
  generateFixSummarySection,
  generateRemainingIssuesSection,
  generateBusinessImpactSection,
  generateEducationalSection,
  generateIDEIntegrationSection,
  generateSkillsSection,
  generateCommitInfoSection,
  generateMetadataSection,
} from './sections';

/**
 * Default user preferences when none exist
 */
const DEFAULT_PREFERENCES: UserPreferences = {
  userId: '',
  historyDisplayCount: 5,
  defaultOutputMethod: 'commit',
  defaultCommitStyle: 'single',
  defaultFixScope: 'recommended',
  commitMessageTemplate: 'fix: CodeQual auto-fixes ({count} issues)',
  reviewConfidenceThreshold: 80,
  alwaysReviewSecurity: true,
  alwaysReviewDependencies: true,
  alwaysReviewPerformance: true,
  hourlyRate: 150,
  achievementStyle: 'professional',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

/**
 * Default user skills when none exist
 */
const DEFAULT_SKILLS: UserSkills = {
  userId: '',
  level: 1,
  totalXp: 0,
  securityScore: 50,
  codeQualityScore: 50,
  dependenciesScore: 50,
  performanceScore: 50,
  architectureScore: 50,
  issuesFixedTotal: 0,
  analysesCompleted: 0,
  patternsContributed: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

/**
 * Default achievements when none exist
 */
const DEFAULT_ACHIEVEMENTS: UserAchievements = {
  unlocked: [],
  inProgress: [],
  totalUnlocked: 0,
  totalAvailable: 10, // Base number of achievements
};

/**
 * Generate a unique report ID
 */
function generateReportId(): string {
  return `report-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Generate a unified report for BASIC or PRO tier
 */
export async function generateUnifiedReport(
  input: GenerateReportInput,
  deps: GenerateReportDependencies
): Promise<UnifiedReport> {
  const { analysisResult, fixResult, userId, repositoryId, tier } = input;

  // 1. Fetch user context in parallel
  const [preferences, history, skills, achievements] = await Promise.all([
    fetchUserPreferences(userId, deps),
    fetchAnalysisHistory(userId, repositoryId, deps),
    fetchUserSkills(userId, deps),
    fetchUserAchievements(userId, deps),
  ]);

  // 2. Calculate remaining issues (after fixes for PRO)
  const remainingIssues = fixResult
    ? analysisResult.issues.filter((i) => {
        const fixedIds = new Set(fixResult.fixes.map((f) => f.issueId));
        return !fixedIds.has(i.id) && i.status !== 'resolved';
      })
    : analysisResult.issues.filter((i) => i.status !== 'resolved');

  // 3. Calculate current score (after fixes for PRO)
  const currentScore = fixResult?.score ?? analysisResult.score;

  // 4. Generate each section
  const report: UnifiedReport = {
    id: generateReportId(),
    version: '2.0',
    generatedAt: new Date().toISOString(),
    tier,

    header: generateHeaderSection(analysisResult, fixResult),

    progressHistory: generateProgressSection(
      userId,
      repositoryId,
      history,
      currentScore,
      analysisResult.prNumber,
      { displayCount: preferences.historyDisplayCount }
    ),

    fixSummary:
      tier === 'pro' && fixResult
        ? generateFixSummarySection(analysisResult, fixResult, preferences)
        : undefined,

    remainingIssues: generateRemainingIssuesSection(analysisResult, fixResult),

    businessImpact: generateBusinessImpactSection(
      analysisResult,
      fixResult,
      preferences.hourlyRate
    ),

    educational: generateEducationalSection(remainingIssues),

    // IDE Integration section - BASIC tier only (PRO gets auto-fix instead)
    ideIntegration:
      tier === 'basic'
        ? generateIDEIntegrationSection(generateReportId(), analysisResult.id)
        : undefined,

    skillsAndAchievements: generateSkillsSection(
      skills,
      achievements,
      analysisResult,
      fixResult,
      tier
    ),

    commitInfo:
      tier === 'pro' && fixResult
        ? generateCommitInfoSection(fixResult)
        : undefined,

    metadata: generateMetadataSection(analysisResult, fixResult),
  };

  // 5. Store analysis in history (fire and forget)
  storeAnalysisHistory(report, input, deps).catch((error) => {
    console.error('[UnifiedReportGenerator] Failed to store analysis history:', error);
  });

  // 6. Update user skills (fire and forget)
  updateUserSkills(userId, analysisResult, fixResult, deps).catch((error) => {
    console.error('[UnifiedReportGenerator] Failed to update user skills:', error);
  });

  // 7. Check and unlock achievements (handled in skills section generation)

  return report;
}

/**
 * Generate report without database dependencies (for testing)
 */
export function generateUnifiedReportSync(
  analysisResult: V9AnalysisResultInput,
  fixResult: FixOrchestrationResultInput | undefined,
  tier: ReportTier,
  options?: {
    preferences?: Partial<UserPreferences>;
    skills?: Partial<UserSkills>;
    achievements?: Partial<UserAchievements>;
    history?: HistoricalAnalysis[];
  }
): UnifiedReport {
  const userId = 'test-user';
  const repositoryId = 'test-repo';

  const preferences: UserPreferences = {
    ...DEFAULT_PREFERENCES,
    userId,
    ...options?.preferences,
  };

  const skills: UserSkills = {
    ...DEFAULT_SKILLS,
    userId,
    ...options?.skills,
  };

  const achievements: UserAchievements = {
    ...DEFAULT_ACHIEVEMENTS,
    ...options?.achievements,
  };

  const history = options?.history || [];

  // Calculate remaining issues
  const remainingIssues = fixResult
    ? analysisResult.issues.filter((i) => {
        const fixedIds = new Set(fixResult.fixes.map((f) => f.issueId));
        return !fixedIds.has(i.id) && i.status !== 'resolved';
      })
    : analysisResult.issues.filter((i) => i.status !== 'resolved');

  const currentScore = fixResult?.score ?? analysisResult.score;

  return {
    id: generateReportId(),
    version: '2.0',
    generatedAt: new Date().toISOString(),
    tier,

    header: generateHeaderSection(analysisResult, fixResult),

    progressHistory: generateProgressSection(
      userId,
      repositoryId,
      history,
      currentScore,
      analysisResult.prNumber,
      { displayCount: preferences.historyDisplayCount }
    ),

    fixSummary:
      tier === 'pro' && fixResult
        ? generateFixSummarySection(analysisResult, fixResult, preferences)
        : undefined,

    remainingIssues: generateRemainingIssuesSection(analysisResult, fixResult),

    businessImpact: generateBusinessImpactSection(
      analysisResult,
      fixResult,
      preferences.hourlyRate
    ),

    educational: generateEducationalSection(remainingIssues),

    // IDE Integration section - BASIC tier only (PRO gets auto-fix instead)
    ideIntegration:
      tier === 'basic'
        ? generateIDEIntegrationSection(generateReportId(), analysisResult.id)
        : undefined,

    skillsAndAchievements: generateSkillsSection(
      skills,
      achievements,
      analysisResult,
      fixResult,
      tier
    ),

    commitInfo:
      tier === 'pro' && fixResult
        ? generateCommitInfoSection(fixResult)
        : undefined,

    metadata: generateMetadataSection(analysisResult, fixResult),
  };
}

// Helper functions for fetching user context

async function fetchUserPreferences(
  userId: string,
  deps: GenerateReportDependencies
): Promise<UserPreferences> {
  try {
    return await deps.userPreferencesRepo.getByUserId(userId);
  } catch {
    return { ...DEFAULT_PREFERENCES, userId };
  }
}

async function fetchAnalysisHistory(
  userId: string,
  repositoryId: string,
  deps: GenerateReportDependencies
): Promise<HistoricalAnalysis[]> {
  try {
    return await deps.analysisHistoryRepo.getByRepository(userId, repositoryId);
  } catch {
    return [];
  }
}

async function fetchUserSkills(
  userId: string,
  deps: GenerateReportDependencies
): Promise<UserSkills> {
  try {
    return await deps.userSkillsRepo.getByUserId(userId);
  } catch {
    return { ...DEFAULT_SKILLS, userId };
  }
}

async function fetchUserAchievements(
  userId: string,
  deps: GenerateReportDependencies
): Promise<UserAchievements> {
  try {
    return await deps.achievementsRepo.getByUserId(userId);
  } catch {
    return DEFAULT_ACHIEVEMENTS;
  }
}

async function storeAnalysisHistory(
  report: UnifiedReport,
  input: GenerateReportInput,
  deps: GenerateReportDependencies
): Promise<void> {
  const { analysisResult, fixResult, userId, repositoryId, tier } = input;

  await deps.analysisHistoryRepo.create({
    userId,
    repositoryId,
    prNumber: analysisResult.prNumber,
    prTitle: analysisResult.prTitle,
    scoreBefore: analysisResult.score,
    scoreAfter: fixResult?.score ?? analysisResult.score,
    grade: report.header.score.grade,
    tier,
    issuesFound: analysisResult.issues.length,
    issuesFixed: fixResult?.execution.totalFixesApplied ?? 0,
    reportId: report.id,
  });
}

async function updateUserSkills(
  userId: string,
  analysisResult: V9AnalysisResultInput,
  fixResult: FixOrchestrationResultInput | undefined,
  deps: GenerateReportDependencies
): Promise<void> {
  await deps.userSkillsRepo.updateFromAnalysis(userId, analysisResult, fixResult);
}
