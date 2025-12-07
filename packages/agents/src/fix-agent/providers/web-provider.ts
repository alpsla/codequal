/**
 * Web Provider
 *
 * Generates output optimized for interactive web UI consumption.
 * Provides pre-computed actions and HTML snippets for quick rendering.
 */

import {
  IProviderAdapter,
  WebProviderOutput,
  WebAction,
  UserFixSelection,
  ApplyFixesResult,
  ProviderOptions,
  buildUniversalFixData,
} from './provider-adapter';
import {
  FixReport,
  FixReportIssue,
  FixCommit,
  SelectionMode,
  IssueSeverity,
} from '../types/fix-report-types';
import { FixReportService } from '../services/fix-report-service';
import { UnifiedCommitGenerator } from '../commit/unified-commit-generator';

// ============================================================================
// Web Provider Implementation
// ============================================================================

export class WebProvider implements IProviderAdapter {
  readonly type = 'web' as const;
  private reportService: FixReportService;

  constructor(reportService?: FixReportService) {
    this.reportService = reportService || new FixReportService();
  }

  async generateOutput(
    report: FixReport,
    issues: FixReportIssue[],
    options?: ProviderOptions
  ): Promise<WebProviderOutput> {
    const universalData = buildUniversalFixData(report, issues);

    // Generate available actions for the UI
    const actions = this.generateWebActions(report, issues);

    return {
      type: 'web',
      data: universalData,
      ui: {
        summaryHtml: this.generateSummaryHtml(universalData),
        actions,
        displayOrder: 'severity',
      },
    };
  }

  async applySelection(
    report: FixReport,
    issues: FixReportIssue[],
    selection: UserFixSelection
  ): Promise<ApplyFixesResult> {
    try {
      // Apply selection to issues
      const selectedIssues = this.filterIssuesBySelection(issues, selection);

      if (selectedIssues.length === 0) {
        return {
          success: true,
          reportId: report.id,
          selectedCount: 0,
          appliedCount: 0,
          failedCount: 0,
          commits: [],
          message: 'No issues matched the selection criteria',
        };
      }

      // Mark selected issues
      for (const issue of selectedIssues) {
        issue.userSelected = true;
        issue.userSelectionTime = new Date();
      }

      // Generate commits
      const generator = new UnifiedCommitGenerator(report.provider || 'github');
      const commits = generator.generateCommits(
        selectedIssues,
        selection.commitStyle,
        this.extractRepoName(report.repositoryUrl)
      );

      return {
        success: true,
        reportId: report.id,
        selectedCount: selectedIssues.length,
        appliedCount: selectedIssues.length,
        failedCount: 0,
        commits,
        message: `Successfully prepared ${selectedIssues.length} fixes in ${commits.length} commit(s)`,
      };
    } catch (error: any) {
      return {
        success: false,
        reportId: report.id,
        selectedCount: 0,
        appliedCount: 0,
        failedCount: 0,
        commits: [],
        message: 'Failed to apply selection',
        errors: [error.message],
      };
    }
  }

  // ==========================================================================
  // Web-Specific Helpers
  // ==========================================================================

  private generateWebActions(report: FixReport, issues: FixReportIssue[]): WebAction[] {
    const actions: WebAction[] = [];

    // Count fixable issues
    const fixableIssues = issues.filter(i => i.fixAvailable && !i.isIntentionalUse);

    // 1. Fix All action
    actions.push({
      id: 'fix-all',
      label: 'Fix All Issues',
      description: `Apply all ${fixableIssues.length} available fixes`,
      selectionMode: 'all_fixable',
      issueCount: fixableIssues.length,
      enabled: fixableIssues.length > 0,
    });

    // 2. Fix by severity actions
    const severities: IssueSeverity[] = ['critical', 'high', 'medium', 'low'];
    for (const severity of severities) {
      const count = fixableIssues.filter(i => i.severity === severity).length;
      if (count > 0) {
        actions.push({
          id: `fix-${severity}`,
          label: `Fix ${severity.charAt(0).toUpperCase() + severity.slice(1)} Severity`,
          description: `Apply fixes for ${count} ${severity} severity issues`,
          selectionMode: 'by_severity',
          issueCount: count,
          enabled: true,
        });
      }
    }

    // 3. Fix Security Issues action
    const securityIssues = fixableIssues.filter(
      i => i.category === 'security' || i.category === 'dependency_vulnerability'
    );
    if (securityIssues.length > 0) {
      actions.push({
        id: 'fix-security',
        label: 'Fix Security Issues Only',
        description: `Apply ${securityIssues.length} security-related fixes`,
        selectionMode: 'by_category',
        issueCount: securityIssues.length,
        enabled: true,
      });
    }

    // 4. Review Each action
    actions.push({
      id: 'review-each',
      label: 'Review Each Fix',
      description: 'Manually review and select individual fixes',
      selectionMode: 'review_each',
      issueCount: fixableIssues.length,
      enabled: fixableIssues.length > 0,
    });

    return actions;
  }

  private generateSummaryHtml(data: ReturnType<typeof buildUniversalFixData>): string {
    const { summary } = data;

    const severityBadges = Object.entries(summary.bySeverity)
      .filter(([, count]) => count > 0)
      .map(([severity, count]) => {
        const color = this.getSeverityColor(severity as IssueSeverity);
        return `<span class="badge" style="background-color: ${color}">${severity}: ${count}</span>`;
      })
      .join(' ');

    return `
      <div class="fix-summary">
        <h3>Analysis Summary</h3>
        <div class="summary-stats">
          <div class="stat">
            <span class="stat-value">${summary.totalIssues}</span>
            <span class="stat-label">Total Issues</span>
          </div>
          <div class="stat">
            <span class="stat-value">${summary.fixableIssues}</span>
            <span class="stat-label">Fixable</span>
          </div>
          <div class="stat">
            <span class="stat-value">${summary.autoFixedCount}</span>
            <span class="stat-label">Auto-fixed</span>
          </div>
          <div class="stat">
            <span class="stat-value">${summary.intentionalUseCount}</span>
            <span class="stat-label">Intentional</span>
          </div>
        </div>
        <div class="severity-badges">
          ${severityBadges}
        </div>
      </div>
    `.trim();
  }

  private getSeverityColor(severity: IssueSeverity): string {
    const colors: Record<IssueSeverity, string> = {
      critical: '#dc2626',
      high: '#ea580c',
      medium: '#ca8a04',
      low: '#2563eb',
      info: '#6b7280',
    };
    return colors[severity];
  }

  private filterIssuesBySelection(
    issues: FixReportIssue[],
    selection: UserFixSelection
  ): FixReportIssue[] {
    let filtered = issues.filter(i => i.fixAvailable && !i.isIntentionalUse);

    switch (selection.mode) {
      case 'all_fixable':
        return filtered;

      case 'by_severity':
        if (selection.includeSeverities?.length) {
          filtered = filtered.filter(i => selection.includeSeverities!.includes(i.severity));
        } else if (selection.minSeverity) {
          const severityOrder: Record<IssueSeverity, number> = {
            critical: 5,
            high: 4,
            medium: 3,
            low: 2,
            info: 1,
          };
          const minLevel = severityOrder[selection.minSeverity];
          filtered = filtered.filter(i => severityOrder[i.severity] >= minLevel);
        }
        return filtered;

      case 'by_category':
        if (selection.includeCategories?.length) {
          filtered = filtered.filter(i => selection.includeCategories!.includes(i.category));
        }
        return filtered;

      case 'specific_issues':
        if (selection.selectedIssueIds?.length) {
          filtered = issues.filter(i => selection.selectedIssueIds!.includes(i.id));
        }
        return filtered;

      case 'review_each':
        // In review_each mode, return empty - user must explicitly select
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
// Factory Function
// ============================================================================

export function createWebProvider(reportService?: FixReportService): WebProvider {
  return new WebProvider(reportService);
}
