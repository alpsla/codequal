#!/usr/bin/env node

/**
 * Minimal test to verify OpenRouter API calls are actually being made
 * This bypasses all the TypeScript compilation issues
 */

const dotenv = require('dotenv');
const path = require('path');
const fetch = require('node-fetch');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

async function testOpenRouterAPI() {
  console.log('🚀 Testing Real OpenRouter API Calls');
  console.log('=' .repeat(60));
  
  const apiKey = process.env.OPENROUTER_API_KEY;
  
  if (!apiKey) {
    console.error('❌ OPENROUTER_API_KEY not set in .env');
    process.exit(1);
  }
  
  console.log(`✅ API Key found: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`);
  
  // Step 1: Check current balance
  console.log('\n1️⃣ Checking current balance...');
  let balanceBefore = 0;
  
  try {
    const balanceResponse = await fetch('https://openrouter.ai/api/v1/auth/key', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    if (balanceResponse.ok) {
      const balanceData = await balanceResponse.json();
      balanceBefore = parseFloat(balanceData.data?.usage?.balance || '0');
      console.log(`💰 Current balance: $${balanceBefore.toFixed(4)}`);
      console.log(`📊 Total usage: $${balanceData.data?.usage?.total_usage || '0'}`);
    } else {
      console.log('⚠️  Could not fetch balance:', await balanceResponse.text());
    }
  } catch (error) {
    console.error('⚠️  Balance check failed:', error.message);
  }
  
  // Step 2: Make a real API call to a PAID model
  console.log('\n2️⃣ Making a real API call to OpenRouter...');
  console.log('   Using PAID model: claude-3.5-sonnet-20241022');
  
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/codequal/agents',
        'X-Title': 'CodeQual Agent Test'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet-20241022',
        messages: [
          {
            role: 'system',
            content: 'You are a code reviewer. Be very brief.'
          },
          {
            role: 'user',
            content: 'What is the main security concern with this Java code: String query = "SELECT * FROM users WHERE id = " + userId;'
          }
        ],
        max_tokens: 100,
        temperature: 0.7
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API call successful!');
      console.log('   Response:', data.choices[0].message.content.substring(0, 100) + '...');
      console.log('   Model used:', data.model);
      console.log('   Tokens used:', data.usage?.total_tokens || 'unknown');
    } else {
      console.error('❌ API call failed:', await response.text());
    }
  } catch (error) {
    console.error('❌ API call error:', error.message);
  }
  
  // Step 3: Check balance again
  console.log('\n3️⃣ Checking balance after API call...');
  
  try {
    // Wait a moment for balance to update
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const balanceResponse = await fetch('https://openrouter.ai/api/v1/auth/key', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    if (balanceResponse.ok) {
      const balanceData = await balanceResponse.json();
      const balanceAfter = parseFloat(balanceData.data?.usage?.balance || '0');
      console.log(`💰 New balance: $${balanceAfter.toFixed(4)}`);
      
      const cost = balanceBefore - balanceAfter;
      if (cost > 0) {
        console.log(`💵 This test cost: $${cost.toFixed(6)}`);
        console.log('✅ OpenRouter is charging correctly!');
      } else if (cost === 0) {
        console.log('ℹ️  No charge detected (might be using free model or cached)');
      } else {
        console.log('⚠️  Balance increased? Check your account');
      }
    }
  } catch (error) {
    console.error('⚠️  Balance check failed:', error.message);
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('✅ Test completed!');
  console.log('=' .repeat(60));
}

// Run the test
console.log('Starting OpenRouter API test...\n');
testOpenRouterAPI()
  .then(() => {
    console.log('\n✅ All tests completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });