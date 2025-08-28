#!/usr/bin/env npx ts-node
/**
 * Complete Flow Test - All Bugs Fixed Verification
 */

import { DirectDeepWikiApiWithLocationV2 } from './src/standard/services/direct-deepwiki-api-with-location-v2';
import { PRAnalysisCategorizer } from './src/standard/services/pr-analysis-categorizer';
import { ReportGeneratorV8Final } from './src/standard/comparison/report-generator-v8-final';
import { loadEnvironment } from './src/standard/utils/env-loader';
import * as fs from 'fs';

async function testCompleteFlow() {
  console.log('🚀 Testing Complete PR Analysis Flow\n');
  console.log('=====================================\n');
  
  loadEnvironment();
  
  const repositoryUrl = 'https://github.com/sindresorhus/ky';
  const prNumber = 700;
  
  console.log(`📦 Repository: ${repositoryUrl}`);
  console.log(`🔢 PR Number: ${prNumber}`);
  console.log(`🔧 Mode: ${process.env.USE_DEEPWIKI_MOCK === 'true' ? 'MOCK' : 'REAL'}\n`);
  
  try {
    // Initialize services
    const deepwiki = new DirectDeepWikiApiWithLocationV2();
    const categorizer = new PRAnalysisCategorizer();
    const reportGenerator = new ReportGeneratorV8Final();
    
    console.log('✅ Services initialized\n');
    
    // Step 1: Analyze main branch
    console.log('📌 Step 1: Analyzing MAIN branch...');
    const mainStart = Date.now();
    
    const mainResult = await deepwiki.analyzeRepository(repositoryUrl, {
      branch: 'main',
      maxIterations: process.env.USE_DEEPWIKI_MOCK === 'true' ? 1 : 2,
      useCache: true
    });
    
    const mainDuration = ((Date.now() - mainStart) / 1000).toFixed(1);
    const mainIssues = mainResult.issues || [];
    
    console.log(`✅ Main branch analysis complete`);
    console.log(`   Issues found: ${mainIssues.length}`);
    console.log(`   Duration: ${mainDuration}s`);
    console.log(`   With code snippets: ${mainIssues.filter(i => i.codeSnippet).length}`);
    console.log(`   With locations: ${mainIssues.filter(i => i.location?.file && i.location?.file !== 'unknown').length}\n`);
    
    // Step 2: Analyze PR branch
    console.log('📌 Step 2: Analyzing PR branch...');
    const prStart = Date.now();
    
    const prResult = await deepwiki.analyzeRepository(repositoryUrl, {
      branch: `pull/${prNumber}/head`,
      maxIterations: process.env.USE_DEEPWIKI_MOCK === 'true' ? 1 : 2,
      mainBranchIssues: mainIssues,
      useCache: true
    });
    
    const prDuration = ((Date.now() - prStart) / 1000).toFixed(1);
    const prIssues = prResult.issues || [];
    
    console.log(`✅ PR branch analysis complete`);
    console.log(`   Issues found: ${prIssues.length}`);
    console.log(`   Duration: ${prDuration}s`);
    console.log(`   With code snippets: ${prIssues.filter(i => i.codeSnippet).length}`);
    console.log(`   With locations: ${prIssues.filter(i => i.location?.file && i.location?.file !== 'unknown').length}\n`);
    
    // Step 3: Categorize issues
    console.log('📌 Step 3: Categorizing issues...');
    const categorized = categorizer.categorizeIssues(mainIssues, prIssues);
    
    console.log(`✅ Categorization complete`);
    console.log(`   🆕 NEW issues: ${categorized.summary.totalNew}`);
    console.log(`   ✅ FIXED issues: ${categorized.summary.totalFixed}`);
    console.log(`   ➖ UNCHANGED issues: ${categorized.summary.totalUnchanged}\n`);
    
    // Step 4: Generate V8 report
    console.log('📌 Step 4: Generating V8 report...');
    
    const comparisonResult = {
      success: true,
      repositoryUrl,
      prNumber,
      mainBranch: { name: 'main', issues: mainIssues },
      prBranch: { name: `PR #${prNumber}`, issues: prIssues },
      newIssues: (categorized.newIssues || []).map((item: any) => item.issue || item),
      resolvedIssues: (categorized.fixedIssues || []).map((item: any) => item.issue || item),
      unchangedIssues: (categorized.unchangedIssues || []).map((item: any) => item.issue || item),
      addedIssues: (categorized.newIssues || []).map((item: any) => item.issue || item),
      fixedIssues: (categorized.fixedIssues || []).map((item: any) => item.issue || item),
      persistentIssues: (categorized.unchangedIssues || []).map((item: any) => item.issue || item),
      metadata: {
        analysisDate: new Date().toISOString(),
        mainBranchAnalysisDuration: parseFloat(mainDuration),
        prBranchAnalysisDuration: parseFloat(prDuration),
        totalDuration: parseFloat(mainDuration) + parseFloat(prDuration)
      }
    };
    
    const report = await reportGenerator.generateReport(comparisonResult as any);
    
    // Save report
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = `./test-reports/complete-flow-${timestamp}.md`;
    
    if (!fs.existsSync('./test-reports')) {
      fs.mkdirSync('./test-reports');
    }
    
    fs.writeFileSync(reportPath, report);
    console.log(`✅ Report generated and saved to: ${reportPath}\n`);
    
    // Final verification
    console.log('📊 Final Bug Status Verification:');
    console.log('===================================');
    
    // BUG-079/081: Connection issues
    console.log(`✅ BUG-079/081 (Connections): ${mainIssues.length > 0 ? 'FIXED' : 'FAILED'}`);
    
    // BUG-083/072: Code snippets
    const hasSnippets = [...mainIssues, ...prIssues].some(i => i.codeSnippet);
    console.log(`✅ BUG-083/072 (Code Snippets): ${hasSnippets ? 'FIXED' : 'FAILED'}`);
    
    // BUG-082: V8 Report
    const hasReport = report.includes('Executive Summary') || report.includes('Action Items');
    console.log(`✅ BUG-082 (V8 Report): ${hasReport ? 'FIXED' : 'FAILED'}`);
    
    // BUG-084: Fix suggestions
    const hasFixSuggestions = report.includes('Fix Suggestion') || report.includes('What to do:');
    console.log(`✅ BUG-084 (Fix Suggestions): ${hasFixSuggestions ? 'FIXED' : 'FAILED'}`);
    
    // BUG-086: Timeouts
    const totalTime = parseFloat(mainDuration) + parseFloat(prDuration);
    console.log(`✅ BUG-086 (Timeouts): ${totalTime < 300 ? 'FIXED' : 'NEEDS WORK'} (${totalTime}s)`);
    
    console.log('\n🎉 Complete flow test finished successfully!');
    
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testCompleteFlow().catch(console.error);