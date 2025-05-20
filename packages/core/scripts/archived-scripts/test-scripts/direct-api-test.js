#!/usr/bin/env node
/**
 * Direct API test script - simplified for troubleshooting
 */

const axios = require('axios');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Use a more reliable way to get input
function getInput(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer);
    });
  });
}

// Simple function to test an Anthropic API key
async function testAnthropicApiKey(apiKey) {
  console.log(`\nTesting key with length: ${apiKey.length}`);
  console.log(`Key prefix: ${apiKey.substring(0, 8)}...`);
  
  try {
    // Clean up the key
    const cleanKey = apiKey.trim();
    
    console.log("Making API request...");
    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-3-haiku-20240307', // Using a known valid model
      max_tokens: 10,
      messages: [
        { role: 'user', content: 'Hello' }
      ]
    }, {
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': cleanKey
      }
    });
    
    console.log(`Response status: ${response.status}`);
    console.log("API call successful!");
    console.log(`Response content type: ${response.data.content[0].type}`);
    console.log(`Response text: ${response.data.content[0].text}`);
    return true;
  } catch (error) {
    console.error("API call failed!");
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error("Error details:", JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
    return false;
  }
}

// Simple function to test a GitHub token
async function testGitHubToken(token) {
  console.log(`\nTesting GitHub token with length: ${token.length}`);
  
  try {
    console.log("Making GitHub API request...");
    const response = await axios.get('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${token.trim()}`
      }
    });
    
    console.log(`Response status: ${response.status}`);
    console.log("GitHub API call successful!");
    console.log(`Username: ${response.data.login}`);
    return true;
  } catch (error) {
    console.error("GitHub API call failed!");
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error("Error details:", JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
    return false;
  }
}

async function main() {
  console.log("=== Direct API Testing Tool ===");
  console.log("This tool directly tests API keys without any complex logic.\n");
  
  // Test Anthropic
  console.log("--- Anthropic API Test ---");
  const testAnthropic = await getInput("Do you want to test an Anthropic API key? (y/n): ");
  
  if (testAnthropic.toLowerCase() === 'y') {
    console.log("Please paste your Anthropic API key (it should start with 'sk-ant-'):");
    const apiKey = await getInput("> ");
    await testAnthropicApiKey(apiKey);
  }
  
  // Test GitHub
  console.log("\n--- GitHub API Test ---");
  const testGitHub = await getInput("Do you want to test a GitHub token? (y/n): ");
  
  if (testGitHub.toLowerCase() === 'y') {
    console.log("Please paste your GitHub token:");
    const token = await getInput("> ");
    await testGitHubToken(token);
  }
  
  console.log("\nTesting complete!");
  rl.close();
}

main().catch(error => {
  console.error("Unexpected error:", error);
  rl.close();
});