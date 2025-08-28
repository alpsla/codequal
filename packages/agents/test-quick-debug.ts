#!/usr/bin/env npx ts-node
/**
 * Quick debug with mock data to test unchanged issues
 */

import { PRAnalysisCategorizer } from './src/standard/services/pr-analysis-categorizer';
import { ReportGeneratorV8Final } from './src/standard/comparison/report-generator-v8-final';

async function quickDebug() {
  console.log('=== Quick Debug: Unchanged Issues ===\n');
  
  const categorizer = new PRAnalysisCategorizer();
  const reportGenerator = new ReportGeneratorV8Final();
  
  // Mock issues for testing
  const mainIssues = [
    {
      id: '1',
      title: 'SQL injection vulnerability',
      message: 'SQL injection vulnerability',
      severity: 'critical',
      category: 'security',
      location: { file: 'src/db.js', line: 10 },
      codeSnippet: 'db.query(`SELECT * FROM users WHERE id = ${id}`)'
    },
    {
      id: '2',
      title: 'Missing error handling',
      message: 'Missing error handling',
      severity: 'high',
      category: 'error-handling',
      location: { file: 'src/api.js', line: 20 },
      codeSnippet: 'fetch(url).then(res => res.json())'
    },
    {
      id: '3',
      title: 'Performance issue',
      message: 'Performance issue',
      severity: 'medium',
      category: 'performance',
      location: { file: 'src/utils.js', line: 30 },
      codeSnippet: 'array.filter().map().reduce()'
    }
  ];
  
  // PR has same issues (unchanged) plus one new
  const prIssues = [
    // Same issues (should be UNCHANGED)
    {
      id: '1',
      title: 'SQL injection vulnerability',
      message: 'SQL injection vulnerability',
      severity: 'critical',
      category: 'security',
      location: { file: 'src/db.js', line: 10 },
      codeSnippet: 'db.query(`SELECT * FROM users WHERE id = ${id}`)'
    },
    {
      id: '2',
      title: 'Missing error handling',
      message: 'Missing error handling',
      severity: 'high',
      category: 'error-handling',
      location: { file: 'src/api.js', line: 20 },
      codeSnippet: 'fetch(url).then(res => res.json())'
    },
    // New issue
    {
      id: '4',
      title: 'New security issue',
      message: 'New security issue',
      severity: 'critical',
      category: 'security',
      location: { file: 'src/new.js', line: 5 },
      codeSnippet: 'eval(userInput)'
    }
  ];
  
  // Categorize
  console.log('Categorizing issues...');
  const categorized = categorizer.categorizeIssues(mainIssues, prIssues);
  
  console.log('\n📊 Categorization Results:');
  console.log(`  NEW: ${categorized.newIssues?.length || 0}`);
  console.log(`  FIXED: ${categorized.fixedIssues?.length || 0}`);
  console.log(`  UNCHANGED: ${categorized.unchangedIssues?.length || 0}`);
  console.log(`  Summary.totalUnchanged: ${categorized.summary.totalUnchanged}`);
  
  // Build comparison result
  const comparisonResult = {
    success: true,
    mainBranch: { name: 'main', issues: mainIssues },
    prBranch: { name: 'PR #700', issues: prIssues },
    newIssues: categorized.newIssues?.map((item: any) => item.issue || item) || [],
    resolvedIssues: categorized.fixedIssues?.map((item: any) => item.issue || item) || [],
    unchangedIssues: categorized.unchangedIssues?.map((item: any) => item.issue || item) || [],
    repositoryUrl: 'https://github.com/test/repo',
    prNumber: '700',
    metadata: { timestamp: new Date() }
  };
  
  console.log('\n📊 ComparisonResult counts:');
  console.log(`  newIssues: ${comparisonResult.newIssues.length}`);
  console.log(`  resolvedIssues: ${comparisonResult.resolvedIssues.length}`);
  console.log(`  unchangedIssues: ${comparisonResult.unchangedIssues.length}`);
  
  // Generate report
  console.log('\nGenerating report...');
  const report = await reportGenerator.generateReport(comparisonResult as any);
  
  // Check report
  const lines = report.split('\n').slice(0, 30);
  const summaryLine = lines.find(l => l.includes('Pre-existing:'));
  
  console.log('\n📄 Report Summary Line:');
  console.log(summaryLine || 'NOT FOUND');
  
  // Diagnosis
  console.log('\n' + '='.repeat(50));
  if (categorized.unchangedIssues?.length > 0 && summaryLine?.includes('Pre-existing: 0')) {
    console.log('❌ BUG CONFIRMED: Report shows 0 but should show', categorized.unchangedIssues.length);
  } else if (summaryLine?.includes(`Pre-existing: ${categorized.unchangedIssues?.length}`)) {
    console.log('✅ Working correctly');
  } else {
    console.log('⚠️ Unable to determine - check manually');
  }
}

quickDebug().catch(console.error);