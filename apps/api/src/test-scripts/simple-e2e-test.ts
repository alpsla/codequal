#!/usr/bin/env ts-node

/**
 * Simple E2E Data Flow Test
 * A focused test to validate the core data flow without complex dependencies
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import axios from 'axios';

// Load environment variables
config({ path: resolve(__dirname, '../../.env') });

const API_URL = process.env.API_URL || 'http://localhost:3001';

// Test configuration
const TEST_PR = {
  repositoryUrl: 'https://github.com/expressjs/express',
  prNumber: 5500,
  analysisMode: 'quick'
};

// Color helpers
const green = (text: string) => `\x1b[32m${text}\x1b[0m`;
const red = (text: string) => `\x1b[31m${text}\x1b[0m`;
const yellow = (text: string) => `\x1b[33m${text}\x1b[0m`;
const blue = (text: string) => `\x1b[34m${text}\x1b[0m`;

/**
 * Test API health endpoint
 */
async function testApiHealth() {
  console.log('\n📡 Testing API Health...');
  
  try {
    // Try without auth first (some health endpoints are public)
    let response;
    try {
      response = await axios.get(`${API_URL}/health`);
    } catch (error: any) {
      if (error.response?.status === 401) {
        // Try with a test token
        console.log('   🔐 API requires authentication, using test token...');
        response = await axios.get(`${API_URL}/health`, {
          headers: {
            'X-API-Key': 'test_key'
          }
        });
      } else {
        throw error;
      }
    }
    
    if (response.data.status === 'ok' || response.status === 200) {
      console.log(green('   ✅ API is healthy'));
      if (response.data.version) {
        console.log(`   Version: ${response.data.version}`);
      }
      if (response.data.uptime) {
        console.log(`   Uptime: ${response.data.uptime}`);
      }
      return true;
    } else {
      console.log(red('   ❌ API health check failed'));
      return false;
    }
  } catch (error: any) {
    console.log(red('   ❌ Cannot connect to API'));
    console.log(`   Error: ${error.message}`);
    console.log(`   Please ensure the API is running at ${API_URL}`);
    return false;
  }
}

/**
 * Test PR analysis flow
 */
async function testPRAnalysis() {
  console.log('\n🔄 Testing PR Analysis Flow...');
  console.log(`   Repository: ${TEST_PR.repositoryUrl}`);
  console.log(`   PR Number: ${TEST_PR.prNumber}`);
  console.log(`   Mode: ${TEST_PR.analysisMode}\n`);
  
  try {
    const startTime = Date.now();
    
    // Trigger analysis
    console.log('   📤 Sending analysis request...');
    const response = await axios.post(`${API_URL}/v1/analyze-pr`, TEST_PR, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'test_key'
      }
    });
    
    const analysisId = response.data.analysisId;
    console.log(`   📋 Analysis ID: ${analysisId}`);
    
    // Poll for results
    console.log('\n   ⏳ Waiting for analysis to complete...');
    let attempts = 0;
    const maxAttempts = 10; // 20 seconds max for quick test
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
      
      try {
        const statusResponse = await axios.get(`${API_URL}/v1/analysis/${analysisId}`, {
          headers: {
            'X-API-Key': 'test_key'
          }
        });
        const { status, progress } = statusResponse.data;
        
        process.stdout.write(`\r   Status: ${status} | Progress: ${progress}% (${attempts + 1}/${maxAttempts})`);
        
        if (status === 'completed') {
          const duration = ((Date.now() - startTime) / 1000).toFixed(2);
          console.log(`\n   ${green('✅ Analysis completed')} in ${duration}s`);
          
          // Display results summary
          const { findings } = statusResponse.data.result;
          console.log('\n   📊 Results Summary:');
          
          for (const [category, issues] of Object.entries(findings as Record<string, any[]>)) {
            console.log(`      ${category}: ${issues.length} findings`);
          }
          
          return true;
        } else if (status === 'failed') {
          console.log(`\n   ${red('❌ Analysis failed')}`);
          console.log(`   Error: ${statusResponse.data.error}`);
          return false;
        }
      } catch (error) {
        // API might not have the result yet
      }
      
      attempts++;
    }
    
    console.log(`\n   ${yellow('⚠️ Analysis timed out')}`);
    return false;
    
  } catch (error: any) {
    console.log(`\n   ${red('❌ PR analysis failed')}`);
    console.log(`   Error: ${error.message}`);
    
    if (error.response?.data) {
      console.log(`   Details: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    
    return false;
  }
}

/**
 * Test data flow components
 */
async function testDataFlow() {
  console.log('\n🔍 Testing Data Flow Components...\n');
  
  const components = [
    { name: 'Database Connection', endpoint: '/api/health/db', expected: 'connected' },
    { name: 'Vector DB', endpoint: '/api/health/vector', expected: 'healthy' },
    { name: 'OpenRouter API', endpoint: '/api/health/openrouter', expected: 'available' },
    { name: 'Background Jobs', endpoint: '/api/health/jobs', expected: 'running' }
  ];
  
  let allHealthy = true;
  
  for (const component of components) {
    try {
      const response = await axios.get(`${API_URL}${component.endpoint}`);
      const status = response.data.status;
      
      if (status === component.expected) {
        console.log(`   ${green('✅')} ${component.name}: ${status}`);
      } else {
        console.log(`   ${yellow('⚠️')} ${component.name}: ${status} (expected: ${component.expected})`);
        allHealthy = false;
      }
    } catch (error) {
      console.log(`   ${red('❌')} ${component.name}: unavailable`);
      allHealthy = false;
    }
  }
  
  return allHealthy;
}

/**
 * Generate test report
 */
function generateReport(results: Record<string, boolean>) {
  console.log('\n' + '='.repeat(60));
  console.log('\n📋 E2E Test Report\n');
  
  const passed = Object.values(results).filter(r => r).length;
  const total = Object.values(results).length;
  const success = passed === total;
  
  console.log(`Overall Status: ${success ? green('PASS') : red('FAIL')} (${passed}/${total})\n`);
  
  for (const [test, result] of Object.entries(results)) {
    console.log(`  ${test}: ${result ? green('✅ PASS') : red('❌ FAIL')}`);
  }
  
  if (!success) {
    console.log('\n💡 Troubleshooting:');
    console.log('1. Ensure the API server is running: npm run dev');
    console.log('2. Check environment variables are set correctly');
    console.log('3. Verify database connections are configured');
    console.log('4. Check API logs for detailed error messages');
  }
  
  console.log('\n' + '='.repeat(60));
  
  return success;
}

/**
 * Main test runner
 */
async function runSimpleE2ETest() {
  console.log(blue('\n🚀 Starting Simple E2E Data Flow Test\n'));
  console.log('This test validates the core data flow through the system');
  console.log('Testing against:', API_URL);
  
  const results: Record<string, boolean> = {};
  
  // Run tests
  results['API Health'] = await testApiHealth();
  
  if (results['API Health']) {
    results['Data Flow Components'] = await testDataFlow();
    results['PR Analysis'] = await testPRAnalysis();
  } else {
    console.log(yellow('\n⚠️ Skipping remaining tests - API is not available'));
  }
  
  // Generate report
  const success = generateReport(results);
  
  // Exit with appropriate code
  process.exit(success ? 0 : 1);
}

// Run the test
runSimpleE2ETest().catch(error => {
  console.error(red('\n❌ Test runner failed:'), error);
  process.exit(1);
});