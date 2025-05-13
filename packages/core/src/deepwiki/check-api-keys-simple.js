/**
 * DeepWiki API Key Test
 * This script tests loading API keys from environment variables without dependencies
 * Includes alternate key names for compatibility
 */

const fs = require('fs');
const path = require('path');

// Function to parse .env file
function parseEnvFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    lines.forEach(line => {
      // Skip empty lines and comments
      if (!line || line.startsWith('#')) return;
      
      // Split by first equals sign
      const splitIndex = line.indexOf('=');
      if (splitIndex === -1) return;
      
      const key = line.substring(0, splitIndex).trim();
      let value = line.substring(splitIndex + 1).trim();
      
      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.substring(1, value.length - 1);
      }
      
      // Set environment variable
      process.env[key] = value;
    });
    
    return true;
  } catch (error) {
    console.error(`Error reading .env file: ${error.message}`);
    return false;
  }
}

// Try to load from .env file
const envPath = path.join(__dirname, '../../../.env');
if (fs.existsSync(envPath)) {
  console.log(`Loading environment variables from ${envPath}`);
  const success = parseEnvFile(envPath);
  if (success) {
    console.log('Environment variables loaded successfully');
  }
} else {
  console.log('No .env file found, using existing environment variables');
}

// Map common alternative variable names to standard names
if (!process.env.GOOGLE_API_KEY && process.env.GEMINI_API_KEY) {
  process.env.GOOGLE_API_KEY = process.env.GEMINI_API_KEY;
  console.log('Using GEMINI_API_KEY for Google API');
}

// Check for API keys
const apiKeys = {
  openai: process.env.OPENAI_API_KEY,
  google: process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY,
  anthropic: process.env.ANTHROPIC_API_KEY,
  openrouter: process.env.OPENROUTER_API_KEY
};

console.log('\nAPI Key Status:');
console.log('==============');

// Display API key status
let anyKeyFound = false;
Object.entries(apiKeys).forEach(([provider, key]) => {
  if (key) {
    anyKeyFound = true;
    // Only show first 4 and last 4 characters of the key for security
    const maskedKey = key.length > 8 
      ? `${key.substring(0, 4)}...${key.substring(key.length - 4)}`
      : '****';
    console.log(`✓ ${provider.toUpperCase()}: Key found (${maskedKey})`);
  } else {
    console.log(`✗ ${provider.toUpperCase()}: No key found`);
  }
});

// Print actual variable names found
console.log('\nEnvironment Variable Names Found:');
[
  'OPENAI_API_KEY', 
  'GOOGLE_API_KEY', 
  'GEMINI_API_KEY', 
  'ANTHROPIC_API_KEY', 
  'OPENROUTER_API_KEY'
].forEach(varName => {
  if (process.env[varName]) {
    console.log(`✓ ${varName}`);
  } else {
    console.log(`✗ ${varName}`);
  }
});

if (!anyKeyFound) {
  console.log('\nWARNING: No API keys found!');
  console.log('Please add your API keys to the .env file in this format:');
  console.log('OPENAI_API_KEY=your_openai_api_key');
  console.log('GOOGLE_API_KEY=your_google_api_key (or GEMINI_API_KEY)');
  console.log('ANTHROPIC_API_KEY=your_anthropic_api_key');
  console.log('OPENROUTER_API_KEY=your_openrouter_api_key');
} else {
  console.log('\nDeepWikiClient would be initialized with these keys.');
  console.log('To use them in your tests, run:');
  console.log('\nbash /Users/alpinro/Code\\ Prjects/codequal/packages/core/src/deepwiki/run-full-tests.sh');
}

console.log('\nTo configure a test with specific keys:');
console.log('OPENAI_API_KEY=your_key GOOGLE_API_KEY=your_key bash /Users/alpinro/Code\\ Prjects/codequal/packages/core/src/deepwiki/run-full-tests.sh');
