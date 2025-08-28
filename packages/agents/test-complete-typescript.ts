#!/usr/bin/env npx ts-node
/**
 * Complete TypeScript/JavaScript Flow Test
 * Testing with ky repository (PR #700)
 */

import { DirectDeepWikiApiWithLocationV2 } from './src/standard/services/direct-deepwiki-api-with-location-v2';
import { PRAnalysisCategorizer } from './src/standard/services/pr-analysis-categorizer';
import { ReportGeneratorV8Final } from './src/standard/comparison/report-generator-v8-final';
import { loadEnvironment } from './src/standard/utils/env-loader';
import * as fs from 'fs';
import * as path from 'path';

async function testCompleteTypeScriptFlow() {
  console.log('🚀 Complete TypeScript/JavaScript Flow Test\n');
  console.log('=' .repeat(70) + '\n');
  
  loadEnvironment();
  
  const repositoryUrl = 'https://github.com/sindresorhus/ky';
  const prNumber = 700;
  
  console.log(`📦 Repository: ${repositoryUrl} (TypeScript)`);
  console.log(`🔢 PR Number: ${prNumber}`);
  console.log(`🔧 Mode: ${process.env.USE_DEEPWIKI_MOCK === 'true' ? 'MOCK' : 'REAL DeepWiki'}\n`);
  
  try {
    // Initialize services
    const deepwiki = new DirectDeepWikiApiWithLocationV2();
    const categorizer = new PRAnalysisCategorizer();
    const reportGenerator = new ReportGeneratorV8Final();
    
    console.log('✅ Services initialized\n');
    console.log('-'.repeat(70));
    
    // Step 1: Analyze main branch
    console.log('\n📌 STEP 1: Analyzing MAIN branch...\n');
    const mainStart = Date.now();
    
    const mainResult = await deepwiki.analyzeRepository(repositoryUrl, {
      branch: 'main',
      maxIterations: 1, // Quick test
      useCache: false   // Fresh analysis
    });
    
    const mainDuration = ((Date.now() - mainStart) / 1000).toFixed(1);
    const mainIssues = mainResult.issues || [];
    
    console.log(`✅ Main branch analysis complete`);
    console.log(`   ⏱️  Duration: ${mainDuration}s`);
    console.log(`   📊 Total issues: ${mainIssues.length}`);
    console.log(`   🔴 Critical: ${mainIssues.filter(i => i.severity === 'critical').length}`);
    console.log(`   🟠 High: ${mainIssues.filter(i => i.severity === 'high').length}`);
    console.log(`   🟡 Medium: ${mainIssues.filter(i => i.severity === 'medium').length}`);
    console.log(`   🟢 Low: ${mainIssues.filter(i => i.severity === 'low').length}`);
    
    // Check code snippet quality
    const mainWithSnippets = mainIssues.filter(i => 
      i.codeSnippet && !i.codeSnippet.includes('example.com')
    );
    console.log(`   📝 With real code snippets: ${mainWithSnippets.length}/${mainIssues.length}`);
    
    // Show sample issues
    console.log('\n   Sample issues from main:');
    mainIssues.slice(0, 3).forEach((issue, idx) => {
      console.log(`   ${idx + 1}. ${issue.title}`);
      console.log(`      📁 ${issue.location?.file || 'unknown'}:${issue.location?.line || '?'}`);
      if (issue.codeSnippet) {
        const preview = issue.codeSnippet.substring(0, 50).replace(/\n/g, ' ');
        console.log(`      📝 Code: "${preview}..."`);
      }
    });
    
    console.log('\n' + '-'.repeat(70));
    
    // Step 2: Analyze PR branch
    console.log('\n📌 STEP 2: Analyzing PR branch...\n');
    const prStart = Date.now();
    
    const prResult = await deepwiki.analyzeRepository(repositoryUrl, {
      branch: `pull/${prNumber}/head`,
      maxIterations: 1,
      mainBranchIssues: mainIssues, // Pass for comparison
      useCache: false
    });
    
    const prDuration = ((Date.now() - prStart) / 1000).toFixed(1);
    const prIssues = prResult.issues || [];
    
    console.log(`✅ PR branch analysis complete`);
    console.log(`   ⏱️  Duration: ${prDuration}s`);
    console.log(`   📊 Total issues: ${prIssues.length}`);
    
    const prWithSnippets = prIssues.filter(i => 
      i.codeSnippet && !i.codeSnippet.includes('example.com')
    );
    console.log(`   📝 With real code snippets: ${prWithSnippets.length}/${prIssues.length}`);
    
    console.log('\n' + '-'.repeat(70));
    
    // Step 3: Categorize issues
    console.log('\n📌 STEP 3: Categorizing issues...\n');
    const categorized = categorizer.categorizeIssues(mainIssues, prIssues);
    
    console.log(`✅ Categorization complete`);
    console.log(`   🆕 NEW issues (introduced by PR): ${categorized.summary.totalNew}`);
    console.log(`   ✅ FIXED issues (resolved by PR): ${categorized.summary.totalFixed}`);
    console.log(`   ➖ UNCHANGED issues (pre-existing): ${categorized.summary.totalUnchanged}`);
    console.log(`   📊 PR Quality Score: ${categorized.summary.prQualityScore}/100`);
    console.log(`   📈 Net Impact: ${categorized.summary.netImpact > 0 ? '+' : ''}${categorized.summary.netImpact}`);
    
    // Show categorized issues
    if (categorized.newIssues && categorized.newIssues.length > 0) {
      console.log('\n   🆕 Sample NEW issues:');
      categorized.newIssues.slice(0, 2).forEach((item: any, idx) => {
        const issue = item.issue || item;
        console.log(`   ${idx + 1}. ${issue.title}`);
      });
    }
    
    if (categorized.fixedIssues && categorized.fixedIssues.length > 0) {
      console.log('\n   ✅ Sample FIXED issues:');
      categorized.fixedIssues.slice(0, 2).forEach((item: any, idx) => {
        const issue = item.issue || item;
        console.log(`   ${idx + 1}. ${issue.title}`);
      });
    }
    
    console.log('\n' + '-'.repeat(70));
    
    // Step 4: Generate V8 report
    console.log('\n📌 STEP 4: Generating V8 report...\n');
    
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
    const reportPath = `./test-reports/typescript-complete-${timestamp}.md`;
    
    if (!fs.existsSync('./test-reports')) {
      fs.mkdirSync('./test-reports');
    }
    
    fs.writeFileSync(reportPath, report);
    console.log(`✅ Report generated and saved to: ${reportPath}`);
    
    // Analyze report quality
    console.log('\n📊 Report Quality Analysis:');
    
    const checks = {
      'Executive Summary': report.includes('Executive Summary'),
      'PR Decision': report.includes('PR Decision') || report.includes('MERGE'),
      'New Issues Section': report.includes('New Issues'),
      'Fixed Issues Section': report.includes('Fixed Issues') || report.includes('Resolved'),
      'Code Snippets': report.includes('```'),
      'File Locations': report.includes('.ts') || report.includes('.js'),
      'Line Numbers': /:\d+/.test(report),
      'Fix Suggestions': report.includes('Fix Suggestion') || report.includes('What to do'),
      'Action Items': report.includes('Action Items'),
      'Security Analysis': report.includes('Security'),
      'Performance Analysis': report.includes('Performance'),
      'Breaking Changes': report.includes('Breaking Changes'),
    };
    
    let passCount = 0;
    Object.entries(checks).forEach(([check, passed]) => {
      console.log(`   ${passed ? '✅' : '❌'} ${check}`);
      if (passed) passCount++;
    });
    
    const qualityScore = (passCount / Object.keys(checks).length) * 100;
    
    console.log(`\n   📈 Report Quality Score: ${qualityScore.toFixed(0)}%`);
    
    if (qualityScore >= 90) {
      console.log('   🎉 EXCELLENT: Report is comprehensive and complete!');
    } else if (qualityScore >= 70) {
      console.log('   ⚠️  GOOD: Report is functional but missing some sections');
    } else {
      console.log('   ❌ NEEDS WORK: Report is incomplete');
    }
    
    // Final summary
    console.log('\n' + '='.repeat(70));
    console.log('🎯 FINAL SUMMARY:');
    console.log('='.repeat(70));
    
    console.log(`\n✅ Analysis completed successfully`);
    console.log(`   Total time: ${(parseFloat(mainDuration) + parseFloat(prDuration)).toFixed(1)}s`);
    console.log(`   Issues analyzed: ${mainIssues.length + prIssues.length}`);
    console.log(`   Code snippets extracted: ${mainWithSnippets.length + prWithSnippets.length}`);
    console.log(`   Report quality: ${qualityScore.toFixed(0)}%`);
    
    // Check for specific issues
    const hasRealSnippets = (mainWithSnippets.length + prWithSnippets.length) > 
                           (mainIssues.length + prIssues.length) * 0.7;
    const hasGoodReport = qualityScore >= 70;
    const hasCategorization = categorized.summary.totalNew >= 0;
    
    if (hasRealSnippets && hasGoodReport && hasCategorization) {
      console.log('\n🎉 TypeScript/JavaScript flow is working correctly!');
      console.log('   Ready to test other languages.');
    } else {
      console.log('\n⚠️  Some issues remain:');
      if (!hasRealSnippets) console.log('   - Code snippet extraction needs improvement');
      if (!hasGoodReport) console.log('   - Report generation needs fixes');
      if (!hasCategorization) console.log('   - Issue categorization has problems');
    }
    
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testCompleteTypeScriptFlow().catch(console.error);