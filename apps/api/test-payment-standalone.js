// Standalone payment test runner
// This bypasses the complex Jest setup to test payment endpoints

const axios = require('axios');
const { spawn } = require('child_process');

const API_URL = 'http://localhost:3001';
let serverProcess;

// Test results
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

// Helper to make requests
async function makeRequest(method, path, data = null, headers = {}) {
  try {
    const response = await axios({
      method,
      url: `${API_URL}${path}`,
      data,
      headers,
      validateStatus: () => true // Don't throw on any status
    });
    return response;
  } catch (error) {
    return { status: 500, data: { error: error.message } };
  }
}

// Test functions
async function testBillingStatusWithoutAuth() {
  console.log('\n🧪 Test: Billing status without authentication');
  const response = await makeRequest('GET', '/api/billing/status');
  
  const passed = response.status === 401;
  results.tests.push({
    name: 'Billing status without auth',
    passed,
    expected: 401,
    actual: response.status
  });
  
  if (passed) {
    console.log('✅ PASSED: Returns 401 as expected');
    results.passed++;
  } else {
    console.log(`❌ FAILED: Expected 401, got ${response.status}`);
    results.failed++;
  }
}

async function testCheckoutWithoutAuth() {
  console.log('\n🧪 Test: Create checkout without authentication');
  const response = await makeRequest('POST', '/api/billing/create-checkout', {
    priceId: 'price_test'
  });
  
  const passed = response.status === 401;
  results.tests.push({
    name: 'Create checkout without auth',
    passed,
    expected: 401,
    actual: response.status
  });
  
  if (passed) {
    console.log('✅ PASSED: Returns 401 as expected');
    results.passed++;
  } else {
    console.log(`❌ FAILED: Expected 401, got ${response.status}`);
    results.failed++;
  }
}

async function testSetupIntentWithoutAuth() {
  console.log('\n🧪 Test: Create setup intent without authentication');
  const response = await makeRequest('POST', '/api/billing/create-setup-intent');
  
  const passed = response.status === 401;
  results.tests.push({
    name: 'Create setup intent without auth',
    passed,
    expected: 401,
    actual: response.status
  });
  
  if (passed) {
    console.log('✅ PASSED: Returns 401 as expected');
    results.passed++;
  } else {
    console.log(`❌ FAILED: Expected 401, got ${response.status}`);
    results.failed++;
  }
}

async function testWebhookEndpoint() {
  console.log('\n🧪 Test: Webhook endpoint exists');
  const response = await makeRequest('POST', '/stripe/webhook', {
    type: 'test.event'
  }, {
    'stripe-signature': 'test_sig'
  });
  
  // Should return 400 for invalid signature, not 404
  const passed = response.status === 400;
  results.tests.push({
    name: 'Webhook endpoint exists',
    passed,
    expected: 400,
    actual: response.status
  });
  
  if (passed) {
    console.log('✅ PASSED: Webhook endpoint exists and validates signature');
    results.passed++;
  } else {
    console.log(`❌ FAILED: Expected 400, got ${response.status}`);
    results.failed++;
  }
}

async function testHealthCheck() {
  console.log('\n🧪 Test: API health check');
  const response = await makeRequest('GET', '/health');
  
  const passed = response.status === 200;
  results.tests.push({
    name: 'Health check',
    passed,
    expected: 200,
    actual: response.status
  });
  
  if (passed) {
    console.log('✅ PASSED: API is healthy');
    results.passed++;
  } else {
    console.log(`❌ FAILED: Expected 200, got ${response.status}`);
    results.failed++;
  }
}

// Start server function
async function startServer() {
  return new Promise((resolve, reject) => {
    console.log('🚀 Starting API server...');
    
    serverProcess = spawn('npm', ['run', 'dev'], {
      cwd: __dirname,
      env: {
        ...process.env,
        NODE_ENV: 'test',
        PORT: '3001'
      }
    });
    
    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Server running on port')) {
        console.log('✅ Server started successfully\n');
        setTimeout(resolve, 2000); // Give it 2 seconds to fully initialize
      }
    });
    
    serverProcess.stderr.on('data', (data) => {
      console.error('Server error:', data.toString());
    });
    
    // Timeout after 30 seconds
    setTimeout(() => {
      reject(new Error('Server failed to start within 30 seconds'));
    }, 30000);
  });
}

// Main test runner
async function runTests() {
  console.log('🧪 Payment Integration Tests - Standalone Runner');
  console.log('==============================================\n');
  
  try {
    // Check if server is already running
    try {
      await makeRequest('GET', '/health');
      console.log('✅ Using existing server on port 3001\n');
    } catch {
      // Start server if not running
      await startServer();
    }
    
    // Run tests
    await testHealthCheck();
    await testBillingStatusWithoutAuth();
    await testCheckoutWithoutAuth();
    await testSetupIntentWithoutAuth();
    await testWebhookEndpoint();
    
    // Print summary
    console.log('\n📊 Test Summary');
    console.log('===============');
    console.log(`Total tests: ${results.passed + results.failed}`);
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    
    if (results.failed > 0) {
      console.log('\nFailed tests:');
      results.tests
        .filter(t => !t.passed)
        .forEach(t => {
          console.log(`- ${t.name}: expected ${t.expected}, got ${t.actual}`);
        });
    }
    
    // Exit with appropriate code
    process.exit(results.failed > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('❌ Test runner error:', error.message);
    process.exit(1);
  } finally {
    // Clean up server process if we started it
    if (serverProcess) {
      console.log('\nStopping server...');
      serverProcess.kill();
    }
  }
}

// Run tests
runTests();