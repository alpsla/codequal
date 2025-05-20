#!/usr/bin/env node
/**
 * Quick Multi-Provider Test
 * 
 * Simplifies testing across all model providers with minimal setup.
 */

const axios = require('axios');
const dotenv = require('dotenv');
const readline = require('readline');

// Load environment variables
dotenv.config();

// Load API keys from environment
const API_KEYS = {
  anthropic: process.env.ANTHROPIC_API_KEY,
  openai: process.env.OPENAI_API_KEY,
  gemini: process.env.GEMINI_API_KEY,
  deepseek: process.env.DEEPSEEK_API_KEY,
  openrouter: process.env.OPENROUTER_API_KEY
};

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Promisify readline question
function ask(question) {
  return new Promise(resolve => {
    rl.question(question, answer => {
      resolve(answer);
    });
  });
}

// Test Anthropic API
async function testAnthropic() {
  console.log('\n--- Testing Anthropic API ---');
  
  if (!API_KEYS.anthropic) {
    console.log('No Anthropic API key found in environment.');
    const key = await ask('Enter Anthropic API key (or press Enter to skip): ');
    if (!key) return false;
    API_KEYS.anthropic = key;
  }
  
  try {
    console.log('Calling Anthropic API with Claude 3 Haiku...');
    
    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-3-haiku-20240307',
      max_tokens: 25,
      system: 'You are a helpful assistant.',
      messages: [
        { role: 'user', content: 'Say hello and tell me one interesting fact about coding.' }
      ]
    }, {
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': API_KEYS.anthropic
      }
    });
    
    console.log('Status:', response.status);
    console.log('Response:', response.data.content[0].text);
    return true;
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response error:', JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }
}

// Test OpenAI API
async function testOpenAI() {
  console.log('\n--- Testing OpenAI API ---');
  
  if (!API_KEYS.openai) {
    console.log('No OpenAI API key found in environment.');
    const key = await ask('Enter OpenAI API key (or press Enter to skip): ');
    if (!key) return false;
    API_KEYS.openai = key;
  }
  
  try {
    console.log('Calling OpenAI API with GPT-3.5-Turbo...');
    
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-3.5-turbo',
      max_tokens: 25,
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Say hello and tell me one interesting fact about coding.' }
      ]
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEYS.openai}`
      }
    });
    
    console.log('Status:', response.status);
    console.log('Response:', response.data.choices[0].message.content);
    return true;
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response error:', JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }
}

// Test Gemini API
async function testGemini() {
  console.log('\n--- Testing Gemini API ---');
  
  if (!API_KEYS.gemini) {
    console.log('No Gemini API key found in environment.');
    const key = await ask('Enter Gemini API key (or press Enter to skip): ');
    if (!key) return false;
    API_KEYS.gemini = key;
  }
  
  try {
    console.log('Calling Gemini API with gemini-pro...');
    
    const response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${API_KEYS.gemini}`, {
      contents: [
        { parts: [{ text: 'Say hello and tell me one interesting fact about coding.' }] }
      ],
      generationConfig: {
        maxOutputTokens: 25,
        temperature: 0.7
      }
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Status:', response.status);
    console.log('Response:', response.data.candidates[0].content.parts[0].text);
    return true;
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response error:', JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }
}

// Test DeepSeek API
async function testDeepSeek() {
  console.log('\n--- Testing DeepSeek API ---');
  
  if (!API_KEYS.deepseek) {
    console.log('No DeepSeek API key found in environment.');
    const key = await ask('Enter DeepSeek API key (or press Enter to skip): ');
    if (!key) return false;
    API_KEYS.deepseek = key;
  }
  
  try {
    console.log('Calling DeepSeek API with deepseek-coder...');
    
    const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
      model: 'deepseek-coder',
      max_tokens: 25,
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Say hello and tell me one interesting fact about coding.' }
      ]
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEYS.deepseek}`
      }
    });
    
    console.log('Status:', response.status);
    console.log('Response:', response.data.choices[0].message.content);
    return true;
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response error:', JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }
}

// Test OpenRouter API
async function testOpenRouter() {
  console.log('\n--- Testing OpenRouter API ---');
  
  if (!API_KEYS.openrouter) {
    console.log('No OpenRouter API key found in environment.');
    const key = await ask('Enter OpenRouter API key (or press Enter to skip): ');
    if (!key) return false;
    API_KEYS.openrouter = key;
  }
  
  try {
    // First get available models
    console.log('Fetching available models from OpenRouter...');
    
    const modelsResponse = await axios.get('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${API_KEYS.openrouter}`
      }
    });
    
    const availableModels = modelsResponse.data.data || [];
    
    if (availableModels.length === 0) {
      console.log('No models available on OpenRouter');
      return false;
    }
    
    // Select first available model
    const model = availableModels[0].id;
    console.log(`Using model: ${model}`);
    
    // Make request
    console.log('Calling OpenRouter API...');
    
    const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
      model,
      max_tokens: 25,
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Say hello and tell me one interesting fact about coding.' }
      ]
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEYS.openrouter}`,
        'HTTP-Referer': 'https://codequal.io',
        'X-Title': 'CodeQual Repository Analysis'
      }
    });
    
    console.log('Status:', response.status);
    console.log('Response:', response.data.choices[0].message.content);
    return true;
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response error:', JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }
}

// Main function
async function main() {
  console.log('=== Quick Multi-Provider Test ===');
  console.log('This script tests all model providers with simple API calls.');
  
  // Ask which providers to test
  console.log('\nWhich providers would you like to test?');
  console.log('1. All providers');
  console.log('2. Anthropic only');
  console.log('3. OpenAI only');
  console.log('4. Gemini only');
  console.log('5. DeepSeek only');
  console.log('6. OpenRouter only');
  
  const choice = await ask('Enter your choice (1-6): ');
  
  const results = {};
  
  switch (choice) {
    case '1':
      results.anthropic = await testAnthropic();
      results.openai = await testOpenAI();
      results.gemini = await testGemini();
      results.deepseek = await testDeepSeek();
      results.openrouter = await testOpenRouter();
      break;
    case '2':
      results.anthropic = await testAnthropic();
      break;
    case '3':
      results.openai = await testOpenAI();
      break;
    case '4':
      results.gemini = await testGemini();
      break;
    case '5':
      results.deepseek = await testDeepSeek();
      break;
    case '6':
      results.openrouter = await testOpenRouter();
      break;
    default:
      console.log('Invalid choice, testing all providers.');
      results.anthropic = await testAnthropic();
      results.openai = await testOpenAI();
      results.gemini = await testGemini();
      results.deepseek = await testDeepSeek();
      results.openrouter = await testOpenRouter();
  }
  
  // Summary of results
  console.log('\n=== Test Results Summary ===');
  
  for (const [provider, success] of Object.entries(results)) {
    console.log(`${provider}: ${success ? '✅ Success' : '❌ Failed'}`);
  }
  
  console.log('\nTesting complete!');
  rl.close();
}

// Run main function
main().catch(error => {
  console.error('Unexpected error:', error);
  rl.close();
});