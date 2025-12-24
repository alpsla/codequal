/**
 * Review Document Generator
 *
 * Generates CODEQUAL_FIXES.md for users to review applied fixes
 * and recommendations for issues that couldn't be auto-fixed.
 *
 * @since Session 60
 */

import { CollectedFixes } from './fix-collector';
import { ApplyResult } from './fix-applicator';
import {
  CategorizedFix,
  FixRecommendation,
  FixConfidenceCategory,
  getCategoryEmoji
} from './fix-categorizer';

// ============================================================
// TYPES
// ============================================================

/**
 * Generated review document
 */
export interface ReviewDocument {
  /** Full markdown content */
  markdown: string;

  /** Summary section only */
  summary: string;

  /** File name */
  fileName: string;

  /** Generation timestamp */
  generatedAt: Date;

  /** Statistics */
  stats: {
    totalIssues: number;
    autoApplied: number;
    needsReview: number;
    recommendations: number;
    filesModified: number;
  };
}

/**
 * Options for document generation
 */
export interface ReviewDocumentOptions {
  /** Repository URL */
  repoUrl: string;

  /** PR number */
  prNumber: number;

  /** Branch name for the fix branch */
  branchName: string;

  /** Original branch name */
  originalBranch: string;

  /** Whether to include detailed diffs */
  includeDiffs?: boolean;

  /** Maximum recommendation items */
  maxRecommendations?: number;
}

// ============================================================
// REVIEW DOCUMENT GENERATOR
// ============================================================

export class ReviewDocumentGenerator {
  /**
   * Generate the review document
   */
  generate(
    collected: CollectedFixes,
    applyResult: ApplyResult,
    options: ReviewDocumentOptions
  ): ReviewDocument {
    const generatedAt = new Date();
    const sections: string[] = [];

    // Header
    sections.push(this.generateHeader(options, generatedAt));

    // Summary
    const summary = this.generateSummary(collected, applyResult);
    sections.push(summary);

    // Auto-applied fixes
    if (applyResult.applied.length > 0) {
      sections.push(this.generateAutoAppliedSection(applyResult, options.includeDiffs));
    }

    // Fixes needing review
    if (collected.reviewRequired.length > 0) {
      sections.push(this.generateReviewRequiredSection(collected.reviewRequired));
    }

    // Recommendations
    if (collected.recommendations.length > 0) {
      sections.push(this.generateRecommendationsSection(
        collected.recommendations,
        options.maxRecommendations
      ));
    }

    // Failed applications
    if (applyResult.failed.length > 0) {
      sections.push(this.generateFailedSection(applyResult.failed));
    }

    // How to use
    sections.push(this.generateHowToUseSection(options));

    // Footer
    sections.push(this.generateFooter(generatedAt));

    return {
      markdown: sections.join('\n\n'),
      summary,
      fileName: 'CODEQUAL_FIXES.md',
      generatedAt,
      stats: {
        totalIssues: collected.summary.totalIssues,
        autoApplied: applyResult.applied.length,
        needsReview: collected.reviewRequired.length,
        recommendations: collected.recommendations.length,
        filesModified: applyResult.modifiedFiles.length
      }
    };
  }

  /**
   * Generate document header
   */
  private generateHeader(options: ReviewDocumentOptions, date: Date): string {
    return `# CodeQual Fixes for PR #${options.prNumber}

> **Branch:** \`${options.branchName}\`
> **Base:** \`${options.originalBranch}\`
> **Generated:** ${date.toISOString()}
> **Repository:** ${options.repoUrl}

---

This document summarizes all fixes applied by CodeQual and provides recommendations
for issues that require manual attention.`;
  }

  /**
   * Generate summary section
   */
  private generateSummary(collected: CollectedFixes, applyResult: ApplyResult): string {
    const { summary } = collected;

    const lines = [
      '## Summary',
      '',
      '| Metric | Count |',
      '|--------|-------|',
      `| Total Issues Analyzed | ${summary.totalIssues} |`,
      `| Fixes Auto-Applied | ${applyResult.applied.length} |`,
      `| Fixes Needing Review | ${summary.reviewRequiredCount} |`,
      `| Recommendations | ${summary.recommendationCount} |`,
      `| Files Modified | ${applyResult.modifiedFiles.length} |`,
      '',
      '### Fixes by Source Tier',
      '',
      '| Tier | Description | Count |',
      '|------|-------------|-------|',
      `| Tier 1 | Native Tool Fixes (eslint --fix, etc.) | ${summary.byTier.tier1_native} |`,
      `| Tier 2 | Dedicated Fixers (Sorald, pyupgrade, etc.) | ${summary.byTier.tier2_dedicated} |`,
      `| Tier 2.5 | Cloud API (Corgea) | ${summary.byTier.tier2_5_cloud} |`,
      `| Tier 3 | Pattern Registry + AI | ${summary.byTier.tier3_pattern + summary.byTier.tier3_ai} |`
    ];

    // Add category breakdown if meaningful
    const categories = Object.entries(summary.byCategory);
    if (categories.length > 0) {
      lines.push(
        '',
        '### Issues by Category',
        '',
        '| Category | Count |',
        '|----------|-------|',
        ...categories.map(([cat, count]) => `| ${cat} | ${count} |`)
      );
    }

    return lines.join('\n');
  }

  /**
   * Generate auto-applied fixes section
   */
  private generateAutoAppliedSection(result: ApplyResult, includeDiffs?: boolean): string {
    const lines = [
      '## Auto-Applied Fixes',
      '',
      'These fixes have been automatically applied to the fix branch. They are from high-confidence',
      'sources and affect safe categories (formatting, style, simple code quality issues).',
      ''
    ];

    // Group by file
    const byFile = new Map<string, typeof result.applied>();
    for (const app of result.applied) {
      const existing = byFile.get(app.fix.file) || [];
      existing.push(app);
      byFile.set(app.fix.file, existing);
    }

    for (const [file, apps] of Array.from(byFile)) {
      lines.push(`### \`${file}\``);
      lines.push('');

      for (const app of apps) {
        const emoji = getCategoryEmoji(app.fix.confidenceCategory);
        lines.push(
          `- **Line ${app.fix.line}** - ${app.fix.ruleId}`,
          `  - ${emoji} ${app.fix.explanation}`,
          `  - Source: ${app.fix.tier} (${app.fix.confidence}% confidence)`
        );

        if (includeDiffs && app.diff) {
          lines.push('  ```diff', `  ${app.diff}`, '  ```');
        }

        lines.push('');
      }
    }

    return lines.join('\n');
  }

  /**
   * Generate review-required section
   */
  private generateReviewRequiredSection(fixes: CategorizedFix[]): string {
    const lines = [
      '## Fixes Requiring Review',
      '',
      '> **IMPORTANT:** These fixes affect critical categories or have lower confidence.',
      '> Please review each one carefully before committing.',
      ''
    ];

    // Group by severity for prioritization
    const bySeverity = {
      critical: [] as CategorizedFix[],
      high: [] as CategorizedFix[],
      medium: [] as CategorizedFix[],
      low: [] as CategorizedFix[]
    };

    for (const fix of fixes) {
      bySeverity[fix.severity].push(fix);
    }

    // Critical first
    for (const severity of ['critical', 'high', 'medium', 'low'] as const) {
      const severityFixes = bySeverity[severity];
      if (severityFixes.length === 0) continue;

      const severityEmoji = {
        critical: '🔴',
        high: '🟠',
        medium: '🟡',
        low: '🟢'
      }[severity];

      lines.push(`### ${severityEmoji} ${severity.toUpperCase()} Severity`);
      lines.push('');

      for (const fix of severityFixes) {
        lines.push(
          `#### ${fix.file}:${fix.line} - ${fix.ruleId}`,
          '',
          `**Category:** ${fix.category}`,
          `**Tool:** ${fix.tool}`,
          `**Confidence:** ${fix.confidence}%`,
          ''
        );

        if (fix.reviewNotes) {
          lines.push(`> ${fix.reviewNotes}`, '');
        }

        lines.push(
          '**Original Code:**',
          '```',
          fix.originalCode,
          '```',
          '',
          '**Suggested Fix:**',
          '```',
          fix.fixedCode,
          '```',
          '',
          `**Explanation:** ${fix.explanation}`,
          '',
          '---',
          ''
        );
      }
    }

    return lines.join('\n');
  }

  /**
   * Generate recommendations section
   */
  private generateRecommendationsSection(
    recommendations: FixRecommendation[],
    maxItems?: number
  ): string {
    const lines = [
      '## Recommendations (Manual Fix Required)',
      '',
      'These issues could not be automatically fixed. Please review and address manually.',
      ''
    ];

    const items = maxItems ? recommendations.slice(0, maxItems) : recommendations;

    // Group by severity
    const bySeverity = {
      critical: [] as FixRecommendation[],
      high: [] as FixRecommendation[],
      medium: [] as FixRecommendation[],
      low: [] as FixRecommendation[]
    };

    for (const rec of items) {
      bySeverity[rec.severity].push(rec);
    }

    for (const severity of ['critical', 'high', 'medium', 'low'] as const) {
      const severityRecs = bySeverity[severity];
      if (severityRecs.length === 0) continue;

      const severityEmoji = {
        critical: '🔴',
        high: '🟠',
        medium: '🟡',
        low: '🟢'
      }[severity];

      lines.push(`### ${severityEmoji} ${severity.toUpperCase()} Severity`);
      lines.push('');

      for (const rec of severityRecs) {
        lines.push(
          `- **${rec.file}:${rec.line}** - ${rec.ruleId}`,
          `  - ${rec.message}`,
          `  - **Why not auto-fixed:** ${rec.whyNotFixable}`,
          `  - **Recommendation:** ${rec.recommendation}`
        );

        if (rec.estimatedEffort) {
          const effortEmoji = {
            trivial: '⚡',
            minor: '🔧',
            moderate: '⚙️',
            significant: '🏗️'
          }[rec.estimatedEffort];
          lines.push(`  - **Effort:** ${effortEmoji} ${rec.estimatedEffort}`);
        }

        if (rec.documentationUrl) {
          lines.push(`  - **Docs:** [View Documentation](${rec.documentationUrl})`);
        }

        lines.push('');
      }
    }

    if (maxItems && recommendations.length > maxItems) {
      lines.push(
        `> **Note:** Showing ${maxItems} of ${recommendations.length} recommendations.`,
        `> Run full analysis to see all issues.`
      );
    }

    return lines.join('\n');
  }

  /**
   * Generate failed applications section
   */
  private generateFailedSection(failed: Array<{ fix: CategorizedFix; error?: string }>): string {
    const lines = [
      '## Failed Fix Applications',
      '',
      '> These fixes could not be applied automatically. Manual intervention required.',
      ''
    ];

    for (const { fix, error } of failed) {
      lines.push(
        `### ${fix.file}:${fix.line} - ${fix.ruleId}`,
        '',
        `**Error:** ${error || 'Unknown error'}`,
        '',
        '**Intended Fix:**',
        '```',
        fix.fixedCode,
        '```',
        '',
        `**Explanation:** ${fix.explanation}`,
        '',
        '---',
        ''
      );
    }

    return lines.join('\n');
  }

  /**
   * Generate how-to-use section
   */
  private generateHowToUseSection(options: ReviewDocumentOptions): string {
    return `## How to Use This Fix Branch

### Review and Merge

1. **Review Changes:**
   \`\`\`bash
   git diff ${options.originalBranch}..${options.branchName}
   \`\`\`

2. **Test the Changes:**
   \`\`\`bash
   git checkout ${options.branchName}
   npm test  # or your test command
   \`\`\`

3. **Merge if Satisfied:**
   \`\`\`bash
   git checkout ${options.originalBranch}
   git merge ${options.branchName}
   \`\`\`

### Cherry-Pick Individual Fixes

If you only want specific fixes:

\`\`\`bash
# View commits on fix branch
git log ${options.originalBranch}..${options.branchName} --oneline

# Cherry-pick specific commit
git cherry-pick <commit-hash>
\`\`\`

### Discard the Fix Branch

If you don't want any of the fixes:

\`\`\`bash
git branch -D ${options.branchName}
\`\`\``;
  }

  /**
   * Generate footer
   */
  private generateFooter(date: Date): string {
    return `---

*Generated by [CodeQual](https://codequal.dev) on ${date.toLocaleDateString()} at ${date.toLocaleTimeString()}*

**Questions or Issues?** Open an issue at [CodeQual Support](https://github.com/codequal/support/issues)`;
  }
}

/**
 * Create a new review document generator
 */
export function createReviewDocumentGenerator(): ReviewDocumentGenerator {
  return new ReviewDocumentGenerator();
}
