#!/usr/bin/env npx ts-node

/**
 * Test the corrected OpenRouter API key
 */

async function testCorrectedKey() {
  const apiKey = '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';
  
  console.log('🔐 Testing corrected OpenRouter API key...');
  console.log(`   Key length: ${apiKey.length} characters`);
  console.log('=' .repeat(60));
  
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://codequal.com',
        'X-Title': 'CodeQual V9 Test'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3-haiku-20240307',
        messages: [
          {
            role: 'user',
            content: 'Respond with OK'
          }
        ],
        max_tokens: 10
      })
    });
    
    const data = await response.json() as any;
    
    if (!response.ok) {
      console.error('❌ API request failed:');
      console.error('   Status:', response.status);
      console.error('   Error:', data.error?.message || JSON.stringify(data));
      return false;
    }
    
    console.log('✅ API key is VALID and WORKING!');
    console.log('   Response:', data.choices?.[0]?.message?.content);
    console.log('   Tokens used:', data.usage?.total_tokens);
    console.log('   Model:', data.model);
    
    // Calculate cost
    const tokens = data.usage?.total_tokens || 0;
    const costPer1M = 0.25 + 1.25; // Haiku pricing
    const cost = (tokens * costPer1M) / 1000000;
    console.log(`   Cost: $${cost.toFixed(6)}`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Request failed:', error);
    return false;
  }
}

testCorrectedKey().then(success => {
  if (success) {
    console.log('\n✅ Ready to run REAL V9 analysis with actual costs!');
  }
});