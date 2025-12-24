/**
 * OpenRouter API Key Test
 * Tests all available keys to find working ones
 */
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function testOpenRouterKeys(): Promise<void> {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║     OPENROUTER API KEY TEST                                  ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  // Collect all keys
  const keys: string[] = [];

  // From OPENROUTER_API_KEYS (plural, comma-separated)
  if (process.env.OPENROUTER_API_KEYS) {
    const keyList = process.env.OPENROUTER_API_KEYS.split(',').map(k => k.trim()).filter(k => k.length > 0);
    console.log(`Found ${keyList.length} keys in OPENROUTER_API_KEYS`);
    keys.push(...keyList);
  }

  // From OPENROUTER_API_KEY (singular)
  if (process.env.OPENROUTER_API_KEY) {
    console.log('Found key in OPENROUTER_API_KEY');
    if (!keys.includes(process.env.OPENROUTER_API_KEY)) {
      keys.push(process.env.OPENROUTER_API_KEY);
    }
  }

  console.log(`\nTotal unique keys: ${keys.length}\n`);

  if (keys.length === 0) {
    console.log('❌ No OpenRouter keys found in environment');
    return;
  }

  let workingKey: string | null = null;

  // Test each key
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const maskedKey = key.substring(0, 10) + '...' + key.substring(key.length - 4);
    console.log(`Testing key ${i + 1}: ${maskedKey}`);

    try {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${key}`,
          'HTTP-Referer': 'https://codequal.com',
          'X-Title': 'CodeQual Key Test'
        }
      });

      if (response.ok) {
        const data = await response.json() as { data?: unknown[] };
        console.log(`   ✅ MODELS API - ${data.data?.length || 0} models available`);

        // Try a simple completion to verify the key works for inference
        console.log('   Testing inference...');
        const inferResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://codequal.com',
            'X-Title': 'CodeQual Key Test'
          },
          body: JSON.stringify({
            model: 'anthropic/claude-3.5-haiku',
            messages: [{ role: 'user', content: 'Say "key works" in exactly 2 words' }],
            max_tokens: 10
          })
        });

        if (inferResponse.ok) {
          const inferData = await inferResponse.json() as { choices?: Array<{ message?: { content?: string } }> };
          const reply = inferData.choices?.[0]?.message?.content || 'no reply';
          console.log(`   ✅ INFERENCE SUCCESS - Response: "${reply.trim()}"`);
          workingKey = key;
        } else {
          const errorData = await inferResponse.text();
          console.log(`   ⚠️  INFERENCE FAILED - ${inferResponse.status}: ${errorData.substring(0, 100)}`);
        }
      } else {
        const errorData = await response.text();
        console.log(`   ❌ MODELS API FAILED - ${response.status}: ${errorData.substring(0, 100)}`);
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.log(`   ❌ ERROR - ${msg}`);
    }
    console.log('');
  }

  // Summary
  console.log('═══════════════════════════════════════════════════════════════');
  if (workingKey) {
    const maskedWorking = workingKey.substring(0, 10) + '...' + workingKey.substring(workingKey.length - 4);
    console.log(`✅ WORKING KEY FOUND: ${maskedWorking}`);
    console.log('\nRecommendation: Update OPENROUTER_API_KEY in .env with this working key');
  } else {
    console.log('❌ NO WORKING KEYS FOUND');
    console.log('\nPossible issues:');
    console.log('   1. Keys may be expired - check https://openrouter.ai/keys');
    console.log('   2. Account may have insufficient credits');
    console.log('   3. Keys may be rate limited - wait and retry');
  }
}

testOpenRouterKeys().catch(console.error);
