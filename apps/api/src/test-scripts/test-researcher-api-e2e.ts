/**
 * E2E Test for RESEARCHER Agent via API
 * 
 * Tests two critical scenarios:
 * 1. Manual trigger simulating quarterly update
 * 2. Verifying Vector DB storage and retrieval
 * 
 * This test validates the complete data flow through the API endpoints
 */

import axios from 'axios';
import { config as loadEnv } from 'dotenv';
import { join } from 'path';
import { createSupabaseClient } from '../../utils/supabase';
import { createLogger } from '@codequal/core/utils';

// Load environment
loadEnv({ path: join(__dirname, '../../../../.env') });

const logger = createLogger('ResearcherAPIE2ETest');

// API base URL
const API_BASE_URL = process.env.API_URL || 'http://localhost:3001';
const API_KEY = process.env.TEST_API_KEY || 'test-api-key-123';

// Special repository UUID for storing researcher configurations
const RESEARCHER_CONFIG_REPO_ID = '00000000-0000-0000-0000-000000000001';

interface TestResult {
  scenario: string;
  success: boolean;
  duration: number;
  details: any;
  errors?: string[];
}

/**
 * Create authenticated API client
 */
function createApiClient() {
  return axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'x-api-key': API_KEY,
      'Content-Type': 'application/json'
    },
    timeout: 30000
  });
}

/**
 * Test Scenario 1: Manual Research Trigger
 */
async function testManualResearchTrigger(): Promise<TestResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  const apiClient = createApiClient();
  
  logger.info('🧪 Starting Test Scenario 1: Manual Research Trigger');
  
  try {
    // Step 1: Get initial status
    logger.info('📊 Getting initial researcher status');
    const statusResponse = await apiClient.get('/api/researcher/status');
    const initialStatus = statusResponse.data.data;
    logger.info('Initial status', {
      activeOperations: initialStatus.activeOperations,
      totalConfigurations: initialStatus.totalConfigurations
    });
    
    // Step 2: Trigger manual research
    logger.info('🚀 Triggering manual research operation');
    const triggerResponse = await apiClient.post('/api/researcher/trigger', {
      config: {
        researchDepth: 'comprehensive',
        prioritizeCost: true,
        maxCostPerMillion: 50,
        minPerformanceThreshold: 7
      }
    });
    
    if (!triggerResponse.data.success) {
      errors.push('Failed to trigger research operation');
      return {
        scenario: 'Manual Research Trigger',
        success: false,
        duration: Date.now() - startTime,
        details: { error: 'Trigger failed' },
        errors
      };
    }
    
    const { operationId, estimatedDuration } = triggerResponse.data.data;
    logger.info('Research triggered', { operationId, estimatedDuration });
    
    // Step 3: Poll for completion
    logger.info('⏳ Waiting for research to complete...');
    let operation;
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      
      const statusResponse = await apiClient.get(`/api/researcher/operations/${operationId}`);
      operation = statusResponse.data.data;
      
      logger.info(`Status check ${attempts + 1}/${maxAttempts}`, {
        status: operation.status,
        configurationsUpdated: operation.configurationsUpdated
      });
      
      if (operation.status === 'completed' || operation.status === 'failed') {
        break;
      }
      
      attempts++;
    }
    
    if (!operation || operation.status !== 'completed') {
      errors.push(`Operation did not complete. Status: ${operation?.status}, Error: ${operation?.error}`);
    } else {
      logger.info('✅ Research completed successfully', {
        configurationsUpdated: operation.configurationsUpdated,
        totalCostSavings: operation.totalCostSavings,
        performanceImprovements: operation.performanceImprovements
      });
    }
    
    // Step 4: Verify configuration overview updated
    logger.info('📋 Getting updated configuration overview');
    const overviewResponse = await apiClient.get('/api/researcher/configuration-overview');
    const overview = overviewResponse.data.data;
    
    if (overview.totalConfigurations === initialStatus.totalConfigurations && operation?.configurationsUpdated > 0) {
      errors.push('Configuration count did not increase after research');
    }
    
    // Step 5: Get recommendations
    logger.info('💡 Getting optimization recommendations');
    const recommendationsResponse = await apiClient.get('/api/researcher/recommendations');
    const recommendations = recommendationsResponse.data.data;
    
    return {
      scenario: 'Manual Research Trigger',
      success: errors.length === 0,
      duration: Date.now() - startTime,
      details: {
        operationId,
        operation,
        configurationsBeforeAfter: {
          before: initialStatus.totalConfigurations,
          after: overview.totalConfigurations
        },
        recommendations
      },
      errors: errors.length > 0 ? errors : undefined
    };
    
  } catch (error) {
    logger.error('❌ Test failed with error', error);
    return {
      scenario: 'Manual Research Trigger',
      success: false,
      duration: Date.now() - startTime,
      details: { 
        error: error instanceof Error ? error.message : String(error),
        response: (error as any).response?.data
      },
      errors: [error instanceof Error ? error.message : String(error)]
    };
  }
}

/**
 * Test Scenario 2: Vector DB Storage Verification
 */
async function testVectorDBStorage(): Promise<TestResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  
  logger.info('🧪 Starting Test Scenario 2: Vector DB Storage Verification');
  
  try {
    const supabase = createSupabaseClient();
    
    // Step 1: Verify researcher repository exists
    logger.info('🔍 Checking researcher repository in Vector DB');
    const { data: repo, error: repoError } = await supabase
      .from('repositories')
      .select('*')
      .eq('id', RESEARCHER_CONFIG_REPO_ID)
      .single();
    
    if (repoError && repoError.code !== 'PGRST116') { // Not found is ok
      errors.push(`Repository query error: ${repoError.message}`);
    }
    
    if (!repo) {
      logger.info('📝 Creating researcher repository');
      const { error: insertError } = await supabase
        .from('repositories')
        .insert({
          id: RESEARCHER_CONFIG_REPO_ID,
          name: 'CodeQual Researcher Configurations',
          url: 'internal://researcher-configs',
          default_branch: 'main',
          analysis_date: new Date().toISOString(),
          overall_score: 100,
          category_scores: { system: 100 }
        });
      
      if (insertError) {
        errors.push(`Failed to create repository: ${insertError.message}`);
      }
    }
    
    // Step 2: Query stored configurations
    logger.info('📊 Querying stored model configurations');
    const { data: chunks, error: chunksError } = await supabase
      .from('analysis_chunks')
      .select('*')
      .eq('repository_id', RESEARCHER_CONFIG_REPO_ID)
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (chunksError) {
      errors.push(`Chunks query error: ${chunksError.message}`);
    }
    
    const modelConfigs = chunks?.filter(chunk => 
      chunk.metadata?.content_type === 'model_configuration'
    ) || [];
    
    logger.info('Found model configurations', {
      totalChunks: chunks?.length || 0,
      modelConfigs: modelConfigs.length,
      latestConfig: modelConfigs[0]?.metadata
    });
    
    // Step 3: Analyze configuration distribution
    const configsByProvider: Record<string, number> = {};
    const configsByRole: Record<string, number> = {};
    
    modelConfigs.forEach(config => {
      const metadata = config.metadata;
      if (metadata?.findings?.[0]?.description) {
        try {
          const configData = JSON.parse(metadata.findings[0].description);
          
          // Count by provider
          if (configData.provider) {
            configsByProvider[configData.provider] = (configsByProvider[configData.provider] || 0) + 1;
          }
          
          // Count by role
          const type = metadata.findings[0].type;
          if (type) {
            const role = type.split('/')[2]; // language/size/role
            if (role) {
              configsByRole[role] = (configsByRole[role] || 0) + 1;
            }
          }
        } catch (e) {
          // Skip invalid configs
        }
      }
    });
    
    logger.info('Configuration distribution', {
      byProvider: configsByProvider,
      byRole: configsByRole
    });
    
    // Validate we have reasonable coverage
    if (Object.keys(configsByProvider).length < 2) {
      errors.push('Insufficient provider diversity in configurations');
    }
    
    if (Object.keys(configsByRole).length < 3) {
      errors.push('Insufficient role coverage in configurations');
    }
    
    return {
      scenario: 'Vector DB Storage Verification',
      success: errors.length === 0,
      duration: Date.now() - startTime,
      details: {
        repositoryExists: !!repo,
        totalConfigurations: modelConfigs.length,
        configurationDistribution: {
          byProvider: configsByProvider,
          byRole: configsByRole
        },
        sampleConfig: modelConfigs[0]
      },
      errors: errors.length > 0 ? errors : undefined
    };
    
  } catch (error) {
    logger.error('❌ Test failed with error', error);
    return {
      scenario: 'Vector DB Storage Verification',
      success: false,
      duration: Date.now() - startTime,
      details: { error: error instanceof Error ? error.message : String(error) },
      errors: [error instanceof Error ? error.message : String(error)]
    };
  }
}

/**
 * Test Scenario 3: Research History Verification
 */
async function testResearchHistory(): Promise<TestResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  const apiClient = createApiClient();
  
  logger.info('🧪 Starting Test Scenario 3: Research History Verification');
  
  try {
    // Get operation history
    logger.info('📜 Getting research operation history');
    const historyResponse = await apiClient.get('/api/researcher/history?limit=10');
    const history = historyResponse.data.data.history;
    
    logger.info('Research history', {
      totalOperations: history.length,
      completed: history.filter((op: any) => op.status === 'completed').length,
      failed: history.filter((op: any) => op.status === 'failed').length
    });
    
    // Analyze history
    const recentSuccesses = history.filter((op: any) => 
      op.status === 'completed' && op.configurationsUpdated > 0
    );
    
    if (recentSuccesses.length === 0) {
      errors.push('No successful research operations found in history');
    }
    
    // Check for patterns
    const avgConfigsUpdated = recentSuccesses.reduce((sum: number, op: any) => 
      sum + op.configurationsUpdated, 0
    ) / (recentSuccesses.length || 1);
    
    const avgCostSavings = recentSuccesses.reduce((sum: number, op: any) => 
      sum + op.totalCostSavings, 0
    ) / (recentSuccesses.length || 1);
    
    return {
      scenario: 'Research History Verification',
      success: errors.length === 0,
      duration: Date.now() - startTime,
      details: {
        totalOperations: history.length,
        successfulOperations: recentSuccesses.length,
        averageConfigurationsUpdated: avgConfigsUpdated,
        averageCostSavings: avgCostSavings,
        latestOperation: history[0]
      },
      errors: errors.length > 0 ? errors : undefined
    };
    
  } catch (error) {
    logger.error('❌ Test failed with error', error);
    return {
      scenario: 'Research History Verification',
      success: false,
      duration: Date.now() - startTime,
      details: { error: error instanceof Error ? error.message : String(error) },
      errors: [error instanceof Error ? error.message : String(error)]
    };
  }
}

/**
 * Main test runner
 */
async function runE2ETests() {
  console.log('\n' + '='.repeat(80));
  console.log('🚀 RESEARCHER AGENT API E2E TESTS');
  console.log('='.repeat(80) + '\n');
  console.log(`API URL: ${API_BASE_URL}`);
  console.log(`API Key: ${API_KEY.substring(0, 10)}...`);
  console.log('\n');
  
  const results: TestResult[] = [];
  
  // Check if API is running
  try {
    const apiClient = createApiClient();
    await apiClient.get('/api/health');
    logger.info('✅ API is running');
  } catch (error) {
    console.error('❌ API is not running. Please start the API server first.');
    console.error('Run: npm run dev');
    process.exit(1);
  }
  
  // Run Test Scenario 1: Manual Research Trigger
  logger.info('\n📝 Running Scenario 1: Manual Research Trigger');
  const scenario1 = await testManualResearchTrigger();
  results.push(scenario1);
  
  // Wait between tests
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Run Test Scenario 2: Vector DB Storage Verification
  logger.info('\n📝 Running Scenario 2: Vector DB Storage Verification');
  const scenario2 = await testVectorDBStorage();
  results.push(scenario2);
  
  // Run Test Scenario 3: Research History Verification
  logger.info('\n📝 Running Scenario 3: Research History Verification');
  const scenario3 = await testResearchHistory();
  results.push(scenario3);
  
  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(80) + '\n');
  
  let totalPassed = 0;
  results.forEach(result => {
    const status = result.success ? '✅ PASSED' : '❌ FAILED';
    console.log(`\n${status} - ${result.scenario}`);
    console.log(`Duration: ${result.duration}ms`);
    
    if (result.errors && result.errors.length > 0) {
      console.log('Errors:');
      result.errors.forEach(err => console.log(`  - ${err}`));
    }
    
    console.log('Details:', JSON.stringify(result.details, null, 2));
    
    if (result.success) totalPassed++;
  });
  
  console.log('\n' + '='.repeat(80));
  console.log(`OVERALL: ${totalPassed}/${results.length} tests passed`);
  console.log('='.repeat(80) + '\n');
  
  // Exit with proper code
  process.exit(totalPassed === results.length ? 0 : 1);
}

// Run tests
runE2ETests().catch(error => {
  console.error('❌ Fatal error running tests:', error);
  process.exit(1);
});