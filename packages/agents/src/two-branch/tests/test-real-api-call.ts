/**
 * Test Real OpenRouter API Call - Force actual charges
 */

import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testRealAPICall() {
  console.log('💰 Testing Real OpenRouter API Call');
  console.log('=' .repeat(60));
  
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  
  if (!openRouterKey) {
    console.error('❌ OPENROUTER_API_KEY not set!');
    return;
  }
  
  // Use a model that definitely exists and costs money
  const model = 'anthropic/claude-sonnet-4'; // Using LATEST v4, not outdated 3.5
  
  console.log(`📊 Using model: ${model}`);
  console.log('💵 Cost: $0.003 per 1K input tokens\n');
  
  try {
    // Make a real API call
    console.log('🚀 Making real API call...');
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/codequal/v9-analyzer',
        'X-Title': 'V9 Analyzer Test'
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'system',
            content: 'You are a code quality analyzer. Be very brief.'
          },
          {
            role: 'user',
            content: 'Analyze this Java code for issues (reply in 50 words or less):\n\nString query = "SELECT * FROM users WHERE id = " + userId;'
          }
        ],
        temperature: 0.1,
        max_tokens: 100
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('❌ API Error:', response.status);
      console.error('Error details:', error);
      return;
    }
    
    const data: any = await response.json();
    console.log('✅ API call successful!\n');
    
    // Show response
    console.log('🤖 Model Response:');
    console.log(data.choices?.[0]?.message?.content || 'No response');
    
    // Show usage and cost
    console.log('\n📊 Token Usage:');
    console.log(`- Prompt tokens: ${data.usage?.prompt_tokens || 0}`);
    console.log(`- Completion tokens: ${data.usage?.completion_tokens || 0}`);
    console.log(`- Total tokens: ${data.usage?.total_tokens || 0}`);
    
    // Calculate cost
    const promptCost = (data.usage?.prompt_tokens || 0) * 0.003 / 1000;
    const completionCost = (data.usage?.completion_tokens || 0) * 0.015 / 1000;
    const totalCost = promptCost + completionCost;
    
    console.log('\n💰 Cost Breakdown:');
    console.log(`- Prompt cost: $${promptCost.toFixed(6)}`);
    console.log(`- Completion cost: $${completionCost.toFixed(6)}`);
    console.log(`- TOTAL COST: $${totalCost.toFixed(6)}`);
    
    console.log('\n✅ This should have deducted from your OpenRouter balance!');
    console.log('💡 Check your OpenRouter dashboard to verify the charge.');
    
  } catch (err) {
    console.error('❌ Error:', err);
  }
  
  console.log('\n' + '=' .repeat(60));
}

// Run the test
testRealAPICall().catch(console.error);