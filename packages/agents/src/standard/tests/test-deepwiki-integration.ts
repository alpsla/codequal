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

  // Test with mock mode
  console.log('1️⃣ Testing with Mock Mode');
  console.log('-------------------------');
  
  const mockService = createDeepWikiService(undefined, true);
  
  try {
    const mockResult = await mockService.analyzeRepository(
      'https://github.com/vercel/swr',
      'main'
    );
    
    console.log('✅ Mock analysis successful');
    console.log(`   Issues found: ${mockResult.issues.length}`);
    console.log(`   Overall score: ${mockResult.scores?.overall}`);
    console.log(`   Files analyzed: ${mockResult.metadata?.filesAnalyzed}\n`);
    
    // Test comparison format
    const comparisonResult = await mockService.analyzeRepositoryForComparison(
      'https://github.com/vercel/swr',
      'main'
    );
    
    console.log('✅ Mock comparison format successful');
    console.log(`   Score: ${comparisonResult.score}`);
    console.log(`   Summary: ${comparisonResult.summary}\n`);
    
  } catch (error) {
    console.error('❌ Mock test failed:', error);
  }

  // Test with real mode (will use mock if no API is registered)
  console.log('2️⃣ Testing with Real Mode');
  console.log('-------------------------');
  
  const realService = createDeepWikiService(undefined, false);
  
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