#!/usr/bin/env npx ts-node

/**
 * Update Weights Only for Existing Configurations
 * This script updates the weights for all existing configurations
 * without changing the model selections
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Role-specific weights optimized for each task type
function getWeightsForRole(role: string, size: string = 'medium'): Record<string, number> {
  const baseWeights: Record<string, Record<string, number>> = {
    // High accuracy required (quality > speed)
    security: { quality: 0.50, speed: 0.10, cost: 0.20, freshness: 0.15, contextWindow: 0.05 },
    architecture: { quality: 0.40, speed: 0.15, cost: 0.20, freshness: 0.10, contextWindow: 0.15 },
    
    // Balance between quality and speed
    performance: { quality: 0.35, speed: 0.25, cost: 0.25, freshness: 0.05, contextWindow: 0.10 },
    dependency: { quality: 0.35, speed: 0.20, cost: 0.25, freshness: 0.10, contextWindow: 0.10 },
    deepwiki: { quality: 0.45, speed: 0.15, cost: 0.20, freshness: 0.10, contextWindow: 0.10 },
    
    // Cost-optimized (cost > quality)
    code_quality: { quality: 0.25, speed: 0.25, cost: 0.35, freshness: 0.05, contextWindow: 0.10 },
    testing: { quality: 0.30, speed: 0.20, cost: 0.35, freshness: 0.05, contextWindow: 0.10 },
    documentation: { quality: 0.25, speed: 0.30, cost: 0.30, freshness: 0.05, contextWindow: 0.10 },
    
    // Speed-optimized (speed > quality)
    comparator: { quality: 0.30, speed: 0.35, cost: 0.25, freshness: 0.05, contextWindow: 0.05 },
    location_finder: { quality: 0.25, speed: 0.40, cost: 0.25, freshness: 0.05, contextWindow: 0.05 },
    orchestrator: { quality: 0.25, speed: 0.40, cost: 0.25, freshness: 0.05, contextWindow: 0.05 },
    
    // Special roles
    researcher: { quality: 0.35, speed: 0.15, cost: 0.15, freshness: 0.25, contextWindow: 0.10 },
    educator: { quality: 0.30, speed: 0.35, cost: 0.20, freshness: 0.05, contextWindow: 0.10 }
  };
  
  let weights = { ...(baseWeights[role] || baseWeights.code_quality) };
  
  // Adjust for repository size
  if (size === 'large') {
    weights.contextWindow *= 1.5;  // Large repos need more context
    weights.quality *= 1.1;         // Quality more important for complex codebases
  } else if (size === 'small') {
    weights.speed *= 1.3;           // Small repos can prioritize speed
    weights.cost *= 0.8;            // Cost less critical for small analyses
  }
  
  // Normalize weights to sum to 1
  const sum = Object.values(weights).reduce((a: number, b: number) => a + b, 0);
  Object.keys(weights).forEach(key => {
    weights[key] = weights[key] / sum;
  });
  
  return weights;
}

async function updateWeights() {
  console.log('🔧 Updating Weights for All Configurations');
  console.log('=' .repeat(60));
  
  // Get all existing configurations
  const { data: configs, error } = await supabase
    .from('model_configurations')
    .select('*');
  
  if (error) {
    console.error('❌ Error fetching configurations:', error);
    return;
  }
  
  console.log(`\n📊 Found ${configs?.length || 0} configurations to update`);
  
  let updated = 0;
  let failed = 0;
  
  for (const config of configs || []) {
    const newWeights = getWeightsForRole(config.role, config.size_category);
    
    // Update the configuration with new weights
    const { error: updateError } = await supabase
      .from('model_configurations')
      .update({ 
        weights: newWeights,
        updated_by: 'weight-update-script',
        last_updated: new Date().toISOString()
      })
      .eq('id', config.id);
    
    if (updateError) {
      console.error(`❌ Failed to update ${config.role}/${config.language}/${config.size_category}:`, updateError);
      failed++;
    } else {
      updated++;
      if (updated % 10 === 0) {
        console.log(`   Updated ${updated} configurations...`);
      }
    }
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('📈 Update Summary:');
  console.log(`   ✅ Successfully updated: ${updated}`);
  console.log(`   ❌ Failed updates: ${failed}`);
  
  // Show sample of updated weights
  console.log('\n📊 Sample Weight Distributions:');
  const sampleRoles = ['security', 'code_quality', 'performance', 'location_finder'];
  
  for (const role of sampleRoles) {
    const weights = getWeightsForRole(role, 'medium');
    console.log(`\n${role}:`);
    console.log(`   Quality: ${(weights.quality * 100).toFixed(0)}%`);
    console.log(`   Speed:   ${(weights.speed * 100).toFixed(0)}%`);
    console.log(`   Cost:    ${(weights.cost * 100).toFixed(0)}%`);
  }
  
  console.log('\n✅ Weight update completed!');
}

// Run the update
updateWeights().catch(console.error);