
const { UnifiedSearchService } = require('./dist/services/search/unified-search.service.js');
const { performance } = require('perf_hooks');

console.log('⚡ Testing Performance at Scale...\n');

// Helper to generate test data
function generateTestQueries(count) {
  const queryTemplates = [
    'security vulnerability in {component}',
    'performance optimization for {feature}',
    'error handling in {module}',
    'authentication bypass {method}',
    'memory leak in {service}',
    'API endpoint {action} implementation',
    'database query optimization {table}',
    'caching strategy for {resource}',
    'middleware {type} configuration',
    'dependency update {package}'
  ];
  
  const components = ['login', 'payment', 'user', 'admin', 'api', 'database'];
  const features = ['search', 'upload', 'download', 'sync', 'backup'];
  const modules = ['auth', 'core', 'utils', 'services', 'models'];
  
  const queries = [];
  for (let i = 0; i < count; i++) {
    const template = queryTemplates[i % queryTemplates.length];
    const query = template
      .replace('{component}', components[Math.floor(Math.random() * components.length)])
      .replace('{feature}', features[Math.floor(Math.random() * features.length)])
      .replace('{module}', modules[Math.floor(Math.random() * modules.length)])
      .replace('{method}', `method${i}`)
      .replace('{service}', `service${i}`)
      .replace('{action}', ['GET', 'POST', 'PUT', 'DELETE'][i % 4])
      .replace('{table}', `table${i % 10}`)
      .replace('{resource}', `resource${i % 20}`)
      .replace('{type}', ['auth', 'logging', 'error', 'cors'][i % 4])
      .replace('{package}', `package${i % 50}`);
    queries.push(query);
  }
  return queries;
}

// Helper to calculate statistics
function calculateStats(numbers) {
  const sorted = numbers.sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const avg = sum / sorted.length;
  
  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    avg: avg,
    median: sorted[Math.floor(sorted.length / 2)],
    p95: sorted[Math.floor(sorted.length * 0.95)],
    p99: sorted[Math.floor(sorted.length * 0.99)]
  };
}

async function testPerformanceScale() {
  const search = new UnifiedSearchService();
  let passedTests = 0;
  let totalTests = 0;

  // Test 1: Response Time Under Load
  console.log('📋 Response Time Performance');
  console.log('─'.repeat(50));
  
  try {
    const loadLevels = [10, 50, 100, 500];
    
    for (const load of loadLevels) {
      console.log(`\n   Testing with ${load} queries...`);
      const queries = generateTestQueries(load);
      const responseTimes = [];
      
      const startTime = performance.now();
      
      for (const query of queries) {
        const queryStart = performance.now();
        await search.search(query, { maxResults: 5 });
        const queryEnd = performance.now();
        responseTimes.push(queryEnd - queryStart);
      }
      
      const totalTime = performance.now() - startTime;
      const stats = calculateStats(responseTimes);
      
      console.log(`   Total time: ${totalTime.toFixed(2)}ms`);
      console.log(`   Throughput: ${(load / (totalTime / 1000)).toFixed(2)} queries/sec`);
      console.log(`   Response times (ms):`);
      console.log(`     Min: ${stats.min.toFixed(2)}`);
      console.log(`     Avg: ${stats.avg.toFixed(2)}`);
      console.log(`     Median: ${stats.median.toFixed(2)}`);
      console.log(`     P95: ${stats.p95.toFixed(2)}`);
      console.log(`     P99: ${stats.p99.toFixed(2)}`);
      
      // Performance criteria
      if (stats.p95 < 200) { // P95 under 200ms
        console.log(`   ✅ Performance acceptable at ${load} queries`);
        passedTests++;
      } else {
        console.log(`   ❌ Performance degraded at ${load} queries`);
      }
    }
    totalTests += loadLevels.length;
    
  } catch (error) {
    console.log(`   ❌ Test failed: ${error.message}`);
    totalTests += 4;
  }

  // Test 2: Concurrent Request Performance
  console.log('\n📋 Concurrent Request Performance');
  console.log('─'.repeat(50));
  
  try {
    const concurrencyLevels = [5, 10, 20, 50];
    
    for (const concurrency of concurrencyLevels) {
      console.log(`\n   Testing ${concurrency} concurrent requests...`);
      
      const queries = generateTestQueries(concurrency);
      const startTime = performance.now();
      
      // Launch concurrent requests
      const promises = queries.map(query => 
        search.search(query, { maxResults: 3 })
          .then(() => ({ success: true }))
          .catch(() => ({ success: false }))
      );
      
      const results = await Promise.all(promises);
      const duration = performance.now() - startTime;
      
      const successCount = results.filter(r => r.success).length;
      const successRate = (successCount / concurrency) * 100;
      
      console.log(`   Completed in: ${duration.toFixed(2)}ms`);
      console.log(`   Success rate: ${successRate.toFixed(1)}%`);
      console.log(`   Avg time per request: ${(duration / concurrency).toFixed(2)}ms`);
      
      if (successRate >= 95 && duration < concurrency * 100) {
        console.log(`   ✅ Handles ${concurrency} concurrent requests well`);
        passedTests++;
      } else {
        console.log(`   ❌ Struggles with ${concurrency} concurrent requests`);
      }
    }
    totalTests += concurrencyLevels.length;
    
  } catch (error) {
    console.log(`   ❌ Test failed: ${error.message}`);
    totalTests += 4;
  }

  // Test 3: Cache Performance Impact
  console.log('\n📋 Cache Performance Impact');
  console.log('─'.repeat(50));
  
  try {
    const testQuery = 'performance optimization techniques';
    const iterations = 100;
    
    console.log(`   Testing cache impact with ${iterations} repeated queries...`);
    
    // Cold cache
    const coldTimes = [];
    for (let i = 0; i < 10; i++) {
      const uniqueQuery = `${testQuery} variant ${i}`;
      const start = performance.now();
      await search.search(uniqueQuery, { maxResults: 5 });
      coldTimes.push(performance.now() - start);
    }
    
    // Warm cache
    const warmTimes = [];
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await search.search(testQuery, { maxResults: 5 });
      warmTimes.push(performance.now() - start);
    }
    
    const coldStats = calculateStats(coldTimes);
    const warmStats = calculateStats(warmTimes);
    
    console.log('   Cold cache performance:');
    console.log(`     Avg: ${coldStats.avg.toFixed(2)}ms`);
    console.log('   Warm cache performance:');
    console.log(`     Avg: ${warmStats.avg.toFixed(2)}ms`);
    
    const improvement = ((coldStats.avg - warmStats.avg) / coldStats.avg) * 100;
    console.log(`   Cache improvement: ${improvement.toFixed(1)}%`);
    
    if (improvement > 30) { // At least 30% improvement
      console.log('   ✅ Cache significantly improves performance');
      passedTests++;
    } else {
      console.log('   ⚠️  Cache improvement is minimal');
    }
    totalTests++;
    
  } catch (error) {
    console.log(`   ❌ Test failed: ${error.message}`);
    totalTests++;
  }

  // Test 4: Memory Usage Under Load
  console.log('\n📋 Memory Usage Under Load');
  console.log('─'.repeat(50));
  
  try {
    const initialMemory = process.memoryUsage().heapUsed / 1024 / 1024;
    console.log(`   Initial memory: ${initialMemory.toFixed(2)} MB`);
    
    // Generate significant load
    console.log('   Generating 1000 unique queries...');
    const queries = generateTestQueries(1000);
    
    for (let i = 0; i < queries.length; i++) {
      await search.search(queries[i], { maxResults: 3 });
      
      // Log memory every 100 queries
      if (i % 100 === 99) {
        const currentMemory = process.memoryUsage().heapUsed / 1024 / 1024;
        console.log(`     After ${i + 1} queries: ${currentMemory.toFixed(2)} MB`);
      }
    }
    
    const finalMemory = process.memoryUsage().heapUsed / 1024 / 1024;
    const memoryIncrease = finalMemory - initialMemory;
    
    console.log(`   Final memory: ${finalMemory.toFixed(2)} MB`);
    console.log(`   Memory increase: ${memoryIncrease.toFixed(2)} MB`);
    
    if (memoryIncrease < 100) { // Less than 100MB increase
      console.log('   ✅ Memory usage remains reasonable under load');
      passedTests++;
    } else {
      console.log('   ❌ Excessive memory usage under load');
    }
    totalTests++;
    
  } catch (error) {
    console.log(`   ❌ Test failed: ${error.message}`);
    totalTests++;
  }

  // Test 5: Degradation Over Time
  console.log('\n📋 Performance Degradation Over Time');
  console.log('─'.repeat(50));
  
  try {
    console.log('   Testing performance stability over time...');
    
    const testDuration = 30000; // 30 seconds
    const checkInterval = 5000; // Check every 5 seconds
    const startTime = Date.now();
    const performanceSnapshots = [];
    
    while (Date.now() - startTime < testDuration) {
      const snapshot = {
        time: Date.now() - startTime,
        responseTimes: []
      };
      
      // Run 10 queries
      for (let i = 0; i < 10; i++) {
        const query = `stability test query ${i} at ${Date.now()}`;
        const queryStart = performance.now();
        await search.search(query, { maxResults: 3 });
        snapshot.responseTimes.push(performance.now() - queryStart);
      }
      
      const stats = calculateStats(snapshot.responseTimes);
      snapshot.avgResponseTime = stats.avg;
      performanceSnapshots.push(snapshot);
      
      console.log(`   ${(snapshot.time / 1000).toFixed(0)}s: Avg response ${stats.avg.toFixed(2)}ms`);
      
      // Wait before next check
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }
    
    // Check for degradation
    const firstAvg = performanceSnapshots[0].avgResponseTime;
    const lastAvg = performanceSnapshots[performanceSnapshots.length - 1].avgResponseTime;
    const degradation = ((lastAvg - firstAvg) / firstAvg) * 100;
    
    console.log(`   Performance change: ${degradation > 0 ? '+' : ''}${degradation.toFixed(1)}%`);
    
    if (Math.abs(degradation) < 20) { // Less than 20% degradation
      console.log('   ✅ Performance remains stable over time');
      passedTests++;
    } else {
      console.log('   ❌ Significant performance degradation detected');
    }
    totalTests++;
    
  } catch (error) {
    console.log(`   ❌ Test failed: ${error.message}`);
    totalTests++;
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Performance Scale Test Results');
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${totalTests - passedTests}`);
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  // Performance recommendations
  console.log('\n📈 Performance Recommendations:');
  if (passedTests === totalTests) {
    console.log('✅ System performs well under load');
    console.log('✅ Ready for production scale');
  } else {
    console.log('⚠️  Performance optimizations needed:');
    console.log('   - Consider implementing request queuing');
    console.log('   - Optimize database query patterns');
    console.log('   - Increase cache size or TTL');
    console.log('   - Add connection pooling');
  }
  
  if (passedTests === totalTests) {
    console.log('\n🎉 All performance tests passed!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some performance tests need attention');
    process.exit(1);
  }
}

// Run the tests
console.log('Note: This test will take approximately 1-2 minutes to complete\n');
testPerformanceScale().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});
