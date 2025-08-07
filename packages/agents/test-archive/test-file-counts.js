#!/usr/bin/env node

// Test file counts display
const { ComparisonAgent } = require('./dist/standard/comparison/comparison-agent');
const { ReportGeneratorV7Complete } = require('./dist/standard/comparison/report-generator-v7-complete');

console.log('Testing file/line counts display...\n');

async function test() {
  try {
    const logger = {
      info: (msg, data) => console.log(`[INFO] ${msg}`, data || ''),
      error: (msg, data) => console.error(`[ERROR] ${msg}`, data || ''),
      warn: (msg, data) => console.warn(`[WARN] ${msg}`, data || ''),
      debug: () => {}
    };
    
    const comparisonAgent = new ComparisonAgent(logger);
    await comparisonAgent.initialize({
      language: 'typescript',
      complexity: 'medium'
    });
    
    // Create mock analysis results
    const mainAnalysis = {
      issues: [
        { id: 'ISSUE-1', severity: 'high', category: 'security', message: 'Security issue' },
        { id: 'ISSUE-2', severity: 'medium', category: 'performance', message: 'Performance issue' }
      ],
      scores: { overall: 75, security: 70, performance: 80, maintainability: 85 }
    };
    
    const prAnalysis = {
      issues: [
        { id: 'ISSUE-2', severity: 'medium', category: 'performance', message: 'Performance issue' },
        { id: 'ISSUE-3', severity: 'low', category: 'code-quality', message: 'New quality issue' }
      ],
      scores: { overall: 78, security: 85, performance: 75, maintainability: 82 }
    };
    
    // Run comparison WITH file counts in PR metadata
    console.log('=== Testing WITH file counts ===');
    const resultWithCounts = await comparisonAgent.analyze({
      mainBranchAnalysis: mainAnalysis,
      featureBranchAnalysis: prAnalysis,
      prMetadata: {
        number: 123,
        title: 'Test PR with file counts',
        author: 'test-user',
        repository_url: 'https://github.com/test/repo',
        filesChanged: 42,
        linesAdded: 567,
        linesRemoved: 234
      },
      generateReport: true
    });
    
    console.log('\nResult includes:');
    console.log('- filesChanged:', resultWithCounts.filesChanged);
    console.log('- linesAdded:', resultWithCounts.linesAdded);
    console.log('- linesRemoved:', resultWithCounts.linesRemoved);
    console.log('- linesChanged:', resultWithCounts.linesChanged);
    
    // Check if report contains the counts
    if (resultWithCounts.report) {
      const hasFilesCount = resultWithCounts.report.includes('42 files');
      const hasLinesCount = resultWithCounts.report.includes('567') || resultWithCounts.report.includes('234');
      
      console.log('\nReport validation:');
      console.log(`- Contains "42 files": ${hasFilesCount ? '✅' : '❌'}`);
      console.log(`- Contains line counts: ${hasLinesCount ? '✅' : '❌'}`);
      
      // Extract and show the summary section
      const summaryMatch = resultWithCounts.report.match(/This PR \(.*?\) introduces/);
      if (summaryMatch) {
        console.log('\nSummary line from report:');
        console.log(summaryMatch[0]);
      }
      
      // Extract file/line metrics
      const metricsSection = resultWithCounts.report.match(/Files Changed:.*\n.*Lines Added\/Removed:.*/);
      if (metricsSection) {
        console.log('\nMetrics from report:');
        console.log(metricsSection[0]);
      }
    }
    
    console.log('\n=== Testing WITHOUT file counts (should show 0) ===');
    const resultWithoutCounts = await comparisonAgent.analyze({
      mainBranchAnalysis: mainAnalysis,
      featureBranchAnalysis: prAnalysis,
      prMetadata: {
        number: 456,
        title: 'Test PR without file counts',
        author: 'test-user',
        repository_url: 'https://github.com/test/repo'
        // No file counts provided
      },
      generateReport: true
    });
    
    console.log('\nResult includes:');
    console.log('- filesChanged:', resultWithoutCounts.filesChanged);
    console.log('- linesAdded:', resultWithoutCounts.linesAdded);
    console.log('- linesRemoved:', resultWithoutCounts.linesRemoved);
    console.log('- linesChanged:', resultWithoutCounts.linesChanged);
    
    console.log('\n✅ Test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
  
  setTimeout(() => process.exit(0), 1000);
}

test();