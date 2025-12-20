/**
 * Unfixed Issue Handler
 *
 * Handles issues that couldn't be automatically fixed at any tier.
 * Provides clear communication to the user about:
 * - What issue was found
 * - Why it couldn't be auto-fixed
 * - What the author should review
 * - Suggested manual fix approach
 *
 * @since Session 60
 */

import { IssueToFix } from '../fix-agent/fix-router';
import { FixVerificationResult } from './fix-verifier';
import { CategorizedFix, FixTier } from './fix-categorizer';

// ============================================================
// TYPES
// ============================================================

/**
 * Reason why a fix couldn't be applied
 */
export type UnfixedReason =
  | 'no_pattern_match'           // No pattern in registry
  | 'cloud_api_failed'           // Corgea couldn't fix
  | 'ai_generation_failed'       // AI couldn't generate fix
  | 'verification_failed'        // Fix applied but didn't resolve issue
  | 'regression_introduced'      // Fix created new issues
  | 'code_context_insufficient'  // Not enough context to fix
  | 'complex_refactoring'        // Requires architectural changes
  | 'external_dependency'        // Issue in external code/library
  | 'cost_limit_exceeded'        // AI cost limit reached
  | 'timeout'                    // Fix attempt timed out
  | 'unknown';                   // Unknown reason

/**
 * Detailed information about an unfixed issue
 */
export interface UnfixedIssue {
  /** Original issue */
  issue: IssueToFix;

  /** Why it couldn't be fixed */
  reason: UnfixedReason;

  /** Human-readable explanation */
  explanation: string;

  /** Which tiers were attempted */
  attemptedTiers: FixTier[];

  /** What went wrong at each tier */
  tierFailures: Array<{
    tier: FixTier;
    error?: string;
    attemptedFix?: string;
  }>;

  /** Verification result if fix was attempted */
  verificationResult?: FixVerificationResult;

  /** Recommended action for author */
  authorAction: AuthorAction;

  /** Priority for manual review */
  reviewPriority: 'critical' | 'high' | 'medium' | 'low';

  /** Estimated effort for manual fix */
  estimatedEffort: 'trivial' | 'minor' | 'moderate' | 'significant';

  /** Suggested fix approach (if known) */
  suggestedApproach?: string;

  /** Related documentation */
  documentationLinks?: string[];
}

/**
 * Recommended action for the author
 */
export interface AuthorAction {
  /** Action type */
  type: 'review_and_fix' | 'review_suggestion' | 'investigate' | 'acknowledge';

  /** What the author should do */
  description: string;

  /** Specific steps to take */
  steps: string[];

  /** Code suggestion if available */
  codeSuggestion?: string;

  /** Whether this blocks merge */
  blocksMerge: boolean;
}

/**
 * Summary of all unfixed issues
 */
export interface UnfixedSummary {
  /** Total unfixed issues */
  total: number;

  /** By reason */
  byReason: Record<UnfixedReason, number>;

  /** By priority */
  byPriority: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };

  /** Issues that block merge */
  mergeBlockers: number;

  /** Issues requiring author action */
  requiresAuthorAction: number;
}

// ============================================================
// UNFIXED ISSUE HANDLER
// ============================================================

export class UnfixedIssueHandler {
  private unfixedIssues: UnfixedIssue[] = [];

  /**
   * Record an issue that couldn't be fixed
   */
  recordUnfixed(
    issue: IssueToFix,
    reason: UnfixedReason,
    details: {
      attemptedTiers?: FixTier[];
      tierFailures?: UnfixedIssue['tierFailures'];
      verificationResult?: FixVerificationResult;
      attemptedFix?: CategorizedFix;
    } = {}
  ): void {
    const unfixed: UnfixedIssue = {
      issue,
      reason,
      explanation: this.getExplanation(reason, issue, details),
      attemptedTiers: details.attemptedTiers || [],
      tierFailures: details.tierFailures || [],
      verificationResult: details.verificationResult,
      authorAction: this.determineAuthorAction(reason, issue, details),
      reviewPriority: this.determineReviewPriority(reason, issue),
      estimatedEffort: this.estimateEffort(reason, issue),
      suggestedApproach: this.getSuggestedApproach(reason, issue, details),
      documentationLinks: this.getDocumentationLinks(issue)
    };

    this.unfixedIssues.push(unfixed);
  }

  /**
   * Record a fix that failed verification
   */
  recordVerificationFailure(
    fix: CategorizedFix,
    verificationResult: FixVerificationResult
  ): void {
    const issue: IssueToFix = {
      id: fix.id,
      ruleId: fix.ruleId,
      toolId: fix.tool,
      file: fix.file,
      line: fix.line,
      column: fix.column,
      message: fix.explanation,
      severity: fix.severity
    };

    const reason: UnfixedReason = verificationResult.regressionsFound
      ? 'regression_introduced'
      : 'verification_failed';

    this.recordUnfixed(issue, reason, {
      attemptedTiers: [fix.tier],
      tierFailures: [{
        tier: fix.tier,
        error: verificationResult.error,
        attemptedFix: fix.fixedCode
      }],
      verificationResult
    });
  }

  /**
   * Get all unfixed issues
   */
  getUnfixedIssues(): UnfixedIssue[] {
    return [...this.unfixedIssues];
  }

  /**
   * Get summary of unfixed issues
   */
  getSummary(): UnfixedSummary {
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
      unknown: 0
    };

    const byPriority = { critical: 0, high: 0, medium: 0, low: 0 };
    let mergeBlockers = 0;
    let requiresAuthorAction = 0;

    for (const unfixed of this.unfixedIssues) {
      byReason[unfixed.reason]++;
      byPriority[unfixed.reviewPriority]++;

      if (unfixed.authorAction.blocksMerge) {
        mergeBlockers++;
      }
      if (unfixed.authorAction.type !== 'acknowledge') {
        requiresAuthorAction++;
      }
    }

    return {
      total: this.unfixedIssues.length,
      byReason,
      byPriority,
      mergeBlockers,
      requiresAuthorAction
    };
  }

  /**
   * Generate markdown for unfixed issues (for review document)
   */
  generateMarkdown(): string {
    if (this.unfixedIssues.length === 0) {
      return '';
    }

    const lines: string[] = [
      '## Issues Requiring Author Review',
      '',
      '> **IMPORTANT:** The following issues could not be automatically fixed.',
      '> Please review each one and take the recommended action.',
      ''
    ];

    // Group by priority
    const byPriority = {
      critical: this.unfixedIssues.filter(u => u.reviewPriority === 'critical'),
      high: this.unfixedIssues.filter(u => u.reviewPriority === 'high'),
      medium: this.unfixedIssues.filter(u => u.reviewPriority === 'medium'),
      low: this.unfixedIssues.filter(u => u.reviewPriority === 'low')
    };

    // Summary table
    lines.push('### Summary');
    lines.push('');
    lines.push('| Priority | Count | Blocks Merge |');
    lines.push('|----------|-------|--------------|');
    lines.push(`| 🔴 Critical | ${byPriority.critical.length} | ${byPriority.critical.filter(u => u.authorAction.blocksMerge).length} |`);
    lines.push(`| 🟠 High | ${byPriority.high.length} | ${byPriority.high.filter(u => u.authorAction.blocksMerge).length} |`);
    lines.push(`| 🟡 Medium | ${byPriority.medium.length} | ${byPriority.medium.filter(u => u.authorAction.blocksMerge).length} |`);
    lines.push(`| 🟢 Low | ${byPriority.low.length} | ${byPriority.low.filter(u => u.authorAction.blocksMerge).length} |`);
    lines.push('');

    // Detail sections by priority
    for (const priority of ['critical', 'high', 'medium', 'low'] as const) {
      const issues = byPriority[priority];
      if (issues.length === 0) continue;

      const emoji = { critical: '🔴', high: '🟠', medium: '🟡', low: '🟢' }[priority];
      lines.push(`### ${emoji} ${priority.toUpperCase()} Priority Issues`);
      lines.push('');

      for (const unfixed of issues) {
        lines.push(this.formatUnfixedIssue(unfixed));
        lines.push('');
      }
    }

    return lines.join('\n');
  }

  /**
   * Clear all recorded issues
   */
  clear(): void {
    this.unfixedIssues = [];
  }

  // ============================================================
  // PRIVATE HELPERS
  // ============================================================

  private getExplanation(
    reason: UnfixedReason,
    issue: IssueToFix,
    details: { attemptedFix?: CategorizedFix; verificationResult?: FixVerificationResult }
  ): string {
    switch (reason) {
      case 'no_pattern_match':
        return `No fix pattern exists for rule "${issue.ruleId}" from ${issue.toolId}. This issue requires manual review.`;

      case 'cloud_api_failed':
        return `Cloud API (Corgea) could not generate a fix for this issue. The issue may be too complex or require additional context.`;

      case 'ai_generation_failed':
        return `AI was unable to generate a reliable fix for this issue. Manual intervention is recommended.`;

      case 'verification_failed':
        return `A fix was attempted but verification showed the original issue was not resolved. The fix may have been incomplete or incorrect.`;

      case 'regression_introduced': {
        const newIssues = details.verificationResult?.newIssueCount || 0;
        return `A fix was applied but it introduced ${newIssues} new issue(s). The fix was rolled back to prevent regressions.`;
      }

      case 'code_context_insufficient':
        return `Not enough code context to safely generate a fix. The issue may span multiple files or require understanding of broader architecture.`;

      case 'complex_refactoring':
        return `This issue requires significant refactoring that cannot be automated safely. Consider architectural review.`;

      case 'external_dependency':
        return `This issue originates from external code or a third-party library. Update the dependency or work around it.`;

      case 'cost_limit_exceeded':
        return `AI fix generation was skipped due to cost limits. Consider increasing the limit or fixing manually.`;

      case 'timeout':
        return `Fix attempt timed out. The operation may have been too complex or the service was slow.`;

      default:
        return `This issue could not be automatically fixed. Please review manually.`;
    }
  }

  private determineAuthorAction(
    reason: UnfixedReason,
    issue: IssueToFix,
    details: { attemptedFix?: CategorizedFix }
  ): AuthorAction {
    const severity = issue.severity;
    const isCritical = severity === 'critical' || severity === 'high';

    switch (reason) {
      case 'verification_failed':
      case 'regression_introduced':
        return {
          type: 'review_suggestion',
          description: 'Review the attempted fix and apply a corrected version',
          steps: [
            `Navigate to ${issue.file}:${issue.line}`,
            'Review the original issue and attempted fix',
            'Apply a corrected fix that resolves the issue without regressions',
            'Run tests to verify'
          ],
          codeSuggestion: details.attemptedFix?.fixedCode,
          blocksMerge: isCritical
        };

      case 'complex_refactoring':
        return {
          type: 'investigate',
          description: 'Investigate architectural implications before fixing',
          steps: [
            'Review the issue and its broader context',
            'Consider impact on other components',
            'Plan refactoring approach with team',
            'Implement fix in a separate PR if significant'
          ],
          blocksMerge: isCritical
        };

      case 'external_dependency':
        return {
          type: 'acknowledge',
          description: 'Issue is in external code - consider workaround or update',
          steps: [
            'Check if newer version of dependency fixes the issue',
            'Consider adding a workaround in your code',
            'Report issue to dependency maintainers if applicable'
          ],
          blocksMerge: false
        };

      default:
        return {
          type: 'review_and_fix',
          description: 'Manually review and fix this issue',
          steps: [
            `Navigate to ${issue.file}:${issue.line}`,
            `Review the ${issue.ruleId} violation`,
            'Apply appropriate fix',
            'Run tests to verify'
          ],
          blocksMerge: isCritical
        };
    }
  }

  private determineReviewPriority(
    reason: UnfixedReason,
    issue: IssueToFix
  ): 'critical' | 'high' | 'medium' | 'low' {
    // Security issues are always high priority
    if (issue.ruleId.toLowerCase().includes('security') ||
        issue.ruleId.toLowerCase().includes('injection') ||
        issue.ruleId.toLowerCase().includes('xss')) {
      return issue.severity === 'critical' ? 'critical' : 'high';
    }

    // Regressions are high priority
    if (reason === 'regression_introduced') {
      return 'high';
    }

    // Map severity directly for most cases
    return issue.severity === 'critical' ? 'critical' : issue.severity;
  }

  private estimateEffort(
    reason: UnfixedReason,
    issue: IssueToFix
  ): 'trivial' | 'minor' | 'moderate' | 'significant' {
    switch (reason) {
      case 'complex_refactoring':
        return 'significant';
      case 'external_dependency':
        return 'moderate';
      case 'verification_failed':
      case 'regression_introduced':
        return 'minor'; // Fix exists, just needs adjustment
      case 'code_context_insufficient':
        return 'moderate';
      default:
        return issue.severity === 'critical' ? 'moderate' : 'minor';
    }
  }

  private getSuggestedApproach(
    reason: UnfixedReason,
    issue: IssueToFix,
    details: { attemptedFix?: CategorizedFix }
  ): string | undefined {
    if (details.attemptedFix) {
      return `Attempted fix (needs adjustment):\n\`\`\`\n${details.attemptedFix.fixedCode}\n\`\`\``;
    }

    // Common patterns for specific rules
    const ruleId = issue.ruleId.toLowerCase();

    if (ruleId.includes('sql-injection')) {
      return 'Use parameterized queries or prepared statements instead of string concatenation.';
    }
    if (ruleId.includes('xss')) {
      return 'Sanitize user input before rendering. Use framework-provided escaping functions.';
    }
    if (ruleId.includes('null')) {
      return 'Add null checks or use Optional/nullable types to handle potential null values.';
    }

    return undefined;
  }

  private getDocumentationLinks(issue: IssueToFix): string[] {
    const links: string[] = [];
    const tool = issue.toolId.toLowerCase();
    const ruleId = issue.ruleId;

    // Tool-specific documentation
    if (tool === 'semgrep') {
      links.push(`https://semgrep.dev/r?q=${encodeURIComponent(ruleId)}`);
    } else if (tool === 'eslint') {
      links.push(`https://eslint.org/docs/rules/${ruleId}`);
    } else if (tool === 'pmd') {
      links.push('https://pmd.github.io/latest/pmd_rules_java.html');
    } else if (tool === 'bandit') {
      links.push('https://bandit.readthedocs.io/en/latest/plugins/index.html');
    }

    return links;
  }

  private formatUnfixedIssue(unfixed: UnfixedIssue): string {
    const lines: string[] = [];
    const { issue, authorAction } = unfixed;

    lines.push(`#### ${issue.file}:${issue.line} - \`${issue.ruleId}\``);
    lines.push('');
    lines.push(`**Issue:** ${issue.message}`);
    lines.push('');
    lines.push(`**Why not auto-fixed:** ${unfixed.explanation}`);
    lines.push('');

    if (authorAction.blocksMerge) {
      lines.push('> ⛔ **BLOCKS MERGE** - This issue must be resolved before merging.');
      lines.push('');
    }

    lines.push(`**Recommended Action:** ${authorAction.description}`);
    lines.push('');
    lines.push('**Steps:**');
    for (const step of authorAction.steps) {
      lines.push(`1. ${step}`);
    }

    if (unfixed.suggestedApproach) {
      lines.push('');
      lines.push('**Suggested Approach:**');
      lines.push(unfixed.suggestedApproach);
    }

    if (unfixed.documentationLinks && unfixed.documentationLinks.length > 0) {
      lines.push('');
      lines.push('**Documentation:**');
      for (const link of unfixed.documentationLinks) {
        lines.push(`- ${link}`);
      }
    }

    lines.push('');
    lines.push(`**Effort:** ${unfixed.estimatedEffort} | **Tool:** ${issue.toolId}`);
    lines.push('');
    lines.push('---');

    return lines.join('\n');
  }
}

/**
 * Create a new unfixed issue handler
 */
export function createUnfixedIssueHandler(): UnfixedIssueHandler {
  return new UnfixedIssueHandler();
}
