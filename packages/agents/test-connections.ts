/**
 * Test DeepWiki and Redis connections - BUG-079/081 verification
 */

import { DirectDeepWikiApiWithLocationV2 } from './src/standard/services/direct-deepwiki-api-with-location-v2';
import { loadEnvironment } from './src/standard/utils/env-loader';
import Redis from 'ioredis';

async function testConnections() {
  console.log('🔍 Testing Connections (BUG-079/081 Fix Verification)\n');
  
  // Load environment
  loadEnvironment();
  
  // Test Redis connection
  console.log('📡 Testing Redis Connection...');
  const redisUrl = process.env.REDIS_URL_PUBLIC || process.env.REDIS_URL;
  if (redisUrl) {
    try {
      const redis = new Redis(redisUrl, {
        connectTimeout: 5000,
        commandTimeout: 5000,
        retryStrategy: (times: number) => {
          if (times > 2) return null;
          return Math.min(times * 100, 3000);
        }
      });
      
      const result = await redis.ping();
      if (result === 'PONG') {
        console.log('✅ Redis connected successfully');
        
        // Test cache operations
        await redis.set('test:bug079', 'fixed', 'EX', 60);
        const value = await redis.get('test:bug079');
        console.log(`✅ Redis cache operations working: ${value === 'fixed' ? 'YES' : 'NO'}`);
      }
      
      await redis.quit();
    } catch (error: any) {
      console.error(`❌ Redis connection failed: ${error.message}`);
    }
  } else {
    console.log('⚠️  No Redis URL configured');
  }
  
  // Test DeepWiki connection
  console.log('\n📡 Testing DeepWiki Connection...');
  try {
    const api = new DirectDeepWikiApiWithLocationV2();
    
    // Test with a simple analysis
    console.log('🚀 Analyzing small test repository...');
    const result = await api.analyzeRepository('https://github.com/sindresorhus/is-odd');
    
    if (result && result.issues) {
      console.log(`✅ DeepWiki connected and working`);
      console.log(`   Issues found: ${result.issues.length}`);
      
      // Check if we have location data
      const hasLocation = result.issues.some((issue: any) => 
        issue.location?.file && issue.location?.line
      );
      console.log(`   Location data: ${hasLocation ? 'YES' : 'NO (BUG-083 still present)'}`);
      
      // Check if we have code snippets
      const hasSnippets = result.issues.some((issue: any) => 
        issue.codeSnippet || issue.snippet
      );
      console.log(`   Code snippets: ${hasSnippets ? 'YES' : 'NO (BUG-072 still present)'}`);
    }
  } catch (error: any) {
    console.error(`❌ DeepWiki connection failed: ${error.message}`);
  }
  
  console.log('\n✅ Connection test complete');
}

testConnections().catch(console.error);