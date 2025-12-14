/**
 * PRO Tier Universal Report Generator
 *
 * Orchestrates the complete fix workflow for PRO tier users:
 * 1. Analysis with all tools (including CodeQL if enabled)
 * 2. AI-powered fix generation with pattern reuse
 * 3. User selection interface (individual, severity group, category, all)
 * 4. Multi-provider output (Web, API, CI/CD, IDE)
 * 5. Commit generation with provider-specific formatting
 * 6. Detailed explanations for unfixable issues
 *
 * Key Features:
 * - Three-tier fix selection: All, By Group (severity/category), Individual
 * - Explanations for WHY issues can't be auto-fixed
 * - Multi-format output: SARIF, GitLab Code Quality, Markdown, HTML, JSON
 * - Provider integration: GitHub, GitLab, Bitbucket, Azure DevOps
 */

import {
  FixReport,
  FixReportIssue,
  FixUserSelections,
  SelectionMode,
  CommitStyle,
  IssueSeverity,
  IssueCategory,
  Provider,
  UserTier,
  FixCommit,
} from '../types/fix-report-types';
import {
  UniversalFixData,
  UserFixSelection,
  ApplyFixesResult,
  buildUniversalFixData,
} from '../providers/provider-adapter';
import { FixSummaryGenerator, ManualReviewGuidance } from '../providers/fix-summary-generator';
import { SARIFGenerator } from '../providers/sarif-generator';
import { GitLabCodeQualityGenerator } from '../providers/gitlab-codequality-generator';
import { UnifiedCommitGenerator } from '../commit/unified-commit-generator';
import { WebProvider } from '../providers/web-provider';
import { IDEProvider } from '../providers/ide-provider';
import { CICDProvider } from '../providers/cicd-provider';

// ============================================================================
// Types
// ============================================================================

/**
 * User selection request with grouped options
 */
export interface PROUserSelection {
  mode: 'all' | 'by_severity' | 'by_category' | 'individual' | 'review_each';

  // For by_severity mode
  severities?: IssueSeverity[];

  // For by_category mode
  categories?: IssueCategory[];

  // For individual mode
  issueIds?: string[];

  // Commit preferences
  commitStyle: CommitStyle;

  // Provider preferences
  provider?: Provider;
  createNewBranch?: boolean;
  branchName?: string;
  addPRComment?: boolean;
}

/**
 * Unfixable issue explanation
 */
export interface UnfixableExplanation {
  issueId: string;
  ruleId: string;
  reason: UnfixableReason;
  explanation: string;
  recommendation: string;
  quickFix?: string;
  documentationUrl?: string;
  estimatedManualTime: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export type UnfixableReason =
  | 'requires_semantic_analysis'
  | 'multiple_valid_solutions'
  | 'requires_architectural_decision'
  | 'context_dependent'
  | 'breaking_change_risk'
  | 'external_dependency'
  | 'intentional_use'
  | 'configuration_required'
  | 'type_system_limitation'
  | 'test_coverage_needed';

/**
 * Complete PRO report output
 */
export interface PROReportOutput {
  // Metadata
  reportId: string;
  repository: string;
  prNumber?: number;
  branch: string;
  tier: 'pro';
  generatedAt: string;

  // Universal fix data (for all providers)
  universalData: UniversalFixData;

  // Statistics
  stats: {
    total: number;
    autoFixable: number;
    autoFixed: number;
    manualReview: number;
    intentionalUse: number;
    fixRate: number;
    apiCalls: number;
    patternReuse: number;
    costUsd: number;
  };

  // Selection options for UI
  selectionOptions: SelectionOption[];

  // Unfixable explanations (for manual review items)
  unfixableExplanations: UnfixableExplanation[];

  // Provider-specific outputs
  outputs: {
    sarif?: string;
    gitlabCodeQuality?: string;
    markdownSummary: string;
    htmlReport: string;
    jsonData: string;
    lspCodeActions?: string;
  };

  // Commit preview (if fixes are selected)
  commitPreview?: CommitPreview[];
}

export interface SelectionOption {
  id: string;
  label: string;
  description: string;
  mode: SelectionMode;
  count: number;
  enabled: boolean;
  filter?: {
    severities?: IssueSeverity[];
    categories?: IssueCategory[];
  };
}

export interface CommitPreview {
  title: string;
  body: string;
  files: string[];
  issueCount: number;
  additions: number;
  deletions: number;
}

// ============================================================================
// Unfixable Reason Database
// ============================================================================

const UNFIXABLE_REASONS: Record<string, {
  reason: UnfixableReason;
  explanation: string;
  recommendation: string;
  quickFix?: string;
  documentationUrl?: string;
}> = {
  // TypeScript/JavaScript specific
  'ts-unused-exports/unused-export': {
    reason: 'requires_semantic_analysis',
    explanation: 'Unused export detection requires analyzing all consumers of this module, including external packages that may depend on these exports. Removing them without verification could break dependent code.',
    recommendation: 'Review the export to determine if it is part of the public API. For internal modules, remove the unused export. For libraries, keep exports that are documented as public API.',
    quickFix: 'npx ts-unused-exports tsconfig.json --showLineNumber',
    documentationUrl: 'https://github.com/pzavolinsky/ts-unused-exports',
  },
  'typescript/TS6306': {
    reason: 'configuration_required',
    explanation: 'TypeScript project references require correct tsconfig.json configuration. The referenced path does not exist or lacks "composite: true" setting.',
    recommendation: 'Verify that the referenced tsconfig.json exists and has "composite": true set. Update references array to point to correct paths.',
  },
  'madge/circular-dependency': {
    reason: 'requires_architectural_decision',
    explanation: 'Circular dependencies require refactoring decisions that depend on your architecture. Solutions include: dependency injection, interface extraction, or module restructuring.',
    recommendation: 'Create interface abstractions, use dependency injection patterns, or restructure modules to break the circular chain.',
    quickFix: 'npx madge --circular --image circular.svg src/',
    documentationUrl: 'https://github.com/pahen/madge',
  },

  // Security patterns that may be intentional
  'javascript.lang.security.detect-child-process': {
    reason: 'intentional_use',
    explanation: 'child_process usage is often intentional for command-line tools, build scripts, or shell integration. The code shows deliberate process spawning with proper handling.',
    recommendation: 'Verify that the process execution is necessary and that user input is properly sanitized. Consider using execFile instead of exec for better security.',
  },

  // Dependency vulnerabilities
  'dependency-vulnerability': {
    reason: 'breaking_change_risk',
    explanation: 'Upgrading dependencies with known vulnerabilities may introduce breaking changes. The fix requires testing compatibility with your codebase.',
    recommendation: 'Run the npm audit fix command to attempt safe upgrades. For major version bumps, test in a separate branch and verify functionality.',
    quickFix: 'npm audit fix',
    documentationUrl: 'https://docs.npmjs.com/auditing-package-dependencies-for-security-vulnerabilities',
  },

  // Type-related issues
  'typescript/implicit-any': {
    reason: 'type_system_limitation',
    explanation: 'Implicit any type requires understanding the expected type from the code context. AI cannot reliably infer the correct type without runtime information.',
    recommendation: 'Add explicit type annotations based on how the variable is used. Consider running TypeScript with --noImplicitAny to catch these during development.',
  },

  // Test-related issues
  'jest/no-disabled-tests': {
    reason: 'test_coverage_needed',
    explanation: 'Disabled tests (skip/xdescribe) require understanding why they were disabled. Enabling them blindly may cause test failures.',
    recommendation: 'Review why the test was disabled. Fix the underlying issue or remove the test if it is no longer relevant.',
  },

  // Default fallback
  'default': {
    reason: 'multiple_valid_solutions',
    explanation: 'This issue has multiple possible fixes and requires human judgment to select the appropriate solution for your specific context.',
    recommendation: 'Review the issue and select the fix that best matches your coding standards and architectural decisions.',
  },
};

// ============================================================================
// PRO Report Generator Class
// ============================================================================

export class PROReportGenerator {
  private summaryGenerator: FixSummaryGenerator;
  private sarifGenerator: SARIFGenerator;
  private gitlabGenerator: GitLabCodeQualityGenerator;

  constructor() {
    this.summaryGenerator = new FixSummaryGenerator({
      includeCodeSnippets: true,
      includeActionableGuidance: true,
      maxIssuesPerCategory: 15,
      groupByFile: true,
      includeTimeEstimates: true,
      branding: {
        name: 'CodeQual PRO',
        color: '#4F46E5',
      },
    });
    this.sarifGenerator = new SARIFGenerator({
      toolName: 'CodeQual PRO',
      toolVersion: '9.0.0',
    });
    this.gitlabGenerator = new GitLabCodeQualityGenerator();
  }

  /**
   * Generate complete PRO tier report from analysis results
   */
  async generate(
    report: FixReport,
    issues: FixReportIssue[],
    options?: {
      provider?: Provider;
      outputDir?: string;
      generateSARIF?: boolean;
      generateGitLab?: boolean;
    }
  ): Promise<PROReportOutput> {
    const provider = options?.provider || 'github';

    // Build universal data
    const universalData = buildUniversalFixData(report, issues);

    // Calculate statistics
    const fixableIssues = issues.filter(i => i.fixAvailable && !i.isIntentionalUse);
    const autoFixedIssues = issues.filter(i => i.fixAvailable);
    const manualReviewIssues = issues.filter(i => !i.fixAvailable && !i.isIntentionalUse);
    const intentionalIssues = issues.filter(i => i.isIntentionalUse);

    const stats = {
      total: issues.length,
      autoFixable: fixableIssues.length,
      autoFixed: autoFixedIssues.length,
      manualReview: manualReviewIssues.length,
      intentionalUse: intentionalIssues.length,
      fixRate: issues.length > 0 ? autoFixedIssues.length / issues.length : 1,
      apiCalls: report.apiCostUsd > 0 ? Math.ceil(report.apiCostUsd / 0.003) : 0,
      patternReuse: report.patternReuseCount,
      costUsd: report.apiCostUsd,
    };

    // Generate selection options
    const selectionOptions = this.generateSelectionOptions(issues);

    // Generate unfixable explanations
    const unfixableExplanations = this.generateUnfixableExplanations(manualReviewIssues);

    // Generate provider-specific outputs
    const outputs = await this.generateOutputs(report, issues, options);

    return {
      reportId: report.id,
      repository: report.repositoryUrl,
      prNumber: report.prNumber,
      branch: report.headBranch,
      tier: 'pro',
      generatedAt: new Date().toISOString(),
      universalData,
      stats,
      selectionOptions,
      unfixableExplanations,
      outputs,
    };
  }

  /**
   * Apply user selection and generate commits
   */
  async applySelection(
    report: FixReport,
    issues: FixReportIssue[],
    selection: PROUserSelection
  ): Promise<ApplyFixesResult & { commits: FixCommit[]; commitPreviews: CommitPreview[] }> {
    // Filter issues based on selection
    const selectedIssues = this.filterBySelection(issues, selection);

    if (selectedIssues.length === 0) {
      return {
        success: true,
        reportId: report.id,
        selectedCount: 0,
        appliedCount: 0,
        failedCount: 0,
        commits: [],
        commitPreviews: [],
        message: 'No issues matched the selection criteria',
      };
    }

    // Mark selected issues
    for (const issue of selectedIssues) {
      issue.userSelected = true;
      issue.userSelectionTime = new Date();
    }

    // Generate commits
    const provider = selection.provider || 'github';
    const generator = new UnifiedCommitGenerator(provider);
    const commits = generator.generateCommits(
      selectedIssues,
      selection.commitStyle,
      this.extractRepoName(report.repositoryUrl)
    );

    // Generate commit previews
    const commitPreviews: CommitPreview[] = commits.map(commit => ({
      title: commit.commitTitle,
      body: commit.commitBody.substring(0, 500) + (commit.commitBody.length > 500 ? '...' : ''),
      files: commit.filesChanged,
      issueCount: commit.issueIds.length,
      additions: commit.additions,
      deletions: commit.deletions,
    }));

    return {
      success: true,
      reportId: report.id,
      selectedCount: selectedIssues.length,
      appliedCount: selectedIssues.length,
      failedCount: 0,
      commits,
      commitPreviews,
      message: `Successfully prepared ${selectedIssues.length} fixes in ${commits.length} commit(s)`,
    };
  }

  // ==========================================================================
  // Selection Options Generator
  // ==========================================================================

  private generateSelectionOptions(issues: FixReportIssue[]): SelectionOption[] {
    const options: SelectionOption[] = [];
    const fixableIssues = issues.filter(i => i.fixAvailable && !i.isIntentionalUse);

    // 1. Fix All
    options.push({
      id: 'all',
      label: 'Fix All Issues',
      description: `Apply all ${fixableIssues.length} available fixes in one operation`,
      mode: 'all_fixable',
      count: fixableIssues.length,
      enabled: fixableIssues.length > 0,
    });

    // 2. By Severity Groups
    const severityGroups: { severity: IssueSeverity; label: string; emoji: string }[] = [
      { severity: 'critical', label: 'Critical', emoji: '🚨' },
      { severity: 'high', label: 'High', emoji: '🔴' },
      { severity: 'medium', label: 'Medium', emoji: '🟠' },
      { severity: 'low', label: 'Low', emoji: '🟡' },
    ];

    for (const { severity, label, emoji } of severityGroups) {
      const count = fixableIssues.filter(i => i.severity === severity).length;
      if (count > 0) {
        options.push({
          id: `severity-${severity}`,
          label: `${emoji} Fix ${label} Severity (${count})`,
          description: `Apply fixes for all ${count} ${severity} severity issues`,
          mode: 'by_severity',
          count,
          enabled: true,
          filter: { severities: [severity] },
        });
      }
    }

    // 3. Critical + High combined
    const criticalHighCount = fixableIssues.filter(
      i => i.severity === 'critical' || i.severity === 'high'
    ).length;
    if (criticalHighCount > 0 && criticalHighCount < fixableIssues.length) {
      options.push({
        id: 'severity-critical-high',
        label: `🔥 Fix Critical & High Only (${criticalHighCount})`,
        description: `Apply fixes for critical and high severity issues only`,
        mode: 'by_severity',
        count: criticalHighCount,
        enabled: true,
        filter: { severities: ['critical', 'high'] },
      });
    }

    // 4. By Category
    const categoryGroups: { category: IssueCategory; label: string; emoji: string }[] = [
      { category: 'security', label: 'Security', emoji: '🔒' },
      { category: 'dependency_vulnerability', label: 'Dependencies', emoji: '📦' },
      { category: 'code_quality', label: 'Code Quality', emoji: '✨' },
      { category: 'performance', label: 'Performance', emoji: '⚡' },
    ];

    for (const { category, label, emoji } of categoryGroups) {
      const count = fixableIssues.filter(i => i.category === category).length;
      if (count > 0) {
        options.push({
          id: `category-${category}`,
          label: `${emoji} Fix ${label} Issues (${count})`,
          description: `Apply all ${count} ${label.toLowerCase()} related fixes`,
          mode: 'by_category',
          count,
          enabled: true,
          filter: { categories: [category] },
        });
      }
    }

    // 5. Security + Dependencies combined
    const securityCount = fixableIssues.filter(
      i => i.category === 'security' || i.category === 'dependency_vulnerability'
    ).length;
    if (securityCount > 0 && securityCount < fixableIssues.length) {
      options.push({
        id: 'category-security-all',
        label: `🛡️ Fix All Security & CVEs (${securityCount})`,
        description: `Apply all security and dependency vulnerability fixes`,
        mode: 'by_category',
        count: securityCount,
        enabled: true,
        filter: { categories: ['security', 'dependency_vulnerability'] },
      });
    }

    // 6. Review Each (always last)
    options.push({
      id: 'review-each',
      label: '🔍 Review Each Fix Individually',
      description: 'Manually select individual fixes to apply',
      mode: 'review_each',
      count: fixableIssues.length,
      enabled: fixableIssues.length > 0,
    });

    return options;
  }

  // ==========================================================================
  // Unfixable Explanations Generator
  // ==========================================================================

  private generateUnfixableExplanations(issues: FixReportIssue[]): UnfixableExplanation[] {
    // Group by rule for deduplication
    const byRule = new Map<string, FixReportIssue[]>();
    for (const issue of issues) {
      const key = issue.ruleId;
      if (!byRule.has(key)) {
        byRule.set(key, []);
      }
      byRule.get(key)!.push(issue);
    }

    const explanations: UnfixableExplanation[] = [];

    for (const [ruleId, ruleIssues] of Array.from(byRule.entries())) {
      const first = ruleIssues[0];
      const explanation = this.getExplanationForRule(ruleId, first);

      explanations.push({
        issueId: first.id,
        ruleId,
        ...explanation,
        estimatedManualTime: this.estimateManualTime(ruleIssues),
        priority: this.getPriority(first.severity),
      });
    }

    // Sort by priority
    return explanations.sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3 };
      return order[a.priority] - order[b.priority];
    });
  }

  private getExplanationForRule(ruleId: string, issue: FixReportIssue): {
    reason: UnfixableReason;
    explanation: string;
    recommendation: string;
    quickFix?: string;
    documentationUrl?: string;
  } {
    // Check for exact match
    if (UNFIXABLE_REASONS[ruleId]) {
      return UNFIXABLE_REASONS[ruleId];
    }

    // Check for partial match
    for (const [key, value] of Object.entries(UNFIXABLE_REASONS)) {
      if (ruleId.includes(key) || key.includes(ruleId)) {
        return value;
      }
    }

    // Category-based defaults
    switch (issue.category) {
      case 'security':
        return {
          reason: 'context_dependent',
          explanation: 'Security fixes require understanding the specific threat model and context of your application.',
          recommendation: 'Review the security context and apply fixes appropriate to your threat model.',
        };
      case 'architecture':
        return {
          reason: 'requires_architectural_decision',
          explanation: 'Architectural issues require design decisions that should be made by the development team.',
          recommendation: 'Plan the refactoring as part of a dedicated sprint with proper design review.',
        };
      case 'dependency_vulnerability':
        return {
          reason: 'breaking_change_risk',
          explanation: 'Dependency updates may introduce breaking changes that require testing.',
          recommendation: 'Test the update in isolation before merging to ensure compatibility.',
          quickFix: 'npm audit fix',
        };
      default:
        return UNFIXABLE_REASONS['default'];
    }
  }

  private estimateManualTime(issues: FixReportIssue[]): string {
    let minutes = 0;
    for (const issue of issues) {
      switch (issue.severity) {
        case 'critical':
          minutes += 45;
          break;
        case 'high':
          minutes += 30;
          break;
        case 'medium':
          minutes += 15;
          break;
        default:
          minutes += 5;
      }
    }

    if (minutes < 60) {
      return `${minutes} minutes`;
    } else if (minutes < 480) {
      return `${Math.ceil(minutes / 60)} hours`;
    } else {
      return `${Math.ceil(minutes / 480)} days`;
    }
  }

  private getPriority(severity: IssueSeverity): 'critical' | 'high' | 'medium' | 'low' {
    return severity === 'info' ? 'low' : severity;
  }

  // ==========================================================================
  // Output Generators
  // ==========================================================================

  private async generateOutputs(
    report: FixReport,
    issues: FixReportIssue[],
    options?: {
      generateSARIF?: boolean;
      generateGitLab?: boolean;
    }
  ): Promise<PROReportOutput['outputs']> {
    const metadata = {
      repository: report.repositoryUrl,
      prNumber: report.prNumber,
      branch: report.headBranch,
    };

    // Generate summary formats
    const markdownSummary = this.summaryGenerator.generateMarkdown(issues, metadata);
    const htmlReport = this.summaryGenerator.generateHTML(issues, metadata);
    const jsonData = this.summaryGenerator.generateJSON(issues, metadata);

    // Generate SARIF if requested
    let sarif: string | undefined;
    if (options?.generateSARIF !== false) {
      sarif = JSON.stringify(this.sarifGenerator.generate(issues), null, 2);
    }

    // Generate GitLab Code Quality if requested
    let gitlabCodeQuality: string | undefined;
    if (options?.generateGitLab !== false) {
      gitlabCodeQuality = JSON.stringify(this.gitlabGenerator.generate(issues), null, 2);
    }

    // Generate LSP code actions for IDE integration
    const ideProvider = new IDEProvider();
    const ideOutput = await ideProvider.generateOutput(report, issues);
    const lspCodeActions = JSON.stringify(ideOutput.lsp.codeActions, null, 2);

    return {
      sarif,
      gitlabCodeQuality,
      markdownSummary,
      htmlReport,
      jsonData,
      lspCodeActions,
    };
  }

  // ==========================================================================
  // Filter Helpers
  // ==========================================================================

  private filterBySelection(issues: FixReportIssue[], selection: PROUserSelection): FixReportIssue[] {
    let filtered = issues.filter(i => i.fixAvailable && !i.isIntentionalUse);

    switch (selection.mode) {
      case 'all':
        return filtered;

      case 'by_severity':
        if (selection.severities?.length) {
          filtered = filtered.filter(i => selection.severities!.includes(i.severity));
        }
        return filtered;

      case 'by_category':
        if (selection.categories?.length) {
          filtered = filtered.filter(i => selection.categories!.includes(i.category));
        }
        return filtered;

      case 'individual':
        if (selection.issueIds?.length) {
          filtered = issues.filter(i => selection.issueIds!.includes(i.id));
        }
        return filtered;

      case 'review_each':
        return [];

      default:
        return filtered;
    }
  }

  private extractRepoName(url: string): string {
    const match = url.match(/[/:]([^/]+\/[^/.]+)(?:\.git)?$/);
    return match ? match[1] : 'repository';
  }
}

// ============================================================================
// Factory and Convenience Functions
// ============================================================================

/**
 * Create a PRO Report Generator instance
 */
export function createPROReportGenerator(): PROReportGenerator {
  return new PROReportGenerator();
}

/**
 * Generate a complete PRO tier report
 */
export async function generatePROReport(
  report: FixReport,
  issues: FixReportIssue[],
  options?: {
    provider?: Provider;
    outputDir?: string;
    generateSARIF?: boolean;
    generateGitLab?: boolean;
  }
): Promise<PROReportOutput> {
  const generator = new PROReportGenerator();
  return generator.generate(report, issues, options);
}

/**
 * Apply user selection and get commit preview
 */
export async function applyPROSelection(
  report: FixReport,
  issues: FixReportIssue[],
  selection: PROUserSelection
): Promise<ApplyFixesResult & { commitPreviews: CommitPreview[] }> {
  const generator = new PROReportGenerator();
  return generator.applySelection(report, issues, selection);
}
