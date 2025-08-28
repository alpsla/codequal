/**
 * Test DeepWiki without any cache
 */

import { DirectDeepWikiApiWithLocationV2 } from './src/standard/services/direct-deepwiki-api-with-location-v2';
import { loadEnvironment } from './src/standard/utils/env-loader';

// Disable Redis before loading
process.env.DISABLE_REDIS = 'true';

loadEnvironment();

async function testWithoutCache() {
  console.log('🔍 Testing DeepWiki WITHOUT Cache\n');
  
  const api = new DirectDeepWikiApiWithLocationV2();
  
  try {
    console.log('📍 Analyzing main branch (no cache)...');
    const result = await api.analyzeRepository('https://github.com/sindresorhus/ky', {
      useCache: false,
      maxIterations: 1,
      branch: 'main'
    });
    
    console.log('\n📊 Results:');
    console.log(`  Total issues: ${result.issues.length}`);
    
    if (result.issues.length > 0) {
      console.log('\n✅ SUCCESS! Found issues:');
      result.issues.slice(0, 5).forEach((issue: any, idx: number) => {
        console.log(`${idx + 1}. ${issue.title || issue.description}`);
        console.log(`   File: ${issue.location?.file || issue.file || 'unknown'}`);
        console.log(`   Line: ${issue.location?.line || issue.line || 0}`);
        console.log(`   Severity: ${issue.severity}`);
      });
    } else {
      console.log('\n❌ Still getting 0 issues - parser may still be broken');
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

testWithoutCache().catch(console.error);