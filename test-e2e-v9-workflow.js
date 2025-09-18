#!/usr/bin/env node

/**
 * End-to-End V9 Workflow Test
 *
 * Tests the complete PR analysis pipeline:
 * 1. API endpoint receives request
 * 2. Cloud tools analyze repository
 * 3. Hybrid agents generate fixes
 * 4. Cache improves performance
 * 5. Report generation completes
 */

const axios = require('axios');
const fs = require('fs');

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:3000'; // Update with deployed URL
const HYBRID_AGENT_URL = 'http://129.212.136.24';

// Test repositories
const TEST_CASES = [
  {
    name: 'Java - Apache Kafka',
    request: {
      repositoryUrl: 'https://github.com/apache/kafka',
      prNumber: 17620,
      language: 'java',
      options: {
        generateFixes: true,
        includeEducational: true
      }
    }
  },
  {
    name: 'Python - Django',
    request: {
      repositoryUrl: 'https://github.com/django/django',
      prNumber: 15234,
      language: 'python',
      options: {
        generateFixes: true,
        includeEducational: true
      }
    }
  },
  {
    name: 'JavaScript - React',
    request: {
      repositoryUrl: 'https://github.com/facebook/react',
      prNumber: 28000,
      language: 'javascript',
      options: {
        generateFixes: true,
        includeEducational: false
      }
    }
  }
];

// Test execution
async function runE2ETest() {
  console.log('🚀 V9 End-to-End Workflow Test');
  console.log('=' .repeat(60));
  console.log(`API Endpoint: ${API_URL}`);
  console.log(`Hybrid Agent: ${HYBRID_AGENT_URL}`);
  console.log('=' .repeat(60));

  // Step 1: Check service health
  console.log('\n📋 Step 1: Checking Service Health');
  console.log('-'.repeat(40));

  try {
    // Check API health
    const apiHealth = await axios.get(`${API_URL}/api/v9/health`);
    console.log('✅ API Service:', apiHealth.data.status);

    // Check hybrid agent
    const agentHealth = await axios.get(`${HYBRID_AGENT_URL}/health`);
    console.log('✅ Hybrid Agent:', agentHealth.data.status);
    console.log('✅ Redis Cache:', agentHealth.data.redis);
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    console.log('Make sure services are running. Deploy with: ./deploy-v9-to-cloud.sh');
    process.exit(1);
  }

  // Step 2: Get initial cache statistics
  console.log('\n📊 Step 2: Initial Cache Statistics');
  console.log('-'.repeat(40));

  let initialStats;
  try {
    const statsResponse = await axios.get(`${API_URL}/api/v9/cache/stats`);
    initialStats = statsResponse.data;
    console.log('Cache Hit Rate:', initialStats.cacheHitRate);
    console.log('Total Requests:', initialStats.total);
    console.log('Cache Hits:', initialStats.hits);
    console.log('Cache Misses:', initialStats.misses);
  } catch (error) {
    console.log('Cache stats not available');
    initialStats = { total: 0, hits: 0, misses: 0 };
  }

  // Step 3: Run analysis for each test case
  console.log('\n🔬 Step 3: Running PR Analyses');
  console.log('-'.repeat(40));

  const results = [];

  for (const testCase of TEST_CASES) {
    console.log(`\nAnalyzing: ${testCase.name}`);
    console.log(`Repository: ${testCase.request.repositoryUrl}`);
    console.log(`PR #${testCase.request.prNumber}`);

    const startTime = Date.now();

    try {
      // First run (cache miss expected)
      console.log('\n  First Run (building cache)...');
      const response1 = await axios.post(
        `${API_URL}/api/v9/analyze`,
        testCase.request,
        { timeout: 300000 }
      );

      const firstRunTime = Date.now() - startTime;
      console.log(`  ⏱️  Time: ${firstRunTime}ms`);
      console.log(`  📝 Issues Found: ${response1.data.summary.totalIssues}`);
      console.log(`  🔧 Fixes Generated: ${response1.data.summary.fixed}`);
      console.log(`  💾 From Cache: ${response1.data.summary.cached}`);
      console.log(`  💯 Score: ${response1.data.score.overall}/100`);

      // Wait a moment for cache to settle
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Second run (cache hit expected)
      console.log('\n  Second Run (using cache)...');
      const startTime2 = Date.now();
      const response2 = await axios.post(
        `${API_URL}/api/v9/analyze`,
        testCase.request,
        { timeout: 300000 }
      );

      const secondRunTime = Date.now() - startTime2;
      const speedup = Math.round(firstRunTime / secondRunTime);

      console.log(`  ⏱️  Time: ${secondRunTime}ms (${speedup}x faster)`);
      console.log(`  💾 From Cache: ${response2.data.summary.cached}`);
      console.log(`  📊 Cache Hit Rate: ${response2.data.metrics.cacheHitRate}`);

      results.push({
        testCase: testCase.name,
        success: true,
        firstRun: {
          time: firstRunTime,
          issues: response1.data.summary.totalIssues,
          fixes: response1.data.summary.fixed,
          cached: response1.data.summary.cached
        },
        secondRun: {
          time: secondRunTime,
          cached: response2.data.summary.cached,
          speedup: speedup
        },
        score: response1.data.score.overall,
        analysisId: response1.data.analysisId
      });

      // Save report
      const reportFile = `test-report-${testCase.request.language}-${Date.now()}.md`;
      fs.writeFileSync(reportFile, response1.data.report.markdown);
      console.log(`  📄 Report saved: ${reportFile}`);

    } catch (error) {
      console.error(`  ❌ Analysis failed: ${error.message}`);
      results.push({
        testCase: testCase.name,
        success: false,
        error: error.message
      });
    }
  }

  // Step 4: Final cache statistics
  console.log('\n📊 Step 4: Final Cache Statistics');
  console.log('-'.repeat(40));

  try {
    const finalStats = await axios.get(`${API_URL}/api/v9/cache/stats`);
    console.log('Cache Hit Rate:', finalStats.data.cacheHitRate);
    console.log('Total Requests:', finalStats.data.total);
    console.log('New Hits:', finalStats.data.hits - initialStats.hits);
    console.log('Cache Improvement:',
      `${Math.round(((finalStats.data.hits / finalStats.data.total) -
        (initialStats.hits / Math.max(initialStats.total, 1))) * 100)}%`);
  } catch (error) {
    console.log('Could not get final stats');
  }

  // Step 5: Generate summary report
  console.log('\n📋 Step 5: Test Summary');
  console.log('=' .repeat(60));

  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;

  console.log(`\nTests Passed: ${successCount}/${totalCount}`);
  console.log('\nDetailed Results:');
  console.log('-'.repeat(60));

  results.forEach(result => {
    console.log(`\n${result.testCase}:`);
    if (result.success) {
      console.log(`  ✅ Success`);
      console.log(`  First Run: ${result.firstRun.time}ms (${result.firstRun.issues} issues, ${result.firstRun.fixes} fixes)`);
      console.log(`  Second Run: ${result.secondRun.time}ms (${result.secondRun.speedup}x faster)`);
      console.log(`  Cache Improvement: ${result.secondRun.cached} hits`);
      console.log(`  Quality Score: ${result.score}/100`);
    } else {
      console.log(`  ❌ Failed: ${result.error}`);
    }
  });

  // Calculate average performance
  const successfulRuns = results.filter(r => r.success);
  if (successfulRuns.length > 0) {
    const avgFirstRun = successfulRuns.reduce((sum, r) => sum + r.firstRun.time, 0) / successfulRuns.length;
    const avgSecondRun = successfulRuns.reduce((sum, r) => sum + r.secondRun.time, 0) / successfulRuns.length;
    const avgSpeedup = successfulRuns.reduce((sum, r) => sum + r.secondRun.speedup, 0) / successfulRuns.length;

    console.log('\n📊 Performance Metrics:');
    console.log('-'.repeat(40));
    console.log(`Average First Run: ${Math.round(avgFirstRun)}ms`);
    console.log(`Average Cached Run: ${Math.round(avgSecondRun)}ms`);
    console.log(`Average Speedup: ${avgSpeedup.toFixed(1)}x`);
  }

  // Final verdict
  console.log('\n' + '=' .repeat(60));
  if (successCount === totalCount) {
    console.log('✅ All E2E tests passed successfully!');
    console.log('🎉 V9 system is fully operational!');
  } else {
    console.log(`⚠️  ${totalCount - successCount} test(s) failed`);
    console.log('Please check the logs and retry');
  }
  console.log('=' .repeat(60));

  // Save test results
  const testResults = {
    timestamp: new Date().toISOString(),
    services: {
      api: API_URL,
      hybridAgent: HYBRID_AGENT_URL
    },
    results: results,
    statistics: {
      passed: successCount,
      failed: totalCount - successCount,
      total: totalCount
    }
  };

  fs.writeFileSync('e2e-test-results.json', JSON.stringify(testResults, null, 2));
  console.log('\n📁 Test results saved to: e2e-test-results.json');
}

// Utility function to test a single PR
async function testSinglePR(repoUrl, prNumber, language) {
  console.log('🔬 Testing single PR analysis...');

  try {
    const response = await axios.post(
      `${API_URL}/api/v9/analyze`,
      {
        repositoryUrl: repoUrl,
        prNumber: prNumber,
        language: language,
        options: {
          generateFixes: true,
          includeEducational: true
        }
      }
    );

    console.log('\n✅ Analysis Complete!');
    console.log('Analysis ID:', response.data.analysisId);
    console.log('Total Issues:', response.data.summary.totalIssues);
    console.log('Score:', response.data.score.overall + '/100');
    console.log('Cache Hit Rate:', response.data.metrics.cacheHitRate);

    return response.data;
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
    throw error;
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    // Run full E2E test suite
    await runE2ETest();
  } else if (args[0] === '--single') {
    // Test single PR
    if (args.length < 4) {
      console.log('Usage: node test-e2e-v9-workflow.js --single <repo-url> <pr-number> <language>');
      process.exit(1);
    }
    await testSinglePR(args[1], parseInt(args[2]), args[3]);
  } else {
    console.log('Usage:');
    console.log('  node test-e2e-v9-workflow.js              # Run full E2E test suite');
    console.log('  node test-e2e-v9-workflow.js --single <repo> <pr> <lang>  # Test single PR');
  }
}

// Run the test
main().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});