#!/usr/bin/env npx ts-node

/**
 * Test to verify consistent results when analyzing the same PR twice
 */

import { registerDeepWikiApi } from './src/standard/services/deepwiki-api-wrapper';
import { DirectDeepWikiApi } from './src/standard/services/direct-deepwiki-api';
import { UnifiedAnalysisWrapper } from './src/standard/services/unified-analysis-wrapper';
import { ReportGeneratorV8Final } from './src/standard/comparison/report-generator-v8-final';
import * as fs from 'fs';
import { exec } from 'child_process';

async function testSamePRTwice() {
  console.log('🔬 Testing Consistency: Running Same PR Analysis Twice\n');
  console.log('='.repeat(60));
  console.log('Repository: sindresorhus/ky');
  console.log('PR: #700');
  console.log('Expected: Both runs should find similar issues');
  console.log('Using: Adaptive iterative collection (up to 10 iterations)');
  console.log('='.repeat(60) + '\n');
  
  try {
    // Register DeepWiki API once
    console.log('📡 Registering DeepWiki API...');
    const directApi = new DirectDeepWikiApi();
    registerDeepWikiApi(directApi);
    console.log('✅ DirectDeepWikiApi registered with adaptive collection\n');
    
    const repoUrl = 'https://github.com/sindresorhus/ky';
    const prNumber = 700;
    const wrapper = new UnifiedAnalysisWrapper();
    
    // Run 1: First analysis
    console.log('📊 Run 1: First Analysis');
    console.log('-'.repeat(40));
    
    const startTime1 = Date.now();
    const result1 = await wrapper.analyzeRepository(repoUrl, {
      prId: String(prNumber),
      branch: 'main',
      skipCache: true, // Important: skip cache to get fresh results
      validateLocations: false,
      useDeepWikiMock: process.env.USE_DEEPWIKI_MOCK === 'true'
    });
    const duration1 = Date.now() - startTime1;
    
    console.log(`✅ Run 1 Complete:`);
    console.log(`  - Issues found: ${result1.analysis.issues.length}`);
    console.log(`  - Duration: ${(duration1/1000).toFixed(1)}s`);
    console.log(`  - Confidence: ${result1.validationStats.averageConfidence}%`);
    
    // Count by severity
    const severities1: Record<string, number> = {};
    result1.analysis.issues.forEach(i => {
      severities1[i.severity] = (severities1[i.severity] || 0) + 1;
    });
    console.log(`  - By severity:`, severities1);
    console.log();
    
    // Run 2: Second analysis (should be similar)
    console.log('📊 Run 2: Second Analysis (Same PR)');
    console.log('-'.repeat(40));
    
    const startTime2 = Date.now();
    const result2 = await wrapper.analyzeRepository(repoUrl, {
      prId: String(prNumber),
      branch: 'main',
      skipCache: true, // Important: skip cache to get fresh results
      validateLocations: false,
      useDeepWikiMock: process.env.USE_DEEPWIKI_MOCK === 'true'
    });
    const duration2 = Date.now() - startTime2;
    
    console.log(`✅ Run 2 Complete:`);
    console.log(`  - Issues found: ${result2.analysis.issues.length}`);
    console.log(`  - Duration: ${(duration2/1000).toFixed(1)}s`);
    console.log(`  - Confidence: ${result2.validationStats.averageConfidence}%`);
    
    // Count by severity
    const severities2: Record<string, number> = {};
    result2.analysis.issues.forEach(i => {
      severities2[i.severity] = (severities2[i.severity] || 0) + 1;
    });
    console.log(`  - By severity:`, severities2);
    console.log();
    
    // Compare results
    console.log('🔍 Consistency Analysis:');
    console.log('='.repeat(60));
    
    const diff = Math.abs(result1.analysis.issues.length - result2.analysis.issues.length);
    const percentDiff = (diff / Math.max(result1.analysis.issues.length, result2.analysis.issues.length) * 100).toFixed(1);
    
    console.log(`Run 1: ${result1.analysis.issues.length} issues`);
    console.log(`Run 2: ${result2.analysis.issues.length} issues`);
    console.log(`Difference: ${diff} issues (${percentDiff}% variance)`);
    
    if (diff <= 3) {
      console.log(`✅ Results are CONSISTENT (within acceptable variance)`);
    } else if (diff <= 5) {
      console.log(`⚠️ Results are MOSTLY CONSISTENT (moderate variance)`);
    } else {
      console.log(`❌ Results are INCONSISTENT (high variance)`);
    }
    
    console.log(`\nPossible reasons for variance:`);
    console.log(`  • Non-deterministic DeepWiki API responses`);
    console.log(`  • Different iteration counts in adaptive collection`);
    console.log(`  • Randomness in AI model responses`);
    
    // Generate reports for comparison
    console.log('\n📄 Generating V8 Reports for Visual Comparison...');
    
    const generator = new ReportGeneratorV8Final();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Helper to create report data
    const createReportData = (result: any, runNumber: number, duration: number): any => ({
      success: true,
      newIssues: result.analysis.issues,
      resolvedIssues: [],
      unchangedIssues: [],
      modifiedIssues: [],
      repositoryUrl: repoUrl,
      mainBranch: {
        name: 'main',
        issues: [],
        metrics: { totalIssues: 0, criticalIssues: 0, highIssues: 0, mediumIssues: 0, lowIssues: 0 }
      },
      prBranch: {
        name: `PR #${prNumber}`,
        issues: result.analysis.issues.map((issue: any, idx: number) => ({
          id: `RUN${runNumber}-${idx}`,
          ...issue,
          location: issue.location || { file: 'unknown', line: 0 }
        })),
        metrics: {
          totalIssues: result.analysis.issues.length,
          criticalIssues: result.analysis.issues.filter((i: any) => i.severity === 'critical').length,
          highIssues: result.analysis.issues.filter((i: any) => i.severity === 'high').length,
          mediumIssues: result.analysis.issues.filter((i: any) => i.severity === 'medium').length,
          lowIssues: result.analysis.issues.filter((i: any) => i.severity === 'low').length
        }
      },
      prMetadata: {
        prNumber,
        prTitle: 'Add retry mechanism',
        repository: repoUrl,
        author: 'test',
        branch: 'pr-700',
        targetBranch: 'main',
        filesChanged: 6,
        additions: 120,
        deletions: 45
      },
      scores: result.analysis.scores || { overall: 75, security: 70, performance: 80, maintainability: 75 },
      summary: {
        totalNewIssues: result.analysis.issues.length,
        totalResolvedIssues: 0,
        totalUnchangedIssues: 0,
        overallAssessment: result.analysis.scores?.overall || 75
      },
      metadata: {
        analysisDate: new Date().toISOString(),
        analysisVersion: 'V8',
        runNumber,
        duration: duration / 1000,
        confidence: result.validationStats.averageConfidence,
        adaptiveCollection: true,
        dataSource: process.env.USE_DEEPWIKI_MOCK === 'true' ? 'mock' : 'real'
      }
    });
    
    // Generate Report 1
    const html1 = await generator.generateReport(createReportData(result1, 1, duration1));
    const filename1 = `run1-ky-pr700-${timestamp}.html`;
    fs.writeFileSync(filename1, html1);
    console.log(`✅ Report 1 saved: ${filename1}`);
    
    // Generate Report 2
    const html2 = await generator.generateReport(createReportData(result2, 2, duration2));
    const filename2 = `run2-ky-pr700-${timestamp}.html`;
    fs.writeFileSync(filename2, html2);
    console.log(`✅ Report 2 saved: ${filename2}`);
    
    // Open both reports
    exec(`open ${filename1}`, () => {});
    setTimeout(() => {
      exec(`open ${filename2}`, () => {});
    }, 1000);
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 Consistency Test Complete!');
    console.log('Both reports have been opened in your browser.');
    console.log('Compare them side-by-side to verify consistency.');
    console.log('='.repeat(60));
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run the test
testSamePRTwice().catch(console.error);