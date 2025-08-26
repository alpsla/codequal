#!/usr/bin/env npx ts-node

/**
 * Test consistency with REAL DeepWiki data only - NO MOCKS
 * Runs the same PR analysis 3 times to verify consistency
 */

import { registerDeepWikiApi } from './src/standard/services/deepwiki-api-wrapper';
import { DirectDeepWikiApi } from './src/standard/services/direct-deepwiki-api';
import { UnifiedAnalysisWrapper } from './src/standard/services/unified-analysis-wrapper';
import { ReportGeneratorV8Final } from './src/standard/comparison/report-generator-v8-final';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';

// Ensure we're only using real DeepWiki
if (process.env.USE_DEEPWIKI_MOCK === 'true') {
  console.error('❌ ERROR: USE_DEEPWIKI_MOCK is set to true. This test requires real DeepWiki data.');
  console.error('Please unset USE_DEEPWIKI_MOCK or set it to false');
  process.exit(1);
}

async function testConsistencyRealOnly() {
  console.log('🔬 Testing Consistency with REAL DeepWiki Data Only');
  console.log('='.repeat(60));
  console.log('⚠️  NO MOCKS - Using only real DeepWiki API');
  console.log('Repository: sindresorhus/ky PR #700');
  console.log('Running 3 times to verify consistency');
  console.log('Expected: Similar results across all runs');
  console.log('='.repeat(60) + '\n');
  
  // Ensure DeepWiki is accessible
  console.log('🔍 Checking DeepWiki availability...');
  const deepwikiUrl = process.env.DEEPWIKI_API_URL || 'http://localhost:8001';
  console.log(`DeepWiki URL: ${deepwikiUrl}`);
  console.log('Make sure kubectl port-forward is running:');
  console.log('  kubectl port-forward -n codequal-dev deployment/deepwiki 8001:8001\n');
  
  try {
    // Register real DeepWiki API
    console.log('📡 Registering REAL DeepWiki API...');
    const directApi = new DirectDeepWikiApi();
    registerDeepWikiApi(directApi);
    console.log('✅ DirectDeepWikiApi registered (adaptive iterative collection)\n');
    
    const repoUrl = 'https://github.com/sindresorhus/ky';
    const prNumber = 700;
    const wrapper = new UnifiedAnalysisWrapper();
    const results: any[] = [];
    
    // Create output directory
    const outputDir = './test-consistency-real-results';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Run 3 times
    for (let run = 1; run <= 3; run++) {
      console.log(`📊 Run ${run} of 3`);
      console.log('-'.repeat(40));
      
      const startTime = Date.now();
      
      try {
        const result = await wrapper.analyzeRepository(repoUrl, {
          prId: String(prNumber),
          branch: 'main',
          skipCache: true, // Important: skip cache for fresh results
          validateLocations: false // Skip for speed
        });
        
        const duration = Date.now() - startTime;
        
        // Store result
        results.push({
          run,
          issueCount: result.analysis.issues.length,
          duration,
          confidence: result.validationStats.averageConfidence,
          severities: countBySeverity(result.analysis.issues),
          categories: countByCategory(result.analysis.issues),
          result
        });
        
        console.log(`✅ Run ${run} Complete:`);
        console.log(`  - Issues found: ${result.analysis.issues.length}`);
        console.log(`  - Duration: ${(duration/1000).toFixed(1)}s`);
        console.log(`  - Confidence: ${result.validationStats.averageConfidence}%`);
        console.log(`  - Severities:`, countBySeverity(result.analysis.issues));
        console.log();
        
        // Generate report for this run
        const reportData = createReportData(result, run, duration, repoUrl, prNumber);
        const generator = new ReportGeneratorV8Final();
        const html = await generator.generateReport(reportData);
        const filename = path.join(outputDir, `run${run}-report.html`);
        fs.writeFileSync(filename, html);
        console.log(`  📄 Report saved: ${filename}\n`);
        
      } catch (error: any) {
        console.error(`❌ Run ${run} failed:`, error.message);
        results.push({
          run,
          error: error.message,
          issueCount: 0,
          duration: Date.now() - startTime
        });
      }
    }
    
    // Analyze consistency
    console.log('🔍 Consistency Analysis:');
    console.log('='.repeat(60));
    
    const successfulRuns = results.filter(r => !r.error);
    
    if (successfulRuns.length === 0) {
      console.error('❌ All runs failed. Check DeepWiki connection.');
      return;
    }
    
    if (successfulRuns.length < 3) {
      console.warn(`⚠️  Only ${successfulRuns.length} of 3 runs succeeded`);
    }
    
    // Calculate statistics
    const issueCounts = successfulRuns.map(r => r.issueCount);
    const min = Math.min(...issueCounts);
    const max = Math.max(...issueCounts);
    const avg = issueCounts.reduce((a, b) => a + b, 0) / issueCounts.length;
    const variance = max - min;
    const percentVariance = (variance / avg * 100).toFixed(1);
    
    console.log('Issue Count Statistics:');
    console.log(`  Min: ${min}, Max: ${max}, Avg: ${avg.toFixed(1)}`);
    console.log(`  Variance: ${variance} issues (${percentVariance}%)`);
    
    // Display per-run details
    console.log('\nPer-Run Summary:');
    results.forEach(r => {
      if (r.error) {
        console.log(`  Run ${r.run}: ❌ Failed - ${r.error}`);
      } else {
        console.log(`  Run ${r.run}: ${r.issueCount} issues, ${(r.duration/1000).toFixed(1)}s, ${r.confidence}% confidence`);
      }
    });
    
    // Consistency verdict
    console.log('\nConsistency Verdict:');
    if (variance <= 2) {
      console.log('✅ HIGHLY CONSISTENT: Variance ≤ 2 issues');
    } else if (variance <= 5) {
      console.log('⚠️  MODERATELY CONSISTENT: Variance 3-5 issues');
    } else {
      console.log('❌ INCONSISTENT: Variance > 5 issues');
      console.log('This is expected with DeepWiki\'s non-deterministic responses');
      console.log('The adaptive collection helps but cannot eliminate all variance');
    }
    
    // Save summary
    const summary = {
      timestamp: new Date().toISOString(),
      repository: repoUrl,
      prNumber,
      runs: results.map(r => ({
        run: r.run,
        issues: r.issueCount,
        duration: r.duration,
        confidence: r.confidence,
        error: r.error
      })),
      statistics: {
        min, max, avg, variance, percentVariance
      }
    };
    
    const summaryFile = path.join(outputDir, 'consistency-summary.json');
    fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 Test Complete!');
    console.log(`Results saved in: ${outputDir}/`);
    console.log('  - run1-report.html, run2-report.html, run3-report.html');
    console.log('  - consistency-summary.json');
    
    // Open first report
    exec(`open ${path.join(outputDir, 'run1-report.html')}`, () => {});
    
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Helper functions
function countBySeverity(issues: any[]): Record<string, number> {
  const counts: Record<string, number> = {};
  issues.forEach(issue => {
    counts[issue.severity] = (counts[issue.severity] || 0) + 1;
  });
  return counts;
}

function countByCategory(issues: any[]): Record<string, number> {
  const counts: Record<string, number> = {};
  issues.forEach(issue => {
    counts[issue.category] = (counts[issue.category] || 0) + 1;
  });
  return counts;
}

function createReportData(result: any, runNumber: number, duration: number, repoUrl: string, prNumber: number): any {
  return {
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
      prTitle: 'Test PR Analysis',
      repository: repoUrl,
      author: 'test',
      branch: `pr-${prNumber}`,
      targetBranch: 'main',
      filesChanged: 0,
      additions: 0,
      deletions: 0
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
      dataSource: 'REAL DeepWiki (no mocks)'
    }
  };
}

// Run the test
testConsistencyRealOnly().catch(console.error);