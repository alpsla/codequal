#!/usr/bin/env node
/**
 * Simple API key verification tool
 */

const axios = require('axios');
const readline = require('readline');

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Promisified readline question
function question(query) {
  return new Promise(resolve => {
    rl.question(query, resolve);
  });
}

// Verify Anthropic API key
async function verifyAnthropicKey(apiKey) {
  console.log('\nTesting Anthropic API key...');
  try {
    const cleanedKey = apiKey.trim();
    console.log('Key length:', cleanedKey.length);
    
    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-3-haiku-20240307',
      max_tokens: 10,
      messages: [
        { role: 'user', content: 'Hello' }
      ]
      // No system parameter needed for this simple test
    }, {
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': cleanedKey
      }
    });
    
    console.log('Response status:', response.status);
    console.log('✅ Anthropic API key is valid!');
    console.log('\nYou can use this key in the calibration script.');
    return true;
  } catch (error) {
    console.error('❌ Error testing Anthropic API:', error.message);
    if (error.response) {
      console.error('Error details:', JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }
}

// Main function
async function main() {
  console.log('==== API Key Verification Tool ====');
  console.log('This tool helps verify if your API keys are valid.\n');
  
  let apiKey = await question('Enter your Anthropic API key: ');
  
  // Verify the key
  const isValid = await verifyAnthropicKey(apiKey);
  
  if (isValid) {
    console.log('\nYou can now use this key in your scripts!');
  } else {
    console.log('\nThe key appears to be invalid. Please check your key and try again.');
  }
  
  rl.close();
}

// Run main function
main().catch(error => {
  console.error('Unexpected error:', error);
  rl.close();
});