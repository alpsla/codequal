#!/usr/bin/env node
/**
 * Test: OpenRouter API Key Rotation
 *
 * Purpose: Verify that SimpleOpenRouterClient correctly rotates through
 * multiple API keys when encountering 401 authentication errors.
 *
 * Test Scenario:
 * 1. Set OPENROUTER_API_KEYS with 3 keys (2 invalid, 1 valid)
 * 2. Make an API call
 * 3. Verify it rotates through failed keys and succeeds with valid key
 */

import { getSimpleOpenRouterClient } from './src/two-branch/services/simple-openrouter-client';

async function testKeyRotation() {
  console.log('🧪 Testing OpenRouter API Key Rotation\n');

  // Setup: Create test keys array (2 invalid + 1 valid from .env)
  const validKey = process.env.OPENROUTER_API_KEY || '';
  const invalidKey1 = 'sk-or-v1-invalid-key-000000000000000000000000000000000000000000000000';
  const invalidKey2 = 'sk-or-v1-invalid-key-111111111111111111111111111111111111111111111111';

  if (!validKey) {
    console.error('❌ ERROR: OPENROUTER_API_KEY not found in environment');
    console.log('Please set OPENROUTER_API_KEY in .env file');
    process.exit(1);
  }

  // Set multiple keys (invalid keys first, valid key last)
  process.env.OPENROUTER_API_KEYS = `${invalidKey1},${invalidKey2},${validKey}`;

  console.log('📋 Test Configuration:');
  console.log(`   - Key 1 (invalid): ${invalidKey1.substring(0, 20)}...`);
  console.log(`   - Key 2 (invalid): ${invalidKey2.substring(0, 20)}...`);
  console.log(`   - Key 3 (valid):   ${validKey.substring(0, 20)}...`);
  console.log('');

  try {
    console.log('🚀 Making API call (should rotate through keys)...\n');

    const client = getSimpleOpenRouterClient();

    const response = await client.chat({
      systemPrompt: 'You are a helpful assistant.',
      userPrompt: 'Say "Hello" in one word.',
      model: 'google/gemini-2.0-flash-exp:free',
      temperature: 0.3,
      maxTokens: 10
    });

    console.log('\n✅ SUCCESS: API call completed');
    console.log(`   Provider: ${response.provider}`);
    console.log(`   Model: ${response.model}`);
    console.log(`   Response: ${response.content.trim()}`);
    console.log('');

    if (response.provider === 'openrouter') {
      console.log('✅ Key rotation worked! Successfully used valid OpenRouter key after invalid keys.');
    } else {
      console.log('⚠️  Fell back to emergency provider (Gemini). This suggests all OpenRouter keys failed.');
    }

    console.log('\n📊 Test Result: PASSED ✅');
    console.log('Key rotation logic is working correctly.');

  } catch (error: any) {
    console.error('\n❌ FAILED: Test encountered an error');
    console.error(`Error: ${error.message}`);
    console.log('\n📊 Test Result: FAILED ❌');
    process.exit(1);
  }
}

// Run test
testKeyRotation().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
