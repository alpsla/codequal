#!/usr/bin/env npx ts-node

/**
 * Test with correct model IDs
 */

async function testWithCorrectModels() {
  const apiKey = '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';
  
  console.log('🔐 Testing OpenRouter with correct model IDs...');
  console.log('=' .repeat(60));
  
  // First, get available models
  console.log('\n1️⃣ Fetching available models...');
  const modelsResponse = await fetch('https://openrouter.ai/api/v1/models', {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    }
  });
  
  if (modelsResponse.ok) {
    const models = await modelsResponse.json() as any;
    const claudeModels = models.data?.filter((m: any) => 
      m.id.toLowerCase().includes('claude')
    );
    
    console.log('Available Claude models:');
    claudeModels?.slice(0, 10).forEach((model: any) => {
      console.log(`   - ${model.id} ($${model.pricing?.prompt}/1k tokens)`);
    });
    
    // Test with first available Claude model
    if (claudeModels && claudeModels.length > 0) {
      const testModel = claudeModels[0].id;
      console.log(`\n2️⃣ Testing with model: ${testModel}`);
      
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://codequal.com',
          'X-Title': 'CodeQual V9'
        },
        body: JSON.stringify({
          model: testModel,
          messages: [
            {
              role: 'user',
              content: 'Say "OK"'
            }
          ],
          max_tokens: 10
        })
      });
      
      const data = await response.json() as any;
      
      if (!response.ok) {
        console.error('❌ Error:', data.error?.message || JSON.stringify(data));
        return false;
      }
      
      console.log('✅ SUCCESS! API is working!');
      console.log('   Response:', data.choices?.[0]?.message?.content);
      console.log('   Model used:', data.model);
      console.log('   Tokens:', data.usage?.total_tokens);
      
      // Calculate real cost
      const promptTokens = data.usage?.prompt_tokens || 0;
      const completionTokens = data.usage?.completion_tokens || 0;
      const modelPricing = claudeModels[0].pricing;
      const cost = (promptTokens * (modelPricing?.prompt || 0) + 
                   completionTokens * (modelPricing?.completion || 0)) / 1000;
      console.log(`   💰 Real cost: $${cost.toFixed(6)}`);
      
      return true;
    }
  }
  
  return false;
}

testWithCorrectModels().catch(console.error);