/**
 * Simple E2E Test for RESEARCHER Agent API
 * Tests the complete flow without complex dependencies
 */

import axios from 'axios';

const API_URL = 'http://localhost:3001';

// Test user credentials
const TEST_USER = {
  email: 'test@example.com',
  password: 'TestPassword123!@#'
};

interface TestResult {
  scenario: string;
  passed: boolean;
  details: any;
  error?: string;
}

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  timeout: 30000
});

async function getAuthToken(): Promise<string> {
  try {
    // Try to sign in first
    const signInResponse = await api.post('/auth/signin', TEST_USER);
    return signInResponse.data.session.access_token;
  } catch (error) {
    // If sign in fails, create account
    console.log('Creating test account...');
    const signUpResponse = await api.post('/auth/signup', TEST_USER);
    return signUpResponse.data.session.access_token;
  }
}

async function testResearcherAPI(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  
  try {
    // Get auth token
    console.log('\n🔐 Getting authentication token...');
    const token = await getAuthToken();
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    // Test 1: Get researcher status
    console.log('\n📊 Test 1: Getting researcher status...');
    try {
      const statusResponse = await api.get('/api/researcher/status');
      console.log('Status:', statusResponse.data);
      results.push({
        scenario: 'Get Researcher Status',
        passed: statusResponse.data.success && statusResponse.data.data.status === 'operational',
        details: statusResponse.data.data
      });
    } catch (error: any) {
      results.push({
        scenario: 'Get Researcher Status',
        passed: false,
        details: {},
        error: error.message
      });
    }
    
    // Test 2: Trigger manual research
    console.log('\n🚀 Test 2: Triggering manual research...');
    let operationId: string | null = null;
    try {
      const triggerResponse = await api.post('/api/researcher/trigger', {
        config: {
          researchDepth: 'quick',
          prioritizeCost: true,
          maxCostPerMillion: 50,
          minPerformanceThreshold: 7
        }
      });
      
      operationId = triggerResponse.data.data.operationId;
      console.log('Research triggered:', triggerResponse.data.data);
      
      results.push({
        scenario: 'Trigger Manual Research',
        passed: triggerResponse.data.success && !!operationId,
        details: triggerResponse.data.data
      });
    } catch (error: any) {
      results.push({
        scenario: 'Trigger Manual Research',
        passed: false,
        details: {},
        error: error.message
      });
    }
    
    // Test 3: Check operation status
    if (operationId) {
      console.log('\n⏳ Test 3: Checking operation status...');
      
      // Wait for operation to complete
      let attempts = 0;
      let operation = null;
      
      while (attempts < 10) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        try {
          const statusResponse = await api.get(`/api/researcher/operations/${operationId}`);
          operation = statusResponse.data.data;
          console.log(`Attempt ${attempts + 1}: Status = ${operation.status}`);
          
          if (operation.status === 'completed' || operation.status === 'failed') {
            break;
          }
        } catch (error) {
          console.error('Error checking status:', error);
        }
        
        attempts++;
      }
      
      results.push({
        scenario: 'Check Operation Status',
        passed: operation && operation.status === 'completed',
        details: operation
      });
    }
    
    // Test 4: Get configuration overview
    console.log('\n📋 Test 4: Getting configuration overview...');
    try {
      const overviewResponse = await api.get('/api/researcher/configuration-overview');
      console.log('Configuration overview:', overviewResponse.data.data);
      
      results.push({
        scenario: 'Get Configuration Overview',
        passed: overviewResponse.data.success && overviewResponse.data.data.totalConfigurations > 0,
        details: overviewResponse.data.data
      });
    } catch (error: any) {
      results.push({
        scenario: 'Get Configuration Overview',
        passed: false,
        details: {},
        error: error.message
      });
    }
    
    // Test 5: Get recommendations
    console.log('\n💡 Test 5: Getting optimization recommendations...');
    try {
      const recommendationsResponse = await api.get('/api/researcher/recommendations');
      console.log('Recommendations:', recommendationsResponse.data.data);
      
      results.push({
        scenario: 'Get Optimization Recommendations',
        passed: recommendationsResponse.data.success && !!recommendationsResponse.data.data,
        details: recommendationsResponse.data.data
      });
    } catch (error: any) {
      results.push({
        scenario: 'Get Optimization Recommendations',
        passed: false,
        details: {},
        error: error.message
      });
    }
    
    // Test 6: Get operation history
    console.log('\n📜 Test 6: Getting operation history...');
    try {
      const historyResponse = await api.get('/api/researcher/history?limit=5');
      console.log('Operation history:', historyResponse.data.data);
      
      results.push({
        scenario: 'Get Operation History',
        passed: historyResponse.data.success && Array.isArray(historyResponse.data.data.history),
        details: historyResponse.data.data
      });
    } catch (error: any) {
      results.push({
        scenario: 'Get Operation History',
        passed: false,
        details: {},
        error: error.message
      });
    }
    
  } catch (error) {
    console.error('Fatal error:', error);
  }
  
  return results;
}

// Main execution
async function main() {
  console.log('================================================================================');
  console.log('🧪 RESEARCHER AGENT API E2E TEST');
  console.log('================================================================================');
  console.log(`API URL: ${API_URL}`);
  console.log(`Time: ${new Date().toISOString()}`);
  
  // Check if API is running
  try {
    const healthResponse = await api.get('/health');
    console.log('✅ API is healthy:', healthResponse.data);
  } catch (error) {
    console.error('❌ API is not running! Please start the API server first.');
    console.error('Run: npm run dev');
    process.exit(1);
  }
  
  // Run tests
  const results = await testResearcherAPI();
  
  // Print summary
  console.log('\n================================================================================');
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('================================================================================\n');
  
  let totalPassed = 0;
  results.forEach(result => {
    const status = result.passed ? '✅ PASSED' : '❌ FAILED';
    console.log(`${status} - ${result.scenario}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    if (result.passed) totalPassed++;
  });
  
  console.log('\n--------------------------------------------------------------------------------');
  console.log(`OVERALL: ${totalPassed}/${results.length} tests passed`);
  console.log('================================================================================\n');
  
  process.exit(totalPassed === results.length ? 0 : 1);
}

// Run the test
main().catch(console.error);