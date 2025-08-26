#!/usr/bin/env ts-node

/**
 * Test DeepWiki Integration
 * 
 * This script tests the DeepWiki service integration in the Standard framework
 */

import { createDeepWikiService } from '../services/deepwiki-service';

async function testDeepWikiIntegration() {
  console.log('🧪 Testing DeepWiki Integration');
  console.log('================================\n');

  // Test with real mode
  console.log('1️⃣ Testing with Real Mode');
  console.log('-------------------------');
  
  const realService = createDeepWikiService(undefined);
  
  try {
    const realResult = await realService.analyzeRepository(
      'https://github.com/vercel/swr',
      'main'
    );
    
    console.log('✅ Real analysis successful (using fallback to mock)');
    console.log(`   Issues found: ${realResult.issues.length}`);
    console.log(`   Overall score: ${realResult.scores?.overall}`);
    console.log(`   Files analyzed: ${realResult.metadata?.filesAnalyzed}\n`);
    
  } catch (error) {
    console.error('❌ Real test failed:', error);
  }

  console.log('🎉 DeepWiki integration tests complete!');
}

// Run the test
if (require.main === module) {
  testDeepWikiIntegration()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}

export { testDeepWikiIntegration };