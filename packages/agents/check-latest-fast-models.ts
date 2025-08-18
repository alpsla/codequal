#!/usr/bin/env npx ts-node

/**
 * Check for truly latest fast models in OpenRouter
 */

import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

async function checkLatestFastModels() {
  console.log('🔍 Searching for LATEST fast models in OpenRouter...\n');
  
  try {
    const response = await axios.get('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://codequal.ai',
        'X-Title': 'CodeQual Model Research'
      }
    });
    
    const models = response.data.data || [];
    
    // Find all Claude models (including latest)
    console.log('=== ALL CLAUDE MODELS (checking for Claude 4 Haiku) ===');
    const claudeModels = models
      .filter((m: any) => m.id.startsWith('anthropic/'))
      .sort((a: any, b: any) => b.id.localeCompare(a.id));
      
    claudeModels.forEach((m: any) => {
      const pricing = m.pricing ? 
        `($${(parseFloat(m.pricing.prompt) * 1000000).toFixed(2)}/$${(parseFloat(m.pricing.completion) * 1000000).toFixed(2)} per M)` : 
        '';
      console.log(`  ${m.id} ${pricing}`);
    });
    
    // Find fast models from latest generations
    console.log('\n=== FAST MODELS FROM LATEST GENERATIONS ===');
    
    // Check for latest fast models
    const latestFastPatterns = [
      'claude-4.*haiku',  // Claude 4 Haiku (if exists)
      'claude-3.7',       // Claude 3.7 (newer than 3.5)
      'gpt-5-mini',       // GPT-5 mini
      'o3-mini',          // o3 mini
      'o4-mini',          // o4 mini
      'gemini-2.5-flash-lite',
      'gemini-2.5-flash',
      'llama-4',
      'mistral.*small',
      'mixtral.*8x7b'
    ];
    
    console.log('Looking for patterns:', latestFastPatterns.join(', '));
    console.log('\nFound:');
    
    for (const pattern of latestFastPatterns) {
      const regex = new RegExp(pattern, 'i');
      const found = models.filter((m: any) => regex.test(m.id));
      
      if (found.length > 0) {
        found.forEach((m: any) => {
          console.log(`  ✅ ${m.id}`);
        });
      }
    }
    
    // Check what's newer than Claude 3.5
    console.log('\n=== MODELS NEWER THAN CLAUDE 3.5 ===');
    const newerThan35 = models.filter((m: any) => {
      const id = m.id.toLowerCase();
      return (
        // Claude 3.7 or 4.x
        (id.includes('claude') && (
          id.includes('3.7') || 
          id.includes('4') ||
          id.includes('opus-4') ||
          id.includes('sonnet-4')
        )) ||
        // GPT-5 or o3/o4
        (id.includes('gpt-5') || id.includes('o3') || id.includes('o4')) ||
        // Gemini 2.5
        (id.includes('gemini') && id.includes('2.5'))
      );
    });
    
    newerThan35.forEach((m: any) => {
      console.log(`  ${m.id}`);
    });
    
    // Find truly fast models (response time < 2s)
    console.log('\n=== ULTRA-FAST MODELS (for AI-Parser) ===');
    const ultraFast = models.filter((m: any) => {
      const id = m.id.toLowerCase();
      return (
        id.includes('flash-lite') ||
        id.includes('mini-high') ||
        id.includes('turbo-2') ||  // Newer turbo versions
        (id.includes('haiku') && !id.includes('3.5')) || // Not 3.5 haiku
        id.includes('small') ||
        id.includes('tiny') ||
        id.includes('nano')
      );
    });
    
    ultraFast.slice(0, 15).forEach((m: any) => {
      console.log(`  ${m.id}`);
    });
    
    // Context-independent roles (don't need language/size context)
    console.log('\n=== BEST FOR CONTEXT-INDEPENDENT ROLES ===');
    console.log('(Educator, AI-parser, Researcher, Orchestrator)\n');
    
    const contextIndependentBest = {
      'AI-Parser': models.find((m: any) => 
        m.id === 'google/gemini-2.5-flash-lite' || 
        m.id === 'openai/gpt-5-mini' ||
        m.id === 'openai/o4-mini'
      ),
      'Educator': models.find((m: any) => 
        m.id === 'anthropic/claude-sonnet-4' ||
        m.id === 'openai/gpt-5'
      ),
      'Researcher': models.find((m: any) => 
        m.id === 'google/gemini-2.5-flash' ||
        m.id === 'openai/gpt-5-mini'
      ),
      'Orchestrator': models.find((m: any) => 
        m.id === 'google/gemini-2.5-pro' ||
        m.id === 'openai/gpt-4o'
      )
    };
    
    Object.entries(contextIndependentBest).forEach(([role, model]) => {
      if (model) {
        console.log(`  ${role}: ${model.id}`);
      }
    });
    
    return models;
    
  } catch (error: any) {
    console.error('Failed:', error.message);
    return [];
  }
}

// Run check
checkLatestFastModels()
  .then(() => {
    console.log('\n✅ Check complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('Failed:', error);
    process.exit(1);
  });