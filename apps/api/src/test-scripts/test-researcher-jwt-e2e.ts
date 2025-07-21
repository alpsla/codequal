/**
 * E2E Test for RESEARCHER Agent using JWT authentication
 * 
 * This test validates:
 * 1. Quarterly scheduled research simulation
 * 2. Model configuration storage and retrieval
 * 3. Complete data flow through the Researcher API
 * 4. Vector DB integration
 */

import axios from 'axios';

const API_URL = 'http://localhost:3001';

// Valid JWT token from user authentication
const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsImtpZCI6InVMS2F5R1RkcUVOTWJ1RUQiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2Z0amhtYmJjdXFqcW1tYmF5bXFiLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiIzYzFmMTQzOC1mNWJkLTQxZDItYTllZi1iZjQyNjhiNzdmZjciLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzUzMDI2ODE5LCJpYXQiOjE3NTMwMjMyMTksImVtYWlsIjoidGVzdDFAZ3JyLmxhIiwicGhvbmUiOiIiLCJhcHBfbWV0YWRhdGEiOnsicHJvdmlkZXIiOiJlbWFpbCIsInByb3ZpZGVycyI6WyJlbWFpbCJdfSwidXNlcl9tZXRhZGF0YSI6eyJlbWFpbCI6InRlc3QxQGdyci5sYSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJwaG9uZV92ZXJpZmllZCI6ZmFsc2UsInN1YiI6IjNjMWYxNDM4LWY1YmQtNDFkMi1hOWVmLWJmNDI2OGI3N2ZmNyJ9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6Im90cCIsInRpbWVzdGFtcCI6MTc1MzAyMzIxOX1dLCJzZXNzaW9uX2lkIjoiOTBlZTAwNzEtOWRhZC00ZGVjLTg0MTAtNDIxZTY2OGY3NGZiIiwiaXNfYW5vbnltb3VzIjpmYWxzZX0.dpp5JsN0VNlrGgA5W6u6h4aofdVcU3TxP3j9LLLnOwc';

interface TestResult {
  scenario: string;
  passed: boolean;
  details: any;
  error?: string;
}

// Create axios instance with JWT authentication
const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Authorization': `Bearer ${JWT_TOKEN}`
  }
});

/**
 * Test Scenario 1: Simulate Quarterly Research Trigger
 */
async function testQuarterlyResearch(): Promise<TestResult> {
  console.log('\n🔄 Test Scenario 1: Quarterly Research Trigger');
  
  try {
    // Trigger a comprehensive research operation (simulating quarterly update)
    console.log('Triggering comprehensive research...');
    const triggerResponse = await api.post('/api/researcher/trigger', {
      config: {
        researchDepth: 'comprehensive',
        prioritizeCost: true,
        maxCostPerMillion: 50,
        minPerformanceThreshold: 7
      }
    });
    
    const { operationId, estimatedDuration } = triggerResponse.data.data;
    console.log(`Research triggered: ${operationId} (Est: ${estimatedDuration})`);
    
    // Poll for completion
    console.log('Waiting for research to complete...');
    let operation = null;
    let attempts = 0;
    const maxAttempts = 15; // 15 seconds max
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const statusResponse = await api.get(`/api/researcher/operations/${operationId}`);
      operation = statusResponse.data.data;
      
      console.log(`  Status: ${operation.status} (${attempts + 1}/${maxAttempts})`);
      
      if (operation.status === 'completed' || operation.status === 'failed') {
        break;
      }
      
      attempts++;
    }
    
    if (!operation || operation.status !== 'completed') {
      return {
        scenario: 'Quarterly Research Trigger',
        passed: false,
        details: operation,
        error: `Research did not complete. Status: ${operation?.status}`
      };
    }
    
    // Verify results
    console.log('Research completed successfully!');
    console.log(`  Configurations updated: ${operation.configurationsUpdated}`);
    console.log(`  Cost savings: ${operation.totalCostSavings}%`);
    console.log(`  Performance improvements: ${operation.performanceImprovements}`);
    
    return {
      scenario: 'Quarterly Research Trigger',
      passed: operation.configurationsUpdated > 0,
      details: {
        operationId,
        duration: operation.completedAt ? 
          new Date(operation.completedAt).getTime() - new Date(operation.startedAt).getTime() : 0,
        configurationsUpdated: operation.configurationsUpdated,
        totalCostSavings: operation.totalCostSavings,
        performanceImprovements: operation.performanceImprovements
      }
    };
    
  } catch (error: any) {
    return {
      scenario: 'Quarterly Research Trigger',
      passed: false,
      details: {},
      error: error.response?.data?.error || error.message
    };
  }
}

/**
 * Test Scenario 2: Orchestrator Missing Config Flow
 */
async function testMissingConfigFlow(): Promise<TestResult> {
  console.log('\n🎯 Test Scenario 2: Orchestrator Missing Config Flow');
  
  try {
    // Get current configuration overview
    console.log('Getting current configuration state...');
    const overviewBefore = await api.get('/api/researcher/configuration-overview');
    const configsBefore = overviewBefore.data.data.totalConfigurations;
    console.log(`  Current configurations: ${configsBefore}`);
    
    // Simulate triggering research for a specific missing context
    console.log('Simulating research for missing Rust/Large/Security config...');
    const triggerResponse = await api.post('/api/researcher/trigger', {
      config: {
        researchDepth: 'quick',
        targetContext: {
          language: 'rust',
          sizeCategory: 'large',
          agentRole: 'security'
        }
      }
    });
    
    const { operationId } = triggerResponse.data.data;
    console.log(`  Research triggered: ${operationId}`);
    
    // Wait for completion
    let attempts = 0;
    let operation = null;
    
    while (attempts < 10) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const statusResponse = await api.get(`/api/researcher/operations/${operationId}`);
      operation = statusResponse.data.data;
      
      if (operation.status === 'completed' || operation.status === 'failed') {
        break;
      }
      
      attempts++;
    }
    
    // Get updated configuration overview
    const overviewAfter = await api.get('/api/researcher/configuration-overview');
    const configsAfter = overviewAfter.data.data.totalConfigurations;
    console.log(`  Configurations after research: ${configsAfter}`);
    
    // Check provider distribution
    const providerDist = overviewAfter.data.data.configurationsByProvider;
    console.log('  Provider distribution:', providerDist);
    
    return {
      scenario: 'Orchestrator Missing Config Flow',
      passed: operation?.status === 'completed',
      details: {
        configsBefore,
        configsAfter,
        newConfigsAdded: configsAfter - configsBefore,
        operation: operation,
        providerDistribution: providerDist
      }
    };
    
  } catch (error: any) {
    return {
      scenario: 'Orchestrator Missing Config Flow',
      passed: false,
      details: {},
      error: error.response?.data?.error || error.message
    };
  }
}

/**
 * Test Scenario 3: Vector DB Data Validation
 */
async function testVectorDBIntegration(): Promise<TestResult> {
  console.log('\n💾 Test Scenario 3: Vector DB Integration');
  
  try {
    // Get researcher status to verify Vector DB connection
    console.log('Checking researcher system status...');
    const statusResponse = await api.get('/api/researcher/status');
    const status = statusResponse.data.data;
    
    console.log('  System health:', status.systemHealth);
    console.log('  Total configurations:', status.totalConfigurations);
    console.log('  Last updated:', status.lastUpdated);
    
    // Get optimization recommendations (should query Vector DB)
    console.log('\nGetting optimization recommendations from Vector DB...');
    const recommendationsResponse = await api.get('/api/researcher/recommendations');
    const recommendations = recommendationsResponse.data.data;
    
    console.log(`  Cost optimizations: ${recommendations.costOptimizations.length}`);
    console.log(`  Performance optimizations: ${recommendations.performanceOptimizations.length}`);
    console.log(`  Outdated configurations: ${recommendations.outdatedConfigurations.length}`);
    
    // Sample recommendation details
    if (recommendations.costOptimizations.length > 0) {
      console.log('\n  Sample cost optimization:');
      const sample = recommendations.costOptimizations[0];
      console.log(`    Context: ${sample.context}`);
      console.log(`    Current cost: $${sample.currentCost}/million`);
      console.log(`    Recommended cost: $${sample.recommendedCost}/million`);
      console.log(`    Savings: ${sample.savings}%`);
    }
    
    // Verify data quality
    const hasValidData = 
      status.systemHealth.vectorDatabase === 'connected' &&
      status.totalConfigurations > 0 &&
      (recommendations.costOptimizations.length > 0 ||
       recommendations.performanceOptimizations.length > 0);
    
    return {
      scenario: 'Vector DB Integration',
      passed: hasValidData,
      details: {
        systemHealth: status.systemHealth,
        totalConfigurations: status.totalConfigurations,
        recommendations: {
          costOptimizations: recommendations.costOptimizations.length,
          performanceOptimizations: recommendations.performanceOptimizations.length,
          outdatedConfigurations: recommendations.outdatedConfigurations.length
        },
        sampleRecommendation: recommendations.costOptimizations[0]
      }
    };
    
  } catch (error: any) {
    return {
      scenario: 'Vector DB Integration',
      passed: false,
      details: {},
      error: error.response?.data?.error || error.message
    };
  }
}

/**
 * Test Scenario 4: Operation History
 */
async function testOperationHistory(): Promise<TestResult> {
  console.log('\n📜 Test Scenario 4: Operation History');
  
  try {
    // Get operation history
    console.log('Getting research operation history...');
    const historyResponse = await api.get('/api/researcher/history?limit=5');
    const { history, count } = historyResponse.data.data;
    
    console.log(`  Found ${count} operations in history`);
    
    if (history.length > 0) {
      console.log('\n  Recent operations:');
      history.forEach((op: any, index: number) => {
        console.log(`    ${index + 1}. ${op.operationId}`);
        console.log(`       Status: ${op.status}`);
        console.log(`       Started: ${new Date(op.startedAt).toLocaleString()}`);
        console.log(`       Configs updated: ${op.configurationsUpdated}`);
      });
    }
    
    return {
      scenario: 'Operation History',
      passed: true,
      details: {
        operationCount: count,
        recentOperations: history.length,
        latestOperation: history[0]
      }
    };
    
  } catch (error: any) {
    return {
      scenario: 'Operation History',
      passed: false,
      details: {},
      error: error.response?.data?.error || error.message
    };
  }
}

/**
 * Main test runner
 */
async function main() {
  console.log('================================================================================');
  console.log('🚀 RESEARCHER AGENT E2E TEST (JWT Authentication)');
  console.log('================================================================================');
  console.log(`API URL: ${API_URL}`);
  console.log(`JWT Token: ${JWT_TOKEN.substring(0, 50)}...`);
  console.log(`Time: ${new Date().toISOString()}`);
  
  // Check if API is running
  try {
    const healthResponse = await axios.get(`${API_URL}/health`);
    console.log('✅ API is healthy:', healthResponse.data);
  } catch (error) {
    console.error('❌ API is not running! Please start the API server first.');
    console.error('Run: npm run dev');
    process.exit(1);
  }
  
  const results: TestResult[] = [];
  
  // Run Test Scenario 1: Quarterly Research
  const scenario1 = await testQuarterlyResearch();
  results.push(scenario1);
  
  // Run Test Scenario 2: Missing Config Flow
  const scenario2 = await testMissingConfigFlow();
  results.push(scenario2);
  
  // Run Test Scenario 3: Vector DB Integration
  const scenario3 = await testVectorDBIntegration();
  results.push(scenario3);
  
  // Run Test Scenario 4: Operation History
  const scenario4 = await testOperationHistory();
  results.push(scenario4);
  
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
    console.log('   Details:', JSON.stringify(result.details, null, 2));
    if (result.passed) totalPassed++;
  });
  
  console.log('\n--------------------------------------------------------------------------------');
  console.log(`OVERALL: ${totalPassed}/${results.length} tests passed`);
  console.log('================================================================================\n');
  
  // Additional insights
  if (totalPassed === results.length) {
    console.log('🎉 All tests passed! The Researcher agent is working correctly.');
    console.log('\nKey validations:');
    console.log('✓ Quarterly research can be triggered and completes successfully');
    console.log('✓ Model configurations are being updated');
    console.log('✓ Vector DB integration is functioning');
    console.log('✓ Orchestrator can request missing configurations');
    console.log('✓ Research history is tracked properly');
  } else {
    console.log('⚠️  Some tests failed. Please check the details above.');
  }
  
  process.exit(totalPassed === results.length ? 0 : 1);
}

// Run the test
main().catch(console.error);