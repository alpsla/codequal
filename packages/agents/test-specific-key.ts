import OpenAI from 'openai';

async function testKey(apiKey: string) {
  console.log(`🔑 Testing key: ${apiKey.substring(0, 15)}...`);
  console.log('');
  
  const client = new OpenAI({
    apiKey,
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      'HTTP-Referer': 'https://codequal.com',
      'X-Title': 'CodeQual Key Test'
    }
  } as any);
  
  try {
    console.log('📡 Sending test request to OpenRouter...');
    const response = await client.chat.completions.create({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'user', content: 'Reply with just "OK"' }
      ],
      max_tokens: 10,
      temperature: 0
    });
    
    const reply = response.choices[0]?.message?.content || '';
    console.log('✅ SUCCESS! OpenRouter API key is valid');
    console.log(`📨 Response: "${reply}"`);
    console.log('');
    console.log('✅ Key is working correctly!');
    process.exit(0);
    
  } catch (error: any) {
    console.error('❌ FAILED! OpenRouter API key test failed');
    console.error('');
    console.error(`Error: ${error.message}`);
    
    if (error.status) {
      console.error(`Status Code: ${error.status}`);
    }
    
    if (error.status === 401) {
      console.error('');
      console.error('🔴 401 Authentication Error - Possible causes:');
      console.error('  1. Key not activated yet (wait 5-10 minutes after creation)');
      console.error('  2. Key was revoked or deleted');
      console.error('  3. Account has billing issues');
      console.error('  4. Key format is incorrect');
      console.error('');
      console.error('💡 Solution: Generate a new key at https://openrouter.ai/keys');
    }
    
    process.exit(1);
  }
}

const key = process.argv[2];
if (!key) {
  console.error('Usage: npx ts-node test-specific-key.ts <api-key>');
  process.exit(1);
}

testKey(key);
