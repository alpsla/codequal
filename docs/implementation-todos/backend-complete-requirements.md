# CodeQual Backend Implementation Requirements
## Unified Report Generation + API Services (BASIC & PRO)

*Created: December 23, 2025*
*Status: REQUIREMENTS - Ready for Implementation*
*Scope: Complete backend for web report system*

---

## 📋 Document Overview

This document consolidates ALL backend requirements for the CodeQual web report system:

1. **Unified Report Generation** - Generate reports for both BASIC and PRO tiers
2. **API Service Layer** - REST endpoints for frontend consumption
3. **Database Schema** - All required tables and migrations
4. **Real-time Updates** - Progress tracking for PRO fix execution

**Related UX Documents:**
- `docs/ui-preparation/pro-tier-ux-flow-refined.md` - Complete UX flow
- `docs/ui-preparation/ux-design-decisions-summary.md` - Design decisions
- `docs/ui-preparation/visual-design-specs.md` - Design system

---

# PART 1: UNIFIED REPORT GENERATION

## 1.1 Report Structure Overview

Both tiers use the SAME report structure with DIFFERENT content depth:

```
┌─────────────────────────────────────────────────────────────────┐
│                    UNIFIED REPORT STRUCTURE                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Section                        BASIC           PRO             │
│  ─────────────────────────────────────────────────────────────  │
│  1. Header & Score              ✅ Score        ✅ Before/After │
│  2. Progress History            ✅ Chart        ✅ Chart        │
│  3. Fix Summary                 ❌              ✅ Full         │
│  4. Remaining Issues            ✅ All issues   ✅ Only unfixed │
│  5. Business Impact             ✅ Est. effort  ✅ Time saved   │
│  6. Educational                 ✅ All cats     ✅ Remaining    │
│  7. Skills & Achievements       ✅ Basic        ✅ + Community  │
│  8. Commit Info                 ❌              ✅ Full         │
│  9. Metadata                    ✅ Same         ✅ Same         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 1.2 Complete Type Definitions

```typescript
// ============================================================
// MAIN REPORT INTERFACE
// ============================================================

interface UnifiedReport {
  // Metadata
  id: string;
  version: string;
  generatedAt: string;
  tier: 'basic' | 'pro';
  
  // Sections
  header: ReportHeader;
  progressHistory: ProgressHistory;
  fixSummary?: FixSummary;              // PRO only
  remainingIssues: RemainingIssues;
  businessImpact: BusinessImpact;
  educational: EducationalContent;
  skillsAndAchievements: SkillsAndAchievements;
  commitInfo?: CommitInfo;               // PRO only
  metadata: ReportMetadata;
}

// ============================================================
// SECTION 1: HEADER & SCORE
// ============================================================

interface ReportHeader {
  // Repository Info
  repository: {
    url: string;
    name: string;
    owner: string;
    defaultBranch: string;
  };
  
  // PR Info
  pullRequest: {
    number: number;
    title: string;
    author: string;
    sourceBranch: string;
    targetBranch: string;
    url: string;
  };
  
  // Analysis Info
  analysis: {
    id: string;
    timestamp: string;
    mode: 'fast' | 'standard' | 'thorough' | 'complete';
    duration: number;  // milliseconds
  };
  
  // Score
  score: {
    value: number;                    // 0-100
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    gradeLabel: string;               // "Excellent", "Good", etc.
    previous?: number;                // PRO: score before fixes
    improvement?: number;             // PRO: value - previous
    improvementPercent?: number;      // PRO: percentage change
  };
  
  // Decision
  decision: {
    status: 'APPROVED' | 'DECLINED';
    reason: string;
    blockingIssuesCount: number;
    previousStatus?: 'APPROVED' | 'DECLINED';  // PRO: before fixes
  };
  
  // Quick Stats
  stats: {
    totalIssuesFound: number;
    issuesByStatus: {
      new: number;
      existing: number;
      resolved: number;
    };
    issuesBySeverity: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
    // PRO only
    issuesFixed?: number;
    issuesRemaining?: number;
    issuesRequiringReview?: number;
  };
}

// ============================================================
// SECTION 2: PROGRESS HISTORY
// ============================================================

interface ProgressHistory {
  // User context
  isFirstTimeUser: boolean;
  userId: string;
  repositoryId: string;
  
  // For first-time users
  firstTimeMessage?: string;
  
  // Historical data (for returning users)
  history?: {
    analyses: Array<{
      id: string;
      prNumber: number;
      prTitle: string;
      timestamp: string;
      scoreBefore: number;
      scoreAfter: number;
      grade: string;
      issuesFixed: number;
    }>;
    displayCount: number;       // Default 5, user configurable
    totalAvailable: number;
  };
  
  // Trend (for returning users)
  trend?: {
    direction: 'improving' | 'declining' | 'stable';
    changePoints: number;       // Total change over history
    changePercent: number;
    bestScore: number;
    worstScore: number;
    averageScore: number;
  };
  
  // Chart data (for visualization)
  chartData?: Array<{
    x: string;                  // PR identifier or date
    y: number;                  // Score
    label: string;              // Tooltip text
    isCurrent: boolean;
  }>;
}

// ============================================================
// SECTION 3: FIX SUMMARY (PRO ONLY)
// ============================================================

interface FixSummary {
  // Overview
  overview: {
    totalAttempted: number;
    totalSuccessful: number;
    totalRequiringReview: number;
    totalRolledBack: number;
    totalCannotFix: number;
    successRate: number;        // percentage
  };
  
  // Successfully fixed (grouped by rule)
  successfullyFixed: {
    total: number;
    byCategory: Record<IssueCategory, number>;
    byTier: {
      tier1Native: number;
      tier2Dedicated: number;
      tier2_5Pattern: number;
      tier2_5CloudAPI: number;
      tier3AI: number;
    };
    byRule: FixedRuleGroup[];
  };
  
  // Requires review
  requiresReview: {
    total: number;
    highPriority: ReviewItem[];     // Security/Deps/Performance
    lowConfidence: ReviewItem[];    // Below threshold
  };
  
  // Rolled back
  rolledBack: RolledBackItem[];
  
  // Cannot auto-fix
  cannotAutoFix: {
    total: number;
    byReason: Record<UnfixedReason, number>;
    items: UnfixedItem[];
  };
}

interface FixedRuleGroup {
  ruleId: string;
  ruleName: string;
  ruleDescription: string;
  category: IssueCategory;
  severity: Severity;
  count: number;
  tier: FixTier;
  tierLabel: string;
  confidence: number;
  confidenceLabel: 'high' | 'medium' | 'low';
  verificationStatus: 'passed' | 'passed_with_warnings';
  
  // Files affected (collapsed by default)
  files: Array<{
    path: string;
    relativePath: string;
    lines: number[];
    fixCount: number;
  }>;
  
  // Individual fixes (for deep dive, lazy loaded)
  fixes?: Array<{
    id: string;
    file: string;
    line: number;
    column?: number;
    originalCode: string;
    fixedCode: string;
    explanation: string;
  }>;
}

interface ReviewItem {
  id: string;
  ruleId: string;
  ruleName: string;
  category: IssueCategory;
  severity: Severity;
  file: string;
  line: number;
  confidence: number;
  reviewReason: 'security' | 'dependency' | 'performance' | 'low_confidence';
  reviewReasonLabel: string;
  originalCode: string;
  fixedCode: string;
  explanation: string;
  recommendation: string;
}

interface RolledBackItem {
  id: string;
  ruleId: string;
  ruleName: string;
  file: string;
  line: number;
  reason: 'verification_failed' | 'regression_introduced';
  reasonLabel: string;
  attemptedFix: string;
  errorDetails: string;
  regressionCount?: number;
  manualFixGuide: string;
}

interface UnfixedItem {
  id: string;
  ruleId: string;
  ruleName: string;
  category: IssueCategory;
  severity: Severity;
  file: string;
  line: number;
  reason: UnfixedReason;
  reasonLabel: string;
  explanation: string;
  manualFixSteps: string[];
  estimatedEffort: 'trivial' | 'minor' | 'moderate' | 'significant';
  estimatedTime: string;
  blocksMerge: boolean;
}

type UnfixedReason =
  | 'no_pattern_match'
  | 'cloud_api_failed'
  | 'ai_generation_failed'
  | 'verification_failed'
  | 'regression_introduced'
  | 'code_context_insufficient'
  | 'complex_refactoring'
  | 'external_dependency'
  | 'cost_limit_exceeded'
  | 'timeout';

// ============================================================
// SECTION 4: REMAINING ISSUES
// ============================================================

interface RemainingIssues {
  // Summary
  summary: {
    total: number;
    bySeverity: Record<Severity, number>;
    byCategory: Record<IssueCategory, number>;
    byStatus: {
      new: number;
      existingModified: number;
      existingRest: number;
    };
  };
  
  // Blocking issues (full detail)
  blocking: DetailedIssue[];
  
  // High priority (full detail)
  highPriority: DetailedIssue[];
  
  // Medium/Low (grouped by rule)
  mediumLow: GroupedIssue[];
}

interface DetailedIssue {
  // Identity
  id: string;
  ruleId: string;
  ruleName: string;
  
  // Classification
  category: IssueCategory;
  severity: Severity;
  status: 'new' | 'existing_modified' | 'existing_rest';
  blocksMerge: boolean;
  
  // Location
  file: string;
  relativePath: string;
  line: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
  
  // Educational content
  title: string;
  description: string;
  whyItMatters: string;
  commonCauses: string[];
  impactIfNotFixed: string;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  
  // Code context
  codeSnippet: string;
  codeLanguage: string;
  
  // Fix guidance
  manualFixSteps: string[];
  recommendedCode?: string;
  bestPractices: string[];
  
  // For PRO: why auto-fix failed
  autoFixFailureReason?: UnfixedReason;
  autoFixFailureExplanation?: string;
  
  // Occurrences
  occurrenceCount: number;
  otherLocations?: Array<{
    file: string;
    line: number;
  }>;
  
  // Related resources
  documentationUrl?: string;
  learnMoreUrl?: string;
}

interface GroupedIssue {
  ruleId: string;
  ruleName: string;
  category: IssueCategory;
  severity: Severity;
  count: number;
  briefDescription: string;
  files: Array<{
    path: string;
    lines: number[];
  }>;
  // Expanded details (lazy loaded)
  expandedDetails?: DetailedIssue[];
}

// ============================================================
// SECTION 5: BUSINESS IMPACT
// ============================================================

interface BusinessImpact {
  // Time analysis
  time: {
    // For BASIC: estimated time to fix manually
    // For PRO: actual time saved
    automated: {
      value: number;          // minutes
      formatted: string;      // "2 minutes"
    };
    manual: {
      value: number;          // minutes
      formatted: string;      // "4.5 hours"
    };
    saved?: {                 // PRO only
      value: number;
      formatted: string;
      percent: number;
    };
  };
  
  // Cost analysis
  cost: {
    hourlyRate: number;
    manualEstimate: number;
    codequalCost: number;
    netSavings?: number;      // PRO only
  };
  
  // Risk reduction (PRO only)
  riskReduction?: {
    securityIssuesFixed: number;
    criticalIssuesFixed: number;
    highIssuesFixed: number;
    technicalDebtReduced: number;
  };
  
  // Remaining effort
  remainingEffort: {
    totalHours: number;
    formatted: string;
    issueCount: number;
    byEffort: {
      trivial: { count: number; totalMinutes: number };
      minor: { count: number; totalMinutes: number };
      moderate: { count: number; totalMinutes: number };
      significant: { count: number; totalMinutes: number };
    };
  };
  
  // ROI summary (PRO only)
  roi?: {
    timeSavedPercent: number;
    costSavedPercent: number;
    issuesResolvedPercent: number;
    summary: string;
  };
}

// ============================================================
// SECTION 6: EDUCATIONAL CONTENT
// ============================================================

interface EducationalContent {
  // Learning paths (only for remaining unfixed issues)
  learningPaths: Array<{
    category: IssueCategory;
    categoryLabel: string;
    issueCount: number;
    priorityLevel: 'high' | 'medium' | 'low';
    modules: Array<{
      id: string;
      title: string;
      description: string;
      estimatedTime: string;
      difficulty: 'beginner' | 'intermediate' | 'advanced';
      resources: Array<{
        type: 'article' | 'video' | 'tutorial' | 'documentation';
        title: string;
        url: string;
        provider?: string;
      }>;
    }>;
  }>;
  
  // Phased remediation plan
  phasedPlan: {
    phases: Array<{
      number: number;
      title: string;
      focus: string;
      description: string;
      ruleIds: string[];
      issueCount: number;
      estimatedTime: string;
      priority: 'immediate' | 'short_term' | 'long_term';
    }>;
    totalEstimatedTime: string;
  };
  
  // Quick wins (easy fixes for immediate impact)
  quickWins?: Array<{
    ruleId: string;
    title: string;
    effort: string;
    impact: string;
    count: number;
  }>;
}

// ============================================================
// SECTION 7: SKILLS & ACHIEVEMENTS
// ============================================================

interface SkillsAndAchievements {
  // Overall level (cross-repo)
  level: {
    current: number;
    title: string;                    // "Code Quality Expert"
    xp: number;
    xpForCurrentLevel: number;
    xpForNextLevel: number;
    progressPercent: number;
  };
  
  // Skills by category
  skills: Record<IssueCategory, {
    score: number;                    // 0-100
    scoreLabel: string;               // "Expert", "Proficient", etc.
    trend: 'improving' | 'declining' | 'stable';
    trendValue: number;               // +5, -3, 0
    issuesFixedLifetime: number;
    issuesFixedThisSession: number;
  }>;
  
  // XP earned this session
  xpEarned: {
    total: number;
    breakdown: Array<{
      action: string;
      description: string;
      amount: number;
    }>;
  };
  
  // Achievements
  achievements: {
    unlocked: Array<{
      id: string;
      name: string;
      description: string;
      icon: string;                   // Icon identifier
      rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
      unlockedAt: string;
      isNew: boolean;                 // Unlocked this session
    }>;
    inProgress: Array<{
      id: string;
      name: string;
      description: string;
      current: number;
      target: number;
      progressPercent: number;
    }>;
    totalUnlocked: number;
    totalAvailable: number;
  };
  
  // Community impact (PRO only)
  communityImpact?: {
    patternsContributed: number;
    patternsContributedThisSession: number;
    developersHelped: number;
    timeSavedForOthers: string;       // "42 hours"
    contributorRank?: string;          // "Top 5%"
    contributorTier?: 'bronze' | 'silver' | 'gold' | 'platinum';
  };
}

// ============================================================
// SECTION 8: COMMIT INFO (PRO ONLY)
// ============================================================

interface CommitInfo {
  // Branch info
  branch: {
    name: string;
    url: string;
    isNew: boolean;
  };
  
  // Commit info
  commit: {
    sha: string;
    shortSha: string;
    message: string;
    url: string;
  };
  
  // Files modified
  filesModified: {
    total: number;
    added: number;
    modified: number;
    deleted: number;
    list: Array<{
      path: string;
      changeType: 'added' | 'modified' | 'deleted';
      additions: number;
      deletions: number;
    }>;
  };
  
  // Pull request (if created)
  pullRequest?: {
    number: number;
    title: string;
    url: string;
    status: 'open' | 'merged' | 'closed';
  };
  
  // Review document
  reviewDocument: {
    filename: string;                 // "CODEQUAL_FIXES.md"
    url: string;
    content: string;
  };
}

// ============================================================
// SECTION 9: METADATA
// ============================================================

interface ReportMetadata {
  // Analysis details
  analysis: {
    id: string;
    startTime: string;
    endTime: string;
    duration: {
      total: number;                  // milliseconds
      formatted: string;              // "2m 35s"
      breakdown: {
        cloning: number;
        scanning: number;
        comparison: number;
        enrichment: number;
        fixing?: number;              // PRO only
        reporting: number;
      };
    };
    mode: 'fast' | 'standard' | 'thorough' | 'complete';
    modeDescription: string;
  };
  
  // Tools used
  tools: Array<{
    name: string;
    version: string;
    category: IssueCategory;
    issuesFound: number;
    executionTime: number;
    status: 'success' | 'partial' | 'failed';
  }>;
  
  // Agents used
  agents: Array<{
    name: string;
    role: string;
    model: string;
    tokensUsed: number;
    cost: number;
    executionTime: number;
  }>;
  
  // Cost breakdown
  costs: {
    analysis: {
      apiCalls: number;
      tokens: number;
      cost: number;
    };
    fixing?: {                        // PRO only
      apiCalls: number;
      tokens: number;
      cost: number;
    };
    total: number;
  };
  
  // Export options
  exports: {
    available: Array<'markdown' | 'html' | 'pdf' | 'sarif' | 'json'>;
    urls: Record<string, string>;
  };
  
  // Report URLs
  urls: {
    web: string;
    api: string;
    raw: string;
  };
}

// ============================================================
// COMMON TYPES
// ============================================================

type IssueCategory = 
  | 'security'
  | 'code_quality'
  | 'performance'
  | 'architecture'
  | 'dependencies';

type Severity = 'critical' | 'high' | 'medium' | 'low';

type FixTier = 
  | 'tier1_native'
  | 'tier2_dedicated'
  | 'tier2_5_pattern'
  | 'tier2_5_cloud'
  | 'tier3_ai';
```

## 1.3 Report Generation Logic

### Main Generator

```typescript
// File: src/two-branch/report/unified-report-generator.ts

import { V9AnalysisResult } from '../analyzers/v9-types';
import { FixOrchestrationResult } from '../fix-branch/fix-branch-orchestrator';

interface GenerateReportInput {
  analysisResult: V9AnalysisResult;
  fixResult?: FixOrchestrationResult;
  userId: string;
  repositoryId: string;
  tier: 'basic' | 'pro';
}

interface GenerateReportDependencies {
  userPreferencesRepo: UserPreferencesRepository;
  analysisHistoryRepo: AnalysisHistoryRepository;
  userSkillsRepo: UserSkillsRepository;
  achievementsRepo: AchievementsRepository;
}

export async function generateUnifiedReport(
  input: GenerateReportInput,
  deps: GenerateReportDependencies
): Promise<UnifiedReport> {
  
  const { analysisResult, fixResult, userId, repositoryId, tier } = input;
  
  // 1. Fetch user context
  const [preferences, history, skills, achievements] = await Promise.all([
    deps.userPreferencesRepo.getByUserId(userId),
    deps.analysisHistoryRepo.getByRepository(userId, repositoryId),
    deps.userSkillsRepo.getByUserId(userId),
    deps.achievementsRepo.getByUserId(userId)
  ]);
  
  // 2. Calculate remaining issues (after fixes for PRO)
  const remainingIssues = fixResult
    ? calculateRemainingIssues(analysisResult.issues, fixResult)
    : analysisResult.issues;
  
  // 3. Generate each section
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
      preferences.historyDisplayCount,
      fixResult?.score ?? analysisResult.score
    ),
    
    fixSummary: tier === 'pro' && fixResult
      ? generateFixSummarySection(analysisResult, fixResult, preferences)
      : undefined,
    
    remainingIssues: generateRemainingIssuesSection(remainingIssues),
    
    businessImpact: generateBusinessImpactSection(
      analysisResult,
      fixResult,
      preferences.hourlyRate
    ),
    
    educational: generateEducationalSection(remainingIssues),
    
    skillsAndAchievements: generateSkillsSection(
      skills,
      achievements,
      analysisResult,
      fixResult,
      tier
    ),
    
    commitInfo: tier === 'pro' && fixResult
      ? generateCommitInfoSection(fixResult)
      : undefined,
    
    metadata: generateMetadataSection(analysisResult, fixResult)
  };
  
  // 4. Store analysis in history
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
    reportId: report.id
  });
  
  // 5. Update user skills
  await deps.userSkillsRepo.updateFromAnalysis(userId, analysisResult, fixResult);
  
  // 6. Check for new achievements
  const newAchievements = await checkAndUnlockAchievements(
    userId,
    analysisResult,
    fixResult,
    deps.achievementsRepo
  );
  
  // Add newly unlocked achievements to report
  report.skillsAndAchievements.achievements.unlocked
    .filter(a => newAchievements.includes(a.id))
    .forEach(a => a.isNew = true);
  
  return report;
}
```

### Section Generators

```typescript
// File: src/two-branch/report/sections/header-section.ts

export function generateHeaderSection(
  analysis: V9AnalysisResult,
  fixResult?: FixOrchestrationResult
): ReportHeader {
  
  const scoreBefore = analysis.score;
  const scoreAfter = fixResult?.score ?? scoreBefore;
  const grade = calculateGrade(scoreAfter);
  
  // Count blocking issues (only from remaining issues)
  const remainingIssues = fixResult
    ? calculateRemainingIssues(analysis.issues, fixResult)
    : analysis.issues;
  
  const blockingIssues = remainingIssues.filter(i => 
    i.status === 'new' && 
    (i.severity === 'critical' || isSecurityBlocker(i))
  );
  
  return {
    repository: {
      url: analysis.repositoryUrl,
      name: extractRepoName(analysis.repositoryUrl),
      owner: extractRepoOwner(analysis.repositoryUrl),
      defaultBranch: analysis.baseBranch
    },
    pullRequest: {
      number: analysis.prNumber,
      title: analysis.prTitle,
      author: analysis.prAuthor,
      sourceBranch: analysis.prBranch,
      targetBranch: analysis.baseBranch,
      url: buildPRUrl(analysis.repositoryUrl, analysis.prNumber)
    },
    analysis: {
      id: analysis.id,
      timestamp: analysis.timestamp,
      mode: analysis.mode,
      duration: analysis.duration
    },
    score: {
      value: scoreAfter,
      grade,
      gradeLabel: getGradeLabel(grade),
      previous: fixResult ? scoreBefore : undefined,
      improvement: fixResult ? scoreAfter - scoreBefore : undefined,
      improvementPercent: fixResult 
        ? Math.round(((scoreAfter - scoreBefore) / Math.max(scoreBefore, 1)) * 100)
        : undefined
    },
    decision: {
      status: blockingIssues.length === 0 ? 'APPROVED' : 'DECLINED',
      reason: generateDecisionReason(blockingIssues),
      blockingIssuesCount: blockingIssues.length,
      previousStatus: fixResult && analysis.blockingCount > 0 ? 'DECLINED' : undefined
    },
    stats: {
      totalIssuesFound: analysis.issues.length,
      issuesByStatus: countByStatus(analysis.issues),
      issuesBySeverity: countBySeverity(analysis.issues),
      issuesFixed: fixResult?.execution.totalFixesApplied,
      issuesRemaining: remainingIssues.length,
      issuesRequiringReview: fixResult?.reviewRequired?.length
    }
  };
}

function calculateGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

function getGradeLabel(grade: string): string {
  const labels = {
    'A': 'Excellent',
    'B': 'Good',
    'C': 'Fair',
    'D': 'Poor',
    'F': 'Critical'
  };
  return labels[grade] || 'Unknown';
}
```

---

# PART 2: API SERVICE LAYER

## 2.1 API Endpoints Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    CODEQUAL API ENDPOINTS                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  REPORTS                                                        │
│  GET    /api/v1/reports/:id                    Get full report  │
│  GET    /api/v1/reports/:id/summary            Get summary only │
│  GET    /api/v1/reports/:id/section/:name      Get one section  │
│  GET    /api/v1/reports/:id/export/:format     Export report    │
│                                                                 │
│  ANALYSIS                                                       │
│  POST   /api/v1/analysis                       Start analysis   │
│  GET    /api/v1/analysis/:id/status            Get status       │
│  GET    /api/v1/analysis/:id/progress          Get progress     │
│  DELETE /api/v1/analysis/:id                   Cancel analysis  │
│                                                                 │
│  FIXES (PRO Only)                                               │
│  POST   /api/v1/analysis/:id/fixes             Start fix apply  │
│  GET    /api/v1/analysis/:id/fixes/status      Get fix status   │
│  GET    /api/v1/analysis/:id/fixes/preview     Preview fixes    │
│                                                                 │
│  USER                                                           │
│  GET    /api/v1/users/me                       Get current user │
│  GET    /api/v1/users/me/preferences           Get preferences  │
│  PUT    /api/v1/users/me/preferences           Save preferences │
│  GET    /api/v1/users/me/skills                Get skills       │
│  GET    /api/v1/users/me/achievements          Get achievements │
│                                                                 │
│  HISTORY                                                        │
│  GET    /api/v1/repositories/:id/history       Get repo history │
│  GET    /api/v1/users/me/history               Get all history  │
│                                                                 │
│  REPOSITORIES                                                   │
│  GET    /api/v1/repositories                   List repos       │
│  GET    /api/v1/repositories/:id               Get repo details │
│  GET    /api/v1/repositories/:id/analyses      Get analyses     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 2.2 API Request/Response Specifications

### Reports API

```typescript
// ============================================================
// GET /api/v1/reports/:id
// ============================================================

// Response
interface GetReportResponse {
  success: true;
  data: UnifiedReport;
}

// Error Response
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

// ============================================================
// GET /api/v1/reports/:id/summary
// ============================================================

interface ReportSummaryResponse {
  success: true;
  data: {
    id: string;
    tier: 'basic' | 'pro';
    generatedAt: string;
    
    // Key metrics only
    score: {
      value: number;
      grade: string;
      improvement?: number;
    };
    decision: {
      status: 'APPROVED' | 'DECLINED';
      blockingCount: number;
    };
    stats: {
      found: number;
      fixed?: number;
      remaining: number;
    };
    
    // Links to full sections
    sections: Array<{
      name: string;
      available: boolean;
      url: string;
    }>;
  };
}

// ============================================================
// GET /api/v1/reports/:id/section/:name
// Lazy loading for large sections
// ============================================================

// Valid section names:
// - header, progressHistory, fixSummary, remainingIssues
// - businessImpact, educational, skillsAndAchievements
// - commitInfo, metadata

interface GetSectionRequest {
  params: {
    id: string;
    name: string;
  };
  query?: {
    expand?: string;      // Comma-separated fields to expand
    limit?: number;       // For paginated data
    offset?: number;
  };
}

// Response: The specific section data
type GetSectionResponse = {
  success: true;
  data: ReportHeader | ProgressHistory | FixSummary | /* etc */;
};

// ============================================================
// GET /api/v1/reports/:id/export/:format
// ============================================================

// Valid formats: markdown, html, pdf, sarif, json

interface ExportReportRequest {
  params: {
    id: string;
    format: 'markdown' | 'html' | 'pdf' | 'sarif' | 'json';
  };
}

// Response: File download or URL
interface ExportReportResponse {
  success: true;
  data: {
    format: string;
    filename: string;
    url: string;           // Signed URL for download
    expiresAt: string;
  };
}
```

### Analysis API

```typescript
// ============================================================
// POST /api/v1/analysis
// ============================================================

interface StartAnalysisRequest {
  body: {
    repositoryUrl: string;
    prNumber?: number;              // Optional: analyze PR
    branch?: string;                // Optional: analyze branch
    mode?: 'fast' | 'standard' | 'thorough' | 'complete';
    
    // PRO options
    autoFix?: boolean;              // Start fixes after analysis
    fixScope?: 'safe' | 'recommended' | 'maximum' | 'custom';
    customFixOptions?: {
      includeTiers?: FixTier[];
      categories?: IssueCategory[];
      severities?: Severity[];
      minConfidence?: number;
    };
  };
}

interface StartAnalysisResponse {
  success: true;
  data: {
    analysisId: string;
    status: 'queued' | 'running';
    estimatedDuration: number;      // seconds
    progressUrl: string;            // WebSocket or polling URL
    createdAt: string;
  };
}

// ============================================================
// GET /api/v1/analysis/:id/status
// ============================================================

interface AnalysisStatusResponse {
  success: true;
  data: {
    id: string;
    status: 'queued' | 'cloning' | 'analyzing' | 'enriching' | 
            'fixing' | 'generating_report' | 'completed' | 'failed';
    progress: number;               // 0-100
    currentStep: string;
    startedAt?: string;
    completedAt?: string;
    estimatedRemaining?: number;    // seconds
    
    // Available when completed
    reportId?: string;
    reportUrl?: string;
    
    // Available when failed
    error?: {
      code: string;
      message: string;
      retryable: boolean;
    };
  };
}

// ============================================================
// GET /api/v1/analysis/:id/progress
// Real-time progress (polling endpoint)
// ============================================================

interface AnalysisProgressResponse {
  success: true;
  data: {
    id: string;
    phase: 'cloning' | 'scanning' | 'comparing' | 'enriching' | 
           'fixing' | 'verifying' | 'generating';
    phaseProgress: number;          // 0-100 for current phase
    overallProgress: number;        // 0-100 total
    
    // Phase-specific details
    details: {
      // Scanning phase
      filesScanned?: number;
      totalFiles?: number;
      currentTool?: string;
      
      // Fixing phase (PRO)
      fixesApplied?: number;
      fixesTotal?: number;
      currentTier?: string;
      
      // Any phase
      message: string;
    };
    
    // Timing
    elapsedSeconds: number;
    estimatedRemainingSeconds: number;
  };
}
```

### Fixes API (PRO Only)

```typescript
// ============================================================
// POST /api/v1/analysis/:id/fixes
// ============================================================

interface StartFixesRequest {
  body: {
    scope: 'safe' | 'recommended' | 'maximum' | 'custom';
    customOptions?: {
      issueIds?: string[];          // Specific issues to fix
      ruleIds?: string[];           // Specific rules to fix
      categories?: IssueCategory[];
      minConfidence?: number;
    };
    
    // Output options
    output: {
      method: 'commit' | 'branch' | 'pull_request' | 'patch';
      branchName?: string;          // For branch/PR
      commitMessage?: string;
      prTitle?: string;
      prDescription?: string;
    };
  };
}

interface StartFixesResponse {
  success: true;
  data: {
    fixJobId: string;
    status: 'queued' | 'running';
    estimatedDuration: number;
    progressUrl: string;
  };
}

// ============================================================
// GET /api/v1/analysis/:id/fixes/preview
// ============================================================

interface FixPreviewResponse {
  success: true;
  data: {
    analysisId: string;
    
    // Fix availability
    availability: {
      total: number;
      byConfidence: {
        high: number;       // 90%+
        medium: number;     // 70-89%
        low: number;        // <70%
      };
      byTier: Record<FixTier, number>;
      byCategory: Record<IssueCategory, number>;
    };
    
    // Scope options
    scopes: {
      safe: {
        count: number;
        estimatedTime: string;
        cost: number;
        description: string;
      };
      recommended: {
        count: number;
        estimatedTime: string;
        cost: number;
        description: string;
      };
      maximum: {
        count: number;
        estimatedTime: string;
        cost: number;
        description: string;
      };
    };
    
    // Cannot fix
    cannotFix: {
      count: number;
      reasons: Record<UnfixedReason, number>;
    };
  };
}
```

### User API

```typescript
// ============================================================
// GET /api/v1/users/me/preferences
// ============================================================

interface UserPreferencesResponse {
  success: true;
  data: {
    userId: string;
    
    // History display
    historyDisplayCount: number;    // Default: 5
    
    // Output defaults
    defaultOutputMethod: 'commit' | 'branch' | 'pull_request' | 'patch';
    defaultCommitStyle: 'single' | 'grouped_category' | 'grouped_tier';
    defaultFixScope: 'safe' | 'recommended' | 'maximum' | 'always_ask';
    commitMessageTemplate: string;
    
    // Review settings
    reviewConfidenceThreshold: number;  // Default: 80
    alwaysReviewSecurity: boolean;      // Default: true
    alwaysReviewDependencies: boolean;  // Default: true
    alwaysReviewPerformance: boolean;   // Default: true
    
    // Display settings
    hourlyRate: number;                 // For cost calculations
    achievementStyle: 'professional' | 'gamified';
    
    // Timestamps
    createdAt: string;
    updatedAt: string;
  };
}

// ============================================================
// PUT /api/v1/users/me/preferences
// ============================================================

interface UpdatePreferencesRequest {
  body: Partial<Omit<UserPreferencesResponse['data'], 
    'userId' | 'createdAt' | 'updatedAt'>>;
}

// ============================================================
// GET /api/v1/users/me/skills
// ============================================================

interface UserSkillsResponse {
  success: true;
  data: {
    userId: string;
    
    // Level
    level: {
      current: number;
      title: string;
      xp: number;
      xpForNext: number;
      progressPercent: number;
    };
    
    // By category
    categories: Record<IssueCategory, {
      score: number;
      trend: 'improving' | 'declining' | 'stable';
      issuesFixed: number;
      lastUpdated: string;
    }>;
    
    // Totals
    totals: {
      analysesCompleted: number;
      issuesFixed: number;
      patternsContributed: number;
    };
  };
}
```

### History API

```typescript
// ============================================================
// GET /api/v1/repositories/:id/history
// ============================================================

interface RepositoryHistoryRequest {
  params: {
    id: string;
  };
  query?: {
    limit?: number;         // Default: 5
    offset?: number;
    startDate?: string;
    endDate?: string;
  };
}

interface RepositoryHistoryResponse {
  success: true;
  data: {
    repositoryId: string;
    repositoryName: string;
    
    analyses: Array<{
      id: string;
      prNumber: number;
      prTitle: string;
      timestamp: string;
      scoreBefore: number;
      scoreAfter: number;
      grade: string;
      tier: 'basic' | 'pro';
      issuesFound: number;
      issuesFixed: number;
      reportUrl: string;
    }>;
    
    // Pagination
    pagination: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    };
    
    // Trend
    trend: {
      direction: 'improving' | 'declining' | 'stable';
      averageScore: number;
      bestScore: number;
    };
  };
}
```

## 2.3 API Implementation

### Express Router Setup

```typescript
// File: src/api/routes/index.ts

import { Router } from 'express';
import { reportsRouter } from './reports';
import { analysisRouter } from './analysis';
import { fixesRouter } from './fixes';
import { usersRouter } from './users';
import { historyRouter } from './history';
import { repositoriesRouter } from './repositories';
import { authMiddleware } from '../middleware/auth';
import { tierMiddleware } from '../middleware/tier';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Mount route groups
router.use('/reports', reportsRouter);
router.use('/analysis', analysisRouter);
router.use('/fixes', tierMiddleware('pro'), fixesRouter);  // PRO only
router.use('/users', usersRouter);
router.use('/history', historyRouter);
router.use('/repositories', repositoriesRouter);

export { router as apiRouter };
```

### Reports Controller

```typescript
// File: src/api/controllers/reports.controller.ts

import { Request, Response, NextFunction } from 'express';
import { ReportService } from '../../services/report.service';
import { ExportService } from '../../services/export.service';

export class ReportsController {
  constructor(
    private reportService: ReportService,
    private exportService: ExportService
  ) {}

  async getReport(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      const report = await this.reportService.getById(id, userId);
      
      if (!report) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Report not found' }
        });
      }
      
      return res.json({ success: true, data: report });
    } catch (error) {
      next(error);
    }
  }

  async getReportSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      const summary = await this.reportService.getSummary(id, userId);
      
      return res.json({ success: true, data: summary });
    } catch (error) {
      next(error);
    }
  }

  async getSection(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, name } = req.params;
      const { expand, limit, offset } = req.query;
      const userId = req.user.id;
      
      const section = await this.reportService.getSection(id, name, userId, {
        expand: expand?.toString().split(','),
        limit: limit ? parseInt(limit.toString()) : undefined,
        offset: offset ? parseInt(offset.toString()) : undefined
      });
      
      return res.json({ success: true, data: section });
    } catch (error) {
      next(error);
    }
  }

  async exportReport(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, format } = req.params;
      const userId = req.user.id;
      
      const validFormats = ['markdown', 'html', 'pdf', 'sarif', 'json'];
      if (!validFormats.includes(format)) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_FORMAT', message: 'Invalid export format' }
        });
      }
      
      const exportResult = await this.exportService.export(id, format, userId);
      
      return res.json({ success: true, data: exportResult });
    } catch (error) {
      next(error);
    }
  }
}
```

---

# PART 3: DATABASE SCHEMA

## 3.1 Complete Schema

```sql
-- ============================================================
-- USERS & AUTHENTICATION
-- ============================================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  avatar_url TEXT,
  tier VARCHAR(20) DEFAULT 'basic',  -- 'basic', 'pro', 'enterprise'
  tier_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  
  -- History display
  history_display_count INTEGER DEFAULT 5,
  
  -- Output defaults
  default_output_method VARCHAR(50) DEFAULT 'commit',
  default_commit_style VARCHAR(50) DEFAULT 'single',
  default_fix_scope VARCHAR(50) DEFAULT 'recommended',
  commit_message_template TEXT DEFAULT 'fix: CodeQual auto-fixes ({count} issues)',
  
  -- Review settings
  review_confidence_threshold INTEGER DEFAULT 80,
  always_review_security BOOLEAN DEFAULT TRUE,
  always_review_dependencies BOOLEAN DEFAULT TRUE,
  always_review_performance BOOLEAN DEFAULT TRUE,
  
  -- Display settings
  hourly_rate INTEGER DEFAULT 150,
  achievement_style VARCHAR(20) DEFAULT 'professional',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SKILLS & ACHIEVEMENTS
-- ============================================================

CREATE TABLE user_skills (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  
  -- Level
  level INTEGER DEFAULT 1,
  total_xp INTEGER DEFAULT 0,
  
  -- Category scores (0-100)
  security_score INTEGER DEFAULT 50,
  code_quality_score INTEGER DEFAULT 50,
  dependencies_score INTEGER DEFAULT 50,
  performance_score INTEGER DEFAULT 50,
  architecture_score INTEGER DEFAULT 50,
  
  -- Lifetime stats
  issues_fixed_total INTEGER DEFAULT 0,
  analyses_completed INTEGER DEFAULT 0,
  patterns_contributed INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE achievements (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(100),
  rarity VARCHAR(20) DEFAULT 'common',  -- common, uncommon, rare, epic, legendary
  category VARCHAR(50),
  target_value INTEGER,                  -- For progress-based achievements
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id VARCHAR(100) NOT NULL REFERENCES achievements(id),
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  progress INTEGER DEFAULT 0,            -- For progress-based achievements
  
  UNIQUE(user_id, achievement_id)
);

-- ============================================================
-- REPOSITORIES
-- ============================================================

CREATE TABLE repositories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url VARCHAR(500) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  owner VARCHAR(255) NOT NULL,
  provider VARCHAR(50) NOT NULL,         -- 'github', 'gitlab', 'bitbucket'
  default_branch VARCHAR(100) DEFAULT 'main',
  is_private BOOLEAN DEFAULT FALSE,
  
  -- Stats
  total_analyses INTEGER DEFAULT 0,
  last_analysis_at TIMESTAMPTZ,
  average_score FLOAT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_repositories (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  access_level VARCHAR(20) DEFAULT 'read',  -- 'read', 'write', 'admin'
  is_favorite BOOLEAN DEFAULT FALSE,
  
  PRIMARY KEY (user_id, repository_id)
);

-- ============================================================
-- ANALYSIS HISTORY
-- ============================================================

CREATE TABLE analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  repository_id UUID NOT NULL REFERENCES repositories(id),
  
  -- PR info
  pr_number INTEGER,
  pr_title TEXT,
  pr_author VARCHAR(255),
  source_branch VARCHAR(255),
  target_branch VARCHAR(255),
  
  -- Analysis config
  mode VARCHAR(20) NOT NULL,             -- 'fast', 'standard', 'thorough', 'complete'
  tier VARCHAR(20) NOT NULL,             -- 'basic', 'pro'
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'queued',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  
  -- Results
  score_before INTEGER,
  score_after INTEGER,
  grade CHAR(1),
  decision VARCHAR(20),                  -- 'APPROVED', 'DECLINED'
  
  -- Issue counts
  issues_found INTEGER DEFAULT 0,
  issues_fixed INTEGER DEFAULT 0,
  issues_remaining INTEGER DEFAULT 0,
  blocking_issues INTEGER DEFAULT 0,
  
  -- Costs
  api_cost FLOAT DEFAULT 0,
  
  -- Report reference
  report_id UUID,
  report_url TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(repository_id, pr_number)
);

CREATE INDEX idx_analyses_user_id ON analyses(user_id);
CREATE INDEX idx_analyses_repository_id ON analyses(repository_id);
CREATE INDEX idx_analyses_created_at ON analyses(created_at DESC);

-- ============================================================
-- REPORTS
-- ============================================================

CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  
  -- Report version
  version VARCHAR(20) NOT NULL,
  tier VARCHAR(20) NOT NULL,
  
  -- Content (JSON)
  content JSONB NOT NULL,
  
  -- Metadata
  generated_at TIMESTAMPTZ NOT NULL,
  file_size_bytes INTEGER,
  
  -- Export URLs (stored in Supabase storage)
  markdown_url TEXT,
  html_url TEXT,
  pdf_url TEXT,
  sarif_url TEXT,
  json_url TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reports_analysis_id ON reports(analysis_id);

-- ============================================================
-- COMMUNITY PATTERNS
-- ============================================================

CREATE TABLE pattern_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  pattern_id UUID NOT NULL REFERENCES fix_patterns(id),
  
  -- Stats
  times_reused INTEGER DEFAULT 0,
  time_saved_minutes INTEGER DEFAULT 0,
  
  -- Privacy
  is_anonymous BOOLEAN DEFAULT FALSE,
  
  contributed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pattern_contributions_user_id ON pattern_contributions(user_id);

-- ============================================================
-- XP TRANSACTIONS
-- ============================================================

CREATE TABLE xp_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  
  amount INTEGER NOT NULL,
  reason VARCHAR(100) NOT NULL,
  description TEXT,
  
  -- Reference
  analysis_id UUID REFERENCES analyses(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_xp_transactions_user_id ON xp_transactions(user_id);
CREATE INDEX idx_xp_transactions_created_at ON xp_transactions(created_at DESC);

-- ============================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================

-- Repository history with trend
CREATE VIEW repository_history_view AS
SELECT 
  a.repository_id,
  a.user_id,
  a.id as analysis_id,
  a.pr_number,
  a.pr_title,
  a.created_at as timestamp,
  a.score_before,
  a.score_after,
  a.grade,
  a.tier,
  a.issues_found,
  a.issues_fixed,
  a.report_url,
  LAG(a.score_after) OVER (
    PARTITION BY a.repository_id, a.user_id 
    ORDER BY a.created_at
  ) as previous_score
FROM analyses a
WHERE a.status = 'completed'
ORDER BY a.created_at DESC;

-- User skill summary
CREATE VIEW user_skill_summary AS
SELECT 
  u.id as user_id,
  u.email,
  u.tier,
  s.level,
  s.total_xp,
  s.security_score,
  s.code_quality_score,
  s.dependencies_score,
  s.performance_score,
  s.architecture_score,
  s.issues_fixed_total,
  s.analyses_completed,
  s.patterns_contributed,
  (SELECT COUNT(*) FROM user_achievements ua WHERE ua.user_id = u.id) as achievements_count
FROM users u
LEFT JOIN user_skills s ON u.id = s.user_id;
```

## 3.2 Migrations

```typescript
// File: src/database/migrations/001_initial_schema.ts

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Users
  await knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('email', 255).unique().notNullable();
    table.string('name', 255);
    table.text('avatar_url');
    table.string('tier', 20).defaultTo('basic');
    table.timestamp('tier_expires_at');
    table.timestamps(true, true);
  });

  // User preferences
  await knex.schema.createTable('user_preferences', (table) => {
    table.uuid('user_id').primary().references('id').inTable('users').onDelete('CASCADE');
    table.integer('history_display_count').defaultTo(5);
    table.string('default_output_method', 50).defaultTo('commit');
    table.string('default_commit_style', 50).defaultTo('single');
    table.string('default_fix_scope', 50).defaultTo('recommended');
    table.text('commit_message_template');
    table.integer('review_confidence_threshold').defaultTo(80);
    table.boolean('always_review_security').defaultTo(true);
    table.boolean('always_review_dependencies').defaultTo(true);
    table.boolean('always_review_performance').defaultTo(true);
    table.integer('hourly_rate').defaultTo(150);
    table.string('achievement_style', 20).defaultTo('professional');
    table.timestamps(true, true);
  });

  // ... (continue with other tables)
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('user_preferences');
  await knex.schema.dropTableIfExists('users');
  // ... (continue with other tables)
}
```

---

# PART 4: IMPLEMENTATION CHECKLIST

## 4.1 Phase 1: Core Report Generation

- [ ] Create type definitions file (`unified-report-types.ts`)
- [ ] Implement main generator (`unified-report-generator.ts`)
- [ ] Implement section generators:
  - [ ] Header section
  - [ ] Progress history section
  - [ ] Fix summary section (PRO)
  - [ ] Remaining issues section
  - [ ] Business impact section
  - [ ] Educational section
  - [ ] Skills & achievements section
  - [ ] Commit info section (PRO)
  - [ ] Metadata section

## 4.2 Phase 2: Database Setup

- [ ] Create database migrations
- [ ] Create repository interfaces
- [ ] Implement Supabase repositories:
  - [ ] UserRepository
  - [ ] UserPreferencesRepository
  - [ ] UserSkillsRepository
  - [ ] AchievementsRepository
  - [ ] AnalysisHistoryRepository
  - [ ] ReportRepository
  - [ ] PatternContributionsRepository

## 4.3 Phase 3: API Layer

- [ ] Set up Express router
- [ ] Implement controllers:
  - [ ] ReportsController
  - [ ] AnalysisController
  - [ ] FixesController (PRO)
  - [ ] UsersController
  - [ ] HistoryController
  - [ ] RepositoriesController
- [ ] Implement middleware:
  - [ ] Authentication
  - [ ] Tier checking
  - [ ] Rate limiting
  - [ ] Error handling
- [ ] Implement services:
  - [ ] ReportService
  - [ ] ExportService
  - [ ] AnalysisService
  - [ ] FixService

## 4.4 Phase 4: Integration

- [ ] Integrate report generator with V9 analyzer
- [ ] Integrate with fix-branch-orchestrator
- [ ] Add report storage to Supabase
- [ ] Implement export formats (markdown, HTML, PDF, SARIF, JSON)
- [ ] Add WebSocket/SSE for real-time progress

## 4.5 Phase 5: Testing

- [ ] Unit tests for section generators
- [ ] Integration tests for API endpoints
- [ ] E2E tests for full flow
- [ ] Performance testing
- [ ] Load testing

---

# PART 5: ACCEPTANCE CRITERIA

## 5.1 Report Generation

| Criterion | Description | Test |
|-----------|-------------|------|
| Same structure | Both tiers use same sections | Compare BASIC vs PRO reports |
| Score before/after | PRO shows improvement | Generate PRO report with fixes |
| Fixed issues grouped | By rule, collapsible | Check fixSummary.successfullyFixed.byRule |
| Review flagged | Security/Deps/Perf highlighted | Check requiresReview.highPriority |
| Rolled back tracked | Failed fixes shown | Apply fix that fails, check rolledBack |
| History chart | Last 5 PRs by default | Check progressHistory.history |
| First-time message | Baseline shown for new users | Generate for user with no history |
| Skills cross-repo | Same skills across repos | Check skills after analyzing multiple repos |

## 5.2 API Endpoints

| Endpoint | Method | Test |
|----------|--------|------|
| `/reports/:id` | GET | Retrieve full report |
| `/reports/:id/summary` | GET | Retrieve summary only |
| `/reports/:id/section/:name` | GET | Lazy load section |
| `/reports/:id/export/:format` | GET | Export all formats |
| `/analysis` | POST | Start analysis |
| `/analysis/:id/status` | GET | Check status |
| `/analysis/:id/fixes` | POST | Start fixes (PRO) |
| `/users/me/preferences` | GET/PUT | Read/update prefs |
| `/users/me/skills` | GET | Get skills |
| `/repositories/:id/history` | GET | Get repo history |

## 5.3 Performance

| Metric | Target |
|--------|--------|
| Report generation | < 5 seconds |
| API response (summary) | < 200ms |
| API response (full report) | < 500ms |
| Section lazy load | < 100ms |
| Export generation | < 10 seconds (PDF) |

---

*This document is the complete backend specification for CodeQual web report system.*
*Implementation should follow this spec and verify against acceptance criteria.*

---

## 📁 File Locations

After implementation, files should be organized as:

```
packages/agents/src/
├── two-branch/
│   └── report/
│       ├── unified-report-generator.ts
│       ├── unified-report-types.ts
│       └── sections/
│           ├── header-section.ts
│           ├── progress-section.ts
│           ├── fix-summary-section.ts
│           ├── remaining-issues-section.ts
│           ├── business-impact-section.ts
│           ├── educational-section.ts
│           ├── skills-section.ts
│           ├── commit-info-section.ts
│           └── metadata-section.ts
├── api/
│   ├── routes/
│   │   ├── index.ts
│   │   ├── reports.ts
│   │   ├── analysis.ts
│   │   ├── fixes.ts
│   │   ├── users.ts
│   │   └── history.ts
│   ├── controllers/
│   │   ├── reports.controller.ts
│   │   ├── analysis.controller.ts
│   │   ├── fixes.controller.ts
│   │   ├── users.controller.ts
│   │   └── history.controller.ts
│   ├── middleware/
│   │   ├── auth.ts
│   │   ├── tier.ts
│   │   └── error-handler.ts
│   └── services/
│       ├── report.service.ts
│       ├── export.service.ts
│       └── analysis.service.ts
├── database/
│   ├── migrations/
│   │   └── 001_initial_schema.ts
│   └── repositories/
│       ├── user.repository.ts
│       ├── preferences.repository.ts
│       ├── skills.repository.ts
│       ├── achievements.repository.ts
│       ├── history.repository.ts
│       └── report.repository.ts
```
