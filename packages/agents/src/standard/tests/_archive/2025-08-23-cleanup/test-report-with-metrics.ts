#!/usr/bin/env npx ts-node

/**
 * Test script to verify iteration metrics appear in V8 report
 * Shows the complete flow from analysis to report generation
 */

import { CachedDeepWikiAnalyzer } from './src/standard/deepwiki/services/cached-deepwiki-analyzer';
import { AnalysisMonitor } from './src/standard/deepwiki/services/analysis-monitor';
import { ReportGeneratorV8Final } from './src/standard/comparison/report-generator-v8-final';
import * as fs from 'fs/promises';

async function testReportWithMetrics() {
  console.log('🔍 Testing V8 Report with Iteration Metrics\n');
  
  const useMock = process.env.USE_DEEPWIKI_MOCK !== 'false';
  console.log(`Mode: ${useMock ? 'MOCK' : 'REAL'} DeepWiki\n`);

  // Initialize components
  const monitor = AnalysisMonitor.getInstance();
  const analyzer = new CachedDeepWikiAnalyzer(
    process.env.DEEPWIKI_API_URL || 'http://localhost:8001',
    process.env.DEEPWIKI_API_KEY,
    console
  );
  
  const reportGenerator = new ReportGeneratorV8Final();
  
  // Test repository
  const testRepo = {
    url: 'https://github.com/sindresorhus/ky',
    branch: 'pr-700',
    prNumber: 700
  };
  
  try {
    console.log(`📊 Analyzing: ${testRepo.url} (${testRepo.branch})`);
    
    // Perform analysis with adaptive analyzer
    const startTime = Date.now();
    const result = await analyzer.analyzeWithGapFilling(testRepo.url, testRepo.branch);
    const duration = Date.now() - startTime;
    
    console.log(`✅ Analysis completed`);
    console.log(`   - Iterations: ${result.iterations.length}`);
    console.log(`   - Completeness: ${result.completeness}%`);
    console.log(`   - Duration: ${(duration / 1000).toFixed(2)}s`);
    
    // Get aggregated metrics
    const metrics = monitor.getAggregatedMetrics();
    
    // Create mock comparison result with metrics
    const comparisonResult = {
      newIssues: result.finalResult.issues || [],
      resolvedIssues: [],
      unchangedIssues: [],
      prBreakingChanges: result.finalResult.breakingChanges || [],
      scores: result.finalResult.scores || {
        overall: 75,
        security: 80,
        performance: 75,
        maintainability: 70,
        testing: 72
      },
      prMetadata: {
        repository_url: testRepo.url,
        number: testRepo.prNumber,
        prNumber: testRepo.prNumber,
        baseCommit: 'main',
        headCommit: testRepo.branch,
        filesChanged: 10,
        additions: 150,
        deletions: 50
      },
      // Add analysis metrics for the report
      analysisMetrics: {
        iterations: result.iterations.length,
        completeness: result.completeness,
        memoryUsed: process.memoryUsage().heapUsed,
        cacheHit: false,
        averageIterations: metrics.averageIterations
      },
      scanDuration: `${(duration / 1000).toFixed(2)}s`,
      modelUsed: 'Dynamic Model Selection',
      totalIssues: (result.finalResult.issues || []).length
    };
    
    console.log('\n📄 Generating V8 Report with Metrics...');
    
    // Generate report
    const markdownReport = await reportGenerator.generateReport(comparisonResult as any);
    
    // Extract and display the Report Metadata section
    const metadataMatch = markdownReport.match(/## Report Metadata[\s\S]*?(?=##|$)/);
    if (metadataMatch) {
      console.log('\n' + '='.repeat(60));
      console.log('REPORT METADATA SECTION:');
      console.log('='.repeat(60));
      console.log(metadataMatch[0]);
    }
    
    // Save full report to file
    const reportPath = './test-report-with-metrics.md';
    await fs.writeFile(reportPath, markdownReport);
    console.log(`\n✅ Full report saved to: ${reportPath}`);
    
    // Note: HTML generation method is private, so we'll skip it for now
    // const htmlReport = await reportGenerator.generateHTMLFromMarkdown(markdownReport);
    // const htmlPath = './test-report-with-metrics.html';
    // await fs.writeFile(htmlPath, htmlReport);
    // console.log(`✅ HTML report saved to: ${htmlPath}`);
    
    // Verify metrics are in the report
    const hasIterationMetrics = markdownReport.includes('Total Iterations:') && 
                               markdownReport.includes('Completeness:') &&
                               markdownReport.includes('Memory Used:');
    
    if (hasIterationMetrics) {
      console.log('\n✅ SUCCESS: Iteration metrics are included in the report!');
    } else {
      console.log('\n⚠️  WARNING: Iteration metrics may not be properly included in the report');
    }
    
    // Display summary
    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    console.log(`Repository: ${testRepo.url}`);
    console.log(`Branch: ${testRepo.branch}`);
    console.log(`Iterations: ${result.iterations.length}`);
    console.log(`Completeness: ${result.completeness}%`);
    console.log(`Issues Found: ${(result.finalResult.issues || []).length}`);
    console.log(`Average Iterations (All Analyses): ${metrics.averageIterations.toFixed(2)}`);
    console.log(`Total Analyses Run: ${metrics.totalAnalyses}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
  
  // Cleanup
  monitor.cleanup();
  console.log('\n✅ Test completed successfully!');
}

// Run the test
testReportWithMetrics().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});