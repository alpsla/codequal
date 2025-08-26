#!/usr/bin/env npx ts-node

/**
 * Test to verify both analysis methods produce consistent results
 * This will run the same PR through two different paths and compare
 */

import { registerDeepWikiApi } from './src/standard/services/deepwiki-api-wrapper';
import { DirectDeepWikiApi } from './src/standard/services/direct-deepwiki-api';
import { UnifiedAnalysisWrapper } from './src/standard/services/unified-analysis-wrapper';
import { ComparisonOrchestrator } from './src/standard/orchestrator/comparison-orchestrator';
import { ReportGeneratorV8Final } from './src/standard/comparison/report-generator-v8-final';
import * as fs from 'fs';
import { exec } from 'child_process';

async function runConsistentAnalysis() {
  console.log('🔬 Testing Analysis Consistency Across Different Methods\n');
  console.log('='.repeat(60));
  console.log('Repository: sindresorhus/ky');
  console.log('PR: #700');
  console.log('Expected: Both methods should find the same issues');
  console.log('='.repeat(60) + '\n');
  
  try {
    // Register DeepWiki API once
    console.log('📡 Registering DeepWiki API...');
    const directApi = new DirectDeepWikiApi();
    registerDeepWikiApi(directApi);
    console.log('✅ DirectDeepWikiApi registered\n');
    
    const repoUrl = 'https://github.com/sindresorhus/ky';
    const prNumber = 700;
    
    // Method 1: Using UnifiedAnalysisWrapper
    console.log('📊 Method 1: UnifiedAnalysisWrapper');
    console.log('-'.repeat(40));
    
    const wrapper = new UnifiedAnalysisWrapper();
    const startTime1 = Date.now();
    
    const result1 = await wrapper.analyzeRepository(repoUrl, {
      prId: String(prNumber),
      branch: 'main',
      skipCache: true,
      validateLocations: false,
      useDeepWikiMock: process.env.USE_DEEPWIKI_MOCK === 'true'
    });
    
    const duration1 = Date.now() - startTime1;
    
    console.log(`✅ Method 1 Complete:`);
    console.log(`  - Issues found: ${result1.analysis.issues.length}`);
    console.log(`  - Duration: ${(duration1/1000).toFixed(1)}s`);
    console.log(`  - Iterations: ${result1.metadata.iterationsPerformed || 'unknown'}`);
    console.log(`  - Confidence: ${result1.validationStats.averageConfidence}%\n`);
    
    // Method 2: Using ComparisonOrchestrator directly
    console.log('📊 Method 2: ComparisonOrchestrator');
    console.log('-'.repeat(40));
    
    const orchestrator = new ComparisonOrchestrator();
    const startTime2 = Date.now();
    
    const result2 = await orchestrator.analyzeRepository(repoUrl, prNumber);
    
    const duration2 = Date.now() - startTime2;
    
    console.log(`✅ Method 2 Complete:`);
    console.log(`  - New issues: ${result2.newIssues.length}`);
    console.log(`  - Resolved issues: ${result2.resolvedIssues.length}`);
    console.log(`  - Unchanged issues: ${result2.unchangedIssues.length}`);
    console.log(`  - Total issues: ${result2.newIssues.length + result2.unchangedIssues.length}`);
    console.log(`  - Duration: ${(duration2/1000).toFixed(1)}s\n`);
    
    // Compare results
    console.log('🔍 Comparison Results:');
    console.log('='.repeat(60));
    
    const method1Total = result1.analysis.issues.length;
    const method2Total = result2.newIssues.length + result2.unchangedIssues.length;
    
    console.log(`Method 1 (UnifiedAnalysisWrapper): ${method1Total} issues`);
    console.log(`Method 2 (ComparisonOrchestrator): ${method2Total} issues`);
    
    if (Math.abs(method1Total - method2Total) <= 2) {
      console.log(`✅ Results are consistent (within 2 issues tolerance)`);
    } else {
      console.log(`⚠️ Results differ by ${Math.abs(method1Total - method2Total)} issues`);
      console.log(`This may be due to:`);
      console.log(`  - Non-deterministic DeepWiki responses`);
      console.log(`  - Different iteration counts in adaptive collection`);
      console.log(`  - Caching differences`);
    }
    
    // Generate reports for both
    console.log('\n📄 Generating V8 Reports for Visual Comparison...');
    
    const generator = new ReportGeneratorV8Final();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Report 1 - UnifiedAnalysisWrapper
    const report1Data: any = {
      repositoryUrl: repoUrl,
      mainBranch: {
        name: 'main',
        issues: [],
        metrics: { totalIssues: 0, criticalIssues: 0, highIssues: 0, mediumIssues: 0, lowIssues: 0 }
      },
      prBranch: {
        name: `PR #${prNumber}`,
        issues: result1.analysis.issues.map((issue, idx) => ({
          id: `UNIFIED-${idx}`,
          ...issue
        })),
        metrics: {
          totalIssues: result1.analysis.issues.length,
          criticalIssues: result1.analysis.issues.filter(i => i.severity === 'critical').length,
          highIssues: result1.analysis.issues.filter(i => i.severity === 'high').length,
          mediumIssues: result1.analysis.issues.filter(i => i.severity === 'medium').length,
          lowIssues: result1.analysis.issues.filter(i => i.severity === 'low').length
        }
      },
      prMetadata: {
        prNumber,
        prTitle: 'Test PR',
        repository: repoUrl,
        author: 'test',
        branch: 'test',
        targetBranch: 'main',
        filesChanged: 0,
        additions: 0,
        deletions: 0
      },
      scores: result1.analysis.scores,
      summary: {
        totalNewIssues: result1.analysis.issues.length,
        totalResolvedIssues: 0,
        totalUnchangedIssues: 0,
        overallAssessment: result1.analysis.scores?.overall || 0
      },
      metadata: {
        analysisDate: new Date().toISOString(),
        analysisVersion: 'V8',
        method: 'UnifiedAnalysisWrapper',
        duration: duration1 / 1000
      }
    };
    
    const html1 = await generator.generateReport(report1Data);
    const filename1 = `unified-method-${timestamp}.html`;
    fs.writeFileSync(filename1, html1);
    
    // Report 2 - ComparisonOrchestrator
    const report2Data: any = {
      ...result2,
      repositoryUrl: repoUrl,
      prMetadata: result2.prMetadata || {
        prNumber,
        prTitle: 'Test PR',
        repository: repoUrl,
        author: 'test',
        branch: 'test',
        targetBranch: 'main',
        filesChanged: 0,
        additions: 0,
        deletions: 0
      },
      metadata: {
        analysisDate: new Date().toISOString(),
        analysisVersion: 'V8',
        method: 'ComparisonOrchestrator',
        duration: duration2 / 1000
      }
    };
    
    const html2 = await generator.generateReport(report2Data);
    const filename2 = `orchestrator-method-${timestamp}.html`;
    fs.writeFileSync(filename2, html2);
    
    console.log(`✅ Report 1 saved: ${filename1}`);
    console.log(`✅ Report 2 saved: ${filename2}`);
    
    // Open both reports
    exec(`open ${filename1}`, () => {});
    exec(`open ${filename2}`, () => {});
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 Analysis Complete!');
    console.log('Both reports have been opened in your browser for comparison.');
    console.log('='.repeat(60));
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run the test
runConsistentAnalysis().catch(console.error);