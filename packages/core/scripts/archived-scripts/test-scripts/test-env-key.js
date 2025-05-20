#!/usr/bin/env node
/**
 * Test script specifically for reading the API key from .env
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const axios = require('axios');

// Function to load .env file directly using raw fs
function loadEnvFileDirect(filePath) {
  console.log(`Reading .env file directly from ${filePath}`);
  
  if (fs.existsSync(filePath)) {
    try {
      // Read raw content
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      
      // Find ANTHROPIC_API_KEY line
      const keyLine = lines.find(line => line.startsWith('ANTHROPIC_API_KEY='));
      
      if (keyLine) {
        // Extract key value
        const key = keyLine.substring('ANTHROPIC_API_KEY='.length).trim();
        console.log(`Found key in .env file (length: ${key.length} chars)`);
        
        // Remove quotes if present
        let cleanKey = key;
        if ((cleanKey.startsWith('"') && cleanKey.endsWith('"')) || 
            (cleanKey.startsWith("'") && cleanKey.endsWith("'"))) {
          cleanKey = cleanKey.slice(1, -1);
          console.log(`Removed quotes (new length: ${cleanKey.length} chars)`);
        }
        
        return cleanKey;
      } else {
        console.log('ANTHROPIC_API_KEY not found in .env file');
        return null;
      }
    } catch (error) {
      console.error(`Error reading .env file: ${error.message}`);
      return null;
    }
  } else {
    console.error(`File does not exist at ${filePath}`);
    return null;
  }
}

// Function to load .env file with dotenv
function loadEnvFileWithDotenv(filePath) {
  console.log(`\nLoading .env file with dotenv from ${filePath}`);
  
  if (fs.existsSync(filePath)) {
    try {
      const result = dotenv.config({ path: filePath });
      
      if (result.error) {
        console.error(`Error loading with dotenv: ${result.error.message}`);
        return false;
      }
      
      console.log('Successfully loaded with dotenv');
      
      // Get key from process.env
      const key = process.env.ANTHROPIC_API_KEY;
      
      if (key) {
        console.log(`Found key in process.env (length: ${key.length} chars)`);
        return true;
      } else {
        console.log('ANTHROPIC_API_KEY not found in process.env after loading with dotenv');
        return false;
      }
    } catch (error) {
      console.error(`Error using dotenv: ${error.message}`);
      return false;
    }
  } else {
    console.error(`File does not exist at ${filePath}`);
    return false;
  }
}

// Function to test API key
async function testApiKey(apiKey) {
  console.log(`\nTesting API key (length: ${apiKey.length} characters)`);
  console.log(`Key prefix: ${apiKey.substring(0, 7)}...`);
  
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
        'x-api-key': apiKey
      }
    });
    
    console.log('✅ API key is valid!');
    console.log(`Response: "${response.data.content[0].text}"`);
    return true;
  } catch (error) {
    console.error('❌ API key validation failed:');
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Error: ${JSON.stringify(error.response.data.error || error.response.data)}`);
    } else {
      console.error(error.message);
    }
    return false;
  }
}

// Main function
async function main() {
  console.log('=== .env API Key Tester ===');
  
  // Find .env file
  const rootEnvPath = path.resolve(__dirname, '..', '..', '..', '.env');
  
  // Direct read method
  const key = loadEnvFileDirect(rootEnvPath);
  
  if (key) {
    // Test it
    await testApiKey(key);
  }
  
  // Dotenv method
  loadEnvFileWithDotenv(rootEnvPath);
  
  // Test key from process.env
  if (process.env.ANTHROPIC_API_KEY) {
    await testApiKey(process.env.ANTHROPIC_API_KEY);
  }
}

// Run main function
main().catch(error => {
  console.error('Unexpected error:', error);
});