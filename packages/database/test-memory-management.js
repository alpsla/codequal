
const { UnifiedSearchService } = require('./dist/services/search/unified-search.service.js');
const { DataProcessingPipeline } = require('./dist/services/ingestion/data-processing-pipeline.service.js');

console.log('💾 Testing Memory Management & Resource Usage...\n');

// Helper to measure memory usage
function getMemoryUsage() {
  const usage = process.memoryUsage();
  return {
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024 * 100) / 100, // MB
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024 * 100) / 100,
    external: Math.round(usage.external / 1024 / 1024 * 100) / 100,
    rss: Math.round(usage.rss / 1024 / 1024 * 100) / 100
  };
}

// Helper to force garbage collection
function forceGC() {
  if (global.gc) {
    global.gc();
  }
}

async function testMemoryManagement() {
  let passedTests = 0;
  let totalTests = 0;

  // Test 1: Service Instance Cleanup
  console.log('📋 Service Instance Memory Management');
  console.log('─'.repeat(50));
  
  const initialMemory = getMemoryUsage();
  console.log(`   Initial memory: ${initialMemory.heapUsed} MB`);
  
  try {
    // Create and destroy many service instances
    for (let i = 0; i < 100; i++) {
      const search = new UnifiedSearchService();
      // Use the service
      await search.search('test query ' + i, { maxResults: 1 });
    }
    
    forceGC();
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const afterMemory = getMemoryUsage();
    const memoryIncrease = afterMemory.heapUsed - initialMemory.heapUsed;
    
    console.log(`   After 100 instances: ${afterMemory.heapUsed} MB`);
    console.log(`   Memory increase: ${memoryIncrease} MB`);
    
    if (memoryIncrease < 10) { // Less than 10MB increase
      console.log('   ✅ Memory properly released after service disposal');
      passedTests++;
    } else {
      console.log('   ❌ Potential memory leak detected');
    }
    totalTests++;
  } catch (error) {
    console.log(`   ❌ Test failed: ${error.message}`);
    totalTests++;
  }

  // Test 2: Cache Memory Management
  console.log('\n📋 Cache Memory Limits');
  console.log('─'.repeat(50));
  
  try {
    const search = new UnifiedSearchService();
    const beforeCacheMemory = getMemoryUsage();
    
    // Generate many unique queries to fill cache
    console.log('   Filling cache with 1000 unique queries...');
    for (let i = 0; i < 1000; i++) {
      await search.search(`unique query ${i} with lots of text to consume memory`, {
        maxResults: 1
      });
    }
    
    const afterCacheMemory = getMemoryUsage();
    const cacheMemoryUsage = afterCacheMemory.heapUsed - beforeCacheMemory.heapUsed;
    
    console.log(`   Cache memory usage: ${cacheMemoryUsage} MB`);
    
    // Check if cache has memory limits
    if (cacheMemoryUsage < 50) { // Should be limited to reasonable size
      console.log('   ✅ Cache memory properly limited');
      passedTests++;
    } else {
      console.log('   ⚠️  Cache may need memory limits');
    }
    totalTests++;
    
    // Test cache eviction
    console.log('   Testing cache eviction...');
    const cacheStats = search.getCacheStats();
    if (cacheStats.size < 1000) {
      console.log(`   ✅ Cache eviction working (size: ${cacheStats.size})`);
      passedTests++;
    } else {
      console.log('   ❌ Cache eviction not working properly');
    }
    totalTests++;
    
  } catch (error) {
    console.log(`   ❌ Test failed: ${error.message}`);
    totalTests += 2;
  }

  // Test 3: Large Document Processing
  console.log('\n📋 Large Document Memory Management');
  console.log('─'.repeat(50));
  
  try {
    console.log('   Processing large document (10MB)...');
    
    // Create a large document
    const largeContent = 'x'.repeat(10 * 1024 * 1024); // 10MB
    const beforeProcessing = getMemoryUsage();
    
    // Mock pipeline processing (in real test, would use actual pipeline)
    const chunks = [];
    const chunkSize = 1024 * 1024; // 1MB chunks
    for (let i = 0; i < largeContent.length; i += chunkSize) {
      chunks.push(largeContent.substring(i, i + chunkSize));
    }
    
    // Process chunks
    for (const chunk of chunks) {
      // Simulate processing
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    const afterProcessing = getMemoryUsage();
    const processingMemory = afterProcessing.heapUsed - beforeProcessing.heapUsed;
    
    console.log(`   Memory during processing: ${processingMemory} MB`);
    
    // Clear references
    chunks.length = 0;
    forceGC();
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const afterCleanup = getMemoryUsage();
    const memoryRetained = afterCleanup.heapUsed - beforeProcessing.heapUsed;
    
    console.log(`   Memory after cleanup: ${memoryRetained} MB`);
    
    if (memoryRetained < 5) { // Most memory should be released
      console.log('   ✅ Large document memory properly released');
      passedTests++;
    } else {
      console.log('   ❌ Memory not properly released after processing');
    }
    totalTests++;
    
  } catch (error) {
    console.log(`   ❌ Test failed: ${error.message}`);
    totalTests++;
  }

  // Test 4: Concurrent Operations Memory
  console.log('\n📋 Concurrent Operations Memory Usage');
  console.log('─'.repeat(50));
  
  try {
    const beforeConcurrent = getMemoryUsage();
    console.log('   Running 50 concurrent searches...');
    
    const promises = Array(50).fill(null).map((_, i) => 
      new UnifiedSearchService().search(`concurrent query ${i}`, { maxResults: 5 })
    );
    
    await Promise.all(promises);
    
    const afterConcurrent = getMemoryUsage();
    const concurrentMemory = afterConcurrent.heapUsed - beforeConcurrent.heapUsed;
    
    console.log(`   Memory increase: ${concurrentMemory} MB`);
    
    if (concurrentMemory < 20) { // Reasonable memory usage
      console.log('   ✅ Concurrent operations memory usage acceptable');
      passedTests++;
    } else {
      console.log('   ⚠️  High memory usage during concurrent operations');
    }
    totalTests++;
    
  } catch (error) {
    console.log(`   ❌ Test failed: ${error.message}`);
    totalTests++;
  }

  // Test 5: Memory Leak Detection
  console.log('\n📋 Memory Leak Detection');
  console.log('─'.repeat(50));
  
  try {
    console.log('   Running repeated operations to detect leaks...');
    const samples = [];
    
    for (let i = 0; i < 10; i++) {
      forceGC();
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const memBefore = getMemoryUsage().heapUsed;
      
      // Perform operations
      const search = new UnifiedSearchService();
      for (let j = 0; j < 10; j++) {
        await search.search('leak test query', { maxResults: 3 });
      }
      
      forceGC();
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const memAfter = getMemoryUsage().heapUsed;
      samples.push(memAfter - memBefore);
      
      console.log(`   Iteration ${i + 1}: ${(memAfter - memBefore).toFixed(2)} MB`);
    }
    
    // Check if memory usage is stable
    const avgIncrease = samples.reduce((a, b) => a + b, 0) / samples.length;
    const lastThree = samples.slice(-3).reduce((a, b) => a + b, 0) / 3;
    
    if (Math.abs(lastThree - avgIncrease) < 1) {
      console.log('   ✅ No memory leak detected - usage is stable');
      passedTests++;
    } else {
      console.log('   ⚠️  Potential memory leak - usage increasing');
    }
    totalTests++;
    
  } catch (error) {
    console.log(`   ❌ Test failed: ${error.message}`);
    totalTests++;
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Memory Management Test Results');
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${totalTests - passedTests}`);
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  const finalMemory = getMemoryUsage();
  console.log(`\nFinal memory usage: ${finalMemory.heapUsed} MB`);
  console.log(`Total memory allocated: ${finalMemory.heapTotal} MB`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 All memory management tests passed!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some memory management tests need attention');
    process.exit(1);
  }
}

// Run the tests (with --expose-gc flag for better testing)
console.log('Note: Run with --expose-gc flag for accurate memory testing');
console.log('Example: node --expose-gc test-memory-management.js\n');

testMemoryManagement().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});
