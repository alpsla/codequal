#!/usr/bin/env node
/**
 * Targeted Calibration Script
 * 
 * This script runs calibration tests in a targeted manner, focusing on specific
 * repository categories first before doing comprehensive analysis.
 * 
 * Usage:
 *   node targeted-calibration.js --language=javascript --size=medium
 *   node targeted-calibration.js --all-categories
 *   node targeted-calibration.js --generate-config
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const dotenv = require('dotenv');
const readline = require('readline');

// Load environment variables from project root
const envPath = path.resolve(__dirname, '..', '..', '..', '.env');
console.log(`Looking for .env file at: ${envPath}`);
const result = dotenv.config({ path: envPath });
if (result.error) {
  console.warn(`Warning: Error loading .env file from project root: ${result.error.message}`);
  console.log('Attempting to load from current directory as fallback...');
  dotenv.config();
} else {
  console.log('Successfully loaded .env file from project root');
}

// Configuration
const OUTPUT_DIR = path.join(__dirname, 'calibration-results');
const TARGETED_RESULTS_PATH = path.join(OUTPUT_DIR, 'targeted-results.json');
const CONFIG_OUTPUT_PATH = path.join(OUTPUT_DIR, 'targeted-model-config.ts');
const QUALITY_METRICS_PATH = path.join(OUTPUT_DIR, 'quality-metrics.json');

// Evaluation weight configuration
const EVALUATION_WEIGHTS = {
  // Performance metrics
  responseTime: 0.15,   // 15% weight for response time
  contentSize: 0.05,    // 5% weight for content size
  
  // Quality metrics
  relevance: 0.20,      // 20% weight for relevance of response to prompt
  accuracy: 0.25,       // 25% weight for factual accuracy
  depth: 0.20,          // 20% weight for depth of analysis
  structure: 0.15,      // 15% weight for structure and organization
  
  // Category-specific weights can be defined if needed
  categories: {
    architecture: { depth: 0.25, accuracy: 0.20 },         // Architecture needs more depth
    security: { accuracy: 0.30, relevance: 0.25 },         // Security needs more accuracy
    performance: { accuracy: 0.30, depth: 0.25 },          // Performance needs accuracy and depth
    benchmarkDependency: { accuracy: 0.40, depth: 0.15 }   // Benchmarks need high accuracy
  }
};

// Quality rubric
const QUALITY_RUBRIC = {
  relevance: {
    1: "Response mostly ignores or misunderstands the prompt",
    2: "Response partly addresses the prompt but misses key aspects",
    3: "Response adequately addresses the main aspects of the prompt",
    4: "Response fully addresses all aspects of the prompt",
    5: "Response comprehensively addresses the prompt with additional valuable insights"
  },
  accuracy: {
    1: "Response contains multiple significant factual errors",
    2: "Response contains some factual errors or misinterpretations",
    3: "Response is mostly accurate with minor errors",
    4: "Response is accurate with very few or no errors",
    5: "Response demonstrates exceptional accuracy with precise details and references"
  },
  depth: {
    1: "Very superficial analysis with little technical insight",
    2: "Basic analysis with limited technical insight",
    3: "Moderate depth of analysis with some technical insight",
    4: "Good depth of analysis with clear technical insights",
    5: "Exceptional depth of analysis with detailed technical insights"
  },
  structure: {
    1: "Poorly organized and difficult to follow",
    2: "Basic organization but lacks coherence",
    3: "Adequately organized and reasonably coherent",
    4: "Well-organized, coherent, and easy to follow",
    5: "Exceptionally well-organized with clear sections and logical flow"
  }
};

// Create output directory if it doesn't exist
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Load quality metrics reference data if it exists
let QUALITY_REFERENCE_DATA = {};
if (fs.existsSync(QUALITY_METRICS_PATH)) {
  try {
    QUALITY_REFERENCE_DATA = JSON.parse(fs.readFileSync(QUALITY_METRICS_PATH, 'utf8'));
    console.log(`Loaded quality reference data for ${Object.keys(QUALITY_REFERENCE_DATA).length} repositories`);
  } catch (error) {
    console.error(`Error loading quality reference data: ${error.message}`);
  }
}

// Promisify readline question
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

// API keys
const API_KEYS = {
  anthropic: process.env.ANTHROPIC_API_KEY || null,
  openai: process.env.OPENAI_API_KEY || null,
  gemini: process.env.GEMINI_API_KEY || null,
  deepseek: process.env.DEEPSEEK_API_KEY || null,
  openrouter: process.env.OPENROUTER_API_KEY || null,
  github: process.env.GITHUB_TOKEN || null
};

// Provider definitions and preferred models
const PROVIDERS = {
  anthropic: {
    name: 'Anthropic',
    models: {
      premium: 'claude-3-opus-20240229',
      standard: 'claude-3-sonnet-20240229',
      economy: 'claude-3-haiku-20240307',
      // New models
      sonnet: 'claude-3-7-sonnet-20250219'
    },
    validateKey: validateAnthropicKey,
    callApi: callAnthropicAPI
  },
  openai: {
    name: 'OpenAI',
    models: {
      premium: 'gpt-4o',
      standard: 'gpt-4-turbo-preview',
      economy: 'gpt-3.5-turbo'
    },
    validateKey: validateOpenAIKey,
    callApi: callOpenAIAPI
  },
  gemini: {
    name: 'Google',
    models: {
      standard: 'gemini-pro',
      premium: 'gemini-2.5-pro-preview-05-06'
    },
    validateKey: validateGeminiKey,
    callApi: callGeminiAPI
  },
  deepseek: {
    name: 'DeepSeek',
    models: {
      standard: 'deepseek-coder',
      premium: 'deepseek-coder-plus',
      economy: 'deepseek-coder-lite'
    },
    validateKey: validateDeepSeekKey,
    callApi: callDeepSeekAPI
  },
  openrouter: {
    name: 'OpenRouter',
    models: {
      premium: null, // Will be populated dynamically
      standard: null  // Will be populated dynamically
    },
    validateKey: validateOpenRouterKey,
    callApi: callOpenRouterAPI
  }
};

// Repository categories
const LANGUAGE_CATEGORIES = [
  'javascript',
  'typescript',
  'python',
  'java',
  'go',
  'ruby',
  'php',
  'csharp',
  'cpp',
  'rust'
];

const SIZE_CATEGORIES = [
  'small',
  'medium',
  'large'
];

// Repository samples for each category
const REPOSITORIES = {
  javascript: {
    small: ['jashkenas/underscore', 'lodash/lodash'],
    medium: ['expressjs/express', 'jquery/jquery'],
    large: ['facebook/react', 'nodejs/node']
  },
  typescript: {
    small: ['microsoft/tslib', 'TypeStrong/ts-node'],
    medium: ['nestjs/nest', 'prisma/prisma'],
    large: ['microsoft/TypeScript', 'angular/angular']
  },
  python: {
    small: ['pallets/click', 'psf/requests'],
    medium: ['pallets/flask', 'pytest-dev/pytest'],
    large: ['django/django', 'pytorch/pytorch']
  },
  java: {
    small: ['junit-team/junit5', 'mockito/mockito'],
    medium: ['elastic/elasticsearch', 'spring-projects/spring-boot'],
    large: ['apache/hadoop', 'oracle/graal']
  },
  go: {
    small: ['spf13/cobra', 'google/uuid'],
    medium: ['gin-gonic/gin', 'go-gorm/gorm'],
    large: ['golang/go', 'kubernetes/kubernetes']
  },
  ruby: {
    small: ['sinatra/sinatra', 'puma/puma'],
    medium: ['discourse/discourse', 'fastlane/fastlane'],
    large: ['rails/rails', 'jekyll/jekyll']
  },
  php: {
    small: ['guzzle/guzzle', 'briannesbitt/Carbon'],
    medium: ['laravel/laravel', 'symfony/symfony'],
    large: ['wordpress/wordpress', 'composer/composer']
  },
  csharp: {
    small: ['jbogard/MediatR', 'AutoMapper/AutoMapper'],
    medium: ['aspnet/AspNetCore', 'dotnet/efcore'],
    large: ['dotnet/runtime', 'mono/mono']
  },
  cpp: {
    small: ['google/googletest', 'nlohmann/json'],
    medium: ['opencv/opencv', 'google/protobuf'],
    large: ['tensorflow/tensorflow', 'electron/electron']
  },
  rust: {
    small: ['rust-lang/rustlings', 'BurntSushi/ripgrep'],
    medium: ['SergioBenitez/Rocket', 'tokio-rs/tokio'],
    large: ['rust-lang/rust', 'alacritty/alacritty']
  }
};

// Prompts for specific categories
const PROMPT_CATEGORIES = {
  // Core analysis categories
  architecture: 'Analyze the architecture of this repository. What are the main components and how are they organized?',
  patterns: 'Identify the design patterns used in this repository and explain how they contribute to the codebase.',
  security: 'Evaluate the security considerations in this repository. Are there any potential vulnerabilities?',
  performance: 'Assess the performance optimizations in this repository. How does it handle efficiency?',
  documentation: 'Analyze the documentation in this repository. Is it comprehensive and well-maintained?',
  
  // Extended analysis categories
  dependencies: 'Analyze the dependency structure in this repository. How are external dependencies managed and what are the key dependencies?',
  codeQuality: 'Evaluate the overall code quality of this repository. Consider factors like readability, maintainability, and adherence to best practices.',
  testCoverage: 'Assess the testing approach and coverage in this repository. How comprehensive are the tests?',
  bugPotential: 'Identify potential bugs or error-prone patterns in this codebase.',
  
  // Specialized analysis categories
  algorithmAnalysis: 'Analyze the algorithms used in this repository. How appropriate and efficient are they for their intended purpose?',
  apiDesign: 'Evaluate the API design in this repository. How well-designed, consistent, and usable are the APIs?',
  concurrency: 'Analyze how concurrency and parallelism are handled in this repository.',
  
  // Benchmark categories with known answers
  benchmarkDependency: 'List the top 5 direct dependencies of this project based on the repository files. Include the version if available.',
  benchmarkPatterns: 'Identify exactly 3 design patterns used in this codebase, with file references where they are implemented.',
  benchmarkComplexity: 'Find the most complex function in the codebase (highest cyclomatic complexity) and explain why it\'s complex.'
};

/**
 * Get command line arguments
 */
function getCommandLineArgs() {
  const args = process.argv.slice(2);
  const result = {
    language: null,
    size: null,
    allCategories: false,
    generateConfig: false,
    interactive: true
  };
  
  for (const arg of args) {
    if (arg.startsWith('--language=')) {
      result.language = arg.split('=')[1];
    } else if (arg.startsWith('--size=')) {
      result.size = arg.split('=')[1];
    } else if (arg === '--all-categories') {
      result.allCategories = true;
    } else if (arg === '--generate-config') {
      result.generateConfig = true;
    } else if (arg === '--non-interactive') {
      result.interactive = false;
    }
  }
  
  return result;
}

/**
 * Validate Anthropic API key
 */
async function validateAnthropicKey(key) {
  // Clean up key (remove quotes, whitespace, etc.)
  const cleanKey = key.trim().replace(/^["']|["']$/g, '');
  
  // Check key format
  if (!cleanKey.startsWith('sk-ant-')) {
    console.warn('Warning: Anthropic API key does not start with "sk-ant-". This may not be a valid API key.');
  }
  
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
        'x-api-key': cleanKey
      }
    });
    
    return { valid: response.status === 200, message: 'Valid' };
  } catch (error) {
    console.error('Anthropic API validation error:', error.message);
    if (error.response) {
      console.error(`Response status: ${error.response.status}`);
      console.error(`Response data: ${JSON.stringify(error.response.data).substring(0, 200)}...`);
    }
    
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
  // Clean up key (remove quotes, whitespace, etc.)
  const cleanKey = key.trim().replace(/^["']|["']$/g, '');
  
  try {
    // First try to list models to ensure key is valid
    try {
      const modelsResponse = await axios.get('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${cleanKey}`
        }
      });
      
      if (modelsResponse.status === 200) {
        return { valid: true, message: 'Valid' };
      }
    } catch (modelsError) {
      console.log('Could not list models. Trying a simple completion instead...');
    }
    
    // If listing models fails, try a simple completion
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'user', content: 'Hello' }
      ],
      max_tokens: 10
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cleanKey}`
      }
    });
    
    return { valid: response.status === 200, message: 'Valid' };
  } catch (error) {
    console.error('OpenAI API validation error:', error.message);
    if (error.response) {
      console.error(`Response status: ${error.response.status}`);
      console.error(`Response data: ${JSON.stringify(error.response.data).substring(0, 200)}...`);
    }
    
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
  // Clean up key (remove quotes, whitespace, etc.)
  const cleanKey = key.trim().replace(/^["']|["']$/g, '');
  
  try {
    // List available models
    const response = await axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${cleanKey}`, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status === 200) {
      console.log('Successfully retrieved Gemini models');
      
      // Check for available models and update the PROVIDERS object
      if (response.data && response.data.models) {
        const models = response.data.models;
        console.log(`Found ${models.length} Gemini models`);
        
        // Look for specific models
        const gemini25Models = models.filter(m => m.name.includes('gemini-2.5'));
        const geminiProModels = models.filter(m => m.name.includes('gemini-pro'));
        
        // Update available models
        if (gemini25Models.length > 0) {
          // Find 2.5 Pro model if available
          const gemini25Pro = gemini25Models.find(m => m.name.includes('pro'));
          if (gemini25Pro) {
            console.log(`Found Gemini 2.5 Pro model: ${gemini25Pro.name}`);
            PROVIDERS.gemini.models.premium = gemini25Pro.name.split('/').pop();
          }
        }
        
        if (geminiProModels.length > 0) {
          console.log(`Found Gemini Pro model: ${geminiProModels[0].name}`);
          PROVIDERS.gemini.models.standard = geminiProModels[0].name.split('/').pop();
        }
      }
      
      return { valid: true, message: 'Valid' };
    }
    
    return { valid: false, message: 'Failed to list models' };
  } catch (error) {
    console.error('Gemini API validation error:', error.message);
    if (error.response) {
      console.error(`Response status: ${error.response.status}`);
      console.error(`Response data: ${JSON.stringify(error.response.data).substring(0, 200)}...`);
    }
    
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
  // Clean up key (remove quotes, whitespace, etc.)
  const cleanKey = key.trim().replace(/^["']|["']$/g, '');
  
  try {
    // First try to list models
    try {
      const modelsResponse = await axios.get('https://api.deepseek.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${cleanKey}`
        }
      });
      
      if (modelsResponse.status === 200) {
        return { valid: true, message: 'Valid' };
      }
    } catch (modelsError) {
      console.log('Could not list DeepSeek models. Trying a simple completion instead...');
    }
    
    // If listing models fails, try a simple completion
    const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
      model: 'deepseek-coder-1.5-instruct',
      messages: [
        { role: 'user', content: 'Hello' }
      ],
      max_tokens: 10
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cleanKey}`
      }
    });
    
    return { valid: response.status === 200, message: 'Valid' };
  } catch (error) {
    console.error('DeepSeek API validation error:', error.message);
    if (error.response) {
      console.error(`Response status: ${error.response.status}`);
      console.error(`Response data: ${JSON.stringify(error.response.data).substring(0, 200)}...`);
    }
    
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
  // Clean up key (remove quotes, whitespace, etc.)
  const cleanKey = key.trim().replace(/^["']|["']$/g, '');
  
  try {
    const modelsResponse = await axios.get('https://openrouter.ai/api/v1/models', {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cleanKey}`,
        'HTTP-Referer': 'https://codequal.io', // Required by OpenRouter
        'X-Title': 'CodeQual API Validation'
      }
    });
    
    if (modelsResponse.status === 200) {
      console.log('Successfully retrieved OpenRouter models');
      const models = modelsResponse.data.data || [];
      
      // Update available models
      if (models.length > 0) {
        console.log(`Found ${models.length} models from OpenRouter`);
        
        // Get models by different providers
        const anthropicModels = models.filter(m => m.id.toLowerCase().includes('anthropic') || m.id.toLowerCase().includes('claude'));
        const openAIModels = models.filter(m => m.id.toLowerCase().includes('openai') || m.id.toLowerCase().includes('gpt'));
        
        // Get premium and standard models
        const premiumModels = models.filter(m => m.pricing === 'paid');
        const standardModels = models.filter(m => m.pricing !== 'paid');
        
        // Prioritize newer Claude or GPT models if available
        if (anthropicModels.length > 0) {
          const claudeModel = anthropicModels.find(m => m.id.includes('claude-3')) || anthropicModels[0];
          PROVIDERS.openrouter.models.premium = claudeModel.id;
          console.log(`Selected Claude model from OpenRouter: ${claudeModel.id}`);
        } else if (openAIModels.length > 0) {
          const gptModel = openAIModels.find(m => m.id.includes('gpt-4')) || openAIModels[0];
          PROVIDERS.openrouter.models.premium = gptModel.id;
          console.log(`Selected GPT model from OpenRouter: ${gptModel.id}`);
        } else if (premiumModels.length > 0) {
          PROVIDERS.openrouter.models.premium = premiumModels[0].id;
          console.log(`Selected premium model from OpenRouter: ${premiumModels[0].id}`);
        }
        
        // Set up a standard model
        if (standardModels.length > 0) {
          PROVIDERS.openrouter.models.standard = standardModels[0].id;
          console.log(`Selected standard model from OpenRouter: ${standardModels[0].id}`);
        } else if (models.length > 0) {
          // If no standard models, use the first available
          PROVIDERS.openrouter.models.standard = models[0].id;
          console.log(`No standard models found, using ${models[0].id}`);
        }
      }
      
      return { valid: true, message: 'Valid' };
    }
    
    return { valid: false, message: 'Failed to list models' };
  } catch (error) {
    console.error('OpenRouter API validation error:', error.message);
    if (error.response) {
      console.error(`Response status: ${error.response.status}`);
      console.error(`Response data: ${JSON.stringify(error.response.data).substring(0, 200)}...`);
    }
    
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
 * Get repository information
 */
async function getRepositoryInfo(repo) {
  try {
    let response;
    
    // Try authenticated request if GitHub token is available
    if (API_KEYS.github) {
      try {
        response = await axios.get(`https://api.github.com/repos/${repo}`, {
          headers: {
            'Authorization': `token ${API_KEYS.github.trim()}`
          }
        });
      } catch (error) {
        console.log(`GitHub authenticated request failed for ${repo}, trying unauthenticated...`);
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
          { 'Authorization': `token ${API_KEYS.github.trim()}` } : 
          {}
      });
      
      // Decode base64 content
      readmeContent = Buffer.from(readmeResponse.data.content, 'base64').toString('utf-8');
      
      // Limit size to avoid token issues
      if (readmeContent.length > 5000) {
        readmeContent = readmeContent.substring(0, 5000) + '... [content truncated]';
      }
    } catch (readmeError) {
      console.log(`Could not fetch README for ${repo}: ${readmeError.message}`);
    }
    
    return {
      name: response.data.full_name,
      description: response.data.description || 'No description available',
      language: response.data.language,
      stars: response.data.stargazers_count,
      forks: response.data.forks_count,
      issues: response.data.open_issues_count,
      created: response.data.created_at,
      updated: response.data.updated_at,
      url: response.data.html_url,
      readme: readmeContent
    };
  } catch (error) {
    console.error(`Error fetching repository information for ${repo}: ${error.message}`);
    throw error;
  }
}

/**
 * Create prompt for a specific category
 */
function createPrompt(repo, repoInfo, promptCategory) {
  const promptText = PROMPT_CATEGORIES[promptCategory];
  
  return `
You are analyzing a GitHub repository.

Repository Information:
- Name: ${repoInfo.name}
- Description: ${repoInfo.description}
- Primary Language: ${repoInfo.language}
- Stars: ${repoInfo.stars}
- Forks: ${repoInfo.forks}
- Open Issues: ${repoInfo.issues}
- Created: ${repoInfo.created}
- Last Updated: ${repoInfo.updated}
- URL: ${repoInfo.url}

README Content:
${repoInfo.readme}

Specific Question:
${promptText}

Provide a detailed technical analysis based on the information above. Focus on specific technical details rather than general observations.
`.trim();
}

/**
 * Call Anthropic API
 */
async function callAnthropicAPI(model, prompt) {
  const startTime = Date.now();
  
  // Clean up key (remove quotes, whitespace, etc.)
  const cleanKey = API_KEYS.anthropic.trim().replace(/^["']|["']$/g, '');
  
  try {
    console.log(`Calling Anthropic API with model: ${model}`);
    
    // Prepare the request payload
    const payload = {
      model,
      max_tokens: 1500,
      system: 'You are a technical repository analyzer with expertise in software architecture and code quality.',
      messages: [
        { role: 'user', content: prompt }
      ]
    };
    
    console.log(`API request to Anthropic with model: ${model}`);
    
    const response = await axios.post('https://api.anthropic.com/v1/messages', payload, {
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': cleanKey
      }
    });
    
    const endTime = Date.now();
    const responseTime = (endTime - startTime) / 1000; // in seconds
    
    // Get response content
    const content = response.data.content && response.data.content[0] ? response.data.content[0].text : '';
    
    if (!content) {
      console.warn('Warning: Empty response content from Anthropic API');
    }
    
    return {
      success: true,
      content,
      contentSize: Buffer.from(content).length,
      responseTime,
      provider: 'anthropic',
      model
    };
  } catch (error) {
    console.error(`Anthropic API error: ${error.message}`);
    if (error.response) {
      console.error(`Response status: ${error.response.status}`);
      console.error(`Response data: ${JSON.stringify(error.response.data).substring(0, 200)}...`);
    } else if (error.request) {
      console.error(`No response received. Request details: ${error.request.method} ${error.request.path}`);
    }
    
    return {
      success: false,
      error: error.response ? 
        `${error.response.status}: ${JSON.stringify(error.response.data)}` : 
        error.message,
      provider: 'anthropic',
      model
    };
  }
}

/**
 * Call OpenAI API
 */
async function callOpenAIAPI(model, prompt) {
  const startTime = Date.now();
  
  // Clean up key (remove quotes, whitespace, etc.)
  const cleanKey = API_KEYS.openai.trim().replace(/^["']|["']$/g, '');
  
  try {
    console.log(`Calling OpenAI API with model: ${model}`);
    
    // Prepare request payload
    const payload = {
      model,
      messages: [
        { role: 'system', content: 'You are a technical repository analyzer with expertise in software architecture and code quality.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 1500
    };
    
    // Add appropriate parameters based on model
    if (model.includes('gpt-4o')) {
      // GPT-4o specific settings
      payload.response_format = { type: 'text' };
    }
    
    console.log(`API request to OpenAI with model: ${model}`);
    
    const response = await axios.post('https://api.openai.com/v1/chat/completions', payload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cleanKey}`
      }
    });
    
    const endTime = Date.now();
    const responseTime = (endTime - startTime) / 1000; // in seconds
    
    // Get response content
    let content = '';
    if (response.data.choices && response.data.choices[0] && response.data.choices[0].message) {
      content = response.data.choices[0].message.content;
    }
    
    if (!content) {
      console.warn('Warning: Empty response content from OpenAI API');
    }
    
    return {
      success: true,
      content,
      contentSize: Buffer.from(content).length,
      responseTime,
      provider: 'openai',
      model
    };
  } catch (error) {
    console.error(`OpenAI API error: ${error.message}`);
    if (error.response) {
      console.error(`Response status: ${error.response.status}`);
      console.error(`Response data: ${JSON.stringify(error.response.data).substring(0, 200)}...`);
    } else if (error.request) {
      console.error(`No response received. Request details: ${error.request.method} ${error.request.path}`);
    }
    
    return {
      success: false,
      error: error.response ? 
        `${error.response.status}: ${JSON.stringify(error.response.data)}` : 
        error.message,
      provider: 'openai',
      model
    };
  }
}

/**
 * Call Gemini API
 */
async function callGeminiAPI(model, prompt) {
  const startTime = Date.now();
  
  // Clean up key (remove quotes, whitespace, etc.)
  const cleanKey = API_KEYS.gemini.trim().replace(/^["']|["']$/g, '');
  
  try {
    console.log(`Calling Gemini API with model: ${model}`);
    
    // Use the appropriate endpoint and format based on model
    let endpoint, payload;
    
    if (model.includes('gemini-2.5')) {
      // Handle newer Gemini models with different endpoint
      console.log('Using newer Gemini API format with model: ' + model);
      // Note: Update endpoint once Gemini 2.5 becomes generally available
      endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cleanKey}`;
      
      payload = {
        contents: [{
          role: 'user',
          parts: [{ text: prompt }]
        }],
        systemInstruction: {
          parts: [{ text: 'You are a technical repository analyzer with expertise in software architecture and code quality.' }]
        },
        generationConfig: {
          maxOutputTokens: 1500,
          temperature: 0.7
        }
      };
    } else {
      // Handle older Gemini models
      endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cleanKey}`;
      
      payload = {
        contents: [{
          parts: [{ text: 'You are a technical repository analyzer with expertise in software architecture and code quality.' }]
        }, {
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          maxOutputTokens: 1500,
          temperature: 0.7
        }
      };
    }
    
    console.log(`API request to Gemini with model: ${model}`);
    
    const response = await axios.post(endpoint, payload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const endTime = Date.now();
    const responseTime = (endTime - startTime) / 1000; // in seconds
    
    // Get response content
    let content = '';
    if (response.data.candidates && response.data.candidates[0]) {
      if (response.data.candidates[0].content && response.data.candidates[0].content.parts) {
        content = response.data.candidates[0].content.parts[0].text;
      } else if (response.data.candidates[0].text) {
        content = response.data.candidates[0].text;
      }
    }
    
    if (!content) {
      console.warn('Warning: Empty response content from Gemini API');
      console.log('Response data:', JSON.stringify(response.data).substring(0, 300));
    }
    
    return {
      success: true,
      content,
      contentSize: Buffer.from(content).length,
      responseTime,
      provider: 'gemini',
      model
    };
  } catch (error) {
    console.error(`Gemini API error: ${error.message}`);
    if (error.response) {
      console.error(`Response status: ${error.response.status}`);
      console.error(`Response data: ${JSON.stringify(error.response.data).substring(0, 200)}...`);
    } else if (error.request) {
      console.error(`No response received. Request details: ${error.request.method} ${error.request.path}`);
    }
    
    return {
      success: false,
      error: error.response ? 
        `${error.response.status}: ${JSON.stringify(error.response.data)}` : 
        error.message,
      provider: 'gemini',
      model
    };
  }
}

/**
 * Call DeepSeek API
 */
async function callDeepSeekAPI(model, prompt) {
  const startTime = Date.now();
  
  // Clean up key (remove quotes, whitespace, etc.)
  const cleanKey = API_KEYS.deepseek.trim().replace(/^["']|["']$/g, '');
  
  try {
    console.log(`Calling DeepSeek API with model: ${model}`);
    
    // Determine the full model ID if needed
    let fullModel = model;
    if (model === 'deepseek-coder') {
      fullModel = 'deepseek-coder-1.5-instruct';
    } else if (model === 'deepseek-coder-plus') {
      fullModel = 'deepseek-coder-1.5-plus-instruct';
    } else if (model === 'deepseek-coder-lite') {
      fullModel = 'deepseek-coder-1.5-lite-instruct';
    }
    
    console.log(`Using DeepSeek model: ${fullModel}`);
    
    const payload = {
      model: fullModel,
      messages: [
        { role: 'system', content: 'You are a technical repository analyzer with expertise in software architecture and code quality.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 1500
    };
    
    const response = await axios.post('https://api.deepseek.com/v1/chat/completions', payload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cleanKey}`
      }
    });
    
    const endTime = Date.now();
    const responseTime = (endTime - startTime) / 1000; // in seconds
    
    // Get response content
    let content = '';
    if (response.data.choices && response.data.choices[0] && response.data.choices[0].message) {
      content = response.data.choices[0].message.content;
    }
    
    if (!content) {
      console.warn('Warning: Empty response content from DeepSeek API');
      console.log('Response data:', JSON.stringify(response.data).substring(0, 300));
    }
    
    return {
      success: true,
      content,
      contentSize: Buffer.from(content).length,
      responseTime,
      provider: 'deepseek',
      model: fullModel
    };
  } catch (error) {
    console.error(`DeepSeek API error: ${error.message}`);
    if (error.response) {
      console.error(`Response status: ${error.response.status}`);
      console.error(`Response data: ${JSON.stringify(error.response.data).substring(0, 200)}...`);
    } else if (error.request) {
      console.error(`No response received. Request details: ${error.request.method} ${error.request.path}`);
    }
    
    return {
      success: false,
      error: error.response ? 
        `${error.response.status}: ${JSON.stringify(error.response.data)}` : 
        error.message,
      provider: 'deepseek',
      model
    };
  }
}

/**
 * Call OpenRouter API
 */
async function callOpenRouterAPI(model, prompt) {
  const startTime = Date.now();
  
  // Clean up key (remove quotes, whitespace, etc.)
  const cleanKey = API_KEYS.openrouter.trim().replace(/^["']|["']$/g, '');
  
  try {
    console.log(`Calling OpenRouter API with model: ${model}`);
    
    // Check if the model has a slash - if not, we're using a model ID without provider
    const modelWithProvider = model.includes('/') ? model : `openai/${model}`;
    console.log(`Using OpenRouter model: ${modelWithProvider}`);
    
    const payload = {
      model: modelWithProvider,
      messages: [
        { role: 'system', content: 'You are a technical repository analyzer with expertise in software architecture and code quality.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 1500
    };
    
    // If using Claude model, handle special Claude parameters
    if (modelWithProvider.toLowerCase().includes('claude')) {
      console.log('Using Claude model via OpenRouter, adjusting parameters');
    }
    
    const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', payload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cleanKey}`,
        'HTTP-Referer': 'https://codequal.io', // Required by OpenRouter
        'X-Title': 'CodeQual Repository Analysis'
      }
    });
    
    const endTime = Date.now();
    const responseTime = (endTime - startTime) / 1000; // in seconds
    
    // Get response content
    let content = '';
    if (response.data.choices && response.data.choices[0]) {
      if (response.data.choices[0].message && response.data.choices[0].message.content) {
        content = response.data.choices[0].message.content;
      }
    }
    
    if (!content) {
      console.warn('Warning: Empty response content from OpenRouter API');
      console.log('Response data:', JSON.stringify(response.data).substring(0, 300));
    }
    
    return {
      success: true,
      content,
      contentSize: Buffer.from(content).length,
      responseTime,
      provider: 'openrouter',
      model: modelWithProvider
    };
  } catch (error) {
    console.error(`OpenRouter API error: ${error.message}`);
    if (error.response) {
      console.error(`Response status: ${error.response.status}`);
      console.error(`Response data: ${JSON.stringify(error.response.data).substring(0, 200)}...`);
    } else if (error.request) {
      console.error(`No response received. Request details: ${error.request.method} ${error.request.path}`);
    }
    
    return {
      success: false,
      error: error.response ? 
        `${error.response.status}: ${JSON.stringify(error.response.data)}` : 
        error.message,
      provider: 'openrouter',
      model
    };
  }
}

/**
 * Get valid API keys with validation
 */
async function getValidApiKeys(interactive) {
  console.log('Checking API keys...');
  
  const validProviders = {};
  
  for (const [provider, config] of Object.entries(PROVIDERS)) {
    const apiKey = API_KEYS[provider];
    
    if (apiKey) {
      console.log(`Found ${config.name} API key in environment.`);
      
      try {
        console.log(`Validating ${config.name} API key...`);
        const validationResult = await config.validateKey(apiKey);
        
        if (validationResult.valid) {
          console.log(`✅ ${config.name} API key is valid`);
          validProviders[provider] = true;
        } else {
          console.log(`❌ ${config.name} API key validation failed: ${validationResult.message}`);
          
          if (interactive) {
            const newKey = await question(`Enter valid ${config.name} API key (or press Enter to skip): `);
            
            if (newKey) {
              const newValidation = await config.validateKey(newKey);
              
              if (newValidation.valid) {
                console.log(`✅ New ${config.name} API key is valid`);
                API_KEYS[provider] = newKey;
                validProviders[provider] = true;
              } else {
                console.log(`❌ New ${config.name} API key validation failed: ${newValidation.message}`);
                validProviders[provider] = false;
              }
            } else {
              validProviders[provider] = false;
            }
          } else {
            validProviders[provider] = false;
          }
        }
      } catch (error) {
        console.error(`Error validating ${config.name} API key: ${error.message}`);
        validProviders[provider] = false;
      }
    } else {
      console.log(`${config.name} API key not found in environment.`);
      
      if (interactive) {
        const newKey = await question(`Enter ${config.name} API key (or press Enter to skip): `);
        
        if (newKey) {
          try {
            const validationResult = await config.validateKey(newKey);
            
            if (validationResult.valid) {
              console.log(`✅ ${config.name} API key is valid`);
              API_KEYS[provider] = newKey;
              validProviders[provider] = true;
            } else {
              console.log(`❌ ${config.name} API key validation failed: ${validationResult.message}`);
              validProviders[provider] = false;
            }
          } catch (error) {
            console.error(`Error validating ${config.name} API key: ${error.message}`);
            validProviders[provider] = false;
          }
        } else {
          validProviders[provider] = false;
        }
      } else {
        validProviders[provider] = false;
      }
    }
  }
  
  // Also validate GitHub token
  if (API_KEYS.github) {
    console.log('Found GitHub token in environment.');
    
    try {
      console.log('Validating GitHub token...');
      const validationResult = await validateGitHubToken(API_KEYS.github);
      
      if (validationResult.valid) {
        console.log('✅ GitHub token is valid');
      } else {
        console.log(`❌ GitHub token validation failed: ${validationResult.message}`);
        console.log('Proceeding without GitHub token. Public repositories will still work.');
      }
    } catch (error) {
      console.error(`Error validating GitHub token: ${error.message}`);
      console.log('Proceeding without GitHub token. Public repositories will still work.');
    }
  } else {
    console.log('GitHub token not found in environment.');
    
    if (interactive) {
      const newToken = await question('Enter GitHub token (or press Enter to skip): ');
      
      if (newToken) {
        try {
          const validationResult = await validateGitHubToken(newToken);
          
          if (validationResult.valid) {
            console.log('✅ GitHub token is valid');
            API_KEYS.github = newToken;
          } else {
            console.log(`❌ GitHub token validation failed: ${validationResult.message}`);
            console.log('Proceeding without GitHub token. Public repositories will still work.');
          }
        } catch (error) {
          console.error(`Error validating GitHub token: ${error.message}`);
          console.log('Proceeding without GitHub token. Public repositories will still work.');
        }
      } else {
        console.log('Proceeding without GitHub token. Public repositories will still work.');
      }
    } else {
      console.log('Proceeding without GitHub token. Public repositories will still work.');
    }
  }
  
  return validProviders;
}

/**
 * Load existing results if available
 */
function loadExistingResults() {
  if (fs.existsSync(TARGETED_RESULTS_PATH)) {
    try {
      const data = fs.readFileSync(TARGETED_RESULTS_PATH, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error(`Error loading existing results: ${error.message}`);
      return {};
    }
  } else {
    return {};
  }
}

/**
 * Save results to file
 */
function saveResults(results) {
  fs.writeFileSync(TARGETED_RESULTS_PATH, JSON.stringify(results, null, 2));
  console.log(`Results saved to ${TARGETED_RESULTS_PATH}`);
}

/**
 * Calculate a quality score for a model response
 */
function calculateQualityScore(content, promptCategory, repo) {
  // If content is empty or not provided, return a low score
  if (!content || content.trim() === '') {
    return 2; // Very low score on a scale of 0-10
  }
  
  // Create a base automated score based on content length and structure
  const contentLength = content.length;
  const hasSections = content.match(/\n#{1,3} [^\n]+\n/g)?.length > 2;
  const hasCodeExamples = content.match(/```[\s\S]+?```/g)?.length > 0;
  const hasFileReferences = content.match(/[\w\/\-\.]+\.(js|ts|py|java|rb|go|rs|php|cs|cpp|h|jsx|tsx)/g)?.length > 0;
  
  // These are proxies for quality that can be automatically measured
  let automatedScore = {
    relevance: 3, // Default to average
    accuracy: 3,  // Default to average
    depth: contentLength > 3000 ? 4 : (contentLength > 1500 ? 3 : 2),
    structure: hasSections ? 4 : (content.includes('\n\n') ? 3 : 2)
  };
  
  // Adjust scores based on content features
  if (hasCodeExamples) automatedScore.depth += 0.5;
  if (hasFileReferences) automatedScore.accuracy += 0.5;
  
  // If we have reference data for this repo and prompt category, use it to adjust scores
  if (QUALITY_REFERENCE_DATA[repo] && QUALITY_REFERENCE_DATA[repo][promptCategory]) {
    const reference = QUALITY_REFERENCE_DATA[repo][promptCategory];
    
    // Check for keyword presence as a proxy for accuracy
    if (reference.keywords && Array.isArray(reference.keywords)) {
      const keywordMatches = reference.keywords.filter(kw => 
        content.toLowerCase().includes(kw.toLowerCase())
      ).length;
      
      // Adjust accuracy score based on % of keywords present
      const keywordMatchRatio = keywordMatches / reference.keywords.length;
      if (keywordMatchRatio > 0.8) automatedScore.accuracy = 5;
      else if (keywordMatchRatio > 0.6) automatedScore.accuracy = 4;
      else if (keywordMatchRatio > 0.4) automatedScore.accuracy = 3;
      else if (keywordMatchRatio > 0.2) automatedScore.accuracy = 2;
      else automatedScore.accuracy = 1;
    }
  }
  
  // Special handling for benchmark categories
  if (promptCategory.startsWith('benchmark')) {
    // For benchmarks, we're primarily concerned with accuracy
    // This would ideally be compared against known correct answers
    automatedScore.accuracy = hasFileReferences ? 4 : 3;
  }
  
  // Category-specific adjustments
  switch (promptCategory) {
    case 'architecture':
      // Architecture analysis should identify components and structure
      automatedScore.depth += content.includes('component') ? 0.5 : 0;
      automatedScore.structure += hasSections ? 0.5 : 0;
      break;
    case 'patterns':
      // Pattern analysis should identify specific design patterns
      const patternWords = ['pattern', 'singleton', 'factory', 'observer', 'decorator'];
      const patternCount = patternWords.filter(p => content.toLowerCase().includes(p)).length;
      automatedScore.accuracy += patternCount > 2 ? 0.5 : 0;
      break;
    case 'security':
      // Security analysis should identify vulnerabilities
      const securityWords = ['vulnerability', 'exploit', 'attack', 'secure', 'risk'];
      const securityCount = securityWords.filter(s => content.toLowerCase().includes(s)).length;
      automatedScore.relevance += securityCount > 2 ? 0.5 : 0;
      break;
    case 'dependencies':
      // Dependencies analysis should list dependencies
      automatedScore.accuracy += content.match(/["\'][\w\-@\/]+["\']:\s*["\'][\d\.]+["\']/g) ? 1 : 0;
      break;
  }
  
  // Cap scores at 5
  Object.keys(automatedScore).forEach(key => {
    automatedScore[key] = Math.min(5, automatedScore[key]);
  });
  
  // Calculate weighted score
  const weights = EVALUATION_WEIGHTS.categories[promptCategory] || {
    relevance: EVALUATION_WEIGHTS.relevance,
    accuracy: EVALUATION_WEIGHTS.accuracy,
    depth: EVALUATION_WEIGHTS.depth,
    structure: EVALUATION_WEIGHTS.structure
  };
  
  // Normalize weights to sum to 1
  const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
  const normalizedWeights = {};
  Object.keys(weights).forEach(key => {
    normalizedWeights[key] = weights[key] / totalWeight;
  });
  
  // Calculate weighted score
  let weightedScore = 0;
  Object.keys(automatedScore).forEach(key => {
    if (normalizedWeights[key]) {
      weightedScore += automatedScore[key] * normalizedWeights[key];
    }
  });
  
  // Final score on a scale of 0-10
  return weightedScore * 2;
}

/**
 * Run targeted tests
 */
async function runTargetedTests(validProviders, targetLanguage, targetSize, interactive) {
  // Load existing results
  const results = loadExistingResults();
  
  // Initialize results structure if needed
  if (!results.categories) {
    results.categories = {};
  }
  
  if (!results.recommendations) {
    results.recommendations = {};
  }
  
  // Prepare tests based on target
  const languages = targetLanguage ? [targetLanguage] : LANGUAGE_CATEGORIES;
  const sizes = targetSize ? [targetSize] : SIZE_CATEGORIES;
  
  // Run tests for each category
  for (const language of languages) {
    if (!results.categories[language]) {
      results.categories[language] = {};
    }
    
    if (!results.recommendations[language]) {
      results.recommendations[language] = {};
    }
    
    for (const size of sizes) {
      if (!results.categories[language][size]) {
        results.categories[language][size] = {};
      }
      
      if (!results.recommendations[language][size]) {
        results.recommendations[language][size] = {
          provider: null,
          model: null,
          performanceScore: 0,
          successRate: 0,
          testCount: 0,
          lastTested: null
        };
      }
      
      console.log(`\nTesting ${language} repositories of size ${size}...`);
      
      // Get repositories for this category
      const repos = REPOSITORIES[language] && REPOSITORIES[language][size];
      
      if (!repos || repos.length === 0) {
        console.log(`No repositories defined for ${language}/${size}`);
        continue;
      }
      
      // Take first repository for testing
      const repo = repos[0];
      console.log(`Using repository: ${repo}`);
      
      try {
        // Get repository information
        const repoInfo = await getRepositoryInfo(repo);
        
        // Initialize repository in results if needed
        if (!results.categories[language][size][repo]) {
          results.categories[language][size][repo] = {
            providers: {}
          };
        }
        
        // Define prompt categories to test
        // Start with fundamental categories, then add more specialized ones
        const promptCategories = [
          'architecture',       // Essential for understanding the structure
          'dependencies',       // Understanding dependencies is critical
          'patterns',           // Design patterns help understand the code
          'codeQuality',        // General code quality assessment
          // Add one benchmark category for more objective measurement
          'benchmarkDependency' // Has clearer right/wrong answers for evaluation
        ];
        
        // For interactive mode, allow selection of prompt categories
        let selectedPromptCategories = promptCategories;
        if (interactive) {
          console.log('\nAvailable prompt categories:');
          promptCategories.forEach((cat, index) => {
            console.log(`${index + 1}. ${cat}`);
          });
          
          const catChoice = await question('Select prompt category number (or Enter for all): ');
          
          if (catChoice && !isNaN(parseInt(catChoice)) && 
              parseInt(catChoice) > 0 && parseInt(catChoice) <= promptCategories.length) {
            selectedPromptCategories = [promptCategories[parseInt(catChoice) - 1]];
          } else {
            console.log('Using all prompt categories');
          }
        }
        
        console.log(`Testing with ${selectedPromptCategories.length} prompt categories: ${selectedPromptCategories.join(', ')}`);
        
        // Process each prompt category
        for (const promptCategory of selectedPromptCategories) {
          console.log(`\nTesting with prompt category: ${promptCategory}`);
          const prompt = createPrompt(repo, repoInfo, promptCategory);
          
          for (const [provider, isValid] of Object.entries(validProviders)) {
            if (!isValid) continue;
            
            // Initialize provider in results if needed
            if (!results.categories[language][size][repo].providers[provider]) {
              results.categories[language][size][repo].providers[provider] = {
                models: {}
              };
            }
            
            // Get the provider config
            const providerConfig = PROVIDERS[provider];
            
            // Test with economy model first if available, otherwise standard or premium
            const modelTier = providerConfig.models.economy ? 'economy' : 
                            (providerConfig.models.standard ? 'standard' : 'premium');
            
            const model = providerConfig.models[modelTier];
            
            if (!model) {
              console.log(`No model available for ${provider} (${modelTier})`);
              continue;
            }
            
            // Initialize model in results if needed
            if (!results.categories[language][size][repo].providers[provider].models[model]) {
              results.categories[language][size][repo].providers[provider].models[model] = {
                prompts: {}
              };
            }
            
            // Check if this prompt was already tested
            if (results.categories[language][size][repo].providers[provider].models[model].prompts[promptCategory] &&
                results.categories[language][size][repo].providers[provider].models[model].prompts[promptCategory].success) {
              console.log(`Already tested ${provider}/${model} with ${promptCategory} prompt (success)`);
              continue;
            }
            
            // Ask for confirmation if interactive
            let proceedWithTest = true;
            if (interactive) {
              const confirm = await question(`Test ${provider}/${model} for ${language}/${size}/${repo} with ${promptCategory}? (y/n): `);
              proceedWithTest = confirm.toLowerCase() === 'y' || confirm.toLowerCase() === 'yes';
            }
            
            if (!proceedWithTest) {
              console.log(`Skipping test for ${provider}/${model} with ${promptCategory}`);
              continue;
            }
            
            // Test the model
            console.log(`Testing ${provider}/${model} with ${promptCategory}...`);
            
            try {
              const result = await providerConfig.callApi(model, prompt);
              
              // Calculate quality score for the response if successful
              let qualityScore = null;
              if (result.success && result.content) {
                qualityScore = calculateQualityScore(result.content, promptCategory, repo);
                console.log(`Quality score for ${provider}/${model} on ${promptCategory}: ${qualityScore.toFixed(2)}/10`);
              }
              
              // Store result
              results.categories[language][size][repo].providers[provider].models[model].prompts[promptCategory] = {
                success: result.success,
                ...(result.success ? {
                  responseTime: result.responseTime,
                  contentSize: result.contentSize,
                  qualityScore: qualityScore,
                  promptCategory: promptCategory,
                  timestamp: new Date().toISOString()
                } : {
                  error: result.error,
                  timestamp: new Date().toISOString()
                })
              };
            
              // Save progress
              saveResults(results);
              
              if (result.success) {
                console.log(`✅ Success (${result.responseTime.toFixed(2)}s, ${result.contentSize} bytes)`);
                
                // Update recommendation based on a combined score (quality and performance)
                // This gives weight to both quality and speed
                const currentRecommendation = results.recommendations[language][size];
                
                // Calculate a combined score (70% quality, 30% speed)
                // Higher is better, normalize speed so that faster is better
                const speedScore = 10 * (1 / (1 + result.responseTime)); // Transforms seconds into 0-10 (faster = higher)
                const combinedScore = (qualityScore * 0.7) + (speedScore * 0.3);
                
                // Log the scores for this test
                console.log(`Combined score for ${provider}/${model}: ${combinedScore.toFixed(2)}/10 (quality: ${qualityScore.toFixed(2)}, speed: ${speedScore.toFixed(2)})`);
                
                // If we don't have a recommendation yet or this model has a better combined score
                if (!currentRecommendation.model || 
                    !currentRecommendation.combinedScore ||
                    combinedScore > currentRecommendation.combinedScore) {
                  console.log(`New best model for ${language}/${size}: ${provider}/${model} with combined score ${combinedScore.toFixed(2)}`);
                  
                  results.recommendations[language][size] = {
                    provider,
                    model,
                    performanceScore: result.responseTime,
                    qualityScore: qualityScore,
                    combinedScore: combinedScore,
                    promptCategory: promptCategory,
                    successRate: 1.0,
                    testCount: 1,
                    lastTested: new Date().toISOString()
                  };
                  
                  // Save updated recommendation
                  saveResults(results);
                }
              } else {
                console.log(`❌ Failed: ${result.error}`);
              }
            } catch (error) {
              console.error(`Error testing ${provider}/${model} with ${promptCategory}: ${error.message}`);
              
              // Store error
              results.categories[language][size][repo].providers[provider].models[model].prompts[promptCategory] = {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
              };
              
              // Save progress
              saveResults(results);
            }
          }
        }
      } catch (error) {
        console.error(`Error processing repository ${repo}: ${error.message}`);
      }
    }
  }
  
  return results;
}

/**
 * Generate configuration from results
 */
function generateConfiguration(results) {
  console.log('\nGenerating model configuration...');
  
  // Create configuration object
  const config = {};
  
  // Process recommendations
  for (const [language, sizes] of Object.entries(results.recommendations)) {
    if (!config[language]) {
      config[language] = {};
    }
    
    for (const [size, recommendation] of Object.entries(sizes)) {
      if (recommendation.provider && recommendation.model) {
        config[language][size] = {
          provider: recommendation.provider,
          model: recommendation.model,
          testResults: {
            status: 'tested',
            successRate: recommendation.successRate,
            avgResponseTime: recommendation.performanceScore,
            qualityScore: recommendation.qualityScore || 0,
            combinedScore: recommendation.combinedScore || 0,
            testCount: recommendation.testCount,
            lastTested: recommendation.lastTested
          },
          notes: `Selected based on targeted testing (${recommendation.provider}/${recommendation.model}) with combined score ${(recommendation.combinedScore || 0).toFixed(2)}/10`
        };
      }
    }
  }
  
  // Fill in missing languages and sizes with defaults
  const defaultProvider = 'anthropic';
  const defaultModel = 'claude-3-haiku-20240307';
  
  for (const language of LANGUAGE_CATEGORIES) {
    if (!config[language]) {
      config[language] = {};
    }
    
    for (const size of SIZE_CATEGORIES) {
      if (!config[language][size]) {
        config[language][size] = {
          provider: defaultProvider,
          model: defaultModel,
          testResults: {
            status: 'estimated',
            successRate: 0,
            avgResponseTime: 0,
            testCount: 0,
            lastTested: new Date().toISOString()
          },
          notes: 'Default model (no targeted tests completed)'
        };
      }
    }
  }
  
  // Generate configuration file
  const configContent = `/**
 * Auto-generated Repository Model Configuration
 * Generated on: ${new Date().toISOString()}
 * 
 * This configuration was created via targeted model testing
 * across repository categories.
 */

import { RepositoryModelConfig, RepositorySizeCategory, TestingStatus } from '../repository-model-config';

/**
 * Repository model configurations based on targeted testing
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

/**
 * Main function
 */
async function main() {
  console.log('=== Targeted Calibration ===');
  
  // Parse command line arguments
  const args = getCommandLineArgs();
  
  if (args.generateConfig) {
    // Just generate configuration from existing results
    const results = loadExistingResults();
    generateConfiguration(results);
    return;
  }
  
  // Validate API keys
  const validProviders = await getValidApiKeys(args.interactive);
  
  if (Object.values(validProviders).every(v => !v)) {
    console.error('No valid API keys available. Cannot proceed with testing.');
    return;
  }
  
  // Print valid providers
  console.log('\nValid providers for testing:');
  for (const [provider, isValid] of Object.entries(validProviders)) {
    console.log(`- ${PROVIDERS[provider].name}: ${isValid ? '✅ Available' : '❌ Not available'}`);
  }
  
  let targetLanguage = args.language;
  let targetSize = args.size;
  
  // If in interactive mode and no language/size specified, ask
  if (args.interactive && (!targetLanguage || !targetSize) && !args.allCategories) {
    if (!targetLanguage) {
      console.log('\nAvailable language categories:');
      LANGUAGE_CATEGORIES.forEach((lang, index) => {
        console.log(`${index + 1}. ${lang}`);
      });
      
      const langChoice = await question('Select language category (number or name): ');
      
      if (!isNaN(parseInt(langChoice)) && parseInt(langChoice) > 0 && parseInt(langChoice) <= LANGUAGE_CATEGORIES.length) {
        targetLanguage = LANGUAGE_CATEGORIES[parseInt(langChoice) - 1];
      } else if (LANGUAGE_CATEGORIES.includes(langChoice.toLowerCase())) {
        targetLanguage = langChoice.toLowerCase();
      } else {
        console.log('Invalid selection, using all languages');
        targetLanguage = null;
      }
    }
    
    if (!targetSize) {
      console.log('\nAvailable size categories:');
      SIZE_CATEGORIES.forEach((size, index) => {
        console.log(`${index + 1}. ${size}`);
      });
      
      const sizeChoice = await question('Select size category (number or name): ');
      
      if (!isNaN(parseInt(sizeChoice)) && parseInt(sizeChoice) > 0 && parseInt(sizeChoice) <= SIZE_CATEGORIES.length) {
        targetSize = SIZE_CATEGORIES[parseInt(sizeChoice) - 1];
      } else if (SIZE_CATEGORIES.includes(sizeChoice.toLowerCase())) {
        targetSize = sizeChoice.toLowerCase();
      } else {
        console.log('Invalid selection, using all sizes');
        targetSize = null;
      }
    }
  }
  
  if (targetLanguage) {
    console.log(`Target language: ${targetLanguage}`);
  } else {
    console.log('Testing all language categories');
  }
  
  if (targetSize) {
    console.log(`Target size: ${targetSize}`);
  } else {
    console.log('Testing all size categories');
  }
  
  // Run targeted tests
  const results = await runTargetedTests(validProviders, targetLanguage, targetSize, args.interactive);
  
  // Generate configuration
  generateConfiguration(results);
  
  console.log('\nTargeted calibration complete!');
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('Calibration failed:', error);
    process.exit(1);
  });
}

module.exports = {
  runTargetedTests,
  generateConfiguration
};