#!/usr/bin/env ts-node
/**
 * Unified V9 Report Generator
 *
 * Generates comprehensive V9 analysis reports in a unified format for all providers:
 * - Web Dashboard
 * - API (JSON)
 * - CI/CD (SARIF for GitHub, GitLab Code Quality)
 * - IDE (LSP Code Actions)
 *
 * This script demonstrates how V9 analysis results can be consumed by any provider
 * using a single unified data structure.
 *
 * Usage:
 *   npx ts-node generate-unified-v9-report.ts <codeql-sarif-path> <output-dir>
 *
 * Example:
 *   npx ts-node generate-unified-v9-report.ts /tmp/codeql-security/results.sarif ./unified-reports
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// UNIFIED V9 REPORT DATA STRUCTURE
// ============================================================================

/**
 * Unified V9 Analysis Report
 * This is the canonical data structure that all providers consume
 */
interface UnifiedV9Report {
  // Metadata
  version: '9.0.0';
  generatedAt: string;
  queryPack: 'security' | 'security-extended';

  // Analysis context
  analysis: {
    repository: string;
    branch: string;
    prNumber?: number;
    language: string;
    analyzedFiles: number;
    analysisTimeMs: number;
  };

  // Summary statistics
  summary: {
    totalIssues: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    infoCount: number;
    autoFixableCount: number;
    manualReviewCount: number;
    intentionalUseCount: number;
  };

  // Grouped issues by category
  issuesByCategory: {
    security: UnifiedIssue[];
    codeQuality: UnifiedIssue[];
    performance: UnifiedIssue[];
    bestPractice: UnifiedIssue[];
    style: UnifiedIssue[];
  };

  // Issue groups (for batch operations)
  issueGroups: IssueGroup[];

  // Tools used in analysis
  toolsUsed: ToolInfo[];
}

interface UnifiedIssue {
  id: string;
  ruleId: string;
  tool: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: string;
  message: string;
  description?: string;

  // Location
  file: string;
  line: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
  codeSnippet?: string;

  // Fix information
  autoFixable: boolean;
  fixAvailable: boolean;
  fixCode?: string;
  fixExplanation?: string;
  fixConfidence?: number;

  // Additional context
  isIntentionalUse?: boolean;
  cweIds?: string[];
  owaspIds?: string[];
  helpUrl?: string;
}

interface IssueGroup {
  id: string;
  ruleId: string;
  tool: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: string;
  title: string;
  description: string;
  occurrences: number;
  autoFixable: boolean;
  issues: UnifiedIssue[];
}

interface ToolInfo {
  name: string;
  version: string;
  queryPack?: string;
  rulesUsed: number;
}

// ============================================================================
// SARIF PARSER
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
      rules?: SARIFRule[];
    };
  };
  results: SARIFResult[];
}

interface SARIFRule {
  id: string;
  name?: string;
  shortDescription?: { text: string };
  fullDescription?: { text: string };
  helpUri?: string;
  properties?: {
    tags?: string[];
    'security-severity'?: string;
    cwe?: string;
  };
}

interface SARIFResult {
  ruleId: string;
  ruleIndex?: number;
  level?: string;
  message: { text: string };
  locations?: Array<{
    physicalLocation?: {
      artifactLocation: { uri: string };
      region?: {
        startLine: number;
        startColumn?: number;
        endLine?: number;
        endColumn?: number;
        snippet?: { text: string };
      };
    };
  }>;
  fixes?: Array<{
    description?: { text: string };
    artifactChanges?: Array<{
      artifactLocation: { uri: string };
      replacements?: Array<{
        deletedRegion: { startLine: number; endLine?: number };
        insertedContent?: { text: string };
      }>;
    }>;
  }>;
}

function parseSARIF(sarifPath: string): SARIFReport {
  const content = fs.readFileSync(sarifPath, 'utf-8');
  return JSON.parse(content) as SARIFReport;
}

function mapSeverity(level: string | undefined, securitySeverity?: string): UnifiedIssue['severity'] {
  // If we have a security severity score, use that
  if (securitySeverity) {
    const score = parseFloat(securitySeverity);
    if (score >= 9.0) return 'critical';
    if (score >= 7.0) return 'high';
    if (score >= 4.0) return 'medium';
    if (score >= 0.1) return 'low';
    return 'info';
  }

  // Otherwise use the level
  switch (level) {
    case 'error':
      return 'high';
    case 'warning':
      return 'medium';
    case 'note':
      return 'low';
    default:
      return 'medium';
  }
}

function categorizeRule(ruleId: string, tags?: string[]): string {
  // Check tags first
  if (tags) {
    if (tags.includes('security') || tags.includes('vulnerability')) return 'security';
    if (tags.includes('performance')) return 'performance';
    if (tags.includes('maintainability')) return 'codeQuality';
    if (tags.includes('style')) return 'style';
  }

  // Fallback to rule ID patterns
  const lowerRuleId = ruleId.toLowerCase();
  if (lowerRuleId.includes('security') || lowerRuleId.includes('injection') ||
      lowerRuleId.includes('xss') || lowerRuleId.includes('csrf') ||
      lowerRuleId.includes('command') || lowerRuleId.includes('sql')) {
    return 'security';
  }
  if (lowerRuleId.includes('performance') || lowerRuleId.includes('memory')) {
    return 'performance';
  }
  if (lowerRuleId.includes('style') || lowerRuleId.includes('format')) {
    return 'style';
  }

  return 'codeQuality';
}

// ============================================================================
// UNIFIED REPORT GENERATOR
// ============================================================================

function convertSARIFToUnified(
  sarif: SARIFReport,
  queryPack: 'security' | 'security-extended',
  metadata: { repository: string; branch: string; prNumber?: number }
): UnifiedV9Report {
  const run = sarif.runs[0];
  const tool = run.tool.driver;
  const rulesMap = new Map<string, SARIFRule>();

  // Build rules map
  for (const rule of (tool.rules || [])) {
    rulesMap.set(rule.id, rule);
  }

  // Convert results to unified issues
  const issues: UnifiedIssue[] = [];
  const uniqueFiles = new Set<string>();

  for (const result of run.results) {
    const rule = rulesMap.get(result.ruleId);
    const location = result.locations?.[0]?.physicalLocation;

    if (location) {
      uniqueFiles.add(location.artifactLocation.uri);
    }

    const severity = mapSeverity(
      result.level,
      rule?.properties?.['security-severity']
    );
    const category = categorizeRule(result.ruleId, rule?.properties?.tags);

    // Check for fix
    const hasFix = result.fixes && result.fixes.length > 0;
    let fixCode: string | undefined;
    if (hasFix && result.fixes![0].artifactChanges?.[0].replacements?.[0]) {
      fixCode = result.fixes![0].artifactChanges![0].replacements![0].insertedContent?.text;
    }

    const issue: UnifiedIssue = {
      id: `${result.ruleId}-${location?.artifactLocation.uri || 'unknown'}-${location?.region?.startLine || 0}`,
      ruleId: result.ruleId,
      tool: tool.name,
      severity,
      category,
      message: result.message.text,
      description: rule?.fullDescription?.text || rule?.shortDescription?.text,

      file: location?.artifactLocation.uri || 'unknown',
      line: location?.region?.startLine || 0,
      column: location?.region?.startColumn,
      endLine: location?.region?.endLine,
      endColumn: location?.region?.endColumn,
      codeSnippet: location?.region?.snippet?.text,

      autoFixable: false, // CodeQL issues are Tier 3 (manual)
      fixAvailable: hasFix,
      fixCode,
      fixExplanation: result.fixes?.[0]?.description?.text,

      helpUrl: rule?.helpUri,
      cweIds: rule?.properties?.cwe ? [rule.properties.cwe] : undefined,
    };

    issues.push(issue);
  }

  // Calculate summary
  const summary = {
    totalIssues: issues.length,
    criticalCount: issues.filter(i => i.severity === 'critical').length,
    highCount: issues.filter(i => i.severity === 'high').length,
    mediumCount: issues.filter(i => i.severity === 'medium').length,
    lowCount: issues.filter(i => i.severity === 'low').length,
    infoCount: issues.filter(i => i.severity === 'info').length,
    autoFixableCount: issues.filter(i => i.autoFixable).length,
    manualReviewCount: issues.filter(i => !i.autoFixable).length,
    intentionalUseCount: issues.filter(i => i.isIntentionalUse).length,
  };

  // Group issues by category
  const issuesByCategory = {
    security: issues.filter(i => i.category === 'security'),
    codeQuality: issues.filter(i => i.category === 'codeQuality'),
    performance: issues.filter(i => i.category === 'performance'),
    bestPractice: issues.filter(i => i.category === 'bestPractice'),
    style: issues.filter(i => i.category === 'style'),
  };

  // Create issue groups
  const groupMap = new Map<string, IssueGroup>();
  for (const issue of issues) {
    const key = `${issue.ruleId}-${issue.severity}`;
    if (!groupMap.has(key)) {
      groupMap.set(key, {
        id: key,
        ruleId: issue.ruleId,
        tool: issue.tool,
        severity: issue.severity,
        category: issue.category,
        title: issue.ruleId,
        description: issue.description || issue.message,
        occurrences: 0,
        autoFixable: issue.autoFixable,
        issues: [],
      });
    }
    const group = groupMap.get(key)!;
    group.occurrences++;
    group.issues.push(issue);
  }

  // Sort groups by severity
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
  const issueGroups = Array.from(groupMap.values()).sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
  );

  return {
    version: '9.0.0',
    generatedAt: new Date().toISOString(),
    queryPack,

    analysis: {
      repository: metadata.repository,
      branch: metadata.branch,
      prNumber: metadata.prNumber,
      language: 'javascript/typescript',
      analyzedFiles: uniqueFiles.size,
      analysisTimeMs: 0, // Would be filled from actual analysis
    },

    summary,
    issuesByCategory,
    issueGroups,

    toolsUsed: [
      {
        name: tool.name,
        version: tool.version,
        queryPack,
        rulesUsed: tool.rules?.length || 0,
      },
    ],
  };
}

// ============================================================================
// OUTPUT GENERATORS FOR DIFFERENT PROVIDERS
// ============================================================================

function generateWebDashboardOutput(report: UnifiedV9Report): object {
  return {
    type: 'web-dashboard',
    version: report.version,
    generatedAt: report.generatedAt,

    // Summary cards
    summaryCards: [
      { label: 'Total Issues', value: report.summary.totalIssues, color: 'gray' },
      { label: 'Critical', value: report.summary.criticalCount, color: 'red' },
      { label: 'High', value: report.summary.highCount, color: 'orange' },
      { label: 'Medium', value: report.summary.mediumCount, color: 'yellow' },
      { label: 'Low', value: report.summary.lowCount, color: 'blue' },
      { label: 'Auto-Fixable', value: report.summary.autoFixableCount, color: 'green' },
    ],

    // Issue groups for interactive list
    issueGroups: report.issueGroups.map(g => ({
      id: g.id,
      title: g.title,
      severity: g.severity,
      count: g.occurrences,
      autoFixable: g.autoFixable,
      expanded: false,
    })),

    // Category breakdown for pie chart
    categoryBreakdown: Object.entries(report.issuesByCategory).map(([cat, issues]) => ({
      category: cat,
      count: issues.length,
    })).filter(c => c.count > 0),
  };
}

function generateAPIOutput(report: UnifiedV9Report): object {
  return {
    type: 'api-response',
    version: report.version,
    status: 'success',
    data: {
      analysis: report.analysis,
      summary: report.summary,
      issues: report.issueGroups.flatMap(g => g.issues),
      groups: report.issueGroups,
      pagination: {
        total: report.summary.totalIssues,
        page: 1,
        pageSize: report.summary.totalIssues,
        totalPages: 1,
      },
    },
    meta: {
      generatedAt: report.generatedAt,
      tools: report.toolsUsed,
    },
  };
}

function generateGitHubSARIF(report: UnifiedV9Report): object {
  const rules: SARIFRule[] = [];
  const rulesSet = new Set<string>();

  for (const group of report.issueGroups) {
    if (!rulesSet.has(group.ruleId)) {
      rulesSet.add(group.ruleId);
      rules.push({
        id: group.ruleId,
        name: group.title,
        shortDescription: { text: group.description.substring(0, 200) },
        properties: {
          tags: [group.category, group.severity],
        },
      });
    }
  }

  return {
    $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'CodeQual V9',
            version: report.version,
            informationUri: 'https://codequal.dev',
            rules,
          },
        },
        results: report.issueGroups.flatMap(g =>
          g.issues.map(issue => ({
            ruleId: issue.ruleId,
            level: issue.severity === 'critical' || issue.severity === 'high' ? 'error' :
                   issue.severity === 'medium' ? 'warning' : 'note',
            message: { text: issue.message },
            locations: [
              {
                physicalLocation: {
                  artifactLocation: { uri: issue.file },
                  region: {
                    startLine: issue.line,
                    startColumn: issue.column || 1,
                    endLine: issue.endLine || issue.line,
                    endColumn: issue.endColumn || 1000,
                  },
                },
              },
            ],
          }))
        ),
      },
    ],
  };
}

function generateGitLabCodeQuality(report: UnifiedV9Report): object[] {
  return report.issueGroups.flatMap(g =>
    g.issues.map(issue => ({
      description: issue.message,
      check_name: issue.ruleId,
      fingerprint: issue.id,
      severity: issue.severity === 'critical' ? 'blocker' :
                issue.severity === 'high' ? 'critical' :
                issue.severity === 'medium' ? 'major' :
                issue.severity === 'low' ? 'minor' : 'info',
      location: {
        path: issue.file,
        lines: {
          begin: issue.line,
          end: issue.endLine || issue.line,
        },
      },
      categories: [issue.category],
    }))
  );
}

function generateIDECodeActions(report: UnifiedV9Report): object {
  return {
    type: 'ide-code-actions',
    version: report.version,

    // Diagnostics for IDE
    diagnostics: report.issueGroups.flatMap(g =>
      g.issues.map(issue => ({
        range: {
          start: { line: issue.line - 1, character: (issue.column || 1) - 1 },
          end: { line: (issue.endLine || issue.line) - 1, character: (issue.endColumn || 1000) - 1 },
        },
        message: issue.message,
        severity: issue.severity === 'critical' || issue.severity === 'high' ? 1 :
                  issue.severity === 'medium' ? 2 : 3,
        source: 'CodeQual',
        code: issue.ruleId,
      }))
    ),

    // Code actions (quick fixes)
    codeActions: report.issueGroups
      .filter(g => g.issues.some(i => i.fixAvailable))
      .flatMap(g =>
        g.issues.filter(i => i.fixAvailable).map(issue => ({
          title: `Fix ${issue.ruleId}: ${issue.message.substring(0, 50)}...`,
          kind: 'quickfix',
          diagnostics: [issue.id],
          edit: {
            changes: {
              [issue.file]: [
                {
                  range: {
                    start: { line: issue.line - 1, character: (issue.column || 1) - 1 },
                    end: { line: (issue.endLine || issue.line) - 1, character: (issue.endColumn || 1000) - 1 },
                  },
                  newText: issue.fixCode || '',
                },
              ],
            },
          },
        }))
      ),
  };
}

function generateMarkdownReport(report: UnifiedV9Report): string {
  const lines: string[] = [];

  lines.push(`# CodeQual V9 Analysis Report`);
  lines.push('');
  lines.push(`**Generated:** ${report.generatedAt}`);
  lines.push(`**Repository:** ${report.analysis.repository}`);
  lines.push(`**Branch:** ${report.analysis.branch}`);
  lines.push(`**Query Pack:** ${report.queryPack}`);
  lines.push(`**Files Analyzed:** ${report.analysis.analyzedFiles}`);
  lines.push('');

  // Summary
  lines.push('## Summary');
  lines.push('');
  lines.push('| Severity | Count |');
  lines.push('|----------|-------|');
  lines.push(`| Critical | ${report.summary.criticalCount} |`);
  lines.push(`| High | ${report.summary.highCount} |`);
  lines.push(`| Medium | ${report.summary.mediumCount} |`);
  lines.push(`| Low | ${report.summary.lowCount} |`);
  lines.push(`| Info | ${report.summary.infoCount} |`);
  lines.push(`| **Total** | **${report.summary.totalIssues}** |`);
  lines.push('');

  // Fix Statistics
  lines.push('## Fix Statistics');
  lines.push('');
  lines.push(`- **Auto-Fixable:** ${report.summary.autoFixableCount}`);
  lines.push(`- **Manual Review Required:** ${report.summary.manualReviewCount}`);
  lines.push(`- **Intentional Use (Correctly Skipped):** ${report.summary.intentionalUseCount}`);
  lines.push('');

  // Issue Groups
  lines.push('## Issue Groups');
  lines.push('');

  for (const group of report.issueGroups.slice(0, 20)) {
    const severityEmoji = group.severity === 'critical' ? '🔴' :
                         group.severity === 'high' ? '🟠' :
                         group.severity === 'medium' ? '🟡' :
                         group.severity === 'low' ? '🔵' : 'ℹ️';

    lines.push(`### ${severityEmoji} ${group.title} (${group.occurrences} occurrences)`);
    lines.push('');
    lines.push(`**Severity:** ${group.severity} | **Category:** ${group.category} | **Tool:** ${group.tool}`);
    lines.push('');
    lines.push(`${group.description}`);
    lines.push('');

    // Show first 3 occurrences
    for (const issue of group.issues.slice(0, 3)) {
      lines.push(`- \`${issue.file}:${issue.line}\``);
      if (issue.codeSnippet) {
        lines.push('  ```');
        lines.push(`  ${issue.codeSnippet.trim()}`);
        lines.push('  ```');
      }
    }

    if (group.issues.length > 3) {
      lines.push(`- ... and ${group.issues.length - 3} more`);
    }
    lines.push('');
  }

  if (report.issueGroups.length > 20) {
    lines.push(`*... and ${report.issueGroups.length - 20} more issue groups*`);
    lines.push('');
  }

  // Tools Used
  lines.push('## Tools Used');
  lines.push('');
  for (const tool of report.toolsUsed) {
    lines.push(`- **${tool.name}** v${tool.version} (${tool.rulesUsed} rules, query pack: ${tool.queryPack || 'default'})`);
  }
  lines.push('');

  lines.push('---');
  lines.push('*Generated by CodeQual V9*');

  return lines.join('\n');
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log('Usage: npx ts-node generate-unified-v9-report.ts <codeql-sarif-path> <output-dir>');
    console.log('');
    console.log('Example:');
    console.log('  npx ts-node generate-unified-v9-report.ts /tmp/codeql-security/results.sarif ./unified-reports');
    process.exit(1);
  }

  const sarifPath = args[0];
  const outputDir = args[1];
  const queryPack = args[2] === 'security-extended' ? 'security-extended' : 'security';

  console.log('='.repeat(70));
  console.log('CodeQual V9 Unified Report Generator');
  console.log('='.repeat(70));
  console.log('');
  console.log(`SARIF Input: ${sarifPath}`);
  console.log(`Output Directory: ${outputDir}`);
  console.log(`Query Pack: ${queryPack}`);
  console.log('');

  // Parse SARIF
  console.log('[1/6] Parsing SARIF...');
  const sarif = parseSARIF(sarifPath);
  console.log(`  - Found ${sarif.runs[0].results.length} issues`);

  // Convert to unified format
  console.log('[2/6] Converting to Unified V9 format...');
  const report = convertSARIFToUnified(sarif, queryPack, {
    repository: 'codequal/packages/agents',
    branch: 'main',
  });

  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Generate outputs for all providers
  console.log('[3/6] Generating Web Dashboard output...');
  const webOutput = generateWebDashboardOutput(report);
  fs.writeFileSync(path.join(outputDir, `v9-report-${queryPack}-web.json`), JSON.stringify(webOutput, null, 2));

  console.log('[4/6] Generating API output...');
  const apiOutput = generateAPIOutput(report);
  fs.writeFileSync(path.join(outputDir, `v9-report-${queryPack}-api.json`), JSON.stringify(apiOutput, null, 2));

  console.log('[5/6] Generating CI/CD outputs (SARIF + GitLab)...');
  const githubSarif = generateGitHubSARIF(report);
  fs.writeFileSync(path.join(outputDir, `v9-report-${queryPack}-github.sarif`), JSON.stringify(githubSarif, null, 2));

  const gitlabOutput = generateGitLabCodeQuality(report);
  fs.writeFileSync(path.join(outputDir, `v9-report-${queryPack}-gitlab.json`), JSON.stringify(gitlabOutput, null, 2));

  console.log('[6/6] Generating IDE + Markdown outputs...');
  const ideOutput = generateIDECodeActions(report);
  fs.writeFileSync(path.join(outputDir, `v9-report-${queryPack}-ide.json`), JSON.stringify(ideOutput, null, 2));

  const markdown = generateMarkdownReport(report);
  fs.writeFileSync(path.join(outputDir, `v9-report-${queryPack}.md`), markdown);

  // Also save the unified report itself
  fs.writeFileSync(path.join(outputDir, `v9-unified-report-${queryPack}.json`), JSON.stringify(report, null, 2));

  console.log('');
  console.log('='.repeat(70));
  console.log('REPORT GENERATION COMPLETE');
  console.log('='.repeat(70));
  console.log('');
  console.log('Generated files:');
  console.log(`  - ${outputDir}/v9-unified-report-${queryPack}.json (Unified data)`)
  console.log(`  - ${outputDir}/v9-report-${queryPack}-web.json (Web Dashboard)`)
  console.log(`  - ${outputDir}/v9-report-${queryPack}-api.json (API Response)`)
  console.log(`  - ${outputDir}/v9-report-${queryPack}-github.sarif (GitHub Code Scanning)`)
  console.log(`  - ${outputDir}/v9-report-${queryPack}-gitlab.json (GitLab Code Quality)`)
  console.log(`  - ${outputDir}/v9-report-${queryPack}-ide.json (IDE Code Actions)`)
  console.log(`  - ${outputDir}/v9-report-${queryPack}.md (Human-readable Markdown)`)
  console.log('');
  console.log('Summary:');
  console.log(`  - Total Issues: ${report.summary.totalIssues}`);
  console.log(`  - Critical: ${report.summary.criticalCount}`);
  console.log(`  - High: ${report.summary.highCount}`);
  console.log(`  - Medium: ${report.summary.mediumCount}`);
  console.log(`  - Low: ${report.summary.lowCount}`);
  console.log(`  - Auto-Fixable: ${report.summary.autoFixableCount}`);
  console.log(`  - Manual Review: ${report.summary.manualReviewCount}`);
  console.log('');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
