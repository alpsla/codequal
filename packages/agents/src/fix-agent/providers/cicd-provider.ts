/**
 * CI/CD Provider
 *
 * Generates output optimized for CI/CD pipeline integration.
 * Supports GitHub Actions, GitLab CI, Azure Pipelines, and other CI systems.
 *
 * Provides:
 * - SARIF reports for GitHub Code Scanning
 * - GitLab Code Quality reports
 * - GitHub Actions annotations
 * - Exit codes based on issue severity
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  IProviderAdapter,
  CICDProviderOutput,
  GithubAnnotation,
  UserFixSelection,
  ApplyFixesResult,
  ProviderOptions,
  buildUniversalFixData,
} from './provider-adapter';
import {
  FixReport,
  FixReportIssue,
  IssueSeverity,
} from '../types/fix-report-types';
import { UnifiedCommitGenerator } from '../commit/unified-commit-generator';

// ============================================================================
// SARIF Types
// ============================================================================

interface SARIFReport {
  $schema: string;
  version: string;
  runs: SARIFRun[];
}

interface SARIFRun {
  tool: {
    driver: {
      name: string;
      version: string;
      informationUri: string;
      rules: SARIFRule[];
    };
  };
  results: SARIFResult[];
}

interface SARIFRule {
  id: string;
  name: string;
  shortDescription: { text: string };
  fullDescription?: { text: string };
  helpUri?: string;
  defaultConfiguration: {
    level: 'none' | 'note' | 'warning' | 'error';
  };
}

interface SARIFResult {
  ruleId: string;
  level: 'none' | 'note' | 'warning' | 'error';
  message: { text: string };
  locations: Array<{
    physicalLocation: {
      artifactLocation: { uri: string };
      region: {
        startLine: number;
        startColumn?: number;
        endLine?: number;
        endColumn?: number;
      };
    };
  }>;
  fixes?: Array<{
    description: { text: string };
    artifactChanges: Array<{
      artifactLocation: { uri: string };
      replacements: Array<{
        deletedRegion: {
          startLine: number;
          startColumn?: number;
          endLine?: number;
          endColumn?: number;
        };
        insertedContent: { text: string };
      }>;
    }>;
  }>;
}

// ============================================================================
// GitLab Code Quality Types
// ============================================================================

interface GitLabCodeQualityIssue {
  type: 'issue';
  check_name: string;
  description: string;
  content: { body: string };
  categories: string[];
  severity: 'blocker' | 'critical' | 'major' | 'minor' | 'info';
  fingerprint: string;
  location: {
    path: string;
    lines: {
      begin: number;
      end?: number;
    };
  };
}

// ============================================================================
// CI/CD Provider Implementation
// ============================================================================

export class CICDProvider implements IProviderAdapter {
  readonly type = 'cicd' as const;

  async generateOutput(
    report: FixReport,
    issues: FixReportIssue[],
    options?: ProviderOptions
  ): Promise<CICDProviderOutput> {
    const universalData = buildUniversalFixData(report, issues);

    // Calculate recommended exit code
    const blockingIssueCount = issues.filter(
      i => (i.severity === 'critical' || i.severity === 'high') && !i.isIntentionalUse
    ).length;

    const recommendedExitCode = blockingIssueCount > 0 ? 1 : 0;

    // Generate GitHub annotations
    const githubAnnotations = this.generateGithubAnnotations(issues);

    // Generate output files if directory provided
    let sarifPath: string | undefined;
    let gitlabCodeQualityPath: string | undefined;

    if (options?.outputDir) {
      sarifPath = await this.writeSARIFReport(issues, options.outputDir);
      gitlabCodeQualityPath = await this.writeGitLabCodeQuality(issues, options.outputDir);
    }

    return {
      type: 'cicd',
      data: universalData,
      outputs: {
        sarifPath,
        gitlabCodeQualityPath,
        recommendedExitCode,
        blockingIssueCount,
      },
      githubAnnotations,
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
        message: `Prepared ${selectedIssues.length} fixes for CI/CD in ${commits.length} commit(s)`,
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
  // SARIF Report Generation
  // ==========================================================================

  private async writeSARIFReport(issues: FixReportIssue[], outputDir: string): Promise<string> {
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Build rules from unique rule IDs
    const rulesMap = new Map<string, SARIFRule>();
    for (const issue of issues) {
      if (!rulesMap.has(issue.ruleId)) {
        rulesMap.set(issue.ruleId, {
          id: issue.ruleId,
          name: issue.ruleId,
          shortDescription: { text: issue.message.substring(0, 200) },
          helpUri: this.getRuleDocUrl(issue.tool, issue.ruleId),
          defaultConfiguration: {
            level: this.mapSeverityToSARIF(issue.severity),
          },
        });
      }
    }

    // Build results
    const results: SARIFResult[] = issues.map(issue => {
      const result: SARIFResult = {
        ruleId: issue.ruleId,
        level: this.mapSeverityToSARIF(issue.severity),
        message: { text: issue.message },
        locations: [
          {
            physicalLocation: {
              artifactLocation: { uri: issue.filePath },
              region: {
                startLine: issue.lineNumber,
                startColumn: issue.columnNumber,
                endLine: issue.endLine,
                endColumn: issue.endColumn,
              },
            },
          },
        ],
      };

      // Add fix if available
      if (issue.fixAvailable && issue.fixedCode) {
        result.fixes = [
          {
            description: { text: `Apply CodeQual fix for ${issue.ruleId}` },
            artifactChanges: [
              {
                artifactLocation: { uri: issue.filePath },
                replacements: [
                  {
                    deletedRegion: {
                      startLine: issue.lineNumber,
                      startColumn: issue.columnNumber || 1,
                      endLine: issue.endLine || issue.lineNumber,
                      endColumn: issue.endColumn || 1000,
                    },
                    insertedContent: { text: issue.fixedCode },
                  },
                ],
              },
            ],
          },
        ];
      }

      return result;
    });

    const sarifReport: SARIFReport = {
      $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
      version: '2.1.0',
      runs: [
        {
          tool: {
            driver: {
              name: 'CodeQual',
              version: '9.0.0',
              informationUri: 'https://codequal.dev',
              rules: Array.from(rulesMap.values()),
            },
          },
          results,
        },
      ],
    };

    const filePath = path.join(outputDir, 'codequal-sarif-report.json');
    fs.writeFileSync(filePath, JSON.stringify(sarifReport, null, 2), 'utf-8');

    return filePath;
  }

  // ==========================================================================
  // GitLab Code Quality Generation
  // ==========================================================================

  private async writeGitLabCodeQuality(
    issues: FixReportIssue[],
    outputDir: string
  ): Promise<string> {
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const gitlabIssues: GitLabCodeQualityIssue[] = issues.map(issue => ({
      type: 'issue',
      check_name: `${issue.tool}/${issue.ruleId}`,
      description: issue.message,
      content: {
        body: issue.description || issue.message,
      },
      categories: [issue.category],
      severity: this.mapSeverityToGitLab(issue.severity),
      fingerprint: this.generateFingerprint(issue),
      location: {
        path: issue.filePath,
        lines: {
          begin: issue.lineNumber,
          end: issue.endLine,
        },
      },
    }));

    const filePath = path.join(outputDir, 'codequal-gitlab-codequality.json');
    fs.writeFileSync(filePath, JSON.stringify(gitlabIssues, null, 2), 'utf-8');

    return filePath;
  }

  // ==========================================================================
  // GitHub Annotations
  // ==========================================================================

  private generateGithubAnnotations(issues: FixReportIssue[]): GithubAnnotation[] {
    return issues.slice(0, 50).map(issue => ({
      path: issue.filePath,
      start_line: issue.lineNumber,
      end_line: issue.endLine || issue.lineNumber,
      annotation_level: this.mapSeverityToGithubLevel(issue.severity),
      message: issue.message,
      title: `${issue.tool}: ${issue.ruleId}`,
    }));
  }

  // ==========================================================================
  // Helpers
  // ==========================================================================

  private mapSeverityToSARIF(severity: IssueSeverity): 'none' | 'note' | 'warning' | 'error' {
    switch (severity) {
      case 'critical':
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
      case 'info':
        return 'note';
      default:
        return 'warning';
    }
  }

  private mapSeverityToGitLab(
    severity: IssueSeverity
  ): 'blocker' | 'critical' | 'major' | 'minor' | 'info' {
    switch (severity) {
      case 'critical':
        return 'blocker';
      case 'high':
        return 'critical';
      case 'medium':
        return 'major';
      case 'low':
        return 'minor';
      case 'info':
        return 'info';
      default:
        return 'minor';
    }
  }

  private mapSeverityToGithubLevel(severity: IssueSeverity): 'warning' | 'error' | 'notice' {
    switch (severity) {
      case 'critical':
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
      case 'info':
        return 'notice';
      default:
        return 'warning';
    }
  }

  private getRuleDocUrl(tool: string, ruleId: string): string | undefined {
    switch (tool.toLowerCase()) {
      case 'semgrep':
        return `https://semgrep.dev/r/${ruleId}`;
      case 'eslint':
        return `https://eslint.org/docs/rules/${ruleId}`;
      case 'pmd':
        return `https://pmd.github.io/pmd/rules/java/`;
      case 'checkstyle':
        return `https://checkstyle.org/checks/`;
      default:
        return undefined;
    }
  }

  private generateFingerprint(issue: FixReportIssue): string {
    const data = `${issue.filePath}:${issue.lineNumber}:${issue.ruleId}:${issue.tool}`;
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(16, '0');
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

  private extractRepoName(url: string): string {
    const match = url.match(/[/:]([^/]+\/[^/.]+)(?:\.git)?$/);
    return match ? match[1] : 'repository';
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createCICDProvider(): CICDProvider {
  return new CICDProvider();
}
