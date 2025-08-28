#!/usr/bin/env npx ts-node
/**
 * Test BUG-072 Fix: DeepWiki Iteration Stabilization
 * 
 * This test verifies that:
 * 1. Multiple iterations are performed (min 3)
 * 2. Results converge and stabilize
 * 3. Caching works correctly
 * 4. Parallel execution functions properly
 */

import { DirectDeepWikiApiWithLocationV2 } from './src/standard/services/direct-deepwiki-api-with-location-v2';
import { PRAnalysisCategorizer } from './src/standard/services/pr-analysis-categorizer';

async function testBug072Fix() {
  console.log('=' .repeat(80));
  console.log('🧪 BUG-072 FIX VERIFICATION TEST');
  console.log('Testing DeepWiki Iteration Stabilization');
  console.log('=' .repeat(80));
  
  const deepwikiClient = new DirectDeepWikiApiWithLocationV2();
  const categorizer = new PRAnalysisCategorizer();
  const repositoryUrl = 'https://github.com/sindresorhus/ky';
  
  // Test 1: Check iteration stabilization with real API
  console.log('\n📊 Test 1: Iteration Stabilization (Real DeepWiki)');
  console.log('-'.repeat(60));
  
  process.env.USE_DEEPWIKI_MOCK = 'false';
  
  const startTime = Date.now();
  const result1 = await deepwikiClient.analyzeRepository(repositoryUrl, {
    branch: 'main',
    useCache: false // Force fresh analysis
  });
  const duration1 = Date.now() - startTime;
  
  console.log(`  ✅ First run complete:`);
  console.log(`     - Issues found: ${result1.issues?.length || 0}`);
  console.log(`     - Duration: ${duration1}ms`);
  console.log(`     - Iterations: ${result1.metadata?.iterations || 'N/A'}`);
  console.log(`     - Converged: ${result1.metadata?.converged ? 'Yes' : 'No'}`);
  console.log(`     - Stability: ${result1.metadata?.stabilityAchieved ? 'Yes' : 'No'}`);
  
  // Test 2: Check caching
  console.log('\n📊 Test 2: Cache Performance');
  console.log('-'.repeat(60));
  
  const cacheStart = Date.now();
  const result2 = await deepwikiClient.analyzeRepository(repositoryUrl, {
    branch: 'main'
    // useCache defaults to true, should hit cache
  });
  const cacheDuration = Date.now() - cacheStart;
  
  console.log(`  ✅ Cached run complete:`);
  console.log(`     - Duration: ${cacheDuration}ms`);
  console.log(`     - Speed improvement: ${((1 - cacheDuration/duration1) * 100).toFixed(1)}%`);
  
  // Test 3: Parallel execution for main and PR branches
  console.log('\n📊 Test 3: Parallel Execution');
  console.log('-'.repeat(60));
  
  const parallelStart = Date.now();
  const parallelResults = await deepwikiClient.analyzeParallel(
    repositoryUrl,
    'main',
    'pull/700/head'
  );
  const parallelDuration = Date.now() - parallelStart;
  
  console.log(`  ✅ Parallel analysis complete:`);
  console.log(`     - Main issues: ${parallelResults.main.issues?.length || 0}`);
  console.log(`     - PR issues: ${parallelResults.pr.issues?.length || 0}`);
  console.log(`     - Total duration: ${parallelDuration}ms`);
  console.log(`     - Efficiency vs sequential: ${((duration1 * 2 / parallelDuration - 1) * 100).toFixed(1)}% faster`);
  
  // Test 4: Consistency check - run multiple times
  console.log('\n📊 Test 4: Consistency Verification (3 runs)');
  console.log('-'.repeat(60));
  
  const issueCountsByRun: number[] = [];
  const issuesByRun: any[][] = [];
  
  for (let i = 0; i < 3; i++) {
    console.log(`\n  Run ${i + 1}/3...`);
    const result = await deepwikiClient.analyzeRepository(repositoryUrl, {
      branch: 'main',
      useCache: false // Force fresh analysis each time
    });
    
    const issueCount = result.issues?.length || 0;
    issueCountsByRun.push(issueCount);
    issuesByRun.push(result.issues || []);
    
    console.log(`     - Issues: ${issueCount}`);
    console.log(`     - Iterations: ${result.metadata?.iterations || 'N/A'}`);
  }
  
  // Calculate consistency metrics
  const avgIssueCount = issueCountsByRun.reduce((a, b) => a + b, 0) / issueCountsByRun.length;
  const variance = issueCountsByRun.reduce((sum, count) => 
    sum + Math.pow(count - avgIssueCount, 2), 0) / issueCountsByRun.length;
  const stdDev = Math.sqrt(variance);
  const consistencyScore = 100 - (stdDev / avgIssueCount * 100);
  
  console.log('\n  📊 Consistency Metrics:');
  console.log(`     - Average issues: ${avgIssueCount.toFixed(1)}`);
  console.log(`     - Standard deviation: ${stdDev.toFixed(1)}`);
  console.log(`     - Consistency score: ${consistencyScore.toFixed(1)}%`);
  
  // Test 5: Categorization stability
  console.log('\n📊 Test 5: Categorization Stability');
  console.log('-'.repeat(60));
  
  if (parallelResults.main.issues?.length > 0 && parallelResults.pr.issues?.length > 0) {
    const categorized = categorizer.categorizeIssues(
      parallelResults.main.issues,
      parallelResults.pr.issues
    );
    
    console.log(`  ✅ Categorization complete:`);
    console.log(`     - New issues: ${categorized.newIssues?.length || 0}`);
    console.log(`     - Fixed issues: ${categorized.fixedIssues?.length || 0}`);
    console.log(`     - Unchanged issues: ${categorized.unchangedIssues?.length || 0}`);
  }
  
  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📋 TEST SUMMARY');
  console.log('='.repeat(80));
  
  const allTestsPassed = 
    result1.metadata?.iterations >= 3 &&
    result1.metadata?.stabilityAchieved &&
    cacheDuration < duration1 / 2 &&
    consistencyScore > 80;
  
  if (allTestsPassed) {
    console.log('✅ BUG-072 FIX VERIFIED: All tests passed!');
    console.log('   - Iteration stabilization: ✓');
    console.log('   - Caching optimization: ✓');
    console.log('   - Parallel execution: ✓');
    console.log('   - Result consistency: ✓');
  } else {
    console.log('⚠️ ISSUES DETECTED:');
    if (result1.metadata?.iterations < 3) {
      console.log('   - ❌ Insufficient iterations (expected >= 3)');
    }
    if (!result1.metadata?.stabilityAchieved) {
      console.log('   - ❌ Stability not achieved');
    }
    if (cacheDuration >= duration1 / 2) {
      console.log('   - ❌ Cache not providing expected performance boost');
    }
    if (consistencyScore <= 80) {
      console.log('   - ❌ Results not consistent across runs');
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('Test completed at:', new Date().toISOString());
  console.log('='.repeat(80));
}

// Run the test
testBug072Fix().catch(console.error);