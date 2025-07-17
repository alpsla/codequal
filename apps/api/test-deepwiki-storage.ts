#!/usr/bin/env npx tsx

/**
 * Test DeepWiki configuration storage
 */

import 'dotenv/config';
import { DeepWikiConfigStorage } from '../../packages/agents/dist/deepwiki/deepwiki-config-storage';
import { createLogger } from '@codequal/core/utils';

const logger = createLogger('DeepWikiStorageTest');

async function testDeepWikiStorage() {
  console.log('🧪 Testing DeepWiki Configuration Storage...\n');
  
  try {
    // Initialize storage
    const storage = new DeepWikiConfigStorage();
    console.log('✅ Storage service initialized');
    
    // Test 1: Store global configuration
    console.log('\n📝 Test 1: Storing global configuration...');
    const globalConfig = {
      primary: { provider: 'openai', model: 'gpt-4.1-nano', versionId: 'latest' },
      fallback: { provider: 'anthropic', model: 'claude-3-haiku', versionId: 'latest' },
      timestamp: new Date().toISOString(),
      scoringWeights: { quality: 0.5, cost: 0.3, speed: 0.2 },
      searchResults: {
        topModels: [],
        totalEvaluated: 100
      }
    };
    
    await storage.storeGlobalConfig(globalConfig);
    console.log('✅ Global configuration stored');
    
    // Test 2: Retrieve global configuration
    console.log('\n🔍 Test 2: Retrieving global configuration...');
    const retrievedGlobal = await storage.getGlobalConfig();
    
    if (retrievedGlobal) {
      console.log('✅ Retrieved global configuration:', {
        primary: `${retrievedGlobal.primary.provider}/${retrievedGlobal.primary.model}`,
        fallback: `${retrievedGlobal.fallback.provider}/${retrievedGlobal.fallback.model}`,
        timestamp: retrievedGlobal.timestamp
      });
    } else {
      console.log('⚠️  No global configuration found (table may not exist)');
    }
    
    // Test 3: Store repository configuration
    console.log('\n📝 Test 3: Storing repository configuration...');
    const repoSelection = {
      primary: { provider: 'openai', model: 'gpt-4o-mini', versionId: 'latest' },
      fallback: { provider: 'google', model: 'gemini-flash', versionId: 'latest' },
      context: {
        url: 'https://github.com/test/repo',
        size: 'medium' as const,
        primaryLanguage: 'typescript',
        languages: ['typescript', 'javascript'],
        frameworks: ['react', 'node'],
        fileCount: 150,
        totalLines: 25000,
        complexity: 6,
        analysisDepth: 'standard' as const
      },
      estimatedTokens: 50000,
      estimatedCost: 0.15,
      scores: {
        primary: {
          id: 'openai/gpt-4o-mini',
          provider: 'openai',
          model: 'gpt-4o-mini',
          inputCost: 0.15,
          outputCost: 0.6,
          avgCost: 0.375,
          contextWindow: 128000,
          quality: 7.8,
          speed: 9.0,
          priceScore: 9.5,
          compositeScore: 8.5
        },
        fallback: {
          id: 'google/gemini-flash',
          provider: 'google',
          model: 'gemini-flash',
          inputCost: 0.075,
          outputCost: 0.3,
          avgCost: 0.1875,
          contextWindow: 32000,
          quality: 7.6,
          speed: 9.5,
          priceScore: 9.8,
          compositeScore: 8.6
        }
      },
      reasoning: 'Medium-sized TypeScript repository with moderate complexity. Selected efficient models with good price-performance ratio.'
    };
    
    await storage.storeRepositoryConfig('https://github.com/test/repo', repoSelection);
    console.log('✅ Repository configuration stored');
    
    // Test 4: Retrieve repository configuration
    console.log('\n🔍 Test 4: Retrieving repository configuration...');
    const retrievedRepo = await storage.getRepositoryConfig('https://github.com/test/repo');
    
    if (retrievedRepo) {
      console.log('✅ Retrieved repository configuration:', {
        primary: retrievedRepo.primary_model,
        fallback: retrievedRepo.fallback_model,
        estimatedCost: retrievedRepo.estimatedCost,
        reasoning: retrievedRepo.reasoning?.substring(0, 50) + '...'
      });
    } else {
      console.log('⚠️  No repository configuration found (table may not exist)');
    }
    
    // Test 5: Cleanup
    console.log('\n🧹 Test 5: Cleaning up expired configurations...');
    await storage.cleanupExpired();
    console.log('✅ Cleanup completed');
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('\n💡 Note: If you see warnings about table not existing, run the create-deepwiki-config-table.sql script first.');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests
testDeepWikiStorage().catch(console.error);