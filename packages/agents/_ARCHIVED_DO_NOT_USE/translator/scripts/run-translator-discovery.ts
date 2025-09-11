#!/usr/bin/env ts-node

/**
 * Script to run translator model discovery
 * This discovers optimal models for each translator role using AI research
 */

import { createLogger } from '@codequal/core/utils';
import { AuthenticatedUser, UserRole, UserStatus } from '../../multi-agent/types/auth';
import { discoverTranslatorModels } from '../translator-discovery-service';
import { TRANSLATOR_ROLE_CONFIGS } from '../translator-role-config';

const logger = createLogger('RunTranslatorDiscovery');

// System user for discovery operations
const SYSTEM_USER: AuthenticatedUser = {
  id: 'system-translator-discovery',
  email: 'discovery@codequal.ai',
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
    globalPermissions: ['translator_config_write', 'model_discovery'],
    quotas: {
      requestsPerHour: 10000,
      maxConcurrentExecutions: 100,
      storageQuotaMB: 10000
    }
  },
  session: {
    token: 'system-discovery-token',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    fingerprint: 'system-discovery',
    ipAddress: '127.0.0.1',
    userAgent: 'TranslatorDiscovery/1.0'
  }
};

async function runTranslatorDiscovery() {
  logger.info('🚀 Starting Translator Model Discovery');
  logger.info('=' .repeat(60));
  logger.info('\nThis process will:');
  logger.info('1. Fetch available models from providers');
  logger.info('2. Research optimal models for each translator role');
  logger.info('3. Store configurations in Vector DB');
  logger.info('4. Replace any existing configurations\n');
  
  try {
    const startTime = Date.now();
    
    // Run discovery
    logger.info('🔍 Initiating discovery process...\n');
    const configs = await discoverTranslatorModels(SYSTEM_USER);
    
    const duration = Date.now() - startTime;
    
    // Display results
    logger.info('\n' + '=' .repeat(60));
    logger.info('📊 Discovery Results:\n');
    
    logger.info(`Total Roles: ${Object.keys(TRANSLATOR_ROLE_CONFIGS).length}`);
    logger.info(`Discovered: ${configs.size}`);
    logger.info(`Duration: ${(duration / 1000).toFixed(1)}s\n`);
    
    // Display each configuration
    for (const [role, config] of configs) {
      const roleConfig = TRANSLATOR_ROLE_CONFIGS[role];
      logger.info(`📋 ${role}:`);
      logger.info(`   Role: ${roleConfig.name}`);
      logger.info(`   Selected Model: ${config.provider}/${config.model}`);
      logger.info(`   Version: ${config.versionId}`);
      logger.info(`   Previous Model: ${config.previousModel ? `${config.previousModel.provider}/${config.previousModel.model}` : 'None'}`);
      logger.info(`   Reason: ${config.reason}`);
      logger.info(`   Cost: $${config.pricing.input}/$${config.pricing.output} per M tokens`);
      logger.info('');
    }
    
    // Cost comparison
    logger.info('💰 Cost Analysis:\n');
    
    let totalNewInputCost = 0;
    let totalNewOutputCost = 0;
    let improvements = 0;
    
    for (const [role, config] of configs) {
      totalNewInputCost += config.pricing.input;
      totalNewOutputCost += config.pricing.output;
      
      if (config.previousModel) {
        improvements++;
      }
    }
    
    const avgNewInputCost = totalNewInputCost / configs.size;
    const avgNewOutputCost = totalNewOutputCost / configs.size;
    
    logger.info(`   Average Cost: $${avgNewInputCost.toFixed(2)} input / $${avgNewOutputCost.toFixed(2)} output`);
    logger.info(`   Model Improvements: ${improvements}/${configs.size} roles upgraded`);
    
    logger.info('\n✅ Discovery Complete!\n');
    logger.info('Next Steps:');
    logger.info('1. Test translations with new models');
    logger.info('2. Monitor performance metrics');
    logger.info('3. Schedule next discovery in 3 months');
    logger.info('4. Deploy updated configurations to production');
    
  } catch (error) {
    logger.error('❌ Discovery failed:', {
      error: error instanceof Error ? error.message : String(error)
    });
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  runTranslatorDiscovery()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { runTranslatorDiscovery };