#!/usr/bin/env npx ts-node

/**
 * Test PR Categorization
 * Demonstrates the improved issue categorization for PR analysis
 */

import { PRAnalysisCategorizer } from './src/standard/services/pr-analysis-categorizer';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

// Simulate main branch issues
const mainBranchIssues = [
  {
    title: 'Missing error handling in API call',
    severity: 'high',
    category: 'error-handling',
    file: 'src/api/client.ts',
    line: 45,
    message: 'API call lacks proper error handling'
  },
  {
    title: 'Hardcoded API key',
    severity: 'critical',
    category: 'security',
    file: 'src/config.ts',
    line: 12,
    message: 'API key should not be hardcoded'
  },
  {
    title: 'Unused variable',
    severity: 'low',
    category: 'code-quality',
    file: 'src/utils/helpers.ts',
    line: 78,
    message: 'Variable "temp" is declared but never used'
  },
  {
    title: 'No input validation',
    severity: 'high',
    category: 'security',
    file: 'src/api/endpoints.ts',
    line: 156,
    message: 'User input is not validated before processing'
  },
  {
    title: 'Console.log in production',
    severity: 'medium',
    category: 'code-quality',
    file: 'src/services/logger.ts',
    line: 23,
    message: 'Remove console.log statements'
  }
];

// Simulate PR branch issues (some fixed, some new, some unchanged)
const prBranchIssues = [
  // Unchanged issue (still exists)
  {
    title: 'Missing error handling in API call',
    severity: 'high',
    category: 'error-handling',
    file: 'src/api/client.ts',
    line: 47, // Slightly different line due to code changes
    message: 'API call lacks proper error handling'
  },
  // Fixed: Hardcoded API key is gone
  // Fixed: No input validation is gone
  
  // Unchanged issue
  {
    title: 'Unused variable',
    severity: 'low',
    category: 'code-quality',
    file: 'src/utils/helpers.ts',
    line: 78,
    message: 'Variable "temp" is declared but never used'
  },
  
  // NEW issues introduced by PR
  {
    title: 'Memory leak in event listener',
    severity: 'high',
    category: 'performance',
    file: 'src/components/Dashboard.tsx',
    line: 234,
    message: 'Event listener not cleaned up in useEffect'
  },
  {
    title: 'Race condition in state update',
    severity: 'critical',
    category: 'concurrency',
    file: 'src/hooks/useData.ts',
    line: 89,
    message: 'Potential race condition when updating state'
  },
  {
    title: 'Missing null check',
    severity: 'medium',
    category: 'error-handling',
    file: 'src/utils/parser.ts',
    line: 45,
    message: 'Object may be null or undefined'
  },
  {
    title: 'Inefficient loop',
    severity: 'low',
    category: 'performance',
    file: 'src/utils/processor.ts',
    line: 123,
    message: 'Nested loops with O(n²) complexity'
  }
];

async function testCategorization() {
  console.log(`${colors.bright}${colors.cyan}🔬 PR CATEGORIZATION TEST${colors.reset}\n`);
  console.log('═'.repeat(80));
  
  const categorizer = new PRAnalysisCategorizer();
  
  console.log(`\n📊 ${colors.bright}Branch Analysis:${colors.reset}`);
  console.log(`  Main branch issues: ${mainBranchIssues.length}`);
  console.log(`  PR branch issues: ${prBranchIssues.length}`);
  
  // Perform categorization
  const result = categorizer.categorizeIssues(mainBranchIssues, prBranchIssues);
  
  console.log('\n' + '═'.repeat(80));
  console.log(`\n${colors.bright}${colors.cyan}CATEGORIZATION RESULTS${colors.reset}\n`);
  
  // Display results
  console.log(`${colors.bright}1. NEW ISSUES (Introduced by PR)${colors.reset}`);
  console.log('─'.repeat(40));
  if (result.newIssues.length > 0) {
    result.newIssues.forEach(item => {
      const severity = item.issue.severity;
      const color = severity === 'critical' ? colors.red :
                   severity === 'high' ? colors.yellow :
                   severity === 'medium' ? colors.blue : colors.cyan;
      console.log(`  ${color}[${severity.toUpperCase()}]${colors.reset} ${item.issue.title}`);
      console.log(`         📍 ${item.issue.file}:${item.issue.line}`);
      console.log(`         Confidence: ${(item.confidence * 100).toFixed(0)}%`);
    });
  } else {
    console.log(`  ${colors.green}✅ No new issues introduced${colors.reset}`);
  }
  
  console.log(`\n${colors.bright}2. FIXED ISSUES (Resolved by PR)${colors.reset}`);
  console.log('─'.repeat(40));
  if (result.fixedIssues.length > 0) {
    result.fixedIssues.forEach(item => {
      console.log(`  ${colors.green}✅${colors.reset} ${item.issue.title} (${item.issue.severity})`);
      console.log(`     Was at: ${item.issue.file}:${item.issue.line}`);
    });
  } else {
    console.log(`  No issues fixed`);
  }
  
  console.log(`\n${colors.bright}3. UNCHANGED ISSUES (Pre-existing)${colors.reset}`);
  console.log('─'.repeat(40));
  if (result.unchangedIssues.length > 0) {
    result.unchangedIssues.forEach(item => {
      console.log(`  ➖ ${item.issue.title} (${item.issue.severity})`);
    });
  }
  
  // Summary
  console.log('\n' + '═'.repeat(80));
  console.log(`\n${colors.bright}${colors.cyan}PR QUALITY ASSESSMENT${colors.reset}\n`);
  
  const { summary } = result;
  
  // Quality score visualization
  const score = summary.prQualityScore;
  const scoreColor = score >= 80 ? colors.green :
                    score >= 60 ? colors.yellow :
                    score >= 40 ? colors.yellow : colors.red;
  
  console.log(`${colors.bright}Quality Score:${colors.reset} ${scoreColor}${score}/100${colors.reset}`);
  
  // Net impact
  const netImpact = summary.netImpact;
  const impactColor = netImpact <= 0 ? colors.green : 
                      netImpact <= 2 ? colors.yellow : colors.red;
  const impactSign = netImpact > 0 ? '+' : '';
  
  console.log(`${colors.bright}Net Impact:${colors.reset} ${impactColor}${impactSign}${netImpact} issues${colors.reset}`);
  
  // Visual bar chart
  console.log(`\n${colors.bright}Issue Distribution:${colors.reset}`);
  const maxBar = 10;
  const newBar = '🔴'.repeat(Math.min(result.newIssues.length, maxBar));
  const fixedBar = '🟢'.repeat(Math.min(result.fixedIssues.length, maxBar));
  const unchangedBar = '⚪'.repeat(Math.min(result.unchangedIssues.length, maxBar));
  
  console.log(`  New:       ${newBar} (${summary.totalNew})`);
  console.log(`  Fixed:     ${fixedBar} (${summary.totalFixed})`);
  console.log(`  Unchanged: ${unchangedBar} (${summary.totalUnchanged})`);
  
  // Recommendations
  console.log(`\n${colors.bright}Recommendations:${colors.reset}`);
  result.recommendations.forEach(rec => {
    console.log(`  ${rec}`);
  });
  
  // Generate markdown report
  const markdownReport = categorizer.generateDiffReport(result);
  const reportPath = `/tmp/pr-analysis-report-${Date.now()}.md`;
  require('fs').writeFileSync(reportPath, markdownReport);
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  
  // Key insight
  console.log('\n' + '═'.repeat(80));
  console.log(`\n${colors.bright}${colors.green}✨ KEY INSIGHT${colors.reset}\n`);
  console.log('By analyzing both branches separately and comparing:');
  console.log(`  • We correctly identified ${result.newIssues.length} NEW issues introduced by the PR`);
  console.log(`  • We recognized ${result.fixedIssues.length} issues that were FIXED`);
  console.log(`  • We avoided flagging ${result.unchangedIssues.length} pre-existing issues as new`);
  console.log('\nThis gives reviewers the right focus: what changed, not what already existed.');
  
  console.log('\n' + '═'.repeat(80) + '\n');
}

// Run the test
console.log('Testing PR issue categorization...\n');

testCategorization().catch(error => {
  console.error(`\n${colors.red}Error:${colors.reset}`, error);
  process.exit(1);
});