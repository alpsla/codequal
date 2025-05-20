#!/usr/bin/env node
/**
 * Minimally fixed calibration script - only corrects the model name
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const dotenv = require('dotenv');
const readline = require('readline');

// Create readline interface for manual inputs
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

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

// API keys placeholder
const API_KEYS = {
  anthropic: null,
  github: null
};

// Repositories to test
const TEST_REPOSITORIES = {
  'pallets/flask': { language: 'python', size: 'medium' },
  'expressjs/express': { language: 'javascript', size: 'medium' },
  'nestjs/nest': { language: 'typescript', size: 'medium' }
};

// Test prompt
const TEST_PROMPT = 'Describe the overall architecture of this repository. What are the main components and how do they interact?';

/**
 * Promisified readline question
 */
function question(query) {
  return new Promise(resolve => {
    rl.question(query, resolve);
  });
}

/**
 * Get API keys either from environment or manual input
 */
async function getApiKeys() {
  console.log('Checking API keys...');
  
  // Try to get Anthropic API key
  console.log('Attempting to load ANTHROPIC_API_KEY...');
  API_KEYS.anthropic = process.env.ANTHROPIC_API_KEY || null;
  
  if (!API_KEYS.anthropic) {
    console.log('Anthropic API key not found in environment variables.');
    API_KEYS.anthropic = await question('Please enter your Anthropic API key: ');
  } else {
    console.log('Found Anthropic API key in environment variables');
  }
  
  // Try to get GitHub token
  console.log('Attempting to load GITHUB_TOKEN...');
  API_KEYS.github = process.env.GITHUB_TOKEN || null;
  
  if (!API_KEYS.github) {
    console.log('GitHub token not found in environment variables.');
    API_KEYS.github = await question('Please enter your GitHub token (or press enter to skip): ');
  } else {
    console.log('Found GitHub token in environment variables');
  }
  
  // Validate keys
  try {
    await validateAnthropicKey();
    console.log('✅ Anthropic API key is valid');
  } catch (error) {
    console.error('❌ Anthropic API key validation failed:', error.message);
    API_KEYS.anthropic = await question('Please enter a valid Anthropic API key: ');
    try {
      await validateAnthropicKey();
      console.log('✅ Anthropic API key is now valid');
    } catch (error) {
      console.error('❌ Anthropic API key validation failed again. Exiting.');
      rl.close();
      process.exit(1);
    }
  }
  
  if (API_KEYS.github) {
    try {
      await validateGitHubToken();
      console.log('✅ GitHub token is valid');
    } catch (error) {
      console.error('❌ GitHub token validation failed:', error.message);
      console.log('Proceeding without GitHub authentication. Public repositories will still work.');
    }
  } else {
    console.log('Proceeding without GitHub authentication. Public repositories will still work.');
  }
}

/**
 * Validate Anthropic API key
 */
async function validateAnthropicKey() {
  const response = await axios.post('https://api.anthropic.com/v1/messages', {
    model: 'claude-3-haiku-20240307', // Using Haiku for validation as it's more likely to work
    max_tokens: 10,
    messages: [
      { role: 'user', content: 'Hello' }
    ]
  }, {
    headers: {
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
      'x-api-key': API_KEYS.anthropic.trim()
    }
  });
  
  if (response.status !== 200) {
    throw new Error(`API returned status ${response.status}`);
  }
}

/**
 * Validate GitHub token
 */
async function validateGitHubToken() {
  const response = await axios.get('https://api.github.com/user', {
    headers: {
      'Authorization': `Bearer ${API_KEYS.github.trim()}`
    }
  });
  
  if (response.status !== 200) {
    throw new Error(`API returned status ${response.status}`);
  }
}

// Main function
async function runCalibration() {
  console.log('Starting calibration process...');
  
  // FIX: Use the correct model name
  const modelOptions = {
    '1': 'claude-3-opus-20240229',
    '2': 'claude-3-sonnet-20240229',
    '3': 'claude-3-haiku-20240307'
  };
  
  console.log('Choose a model:');
  console.log('1. Claude-3 Opus');
  console.log('2. Claude-3 Sonnet');
  console.log('3. Claude-3 Haiku');
  
  const modelChoice = await question('Enter choice (1-3): ');
  const model = modelOptions[modelChoice] || modelOptions['1']; // Default to Opus
  
  console.log(`Using model: ${model}`);
  
  // Get and validate API keys
  await getApiKeys();
  
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
    const modelKey = `anthropic/${model}`;
    
    results[language][size][repo][modelKey] = [];
    
    try {
      console.log(`Fetching GitHub repository data for ${repo}...`);
      
      // Get repo information from GitHub
      const repoInfo = await getRepositoryContext(repo);
      
      console.log(`Testing with Anthropic API...`);
      
      // Test the model
      const result = await testAnthropicModel(repoInfo, TEST_PROMPT, model);
      
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
  
  console.log(`\nCalibration complete!`);
  console.log(`To apply this configuration:`);
  console.log(`cp ${CONFIG_OUTPUT_PATH} ../src/config/models/repository-model-config.ts`);
  console.log(`npm run build:core`);
  
  // Close readline interface
  rl.close();
}

// Get repository context
async function getRepositoryContext(repo) {
  // Extract owner and repo name
  const [owner, repoName] = repo.split('/');
  
  try {
    let response;
    
    // Try authenticated request if token available
    if (API_KEYS.github) {
      try {
        response = await axios.get(`https://api.github.com/repos/${repo}`, {
          headers: {
            'Authorization': `Bearer ${API_KEYS.github.trim()}`
          }
        });
      } catch (error) {
        console.log('Authenticated GitHub request failed, trying unauthenticated...');
        response = await axios.get(`https://api.github.com/repos/${repo}`);
      }
    } else {
      // Unauthenticated request for public repos
      response = await axios.get(`https://api.github.com/repos/${repo}`);
    }
    
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
async function testAnthropicModel(repoContext, prompt, selectedModel) {
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
    // FIX: Use correct API format with system as top-level parameter
    console.log(`Calling Anthropic API with model: ${selectedModel}`);
    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: selectedModel,
      max_tokens: 2000,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt }
      ]
    }, {
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': API_KEYS.anthropic.trim()
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
      model: selectedModel,
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
    
    // If model not available, try Haiku as fallback
    if (error.response && error.response.data && 
        (error.response.data.error && error.response.data.error.message && 
         error.response.data.error.message.includes('not available') ||
         error.response.data.message && error.response.data.message.includes('not available'))) {
      
      console.log(`${selectedModel} appears to be unavailable. Would you like to try Claude-3-Haiku as a fallback?`);
      const answer = await question('Try Claude-3-Haiku instead? (y/n): ');
      
      if (answer.toLowerCase() === 'y') {
        console.log('Trying with Claude-3-Haiku model instead...');
        
        // FIX: Use correct API format for the fallback too
        const response = await axios.post('https://api.anthropic.com/v1/messages', {
          model: 'claude-3-haiku-20240307',
          max_tokens: 2000,
          system: systemPrompt,
          messages: [
            { role: 'user', content: userPrompt }
          ]
        }, {
          headers: {
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01',
            'x-api-key': API_KEYS.anthropic.trim()
          }
        });
        
        // End timer
        const endTime = Date.now();
        const responseTime = (endTime - startTime) / 1000; // Convert to seconds
        
        // Get content
        const content = response.data.content[0].text;
        const contentSize = Buffer.from(content).length;
        
        console.log('✅ Successfully fell back to Claude-3-Haiku');
        
        return {
          prompt,
          responseTime,
          contentSize,
          provider: 'anthropic',
          model: 'claude-3-haiku-20240307', // Note the fallback model used
          timestamp: new Date().toISOString(),
          note: `Fallback from ${selectedModel}`
        };
      }
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
      // FIX: Use correct model name in config
      configs[language][size] = {
        provider: 'anthropic',
        model: 'claude-3-opus-20240229', // Default to Opus
        testResults: {
          status: 'tested',
          avgResponseTime: 0,
          avgContentSize: 0,
          testCount: 0,
          lastTested: new Date().toISOString()
        },
        notes: `Calibrated with claude-3-opus-20240229 on ${new Date().toDateString()}`
      };
      
      let totalTests = 0;
      let totalResponseTime = 0;
      let totalContentSize = 0;
      let usingHaiku = false;
      
      // Calculate averages
      for (const [repo, models] of Object.entries(repos)) {
        for (const [model, tests] of Object.entries(models)) {
          for (const test of tests) {
            if (!test.error) {
              totalTests++;
              totalResponseTime += test.responseTime;
              totalContentSize += test.contentSize;
              
              // Check if using Haiku as fallback
              if (test.model === 'claude-3-haiku-20240307') {
                usingHaiku = true;
              }
            }
          }
        }
      }
      
      // Update with real averages if we have tests
      if (totalTests > 0) {
        configs[language][size].testResults.avgResponseTime = totalResponseTime / totalTests;
        configs[language][size].testResults.avgContentSize = totalContentSize / totalTests;
        configs[language][size].testResults.testCount = totalTests;
        
        // If all tests fell back to Haiku, update the model
        if (usingHaiku) {
          configs[language][size].model = 'claude-3-haiku-20240307';
          configs[language][size].notes = `Calibrated with claude-3-haiku-20240307 (fallback) on ${new Date().toDateString()}`;
        }
      }
    }
  }
  
  // Add default configurations for other languages
  const allLanguages = [
    'javascript', 'typescript', 'python', 'java', 'go', 
    'ruby', 'php', 'csharp', 'cpp', 'rust'
  ];
  
  const allSizes = ['small', 'medium', 'large'];
  
  // Determine if we had to fall back to Haiku for any tests
  let globalUsingHaiku = false;
  for (const language in configs) {
    for (const size in configs[language]) {
      if (configs[language][size].model === 'claude-3-haiku-20240307') {
        globalUsingHaiku = true;
        break;
      }
    }
    if (globalUsingHaiku) break;
  }
  
  // Set default model based on tests
  const defaultModel = globalUsingHaiku ? 'claude-3-haiku-20240307' : 'claude-3-opus-20240229';
  
  for (const language of allLanguages) {
    if (!configs[language]) {
      configs[language] = {};
    }
    
    for (const size of allSizes) {
      if (!configs[language][size]) {
        configs[language][size] = {
          provider: 'anthropic',
          model: defaultModel,
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
 * with the ${defaultModel} model.
 */

import { RepositoryModelConfig, RepositorySizeCategory, TestingStatus } from '../repository-model-config';

/**
 * Repository model configurations based on calibration testing
 */
export const CALIBRATED_MODEL_CONFIGS: Record<
  string, 
  Record<RepositorySizeCategory, RepositoryModelConfig>
> = ${JSON.stringify(configs, null, 2).replace(/\"([^\"]+)\":/g, '$1:')};
`;

  // Save configuration
  fs.writeFileSync(CONFIG_OUTPUT_PATH, configContent);
  console.log(`Configuration generated at ${CONFIG_OUTPUT_PATH}`);
}

// Run calibration
runCalibration().catch(error => {
  console.error('Calibration failed:', error);
  rl.close();
  process.exit(1);
});