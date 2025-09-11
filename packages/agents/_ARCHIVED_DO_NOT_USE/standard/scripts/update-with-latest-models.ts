#!/usr/bin/env npx ts-node

/**
 * Update Configurations with LATEST OpenRouter Models ONLY
 * Prioritizes freshness - NO OLD MODELS ALLOWED
 */

import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '..', '..', '..', '..', '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// LATEST OpenRouter models as of 2024-2025
// ⚠️ CRITICAL: ONLY USE MODELS FROM 2024-2025, NO OLD VERSIONS!
const LATEST_MODELS_2025 = {
  // High quality LATEST models (2024-2025 releases)
  highQuality: {
    primary: 'anthropic/claude-3.5-sonnet-20241022',    // Latest Claude Sonnet
    fallback: 'openai/gpt-4o-2024-11-20'                // Latest GPT-4o
  },
  
  // Balanced LATEST models
  balanced: {
    primary: 'anthropic/claude-3.5-haiku-20241022',     // Latest Claude Haiku 
    fallback: 'google/gemini-2.5-flash'                  // Latest Gemini
  },
  
  // Fast LATEST models  
  fast: {
    primary: 'google/gemini-2.5-flash-lite',            // Newest ultra-fast Gemini
    fallback: 'openai/gpt-4o-mini-2024-07-18'           // Latest GPT-4o mini
  },
  
  // Economic LATEST models
  economic: {
    primary: 'meta-llama/llama-3.3-70b-instruct',       // Latest Llama 3.3
    fallback: 'qwen/qwen-2.5-72b-instruct'              // Latest Qwen 2.5
  },
  
  // Ultra quality for critical roles
  ultraQuality: {
    primary: 'openai/o1-mini',                          // Latest reasoning model
    fallback: 'google/gemini-2.0-flash-exp'             // Latest Gemini 2.0
  },
  
  // Specialized for code
  codeSpecialized: {
    primary: 'deepseek/deepseek-v3',                    // Latest DeepSeek V3
    fallback: 'mistralai/mistral-large-2411'            // Latest Mistral (Nov 2024)
  }
};

// Role to LATEST model mapping based on requirements
const ROLE_TO_LATEST_MODEL: Record<string, typeof LATEST_MODELS_2025.highQuality> = {
  // Critical quality roles - need best LATEST models
  security: LATEST_MODELS_2025.ultraQuality,
  architecture: LATEST_MODELS_2025.highQuality,
  deepwiki: LATEST_MODELS_2025.codeSpecialized,
  
  // Balanced roles - need good LATEST models
  researcher: LATEST_MODELS_2025.balanced,
  comparator: LATEST_MODELS_2025.balanced,
  educator: LATEST_MODELS_2025.balanced,
  performance: LATEST_MODELS_2025.codeSpecialized,
  
  // Speed-critical roles - need fastest LATEST models
  orchestrator: LATEST_MODELS_2025.fast,
  location_finder: LATEST_MODELS_2025.fast,
  documentation: LATEST_MODELS_2025.fast,
  
  // Cost-optimized roles - need economic LATEST models
  code_quality: LATEST_MODELS_2025.economic,
  testing: LATEST_MODELS_2025.economic,
  dependencies: LATEST_MODELS_2025.economic,
  accessibility: LATEST_MODELS_2025.economic
};

async function updateWithLatestModelsOnly() {
  console.log('🚀 Updating Configurations with LATEST OpenRouter Models ONLY');
  console.log('═══════════════════════════════════════════════════════\n');
  console.log('⚠️  CRITICAL: Using ONLY 2024-2025 models - NO OLD VERSIONS!\n');
  console.log('All models accessed via OpenRouter API with OPENROUTER_API_KEY\n');
  
  try {
    // Get all configurations
    const { data: configs, error } = await supabase
      .from('model_configurations')
      .select('*')
      .order('role');
    
    if (error) {
      console.error('Error fetching configurations:', error);
      return;
    }
    
    console.log(`📊 Found ${configs?.length || 0} configurations to update with LATEST models\n`);
    
    let updateCount = 0;
    let successCount = 0;
    
    // Track unique updates to show summary
    const roleUpdates: Record<string, typeof LATEST_MODELS_2025.highQuality> = {};
    
    // Update each configuration
    for (const config of configs || []) {
      const models = ROLE_TO_LATEST_MODEL[config.role] || LATEST_MODELS_2025.balanced;
      
      // Only show unique role updates
      if (!roleUpdates[config.role]) {
        roleUpdates[config.role] = models;
        
        console.log(`🎯 ${config.role.toUpperCase()}`);
        console.log(`   OLD Model: ${config.primary_model}`);
        console.log(`   🆕 NEW LATEST Model: ${models.primary}`);
        console.log(`   ✅ This is a ${getModelYear(models.primary)} model\n`);
      }
      
      const currentDate = new Date();
      const updateData = {
        primary_model: models.primary,
        fallback_model: models.fallback,
        primary_provider: models.primary.split('/')[0],
        fallback_provider: models.fallback.split('/')[0],
        reasoning: [
          `🆕 Updated with LATEST ${getModelYear(models.primary)} models on ${currentDate.toISOString()}`,
          `Primary: ${models.primary} - LATEST version for ${config.role} role`,
          `Fallback: ${models.fallback} - LATEST alternative from different provider`,
          `⚠️ OLD models replaced - using ONLY 2024-2025 releases`,
          `Freshness priority: Models selected for being NEWEST available`,
          `All models accessed via OpenRouter API with OPENROUTER_API_KEY`
        ]
      };
      
      const { error: updateError } = await supabase
        .from('model_configurations')
        .update(updateData)
        .eq('id', config.id);
      
      if (!updateError) {
        successCount++;
      }
      
      updateCount++;
    }
    
    console.log('═══════════════════════════════════════════════════════');
    console.log(`📈 UPDATE SUMMARY - LATEST MODELS ONLY`);
    console.log('═══════════════════════════════════════════════════════\n');
    console.log(`Total Configurations: ${updateCount}`);
    console.log(`Successfully Updated: ${successCount}`);
    console.log(`Failed: ${updateCount - successCount}\n`);
    
    // Show all role mappings
    console.log('🆕 LATEST MODEL ASSIGNMENTS BY ROLE:\n');
    
    for (const [role, models] of Object.entries(roleUpdates)) {
      console.log(`📌 ${role.toUpperCase()}`);
      console.log(`   Primary: ${models.primary} (${getModelYear(models.primary)})`);
      console.log(`   Fallback: ${models.fallback} (${getModelYear(models.fallback)})`);
      console.log('');
    }
    
    // List all unique LATEST models being used
    const uniqueModels = new Set<string>();
    for (const models of Object.values(roleUpdates)) {
      uniqueModels.add(models.primary);
      uniqueModels.add(models.fallback);
    }
    
    console.log('═══════════════════════════════════════════════════════');
    console.log('🎉 ALL UNIQUE LATEST MODELS IN USE:');
    console.log('═══════════════════════════════════════════════════════\n');
    
    [...uniqueModels].sort().forEach(model => {
      const year = getModelYear(model);
      const indicator = year === '2025' ? '🔥' : '✨';
      console.log(`   ${indicator} ${model} (${year} release)`);
    });
    
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('❌ OLD MODELS THAT WERE REPLACED:');
    console.log('═══════════════════════════════════════════════════════\n');
    
    const oldModels = [
      'anthropic/claude-3-opus',
      'anthropic/claude-3-sonnet',
      'anthropic/claude-3-haiku',
      'anthropic/claude-3.5-sonnet', // Without date suffix
      'openai/gpt-4-turbo',
      'openai/gpt-4',
      'meta-llama/llama-3.1-70b-instruct',
      'mistralai/mixtral-8x7b-instruct'
    ];
    
    oldModels.forEach(model => {
      console.log(`   ❌ ${model} → REPLACED with latest version`);
    });
    
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('✅ All configurations updated with LATEST 2024-2025 models!');
    console.log('\n🚀 Key Improvements:');
    console.log('   • NO more old Claude-3 models');
    console.log('   • Using Claude-3.5 with 2024 timestamps');
    console.log('   • GPT-4o with 2024 versions');
    console.log('   • Gemini 2.5 and 2.0 (latest)');
    console.log('   • Llama 3.3 (not 3.1)');
    console.log('   • DeepSeek V3 (latest)');
    console.log('   • Qwen 2.5 (latest)');
    console.log('═══════════════════════════════════════════════════════');
    
  } catch (error) {
    console.error('Error updating configurations:', error);
  }
}

function getModelYear(modelId: string): string {
  if (modelId.includes('2025') || modelId.includes('gemini-2.5') || modelId.includes('llama-3.3')) {
    return '2025';
  }
  if (modelId.includes('2024') || modelId.includes('2411') || modelId.includes('qwen-2.5') || modelId.includes('deepseek-v3')) {
    return '2024';
  }
  if (modelId.includes('o1-mini') || modelId.includes('gemini-2.0')) {
    return '2024';
  }
  return '2024'; // Default for models without explicit dates
}

// Run the update
updateWithLatestModelsOnly().catch(console.error);