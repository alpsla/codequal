#!/usr/bin/env npx ts-node
/**
 * Complete Go Flow Test
 * Testing with gin repository (popular Go web framework)
 */

import { DirectDeepWikiApiWithLocationV2 } from './src/standard/services/direct-deepwiki-api-with-location-v2';
import { PRAnalysisCategorizer } from './src/standard/services/pr-analysis-categorizer';
import { ReportGeneratorV8Final } from './src/standard/comparison/report-generator-v8-final';
import { loadEnvironment } from './src/standard/utils/env-loader';
import * as fs from 'fs';
import * as path from 'path';

async function testCompleteGoFlow() {
  console.log('🔷 Complete Go Flow Test\n');
  console.log('=' .repeat(70) + '\n');
  
  loadEnvironment();
  
  // Using gin web framework - popular Go HTTP framework
  const repositoryUrl = 'https://github.com/gin-gonic/gin';
  const prNumber = 3900; // Recent PR with changes
  
  console.log(`📦 Repository: ${repositoryUrl} (Go)`);
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
      branch: 'master', // gin uses master
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
    
    // Check code snippet quality for Go
    const mainWithSnippets = mainIssues.filter(i => 
      i.codeSnippet && 
      !i.codeSnippet.includes('example.com') &&
      !i.codeSnippet.includes('func example') &&
      !i.codeSnippet.includes('// TODO')
    );
    console.log(`   📝 With real code snippets: ${mainWithSnippets.length}/${mainIssues.length}`);
    
    // Check for Go-specific patterns
    const goPatterns = mainIssues.filter(i => 
      i.location?.file && (
        i.location.file.endsWith('.go') ||
        i.location.file.includes('internal/') ||
        i.location.file.includes('pkg/')
      )
    );
    console.log(`   🔷 Go files detected: ${goPatterns.length}/${mainIssues.length}`);
    
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
      i.codeSnippet && 
      !i.codeSnippet.includes('example.com') &&
      !i.codeSnippet.includes('func example')
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
    
    console.log('\n' + '-'.repeat(70));
    
    // Step 4: Generate V8 report
    console.log('\n📌 STEP 4: Generating V8 report...\n');
    
    const comparisonResult = {
      success: true,
      repositoryUrl,
      prNumber,
      mainBranch: { name: 'master', issues: mainIssues },
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
    const reportPath = `./test-reports/go-complete-${timestamp}.md`;
    
    if (!fs.existsSync('./test-reports')) {
      fs.mkdirSync('./test-reports');
    }
    
    fs.writeFileSync(reportPath, report);
    console.log(`✅ Report generated and saved to: ${reportPath}`);
    
    // Analyze report quality and Go-specific checks
    console.log('\n📊 Report Quality Analysis:');
    
    const checks = {
      'Executive Summary': report.includes('Executive Summary'),
      'PR Decision': report.includes('PR Decision') || report.includes('MERGE'),
      'New Issues Section': report.includes('New Issues'),
      'Fixed Issues Section': report.includes('Fixed Issues') || report.includes('Resolved'),
      'Code Snippets': report.includes('```'),
      'Go Files': report.includes('.go'),
      'Line Numbers': /:\d+/.test(report),
      'Fix Suggestions': report.includes('Fix Suggestion') || report.includes('What to do'),
      'Action Items': report.includes('Action Items'),
      'Security Analysis': report.includes('Security'),
      'Go-specific patterns': report.includes('func ') || report.includes('package ') || report.includes('import '),
      'No placeholders': !report.includes('example.com') && !report.includes('func example')
    };
    
    let passCount = 0;
    Object.entries(checks).forEach(([check, passed]) => {
      console.log(`   ${passed ? '✅' : '❌'} ${check}`);
      if (passed) passCount++;
    });
    
    const qualityScore = (passCount / Object.keys(checks).length) * 100;
    
    console.log(`\n   📈 Report Quality Score: ${qualityScore.toFixed(0)}%`);
    
    if (qualityScore >= 90) {
      console.log('   🎉 EXCELLENT: Go support is working perfectly!');
    } else if (qualityScore >= 70) {
      console.log('   ⚠️  GOOD: Go support is functional but needs improvement');
    } else {
      console.log('   ❌ NEEDS WORK: Go support has issues');
    }
    
    // Final summary
    console.log('\n' + '='.repeat(70));
    console.log('🎯 GO LANGUAGE SUMMARY:');
    console.log('='.repeat(70));
    
    console.log(`\n✅ Analysis completed successfully`);
    console.log(`   Total time: ${(parseFloat(mainDuration) + parseFloat(prDuration)).toFixed(1)}s`);
    console.log(`   Issues analyzed: ${mainIssues.length + prIssues.length}`);
    console.log(`   Code snippets extracted: ${mainWithSnippets.length + prWithSnippets.length}`);
    console.log(`   Go files detected: ${goPatterns.length}`);
    console.log(`   Report quality: ${qualityScore.toFixed(0)}%`);
    
    // Check for specific issues
    const hasRealSnippets = (mainWithSnippets.length + prWithSnippets.length) > 
                           (mainIssues.length + prIssues.length) * 0.7;
    const hasGoodReport = qualityScore >= 70;
    const hasGoSupport = goPatterns.length > 0;
    
    if (hasRealSnippets && hasGoodReport && hasGoSupport) {
      console.log('\n🎉 Go language support is working correctly!');
      console.log('   Ready to test other languages.');
    } else {
      console.log('\n⚠️  Some issues with Go support:');
      if (!hasRealSnippets) console.log('   - Code snippet extraction needs improvement for Go');
      if (!hasGoodReport) console.log('   - Report generation needs Go-specific fixes');
      if (!hasGoSupport) console.log('   - Go file detection not working');
    }
    
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testCompleteGoFlow().catch(console.error);