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

    // Footer
    lines.push('---');
    lines.push(`*Generated by ${brandName} at ${report.metadata.generatedAt}*`);

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

  <div class="footer">
    Generated by ${brandName} v${report.metadata.toolVersion}
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
