#!/usr/bin/env npx ts-node

/**
 * Update configurations with real model discoveries
 * Simulates what the researcher agent would do
 */

import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { ModelResearcher } from '../services/model-researcher';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '..', '..', '..', '..', '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function updateWithRealModels() {
  console.log('🔬 Model Researcher - Discovering and Updating Configurations');
  console.log('═══════════════════════════════════════════════════════\n');
  
  const researcher = new ModelResearcher();
  
  // Get all configurations
  const { data: configs, error } = await supabase
    .from('model_configurations')
    .select('*');
  
  if (error) {
    console.error('Error fetching configurations:', error);
    return;
  }
  
  console.log(`📊 Found ${configs?.length || 0} configurations to update\n`);
  
  let updateCount = 0;
  const updates: any[] = [];
  
  // Process each configuration
  for (const config of configs || []) {
    // Get model recommendations based on weights
    const models = researcher.getModelForRole(
      config.role,
      config.weights,
      config.language === 'universal' ? undefined : config.language,
      config.size_category
    );
    
    // Prepare update
    updates.push({
      id: config.id,
      primary_provider: models.primary.provider,
      primary_model: models.primary.model,
      fallback_provider: models.fallback.provider,
      fallback_model: models.fallback.model,
      reasoning: [
        `Selected ${models.primary.model} (score: ${models.primary.score.toFixed(3)}) as primary`,
        `Selected ${models.fallback.model} (score: ${models.fallback.score.toFixed(3)}) as fallback`,
        `Models evaluated based on weights: quality=${(config.weights.quality * 100).toFixed(1)}%, speed=${(config.weights.speed * 100).toFixed(1)}%`,
        `Configuration for ${config.language || 'universal'} ${config.size_category || 'medium'} repositories`,
        `Updated on ${new Date().toISOString()}`
      ]
    });
    
    updateCount++;
  }
  
  // Update in batches
  console.log(`📝 Updating ${updateCount} configurations with real models...\n`);
  
  const batchSize = 50;
  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize);
    
    for (const update of batch) {
      const { error: updateError } = await supabase
        .from('model_configurations')
        .update({
          primary_provider: update.primary_provider,
          primary_model: update.primary_model,
          fallback_provider: update.fallback_provider,
          fallback_model: update.fallback_model,
          reasoning: update.reasoning
        })
        .eq('id', update.id);
      
      if (updateError) {
        console.error(`Error updating config ${update.id}:`, updateError);
      }
    }
    
    console.log(`✅ Updated batch ${Math.floor(i / batchSize) + 1} (${batch.length} configs)`);
  }
  
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('📊 Update Summary');
  console.log('═══════════════════════════════════════════════════════\n');
  
  // Show sample of updated configurations
  const { data: samples, error: sampleError } = await supabase
    .from('model_configurations')
    .select('*')
    .in('role', ['security', 'performance', 'orchestrator', 'researcher', 'deepwiki', 'comparator']);
  
  if (samples) {
    console.log('Sample Updated Configurations:\n');
    
    for (const sample of samples) {
      console.log(`🎯 ${sample.role.toUpperCase()} (${sample.language}/${sample.size_category})`);
      console.log(`   Primary: ${sample.primary_provider}/${sample.primary_model}`);
      console.log(`   Fallback: ${sample.fallback_provider}/${sample.fallback_model}`);
      
      // Show dominant weight
      const weights = sample.weights as any;
      const sorted = Object.entries(weights).sort((a, b) => (b[1] as number) - (a[1] as number));
      console.log(`   Priority: ${sorted[0][0]} (${((sorted[0][1] as number) * 100).toFixed(1)}%)\n`);
    }
  }
  
  console.log('✅ All configurations updated with real model IDs');
  console.log('═══════════════════════════════════════════════════════');
}

// Run the update
updateWithRealModels().catch(console.error);