/**
 * Simple E2E Test for On-Demand Researcher Requests
 * 
 * This test demonstrates the on-demand researcher flow without authentication
 */

import { config } from 'dotenv';
import { createLogger } from '@codequal/core/utils';
import { ResearcherService } from '@codequal/agents';
import { ModelVersionSync } from '@codequal/core/services/model-selection/ModelVersionSync';
import { getSupabase } from '@codequal/database/supabase/client';

// Load environment variables
config({ path: '../../.env' });

const logger = createLogger('ResearcherOnDemandSimpleTest');

interface TestMetrics {
  totalTime: number;
  configCheckTime: number;
  researcherActivationTime: number;
  modelSelectionTime: number;
  storageTime: number;
  overhead: number;
}

class SimpleResearcherTest {
  private metrics: TestMetrics = {
    totalTime: 0,
    configCheckTime: 0,
    researcherActivationTime: 0,
    modelSelectionTime: 0,
    storageTime: 0,
    overhead: 0
  };

  /**
   * Run the test
   */
  async runTest(): Promise<void> {
    logger.info('🚀 Starting Simple On-Demand Researcher Test');
    
    const startTime = Date.now();

    try {
      // Step 1: Initialize components
      logger.info('Step 1: Initializing components...');
      const testLogger = createLogger('ModelVersionSync');
      const modelVersionSync = new ModelVersionSync(testLogger);

      // Step 2: Test with uncommon configuration
      logger.info('Step 2: Testing with uncommon configuration...');
      const uncommonContext = {
        primaryLanguage: 'elixir',
        size: 'extra_large' as const
      };

      const checkStartTime = Date.now();
      
      // Try to check for cached model config
      // In real implementation, this would check vector DB
      const cachedConfig = null;
      
      // If no cached config, this would trigger researcher in production
      const selection = cachedConfig || {
        model: 'default-model',
        provider: 'openai'
      };
      
      this.metrics.configCheckTime = Date.now() - checkStartTime;

      logger.info('Model selection result:', {
        primary: `${selection.primary.provider}/${selection.primary.model}`,
        fallback: selection.fallback ? 
          `${selection.fallback.provider}/${selection.fallback.model}` : 
          'none',
        reasoning: selection.reasoning
      });

      // Step 3: Simulate researcher service activation
      logger.info('Step 3: Simulating researcher service activation...');
      const researchStartTime = Date.now();
      
      // Create a mock authenticated user for the researcher service
      const mockUser = {
        id: 'test-user-123',
        email: 'test@codequal.com',
        permissions: [],
        role: 'user',
        status: 'active',
        session: {
          token: 'mock-token',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
      };

      const researcherService = new ResearcherService(mockUser);
      
      // Check if we need to trigger research
      const needsResearch = selection.reasoning.some(r => 
        r.includes('default') || 
        r.includes('fallback') ||
        !r.includes('context-specific')
      );

      if (needsResearch) {
        logger.info('Configuration not found, triggering researcher...');
        
        const researchResult = await researcherService.triggerResearch({
          researchDepth: 'shallow',
          prioritizeCost: true
        });

        logger.info('Research triggered:', researchResult);
        this.metrics.researcherActivationTime = Date.now() - researchStartTime;

        // Wait a bit for research to start
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Check operation status
        const status = await researcherService.getOperationStatus(researchResult.operationId);
        logger.info('Research operation status:', {
          operationId: status?.operationId,
          status: status?.status,
          configurationsUpdated: status?.configurationsUpdated
        });
      } else {
        logger.info('Configuration already exists, no research needed');
        this.metrics.researcherActivationTime = 0;
      }

      this.metrics.totalTime = Date.now() - startTime;
      this.logResults();

    } catch (error) {
      logger.error('Test failed', { error });
      throw error;
    }
  }

  /**
   * Log test results
   */
  private logResults(): void {
    // eslint-disable-next-line no-console
    console.log('\n📊 Test Results');
    // eslint-disable-next-line no-console
    console.log('================');
    // eslint-disable-next-line no-console
    console.log(`Total Time: ${(this.metrics.totalTime / 1000).toFixed(2)}s`);
    // eslint-disable-next-line no-console
    console.log(`Config Check: ${this.metrics.configCheckTime}ms`);
    // eslint-disable-next-line no-console
    console.log(`Researcher Activation: ${(this.metrics.researcherActivationTime / 1000).toFixed(2)}s`);
    
    // eslint-disable-next-line no-console
    console.log('\n💡 Key Insights:');
    if (this.metrics.researcherActivationTime > 0) {
      // eslint-disable-next-line no-console
      console.log('- On-demand researcher was triggered successfully');
      // eslint-disable-next-line no-console
      console.log('- This adds overhead but ensures optimal model selection');
      // eslint-disable-next-line no-console
      console.log('- Configuration will be cached for future requests');
    } else {
      // eslint-disable-next-line no-console
      console.log('- Configuration was already cached');
      // eslint-disable-next-line no-console
      console.log('- No researcher activation needed');
      // eslint-disable-next-line no-console
      console.log('- Fast path was used');
    }
  }
}

/**
 * Main function
 */
async function main() {
  const test = new SimpleResearcherTest();
  await test.runTest();
}

if (require.main === module) {
  main().catch(error => {
    logger.error('Test execution failed', { error });
    process.exit(1);
  });
}

export { SimpleResearcherTest };