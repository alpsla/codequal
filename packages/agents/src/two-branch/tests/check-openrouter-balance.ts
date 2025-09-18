#!/usr/bin/env npx ts-node

/**
 * Check OpenRouter Balance and Make Test Call
 */

import * as dotenv from 'dotenv';
dotenv.config();

async function checkOpenRouterBalance() {
  console.log('💰 OpenRouter Balance Check');
  console.log('=' .repeat(60));
  
  const apiKey = process.env.OPENROUTER_API_KEY;
  
  if (!apiKey) {
    console.error('❌ OPENROUTER_API_KEY not set!');
    return;
  }
  
  // Check current balance
  console.log('\n1️⃣ Current Balance:');
  try {
    const response = await fetch('https://openrouter.ai/api/v1/auth/key', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    if (response.ok) {
      const data: any = await response.json();
      console.log(`   Balance: $${data.data?.usage?.balance || 'Unknown'}`);
      console.log(`   Total Usage: $${data.data?.usage?.total_usage || 'Unknown'}`);
      console.log(`   Limit: $${data.data?.limit || 'Unknown'}`);
      console.log(`   Rate Limit: ${data.data?.rate_limit?.requests || 'Unknown'} req/min`);
    } else {
      console.log('   Failed to fetch balance');
    }
  } catch (e) {
    console.error('   Error:', e);
  }
  
  // Make a small test call with latest model
  console.log('\n2️⃣ Making test API call with LATEST model...');
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/codequal/v9',
        'X-Title': 'V9 Test'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-sonnet-4', // Latest Claude v4
        messages: [
          {
            role: 'system',
            content: 'Reply with exactly 5 words only.'
          },
          {
            role: 'user',
            content: 'What is 2+2?'
          }
        ],
        max_tokens: 20,
        temperature: 0
      })
    });
    
    if (response.ok) {
      const result: any = await response.json();
      console.log('   ✅ API call successful!');
      console.log(`   Model used: ${result.model}`);
      console.log(`   Response: ${result.choices?.[0]?.message?.content}`);
      console.log(`   Usage: ${result.usage?.total_tokens} tokens`);
    } else {
      const error = await response.text();
      console.log('   ❌ API call failed:', error);
    }
  } catch (e) {
    console.error('   Error:', e);
  }
  
  // Check balance again
  console.log('\n3️⃣ Balance After Test:');
  try {
    const response = await fetch('https://openrouter.ai/api/v1/auth/key', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    if (response.ok) {
      const data: any = await response.json();
      console.log(`   Balance: $${data.data?.usage?.balance || 'Unknown'}`);
      console.log(`   Total Usage: $${data.data?.usage?.total_usage || 'Unknown'}`);
      console.log('\n💡 If balance changed, OpenRouter is charging correctly!');
    }
  } catch (e) {
    console.error('   Error:', e);
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('✅ Check complete!');
}

checkOpenRouterBalance().catch(console.error);