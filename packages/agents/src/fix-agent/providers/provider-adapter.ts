/**
 * Provider Adapter
 *
 * Universal interface for delivering fix reports to different consumers.
 * The FixReport is the single source of truth - providers adapt it for their context.
 *
 * Supported Providers:
 * - Web: Interactive UI for reviewing and selecting fixes
 * - API: JSON API for programmatic access
 * - CI/CD: GitHub Actions, GitLab CI, Azure Pipelines
 * - IDE: VSCode, Cursor, JetBrains via LSP
 *
 * User Selection Options (from fix-report-types.ts):
 * - SelectionMode: all_fixable, by_severity, by_category, specific_issues, review_each
 * - CommitStyle: single, grouped, per_file, per_issue
 */

import {
  FixReport,
  FixReportIssue,
  FixUserSelections,
  FixCommit,
  SelectionMode,
  CommitStyle,
  IssueSeverity,
  IssueCategory,
  Provider,
  UserTier,
} from '../types/fix-report-types';

// ============================================================================
// Provider Output Interfaces
// ============================================================================

/**
 * Universal fix data - the core data structure all providers consume
 */
export interface UniversalFixData {
  // Metadata
  reportId: string;
  repository: string;
  prNumber?: number;
  branch: string;
  analyzedAt: string;

  // Summary
  summary: {
    totalIssues: number;
    fixableIssues: number;
    autoFixedCount: number;
    manualReviewCount: number;
    intentionalUseCount: number;
    bySeverity: Record<IssueSeverity, number>;
    byCategory: Record<IssueCategory, number>;
  };

  // User selection options (what they CAN select)
  selectionOptions: {
    availableModes: SelectionMode[];
    availableCommitStyles: CommitStyle[];
    severityLevels: IssueSeverity[];
    categories: IssueCategory[];
  };

  // All issues with fix availability
  issues: UniversalIssue[];

  // Pre-grouped issues for batch operations
  groups: IssueGroupData[];
}

/**
 * Universal issue representation
 */
export interface UniversalIssue {
  id: string;
  file: string;
  line: number;
  column?: number;
  endLine?: number;
  endColumn?: number;

  // Classification
  ruleId: string;
  tool: string;
  category: IssueCategory;
  severity: IssueSeverity;

  // Content
  message: string;
  description?: string;
  codeSnippet?: string;

  // Fix availability
  fixAvailable: boolean;
  fixSource?: 'pattern' | 'ai_generated' | 'tool_native' | 'manual';
  fixConfidence?: number;
  fixedCode?: string;

  // Special handling
  isIntentionalUse: boolean;
  intentionalReason?: string;

  // For provider-specific rendering
  ruleDocUrl?: string;
}

/**
 * Issue group for batch operations
 */
export interface IssueGroupData {
  groupId: string;
  rule: string;
  tool: string;
  severity: IssueSeverity;
  category: IssueCategory;
  count: number;
  autoFixable: boolean;
  issueIds: string[];
}

// ============================================================================
// Provider-Specific Output Types
// ============================================================================

/**
 * Web Provider Output - For interactive web UI
 */
export interface WebProviderOutput {
  type: 'web';
  data: UniversalFixData;
  ui: {
    // Pre-rendered sections for quick display
    summaryHtml?: string;
    // Available actions
    actions: WebAction[];
    // Issue display order
    displayOrder: 'severity' | 'category' | 'file';
  };
}

export interface WebAction {
  id: string;
  label: string;
  description: string;
  selectionMode: SelectionMode;
  issueCount: number;
  enabled: boolean;
}

/**
 * API Provider Output - For programmatic JSON access
 */
export interface APIProviderOutput {
  type: 'api';
  data: UniversalFixData;
  links: {
    // HATEOAS-style links
    self: string;
    issues: string;
    applyFixes: string;
    downloadAll: string;
  };
}

/**
 * CI/CD Provider Output - For GitHub Actions, GitLab CI, etc.
 */
export interface CICDProviderOutput {
  type: 'cicd';
  data: UniversalFixData;
  outputs: {
    // Files for CI integration
    sarifPath?: string;
    sarifUrl?: string;
    gitlabCodeQualityPath?: string;
    gitlabCodeQualityUrl?: string;
    // Exit codes
    recommendedExitCode: number;
    blockingIssueCount: number;
  };
  // GitHub-specific annotations
  githubAnnotations?: GithubAnnotation[];
}

export interface GithubAnnotation {
  path: string;
  start_line: number;
  end_line: number;
  annotation_level: 'warning' | 'error' | 'notice';
  message: string;
  title: string;
}

/**
 * IDE Provider Output - For VSCode, Cursor, JetBrains
 */
export interface IDEProviderOutput {
  type: 'ide';
  data: UniversalFixData;
  lsp: {
    // LSP code actions
    codeActions: LSPCodeAction[];
    // Batch actions
    batchActions: LSPBatchAction[];
  };
  outputs: {
    lspActionsPath?: string;
    lspActionsUrl?: string;
  };
}

export interface LSPCodeAction {
  title: string;
  kind: string;
  diagnostics?: LSPDiagnostic[];
  edit?: LSPWorkspaceEdit;
  isPreferred?: boolean;
}

export interface LSPDiagnostic {
  range: { start: LSPPosition; end: LSPPosition };
  message: string;
  severity: number;
  source: string;
  code: string;
}

export interface LSPPosition {
  line: number;
  character: number;
}

export interface LSPWorkspaceEdit {
  changes: Record<string, LSPTextEdit[]>;
}

export interface LSPTextEdit {
  range: { start: LSPPosition; end: LSPPosition };
  newText: string;
}

export interface LSPBatchAction {
  title: string;
  kind: string;
  issueCount: number;
  selection: {
    mode: SelectionMode;
    severity?: IssueSeverity;
    category?: IssueCategory;
  };
}

// ============================================================================
// User Selection Request
// ============================================================================

/**
 * User's selection request - what fixes to apply
 */
export interface UserFixSelection {
  reportId: string;

  // Selection mode
  mode: SelectionMode;

  // For by_severity mode
  minSeverity?: IssueSeverity;
  includeSeverities?: IssueSeverity[];

  // For by_category mode
  includeCategories?: IssueCategory[];

  // For specific_issues mode
  selectedIssueIds?: string[];

  // Commit preferences
  commitStyle: CommitStyle;

  // Branch preferences
  createNewBranch?: boolean;
  newBranchName?: string;

  // PR preferences
  addPrComment?: boolean;
}

/**
 * Result of applying user selection
 */
export interface ApplyFixesResult {
  success: boolean;
  reportId: string;

  // What was applied
  selectedCount: number;
  appliedCount: number;
  failedCount: number;

  // Commits generated
  commits: FixCommit[];

  // For provider display
  message: string;
  errors?: string[];
}

// ============================================================================
// Provider Adapter Interface
// ============================================================================

/**
 * Base interface for all provider adapters
 */
export interface IProviderAdapter {
  /**
   * Provider type identifier
   */
  readonly type: 'web' | 'api' | 'cicd' | 'ide';

  /**
   * Generate provider-specific output from fix report
   */
  generateOutput(
    report: FixReport,
    issues: FixReportIssue[],
    options?: ProviderOptions
  ): Promise<WebProviderOutput | APIProviderOutput | CICDProviderOutput | IDEProviderOutput>;

  /**
   * Apply user selection and generate commits
   */
  applySelection(
    report: FixReport,
    issues: FixReportIssue[],
    selection: UserFixSelection
  ): Promise<ApplyFixesResult>;
}

export interface ProviderOptions {
  // Base URL for API links
  apiBaseUrl?: string;

  // Output directory for files
  outputDir?: string;

  // Upload to storage
  uploadToStorage?: boolean;

  // Git provider (github, gitlab, etc.)
  gitProvider?: Provider;
}

// ============================================================================
// Universal Fix Data Builder
// ============================================================================

/**
 * Build universal fix data from fix report and issues
 */
export function buildUniversalFixData(
  report: FixReport,
  issues: FixReportIssue[]
): UniversalFixData {
  // Count by severity
  const bySeverity: Record<IssueSeverity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  };

  // Count by category
  const byCategory: Record<IssueCategory, number> = {
    security: 0,
    code_quality: 0,
    performance: 0,
    architecture: 0,
    dependency_vulnerability: 0,
    code_style: 0,
    best_practice: 0,
    documentation: 0,
  };

  for (const issue of issues) {
    bySeverity[issue.severity]++;
    byCategory[issue.category]++;
  }

  // Build issue groups
  const groupMap = new Map<string, IssueGroupData>();
  for (const issue of issues) {
    const groupId = `${issue.ruleId}-${issue.severity}-${issue.tool}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');

    if (!groupMap.has(groupId)) {
      groupMap.set(groupId, {
        groupId,
        rule: issue.ruleId,
        tool: issue.tool,
        severity: issue.severity,
        category: issue.category,
        count: 0,
        autoFixable: false,
        issueIds: [],
      });
    }

    const group = groupMap.get(groupId)!;
    group.count++;
    group.issueIds.push(issue.id);
    if (issue.fixAvailable) {
      group.autoFixable = true;
    }
  }

  // Build universal issues
  const universalIssues: UniversalIssue[] = issues.map(issue => ({
    id: issue.id,
    file: issue.filePath,
    line: issue.lineNumber,
    column: issue.columnNumber,
    endLine: issue.endLine,
    endColumn: issue.endColumn,
    ruleId: issue.ruleId,
    tool: issue.tool,
    category: issue.category,
    severity: issue.severity,
    message: issue.message,
    description: issue.description,
    codeSnippet: issue.codeSnippet,
    fixAvailable: issue.fixAvailable,
    fixSource: issue.fixSource,
    fixConfidence: issue.fixConfidence,
    fixedCode: issue.fixedCode,
    isIntentionalUse: issue.isIntentionalUse,
    intentionalReason: issue.intentionalReason,
    ruleDocUrl: getRuleDocUrl(issue.tool, issue.ruleId),
  }));

  return {
    reportId: report.id,
    repository: report.repositoryUrl,
    prNumber: report.prNumber,
    branch: report.headBranch,
    analyzedAt: report.createdAt.toISOString(),

    summary: {
      totalIssues: report.totalIssues,
      fixableIssues: report.fixableIssues,
      autoFixedCount: report.autoFixedCount,
      manualReviewCount: report.manualReviewCount,
      intentionalUseCount: report.intentionalUseCount,
      bySeverity,
      byCategory,
    },

    selectionOptions: {
      availableModes: ['all_fixable', 'by_severity', 'by_category', 'specific_issues', 'review_each'],
      availableCommitStyles: ['single', 'grouped', 'per_file', 'per_issue'],
      severityLevels: ['critical', 'high', 'medium', 'low', 'info'],
      categories: Object.keys(byCategory).filter(cat => byCategory[cat as IssueCategory] > 0) as IssueCategory[],
    },

    issues: universalIssues,
    groups: Array.from(groupMap.values()),
  };
}

/**
 * Get documentation URL for a rule
 */
function getRuleDocUrl(tool: string, ruleId: string): string | undefined {
  switch (tool.toLowerCase()) {
    case 'semgrep':
      return `https://semgrep.dev/r/${ruleId}`;
    case 'eslint':
      return `https://eslint.org/docs/rules/${ruleId}`;
    case 'pmd':
      return `https://pmd.github.io/pmd/rules/java/`;
    case 'checkstyle':
      return `https://checkstyle.org/checks/`;
    case 'dependency-check':
    case 'npm-audit':
      return `https://nvd.nist.gov/vuln/search`;
    default:
      return undefined;
  }
}

// ============================================================================
// Export Types
// ============================================================================

export type ProviderOutput =
  | WebProviderOutput
  | APIProviderOutput
  | CICDProviderOutput
  | IDEProviderOutput;
