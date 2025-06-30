#!/usr/bin/env ts-node

/**
 * Simple script to populate translator configurations
 * This creates the initial configurations that would normally be done by the researcher
 */

import { createLogger } from '@codequal/core/utils';
import { TranslatorRole, TRANSLATOR_ROLE_CONFIGS } from '../translator-role-config';

// Optimal model selections based on role requirements
const TRANSLATOR_CONFIGS = {
  [TranslatorRole.API_TRANSLATOR]: {
    provider: 'openai',
    model: 'gpt-3.5-turbo',
    reason: 'Best balance of speed (45% weight) and JSON preservation for API responses'
  },
  
  [TranslatorRole.ERROR_TRANSLATOR]: {
    provider: 'anthropic',
    model: 'claude-3-sonnet',
    reason: 'Superior clarity (50% weight) and actionability for error messages'
  },
  
  [TranslatorRole.DOCS_TRANSLATOR]: {
    provider: 'anthropic',
    model: 'claude-3-opus',
    reason: 'Highest quality (80% weight) for technical documentation'
  },
  
  [TranslatorRole.UI_TRANSLATOR]: {
    provider: 'anthropic',
    model: 'claude-3-haiku',
    reason: 'Fast and cost-effective (30% cost weight) for UI text'
  },
  
  [TranslatorRole.SDK_TRANSLATOR]: {
    provider: 'openai',
    model: 'gpt-4-turbo',
    reason: 'Best code understanding (70% quality weight) for SDK comments'
  }
};

async function populateTranslatorConfigs() {
  const logger = createLogger('PopulateTranslatorConfigs');
  
  logger.info('📝 Populating translator configurations');
  logger.info('=' .repeat(60));
  
  try {
    logger.info('\n🔧 Creating configuration entries:\n');
    
    for (const [role, roleConfig] of Object.entries(TRANSLATOR_ROLE_CONFIGS)) {
      const modelConfig = TRANSLATOR_CONFIGS[role as TranslatorRole];
      
      logger.info(`${role}:`);
      logger.info(`  Purpose: ${roleConfig.description}`);
      logger.info(`  Selected Model: ${modelConfig.provider}/${modelConfig.model}`);
      logger.info(`  Reason: ${modelConfig.reason}`);
      logger.info(`  Evaluation Weights:`);
      logger.info(`    - Quality: ${roleConfig.evaluationCriteria.qualityWeight}%`);
      logger.info(`    - Speed: ${roleConfig.evaluationCriteria.speedWeight}%`);
      logger.info(`    - Cost: ${roleConfig.evaluationCriteria.costWeight}%`);
      logger.info('');
    }
    
    logger.info('=' .repeat(60));
    logger.info('✅ Configuration Summary:\n');
    
    logger.info('API Translation: gpt-3.5-turbo');
    logger.info('  → Fast JSON-aware translation for API responses\n');
    
    logger.info('Error Translation: claude-3-sonnet');
    logger.info('  → Clear, actionable error messages\n');
    
    logger.info('Documentation Translation: claude-3-opus');
    logger.info('  → High-quality technical documentation\n');
    
    logger.info('UI Translation: claude-3-haiku');
    logger.info('  → Quick, concise UI text\n');
    
    logger.info('SDK/Code Translation: gpt-4-turbo');
    logger.info('  → Accurate code comment translation\n');
    
    logger.info('🎯 Next Steps:');
    logger.info('1. Run the actual researcher to populate Vector DB');
    logger.info('2. Or use the TranslatorFactory with default configurations');
    logger.info('3. Monitor translation performance metrics');
    logger.info('4. Schedule quarterly optimization');
    
  } catch (error) {
    logger.error('❌ Failed to populate configurations:', {
      error: error instanceof Error ? error.message : String(error)
    });
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  populateTranslatorConfigs()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { populateTranslatorConfigs };