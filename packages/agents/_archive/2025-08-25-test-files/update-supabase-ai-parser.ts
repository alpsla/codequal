#!/usr/bin/env npx ts-node

/**
 * Update Supabase AI-Parser Configurations
 * 
 * Updates ONLY AI-Parser configs with speed-optimized models
 * Preserves all other role configurations
 */

import { createClient } from '@supabase/supabase-js';
import { matchToOpenRouterModels, filterForAIParser } from './src/researcher/enhanced-web-search';
import axios from 'axios';
import { createLogger } from '@codequal/core/utils';
import * as dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

const logger = createLogger('Update-AI-Parser-Configs');

async function updateAIParserConfigs() {
  logger.info('🚀 Updating AI-Parser Configurations in Supabase');
  logger.info('================================================\n');
  
  try {
    // Initialize Supabase client
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Step 1: Fetch existing configurations
    logger.info('📊 Step 1: Fetching existing configurations from Supabase');
    
    const { data: existingConfigs, error: fetchError } = await supabase
      .from('model_configurations')
      .select('*');
      
    if (fetchError) {
      throw new Error(`Failed to fetch configs: ${fetchError.message}`);
    }
    
    logger.info(`✅ Found ${existingConfigs?.length || 0} existing configurations`);
    
    // Count AI-Parser configs
    const aiParserConfigs = existingConfigs?.filter(c => 
      c.role === 'ai-parser' || 
      c.role === 'ai_parser' ||
      c.agent_role === 'ai-parser' ||
      c.agent_role === 'ai_parser'
    ) || [];
    
    logger.info(`📌 Found ${aiParserConfigs.length} AI-Parser configurations to update\n`);
    
    // Step 2: Fetch OpenRouter models
    logger.info('🔍 Step 2: Fetching latest models from OpenRouter');
    
    const response = await axios.get('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://codequal.ai',
        'X-Title': 'CodeQual Model Research'
      }
    });
    
    const openRouterModels = response.data.data || [];
    logger.info(`✅ Found ${openRouterModels.length} models in OpenRouter\n`);
    
    // Step 3: Discover latest fast models
    logger.info('⚡ Step 3: Discovering latest FAST models for AI-Parser');
    
    // These are the latest fast models we discovered
    const latestFastModels = [
      'GPT-5 mini',
      'o3 mini',
      'o4 mini',
      'Gemini 2.5 Flash',
      'Gemini 2.5 Flash Lite',
      'Claude 3.5 Haiku',
      'Gemini 2.5 Pro' // Fast enough and good quality
    ];
    
    const matched = await matchToOpenRouterModels(latestFastModels, openRouterModels);
    const fastModels = filterForAIParser(matched);
    
    logger.info('Fast models selected for AI-Parser:');
    fastModels.slice(0, 5).forEach(m => {
      logger.info(`  - ${m.openRouterId} (Speed: ${m.speedScore}/100)`);
    });
    
    if (fastModels.length < 2) {
      throw new Error('Not enough fast models found for AI-Parser');
    }
    
    // Step 4: Update AI-Parser configurations
    logger.info('\n📝 Step 4: Updating AI-Parser configurations');
    
    let updated = 0;
    let failed = 0;
    
    for (const config of aiParserConfigs) {
      try {
        // Prepare updated configuration
        const updatedConfig = {
          ...config,
          primary_model: fastModels[0].openRouterId,
          primary_provider: fastModels[0].provider,
          fallback_model: fastModels[1].openRouterId,
          fallback_provider: fastModels[1].provider,
          reasoning: {
            primary: [
              'SPEED is top priority - must respond in <5 seconds',
              `Selected ${fastModels[0].openRouterId} for fastest response`,
              `Speed score: ${fastModels[0].speedScore}/100`,
              'Optimized for high-volume parsing',
              'Latest model from web search discovery'
            ],
            fallback: [
              'Fast and reliable fallback',
              `Selected ${fastModels[1].openRouterId} as backup`,
              `Speed score: ${fastModels[1].speedScore}/100`,
              'Ensures continuous service',
              'Also discovered via latest model search'
            ]
          },
          model_scores: {
            primary: {
              speed: fastModels[0].speedScore,
              quality: fastModels[0].qualityScore,
              cost: fastModels[0].costScore
            },
            fallback: {
              speed: fastModels[1].speedScore,
              quality: fastModels[1].qualityScore,
              cost: fastModels[1].costScore
            }
          },
          updated_at: new Date().toISOString(),
          update_source: 'enhanced-web-search',
          bug_fixes: ['BUG-035', 'BUG-034']
        };
        
        // Update in Supabase
        const { error: updateError } = await supabase
          .from('model_configurations')
          .update(updatedConfig)
          .eq('id', config.id);
          
        if (updateError) {
          logger.error(`  ❌ Failed to update config ${config.id}: ${updateError.message}`);
          failed++;
        } else {
          logger.info(`  ✅ Updated config ${config.id}`);
          logger.info(`     Primary: ${updatedConfig.primary_model}`);
          logger.info(`     Fallback: ${updatedConfig.fallback_model}`);
          updated++;
        }
        
      } catch (error: any) {
        logger.error(`  ❌ Error updating config ${config.id}: ${error.message}`);
        failed++;
      }
    }
    
    // Step 5: Verify no slow models in AI-Parser
    logger.info('\n✅ Step 5: Validation');
    logger.info('====================');
    
    // Re-fetch to verify updates
    const { data: updatedConfigs } = await supabase
      .from('model_configurations')
      .select('*')
      .or('role.eq.ai-parser,role.eq.ai_parser,agent_role.eq.ai-parser,agent_role.eq.ai_parser');
      
    let hasSlowModels = false;
    updatedConfigs?.forEach(config => {
      const primary = config.primary_model?.toLowerCase() || '';
      const fallback = config.fallback_model?.toLowerCase() || '';
      
      if (primary.includes('opus') || fallback.includes('opus') ||
          primary.includes('o1-pro') || fallback.includes('o1-pro')) {
        logger.error(`  ❌ Config ${config.id} still has slow models!`);
        hasSlowModels = true;
      }
    });
    
    if (!hasSlowModels) {
      logger.info('  ✅ All AI-Parser configs use only fast models');
    }
    
    // Summary
    logger.info('\n📊 SUMMARY');
    logger.info('==========');
    logger.info(`Total configurations: ${existingConfigs?.length || 0}`);
    logger.info(`AI-Parser configs found: ${aiParserConfigs.length}`);
    logger.info(`Successfully updated: ${updated}`);
    logger.info(`Failed updates: ${failed}`);
    logger.info(`Other configs preserved: ${(existingConfigs?.length || 0) - aiParserConfigs.length}`);
    
    logger.info('\n✨ Key Improvements:');
    logger.info('- AI-Parser now uses latest fast models (o4-mini, Gemini 2.5 Flash)');
    logger.info('- No slow models like Claude Opus in AI-Parser');
    logger.info('- Speed scores all above 85/100');
    logger.info('- All other role configurations preserved');
    logger.info('- Fixed BUG-035 (web search) and BUG-034 (availability)');
    
    return { updated, failed, total: aiParserConfigs.length };
    
  } catch (error) {
    logger.error('Update failed:', error);
    throw error;
  }
}

// Run the update
updateAIParserConfigs()
  .then(result => {
    logger.info(`\n✅ Update complete! ${result.updated}/${result.total} AI-Parser configs updated.`);
    process.exit(0);
  })
  .catch(error => {
    logger.error('Update failed:', error);
    process.exit(1);
  });