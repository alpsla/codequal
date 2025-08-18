#!/usr/bin/env npx ts-node

/**
 * Test script to verify BUG-035 fix: Web search functionality for latest models
 */

import { ProductionResearcherService } from './src/researcher/production-researcher-service';
import { createLogger } from '@codequal/core/utils';

const logger = createLogger('BUG-035-Test');

async function testWebSearchFunctionality() {
  logger.info('🧪 Testing BUG-035 Fix: Web Search for Latest Models');
  
  try {
    // Create mock dependencies for testing
    const mockVectorStorage = {
      storeChunks: async () => {},
      searchChunks: async () => [],
      deleteChunks: async () => {}
    } as any;
    
    const mockModelVersionSync = {
      syncModelVersions: async () => [],
      getLatestModels: async () => []
    } as any;
    
    // Create researcher service instance
    const researcher = new ProductionResearcherService(
      mockVectorStorage,
      mockModelVersionSync
    );
    
    logger.info('📊 Testing web search functionality...');
    
    // Access the private method via any type casting for testing
    const researcherAny = researcher as any;
    
    // Test the web search method
    const discoveredModels = await researcherAny.searchWebForLatestModels();
    
    logger.info(`✅ Web search discovered ${discoveredModels.length} models`);
    
    // Verify we found expected models
    const expectedModels = [
      'anthropic/claude-opus-4-1-20250805',
      'anthropic/claude-opus-4',
      'openai/gpt-5',
      'google/gemini-2.0-flash-exp'
    ];
    
    let foundCount = 0;
    for (const expected of expectedModels) {
      if (discoveredModels.includes(expected)) {
        logger.info(`✓ Found expected model: ${expected}`);
        foundCount++;
      } else {
        logger.warn(`✗ Missing expected model: ${expected}`);
      }
    }
    
    // Test the extraction functionality
    logger.info('\n📝 Testing model extraction from text...');
    const testText = 'Claude Opus 4.1 was released in August 2025. GPT-5 is also available. Gemini 2.0 offers great performance.';
    const extracted = researcherAny.extractModelNamesFromText(testText);
    logger.info(`Extracted ${extracted.length} models from test text:`, extracted);
    
    // Test normalization
    logger.info('\n🔄 Testing model name normalization...');
    const testNames = ['claude-opus-4-1', 'gpt-5', 'gemini-2.0'];
    for (const name of testNames) {
      const normalized = researcherAny.normalizeModelName(name);
      logger.info(`  ${name} → ${normalized}`);
    }
    
    // Summary
    logger.info('\n📊 Test Summary:');
    logger.info(`  - Models discovered: ${discoveredModels.length}`);
    logger.info(`  - Expected models found: ${foundCount}/${expectedModels.length}`);
    logger.info(`  - Web search functionality: ${discoveredModels.length > 0 ? '✅ WORKING' : '❌ NOT WORKING'}`);
    
    if (discoveredModels.length > 0) {
      logger.info('\n✅ BUG-035 FIX VERIFIED: Web search is now discovering models!');
      logger.info('The system is no longer limited to OpenRouter catalog only.');
      return true;
    } else {
      logger.error('\n❌ BUG-035 NOT FIXED: Web search still not returning models');
      return false;
    }
    
  } catch (error) {
    logger.error('Test failed with error:', error);
    return false;
  }
}

// Run the test
testWebSearchFunctionality().then(success => {
  process.exit(success ? 0 : 1);
});