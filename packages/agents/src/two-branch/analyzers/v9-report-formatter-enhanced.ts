/**
 * V9 Report Formatter - Enhanced with Phase 3 Integrations
 *
 * Integrates all Phase 3 utilities:
 * - Safe value helpers (no undefined values)
 * - Code snippet extraction
 * - Link validation and educational resources
 * - Model usage tracking
 */

import { CodeSnippetExtractor } from '../utils/code-snippet-extractor';
import { LinkValidator } from '../utils/link-validator';
import { modelTracker, getModelUsageReport } from '../utils/model-usage-tracker';
import * as safe from '../utils/safe-value-helpers';

export interface V9EnhancedIssue extends safe.Issue {
  // All optional fields handled by safe helpers
  codeSnippet?: string;
  educationalResource?: {
    title: string;
    url: string;
    description: string;
    isValid?: boolean;
  };
}

export interface V9EnhancedMetadata {
  repository: string;
  prNumber: number;
  totalDuration?: number;
  analysisTime?: number;
  [key: string]: any;
}

/**
 * Format a single issue with all Phase 3 enhancements
 */
export async function formatIssueEnhanced(
  issue: V9EnhancedIssue,
  index: number,
  repoPath?: string
): Promise<string> {
  const title = safe.safeIssueTitle(issue);
  const severity = safe.safeDisplaySeverity(issue);
  const category = safe.safeCategory(issue);
  const location = safe.safeFileLocation(issue);
  const tool = safe.safeToolName(issue);
  const agent = safe.safeAgentName(issue);

  let output = `### ${index + 1}. ${title}\n\n`;

  // Basic information (all safe)
  output += `**Severity:** ${severity}  \n`;
  output += `**Category:** ${category}  \n`;
  output += `**Location:** \`${location}\`  \n`;
  output += `**Tool:** ${tool} | **Agent:** ${agent}  \n\n`;

  // Description
  const description = safe.safeString(issue.message || issue.description, 'No description provided');
  output += `**Description:**  \n${description}\n\n`;

  // Code snippet (Phase 3 - BUG-106)
  let codeSnippet = issue.codeSnippet;

  if (!codeSnippet && repoPath && issue.file && issue.line) {
    const fullPath = `${repoPath}/${issue.file}`;
    codeSnippet = await CodeSnippetExtractor.getIssueSnippet(fullPath, issue.line);
  }

  if (safe.isNonEmptyString(codeSnippet)) {
    output += `**Code Context:**\n${codeSnippet}\n\n`;
  }

  // Suggested fix
  const suggestedFix = safe.safeString(issue.suggestedFix, '');
  if (safe.isNonEmptyString(suggestedFix)) {
    output += `**Suggested Fix:**  \n${suggestedFix}\n\n`;
  }

  // Business impact
  const businessImpact = safe.safeBusinessImpact(issue);
  if (businessImpact !== 'Impact not assessed') {
    output += `**Business Impact:**  \n${businessImpact}\n\n`;
  }

  // Educational resource (Phase 3 - BUG-107)
  if (issue.educationalResource) {
    const resource = issue.educationalResource;
    const validIcon = resource.isValid ? '✅' : '⚠️';
    output += `**Learn More:** ${validIcon} [${resource.title}](${resource.url})  \n`;
    output += `*${resource.description}*\n\n`;
  }

  output += `---\n\n`;

  return output;
}

/**
 * Add educational resources to issues (Phase 3 - BUG-107)
 */
export async function enrichIssuesWithResources(
  issues: V9EnhancedIssue[]
): Promise<V9EnhancedIssue[]> {
  const validator = new LinkValidator();

  // Get resources for all issues
  const issuesWithMetadata = issues.map(issue => ({
    title: safe.safeIssueTitle(issue),
    category: safe.safeCategory(issue),
    tool: safe.safeToolName(issue)
  }));

  const resources = await validator.getValidatedResources(issuesWithMetadata);

  // Attach resources to issues
  return issues.map((issue, index) => ({
    ...issue,
    educationalResource: resources[index]
  }));
}

/**
 * Generate enhanced issue summary
 */
export function generateIssueSummaryEnhanced(issues: V9EnhancedIssue[]): string {
  const safeIssues = safe.safeArray(issues);

  if (safeIssues.length === 0) {
    return '**No issues found** ✅\n\nGreat job! The code meets quality standards.\n\n';
  }

  let summary = `## 📊 Issues Summary\n\n`;
  summary += `**Total Issues:** ${safeIssues.length}\n\n`;

  // Count by severity (using safe helpers)
  const severityCounts = safe.safeCountBy(safeIssues, issue => safe.safeSeverity(issue));

  summary += `### By Severity\n`;
  summary += `- 🔴 **Critical:** ${safe.safeNumber(severityCounts['critical'], 0)}\n`;
  summary += `- 🟠 **High:** ${safe.safeNumber(severityCounts['high'], 0)}\n`;
  summary += `- 🟡 **Medium:** ${safe.safeNumber(severityCounts['medium'], 0)}\n`;
  summary += `- 🟢 **Low:** ${safe.safeNumber(severityCounts['low'], 0)}\n\n`;

  // Count by category
  const categoryCounts = safe.safeCountBy(safeIssues, issue => safe.safeCategory(issue));

  summary += `### By Category\n`;
  Object.entries(categoryCounts).forEach(([category, count]) => {
    summary += `- **${category}:** ${count}\n`;
  });
  summary += '\n';

  return summary;
}

/**
 * Generate performance metrics section with safe values
 */
export function generatePerformanceMetricsEnhanced(metadata: V9EnhancedMetadata): string {
  let output = `## ⚡ Performance Metrics\n\n`;

  // Safe duration formatting
  const totalDuration = safe.safeDuration(metadata.totalDuration);
  const analysisTime = safe.safeDuration(metadata.analysisTime);

  output += `**Total Duration:** ${totalDuration}  \n`;
  output += `**Analysis Time:** ${analysisTime}  \n`;

  // Repository info with safe strings
  const repository = safe.safeString(metadata.repository, 'Unknown repository');
  const prNumber = safe.safeNumber(metadata.prNumber, 0);

  output += `**Repository:** ${repository}  \n`;
  output += `**PR Number:** #${prNumber}  \n\n`;

  return output;
}

/**
 * Generate model usage section (Phase 3 - BUG-110)
 */
export function generateModelUsageSection(): string {
  let output = `## 🤖 AI Model Usage\n\n`;

  const summary = modelTracker.getUsageSummary();

  output += `**Total API Calls:** ${summary.totalCalls}  \n`;
  output += `**Total Tokens:** ${summary.totalTokens.toLocaleString()}  \n`;
  output += `**Total Cost:** $${summary.totalCost.toFixed(4)}  \n`;
  output += `**Models Used:** ${summary.uniqueModels.join(', ')}  \n\n`;

  // Agent breakdown
  output += `### Usage by Agent\n\n`;
  Object.entries(summary.byAgent).forEach(([agent, report]) => {
    output += `**${agent} Agent:**  \n`;
    report.models.forEach(model => {
      const pct = ((model.count / report.totalCalls) * 100).toFixed(0);
      output += `- ${model.model}: ${model.count} calls (${pct}%), ${model.totalTokens.toLocaleString()} tokens  \n`;
    });
    output += '\n';
  });

  // Consistency warnings
  const warnings = modelTracker.getConsistencyReport()
    .filter(r => !r.isConsistent);

  if (warnings.length > 0) {
    output += `### ⚠️ Model Consistency Warnings\n\n`;
    warnings.forEach(warning => {
      output += `- **${warning.agent}:** Used ${warning.modelCount} different models (${warning.distribution})  \n`;
    });
    output += '\n';
  }

  return output;
}

/**
 * Generate complete enhanced V9 report
 */
export async function generateCompleteEnhancedReport(
  issues: V9EnhancedIssue[],
  metadata: V9EnhancedMetadata,
  repoPath?: string
): Promise<string> {
  let report = `# 🎯 Code Quality Analysis Report\n\n`;

  // Add timestamp
  const timestamp = safe.safeDate(undefined);
  report += `**Generated:** ${timestamp}\n\n`;
  report += `---\n\n`;

  // Performance metrics
  report += generatePerformanceMetricsEnhanced(metadata);
  report += `---\n\n`;

  // Enrich issues with educational resources
  const enrichedIssues = await enrichIssuesWithResources(issues);

  // Issue summary
  report += generateIssueSummaryEnhanced(enrichedIssues);
  report += `---\n\n`;

  // Detailed issues
  if (enrichedIssues.length > 0) {
    report += `## 🔍 Detailed Issues\n\n`;

    for (let i = 0; i < enrichedIssues.length; i++) {
      const issueReport = await formatIssueEnhanced(enrichedIssues[i], i, repoPath);
      report += issueReport;
    }
  }

  // Model usage section
  if (modelTracker.getHistory().length > 0) {
    report += `---\n\n`;
    report += generateModelUsageSection();
  }

  return report;
}

/**
 * Validate report has no undefined values
 */
export function validateReportQuality(report: string): {
  isValid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Check for literal "undefined" strings
  if (report.includes('undefined')) {
    const matches = report.match(/undefined/g);
    issues.push(`Found ${matches?.length || 0} instances of "undefined" in report`);
  }

  // Check for "null" strings
  if (report.includes('null') && !report.includes('null pointer')) {
    const matches = report.match(/\bnull\b/g);
    issues.push(`Found ${matches?.length || 0} instances of "null" in report`);
  }

  // Check for "N/A" (acceptable but worth noting)
  if (report.includes('N/A')) {
    const matches = report.match(/N\/A/g);
    issues.push(`Found ${matches?.length || 0} instances of "N/A" (acceptable fallback)`);
  }

  return {
    isValid: issues.length === 0 || (issues.length === 1 && issues[0].includes('N/A')),
    issues
  };
}
