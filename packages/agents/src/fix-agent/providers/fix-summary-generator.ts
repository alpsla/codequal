/**
 * Fix Summary Report Generator
 *
 * Generates user-facing summary reports showing what was fixed,
 * what needs manual review, and actionable guidance for non-autofixable issues.
 *
 * Output formats:
 * - Markdown: For PR comments, documentation, and human reading
 * - JSON: For programmatic access and CI/CD integration
 * - HTML: For web dashboards and email reports
 */

import * as fs from 'fs';
import * as path from 'path';
import { FixReportIssue, IssueSeverity, IssueCategory, FixSource } from '../types/fix-report-types';

// ============================================================================
// Types
// ============================================================================

export interface FixSummaryConfig {
  includeCodeSnippets?: boolean;
  includeActionableGuidance?: boolean;
  maxIssuesPerCategory?: number;
  groupByFile?: boolean;
  includeTimeEstimates?: boolean;
  branding?: {
    name?: string;
    logo?: string;
    color?: string;
  };
}

export interface FixSummaryStats {
  total: number;
  autoFixed: number;
  manualReview: number;
  intentionalUse: number;
  bySeverity: Record<IssueSeverity, { total: number; fixed: number; manual: number }>;
  byCategory: Record<IssueCategory, { total: number; fixed: number; manual: number }>;
  byTool: Record<string, { total: number; fixed: number }>;
  fixRate: number;
  estimatedTimeToFixManual: string;
}

export interface ManualReviewGuidance {
  ruleId: string;
  category: IssueCategory;
  severity: IssueSeverity;
  count: number;
  reason: string;
  recommendation: string;
  quickFixCommand?: string;
  documentation?: string;
  priority: 'high' | 'medium' | 'low';
}

export interface CodeQualFixOptions {
  selectionModes: {
    mode: string;
    command: string;
    description: string;
  }[];
  commitStyles: {
    style: string;
    command: string;
    description: string;
  }[];
  approvalOptions: {
    option: string;
    command: string;
    description: string;
  }[];
  quickStart: {
    step: number;
    action: string;
    command: string;
  }[];
}

export interface FixSummaryReport {
  metadata: {
    repository?: string;
    prNumber?: number;
    branch?: string;
    generatedAt: string;
    toolVersion: string;
  };
  stats: FixSummaryStats;
  autoFixedIssues: FixReportIssue[];
  manualReviewIssues: FixReportIssue[];
  intentionalUseIssues: FixReportIssue[];
  guidance: ManualReviewGuidance[];
  fixOptions?: CodeQualFixOptions;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: Required<FixSummaryConfig> = {
  includeCodeSnippets: true,
  includeActionableGuidance: true,
  maxIssuesPerCategory: 10,
  groupByFile: true,
  includeTimeEstimates: true,
  branding: {
    name: 'CodeQual',
    logo: '',
    color: '#4F46E5',
  },
};

// ============================================================================
// Fix Summary Generator Class
// ============================================================================

export class FixSummaryGenerator {
  private config: Required<FixSummaryConfig>;

  constructor(config: FixSummaryConfig = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      branding: { ...DEFAULT_CONFIG.branding, ...config.branding },
    };
  }

  /**
   * Generate complete fix summary report
   */
  generate(issues: FixReportIssue[], metadata?: {
    repository?: string;
    prNumber?: number;
    branch?: string;
  }): FixSummaryReport {
    const autoFixed = issues.filter(i => i.fixAvailable && !i.isIntentionalUse);
    const manualReview = issues.filter(i => !i.fixAvailable && !i.isIntentionalUse);
    const intentional = issues.filter(i => i.isIntentionalUse);

    const stats = this.calculateStats(issues, autoFixed, manualReview, intentional);
    const guidance = this.generateGuidance(manualReview);

    // Generate fix options only when there are auto-fixable issues
    const fixOptions = autoFixed.length > 0 ? this.generateFixOptions(stats.autoFixed) : undefined;

    return {
      metadata: {
        repository: metadata?.repository,
        prNumber: metadata?.prNumber,
        branch: metadata?.branch,
        generatedAt: new Date().toISOString(),
        toolVersion: '9.0.0',
      },
      stats,
      autoFixedIssues: autoFixed,
      manualReviewIssues: manualReview,
      intentionalUseIssues: intentional,
      guidance,
      fixOptions,
    };
  }

  /**
   * Generate CodeQual fix options for programmatic access
   */
  private generateFixOptions(autoFixedCount: number): CodeQualFixOptions {
    return {
      selectionModes: [
        { mode: 'all', command: 'codequal fix --all', description: 'Apply all auto-fixes in one operation' },
        { mode: 'by_severity', command: 'codequal fix --severity high,critical', description: 'Fix only high/critical issues' },
        { mode: 'by_category', command: 'codequal fix --category security', description: 'Fix specific category (security, code_quality, etc.)' },
        { mode: 'by_file', command: 'codequal fix --file src/auth.ts', description: 'Fix issues in a specific file' },
        { mode: 'individual', command: 'codequal fix --issue <id>', description: 'Fix a single issue by ID' },
        { mode: 'interactive', command: 'codequal fix --review', description: 'Review and approve each fix individually' },
      ],
      commitStyles: [
        { style: 'single', command: 'codequal fix --all --commit single', description: 'Single commit with all fixes' },
        { style: 'grouped', command: 'codequal fix --all --commit grouped', description: 'Group commits by category (security, code_quality, etc.)' },
        { style: 'per-file', command: 'codequal fix --all --commit per-file', description: 'Separate commit per file' },
        { style: 'per-issue', command: 'codequal fix --all --commit per-issue', description: 'Separate commit per issue' },
      ],
      approvalOptions: [
        { option: 'dry-run', command: 'codequal fix --all --dry-run', description: 'Preview fixes without applying' },
        { option: 'no-commit', command: 'codequal fix --all --no-commit', description: 'Apply fixes to working directory without commit' },
        { option: 'approve', command: 'codequal fix --all --approve', description: 'Interactive approval for each fix' },
        { option: 'custom-message', command: `codequal fix --all --commit single --message "fix: apply ${autoFixedCount} fixes"`, description: 'Auto-approve with custom commit message' },
      ],
      quickStart: [
        { step: 1, action: 'Preview', command: 'codequal fix --severity high,critical --dry-run' },
        { step: 2, action: 'Apply', command: 'codequal fix --severity high,critical --approve' },
      ],
    };
  }

  /**
   * Generate Markdown report for PR comments
   */
  generateMarkdown(issues: FixReportIssue[], metadata?: {
    repository?: string;
    prNumber?: number;
    branch?: string;
  }): string {
    const report = this.generate(issues, metadata);
    const { stats, guidance } = report;

    const lines: string[] = [];
    const brandName = this.config.branding.name;

    // Header
    lines.push(`# ${brandName} Analysis Summary`);
    lines.push('');

    // Quick Stats
    lines.push('## Overview');
    lines.push('');
    lines.push(`| Metric | Count |`);
    lines.push(`|--------|-------|`);
    lines.push(`| Total Issues | ${stats.total} |`);
    lines.push(`| Auto-Fixed | ${stats.autoFixed} (${(stats.fixRate * 100).toFixed(1)}%) |`);
    lines.push(`| Manual Review | ${stats.manualReview} |`);
    lines.push(`| Intentional Code | ${stats.intentionalUse} |`);
    lines.push('');

    // Auto-Fixed Summary
    if (stats.autoFixed > 0) {
      lines.push('## Auto-Fixed Issues');
      lines.push('');
      lines.push('The following issues were automatically fixed:');
      lines.push('');

      // Group by category
      const byCategory = this.groupByCategory(report.autoFixedIssues);
      for (const [category, categoryIssues] of Object.entries(byCategory)) {
        lines.push(`### ${this.formatCategory(category as IssueCategory)} (${categoryIssues.length})`);
        lines.push('');

        const limitedIssues = categoryIssues.slice(0, this.config.maxIssuesPerCategory);
        for (const issue of limitedIssues) {
          lines.push(`- ${this.formatSeverityEmoji(issue.severity)} \`${issue.filePath}:${issue.lineNumber}\` - ${issue.message.substring(0, 80)}${issue.message.length > 80 ? '...' : ''}`);
        }

        if (categoryIssues.length > this.config.maxIssuesPerCategory) {
          lines.push(`- ... and ${categoryIssues.length - this.config.maxIssuesPerCategory} more`);
        }
        lines.push('');
      }
    }

    // Manual Review Section
    if (stats.manualReview > 0) {
      lines.push('## Manual Review Required');
      lines.push('');
      lines.push(`The following ${stats.manualReview} issues require manual attention:`);
      lines.push('');

      if (this.config.includeTimeEstimates) {
        lines.push(`> Estimated time to resolve: ${stats.estimatedTimeToFixManual}`);
        lines.push('');
      }

      // Add guidance for each type
      if (this.config.includeActionableGuidance && guidance.length > 0) {
        for (const g of guidance) {
          lines.push(`### ${this.formatCategory(g.category)}: ${g.ruleId}`);
          lines.push('');
          lines.push(`**${g.count} issues** | Priority: ${g.priority.toUpperCase()}`);
          lines.push('');
          lines.push(`**Why not auto-fixable:** ${g.reason}`);
          lines.push('');
          lines.push(`**Recommendation:** ${g.recommendation}`);

          if (g.quickFixCommand) {
            lines.push('');
            lines.push('**Quick fix command:**');
            lines.push('```bash');
            lines.push(g.quickFixCommand);
            lines.push('```');
          }

          if (g.documentation) {
            lines.push('');
            lines.push(`**Documentation:** ${g.documentation}`);
          }
          lines.push('');
        }
      }
    }

    // Intentional Code Section
    if (stats.intentionalUse > 0) {
      lines.push('## Intentional Code (Security Review)');
      lines.push('');
      lines.push(`${stats.intentionalUse} code patterns were identified as intentional usage:`);
      lines.push('');
      lines.push('> These are typically legitimate use cases but should be reviewed');
      lines.push('> for security compliance if required by your organization.');
      lines.push('');

      const intentionalByFile = this.groupByFile(report.intentionalUseIssues);
      for (const [file, fileIssues] of Object.entries(intentionalByFile)) {
        lines.push(`- \`${file}\` (${fileIssues.length} patterns)`);
      }
      lines.push('');
    }

    // Summary by Severity
    lines.push('## Issues by Severity');
    lines.push('');
    lines.push('| Severity | Total | Fixed | Manual |');
    lines.push('|----------|-------|-------|--------|');
    for (const sev of ['critical', 'high', 'medium', 'low', 'info'] as IssueSeverity[]) {
      const s = stats.bySeverity[sev];
      if (s && s.total > 0) {
        lines.push(`| ${this.formatSeverityEmoji(sev)} ${sev} | ${s.total} | ${s.fixed} | ${s.manual} |`);
      }
    }
    lines.push('');

    // CodeQual PRO Auto-Fix Section (only for PRO tier with auto-fixable issues)
    if (stats.autoFixed > 0) {
      lines.push('## 🚀 CodeQual PRO Auto-Fix Options');
      lines.push('');
      lines.push(`You have **${stats.autoFixed} auto-fixable issues**. CodeQual can apply these fixes automatically:`);
      lines.push('');
      lines.push('### Fix Selection Options');
      lines.push('');
      lines.push('| Option | Command | Description |');
      lines.push('|--------|---------|-------------|');
      lines.push('| **Fix All** | `codequal fix --all` | Apply all auto-fixes in one operation |');
      lines.push('| **By Severity** | `codequal fix --severity high,critical` | Fix only high/critical issues |');
      lines.push('| **By Category** | `codequal fix --category security` | Fix specific category (security, code_quality, etc.) |');
      lines.push('| **By File** | `codequal fix --file src/auth.ts` | Fix issues in a specific file |');
      lines.push('| **Individual** | `codequal fix --issue <id>` | Fix a single issue by ID |');
      lines.push('| **Interactive** | `codequal fix --review` | Review and approve each fix individually |');
      lines.push('');
      lines.push('### Commit Options');
      lines.push('');
      lines.push('After selecting fixes, choose how to commit changes:');
      lines.push('');
      lines.push('```bash');
      lines.push('# Single commit with all fixes');
      lines.push('codequal fix --all --commit single');
      lines.push('');
      lines.push('# Group commits by category (security, code_quality, etc.)');
      lines.push('codequal fix --all --commit grouped');
      lines.push('');
      lines.push('# Separate commit per file');
      lines.push('codequal fix --all --commit per-file');
      lines.push('');
      lines.push('# Separate commit per issue');
      lines.push('codequal fix --all --commit per-issue');
      lines.push('```');
      lines.push('');
      lines.push('### Approval Workflow');
      lines.push('');
      lines.push('CodeQual supports approval before committing:');
      lines.push('');
      lines.push('```bash');
      lines.push('# Preview fixes without applying (dry run)');
      lines.push('codequal fix --all --dry-run');
      lines.push('');
      lines.push('# Apply fixes to working directory (no commit)');
      lines.push('codequal fix --all --no-commit');
      lines.push('');
      lines.push('# Interactive approval for each fix');
      lines.push('codequal fix --all --approve');
      lines.push('');
      lines.push('# Auto-approve and commit with custom message');
      lines.push(`codequal fix --all --commit single --message "fix: apply ${stats.autoFixed} security fixes"`);
      lines.push('```');
      lines.push('');
      lines.push('### Quick Start');
      lines.push('');
      lines.push('```bash');
      lines.push('# Recommended: Preview first, then apply');
      lines.push('codequal fix --severity high,critical --dry-run   # Preview');
      lines.push('codequal fix --severity high,critical --approve   # Apply with approval');
      lines.push('```');
      lines.push('');
    }

    // Footer
    lines.push('---');
    lines.push(`*Generated by ${brandName} PRO at ${report.metadata.generatedAt}*`);

    return lines.join('\n');
  }

  /**
   * Generate JSON report for programmatic access
   */
  generateJSON(issues: FixReportIssue[], metadata?: {
    repository?: string;
    prNumber?: number;
    branch?: string;
  }): string {
    const report = this.generate(issues, metadata);
    return JSON.stringify(report, null, 2);
  }

  /**
   * Generate HTML report for web/email
   */
  generateHTML(issues: FixReportIssue[], metadata?: {
    repository?: string;
    prNumber?: number;
    branch?: string;
  }): string {
    const report = this.generate(issues, metadata);
    const { stats, guidance } = report;
    const brandColor = this.config.branding.color;
    const brandName = this.config.branding.name;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${brandName} Fix Summary Report</title>
  <style>
    :root {
      --brand-color: ${brandColor};
      --success-color: #10B981;
      --warning-color: #F59E0B;
      --error-color: #EF4444;
      --info-color: #3B82F6;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      line-height: 1.6;
      color: #1F2937;
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
      background: #F9FAFB;
    }
    .header {
      background: var(--brand-color);
      color: white;
      padding: 2rem;
      border-radius: 12px;
      margin-bottom: 2rem;
    }
    .header h1 { margin: 0 0 0.5rem 0; }
    .header .meta { opacity: 0.9; font-size: 0.9rem; }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .stat-card {
      background: white;
      padding: 1.5rem;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .stat-card .value {
      font-size: 2.5rem;
      font-weight: bold;
      color: var(--brand-color);
    }
    .stat-card .label { color: #6B7280; font-size: 0.9rem; }
    .stat-card.success .value { color: var(--success-color); }
    .stat-card.warning .value { color: var(--warning-color); }
    .stat-card.info .value { color: var(--info-color); }
    .section {
      background: white;
      padding: 1.5rem;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      margin-bottom: 1.5rem;
    }
    .section h2 {
      margin-top: 0;
      padding-bottom: 0.5rem;
      border-bottom: 2px solid #E5E7EB;
    }
    .guidance-card {
      background: #F3F4F6;
      padding: 1rem;
      border-radius: 6px;
      margin-bottom: 1rem;
      border-left: 4px solid var(--warning-color);
    }
    .guidance-card.high { border-left-color: var(--error-color); }
    .guidance-card.low { border-left-color: var(--info-color); }
    .guidance-card h3 { margin: 0 0 0.5rem 0; }
    .badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
    }
    .badge-critical { background: #FEE2E2; color: #991B1B; }
    .badge-high { background: #FFEDD5; color: #9A3412; }
    .badge-medium { background: #FEF3C7; color: #92400E; }
    .badge-low { background: #DBEAFE; color: #1E40AF; }
    .badge-info { background: #E0E7FF; color: #3730A3; }
    code {
      background: #1F2937;
      color: #F9FAFB;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      display: block;
      overflow-x: auto;
      font-family: 'Fira Code', 'Monaco', monospace;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      padding: 0.75rem;
      text-align: left;
      border-bottom: 1px solid #E5E7EB;
    }
    th { background: #F9FAFB; font-weight: 600; }
    .progress-bar {
      height: 8px;
      background: #E5E7EB;
      border-radius: 4px;
      overflow: hidden;
    }
    .progress-bar .fill {
      height: 100%;
      background: var(--success-color);
      transition: width 0.3s;
    }
    .footer {
      text-align: center;
      color: #6B7280;
      font-size: 0.875rem;
      padding: 2rem 0;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${brandName} Analysis Summary</h1>
    <div class="meta">
      ${metadata?.repository ? `Repository: ${metadata.repository}` : ''}
      ${metadata?.prNumber ? ` | PR #${metadata.prNumber}` : ''}
      | Generated: ${new Date(report.metadata.generatedAt).toLocaleString()}
    </div>
  </div>

  <div class="stats-grid">
    <div class="stat-card">
      <div class="value">${stats.total}</div>
      <div class="label">Total Issues</div>
    </div>
    <div class="stat-card success">
      <div class="value">${stats.autoFixed}</div>
      <div class="label">Auto-Fixed</div>
    </div>
    <div class="stat-card warning">
      <div class="value">${stats.manualReview}</div>
      <div class="label">Manual Review</div>
    </div>
    <div class="stat-card info">
      <div class="value">${(stats.fixRate * 100).toFixed(0)}%</div>
      <div class="label">Fix Rate</div>
    </div>
  </div>

  <div class="section">
    <h2>Fix Progress</h2>
    <div class="progress-bar">
      <div class="fill" style="width: ${stats.fixRate * 100}%"></div>
    </div>
    <p style="margin-top: 0.5rem; color: #6B7280;">
      ${stats.autoFixed} of ${stats.total - stats.intentionalUse} fixable issues resolved automatically
    </p>
  </div>

  ${guidance.length > 0 ? `
  <div class="section">
    <h2>Manual Review Guidance</h2>
    ${guidance.map(g => `
    <div class="guidance-card ${g.priority}">
      <h3>${g.ruleId}</h3>
      <span class="badge badge-${g.severity}">${g.severity}</span>
      <span style="margin-left: 0.5rem; color: #6B7280;">${g.count} issues</span>
      <p><strong>Why:</strong> ${g.reason}</p>
      <p><strong>Recommendation:</strong> ${g.recommendation}</p>
      ${g.quickFixCommand ? `<code>${g.quickFixCommand}</code>` : ''}
    </div>
    `).join('')}
  </div>
  ` : ''}

  <div class="section">
    <h2>Issues by Severity</h2>
    <table>
      <thead>
        <tr>
          <th>Severity</th>
          <th>Total</th>
          <th>Fixed</th>
          <th>Manual</th>
        </tr>
      </thead>
      <tbody>
        ${(['critical', 'high', 'medium', 'low', 'info'] as IssueSeverity[])
          .filter(s => stats.bySeverity[s]?.total > 0)
          .map(s => `
        <tr>
          <td><span class="badge badge-${s}">${s}</span></td>
          <td>${stats.bySeverity[s].total}</td>
          <td>${stats.bySeverity[s].fixed}</td>
          <td>${stats.bySeverity[s].manual}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  ${stats.autoFixed > 0 ? `
  <div class="section">
    <h2>🚀 CodeQual PRO Auto-Fix</h2>
    <p>You have <strong>${stats.autoFixed} auto-fixable issues</strong>. Choose how to apply fixes:</p>

    <style>
      .fix-actions {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 1rem;
        margin: 1.5rem 0;
      }
      .fix-card {
        background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
        border: 2px solid #e2e8f0;
        border-radius: 12px;
        padding: 1.25rem;
        transition: all 0.2s ease;
        cursor: pointer;
      }
      .fix-card:hover {
        border-color: var(--brand-color);
        box-shadow: 0 4px 12px rgba(79, 70, 229, 0.15);
        transform: translateY(-2px);
      }
      .fix-card.primary {
        background: linear-gradient(135deg, var(--brand-color) 0%, #6366f1 100%);
        border-color: var(--brand-color);
        color: white;
      }
      .fix-card.primary:hover {
        box-shadow: 0 6px 20px rgba(79, 70, 229, 0.35);
      }
      .fix-card h4 {
        margin: 0 0 0.5rem 0;
        font-size: 1.1rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .fix-card p {
        margin: 0 0 1rem 0;
        font-size: 0.9rem;
        opacity: 0.9;
      }
      .fix-card .count {
        font-size: 1.5rem;
        font-weight: bold;
        margin-bottom: 0.25rem;
      }
      .fix-card.primary .count { color: white; }
      .fix-btn {
        display: inline-block;
        background: var(--brand-color);
        color: white;
        padding: 0.6rem 1.2rem;
        border-radius: 6px;
        text-decoration: none;
        font-weight: 600;
        font-size: 0.9rem;
        transition: all 0.2s;
        border: none;
        cursor: pointer;
      }
      .fix-btn:hover {
        background: #4338ca;
        transform: scale(1.02);
      }
      .fix-card.primary .fix-btn {
        background: white;
        color: var(--brand-color);
      }
      .fix-card.primary .fix-btn:hover {
        background: #f8fafc;
      }
      .commit-options {
        display: flex;
        gap: 0.75rem;
        flex-wrap: wrap;
        margin-top: 1.5rem;
        padding-top: 1.5rem;
        border-top: 1px solid #e2e8f0;
      }
      .commit-chip {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0.5rem 1rem;
        background: #f1f5f9;
        border: 1px solid #e2e8f0;
        border-radius: 20px;
        font-size: 0.85rem;
        cursor: pointer;
        transition: all 0.2s;
      }
      .commit-chip:hover {
        background: #e2e8f0;
        border-color: var(--brand-color);
      }
      .commit-chip.selected {
        background: var(--brand-color);
        color: white;
        border-color: var(--brand-color);
      }
      .advanced-toggle {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: #6b7280;
        font-size: 0.85rem;
        cursor: pointer;
        margin-top: 1.5rem;
        padding: 0.5rem 0;
      }
      .advanced-toggle:hover { color: var(--brand-color); }
      .advanced-content {
        display: none;
        margin-top: 1rem;
        padding: 1rem;
        background: #f8fafc;
        border-radius: 8px;
        font-size: 0.85rem;
      }
      .advanced-content.show { display: block; }
      /* Modal styles */
      .modal-overlay {
        display: none;
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.5);
        z-index: 1000;
        justify-content: center;
        align-items: center;
      }
      .modal-overlay.show { display: flex; }
      .modal {
        background: white;
        border-radius: 12px;
        padding: 2rem;
        max-width: 500px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 20px 40px rgba(0,0,0,0.2);
      }
      .modal h3 { margin: 0 0 1rem 0; }
      .modal-actions { display: flex; gap: 0.5rem; margin-top: 1.5rem; }
      .modal-btn {
        flex: 1;
        padding: 0.75rem 1rem;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
        border: none;
        transition: all 0.2s;
      }
      .modal-btn.primary {
        background: var(--brand-color);
        color: white;
      }
      .modal-btn.primary:hover { background: #4338ca; }
      .modal-btn.secondary {
        background: #f1f5f9;
        color: #374151;
      }
      .modal-btn.secondary:hover { background: #e2e8f0; }
      .progress-bar-modal {
        height: 6px;
        background: #e5e7eb;
        border-radius: 3px;
        margin: 1rem 0;
        overflow: hidden;
      }
      .progress-bar-modal .fill {
        height: 100%;
        background: var(--brand-color);
        width: 0%;
        transition: width 0.3s;
      }
      .status-message {
        padding: 0.75rem;
        border-radius: 6px;
        margin-top: 1rem;
        font-size: 0.9rem;
      }
      .status-message.success { background: #d1fae5; color: #065f46; }
      .status-message.error { background: #fee2e2; color: #991b1b; }
      .status-message.info { background: #dbeafe; color: #1e40af; }
      .copy-command {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        background: #1f2937;
        color: #f9fafb;
        padding: 0.75rem 1rem;
        border-radius: 6px;
        font-family: monospace;
        font-size: 0.85rem;
        margin: 1rem 0;
      }
      .copy-command code { flex: 1; }
      .copy-command button {
        background: #374151;
        color: white;
        border: none;
        padding: 0.4rem 0.8rem;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.75rem;
      }
      .copy-command button:hover { background: #4b5563; }
    </style>

    <div class="fix-actions">
      <div class="fix-card primary" onclick="codequalFix({mode:'all',commit:getCommitStyle()})">
        <h4>✨ Fix All Issues</h4>
        <div class="count">${stats.autoFixed}</div>
        <p>Apply all ${stats.autoFixed} auto-fixes and commit grouped by category</p>
        <button class="fix-btn">Fix All & Commit</button>
      </div>

      <div class="fix-card" onclick="codequalFix({mode:'severity',filter:'high,critical',commit:getCommitStyle()})">
        <h4>🔴 Critical & High Only</h4>
        <div class="count">${(stats.bySeverity.critical?.fixed || 0) + (stats.bySeverity.high?.fixed || 0)}</div>
        <p>Fix only critical and high severity issues first</p>
        <button class="fix-btn">Fix Critical & High</button>
      </div>

      <div class="fix-card" onclick="codequalFix({mode:'category',filter:'security',commit:getCommitStyle()})">
        <h4>🔒 Security Issues</h4>
        <div class="count">${stats.byCategory.security?.fixed || 0}</div>
        <p>Fix all security vulnerabilities</p>
        <button class="fix-btn">Fix Security</button>
      </div>

      <div class="fix-card" onclick="codequalFix({mode:'review'})">
        <h4>🔍 Review Each Fix</h4>
        <div class="count">${stats.autoFixed}</div>
        <p>Review and approve each fix individually before applying</p>
        <button class="fix-btn">Start Review</button>
      </div>
    </div>

    <div class="commit-options">
      <span style="font-weight:600;color:#374151;">Commit style:</span>
      <label class="commit-chip selected" onclick="selectCommitStyle(this, 'grouped')">
        📦 Grouped by category
      </label>
      <label class="commit-chip" onclick="selectCommitStyle(this, 'single')">
        📝 Single commit
      </label>
      <label class="commit-chip" onclick="selectCommitStyle(this, 'per-file')">
        📁 Per file
      </label>
    </div>

    <div class="advanced-toggle" onclick="this.nextElementSibling.classList.toggle('show')">
      <span>⚙️</span>
      <span>Show CLI Commands</span>
      <span style="font-size:0.7rem;">▼</span>
    </div>
    <div class="advanced-content">
      <p style="margin-top:0;color:#6b7280;">For advanced users who prefer command line:</p>
      <code style="font-size:0.8rem;">
# Fix all issues with grouped commits<br>
codequal fix --all --commit grouped<br><br>
# Fix only critical and high severity<br>
codequal fix --severity critical,high --commit single<br><br>
# Fix security issues only<br>
codequal fix --category security --commit single<br><br>
# Preview without applying (dry run)<br>
codequal fix --all --dry-run<br><br>
# Interactive review mode<br>
codequal fix --all --review
      </code>
      <p style="margin-bottom:0;margin-top:1rem;"><a href="https://docs.codequal.io/pro/auto-fix" style="color:var(--brand-color);">📚 Full CLI Documentation</a></p>
    </div>
  </div>

  <!-- Fix Modal -->
  <div id="fixModal" class="modal-overlay" onclick="if(event.target===this)closeModal()">
    <div class="modal">
      <h3 id="modalTitle">Applying Fixes...</h3>
      <div id="modalContent">
        <div class="progress-bar-modal"><div class="fill" id="modalProgress"></div></div>
        <p id="modalStatus">Preparing to apply fixes...</p>
      </div>
      <div id="modalActions" class="modal-actions" style="display:none;">
        <button class="modal-btn secondary" onclick="closeModal()">Close</button>
        <button class="modal-btn primary" id="modalConfirm" onclick="confirmFix()">Apply Fixes</button>
      </div>
    </div>
  </div>

  <script>
    // State
    let currentCommitStyle = 'grouped';
    let pendingFix = null;
    const manifestPath = '${metadata?.repository ? `codequal-pr-${metadata.prNumber || ''}-manifest.json` : 'manifest.json'}';
    const apiBase = window.CODEQUAL_API_URL || '/api/v1';

    // Commit style selection
    function selectCommitStyle(el, style) {
      document.querySelectorAll('.commit-chip').forEach(c => c.classList.remove('selected'));
      el.classList.add('selected');
      currentCommitStyle = style;
    }

    function getCommitStyle() {
      return currentCommitStyle;
    }

    // Modal functions
    function showModal(title, content, showActions = false) {
      document.getElementById('modalTitle').textContent = title;
      document.getElementById('modalContent').innerHTML = content;
      document.getElementById('modalActions').style.display = showActions ? 'flex' : 'none';
      document.getElementById('fixModal').classList.add('show');
    }

    function closeModal() {
      document.getElementById('fixModal').classList.remove('show');
      pendingFix = null;
    }

    function updateProgress(percent, status) {
      document.getElementById('modalProgress').style.width = percent + '%';
      document.getElementById('modalStatus').textContent = status;
    }

    // Build CLI command
    function buildCommand(options) {
      let cmd = 'codequal fix';
      if (options.mode === 'all') {
        cmd += ' --all';
      } else if (options.mode === 'severity') {
        cmd += ' --severity ' + options.filter;
      } else if (options.mode === 'category') {
        cmd += ' --category ' + options.filter;
      } else if (options.mode === 'review') {
        cmd += ' --all --review';
      }
      if (options.commit && options.mode !== 'review') {
        cmd += ' --commit ' + options.commit;
      }
      return cmd;
    }

    // Copy to clipboard
    async function copyCommand(cmd) {
      try {
        await navigator.clipboard.writeText(cmd);
        event.target.textContent = 'Copied!';
        setTimeout(() => { event.target.textContent = 'Copy'; }, 2000);
      } catch (err) {
        console.error('Copy failed:', err);
      }
    }

    // Main fix function
    async function codequalFix(options) {
      pendingFix = options;
      const cmd = buildCommand(options);

      // Check if we're in a web app context with API
      if (window.CODEQUAL_API_URL) {
        // Show confirmation modal
        showModal(
          'Apply Fixes?',
          \`<p>This will apply \${options.mode === 'all' ? '${stats.autoFixed}' : 'selected'} fixes to your codebase.</p>
          <p><strong>Mode:</strong> \${options.mode}</p>
          <p><strong>Commit style:</strong> \${options.commit || 'review each'}</p>
          <div class="status-message info">⚠️ Make sure you have committed or stashed any uncommitted changes before proceeding.</div>\`,
          true
        );
      } else {
        // Show CLI command modal for local use
        showModal(
          'Run This Command',
          \`<p>Copy and run this command in your terminal:</p>
          <div class="copy-command">
            <code>\${cmd}</code>
            <button onclick="copyCommand('\${cmd}')">Copy</button>
          </div>
          <p style="color:#6b7280;font-size:0.85rem;">Make sure you're in the repository root directory.</p>
          <div class="status-message info">
            <strong>💡 Tip:</strong> Add <code>--dry-run</code> to preview changes without applying them.
          </div>\`,
          false
        );
        document.getElementById('modalActions').innerHTML = \`
          <button class="modal-btn secondary" onclick="closeModal()">Close</button>
          <button class="modal-btn primary" onclick="copyCommand('\${cmd}');closeModal()">Copy & Close</button>
        \`;
        document.getElementById('modalActions').style.display = 'flex';
      }
    }

    // Confirm and execute fix via API
    async function confirmFix() {
      if (!pendingFix) return;

      const options = pendingFix;
      document.getElementById('modalActions').style.display = 'none';

      showModal(
        'Applying Fixes...',
        \`<div class="progress-bar-modal"><div class="fill" id="modalProgress" style="width:10%"></div></div>
        <p id="modalStatus">Connecting to CodeQual API...</p>\`
      );

      try {
        // Call the CodeQual API
        const response = await fetch(apiBase + '/fix/apply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            manifest: manifestPath,
            mode: options.mode,
            filter: options.filter,
            commitStyle: options.commit,
            repository: '${metadata?.repository || ''}',
            prNumber: ${metadata?.prNumber || 'null'}
          })
        });

        updateProgress(50, 'Processing fixes...');

        if (!response.ok) {
          throw new Error('API request failed: ' + response.statusText);
        }

        const result = await response.json();
        updateProgress(100, 'Complete!');

        setTimeout(() => {
          showModal(
            '✅ Fixes Applied!',
            \`<div class="status-message success">
              <strong>Success!</strong> Applied \${result.fixedCount || 'all'} fixes.
            </div>
            <p style="margin-top:1rem;"><strong>Commit:</strong> \${result.commitHash || 'N/A'}</p>
            <p><strong>Files modified:</strong> \${result.filesModified || 0}</p>
            \${result.prUrl ? \`<p><a href="\${result.prUrl}" target="_blank" style="color:var(--brand-color);">View Pull Request →</a></p>\` : ''}\`,
            false
          );
          document.getElementById('modalActions').innerHTML = '<button class="modal-btn primary" onclick="closeModal()">Done</button>';
          document.getElementById('modalActions').style.display = 'flex';
        }, 500);

      } catch (error) {
        showModal(
          '❌ Error',
          \`<div class="status-message error">
            <strong>Failed to apply fixes:</strong> \${error.message}
          </div>
          <p style="margin-top:1rem;">Try running the command manually:</p>
          <div class="copy-command">
            <code>\${buildCommand(options)}</code>
            <button onclick="copyCommand('\${buildCommand(options)}')">Copy</button>
          </div>\`,
          false
        );
        document.getElementById('modalActions').innerHTML = '<button class="modal-btn secondary" onclick="closeModal()">Close</button>';
        document.getElementById('modalActions').style.display = 'flex';
      }
    }

    // Expose for external use
    window.codequal = { fix: codequalFix };
  </script>
  ` : ''}

  <div class="footer">
    Generated by ${brandName} PRO v${report.metadata.toolVersion}
  </div>
</body>
</html>`;
  }

  /**
   * Write reports to files (all formats)
   */
  async writeReports(
    issues: FixReportIssue[],
    outputDir: string,
    basename = 'fix-summary',
    metadata?: { repository?: string; prNumber?: number; branch?: string }
  ): Promise<{ markdown: string; json: string; html: string }> {
    // Ensure directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const mdPath = path.join(outputDir, `${basename}.md`);
    const jsonPath = path.join(outputDir, `${basename}.json`);
    const htmlPath = path.join(outputDir, `${basename}.html`);

    fs.writeFileSync(mdPath, this.generateMarkdown(issues, metadata), 'utf-8');
    fs.writeFileSync(jsonPath, this.generateJSON(issues, metadata), 'utf-8');
    fs.writeFileSync(htmlPath, this.generateHTML(issues, metadata), 'utf-8');

    return { markdown: mdPath, json: jsonPath, html: htmlPath };
  }

  // ==========================================================================
  // Private Helpers
  // ==========================================================================

  private calculateStats(
    all: FixReportIssue[],
    autoFixed: FixReportIssue[],
    manualReview: FixReportIssue[],
    intentional: FixReportIssue[]
  ): FixSummaryStats {
    const bySeverity: Record<IssueSeverity, { total: number; fixed: number; manual: number }> = {
      critical: { total: 0, fixed: 0, manual: 0 },
      high: { total: 0, fixed: 0, manual: 0 },
      medium: { total: 0, fixed: 0, manual: 0 },
      low: { total: 0, fixed: 0, manual: 0 },
      info: { total: 0, fixed: 0, manual: 0 },
    };

    const byCategory: Record<IssueCategory, { total: number; fixed: number; manual: number }> = {
      security: { total: 0, fixed: 0, manual: 0 },
      code_quality: { total: 0, fixed: 0, manual: 0 },
      performance: { total: 0, fixed: 0, manual: 0 },
      architecture: { total: 0, fixed: 0, manual: 0 },
      dependency_vulnerability: { total: 0, fixed: 0, manual: 0 },
      code_style: { total: 0, fixed: 0, manual: 0 },
      best_practice: { total: 0, fixed: 0, manual: 0 },
      documentation: { total: 0, fixed: 0, manual: 0 },
    };

    const byTool: Record<string, { total: number; fixed: number }> = {};

    for (const issue of all) {
      // By severity
      if (bySeverity[issue.severity]) {
        bySeverity[issue.severity].total++;
        if (issue.fixAvailable && !issue.isIntentionalUse) {
          bySeverity[issue.severity].fixed++;
        } else if (!issue.isIntentionalUse) {
          bySeverity[issue.severity].manual++;
        }
      }

      // By category
      if (byCategory[issue.category]) {
        byCategory[issue.category].total++;
        if (issue.fixAvailable && !issue.isIntentionalUse) {
          byCategory[issue.category].fixed++;
        } else if (!issue.isIntentionalUse) {
          byCategory[issue.category].manual++;
        }
      }

      // By tool
      if (!byTool[issue.tool]) {
        byTool[issue.tool] = { total: 0, fixed: 0 };
      }
      byTool[issue.tool].total++;
      if (issue.fixAvailable) {
        byTool[issue.tool].fixed++;
      }
    }

    const fixableCount = all.length - intentional.length;
    const fixRate = fixableCount > 0 ? autoFixed.length / fixableCount : 1;

    return {
      total: all.length,
      autoFixed: autoFixed.length,
      manualReview: manualReview.length,
      intentionalUse: intentional.length,
      bySeverity,
      byCategory,
      byTool,
      fixRate,
      estimatedTimeToFixManual: this.estimateTime(manualReview),
    };
  }

  private generateGuidance(manualIssues: FixReportIssue[]): ManualReviewGuidance[] {
    // Group by rule
    const byRule = new Map<string, FixReportIssue[]>();
    for (const issue of manualIssues) {
      const key = issue.ruleId;
      if (!byRule.has(key)) {
        byRule.set(key, []);
      }
      byRule.get(key)!.push(issue);
    }

    const guidance: ManualReviewGuidance[] = [];

    for (const entry of Array.from(byRule.entries())) {
      const [ruleId, issues] = entry;
      const first = issues[0];
      const g = this.getGuidanceForRule(ruleId, first.tool, first.category, first.severity, issues.length);
      if (g) {
        guidance.push(g);
      }
    }

    // Sort by priority
    return guidance.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  private getGuidanceForRule(
    ruleId: string,
    tool: string,
    category: IssueCategory,
    severity: IssueSeverity,
    count: number
  ): ManualReviewGuidance {
    // Common guidance patterns
    const guidanceMap: Record<string, Partial<ManualReviewGuidance>> = {
      'ts-unused-exports/unused-export': {
        reason: 'Removing unused exports requires semantic analysis to verify they are not used by external consumers',
        recommendation: 'Review each export manually. For internal modules, remove unused exports. For public API modules, keep exports for documentation.',
        quickFixCommand: 'npx ts-unused-exports tsconfig.json --showLineNumber',
        documentation: 'https://github.com/pzavolinsky/ts-unused-exports',
        priority: 'low',
      },
      'typescript/TS6306': {
        reason: 'TypeScript project reference configuration requires understanding of build dependencies',
        recommendation: 'Check tsconfig.json references array and verify each referenced path exists. Add "composite": true to referenced packages.',
        priority: 'high',
      },
      'madge/circular-dependency': {
        reason: 'Circular dependencies require architectural refactoring with multiple valid solutions',
        recommendation: 'Create interface abstractions, use dependency injection, or restructure modules to break the cycle.',
        quickFixCommand: 'npx madge --circular --image circular.svg src/',
        documentation: 'https://github.com/pahen/madge',
        priority: 'medium',
      },
    };

    const specific = guidanceMap[ruleId] || {};

    return {
      ruleId,
      category,
      severity,
      count,
      reason: specific.reason || this.getDefaultReason(category),
      recommendation: specific.recommendation || this.getDefaultRecommendation(category),
      quickFixCommand: specific.quickFixCommand,
      documentation: specific.documentation || this.getDocUrl(tool, ruleId),
      priority: specific.priority || this.getPriority(severity),
    };
  }

  private getDefaultReason(category: IssueCategory): string {
    const reasons: Record<IssueCategory, string> = {
      security: 'Security issues often require context-aware fixes and manual verification',
      code_quality: 'Code quality improvements may have multiple valid implementations',
      performance: 'Performance optimizations require profiling and measurement',
      architecture: 'Architectural changes require design decisions',
      dependency_vulnerability: 'Dependency updates may have breaking changes',
      code_style: 'Style choices may conflict with project conventions',
      best_practice: 'Best practices may not apply to all contexts',
      documentation: 'Documentation requires domain knowledge',
    };
    return reasons[category] || 'Automated fix not available for this issue type';
  }

  private getDefaultRecommendation(category: IssueCategory): string {
    const recs: Record<IssueCategory, string> = {
      security: 'Review the security context and apply appropriate fixes based on your threat model',
      code_quality: 'Consider refactoring during regular code maintenance',
      performance: 'Profile before and after to verify improvements',
      architecture: 'Plan refactoring as part of a dedicated sprint',
      dependency_vulnerability: 'Test dependency updates in isolation before merging',
      code_style: 'Update linting configuration if style conflicts persist',
      best_practice: 'Evaluate if the best practice applies to your use case',
      documentation: 'Update documentation as part of feature completion',
    };
    return recs[category] || 'Review and fix manually';
  }

  private getDocUrl(tool: string, ruleId: string): string | undefined {
    const urls: Record<string, string> = {
      semgrep: `https://semgrep.dev/r/${ruleId}`,
      eslint: `https://eslint.org/docs/rules/${ruleId}`,
      'typescript-eslint': `https://typescript-eslint.io/rules/${ruleId}`,
      pmd: 'https://pmd.github.io/latest/pmd_rules_java.html',
      checkstyle: 'https://checkstyle.org/checks.html',
    };
    return urls[tool.toLowerCase()];
  }

  private getPriority(severity: IssueSeverity): 'high' | 'medium' | 'low' {
    switch (severity) {
      case 'critical':
      case 'high':
        return 'high';
      case 'medium':
        return 'medium';
      default:
        return 'low';
    }
  }

  private estimateTime(issues: FixReportIssue[]): string {
    // Rough estimates: 5 min for low/info, 15 min for medium, 30 min for high/critical
    let minutes = 0;
    for (const issue of issues) {
      switch (issue.severity) {
        case 'critical':
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
      const hours = Math.ceil(minutes / 60);
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    } else {
      const days = Math.ceil(minutes / 480);
      return `${days} day${days > 1 ? 's' : ''}`;
    }
  }

  private groupByCategory(issues: FixReportIssue[]): Record<string, FixReportIssue[]> {
    const result: Record<string, FixReportIssue[]> = {};
    for (const issue of issues) {
      if (!result[issue.category]) {
        result[issue.category] = [];
      }
      result[issue.category].push(issue);
    }
    return result;
  }

  private groupByFile(issues: FixReportIssue[]): Record<string, FixReportIssue[]> {
    const result: Record<string, FixReportIssue[]> = {};
    for (const issue of issues) {
      if (!result[issue.filePath]) {
        result[issue.filePath] = [];
      }
      result[issue.filePath].push(issue);
    }
    return result;
  }

  private formatCategory(category: IssueCategory): string {
    return category
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private formatSeverityEmoji(severity: IssueSeverity): string {
    const emojis: Record<IssueSeverity, string> = {
      critical: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '🔵',
      info: 'ℹ️',
    };
    return emojis[severity] || '⚪';
  }
}

// ============================================================================
// Factory and Convenience Functions
// ============================================================================

/**
 * Create a Fix Summary Generator instance
 */
export function createFixSummaryGenerator(config?: FixSummaryConfig): FixSummaryGenerator {
  return new FixSummaryGenerator(config);
}

/**
 * Generate markdown summary report
 */
export function generateFixSummaryMarkdown(
  issues: FixReportIssue[],
  config?: FixSummaryConfig,
  metadata?: { repository?: string; prNumber?: number; branch?: string }
): string {
  const generator = new FixSummaryGenerator(config);
  return generator.generateMarkdown(issues, metadata);
}

/**
 * Generate HTML summary report
 */
export function generateFixSummaryHTML(
  issues: FixReportIssue[],
  config?: FixSummaryConfig,
  metadata?: { repository?: string; prNumber?: number; branch?: string }
): string {
  const generator = new FixSummaryGenerator(config);
  return generator.generateHTML(issues, metadata);
}

/**
 * Generate JSON summary report
 */
export function generateFixSummaryJSON(
  issues: FixReportIssue[],
  config?: FixSummaryConfig,
  metadata?: { repository?: string; prNumber?: number; branch?: string }
): string {
  const generator = new FixSummaryGenerator(config);
  return generator.generateJSON(issues, metadata);
}
