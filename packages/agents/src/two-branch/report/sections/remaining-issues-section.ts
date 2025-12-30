/**
 * Remaining Issues Section Generator
 *
 * Generates the RemainingIssues section showing issues that still need attention.
 * For BASIC tier: shows all issues. For PRO tier: shows only unfixed issues.
 *
 * @see unified-report-types.ts for type definitions
 */

import {
  RemainingIssues,
  DetailedIssue,
  GroupedIssue,
  V9AnalysisResultInput,
  FixOrchestrationResultInput,
  AnalyzedIssue,
  IssueCategory,
  Severity,
  UnfixedReason,
} from '../unified-report-types';

/**
 * Generate the remaining issues section
 */
export function generateRemainingIssuesSection(
  analysis: V9AnalysisResultInput,
  fixResult?: FixOrchestrationResultInput
): RemainingIssues {
  // Calculate remaining issues (exclude fixed ones for PRO)
  const remainingIssues = fixResult
    ? calculateRemainingIssues(analysis.issues, fixResult)
    : analysis.issues.filter((i) => i.status !== 'resolved');

  // Build summary
  const summary = buildSummary(remainingIssues);

  // Categorize issues by priority
  const { blocking, highPriority, mediumLow } = categorizeIssues(
    remainingIssues,
    analysis,
    fixResult
  );

  return {
    summary,
    blocking,
    highPriority,
    mediumLow,
  };
}

/**
 * Build summary statistics
 */
function buildSummary(issues: AnalyzedIssue[]): RemainingIssues['summary'] {
  const bySeverity: Record<Severity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };

  const byCategory: Record<IssueCategory, number> = {
    security: 0,
    code_quality: 0,
    performance: 0,
    architecture: 0,
    dependencies: 0,
  };

  const byStatus = {
    new: 0,
    existingModified: 0,
    existingRest: 0,
  };

  for (const issue of issues) {
    bySeverity[issue.severity]++;
    byCategory[issue.category]++;

    if (issue.status === 'new') {
      byStatus.new++;
    } else if (issue.status === 'existing_modified') {
      byStatus.existingModified++;
    } else if (issue.status === 'existing_rest') {
      byStatus.existingRest++;
    }
  }

  return {
    total: issues.length,
    bySeverity,
    byCategory,
    byStatus,
  };
}

/**
 * Categorize issues into blocking, high priority, and medium/low
 */
function categorizeIssues(
  issues: AnalyzedIssue[],
  analysis: V9AnalysisResultInput,
  fixResult?: FixOrchestrationResultInput
): {
  blocking: DetailedIssue[];
  highPriority: DetailedIssue[];
  mediumLow: GroupedIssue[];
} {
  const blocking: DetailedIssue[] = [];
  const highPriority: DetailedIssue[] = [];
  const mediumLowIssues: AnalyzedIssue[] = [];

  for (const issue of issues) {
    // Blocking: critical severity OR high severity security issues that are NEW
    if (
      issue.status === 'new' &&
      (issue.severity === 'critical' ||
        (issue.severity === 'high' && issue.category === 'security'))
    ) {
      blocking.push(convertToDetailedIssue(issue, analysis, fixResult));
    }
    // High priority: high severity NEW issues
    else if (issue.status === 'new' && issue.severity === 'high') {
      highPriority.push(convertToDetailedIssue(issue, analysis, fixResult));
    }
    // Medium/Low: everything else
    else {
      mediumLowIssues.push(issue);
    }
  }

  // Group medium/low issues by rule
  const mediumLow = groupIssuesByRule(mediumLowIssues);

  return { blocking, highPriority, mediumLow };
}

/**
 * Convert an analyzed issue to a detailed issue
 */
function convertToDetailedIssue(
  issue: AnalyzedIssue,
  analysis: V9AnalysisResultInput,
  fixResult?: FixOrchestrationResultInput
): DetailedIssue {
  // Find if this issue was attempted but failed
  const unfixedInfo = fixResult?.unfixed.find((u) => u.issueId === issue.id);

  // Count occurrences of same rule
  const sameRuleIssues = analysis.issues.filter((i) => i.ruleId === issue.ruleId);
  const otherLocations = sameRuleIssues
    .filter((i) => i.id !== issue.id)
    .map((i) => ({ file: i.file, line: i.line }));

  return {
    id: issue.id,
    ruleId: issue.ruleId,
    ruleName: formatRuleName(issue.ruleId),
    category: issue.category,
    severity: issue.severity,
    status: issue.status as 'new' | 'existing_modified' | 'existing_rest',
    blocksMerge:
      issue.status === 'new' &&
      (issue.severity === 'critical' ||
        (issue.severity === 'high' && issue.category === 'security')),
    file: issue.file,
    relativePath: issue.file.replace(/^.*\//, ''),
    line: issue.line,
    column: issue.column,
    endLine: issue.endLine,
    endColumn: issue.endColumn,
    title: generateIssueTitle(issue),
    description: issue.message,
    whyItMatters: generateWhyItMatters(issue),
    commonCauses: generateCommonCauses(issue),
    impactIfNotFixed: generateImpact(issue),
    riskLevel: issue.severity,
    codeSnippet: issue.codeSnippet || '',
    codeLanguage: issue.language || detectLanguage(issue.file),
    manualFixSteps: generateManualFixSteps(issue),
    bestPractices: generateBestPractices(issue),
    autoFixFailureReason: unfixedInfo?.reason,
    autoFixFailureExplanation: unfixedInfo?.explanation,
    occurrenceCount: sameRuleIssues.length,
    otherLocations: otherLocations.length > 0 ? otherLocations : undefined,
    documentationUrl: generateDocUrl(issue.ruleId),
    learnMoreUrl: generateLearnMoreUrl(issue.category),
  };
}

/**
 * Group issues by rule for medium/low priority display
 */
function groupIssuesByRule(issues: AnalyzedIssue[]): GroupedIssue[] {
  const ruleMap = new Map<string, AnalyzedIssue[]>();

  for (const issue of issues) {
    const existing = ruleMap.get(issue.ruleId) || [];
    existing.push(issue);
    ruleMap.set(issue.ruleId, existing);
  }

  const groups: GroupedIssue[] = [];

  for (const [ruleId, ruleIssues] of Array.from(ruleMap.entries())) {
    const sample = ruleIssues[0];

    // Group files
    const fileMap = new Map<string, number[]>();
    for (const issue of ruleIssues) {
      const lines = fileMap.get(issue.file) || [];
      lines.push(issue.line);
      fileMap.set(issue.file, lines);
    }

    const files = Array.from(fileMap.entries()).map(([path, lines]) => ({
      path,
      lines,
    }));

    groups.push({
      ruleId,
      ruleName: formatRuleName(ruleId),
      category: sample.category,
      severity: sample.severity,
      count: ruleIssues.length,
      briefDescription: sample.message,
      files,
    });
  }

  // Sort by severity then count
  const severityOrder: Record<Severity, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };

  return groups.sort((a, b) => {
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (severityDiff !== 0) return severityDiff;
    return b.count - a.count;
  });
}

/**
 * Calculate remaining issues after fixes
 */
function calculateRemainingIssues(
  issues: AnalyzedIssue[],
  fixResult: FixOrchestrationResultInput
): AnalyzedIssue[] {
  const fixedIssueIds = new Set(fixResult.fixes.map((f) => f.issueId));
  return issues.filter((i) => !fixedIssueIds.has(i.id) && i.status !== 'resolved');
}

// Helper functions

function formatRuleName(ruleId: string): string {
  return ruleId
    .replace(/[-_]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function detectLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();
  const langMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    java: 'java',
    py: 'python',
    go: 'go',
    rs: 'rust',
    rb: 'ruby',
    php: 'php',
    cs: 'csharp',
    cpp: 'cpp',
    c: 'c',
    swift: 'swift',
    kt: 'kotlin',
  };
  return langMap[ext || ''] || 'text';
}

function generateIssueTitle(issue: AnalyzedIssue): string {
  const severityPrefix = {
    critical: 'Critical',
    high: 'High Priority',
    medium: 'Medium Priority',
    low: 'Low Priority',
  };
  return `${severityPrefix[issue.severity]}: ${formatRuleName(issue.ruleId)}`;
}

function generateWhyItMatters(issue: AnalyzedIssue): string {
  const categoryReasons: Record<IssueCategory, string> = {
    security:
      'Security vulnerabilities can lead to data breaches, unauthorized access, and compliance violations.',
    code_quality:
      'Code quality issues increase technical debt, reduce maintainability, and can lead to bugs.',
    performance:
      'Performance issues affect user experience, increase infrastructure costs, and reduce scalability.',
    architecture:
      'Architectural issues make the codebase harder to maintain, test, and extend.',
    dependencies:
      'Dependency issues can introduce security vulnerabilities and compatibility problems.',
  };
  return categoryReasons[issue.category];
}

function generateCommonCauses(issue: AnalyzedIssue): string[] {
  // This would ideally come from a knowledge base per rule
  return [
    'Lack of input validation',
    'Missing security checks',
    'Insufficient error handling',
    'Copy-paste errors',
  ];
}

function generateImpact(issue: AnalyzedIssue): string {
  const severityImpacts: Record<Severity, string> = {
    critical:
      'This issue can cause severe security vulnerabilities or system failures. Must be fixed before deployment.',
    high: 'This issue poses significant risk and should be addressed in the current development cycle.',
    medium:
      'This issue should be addressed to improve code quality but is not immediately critical.',
    low: 'This is a minor issue that can be addressed during regular maintenance.',
  };
  return severityImpacts[issue.severity];
}

function generateManualFixSteps(issue: AnalyzedIssue): string[] {
  // This would ideally come from a knowledge base per rule
  return [
    `Identify the root cause at ${issue.file}:${issue.line}`,
    `Review the code context and understand the issue`,
    `Apply the recommended fix pattern`,
    `Add appropriate tests to prevent regression`,
    `Run existing tests to verify no regressions`,
  ];
}

function generateBestPractices(issue: AnalyzedIssue): string[] {
  const categoryPractices: Record<IssueCategory, string[]> = {
    security: [
      'Always validate user input',
      'Use parameterized queries',
      'Implement proper authentication and authorization',
      'Keep dependencies updated',
    ],
    code_quality: [
      'Follow consistent coding standards',
      'Write self-documenting code',
      'Keep functions small and focused',
      'Use meaningful variable names',
    ],
    performance: [
      'Profile before optimizing',
      'Use caching appropriately',
      'Minimize database queries',
      'Implement lazy loading',
    ],
    architecture: [
      'Follow SOLID principles',
      'Maintain separation of concerns',
      'Use dependency injection',
      'Design for testability',
    ],
    dependencies: [
      'Keep dependencies minimal',
      'Regularly audit dependencies',
      'Use lock files for reproducible builds',
      'Monitor for security advisories',
    ],
  };
  return categoryPractices[issue.category];
}

function generateDocUrl(ruleId: string): string {
  return `https://docs.codequal.dev/rules/${ruleId}`;
}

function generateLearnMoreUrl(category: IssueCategory): string {
  return `https://docs.codequal.dev/guides/${category}`;
}
