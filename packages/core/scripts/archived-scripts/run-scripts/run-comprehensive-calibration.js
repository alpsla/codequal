#!/usr/bin/env node
/**
 * Comprehensive Calibration Script
 * Tests across multiple repositories of different sizes, languages, and complexity
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
const CONFIG_OUTPUT_PATH = path.join(OUTPUT_DIR, 'comprehensive-model-config.ts');
const REPORT_PATH = path.join(OUTPUT_DIR, 'comprehensive-calibration-report.json');

// Create output directory if it doesn't exist
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// API keys placeholder
const API_KEYS = {
  anthropic: null,
  github: null
};

// Available models
const MODELS = {
  OPUS: 'claude-3-opus-20240229',
  SONNET: 'claude-3-sonnet-20240229',
  HAIKU: 'claude-3-haiku-20240307'
};

// Repositories to test - comprehensive set with different sizes and languages
const TEST_REPOSITORIES = {
  // Small repositories
  'jashkenas/underscore': { language: 'javascript', size: 'small', complexity: 'low' },
  'pallets/click': { language: 'python', size: 'small', complexity: 'low' },
  'rust-lang/rustlings': { language: 'rust', size: 'small', complexity: 'low' },
  'golang/example': { language: 'go', size: 'small', complexity: 'low' },
  'JetBrains/kotlin-examples': { language: 'kotlin', size: 'small', complexity: 'low' },
  
  // Medium repositories
  'pallets/flask': { language: 'python', size: 'medium', complexity: 'medium' },
  'expressjs/express': { language: 'javascript', size: 'medium', complexity: 'medium' },
  'nestjs/nest': { language: 'typescript', size: 'medium', complexity: 'medium' },
  'django/django': { language: 'python', size: 'medium', complexity: 'high' },
  'spring-projects/spring-boot': { language: 'java', size: 'medium', complexity: 'high' },
  'laravel/laravel': { language: 'php', size: 'medium', complexity: 'medium' },
  'microsoft/TypeScript': { language: 'typescript', size: 'medium', complexity: 'high' },
  'golang/go': { language: 'go', size: 'medium', complexity: 'high' },
  
  // Large repositories
  'kubernetes/kubernetes': { language: 'go', size: 'large', complexity: 'high' },
  'tensorflow/tensorflow': { language: 'c++', size: 'large', complexity: 'high' },
  'facebook/react': { language: 'javascript', size: 'large', complexity: 'high' },
  'angular/angular': { language: 'typescript', size: 'large', complexity: 'high' },
  'rails/rails': { language: 'ruby', size: 'large', complexity: 'high' },
  'dotnet/runtime': { language: 'csharp', size: 'large', complexity: 'high' }
};

// Test prompts
const TEST_PROMPTS = {
  architecture: 'Describe the overall architecture of this repository. What are the main components and how do they interact?',
  bestPractices: 'What software engineering best practices are demonstrated in this repository?',
  security: 'Identify potential security concerns in this type of application.'
};

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
    model: 'claude-3-haiku-20240307', // Using Haiku for validation
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
      'Authorization': `token ${API_KEYS.github.trim()}`
    }
  });
  
  if (response.status !== 200) {
    throw new Error(`API returned status ${response.status}`);
  }
}

/**
 * Select repositories for testing
 */
async function selectRepositories() {
  console.log('\nSelect repositories to test:');
  console.log('1. Test all repositories (most comprehensive but slower)');
  console.log('2. Test one repository from each size/language combination (balanced)');
  console.log('3. Test minimal set (fastest)');
  
  const choice = await question('Enter your choice (1-3): ');
  
  let selectedRepos = {};
  
  switch (choice) {
    case '1':
      selectedRepos = TEST_REPOSITORIES;
      break;
    case '2':
      // Select one repo for each size and language combination
      const sizeLanguageMap = {};
      
      for (const [repo, meta] of Object.entries(TEST_REPOSITORIES)) {
        const key = `${meta.language}_${meta.size}`;
        if (!sizeLanguageMap[key]) {
          sizeLanguageMap[key] = repo;
        }
      }
      
      for (const repo of Object.values(sizeLanguageMap)) {
        selectedRepos[repo] = TEST_REPOSITORIES[repo];
      }
      break;
    case '3':
      // Minimal set - one small, one medium, one large
      selectedRepos = {
        'pallets/click': TEST_REPOSITORIES['pallets/click'],
        'expressjs/express': TEST_REPOSITORIES['expressjs/express'],
        'facebook/react': TEST_REPOSITORIES['facebook/react']
      };
      break;
    default:
      console.log('Invalid choice, using minimal set.');
      selectedRepos = {
        'pallets/click': TEST_REPOSITORIES['pallets/click'],
        'expressjs/express': TEST_REPOSITORIES['expressjs/express'],
        'facebook/react': TEST_REPOSITORIES['facebook/react']
      };
  }
  
  console.log(`Selected ${Object.keys(selectedRepos).length} repositories for testing.`);
  return selectedRepos;
}

/**
 * Select which prompts to use
 */
async function selectPrompts() {
  console.log('\nSelect prompts to use:');
  console.log('1. Use all prompts (more comprehensive)');
  console.log('2. Use only architecture prompt (faster)');
  
  const choice = await question('Enter your choice (1-2): ');
  
  let selectedPrompts = {};
  
  switch (choice) {
    case '1':
      selectedPrompts = TEST_PROMPTS;
      break;
    case '2':
      selectedPrompts = {
        architecture: TEST_PROMPTS.architecture
      };
      break;
    default:
      console.log('Invalid choice, using only architecture prompt.');
      selectedPrompts = {
        architecture: TEST_PROMPTS.architecture
      };
  }
  
  console.log(`Selected ${Object.keys(selectedPrompts).length} prompts for testing.`);
  return selectedPrompts;
}

// Select which models to test
async function selectModels() {
  console.log('\nSelect models to test:');
  console.log('1. Test all models (Opus, Sonnet, Haiku)');
  console.log('2. Test only Opus');
  console.log('3. Test only Sonnet');
  console.log('4. Test only Haiku');
  
  const choice = await question('Enter your choice (1-4): ');
  
  let selectedModels = {};
  
  switch (choice) {
    case '1':
      selectedModels = MODELS;
      break;
    case '2':
      selectedModels = { OPUS: MODELS.OPUS };
      break;
    case '3':
      selectedModels = { SONNET: MODELS.SONNET };
      break;
    case '4':
      selectedModels = { HAIKU: MODELS.HAIKU };
      break;
    default:
      console.log('Invalid choice, using Haiku (fastest).');
      selectedModels = { HAIKU: MODELS.HAIKU };
  }
  
  console.log(`Selected ${Object.keys(selectedModels).length} models for testing.`);
  return selectedModels;
}

// Main function
async function runCalibration() {
  console.log('=== Comprehensive Calibration Process ===');
  
  // Get API keys
  await getApiKeys();
  
  // Select which repositories to test
  const selectedRepos = await selectRepositories();
  
  // Select which prompts to use
  const selectedPrompts = await selectPrompts();
  
  // Select which models to test
  const selectedModels = await selectModels();
  
  // Results object
  const results = {};
  
  // Track progress
  let totalTests = Object.keys(selectedRepos).length * Object.keys(selectedPrompts).length * Object.keys(selectedModels).length;
  let completedTests = 0;
  
  console.log(`\nPreparing to run ${totalTests} total tests...`);
  
  // Start time
  const startTime = Date.now();
  
  // Run tests for each repository
  for (const [repo, meta] of Object.entries(selectedRepos)) {
    const { language, size, complexity } = meta;
    
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
    
    // Get repository information
    console.log(`\nFetching data for ${repo} (${language}, ${size}, complexity: ${complexity})...`);
    const repoInfo = await getRepositoryContext(repo);
    
    // Test with each model
    for (const [modelKey, modelValue] of Object.entries(selectedModels)) {
      console.log(`Testing with ${modelKey} (${modelValue})...`);
      
      // Create model key
      const fullModelKey = `anthropic/${modelValue}`;
      
      if (!results[language][size][repo][fullModelKey]) {
        results[language][size][repo][fullModelKey] = [];
      }
      
      // Test with each prompt
      for (const [promptKey, promptValue] of Object.entries(selectedPrompts)) {
        console.log(`  Running prompt: ${promptKey}...`);
        
        try {
          // Test the model
          const result = await testAnthropicModel(repoInfo, promptValue, modelValue, promptKey);
          
          // Add result
          results[language][size][repo][fullModelKey].push(result);
          
          console.log(`  ✅ Success! Response time: ${result.responseTime.toFixed(2)}s, Size: ${result.contentSize} bytes`);
        } catch (error) {
          console.error(`  ❌ Error: ${error.message}`);
          
          // Add error result
          results[language][size][repo][fullModelKey].push({
            prompt: promptKey,
            error: error.message,
            timestamp: new Date().toISOString()
          });
        }
        
        // Update progress
        completedTests++;
        const progress = (completedTests / totalTests * 100).toFixed(1);
        const elapsedTime = (Date.now() - startTime) / 1000 / 60; // in minutes
        const estimatedTotalTime = elapsedTime / (completedTests / totalTests);
        const estimatedTimeRemaining = estimatedTotalTime - elapsedTime;
        
        console.log(`Progress: ${completedTests}/${totalTests} (${progress}%) - Est. ${estimatedTimeRemaining.toFixed(1)} minutes remaining`);
        
        // Save results after each test in case of errors
        fs.writeFileSync(REPORT_PATH, JSON.stringify(results, null, 2));
      }
    }
  }
  
  // Final results save
  fs.writeFileSync(REPORT_PATH, JSON.stringify(results, null, 2));
  console.log(`\nResults saved to ${REPORT_PATH}`);
  
  // Generate config
  generateConfig(results, selectedModels);
  
  // Calculate total time
  const totalTime = (Date.now() - startTime) / 1000 / 60; // in minutes
  
  console.log(`\nCalibration complete!`);
  console.log(`Total time: ${totalTime.toFixed(2)} minutes`);
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
            'Authorization': `token ${API_KEYS.github.trim()}`
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
async function testAnthropicModel(repoContext, prompt, selectedModel, promptType) {
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
      prompt: promptType,
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
    
    // Throw the error for upstream handling
    throw new Error(errorMessage);
  }
}

// Generate configuration from results
function generateConfig(results, selectedModels) {
  const configs = {};
  
  // Process all languages from results
  for (const [language, sizes] of Object.entries(results)) {
    configs[language] = {};
    
    for (const [size, repos] of Object.entries(sizes)) {
      // Initialize with defaults
      configs[language][size] = {
        provider: 'anthropic',
        model: Object.values(selectedModels)[0], // Default to first selected model
        testResults: {
          status: 'tested',
          avgResponseTime: 0,
          avgContentSize: 0,
          testCount: 0,
          lastTested: new Date().toISOString()
        },
        notes: `Calibrated on ${new Date().toDateString()}`
      };
      
      // Track model statistics
      const modelStats = {};
      
      // Initialize model stats
      for (const model of Object.values(selectedModels)) {
        modelStats[model] = {
          totalTests: 0,
          totalResponseTime: 0,
          totalContentSize: 0
        };
      }
      
      // Calculate statistics for each model
      for (const [repo, models] of Object.entries(repos)) {
        for (const [modelKey, tests] of Object.entries(models)) {
          // Extract model name from key
          const modelName = modelKey.split('/')[1];
          
          for (const test of tests) {
            if (!test.error) {
              // Add to model stats
              if (modelStats[modelName]) {
                modelStats[modelName].totalTests++;
                modelStats[modelName].totalResponseTime += test.responseTime;
                modelStats[modelName].totalContentSize += test.contentSize;
              }
            }
          }
        }
      }
      
      // Find best model based on response time
      let bestModel = null;
      let bestAvgResponseTime = Infinity;
      
      for (const [model, stats] of Object.entries(modelStats)) {
        if (stats.totalTests > 0) {
          const avgResponseTime = stats.totalResponseTime / stats.totalTests;
          
          // Update configuration with actual stats
          if (avgResponseTime < bestAvgResponseTime) {
            bestAvgResponseTime = avgResponseTime;
            bestModel = model;
            
            configs[language][size].model = model;
            configs[language][size].testResults.avgResponseTime = avgResponseTime;
            configs[language][size].testResults.avgContentSize = stats.totalContentSize / stats.totalTests;
            configs[language][size].testResults.testCount = stats.totalTests;
            configs[language][size].notes = `Calibrated with ${model} on ${new Date().toDateString()} (best response time)`;
          }
        }
      }
    }
  }
  
  // Add default configurations for other languages
  const allLanguages = [
    'javascript', 'typescript', 'python', 'java', 'go', 
    'ruby', 'php', 'csharp', 'cpp', 'rust', 'kotlin'
  ];
  
  const allSizes = ['small', 'medium', 'large'];
  
  // Find the most successful model overall
  let globalBestModel = Object.values(selectedModels)[0];
  let globalModelCounts = {};
  
  for (const language in configs) {
    for (const size in configs[language]) {
      const model = configs[language][size].model;
      globalModelCounts[model] = (globalModelCounts[model] || 0) + 1;
    }
  }
  
  // Find model with most uses
  let maxCount = 0;
  for (const [model, count] of Object.entries(globalModelCounts)) {
    if (count > maxCount) {
      maxCount = count;
      globalBestModel = model;
    }
  }
  
  // Fill in missing configurations
  for (const language of allLanguages) {
    if (!configs[language]) {
      configs[language] = {};
    }
    
    for (const size of allSizes) {
      if (!configs[language][size]) {
        configs[language][size] = {
          provider: 'anthropic',
          model: globalBestModel,
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
 * This configuration was created via comprehensive calibration testing
 * across multiple repository sizes, languages, and complexity levels.
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