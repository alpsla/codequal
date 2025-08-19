/**
 * Optimization Validation Test
 * Verifies that the performance optimizations are working
 */

import { CachedDeepWikiAnalyzer } from './src/standard/deepwiki/services/cached-deepwiki-analyzer';
import { AdaptiveDeepWikiAnalyzer } from './src/standard/deepwiki/services/adaptive-deepwiki-analyzer';
import { performance } from 'perf_hooks';

interface OptimizationMetrics {
  test: string;
  uncachedTime: number;
  cachedTime: number;
  improvement: number;
  cacheHitRate: string;
}

async function validateOptimizations() {
  console.log('🚀 OPTIMIZATION VALIDATION');
  console.log('=' .repeat(60));
  console.log('Testing performance improvements from caching and optimizations\n');
  
  const metrics: OptimizationMetrics[] = [];
  
  // Test 1: Cache effectiveness
  console.log('📊 Test 1: Cache Performance');
  console.log('-'.repeat(40));
  
  const cachedAnalyzer = new CachedDeepWikiAnalyzer(
    'http://localhost:8001',
    'dw-key-e48329b6c05b4a36a18d65af21ac3c2f',
    { 
      info: console.log,
      warn: console.log,
      error: console.log
    },
    {
      maxIterations: 1,
      timeout: 30000
    },
    {
      enabled: true,
      ttl: 300,
      maxSize: 10,
      redisUrl: process.env.REDIS_URL
    }
  );
  
  const testRepo = 'https://github.com/sindresorhus/ky';
  
  try {
    // First call (uncached)
    console.log('\nFirst call (uncached):');
    const start1 = performance.now();
    await cachedAnalyzer.analyzeWithGapFilling(testRepo, 'main');
    const uncachedTime = performance.now() - start1;
    console.log(`⏱️ Time: ${(uncachedTime / 1000).toFixed(2)}s`);
    
    // Second call (should be cached)
    console.log('\nSecond call (cached):');
    const start2 = performance.now();
    await cachedAnalyzer.analyzeWithGapFilling(testRepo, 'main');
    const cachedTime = performance.now() - start2;
    console.log(`⏱️ Time: ${(cachedTime / 1000).toFixed(2)}s`);
    
    // Third call (verify cache consistency)
    console.log('\nThird call (cached):');
    const start3 = performance.now();
    await cachedAnalyzer.analyzeWithGapFilling(testRepo, 'main');
    const cachedTime2 = performance.now() - start3;
    console.log(`⏱️ Time: ${(cachedTime2 / 1000).toFixed(2)}s`);
    
    const improvement = ((uncachedTime - cachedTime) / uncachedTime) * 100;
    const stats = cachedAnalyzer.getCacheStats();
    
    metrics.push({
      test: 'Cache Performance',
      uncachedTime,
      cachedTime,
      improvement,
      cacheHitRate: stats.hitRate
    });
    
    console.log(`\n✅ Cache improvement: ${improvement.toFixed(0)}%`);
    console.log(`   Cache stats: ${JSON.stringify(stats, null, 2)}`);
    
  } catch (error: any) {
    console.log(`❌ Cache test failed: ${error.message}`);
    metrics.push({
      test: 'Cache Performance',
      uncachedTime: 0,
      cachedTime: 0,
      improvement: 0,
      cacheHitRate: '0%'
    });
  }
  
  // Test 2: Parallel processing
  console.log('\n📊 Test 2: Parallel Processing');
  console.log('-'.repeat(40));
  
  try {
    // Sequential processing (baseline)
    console.log('\nSequential analysis:');
    const seqStart = performance.now();
    const main1 = await cachedAnalyzer.analyzeWithGapFilling(testRepo, 'main');
    const pr1 = await cachedAnalyzer.analyzeWithGapFilling(testRepo, 'pull/700/head');
    const seqTime = performance.now() - seqStart;
    console.log(`⏱️ Sequential time: ${(seqTime / 1000).toFixed(2)}s`);
    
    // Clear cache for fair comparison
    await cachedAnalyzer.clearCache();
    
    // Parallel processing
    console.log('\nParallel analysis:');
    const parStart = performance.now();
    const results = await cachedAnalyzer.analyzeParallel(testRepo, 'main', 'pull/700/head');
    const parTime = performance.now() - parStart;
    console.log(`⏱️ Parallel time: ${(parTime / 1000).toFixed(2)}s`);
    
    const parallelImprovement = ((seqTime - parTime) / seqTime) * 100;
    
    metrics.push({
      test: 'Parallel Processing',
      uncachedTime: seqTime,
      cachedTime: parTime,
      improvement: parallelImprovement,
      cacheHitRate: 'N/A'
    });
    
    console.log(`\n✅ Parallel improvement: ${parallelImprovement.toFixed(0)}%`);
    
  } catch (error: any) {
    console.log(`❌ Parallel test failed: ${error.message}`);
    metrics.push({
      test: 'Parallel Processing',
      uncachedTime: 0,
      cachedTime: 0,
      improvement: 0,
      cacheHitRate: 'N/A'
    });
  }
  
  // Test 3: Regex optimization
  console.log('\n📊 Test 3: Regex Pattern Optimization');
  console.log('-'.repeat(40));
  
  const testResponse = `
    Analysis found issues:
    1. File: src/index.ts, Line: 42 - Security issue
    2. lib/utils.js:100 - Performance problem
    3. File Path: test/main.test.js, Line Number: 55
  `.repeat(100); // Large response to test performance
  
  try {
    // Test optimized parsing
    const optimizedAnalyzer = new CachedDeepWikiAnalyzer(
      'http://localhost:8001',
      'test-key',
      { info: () => {}, warn: () => {}, error: () => {} },
      { maxIterations: 1, timeout: 30000 }
    );
    
    const optStart = performance.now();
    for (let i = 0; i < 100; i++) {
      (optimizedAnalyzer as any).fallbackParse(testResponse);
    }
    const optTime = performance.now() - optStart;
    
    // Test unoptimized parsing (baseline)
    const unoptAnalyzer = new AdaptiveDeepWikiAnalyzer(
      'http://localhost:8001',
      'test-key',
      { info: () => {}, warn: () => {}, error: () => {} },
      { maxIterations: 1, timeout: 30000 }
    );
    
    const unoptStart = performance.now();
    for (let i = 0; i < 100; i++) {
      (unoptAnalyzer as any).fallbackParse(testResponse);
    }
    const unoptTime = performance.now() - unoptStart;
    
    const regexImprovement = ((unoptTime - optTime) / unoptTime) * 100;
    
    metrics.push({
      test: 'Regex Optimization',
      uncachedTime: unoptTime,
      cachedTime: optTime,
      improvement: regexImprovement,
      cacheHitRate: 'N/A'
    });
    
    console.log(`✅ Parsing 100 responses:`);
    console.log(`   Unoptimized: ${unoptTime.toFixed(0)}ms`);
    console.log(`   Optimized: ${optTime.toFixed(0)}ms`);
    console.log(`   Improvement: ${regexImprovement.toFixed(0)}%`);
    
  } catch (error: any) {
    console.log(`❌ Regex test failed: ${error.message}`);
    metrics.push({
      test: 'Regex Optimization',
      uncachedTime: 0,
      cachedTime: 0,
      improvement: 0,
      cacheHitRate: 'N/A'
    });
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📈 OPTIMIZATION SUMMARY');
  console.log('='.repeat(60));
  
  console.log('\n📊 Performance Improvements:');
  metrics.forEach(m => {
    const status = m.improvement > 20 ? '✅' : m.improvement > 0 ? '⚡' : '❌';
    console.log(`${status} ${m.test.padEnd(20)}: ${m.improvement.toFixed(0)}% improvement`);
    if (m.uncachedTime > 0) {
      console.log(`   Before: ${(m.uncachedTime / 1000).toFixed(2)}s`);
      console.log(`   After: ${(m.cachedTime / 1000).toFixed(2)}s`);
      if (m.cacheHitRate !== 'N/A') {
        console.log(`   Cache hit rate: ${m.cacheHitRate}`);
      }
    }
  });
  
  const avgImprovement = metrics.filter(m => m.improvement > 0)
    .reduce((sum, m) => sum + m.improvement, 0) / metrics.filter(m => m.improvement > 0).length;
  
  console.log(`\n🎯 Overall improvement: ${avgImprovement.toFixed(0)}%`);
  
  // Projected impact
  console.log('\n📊 Projected Impact on Full Flow:');
  const baselineTime = 10.9; // seconds from performance summary
  const optimizedTime = baselineTime * (1 - avgImprovement / 100);
  
  console.log(`   Baseline: ${baselineTime.toFixed(1)}s`);
  console.log(`   Optimized: ${optimizedTime.toFixed(1)}s`);
  console.log(`   Time saved: ${(baselineTime - optimizedTime).toFixed(1)}s`);
  
  // Implementation status
  console.log('\n✅ Implemented Optimizations:');
  console.log('   1. Redis/Memory caching for DeepWiki responses');
  console.log('   2. Pre-compiled regex patterns');
  console.log('   3. Parallel processing capability');
  console.log('   4. Response size optimization');
  console.log('   5. Fallback parser improvements');
  
  console.log('\n🔄 Next Steps:');
  console.log('   1. Integrate CachedDeepWikiAnalyzer into main flow');
  console.log('   2. Add cache warming for popular repositories');
  console.log('   3. Implement request batching');
  console.log('   4. Add circuit breaker for resilience');
  
  // Cleanup
  await cachedAnalyzer.destroy();
  
  return metrics;
}

// Run validation
validateOptimizations().catch(console.error);