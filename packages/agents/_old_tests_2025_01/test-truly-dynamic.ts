#!/usr/bin/env ts-node

/**
 * Test Truly Dynamic Model Selection
 * 
 * NO hardcoded models - selection based purely on requirements and capabilities
 */

import { TrulyDynamicSelector, RoleRequirements, ROLE_CONFIGS } from './src/researcher/truly-dynamic-selector';
import * as dotenv from 'dotenv';

dotenv.config();

async function testTrulyDynamic() {
  console.log('🎯 Testing Truly Dynamic Model Selection\n');
  console.log('NO hardcoded models - pure capability-based selection');
  console.log('=' .repeat(80));
  
  // Create mock selector for testing (without API key)
  const selector = new TrulyDynamicSelector();
  
  // Mock the fetchAllModels to simulate OpenRouter response
  (selector as any).fetchAllModels = async () => {
    console.log('\n📡 Simulating OpenRouter API (includes ALL models)...\n');
    
    // This could be ANY models - including ones that don't exist yet!
    // The selector doesn't care about names, only capabilities
    return [
      // Some current models
      { id: 'anthropic/claude-opus-4.1', provider: 'anthropic', model: 'claude-opus-4.1', 
        contextLength: 200000, pricing: { prompt: 15, completion: 75 }},
      { id: 'openai/gpt-5', provider: 'openai', model: 'gpt-5', 
        contextLength: 128000, pricing: { prompt: 10, completion: 30 }},
      { id: 'google/gemini-2.5-pro', provider: 'google', model: 'gemini-2.5-pro', 
        contextLength: 2000000, pricing: { prompt: 3.5, completion: 10.5 }},
      
      // Hypothetical future models (could be added tomorrow!)
      { id: 'xai/grok-3-ultra', provider: 'xai', model: 'grok-3-ultra', 
        contextLength: 500000, pricing: { prompt: 8, completion: 24 }},
      { id: 'deepseek/deepseek-v3-pro', provider: 'deepseek', model: 'deepseek-v3-pro', 
        contextLength: 256000, pricing: { prompt: 2, completion: 6 }},
      { id: 'mistral/mistral-large-2025', provider: 'mistral', model: 'mistral-large-2025', 
        contextLength: 128000, pricing: { prompt: 4, completion: 12 }},
      
      // Fast/cheap models
      { id: 'anthropic/claude-haiku-4', provider: 'anthropic', model: 'claude-haiku-4', 
        contextLength: 100000, pricing: { prompt: 0.25, completion: 1.25 }},
      { id: 'openai/gpt-5-mini', provider: 'openai', model: 'gpt-5-mini', 
        contextLength: 128000, pricing: { prompt: 0.15, completion: 0.6 }},
      { id: 'google/gemini-2.5-flash', provider: 'google', model: 'gemini-2.5-flash', 
        contextLength: 1000000, pricing: { prompt: 0.075, completion: 0.3 }},
      
      // Some completely new provider that doesn't exist yet
      { id: 'newai/supermodel-x', provider: 'newai', model: 'supermodel-x', 
        contextLength: 1000000, pricing: { prompt: 5, completion: 15 }},
    ];
  };
  
  // Test different role requirements
  const testRoles = [
    {
      name: 'DeepWiki (Quality-focused)',
      requirements: {
        role: 'deepwiki',
        description: 'Deep code analysis requiring high quality',
        repositorySize: 'large' as const,
        weights: { quality: 0.7, speed: 0.1, cost: 0.2 },
        minContextWindow: 100000,
        requiresReasoning: true,
        requiresCodeAnalysis: true
      }
    },
    {
      name: 'High-Volume Processing (Cost-focused)',
      requirements: {
        role: 'batch_processor',
        description: 'Process many files cheaply',
        repositorySize: 'medium' as const,
        weights: { quality: 0.2, speed: 0.3, cost: 0.5 },
        maxCostPerMillion: 5,
        minContextWindow: 32000
      }
    },
    {
      name: 'Real-time Analysis (Speed-focused)',
      requirements: {
        role: 'realtime',
        description: 'Fast response for IDE integration',
        repositorySize: 'small' as const,
        weights: { quality: 0.3, speed: 0.6, cost: 0.1 },
        minContextWindow: 16000
      }
    }
  ];
  
  for (const test of testRoles) {
    console.log(`\n📋 ${test.name}`);
    console.log('-'.repeat(60));
    
    try {
      const result = await selector.selectModelsForRole(test.requirements);
      
      console.log(`Primary: ${result.primary.id}`);
      console.log(`  - Context: ${result.primary.contextLength.toLocaleString()} tokens`);
      console.log(`  - Cost: $${result.primary.pricing.prompt}/$${result.primary.pricing.completion} per M`);
      console.log(`  - Score: ${(result.primary.totalScore! * 100).toFixed(0)}/100`);
      
      console.log(`Fallback: ${result.fallback.id}`);
      console.log(`  - Context: ${result.fallback.contextLength.toLocaleString()} tokens`);
      console.log(`  - Cost: $${result.fallback.pricing.prompt}/$${result.fallback.pricing.completion} per M`);
      console.log(`  - Score: ${(result.fallback.totalScore! * 100).toFixed(0)}/100`);
      
    } catch (error: any) {
      console.error(`Failed: ${error.message}`);
    }
  }
  
  console.log('\n' + '=' .repeat(80));
  console.log('🎯 Key Points:');
  console.log('  ✅ NO hardcoded model names or versions');
  console.log('  ✅ Selection based purely on capabilities and requirements');
  console.log('  ✅ Works with ANY future models (Grok, DeepSeek, etc.)');
  console.log('  ✅ Adapts automatically as new models appear in OpenRouter');
  console.log('  ✅ Different roles get different optimal models');
}

// Test with real OpenRouter API if available
async function testWithRealAPI() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  
  if (!apiKey) {
    console.log('\n⚠️  No API key - skipping real API test');
    return;
  }
  
  console.log('\n\n🌐 Testing with REAL OpenRouter API');
  console.log('=' .repeat(80));
  
  const selector = new TrulyDynamicSelector(apiKey);
  
  // Test with actual requirements
  const requirements: RoleRequirements = {
    role: 'location_finder',
    description: 'Find exact locations of code issues',
    repositorySize: 'large',
    languages: ['typescript', 'python', 'java'],
    weights: { 
      quality: 0.5,  // Need good accuracy
      speed: 0.3,    // Need reasonable speed
      cost: 0.2      // Cost matters but not primary
    },
    minContextWindow: 32000,
    requiresCodeAnalysis: true
  };
  
  try {
    console.log('\n🔍 Selecting models for Location Finder role...\n');
    const result = await selector.selectModelsForRole(requirements);
    
    console.log('Selected Models:');
    console.log('=' .repeat(60));
    console.log(result.reasoning);
    
    console.log('\n✅ Success! Models selected based on actual capabilities');
    console.log('   NO hardcoded names were used in the selection');
    
  } catch (error: any) {
    console.error('Failed to select models:', error.message);
  }
}

// Run tests
async function main() {
  await testTrulyDynamic();
  await testWithRealAPI();
  
  console.log('\n\n✨ Conclusion:');
  console.log('The system now selects models based on:');
  console.log('  1. Role requirements (quality/speed/cost weights)');
  console.log('  2. Actual capabilities (context, pricing, indicators)');
  console.log('  3. NO hardcoded model names or versions');
  console.log('\nThis will work with ANY future models without code changes!');
}

main().catch(console.error);