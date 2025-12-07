/**
 * Fix Report Service
 *
 * Service layer for managing fix reports, user selections, and commit generation.
 * Implements the complete workflow: Analysis -> User Selection -> Commit Generation
 */

import { v4 as uuidv4 } from 'uuid';
import {
  FixReport,
  FixReportIssue,
  FixUserSelections,
  FixCommit,
  FixReportStatus,
  SelectionMode,
  CommitStyle,
  IssueSeverity,
  IssueCategory,
  Provider,
  UserTier,
  FixReportSummary,
  CreateFixReportRequest,
  UpdateUserSelectionsRequest,
  GenerateCommitsRequest,
  GenerateCommitsResponse,
} from '../types/fix-report-types';
import { UnifiedCommitGenerator } from '../commit/unified-commit-generator';

// ============================================================================
// Severity Ordering for Filtering
// ============================================================================

const SEVERITY_ORDER: Record<IssueSeverity, number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1,
};

// ============================================================================
// Fix Report Service
// ============================================================================

export class FixReportService {
  private reports: Map<string, FixReport> = new Map();
  private issues: Map<string, FixReportIssue[]> = new Map();
  private selections: Map<string, FixUserSelections> = new Map();
  private commits: Map<string, FixCommit[]> = new Map();

  // ============================================================================
  // Report Management
  // ============================================================================

  /**
   * Create a new fix report
   */
  createReport(request: CreateFixReportRequest): FixReport {
    const report: FixReport = {
      id: uuidv4(),
      repositoryUrl: request.repositoryUrl,
      prNumber: request.prNumber,
      baseBranch: request.baseBranch || 'main',
      headBranch: request.headBranch,
      userTier: request.userTier || 'basic',
      provider: request.provider,
      totalIssues: 0,
      fixableIssues: 0,
      autoFixedCount: 0,
      manualReviewCount: 0,
      intentionalUseCount: 0,
      apiCostUsd: 0,
      patternReuseCount: 0,
      status: 'pending',
      createdAt: new Date(),
    };

    this.reports.set(report.id, report);
    this.issues.set(report.id, []);
    this.commits.set(report.id, []);

    return report;
  }

  /**
   * Get a fix report by ID
   */
  getReport(reportId: string): FixReport | undefined {
    return this.reports.get(reportId);
  }

  /**
   * Update report status
   */
  updateReportStatus(reportId: string, status: FixReportStatus): void {
    const report = this.reports.get(reportId);
    if (report) {
      report.status = status;
      report.updatedAt = new Date();
      if (status === 'completed') {
        report.completedAt = new Date();
      }
    }
  }

  // ============================================================================
  // Issue Management
  // ============================================================================

  /**
   * Add issues to a report
   */
  addIssues(reportId: string, newIssues: Omit<FixReportIssue, 'id' | 'fixReportId' | 'createdAt'>[]): void {
    const report = this.reports.get(reportId);
    if (!report) {
      throw new Error(`Report ${reportId} not found`);
    }

    const reportIssues = this.issues.get(reportId) || [];

    for (const issue of newIssues) {
      const fullIssue: FixReportIssue = {
        ...issue,
        id: uuidv4(),
        fixReportId: reportId,
        createdAt: new Date(),
      };
      reportIssues.push(fullIssue);
    }

    this.issues.set(reportId, reportIssues);

    // Update report statistics
    this.updateReportStatistics(reportId);
  }

  /**
   * Get all issues for a report
   */
  getIssues(reportId: string): FixReportIssue[] {
    return this.issues.get(reportId) || [];
  }

  /**
   * Get issues filtered by criteria
   */
  getFilteredIssues(
    reportId: string,
    options: {
      severities?: IssueSeverity[];
      categories?: IssueCategory[];
      fixableOnly?: boolean;
      selectedOnly?: boolean;
      excludeIntentional?: boolean;
    }
  ): FixReportIssue[] {
    let issues = this.getIssues(reportId);

    if (options.severities?.length) {
      issues = issues.filter(i => options.severities!.includes(i.severity));
    }

    if (options.categories?.length) {
      issues = issues.filter(i => options.categories!.includes(i.category));
    }

    if (options.fixableOnly) {
      issues = issues.filter(i => i.fixAvailable);
    }

    if (options.selectedOnly) {
      issues = issues.filter(i => i.userSelected);
    }

    if (options.excludeIntentional) {
      issues = issues.filter(i => !i.isIntentionalUse);
    }

    return issues;
  }

  /**
   * Update report statistics based on current issues
   */
  private updateReportStatistics(reportId: string): void {
    const report = this.reports.get(reportId);
    const issues = this.issues.get(reportId) || [];

    if (report) {
      report.totalIssues = issues.length;
      report.fixableIssues = issues.filter(i => i.fixAvailable).length;
      report.autoFixedCount = issues.filter(
        i => i.fixAvailable && (i.fixSource === 'pattern' || i.fixSource === 'ai_generated')
      ).length;
      report.manualReviewCount = issues.filter(i => i.fixSource === 'manual').length;
      report.intentionalUseCount = issues.filter(i => i.isIntentionalUse).length;
      report.patternReuseCount = issues.filter(i => i.fixSource === 'pattern').length;
      report.updatedAt = new Date();
    }
  }

  // ============================================================================
  // User Selection Management
  // ============================================================================

  /**
   * Create or update user selections for a report
   */
  updateUserSelections(request: UpdateUserSelectionsRequest): FixUserSelections {
    const existingSelection = this.selections.get(request.fixReportId);

    const selection: FixUserSelections = {
      id: existingSelection?.id || uuidv4(),
      fixReportId: request.fixReportId,
      selectionMode: request.selectionMode,
      minSeverity: request.minSeverity,
      includeSeverities: request.includeSeverities || [],
      includeCategories: request.includeCategories || [],
      selectedIssueIds: request.selectedIssueIds || [],
      includeIntentionalReview: false,
      autoApproveHighConfidence: true,
      requireManualReviewThreshold: 70,
      commitStyle: request.commitStyle || 'grouped',
      createNewBranch: request.createNewBranch || false,
      newBranchName: request.newBranchName,
      addPrComment: request.addPrComment !== false,
      includeEducational: true,
      createdAt: existingSelection?.createdAt || new Date(),
      updatedAt: new Date(),
    };

    this.selections.set(request.fixReportId, selection);

    // Apply selection to issues
    this.applyUserSelection(request.fixReportId);

    // Update report status
    this.updateReportStatus(request.fixReportId, 'fixes_selected');

    return selection;
  }

  /**
   * Get user selections for a report
   */
  getUserSelections(reportId: string): FixUserSelections | undefined {
    return this.selections.get(reportId);
  }

  /**
   * Apply user selection criteria to issues
   */
  applyUserSelection(reportId: string): number {
    const selection = this.selections.get(reportId);
    const issues = this.issues.get(reportId);

    if (!selection || !issues) {
      return 0;
    }

    let selectedCount = 0;

    // First, reset all selections
    for (const issue of issues) {
      issue.userSelected = false;
      issue.userSelectionTime = undefined;
    }

    // Apply selection based on mode
    for (const issue of issues) {
      let shouldSelect = false;

      switch (selection.selectionMode) {
        case 'all_fixable':
          // Select all fixable issues that aren't intentional use
          shouldSelect = issue.fixAvailable && !issue.isIntentionalUse;
          break;

        case 'by_severity':
          // Select by severity filter
          if (issue.fixAvailable && !issue.isIntentionalUse) {
            if (selection.minSeverity) {
              // Use minimum severity threshold
              shouldSelect = SEVERITY_ORDER[issue.severity] >= SEVERITY_ORDER[selection.minSeverity];
            } else if (selection.includeSeverities.length > 0) {
              // Use explicit severity list
              shouldSelect = selection.includeSeverities.includes(issue.severity);
            }
          }
          break;

        case 'by_category':
          // Select by category filter
          shouldSelect =
            issue.fixAvailable &&
            !issue.isIntentionalUse &&
            selection.includeCategories.includes(issue.category);
          break;

        case 'specific_issues':
          // Select only specifically chosen issues
          shouldSelect = selection.selectedIssueIds.includes(issue.id);
          break;

        case 'review_each':
          // No automatic selection - user reviews each
          shouldSelect = false;
          break;
      }

      // Apply confidence threshold
      if (shouldSelect && !selection.autoApproveHighConfidence) {
        if (issue.fixConfidence && issue.fixConfidence < selection.requireManualReviewThreshold) {
          shouldSelect = false;
        }
      }

      if (shouldSelect) {
        issue.userSelected = true;
        issue.userSelectionTime = new Date();
        selectedCount++;
      }
    }

    return selectedCount;
  }

  /**
   * Toggle selection for a specific issue (for review_each mode)
   */
  toggleIssueSelection(reportId: string, issueId: string, selected: boolean): void {
    const issues = this.issues.get(reportId);
    if (!issues) return;

    const issue = issues.find(i => i.id === issueId);
    if (issue) {
      issue.userSelected = selected;
      issue.userSelectionTime = selected ? new Date() : undefined;
    }
  }

  // ============================================================================
  // Report Summary
  // ============================================================================

  /**
   * Get summary statistics for a report
   */
  getReportSummary(reportId: string): FixReportSummary | null {
    const issues = this.issues.get(reportId);
    if (!issues) return null;

    const bySeverity: Record<IssueSeverity, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    };

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

    return {
      totalIssues: issues.length,
      bySeverity,
      byCategory,
      fixableCount: issues.filter(i => i.fixAvailable).length,
      autoFixed: issues.filter(i => i.fixSource === 'pattern' || i.fixSource === 'ai_generated').length,
      manualReview: issues.filter(i => i.fixSource === 'manual').length,
      intentionalUse: issues.filter(i => i.isIntentionalUse).length,
      selectedCount: issues.filter(i => i.userSelected).length,
    };
  }

  // ============================================================================
  // Commit Generation
  // ============================================================================

  /**
   * Generate commits based on user selections
   */
  generateCommits(request: GenerateCommitsRequest): GenerateCommitsResponse {
    const report = this.reports.get(request.fixReportId);
    const selection = this.selections.get(request.fixReportId);
    const issues = this.issues.get(request.fixReportId);

    if (!report || !issues) {
      throw new Error(`Report ${request.fixReportId} not found`);
    }

    // Get selected issues
    const selectedIssues = issues.filter(i => i.userSelected && i.fixAvailable);

    if (selectedIssues.length === 0) {
      return {
        commits: [],
        totalFilesChanged: 0,
        totalAdditions: 0,
        totalDeletions: 0,
      };
    }

    // Use the unified commit generator
    const generator = new UnifiedCommitGenerator(report.provider || 'github');
    const repositoryName = this.extractRepoName(report.repositoryUrl);
    const commitStyle = request.commitStyle || selection?.commitStyle || 'grouped';

    const commits = generator.generateCommits(selectedIssues, commitStyle, repositoryName);

    // Store commits
    this.commits.set(request.fixReportId, commits);

    // Calculate totals
    const allFiles = new Set<string>();
    let totalAdditions = 0;
    let totalDeletions = 0;

    for (const commit of commits) {
      commit.filesChanged.forEach(f => allFiles.add(f));
      totalAdditions += commit.additions;
      totalDeletions += commit.deletions;
    }

    // Update report status
    this.updateReportStatus(request.fixReportId, 'commit_ready');

    return {
      commits,
      totalFilesChanged: allFiles.size,
      totalAdditions,
      totalDeletions,
    };
  }

  /**
   * Get commits for a report
   */
  getCommits(reportId: string): FixCommit[] {
    return this.commits.get(reportId) || [];
  }

  /**
   * Generate PR comment for fixes
   */
  generatePRComment(reportId: string): string | null {
    const report = this.reports.get(reportId);
    const issues = this.issues.get(reportId);
    const commits = this.commits.get(reportId);

    if (!report || !issues || !commits) {
      return null;
    }

    const selectedIssues = issues.filter(i => i.userSelected);
    const generator = new UnifiedCommitGenerator(report.provider || 'github');

    return generator.generatePRComment(
      selectedIssues,
      commits,
      report.repositoryUrl,
      report.prNumber || 0
    );
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Extract repository name from URL
   */
  private extractRepoName(url: string): string {
    const match = url.match(/[/:]([^/]+\/[^/.]+)(?:\.git)?$/);
    return match ? match[1] : 'repository';
  }

  /**
   * Get issues formatted for external display
   */
  getDisplayIssues(
    reportId: string,
    groupBy: 'severity' | 'category' | 'file' = 'severity'
  ): Record<string, FixReportIssue[]> {
    const issues = this.getIssues(reportId);
    const grouped: Record<string, FixReportIssue[]> = {};

    for (const issue of issues) {
      let key: string;
      switch (groupBy) {
        case 'severity':
          key = issue.severity;
          break;
        case 'category':
          key = issue.category;
          break;
        case 'file':
          key = issue.filePath;
          break;
      }

      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(issue);
    }

    // Sort by severity order if grouping by severity
    if (groupBy === 'severity') {
      const order = ['critical', 'high', 'medium', 'low', 'info'];
      const sorted: Record<string, FixReportIssue[]> = {};
      for (const sev of order) {
        if (grouped[sev]) {
          sorted[sev] = grouped[sev];
        }
      }
      return sorted;
    }

    return grouped;
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const fixReportService = new FixReportService();
