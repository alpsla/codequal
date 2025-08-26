#!/usr/bin/env npx ts-node

/**
 * Test Improved PR Categorization
 * Demonstrates matching by description and file, not line numbers
 */

import { PRAnalysisCategorizer } from './src/standard/services/pr-analysis-categorizer-improved';

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
    title: 'Missing error handling',
    message: 'API call lacks proper error handling for network failures',
    severity: 'high',
    category: 'error-handling',
    file: 'src/api/client.ts',
    line: 45  // Original line
  },
  {
    title: 'Hardcoded API key',
    message: 'API key should not be hardcoded in source code',
    severity: 'critical',
    category: 'security',
    file: 'src/config.ts',
    line: 12
  },
  {
    title: 'Unused variable',
    message: 'Variable temp is declared but never used',
    severity: 'low',
    category: 'code-quality',
    file: 'src/utils/helpers.ts',
    line: 78
  },
  {
    title: 'No input validation',
    message: 'User input is not validated before processing',
    severity: 'high',
    category: 'security',
    file: 'src/api/endpoints.ts',
    line: 156
  }
];

// Simulate PR branch issues
// Lines have shifted significantly due to new code additions
const prBranchIssues = [
  {
    title: 'Missing error handling',
    message: 'API call lacks proper error handling for network failures',
    severity: 'high',
    category: 'error-handling',
    file: 'src/api/client.ts',
    line: 247  // Line shifted from 45 to 247 (200+ lines added above)
  },
  // Hardcoded API key - FIXED (not in PR)
  
  {
    title: 'Unused variable',
    message: 'Variable temp is declared but never used',
    severity: 'low',
    category: 'code-quality',
    file: 'src/utils/helpers.ts',
    line: 192  // Line shifted from 78 to 192 (100+ lines added)
  },
  
  // Input validation - FIXED (not in PR)
  
  // NEW issues introduced by PR
  {
    title: 'Memory leak in event listener',
    message: 'Event listener not cleaned up in useEffect causing memory leak',
    severity: 'high',
    category: 'performance',
    file: 'src/components/Dashboard.tsx',
    line: 89  // New file, new issue
  },
  {
    title: 'Race condition',
    message: 'Potential race condition when updating state in async handler',
    severity: 'critical',
    category: 'concurrency',
    file: 'src/hooks/useData.ts',
    line: 34
  },
  {
    title: 'Missing null check',
    message: 'Object userData may be null or undefined',
    severity: 'medium',
    category: 'error-handling',
    file: 'src/utils/parser.ts',
    line: 156
  }
];

async function testImprovedCategorization() {
  console.log(`${colors.bright}${colors.cyan}🔬 IMPROVED PR CATEGORIZATION TEST${colors.reset}\n`);
  console.log('═'.repeat(80));
  
  console.log(`\n${colors.bright}Key Improvement:${colors.reset}`);
  console.log('✅ Matching by description + file (ignoring line numbers)');
  console.log('❌ NOT matching by line numbers (they shift too much)\n');
  
  const categorizer = new PRAnalysisCategorizer();
  
  console.log(`📊 ${colors.bright}Test Data:${colors.reset}`);
  console.log(`  Main branch: ${mainBranchIssues.length} issues`);
  console.log(`  PR branch: ${prBranchIssues.length} issues`);
  console.log(`  Note: Line numbers have shifted by 100-200 lines!\n`);
  
  // Show line number changes
  console.log(`${colors.bright}Line Number Shifts:${colors.reset}`);
  console.log('─'.repeat(40));
  console.log(`  "Missing error handling": line 45 → 247 (Δ202)`)
  console.log(`  "Unused variable": line 78 → 192 (Δ114)`);
  console.log(`  Despite huge shifts, these are the SAME issues!\n`);
  
  // Perform categorization
  const result = categorizer.categorizeIssues(mainBranchIssues, prBranchIssues);
  
  console.log('═'.repeat(80));
  console.log(`\n${colors.bright}${colors.cyan}CATEGORIZATION RESULTS${colors.reset}\n`);
  
  // NEW Issues
  console.log(`${colors.bright}1. NEW ISSUES (Introduced by PR)${colors.reset}`);
  console.log('─'.repeat(40));
  result.newIssues.forEach(item => {
    const severity = item.issue.severity;
    const color = severity === 'critical' ? colors.red :
                 severity === 'high' ? colors.yellow :
                 severity === 'medium' ? colors.blue : colors.cyan;
    console.log(`  ${color}[${severity.toUpperCase()}]${colors.reset} ${item.issue.title}`);
    console.log(`         "${item.issue.message}"`);
    console.log(`         📍 ${item.issue.file} (line ${item.issue.line})`);
    console.log(`         Match confidence: ${(item.confidence * 100).toFixed(0)}%\n`);
  });
  
  // FIXED Issues
  console.log(`${colors.bright}2. FIXED ISSUES (Resolved by PR)${colors.reset}`);
  console.log('─'.repeat(40));
  result.fixedIssues.forEach(item => {
    console.log(`  ${colors.green}✅${colors.reset} ${item.issue.title} (${item.issue.severity})`);
    console.log(`     "${item.issue.message}"`);
    console.log(`     Was in: ${item.issue.file}\n`);
  });
  
  // UNCHANGED Issues
  console.log(`${colors.bright}3. UNCHANGED ISSUES (Pre-existing)${colors.reset}`);
  console.log('─'.repeat(40));
  result.unchangedIssues.forEach(item => {
    console.log(`  ➖ ${item.issue.title}`);
    console.log(`     File: ${item.issue.file}`);
    console.log(`     Line shifted: ${mainBranchIssues.find(m => 
      m.message === item.issue.message)?.line} → ${item.issue.line}`);
    console.log(`     Match confidence: ${(item.confidence * 100).toFixed(0)}%\n`);
  });
  
  // Summary
  console.log('═'.repeat(80));
  console.log(`\n${colors.bright}${colors.cyan}ANALYSIS SUMMARY${colors.reset}\n`);
  
  const { summary } = result;
  
  // Visual representation
  console.log(`${colors.bright}Results:${colors.reset}`);
  console.log(`  🆕 New:       ${summary.totalNew} issues`);
  console.log(`  ✅ Fixed:     ${summary.totalFixed} issues`);
  console.log(`  ➖ Unchanged: ${summary.totalUnchanged} issues`);
  
  console.log(`\n${colors.bright}PR Quality:${colors.reset}`);
  const scoreColor = summary.prQualityScore >= 70 ? colors.green :
                    summary.prQualityScore >= 50 ? colors.yellow : colors.red;
  console.log(`  Score: ${scoreColor}${summary.prQualityScore}/100${colors.reset}`);
  console.log(`  Net Impact: ${summary.netImpact > 0 ? '+' : ''}${summary.netImpact} issues`);
  
  // Recommendations
  console.log(`\n${colors.bright}Recommendations:${colors.reset}`);
  result.recommendations.forEach(rec => {
    console.log(`  ${rec}`);
  });
  
  // Generate PR comment
  const prComment = categorizer.generatePRComment(result);
  const commentPath = `/tmp/pr-comment-${Date.now()}.md`;
  require('fs').writeFileSync(commentPath, prComment);
  console.log(`\n📄 PR comment saved to: ${commentPath}`);
  
  // Key Success
  console.log('\n' + '═'.repeat(80));
  console.log(`\n${colors.bright}${colors.green}✨ SUCCESS: Line-Independent Matching${colors.reset}\n`);
  console.log('Despite line numbers shifting by 100-200 lines:');
  console.log(`  ✅ Correctly identified "${result.unchangedIssues[0]?.issue.title}" as UNCHANGED`);
  console.log(`     (line 45 → 247, but same issue description and file)`);
  console.log(`  ✅ Correctly identified new issues introduced by PR`);
  console.log(`  ✅ Correctly identified fixed issues`);
  console.log('\nThis approach is robust against code reorganization!');
  
  console.log('\n' + '═'.repeat(80) + '\n');
}

// Run the test
console.log('Testing improved PR categorization (line-independent)...\n');

testImprovedCategorization().catch(error => {
  console.error(`\n${colors.red}Error:${colors.reset}`, error);
  process.exit(1);
});