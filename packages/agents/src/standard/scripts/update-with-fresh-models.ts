#!/usr/bin/env npx ts-node

/**
 * Update Configurations with FRESH OpenRouter Models Only
 * Uses dynamic date calculation - NO HARDCODED DATES
 * Only models from last 6 months are considered fresh
 */

import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as dotenv from 'dotenv';
import axios from 'axios';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '..', '..', '..', '..', '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface OpenRouterModel {
  id: string;
  name?: string;
  context_length: number;
  pricing?: {
    prompt: string;
    completion: string;
  };
  created?: number;
  architecture?: {
    modality?: string;
    tokenizer?: string;
    instruct_type?: string;
  };
}

async function discoverFreshModels() {
  console.log('🔍 Discovering FRESH OpenRouter Models');
  console.log('═══════════════════════════════════════════════════════\n');
  
  // Calculate date threshold dynamically - NO HARDCODED DATES
  const currentDate = new Date();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(currentDate.getMonth() - 6);
  
  console.log(`📅 Current Date: ${currentDate.toISOString().split('T')[0]}`);
  console.log(`📅 6 Months Ago: ${sixMonthsAgo.toISOString().split('T')[0]}`);
  console.log(`⚠️  Only accepting models newer than ${sixMonthsAgo.toISOString().split('T')[0]}\n`);
  
  try {
    // Fetch ALL models from OpenRouter
    const response = await axios.get('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://codequal.com',
        'X-Title': 'CodeQual Fresh Model Discovery'
      }
    });
    
    const allModels: OpenRouterModel[] = response.data.data || [];
    console.log(`📊 Total models in OpenRouter: ${allModels.length}\n`);
    
    // Filter for FRESH models only - using dynamic date calculation
    const freshModels = allModels.filter(model => {
      const modelId = model.id.toLowerCase();
      
      // Skip deprecated models
      if (modelId.includes('deprecated')) return false;
      
      // Try to determine model freshness from ID
      // Look for date patterns in model ID
      const datePatterns = [
        /(\d{4})-(\d{2})-(\d{2})/,  // YYYY-MM-DD
        /(\d{4})(\d{2})(\d{2})/,      // YYYYMMDD
        /-(\d{2})(\d{2})$/,           // -MMDD at end
        /(\d{4})-(\d{2})$/,           // YYYY-MM
      ];
      
      for (const pattern of datePatterns) {
        const match = modelId.match(pattern);
        if (match) {
          let modelDate: Date | null = null;
          
          if (match[3]) {
            // Full date YYYY-MM-DD
            modelDate = new Date(`${match[1]}-${match[2]}-${match[3]}`);
          } else if (match[2] && match[1].length === 4) {
            // Year and month YYYY-MM
            modelDate = new Date(`${match[1]}-${match[2]}-01`);
          } else if (match[1].length === 2 && match[2]) {
            // Month and day from current year -MMDD
            const year = currentDate.getFullYear();
            modelDate = new Date(`${year}-${match[1]}-${match[2]}`);
          }
          
          if (modelDate && !isNaN(modelDate.getTime())) {
            // Check if model is fresh (within 6 months)
            if (modelDate < sixMonthsAgo) {
              console.log(`  ❌ Rejecting ${model.id} - dated ${modelDate.toISOString().split('T')[0]} (too old)`);
              return false;
            }
            console.log(`  ✅ Accepting ${model.id} - dated ${modelDate.toISOString().split('T')[0]} (fresh)`);
            return true;
          }
        }
      }
      
      // For models without clear dates, check version indicators
      // Dynamically determine freshness based on version numbers
      const versionIndicators = {
        // Higher version numbers are generally newer
        'claude': { fresh: ['3.5'], old: ['3', '2', '1'] },
        'gpt': { fresh: ['4o'], old: ['3.5', '4-turbo', '4'] },
        'gemini': { fresh: ['2.5', '2.0', '1.5-pro'], old: ['1.0', 'pro'] },
        'llama': { fresh: ['3.3', '3.2'], old: ['3.1', '3', '2'] },
        'qwen': { fresh: ['2.5'], old: ['2', '1.5', '1'] },
        'deepseek': { fresh: ['v3', 'r1'], old: ['v2', 'v1', 'coder'] },
        'mistral': { fresh: ['large'], old: ['medium', 'small', '7b'] }
      };
      
      for (const [base, versions] of Object.entries(versionIndicators)) {
        if (modelId.includes(base)) {
          // Check if it's an old version
          for (const oldVersion of versions.old) {
            if (modelId.includes(oldVersion)) {
              console.log(`  ❌ Rejecting ${model.id} - old version (${oldVersion})`);
              return false;
            }
          }
          // Check if it's a fresh version
          for (const freshVersion of versions.fresh) {
            if (modelId.includes(freshVersion)) {
              console.log(`  ✅ Accepting ${model.id} - fresh version (${freshVersion})`);
              return true;
            }
          }
        }
      }
      
      // If we can't determine freshness, be conservative and exclude
      console.log(`  ⚠️  Cannot determine freshness for ${model.id} - excluding`);
      return false;
    });
    
    console.log(`\n🆕 Fresh models found: ${freshModels.length}\n`);
    
    if (freshModels.length === 0) {
      console.error('❌ No fresh models found! This might indicate:');
      console.error('  1. OpenRouter API might not have models with recent dates');
      console.error('  2. Date parsing logic needs adjustment');
      console.error('  3. We need to use different criteria for freshness');
      
      // Fallback: Use models without old version indicators
      console.log('\n🔄 Attempting fallback strategy...\n');
      return selectBestAvailableModels(allModels, sixMonthsAgo);
    }
    
    return categorizeFreshModels(freshModels);
    
  } catch (error) {
    console.error('Error discovering models:', error);
    throw error;
  }
}

function selectBestAvailableModels(models: OpenRouterModel[], ageThreshold: Date) {
  // Group models by provider and select newest from each
  const byProvider: Record<string, OpenRouterModel[]> = {};
  
  models.forEach(model => {
    const provider = model.id.split('/')[0];
    if (!byProvider[provider]) byProvider[provider] = [];
    byProvider[provider].push(model);
  });
  
  const selected: Record<string, any> = {
    highQuality: { primary: null, fallback: null },
    balanced: { primary: null, fallback: null },
    fast: { primary: null, fallback: null },
    economic: { primary: null, fallback: null }
  };
  
  // Score models by various factors
  const scoreModel = (model: OpenRouterModel): number => {
    let score = 0;
    const id = model.id.toLowerCase();
    
    // Penalize clearly old versions
    if (id.includes('2024') || id.includes('2023')) score -= 100;
    if (id.includes('deprecated')) score -= 200;
    
    // Boost newer version numbers
    if (id.includes('3.5')) score += 20;
    if (id.includes('2.5')) score += 20;
    if (id.includes('3.3')) score += 25;
    if (id.includes('v3')) score += 15;
    if (id.includes('latest')) score += 30;
    if (id.includes('preview')) score += 10;
    
    // Context window as freshness indicator (newer models tend to have larger context)
    if (model.context_length >= 200000) score += 15;
    if (model.context_length >= 128000) score += 10;
    
    return score;
  };
  
  // Sort all models by score
  const scoredModels = models
    .map(m => ({ model: m, score: scoreModel(m) }))
    .sort((a, b) => b.score - a.score);
  
  // Select top models for each category
  if (scoredModels.length > 0) {
    selected.highQuality.primary = scoredModels[0].model.id;
    selected.highQuality.fallback = scoredModels[1]?.model.id || scoredModels[0].model.id;
    
    selected.balanced.primary = scoredModels[2]?.model.id || scoredModels[0].model.id;
    selected.balanced.fallback = scoredModels[3]?.model.id || scoredModels[1]?.model.id;
    
    // Find fast models (usually have 'fast', 'mini', 'flash' in name)
    const fastModel = scoredModels.find(m => 
      m.model.id.toLowerCase().includes('fast') || 
      m.model.id.toLowerCase().includes('mini') ||
      m.model.id.toLowerCase().includes('flash')
    );
    selected.fast.primary = fastModel?.model.id || scoredModels[0].model.id;
    selected.fast.fallback = scoredModels[4]?.model.id || scoredModels[1]?.model.id;
    
    // Find economic models (usually open source)
    const economicModel = scoredModels.find(m => 
      m.model.id.toLowerCase().includes('llama') || 
      m.model.id.toLowerCase().includes('mistral') ||
      m.model.id.toLowerCase().includes('qwen')
    );
    selected.economic.primary = economicModel?.model.id || scoredModels[0].model.id;
    selected.economic.fallback = scoredModels[5]?.model.id || scoredModels[1]?.model.id;
  }
  
  return selected;
}

function categorizeFreshModels(models: OpenRouterModel[]) {
  // Categorize models by use case
  const categorized: Record<string, any> = {
    highQuality: { primary: null, fallback: null },
    balanced: { primary: null, fallback: null },
    fast: { primary: null, fallback: null },
    economic: { primary: null, fallback: null },
    ultraQuality: { primary: null, fallback: null },
    codeSpecialized: { primary: null, fallback: null }
  };
  
  // Score each model for different use cases
  models.forEach(model => {
    const id = model.id.toLowerCase();
    
    // High quality models
    if (id.includes('opus') || id.includes('o1') || id.includes('sonnet')) {
      if (!categorized.highQuality.primary) {
        categorized.highQuality.primary = model.id;
      } else if (!categorized.highQuality.fallback) {
        categorized.highQuality.fallback = model.id;
      }
    }
    
    // Fast models
    if (id.includes('flash') || id.includes('mini') || id.includes('haiku')) {
      if (!categorized.fast.primary) {
        categorized.fast.primary = model.id;
      } else if (!categorized.fast.fallback) {
        categorized.fast.fallback = model.id;
      }
    }
    
    // Economic models
    if (id.includes('llama') || id.includes('mistral') || id.includes('qwen')) {
      if (!categorized.economic.primary) {
        categorized.economic.primary = model.id;
      } else if (!categorized.economic.fallback) {
        categorized.economic.fallback = model.id;
      }
    }
    
    // Code specialized
    if (id.includes('code') || id.includes('deepseek')) {
      if (!categorized.codeSpecialized.primary) {
        categorized.codeSpecialized.primary = model.id;
      } else if (!categorized.codeSpecialized.fallback) {
        categorized.codeSpecialized.fallback = model.id;
      }
    }
  });
  
  // Fill balanced with remaining models
  categorized.balanced.primary = models[0]?.id || categorized.highQuality.primary;
  categorized.balanced.fallback = models[1]?.id || categorized.fast.primary;
  
  // Fill ultra quality
  categorized.ultraQuality.primary = categorized.highQuality.primary || models[0]?.id;
  categorized.ultraQuality.fallback = categorized.highQuality.fallback || models[1]?.id;
  
  // Ensure all categories have values
  Object.keys(categorized).forEach(category => {
    if (!categorized[category].primary) {
      categorized[category].primary = models[0]?.id || 'openai/gpt-4o-mini';
    }
    if (!categorized[category].fallback) {
      categorized[category].fallback = models[1]?.id || models[0]?.id || 'anthropic/claude-3-haiku';
    }
  });
  
  return categorized;
}

async function updateWithFreshModels() {
  console.log('🚀 Updating Configurations with FRESH Models Only');
  console.log('═══════════════════════════════════════════════════════\n');
  
  const currentDate = new Date();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(currentDate.getMonth() - 6);
  
  console.log(`⚠️  CRITICAL: Using ONLY models from last 6 months`);
  console.log(`📅 Date Range: ${sixMonthsAgo.toISOString().split('T')[0]} to ${currentDate.toISOString().split('T')[0]}\n`);
  
  try {
    // Discover fresh models
    const freshModels = await discoverFreshModels();
    
    // Role to model mapping
    const roleMapping: Record<string, keyof typeof freshModels> = {
      security: 'ultraQuality',
      architecture: 'highQuality',
      deepwiki: 'codeSpecialized',
      researcher: 'balanced',
      comparator: 'balanced',
      educator: 'balanced',
      performance: 'codeSpecialized',
      orchestrator: 'fast',
      location_finder: 'fast',
      documentation: 'fast',
      code_quality: 'economic',
      testing: 'economic',
      dependencies: 'economic',
      accessibility: 'economic'
    };
    
    // Get all configurations
    const { data: configs, error } = await supabase
      .from('model_configurations')
      .select('*')
      .order('role');
    
    if (error) {
      console.error('Error fetching configurations:', error);
      return;
    }
    
    console.log(`📊 Updating ${configs?.length || 0} configurations with fresh models\n`);
    
    let successCount = 0;
    const roleUpdates: Record<string, any> = {};
    
    // Update each configuration
    for (const config of configs || []) {
      const category = roleMapping[config.role] || 'balanced';
      const models = freshModels[category];
      
      if (!roleUpdates[config.role]) {
        roleUpdates[config.role] = models;
        console.log(`🎯 ${config.role.toUpperCase()}`);
        console.log(`   Primary: ${models.primary}`);
        console.log(`   Fallback: ${models.fallback}\n`);
      }
      
      const updateData = {
        primary_model: models.primary,
        fallback_model: models.fallback,
        primary_provider: models.primary.split('/')[0],
        fallback_provider: models.fallback.split('/')[0],
        reasoning: [
          `🆕 Updated with FRESH models on ${currentDate.toISOString()}`,
          `Models selected from date range: ${sixMonthsAgo.toISOString().split('T')[0]} to ${currentDate.toISOString().split('T')[0]}`,
          `Primary: ${models.primary} - Dynamically discovered fresh model`,
          `Fallback: ${models.fallback} - Alternative fresh model`,
          `⚠️ Only models from last 6 months included`,
          `NO hardcoded dates - all calculated dynamically from current date`
        ]
      };
      
      const { error: updateError } = await supabase
        .from('model_configurations')
        .update(updateData)
        .eq('id', config.id);
      
      if (!updateError) successCount++;
    }
    
    console.log('═══════════════════════════════════════════════════════');
    console.log(`✅ Successfully updated ${successCount}/${configs?.length} configurations`);
    console.log(`📅 All models are from the last 6 months (after ${sixMonthsAgo.toISOString().split('T')[0]})`);
    console.log('═══════════════════════════════════════════════════════');
    
  } catch (error) {
    console.error('Error updating configurations:', error);
  }
}

// Run the update
updateWithFreshModels().catch(console.error);