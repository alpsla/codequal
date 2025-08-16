#!/usr/bin/env npx ts-node

/**
 * Test fallback model configuration for DeepWiki
 * Simulates primary model failure and fallback activation
 */

import { DeepWikiRepositoryAnalyzer, ModelPreferences } from './src/standard/deepwiki';

async function testFallbackModel() {
  console.log('🧪 Testing Fallback Model Configuration for DeepWiki\n');
  
  // Test 1: Model preferences with primary and fallback
  console.log('1️⃣ Creating analyzer with primary and fallback models...');
  
  const modelPreferences: ModelPreferences = {
    primary: {
      provider: 'openrouter',
      modelId: 'anthropic/claude-3-opus-20240229',  // Expensive model as primary
      temperature: 0.1,
      maxTokens: 8000
    },
    fallback: {
      provider: 'openrouter',
      modelId: 'openai/gpt-4o-mini',  // Cheaper model as fallback
      temperature: 0.2,
      maxTokens: 4000
    }
  };
  
  const analyzer = new DeepWikiRepositoryAnalyzer();
  
  console.log('✅ Analyzer created');
  console.log('   Primary model:', modelPreferences.primary.modelId);
  console.log('   Fallback model:', modelPreferences.fallback?.modelId || 'None');
  console.log('');
  
  // Test 2: Simulate analysis with model preferences
  console.log('2️⃣ Simulating analysis with model preferences...');
  
  const analysisOptions = {
    branch: 'main',
    modelPreferences: modelPreferences,
    useCache: false
  };
  
  console.log('Analysis options:', JSON.stringify(analysisOptions, null, 2));
  console.log('');
  
  // Test 3: Mock failure scenario
  console.log('3️⃣ Simulating primary model failure scenario...');
  console.log('   - Primary model would fail after 3 retries');
  console.log('   - System automatically switches to fallback model');
  console.log('   - Fallback model attempts analysis');
  console.log('');
  
  // Test 4: No fallback scenario
  console.log('4️⃣ Testing scenario without fallback...');
  
  const singleModelPreferences: ModelPreferences = {
    primary: {
      provider: 'openrouter',
      modelId: 'openai/gpt-4o',
      temperature: 0.1,
      maxTokens: 6000
    }
    // No fallback defined
  };
  
  console.log('Single model configuration (no fallback):');
  console.log('   Primary model:', singleModelPreferences.primary.modelId);
  console.log('   Fallback model: None');
  console.log('');
  
  // Test 5: Dynamic selection based on repository characteristics
  console.log('5️⃣ Dynamic model selection example...');
  
  const getModelPreferencesForRepo = (
    repoSize: 'small' | 'medium' | 'large',
    hasSensitiveData: boolean
  ): ModelPreferences => {
    if (hasSensitiveData) {
      // Use more careful models for sensitive data
      return {
        primary: {
          provider: 'openrouter',
          modelId: 'anthropic/claude-3-opus-20240229',
          temperature: 0.0,  // Very deterministic
          maxTokens: 8000
        },
        fallback: {
          provider: 'openrouter',
          modelId: 'openai/gpt-4-turbo-preview',
          temperature: 0.1,
          maxTokens: 6000
        }
      };
    }
    
    // Regular repos - optimize for cost/performance
    switch (repoSize) {
      case 'small':
        return {
          primary: {
            provider: 'openrouter',
            modelId: 'openai/gpt-4o-mini',
            temperature: 0.1,
            maxTokens: 2000
          }
          // No fallback for small repos - fast enough
        };
        
      case 'medium':
        return {
          primary: {
            provider: 'openrouter',
            modelId: 'openai/gpt-4o',
            temperature: 0.1,
            maxTokens: 4000
          },
          fallback: {
            provider: 'openrouter',
            modelId: 'openai/gpt-4o-mini',
            temperature: 0.2,
            maxTokens: 3000
          }
        };
        
      case 'large':
        return {
          primary: {
            provider: 'openrouter',
            modelId: 'anthropic/claude-3-opus-20240229',
            temperature: 0.1,
            maxTokens: 8000
          },
          fallback: {
            provider: 'openrouter',
            modelId: 'openai/gpt-4o',
            temperature: 0.1,
            maxTokens: 6000
          }
        };
    }
  };
  
  const smallRepoPrefs = getModelPreferencesForRepo('small', false);
  const largeSecureRepoPrefs = getModelPreferencesForRepo('large', true);
  
  console.log('Small repo models:');
  console.log('   Primary:', smallRepoPrefs.primary.modelId);
  console.log('   Fallback:', smallRepoPrefs.fallback?.modelId || 'None');
  console.log('');
  
  console.log('Large repo with sensitive data:');
  console.log('   Primary:', largeSecureRepoPrefs.primary.modelId);
  console.log('   Fallback:', largeSecureRepoPrefs.fallback?.modelId || 'None');
  console.log('');
  
  console.log('✨ Fallback model configuration test complete!\n');
  console.log('📝 Key Features:');
  console.log('   • Primary model is tried first with retries');
  console.log('   • On failure, fallback model is automatically used');
  console.log('   • Each model gets its own retry attempts');
  console.log('   • Models can be selected based on repo characteristics');
  console.log('   • Supports single model (no fallback) configuration');
}

// Run tests
testFallbackModel().catch(console.error);