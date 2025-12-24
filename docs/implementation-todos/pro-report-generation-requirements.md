# PRO Report Generation - Backend Requirements

*Created: December 23, 2025*
*Purpose: Backend implementation specification for PRO tier unified report*
*Status: REQUIREMENTS - Pending Implementation*

---

## 📋 Document Overview

This document specifies the backend logic required to generate the PRO tier unified report. It includes data structures, computation logic, API requirements, and acceptance criteria.

**Related Documents:**
- `pro-tier-ux-flow-refined.md` - UX flow and visual design decisions
- `tier-differentiation-requirements.md` - BASIC vs PRO feature matrix

---

## 🎯 Report Generation Goals

1. **Single Unified Report**: Combine analysis + fix results in one document
2. **Progressive Disclosure**: Support collapsed/expanded views
3. **Tier-Aware Rendering**: Same structure, different content depth
4. **History Integration**: Include user progress data
5. **Configurable Output**: Respect user preferences

---

## 📊 Report Sections Specification

### Section 1: Header & Score

#### 1.1 Data Required

```typescript
interface ReportHeader {
  // Basic Info
  repositoryUrl: string;
  repositoryName: string;
  prNumber: number;
  prTitle: string;
  prAuthor: string;
  analysisTimestamp: string;
  reportId: string;
  
  // Score Data
  score: {
    current: number;           // 0-100
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    previous?: number;         // If returning user, score before fixes
    improvement?: number;      // current - previous (PRO only, after fixes)
  };
  
  // Decision
  decision: {
    status: 'APPROVED' | 'DECLINED';
    reason: string;
    blockingIssuesCount: number;
  };
  
  // Quick Stats
  stats: {
    totalIssuesFound: number;
    issuesFixed: number;           // PRO only
    issuesRemaining: number;
    issuesRequiringReview: number; // PRO only
  };
}
```

#### 1.2 Computation Logic

```typescript
function computeHeaderData(
  analysisResult: V9AnalysisResult,
  fixResult?: FixOrchestrationResult,
  userHistory?: UserAnalysisHistory
): ReportHeader {
  
  // Calculate score
  const scoreBeforeFixes = calculateQualityScore(analysisResult.issues);
  const scoreAfterFixes = fixResult 
    ? calculateQualityScore(getRemainingIssues(analysisResult, fixResult))
    : scoreBeforeFixes;
  
  // Determine grade
  const grade = scoreToGrade(scoreAfterFixes);
  
  // Decision logic
  const blockingIssues = getBlockingIssues(
    fixResult ? getRemainingIssues(analysisResult, fixResult) : analysisResult.issues
  );
  
  return {
    score: {
      current: scoreAfterFixes,
      grade,
      previous: fixResult ? scoreBeforeFixes : undefined,
      improvement: fixResult ? scoreAfterFixes - scoreBeforeFixes : undefined
    },
    decision: {
      status: blockingIssues.length === 0 ? 'APPROVED' : 'DECLINED',
      reason: generateDecisionReason(blockingIssues),
      blockingIssuesCount: blockingIssues.length
    },
    stats: {
      totalIssuesFound: analysisResult.issues.length,
      issuesFixed: fixResult?.execution.totalFixesApplied ?? 0,
      issuesRemaining: fixResult 
        ? analysisResult.issues.length - fixResult.execution.totalFixesApplied
        : analysisResult.issues.length,
      issuesRequiringReview: fixResult?.reviewRequired?.length ?? 0
    }
  };
}
```

---

### Section 2: Progress History

#### 2.1 Data Required

```typescript
interface ProgressHistory {
  // User context
  isFirstTimeUser: boolean;
  userId: string;
  
  // Historical data (cross-repo for skills, per-repo for scores)
  repoHistory?: {
    repositoryId: string;
    analyses: Array<{
      prNumber: number;
      timestamp: string;
      scoreBefore: number;
      scoreAfter: number;  // Same as scoreBefore for BASIC
      grade: string;
    }>;
    displayCount: number;  // Default 5, user configurable
    totalCount: number;
  };
  
  // Trend calculation
  trend?: {
    direction: 'improving' | 'declining' | 'stable';
    changePercent: number;
    bestScore: number;
    averageScore: number;
  };
  
  // First-time user message
  firstTimeMessage?: string;
}
```

#### 2.2 Computation Logic

```typescript
function computeProgressHistory(
  userId: string,
  repositoryId: string,
  currentScore: number,
  userPreferences: UserPreferences
): ProgressHistory {
  
  // Fetch repo-specific history
  const historyCount = userPreferences.historyDisplayCount ?? 5;
  const repoAnalyses = await fetchRepoAnalyses(repositoryId, userId, historyCount + 1);
  
  if (repoAnalyses.length === 0) {
    return {
      isFirstTimeUser: true,
      userId,
      firstTimeMessage: `This is your baseline score: ${currentScore}/100. Future analyses will show your improvement trend.`
    };
  }
  
  // Calculate trend
  const scores = repoAnalyses.map(a => a.scoreAfter);
  const trend = calculateTrend(scores, currentScore);
  
  return {
    isFirstTimeUser: false,
    userId,
    repoHistory: {
      repositoryId,
      analyses: repoAnalyses.slice(0, historyCount),
      displayCount: historyCount,
      totalCount: repoAnalyses.length
    },
    trend
  };
}

function calculateTrend(historicalScores: number[], currentScore: number): Trend {
  const allScores = [...historicalScores, currentScore];
  const firstScore = allScores[0];
  const changePercent = ((currentScore - firstScore) / firstScore) * 100;
  
  return {
    direction: changePercent > 5 ? 'improving' : changePercent < -5 ? 'declining' : 'stable',
    changePercent: Math.round(changePercent),
    bestScore: Math.max(...allScores),
    averageScore: Math.round(allScores.reduce((a, b) => a + b) / allScores.length)
  };
}
```

#### 2.3 Storage Schema

```sql
-- Per-repository analysis history
CREATE TABLE analysis_history (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  repository_id UUID NOT NULL REFERENCES repositories(id),
  pr_number INTEGER NOT NULL,
  pr_title TEXT,
  analysis_timestamp TIMESTAMPTZ NOT NULL,
  score_before INTEGER NOT NULL,  -- Before fixes (or same for BASIC)
  score_after INTEGER NOT NULL,   -- After fixes (or same for BASIC)
  grade CHAR(1) NOT NULL,
  tier VARCHAR(20) NOT NULL,      -- 'basic' or 'pro'
  issues_found INTEGER NOT NULL,
  issues_fixed INTEGER DEFAULT 0,
  report_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(repository_id, pr_number)
);

-- User preferences (cross-repo)
CREATE TABLE user_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  history_display_count INTEGER DEFAULT 5,
  default_output_method VARCHAR(50) DEFAULT 'commit',
  default_commit_style VARCHAR(50) DEFAULT 'single',
  default_fix_scope VARCHAR(50) DEFAULT 'recommended',
  review_confidence_threshold INTEGER DEFAULT 80,
  always_review_security BOOLEAN DEFAULT TRUE,
  always_review_dependencies BOOLEAN DEFAULT TRUE,
  always_review_performance BOOLEAN DEFAULT TRUE,
  commit_message_template TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### Section 3: Fix Summary (PRO Only)

#### 3.1 Data Required

```typescript
interface FixSummary {
  // Successfully fixed
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
    // Grouped by rule for display
    byRule: Array<{
      ruleId: string;
      ruleName: string;
      category: IssueCategory;
      count: number;
      tier: FixTier;
      confidence: number;
      verificationStatus: 'passed' | 'passed_with_warnings';
      files: Array<{
        path: string;
        lines: number[];
      }>;
      // Detail data (for expand view)
      fixes?: Array<{
        file: string;
        line: number;
        originalCode: string;
        fixedCode: string;
        explanation: string;
      }>;
    }>;
  };
  
  // Requires review
  requiresReview: {
    total: number;
    highPriority: Array<ReviewItem>;      // Security/Deps/Performance
    lowConfidence: Array<ReviewItem>;     // <80% confidence
  };
  
  // Rolled back
  rolledBack: Array<{
    ruleId: string;
    file: string;
    line: number;
    reason: 'verification_failed' | 'regression_introduced';
    attemptedFix: string;
    error: string;
    manualFixGuide?: string;
  }>;
  
  // Cannot auto-fix
  cannotAutoFix: {
    total: number;
    byReason: Record<UnfixedReason, number>;
    items: Array<UnfixedIssue>;  // From unfixed-issue-handler.ts
  };
}

interface ReviewItem {
  ruleId: string;
  ruleName: string;
  category: IssueCategory;
  file: string;
  line: number;
  confidence: number;
  reason: 'security' | 'dependency' | 'performance' | 'low_confidence';
  originalCode: string;
  fixedCode: string;
  explanation: string;
}
```

#### 3.2 Computation Logic

```typescript
function computeFixSummary(
  analysisResult: V9AnalysisResult,
  fixResult: FixOrchestrationResult,
  userPreferences: UserPreferences
): FixSummary {
  
  const confidenceThreshold = userPreferences.review_confidence_threshold ?? 80;
  
  // Group successful fixes by rule
  const fixesByRule = groupFixesByRule(fixResult.branchResult.applyResult.applied);
  
  // Identify items requiring review
  const requiresReview = identifyReviewItems(
    fixResult.branchResult.applyResult.applied,
    {
      confidenceThreshold,
      alwaysReviewSecurity: userPreferences.always_review_security,
      alwaysReviewDependencies: userPreferences.always_review_dependencies,
      alwaysReviewPerformance: userPreferences.always_review_performance
    }
  );
  
  // Get rolled back items
  const rolledBack = fixResult.verification?.details?.failedFixes.map(f => ({
    ruleId: f.fix.ruleId,
    file: f.fix.file,
    line: f.fix.line,
    reason: f.regressionsFound ? 'regression_introduced' : 'verification_failed',
    attemptedFix: f.fix.fixedCode,
    error: f.regressionsFound 
      ? `Created ${f.regressedIssues?.length} new issues`
      : 'Original issue still present after fix',
    manualFixGuide: generateManualFixGuide(f.fix)
  })) ?? [];
  
  return {
    successfullyFixed: {
      total: fixResult.execution.totalFixesApplied - rolledBack.length,
      byCategory: countByCategory(fixesByRule),
      byTier: countByTier(fixResult),
      byRule: fixesByRule
    },
    requiresReview: {
      total: requiresReview.highPriority.length + requiresReview.lowConfidence.length,
      ...requiresReview
    },
    rolledBack,
    cannotAutoFix: {
      total: fixResult.unfixedIssues.total,
      byReason: fixResult.unfixedIssues.byReason,
      items: getUnfixedItems(fixResult)
    }
  };
}

function identifyReviewItems(
  appliedFixes: CategorizedFix[],
  config: ReviewConfig
): { highPriority: ReviewItem[], lowConfidence: ReviewItem[] } {
  
  const highPriority: ReviewItem[] = [];
  const lowConfidence: ReviewItem[] = [];
  
  for (const fix of appliedFixes) {
    const category = inferCategoryFromRule(fix.ruleId);
    
    // Check if high priority category
    const isHighPriority = 
      (config.alwaysReviewSecurity && category === 'security') ||
      (config.alwaysReviewDependencies && category === 'dependencies') ||
      (config.alwaysReviewPerformance && category === 'performance');
    
    // Check confidence
    const isLowConfidence = (fix.confidence ?? 100) < config.confidenceThreshold;
    
    if (isHighPriority) {
      highPriority.push(createReviewItem(fix, 
        category === 'security' ? 'security' :
        category === 'dependencies' ? 'dependency' : 'performance'
      ));
    } else if (isLowConfidence) {
      lowConfidence.push(createReviewItem(fix, 'low_confidence'));
    }
  }
  
  return { highPriority, lowConfidence };
}
```

---

### Section 4: Remaining Issues

#### 4.1 Data Required

```typescript
interface RemainingIssues {
  // Summary counts
  summary: {
    total: number;
    bySeverity: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
    byCategory: Record<IssueCategory, number>;
  };
  
  // Detailed issues (only unfixed ones)
  blocking: Array<DetailedIssue>;    // Critical that block merge
  highPriority: Array<DetailedIssue>;
  mediumLow: Array<GroupedIssue>;    // Grouped by rule, collapsible
}

interface DetailedIssue {
  id: string;
  ruleId: string;
  ruleName: string;
  category: IssueCategory;
  severity: 'critical' | 'high' | 'medium' | 'low';
  file: string;
  line: number;
  
  // Educational content
  description: string;
  whyItMatters: string;
  commonCauses: string[];
  impactIfNotFixed: string;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  
  // Code context
  codeSnippet: string;
  
  // Fix guidance (since we couldn't auto-fix)
  manualFixSteps: string[];
  recommendedCode?: string;
  bestPractices: string[];
  
  // Why auto-fix failed (PRO only)
  autoFixFailureReason?: UnfixedReason;
  autoFixFailureExplanation?: string;
  
  // Related occurrences
  occurrenceCount: number;
  otherLocations?: Array<{ file: string; line: number }>;
}

interface GroupedIssue {
  ruleId: string;
  ruleName: string;
  category: IssueCategory;
  severity: 'medium' | 'low';
  count: number;
  files: Array<{ path: string; lines: number[] }>;
  // Summary only, expand for details
  briefDescription: string;
  expandedDetails?: DetailedIssue[];
}
```

#### 4.2 Computation Logic

```typescript
function computeRemainingIssues(
  analysisResult: V9AnalysisResult,
  fixResult?: FixOrchestrationResult
): RemainingIssues {
  
  // Get unfixed issues
  const remainingIssues = fixResult
    ? getRemainingIssues(analysisResult, fixResult)
    : analysisResult.issues;
  
  // Separate by severity
  const blocking = remainingIssues.filter(i => 
    i.severity === 'critical' && i.status === 'NEW'
  );
  const highPriority = remainingIssues.filter(i => 
    i.severity === 'high' || (i.severity === 'critical' && i.status !== 'NEW')
  );
  const mediumLow = remainingIssues.filter(i => 
    i.severity === 'medium' || i.severity === 'low'
  );
  
  return {
    summary: {
      total: remainingIssues.length,
      bySeverity: countBySeverity(remainingIssues),
      byCategory: countByCategory(remainingIssues)
    },
    blocking: blocking.map(enrichIssueWithEducation),
    highPriority: highPriority.map(enrichIssueWithEducation),
    mediumLow: groupByRule(mediumLow)
  };
}

function enrichIssueWithEducation(issue: Issue): DetailedIssue {
  // Use existing AI enrichment or rule descriptions
  const ruleInfo = getRuleDescription(issue.ruleId);
  
  return {
    ...issue,
    description: issue.description || ruleInfo.description,
    whyItMatters: ruleInfo.whyItMatters,
    commonCauses: ruleInfo.commonCauses,
    impactIfNotFixed: ruleInfo.impact,
    riskLevel: calculateRiskLevel(issue),
    manualFixSteps: ruleInfo.manualFixSteps,
    recommendedCode: ruleInfo.recommendedCode,
    bestPractices: ruleInfo.bestPractices
  };
}
```

---

### Section 5: Business Impact

#### 5.1 Data Required

```typescript
interface BusinessImpact {
  // Time analysis
  timeSaved: {
    automatedFixTime: string;        // e.g., "2 minutes"
    estimatedManualTime: string;     // e.g., "4.5 hours"
    timeSavedPercent: number;
  };
  
  // Cost analysis
  costSaved: {
    manualCostEstimate: number;      // Based on hourly rate
    codequalCost: number;            // AI API costs
    netSavings: number;
    hourlyRateUsed: number;
  };
  
  // Risk reduction
  riskReduction: {
    securityIssuesFixed: number;
    criticalIssuesFixed: number;
    technicalDebtReduced: number;    // Issue count
  };
  
  // Remaining effort
  remainingEffort: {
    estimatedHours: number;
    issueCount: number;
    byEffortLevel: {
      trivial: number;    // <5 min each
      minor: number;      // 5-30 min each
      moderate: number;   // 30min-2hr each
      significant: number; // 2+ hours each
    };
  };
}
```

#### 5.2 Computation Logic

```typescript
function computeBusinessImpact(
  analysisResult: V9AnalysisResult,
  fixResult?: FixOrchestrationResult,
  config?: { hourlyRate?: number }
): BusinessImpact {
  
  const hourlyRate = config?.hourlyRate ?? 150;
  const fixedCount = fixResult?.execution.totalFixesApplied ?? 0;
  const remainingCount = analysisResult.issues.length - fixedCount;
  
  // Calculate time saved
  const avgMinutesPerIssue = 15;
  const manualTimeMinutes = fixedCount * avgMinutesPerIssue;
  const automatedTimeMinutes = fixResult ? 2 : 0;  // Actual fix time
  
  // Calculate remaining effort
  const remainingIssues = fixResult
    ? getRemainingIssues(analysisResult, fixResult)
    : analysisResult.issues;
  const effortBreakdown = calculateEffortBreakdown(remainingIssues);
  
  return {
    timeSaved: {
      automatedFixTime: `${automatedTimeMinutes} minutes`,
      estimatedManualTime: formatDuration(manualTimeMinutes),
      timeSavedPercent: Math.round(
        ((manualTimeMinutes - automatedTimeMinutes) / manualTimeMinutes) * 100
      )
    },
    costSaved: {
      manualCostEstimate: Math.round((manualTimeMinutes / 60) * hourlyRate),
      codequalCost: fixResult?.execution.totalCost ?? 0,
      netSavings: Math.round((manualTimeMinutes / 60) * hourlyRate) - 
                  (fixResult?.execution.totalCost ?? 0),
      hourlyRateUsed: hourlyRate
    },
    riskReduction: {
      securityIssuesFixed: countByCategory(getFixedIssues(fixResult)).security ?? 0,
      criticalIssuesFixed: countBySeverity(getFixedIssues(fixResult)).critical ?? 0,
      technicalDebtReduced: fixedCount
    },
    remainingEffort: {
      estimatedHours: effortBreakdown.totalHours,
      issueCount: remainingCount,
      byEffortLevel: effortBreakdown.breakdown
    }
  };
}
```

---

### Section 6: Educational Content

#### 6.1 Data Required

```typescript
interface EducationalContent {
  // Only for remaining unfixed issues
  learningPaths: Array<{
    category: IssueCategory;
    issueCount: number;
    modules: Array<{
      title: string;
      description: string;
      estimatedTime: string;
      difficulty: 'beginner' | 'intermediate' | 'advanced';
      resources: Array<{
        type: 'article' | 'video' | 'tutorial' | 'documentation';
        title: string;
        url: string;
      }>;
    }>;
  }>;
  
  // Phased plan (prioritized)
  phasedPlan: {
    phase1: {
      title: string;
      focus: string;
      issues: string[];  // Rule IDs
      estimatedTime: string;
    };
    phase2?: { /* same structure */ };
    phase3?: { /* same structure */ };
  };
}
```

#### 6.2 Computation Logic

```typescript
function computeEducationalContent(
  remainingIssues: RemainingIssues
): EducationalContent {
  
  // Only create learning paths for categories with unfixed issues
  const categoriesWithIssues = Object.entries(remainingIssues.summary.byCategory)
    .filter(([_, count]) => count > 0)
    .map(([category]) => category as IssueCategory);
  
  const learningPaths = categoriesWithIssues.map(category => ({
    category,
    issueCount: remainingIssues.summary.byCategory[category],
    modules: getEducationalModules(category, remainingIssues)
  }));
  
  // Create phased plan based on severity/blocking status
  const phasedPlan = createPhasedPlan(remainingIssues);
  
  return { learningPaths, phasedPlan };
}
```

---

### Section 7: Skills & Achievements

#### 7.1 Data Required

```typescript
interface SkillsAndAchievements {
  // Skills tracking (cross-repo)
  skills: {
    overall: {
      level: number;
      xp: number;
      xpToNextLevel: number;
      progressPercent: number;
    };
    byCategory: Record<IssueCategory, {
      score: number;        // 0-100
      trend: 'improving' | 'declining' | 'stable';
      issuesFixed: number;  // Lifetime
    }>;
  };
  
  // XP earned this session
  xpEarned: {
    total: number;
    breakdown: Array<{
      action: string;
      amount: number;
    }>;
  };
  
  // Achievements
  achievements: {
    unlocked: Array<{
      id: string;
      name: string;
      description: string;
      iconType: 'badge' | 'trophy' | 'star';
      rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
      unlockedAt: string;
    }>;
    newlyUnlocked: string[];  // IDs unlocked this session
    progress: Array<{
      id: string;
      name: string;
      current: number;
      target: number;
      progressPercent: number;
    }>;
  };
  
  // Community impact (PRO only)
  communityImpact?: {
    patternsContributed: number;
    developersHelped: number;
    contributionRank?: string;  // e.g., "Top 10%"
  };
}
```

#### 7.2 Storage Schema

```sql
-- User skills (cross-repo, account level)
CREATE TABLE user_skills (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  level INTEGER DEFAULT 1,
  total_xp INTEGER DEFAULT 0,
  security_score INTEGER DEFAULT 50,
  code_quality_score INTEGER DEFAULT 50,
  dependencies_score INTEGER DEFAULT 50,
  performance_score INTEGER DEFAULT 50,
  architecture_score INTEGER DEFAULT 50,
  issues_fixed_total INTEGER DEFAULT 0,
  analyses_completed INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User achievements
CREATE TABLE user_achievements (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  achievement_id VARCHAR(100) NOT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL,
  UNIQUE(user_id, achievement_id)
);

-- Community contributions (PRO only)
CREATE TABLE pattern_contributions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  pattern_id UUID NOT NULL REFERENCES fix_patterns(id),
  contributed_at TIMESTAMPTZ DEFAULT NOW(),
  times_reused INTEGER DEFAULT 0
);
```

#### 7.3 XP Calculation

```typescript
const XP_VALUES = {
  analysis_completed: 50,
  issue_fixed_tier1: 5,
  issue_fixed_tier2: 10,
  issue_fixed_ai: 15,
  fix_verified: 3,
  pattern_contributed: 25,
  pattern_reused: 2,  // When your pattern helps others
  achievement_unlocked: 100,
  first_analysis: 200,
  streak_day: 25,
};

function calculateXPEarned(
  fixResult: FixOrchestrationResult,
  newAchievements: string[]
): XPBreakdown {
  const breakdown = [];
  let total = 0;
  
  // Analysis completion
  breakdown.push({ action: 'Analysis completed', amount: XP_VALUES.analysis_completed });
  total += XP_VALUES.analysis_completed;
  
  // Fixes by tier
  if (fixResult.execution.tier1Executed > 0) {
    const amount = fixResult.execution.tier1Executed * XP_VALUES.issue_fixed_tier1;
    breakdown.push({ action: `Tier 1 fixes (${fixResult.execution.tier1Executed})`, amount });
    total += amount;
  }
  // ... similar for other tiers
  
  // Achievements
  newAchievements.forEach(a => {
    breakdown.push({ action: `Achievement: ${a}`, amount: XP_VALUES.achievement_unlocked });
    total += XP_VALUES.achievement_unlocked;
  });
  
  return { total, breakdown };
}
```

---

### Section 8: Commit/Branch Info (PRO Only)

#### 8.1 Data Required

```typescript
interface CommitInfo {
  // Git info
  branchName: string;
  commitSha: string;
  commitMessage: string;
  
  // Files modified
  filesModified: {
    total: number;
    list: string[];  // File paths
  };
  
  // Links
  links: {
    branch?: string;     // GitHub/GitLab branch URL
    pullRequest?: string; // If PR was created
    diff?: string;       // Diff URL
  };
  
  // Review document
  reviewDocument: {
    fileName: string;    // CODEQUAL_FIXES.md
    content: string;     // Markdown content
  };
}
```

---

### Section 9: Metadata

#### 9.1 Data Required

```typescript
interface ReportMetadata {
  // Analysis info
  analysis: {
    duration: string;
    startTime: string;
    endTime: string;
    mode: 'fast' | 'standard' | 'thorough' | 'complete';
  };
  
  // Tools used
  tools: Array<{
    name: string;
    version: string;
    issuesFound: number;
    executionTime: string;
  }>;
  
  // Cost breakdown
  costs: {
    analysisApiCost: number;
    fixApiCost: number;
    totalCost: number;
  };
  
  // Export options
  exportFormats: Array<'markdown' | 'html' | 'pdf' | 'sarif' | 'json'>;
  
  // Report URLs
  urls: {
    webReport: string;
    downloadMarkdown: string;
    downloadSarif?: string;
  };
}
```

---

## 🔄 Report Generation Pipeline

### Main Entry Point

```typescript
interface GenerateReportOptions {
  analysisResult: V9AnalysisResult;
  fixResult?: FixOrchestrationResult;  // Undefined for BASIC
  userId: string;
  repositoryId: string;
  tier: 'basic' | 'pro';
  userPreferences?: UserPreferences;
}

async function generateUnifiedReport(
  options: GenerateReportOptions
): Promise<UnifiedReport> {
  
  const { analysisResult, fixResult, userId, repositoryId, tier, userPreferences } = options;
  
  // Fetch user data
  const prefs = userPreferences ?? await fetchUserPreferences(userId);
  const history = await fetchAnalysisHistory(userId, repositoryId);
  const skills = await fetchUserSkills(userId);
  
  // Generate sections
  const report: UnifiedReport = {
    header: computeHeaderData(analysisResult, fixResult, history),
    progressHistory: computeProgressHistory(userId, repositoryId, 
      fixResult?.score ?? analysisResult.score, prefs),
    
    // PRO-only sections
    fixSummary: tier === 'pro' && fixResult 
      ? computeFixSummary(analysisResult, fixResult, prefs)
      : undefined,
    
    remainingIssues: computeRemainingIssues(analysisResult, fixResult),
    businessImpact: computeBusinessImpact(analysisResult, fixResult),
    educational: computeEducationalContent(
      computeRemainingIssues(analysisResult, fixResult)
    ),
    skillsAndAchievements: computeSkillsAndAchievements(
      analysisResult, fixResult, skills
    ),
    
    // PRO-only
    commitInfo: tier === 'pro' && fixResult 
      ? computeCommitInfo(fixResult)
      : undefined,
    
    metadata: computeMetadata(analysisResult, fixResult)
  };
  
  // Store analysis in history
  await storeAnalysisHistory(userId, repositoryId, analysisResult, fixResult);
  
  // Update user skills
  await updateUserSkills(userId, analysisResult, fixResult);
  
  return report;
}
```

---

## ✅ Acceptance Criteria

### Section-by-Section Verification

| Section | BASIC | PRO | Verification Steps |
|---------|-------|-----|-------------------|
| **1. Header & Score** | Score, decision | Score before/after, improvement | Check score calculation, grade assignment |
| **2. Progress History** | Same | Same | Verify history fetch, trend calculation |
| **3. Fix Summary** | ❌ | ✅ | Verify grouping by rule, review items identified |
| **4. Remaining Issues** | All issues | Only unfixed | Verify correct issue filtering |
| **5. Business Impact** | Time estimates | Time saved | Verify calculations match |
| **6. Educational** | All categories | Only remaining | Verify filtering to unfixed |
| **7. Skills & Achievements** | Same | + Community | Verify XP calculation, achievement unlock |
| **8. Commit Info** | ❌ | ✅ | Verify git info populated |
| **9. Metadata** | Same | Same | Verify tool list, costs |

### End-to-End Test Scenarios

```typescript
describe('PRO Report Generation', () => {
  
  it('should show before/after score for PRO tier', async () => {
    const report = await generateUnifiedReport({
      analysisResult: mockAnalysis(100 issues),
      fixResult: mockFixResult(80 fixed),
      tier: 'pro'
    });
    
    expect(report.header.score.previous).toBeDefined();
    expect(report.header.score.improvement).toBe(
      report.header.score.current - report.header.score.previous
    );
  });
  
  it('should group fixed issues by rule', async () => {
    const report = await generateUnifiedReport({
      analysisResult: mockAnalysis(),
      fixResult: mockFixResult(),
      tier: 'pro'
    });
    
    expect(report.fixSummary.successfullyFixed.byRule).toBeDefined();
    expect(report.fixSummary.successfullyFixed.byRule.length).toBeGreaterThan(0);
    report.fixSummary.successfullyFixed.byRule.forEach(rule => {
      expect(rule.ruleId).toBeDefined();
      expect(rule.count).toBeGreaterThan(0);
    });
  });
  
  it('should flag security fixes for review even with high confidence', async () => {
    const report = await generateUnifiedReport({
      analysisResult: mockAnalysisWithSecurityIssues(),
      fixResult: mockFixResultWithSecurityFixes({ confidence: 95 }),
      tier: 'pro',
      userPreferences: { always_review_security: true }
    });
    
    const securityReviewItems = report.fixSummary.requiresReview.highPriority
      .filter(i => i.reason === 'security');
    expect(securityReviewItems.length).toBeGreaterThan(0);
  });
  
  it('should show rolled back fixes separately', async () => {
    const report = await generateUnifiedReport({
      analysisResult: mockAnalysis(),
      fixResult: mockFixResultWithRollbacks(),
      tier: 'pro'
    });
    
    expect(report.fixSummary.rolledBack.length).toBeGreaterThan(0);
    report.fixSummary.rolledBack.forEach(item => {
      expect(item.reason).toMatch(/verification_failed|regression_introduced/);
      expect(item.attemptedFix).toBeDefined();
    });
  });
  
  it('should not include fixed issues in educational content', async () => {
    const report = await generateUnifiedReport({
      analysisResult: mockAnalysisWithSecurityIssues(10),
      fixResult: mockFixResultFixingAll(10),
      tier: 'pro'
    });
    
    // If all security issues fixed, no security learning path
    const securityPath = report.educational.learningPaths
      .find(p => p.category === 'security');
    expect(securityPath).toBeUndefined();
  });
  
  it('should show first-time user baseline message', async () => {
    const report = await generateUnifiedReport({
      analysisResult: mockAnalysis(),
      tier: 'basic',
      userId: 'new-user-no-history'
    });
    
    expect(report.progressHistory.isFirstTimeUser).toBe(true);
    expect(report.progressHistory.firstTimeMessage).toContain('baseline');
    expect(report.progressHistory.repoHistory).toBeUndefined();
  });
  
  it('should respect user history display preference', async () => {
    const report = await generateUnifiedReport({
      analysisResult: mockAnalysis(),
      tier: 'basic',
      userPreferences: { history_display_count: 10 }
    });
    
    expect(report.progressHistory.repoHistory.displayCount).toBe(10);
  });
});
```

---

## 📁 Files to Create/Modify

### New Files

| File | Purpose |
|------|---------|
| `src/two-branch/report/unified-report-generator.ts` | Main report generation |
| `src/two-branch/report/sections/header-section.ts` | Header computation |
| `src/two-branch/report/sections/progress-section.ts` | Progress history |
| `src/two-branch/report/sections/fix-summary-section.ts` | Fix summary (PRO) |
| `src/two-branch/report/sections/remaining-issues-section.ts` | Remaining issues |
| `src/two-branch/report/sections/business-impact-section.ts` | Business impact |
| `src/two-branch/report/sections/educational-section.ts` | Educational content |
| `src/two-branch/report/sections/skills-section.ts` | Skills & achievements |
| `src/two-branch/report/sections/commit-info-section.ts` | Commit info (PRO) |
| `src/two-branch/report/sections/metadata-section.ts` | Metadata |
| `src/two-branch/report/types/unified-report-types.ts` | Type definitions |

### Files to Modify

| File | Changes |
|------|---------|
| `v9-grouped-report-formatter.ts` | Integrate with unified generator |
| `fix-branch-orchestrator.ts` | Return data for report sections |
| `Database migrations` | Add new tables |

---

## 🎯 Implementation Priority

### Phase 1: Core Structure
1. Create type definitions (`unified-report-types.ts`)
2. Create main generator (`unified-report-generator.ts`)
3. Implement header section
4. Implement remaining issues section

### Phase 2: PRO Features
5. Implement fix summary section
6. Implement review required logic
7. Implement rolled back tracking
8. Implement commit info section

### Phase 3: History & Skills
9. Add database migrations
10. Implement progress history
11. Implement skills tracking
12. Implement achievements

### Phase 4: Polish
13. Educational content (for remaining only)
14. Business impact calculations
15. Metadata section
16. Integration tests

---

## 📝 Confirmation Checklist

After implementation, confirm these requirements are met:

- [ ] Single unified report for both tiers
- [ ] BASIC report excludes PRO-only sections (fix summary, commit info)
- [ ] Fixed issues grouped by rule with collapse/expand support
- [ ] Review required section highlights security/deps/perf + low confidence
- [ ] Rolled back fixes shown separately with reason
- [ ] Progress chart shows last 5 PRs (configurable)
- [ ] First-time users see baseline message
- [ ] Skills are cross-repo, scores are per-repo
- [ ] User preferences affect report generation
- [ ] Educational content only for unfixed issues
- [ ] All acceptance test scenarios pass

---

*This document serves as the complete backend specification for PRO report generation. Implementation should follow this spec and verify against the acceptance criteria.*
