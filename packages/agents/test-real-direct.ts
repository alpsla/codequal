/**
 * Direct test of real PR analysis with DeepWiki
 */

import { DirectDeepWikiApiWithLocationV2 } from './src/standard/services/direct-deepwiki-api-with-location-v2';
import { PRAnalysisCategorizer } from './src/standard/services/pr-analysis-categorizer';
import { ReportGeneratorV8Final } from './src/standard/comparison/report-generator-v8-final';
import { loadEnvironment } from './src/standard/utils/env-loader';
import * as fs from 'fs';
import * as path from 'path';

loadEnvironment();

async function testRealDirect() {
  console.log('🚀 Direct Real PR Test (ky #700)\n');
  
  const api = new DirectDeepWikiApiWithLocationV2();
  const categorizer = new PRAnalysisCategorizer();
  const reportGenerator = new ReportGeneratorV8Final();
  
  try {
    // Analyze main branch
    console.log('📊 Analyzing MAIN branch...');
    const mainAnalysis = await api.analyzeRepository('https://github.com/sindresorhus/ky', {
      branch: 'main',
      maxIterations: 3
    });
    console.log(`  Found ${mainAnalysis.issues.length} issues in main`);
    
    // Analyze PR branch
    console.log('\n📊 Analyzing PR branch...');
    const prAnalysis = await api.analyzeRepository('https://github.com/sindresorhus/ky', {
      branch: 'pull/700/head',
      mainBranchIssues: mainAnalysis.issues,
      maxIterations: 3
    });
    console.log(`  Found ${prAnalysis.issues.length} issues in PR`);
    
    // Categorize issues
    console.log('\n🔍 Categorizing issues...');
    const categorized = categorizer.categorizeIssues(mainAnalysis.issues, prAnalysis.issues);
    
    console.log(`  NEW: ${categorized.summary.totalNew}`);
    console.log(`  FIXED: ${categorized.summary.totalFixed}`);
    console.log(`  UNCHANGED: ${categorized.summary.totalUnchanged}`);
    
    // Generate report
    console.log('\n📝 Generating report...');
    const reportData = await reportGenerator.generateReport({
      ...categorized,
      prMetadata: {
        repositoryUrl: 'https://github.com/sindresorhus/ky',
        prNumber: 700,
        title: 'Test PR',
        author: 'test',
        branch: 'pr-700',
        targetBranch: 'main',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        prUrl: 'https://github.com/sindresorhus/ky/pull/700'
      }
    });
    
    console.log('Report data:', Object.keys(reportData || {}));
    
    // Save report
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(
      __dirname,
      'test-reports',
      `pr-analysis-direct-${timestamp}.md`
    );
    
    if (!fs.existsSync(path.dirname(reportPath))) {
      fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    }
    
    const markdown = reportData?.markdown || reportData || 'Report generation failed';
    fs.writeFileSync(reportPath, markdown);
    console.log(`\n✅ Report saved to: ${reportPath}`);
    
    // Check code quality
    const allIssues = [...categorized.newIssues, ...categorized.unchangedIssues];
    let realCodeCount = 0;
    let fakeCodeCount = 0;
    
    allIssues.forEach(issue => {
      if (issue.codeSnippet && 
          !issue.codeSnippet.includes('[exact code not provided]') &&
          !issue.codeSnippet.includes('YOUR_API_KEY') &&
          !issue.codeSnippet.includes('// Code location:')) {
        realCodeCount++;
      } else {
        fakeCodeCount++;
      }
    });
    
    console.log('\n📊 Code Quality:');
    console.log(`  Real code snippets: ${realCodeCount}`);
    console.log(`  Missing/fake snippets: ${fakeCodeCount}`);
    console.log(`  Success rate: ${((realCodeCount / Math.max(1, allIssues.length)) * 100).toFixed(1)}%`);
    
    // Show sample issues
    console.log('\n📋 Sample Issues:');
    allIssues.slice(0, 3).forEach((issue, idx) => {
      console.log(`\n${idx + 1}. ${issue.title || issue.description}`);
      console.log(`   Location: ${issue.location?.file || 'unknown'}:${issue.location?.line || '?'}`);
      if (issue.codeSnippet) {
        console.log(`   Code: ${issue.codeSnippet.substring(0, 80)}...`);
      }
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testRealDirect().catch(console.error);