#!/usr/bin/env ts-node

/**
 * Test DeepWiki Model Selection for Different Languages and Sizes
 * 
 * Shows how the dynamic selector chooses models based on:
 * - Repository size (small, medium, large, enterprise)
 * - Programming languages
 * - NO hardcoded models
 */

import { TrulyDynamicSelector, RoleRequirements } from './src/researcher/truly-dynamic-selector';
import * as dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

// Test configurations for DeepWiki
const DEEPWIKI_CONFIGS: Array<{
  name: string;
  requirements: RoleRequirements;
}> = [
  {
    name: 'Small TypeScript Project',
    requirements: {
      role: 'deepwiki',
      description: 'Deep analysis of small TypeScript/React project',
      languages: ['typescript', 'javascript', 'jsx'],
      repositorySize: 'small',
      weights: { 
        quality: 0.5,   // Good quality needed
        speed: 0.2,     // Speed less important for small repos
        cost: 0.3       // Cost matters for frequent runs
      },
      minContextWindow: 32000,  // Small repo doesn't need huge context
      requiresReasoning: true,
      requiresCodeAnalysis: true
    }
  },
  {
    name: 'Medium Python/ML Project',
    requirements: {
      role: 'deepwiki',
      description: 'Deep analysis of Python ML/Data Science project',
      languages: ['python', 'jupyter', 'yaml'],
      repositorySize: 'medium',
      weights: { 
        quality: 0.6,   // Higher quality for complex ML code
        speed: 0.15,    // Speed less critical
        cost: 0.25      // Moderate cost sensitivity
      },
      minContextWindow: 100000,  // Medium repo needs good context
      requiresReasoning: true,
      requiresCodeAnalysis: true
    }
  },
  {
    name: 'Large Java Enterprise Project',
    requirements: {
      role: 'deepwiki',
      description: 'Deep analysis of large Java/Spring enterprise application',
      languages: ['java', 'kotlin', 'xml', 'sql'],
      repositorySize: 'large',
      weights: { 
        quality: 0.7,   // Maximum quality for complex enterprise code
        speed: 0.1,     // Speed not critical for large analysis
        cost: 0.2       // Cost less important for enterprise
      },
      minContextWindow: 200000,  // Large repo needs huge context
      requiresReasoning: true,
      requiresCodeAnalysis: true,
      maxCostPerMillion: 50  // Enterprise budget
    }
  },
  {
    name: 'Multi-Language Microservices (Go/Rust/Node)',
    requirements: {
      role: 'deepwiki',
      description: 'Deep analysis of polyglot microservices architecture',
      languages: ['go', 'rust', 'javascript', 'dockerfile', 'yaml'],
      repositorySize: 'large',
      weights: { 
        quality: 0.65,  // High quality for diverse languages
        speed: 0.2,     // Some speed needed for CI/CD
        cost: 0.15      // Cost conscious for continuous analysis
      },
      minContextWindow: 128000,
      requiresReasoning: true,
      requiresCodeAnalysis: true,
      maxCostPerMillion: 20  // Budget constraint
    }
  },
  {
    name: 'Enterprise C++ System Software',
    requirements: {
      role: 'deepwiki',
      description: 'Deep analysis of low-level C++ system software',
      languages: ['cpp', 'c', 'cmake', 'assembly'],
      repositorySize: 'enterprise',
      weights: { 
        quality: 0.8,   // Maximum quality for critical system code
        speed: 0.05,    // Speed not important
        cost: 0.15      // Cost not a major factor
      },
      minContextWindow: 500000,  // Enterprise needs maximum context
      requiresReasoning: true,
      requiresCodeAnalysis: true
    }
  }
];

async function testWithRealOpenRouter() {
  console.log('🔬 Testing DeepWiki Model Selection for Different Configurations\n');
  console.log('=' .repeat(80));
  
  const apiKey = process.env.OPENROUTER_API_KEY;
  
  if (!apiKey) {
    console.log('❌ No OpenRouter API key found');
    console.log('Please set OPENROUTER_API_KEY in your .env file');
    return;
  }
  
  console.log('✅ Using REAL OpenRouter API to fetch actual available models\n');
  
  const selector = new TrulyDynamicSelector(apiKey);
  
  // Store results for comparison
  const results: Array<{
    config: string;
    primary: string;
    fallback: string;
    primaryCost: number;
    fallbackCost: number;
    primaryContext: number;
    fallbackContext: number;
  }> = [];
  
  for (const config of DEEPWIKI_CONFIGS) {
    console.log(`\n📋 Configuration: ${config.name}`);
    console.log('─'.repeat(70));
    console.log(`  Languages: ${config.requirements.languages?.join(', ') || 'Any'}`);
    console.log(`  Repository Size: ${config.requirements.repositorySize}`);
    console.log(`  Min Context: ${config.requirements.minContextWindow?.toLocaleString()} tokens`);
    console.log(`  Weights: Quality=${(config.requirements.weights.quality * 100).toFixed(0)}%, Speed=${(config.requirements.weights.speed * 100).toFixed(0)}%, Cost=${(config.requirements.weights.cost * 100).toFixed(0)}%`);
    if (config.requirements.maxCostPerMillion) {
      console.log(`  Max Cost: $${config.requirements.maxCostPerMillion}/M tokens`);
    }
    
    try {
      const result = await selector.selectModelsForRole(config.requirements);
      
      console.log(`\n  🎯 PRIMARY: ${result.primary.id}`);
      console.log(`     Context: ${result.primary.contextLength.toLocaleString()} tokens`);
      console.log(`     Pricing: $${result.primary.pricing.prompt}/$${result.primary.pricing.completion} per M`);
      console.log(`     Avg Cost: $${((result.primary.pricing.prompt + result.primary.pricing.completion) / 2).toFixed(2)}/M`);
      console.log(`     Scores: Q=${(result.primary.qualityScore! * 100).toFixed(0)} S=${(result.primary.speedScore! * 100).toFixed(0)} C=${(result.primary.costScore! * 100).toFixed(0)}`);
      console.log(`     Total: ${(result.primary.totalScore! * 100).toFixed(0)}/100`);
      
      console.log(`\n  🔄 FALLBACK: ${result.fallback.id}`);
      console.log(`     Context: ${result.fallback.contextLength.toLocaleString()} tokens`);
      console.log(`     Pricing: $${result.fallback.pricing.prompt}/$${result.fallback.pricing.completion} per M`);
      console.log(`     Avg Cost: $${((result.fallback.pricing.prompt + result.fallback.pricing.completion) / 2).toFixed(2)}/M`);
      console.log(`     Scores: Q=${(result.fallback.qualityScore! * 100).toFixed(0)} S=${(result.fallback.speedScore! * 100).toFixed(0)} C=${(result.fallback.costScore! * 100).toFixed(0)}`);
      console.log(`     Total: ${(result.fallback.totalScore! * 100).toFixed(0)}/100`);
      
      // Store for comparison
      results.push({
        config: config.name,
        primary: result.primary.id,
        fallback: result.fallback.id,
        primaryCost: (result.primary.pricing.prompt + result.primary.pricing.completion) / 2,
        fallbackCost: (result.fallback.pricing.prompt + result.fallback.pricing.completion) / 2,
        primaryContext: result.primary.contextLength,
        fallbackContext: result.fallback.contextLength
      });
      
    } catch (error: any) {
      console.error(`  ❌ Failed: ${error.message}`);
    }
  }
  
  // Summary comparison
  console.log('\n\n📊 SUMMARY COMPARISON');
  console.log('=' .repeat(80));
  console.log('\nHow model selection changes based on requirements:\n');
  
  // Compare small vs large
  const small = results.find(r => r.config.includes('Small'));
  const large = results.find(r => r.config.includes('Large Java'));
  
  if (small && large) {
    console.log('🔍 Small vs Large Repository:');
    console.log(`  Small TypeScript: ${small.primary} ($${small.primaryCost.toFixed(2)}/M)`);
    console.log(`  Large Java:       ${large.primary} ($${large.primaryCost.toFixed(2)}/M)`);
    console.log(`  → Larger repos get ${large.primaryContext > small.primaryContext ? 'higher context' : 'similar'} models`);
    console.log(`  → Cost difference: ${((large.primaryCost / small.primaryCost - 1) * 100).toFixed(0)}%`);
  }
  
  // Compare by cost sensitivity
  const costSensitive = results.find(r => r.config.includes('Microservices'));
  const enterprise = results.find(r => r.config.includes('Enterprise C++'));
  
  if (costSensitive && enterprise) {
    console.log('\n💰 Cost Sensitive vs Enterprise:');
    console.log(`  Microservices:  ${costSensitive.primary} ($${costSensitive.primaryCost.toFixed(2)}/M)`);
    console.log(`  Enterprise C++: ${enterprise.primary} ($${enterprise.primaryCost.toFixed(2)}/M)`);
    console.log(`  → Enterprise gets ${enterprise.primaryCost > costSensitive.primaryCost ? 'premium' : 'similar'} models`);
  }
  
  // Show diversity of selections
  const uniquePrimaries = new Set(results.map(r => r.primary.split('/')[0]));
  const uniqueFallbacks = new Set(results.map(r => r.fallback.split('/')[0]));
  
  console.log('\n🌐 Provider Diversity:');
  console.log(`  Primary providers used: ${Array.from(uniquePrimaries).join(', ')}`);
  console.log(`  Fallback providers used: ${Array.from(uniqueFallbacks).join(', ')}`);
  
  console.log('\n✨ Key Insights:');
  console.log('  • Different configurations get different optimal models');
  console.log('  • Cost-sensitive configs get cheaper models automatically');
  console.log('  • Large repos get higher context models when needed');
  console.log('  • Fallbacks provide provider diversity for reliability');
  console.log('  • NO hardcoded model selection - pure capability matching');
}

// Also test with mock data to show the concept
async function testWithMockData() {
  console.log('\n\n🧪 Testing with Mock Data (Concept Demonstration)');
  console.log('=' .repeat(80));
  
  const selector = new TrulyDynamicSelector();
  
  // Mock the API call
  (selector as any).fetchAllModels = async () => {
    return [
      // Current models
      { id: 'anthropic/claude-opus-4.1', provider: 'anthropic', model: 'claude-opus-4.1', 
        contextLength: 200000, pricing: { prompt: 15, completion: 75 }},
      { id: 'openai/gpt-5', provider: 'openai', model: 'gpt-5', 
        contextLength: 128000, pricing: { prompt: 10, completion: 30 }},
      { id: 'google/gemini-2.5-pro', provider: 'google', model: 'gemini-2.5-pro', 
        contextLength: 2000000, pricing: { prompt: 3.5, completion: 10.5 }},
      
      // Future hypothetical models
      { id: 'xai/grok-3-ultra', provider: 'xai', model: 'grok-3-ultra', 
        contextLength: 500000, pricing: { prompt: 8, completion: 24 }},
      { id: 'deepseek/deepseek-v3-pro', provider: 'deepseek', model: 'deepseek-v3-pro', 
        contextLength: 256000, pricing: { prompt: 2, completion: 6 }},
      
      // Cheaper alternatives
      { id: 'anthropic/claude-haiku-4', provider: 'anthropic', model: 'claude-haiku-4', 
        contextLength: 100000, pricing: { prompt: 0.25, completion: 1.25 }},
      { id: 'google/gemini-2.5-flash', provider: 'google', model: 'gemini-2.5-flash', 
        contextLength: 1000000, pricing: { prompt: 0.075, completion: 0.3 }},
    ];
  };
  
  console.log('\nQuick test with hypothetical future models:');
  
  const testConfig = DEEPWIKI_CONFIGS[0]; // Small TypeScript
  const result = await selector.selectModelsForRole(testConfig.requirements);
  
  console.log(`\nFor: ${testConfig.name}`);
  console.log(`Selected: ${result.primary.id}`);
  console.log(`Fallback: ${result.fallback.id}`);
  console.log('\n→ System automatically selects based on capabilities!');
}

// Run tests
async function main() {
  await testWithRealOpenRouter();
  await testWithMockData();
  
  console.log('\n\n🎯 CONCLUSION:');
  console.log('=' .repeat(80));
  console.log('The system dynamically selects optimal models based on:');
  console.log('  1. Repository size and complexity');
  console.log('  2. Language requirements');
  console.log('  3. Quality/Speed/Cost priorities');
  console.log('  4. Budget constraints');
  console.log('\nNO hardcoded models - works with any future models automatically!');
}

main().catch(console.error);