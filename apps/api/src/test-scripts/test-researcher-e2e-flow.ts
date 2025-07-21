/**
 * E2E Test for RESEARCHER Agent
 * 
 * Tests two critical scenarios:
 * 1. Scheduled quarterly update - simulates scheduled time trigger
 * 2. Orchestrator-triggered research - when model config not found
 * 
 * Validates complete data flow from trigger to Vector DB storage
 */

import { config as loadEnv } from 'dotenv';
import { join } from 'path';
import { createSupabaseClient } from '../../utils/supabase';
import { createLogger } from '@codequal/core/utils';
import { AgentRole } from '@codequal/core/config/agent-registry';
import { RepositoryContext } from '@codequal/core/services/model-selection/ModelVersionSync';

// Load environment
loadEnv({ path: join(__dirname, '../../../../.env') });

const logger = createLogger('ResearcherE2ETest');

// Special repository UUID for storing researcher configurations
const RESEARCHER_CONFIG_REPO_ID = '00000000-0000-0000-0000-000000000001';

// Test user for authentication
const TEST_USER = {
  id: 'test-user-e2e-researcher',
  email: 'e2e-test@codequal.com',
  role: 'test' as const
};

interface TestResults {
  scenario: string;
  success: boolean;
  duration: number;
  details: any;
  errors?: string[];
}

/**
 * Test Scenario 1: Quarterly Scheduled Update
 * Simulates the quarterly cron job triggering
 */
async function testScheduledQuarterlyUpdate(): Promise<TestResults> {
  const startTime = Date.now();
  const errors: string[] = [];
  
  logger.info('🧪 Starting Test Scenario 1: Quarterly Scheduled Update');
  
  try {
    // Initialize services
    const supabase = createSupabaseClient();
    const vectorService = new VectorContextService(TEST_USER, supabase);
    const researcherService = new ResearcherService(TEST_USER, vectorService);
    const scheduler = new ResearchScheduler(TEST_USER, {
      conductResearchAndUpdate: async (config) => {
        return researcherService.triggerResearch(config);
      },
      conductMetaResearch: async () => {
        // Simulate meta-research
        return {
          currentModel: 'gpt-4o',
          recommendation: 'claude-3.5-sonnet',
          upgradeRecommendation: {
            shouldUpgrade: true,
            urgency: 'medium',
            expectedImprovement: '15% performance increase'
          },
          metadata: { confidence: 0.85 }
        };
      },
      useResearcherForContext: async () => {
        return { prompt: 'test', tokensUsed: 100, templateReused: false };
      }
    } as any);
    
    // Override cron to trigger immediately for testing
    logger.info('📅 Simulating quarterly schedule trigger');
    const jobId = await scheduler.triggerManualResearch('context', 'E2E Test - Quarterly Update');
    
    // Wait for job to complete
    let job = scheduler.getJobStatus(jobId);
    let attempts = 0;
    while (job?.status === 'running' && attempts < 30) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      job = scheduler.getJobStatus(jobId);
      attempts++;
    }
    
    if (!job || job.status !== 'completed') {
      errors.push(`Job did not complete successfully. Status: ${job?.status}, Error: ${job?.error}`);
      return {
        scenario: 'Quarterly Scheduled Update',
        success: false,
        duration: Date.now() - startTime,
        details: { job },
        errors
      };
    }
    
    // Verify data was stored in Vector DB
    logger.info('🔍 Verifying Vector DB storage');
    const storedConfigs = await vectorService.searchSimilarContent(
      RESEARCHER_CONFIG_REPO_ID,
      'model_configuration',
      10
    );
    
    if (!storedConfigs || storedConfigs.length === 0) {
      errors.push('No configurations found in Vector DB after quarterly update');
    }
    
    // Verify job statistics
    const stats = scheduler.getStats();
    logger.info('📊 Scheduler Statistics', stats);
    
    return {
      scenario: 'Quarterly Scheduled Update',
      success: errors.length === 0,
      duration: Date.now() - startTime,
      details: {
        jobId,
        jobResult: job.result,
        configurationsFound: storedConfigs?.length || 0,
        schedulerStats: stats
      },
      errors: errors.length > 0 ? errors : undefined
    };
    
  } catch (error) {
    logger.error('❌ Test failed with error', error);
    return {
      scenario: 'Quarterly Scheduled Update',
      success: false,
      duration: Date.now() - startTime,
      details: { error: error instanceof Error ? error.message : String(error) },
      errors: [error instanceof Error ? error.message : String(error)]
    };
  }
}

/**
 * Test Scenario 2: Orchestrator-Triggered Research
 * Simulates Orchestrator not finding a model config and triggering research
 */
async function testOrchestratorTriggeredResearch(): Promise<TestResults> {
  const startTime = Date.now();
  const errors: string[] = [];
  
  logger.info('🧪 Starting Test Scenario 2: Orchestrator-Triggered Research');
  
  try {
    // Initialize services
    const supabase = createSupabaseClient();
    const vectorService = new VectorContextService(TEST_USER, supabase);
    const scheduler = new ResearchScheduler(TEST_USER, {
      conductResearchAndUpdate: async () => {
        // Simulate research finding a new model
        return {
          data: {
            summary: {
              modelsResearched: 5,
              configurationsUpdated: 1,
              totalCostSavings: 25,
              performanceImprovements: { security: 1 }
            },
            configurationUpdates: [{
              context: {
                language: 'rust',
                sizeCategory: 'large',
                agentRole: 'security'
              },
              recommendedModel: {
                provider: 'anthropic',
                model: 'claude-3.5-sonnet',
                versionId: 'claude-3.5-sonnet-20241022',
                capabilities: ['code-analysis', 'security', 'rust'],
                pricing: { input: 3.0, output: 15.0 },
                tier: 'premium',
                preferredFor: ['security', 'architecture']
              },
              reason: 'Optimal for Rust security analysis in large codebases',
              priority: 'high',
              expectedImprovement: { performance: 30, cost: -10 }
            }]
          }
        };
      },
      conductMetaResearch: async () => {
        return { metadata: { confidence: 0.9 } };
      },
      useResearcherForContext: async () => {
        return { prompt: 'test', tokensUsed: 150, templateReused: true };
      }
    } as any);
    
    // Create unique context that wouldn't exist in Vector DB
    const missingContext: RepositoryContext = {
      language: 'rust',
      sizeCategory: 'large' as any,
      tags: ['security', 'blockchain', 'cryptography']
    };
    
    // First, verify this config doesn't exist
    logger.info('🔍 Verifying config does not exist in Vector DB');
    const existingConfig = await vectorService.searchSimilarContent(
      RESEARCHER_CONFIG_REPO_ID,
      `rust/large/security`,
      1
    );
    
    if (existingConfig && existingConfig.length > 0) {
      logger.warn('⚠️ Config already exists, will test update flow');
    }
    
    // Simulate Orchestrator triggering research for missing config
    logger.info('🎯 Triggering unscheduled research for missing config');
    const jobId = await scheduler.triggerUnscheduledResearch(
      'rust',
      'large',
      'security',
      'E2E Test - Missing configuration for Rust large security agent',
      'high'
    );
    
    // Wait for job to complete
    let job = scheduler.getJobStatus(jobId);
    let attempts = 0;
    while (job?.status === 'running' && attempts < 30) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      job = scheduler.getJobStatus(jobId);
      attempts++;
    }
    
    if (!job || job.status !== 'completed') {
      errors.push(`Research job did not complete. Status: ${job?.status}, Error: ${job?.error}`);
      return {
        scenario: 'Orchestrator-Triggered Research',
        success: false,
        duration: Date.now() - startTime,
        details: { job },
        errors
      };
    }
    
    // Verify the new config was stored
    logger.info('🔍 Verifying new config was stored in Vector DB');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for storage
    
    const newConfig = await vectorService.searchSimilarContent(
      RESEARCHER_CONFIG_REPO_ID,
      `rust/large/security`,
      5
    );
    
    if (!newConfig || newConfig.length === 0) {
      errors.push('New configuration not found in Vector DB after research');
    } else {
      logger.info('✅ Found new configuration in Vector DB', {
        count: newConfig.length,
        sample: newConfig[0]
      });
    }
    
    // Test that Orchestrator can now find the config
    logger.info('🔄 Testing AgentConfigurationService can now find the config');
    const agentConfig = new AgentConfigurationService();
    const selection = await agentConfig.selectAgent(AgentRole.SECURITY, missingContext);
    
    if (!selection) {
      errors.push('AgentConfigurationService still cannot find config after research');
    } else {
      logger.info('✅ AgentConfigurationService found config', {
        provider: selection.provider,
        fallbackUsed: selection.fallback
      });
    }
    
    return {
      scenario: 'Orchestrator-Triggered Research',
      success: errors.length === 0,
      duration: Date.now() - startTime,
      details: {
        jobId,
        jobResult: job.result,
        configCreated: newConfig?.length > 0,
        agentSelectionWorks: !!selection,
        context: missingContext
      },
      errors: errors.length > 0 ? errors : undefined
    };
    
  } catch (error) {
    logger.error('❌ Test failed with error', error);
    return {
      scenario: 'Orchestrator-Triggered Research',
      success: false,
      duration: Date.now() - startTime,
      details: { error: error instanceof Error ? error.message : String(error) },
      errors: [error instanceof Error ? error.message : String(error)]
    };
  }
}

/**
 * Verify Vector DB queries and data integrity
 */
async function verifyVectorDBData(): Promise<void> {
  logger.info('🔍 Verifying Vector DB data integrity');
  
  const supabase = createSupabaseClient();
  
  // Check if researcher repository exists
  const { data: repo, error: repoError } = await supabase
    .from('repositories')
    .select('*')
    .eq('id', RESEARCHER_CONFIG_REPO_ID)
    .single();
    
  if (repoError) {
    logger.warn('⚠️ Researcher repository not found, creating it');
    await supabase.from('repositories').insert({
      id: RESEARCHER_CONFIG_REPO_ID,
      name: 'CodeQual Researcher Configurations',
      url: 'internal://researcher-configs',
      default_branch: 'main',
      analysis_date: new Date().toISOString(),
      overall_score: 100,
      category_scores: { system: 100 }
    });
  }
  
  // Query recent model configurations
  const { data: chunks, error: chunksError } = await supabase
    .from('analysis_chunks')
    .select('*')
    .eq('repository_id', RESEARCHER_CONFIG_REPO_ID)
    .order('created_at', { ascending: false })
    .limit(10);
    
  logger.info('📊 Vector DB Query Results', {
    repositoryFound: !!repo,
    configurationsCount: chunks?.length || 0,
    latestConfig: chunks?.[0]?.metadata
  });
}

/**
 * Main test runner
 */
async function runE2ETests() {
  console.log('\n' + '='.repeat(80));
  console.log('🚀 RESEARCHER AGENT E2E TESTS');
  console.log('='.repeat(80) + '\n');
  
  const results: TestResults[] = [];
  
  // Verify Vector DB setup
  await verifyVectorDBData();
  
  // Run Test Scenario 1: Quarterly Scheduled Update
  logger.info('\n📝 Running Scenario 1: Quarterly Scheduled Update');
  const scenario1 = await testScheduledQuarterlyUpdate();
  results.push(scenario1);
  
  // Wait between tests
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Run Test Scenario 2: Orchestrator-Triggered Research
  logger.info('\n📝 Running Scenario 2: Orchestrator-Triggered Research');
  const scenario2 = await testOrchestratorTriggeredResearch();
  results.push(scenario2);
  
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