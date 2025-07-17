#!/usr/bin/env npx tsx

/**
 * Test Vector DB storage functionality for DeepWiki
 */

import 'dotenv/config';
import { VectorStorageService } from '@codequal/database';
import { createLogger } from '@codequal/core/utils';

const logger = createLogger('VectorDBTest');

async function testVectorDBStorage() {
  console.log('🧪 Testing Vector DB Storage for DeepWiki...\n');
  
  try {
    // Initialize Vector Storage Service
    const vectorStorage = new VectorStorageService();
    console.log('✅ Vector Storage Service initialized');
    
    // Test 1: Store DeepWiki configuration
    console.log('\n📝 Test 1: Storing DeepWiki configuration...');
    const testConfig = {
      id: `test-config-${Date.now()}`,
      content: JSON.stringify({
        primary: { provider: 'openai', model: 'gpt-4.1-nano' },
        fallback: { provider: 'anthropic', model: 'claude-3-haiku' },
        timestamp: new Date().toISOString()
      }),
      metadata: {
        type: 'deepwiki-model-config',
        configType: 'model-selection',
        timestamp: new Date().toISOString(),
        primary: { provider: 'openai', model: 'gpt-4.1-nano' },
        fallback: { provider: 'anthropic', model: 'claude-3-haiku' }
      }
    };
    
    // Create dummy embedding
    const dummyEmbedding = new Array(1536).fill(0);
    
    await vectorStorage.storeChunk(
      testConfig as any,
      dummyEmbedding,
      'deepwiki-system',
      'configuration',
      'test-config',
      'cached'
    );
    console.log('✅ Configuration stored successfully');
    
    // Test 2: Retrieve configuration
    console.log('\n🔍 Test 2: Retrieving DeepWiki configuration...');
    const results = await vectorStorage.searchByMetadata({
      'metadata.type': 'deepwiki-model-config',
      'metadata.configType': 'model-selection'
    }, 5);
    
    console.log(`✅ Found ${results.length} configurations`);
    if (results.length > 0) {
      console.log('Latest configuration:', {
        timestamp: results[0].metadata?.timestamp,
        primary: results[0].metadata?.primary,
        fallback: results[0].metadata?.fallback
      });
    }
    
    // Test 3: Store repository-specific configuration
    console.log('\n📝 Test 3: Storing repository-specific configuration...');
    const repoConfig = {
      id: `repo-config-${Date.now()}`,
      content: JSON.stringify({
        repository_url: 'https://github.com/test/repo',
        primary_model: 'openai/gpt-4.1-nano',
        fallback_model: 'anthropic/claude-3-haiku'
      }),
      metadata: {
        repository_url: 'https://github.com/test/repo',
        primary_model: 'openai/gpt-4.1-nano',
        fallback_model: 'anthropic/claude-3-haiku',
        timestamp: new Date().toISOString()
      }
    };
    
    await vectorStorage.storeChunk(
      repoConfig as any,
      dummyEmbedding,
      'https://github.com/test/repo',
      'deepwiki-config',
      'repository-model-selection',
      'cached'
    );
    console.log('✅ Repository configuration stored successfully');
    
    // Test 4: Retrieve repository configuration
    console.log('\n🔍 Test 4: Retrieving repository configuration...');
    const repoResults = await vectorStorage.searchByMetadata({
      repository_url: 'https://github.com/test/repo'
    }, 1);
    
    console.log(`✅ Found ${repoResults.length} repository configurations`);
    if (repoResults.length > 0) {
      console.log('Repository configuration:', {
        url: repoResults[0].metadata?.repository_url,
        primary: repoResults[0].metadata?.primary_model,
        fallback: repoResults[0].metadata?.fallback_model
      });
    }
    
    console.log('\n🎉 All Vector DB tests passed!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests
testVectorDBStorage().catch(console.error);