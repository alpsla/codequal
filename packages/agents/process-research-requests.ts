#!/usr/bin/env npx ts-node

/**
 * Process Research Requests
 * Simulates the Researcher agent processing model update requests
 */

import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function processResearchRequests() {
  console.log('🔬 Processing Research Requests for Model Updates\n');
  console.log('=' .repeat(60));
  
  try {
    // Fetch pending research requests
    const { data: requests, error } = await supabase
      .from('research_requests')
      .select('*')
      .eq('status', 'pending')
      .eq('request_type', 'model_config_update')
      .order('requested_at', { ascending: true });
    
    if (error) {
      console.error('Failed to fetch requests:', error);
      return;
    }
    
    if (!requests || requests.length === 0) {
      console.log('📭 No pending research requests');
      return;
    }
    
    console.log(`📬 Found ${requests.length} pending research requests\n`);
    
    for (const request of requests) {
      console.log(`\n📋 Processing Request #${request.id}`);
      console.log(`   Role: ${request.role}`);
      console.log(`   Failed Model: ${request.metadata?.failed_model}`);
      console.log(`   Requested By: ${request.requested_by}`);
      console.log(`   Requested At: ${request.requested_at}`);
      
      // Simulate researcher finding a better model
      const newModel = await findReplacementModel(request);
      
      if (newModel) {
        // Update the model configuration
        await updateModelConfiguration(request, newModel);
        
        // Mark request as processed
        await supabase
          .from('research_requests')
          .update({
            status: 'completed',
            processed_at: new Date().toISOString(),
            result: {
              action: 'model_updated',
              old_model: request.metadata?.failed_model,
              new_model: newModel.primary_model,
              reasoning: newModel.reasoning
            }
          })
          .eq('id', request.id);
        
        console.log(`   ✅ Updated configuration with new model: ${newModel.primary_model}`);
      } else {
        // Mark as failed if no replacement found
        await supabase
          .from('research_requests')
          .update({
            status: 'failed',
            processed_at: new Date().toISOString(),
            result: {
              action: 'no_replacement_found',
              reason: 'Could not find suitable replacement model'
            }
          })
          .eq('id', request.id);
        
        console.log(`   ❌ No suitable replacement model found`);
      }
    }
    
    console.log('\n' + '=' .repeat(60));
    console.log('✅ Research request processing complete');
    
    // Show summary
    await showUpdatedConfigurations();
    
  } catch (error) {
    console.error('❌ Error processing requests:', error);
  }
}

async function findReplacementModel(request: any) {
  console.log('   🔍 Researching replacement models...');
  
  // Map failed models to working alternatives
  const replacementMap: Record<string, any> = {
    'google/gemini-2.5-flash-image-preview:free': {
      primary_model: 'anthropic/claude-3.5-haiku',
      primary_provider: 'openrouter',
      fallback_model: 'anthropic/claude-3-haiku',
      fallback_provider: 'openrouter',
      reasoning: [
        'Google Gemini model endpoint no longer available',
        'Claude 3.5 Haiku provides similar performance',
        'Good balance of speed and quality for this role'
      ]
    },
    'google/gemini-2.5-flash-image-preview': {
      primary_model: 'anthropic/claude-3.5-haiku',
      primary_provider: 'openrouter',
      fallback_model: 'anthropic/claude-3-haiku',
      fallback_provider: 'openrouter',
      reasoning: [
        'Google Gemini model endpoint deprecated',
        'Claude 3.5 Haiku is current best alternative',
        'Similar cost and performance profile'
      ]
    },
    'deepseek/deepseek-chat-v3.1:free': {
      primary_model: 'deepseek/deepseek-chat',
      primary_provider: 'openrouter',
      fallback_model: 'anthropic/claude-3-haiku',
      fallback_provider: 'openrouter',
      reasoning: [
        'DeepSeek free tier discontinued',
        'Using paid DeepSeek tier as primary',
        'Claude Haiku as reliable fallback'
      ]
    },
    'anthropic/claude-3-sonnet-20240229': {
      primary_model: 'anthropic/claude-3.5-sonnet',
      primary_provider: 'openrouter',
      fallback_model: 'anthropic/claude-3.5-haiku',
      fallback_provider: 'openrouter',
      reasoning: [
        'Old Claude 3 Sonnet version deprecated',
        'Upgraded to Claude 3.5 Sonnet',
        'Better performance and same cost tier'
      ]
    },
    'anthropic/claude-3-haiku-20240307': {
      primary_model: 'anthropic/claude-3.5-haiku',
      primary_provider: 'openrouter',
      fallback_model: 'anthropic/claude-3-haiku',
      fallback_provider: 'openrouter',
      reasoning: [
        'Old Claude 3 Haiku version deprecated',
        'Upgraded to Claude 3.5 Haiku',
        'Improved capabilities at similar cost'
      ]
    }
  };
  
  const failedModel = request.metadata?.failed_model;
  const replacement = replacementMap[failedModel];
  
  if (replacement) {
    // Simulate research time
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('   ✅ Found suitable replacement');
    return {
      ...replacement,
      role: request.role,
      language: request.language,
      size_category: request.size_category
    };
  }
  
  // Try to find a generic good model if specific replacement not found
  if (!replacement && failedModel) {
    console.log('   🔄 Using generic fallback strategy');
    return {
      primary_model: 'anthropic/claude-3.5-haiku',
      primary_provider: 'openrouter',
      fallback_model: 'anthropic/claude-3-haiku',
      fallback_provider: 'openrouter',
      role: request.role,
      language: request.language,
      size_category: request.size_category,
      reasoning: [
        'Generic fallback for unavailable model',
        'Claude 3.5 Haiku is reliable and cost-effective',
        'Suitable for most analysis tasks'
      ]
    };
  }
  
  return null;
}

async function updateModelConfiguration(request: any, newConfig: any) {
  console.log('   📝 Updating model configuration in Supabase...');
  
  try {
    // Check if configuration exists
    const { data: existing } = await supabase
      .from('model_configurations')
      .select('id')
      .eq('role', newConfig.role)
      .eq('language', newConfig.language || null)
      .eq('size_category', newConfig.size_category || null)
      .single();
    
    const configData = {
      role: newConfig.role,
      language: newConfig.language,
      size_category: newConfig.size_category,
      primary_model: newConfig.primary_model,
      primary_provider: newConfig.primary_provider,
      fallback_model: newConfig.fallback_model,
      fallback_provider: newConfig.fallback_provider,
      weights: {
        quality: 0.8,
        speed: 0.7,
        cost: 0.6,
        freshness: 0.9,
        contextWindow: 0.7
      },
      reasoning: newConfig.reasoning,
      min_requirements: {
        contextWindow: 32000,
        maxLatency: 5000
      },
      last_updated: new Date().toISOString(),
      updated_by: 'researcher_agent'
    };
    
    if (existing?.id) {
      // Update existing configuration
      await supabase
        .from('model_configurations')
        .update(configData)
        .eq('id', existing.id);
    } else {
      // Insert new configuration
      await supabase
        .from('model_configurations')
        .insert(configData);
    }
    
    console.log('   ✅ Configuration updated successfully');
    
  } catch (error) {
    console.error('   ❌ Failed to update configuration:', error);
  }
}

async function showUpdatedConfigurations() {
  console.log('\n📊 Current Model Configurations:');
  
  const { data: configs } = await supabase
    .from('model_configurations')
    .select('*')
    .order('last_updated', { ascending: false, nullsFirst: false })
    .limit(10);
  
  if (configs && configs.length > 0) {
    console.log('\nRecently Updated:');
    configs.forEach((config: any) => {
      const updatedBy = config.updated_by || 'system';
      const timeSinceUpdate = Math.round((Date.now() - new Date(config.updated_at).getTime()) / 1000 / 60);
      console.log(`  - ${config.role}: ${config.primary_model}`);
      console.log(`    Updated ${timeSinceUpdate} minutes ago by ${updatedBy}`);
    });
  }
}

// Run the processor
processResearchRequests().catch(console.error);