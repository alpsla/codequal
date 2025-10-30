#!/usr/bin/env ts-node
/**
 * Test OpenRouter API Keys
 * Tests each key by making a simple API call to verify authentication
 */

import dotenv from 'dotenv';
dotenv.config();

// Parse keys from .env
const keysString = process.env.OPENROUTER_API_KEYS || '';
const keys = keysString.split(',').map(k => k.trim()).filter(k => k.length > 0);

console.log('='.repeat(80));
console.log('🔑 Testing OpenRouter API Keys');
console.log('='.repeat(80));
console.log(`Found ${keys.length} keys in OPENROUTER_API_KEYS\n`);

interface TestResult {
  keyIndex: number;
  keyPreview: string;
  status: 'valid' | 'invalid' | 'error';
  statusCode?: number;
  message: string;
}

async function testKey(key: string, index: number): Promise<TestResult> {
  const keyPreview = `${key.substring(0, 15)}...${key.substring(key.length - 8)}`;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/codequal/agents',
        'X-Title': 'CodeQual API Key Test'
      },
      body: JSON.stringify({
        model: 'minimax/minimax-m2:free',
        messages: [
          { role: 'user', content: 'Say "hello" if you can read this.' }
        ],
        max_tokens: 10
      })
    });

    if (response.status === 200) {
      const data = await response.json();
      return {
        keyIndex: index,
        keyPreview,
        status: 'valid',
        statusCode: 200,
        message: '✅ Key is valid and working'
      };
    } else if (response.status === 401) {
      return {
        keyIndex: index,
        keyPreview,
        status: 'invalid',
        statusCode: 401,
        message: '❌ Authentication failed (401 Unauthorized)'
      };
    } else {
      const errorText = await response.text();
      return {
        keyIndex: index,
        keyPreview,
        status: 'error',
        statusCode: response.status,
        message: `⚠️  Unexpected status ${response.status}: ${errorText.substring(0, 100)}`
      };
    }
  } catch (error: any) {
    return {
      keyIndex: index,
      keyPreview,
      status: 'error',
      message: `❌ Network error: ${error.message}`
    };
  }
}

async function main() {
  const results: TestResult[] = [];

  for (let i = 0; i < keys.length; i++) {
    console.log(`Testing Key #${i + 1}...`);
    const result = await testKey(keys[i], i + 1);
    results.push(result);
    console.log(`  ${result.keyPreview}`);
    console.log(`  ${result.message}\n`);

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Summary
  console.log('='.repeat(80));
  console.log('📊 SUMMARY');
  console.log('='.repeat(80));

  const validKeys = results.filter(r => r.status === 'valid');
  const invalidKeys = results.filter(r => r.status === 'invalid');
  const errorKeys = results.filter(r => r.status === 'error');

  console.log(`Total keys tested: ${results.length}`);
  console.log(`✅ Valid keys: ${validKeys.length}`);
  console.log(`❌ Invalid keys (401): ${invalidKeys.length}`);
  console.log(`⚠️  Error keys: ${errorKeys.length}\n`);

  if (validKeys.length === 0) {
    console.log('🚨 CRITICAL: No valid OpenRouter keys found!');
    console.log('   Action Required:');
    console.log('   1. Check if keys have expired or been revoked');
    console.log('   2. Verify OpenRouter account status');
    console.log('   3. Consider using GEMINI_API_KEY for emergency fallback');
  } else {
    console.log(`✅ ${validKeys.length} working key(s) available for use`);
  }

  // Check Gemini fallback
  console.log('\n' + '='.repeat(80));
  console.log('🔄 Checking Emergency Fallback Configuration');
  console.log('='.repeat(80));

  const googleApiKey = process.env.GOOGLE_API_KEY;
  const fallbackProvider = process.env.EMERGENCY_FALLBACK_PROVIDER;
  const fallbackModel = process.env.EMERGENCY_FALLBACK_MODEL;

  console.log(`EMERGENCY_FALLBACK_PROVIDER: ${fallbackProvider || 'not set'}`);
  console.log(`EMERGENCY_FALLBACK_MODEL: ${fallbackModel || 'not set'}`);
  console.log(`GOOGLE_API_KEY: ${googleApiKey ? '✅ Set' : '❌ Not set'}`);

  if (validKeys.length === 0 && googleApiKey) {
    console.log('\n⚠️  NOTE: simple-openrouter-client.ts checks for GEMINI_API_KEY');
    console.log('   But your .env has GOOGLE_API_KEY instead.');
    console.log('   Recommendation: Add GEMINI_API_KEY=${GOOGLE_API_KEY} to .env');
  }

  console.log('='.repeat(80));
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
