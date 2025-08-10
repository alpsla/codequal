#!/usr/bin/env ts-node

/**
 * Check what models are actually available in OpenRouter
 * This will show us if models like anthropic/claude-opus-4.1 exist
 */

import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkOpenRouterModels() {
  console.log('🔍 Fetching actual models from OpenRouter API...\n');
  console.log('=' .repeat(80));
  
  const apiKey = process.env.OPENROUTER_API_KEY;
  
  if (!apiKey) {
    console.error('❌ OPENROUTER_API_KEY not found in environment');
    console.log('\nPlease set OPENROUTER_API_KEY in your .env file');
    return;
  }
  
  try {
    const response = await axios.get('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://codequal.com',
        'X-Title': 'CodeQual Model Check'
      }
    });
    
    const models = response.data.data || [];
    console.log(`\nTotal models available: ${models.length}\n`);
    
    // Check for specific latest models
    const latestModelsToCheck = [
      'anthropic/claude-opus-4.1',
      'anthropic/claude-4.1',
      'anthropic/claude-4',
      'openai/gpt-5',
      'openai/gpt-4.5',
      'google/gemini-2.5',
      'google/gemini-3.0',
    ];
    
    console.log('📋 Checking for latest models:\n');
    console.log('-'.repeat(50));
    
    for (const modelToCheck of latestModelsToCheck) {
      const found = models.find((m: any) => 
        m.id === modelToCheck || 
        m.id.toLowerCase() === modelToCheck.toLowerCase()
      );
      
      if (found) {
        console.log(`✅ FOUND: ${modelToCheck}`);
        console.log(`   Context: ${found.context_length?.toLocaleString()} tokens`);
        console.log(`   Pricing: $${found.pricing?.prompt}/M input, $${found.pricing?.completion}/M output`);
      } else {
        console.log(`❌ NOT FOUND: ${modelToCheck}`);
      }
    }
    
    // Show all Anthropic models
    console.log('\n📊 All Anthropic models in OpenRouter:\n');
    console.log('-'.repeat(50));
    const anthropicModels = models
      .filter((m: any) => m.id.startsWith('anthropic/'))
      .sort((a: any, b: any) => a.id.localeCompare(b.id));
    
    for (const model of anthropicModels) {
      console.log(`• ${model.id}`);
      if (model.id.includes('4') || model.id.includes('opus')) {
        console.log(`  ⭐ Potential Claude 4.x model`);
      }
    }
    
    // Show all OpenAI models
    console.log('\n📊 All OpenAI models in OpenRouter:\n');
    console.log('-'.repeat(50));
    const openaiModels = models
      .filter((m: any) => m.id.startsWith('openai/'))
      .sort((a: any, b: any) => a.id.localeCompare(b.id));
    
    for (const model of openaiModels) {
      console.log(`• ${model.id}`);
      if (model.id.includes('5') || model.id.includes('4.5')) {
        console.log(`  ⭐ Potential GPT-5 or GPT-4.5 model`);
      }
    }
    
    // Show all Google models
    console.log('\n📊 All Google models in OpenRouter:\n');
    console.log('-'.repeat(50));
    const googleModels = models
      .filter((m: any) => m.id.startsWith('google/'))
      .sort((a: any, b: any) => a.id.localeCompare(b.id));
    
    for (const model of googleModels) {
      console.log(`• ${model.id}`);
      if (model.id.includes('2.5') || model.id.includes('3')) {
        console.log(`  ⭐ Potential Gemini 2.5+ model`);
      }
    }
    
    // Find newest models by looking at IDs with dates or version numbers
    console.log('\n🆕 Models with recent dates or high version numbers:\n');
    console.log('-'.repeat(50));
    
    const recentModels = models
      .filter((m: any) => {
        const id = m.id.toLowerCase();
        // Check for 2024/2025 dates
        const has2025 = id.includes('2025');
        const has2024Late = id.includes('2024-1') || id.includes('2024-12');
        // Check for high version numbers
        const hasHighVersion = /[4-9]\.\d/.test(id) || /v[4-9]/.test(id);
        
        return has2025 || has2024Late || hasHighVersion;
      })
      .sort((a: any, b: any) => b.id.localeCompare(a.id));
    
    for (const model of recentModels.slice(0, 10)) {
      console.log(`• ${model.id}`);
      console.log(`  Context: ${model.context_length?.toLocaleString()} tokens`);
    }
    
    console.log('\n' + '=' .repeat(80));
    console.log('\n📝 Summary:');
    console.log(`Total models available: ${models.length}`);
    console.log(`Anthropic models: ${anthropicModels.length}`);
    console.log(`OpenAI models: ${openaiModels.length}`);
    console.log(`Google models: ${googleModels.length}`);
    
  } catch (error: any) {
    console.error('❌ Failed to fetch models:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the check
checkOpenRouterModels()
  .then(() => {
    console.log('\n✅ Check completed');
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });