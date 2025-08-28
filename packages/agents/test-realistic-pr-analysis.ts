#!/usr/bin/env ts-node

/**
 * Realistic PR Analysis Test
 * Demonstrates the fix suggestion system with issues commonly found in real PRs
 */

import { ReportGeneratorV8Final } from './dist/standard/comparison/report-generator-v8-final';
import { ComparisonResult, Issue } from './dist/standard/types/analysis-types';
import * as fs from 'fs';
import * as path from 'path';

// Realistic issues based on common patterns in sindresorhus/ky PR #700
const createRealisticIssues = (): Issue[] => [
  {
    id: 'ky-pr700-001',
    severity: 'high',
    category: 'security',
    type: 'vulnerability',
    location: {
      file: 'source/core/Ky.ts',
      line: 245,
      column: 12
    },
    message: 'User-provided headers are concatenated without validation',
    title: 'Header Injection Vulnerability',
    description: 'User input from options.headers is directly passed to fetch without validation, potentially allowing header injection attacks',
    codeSnippet: `const headers = {
  ...this.#request.headers,
  ...options.headers,
  ...userHeaders // User input not validated
};`,
    suggestedFix: 'Validate and sanitize header values before use'
  },
  {
    id: 'ky-pr700-002',
    severity: 'medium',
    category: 'code-quality',
    type: 'bug',
    location: {
      file: 'source/core/Ky.ts',
      line: 189,
      column: 8
    },
    message: 'Missing null check for response object',
    title: 'Potential Null Reference Exception',
    description: 'Response object accessed without verifying it exists',
    codeSnippet: `async #fetch() {
  const response = await fetch(this.#request);
  response.headers.forEach(...); // response might be null
}`,
    suggestedFix: 'Add null check before accessing response properties'
  },
  {
    id: 'ky-pr700-003',
    severity: 'high',
    category: 'security',
    type: 'vulnerability',
    location: {
      file: 'source/utils/merge.ts',
      line: 34,
      column: 15
    },
    message: 'URL parameters not properly escaped',
    title: 'XSS Risk in URL Parameter Handling',
    description: 'URL search parameters from user input are not escaped before being added to the URL',
    codeSnippet: `searchParams.append(key, value); // value not escaped`,
    suggestedFix: 'Escape special characters in URL parameters'
  },
  {
    id: 'ky-pr700-004',
    severity: 'medium',
    category: 'code-quality',
    type: 'bug',
    location: {
      file: 'source/core/constants.ts',
      line: 16,
      column: 1
    },
    message: 'Missing input validation for timeout value',
    title: 'Invalid Timeout Configuration',
    description: 'Timeout value from user options is not validated, could cause unexpected behavior with negative or non-numeric values',
    codeSnippet: `export const timeout = options.timeout || 10000; // No validation`,
    suggestedFix: 'Validate timeout is a positive number'
  },
  {
    id: 'ky-pr700-005',
    severity: 'low',
    category: 'performance',
    type: 'optimization',
    location: {
      file: 'source/core/Ky.ts',
      line: 567,
      column: 10
    },
    message: 'Inefficient array operation in hot path',
    title: 'Performance: Unnecessary Array Spread',
    description: 'Using array spread in a frequently called method causing unnecessary allocations',
    codeSnippet: `const merged = [...defaults, ...userOptions];`,
    suggestedFix: 'Use Object.assign or manual merge for better performance'
  },
  {
    id: 'ky-pr700-006',
    severity: 'medium',
    category: 'code-quality', 
    type: 'bug',
    location: {
      file: 'source/errors/HTTPError.ts',
      line: 23,
      column: 5
    },
    message: 'Error handling does not catch all promise rejections',
    title: 'Unhandled Promise Rejection',
    description: 'Async operation in constructor could throw unhandled rejection',
    codeSnippet: `constructor(response) {
  super(\`HTTP Error\`);
  this.response = response;
  response.json().then(body => { // Unhandled rejection
    this.body = body;
  });
}`,
    suggestedFix: 'Add .catch() handler for promise rejection'
  }
];

async function runRealisticAnalysis() {
  console.log('🚀 Running Realistic PR Analysis with Fix Suggestions\n');
  console.log('Repository: sindresorhus/ky');
  console.log('PR: #700 - Improve fetch error handling and add retry logic\n');

  const prIssues = createRealisticIssues();
  const mainIssues = prIssues.slice(2); // Simulate some issues already in main

  const comparisonResult: ComparisonResult = {
    mainBranch: {
      issues: mainIssues,
      issueCount: mainIssues.length,
      criticalCount: 0,
      highCount: mainIssues.filter(i => i.severity === 'high').length,
      mediumCount: mainIssues.filter(i => i.severity === 'medium').length,
      lowCount: mainIssues.filter(i => i.severity === 'low').length
    },
    prBranch: {
      issues: prIssues,
      issueCount: prIssues.length,
      criticalCount: 0,
      highCount: prIssues.filter(i => i.severity === 'high').length,
      mediumCount: prIssues.filter(i => i.severity === 'medium').length,
      lowCount: prIssues.filter(i => i.severity === 'low').length
    },
    newIssues: prIssues.slice(0, 2), // First 2 are new in PR
    resolvedIssues: [],
    unchangedIssues: mainIssues,
    repository: 'sindresorhus/ky',
    prNumber: 700,
    prTitle: 'Improve fetch error handling and add retry logic',
    prDescription: 'This PR improves error handling for failed requests and adds configurable retry logic with exponential backoff',
    prAuthor: 'contributor',
    prUrl: 'https://github.com/sindresorhus/ky/pull/700',
    timestamp: new Date().toISOString(),
    scanDuration: '28.5s',
    filesAnalyzed: 18,
    
    summary: {
      totalIssues: prIssues.length,
      newIssues: 2,
      fixedIssues: 0,
      unchangedIssues: mainIssues.length,
      criticalIssues: 0,
      highIssues: prIssues.filter(i => i.severity === 'high').length,
      mediumIssues: prIssues.filter(i => i.severity === 'medium').length,
      lowIssues: prIssues.filter(i => i.severity === 'low').length,
      score: 65, // Moderate score due to security issues
      recommendation: 'NEEDS_WORK'
    },
    
    developerSkills: {
      userId: 'contributor',
      languages: {
        typescript: { level: 3, issuesFixed: 25, issuesIntroduced: 3 },
        javascript: { level: 3, issuesFixed: 18, issuesIntroduced: 2 }
      },
      categories: {
        security: { level: 2, issuesFixed: 8, issuesIntroduced: 2 },
        performance: { level: 3, issuesFixed: 15, issuesIntroduced: 1 },
        'code-quality': { level: 3, issuesFixed: 20, issuesIntroduced: 2 }
      },
      overallLevel: 2.8,
      totalIssuesFixed: 43,
      totalIssuesIntroduced: 5,
      lastUpdated: new Date().toISOString()
    }
  };

  // Generate the report
  const generator = new ReportGeneratorV8Final();
  const report = await generator.generateReport(comparisonResult);

  // Save the report
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const reportPath = path.join(__dirname, `pr-700-analysis-${timestamp}.md`);
  
  fs.writeFileSync(reportPath, report);
  
  console.log('✅ Analysis complete!\n');
  console.log('📊 Summary:');
  console.log(`  • Total Issues: ${prIssues.length}`);
  console.log(`  • New Issues: ${comparisonResult.newIssues.length}`);
  console.log(`  • High Severity: ${comparisonResult.summary.highIssues}`);
  console.log(`  • Medium Severity: ${comparisonResult.summary.mediumIssues}`);
  console.log(`  • Quality Score: ${comparisonResult.summary.score}/100`);
  console.log(`  • Recommendation: ${comparisonResult.summary.recommendation}`);
  console.log('\n✨ Fix Suggestions:');
  console.log('  • Each issue includes copy-paste ready fix code');
  console.log('  • Time estimates provided (5-15 minutes per fix)');
  console.log('  • Confidence scores indicate fix reliability');
  console.log('  • Templates applied for common security patterns');
  console.log(`\n📄 Report saved to: ${reportPath}`);
  
  return reportPath;
}

// Run the analysis
runRealisticAnalysis()
  .then(reportPath => {
    console.log('\n🎉 Success! Review the generated report for fix suggestions.');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });