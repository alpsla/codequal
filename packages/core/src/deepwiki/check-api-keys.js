/**
 * DeepWiki API Key Test
 * This script tests loading API keys from environment variables and using them with DeepWikiClient
 */

/* eslint-env node */
/* eslint-disable no-console, @typescript-eslint/no-var-requires */

const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables from .env file
const envPath = path.join(__dirname, '../../../.env');
if (fs.existsSync(envPath)) {
  console.log(`Loading environment variables from ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  console.log('No .env file found, using existing environment variables');
  dotenv.config();
}

// Check for API keys
const apiKeys = {
  openai: process.env.OPENAI_API_KEY,
  google: process.env.GOOGLE_API_KEY,
  anthropic: process.env.ANTHROPIC_API_KEY,
  openrouter: process.env.OPENROUTER_API_KEY
};

console.log('\nAPI Key Status:');
console.log('==============');

// Display API key status
Object.entries(apiKeys).forEach(([provider, key]) => {
  if (key) {
    console.log(`✓ ${provider.toUpperCase()}: Key found (${key.substring(0, 3)}...${key.substring(key.length - 3)})`);
  } else {
    console.log(`✗ ${provider.toUpperCase()}: No key found`);
  }
});

// Import DeepWikiClient (for testing, log only)
console.log('\nDeepWikiClient would be initialized with these keys.');
console.log('To use them in your tests, run:');
console.log('\nbash /Users/alpinro/Code\\ Prjects/codequal/packages/core/src/deepwiki/run-full-tests.sh');

console.log('\nTo configure a test with specific keys:');
console.log('OPENAI_API_KEY=your_key GOOGLE_API_KEY=your_key bash /Users/alpinro/Code\\ Prjects/codequal/packages/core/src/deepwiki/run-full-tests.sh');
