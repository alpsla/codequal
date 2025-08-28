/**
 * Test V8 Report Generation - BUG-082 verification
 */

import { ReportGeneratorV8Final } from './src/standard/comparison/report-generator-v8-final';

async function testV8Generation() {
  console.log('🔍 Testing V8 Report Generation (BUG-082 Fix Verification)\n');
  
  const generator = new ReportGeneratorV8Final();
  
  // Create test data matching expected structure
  const comparisonResult = {
    success: true,
    repositoryUrl: 'https://github.com/sindresorhus/ky',
    
    mainBranch: {
      name: 'main',
      issues: [
        {
          id: 'main-1',
          title: 'Unhandled Promise Rejection',
          severity: 'high',
          category: 'quality',
          location: { file: 'index.js', line: 42 },
          codeSnippet: 'return fetch(url).then(response => response.json());'
        },
        {
          id: 'main-2',
          title: 'Missing Input Validation',
          severity: 'high',
          category: 'security',
          location: { file: 'index.js', line: 67 },
          codeSnippet: 'const url = userInput.url;'
        }
      ]
    },
    
    prBranch: {
      name: 'PR #700',
      issues: [
        {
          id: 'pr-1',
          title: 'Unhandled Promise Rejection',
          severity: 'high',
          category: 'quality',
          location: { file: 'index.js', line: 42 },
          codeSnippet: 'return fetch(url).then(response => response.json());',
          status: 'unchanged'
        },
        {
          id: 'pr-2',
          title: 'New TypeScript Error',
          severity: 'medium',
          category: 'quality',
          location: { file: 'types.d.ts', line: 10 },
          codeSnippet: 'export interface Options { timeout?: never; }',
          status: 'new'
        }
      ]
    },
    
    // These are the categorized issues
    newIssues: [{
      id: 'pr-2',
      title: 'New TypeScript Error',
      severity: 'medium',
      category: 'quality',
      location: { file: 'types.d.ts', line: 10 },
      codeSnippet: 'export interface Options { timeout?: never; }'
    }],
    
    resolvedIssues: [{
      id: 'main-2',
      title: 'Missing Input Validation',
      severity: 'high',
      category: 'security',
      location: { file: 'index.js', line: 67 },
      codeSnippet: 'const url = userInput.url;'
    }],
    
    unchangedIssues: [{
      id: 'main-1',
      title: 'Unhandled Promise Rejection',
      severity: 'high',
      category: 'quality',
      location: { file: 'index.js', line: 42 },
      codeSnippet: 'return fetch(url).then(response => response.json());'
    }],
    
    // Add alternate field names
    addedIssues: [{
      id: 'pr-2',
      title: 'New TypeScript Error',
      severity: 'medium',
      category: 'quality',
      location: { file: 'types.d.ts', line: 10 },
      codeSnippet: 'export interface Options { timeout?: never; }'
    }],
    
    fixedIssues: [{
      id: 'main-2',
      title: 'Missing Input Validation',
      severity: 'high',
      category: 'security',
      location: { file: 'index.js', line: 67 },
      codeSnippet: 'const url = userInput.url;'
    }],
    
    persistentIssues: [{
      id: 'main-1',
      title: 'Unhandled Promise Rejection',
      severity: 'high',
      category: 'quality',
      location: { file: 'index.js', line: 42 },
      codeSnippet: 'return fetch(url).then(response => response.json());'
    }],
    
    metadata: {
      analysisDate: new Date().toISOString(),
      mainBranchAnalysisDuration: 15.2,
      prBranchAnalysisDuration: 18.7,
      totalDuration: 33.9
    },
    
    prNumber: 700
  };
  
  try {
    console.log('📝 Generating report...');
    const report = await generator.generateReport(comparisonResult as any);
    
    // Check report content
    const hasExecutiveSummary = report.includes('## 📊 Executive Summary');
    const hasNewIssues = report.includes('New Issues:') || report.includes('new issue');
    const hasResolvedIssues = report.includes('Resolved:') || report.includes('fixed issue');
    const hasCodeSnippets = report.includes('```');
    const hasActionItems = report.includes('## ✅ Action Items');
    const hasPRDecision = report.includes('PR Decision') || report.includes('merge recommendation');
    
    console.log('\n📊 Report Content Analysis:');
    console.log(`  ✅ Executive Summary: ${hasExecutiveSummary ? 'YES' : 'NO ❌'}`);
    console.log(`  ✅ New Issues Section: ${hasNewIssues ? 'YES' : 'NO ❌'}`);
    console.log(`  ✅ Resolved Issues Section: ${hasResolvedIssues ? 'YES' : 'NO ❌'}`);
    console.log(`  ✅ Code Snippets: ${hasCodeSnippets ? 'YES' : 'NO ❌'}`);
    console.log(`  ✅ Action Items: ${hasActionItems ? 'YES' : 'NO ❌'}`);
    console.log(`  ✅ PR Decision: ${hasPRDecision ? 'YES' : 'NO ❌'}`);
    
    // Save report for review
    const fs = require('fs');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = `./test-reports/v8-test-report-${timestamp}.md`;
    
    // Ensure directory exists
    if (!fs.existsSync('./test-reports')) {
      fs.mkdirSync('./test-reports');
    }
    
    fs.writeFileSync(reportPath, report);
    console.log(`\n📄 Report saved to: ${reportPath}`);
    
    // Check if report is complete (has most sections)
    const sections = [hasExecutiveSummary, hasNewIssues, hasResolvedIssues, hasCodeSnippets, hasActionItems, hasPRDecision];
    const completeSections = sections.filter(Boolean).length;
    
    if (completeSections >= 5) {
      console.log('\n🎉 BUG-082 FIXED! V8 report is generating properly!');
    } else {
      console.log(`\n⚠️  BUG-082 partially fixed. Only ${completeSections}/6 sections present.`);
    }
    
  } catch (error: any) {
    console.error('❌ Error generating report:', error.message);
  }
}

testV8Generation().catch(console.error);