#!/usr/bin/env node
/**
 * Quick Calibration Script for Anthropic
 * 
 * This script runs a simplified calibration using the verified Anthropic API key
 * with the claude-3-haiku-20240307 model that we've confirmed is working.
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Configuration
const OUTPUT_DIR = path.join(__dirname, 'calibration-results');
const CONFIG_OUTPUT_PATH = path.join(OUTPUT_DIR, 'repository-model-config.ts');
const REPORT_PATH = path.join(OUTPUT_DIR, 'calibration-report.json');

// Create output directory if it doesn't exist
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Anthropic API key
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// Repositories to test
const TEST_REPOSITORIES = {
  'pallets/flask': { language: 'python', size: 'medium' },
  'expressjs/express': { language: 'javascript', size: 'medium' },
  'nestjs/nest': { language: 'typescript', size: 'medium' }
};

// Test prompt
const TEST_PROMPT = 'Describe the overall architecture of this repository. What are the main components and how do they interact?';

// Main function
async function runQuickCalibration() {
  console.log('Starting quick Anthropic API calibration...');
  console.log(`Using model: claude-3-haiku-20240307`);
  
  if (!ANTHROPIC_API_KEY) {
    console.error('Error: ANTHROPIC_API_KEY environment variable is not set');
    process.exit(1);
  }
  
  // Results object
  const results = {};
  
  // Test each repository
  for (const [repo, meta] of Object.entries(TEST_REPOSITORIES)) {
    const { language, size } = meta;
    
    console.log(`\nTesting ${repo} (${language}, ${size})...`);
    
    // Initialize language and size categories if needed
    if (!results[language]) {
      results[language] = {};
    }
    
    if (!results[language][size]) {
      results[language][size] = {};
    }
    
    if (!results[language][size][repo]) {
      results[language][size][repo] = {};
    }
    
    // Model key
    const modelKey = 'anthropic/claude-3-haiku-20240307';
    
    results[language][size][repo][modelKey] = [];
    
    try {
      console.log(`Fetching GitHub repository data for ${repo}...`);
      
      // Get repo information from GitHub
      const repoInfo = await getRepositoryContext(repo);
      
      console.log(`Testing with Anthropic API...`);
      
      // Test the model
      const result = await testAnthropicModel(repoInfo, TEST_PROMPT);
      
      // Add result
      results[language][size][repo][modelKey].push(result);
      
      console.log(`✅ Successfully tested ${repo} with Anthropic API`);
    } catch (error) {
      console.error(`❌ Error testing ${repo}: ${error.message}`);
      
      // Add error result
      results[language][size][repo][modelKey].push({
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
  
  // Save results
  fs.writeFileSync(REPORT_PATH, JSON.stringify(results, null, 2));
  console.log(`\nResults saved to ${REPORT_PATH}`);
  
  // Generate config
  generateConfig(results);
  
  console.log(`\nQuick calibration complete!`);
  console.log(`\nTo apply this configuration:`);
  console.log(`cp ${CONFIG_OUTPUT_PATH} ../src/config/models/repository-model-config.ts`);
  console.log(`npm run build:core`);
}

// Get repository context
async function getRepositoryContext(repo) {
  // Extract owner and repo name
  const [owner, repoName] = repo.split('/');
  
  try {
    // First try unauthenticated request
    const response = await axios.get(`https://api.github.com/repos/${repo}`);
    
    return `
Repository: ${response.data.full_name}
Description: ${response.data.description || 'No description'}
Language: ${response.data.language}
Stars: ${response.data.stargazers_count}
Forks: ${response.data.forks_count}
Issues: ${response.data.open_issues_count}
Created: ${response.data.created_at}
Updated: ${response.data.updated_at}
    `.trim();
  } catch (error) {
    console.error(`Error fetching repository data: ${error.message}`);
    return `Repository: ${repo}`;
  }
}

// Test Anthropic model
async function testAnthropicModel(repoContext, prompt) {
  // Start timer
  const startTime = Date.now();
  
  // Create system prompt
  const systemPrompt = `You are a repository analyzer. You're analyzing a GitHub repository.
The analysis should be detailed, technical, and based on the repository information provided.
Focus on structure, patterns, architecture, and implementation details.`;
  
  // Create user prompt
  const userPrompt = `
Repository Context:
${repoContext}

Question:
${prompt}
  `.trim();
  
  try {
    // Call Anthropic API
    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-3-haiku-20240307',
      max_tokens: 2000,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    }, {
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': ANTHROPIC_API_KEY.trim()
      }
    });
    
    // End timer
    const endTime = Date.now();
    const responseTime = (endTime - startTime) / 1000; // Convert to seconds
    
    // Get content
    const content = response.data.content[0].text;
    const contentSize = Buffer.from(content).length;
    
    return {
      prompt,
      responseTime,
      contentSize,
      provider: 'anthropic',
      model: 'claude-3-haiku-20240307',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    // Format error message
    let errorMessage = error.message;
    
    if (error.response) {
      // Server returned an error
      errorMessage = `${error.response.status}: ${JSON.stringify(error.response.data)}`;
    } else if (error.request) {
      // Request was made but no response received
      errorMessage = 'No response received from server';
    }
    
    throw new Error(errorMessage);
  }
}

// Generate configuration from results
function generateConfig(results) {
  const configs = {};
  
  // Process all languages from results
  for (const [language, sizes] of Object.entries(results)) {
    configs[language] = {};
    
    for (const [size, repos] of Object.entries(sizes)) {
      configs[language][size] = {
        provider: 'anthropic',
        model: 'claude-3-haiku-20240307',
        testResults: {
          status: 'tested',
          avgResponseTime: 0,
          avgContentSize: 0,
          testCount: 0,
          lastTested: new Date().toISOString()
        },
        notes: `Calibrated with claude-3-haiku-20240307 on ${new Date().toDateString()}`
      };
      
      let totalTests = 0;
      let totalResponseTime = 0;
      let totalContentSize = 0;
      
      // Calculate averages
      for (const [repo, models] of Object.entries(repos)) {
        for (const [model, tests] of Object.entries(models)) {
          for (const test of tests) {
            if (!test.error) {
              totalTests++;
              totalResponseTime += test.responseTime;
              totalContentSize += test.contentSize;
            }
          }
        }
      }
      
      // Update with real averages if we have tests
      if (totalTests > 0) {
        configs[language][size].testResults.avgResponseTime = totalResponseTime / totalTests;
        configs[language][size].testResults.avgContentSize = totalContentSize / totalTests;
        configs[language][size].testResults.testCount = totalTests;
      }
    }
  }
  
  // Add default configurations for other languages
  const allLanguages = [
    'javascript', 'typescript', 'python', 'java', 'go', 
    'ruby', 'php', 'csharp', 'cpp', 'rust'
  ];
  
  const allSizes = ['small', 'medium', 'large'];
  
  for (const language of allLanguages) {
    if (!configs[language]) {
      configs[language] = {};
    }
    
    for (const size of allSizes) {
      if (!configs[language][size]) {
        configs[language][size] = {
          provider: 'anthropic',
          model: 'claude-3-haiku-20240307',
          testResults: {
            status: 'estimated',
            avgResponseTime: 10.0,
            avgContentSize: 8000,
            testCount: 0,
            lastTested: new Date().toISOString()
          },
          notes: `Estimated configuration based on similar languages`
        };
      }
    }
  }
  
  // Generate configuration file content
  const configContent = `/**
 * Auto-generated Repository Model Configuration
 * Generated on: ${new Date().toISOString()}
 * 
 * This configuration was created using the working Anthropic API key
 * with the claude-3-haiku-20240307 model.
 */

import { RepositoryModelConfig, RepositorySizeCategory, TestingStatus } from '../repository-model-config';

/**
 * Repository model configurations based on calibration testing
 */
export const CALIBRATED_MODEL_CONFIGS: Record<
  string, 
  Record<RepositorySizeCategory, RepositoryModelConfig>
> = ${JSON.stringify(configs, null, 2).replace(/"([^"]+)":/g, '$1:')};
`;

  // Save configuration
  fs.writeFileSync(CONFIG_OUTPUT_PATH, configContent);
  console.log(`Configuration generated at ${CONFIG_OUTPUT_PATH}`);
}

// Run calibration
runQuickCalibration().catch(error => {
  console.error('Calibration failed:', error);
  process.exit(1);
});