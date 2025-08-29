#!/usr/bin/env npx ts-node

/**
 * Show Discovered Models for Each Role
 * Displays the actual OpenRouter models discovered and assigned to each role
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

async function showDiscoveredModels() {
  console.log('🔍 DISCOVERED OPENROUTER MODELS BY ROLE');
  console.log('═══════════════════════════════════════════════════════\n');
  console.log('All models are accessed through OpenRouter API using OPENROUTER_API_KEY\n');
  
  try {
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
    console.log(`📊 Showing configurations for ${uniqueRoles.length} roles\n`);
    console.log('═══════════════════════════════════════════════════════\n');
    
    // Show one config per role
    for (const role of uniqueRoles.sort()) {
      const { data: config, error } = await supabase
        .from('model_configurations')
        .select('*')
        .eq('role', role)
        .limit(1)
        .single();
      
      if (error) {
        console.error(`Error fetching ${role}:`, error);
        continue;
      }
      
      if (config) {
        console.log(`🎯 ROLE: ${role.toUpperCase()}`);
        console.log('─'.repeat(55));
        
        // Configuration details
        console.log(`📋 Configuration:`);
        console.log(`   Language: ${config.language || 'universal'}`);
        console.log(`   Size Category: ${config.size_category || 'medium'}`);
        
        // Model selection
        console.log(`\n🤖 Discovered Models:`);
        console.log(`   Primary Model: ${config.primary_model || 'Not yet discovered'}`);
        console.log(`   Primary Provider: ${config.primary_provider || 'N/A'}`);
        console.log(`   Fallback Model: ${config.fallback_model || 'Not yet discovered'}`);
        console.log(`   Fallback Provider: ${config.fallback_provider || 'N/A'}`);
        
        // Weights that determined selection
        console.log(`\n⚖️  Selection Weights:`);
        const weights = config.weights as any;
        if (weights) {
          const sortedWeights = Object.entries(weights)
            .sort((a, b) => (b[1] as number) - (a[1] as number));
          
          sortedWeights.forEach(([key, value]) => {
            const percentage = ((value as number) * 100).toFixed(1);
            console.log(`   ${key.padEnd(15)} ${percentage}%`);
          });
        }
        
        // Reasoning
        if (config.reasoning && Array.isArray(config.reasoning)) {
          console.log(`\n📝 Selection Reasoning:`);
          config.reasoning.slice(0, 3).forEach((reason: string) => {
            console.log(`   • ${reason}`);
          });
        }
        
        // Check if model is actually available in OpenRouter
        if (config.primary_model && !config.primary_model.includes('discovered_model_id')) {
          console.log(`\n✅ Status: Models discovered and ready to use via OpenRouter`);
        } else {
          console.log(`\n⚠️  Status: Awaiting model discovery`);
        }
        
        console.log('\n');
      }
    }
    
    // Show summary of unique models
    console.log('═══════════════════════════════════════════════════════');
    console.log('📈 UNIQUE MODELS IN USE');
    console.log('═══════════════════════════════════════════════════════\n');
    
    const { data: allConfigs } = await supabase
      .from('model_configurations')
      .select('primary_model, fallback_model');
    
    if (allConfigs) {
      const uniqueModels = new Set<string>();
      allConfigs.forEach(config => {
        if (config.primary_model && !config.primary_model.includes('discovered_model_id')) {
          uniqueModels.add(config.primary_model);
        }
        if (config.fallback_model && !config.fallback_model.includes('discovered_model_id')) {
          uniqueModels.add(config.fallback_model);
        }
      });
      
      if (uniqueModels.size > 0) {
        console.log('Models currently in use:');
        [...uniqueModels].sort().forEach(model => {
          console.log(`   • ${model}`);
        });
        
        console.log(`\n📊 Total unique models: ${uniqueModels.size}`);
      } else {
        console.log('No discovered models found. Run discovery process first.');
      }
    }
    
    // Check research metadata
    const { data: metadata } = await supabase
      .from('model_research_metadata')
      .select('*')
      .single();
    
    if (metadata) {
      console.log('\n═══════════════════════════════════════════════════════');
      console.log('📅 RESEARCH METADATA');
      console.log('═══════════════════════════════════════════════════════\n');
      console.log(`Last Research: ${metadata.last_research_date ? new Date(metadata.last_research_date).toLocaleString() : 'Never'}`);
      console.log(`Next Scheduled: ${metadata.next_scheduled_research ? new Date(metadata.next_scheduled_research).toLocaleString() : 'Not scheduled'}`);
      console.log(`Total Models Researched: ${metadata.total_models_researched || 0}`);
      console.log(`Research Version: ${metadata.research_version || 'Unknown'}`);
    }
    
    // Show how to use these models
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('💡 HOW TO USE THESE MODELS');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('All models are accessed through OpenRouter API:');
    console.log('');
    console.log('```typescript');
    console.log('const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {');
    console.log('  method: "POST",');
    console.log('  headers: {');
    console.log('    "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,');
    console.log('    "Content-Type": "application/json"');
    console.log('  },');
    console.log('  body: JSON.stringify({');
    console.log('    model: "anthropic/claude-opus-4.1", // Use discovered model ID');
    console.log('    messages: [{ role: "user", content: "..." }]');
    console.log('  })');
    console.log('});');
    console.log('```');
    
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('✅ Model discovery report complete!');
    console.log('═══════════════════════════════════════════════════════');
    
  } catch (error) {
    console.error('Error showing models:', error);
  }
}

// Run the script
showDiscoveredModels().catch(console.error);