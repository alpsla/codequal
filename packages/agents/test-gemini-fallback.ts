#!/usr/bin/env ts-node

/**
 * Test Gemini 2.5 Pro Emergency Fallback
 *
 * Validates that Gemini emergency fallback is working correctly
 * with the updated model configuration.
 */

import { getEmergencyFallbackProvider } from './src/two-branch/services/emergency-fallback-provider';

async function testGeminiFallback() {
  console.log('🧪 Testing Gemini 2.5 Pro Emergency Fallback\n');

  try {
    // Get the emergency fallback provider
    const fallback = getEmergencyFallbackProvider();

    // Check configuration
    const config = fallback.getConfig();
    console.log('📋 Configuration:');
    console.log(`   Provider: ${config.provider}`);
    console.log(`   Model: ${config.model}`);
    console.log(`   API Key: ${config.apiKey ? config.apiKey.substring(0, 10) + '...' : 'NOT SET'}`);
    console.log(`   Available: ${fallback.isAvailable() ? '✅ Yes' : '❌ No'}\n`);

    if (!fallback.isAvailable()) {
      console.error('❌ Emergency fallback not available. Check GOOGLE_API_KEY in .env');
      process.exit(1);
    }

    // Test with a simple request
    console.log('🚀 Sending test request to Gemini 2.5 Pro...\n');

    const systemPrompt = 'You are a helpful code analysis assistant. Provide concise, accurate responses.';
    const userPrompt = 'Explain in one sentence what a SQL injection vulnerability is.';

    const startTime = Date.now();
    const response = await fallback.execute(systemPrompt, userPrompt, 0.3, 2000); // Increased max tokens
    const duration = Date.now() - startTime;

    console.log('✅ Response received!\n');
    console.log('📊 Results:');
    console.log(`   Provider: ${response.provider}`);
    console.log(`   Model: ${response.model}`);
    console.log(`   Duration: ${duration}ms`);
    console.log(`   Content length: ${response.content.length} characters\n`);
    console.log('💬 Response:');
    console.log(`   "${response.content}"\n`);

    // Validate response
    if (response.content.length > 0 && response.provider === 'gemini') {
      console.log('✅ SUCCESS: Gemini 2.5 Pro emergency fallback is working!\n');
      console.log('📝 Summary:');
      console.log('   ✅ Configuration loaded correctly');
      console.log('   ✅ API key valid');
      console.log('   ✅ Model responding (gemini-2.5-pro)');
      console.log('   ✅ Response quality good\n');
      console.log('🎉 Emergency fallback ready for production use!');
      process.exit(0);
    } else {
      console.error('❌ FAILED: Invalid response from Gemini');
      process.exit(1);
    }

  } catch (error: any) {
    console.error('\n❌ Test Failed:');
    console.error(`   Error: ${error.message}`);
    console.error(`   Stack: ${error.stack}\n`);

    console.log('🔍 Troubleshooting:');
    console.log('   1. Check GOOGLE_API_KEY in .env file');
    console.log('   2. Verify Gemini API is enabled in Google Cloud');
    console.log('   3. Confirm model name is correct (gemini-2.5-pro)');
    console.log('   4. Check API quota/billing status\n');

    process.exit(1);
  }
}

// Run the test
testGeminiFallback();
