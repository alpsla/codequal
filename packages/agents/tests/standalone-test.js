// Standalone test for agent functionality that mocks dependencies
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Use environment variable for .env path or fall back to root path
const envPath = process.env.LOCAL_ENV_PATH || '../../.env.local';
console.log(`Loading environment variables from: ${envPath}`);
dotenv.config({ path: envPath });

console.log('Starting standalone agent test...');

// Check if required environment variables are set
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('❌ ANTHROPIC_API_KEY is not set in .env.local');
  process.exit(1);
}

if (!process.env.OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY is not set in .env.local');
  process.exit(1);
}

console.log('✅ Environment variables loaded successfully');

// Import required mock modules
const { ANTHROPIC_MODELS, OPENAI_MODELS } = require('./mocks/model-versions');
const { AgentProvider, AgentRole } = require('./mocks/agent-registry');
const { loadPromptTemplate } = require('./mocks/prompt-loader');

// Implement require