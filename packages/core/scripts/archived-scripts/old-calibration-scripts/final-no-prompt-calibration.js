#!/usr/bin/env node
/**
 * Final No-Prompt Batch Calibration Script for CodeQual
 * 
 * This script runs calibration across all models and categories
 * without requiring individual confirmations for each test.
 * It uses hardcoded values for the Anthropic API key.
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const dotenv = require('dotenv');
const readline = require('readline');

// Parse command-line arguments
const args = process.argv.slice(2);
const generateConfigOnly = args.includes('--generate-config');
const languageArg = args.find(arg => arg.startsWith('--language='));
const sizeArg = args.find(arg => arg.startsWith('--size='));

// Extract language and size if provided
const language = languageArg ? languageArg.split('=')[1] : null;
const size = sizeArg ? sizeArg.split('=')[1] : null;

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Configuration
const OUTPUT_DIR = path.join(__dirname, 'calibration-results');
const RESULTS_FILE = path.join(OUTPUT_DIR, 'final-calibration-results.json');
const CONFIG_OUTPUT_PATH = path.join(OUTPUT_DIR, 'repository-model-config.ts');

// Create output directory if it doesn't exist
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Load environment variables
dotenv.config();

// API Keys with hardcoded Anthropic key
const API_KEYS = {
  anthropic: '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',
  openai: process.env.OPENAI_API_KEY,
  github: process.env.GITHUB_TOKEN
};

// Test repositories
const TEST_REPOSITORIES = {
  javascript: {
    small: ['jashkenas/underscore'],
    medium: ['expressjs/express'],
    large: ['facebook/react']
  },
  typescript: {
    small: ['type-challenges/type-challenges'],
    medium: ['nestjs/nest'],
    large: ['microsoft/TypeScript']
  },
  python: {
    small: ['pallets/click'],
    medium: ['pallets/flask'],
    large: ['django/django']
  }
};

// Models to test
const MODELS = [
  { provider: 'anthropic', model: 'claude-3-haiku-20240307' },
  { provider: 'anthropic', model: 'claude-3-sonnet-20240229' },
  { provider: 'openai', model: 'gpt-3.5-turbo' },
  { provider: 'openai', model: 'gpt-4o' }
];

// Prompt categories
const PROMPT_CATEGORIES = [
  'architecture',
  'dependencies',
  'patterns',
  'codeQuality'
];

/**
 * Validate API key without asking for new one
 */
async function validateApiKey(provider) {
  console.log(`Validating ${provider} API key...`);
  try {
    if (provider === 'anthropic') {
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
          'x-api-key': API_KEYS.anthropic
        }
      });
      
      console.log(`✅ ${provider} API key is valid`);
      return true;
    } else if (provider === 'openai') {
      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'user', content: 'Hello' }
        ],
        max_tokens: 10
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEYS.openai}`
        }
      });
      
      console.log(`✅ ${provider} API key is valid`);
      return true;
    }
  } catch (error) {
    console.error(`❌ ${provider} API key is invalid:`, error.message);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Data:`, JSON.stringify(error.response.data).substring(0, 100));
    }
    return false;
  }
}

/**
 * Get repository context from GitHub
 */
async function getRepositoryContext(repo) {
  try {
    // Try to get repository info
    let response;
    
    try {
      // Try with GitHub token if available
      if (API_KEYS.github) {
        response = await axios.get(`https://api.github.com/repos/${repo}`, {
          headers: { Authorization: `token ${API_KEYS.github}` }
        });
      } else {
        // Unauthenticated request
        response = await axios.get(`https://api.github.com/repos/${repo}`);
      }
    } catch (error) {
      console.log(`GitHub API error: ${error.message}`);
      
      // Return minimal context
      return {
        name: repo,
        description: 'Repository information unavailable',
        language: repo.split('/')[0],
        stars: 0
      };
    }
    
    // Basic repository information
    const repoInfo = {
      name: response.data.full_name,
      description: response.data.description || 'No description',
      language: response.data.language,
      stars: response.data.stargazers_count,
      forks: response.data.forks_count,
      issues: response.data.open_issues_count,
      created: response.data.created_at,
      updated: response.data.updated_at,
      size: response.data.size
    };
    
    // Try to get README
    try {
      let readmeResponse;
      
      if (API_KEYS.github) {
        readmeResponse = await axios.get(`https://api.github.com/repos/${repo}/readme`, {
          headers: { Authorization: `token ${API_KEYS.github}` }
        });
      } else {
        readmeResponse = await axios.get(`https://api.github.com/repos/${repo}/readme`);
      }
      
      const readmeContent = Buffer.from(readmeResponse.data.content, 'base64').toString('utf-8');
      repoInfo.readme = readmeContent.substring(0, 2000); // Limit size
    } catch (error) {
      console.log(`README not available: ${error.message}`);
      repoInfo.readme = 'README not available';
    }
    
    return repoInfo;
  } catch (error) {
    console.error(`Error getting repository context: ${error.message}`);
    return {
      name: repo,
      description: 'Error fetching repository data',
      language: repo.split('/')[0]
    };
  }
}

/**
 * Create prompts for a specific category
 */
function createPrompts(category, repoInfo) {
  const systemPrompt = `You are a repository analyzer specialized in ${category} analysis.
You provide detailed, technical, and accurate information about the repository's ${category}.`;
  
  let userPrompt;
  
  switch (category) {
    case 'architecture':
      userPrompt = `
Repository Information:
Name: ${repoInfo.name}
Description: ${repoInfo.description}
Language: ${repoInfo.language}
Stars: ${repoInfo.stars}
Forks: ${repoInfo.forks || 0}
Issues: ${repoInfo.issues || 0}
Size: ${repoInfo.size || 0} KB

README:
${repoInfo.readme || 'Not available'}

Please analyze the architecture of this repository. Focus on:
1. The overall system design and architectural patterns
2. Main components and their responsibilities
3. How components interact and communicate
4. Design principles and architectural decisions
5. Structure of the codebase

Provide a comprehensive architectural analysis with specific details about the repository.
`;
      break;
    
    case 'dependencies':
      userPrompt = `
Repository Information:
Name: ${repoInfo.name}
Description: ${repoInfo.description}
Language: ${repoInfo.language}
Stars: ${repoInfo.stars}

README:
${repoInfo.readme || 'Not available'}

Please analyze the dependencies of this repository. Focus on:
1. Key external dependencies and their versions
2. How dependencies are managed and organized
3. The dependency tree and relationships
4. Potential dependency issues or vulnerabilities
5. Best practices for managing dependencies in this type of project
`;
      break;
    
    case 'patterns':
      userPrompt = `
Repository Information:
Name: ${repoInfo.name}
Description: ${repoInfo.description}
Language: ${repoInfo.language}
Stars: ${repoInfo.stars}

README:
${repoInfo.readme || 'Not available'}

Please analyze the design patterns and coding patterns used in this repository. Focus on:
1. Common design patterns implemented
2. Language-specific patterns and idioms
3. Architectural patterns
4. Consistency of pattern usage throughout the codebase
5. How patterns contribute to the overall code quality and maintainability
`;
      break;
    
    case 'codeQuality':
      userPrompt = `
Repository Information:
Name: ${repoInfo.name}
Description: ${repoInfo.description}
Language: ${repoInfo.language}
Stars: ${repoInfo.stars}

README:
${repoInfo.readme || 'Not available'}

Please analyze the code quality of this repository. Focus on:
1. Coding standards and style consistency
2. Code organization and structure
3. Error handling and robustness
4. Testing coverage and quality
5. Documentation quality
6. Performance considerations
7. Security practices
`;
      break;
    
    default:
      userPrompt = `
Repository Information:
Name: ${repoInfo.name}
Description: ${repoInfo.description}
Language: ${repoInfo.language}
Stars: ${repoInfo.stars}

README:
${repoInfo.readme || 'Not available'}

Please analyze this repository focusing on ${category}.
`;
  }
  
  return { systemPrompt, userPrompt };
}

/**
 * Call model API
 */
async function callModelApi(provider, model, systemPrompt, userPrompt) {
  const startTime = Date.now();
  
  try {
    let content = '';
    
    if (provider === 'anthropic') {
      // Call Anthropic API - combine system and user prompt since system role is not supported
      const combinedPrompt = `${systemPrompt}\n\n${userPrompt}`;
      
      const response = await axios.post('https://api.anthropic.com/v1/messages', {
        model,
        max_tokens: 2000,
        messages: [
          { role: 'user', content: combinedPrompt }
        ]
      }, {
        headers: {
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
          'x-api-key': API_KEYS.anthropic
        }
      });
      
      content = response.data.content[0].text;
    } else if (provider === 'openai') {
      // Call OpenAI API
      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 2000
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEYS.openai}`
        }
      });
      
      content = response.data.choices[0].message.content;
    } else {
      throw new Error(`Provider ${provider} not supported.`);
    }
    
    const endTime = Date.now();
    const responseTime = (endTime - startTime) / 1000; // seconds
    
    return {
      content,
      responseTime,
      contentSize: Buffer.from(content).length
    };
  } catch (error) {
    console.error(`API error (${provider}/${model}):`, error.message);
    
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Data:`, JSON.stringify(error.response.data).substring(0, 100));
    }
    
    throw error;
  }
}

/**
 * Evaluate response quality
 */
function evaluateQuality(content, category) {
  if (!content) return 0;
  
  // Word count (higher is generally better, up to a point)
  const wordCount = content.split(/\s+/).length;
  const wordCountScore = Math.min(5, wordCount / 200);
  
  // Structure (look for headings, lists, sections)
  const hasHeadings = content.includes('#') || content.includes('##');
  const hasLists = content.includes('1.') || content.includes('*') || content.includes('-');
  const structureScore = (hasHeadings ? 2 : 0) + (hasLists ? 1 : 0);
  
  // Relevance to category
  const categoryKeywords = {
    architecture: ['component', 'structure', 'design', 'pattern', 'layer', 'module', 'service', 'architecture'],
    dependencies: ['dependency', 'package', 'library', 'version', 'import', 'require', 'module'],
    patterns: ['pattern', 'singleton', 'factory', 'observer', 'mvc', 'design pattern'],
    codeQuality: ['quality', 'standard', 'lint', 'test', 'coverage', 'clean', 'maintainable', 'readable']
  };
  
  let relevanceScore = 0;
  const keywords = categoryKeywords[category] || [];
  
  for (const keyword of keywords) {
    const regex = new RegExp(keyword, 'gi');
    const matches = content.match(regex) || [];
    relevanceScore += Math.min(0.5, matches.length / 5);
  }
  
  relevanceScore = Math.min(2, relevanceScore);
  
  // Final score (out of 10)
  return Math.min(10, wordCountScore + structureScore + relevanceScore);
}

/**
 * Generate model configuration
 */
async function generateModelConfig(results) {
  console.log('\nGenerating model configuration...');
  
  const config = {};
  
  // Process best models from results
  if (results.bestModels) {
    for (const language of Object.keys(results.bestModels)) {
      config[language] = {};
      
      for (const size of Object.keys(results.bestModels[language])) {
        const bestModel = results.bestModels[language][size];
        const [provider, model] = bestModel.model.split('/');
        
        config[language][size] = {
          provider,
          model,
          testResults: {
            status: 'tested',
            avgResponseTime: 0,
            avgContentSize: 0,
            testCount: 0,
            lastTested: new Date().toISOString()
          },
          notes: `Calibrated on ${new Date().toDateString()} with score ${bestModel.score.toFixed(2)}`
        };
        
        // Calculate averages from test results
        if (results[language] && results[language][size]) {
          const repos = Object.keys(results[language][size]);
          
          for (const repo of repos) {
            if (results[language][size][repo][bestModel.model] && 
                results[language][size][repo][bestModel.model].categories) {
              
              const categories = results[language][size][repo][bestModel.model].categories;
              let totalResponseTime = 0;
              let totalContentSize = 0;
              let count = 0;
              
              for (const category of Object.keys(categories)) {
                if (!categories[category].error) {
                  totalResponseTime += categories[category].responseTime;
                  totalContentSize += categories[category].contentSize;
                  count++;
                }
              }
              
              if (count > 0) {
                config[language][size].testResults.avgResponseTime = totalResponseTime / count;
                config[language][size].testResults.avgContentSize = totalContentSize / count;
                config[language][size].testResults.testCount = count;
              }
            }
          }
        }
      }
    }
  }
  
  // Add default configurations for other languages and sizes
  const allLanguages = [
    'javascript', 'typescript', 'python', 'java', 'go', 
    'ruby', 'php', 'csharp', 'cpp', 'rust'
  ];
  
  const allSizes = ['small', 'medium', 'large'];
  
  // Find overall best provider and model
  let overallBestProvider = 'anthropic';
  let overallBestModel = 'claude-3-haiku-20240307';
  
  if (results.bestModels) {
    const modelCounts = {};
    
    for (const language of Object.keys(results.bestModels)) {
      for (const size of Object.keys(results.bestModels[language])) {
        const model = results.bestModels[language][size].model;
        modelCounts[model] = (modelCounts[model] || 0) + 1;
      }
    }
    
    let maxCount = 0;
    let bestModel = null;
    
    for (const model of Object.keys(modelCounts)) {
      if (modelCounts[model] > maxCount) {
        maxCount = modelCounts[model];
        bestModel = model;
      }
    }
    
    if (bestModel) {
      const [provider, model] = bestModel.split('/');
      overallBestProvider = provider;
      overallBestModel = model;
    }
  }
  
  // Fill in defaults
  for (const language of allLanguages) {
    if (!config[language]) {
      config[language] = {};
    }
    
    for (const size of allSizes) {
      if (!config[language][size]) {
        config[language][size] = {
          provider: overallBestProvider,
          model: overallBestModel,
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
 * This configuration was created using the final batch calibration system.
 */

import { RepositoryModelConfig, RepositorySizeCategory, TestingStatus } from '../repository-model-config';

/**
 * Repository model configurations based on calibration testing
 */
export const CALIBRATED_MODEL_CONFIGS: Record<
  string, 
  Record<RepositorySizeCategory, RepositoryModelConfig>
> = ${JSON.stringify(config, null, 2).replace(/\"([^\"]+)\":/g, '$1:')};
`;

  // Save configuration
  fs.writeFileSync(CONFIG_OUTPUT_PATH, configContent);
  console.log(`Configuration generated at ${CONFIG_OUTPUT_PATH}`);
  console.log(`To apply this configuration:`);
  console.log(`cp ${CONFIG_OUTPUT_PATH} ../src/config/models/repository-model-config.ts`);
  console.log(`npm run build:core`);
}

/**
 * Generate configuration from results
 */
async function generateConfigFromResults() {
  console.log('Generating configuration from existing results...');
  
  if (!fs.existsSync(RESULTS_FILE)) {
    console.error(`Results file not found: ${RESULTS_FILE}`);
    console.log('Run calibration first to generate results.');
    return;
  }
  
  const results = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf-8'));
  await generateModelConfig(results);
}

/**
 * Main function
 */
async function main() {
  console.log('=== Final No-Prompt Batch Calibration Script ===');
  
  if (generateConfigOnly) {
    await generateConfigFromResults();
    rl.close();
    return;
  }
  
  // Load existing results
  let results = {};
  if (fs.existsSync(RESULTS_FILE)) {
    try {
      results = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf-8'));
      console.log('Loaded existing results from file.');
    } catch (error) {
      console.error('Error loading results file:', error.message);
      results = {};
    }
  }
  
  // Validate API keys
  const validProviders = [];
  
  // Check Anthropic
  if (await validateApiKey('anthropic')) {
    validProviders.push('anthropic');
  }
  
  // Check OpenAI
  if (await validateApiKey('openai')) {
    validProviders.push('openai');
  }
  
  console.log('\nValid providers:', validProviders.join(', ') || 'None');
  
  if (validProviders.length === 0) {
    console.error('No valid API keys available. Cannot continue.');
    rl.close();
    return;
  }
  
  // Determine what to test
  const languagesToTest = language ? [language] : Object.keys(TEST_REPOSITORIES);
  const sizesToTest = size ? [size] : ['small', 'medium', 'large'];
  
  console.log(`Testing ${languagesToTest.length} languages and ${sizesToTest.length} sizes.`);
  
  // Run tests
  for (const testLanguage of languagesToTest) {
    if (!TEST_REPOSITORIES[testLanguage]) {
      console.log(`Language "${testLanguage}" not found in test repositories.`);
      continue;
    }
    
    for (const testSize of sizesToTest) {
      if (!TEST_REPOSITORIES[testLanguage][testSize]) {
        console.log(`Size "${testSize}" not found for language "${testLanguage}".`);
        continue;
      }
      
      // Initialize if needed
      if (!results[testLanguage]) results[testLanguage] = {};
      if (!results[testLanguage][testSize]) results[testLanguage][testSize] = {};
      
      // Get repository for this language and size
      const repos = TEST_REPOSITORIES[testLanguage][testSize];
      for (const repo of repos) {
        console.log(`\nTesting ${testLanguage}/${testSize}/${repo}...`);
        
        // Initialize if needed
        if (!results[testLanguage][testSize][repo]) results[testLanguage][testSize][repo] = {};
        
        // Get repository context
        const repoContext = await getRepositoryContext(repo);
        console.log(`Retrieved repository context (${Object.keys(repoContext).length} properties).`);
        
        // Test each model
        let bestModel = null;
        let bestScore = 0;
        
        for (const { provider, model } of MODELS) {
          // Skip providers that don't have valid API keys
          if (!validProviders.includes(provider)) {
            console.log(`Skipping ${provider}/${model} - Provider not available.`);
            continue;
          }
          
          const modelKey = `${provider}/${model}`;
          
          // Skip already completed models
          if (results[testLanguage][testSize][repo][modelKey] && 
              results[testLanguage][testSize][repo][modelKey].categories && 
              Object.keys(results[testLanguage][testSize][repo][modelKey].categories).length === PROMPT_CATEGORIES.length) {
            console.log(`Skipping ${modelKey} - already tested for all categories.`);
            
            // Calculate score from existing data
            const categories = results[testLanguage][testSize][repo][modelKey].categories;
            let totalQuality = 0;
            let totalResponseTime = 0;
            let categoryCount = 0;
            
            for (const category of Object.keys(categories)) {
              if (!categories[category].error) {
                totalQuality += categories[category].qualityScore || 0;
                totalResponseTime += categories[category].responseTime || 0;
                categoryCount++;
              }
            }
            
            if (categoryCount > 0) {
              const avgQuality = totalQuality / categoryCount;
              const avgResponseTime = totalResponseTime / categoryCount;
              const speedScore = Math.max(0, 10 - (avgResponseTime / 3));
              const combinedScore = (avgQuality * 0.7) + (speedScore * 0.3);
              
              console.log(`Combined score for ${modelKey}: ${combinedScore.toFixed(2)}/10`);
              
              // Update best model
              if (combinedScore > bestScore) {
                bestModel = modelKey;
                bestScore = combinedScore;
                console.log(`New best model: ${bestModel} with score ${bestScore.toFixed(2)}`);
              }
            }
            
            continue;
          }
          
          console.log(`\nTesting model: ${modelKey}`);
          
          // Initialize model result
          if (!results[testLanguage][testSize][repo][modelKey]) {
            results[testLanguage][testSize][repo][modelKey] = { categories: {} };
          }
          if (!results[testLanguage][testSize][repo][modelKey].categories) {
            results[testLanguage][testSize][repo][modelKey].categories = {};
          }
          
          // Test each category
          let totalQuality = 0;
          let totalResponseTime = 0;
          let categoryCount = 0;
          
          for (const category of PROMPT_CATEGORIES) {
            // Skip already tested categories
            if (results[testLanguage][testSize][repo][modelKey].categories[category] && 
                !results[testLanguage][testSize][repo][modelKey].categories[category].error) {
              console.log(`Skipping ${category} - already tested.`);
              
              // Add to totals
              const existing = results[testLanguage][testSize][repo][modelKey].categories[category];
              totalQuality += existing.qualityScore || 0;
              totalResponseTime += existing.responseTime || 0;
              categoryCount++;
              
              continue;
            }
            
            console.log(`Testing ${modelKey} with ${category}...`);
            
            try {
              // Generate prompts
              const prompts = createPrompts(category, repoContext);
              
              // Call API
              const result = await callModelApi(provider, model, prompts.systemPrompt, prompts.userPrompt);
              
              // Calculate quality score
              const qualityScore = evaluateQuality(result.content, category);
              
              // Save result
              results[testLanguage][testSize][repo][modelKey].categories[category] = {
                qualityScore,
                responseTime: result.responseTime,
                contentSize: result.contentSize,
                timestamp: new Date().toISOString()
              };
              
              console.log(`Quality score: ${qualityScore.toFixed(2)}/10`);
              console.log(`Response time: ${result.responseTime.toFixed(2)}s`);
              
              // Update totals
              totalQuality += qualityScore;
              totalResponseTime += result.responseTime;
              categoryCount++;
            } catch (error) {
              console.error(`Error testing ${category}:`, error.message);
              
              results[testLanguage][testSize][repo][modelKey].categories[category] = {
                error: error.message,
                timestamp: new Date().toISOString()
              };
            }
            
            // Save after each test
            fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
          }
          
          // Calculate combined score
          if (categoryCount > 0) {
            const avgQuality = totalQuality / categoryCount;
            const avgResponseTime = totalResponseTime / categoryCount;
            const speedScore = Math.max(0, 10 - (avgResponseTime / 3));
            const combinedScore = (avgQuality * 0.7) + (speedScore * 0.3);
            
            console.log(`Combined score for ${modelKey}: ${combinedScore.toFixed(2)}/10`);
            console.log(`Quality: ${avgQuality.toFixed(2)}, Speed: ${speedScore.toFixed(2)}`);
            
            // Update best model
            if (combinedScore > bestScore) {
              bestModel = modelKey;
              bestScore = combinedScore;
              console.log(`New best model for ${testLanguage}/${testSize}: ${bestModel}`);
            }
          }
        }
        
        // Save best model
        if (bestModel) {
          if (!results.bestModels) results.bestModels = {};
          if (!results.bestModels[testLanguage]) results.bestModels[testLanguage] = {};
          
          results.bestModels[testLanguage][testSize] = {
            model: bestModel,
            score: bestScore,
            timestamp: new Date().toISOString()
          };
          
          console.log(`\nBest model for ${testLanguage}/${testSize}: ${bestModel} with score ${bestScore.toFixed(2)}`);
        }
        
        // Save results
        fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
      }
    }
  }
  
  // Generate configuration
  await generateModelConfig(results);
  
  // Close readline interface
  rl.close();
}

// Run the script
main().catch(error => {
  console.error('Script failed:', error);
  rl.close();
  process.exit(1);
});
