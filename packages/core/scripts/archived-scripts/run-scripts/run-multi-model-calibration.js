#!/usr/bin/env node
/**
 * Multi-Model Calibration Script
 * 
 * Tests multiple models from different providers (Anthropic, OpenAI, Google, DeepSeek, OpenRouter)
 * against various repositories to determine optimal model selection.
 * 
 * Usage:
 *   node run-multi-model-calibration.js            # Run full calibration
 *   node run-multi-model-calibration.js --single   # Run with minimal set of repos/models
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const dotenv = require('dotenv');
const readline = require('readline');

// Promisify readline question with a fresh interface each time
function question(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise(resolve => {
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// Load environment variables
dotenv.config();

// Configuration
const OUTPUT_DIR = path.join(__dirname, 'calibration-results');
const CONFIG_OUTPUT_PATH = path.join(OUTPUT_DIR, 'multi-model-config.ts');
const REPORT_PATH = path.join(OUTPUT_DIR, 'multi-model-report.json');

// Create output directory if it doesn't exist
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// API keys
const API_KEYS = {
  anthropic: process.env.ANTHROPIC_API_KEY || null,
  openai: process.env.OPENAI_API_KEY || null,
  gemini: process.env.GEMINI_API_KEY || null,
  deepseek: process.env.DEEPSEEK_API_KEY || null,
  openrouter: process.env.OPENROUTER_API_KEY || null,
  github: process.env.GITHUB_TOKEN || null
};

// Available Models
const MODELS = {
  anthropic: [
    { name: 'claude-3-opus-20240229', display: 'Claude 3 Opus', tier: 'premium' },
    { name: 'claude-3-sonnet-20240229', display: 'Claude 3 Sonnet', tier: 'standard' },
    { name: 'claude-3-haiku-20240307', display: 'Claude 3 Haiku', tier: 'economy' }
  ],
  openai: [
    { name: 'gpt-4-turbo', display: 'GPT-4 Turbo', tier: 'premium' },
    { name: 'gpt-4', display: 'GPT-4', tier: 'premium' },
    { name: 'gpt-3.5-turbo', display: 'GPT-3.5 Turbo', tier: 'economy' }
  ],
  gemini: [
    { name: 'gemini-pro', display: 'Gemini Pro', tier: 'standard' },
    { name: 'gemini-pro-vision', display: 'Gemini Pro Vision', tier: 'standard' }
  ],
  deepseek: [
    { name: 'deepseek-coder', display: 'DeepSeek Coder', tier: 'standard' }
  ],
  openrouter: [
    { name: 'openrouter/anthropic/claude-3-opus', display: 'Claude 3 Opus (OpenRouter)', tier: 'premium' },
    { name: 'openrouter/mistralai/mistral-large', display: 'Mistral Large (OpenRouter)', tier: 'standard' }
  ]
};

// Test repositories
const REPOSITORIES = {
  small: {
    'pallets/click': { language: 'python', complexity: 'low' },
    'jashkenas/underscore': { language: 'javascript', complexity: 'low' },
    'golang/example': { language: 'go', complexity: 'low' },
    'rust-lang/rust-by-example': { language: 'rust', complexity: 'low' }
  },
  medium: {
    'pallets/flask': { language: 'python', complexity: 'medium' },
    'expressjs/express': { language: 'javascript', complexity: 'medium' },
    'nestjs/nest': { language: 'typescript', complexity: 'medium' },
    'gin-gonic/gin': { language: 'go', complexity: 'medium' },
    'laravel/laravel': { language: 'php', complexity: 'medium' }
  },
  large: {
    'django/django': { language: 'python', complexity: 'high' },
    'tensorflow/tensorflow': { language: 'c++', complexity: 'high' },
    'facebook/react': { language: 'javascript', complexity: 'high' },
    'kubernetes/kubernetes': { language: 'go', complexity: 'high' },
    'dotnet/runtime': { language: 'csharp', complexity: 'high' }
  }
};

// Prompts for testing
const PROMPTS = {
  architecture: 'Provide a detailed analysis of this repository\'s architecture, focusing on component interactions and design patterns.',
  bestPractices: 'Identify the software engineering best practices demonstrated in this repository and explain how they improve code quality.'
};

/**
 * Validate Anthropic API key
 */
async function validateAnthropicKey(key) {
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
        'x-api-key': key.trim()
      }
    });
    
    return { valid: response.status === 200, message: 'Valid' };
  } catch (error) {
    return { 
      valid: false, 
      message: error.response ? 
        `Error ${error.response.status}: ${JSON.stringify(error.response.data)}` : 
        error.message 
    };
  }
}

/**
 * Validate OpenAI API key
 */
async function validateOpenAIKey(key) {
  try {
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'user', content: 'Hello' }
      ],
      max_tokens: 10
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key.trim()}`
      }
    });
    
    return { valid: response.status === 200, message: 'Valid' };
  } catch (error) {
    return { 
      valid: false, 
      message: error.response ? 
        `Error ${error.response.status}: ${JSON.stringify(error.response.data)}` : 
        error.message 
    };
  }
}

/**
 * Validate Gemini API key
 */
async function validateGeminiKey(key) {
  try {
    // First, try to list models to verify the API key
    const response = await axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${key.trim()}`, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // If we can list models, the key is valid
    if (response.status === 200) {
      console.log('Available Gemini models:');
      const models = response.data.models || [];
      models.slice(0, 5).forEach(model => {
        console.log(`- ${model.name}`);
      });
      
      return { valid: true, message: 'Valid' };
    }
    
    return { valid: response.status === 200, message: 'Valid' };
  } catch (error) {
    return { 
      valid: false, 
      message: error.response ? 
        `Error ${error.response.status}: ${JSON.stringify(error.response.data)}` : 
        error.message 
    };
  }
}

/**
 * Validate DeepSeek API key
 */
async function validateDeepSeekKey(key) {
  try {
    const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
      model: 'deepseek-coder',
      messages: [
        { role: 'user', content: 'Hello' }
      ],
      max_tokens: 10
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key.trim()}`
      }
    });
    
    return { valid: response.status === 200, message: 'Valid' };
  } catch (error) {
    return { 
      valid: false, 
      message: error.response ? 
        `Error ${error.response.status}: ${JSON.stringify(error.response.data)}` : 
        error.message 
    };
  }
}

/**
 * Validate OpenRouter API key
 */
async function validateOpenRouterKey(key) {
  try {
    // First try to list models to verify the API key
    const modelsResponse = await axios.get('https://openrouter.ai/api/v1/models', {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key.trim()}`
      }
    });
    
    if (modelsResponse.status === 200) {
      console.log('Available OpenRouter models:');
      const models = modelsResponse.data.data || [];
      models.slice(0, 5).forEach(model => {
        console.log(`- ${model.id}`);
      });
      
      // Update our models with the first available model
      if (models.length > 0) {
        MODELS.openrouter = models.slice(0, 2).map(model => ({
          name: model.id,
          display: model.name || model.id,
          tier: model.pricing === 'paid' ? 'premium' : 'standard'
        }));
      }
      
      return { valid: true, message: 'Valid' };
    }
    
    return { valid: modelsResponse.status === 200, message: 'Valid' };
  } catch (error) {
    return { 
      valid: false, 
      message: error.response ? 
        `Error ${error.response.status}: ${JSON.stringify(error.response.data)}` : 
        error.message 
    };
  }
}

/**
 * Validate GitHub token
 */
async function validateGitHubToken(token) {
  try {
    const response = await axios.get('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${token.trim()}`
      }
    });
    
    return { valid: response.status === 200, message: 'Valid' };
  } catch (error) {
    return { 
      valid: false, 
      message: error.response ? 
        `Error ${error.response.status}: ${JSON.stringify(error.response.data)}` : 
        error.message 
    };
  }
}

/**
 * Get API keys from environment or manual input
 */
async function getApiKeys() {
  console.log('Checking API keys...');
  
  const validationResults = {};
  const keysToCheck = {
    'Anthropic': { key: API_KEYS.anthropic, validator: validateAnthropicKey },
    'OpenAI': { key: API_KEYS.openai, validator: validateOpenAIKey },
    'Gemini': { key: API_KEYS.gemini, validator: validateGeminiKey },
    'DeepSeek': { key: API_KEYS.deepseek, validator: validateDeepSeekKey },
    'OpenRouter': { key: API_KEYS.openrouter, validator: validateOpenRouterKey },
    'GitHub': { key: API_KEYS.github, validator: validateGitHubToken }
  };
  
  for (const [provider, { key, validator }] of Object.entries(keysToCheck)) {
    if (key) {
      console.log(`Found ${provider} key in environment variables.`);
      console.log(`Validating ${provider} key...`);
      
      const result = await validator(key);
      
      if (result.valid) {
        console.log(`✅ ${provider} key is valid`);
        validationResults[provider.toLowerCase()] = true;
      } else {
        console.log(`❌ ${provider} key validation failed: ${result.message}`);
        const newKey = await question(`Enter valid ${provider} key (or press Enter to skip): `);
        
        if (newKey) {
          console.log(`Validating new ${provider} key...`);
          const newResult = await validator(newKey);
          
          if (newResult.valid) {
            console.log(`✅ New ${provider} key is valid`);
            API_KEYS[provider.toLowerCase()] = newKey;
            validationResults[provider.toLowerCase()] = true;
          } else {
            console.log(`❌ New ${provider} key validation failed: ${newResult.message}`);
            validationResults[provider.toLowerCase()] = false;
          }
        } else {
          validationResults[provider.toLowerCase()] = false;
        }
      }
    } else {
      console.log(`${provider} key not found in environment variables.`);
      const newKey = await question(`Enter ${provider} key (or press Enter to skip): `);
      
      if (newKey) {
        console.log(`Validating ${provider} key...`);
        const result = await validator(newKey);
        
        if (result.valid) {
          console.log(`✅ ${provider} key is valid`);
          API_KEYS[provider.toLowerCase()] = newKey;
          validationResults[provider.toLowerCase()] = true;
        } else {
          console.log(`❌ ${provider} key validation failed: ${result.message}`);
          validationResults[provider.toLowerCase()] = false;
        }
      } else {
        validationResults[provider.toLowerCase()] = false;
      }
    }
  }
  
  return validationResults;
}

/**
 * Get repository information
 */
async function getRepositoryInfo(repo) {
  console.log(`Fetching repository information: ${repo}`);
  
  try {
    let response;
    
    // Try authenticated request if GitHub token is available
    if (API_KEYS.github) {
      try {
        response = await axios.get(`https://api.github.com/repos/${repo}`, {
          headers: {
            'Authorization': `token ${API_KEYS.github}`
          }
        });
      } catch (error) {
        console.log('GitHub authenticated request failed, trying unauthenticated...');
        response = await axios.get(`https://api.github.com/repos/${repo}`);
      }
    } else {
      // Unauthenticated request
      response = await axios.get(`https://api.github.com/repos/${repo}`);
    }
    
    // Get README content
    let readmeContent = '';
    try {
      const readmeResponse = await axios.get(`https://api.github.com/repos/${repo}/readme`, {
        headers: API_KEYS.github ? 
          { 'Authorization': `token ${API_KEYS.github}` } : 
          {}
      });
      
      // Decode base64 content
      readmeContent = Buffer.from(readmeResponse.data.content, 'base64').toString('utf-8');
    } catch (readmeError) {
      console.log(`Could not fetch README: ${readmeError.message}`);
    }
    
    // Construct repository context
    return {
      name: response.data.full_name,
      description: response.data.description || 'No description available',
      language: response.data.language,
      stars: response.data.stargazers_count,
      forks: response.data.forks_count,
      issues: response.data.open_issues_count,
      created: response.data.created_at,
      updated: response.data.updated_at,
      readme: readmeContent
    };
  } catch (error) {
    console.error(`Error fetching repository information: ${error.message}`);
    throw error;
  }
}

/**
 * Create repository prompt
 */
function createPrompt(repo, repoInfo, promptType) {
  const promptText = PROMPTS[promptType];
  
  return `
Repository Information:
- Name: ${repoInfo.name}
- Description: ${repoInfo.description}
- Language: ${repoInfo.language}
- Stars: ${repoInfo.stars}
- Forks: ${repoInfo.forks}
- Open Issues: ${repoInfo.issues}
- Created: ${repoInfo.created}
- Last Updated: ${repoInfo.updated}

README Content:
${repoInfo.readme.substring(0, 8000)}

Question:
${promptText}
`.trim();
}

/**
 * Call Anthropic API
 */
async function callAnthropicAPI(model, prompt) {
  const startTime = Date.now();
  
  try {
    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model,
      max_tokens: 2000,
      system: 'You are a repository analyzer. Provide detailed, technical analysis based on the repository information.',
      messages: [
        { role: 'user', content: prompt }
      ]
    }, {
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': API_KEYS.anthropic
      }
    });
    
    const endTime = Date.now();
    const responseTime = (endTime - startTime) / 1000; // in seconds
    
    // Get response content
    const content = response.data.content[0].text;
    
    return {
      success: true,
      content,
      contentSize: Buffer.from(content).length,
      responseTime,
      model,
      provider: 'anthropic'
    };
  } catch (error) {
    return {
      success: false,
      error: error.response ? 
        `${error.response.status}: ${JSON.stringify(error.response.data)}` : 
        error.message,
      model,
      provider: 'anthropic'
    };
  }
}

/**
 * Call OpenAI API
 */
async function callOpenAIAPI(model, prompt) {
  const startTime = Date.now();
  
  try {
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model,
      messages: [
        { role: 'system', content: 'You are a repository analyzer. Provide detailed, technical analysis based on the repository information.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 2000
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEYS.openai}`
      }
    });
    
    const endTime = Date.now();
    const responseTime = (endTime - startTime) / 1000; // in seconds
    
    // Get response content
    const content = response.data.choices[0].message.content;
    
    return {
      success: true,
      content,
      contentSize: Buffer.from(content).length,
      responseTime,
      model,
      provider: 'openai'
    };
  } catch (error) {
    return {
      success: false,
      error: error.response ? 
        `${error.response.status}: ${JSON.stringify(error.response.data)}` : 
        error.message,
      model,
      provider: 'openai'
    };
  }
}

/**
 * Call Gemini API
 */
async function callGeminiAPI(model, prompt) {
  const startTime = Date.now();
  
  try {
    // Extract just the model name without version
    const modelName = model.split('-')[0] + '-' + model.split('-')[1];
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEYS.gemini}`;
    
    console.log(`Calling Gemini API with model: ${modelName}`);
    
    // Create request with appropriate format
    const requestBody = {
      contents: [{
        parts: [{ text: 'You are a repository analyzer. Provide detailed, technical analysis based on the repository information.' }]
      }, {
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        maxOutputTokens: 2000,
        temperature: 0.7
      }
    };
    
    const response = await axios.post(apiUrl, requestBody, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const endTime = Date.now();
    const responseTime = (endTime - startTime) / 1000; // in seconds
    
    // Get response content - handle different response formats
    let content = '';
    if (response.data.candidates && response.data.candidates[0]) {
      if (response.data.candidates[0].content && response.data.candidates[0].content.parts) {
        // Most common format
        content = response.data.candidates[0].content.parts[0].text;
      } else if (response.data.candidates[0].text) {
        // Possible alternative format
        content = response.data.candidates[0].text;
      }
    }
    
    if (!content) {
      console.log('Unexpected response format:', JSON.stringify(response.data).substring(0, 200) + '...');
      content = 'Error: Unexpected response format';
    }
    
    return {
      success: true,
      content,
      contentSize: Buffer.from(content).length,
      responseTime,
      model,
      provider: 'gemini'
    };
  } catch (error) {
    console.log('Gemini API error:', error.message);
    if (error.response) {
      console.log('Error data:', JSON.stringify(error.response.data).substring(0, 200) + '...');
    }
    
    return {
      success: false,
      error: error.response ? 
        `${error.response.status}: ${JSON.stringify(error.response.data)}` : 
        error.message,
      model,
      provider: 'gemini'
    };
  }
}

/**
 * Call DeepSeek API
 */
async function callDeepSeekAPI(model, prompt) {
  const startTime = Date.now();
  
  try {
    const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
      model,
      messages: [
        { role: 'system', content: 'You are a repository analyzer. Provide detailed, technical analysis based on the repository information.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 2000
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEYS.deepseek}`
      }
    });
    
    const endTime = Date.now();
    const responseTime = (endTime - startTime) / 1000; // in seconds
    
    // Get response content
    const content = response.data.choices[0].message.content;
    
    return {
      success: true,
      content,
      contentSize: Buffer.from(content).length,
      responseTime,
      model,
      provider: 'deepseek'
    };
  } catch (error) {
    return {
      success: false,
      error: error.response ? 
        `${error.response.status}: ${JSON.stringify(error.response.data)}` : 
        error.message,
      model,
      provider: 'deepseek'
    };
  }
}

/**
 * Call OpenRouter API
 */
async function callOpenRouterAPI(model, prompt) {
  const startTime = Date.now();
  
  try {
    console.log(`Calling OpenRouter API with model: ${model}`);
    
    const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
      model,
      messages: [
        { role: 'system', content: 'You are a repository analyzer. Provide detailed, technical analysis based on the repository information.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 2000
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEYS.openrouter}`,
        'HTTP-Referer': 'https://codequal.io', // Required by OpenRouter
        'X-Title': 'CodeQual Repository Analysis'
      }
    });
    
    const endTime = Date.now();
    const responseTime = (endTime - startTime) / 1000; // in seconds
    
    // Handle different response formats
    let content = '';
    if (response.data.choices && response.data.choices[0]) {
      if (response.data.choices[0].message && response.data.choices[0].message.content) {
        content = response.data.choices[0].message.content;
      } else if (response.data.choices[0].text) {
        content = response.data.choices[0].text;
      }
    }
    
    if (!content) {
      console.log('Unexpected response format:', JSON.stringify(response.data).substring(0, 200) + '...');
      content = 'Error: Unexpected response format';
    }
    
    return {
      success: true,
      content,
      contentSize: Buffer.from(content).length,
      responseTime,
      model,
      provider: 'openrouter'
    };
  } catch (error) {
    console.log('OpenRouter API error:', error.message);
    if (error.response) {
      console.log('Error data:', JSON.stringify(error.response.data).substring(0, 200) + '...');
    }
    
    return {
      success: false,
      error: error.response ? 
        `${error.response.status}: ${JSON.stringify(error.response.data)}` : 
        error.message,
      model,
      provider: 'openrouter'
    };
  }
}

/**
 * Select repositories for testing
 */
async function selectRepositories() {
  console.log('\nSelect repositories to test:');
  console.log('1. Test all repositories (comprehensive)');
  console.log('2. Test a balanced set (one per language/size)');
  console.log('3. Test minimal set (quickest)');
  
  const choice = await question('Enter choice (1-3): ');
  
  let selectedRepos = {};
  
  switch (choice) {
    case '1':
      selectedRepos = REPOSITORIES;
      break;
    case '2':
      // Get one repo for each language and size
      selectedRepos = { small: {}, medium: {}, large: {} };
      
      const selectedLanguages = {};
      
      for (const size of Object.keys(REPOSITORIES)) {
        for (const [repo, metadata] of Object.entries(REPOSITORIES[size])) {
          const key = `${size}_${metadata.language}`;
          
          if (!selectedLanguages[key]) {
            selectedLanguages[key] = repo;
            selectedRepos[size][repo] = metadata;
          }
        }
      }
      break;
    case '3':
      // Minimal set
      selectedRepos = {
        small: { 'pallets/click': REPOSITORIES.small['pallets/click'] },
        medium: { 'expressjs/express': REPOSITORIES.medium['expressjs/express'] },
        large: { 'facebook/react': REPOSITORIES.large['facebook/react'] }
      };
      break;
    default:
      console.log('Invalid choice, using minimal set.');
      selectedRepos = {
        small: { 'pallets/click': REPOSITORIES.small['pallets/click'] },
        medium: { 'expressjs/express': REPOSITORIES.medium['expressjs/express'] },
        large: { 'facebook/react': REPOSITORIES.large['facebook/react'] }
      };
  }
  
  // Count total repositories
  let totalCount = 0;
  for (const size of Object.keys(selectedRepos)) {
    totalCount += Object.keys(selectedRepos[size]).length;
  }
  
  console.log(`Selected ${totalCount} repositories for testing.`);
  return selectedRepos;
}

/**
 * Select models to test
 */
async function selectModels(validationResults) {
  console.log('\nSelect models to test:');
  console.log('1. Test all available models');
  console.log('2. Test top-tier models only');
  console.log('3. Test fastest models only');
  console.log('4. Test specific providers');
  
  const choice = await question('Enter choice (1-4): ');
  
  let selectedModels = {};
  
  switch (choice) {
    case '1':
      // All available models from providers with valid keys
      for (const provider of Object.keys(MODELS)) {
        if (validationResults[provider]) {
          selectedModels[provider] = MODELS[provider];
        }
      }
      break;
    case '2':
      // Only premium models
      for (const provider of Object.keys(MODELS)) {
        if (validationResults[provider]) {
          selectedModels[provider] = MODELS[provider].filter(model => model.tier === 'premium');
        }
      }
      break;
    case '3':
      // Only economy models
      for (const provider of Object.keys(MODELS)) {
        if (validationResults[provider]) {
          selectedModels[provider] = MODELS[provider].filter(model => 
            model.tier === 'economy' || (model.tier === 'standard' && !MODELS[provider].some(m => m.tier === 'economy'))
          );
        }
      }
      break;
    case '4':
      // Specific providers
      const providers = await question('Enter providers (comma-separated, e.g., "anthropic,openai"): ');
      const providerList = providers.split(',').map(p => p.trim().toLowerCase());
      
      for (const provider of providerList) {
        if (MODELS[provider] && validationResults[provider]) {
          selectedModels[provider] = MODELS[provider];
        }
      }
      break;
    default:
      console.log('Invalid choice, using all available models.');
      for (const provider of Object.keys(MODELS)) {
        if (validationResults[provider]) {
          selectedModels[provider] = MODELS[provider];
        }
      }
  }
  
  // Count total models
  let totalCount = 0;
  for (const provider of Object.keys(selectedModels)) {
    totalCount += selectedModels[provider].length;
  }
  
  console.log(`Selected ${totalCount} models for testing.`);
  return selectedModels;
}

/**
 * Main calibration function
 */
async function runCalibration() {
  console.log('=== Multi-Model Calibration ===');
  
  // Check for single repo/model flag
  const isSingleMode = process.argv.includes('--single');
  
  // Validate API keys
  const validationResults = await getApiKeys();
  
  // Select repositories and models
  const selectedRepos = isSingleMode ? 
    { medium: { 'expressjs/express': REPOSITORIES.medium['expressjs/express'] } } : 
    await selectRepositories();
  
  const selectedModels = isSingleMode ?
    { anthropic: [{ name: 'claude-3-haiku-20240307', display: 'Claude 3 Haiku', tier: 'economy' }] } :
    await selectModels(validationResults);
  
  // Initialize results
  const results = {};
  
  // Calculate total tests
  let totalTests = 0;
  for (const size of Object.keys(selectedRepos)) {
    for (const repo of Object.keys(selectedRepos[size])) {
      for (const provider of Object.keys(selectedModels)) {
        totalTests += selectedModels[provider].length * Object.keys(PROMPTS).length;
      }
    }
  }
  
  console.log(`\nPreparing to run ${totalTests} total tests...`);
  
  // Start timer
  const startTime = Date.now();
  let completedTests = 0;
  
  // Run tests
  for (const size of Object.keys(selectedRepos)) {
    // Initialize size in results
    if (!results[size]) {
      results[size] = {};
    }
    
    for (const [repo, metadata] of Object.entries(selectedRepos[size])) {
      console.log(`\nProcessing ${repo} (${metadata.language}, ${size})...`);
      
      // Initialize repo in results
      if (!results[size][repo]) {
        results[size][repo] = {
          language: metadata.language,
          complexity: metadata.complexity,
          models: {}
        };
      }
      
      // Get repository information
      let repoInfo;
      try {
        repoInfo = await getRepositoryInfo(repo);
      } catch (error) {
        console.error(`Error fetching repository information: ${error.message}`);
        continue;
      }
      
      // Test each model
      for (const provider of Object.keys(selectedModels)) {
        for (const model of selectedModels[provider]) {
          console.log(`Testing with ${model.display} (${provider})...`);
          
          // Initialize model in results
          const modelKey = `${provider}/${model.name}`;
          if (!results[size][repo].models[modelKey]) {
            results[size][repo].models[modelKey] = {
              model: model.name,
              provider,
              display: model.display,
              tier: model.tier,
              prompts: {}
            };
          }
          
          // Test each prompt
          for (const [promptType, promptText] of Object.entries(PROMPTS)) {
            const prompt = createPrompt(repo, repoInfo, promptType);
            
            console.log(`  Running ${promptType} prompt...`);
            
            let result;
            try {
              // Call appropriate API
              switch (provider) {
                case 'anthropic':
                  result = await callAnthropicAPI(model.name, prompt);
                  break;
                case 'openai':
                  result = await callOpenAIAPI(model.name, prompt);
                  break;
                case 'gemini':
                  result = await callGeminiAPI(model.name, prompt);
                  break;
                case 'deepseek':
                  result = await callDeepSeekAPI(model.name, prompt);
                  break;
                case 'openrouter':
                  result = await callOpenRouterAPI(model.name, prompt);
                  break;
                default:
                  throw new Error(`Unknown provider: ${provider}`);
              }
              
              // Add result to results
              results[size][repo].models[modelKey].prompts[promptType] = {
                success: result.success,
                ...(result.success ? {
                  contentSize: result.contentSize,
                  responseTime: result.responseTime,
                  timestamp: new Date().toISOString()
                } : {
                  error: result.error,
                  timestamp: new Date().toISOString()
                })
              };
              
              if (result.success) {
                console.log(`  ✅ Response time: ${result.responseTime.toFixed(2)}s`);
              } else {
                console.log(`  ❌ Error: ${result.error}`);
              }
            } catch (error) {
              console.error(`  ❌ Error: ${error.message}`);
              
              // Add error to results
              results[size][repo].models[modelKey].prompts[promptType] = {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
              };
            }
            
            // Update progress
            completedTests++;
            const progress = Math.floor((completedTests / totalTests) * 100);
            const elapsedTime = (Date.now() - startTime) / 1000 / 60; // minutes
            const estimatedTotalTime = (elapsedTime / completedTests) * totalTests;
            const remainingTime = estimatedTotalTime - elapsedTime;
            
            console.log(`  Progress: ${completedTests}/${totalTests} (${progress}%) - Est. remaining: ${remainingTime.toFixed(1)} minutes`);
            
            // Save results after each test
            fs.writeFileSync(REPORT_PATH, JSON.stringify(results, null, 2));
            
            // Add delay between requests to avoid rate limits
            if (completedTests < totalTests) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        }
      }
    }
  }
  
  // Generate final report
  generateReport(results, selectedModels);
  
  // End time
  const endTime = Date.now();
  const totalTime = (endTime - startTime) / 1000 / 60; // minutes
  
  console.log(`\nCalibration complete in ${totalTime.toFixed(2)} minutes!`);
  console.log(`Results saved to ${REPORT_PATH}`);
  console.log(`Configuration saved to ${CONFIG_OUTPUT_PATH}`);
}

/**
 * Generate configuration report
 */
function generateReport(results, selectedModels) {
  console.log('\nGenerating model configuration...');
  
  // Initialize configuration
  const config = {};
  
  // Process results
  for (const size of Object.keys(results)) {
    // Calculate average stats for each model by language
    const languageStats = {};
    
    for (const [repo, repoData] of Object.entries(results[size])) {
      const { language, models } = repoData;
      
      if (!languageStats[language]) {
        languageStats[language] = {};
      }
      
      for (const [modelKey, modelData] of Object.entries(models)) {
        if (!languageStats[language][modelKey]) {
          languageStats[language][modelKey] = {
            successCount: 0,
            totalTests: 0,
            totalResponseTime: 0,
            totalContentSize: 0,
            errorCount: 0,
            model: modelData.model,
            provider: modelData.provider,
            display: modelData.display,
            tier: modelData.tier
          };
        }
        
        // Count successful tests
        for (const [promptType, promptData] of Object.entries(modelData.prompts)) {
          languageStats[language][modelKey].totalTests++;
          
          if (promptData.success) {
            languageStats[language][modelKey].successCount++;
            languageStats[language][modelKey].totalResponseTime += promptData.responseTime;
            languageStats[language][modelKey].totalContentSize += promptData.contentSize;
          } else {
            languageStats[language][modelKey].errorCount++;
          }
        }
      }
    }
    
    // Find best model for each language by success rate and response time
    for (const language of Object.keys(languageStats)) {
      if (!config[language]) {
        config[language] = {};
      }
      
      if (!config[language][size]) {
        config[language][size] = {};
      }
      
      // Find models with highest success rate
      const modelStats = Object.entries(languageStats[language]).map(([modelKey, stats]) => ({
        modelKey,
        ...stats,
        successRate: stats.totalTests > 0 ? stats.successCount / stats.totalTests : 0,
        avgResponseTime: stats.successCount > 0 ? stats.totalResponseTime / stats.successCount : Infinity,
        avgContentSize: stats.successCount > 0 ? stats.totalContentSize / stats.successCount : 0
      }));
      
      // Sort by success rate (desc) and then by response time (asc)
      modelStats.sort((a, b) => {
        if (b.successRate !== a.successRate) {
          return b.successRate - a.successRate;
        }
        return a.avgResponseTime - b.avgResponseTime;
      });
      
      // Select best model
      if (modelStats.length > 0 && modelStats[0].successRate > 0) {
        const bestModel = modelStats[0];
        
        config[language][size] = {
          provider: bestModel.provider,
          model: bestModel.model,
          testResults: {
            status: 'tested',
            successRate: bestModel.successRate,
            avgResponseTime: bestModel.avgResponseTime,
            avgContentSize: bestModel.avgContentSize,
            testCount: bestModel.totalTests,
            lastTested: new Date().toISOString()
          },
          notes: `Selected as best model for ${language}/${size} based on ${Math.round(bestModel.successRate * 100)}% success rate and ${bestModel.avgResponseTime.toFixed(2)}s avg response time.`
        };
      } else {
        // No successful tests, use default model
        config[language][size] = {
          provider: 'anthropic',
          model: 'claude-3-haiku-20240307',
          testResults: {
            status: 'estimated',
            successRate: 0,
            avgResponseTime: 0,
            avgContentSize: 0,
            testCount: 0,
            lastTested: new Date().toISOString()
          },
          notes: 'Default model (no successful tests for this language/size)'
        };
      }
    }
  }
  
  // Fill in missing configurations
  const allLanguages = [
    'javascript', 'typescript', 'python', 'java', 'go', 
    'ruby', 'php', 'csharp', 'cpp', 'rust'
  ];
  
  const allSizes = ['small', 'medium', 'large'];
  
  // Find most successful model overall
  let bestGlobalModel = {
    provider: 'anthropic',
    model: 'claude-3-haiku-20240307'
  };
  
  let bestSuccessRate = 0;
  let bestResponseTime = Infinity;
  
  for (const language in config) {
    for (const size in config[language]) {
      const modelConfig = config[language][size];
      
      if (modelConfig.testResults.successRate > bestSuccessRate || 
          (modelConfig.testResults.successRate === bestSuccessRate && 
           modelConfig.testResults.avgResponseTime < bestResponseTime)) {
        bestSuccessRate = modelConfig.testResults.successRate;
        bestResponseTime = modelConfig.testResults.avgResponseTime;
        bestGlobalModel = {
          provider: modelConfig.provider,
          model: modelConfig.model
        };
      }
    }
  }
  
  // Fill in missing configurations
  for (const language of allLanguages) {
    if (!config[language]) {
      config[language] = {};
    }
    
    for (const size of allSizes) {
      if (!config[language][size]) {
        config[language][size] = {
          provider: bestGlobalModel.provider,
          model: bestGlobalModel.model,
          testResults: {
            status: 'estimated',
            successRate: 0,
            avgResponseTime: 0,
            avgContentSize: 0,
            testCount: 0,
            lastTested: new Date().toISOString()
          },
          notes: `Estimated configuration based on best overall model (${bestGlobalModel.provider}/${bestGlobalModel.model})`
        };
      }
    }
  }
  
  // Generate configuration file
  const configContent = `/**
 * Auto-generated Repository Model Configuration
 * Generated on: ${new Date().toISOString()}
 * 
 * This configuration was created via multi-model calibration
 * testing across different repository sizes and languages.
 */

import { RepositoryModelConfig, RepositorySizeCategory, TestingStatus } from '../repository-model-config';

/**
 * Repository model configurations based on calibration results
 */
export const CALIBRATED_MODEL_CONFIGS: Record<
  string, 
  Record<RepositorySizeCategory, RepositoryModelConfig>
> = ${JSON.stringify(config, null, 2).replace(/\"([^\"]+)\":/g, '$1:')};
`;

  // Save configuration
  fs.writeFileSync(CONFIG_OUTPUT_PATH, configContent);
  console.log(`Configuration saved to ${CONFIG_OUTPUT_PATH}`);
  
  return config;
}

// Run calibration
if (require.main === module) {
  runCalibration().catch(error => {
    console.error('Calibration failed:', error);
    rl.close();
    process.exit(1);
  });
}

module.exports = {
  runCalibration,
  generateReport
};