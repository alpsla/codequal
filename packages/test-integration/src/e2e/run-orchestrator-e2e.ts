#!/usr/bin/env ts-node
/* eslint-disable no-console */

/**
 * Runner script for Orchestrator E2E tests
 * 
 * This script ensures proper environment setup and execution
 * of the orchestrator end-to-end tests with dynamic model selection.
 * 
 * Usage:
 *   npm run test:orchestrator-e2e
 *   npm run test:orchestrator-e2e -- --test-tracking
 *   npm run test:orchestrator-e2e -- --test-model-selection
 *   npm run test:orchestrator-e2e -- --repo <url> <pr-number>
 */

import { config } from 'dotenv';
import path from 'path';
import chalk from 'chalk';

// Load environment variables from root .env
config({ path: path.resolve(__dirname, '../../../../.env') });

// Validate required environment variables
const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'GITHUB_TOKEN',
  'OPENROUTER_API_KEY'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error(chalk.red('❌ Missing required environment variables:'));
  missingEnvVars.forEach(varName => {
    console.error(chalk.red(`   - ${varName}`));
  });
  console.error(chalk.yellow('\nPlease ensure all required environment variables are set in your .env file'));
  process.exit(1);
}

// Optional environment variables check
const optionalEnvVars = [
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'GOOGLE_API_KEY',
  'DEEPSEEK_API_KEY'
];

const availableProviders = optionalEnvVars.filter(varName => process.env[varName]);

console.log(chalk.green('✓ Environment configuration validated'));
console.log(chalk.gray(`  OpenRouter API Key: ${process.env.OPENROUTER_API_KEY?.substring(0, 10)}...`));
console.log(chalk.gray(`  Additional providers available: ${availableProviders.length > 0 ? availableProviders.join(', ') : 'None (using OpenRouter only)'}`));

// Import and run the test after environment validation
import('./orchestrator-e2e-test.js').then(_module => {
  // Module is already self-executing
}).catch(error => {
  console.error(chalk.red('Failed to load test module:'), error);
  process.exit(1);
});