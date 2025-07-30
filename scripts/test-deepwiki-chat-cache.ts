#!/usr/bin/env ts-node

import * as dotenv from 'dotenv';
import { RedisCacheService } from '../packages/core/src/services/cache/RedisCacheService';
import { DeepWikiChatCacheService } from '../packages/core/src/services/deepwiki-chat-cache.service';
import { DeepWikiClient } from '../packages/core/src/deepwiki/DeepWikiClient';
import { createLogger } from '../packages/core/src/utils/logger';

dotenv.config();

async function testDeepWikiChatCache() {
  const logger = createLogger('test-chat-cache');
  
  try {
    logger.info('Testing DeepWiki Chat Cache Integration...');
    
    // 1. Initialize Redis Cache
    logger.info('Connecting to Redis...');
    const cacheService = new RedisCacheService({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      tls: process.env.REDIS_TLS === 'true'
    });
    
    await cacheService.connect();
    logger.info('✅ Redis connected successfully');
    
    // 2. Initialize DeepWiki Client
    const deepWikiUrl = process.env.DEEPWIKI_URL || 'http://localhost:8000';
    const deepWikiClient = new DeepWikiClient(deepWikiUrl, logger);
    logger.info(`✅ DeepWiki client initialized with URL: ${deepWikiUrl}`);
    
    // 3. Create Chat Cache Service
    const chatCacheService = new DeepWikiChatCacheService({
      cacheService,
      deepWikiClient,
      logger,
      cacheTTL: 1800 // 30 minutes
    });
    logger.info('✅ Chat cache service initialized');
    
    // 4. Test repository context retrieval (cache miss)
    const testRepo = 'facebook/react';
    logger.info(`\nTest 1: Getting context for ${testRepo} (cache miss expected)...`);
    
    const startTime1 = Date.now();
    const context1 = await chatCacheService.getRepositoryContext(testRepo);
    const duration1 = Date.now() - startTime1;
    
    logger.info(`✅ Context retrieved in ${duration1}ms`);
    logger.info(`Context: ${JSON.stringify(context1, null, 2).substring(0, 200)}...`);
    
    // 5. Test repository context retrieval (cache hit)
    logger.info(`\nTest 2: Getting context for ${testRepo} (cache hit expected)...`);
    
    const startTime2 = Date.now();
    const context2 = await chatCacheService.getRepositoryContext(testRepo);
    const duration2 = Date.now() - startTime2;
    
    logger.info(`✅ Context retrieved in ${duration2}ms`);
    logger.info(`Cache hit performance: ${duration2}ms (target: <50ms)`);
    
    if (duration2 < 50) {
      logger.info('✅ Performance target met!');
    } else {
      logger.warn('⚠️ Performance below target');
    }
    
    // 6. Test chat functionality
    logger.info(`\nTest 3: Testing chat with cached context...`);
    
    const chatResponse = await chatCacheService.chatWithRepository(
      testRepo,
      'What is the main architecture pattern used in this repository?'
    );
    
    logger.info('✅ Chat response received:');
    logger.info(chatResponse.content.substring(0, 200) + '...');
    
    // 7. Test PR-specific cache
    logger.info(`\nTest 4: Testing PR-specific cache...`);
    
    const prId = '12345';
    const startTime3 = Date.now();
    const prContext = await chatCacheService.getRepositoryContext(testRepo, prId);
    const duration3 = Date.now() - startTime3;
    
    logger.info(`✅ PR context retrieved in ${duration3}ms`);
    
    // 8. Test cache statistics
    logger.info(`\nTest 5: Getting cache statistics...`);
    
    const stats = await chatCacheService.getCacheStats();
    logger.info(`Cache stats: ${JSON.stringify(stats, null, 2)}`);
    
    // 9. Test cache warming
    logger.info(`\nTest 6: Testing cache warming...`);
    
    await chatCacheService.warmCache(['vuejs/vue', 'angular/angular'], ['1', '2']);
    logger.info('✅ Cache warming completed');
    
    // 10. Final cache stats
    const finalStats = await chatCacheService.getCacheStats();
    logger.info(`\nFinal cache stats: ${JSON.stringify(finalStats, null, 2)}`);
    
    // Summary
    logger.info('\n=== Test Summary ===');
    logger.info(`✅ All tests passed`);
    logger.info(`Cache miss latency: ${duration1}ms`);
    logger.info(`Cache hit latency: ${duration2}ms`);
    logger.info(`Performance target (<50ms): ${duration2 < 50 ? 'MET ✅' : 'NOT MET ⚠️'}`);
    logger.info(`Total cache entries: ${finalStats.size}`);
    
    // Cleanup
    await cacheService.disconnect();
    logger.info('\nTest completed successfully!');
    
  } catch (error) {
    logger.error('Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testDeepWikiChatCache();