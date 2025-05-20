#!/usr/bin/env node
/**
 * Simple script to test Anthropic API key
 */

const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Find and load the .env file from the project root
const envPath = path.resolve(__dirname, '..', '..', '..', '.env');
console.log(`Loading .env from: ${envPath}`);

if (fs.existsSync(envPath)) {
  const result = dotenv.config({ path: envPath });
  if (result.error) {
    console.error('Error loading .env file:', result.error.message);
  } else {
    console.log('Successfully loaded .env file');
  }
} else {
  console.error('.env file not found at expected location');
}

// Check if ANTHROPIC_API_KEY exists
const apiKey = process.env.ANTHROPIC_API_KEY;
console.log('ANTHROPIC_API_KEY present in environment:', !!apiKey);
if (apiKey) {
  console.log('API key length:', apiKey.length);
  console.log('API key prefix:', apiKey.substring(0, 5) + '...');
}

// Attempt API call to Anthropic
async function testAnthropicAPI() {
  console.log('\nTesting Anthropic API with the loaded key...');
  try {
    // Ensure the key doesn't have any whitespace or unexpected characters
    const cleanedKey = apiKey.trim();
    console.log('Using cleaned key with length:', cleanedKey.length);
    
    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-3-haiku-20240307',
      max_tokens: 10,
      messages: [
        { role: 'user', content: 'Hello' }
      ]
    }, {
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': cleanedKey
      }
    });
    
    console.log('Response status:', response.status);
    console.log('API test succeeded!');
    return true;
  } catch (error) {
    console.error('Error testing Anthropic API:', error.message);
    if (error.response) {
      console.error('Error response:', JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }
}

// Test API with manual key input
async function testManualKey() {
  console.log('\nWould you like to test with a manually entered key? (yes/no)');
  process.stdin.once('data', async (data) => {
    const input = data.toString().trim().toLowerCase();
    if (input === 'yes' || input === 'y') {
      console.log('Please enter your Anthropic API key:');
      process.stdin.once('data', async (keyData) => {
        const manualKey = keyData.toString().trim();
        console.log('Manual key length:', manualKey.length);
        
        try {
          const response = await axios.post('https://api.anthropic.com/v1/messages', {
            model: 'claude-3-haiku-20240307',
            max_tokens: 10,
            messages: [
              { role: 'user', content: 'Hello' }
            ]
          }, {
            headers: {
              'Content-Type': 'application/json',
              'anthropic-version': '2023-06-01',
              'x-api-key': manualKey
            }
          });
          
          console.log('Manual key response status:', response.status);
          console.log('Manual key test succeeded!');
        } catch (error) {
          console.error('Error with manual key:', error.message);
          if (error.response) {
            console.error('Error response:', JSON.stringify(error.response.data, null, 2));
          }
        }
        
        process.exit(0);
      });
    } else {
      console.log('Skipping manual key test.');
      process.exit(0);
    }
  });
}

// Run tests
testAnthropicAPI()
  .then(success => {
    if (!success) {
      testManualKey();
    } else {
      process.exit(0);
    }
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    testManualKey();
  });