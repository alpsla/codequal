#!/usr/bin/env npx ts-node

/**
 * Simple test to verify iteration metrics appear in V8 report metadata
 */

import { ReportGeneratorV8Final } from './src/standard/comparison/report-generator-v8-final';

async function testReportMetadata() {
  console.log('📊 Testing V8 Report Metadata with Iteration Metrics\n');
  
  const reportGenerator = new ReportGeneratorV8Final();
  
  // Create mock comparison result with iteration metrics
  const comparisonResult = {
    newIssues: [
      {
        id: 'test-1',
        severity: 'high',
        category: 'security',
        type: 'vulnerability',
        location: { file: 'test.ts', line: 10 },
        message: 'Test security issue',
        description: 'This is a test issue'
      }
    ],
    resolvedIssues: [],
    unchangedIssues: [],
    prBreakingChanges: [],
    scores: {
      overall: 85,
      security: 80,
      performance: 90,
      maintainability: 85,
      testing: 82
    },
    prMetadata: {
      repository_url: 'https://github.com/sindresorhus/ky',
      number: 700,
      prNumber: 700,
      baseCommit: 'main',
      headCommit: 'pr-700',
      filesChanged: 15,
      additions: 200,
      deletions: 50
    },
    // Add analysis metrics - THIS IS THE KEY PART
    analysisMetrics: {
      iterations: 4,  // Number of iterations performed
      completeness: 92,  // Completeness percentage
      memoryUsed: 256 * 1024 * 1024,  // 256MB in bytes
      cacheHit: true  // Whether cache was used
    },
    scanDuration: '45.3s',
    modelUsed: 'openai/gpt-4-turbo',
    totalIssues: 1
  };
  
  console.log('Generating report with analysis metrics:');
  console.log(`  - Iterations: ${comparisonResult.analysisMetrics.iterations}`);
  console.log(`  - Completeness: ${comparisonResult.analysisMetrics.completeness}%`);
  console.log(`  - Memory Used: ${(comparisonResult.analysisMetrics.memoryUsed / 1024 / 1024).toFixed(2)}MB`);
  console.log(`  - Cache Hit: ${comparisonResult.analysisMetrics.cacheHit}\n`);
  
  // Generate report
  const markdownReport = await reportGenerator.generateReport(comparisonResult as any);
  
  // Extract and display the Report Metadata section
  const metadataMatch = markdownReport.match(/## Report Metadata[\s\S]*?(?=##|---)/);
  if (metadataMatch) {
    console.log('=' + '='.repeat(60));
    console.log('REPORT METADATA SECTION:');
    console.log('=' + '='.repeat(60));
    console.log(metadataMatch[0]);
    console.log('=' + '='.repeat(60));
  } else {
    console.log('⚠️  Could not find Report Metadata section in the report');
  }
  
  // Verify metrics are in the report
  const hasIterationMetrics = markdownReport.includes('Total Iterations:') && 
                             markdownReport.includes('Completeness:') &&
                             markdownReport.includes('Memory Used:') &&
                             markdownReport.includes('Cache Hit:');
  
  if (hasIterationMetrics) {
    console.log('\n✅ SUCCESS: All iteration metrics are included in the report!');
    console.log('   - Total Iterations ✓');
    console.log('   - Completeness ✓');
    console.log('   - Memory Used ✓');
    console.log('   - Cache Hit ✓');
  } else {
    console.log('\n⚠️  Some metrics may be missing:');
    console.log(`   - Total Iterations: ${markdownReport.includes('Total Iterations:') ? '✓' : '✗'}`);
    console.log(`   - Completeness: ${markdownReport.includes('Completeness:') ? '✓' : '✗'}`);
    console.log(`   - Memory Used: ${markdownReport.includes('Memory Used:') ? '✓' : '✗'}`);
    console.log(`   - Cache Hit: ${markdownReport.includes('Cache Hit:') ? '✓' : '✗'}`);
  }
  
  console.log('\n✅ Test completed!');
}

// Run the test
testReportMetadata().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});