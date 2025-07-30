const { execSync } = require('child_process');

console.log('DeepWiki Redis Integration Test');
console.log('================================\n');

// Test configuration
const tests = {
  podConnection: { passed: false, details: '' },
  redisConnection: { passed: false, details: '' },
  cacheWrite: { passed: false, details: '' },
  cacheRead: { passed: false, details: '' },
  ttlVerification: { passed: false, details: '' },
  performanceTest: { passed: false, details: '' }
};

try {
  // 1. Get pod name
  console.log('1. Getting DeepWiki pod information...');
  const podName = execSync(
    "kubectl get pods -n codequal-dev -l app=deepwiki -o jsonpath='{.items[0].metadata.name}'"
  ).toString().trim();
  
  if (podName) {
    tests.podConnection.passed = true;
    tests.podConnection.details = `Pod found: ${podName}`;
    console.log(`   ✅ Pod found: ${podName}`);
  } else {
    throw new Error('No DeepWiki pod found');
  }

  // 2. Check Redis environment variables
  console.log('\n2. Checking Redis configuration...');
  const envVars = execSync(
    `kubectl exec -n codequal-dev ${podName} -- env | grep -E "(REDIS|CACHE)"`
  ).toString();
  
  if (envVars.includes('REDIS_URL') && envVars.includes('CACHE_TTL')) {
    tests.redisConnection.passed = true;
    tests.redisConnection.details = 'Redis environment variables configured';
    console.log('   ✅ Redis environment variables are set');
    console.log(envVars.split('\n').map(line => `      ${line}`).join('\n'));
  }

  // 3. Test Redis connection from pod
  console.log('\n3. Testing Redis connection from pod...');
  try {
    const pingResult = execSync(
      `kubectl exec -n codequal-dev ${podName} -- redis-cli -h 10.116.0.7 -p 6379 -a 'n7ud71guwMiBv3lOwyKGNbiDUThiyk3n' --no-auth-warning ping`
    ).toString().trim();
    
    if (pingResult === 'PONG') {
      tests.redisConnection.passed = true;
      tests.redisConnection.details = 'Redis connection successful (PONG)';
      console.log('   ✅ Redis connection successful: PONG');
    }
  } catch (e) {
    console.log('   ❌ Redis connection failed:', e.message);
  }

  // 4. Test cache write operation
  console.log('\n4. Testing cache write operation...');
  const testKey = 'deepwiki:report:test-integration';
  const testData = JSON.stringify({
    test: true,
    timestamp: new Date().toISOString(),
    message: 'DeepWiki Redis integration test'
  });
  
  try {
    execSync(
      `kubectl exec -n codequal-dev ${podName} -- redis-cli -h 10.116.0.7 -p 6379 -a 'n7ud71guwMiBv3lOwyKGNbiDUThiyk3n' --no-auth-warning SETEX ${testKey} 60 '${testData}'`
    );
    tests.cacheWrite.passed = true;
    tests.cacheWrite.details = 'Successfully wrote test data to cache';
    console.log('   ✅ Successfully wrote test data to cache');
  } catch (e) {
    console.log('   ❌ Cache write failed:', e.message);
  }

  // 5. Test cache read operation
  console.log('\n5. Testing cache read operation...');
  try {
    const readData = execSync(
      `kubectl exec -n codequal-dev ${podName} -- redis-cli -h 10.116.0.7 -p 6379 -a 'n7ud71guwMiBv3lOwyKGNbiDUThiyk3n' --no-auth-warning GET ${testKey}`
    ).toString().trim();
    
    if (readData.includes('test')) {
      tests.cacheRead.passed = true;
      tests.cacheRead.details = 'Successfully read test data from cache';
      console.log('   ✅ Successfully read test data from cache');
    }
  } catch (e) {
    console.log('   ❌ Cache read failed:', e.message);
  }

  // 6. Test TTL
  console.log('\n6. Testing TTL functionality...');
  try {
    const ttl = execSync(
      `kubectl exec -n codequal-dev ${podName} -- redis-cli -h 10.116.0.7 -p 6379 -a 'n7ud71guwMiBv3lOwyKGNbiDUThiyk3n' --no-auth-warning TTL ${testKey}`
    ).toString().trim();
    
    const ttlValue = parseInt(ttl);
    if (ttlValue > 0 && ttlValue <= 60) {
      tests.ttlVerification.passed = true;
      tests.ttlVerification.details = `TTL working correctly: ${ttlValue} seconds`;
      console.log(`   ✅ TTL working correctly: ${ttlValue} seconds remaining`);
    }
  } catch (e) {
    console.log('   ❌ TTL test failed:', e.message);
  }

  // 7. Clean up test data
  console.log('\n7. Cleaning up test data...');
  try {
    execSync(
      `kubectl exec -n codequal-dev ${podName} -- redis-cli -h 10.116.0.7 -p 6379 -a 'n7ud71guwMiBv3lOwyKGNbiDUThiyk3n' --no-auth-warning DEL ${testKey}`
    );
    console.log('   ✅ Test data cleaned up');
  } catch (e) {
    console.log('   ⚠️  Cleanup failed:', e.message);
  }

} catch (error) {
  console.error('Test execution error:', error.message);
}

// Summary
console.log('\n\nTest Summary');
console.log('============');
let passedTests = 0;
Object.entries(tests).forEach(([test, result]) => {
  if (result.passed) passedTests++;
  console.log(`${result.passed ? '✅' : '❌'} ${test}: ${result.details || 'Not tested'}`);
});

console.log(`\nTotal: ${passedTests}/${Object.keys(tests).length} tests passed`);

// Redis monitoring commands
console.log('\n\nUseful Monitoring Commands:');
console.log('===========================');
console.log('# Watch DeepWiki logs:');
console.log(`kubectl logs -n codequal-dev -f ${podName || '<pod-name>'}`);
console.log('\n# Monitor Redis in real-time:');
console.log("redis-cli -h 157.230.9.119 -p 6379 -a 'n7ud71guwMiBv3lOwyKGNbiDUThiyk3n' --no-auth-warning monitor");
console.log('\n# Check Redis memory usage:');
console.log("redis-cli -h 157.230.9.119 -p 6379 -a 'n7ud71guwMiBv3lOwyKGNbiDUThiyk3n' --no-auth-warning info memory");
console.log('\n# List all DeepWiki cache keys:');
console.log("redis-cli -h 157.230.9.119 -p 6379 -a 'n7ud71guwMiBv3lOwyKGNbiDUThiyk3n' --no-auth-warning keys 'deepwiki:*'");