/**
 * Fix Summary Section Generator (PRO Only)
 *
 * Generates the FixSummary section showing all fixes applied during PRO analysis.
 * Groups fixes by rule, shows what succeeded, requires review, was rolled back, or couldn't be fixed.
 *
 * @see unified-report-types.ts for type definitions
 */

import {
  FixSummary,
  FixedRuleGroup,
  ReviewItem,
  RolledBackItem,
  UnfixedItem,
  FixOrchestrationResultInput,
  V9AnalysisResultInput,
  IssueCategory,
  Severity,
  FixTier,
  UnfixedReason,
  UserPreferences,
} from '../unified-report-types';

/**
 * Generate the fix summary section (PRO only)
 */
export function generateFixSummarySection(
  analysis: V9AnalysisResultInput,
  fixResult: FixOrchestrationResultInput,
  preferences: UserPreferences
): FixSummary {
  const { fixes, reviewRequired, rolledBack, unfixed } = fixResult;

  // Calculate overview stats
  const totalAttempted = fixes.length + reviewRequired.length + rolledBack.length + unfixed.length;
  const totalSuccessful = fixes.length;
  const totalRequiringReview = reviewRequired.length;
  const totalRolledBack = rolledBack.length;
  const totalCannotFix = unfixed.length;
  const successRate = totalAttempted > 0 ? Math.round((totalSuccessful / totalAttempted) * 100) : 0;

  // Group successful fixes by rule
  const fixedByRule = groupFixesByRule(fixes, analysis);

  // Count by category and tier
  const byCategory = countByCategory(fixes, analysis);
  const byTier = countByTier(fixes);

  // Build requires review section
  const requiresReviewSection = buildRequiresReviewSection(reviewRequired, analysis, preferences);

  // Build rolled back section
  const rolledBackItems = buildRolledBackItems(rolledBack, analysis);

  // Build cannot fix section
  const cannotAutoFixSection = buildCannotAutoFixSection(unfixed, analysis);

  return {
    overview: {
      totalAttempted,
      totalSuccessful,
      totalRequiringReview,
      totalRolledBack,
      totalCannotFix,
      successRate,
    },
    successfullyFixed: {
      total: totalSuccessful,
      byCategory,
      byTier,
      byRule: fixedByRule,
    },
    requiresReview: requiresReviewSection,
    rolledBack: rolledBackItems,
    cannotAutoFix: cannotAutoFixSection,
  };
}

/**
 * Group fixes by rule for display
 */
function groupFixesByRule(
  fixes: FixOrchestrationResultInput['fixes'],
  analysis: V9AnalysisResultInput
): FixedRuleGroup[] {
  // Create a map of rule -> fixes
  const ruleMap = new Map<string, typeof fixes>();

  for (const fix of fixes) {
    const existing = ruleMap.get(fix.ruleId) || [];
    existing.push(fix);
    ruleMap.set(fix.ruleId, existing);
  }

  // Convert to FixedRuleGroup array
  const groups: FixedRuleGroup[] = [];

  for (const [ruleId, ruleFixes] of Array.from(ruleMap.entries())) {
    // Find the corresponding issue for category/severity
    const sampleIssue = analysis.issues.find((i) => i.ruleId === ruleId);
    const category: IssueCategory = sampleIssue?.category || 'code_quality';
    const severity: Severity = sampleIssue?.severity || 'medium';

    // Calculate average confidence
    const avgConfidence = Math.round(
      ruleFixes.reduce((sum, f) => sum + f.confidence, 0) / ruleFixes.length
    );

    // Group files
    const fileMap = new Map<string, number[]>();
    for (const fix of ruleFixes) {
      const lines = fileMap.get(fix.file) || [];
      lines.push(fix.line);
      fileMap.set(fix.file, lines);
    }

    const files = Array.from(fileMap.entries()).map(([path, lines]) => ({
      path,
      relativePath: path.replace(/^.*\//, ''),
      lines,
      fixCount: lines.length,
    }));

    groups.push({
      ruleId,
      ruleName: formatRuleName(ruleId),
      ruleDescription: getRuleDescription(ruleId),
      category,
      severity,
      count: ruleFixes.length,
      tier: ruleFixes[0].tier,
      tierLabel: getTierLabel(ruleFixes[0].tier),
      confidence: avgConfidence,
      confidenceLabel: getConfidenceLabel(avgConfidence),
      verificationStatus: ruleFixes.every((f) => f.verificationStatus === 'passed')
        ? 'passed'
        : 'passed_with_warnings',
      files,
      // fixes field is optional for lazy loading
    });
  }

  // Sort by count descending
  return groups.sort((a, b) => b.count - a.count);
}

/**
 * Count fixes by category
 */
function countByCategory(
  fixes: FixOrchestrationResultInput['fixes'],
  analysis: V9AnalysisResultInput
): Record<IssueCategory, number> {
  const counts: Record<IssueCategory, number> = {
    security: 0,
    code_quality: 0,
    performance: 0,
    architecture: 0,
    dependencies: 0,
  };

  for (const fix of fixes) {
    const issue = analysis.issues.find((i) => i.id === fix.issueId);
    const category = issue?.category || 'code_quality';
    counts[category]++;
  }

  return counts;
}

/**
 * Count fixes by tier
 */
function countByTier(fixes: FixOrchestrationResultInput['fixes']): {
  tier1Native: number;
  tier2Dedicated: number;
  tier2_5Pattern: number;
  tier2_5CloudAPI: number;
  tier3AI: number;
} {
  const counts = {
    tier1Native: 0,
    tier2Dedicated: 0,
    tier2_5Pattern: 0,
    tier2_5CloudAPI: 0,
    tier3AI: 0,
  };

  for (const fix of fixes) {
    switch (fix.tier) {
      case 'tier1_native':
        counts.tier1Native++;
        break;
      case 'tier2_dedicated':
        counts.tier2Dedicated++;
        break;
      case 'tier2_5_pattern':
        counts.tier2_5Pattern++;
        break;
      case 'tier2_5_cloud':
        counts.tier2_5CloudAPI++;
        break;
      case 'tier3_ai':
        counts.tier3AI++;
        break;
    }
  }

  return counts;
}

/**
 * Build requires review section
 */
function buildRequiresReviewSection(
  reviewRequired: FixOrchestrationResultInput['reviewRequired'],
  analysis: V9AnalysisResultInput,
  preferences: UserPreferences
): FixSummary['requiresReview'] {
  const highPriority: ReviewItem[] = [];
  const lowConfidence: ReviewItem[] = [];

  for (const fix of reviewRequired) {
    const issue = analysis.issues.find((i) => i.id === fix.issueId);

    const item: ReviewItem = {
      id: fix.issueId,
      ruleId: fix.ruleId,
      ruleName: formatRuleName(fix.ruleId),
      category: issue?.category || 'code_quality',
      severity: issue?.severity || 'medium',
      file: fix.file,
      line: fix.line,
      confidence: fix.confidence,
      reviewReason: fix.reviewReason,
      reviewReasonLabel: getReviewReasonLabel(fix.reviewReason),
      originalCode: fix.originalCode,
      fixedCode: fix.fixedCode,
      explanation: fix.explanation,
      recommendation: fix.recommendation,
    };

    // Categorize based on review reason
    if (fix.reviewReason === 'low_confidence') {
      lowConfidence.push(item);
    } else {
      highPriority.push(item);
    }
  }

  return {
    total: reviewRequired.length,
    highPriority,
    lowConfidence,
  };
}

/**
 * Build rolled back items
 */
function buildRolledBackItems(
  rolledBack: FixOrchestrationResultInput['rolledBack'],
  analysis: V9AnalysisResultInput
): RolledBackItem[] {
  return rolledBack.map((fix) => ({
    id: fix.issueId,
    ruleId: fix.ruleId,
    ruleName: formatRuleName(fix.ruleId),
    file: fix.file,
    line: fix.line,
    reason: fix.reason,
    reasonLabel: getRollbackReasonLabel(fix.reason),
    attemptedFix: fix.attemptedFix,
    errorDetails: fix.errorDetails,
    regressionCount: fix.regressionCount,
    manualFixGuide: generateManualFixGuide(fix.ruleId),
  }));
}

/**
 * Build cannot auto-fix section
 */
function buildCannotAutoFixSection(
  unfixed: FixOrchestrationResultInput['unfixed'],
  analysis: V9AnalysisResultInput
): FixSummary['cannotAutoFix'] {
  // Count by reason
  const byReason: Record<UnfixedReason, number> = {
    no_pattern_match: 0,
    cloud_api_failed: 0,
    ai_generation_failed: 0,
    verification_failed: 0,
    regression_introduced: 0,
    code_context_insufficient: 0,
    complex_refactoring: 0,
    external_dependency: 0,
    cost_limit_exceeded: 0,
    timeout: 0,
  };

  const items: UnfixedItem[] = unfixed.map((fix) => {
    const issue = analysis.issues.find((i) => i.id === fix.issueId);
    byReason[fix.reason]++;

    return {
      id: fix.issueId,
      ruleId: fix.ruleId,
      ruleName: formatRuleName(fix.ruleId),
      category: issue?.category || 'code_quality',
      severity: issue?.severity || 'medium',
      file: fix.file,
      line: fix.line,
      reason: fix.reason,
      reasonLabel: getUnfixedReasonLabel(fix.reason),
      explanation: fix.explanation,
      manualFixSteps: generateManualFixSteps(fix.ruleId),
      estimatedEffort: estimateEffort(fix.reason),
      estimatedTime: estimateTime(fix.reason),
      blocksMerge: issue?.severity === 'critical' || issue?.severity === 'high',
    };
  });

  return {
    total: unfixed.length,
    byReason,
    items,
  };
}

// Helper functions

function formatRuleName(ruleId: string): string {
  return ruleId
    .replace(/[-_]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function getRuleDescription(ruleId: string): string {
  // This would ideally come from a rule description database
  return `Rule: ${ruleId}`;
}

function getTierLabel(tier: FixTier): string {
  const labels: Record<FixTier, string> = {
    tier1_native: 'Native Tool Fix',
    tier2_dedicated: 'Dedicated Fixer',
    tier2_5_pattern: 'Pattern Match',
    tier2_5_cloud: 'Cloud API',
    tier3_ai: 'AI Generated',
  };
  return labels[tier];
}

function getConfidenceLabel(confidence: number): 'high' | 'medium' | 'low' {
  if (confidence >= 90) return 'high';
  if (confidence >= 70) return 'medium';
  return 'low';
}

function getReviewReasonLabel(reason: string): string {
  const labels: Record<string, string> = {
    security: 'Security-sensitive change requires human review',
    dependency: 'Dependency change requires verification',
    performance: 'Performance impact should be verified',
    low_confidence: 'Fix confidence below threshold',
  };
  return labels[reason] || reason;
}

function getRollbackReasonLabel(reason: 'verification_failed' | 'regression_introduced'): string {
  const labels = {
    verification_failed: 'Fix failed verification tests',
    regression_introduced: 'Fix introduced new issues',
  };
  return labels[reason];
}

function getUnfixedReasonLabel(reason: UnfixedReason): string {
  const labels: Record<UnfixedReason, string> = {
    no_pattern_match: 'No matching fix pattern found',
    cloud_api_failed: 'Cloud fix API unavailable',
    ai_generation_failed: 'AI could not generate valid fix',
    verification_failed: 'Generated fix failed verification',
    regression_introduced: 'Fix would introduce regressions',
    code_context_insufficient: 'Not enough context to generate fix',
    complex_refactoring: 'Requires complex refactoring',
    external_dependency: 'Fix depends on external changes',
    cost_limit_exceeded: 'Cost limit for AI fixes exceeded',
    timeout: 'Fix generation timed out',
  };
  return labels[reason];
}

function generateManualFixGuide(ruleId: string): string {
  return `See documentation for ${ruleId} for manual fix guidance.`;
}

function generateManualFixSteps(ruleId: string): string[] {
  // This would ideally come from a knowledge base
  return [
    `Review the issue at the indicated location`,
    `Understand the root cause of the ${ruleId} violation`,
    `Apply the fix following best practices`,
    `Run tests to verify the fix`,
  ];
}

function estimateEffort(
  reason: UnfixedReason
): 'trivial' | 'minor' | 'moderate' | 'significant' {
  const effortMap: Record<UnfixedReason, 'trivial' | 'minor' | 'moderate' | 'significant'> = {
    no_pattern_match: 'minor',
    cloud_api_failed: 'minor',
    ai_generation_failed: 'moderate',
    verification_failed: 'moderate',
    regression_introduced: 'significant',
    code_context_insufficient: 'moderate',
    complex_refactoring: 'significant',
    external_dependency: 'significant',
    cost_limit_exceeded: 'minor',
    timeout: 'minor',
  };
  return effortMap[reason];
}

function estimateTime(reason: UnfixedReason): string {
  const timeMap: Record<UnfixedReason, string> = {
    no_pattern_match: '5-10 minutes',
    cloud_api_failed: '5-10 minutes',
    ai_generation_failed: '15-30 minutes',
    verification_failed: '15-30 minutes',
    regression_introduced: '30-60 minutes',
    code_context_insufficient: '15-30 minutes',
    complex_refactoring: '1-2 hours',
    external_dependency: '1-2 hours',
    cost_limit_exceeded: '5-10 minutes',
    timeout: '5-10 minutes',
  };
  return timeMap[reason];
}
