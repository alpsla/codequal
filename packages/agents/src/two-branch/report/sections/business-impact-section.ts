/**
 * Business Impact Section Generator
 *
 * Generates the BusinessImpact section showing time savings, cost analysis,
 * risk reduction, and ROI metrics.
 *
 * @see unified-report-types.ts for type definitions
 */

import {
  BusinessImpact,
  TimeValue,
  TimeValueWithPercent,
  EffortBreakdown,
  V9AnalysisResultInput,
  FixOrchestrationResultInput,
  AnalyzedIssue,
  IssueCategory,
  Severity,
} from '../unified-report-types';

/**
 * Default hourly rate for cost calculations (USD)
 */
const DEFAULT_HOURLY_RATE = 150;

/**
 * Estimated time per issue by severity (in minutes)
 */
const TIME_PER_ISSUE: Record<Severity, number> = {
  critical: 60,  // 1 hour
  high: 45,      // 45 minutes
  medium: 20,    // 20 minutes
  low: 10,       // 10 minutes
};

/**
 * Effort classification thresholds (in minutes)
 */
const EFFORT_THRESHOLDS = {
  trivial: 10,      // < 10 minutes
  minor: 30,        // 10-30 minutes
  moderate: 60,     // 30-60 minutes
  significant: Infinity,  // > 60 minutes
};

/**
 * Generate the business impact section
 */
export function generateBusinessImpactSection(
  analysis: V9AnalysisResultInput,
  fixResult?: FixOrchestrationResultInput,
  hourlyRate: number = DEFAULT_HOURLY_RATE
): BusinessImpact {
  // Calculate time estimates
  const manualTime = calculateManualTime(analysis.issues);
  const automatedTime: TimeValue = fixResult
    ? calculateAutomatedTime(analysis, fixResult)
    : { value: 2, formatted: '2 minutes' }; // 2 minutes for analysis

  // Calculate time saved (for PRO)
  const timeSaved = fixResult
    ? {
        value: manualTime.value - automatedTime.value,
        formatted: formatTime(manualTime.value - automatedTime.value),
        percent: Math.round(((manualTime.value - automatedTime.value) / manualTime.value) * 100),
      }
    : undefined;

  // Calculate costs
  const manualCost = (manualTime.value / 60) * hourlyRate;
  const codequalCost = fixResult ? calculateCodeQualCost(analysis, fixResult) : 0.07; // Base analysis cost

  // Calculate remaining effort
  const remainingIssues = fixResult
    ? calculateRemainingIssues(analysis.issues, fixResult)
    : analysis.issues.filter((i) => i.status !== 'resolved');
  const remainingEffort = calculateRemainingEffort(remainingIssues);

  // Calculate risk reduction (PRO only)
  const riskReduction = fixResult ? calculateRiskReduction(analysis, fixResult) : undefined;

  // Calculate ROI (PRO only)
  const roi = fixResult
    ? {
        timeSavedPercent: timeSaved!.percent,
        costSavedPercent: Math.round(((manualCost - codequalCost) / manualCost) * 100),
        issuesResolvedPercent: Math.round(
          (fixResult.execution.totalFixesApplied / analysis.issues.length) * 100
        ),
        summary: generateROISummary(manualCost, codequalCost, timeSaved!.percent),
      }
    : undefined;

  return {
    time: {
      automated: {
        value: automatedTime.value,
        formatted: formatTime(automatedTime.value),
      },
      manual: {
        value: manualTime.value,
        formatted: formatTime(manualTime.value),
      },
      saved: timeSaved,
    },
    cost: {
      hourlyRate,
      manualEstimate: Math.round(manualCost * 100) / 100,
      codequalCost: Math.round(codequalCost * 100) / 100,
      netSavings: fixResult ? Math.round((manualCost - codequalCost) * 100) / 100 : undefined,
    },
    riskReduction,
    remainingEffort,
    roi,
  };
}

/**
 * Calculate manual fix time for all issues
 */
function calculateManualTime(issues: AnalyzedIssue[]): TimeValue {
  let totalMinutes = 0;

  for (const issue of issues) {
    if (issue.status !== 'resolved') {
      totalMinutes += TIME_PER_ISSUE[issue.severity];
    }
  }

  return {
    value: totalMinutes,
    formatted: formatTime(totalMinutes),
  };
}

/**
 * Calculate automated fix time
 */
function calculateAutomatedTime(
  analysis: V9AnalysisResultInput,
  fixResult: FixOrchestrationResultInput
): TimeValue {
  // Use actual duration if available
  const analysisMinutes = analysis.duration / 60000; // Convert ms to minutes

  // Add estimated fix time (approximately 30 seconds per fix)
  const fixMinutes = fixResult.execution.totalFixesApplied * 0.5;

  const totalMinutes = Math.round((analysisMinutes + fixMinutes) * 10) / 10;

  return {
    value: totalMinutes,
    formatted: formatTime(totalMinutes),
  };
}

/**
 * Calculate CodeQual cost
 */
function calculateCodeQualCost(
  analysis: V9AnalysisResultInput,
  fixResult: FixOrchestrationResultInput
): number {
  // Base analysis cost
  let cost = 0.05;

  // Add cost per AI fix (Tier 3)
  const aiFixes = fixResult.fixes.filter((f) => f.tier === 'tier3_ai').length;
  cost += aiFixes * 0.02; // $0.02 per AI-generated fix

  // Add cost per cloud API fix (Tier 2.5)
  const cloudFixes = fixResult.fixes.filter((f) => f.tier === 'tier2_5_cloud').length;
  cost += cloudFixes * 0.01; // $0.01 per cloud API fix

  return Math.round(cost * 100) / 100;
}

/**
 * Calculate remaining effort for unfixed issues
 */
function calculateRemainingEffort(issues: AnalyzedIssue[]): BusinessImpact['remainingEffort'] {
  const byEffort: EffortBreakdown = {
    trivial: { count: 0, totalMinutes: 0 },
    minor: { count: 0, totalMinutes: 0 },
    moderate: { count: 0, totalMinutes: 0 },
    significant: { count: 0, totalMinutes: 0 },
  };

  let totalMinutes = 0;

  for (const issue of issues) {
    const minutes = TIME_PER_ISSUE[issue.severity];
    totalMinutes += minutes;

    // Classify effort
    if (minutes <= EFFORT_THRESHOLDS.trivial) {
      byEffort.trivial.count++;
      byEffort.trivial.totalMinutes += minutes;
    } else if (minutes <= EFFORT_THRESHOLDS.minor) {
      byEffort.minor.count++;
      byEffort.minor.totalMinutes += minutes;
    } else if (minutes <= EFFORT_THRESHOLDS.moderate) {
      byEffort.moderate.count++;
      byEffort.moderate.totalMinutes += minutes;
    } else {
      byEffort.significant.count++;
      byEffort.significant.totalMinutes += minutes;
    }
  }

  const totalHours = totalMinutes / 60;

  return {
    totalHours: Math.round(totalHours * 10) / 10,
    formatted: formatTime(totalMinutes),
    issueCount: issues.length,
    byEffort,
  };
}

/**
 * Calculate risk reduction metrics
 */
function calculateRiskReduction(
  analysis: V9AnalysisResultInput,
  fixResult: FixOrchestrationResultInput
): BusinessImpact['riskReduction'] {
  const fixedIds = new Set(fixResult.fixes.map((f) => f.issueId));

  let securityIssuesFixed = 0;
  let criticalIssuesFixed = 0;
  let highIssuesFixed = 0;
  let technicalDebtReduced = 0;

  for (const issue of analysis.issues) {
    if (fixedIds.has(issue.id)) {
      if (issue.category === 'security') securityIssuesFixed++;
      if (issue.severity === 'critical') criticalIssuesFixed++;
      if (issue.severity === 'high') highIssuesFixed++;

      // Calculate technical debt reduction (minutes saved)
      technicalDebtReduced += TIME_PER_ISSUE[issue.severity];
    }
  }

  return {
    securityIssuesFixed,
    criticalIssuesFixed,
    highIssuesFixed,
    technicalDebtReduced: Math.round(technicalDebtReduced / 60), // Convert to hours
  };
}

/**
 * Calculate remaining issues after fixes
 */
function calculateRemainingIssues(
  issues: AnalyzedIssue[],
  fixResult: FixOrchestrationResultInput
): AnalyzedIssue[] {
  const fixedIds = new Set(fixResult.fixes.map((f) => f.issueId));
  return issues.filter((i) => !fixedIds.has(i.id) && i.status !== 'resolved');
}

/**
 * Generate ROI summary text
 */
function generateROISummary(
  manualCost: number,
  codequalCost: number,
  timeSavedPercent: number
): string {
  const savings = manualCost - codequalCost;
  const roi = Math.round((savings / codequalCost) * 100);

  if (roi >= 1000) {
    return `CodeQual delivered ${roi}% ROI, saving ${formatCurrency(savings)} and ${timeSavedPercent}% of developer time.`;
  } else if (roi >= 100) {
    return `Excellent ROI of ${roi}%: saved ${formatCurrency(savings)} and ${timeSavedPercent}% of time.`;
  } else if (roi >= 0) {
    return `Positive ROI of ${roi}%: saved ${formatCurrency(savings)} with ${timeSavedPercent}% time reduction.`;
  } else {
    return `Analysis cost ${formatCurrency(codequalCost)} for comprehensive code review and educational content.`;
  }
}

/**
 * Format time in minutes to human-readable string
 */
function formatTime(minutes: number): string {
  if (minutes < 1) {
    return `${Math.round(minutes * 60)} seconds`;
  }
  if (minutes < 60) {
    return `${Math.round(minutes)} minute${minutes !== 1 ? 's' : ''}`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.round(minutes % 60);

  if (remainingMinutes === 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  }
  return `${hours} hour${hours !== 1 ? 's' : ''} ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
}

/**
 * Format currency
 */
function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}
