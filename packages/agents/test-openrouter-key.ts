import * as dotenv from 'dotenv';
import https from 'https';

dotenv.config();

async function testOpenRouter() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  
  if (!apiKey) {
    console.error('❌ OPENROUTER_API_KEY not found in .env');
    process.exit(1);
  }
  
  console.log('🔑 Testing OpenRouter API Key...');
  console.log(`   Key: ${apiKey.substring(0, 10)}...${apiKey.slice(-4)}\n`);
  
  // Test 1: Check key format
  if (!apiKey.startsWith('sk-or-')) {
    console.log('⚠️  WARNING: Key does not start with "sk-or-" (expected format)');
  }
  
  // Test 2: Ping models endpoint
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'openrouter.ai',
      port: 443,
      path: '/api/v1/models',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://codequal.ai',
        'X-Title': 'CodeQual'
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`📡 HTTP Status: ${res.statusCode}\n`);
        
        if (res.statusCode === 200) {
          try {
            const parsed = JSON.parse(data);
            console.log(`✅ SUCCESS! API Key is valid`);
            console.log(`   Available models: ${parsed.data?.length || 0}`);
            
            // Check for specific models we use
            const ourModels = [
              'deepseek/deepseek-chat-v3.1',
              'deepseek/deepseek-v3.2-exp',
              'anthropic/claude-opus-4.1',
              'anthropic/claude-sonnet-4.5',
              'google/gemini-2.5-flash'
            ];
            
            console.log('\n🔍 Checking our models:');
            ourModels.forEach(model => {
              const found = parsed.data?.find((m: any) => m.id === model);
              if (found) {
                console.log(`   ✅ ${model}`);
              } else {
                console.log(`   ❌ ${model} - NOT FOUND`);
              }
            });
            
            resolve(true);
          } catch (error) {
            console.error('❌ Failed to parse response:', error);
            console.log('Response:', data.substring(0, 200));
            reject(error);
          }
        } else if (res.statusCode === 401) {
          console.log('❌ AUTHENTICATION FAILED');
          console.log('   The API key is invalid or expired');
          console.log(`   Response: ${data.substring(0, 200)}`);
          reject(new Error('Invalid API key'));
        } else if (res.statusCode === 429) {
          console.log('⚠️  RATE LIMITED');
          console.log('   Too many requests. This might be why E2E failed!');
          console.log(`   Response: ${data.substring(0, 200)}`);
          reject(new Error('Rate limited'));
        } else {
          console.log(`❌ ERROR: ${res.statusCode}`);
          console.log(`   Response: ${data.substring(0, 200)}`);
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ Network error:', error);
      reject(error);
    });
    
    req.end();
  });
}

testOpenRouter().catch(err => {
  console.error('\n💥 Test failed:', err.message);
  process.exit(1);
});
