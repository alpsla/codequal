#!/usr/bin/env npx ts-node

/**
 * Direct OpenRouter API key validation
 */

async function testOpenRouterKey() {
  const apiKey = 'sk-or-v1-218cd645b87710faaed445d916a29785a9518188fca7bf229fea4b87d0a974f32c27ca30ee51ebc3794c67f4a8f517e6b6a40aac692ca85446d153afaa4431';
  
  console.log('🔐 Testing OpenRouter API key directly...');
  console.log('Key format: sk-or-v1-... (appears valid)');
  console.log('=' .repeat(60));
  
  try {
    // Test 1: Simple completion request
    console.log('\n1️⃣ Testing simple completion...');
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://codequal.com',
        'X-Title': 'CodeQual V9 Key Test'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3-haiku-20240307',
        messages: [
          {
            role: 'user',
            content: 'Say "OK" if you receive this'
          }
        ],
        max_tokens: 10,
        temperature: 0
      })
    });
    
    const data = await response.json() as any;
    
    if (!response.ok) {
      console.error('❌ API request failed:');
      console.error('   Status:', response.status);
      console.error('   Error:', JSON.stringify(data, null, 2));
      
      if (data.error?.message?.includes('credits')) {
        console.log('\n💰 Issue: No credits in account');
        console.log('   Solution: Add credits at https://openrouter.ai/credits');
      } else if (data.error?.message?.includes('Invalid API key')) {
        console.log('\n🔑 Issue: Invalid API key');
        console.log('   Solution: Generate new key at https://openrouter.ai/settings/keys');
      } else if (data.error?.message?.includes('User not found')) {
        console.log('\n👤 Issue: Account not found or key not activated');
        console.log('   Solution: Check account at https://openrouter.ai');
      }
      return false;
    }
    
    console.log('✅ API key is valid!');
    console.log('   Response:', data.choices?.[0]?.message?.content);
    console.log('   Tokens used:', data.usage?.total_tokens);
    console.log('   Model:', data.model);
    
    // Test 2: Check available models
    console.log('\n2️⃣ Checking available models...');
    const modelsResponse = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      }
    });
    
    if (modelsResponse.ok) {
      const models = await modelsResponse.json() as any;
      const claudeModels = models.data?.filter((m: any) => 
        m.id.includes('claude')
      ).map((m: any) => m.id);
      
      console.log('✅ Available Claude models:');
      claudeModels?.slice(0, 5).forEach((model: string) => {
        console.log(`   - ${model}`);
      });
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Request failed:', error);
    return false;
  }
}

// Run the test
testOpenRouterKey().then(success => {
  if (success) {
    console.log('\n' + '=' .repeat(60));
    console.log('✅ OpenRouter API key is working!');
    console.log('🚀 Ready to run real V9 analysis');
  } else {
    console.log('\n' + '=' .repeat(60));
    console.log('❌ OpenRouter API key validation failed');
    console.log('📝 Please check the issues above and try again');
  }
});