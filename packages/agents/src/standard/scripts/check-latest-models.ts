#!/usr/bin/env npx ts-node

/**
 * Check for LATEST models in OpenRouter
 * Focus on models released in 2024-2025 only
 */

import axios from 'axios';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '..', '..', '..', '..', '.env') });

async function checkLatestModels() {
  console.log('🔍 Checking for LATEST OpenRouter Models (2024-2025 only)');
  console.log('═══════════════════════════════════════════════════════\n');
  
  try {
    const response = await axios.get('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://codequal.com',
        'X-Title': 'CodeQual Latest Model Check'
      }
    });
    
    const models = response.data.data || [];
    console.log(`Total models available: ${models.length}\n`);
    
    // Filter for LATEST models only
    const latestModels = models.filter((model: any) => {
      const id = model.id.toLowerCase();
      
      // Latest model indicators
      const isLatest = 
        // Claude latest versions
        id.includes('claude-3.5-sonnet-20241022') ||
        id.includes('claude-3.5-haiku') ||
        id.includes('claude-3-5-sonnet-latest') ||
        // GPT latest versions  
        id.includes('gpt-4o-2024') ||
        id.includes('gpt-4-turbo-2024') ||
        id.includes('o1-preview') ||
        id.includes('o1-mini') ||
        id.includes('chatgpt-4o-latest') ||
        // Gemini latest
        id.includes('gemini-2') ||
        id.includes('gemini-1.5-pro-002') ||
        id.includes('gemini-1.5-flash-002') ||
        id.includes('gemini-exp') ||
        // Llama latest
        id.includes('llama-3.2') ||
        id.includes('llama-3.3') ||
        // DeepSeek latest
        id.includes('deepseek-v3') ||
        id.includes('deepseek-r1') ||
        // Mistral latest
        id.includes('mistral-large-2411') ||
        id.includes('ministral') ||
        id.includes('pixtral') ||
        // Qwen latest
        id.includes('qwen-2.5') ||
        // Command R latest
        id.includes('command-r-08-2024') ||
        id.includes('command-r-plus-08-2024');
      
      // Exclude old models
      const isOld = 
        id.includes('claude-3-opus') ||
        id.includes('claude-3-sonnet') ||
        id.includes('claude-3-haiku') ||
        (id.includes('gpt-4') && !id.includes('2024')) ||
        id.includes('gpt-3.5') ||
        id.includes('llama-3.1') ||
        id.includes('llama-3-');
      
      return isLatest && !isOld && !id.includes('deprecated');
    });
    
    console.log(`🆕 LATEST models found: ${latestModels.length}\n`);
    
    // Group by provider
    const byProvider: Record<string, any[]> = {};
    latestModels.forEach((model: any) => {
      const provider = model.id.split('/')[0];
      if (!byProvider[provider]) byProvider[provider] = [];
      byProvider[provider].push(model);
    });
    
    // Show latest models by provider
    console.log('📊 LATEST MODELS BY PROVIDER:\n');
    
    for (const [provider, models] of Object.entries(byProvider)) {
      console.log(`\n${provider.toUpperCase()}:`);
      models.slice(0, 5).forEach((model: any) => {
        const price = model.pricing ? 
          `$${model.pricing.prompt}/M input, $${model.pricing.completion}/M output` : 
          'Price unknown';
        console.log(`  • ${model.id}`);
        console.log(`    Context: ${model.context_length?.toLocaleString()} tokens`);
        console.log(`    Price: ${price}`);
      });
    }
    
    // Show recommended models for each role
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('🎯 RECOMMENDED LATEST MODELS FOR ROLES:\n');
    
    const recommendations = {
      'SECURITY (High Quality)': 'anthropic/claude-3.5-sonnet-20241022',
      'ORCHESTRATOR (Fast)': 'google/gemini-1.5-flash-002',
      'RESEARCHER (Balanced)': 'anthropic/claude-3.5-haiku-20241022',
      'CODE_QUALITY (Economic)': 'meta-llama/llama-3.2-70b-instruct',
      'ARCHITECTURE (Quality)': 'openai/gpt-4o-2024-11-20',
      'DEEPWIKI (Quality)': 'google/gemini-2.0-flash-exp',
      'LOCATION_FINDER (Fast)': 'openai/gpt-4o-mini-2024-07-18',
      'TESTING (Economic)': 'qwen/qwen-2.5-72b-instruct',
      'PERFORMANCE (Balanced)': 'mistral/mistral-large-2411',
      'DOCUMENTATION (Fast)': 'google/gemini-1.5-flash-8b-latest'
    };
    
    for (const [role, modelId] of Object.entries(recommendations)) {
      const model = models.find((m: any) => m.id === modelId);
      if (model) {
        console.log(`${role}: ${modelId}`);
      } else {
        console.log(`${role}: ${modelId} (⚠️ Not found - check availability)`);
      }
    }
    
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('⚠️  MODELS TO AVOID (OLD VERSIONS):');
    console.log('═══════════════════════════════════════════════════════\n');
    
    const oldModels = [
      'anthropic/claude-3-opus',
      'anthropic/claude-3-sonnet',
      'anthropic/claude-3-haiku',
      'openai/gpt-4-turbo',
      'openai/gpt-4',
      'meta-llama/llama-3.1-70b-instruct',
      'mistralai/mixtral-8x7b-instruct'
    ];
    
    oldModels.forEach(id => {
      console.log(`  ❌ ${id} - OLD VERSION`);
    });
    
    console.log('\n═══════════════════════════════════════════════════════');
    
  } catch (error) {
    console.error('Error checking models:', error);
  }
}

checkLatestModels().catch(console.error);