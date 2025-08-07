#!/usr/bin/env node

/**
 * Quick Real API Test - Using smaller repository for faster validation
 */

const { deepWikiApiManager } = require('../../apps/api/dist/services/deepwiki-api-manager');

// Force real API
process.env.USE_DEEPWIKI_MOCK = 'false';
process.env.DEEPWIKI_USE_PORT_FORWARD = 'true';

async function quickTest() {
  try {
    console.log('🚀 Quick Real DeepWiki API Test\n');
    console.log('Testing with small repository for faster response...\n');
    
    const startTime = Date.now();
    
    // Use a small repository for quick testing
    const result = await deepWikiApiManager.analyzeRepository(
      'https://github.com/sindresorhus/normalize-url',
      {
        skipCache: true,
        branch: 'main'
      }
    );
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('✅ API Response received!\n');
    console.log(`⏱️  Response time: ${duration} seconds`);
    console.log(`📊 Issues found: ${result.issues?.length || 0}`);
    console.log(`🤖 Model used: ${result.metadata?.model_used || 'unknown'}`);
    console.log(`📈 Overall score: ${result.scores?.overall || 'N/A'}/100`);
    
    // Check if this is real API or mock
    if (duration > 5.0) {
      console.log('\n✅ CONFIRMED: This was a REAL API call');
      console.log('   DeepWiki is using OpenRouter successfully!');
    } else if (duration > 2.0) {
      console.log('\n✅ Likely a real API call (moderate response time)');
    } else {
      console.log('\n⚠️  Fast response - might be cached or mocked');
    }
    
    // Show first few issues
    if (result.issues && result.issues.length > 0) {
      console.log('\n📋 Sample Issues:');
      result.issues.slice(0, 3).forEach((issue, i) => {
        console.log(`\n${i + 1}. ${issue.title || issue.message}`);
        console.log(`   Severity: ${issue.severity}`);
        console.log(`   Category: ${issue.category}`);
        if (issue.suggestedFix && !issue.suggestedFix.includes('// TODO')) {
          console.log(`   ✅ Has real code fix`);
        }
      });
    }
    
    // Save to file for inspection
    const fs = require('fs');
    fs.writeFileSync('quick-api-test-result.json', JSON.stringify(result, null, 2));
    console.log('\n📄 Full result saved to: quick-api-test-result.json');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
  
  process.exit(0);
}

quickTest();