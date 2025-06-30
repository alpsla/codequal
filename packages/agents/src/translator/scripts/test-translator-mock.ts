#!/usr/bin/env ts-node

/**
 * Test script to verify translator system configuration without API calls
 */

import { createLogger } from '@codequal/core/utils';
import { VectorContextService } from '../../multi-agent/vector-context-service';
import { AuthenticatedUser, UserRole, UserStatus } from '../../multi-agent/types/auth';
import { loadTranslatorConfigsFromVectorDB } from '../load-translator-config';
import { TranslatorRole, TRANSLATOR_ROLE_CONFIGS } from '../translator-role-config';

const logger = createLogger('TestTranslatorMock');

// Mock authenticated user
const MOCK_USER: AuthenticatedUser = {
  id: 'test-translator-user',
  email: 'test@codequal.ai',
  role: UserRole.USER,
  status: UserStatus.ACTIVE,
  permissions: {
    repositories: {
      '00000000-0000-0000-0000-000000000002': { read: true, write: false, admin: false }
    },
    organizations: ['test-org'],
    globalPermissions: [],
    quotas: {
      requestsPerHour: 1000,
      maxConcurrentExecutions: 10,
      storageQuotaMB: 100
    }
  },
  session: {
    token: 'test-token',
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    fingerprint: 'test-session',
    ipAddress: '127.0.0.1',
    userAgent: 'Test/1.0'
  }
};

async function testTranslatorMock() {
  logger.info('🧪 Testing Translator Configuration System');
  logger.info('=' .repeat(60));
  
  try {
    // Create Vector Context Service
    logger.info('\n📦 Creating Vector Context Service...');
    const vectorContextService = new VectorContextService(MOCK_USER);
    
    // Load translator configurations from Vector DB
    logger.info('\n🔍 Loading translator configurations from Vector DB...\n');
    const configs = await loadTranslatorConfigsFromVectorDB(
      MOCK_USER,
      vectorContextService,
      logger
    );
    
    logger.info(`\n✅ Successfully loaded ${configs.size} translator configurations:\n`);
    
    // Display loaded configurations
    for (const [role, config] of configs) {
      const roleConfig = TRANSLATOR_ROLE_CONFIGS[role];
      logger.info(`📋 ${role}:`);
      logger.info(`   Name: ${roleConfig.name}`);
      logger.info(`   Description: ${roleConfig.description}`);
      logger.info(`   Model: ${config.provider}/${config.model}`);
      logger.info(`   Version: ${config.versionId}`);
      logger.info(`   Reason: ${config.reason}`);
      
      if (config.testResults) {
        logger.info(`   Performance:`);
        logger.info(`     - Avg Translation Time: ${config.testResults.avgTranslationTime}ms`);
        logger.info(`     - Accuracy Score: ${(config.testResults.accuracyScore * 100).toFixed(0)}%`);
        logger.info(`     - Format Preservation: ${(config.testResults.formatPreservationScore * 100).toFixed(0)}%`);
      }
      
      logger.info(`   Capabilities:`);
      logger.info(`     - Translation Quality: ${config.capabilities.translationQuality}/10`);
      logger.info(`     - Speed: ${config.capabilities.speed}/10`);
      logger.info(`     - Context Window: ${config.capabilities.contextWindow.toLocaleString()} tokens`);
      
      logger.info(`   Pricing: $${config.pricing.input}/$${config.pricing.output} per million tokens`);
      logger.info(`   Languages: ${config.supportedLanguages.join(', ')}`);
      logger.info('');
    }
    
    // Verify role mapping
    logger.info('🔗 Verifying role configurations:\n');
    
    for (const role of Object.values(TranslatorRole)) {
      const hasConfig = configs.has(role);
      const roleConfig = TRANSLATOR_ROLE_CONFIGS[role];
      
      logger.info(`   ${hasConfig ? '✅' : '❌'} ${role}: ${roleConfig.name}`);
      
      if (hasConfig) {
        const config = configs.get(role)!;
        const requirements = roleConfig.requirements;
        
        // Check if model meets requirements
        const meetsLatency = config.testResults 
          ? config.testResults.avgTranslationTime <= requirements.maxLatency
          : true;
        const meetsQuality = config.testResults
          ? config.testResults.accuracyScore >= requirements.minQuality
          : true;
        
        logger.info(`      Latency: ${meetsLatency ? '✅' : '❌'} ${config.testResults?.avgTranslationTime || 'N/A'}ms (max: ${requirements.maxLatency}ms)`);
        logger.info(`      Quality: ${meetsQuality ? '✅' : '❌'} ${((config.testResults?.accuracyScore || 0) * 100).toFixed(0)}% (min: ${(requirements.minQuality * 100).toFixed(0)}%)`);
      }
    }
    
    // Summary
    logger.info('\n' + '=' .repeat(60));
    logger.info('📊 Configuration Summary:\n');
    logger.info(`   Total Roles: ${Object.keys(TRANSLATOR_ROLE_CONFIGS).length}`);
    logger.info(`   Configured: ${configs.size}`);
    logger.info(`   Missing: ${Object.keys(TRANSLATOR_ROLE_CONFIGS).length - configs.size}`);
    
    // Cost analysis
    logger.info('\n💰 Cost Analysis (per million tokens):');
    let totalInputCost = 0;
    let totalOutputCost = 0;
    
    for (const [role, config] of configs) {
      totalInputCost += config.pricing.input;
      totalOutputCost += config.pricing.output;
      logger.info(`   ${role}: $${config.pricing.input} input / $${config.pricing.output} output`);
    }
    
    logger.info(`   Average: $${(totalInputCost / configs.size).toFixed(2)} input / $${(totalOutputCost / configs.size).toFixed(2)} output`);
    
    logger.info('\n🎯 Next Steps:');
    logger.info('1. Set up proper API keys for testing');
    logger.info('2. Implement translation monitoring and metrics');
    logger.info('3. Configure fallback models for each role');
    logger.info('4. Set up quarterly optimization schedule');
    logger.info('5. Integrate with API endpoints');
    
  } catch (error) {
    logger.error('❌ Test failed:', {
      error: error instanceof Error ? error.message : String(error)
    });
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  testTranslatorMock()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { testTranslatorMock };