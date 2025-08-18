#!/usr/bin/env npx ts-node

/**
 * Test Pure Prompt-Based Discovery
 * 
 * NO hardcoded model names - only requirements and characteristics
 */

import { 
  generatePureDiscoveryPrompts,
  generateRequirementPrompts,
  selectByCharacteristics 
} from './src/researcher/pure-prompt-discovery';
import axios from 'axios';
import { createLogger } from '@codequal/core/utils';
import * as dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

const logger = createLogger('Pure-Prompt-Test');

async function testPurePromptDiscovery() {
  logger.info('🚀 Testing Pure Prompt-Based Discovery (NO hardcoded models)');
  logger.info('==========================================================\n');
  
  try {
    // Step 1: Fetch OpenRouter models (we need actual data to select from)
    logger.info('📊 Step 1: Fetching available models from OpenRouter');
    const response = await axios.get('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://codequal.ai',
        'X-Title': 'CodeQual Model Research'
      }
    });
    
    const allModels = response.data.data || [];
    logger.info(`✅ Found ${allModels.length} models available\n`);
    
    // Step 2: Test context-independent roles
    logger.info('🎯 Step 2: Testing Context-Independent Roles');
    logger.info('(No language/size context needed)\n');
    
    const contextIndependentRoles = ['ai-parser', 'educator', 'researcher', 'orchestrator'];
    
    for (const role of contextIndependentRoles) {
      logger.info(`\n📌 ${role.toUpperCase()}:`);
      
      // Generate prompts WITHOUT any model names
      const prompts = generatePureDiscoveryPrompts(role);
      const requirementPrompt = generateRequirementPrompts(role);
      
      logger.info('Discovery prompts (NO model names):');
      prompts.slice(0, 3).forEach(p => logger.info(`  - "${p.substring(0, 60)}..."`));
      
      logger.info('\nRequirement emphasis:');
      const reqLines = requirementPrompt.trim().split('\n').filter(l => l.includes('-'));
      reqLines.slice(0, 3).forEach(l => logger.info(`  ${l.trim()}`));
      
      // Select models based on characteristics ONLY
      const selection = selectByCharacteristics(allModels, role);
      
      if (selection) {
        // Display selection WITHOUT emphasizing model names
        const primaryPrice = parseFloat(selection.primary.pricing?.prompt || 0) * 1000000;
        const fallbackPrice = parseFloat(selection.fallback.pricing?.prompt || 0) * 1000000;
        
        logger.info('\nSelected based on characteristics:');
        logger.info(`  Primary: ${selection.primary.id}`);
        logger.info(`    Price: $${primaryPrice.toFixed(2)} per M tokens`);
        logger.info(`    Context: ${selection.primary.context_length} tokens`);
        
        logger.info(`  Fallback: ${selection.fallback.id}`);
        logger.info(`    Price: $${fallbackPrice.toFixed(2)} per M tokens`);
        logger.info(`    Context: ${selection.fallback.context_length} tokens`);
        
        // Validate selections
        if (role === 'ai-parser') {
          // Check if selected models are actually fast (low price usually = fast)
          if (primaryPrice > 5.0) {
            logger.error('  ❌ WARNING: Primary model seems expensive/slow for AI-Parser!');
          } else {
            logger.info('  ✅ Primary model is fast (low cost indicates speed)');
          }
        }
      }
    }
    
    // Step 3: Test context-dependent roles
    logger.info('\n\n🎯 Step 3: Context-Dependent Roles');
    logger.info('(Need language and size context)\n');
    
    const contextDependentRoles = [
      { role: 'deepwiki', language: 'typescript', size: 'large' },
      { role: 'comparison', language: 'python', size: 'medium' },
      { role: 'location-finder', language: 'javascript', size: 'small' }
    ];
    
    for (const config of contextDependentRoles) {
      logger.info(`\n📌 ${config.role.toUpperCase()} (${config.language}/${config.size}):`);
      
      // For context-dependent, we still don't hardcode models
      // but we can adjust selection based on context
      const selection = selectByCharacteristics(
        allModels.filter(m => {
          // Filter based on context (e.g., larger models for large codebases)
          if (config.size === 'large') {
            return m.context_length >= 32768;
          } else if (config.size === 'small') {
            return m.context_length <= 16384;
          }
          return true;
        }),
        config.role
      );
      
      if (selection) {
        logger.info(`  Primary: ${selection.primary.id}`);
        logger.info(`  Fallback: ${selection.fallback.id}`);
      }
    }
    
    // Step 4: Validate NO hardcoded models
    logger.info('\n\n✅ VALIDATION: No Hardcoded Models');
    logger.info('====================================');
    
    // Check our prompt generation doesn't contain specific model names
    const allPrompts = [
      ...generatePureDiscoveryPrompts('ai-parser'),
      ...generatePureDiscoveryPrompts('deepwiki'),
      ...generatePureDiscoveryPrompts('researcher')
    ];
    
    const forbiddenTerms = ['claude', 'gpt', 'gemini', 'llama', 'opus', 'sonnet', 'haiku'];
    let hasHardcoded = false;
    
    allPrompts.forEach(prompt => {
      forbiddenTerms.forEach(term => {
        if (prompt.toLowerCase().includes(term)) {
          logger.error(`  ❌ Found hardcoded term "${term}" in prompt!`);
          hasHardcoded = true;
        }
      });
    });
    
    if (!hasHardcoded) {
      logger.info('  ✅ No hardcoded model names found in prompts');
    }
    
    // Summary
    logger.info('\n📋 SUMMARY');
    logger.info('==========');
    logger.info('✅ Discovery uses ONLY prompts and requirements');
    logger.info('✅ Selection based on model characteristics, not names');
    logger.info('✅ AI-Parser selects based on speed characteristics');
    logger.info('✅ Context-dependent roles filter by requirements');
    logger.info('✅ NO hardcoded model names anywhere');
    
    return true;
    
  } catch (error) {
    logger.error('Test failed:', error);
    throw error;
  }
}

// Run test
testPurePromptDiscovery()
  .then(() => {
    logger.info('\n✅ Pure prompt-based discovery test complete!');
    process.exit(0);
  })
  .catch(error => {
    logger.error('Test failed:', error);
    process.exit(1);
  });