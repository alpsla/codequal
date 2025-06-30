#!/usr/bin/env ts-node

/**
 * Script to run researcher for all translator roles
 * This populates the Vector DB with optimal model configurations
 */

import { TranslatorResearcherService } from '../translator-researcher-service';
import { TranslatorRole, TRANSLATOR_ROLE_CONFIGS } from '../translator-role-config';
import { AuthenticatedUser, UserRole, UserStatus } from '../../multi-agent/types/auth';
import { createLogger } from '@codequal/core/utils';
import { TranslatorFactory } from '../translator-factory';

async function runTranslatorResearch() {
  const logger = createLogger('TranslatorResearch');
  
  logger.info('🚀 Starting translator model research process');
  logger.info('=' .repeat(60));
  
  // Create system user for research
  const systemUser: AuthenticatedUser = {
    id: 'system-translator-research',
    email: 'system@codequal.com',
    name: 'Translator Research System',
    role: UserRole.SERVICE_ACCOUNT,
    status: UserStatus.ACTIVE,
    permissions: {
      repositories: {
        '00000000-0000-0000-0000-000000000002': {
          read: true,
          write: true,
          admin: true
        }
      },
      organizations: ['system'],
      globalPermissions: ['translator_config_write'],
      quotas: {
        requestsPerHour: 10000,
        maxConcurrentExecutions: 100,
        storageQuotaMB: 10000
      }
    },
    session: {
      token: 'system-token',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      fingerprint: 'system-session',
      ipAddress: '127.0.0.1',
      userAgent: 'System/1.0'
    }
  };
  
  try {
    // Step 1: Show current state
    logger.info('\n📊 Current Translator Configuration Status:');
    const factory = TranslatorFactory.getInstance();
    await factory.initializeWithVectorDB(systemUser);
    
    const currentConfigs = factory.getAllModelConfigs();
    if (currentConfigs.size === 0) {
      logger.info('  No configurations found in Vector DB (using defaults)');
    } else {
      for (const [role, config] of currentConfigs) {
        logger.info(`  ${role}:`, {
          model: `${config.provider}/${config.model}`,
          timestamp: config.timestamp || 'N/A'
        });
      }
    }
    
    // Step 2: Initialize researcher service
    logger.info('\n🔬 Initializing Translator Researcher Service...');
    const researcherService = new TranslatorResearcherService(systemUser);
    await researcherService.initialize();
    
    // Step 3: Show research criteria for each role
    logger.info('\n📋 Research Criteria by Role:');
    for (const [role, config] of Object.entries(TRANSLATOR_ROLE_CONFIGS)) {
      logger.info(`\n${role}:`);
      logger.info(`  Purpose: ${config.description}`);
      logger.info(`  Weights: Quality ${config.evaluationCriteria.qualityWeight}% | Speed ${config.evaluationCriteria.speedWeight}% | Cost ${config.evaluationCriteria.costWeight}%`);
      logger.info(`  Requirements:`, {
        maxLatency: `${config.requirements.maxLatency}ms`,
        minQuality: config.requirements.minQuality,
        maxCost: `$${config.requirements.maxCostPerMillion}/M tokens`,
        languages: config.requirements.supportedLanguages.length
      });
    }
    
    // Step 4: Run comprehensive research
    logger.info('\n🔍 Starting comprehensive research for all translator roles...');
    logger.info('This may take several minutes as we evaluate models for each role.\n');
    
    const startTime = Date.now();
    const result = await researcherService.researchAllTranslatorRoles({
      researchDepth: 'comprehensive',
      prioritizeCost: false,
      forceRefresh: true,
      providers: ['openai', 'anthropic', 'google', 'deepseek'] // Consider major providers
    });
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    // Step 5: Display results
    logger.info(`\n✅ Research completed in ${duration} seconds`);
    logger.info(`Operation ID: ${result.operationId}`);
    logger.info('\n📊 Research Results:\n');
    
    for (const roleResult of result.results) {
      const config = TRANSLATOR_ROLE_CONFIGS[roleResult.role];
      logger.info(`${roleResult.role}:`);
      logger.info(`  Selected Model: ${roleResult.selectedModel.provider}/${roleResult.selectedModel.model}`);
      logger.info(`  Reason: ${roleResult.reason}`);
      logger.info(`  Test Results:`, {
        avgTranslationTime: `${roleResult.testResults.avgTranslationTime.toFixed(0)}ms`,
        accuracyScore: `${(roleResult.testResults.accuracyScore * 100).toFixed(1)}%`,
        formatPreservation: `${(roleResult.testResults.formatPreservationScore * 100).toFixed(1)}%`,
        languages: roleResult.testResults.languageCoverage.join(', ')
      });
      
      if (roleResult.costSavings > 0) {
        logger.info(`  💰 Cost Savings: $${roleResult.costSavings.toFixed(2)}/M tokens`);
      }
      if (roleResult.performanceImprovement > 0) {
        logger.info(`  ⚡ Performance Improvement: ${roleResult.performanceImprovement.toFixed(1)}%`);
      }
      logger.info('');
    }
    
    // Step 6: Verify storage
    logger.info('🔄 Verifying configurations stored in Vector DB...');
    await factory.initializeWithVectorDB(systemUser);
    
    const newConfigs = factory.getAllModelConfigs();
    logger.info('\n✅ Updated Configurations:');
    for (const [role, config] of newConfigs) {
      logger.info(`  ${role}: ${config.provider}/${config.model}`);
    }
    
    // Step 7: Summary statistics
    const totalCostSavings = result.results.reduce((sum, r) => sum + r.costSavings, 0);
    const avgPerformanceImprovement = result.results.reduce((sum, r) => sum + r.performanceImprovement, 0) / result.results.length;
    
    logger.info('\n📈 Summary Statistics:');
    logger.info(`  Total Cost Savings: $${totalCostSavings.toFixed(2)}/M tokens`);
    logger.info(`  Average Performance Improvement: ${avgPerformanceImprovement.toFixed(1)}%`);
    logger.info(`  Models Configured: ${result.results.length}/5`);
    
    // Step 8: Test translations with new models
    logger.info('\n🧪 Testing translations with newly selected models...\n');
    
    const testCases = [
      {
        content: { status: 'success', message: 'Operation completed', data: { id: 123 } },
        targetLanguage: 'es' as const,
        context: 'api' as const,
        description: 'API Response'
      },
      {
        content: 'Authentication failed: Invalid credentials',
        targetLanguage: 'fr' as const,
        context: 'error' as const,
        description: 'Error Message'
      },
      {
        content: '# Getting Started\n\nInstall the SDK using npm:\n\n```bash\nnpm install @codequal/sdk\n```',
        targetLanguage: 'ja' as const,
        context: 'docs' as const,
        description: 'Documentation'
      },
      {
        content: 'Save Changes',
        targetLanguage: 'de' as const,
        context: 'ui' as const,
        description: 'UI Button'
      },
      {
        content: '// Initialize the client\nconst client = new Client();',
        targetLanguage: 'zh' as const,
        context: 'sdk' as const,
        description: 'Code Comment'
      }
    ];
    
    for (const test of testCases) {
      try {
        const result = await factory.translate({
          content: test.content,
          targetLanguage: test.targetLanguage,
          context: test.context
        });
        
        logger.info(`${test.description} (${test.context} → ${test.targetLanguage}):`);
        logger.info(`  Model: ${result.modelUsed}`);
        logger.info(`  Time: ${result.processingTime}ms`);
        logger.info(`  Confidence: ${(result.confidence * 100).toFixed(1)}%`);
        logger.info('');
      } catch (error) {
        logger.error(`Failed to test ${test.description}:`, { error });
      }
    }
    
    logger.info('=' .repeat(60));
    logger.info('✅ Translator research process completed successfully!');
    logger.info('\nNext steps:');
    logger.info('1. Models are now configured and stored in Vector DB');
    logger.info('2. Translations will use the researched models automatically');
    logger.info('3. Schedule quarterly research for continuous optimization');
    logger.info('4. Monitor translation metrics for performance tracking');
    
  } catch (error) {
    logger.error('❌ Research process failed:', {
      error: error instanceof Error ? error.message : String(error)
    });
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  runTranslatorResearch()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { runTranslatorResearch };