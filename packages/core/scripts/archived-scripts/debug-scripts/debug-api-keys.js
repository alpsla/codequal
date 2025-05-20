#!/usr/bin/env node
/**
 * Debug API Keys and GitHub Authentication
 * 
 * This script tests API keys and GitHub authentication.
 * It allows entering new API keys at runtime for testing.
 */

const axios = require('axios');
const dotenv = require('dotenv');
const readline = require('readline');

// Create readline interface for interactive input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Promisify readline question
function question(query) {
  return new Promise(resolve => {
    rl.question(query, resolve);
  });
}

// Load environment variables
dotenv.config();

// Load API keys from environment variables
const API_KEYS = {
  openai: process.env.OPENAI_API_KEY,
  anthropic: process.env.ANTHROPIC_API_KEY,
  gemini: process.env.GEMINI_API_KEY,
  deepseek: process.env.DEEPSEEK_API_KEY,
  openrouter: process.env.OPENROUTER_API_KEY
};

// GitHub token
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

// Main function
async function testApiKeys() {
  console.log('------------------------------------');
  console.log('Debugging API Keys and Authentication');
  console.log('------------------------------------');
  
  // Check API keys
  console.log('\nChecking API Keys:');
  for (const [provider, key] of Object.entries(API_KEYS)) {
    if (key && key.length > 0) {
      console.log(`✅ ${provider} API key is present (length: ${key.length})`);
    } else {
      console.log(`❌ ${provider} API key is missing`);
    }
  }
  
  // Check GitHub token
  console.log('\nChecking GitHub Token:');
  if (GITHUB_TOKEN && GITHUB_TOKEN.length > 0) {
    console.log(`✅ GitHub token is present (length: ${GITHUB_TOKEN.length})`);
  } else {
    console.log('❌ GitHub token is missing');
  }
  
  // Ask which API to test or enter a new key
  const option = await question('\nSelect an option:\n1. Test existing GitHub token\n2. Test existing Anthropic key\n3. Enter a new GitHub token\n4. Enter a new Anthropic key\n5. Test all APIs\nEnter option (1-5): ');
  
  let githubToken = GITHUB_TOKEN;
  let anthropicKey = API_KEYS.anthropic;
  
  // Handle option selection
  switch (option.trim()) {
    case '1':
      await testGitHubToken(githubToken);
      break;
    case '2':
      await testAnthropicKey(anthropicKey);
      break;
    case '3':
      githubToken = await question('\nEnter new GitHub token: ');
      await testGitHubToken(githubToken);
      break;
    case '4':
      anthropicKey = await question('\nEnter new Anthropic API key: ');
      await testAnthropicKey(anthropicKey);
      break;
    case '5':
      await testGitHubToken(githubToken);
      await testAnthropicKey(anthropicKey);
      break;
    default:
      console.log('Invalid option. Exiting.');
  }
  
  console.log('\nDebug completed');
  rl.close();
}

// Test GitHub token
async function testGitHubToken(token) {
  console.log('\nTesting GitHub API:');
  
  if (!token || token.length === 0) {
    console.log('❌ No GitHub token provided');
    return;
  }
  
  // Try different token formats
  const tokenFormats = [
    `Bearer ${token.trim()}`,
    `token ${token.trim()}`,
    `${token.trim()}`
  ];
  
  let githubSuccess = false;
  
  for (const tokenFormat of tokenFormats) {
    try {
      console.log(`Attempting GitHub API request with token format: ${tokenFormat.substring(0, 10)}...`);
      const authResponse = await axios.get('https://api.github.com/repos/pallets/flask', {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'Authorization': tokenFormat
        }
      });
      
      console.log(`✅ GitHub API request succeeded with token format: ${tokenFormat.substring(0, 10)}...`);
      console.log(`   Repository: ${authResponse.data.full_name}`);
      console.log(`   Stars: ${authResponse.data.stargazers_count}`);
      githubSuccess = true;
      break; // Exit the loop if successful
    } catch (formatError) {
      console.log(`❌ GitHub API request failed with token format: ${tokenFormat.substring(0, 10)}... - ${formatError.message}`);
    }
  }
  
  // Try without authentication if all formats failed
  if (!githubSuccess) {
    try {
      console.log('Attempting unauthenticated GitHub API request...');
      const response = await axios.get('https://api.github.com/repos/pallets/flask');
      
      console.log(`✅ Unauthenticated GitHub API request succeeded (Status: ${response.status})`);
      console.log(`   Repository: ${response.data.full_name}`);
      console.log(`   Stars: ${response.data.stargazers_count}`);
    } catch (error) {
      console.log(`❌ Unauthenticated GitHub API request failed: ${error.message}`);
    }
  }
}

// Test Anthropic API key
async function testAnthropicKey(key) {
  console.log('\nTesting Anthropic API:');
  
  if (!key || key.length === 0) {
    console.log('❌ No Anthropic API key provided');
    return;
  }
  
  // Test Anthropic models
  const models = [
    'claude-3-haiku-20240307',
    'claude-3-sonnet-20240229',
    'claude-3-opus-20240229',
    'claude-3-7-sonnet'
  ];
  
  let anthropicSuccess = false;
  
  for (const model of models) {
    if (anthropicSuccess) break;
    
    console.log(`\nTesting with model: ${model}`);
    
    // Try with x-api-key
    try {
      console.log('Attempting Anthropic API request with x-api-key...');
      const anthropicResponse = await axios.post('https://api.anthropic.com/v1/messages', {
        model: model,
        max_tokens: 10,
        messages: [
          { role: 'user', content: 'Say "Hello"' }
        ]
      }, {
        headers: {
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
          'x-api-key': key.trim()
        }
      });
      
      console.log(`✅ Anthropic API request succeeded with x-api-key (Status: ${anthropicResponse.status})`);
      console.log(`   Content: ${JSON.stringify(anthropicResponse.data.content[0].text)}`);
      anthropicSuccess = true;
      continue;
    } catch (error) {
      console.log(`❌ Anthropic API request failed with x-api-key: ${error.message}`);
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Data: ${JSON.stringify(error.response.data)}`);
      }
    }
    
    // Try with Authorization header
    try {
      console.log('Attempting Anthropic API request with Authorization header...');
      const anthropicResponse = await axios.post('https://api.anthropic.com/v1/messages', {
        model: model,
        max_tokens: 10,
        messages: [
          { role: 'user', content: 'Say "Hello"' }
        ]
      }, {
        headers: {
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
          'Authorization': `Bearer ${key.trim()}`
        }
      });
      
      console.log(`✅ Anthropic API request succeeded with Authorization header (Status: ${anthropicResponse.status})`);
      console.log(`   Content: ${JSON.stringify(anthropicResponse.data.content[0].text)}`);
      anthropicSuccess = true;
    } catch (authError) {
      console.log(`❌ Anthropic API request failed with Authorization header: ${authError.message}`);
      if (authError.response) {
        console.log(`   Status: ${authError.response.status}`);
        console.log(`   Data: ${JSON.stringify(authError.response.data)}`);
      }
    }
  }
  
  if (!anthropicSuccess) {
    console.log('\n❌ All Anthropic API tests failed. Your API key may be invalid or expired.');
    console.log('Visit https://console.anthropic.com/keys to create a new API key.');
  }
}

// Run the test
testApiKeys().catch(error => {
  console.error('Test failed:', error);
  rl.close();
  process.exit(1);
});