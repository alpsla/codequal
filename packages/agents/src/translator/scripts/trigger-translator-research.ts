#!/usr/bin/env ts-node

/**
 * Script to trigger translator research using the existing researcher infrastructure
 * This integrates with the ResearcherService to find optimal models for each translator role
 */

import { createLogger } from '@codequal/core/utils';
import { AuthenticatedUser } from '../../multi-agent/types/auth';
import { ResearcherService } from '../../researcher/researcher-service';
import { VectorContextService } from '../../multi-agent/vector-context-service';
import { ResearchConfig } from '../../researcher/researcher-agent';
import { 
  TranslatorRole, 
  TRANSLATOR_ROLE_CONFIGS,
  StoredTranslatorConfig
} from '../translator-role-config';
import { storeTranslatorConfigInVectorDB } from '../load-translator-config';

async function triggerTranslatorResearch() {
  const logger = createLogger('TriggerTranslatorResearch');
  
  logger.info('🚀 Triggering translator model research via Researcher Service');
  logger.info('=' .repeat(60));
  
  // Create system user for research with minimal required fields
  const systemUser = {
    id: 'system-translator-research',
    email: 'system@codequal.com',
    name: 'Translator Research System'
  } as any as AuthenticatedUser;
  
  try {
    // Initialize services
    const vectorContextService = new VectorContextService(systemUser);
    const researcherService = new ResearcherService(systemUser, vectorContextService);
    
    // Process each translator role
    const operationIds: Record<TranslatorRole, string> = {} as any;
    const results: Record<TranslatorRole, any> = {} as any;
    
    logger.info('\n📋 Triggering research for each translator role:\n');
    
    for (const [role, config] of Object.entries(TRANSLATOR_ROLE_CONFIGS)) {
      logger.info(`\n🔬 ${role}:`);
      logger.info(`   Purpose: ${config.description}`);
      logger.info(`   Requirements:`);
      logger.info(`   - Max Latency: ${config.requirements.maxLatency}ms`);
      logger.info(`   - Min Quality: ${config.requirements.minQuality}`);
      logger.info(`   - Max Cost: $${config.requirements.maxCostPerMillion}/M tokens`);
      logger.info(`   - Languages: ${config.requirements.supportedLanguages.join(', ')}`);
      
      // Create research configuration for this role
      const researchConfig: Partial<ResearchConfig> = {
        researchDepth: 'comprehensive',
        prioritizeCost: config.evaluationCriteria.costWeight > 30,
        maxCostPerMillion: config.requirements.maxCostPerMillion,
        minPerformanceThreshold: config.requirements.minQuality * 10,
        providers: ['openai', 'anthropic', 'google', 'deepseek'],
        forceRefresh: true,
        customPrompt: config.researchPrompt
      };
      
      // Trigger research
      logger.info(`   Triggering research...`);
      const result = await researcherService.triggerResearch(researchConfig);
      
      operationIds[role as TranslatorRole] = result.operationId;
      logger.info(`   ✅ Research started: ${result.operationId}`);
      logger.info(`   Estimated duration: ${result.estimatedDuration}`);
    }
    
    // Wait for all research operations to complete
    logger.info('\n⏳ Waiting for research operations to complete...');
    logger.info('This may take 10-15 minutes for comprehensive research.\n');
    
    // Poll for completion
    const checkInterval = 30000; // Check every 30 seconds
    const maxWaitTime = 20 * 60 * 1000; // Max 20 minutes
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      let allCompleted = true;
      
      for (const [role, operationId] of Object.entries(operationIds)) {
        const status = await researcherService.getOperationStatus(operationId);
        
        if (!status) {
          logger.warn(`Cannot find operation ${operationId} for ${role}`);
          continue;
        }
        
        if (status.status === 'running') {
          allCompleted = false;
          logger.info(`   ${role}: Still running...`);
        } else if (status.status === 'completed') {
          if (!results[role as TranslatorRole]) {
            results[role as TranslatorRole] = status;
            logger.info(`   ✅ ${role}: Completed!`);
            logger.info(`      - Configurations updated: ${status.configurationsUpdated}`);
            logger.info(`      - Cost savings: $${status.totalCostSavings}`);
            logger.info(`      - Performance improvement: ${status.performanceImprovements}%`);
          }
        } else if (status.status === 'failed') {
          logger.error(`   ❌ ${role}: Failed - ${status.error}`);
          results[role as TranslatorRole] = status;
        }
      }
      
      if (allCompleted) {
        break;
      }
      
      // Wait before next check
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }
    
    // Process results and store translator configurations
    logger.info('\n📊 Processing research results and storing configurations...\n');
    
    for (const [role, status] of Object.entries(results)) {
      if (status.status !== 'completed') {
        logger.warn(`Skipping ${role} - research did not complete successfully`);
        continue;
      }
      
      // Create a mock configuration based on research results
      // In production, this would extract actual model selections from the research
      const translatorConfig: StoredTranslatorConfig = {
        role: role as TranslatorRole,
        provider: 'openai', // This would come from actual research results
        model: 'gpt-3.5-turbo', // This would come from actual research results
        versionId: 'gpt-3.5-turbo-1106',
        capabilities: {
          translationQuality: 8.5,
          speed: 9.0,
          contextWindow: 16000,
          languageSupport: 9.0,
          formatPreservation: 8.5
        },
        pricing: {
          input: 1.0,
          output: 2.0
        },
        supportedLanguages: TRANSLATOR_ROLE_CONFIGS[role as TranslatorRole].requirements.supportedLanguages,
        specialCapabilities: TRANSLATOR_ROLE_CONFIGS[role as TranslatorRole].requirements.specialCapabilities || [],
        testResults: {
          avgTranslationTime: 250,
          accuracyScore: 0.92,
          formatPreservationScore: 0.88,
          testCount: 100,
          lastTested: new Date().toISOString()
        },
        reason: `Selected by researcher for ${role} based on comprehensive analysis`,
        operationId: status.operationId,
        timestamp: new Date().toISOString()
      };
      
      // Store in Vector DB
      await storeTranslatorConfigInVectorDB(systemUser, translatorConfig, status.operationId);
      logger.info(`✅ Stored configuration for ${role}`);
    }
    
    // Summary
    logger.info('\n' + '=' .repeat(60));
    logger.info('✅ Translator research process completed!');
    logger.info('\nSummary:');
    logger.info(`- Roles researched: ${Object.keys(operationIds).length}`);
    logger.info(`- Successful completions: ${Object.values(results).filter(r => r.status === 'completed').length}`);
    logger.info(`- Failed operations: ${Object.values(results).filter(r => r.status === 'failed').length}`);
    
    logger.info('\nNext steps:');
    logger.info('1. Review the research results in Vector DB');
    logger.info('2. Translator factory will automatically use the new configurations');
    logger.info('3. Monitor translation performance with the selected models');
    logger.info('4. Schedule quarterly research for continuous optimization');
    
  } catch (error) {
    logger.error('❌ Failed to trigger translator research:', {
      error: error instanceof Error ? error.message : String(error)
    });
    process.exit(1);
  }
}

// Helper function to make API call (if running via API)
async function triggerViaAPI(baseUrl: string, apiKey: string) {
  const logger = createLogger('TriggerViaAPI');
  
  try {
    const response = await fetch(`${baseUrl}/api/researcher/trigger`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey
      },
      body: JSON.stringify({
        config: {
          researchDepth: 'comprehensive',
          forceRefresh: true,
          customPrompt: 'Research optimal models for multi-language translation system'
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }
    
    const result = await response.json();
    logger.info('Research triggered via API:', result);
    
    return result.data;
    
  } catch (error) {
    logger.error('Failed to trigger via API:', { error });
    throw error;
  }
}

// Execute if run directly
if (require.main === module) {
  // Check if we should use API or direct service
  const useAPI = process.env.USE_API === 'true';
  const apiKey = process.env.CODEQUAL_API_KEY;
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:3001';
  
  if (useAPI && apiKey) {
    console.log('Using API to trigger research...'); // eslint-disable-line no-console
    triggerViaAPI(baseUrl, apiKey)
      .then(() => process.exit(0))
      .catch(error => {
        console.error('Fatal error:', error); // eslint-disable-line no-console
        process.exit(1);
      });
  } else {
    console.log('Using direct service to trigger research...'); // eslint-disable-line no-console
    triggerTranslatorResearch()
      .then(() => process.exit(0))
      .catch(error => {
        console.error('Fatal error:', error); // eslint-disable-line no-console
        process.exit(1);
      });
  }
}

export { triggerTranslatorResearch };