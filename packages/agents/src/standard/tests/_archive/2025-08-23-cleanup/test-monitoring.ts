#!/usr/bin/env npx ts-node

/**
 * Test script for iteration monitoring and memory optimization
 * Verifies that the AdaptiveDeepWikiAnalyzer properly tracks iterations
 */

import { AdaptiveDeepWikiAnalyzer } from './src/standard/deepwiki/services/adaptive-deepwiki-analyzer';
import { CachedDeepWikiAnalyzer } from './src/standard/deepwiki/services/cached-deepwiki-analyzer';
import { AnalysisMonitor } from './src/standard/deepwiki/services/analysis-monitor';

async function testMonitoring() {
  console.log('🔍 Testing DeepWiki Analysis Monitoring\n');
  
  const useMock = process.env.USE_DEEPWIKI_MOCK === 'true';
  console.log(`Mode: ${useMock ? 'MOCK' : 'REAL'} DeepWiki\n`);

  // Initialize monitor
  const monitor = AnalysisMonitor.getInstance();
  
  // Test repositories with expected different iteration counts
  const testCases = [
    {
      repo: 'https://github.com/sindresorhus/is-odd',
      branch: 'main',
      description: 'Simple repo (should complete in 3 iterations)'
    },
    {
      repo: 'https://github.com/sindresorhus/ky',
      branch: 'pr-700',
      description: 'Medium complexity PR (should take 3-5 iterations)'
    },
    {
      repo: 'https://github.com/vercel/swr',
      branch: 'pr-2950',
      description: 'Complex PR (might take 5-7 iterations)'
    }
  ];

  // Run analyses
  for (const testCase of testCases) {
    console.log(`\n📊 Analyzing: ${testCase.description}`);
    console.log(`   Repository: ${testCase.repo}`);
    console.log(`   Branch: ${testCase.branch}`);
    
    try {
      const analyzer = new CachedDeepWikiAnalyzer(
        process.env.DEEPWIKI_API_URL || 'http://localhost:8001',
        process.env.DEEPWIKI_API_KEY,
        console
      );
      
      const startTime = Date.now();
      const result = await analyzer.analyzeWithGapFilling(testCase.repo, testCase.branch);
      const duration = Date.now() - startTime;
      
      console.log(`   ✅ Analysis completed`);
      console.log(`   - Iterations: ${result.iterations.length}`);
      console.log(`   - Completeness: ${result.completeness}%`);
      console.log(`   - Issues found: ${(result.finalResult.issues || []).length}`);
      console.log(`   - Duration: ${(duration / 1000).toFixed(2)}s`);
      
      // Show iteration details
      result.iterations.forEach((iter, idx) => {
        const gaps = iter.gaps;
        console.log(`   - Iteration ${idx + 1}: ${gaps.completeness}% complete, ${gaps.totalGaps} gaps`);
      });
      
    } catch (error) {
      console.error(`   ❌ Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  // Display aggregated metrics
  console.log('\n' + '='.repeat(60));
  console.log('📈 AGGREGATED METRICS');
  console.log('='.repeat(60));
  
  const metrics = monitor.getAggregatedMetrics();
  
  console.log(`\nOverall Statistics:`);
  console.log(`- Total Analyses: ${metrics.totalAnalyses}`);
  console.log(`- Success Rate: ${(metrics.successRate * 100).toFixed(1)}%`);
  console.log(`- Cache Hit Rate: ${(metrics.cacheHitRate * 100).toFixed(1)}%`);
  
  console.log(`\nIteration Statistics:`);
  console.log(`- Average Iterations: ${metrics.averageIterations.toFixed(2)}`);
  console.log(`- Min Iterations: ${metrics.minIterations}`);
  console.log(`- Max Iterations: ${metrics.maxIterations}`);
  
  console.log(`\nPerformance Metrics:`);
  console.log(`- Average Duration: ${(metrics.averageDuration / 1000).toFixed(2)}s`);
  console.log(`- Average Memory Used: ${(metrics.averageMemoryUsed / 1024 / 1024).toFixed(2)}MB`);
  console.log(`- Average Issues Found: ${metrics.averageIssuesFound.toFixed(1)}`);
  
  // Generate and display report
  const report = await monitor.generateReport();
  console.log('\n' + '='.repeat(60));
  console.log('📄 DETAILED REPORT');
  console.log('='.repeat(60));
  console.log(report);
  
  // Cleanup
  monitor.cleanup();
  
  console.log('\n✅ Monitoring test completed successfully!');
}

// Run the test
testMonitoring().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});