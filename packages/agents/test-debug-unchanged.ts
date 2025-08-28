#!/usr/bin/env npx ts-node
/**
 * Debug script to trace where unchanged issues are being lost
 */

import { DirectDeepWikiApiWithLocation } from './src/standard/services/direct-deepwiki-api-with-location';
import { PRAnalysisCategorizer } from './src/standard/services/pr-analysis-categorizer';
import { ReportGeneratorV8Final } from './src/standard/comparison/report-generator-v8-final';

async function debugUnchangedIssues() {
  console.log('=== Debugging Unchanged Issues Count ===\n');
  
  // Force real DeepWiki
  delete process.env.USE_DEEPWIKI_MOCK;
  process.env.USE_DEEPWIKI_MOCK = 'false';
  
  const repositoryUrl = 'https://github.com/sindresorhus/ky';
  const prNumber = 700;
  
  try {
    const deepwikiClient = new DirectDeepWikiApiWithLocation();
    const categorizer = new PRAnalysisCategorizer();
    const reportGenerator = new ReportGeneratorV8Final();
    
    // Step 1: Get main branch issues
    console.log('Step 1: Analyzing MAIN branch...');
    const mainResult = await deepwikiClient.analyzeRepository(repositoryUrl, {
      branch: 'main',
      useCache: false,
      maxIterations: 1
    });
    const mainIssues = mainResult.issues || [];
    console.log(`✅ Main branch: ${mainIssues.length} issues\n`);
    
    // Step 2: Get PR branch issues WITH main branch context
    console.log('Step 2: Analyzing PR branch...');
    const prResult = await deepwikiClient.analyzeRepository(repositoryUrl, {
      branch: `pull/${prNumber}/head`,
      useCache: false,
      maxIterations: 1,
      mainBranchIssues: mainIssues // Pass main issues for comparison
    });
    const prIssues = prResult.issues || [];
    console.log(`✅ PR branch: ${prIssues.length} issues\n`);
    
    // Step 3: Debug categorization
    console.log('Step 3: Categorizing issues...');
    const categorized = categorizer.categorizeIssues(mainIssues, prIssues);
    
    console.log('📊 Categorization Results:');
    console.log(`  NEW: ${categorized.newIssues?.length || 0} issues`);
    console.log(`  FIXED: ${categorized.fixedIssues?.length || 0} issues`);
    console.log(`  UNCHANGED: ${categorized.unchangedIssues?.length || 0} issues`);
    console.log(`  Summary.totalUnchanged: ${categorized.summary.totalUnchanged}`);
    
    // Debug: Show actual unchanged issues
    if (categorized.unchangedIssues && categorized.unchangedIssues.length > 0) {
      console.log('\n📝 Unchanged issues details:');
      categorized.unchangedIssues.slice(0, 3).forEach((item: any, idx: number) => {
        const issue = item.issue || item;
        console.log(`  ${idx + 1}. ${issue.title || issue.message}`);
        console.log(`     Location: ${issue.location?.file || 'unknown'}:${issue.location?.line || '?'}`);
      });
    }
    
    // Step 4: Check what gets passed to report generator
    console.log('\nStep 4: Building comparison result...');
    const comparisonResult = {
      success: true,
      mainBranch: { name: 'main', issues: mainIssues },
      prBranch: { name: `PR #${prNumber}`, issues: prIssues },
      newIssues: categorized.newIssues?.map((item: any) => item.issue || item) || [],
      resolvedIssues: categorized.fixedIssues?.map((item: any) => item.issue || item) || [],
      unchangedIssues: categorized.unchangedIssues?.map((item: any) => item.issue || item) || [],
      repositoryUrl,
      prNumber: prNumber.toString(),
      metadata: { timestamp: new Date() }
    };
    
    console.log('\n📊 ComparisonResult counts:');
    console.log(`  newIssues: ${comparisonResult.newIssues.length}`);
    console.log(`  resolvedIssues: ${comparisonResult.resolvedIssues.length}`);
    console.log(`  unchangedIssues: ${comparisonResult.unchangedIssues.length}`);
    
    // Step 5: Generate report to see final output
    console.log('\nStep 5: Generating report...');
    const report = await reportGenerator.generateReport(comparisonResult);
    
    // Check report for pre-existing count
    const preExistingMatch = report.match(/Pre-existing:\s*(\d+)/);
    const preExistingCount = preExistingMatch ? parseInt(preExistingMatch[1]) : -1;
    
    console.log('\n📄 Report Analysis:');
    console.log(`  Pre-existing count in report: ${preExistingCount}`);
    
    // Final diagnosis
    console.log('\n' + '='.repeat(50));
    console.log('DIAGNOSIS:');
    console.log('='.repeat(50));
    
    if (categorized.unchangedIssues?.length > 0 && preExistingCount === 0) {
      console.log('❌ BUG CONFIRMED: Unchanged issues are categorized correctly');
      console.log('   but not showing in the report summary!');
      console.log(`   Expected: ${categorized.unchangedIssues.length}`);
      console.log(`   Actual in report: ${preExistingCount}`);
    } else if (categorized.unchangedIssues?.length === 0) {
      console.log('⚠️ Issue is in categorization: No unchanged issues detected');
      console.log('   This might be due to fingerprint mismatch');
    } else {
      console.log('✅ Working correctly');
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

debugUnchangedIssues().catch(console.error);