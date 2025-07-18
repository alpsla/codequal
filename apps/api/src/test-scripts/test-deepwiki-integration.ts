#!/usr/bin/env ts-node

/**
 * Test DeepWiki integration and Vector DB storage
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { DeepWikiConfigStorage } from '@codequal/agents/deepwiki/deepwiki-config-storage';
import { DeepWikiModelSelector } from '@codequal/agents/deepwiki/deepwiki-model-selector';
import { ModelVersionSync } from '@codequal/core';
import { createLogger } from '@codequal/core/utils';

// Load environment variables
config({ path: resolve(__dirname, '../../.env') });

const logger = createLogger('DeepWikiIntegrationTest');

async function testDeepWikiStorage() {
  console.log('🧪 Testing DeepWiki Storage Integration\n');
  
  const configStorage = new DeepWikiConfigStorage();
  const modelVersionSync = new ModelVersionSync(logger);
  const modelSelector = new DeepWikiModelSelector(modelVersionSync);
  
  // Test 1: Store and retrieve global configuration
  console.log('Test 1: Global Configuration Storage');
  try {
    const testConfig = {
      primary: {
        provider: 'openai',
        model: 'gpt-4-turbo',
        contextWindow: 128000,
        pricing: { input: 10, output: 30 }
      },
      fallback: {
        provider: 'anthropic',
        model: 'claude-3-opus',
        contextWindow: 200000,
        pricing: { input: 15, output: 75 }
      },
      scoringWeights: {
        quality: 0.5,
        cost: 0.3,
        speed: 0.2
      },
      timestamp: new Date().toISOString()
    };
    
    await configStorage.storeGlobalConfig(testConfig as any);
    console.log('✅ Stored global configuration');
    
    const retrieved = await configStorage.getGlobalConfig();
    console.log('✅ Retrieved global configuration');
    console.log(`   Primary: ${retrieved?.primary.provider}/${retrieved?.primary.model}`);
    console.log(`   Fallback: ${retrieved?.fallback.provider}/${retrieved?.fallback.model}`);
  } catch (error) {
    console.log('❌ Global configuration test failed:', error);
  }
  
  // Test 2: Store and retrieve repository-specific configuration
  console.log('\nTest 2: Repository-Specific Configuration');
  try {
    const repoUrl = 'https://github.com/test/repo';
    const repoSelection = {
      selectedModel: {
        provider: 'openai',
        model: 'gpt-4-turbo',
        reason: 'Best for large TypeScript codebase'
      },
      fallbackModel: {
        provider: 'anthropic',
        model: 'claude-3-sonnet',
        reason: 'Cost-effective fallback'
      },
      repositoryContext: {
        primaryLanguage: 'typescript',
        size: 'large',
        fileCount: 500,
        complexity: 'high'
      },
      scores: {
        primary: { quality: 9.5, cost: 7.0, speed: 8.0, composite: 8.5 },
        fallback: { quality: 8.5, cost: 8.5, speed: 9.0, composite: 8.7 }
      },
      timestamp: new Date().toISOString()
    };
    
    await configStorage.storeRepositoryConfig(repoUrl, repoSelection as any);
    console.log('✅ Stored repository configuration');
    
    const repoConfig = await configStorage.getRepositoryConfig(repoUrl);
    console.log('✅ Retrieved repository configuration');
    console.log(`   Repository: ${repoUrl}`);
    console.log(`   Selected: ${repoConfig?.selectedModel.provider}/${repoConfig?.selectedModel.model}`);
    console.log(`   Language: ${repoConfig?.repositoryContext.primaryLanguage}`);
  } catch (error) {
    console.log('❌ Repository configuration test failed:', error);
  }
  
  // Test 3: Model selection for repository
  console.log('\nTest 3: Model Selection Process');
  try {
    const context = {
      url: 'https://github.com/example/large-app',
      size: 'large' as const,
      primaryLanguage: 'javascript',
      languages: ['javascript', 'typescript', 'css'],
      frameworks: ['react', 'jest'],
      fileCount: 1000,
      totalLines: 100000,
      complexity: 7, // 1-10 scale
      analysisDepth: 'comprehensive' as const
    };
    
    const selection = await modelSelector.selectModel(context);
    console.log('✅ Model selection completed');
    console.log(`   Primary: ${selection.primary.provider}/${selection.primary.model}`);
    console.log(`   Reason: ${selection.reasoning}`);
    console.log(`   Composite Score: ${selection.scores.primary.compositeScore}`);
    console.log(`   Estimated Cost: $${selection.estimatedCost.toFixed(2)}`);
  } catch (error) {
    console.log('❌ Model selection test failed:', error);
  }
  
  // Test 4: Check if configurations persist
  console.log('\nTest 4: Configuration Persistence');
  try {
    const globalConfig = await configStorage.getGlobalConfig();
    console.log(`✅ Global config persists: ${globalConfig ? 'Yes' : 'No'}`);
    
    const repoConfigs = await configStorage.getRepositoryConfig('https://github.com/test/repo');
    console.log(`✅ Repository config persists: ${repoConfigs ? 'Yes' : 'No'}`);
  } catch (error) {
    console.log('❌ Persistence test failed:', error);
  }
}

async function main() {
  try {
    await testDeepWikiStorage();
    console.log('\n✅ DeepWiki integration tests completed');
  } catch (error) {
    logger.error('Test failed', { error });
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

main().catch(console.error);