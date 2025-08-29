#!/usr/bin/env npx ts-node

/**
 * Retrieve actual configurations from Supabase
 * Shows what's really stored for each role
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

async function retrieveActualConfigs() {
  console.log('🔍 Retrieving Actual Configurations from Supabase\n');
  console.log('═══════════════════════════════════════════════════════\n');
  
  // Get unique roles
  const { data: rolesData, error: rolesError } = await supabase
    .from('model_configurations')
    .select('role')
    .order('role');
  
  if (rolesError) {
    console.error('Error fetching roles:', rolesError);
    return;
  }
  
  const uniqueRoles = [...new Set(rolesData?.map(r => r.role) || [])];
  console.log(`Found ${uniqueRoles.length} unique roles\n`);
  
  // Get one config for each role
  for (const role of uniqueRoles.sort()) {
    const { data, error } = await supabase
      .from('model_configurations')
      .select('*')
      .eq('role', role)
      .limit(1)
      .single();
    
    if (error) {
      console.error(`Error fetching ${role}:`, error);
      continue;
    }
    
    if (data) {
      console.log(`═══════════════════════════════════════════════════════`);
      console.log(`🎯 Role: ${role.toUpperCase()}`);
      console.log(`═══════════════════════════════════════════════════════`);
      
      // Basic info
      console.log(`\n📋 Basic Configuration:`);
      console.log(`   Language: ${data.language || 'N/A'}`);
      console.log(`   Size Category: ${data.size_category || 'N/A'}`);
      
      // Model configuration
      console.log(`\n🤖 Model Selection:`);
      console.log(`   Primary Provider: ${data.primary_provider}`);
      console.log(`   Primary Model: ${data.primary_model}`);
      console.log(`   Fallback Provider: ${data.fallback_provider}`);
      console.log(`   Fallback Model: ${data.fallback_model}`);
      
      // Weights
      console.log(`\n⚖️  Weights Distribution:`);
      const weights = data.weights as any;
      if (weights) {
        const sortedWeights = Object.entries(weights)
          .sort((a, b) => (b[1] as number) - (a[1] as number));
        
        for (const [key, value] of sortedWeights) {
          const percentage = ((value as number) * 100).toFixed(1);
          const bar = '█'.repeat(Math.floor((value as number) * 50));
          console.log(`   ${key.padEnd(15)} ${percentage.padStart(5)}% ${bar}`);
        }
        
        // Find dominant weight
        const dominant = sortedWeights[0];
        console.log(`\n   🔝 Dominant Factor: ${dominant[0]} (${((dominant[1] as number) * 100).toFixed(1)}%)`);
      }
      
      // Reasoning
      console.log(`\n📝 Reasoning:`);
      if (data.reasoning && Array.isArray(data.reasoning)) {
        data.reasoning.forEach((reason: string, idx: number) => {
          console.log(`   ${idx + 1}. ${reason}`);
        });
      }
      
      // Timestamps
      console.log(`\n⏰ Metadata:`);
      console.log(`   Created: ${new Date(data.created_at).toLocaleString()}`);
      console.log(`   Updated: ${new Date(data.updated_at).toLocaleString()}`);
      
      console.log('');
    }
  }
  
  // Show summary statistics
  console.log('═══════════════════════════════════════════════════════');
  console.log('📊 SUMMARY STATISTICS');
  console.log('═══════════════════════════════════════════════════════\n');
  
  // Count by provider
  const { data: providerStats } = await supabase
    .from('model_configurations')
    .select('primary_provider, fallback_provider');
  
  if (providerStats) {
    const providerCounts: Record<string, number> = {};
    providerStats.forEach(config => {
      providerCounts[config.primary_provider] = (providerCounts[config.primary_provider] || 0) + 1;
      providerCounts[config.fallback_provider] = (providerCounts[config.fallback_provider] || 0) + 1;
    });
    
    console.log('Provider Usage:');
    Object.entries(providerCounts).forEach(([provider, count]) => {
      console.log(`   ${provider}: ${count} configurations`);
    });
  }
  
  // Count by language
  const { data: langStats } = await supabase
    .from('model_configurations')
    .select('language');
  
  if (langStats) {
    const langCounts: Record<string, number> = {};
    langStats.forEach(config => {
      langCounts[config.language] = (langCounts[config.language] || 0) + 1;
    });
    
    console.log('\nLanguage Distribution:');
    Object.entries(langCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([lang, count]) => {
        console.log(`   ${lang}: ${count} configurations`);
      });
  }
  
  // Check if models are placeholder or real
  const { data: modelCheck } = await supabase
    .from('model_configurations')
    .select('primary_model, fallback_model')
    .limit(5);
  
  console.log('\n🔍 Model Discovery Status:');
  if (modelCheck && modelCheck.length > 0) {
    const isPlaceholder = modelCheck[0].primary_model === 'discovered_model_id';
    if (isPlaceholder) {
      console.log('   ⚠️  Models are PLACEHOLDER values');
      console.log('   📝 Researcher agent needs to discover actual models');
      console.log('   🔄 Run researcher to populate with real model IDs');
    } else {
      console.log('   ✅ Models appear to be REAL discoveries');
      console.log('   Sample models found:');
      const uniqueModels = new Set<string>();
      modelCheck.forEach(m => {
        uniqueModels.add(m.primary_model);
        uniqueModels.add(m.fallback_model);
      });
      [...uniqueModels].slice(0, 6).forEach(model => {
        console.log(`      - ${model}`);
      });
    }
  }
  
  console.log('\n═══════════════════════════════════════════════════════');
}

// Run the script
retrieveActualConfigs().catch(console.error);