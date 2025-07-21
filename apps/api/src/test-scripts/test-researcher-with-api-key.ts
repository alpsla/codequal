/**
 * E2E Test for RESEARCHER Agent using API Key authentication
 * 
 * This test validates:
 * 1. Quarterly scheduled research simulation
 * 2. Model configuration storage and retrieval
 * 3. Complete data flow through the Researcher API
 */

import axios from 'axios';

const API_URL = 'http://localhost:3001';

// You can set a test API key in the environment or use a hardcoded test key
const API_KEY = process.env.TEST_API_KEY || 'sk_test_1234567890';

interface TestResult {
  scenario: string;
  passed: boolean;
  details: any;
  error?: string;
}

// Create axios instance with API key
const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'x-api-key': API_KEY
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
    
    // Check if Rust configuration was added
    const rustConfigs = overviewAfter.data.data.configurationsByProvider;
    console.log('  Provider distribution:', rustConfigs);
    
    return {
      scenario: 'Orchestrator Missing Config Flow',
      passed: operation?.status === 'completed',
      details: {
        configsBefore,
        configsAfter,
        newConfigsAdded: configsAfter - configsBefore,
        operation: operation,
        providerDistribution: rustConfigs
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
 * Main test runner
 */
async function main() {
  console.log('================================================================================');
  console.log('🚀 RESEARCHER AGENT E2E TEST');
  console.log('================================================================================');
  console.log(`API URL: ${API_URL}`);
  console.log(`API Key: ${API_KEY.substring(0, 15)}...`);
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
  } else {
    console.log('⚠️  Some tests failed. Please check the details above.');
  }
  
  process.exit(totalPassed === results.length ? 0 : 1);
}

// Run the test
main().catch(console.error);