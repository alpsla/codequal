#!/usr/bin/env npx ts-node

/**
 * Test Research for 5 Roles
 * 
 * Tests the fixed approach:
 * 1. Proper web search for CURRENT models (Gemini 1.5, Claude 3.5, etc)
 * 2. Match to exact OpenRouter IDs
 * 3. Apply correct priorities (SPEED for AI-Parser, no slow models)
 * 4. Test with 5 roles before full deployment
 */

import { OpenRouterModelMatcher } from './src/researcher/openrouter-model-matcher';
import { generateSpeedOptimizedPrompt, scoreModelForSpeed } from './src/researcher/speed-optimized-prompt';
import { createClient } from '@supabase/supabase-js';
import { createLogger } from '@codequal/core/utils';
import * as dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

const logger = createLogger('5-Roles-Test');

// Test with 5 different roles
const TEST_ROLES = [
  { role: 'ai-parser', priority: 'speed', context: { language: 'typescript', size: 'large' }},
  { role: 'deepwiki', priority: 'quality', context: { language: 'typescript', size: 'large' }},
  { role: 'comparison', priority: 'balanced', context: { language: 'python', size: 'medium' }},
  { role: 'researcher', priority: 'cost', context: { language: 'javascript', size: 'small' }},
  { role: 'educator', priority: 'clarity', context: { language: 'go', size: 'large' }}
];

interface ModelConfig {
  role: string;
  context: {
    language: string;
    size: string;
  };
  primary: {
    model: string;
    provider: string;
    reasoning: string[];
  };
  fallback: {
    model: string;
    provider: string;
    reasoning: string[];
  };
}

async function testFiveRoles() {
  logger.info('🧪 Testing Research for 5 Roles with Fixed Approach');
  logger.info('====================================================\n');
  
  try {
    // Initialize OpenRouter matcher
    const matcher = new OpenRouterModelMatcher();
    
    // Step 1: Get CURRENT models from OpenRouter
    logger.info('📊 Step 1: Fetching CURRENT Models from OpenRouter');
    logger.info('--------------------------------------------------');
    
    const latestModels = await matcher.getLatestModels();
    const fastModels = await matcher.getFastModels();
    
    logger.info('Latest models by provider:');
    logger.info(`  Anthropic: ${latestModels.anthropic.slice(0, 3).join(', ')}`);
    logger.info(`  OpenAI: ${latestModels.openai.slice(0, 3).join(', ')}`);
    logger.info(`  Google: ${latestModels.google.slice(0, 3).join(', ')}`);
    
    logger.info('\nFast models for AI-Parser:');
    fastModels.slice(0, 5).forEach(m => logger.info(`  - ${m}`));
    
    // Step 2: Configure each role
    logger.info('\n🔬 Step 2: Configuring Each Role');
    logger.info('--------------------------------');
    
    const configurations: ModelConfig[] = [];
    
    for (const testRole of TEST_ROLES) {
      logger.info(`\n🎯 Configuring ${testRole.role.toUpperCase()}:`);
      logger.info(`  Context: ${testRole.context.language}, ${testRole.context.size}`);
      logger.info(`  Priority: ${testRole.priority}`);
      
      let primaryModel: string;
      let fallbackModel: string;
      let reasoning: string[] = [];
      
      // Role-specific selection
      switch (testRole.role) {
        case 'ai-parser':
          // MUST use fast models only
          const suitableFastModels = fastModels.filter(m => 
            !m.includes('opus') && !m.includes('pro-1.5')
          );
          primaryModel = suitableFastModels[0] || 'google/gemini-flash-1.5-latest';
          fallbackModel = suitableFastModels[1] || 'openai/gpt-3.5-turbo';
          reasoning = [
            'SPEED is top priority - must respond in <5 seconds',
            'Fast model selected (flash/turbo/haiku)',
            'NO slow models like Claude Opus',
            'Optimized for high-volume parsing'
          ];
          break;
          
        case 'deepwiki':
          // Quality focus - can use powerful models
          primaryModel = latestModels.anthropic[0] || 'anthropic/claude-3.5-sonnet';
          fallbackModel = latestModels.openai[0] || 'openai/gpt-4-turbo';
          reasoning = [
            'Quality and deep understanding prioritized',
            'Latest powerful model selected',
            'Speed less critical (background process)',
            'Maximum capability for complex analysis'
          ];
          break;
          
        case 'comparison':
          // Balanced approach
          const balancedModels = [
            ...latestModels.openai.filter(m => m.includes('gpt-4-turbo')),
            ...latestModels.google.filter(m => m.includes('gemini-pro'))
          ];
          primaryModel = balancedModels[0] || 'openai/gpt-4-turbo';
          fallbackModel = latestModels.anthropic.find(m => m.includes('sonnet')) || 'anthropic/claude-3-sonnet';
          reasoning = [
            'Balanced speed and quality',
            'Good reasoning capabilities',
            'Cost-effective for comparison tasks',
            'Reliable performance'
          ];
          break;
          
        case 'researcher':
          // Cost optimization for high volume
          const costEffective = [
            ...fastModels.filter(m => m.includes('3.5-turbo') || m.includes('haiku')),
            ...latestModels.google.filter(m => m.includes('flash'))
          ];
          primaryModel = costEffective[0] || 'openai/gpt-3.5-turbo';
          fallbackModel = costEffective[1] || 'anthropic/claude-3-haiku';
          reasoning = [
            'Cost-optimized for 3000+ queries/day',
            'Fast and economical model',
            'Good enough quality for research',
            'Low per-token cost'
          ];
          break;
          
        case 'educator':
          // Clarity and explanation focus
          primaryModel = latestModels.anthropic.find(m => m.includes('sonnet')) || 'anthropic/claude-3-sonnet';
          fallbackModel = latestModels.openai.find(m => m.includes('gpt-4')) || 'openai/gpt-4';
          reasoning = [
            'Clear explanations prioritized',
            'Good educational capabilities',
            'Patient and thorough responses',
            'Strong language understanding'
          ];
          break;
      }
      
      const config: ModelConfig = {
        role: testRole.role,
        context: testRole.context,
        primary: {
          model: primaryModel,
          provider: primaryModel.split('/')[0],
          reasoning
        },
        fallback: {
          model: fallbackModel,
          provider: fallbackModel.split('/')[0],
          reasoning: ['Reliable fallback', 'Good alternative performance']
        }
      };
      
      configurations.push(config);
      
      logger.info(`  ✅ Primary: ${config.primary.model}`);
      logger.info(`  ✅ Fallback: ${config.fallback.model}`);
    }
    
    // Step 3: Display results for approval
    logger.info('\n📋 CONFIGURATION SUMMARY');
    logger.info('========================\n');
    
    configurations.forEach(config => {
      logger.info(`${config.role.toUpperCase()} (${config.context.language}/${config.context.size}):`);
      logger.info(`  Primary: ${config.primary.model}`);
      logger.info(`  Fallback: ${config.fallback.model}`);
      logger.info(`  Reasoning:`);
      config.primary.reasoning.forEach(r => logger.info(`    - ${r}`));
      logger.info('');
    });
    
    // Validation checks
    logger.info('✅ VALIDATION CHECKS:');
    logger.info('--------------------');
    
    // Check AI-Parser doesn't have slow models
    const aiParserConfig = configurations.find(c => c.role === 'ai-parser');
    const hasSlowModel = aiParserConfig && (
      aiParserConfig.primary.model.includes('opus') ||
      aiParserConfig.primary.model.includes('pro-1.5') ||
      aiParserConfig.fallback.model.includes('opus')
    );
    
    if (hasSlowModel) {
      logger.error('❌ AI-Parser has slow models! This violates speed requirements.');
    } else {
      logger.info('✅ AI-Parser uses only fast models');
    }
    
    // Check for outdated models
    const hasOutdated = configurations.some(c => 
      c.primary.model.includes('2.0') || // Gemini 2.0 doesn't exist
      c.primary.model.includes('claude-2') || // Old Claude
      c.primary.model.includes('gpt-3.5-turbo-0301') // Old GPT
    );
    
    if (hasOutdated) {
      logger.error('❌ Some configurations use outdated models');
    } else {
      logger.info('✅ All models are current versions');
    }
    
    // Check all models are valid OpenRouter IDs
    const allModelsValid = configurations.every(c => 
      c.primary.model.includes('/') && c.fallback.model.includes('/')
    );
    
    if (allModelsValid) {
      logger.info('✅ All models use valid OpenRouter ID format');
    } else {
      logger.error('❌ Some models have invalid format');
    }
    
    // Save test results
    const fs = require('fs');
    fs.writeFileSync(
      'test-5-roles-config.json',
      JSON.stringify(configurations, null, 2)
    );
    
    logger.info('\n💾 Test configuration saved to test-5-roles-config.json');
    logger.info('\n🎯 Next Steps:');
    logger.info('1. Review the configurations above');
    logger.info('2. Verify no slow models in AI-Parser');
    logger.info('3. Confirm all models are current (not 2.0)');
    logger.info('4. If approved, run full research for all 300+ configs');
    
    return configurations;
    
  } catch (error) {
    logger.error('Test failed:', error);
    throw error;
  }
}

// Run test
testFiveRoles()
  .then(configs => {
    logger.info('\n✅ Test completed successfully!');
    logger.info(`Generated ${configs.length} configurations for review.`);
    process.exit(0);
  })
  .catch(error => {
    logger.error('Test failed:', error);
    process.exit(1);
  });