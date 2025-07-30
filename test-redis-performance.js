const Redis = require('ioredis');

async function testRedisPerformance() {
  console.log('Redis Performance Test for CodeQual Cache');
  console.log('========================================\n');

  // Use the public URL for testing
  const redis = new Redis('redis://:n7ud71guwMiBv3lOwyKGNbiDUThiyk3n@157.230.9.119:6379');

  try {
    // Test 1: Basic connectivity
    console.log('1. Testing connectivity...');
    const pingStart = Date.now();
    const pong = await redis.ping();
    const pingTime = Date.now() - pingStart;
    console.log(`   ✅ Connected! Ping time: ${pingTime}ms\n`);

    // Test 2: Set/Get performance
    console.log('2. Testing cache set/get performance...');
    const testData = {
      prId: 'test-pr-123',
      repositoryUrl: 'https://github.com/example/repo',
      mainBranchAnalysis: {
        branch: 'main',
        commit: 'abc123',
        analyzedAt: new Date().toISOString(),
        scores: { security: 85, performance: 90, quality: 88 },
        patterns: ['pattern1', 'pattern2'],
        summary: 'Main branch analysis summary'
      },
      featureBranchAnalysis: {
        branch: 'feature/test',
        commit: 'def456',
        analyzedAt: new Date().toISOString(),
        scores: { security: 87, performance: 92, quality: 89 },
        patterns: ['pattern1', 'pattern2', 'pattern3'],
        summary: 'Feature branch analysis summary'
      },
      comparison: {
        addedPatterns: ['pattern3'],
        removedPatterns: [],
        scoreChanges: {
          security: { before: 85, after: 87, change: 2 },
          performance: { before: 90, after: 92, change: 2 },
          quality: { before: 88, after: 89, change: 1 }
        },
        recommendations: ['Improve error handling', 'Add more tests']
      },
      timestamp: new Date().toISOString()
    };

    // Test SET operation
    const setStart = Date.now();
    await redis.setex('deepwiki:report:test-pr-123', 1800, JSON.stringify(testData));
    const setTime = Date.now() - setStart;
    console.log(`   SET operation: ${setTime}ms`);

    // Test GET operation
    const getStart = Date.now();
    const retrieved = await redis.get('deepwiki:report:test-pr-123');
    const getTime = Date.now() - getStart;
    console.log(`   GET operation: ${getTime}ms`);
    console.log(`   Data size: ${JSON.stringify(testData).length} bytes\n`);

    // Test 3: Multiple operations
    console.log('3. Testing multiple operations (simulating concurrent access)...');
    const operations = 100;
    const setTimes = [];
    const getTimes = [];

    for (let i = 0; i < operations; i++) {
      const key = `deepwiki:report:test-pr-${i}`;
      
      // SET
      const setStart = Date.now();
      await redis.setex(key, 1800, JSON.stringify(testData));
      setTimes.push(Date.now() - setStart);
      
      // GET
      const getStart = Date.now();
      await redis.get(key);
      getTimes.push(Date.now() - getStart);
    }

    const avgSetTime = setTimes.reduce((a, b) => a + b, 0) / operations;
    const avgGetTime = getTimes.reduce((a, b) => a + b, 0) / operations;
    
    console.log(`   Average SET time: ${avgSetTime.toFixed(2)}ms`);
    console.log(`   Average GET time: ${avgGetTime.toFixed(2)}ms`);
    console.log(`   Total operations: ${operations * 2}\n`);

    // Test 4: TTL verification
    console.log('4. Testing TTL functionality...');
    await redis.setex('deepwiki:report:ttl-test', 60, 'test-data');
    const ttl = await redis.ttl('deepwiki:report:ttl-test');
    console.log(`   ✅ TTL set correctly: ${ttl} seconds\n`);

    // Test 5: Memory info
    console.log('5. Redis server info...');
    const info = await redis.info('memory');
    const usedMemory = info.match(/used_memory_human:(.+)/);
    const maxMemory = info.match(/maxmemory_human:(.+)/);
    
    if (usedMemory) console.log(`   Used memory: ${usedMemory[1]}`);
    if (maxMemory) console.log(`   Max memory: ${maxMemory[1]}`);

    // Clean up test data
    console.log('\n6. Cleaning up test data...');
    for (let i = 0; i < operations; i++) {
      await redis.del(`deepwiki:report:test-pr-${i}`);
    }
    await redis.del('deepwiki:report:test-pr-123');
    await redis.del('deepwiki:report:ttl-test');
    console.log('   ✅ Test data cleaned\n');

    // Summary
    console.log('Performance Summary:');
    console.log('===================');
    console.log(`✅ Connection latency: ${pingTime}ms`);
    console.log(`✅ Single SET operation: ${setTime}ms`);
    console.log(`✅ Single GET operation: ${getTime}ms`);
    console.log(`✅ Average SET (100 ops): ${avgSetTime.toFixed(2)}ms`);
    console.log(`✅ Average GET (100 ops): ${avgGetTime.toFixed(2)}ms`);
    
    if (avgGetTime < 50) {
      console.log('\n🎉 Performance target achieved! GET operations < 50ms');
    } else {
      console.log('\n⚠️  Performance slower than 50ms target. Consider using private IP in production.');
    }

  } catch (error) {
    console.error('❌ Error during testing:', error.message);
  } finally {
    redis.disconnect();
  }
}

// Check if ioredis is installed
try {
  require.resolve('ioredis');
  testRedisPerformance();
} catch (e) {
  console.log('Installing ioredis...');
  require('child_process').execSync('npm install ioredis', { stdio: 'inherit' });
  console.log('\nPlease run the script again: node test-redis-performance.js');
}