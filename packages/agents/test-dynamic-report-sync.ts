#\!/usr/bin/env npx ts-node

/**
 * Test to verify that reports dynamically sync with actual issues
 */

import { ReportGeneratorV7EnhancedComplete } from './src/standard/comparison/report-generator-v7-enhanced-complete';

// Test case 1: No issues (clean PR)
console.log('TEST CASE 1: Clean PR with no issues');
const generator = new ReportGeneratorV7EnhancedComplete(null, true);

const cleanComparison = {
  newIssues: [],
  resolvedIssues: [],
  modifiedIssues: [],
  unchangedIssues: [],
  summary: {
    totalNew: 0,
    totalResolved: 0,
    totalModified: 0,
    totalUnchanged: 0
  },
  prMetadata: {
    number: 100,
    title: 'Clean PR',
    author: 'developer'
  }
};

const cleanReport = generator.generateReport(cleanComparison as any);
console.log('Checking clean PR report:');
console.log('- Educational Insights should indicate no issues found:', 
  cleanReport.includes('No security issues found') ? '✅' : '❌');
console.log('- Risk Assessment should show no risks:', 
  cleanReport.includes('✅ NONE') || cleanReport.includes('No significant risks') ? '✅' : '❌');

// Test case 2: Security-heavy PR
console.log('\nTEST CASE 2: Security-heavy PR');
const securityComparison = {
  newIssues: [
    { severity: 'critical', title: 'SQL Injection', category: 'security', location: { file: 'api.ts', line: 10 } },
    { severity: 'high', title: 'Missing CSRF protection', category: 'security', location: { file: 'auth.ts', line: 20 } },
    { severity: 'high', title: 'XSS vulnerability', category: 'security', location: { file: 'ui.ts', line: 30 } }
  ],
  resolvedIssues: [],
  unchangedIssues: [],
  summary: {
    totalNew: 3,
    totalResolved: 0
  },
  prMetadata: {
    number: 101,
    title: 'Security Issues PR',
    author: 'developer'
  }
};

const securityReport = generator.generateReport(securityComparison as any);
console.log('Checking security PR report:');
console.log('- Educational Insights references security:', 
  securityReport.includes('3 security issue') ? '✅' : '❌');
console.log('- Risk Matrix shows HIGH security risk:', 
  securityReport.includes('🔴 HIGH') && securityReport.includes('3 security issues') ? '✅' : '❌');
console.log('- Customer Impact shows SEVERE:', 
  securityReport.includes('SEVERE') ? '✅' : '❌');

// Test case 3: Performance-focused PR
console.log('\nTEST CASE 3: Performance-focused PR');
const performanceComparison = {
  newIssues: [
    { severity: 'medium', title: 'Database query in loop', category: 'performance', location: { file: 'data.ts', line: 40 } },
    { severity: 'medium', title: 'Missing cache', category: 'performance', location: { file: 'service.ts', line: 50 } }
  ],
  resolvedIssues: [],
  unchangedIssues: [
    { severity: 'low', title: 'Unused variable', location: { file: 'utils.ts', line: 10 } }
  ],
  summary: {
    totalNew: 2,
    totalResolved: 0,
    totalUnchanged: 1
  },
  prMetadata: {
    number: 102,
    title: 'Performance PR',
    author: 'developer'
  }
};

const perfReport = generator.generateReport(performanceComparison as any);
console.log('Checking performance PR report:');
console.log('- Educational Insights references performance:', 
  perfReport.includes('2 performance issue') ? '✅' : '❌');
console.log('- Risk Matrix shows performance issues count:', 
  perfReport.includes('2 performance issues') ? '✅' : '❌');
console.log('- Repository issues section shows low issue:', 
  perfReport.includes('Low Repository Issues') ? '✅' : '❌');

console.log('\n✅ All dynamic report sync tests completed\!');
