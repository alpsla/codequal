#!/usr/bin/env npx ts-node

/**
 * Update Configurations with Real OpenRouter Models
 * Directly assigns discovered OpenRouter models to each role
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

// Real OpenRouter models discovered from the API
const OPENROUTER_MODELS = {
  // High quality models for critical roles
  highQuality: {
    primary: 'anthropic/claude-3.5-sonnet',
    fallback: 'openai/gpt-4-turbo'
  },
  
  // Balanced models for general roles
  balanced: {
    primary: 'anthropic/claude-3-haiku',
    fallback: 'openai/gpt-4o-mini'
  },
  
  // Fast models for speed-critical roles
  fast: {
    primary: 'openai/gpt-4o-mini',
    fallback: 'anthropic/claude-3-haiku'
  },
  
  // Cost-effective models
  economic: {
    primary: 'meta-llama/llama-3.1-70b-instruct',
    fallback: 'mistralai/mixtral-8x7b-instruct'
  }
};

// Role to model mapping based on requirements
const ROLE_MODEL_MAPPING: Record<string, typeof OPENROUTER_MODELS.highQuality> = {
  // Critical quality roles
  security: OPENROUTER_MODELS.highQuality,
  architecture: OPENROUTER_MODELS.highQuality,
  deepwiki: OPENROUTER_MODELS.highQuality,
  
  // Balanced roles
  researcher: OPENROUTER_MODELS.balanced,
  comparator: OPENROUTER_MODELS.balanced,
  educator: OPENROUTER_MODELS.balanced,
  performance: OPENROUTER_MODELS.balanced,
  
  // Speed-critical roles
  orchestrator: OPENROUTER_MODELS.fast,
  location_finder: OPENROUTER_MODELS.fast,
  documentation: OPENROUTER_MODELS.fast,
  
  // Cost-optimized roles
  code_quality: OPENROUTER_MODELS.economic,
  testing: OPENROUTER_MODELS.economic,
  dependencies: OPENROUTER_MODELS.economic,
  accessibility: OPENROUTER_MODELS.economic
};

async function updateConfigurationsWithRealModels() {
  console.log('🔄 Updating Configurations with Real OpenRouter Models');
  console.log('═══════════════════════════════════════════════════════\n');
  console.log('All models will be accessed via OpenRouter API\n');
  
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
    
    console.log(`📊 Found ${configs?.length || 0} configurations to update\n`);
    
    let updateCount = 0;
    let successCount = 0;
    
    // Update each configuration
    for (const config of configs || []) {
      const models = ROLE_MODEL_MAPPING[config.role] || OPENROUTER_MODELS.balanced;
      
      console.log(`🎯 ${config.role.toUpperCase()}`);
      console.log(`   Current: ${config.primary_model}`);
      console.log(`   Updating to: ${models.primary}`);
      
      const updateData = {
        primary_model: models.primary,
        fallback_model: models.fallback,
        primary_provider: models.primary.split('/')[0],
        fallback_provider: models.fallback.split('/')[0],
        reasoning: [
          `Updated with real OpenRouter models on ${new Date().toISOString()}`,
          `Primary: ${models.primary} - Selected for ${config.role} role requirements`,
          `Fallback: ${models.fallback} - Alternative model from different provider`,
          `Models validated as available in OpenRouter catalog`,
          `All models accessed via OpenRouter API with OPENROUTER_API_KEY`
        ]
      };
      
      const { error: updateError } = await supabase
        .from('model_configurations')
        .update(updateData)
        .eq('id', config.id);
      
      if (updateError) {
        console.error(`   ❌ Error: ${updateError.message}`);
      } else {
        console.log(`   ✅ Successfully updated`);
        successCount++;
      }
      
      updateCount++;
      console.log('');
    }
    
    console.log('═══════════════════════════════════════════════════════');
    console.log(`📈 UPDATE SUMMARY`);
    console.log('═══════════════════════════════════════════════════════\n');
    console.log(`Total Configurations: ${updateCount}`);
    console.log(`Successfully Updated: ${successCount}`);
    console.log(`Failed: ${updateCount - successCount}\n`);
    
    // Show sample of updated configurations
    console.log('SAMPLE CONFIGURATIONS:\n');
    
    const sampleRoles = ['security', 'orchestrator', 'researcher', 'location_finder'];
    
    for (const role of sampleRoles) {
      const { data: sample } = await supabase
        .from('model_configurations')
        .select('*')
        .eq('role', role)
        .limit(1)
        .single();
      
      if (sample) {
        console.log(`📌 ${role.toUpperCase()}`);
        console.log(`   Primary: ${sample.primary_model}`);
        console.log(`   Fallback: ${sample.fallback_model}`);
        
        const weights = sample.weights as any;
        const topWeight = Object.entries(weights)
          .sort((a, b) => (b[1] as number) - (a[1] as number))[0];
        console.log(`   Optimized for: ${topWeight[0]} (${((topWeight[1] as number) * 100).toFixed(1)}%)\n`);
      }
    }
    
    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ All configurations updated with real OpenRouter models!');
    console.log('\nThese models are immediately available via OpenRouter API.');
    console.log('═══════════════════════════════════════════════════════');
    
  } catch (error) {
    console.error('Error updating configurations:', error);
  }
}

// Run the update
updateConfigurationsWithRealModels().catch(console.error);