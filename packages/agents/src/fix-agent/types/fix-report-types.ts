/**
 * Fix Report Types
 *
 * TypeScript types for fix reports, user selections, and commit generation.
 * These types map to the database schema in 002_create_fix_reports_table.sql
 */

// ============================================================================
// Enums and Constants
// ============================================================================

export type UserTier = 'basic' | 'pro' | 'enterprise';

export type FixReportStatus =
  | 'pending'           // Report created, awaiting user selection
  | 'user_reviewing'    // User is reviewing issues
  | 'fixes_selected'    // User has selected fixes to apply
  | 'commit_pending'    // Commit is being generated
  | 'commit_ready'      // Commit ready for user approval
  | 'committed'         // Changes committed to branch
  | 'pushed'            // Changes pushed to remote
  | 'pr_updated'        // PR updated with fixes
  | 'completed'         // Workflow complete
  | 'cancelled'         // User cancelled
  | 'error';            // Error occurred

export type IssueCategory =
  | 'security'
  | 'code_quality'
  | 'performance'
  | 'architecture'
  | 'dependency_vulnerability'
  | 'code_style'
  | 'best_practice'
  | 'documentation';

export type IssueSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type IssueType = 'new' | 'existing_modified' | 'existing_rest' | 'resolved';

export type FixSource = 'pattern' | 'ai_generated' | 'tool_native' | 'manual';

export type SelectionMode =
  | 'all_fixable'       // Fix all issues that have fixes available
  | 'by_severity'       // Fix issues matching severity filter
  | 'by_category'       // Fix issues matching category filter
  | 'specific_issues'   // Fix only specifically selected issues
  | 'review_each';      // Review each fix before applying

export type CommitStyle =
  | 'single'            // All fixes in one commit
  | 'grouped'           // Group by category
  | 'per_file'          // One commit per file
  | 'per_issue';        // One commit per issue

export type Provider = 'github' | 'gitlab' | 'bitbucket' | 'azure_devops';

export type CommitStatus =
  | 'pending'           // Commit prepared but not applied
  | 'staged'            // Files staged
  | 'committed'         // Commit created locally
  | 'pushed'            // Pushed to remote
  | 'merged'            // Merged to base branch
  | 'reverted'          // Commit was reverted
  | 'error';            // Error occurred

// ============================================================================
// Fix Report (Main Analysis Session)
// ============================================================================

export interface FixReport {
  id: string;
  prReviewId?: string;

  // Repository context
  repositoryUrl: string;
  prNumber?: number;
  baseBranch: string;
  headBranch: string;
  commitSha?: string;

  // User context
  userId?: string;
  userTier: UserTier;

  // Analysis summary
  totalIssues: number;
  fixableIssues: number;
  autoFixedCount: number;
  manualReviewCount: number;
  intentionalUseCount: number;

  // Cost tracking
  apiCostUsd: number;
  patternReuseCount: number;

  // Status
  status: FixReportStatus;

  // Timestamps
  createdAt: Date;
  updatedAt?: Date;
  completedAt?: Date;

  // Provider metadata
  provider?: Provider;
  providerMetadata?: Record<string, unknown>;
}

// ============================================================================
// Fix Report Issue (Individual Issues Found)
// ============================================================================

export interface FixReportIssue {
  id: string;
  fixReportId: string;
  issueHash: string;

  // Issue location
  filePath: string;
  lineNumber: number;
  columnNumber?: number;
  endLine?: number;
  endColumn?: number;

  // Classification
  ruleId: string;
  tool: string;
  category: IssueCategory;
  severity: IssueSeverity;

  // Issue content
  message: string;
  description?: string;
  codeSnippet?: string;

  // Issue status in PR
  issueType: IssueType;

  // Fix availability
  fixAvailable: boolean;
  fixSource?: FixSource;
  fixConfidence?: number;
  fixedCode?: string;

  // Special handling
  isIntentionalUse: boolean;
  intentionalReason?: string;

  // User selection
  userSelected: boolean;
  userSelectionTime?: Date;

  // Pattern tracking
  patternId?: string;

  // Timestamp
  createdAt: Date;
}

// ============================================================================
// Fix User Selections (User Preferences)
// ============================================================================

export interface FixUserSelections {
  id: string;
  fixReportId: string;

  // Selection mode
  selectionMode: SelectionMode;

  // Severity filter (when selectionMode = 'by_severity')
  minSeverity?: IssueSeverity;
  includeSeverities: IssueSeverity[];

  // Category filter (when selectionMode = 'by_category')
  includeCategories: IssueCategory[];

  // Specific issues (when selectionMode = 'specific_issues')
  selectedIssueIds: string[];

  // Additional options
  includeIntentionalReview: boolean;
  autoApproveHighConfidence: boolean;
  requireManualReviewThreshold: number;

  // Commit preferences
  commitStyle: CommitStyle;

  // Branch preferences
  createNewBranch: boolean;
  newBranchName?: string;

  // PR preferences
  addPrComment: boolean;
  includeEducational: boolean;

  // Timestamps
  createdAt: Date;
  updatedAt?: Date;
}

// ============================================================================
// Fix Commit (Generated Commits)
// ============================================================================

export interface FixCommit {
  id: string;
  fixReportId: string;

  // Commit details
  commitType: 'fix' | 'style' | 'security' | 'perf' | 'refactor';
  commitTitle: string;
  commitBody: string;

  // Files changed
  filesChanged: string[];
  additions: number;
  deletions: number;

  // Issue references
  issueIds: string[];

  // Status
  status: CommitStatus;

  // Git details
  commitSha?: string;
  parentSha?: string;

  // Timestamps
  createdAt: Date;
  committedAt?: Date;
  pushedAt?: Date;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface CreateFixReportRequest {
  repositoryUrl: string;
  prNumber?: number;
  baseBranch?: string;
  headBranch: string;
  userTier?: UserTier;
  provider?: Provider;
}

export interface UpdateUserSelectionsRequest {
  fixReportId: string;
  selectionMode: SelectionMode;
  minSeverity?: IssueSeverity;
  includeSeverities?: IssueSeverity[];
  includeCategories?: IssueCategory[];
  selectedIssueIds?: string[];
  commitStyle?: CommitStyle;
  createNewBranch?: boolean;
  newBranchName?: string;
  addPrComment?: boolean;
}

export interface FixReportSummary {
  totalIssues: number;
  bySeverity: Record<IssueSeverity, number>;
  byCategory: Record<IssueCategory, number>;
  fixableCount: number;
  autoFixed: number;
  manualReview: number;
  intentionalUse: number;
  selectedCount: number;
}

export interface GenerateCommitsRequest {
  fixReportId: string;
  commitStyle: CommitStyle;
  dryRun?: boolean;
}

export interface GenerateCommitsResponse {
  commits: FixCommit[];
  totalFilesChanged: number;
  totalAdditions: number;
  totalDeletions: number;
}

// ============================================================================
// Utility Types for Commit Generation
// ============================================================================

export interface CommitGroup {
  category?: IssueCategory;
  file?: string;
  issues: FixReportIssue[];
  title: string;
  body: string;
}

export interface FileChange {
  filePath: string;
  originalContent: string;
  fixedContent: string;
  additions: number;
  deletions: number;
}

export interface CommitTemplate {
  provider: Provider;
  titleTemplate: string;
  bodyTemplate: string;
  footerTemplate: string;
  maxTitleLength: number;
  maxBodyLength: number;
}
