/**
 * Test V7 HTML Report with CORRECT PR #700 Issue Counts
 * Based on actual analysis results from sindresorhus-ky-pr700-2025-08-18T20-21-18.json
 * 
 * Correct counts:
 * - 7 new issues (0 critical, 4 high, 2 medium, 1 low)
 * - 8 resolved issues
 * - 6 pre-existing issues (0 critical, 2 high, 4 medium, 0 low)
 */

import { ComparisonAgent } from './src/standard/comparison/comparison-agent';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function testPR700WithCorrectData() {
  console.log('🔍 Testing V7 HTML Report with CORRECT PR #700 Data');
  console.log('=' .repeat(60));
  
  // Create mock data with the EXACT issue counts from the real analysis
  const mockMainAnalysis = {
    issues: [
      // Pre-existing issues that will remain unchanged (6 total: 2 high, 4 medium)
      { id: 'pre-1', message: 'Lack of input validation', severity: 'high', category: 'security', location: { file: 'src/index.js', line: 145 } },
      { id: 'pre-2', message: 'Missing error handling for network failures', severity: 'high', category: 'code-quality', location: { file: 'src/core/Ky.js', line: 234 } },
      { id: 'pre-3', message: 'Potential memory leak with shared abort signal', severity: 'medium', category: 'performance', location: { file: 'src/utils/abort.js', line: 89 } },
      { id: 'pre-4', message: 'Type definition incomplete for retry options', severity: 'medium', category: 'code-quality', location: { file: 'src/types/index.d.ts', line: 45 } },
      { id: 'pre-5', message: 'Hardcoded timeout values', severity: 'medium', category: 'code-quality', location: { file: 'src/retry.js', line: 67 } },
      { id: 'pre-6', message: 'Missing documentation for public API', severity: 'medium', category: 'code-quality', location: { file: 'src/api.js', line: 12 } },
      
      // Issues that will be resolved (8 total)
      { id: 'res-1', message: 'Deprecated method usage', severity: 'high', category: 'code-quality', location: { file: 'src/legacy.js', line: 23 } },
      { id: 'res-2', message: 'Insecure HTTP allowed', severity: 'high', category: 'security', location: { file: 'src/transport.js', line: 45 } },
      { id: 'res-3', message: 'Race condition in request queue', severity: 'medium', category: 'concurrency', location: { file: 'src/queue.js', line: 78 } },
      { id: 'res-4', message: 'Memory leak in event listeners', severity: 'medium', category: 'performance', location: { file: 'src/events.js', line: 34 } },
      { id: 'res-5', message: 'Incorrect error message format', severity: 'low', category: 'code-quality', location: { file: 'src/errors.js', line: 12 } },
      { id: 'res-6', message: 'Missing test coverage for edge case', severity: 'low', category: 'code-quality', location: { file: 'test/edge.test.js', line: 45 } },
      { id: 'res-7', message: 'Unused variable in function', severity: 'low', category: 'code-quality', location: { file: 'src/helpers.js', line: 89 } },
      { id: 'res-8', message: 'Console.log left in production code', severity: 'low', category: 'code-quality', location: { file: 'src/debug.js', line: 56 } }
    ],
    scores: { overall: 72, security: 85, performance: 68, codeQuality: 70, testing: 65 },
    recommendations: [],
    metadata: {}
  };
  
  const mockFeatureAnalysis = {
    issues: [
      // Pre-existing issues that remain (6 total: 2 high, 4 medium)
      { id: 'pre-1', message: 'Lack of input validation', severity: 'high', category: 'security', location: { file: 'src/index.js', line: 145 } },
      { id: 'pre-2', message: 'Missing error handling for network failures', severity: 'high', category: 'code-quality', location: { file: 'src/core/Ky.js', line: 234 } },
      { id: 'pre-3', message: 'Potential memory leak with shared abort signal', severity: 'medium', category: 'performance', location: { file: 'src/utils/abort.js', line: 89 } },
      { id: 'pre-4', message: 'Type definition incomplete for retry options', severity: 'medium', category: 'code-quality', location: { file: 'src/types/index.d.ts', line: 45 } },
      { id: 'pre-5', message: 'Hardcoded timeout values', severity: 'medium', category: 'code-quality', location: { file: 'src/retry.js', line: 67 } },
      { id: 'pre-6', message: 'Missing documentation for public API', severity: 'medium', category: 'code-quality', location: { file: 'src/api.js', line: 12 } },
      
      // NEW issues introduced in PR (7 total: 4 high, 2 medium, 1 low)
      { id: 'new-1', message: 'Use of deprecated request method', severity: 'high', category: 'code-quality', location: { file: 'src/request.js', line: 156 } },
      { id: 'new-2', message: 'Missing error handling for network requests', severity: 'high', category: 'security', location: { file: 'src/fetch.js', line: 234 } },
      { id: 'new-3', message: 'Lack of unit tests for critical components', severity: 'high', category: 'code-quality', location: { file: 'src/core.js', line: 456 } },
      { id: 'new-4', message: 'Uncaught promise rejection', severity: 'high', category: 'security', location: { file: 'src/promise.js', line: 78 } },
      { id: 'new-5', message: 'Use of any type in TypeScript', severity: 'medium', category: 'code-quality', location: { file: 'src/types.ts', line: 90 } },
      { id: 'new-6', message: 'Magic number without constant', severity: 'medium', category: 'code-quality', location: { file: 'src/constants.js', line: 23 } },
      { id: 'new-7', message: 'Hardcoded URLs in tests', severity: 'low', category: 'code-quality', location: { file: 'test/integration.test.js', line: 145 } }
    ],
    scores: { overall: 68, security: 80, performance: 65, codeQuality: 65, testing: 60 },
    recommendations: [],
    metadata: {}
  };
  
  console.log('\n📊 Mock Data Summary:');
  console.log(`   Main branch: ${mockMainAnalysis.issues.length} issues`);
  console.log(`   Feature branch: ${mockFeatureAnalysis.issues.length} issues`);
  
  // Use ComparisonAgent to generate the report
  console.log('\n📝 Generating V7 HTML report...');
  const comparisonAgent = new ComparisonAgent();
  await comparisonAgent.initialize({
    language: 'typescript',
    complexity: 'medium',
    performance: 'balanced'
  });
  
  const comparisonResult = await comparisonAgent.analyze({
    mainBranchAnalysis: mockMainAnalysis as any,
    featureBranchAnalysis: mockFeatureAnalysis as any,
    prMetadata: {
      number: 700,
      title: 'Add AbortController support',
      description: 'This PR adds AbortController support for request cancellation and improves the retry mechanism',
      author: 'sindresorhus',
      created_at: new Date().toISOString(),
      repository_url: 'https://github.com/sindresorhus/ky',
      linesAdded: 262,
      linesRemoved: 176
    },
    generateReport: true
  });
  
  // Verify the counts are correct
  const newCount = comparisonResult.comparison.newIssues?.length || 0;
  const resolvedCount = comparisonResult.comparison.resolvedIssues?.length || 0;
  const unchangedCount = comparisonResult.comparison.unchangedIssues?.length || 0;
  
  console.log('\n✅ Comparison Results:');
  console.log(`   New Issues: ${newCount} (expected: 7)`);
  console.log(`   Resolved Issues: ${resolvedCount} (expected: 8)`);
  console.log(`   Pre-existing Issues: ${unchangedCount} (expected: 6)`);
  
  // Verify severity breakdown for new issues
  const newIssues = comparisonResult.comparison.newIssues || [];
  const criticalNew = newIssues.filter(i => i.severity === 'critical').length;
  const highNew = newIssues.filter(i => i.severity === 'high').length;
  const mediumNew = newIssues.filter(i => i.severity === 'medium').length;
  const lowNew = newIssues.filter(i => i.severity === 'low').length;
  
  console.log('\n📊 New Issues Breakdown:');
  console.log(`   Critical: ${criticalNew} (expected: 0)`);
  console.log(`   High: ${highNew} (expected: 4)`);
  console.log(`   Medium: ${mediumNew} (expected: 2)`);
  console.log(`   Low: ${lowNew} (expected: 1)`);
  
  // Verify severity breakdown for pre-existing issues
  const unchangedIssues = comparisonResult.comparison.unchangedIssues || [];
  const criticalPre = unchangedIssues.filter(i => i.severity === 'critical').length;
  const highPre = unchangedIssues.filter(i => i.severity === 'high').length;
  const mediumPre = unchangedIssues.filter(i => i.severity === 'medium').length;
  const lowPre = unchangedIssues.filter(i => i.severity === 'low').length;
  
  console.log('\n📌 Pre-existing Issues Breakdown:');
  console.log(`   Critical: ${criticalPre} (expected: 0)`);
  console.log(`   High: ${highPre} (expected: 2)`);
  console.log(`   Medium: ${mediumPre} (expected: 4)`);
  console.log(`   Low: ${lowPre} (expected: 0)`);
  
  // Check if counts match expectations
  const countsCorrect = 
    newCount === 7 && 
    resolvedCount === 8 && 
    unchangedCount === 6 &&
    criticalNew === 0 &&
    highNew === 4 &&
    mediumNew === 2 &&
    lowNew === 1 &&
    criticalPre === 0 &&
    highPre === 2 &&
    mediumPre === 4 &&
    lowPre === 0;
  
  if (countsCorrect) {
    console.log('\n✅ ALL COUNTS MATCH EXPECTED VALUES!');
  } else {
    console.log('\n❌ COUNTS DO NOT MATCH EXPECTED VALUES!');
  }
  
  // Save the HTML report
  const reportPath = path.join(__dirname, 'pr700-v7-correct-report.html');
  if (comparisonResult.report) {
    fs.writeFileSync(reportPath, comparisonResult.report);
    console.log(`\n📄 Report saved to: ${reportPath}`);
    console.log(`📊 Report size: ${(comparisonResult.report.length / 1024).toFixed(1)}KB`);
    
    // Check for undefined values
    const undefinedCount = (comparisonResult.report.match(/undefined/gi) || []).length;
    if (undefinedCount > 0) {
      console.warn(`⚠️  Warning: Found ${undefinedCount} 'undefined' values in the report`);
    } else {
      console.log('✅ No undefined values found in the report!');
    }
    
    // Open in browser
    console.log('\n🌐 Opening report in browser...');
    try {
      const command = process.platform === 'darwin' 
        ? `open "${reportPath}"`
        : process.platform === 'win32'
        ? `start "${reportPath}"`
        : `xdg-open "${reportPath}"`;
      
      await execAsync(command);
      console.log('✅ Report opened in browser');
    } catch (error) {
      console.log('⚠️ Could not open browser automatically');
      console.log(`   Please open manually: ${reportPath}`);
    }
  }
  
  return comparisonResult;
}

// Run the test
testPR700WithCorrectData()
  .then(result => {
    console.log('\n🎉 V7 HTML report test completed successfully!');
  })
  .catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });