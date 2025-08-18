#!/usr/bin/env npx ts-node

/**
 * Test to fetch and display actual OpenRouter models
 * This will show us what models are REALLY available
 */

import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

async function fetchActualOpenRouterModels() {
  console.log('🔍 Fetching ACTUAL models from OpenRouter API...\n');
  
  try {
    const response = await axios.get('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://codequal.ai',
        'X-Title': 'CodeQual Model Research'
      }
    });
    
    const models = response.data.data || [];
    console.log(`Total models available: ${models.length}\n`);
    
    // Find latest models from major providers
    const providers = ['anthropic', 'openai', 'google', 'meta-llama'];
    
    for (const provider of providers) {
      console.log(`\n=== ${provider.toUpperCase()} Models ===`);
      const providerModels = models
        .filter((m: any) => m.id.startsWith(provider + '/'))
        .sort((a: any, b: any) => {
          // Sort by ID to get latest versions
          return b.id.localeCompare(a.id);
        })
        .slice(0, 10); // Show top 10
        
      providerModels.forEach((m: any) => {
        const pricing = m.pricing ? 
          `($${(parseFloat(m.pricing.prompt) * 1000000).toFixed(2)}/$${(parseFloat(m.pricing.completion) * 1000000).toFixed(2)} per M tokens)` : 
          '(no pricing)';
        console.log(`  ${m.id} ${pricing}`);
      });
    }
    
    // Check for specific models we think exist
    console.log('\n=== Checking for specific models ===');
    const checkModels = [
      'anthropic/claude-opus-4-1-20250805',
      'anthropic/claude-opus-4',
      'anthropic/claude-3.5-sonnet',
      'anthropic/claude-3-opus',
      'openai/gpt-5',
      'openai/gpt-4o',
      'openai/o1-preview',
      'google/gemini-2.0-flash-exp',
      'google/gemini-2.5-flash',
      'google/gemini-flash-1.5'
    ];
    
    for (const modelId of checkModels) {
      const exists = models.some((m: any) => m.id === modelId);
      console.log(`  ${modelId}: ${exists ? '✅ EXISTS' : '❌ NOT FOUND'}`);
    }
    
    // Find fastest models
    console.log('\n=== Fastest Models (for AI-Parser) ===');
    const fastKeywords = ['flash', 'haiku', 'turbo', '3.5', 'mini', 'small', 'lite'];
    const fastModels = models
      .filter((m: any) => {
        const id = m.id.toLowerCase();
        return fastKeywords.some(keyword => id.includes(keyword)) &&
               !id.includes('vision') && 
               !id.includes('embed');
      })
      .slice(0, 10);
      
    fastModels.forEach((m: any) => {
      console.log(`  ${m.id}`);
    });
    
    return models;
    
  } catch (error: any) {
    console.error('Failed to fetch OpenRouter models:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return [];
  }
}

// Run the test
fetchActualOpenRouterModels()
  .then(models => {
    console.log(`\n✅ Successfully fetched ${models.length} models from OpenRouter`);
    process.exit(0);
  })
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });