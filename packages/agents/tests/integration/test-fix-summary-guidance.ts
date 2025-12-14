/**
 * Test for CodeQual PRO Auto-Fix Guidance in Fix Summary Reports
 *
 * This test verifies that the new auto-fix guidance section is included
 * in PRO tier reports when there are auto-fixable issues.
 */

import { FixSummaryGenerator } from '../../src/fix-agent/providers/fix-summary-generator';
import { FixReportIssue, IssueCategory, IssueSeverity, FixSource, IssueType } from '../../src/fix-agent/types/fix-report-types';

// Sample issues for testing - using correct FixReportIssue interface
const sampleIssues: FixReportIssue[] = [
  {
    id: 'issue-001',
    fixReportId: 'report-001',
    issueHash: 'hash-001',
    ruleId: 'security/sql-injection',
    tool: 'semgrep',
    severity: 'high',
    category: 'security',
    message: 'SQL Injection Vulnerability',
    description: 'User input directly concatenated into SQL query',
    filePath: 'src/services/user-service.ts',
    lineNumber: 45,
    columnNumber: 10,
    codeSnippet: 'const query = "SELECT * FROM users WHERE id = " + userId;',
    issueType: 'new',
    fixAvailable: true,
    fixSource: 'ai_generated',
    fixConfidence: 0.95,
    fixedCode: 'const query = "SELECT * FROM users WHERE id = ?"; // Use parameterized query',
    isIntentionalUse: false,
    userSelected: false,
    createdAt: new Date()
  },
  {
    id: 'issue-002',
    fixReportId: 'report-001',
    issueHash: 'hash-002',
    ruleId: 'security/xss',
    tool: 'semgrep',
    severity: 'high',
    category: 'security',
    message: 'Cross-Site Scripting (XSS)',
    description: 'Unescaped user input rendered in HTML',
    filePath: 'src/components/Comment.tsx',
    lineNumber: 23,
    columnNumber: 5,
    codeSnippet: '<div dangerouslySetInnerHTML={{__html: userComment}} />',
    issueType: 'new',
    fixAvailable: true,
    fixSource: 'ai_generated',
    fixConfidence: 0.92,
    fixedCode: '<div>{sanitizeHtml(userComment)}</div>',
    isIntentionalUse: false,
    userSelected: false,
    createdAt: new Date()
  },
  {
    id: 'issue-003',
    fixReportId: 'report-001',
    issueHash: 'hash-003',
    ruleId: 'code-quality/unused-variable',
    tool: 'eslint',
    severity: 'low',
    category: 'code_quality',
    message: 'Unused Variable',
    description: 'Variable declared but never used',
    filePath: 'src/utils/helpers.ts',
    lineNumber: 12,
    columnNumber: 7,
    codeSnippet: 'const unusedVar = "test";',
    issueType: 'existing_modified',
    fixAvailable: true,
    fixSource: 'pattern',
    fixConfidence: 1.0,
    fixedCode: '// removed',
    isIntentionalUse: false,
    userSelected: false,
    createdAt: new Date()
  },
  {
    id: 'issue-004',
    fixReportId: 'report-001',
    issueHash: 'hash-004',
    ruleId: 'architecture/circular-dependency',
    tool: 'madge',
    severity: 'medium',
    category: 'architecture',
    message: 'Circular Dependency',
    description: 'Circular import between modules requires architectural refactoring',
    filePath: 'src/services/auth.ts',
    lineNumber: 1,
    columnNumber: 1,
    codeSnippet: 'import { UserService } from "./user-service";',
    issueType: 'existing_rest',
    fixAvailable: false,
    isIntentionalUse: false,
    userSelected: false,
    createdAt: new Date()
  },
  {
    id: 'issue-005',
    fixReportId: 'report-001',
    issueHash: 'hash-005',
    ruleId: 'security/detect-child-process',
    tool: 'semgrep',
    severity: 'high',
    category: 'security',
    message: 'Child process execution detected',
    description: 'Intentional use of child_process for build tooling',
    filePath: 'src/build/runner.ts',
    lineNumber: 15,
    columnNumber: 1,
    codeSnippet: 'const { exec } = require("child_process");',
    issueType: 'existing_rest',
    fixAvailable: false,
    isIntentionalUse: true,
    intentionalReason: 'Build system requires process execution for tooling',
    userSelected: false,
    createdAt: new Date()
  }
];

async function runTest() {
  console.log('='.repeat(60));
  console.log('TEST: CodeQual PRO Auto-Fix Guidance in Reports');
  console.log('='.repeat(60));
  console.log('');

  const generator = new FixSummaryGenerator({
    includeCodeSnippets: true,
    includeActionableGuidance: true,
    maxIssuesPerCategory: 50,
    groupByFile: false
  });

  // Generate the full report object
  const report = generator.generate(sampleIssues, {
    repository: 'test/sample-repo',
    prNumber: 123,
    branch: 'feature/test',
  });

  // Generate markdown and HTML separately
  const markdown = generator.generateMarkdown(sampleIssues, {
    repository: 'test/sample-repo',
    prNumber: 123,
    branch: 'feature/test',
  });

  const html = generator.generateHTML(sampleIssues, {
    repository: 'test/sample-repo',
    prNumber: 123,
    branch: 'feature/test',
  });

  // Test 1: Check markdown includes auto-fix section
  console.log('TEST 1: Markdown includes Auto-Fix section');
  console.log('-'.repeat(40));
  const hasAutoFixSection = markdown.includes('CodeQual PRO Auto-Fix Options');
  console.log(`  Result: ${hasAutoFixSection ? '✅ PASS' : '❌ FAIL'}`);
  console.log('');

  // Test 2: Check for selection modes
  console.log('TEST 2: Markdown includes selection modes');
  console.log('-'.repeat(40));
  const hasSelectionModes = markdown.includes('codequal fix --all') &&
                            markdown.includes('codequal fix --severity');
  console.log(`  Result: ${hasSelectionModes ? '✅ PASS' : '❌ FAIL'}`);
  console.log('');

  // Test 3: Check for commit options
  console.log('TEST 3: Markdown includes commit options');
  console.log('-'.repeat(40));
  const hasCommitOptions = markdown.includes('--commit single') &&
                           markdown.includes('--commit grouped');
  console.log(`  Result: ${hasCommitOptions ? '✅ PASS' : '❌ FAIL'}`);
  console.log('');

  // Test 4: Check for approval workflow
  console.log('TEST 4: Markdown includes approval workflow');
  console.log('-'.repeat(40));
  const hasApprovalWorkflow = markdown.includes('--dry-run') &&
                               markdown.includes('--approve');
  console.log(`  Result: ${hasApprovalWorkflow ? '✅ PASS' : '❌ FAIL'}`);
  console.log('');

  // Test 5: Check HTML includes auto-fix section
  console.log('TEST 5: HTML includes Auto-Fix section');
  console.log('-'.repeat(40));
  const htmlHasAutoFixSection = html.includes('CodeQual PRO Auto-Fix Options');
  console.log(`  Result: ${htmlHasAutoFixSection ? '✅ PASS' : '❌ FAIL'}`);
  console.log('');

  // Test 6: Check fixOptions in report object
  console.log('TEST 6: Report includes fixOptions object');
  console.log('-'.repeat(40));
  const hasFixOptions = report.fixOptions !== undefined;
  console.log(`  Result: ${hasFixOptions ? '✅ PASS' : '❌ FAIL'}`);
  if (hasFixOptions) {
    console.log(`  Selection modes: ${report.fixOptions!.selectionModes.length}`);
    console.log(`  Commit styles: ${report.fixOptions!.commitStyles.length}`);
    console.log(`  Approval options: ${report.fixOptions!.approvalOptions.length}`);
    console.log(`  Quick start steps: ${report.fixOptions!.quickStart.length}`);
  }
  console.log('');

  // Test 7: Verify auto-fixable count is correct
  console.log('TEST 7: Correct auto-fixable count');
  console.log('-'.repeat(40));
  const expectedAutoFixable = sampleIssues.filter(i => i.fixAvailable).length;
  const hasCorrectCount = markdown.includes(`**${expectedAutoFixable} auto-fixable issues**`);
  console.log(`  Expected: ${expectedAutoFixable} auto-fixable issues`);
  console.log(`  Result: ${hasCorrectCount ? '✅ PASS' : '❌ FAIL'}`);
  console.log('');

  // Test 8: Verify stats are correct
  console.log('TEST 8: Statistics are correct');
  console.log('-'.repeat(40));
  const statsCorrect = report.stats.total === 5 &&
                       report.stats.autoFixed === 3 &&
                       report.stats.manualReview === 1 &&
                       report.stats.intentionalUse === 1;
  console.log(`  Total: ${report.stats.total} (expected 5)`);
  console.log(`  Auto-fixed: ${report.stats.autoFixed} (expected 3)`);
  console.log(`  Manual review: ${report.stats.manualReview} (expected 1)`);
  console.log(`  Intentional use: ${report.stats.intentionalUse} (expected 1)`);
  console.log(`  Result: ${statsCorrect ? '✅ PASS' : '❌ FAIL'}`);
  console.log('');

  // Summary
  console.log('='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));
  const allPassed = hasAutoFixSection && hasSelectionModes && hasCommitOptions &&
                    hasApprovalWorkflow && htmlHasAutoFixSection && hasFixOptions &&
                    hasCorrectCount && statsCorrect;
  console.log(`Overall: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  console.log('');

  // Show sample of the generated markdown
  console.log('='.repeat(60));
  console.log('SAMPLE OUTPUT: Auto-Fix Section in Markdown');
  console.log('='.repeat(60));

  // Extract just the auto-fix section
  const autoFixSectionStart = markdown.indexOf('## 🚀 CodeQual PRO Auto-Fix Options');
  if (autoFixSectionStart !== -1) {
    // Find the next section or end of document
    const nextSectionStart = markdown.indexOf('\n## ', autoFixSectionStart + 1);
    const autoFixSection = nextSectionStart !== -1
      ? markdown.slice(autoFixSectionStart, nextSectionStart)
      : markdown.slice(autoFixSectionStart);
    console.log(autoFixSection);
  } else {
    console.log('(Auto-fix section not found in output)');
  }

  return allPassed;
}

// Run the test
runTest()
  .then(passed => {
    process.exit(passed ? 0 : 1);
  })
  .catch(error => {
    console.error('Test failed with error:', error);
    process.exit(1);
  });
