#!/usr/bin/env ts-node
/**
 * Test real PRs with different languages, sizes, and complexity
 * Generate detailed reports for manual validation
 */

import { config } from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment
config({ path: path.resolve(__dirname, '../../.env') });

// Test cases with real PRs
const testCases = [
  {
    name: 'Small JavaScript Library',
    repo: 'https://github.com/sindresorhus/is-odd',
    pr: 10,
    language: 'JavaScript',
    size: 'small',
    complexity: 'low',
    description: 'Simple utility library with minimal dependencies'
  },
  {
    name: 'Medium Python Web Framework',
    repo: 'https://github.com/pallets/flask',
    pr: 5200,
    language: 'Python',
    size: 'medium',
    complexity: 'medium',
    description: 'Popular web framework with moderate complexity'
  },
  {
    name: 'Large Go Web Framework',
    repo: 'https://github.com/gin-gonic/gin',
    pr: 3500,
    language: 'Go',
    size: 'large',
    complexity: 'high',
    description: 'High-performance web framework with complex routing'
  },
  {
    name: 'Complex TypeScript Framework',
    repo: 'https://github.com/vercel/next.js',
    pr: 59000,
    language: 'TypeScript',
    size: 'large',
    complexity: 'very high',
    description: 'Full-stack React framework with SSR/SSG'
  }
];

async function testRealPR(testCase: typeof testCases[0]) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🧪 Testing: ${testCase.name}`);
  console.log(`${'='.repeat(80)}`);
  console.log(`📋 Details:`);
  console.log(`   Repository: ${testCase.repo}`);
  console.log(`   PR: #${testCase.pr}`);
  console.log(`   Language: ${testCase.language}`);
  console.log(`   Size: ${testCase.size}`);
  console.log(`   Complexity: ${testCase.complexity}`);
  console.log(`   Description: ${testCase.description}`);
  
  try {
    // Import services
    const { analyzeWithStandardFramework } = require('../../apps/api/dist/services/standard-orchestrator-service.js');
    
    console.log(`\n⏳ Running analysis...`);
    const startTime = Date.now();
    
    // Run analysis
    const result = await analyzeWithStandardFramework(
      testCase.repo,
      testCase.pr,
      'main'
    );
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Analysis completed in ${duration}s`);
    
    // Extract metrics
    const metrics = {
      success: result.success,
      hasReport: !!result.report,
      hasComparison: !!result.comparison,
      newIssues: result.comparison?.newIssues?.length || 0,
      fixedIssues: result.comparison?.fixedIssues?.length || 0,
      unchangedIssues: result.comparison?.unchangedIssues?.length || 0,
      modifiedIssues: result.comparison?.modifiedIssues?.length || 0,
      totalIssues: 0,
      overallScore: result.comparison?.overallScore || 0,
      decision: result.comparison?.decision || 'UNKNOWN'
    };
    
    metrics.totalIssues = metrics.newIssues + metrics.fixedIssues + 
                          metrics.unchangedIssues + metrics.modifiedIssues;
    
    // Display results
    console.log(`\n📊 Analysis Results:`);
    console.log(`   Success: ${metrics.success}`);
    console.log(`   Decision: ${metrics.decision}`);
    console.log(`   Overall Score: ${metrics.overallScore}/100`);
    
    console.log(`\n📈 Issue Breakdown:`);
    console.log(`   New Issues: ${metrics.newIssues}`);
    console.log(`   Fixed Issues: ${metrics.fixedIssues}`);
    console.log(`   Unchanged Issues: ${metrics.unchangedIssues}`);
    console.log(`   Modified Issues: ${metrics.modifiedIssues}`);
    console.log(`   Total Processed: ${metrics.totalIssues}`);
    
    // List issues with details
    if (result.comparison) {
      if (metrics.newIssues > 0 && result.comparison.newIssues) {
        console.log(`\n🆕 New Issues Found:`);
        result.comparison.newIssues.slice(0, 5).forEach((issue: any, idx: number) => {
          console.log(`   ${idx + 1}. [${issue.severity?.toUpperCase()}] ${issue.title || issue.message}`);
          console.log(`      Category: ${issue.category}`);
          console.log(`      Location: ${issue.location?.file}:${issue.location?.line}`);
          console.log(`      Has Code Snippet: ${!!issue.codeSnippet}`);
          console.log(`      Has Suggested Fix: ${!!issue.suggestedFix}`);
        });
        if (metrics.newIssues > 5) {
          console.log(`   ... and ${metrics.newIssues - 5} more`);
        }
      }
      
      if (metrics.fixedIssues > 0 && result.comparison.fixedIssues) {
        console.log(`\n✅ Fixed Issues:`);
        result.comparison.fixedIssues.slice(0, 3).forEach((issue: any, idx: number) => {
          console.log(`   ${idx + 1}. [${issue.severity?.toUpperCase()}] ${issue.title || issue.message}`);
        });
        if (metrics.fixedIssues > 3) {
          console.log(`   ... and ${metrics.fixedIssues - 3} more`);
        }
      }
      
      if (metrics.unchangedIssues > 0 && result.comparison.unchangedIssues) {
        console.log(`\n📍 Unchanged Issues (first 3):`);
        result.comparison.unchangedIssues.slice(0, 3).forEach((issue: any, idx: number) => {
          console.log(`   ${idx + 1}. [${issue.severity?.toUpperCase()}] ${issue.title || issue.message}`);
        });
        if (metrics.unchangedIssues > 3) {
          console.log(`   ... and ${metrics.unchangedIssues - 3} more`);
        }
      }
    }
    
    // Save detailed report
    if (result.report) {
      const safeRepoName = testCase.repo.split('/').slice(-2).join('-');
      const reportPath = path.join(__dirname, 'validation-reports', `${safeRepoName}-pr${testCase.pr}-report.md`);
      
      // Create directory if it doesn't exist
      const reportDir = path.dirname(reportPath);
      if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
      }
      
      fs.writeFileSync(reportPath, result.report);
      console.log(`\n📄 Detailed report saved to: validation-reports/${path.basename(reportPath)}`);
      
      // Validate report content
      console.log(`\n🔍 Report Content Validation:`);
      const report = result.report;
      
      const validations = [
        { name: 'Has PR Decision', check: /✅ APPROVED|❌ DECLINED/.test(report) },
        { name: 'Has Executive Summary', check: /Executive Summary/i.test(report) },
        { name: 'Has Issue Sections', check: /Issues|Repository Issues/i.test(report) },
        { name: 'Has Severity Badges', check: /\[(CRITICAL|HIGH|MEDIUM|LOW)\]/.test(report) },
        { name: 'Has Code Snippets', check: /```/.test(report) },
        { name: 'Has Scores', check: /\d+\/100/.test(report) },
        { name: 'Has Recommendations', check: /Recommendation|Action Items/i.test(report) }
      ];
      
      validations.forEach(v => {
        console.log(`   ${v.check ? '✅' : '❌'} ${v.name}`);
      });
      
      // Count severity occurrences in report
      const severityCounts = {
        critical: (report.match(/\[CRITICAL\]/g) || []).length,
        high: (report.match(/\[HIGH\]/g) || []).length,
        medium: (report.match(/\[MEDIUM\]/g) || []).length,
        low: (report.match(/\[LOW\]/g) || []).length
      };
      
      console.log(`\n📊 Severity Distribution in Report:`);
      console.log(`   Critical: ${severityCounts.critical}`);
      console.log(`   High: ${severityCounts.high}`);
      console.log(`   Medium: ${severityCounts.medium}`);
      console.log(`   Low: ${severityCounts.low}`);
      console.log(`   Total Tags: ${Object.values(severityCounts).reduce((a, b) => a + b, 0)}`);
    }
    
    return metrics;
    
  } catch (error: any) {
    console.error(`\n❌ Error testing ${testCase.name}:`, error.message);
    return null;
  }
}

async function runAllTests() {
  console.log('🚀 Starting Real PR Validation Tests');
  console.log('=' .repeat(80));
  console.log(`Testing ${testCases.length} real PRs across different languages and sizes\n`);
  
  const results: any[] = [];
  
  // Run tests sequentially to avoid rate limiting
  for (const testCase of testCases) {
    const result = await testRealPR(testCase);
    results.push({
      ...testCase,
      metrics: result
    });
    
    // Wait between tests to avoid rate limiting
    if (testCase !== testCases[testCases.length - 1]) {
      console.log(`\n⏳ Waiting 5 seconds before next test...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  
  // Generate summary report
  console.log(`\n${'='.repeat(80)}`);
  console.log('📊 VALIDATION SUMMARY');
  console.log('=' .repeat(80));
  
  console.log('\n📋 Test Results Overview:\n');
  
  const table: any[] = [];
  results.forEach(r => {
    if (r.metrics) {
      table.push({
        'Test': r.name,
        'Language': r.language,
        'Size': r.size,
        'New': r.metrics.newIssues,
        'Fixed': r.metrics.fixedIssues,
        'Unchanged': r.metrics.unchangedIssues,
        'Total': r.metrics.totalIssues,
        'Score': `${r.metrics.overallScore}/100`,
        'Decision': r.metrics.decision,
        'Success': r.metrics.success ? '✅' : '❌'
      });
    }
  });
  
  console.table(table);
  
  // Validation checks
  console.log('\n🔍 Validation Checks:');
  
  const checks = [
    {
      name: 'All tests completed successfully',
      passed: results.every(r => r.metrics?.success)
    },
    {
      name: 'All tests have reports',
      passed: results.every(r => r.metrics?.hasReport)
    },
    {
      name: 'All tests have comparisons',
      passed: results.every(r => r.metrics?.hasComparison)
    },
    {
      name: 'Issues are being detected',
      passed: results.some(r => r.metrics && r.metrics.totalIssues > 0)
    },
    {
      name: 'Different languages handled',
      passed: new Set(results.map(r => r.language)).size > 1
    },
    {
      name: 'Different sizes handled',
      passed: new Set(results.map(r => r.size)).size > 1
    }
  ];
  
  checks.forEach(check => {
    console.log(`  ${check.passed ? '✅' : '❌'} ${check.name}`);
  });
  
  const allPassed = checks.every(c => c.passed);
  
  console.log(`\n${allPassed ? '✅' : '❌'} Overall Validation: ${allPassed ? 'PASSED' : 'FAILED'}`);
  
  console.log('\n📄 Reports saved in: validation-reports/');
  console.log('Please review the detailed reports to validate issue handling.\n');
}

// Run all tests
runAllTests().catch(console.error);