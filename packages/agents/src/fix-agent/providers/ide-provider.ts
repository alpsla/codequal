/**
 * IDE Provider
 *
 * Generates output optimized for IDE integration via LSP protocol.
 * Supports VSCode, Cursor, JetBrains, and other LSP-compatible editors.
 *
 * Provides:
 * - Individual code actions for each fix
 * - Batch actions for bulk operations
 * - Quick fix suggestions
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  IProviderAdapter,
  IDEProviderOutput,
  LSPCodeAction,
  LSPBatchAction,
  LSPDiagnostic,
  LSPWorkspaceEdit,
  LSPPosition,
  LSPTextEdit,
  UserFixSelection,
  ApplyFixesResult,
  ProviderOptions,
  buildUniversalFixData,
} from './provider-adapter';
import {
  FixReport,
  FixReportIssue,
  SelectionMode,
  IssueSeverity,
  IssueCategory,
} from '../types/fix-report-types';
import { UnifiedCommitGenerator } from '../commit/unified-commit-generator';

// ============================================================================
// IDE Provider Implementation
// ============================================================================

export class IDEProvider implements IProviderAdapter {
  readonly type = 'ide' as const;

  async generateOutput(
    report: FixReport,
    issues: FixReportIssue[],
    options?: ProviderOptions
  ): Promise<IDEProviderOutput> {
    const universalData = buildUniversalFixData(report, issues);

    // Generate LSP code actions
    const codeActions = this.generateCodeActions(issues, options?.outputDir);
    const batchActions = this.generateBatchActions(issues);

    // Write to file if output directory provided
    let lspActionsPath: string | undefined;
    if (options?.outputDir) {
      lspActionsPath = await this.writeLSPActionsFile(codeActions, batchActions, options.outputDir);
    }

    return {
      type: 'ide',
      data: universalData,
      lsp: {
        codeActions,
        batchActions,
      },
      outputs: {
        lspActionsPath,
      },
    };
  }

  async applySelection(
    report: FixReport,
    issues: FixReportIssue[],
    selection: UserFixSelection
  ): Promise<ApplyFixesResult> {
    try {
      // Filter issues by selection
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
        message: `Prepared ${selectedIssues.length} LSP code actions in ${commits.length} commit(s)`,
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
  // LSP Code Action Generation
  // ==========================================================================

  private generateCodeActions(issues: FixReportIssue[], workspaceRoot?: string): LSPCodeAction[] {
    const actions: LSPCodeAction[] = [];

    for (const issue of issues) {
      if (!issue.fixAvailable || !issue.fixedCode) {
        continue;
      }

      const filePath = workspaceRoot
        ? `file://${path.join(workspaceRoot, issue.filePath)}`
        : `file://${issue.filePath}`;

      // Create diagnostic
      const diagnostic: LSPDiagnostic = {
        range: {
          start: { line: issue.lineNumber - 1, character: (issue.columnNumber || 1) - 1 },
          end: {
            line: (issue.endLine || issue.lineNumber) - 1,
            character: (issue.endColumn || 100) - 1,
          },
        },
        message: issue.message,
        severity: this.mapSeverityToLSP(issue.severity),
        source: `codequal-${issue.tool}`,
        code: issue.ruleId,
      };

      // Create workspace edit
      const edit: LSPWorkspaceEdit = {
        changes: {
          [filePath]: [
            {
              range: {
                start: { line: issue.lineNumber - 1, character: 0 },
                end: {
                  line: (issue.endLine || issue.lineNumber) - 1,
                  character: 1000, // End of line
                },
              },
              newText: issue.fixedCode,
            },
          ],
        },
      };

      // Create code action
      const action: LSPCodeAction = {
        title: `Fix: ${issue.ruleId} - ${this.truncate(issue.message, 50)}`,
        kind: 'quickfix',
        diagnostics: [diagnostic],
        edit,
        isPreferred: issue.severity === 'critical' || issue.severity === 'high',
      };

      actions.push(action);
    }

    return actions;
  }

  private generateBatchActions(issues: FixReportIssue[]): LSPBatchAction[] {
    const actions: LSPBatchAction[] = [];
    const fixableIssues = issues.filter(i => i.fixAvailable && !i.isIntentionalUse);

    // 1. Apply All Fixes
    if (fixableIssues.length > 0) {
      actions.push({
        title: `Apply All ${fixableIssues.length} Fixes`,
        kind: 'source.fixAll.codequal',
        issueCount: fixableIssues.length,
        selection: {
          mode: 'all_fixable',
        },
      });
    }

    // 2. Apply by Severity
    const severities: IssueSeverity[] = ['critical', 'high', 'medium', 'low'];
    for (const severity of severities) {
      const count = fixableIssues.filter(i => i.severity === severity).length;
      if (count > 0) {
        actions.push({
          title: `Apply ${count} ${severity.charAt(0).toUpperCase() + severity.slice(1)} Severity Fixes`,
          kind: `source.fixAll.codequal.${severity}`,
          issueCount: count,
          selection: {
            mode: 'by_severity',
            severity,
          },
        });
      }
    }

    // 3. Apply Security Fixes
    const securityIssues = fixableIssues.filter(
      i => i.category === 'security' || i.category === 'dependency_vulnerability'
    );
    if (securityIssues.length > 0) {
      actions.push({
        title: `Apply ${securityIssues.length} Security Fixes`,
        kind: 'source.fixAll.codequal.security',
        issueCount: securityIssues.length,
        selection: {
          mode: 'by_category',
          category: 'security',
        },
      });
    }

    // 4. Apply Code Quality Fixes
    const codeQualityIssues = fixableIssues.filter(
      i => i.category === 'code_quality' || i.category === 'code_style'
    );
    if (codeQualityIssues.length > 0) {
      actions.push({
        title: `Apply ${codeQualityIssues.length} Code Quality Fixes`,
        kind: 'source.fixAll.codequal.quality',
        issueCount: codeQualityIssues.length,
        selection: {
          mode: 'by_category',
          category: 'code_quality',
        },
      });
    }

    return actions;
  }

  // ==========================================================================
  // File Output
  // ==========================================================================

  private async writeLSPActionsFile(
    codeActions: LSPCodeAction[],
    batchActions: LSPBatchAction[],
    outputDir: string
  ): Promise<string> {
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const lspOutput = {
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      totalActions: codeActions.length,
      batchActionsCount: batchActions.length,
      codeActions,
      batchActions,
    };

    const filePath = path.join(outputDir, 'codequal-lsp-actions.json');
    fs.writeFileSync(filePath, JSON.stringify(lspOutput, null, 2), 'utf-8');

    return filePath;
  }

  // ==========================================================================
  // Helpers
  // ==========================================================================

  private mapSeverityToLSP(severity: IssueSeverity): number {
    // LSP DiagnosticSeverity: 1 = Error, 2 = Warning, 3 = Info, 4 = Hint
    switch (severity) {
      case 'critical':
        return 1;
      case 'high':
        return 1;
      case 'medium':
        return 2;
      case 'low':
        return 3;
      case 'info':
        return 4;
      default:
        return 3;
    }
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
        return [];

      default:
        return filtered;
    }
  }

  private truncate(str: string, maxLength: number): string {
    if (str.length <= maxLength) {
      return str;
    }
    return str.substring(0, maxLength - 3) + '...';
  }

  private extractRepoName(url: string): string {
    const match = url.match(/[/:]([^/]+\/[^/.]+)(?:\.git)?$/);
    return match ? match[1] : 'repository';
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createIDEProvider(): IDEProvider {
  return new IDEProvider();
}
