/**
 * Test V9 Report with Scanner Tool Findings
 *
 * Generates a full V9 report with mock issues from Architecture/Performance tools
 * to verify the Scanner Guidance section integration.
 */

import * as fs from 'fs';
import * as path from 'path';
import { V9GroupedReportFormatter } from '../../src/two-branch/analyzers/v9-grouped-report-formatter';
import { groupIssues } from '../../src/two-branch/utils/issue-grouping';

const OUTPUT_DIR = path.join(__dirname, 'test-outputs');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Create mock issues from various scanner tools including Architecture/Performance
const mockIssues = [
  // === ARCHITECTURE TOOLS ===
  // Madge - Circular Dependencies
  {
    file: 'src/services/auth.ts',
    line: 5,
    column: 1,
    rule: 'circular-dependency',
    tool: 'madge',
    severity: 'high' as const,
    message: 'Circular dependency detected: auth.ts → user.ts → permissions.ts → auth.ts',
    category: 'NEW' as const,
    detectedCategory: 'Architecture'
  },
  {
    file: 'src/utils/helpers.ts',
    line: 1,
    column: 1,
    rule: 'circular-dependency',
    tool: 'madge',
    severity: 'high' as const,
    message: 'Circular dependency detected: helpers.ts → format.ts → helpers.ts',
    category: 'NEW' as const,
    detectedCategory: 'Architecture'
  },
  // Dependency Cruiser - Layer Violations
  {
    file: 'src/components/Button.tsx',
    line: 3,
    column: 1,
    rule: 'no-circular',
    tool: 'dependency-cruiser',
    severity: 'medium' as const,
    message: 'UI layer importing from data layer violates architecture rules',
    category: 'NEW' as const,
    detectedCategory: 'Architecture'
  },
  // ts-unused-exports
  {
    file: 'src/utils/deprecated.ts',
    line: 15,
    column: 1,
    rule: 'unused-export',
    tool: 'ts-unused-exports',
    severity: 'low' as const,
    message: 'Export "oldHelper" is not used anywhere',
    category: 'NEW' as const,
    detectedCategory: 'Architecture'
  },

  // === PERFORMANCE TOOLS ===
  // Lighthouse
  {
    file: 'src/pages/index.tsx',
    line: 1,
    column: 1,
    rule: 'largest-contentful-paint',
    tool: 'lighthouse',
    severity: 'high' as const,
    message: 'LCP is 4.2s, exceeds 2.5s threshold',
    category: 'NEW' as const,
    detectedCategory: 'Performance'
  },
  {
    file: 'src/pages/index.tsx',
    line: 1,
    column: 1,
    rule: 'cumulative-layout-shift',
    tool: 'lighthouse',
    severity: 'medium' as const,
    message: 'CLS is 0.18, exceeds 0.1 threshold',
    category: 'NEW' as const,
    detectedCategory: 'Performance'
  },
  {
    file: 'src/pages/index.tsx',
    line: 1,
    column: 1,
    rule: 'first-input-delay',
    tool: 'lighthouse',
    severity: 'medium' as const,
    message: 'FID is 150ms, exceeds 100ms threshold',
    category: 'NEW' as const,
    detectedCategory: 'Performance'
  },
  // Bundle Analyzer
  {
    file: 'node_modules/moment/moment.js',
    line: 1,
    column: 1,
    rule: 'large-bundle',
    tool: 'bundle-analyzer',
    severity: 'medium' as const,
    message: 'Bundle size is 287KB, consider using date-fns (12KB) instead',
    category: 'NEW' as const,
    detectedCategory: 'Performance'
  },
  {
    file: 'node_modules/lodash/lodash.js',
    line: 1,
    column: 1,
    rule: 'large-bundle',
    tool: 'bundle-analyzer',
    severity: 'low' as const,
    message: 'Full lodash import detected (72KB). Use lodash-es for tree-shaking',
    category: 'NEW' as const,
    detectedCategory: 'Performance'
  },

  // === SECURITY TOOLS ===
  // Bandit (Python style but for testing)
  {
    file: 'scripts/deploy.py',
    line: 25,
    column: 5,
    rule: 'B105',
    tool: 'bandit',
    severity: 'high' as const,
    message: 'Possible hardcoded password: password = "admin123"',
    category: 'NEW' as const,
    detectedCategory: 'Security'
  },
  {
    file: 'scripts/db.py',
    line: 42,
    column: 10,
    rule: 'B608',
    tool: 'bandit',
    severity: 'critical' as const,
    message: 'Possible SQL injection via string formatting',
    category: 'NEW' as const,
    detectedCategory: 'Security'
  },

  // === REGULAR TOOLS (should NOT show scanner guidance) ===
  // ESLint
  {
    file: 'src/components/Button.tsx',
    line: 15,
    column: 5,
    rule: 'no-unused-vars',
    tool: 'eslint',
    severity: 'low' as const,
    message: "'unusedVar' is defined but never used",
    category: 'NEW' as const,
    detectedCategory: 'Code Quality'
  },
  {
    file: 'src/utils/format.ts',
    line: 8,
    column: 1,
    rule: 'prefer-const',
    tool: 'eslint',
    severity: 'low' as const,
    message: "'x' is never reassigned. Use 'const' instead",
    category: 'NEW' as const,
    detectedCategory: 'Code Quality'
  },
  // Semgrep
  {
    file: 'src/api/handler.ts',
    line: 30,
    column: 5,
    rule: 'typescript.react.security.audit.react-dangerously-innerhtml',
    tool: 'semgrep',
    severity: 'medium' as const,
    message: 'Detected dangerouslySetInnerHTML usage',
    category: 'NEW' as const,
    detectedCategory: 'Security'
  }
];

async function generateTestReport(): Promise<void> {
  console.log('='.repeat(80));
  console.log('V9 REPORT WITH SCANNER TOOLS TEST');
  console.log('='.repeat(80));

  console.log('\nTest Issues Summary:');
  const toolCounts: Record<string, number> = {};
  for (const issue of mockIssues) {
    toolCounts[issue.tool] = (toolCounts[issue.tool] || 0) + 1;
  }
  Object.entries(toolCounts).forEach(([tool, count]) => {
    console.log(`  - ${tool}: ${count} issues`);
  });

  console.log('\nExpected Scanner Guidance Tools:');
  console.log('  - madge (Architecture)');
  console.log('  - dependency-cruiser (Architecture)');
  console.log('  - ts-unused-exports (Architecture)');
  console.log('  - lighthouse (Performance)');
  console.log('  - bundle-analyzer (Performance)');
  console.log('  - bandit (Security)');
  console.log('\nTools WITHOUT scanner guidance (auto-fixable):');
  console.log('  - eslint');
  console.log('  - semgrep');

  console.log('\n' + '='.repeat(80));
  console.log('Generating V9 Report...');
  console.log('='.repeat(80) + '\n');

  // Group issues first
  const groupingResult = groupIssues(mockIssues as any);
  console.log(`Grouped ${mockIssues.length} issues into ${groupingResult.groups.length} groups`);

  // Create formatter (language, tier)
  const formatter = new V9GroupedReportFormatter(undefined, 'typescript', 'medium');

  // Generate report with mock data
  const metadata = {
    repoUrl: 'https://github.com/example/test-project',
    repository: 'example/test-project',
    prNumber: 123,
    prTitle: 'Add new authentication feature',
    prAuthor: 'test-developer',
    prAuthorEmail: 'test@example.com',
    branch: 'feature/auth',
    baseBranch: 'main',
    analyzedAt: new Date().toISOString(),
    totalFiles: 150,
    totalLinesOfCode: 25000,
    filesModified: 12,
    linesAdded: 450,
    linesDeleted: 120,
    totalDuration: 45000,
    decision: 'NEEDS_REVIEW',
    blockingCount: 5,
    // Mock tool performance to pass validation
    toolPerformance: [
      { tool: 'madge', duration: 1500, issueCount: 2, status: 'success' },
      { tool: 'dependency-cruiser', duration: 2000, issueCount: 1, status: 'success' },
      { tool: 'ts-unused-exports', duration: 800, issueCount: 1, status: 'success' },
      { tool: 'lighthouse', duration: 5000, issueCount: 3, status: 'success' },
      { tool: 'bundle-analyzer', duration: 3000, issueCount: 2, status: 'success' },
      { tool: 'bandit', duration: 1200, issueCount: 2, status: 'success' },
      { tool: 'eslint', duration: 500, issueCount: 2, status: 'success' },
      { tool: 'semgrep', duration: 8000, issueCount: 1, status: 'success' }
    ]
  };

  try {
    const result = await formatter.generateGroupedReport(mockIssues as any, groupingResult.groups, metadata);

    // Save the report
    const reportPath = path.join(OUTPUT_DIR, 'v9-scanner-tools-report.md');
    fs.writeFileSync(reportPath, result.markdown);

    console.log(`✅ Report generated: ${result.markdown.length} bytes`);
    console.log(`✅ Report saved to: ${reportPath}`);

    // Verify scanner guidance section exists
    const hasSection = result.markdown.includes('## 🔍 Scanner Tool Insights');
    console.log(`\n${'='.repeat(80)}`);
    console.log('VERIFICATION');
    console.log('='.repeat(80));
    console.log(`Scanner Guidance Section: ${hasSection ? '✅ FOUND' : '❌ MISSING'}`);

    // Check for specific tools
    const expectedTools = ['Lighthouse', 'Madge', 'Dependency Cruiser', 'Bundle Analyzer', 'Bandit', 'ts-unused-exports'];
    console.log('\nExpected Scanner Tools in Report:');
    for (const tool of expectedTools) {
      const found = result.markdown.includes(`### ${tool}`);
      console.log(`  ${found ? '✅' : '❌'} ${tool}`);
    }

    // Check that ESLint/Semgrep are NOT in scanner guidance
    const eslintInGuidance = result.markdown.includes('### ESLint') &&
                            result.markdown.indexOf('### ESLint') > result.markdown.indexOf('Scanner Tool Insights');
    const semgrepInGuidance = result.markdown.includes('### Semgrep') &&
                             result.markdown.indexOf('### Semgrep') > result.markdown.indexOf('Scanner Tool Insights');

    console.log('\nTools correctly excluded from Scanner Guidance:');
    console.log(`  ${!eslintInGuidance ? '✅' : '❌'} ESLint (has auto-fix)`);
    console.log(`  ${!semgrepInGuidance ? '✅' : '❌'} Semgrep (has patterns)`);

    console.log(`\n${'='.repeat(80)}`);
    console.log('REPORT PATH:');
    console.log(reportPath);
    console.log('='.repeat(80));

  } catch (error) {
    console.error('Failed to generate report:', error);
    throw error;
  }
}

generateTestReport().catch(console.error);
