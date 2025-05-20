#!/usr/bin/env node
/**
 * Simplified Calibration Script that properly handles API keys
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const readline = require('readline');
const apiKeyUtils = require('../src/utils/api-key-utils');

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Promisified question function
function question(query) {
  return new Promise(resolve => {
    rl.question(query, resolve);
  });
}

// Available models
const MODELS = {
  OPUS: 'claude-3-opus-20240229',
  SONNET: 'claude-3-sonnet-20240229',
  HAIKU: 'claude-3-haiku-20240307'
};

// Helper to test a specific repository
async function testRepository(apiKey, model, repoName) {
  console.log(`\nTesting ${repoName} with ${model}...`);
  
  try {
    // Get repository info
    console.log('Fetching repository info...');
    const repoInfo = await getRepositoryInfo(repoName);
    
    // Analyze with Anthropic
    console.log('Sending to Anthropic API...');
    const result = await callAnthropicApi(apiKey, model, repoInfo);
    
    console.log('✅ Success!');
    console.log(`Response time: ${result.responseTime} seconds`);
    console.log(`Response size: ${result.contentSize} bytes`);
    return result;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return { error: error.message };
  }
}

// Get repository information
async function getRepositoryInfo(repo) {
  try {
    const response = await axios.get(`https://api.github.com/repos/${repo}`);
    return `
Repository: ${response.data.full_name}
Description: ${response.data.description || 'No description'}
Language: ${response.data.language}
Stars: ${response.data.stargazers_count}
Forks: ${response.data.forks_count}
    `.trim();
  } catch (error) {
    console.error(`Error fetching repo info: ${error.message}`);
    return `Repository: ${repo}`;
  }
}

// Call Anthropic API
async function callAnthropicApi(apiKey, model, repoInfo) {
  // Start timer
  const startTime = Date.now();
  
  // Create prompts
  const systemPrompt = `You are a repository analyzer. You're analyzing a GitHub repository.
The analysis should be detailed and technical.`;
  
  const userPrompt = `
Repository Context:
${repoInfo}

Question:
Describe the overall architecture of this repository based on the information provided.
  `.trim();
  
  try {
    // Make API call
    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: model,
      max_tokens: 1000,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt }
      ]
    }, {
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': apiKey
      }
    });
    
    // End timer
    const endTime = Date.now();
    const responseTime = (endTime - startTime) / 1000;
    
    // Get content
    const content = response.data.content[0].text;
    const contentSize = Buffer.from(content).length;
    
    return {
      responseTime,
      contentSize,
      model,
      timestamp: new Date().toISOString(),
      summary: content.substring(0, 100) + '...'
    };
  } catch (error) {
    // Check if model not available
    if (error.response && error.response.data && 
        error.response.data.error && 
        error.response.data.error.message &&
        error.response.data.error.message.includes('model')) {
      throw new Error(`Model ${model} not available or invalid`);
    }
    
    throw error;
  }
}

// Main function
async function main() {
  console.log('=== Simplified Calibration Tool ===\n');
  
  // Get API key
  let apiKey = apiKeyUtils.getAnthropicApiKey();
  if (!apiKey) {
    console.log('No API key found in environment variables.');
    apiKey = await question('Please enter your Anthropic API key: ');
    apiKey = apiKeyUtils.cleanApiKey(apiKey);
  } else {
    console.log('Using API key from environment variables.');
  }
  
  // Choose model
  console.log('\nChoose a model:');
  console.log('1. Claude-3 Opus');
  console.log('2. Claude-3 Sonnet');
  console.log('3. Claude-3 Haiku');
  
  const modelChoice = await question('Enter choice (1-3): ');
  let model;
  
  switch (modelChoice) {
    case '1':
      model = MODELS.OPUS;
      break;
    case '2':
      model = MODELS.SONNET;
      break;
    case '3':
      model = MODELS.HAIKU;
      break;
    default:
      console.log('Invalid choice, using Haiku as default.');
      model = MODELS.HAIKU;
  }
  
  console.log(`Using model: ${model}`);
  
  // Test a repository
  const result = await testRepository(apiKey, model, 'expressjs/express');
  
  // Save results
  const outputDir = path.join(__dirname, 'calibration-results');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const outputPath = path.join(outputDir, 'simple-calibration-results.json');
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  
  console.log(`\nResults saved to ${outputPath}`);
  rl.close();
}

// Run main function
main().catch(error => {
  console.error('Error:', error);
  rl.close();
});