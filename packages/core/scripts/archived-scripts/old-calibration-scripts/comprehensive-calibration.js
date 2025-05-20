#!/usr/bin/env node
/**
 * Comprehensive Calibration Script
 * Tests models against multiple repositories, prompts, and categories
 * Determines optimal model configuration for each language/size combination
 */

// Import required modules
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const readline = require('readline');
const { loadApiKeys, callModelApi, validateAllApiKeys } = require('../src/utils/api-utils');
const { createPrompts, evaluateQuality } = require('../src/utils/prompt-utils');
const { getRepositoryContext } = require('../src/utils/repository-utils');
const { generateModelConfig } = require('../src/utils/config-generator');

// Load environment variables
dotenv.config();

// File paths
const RESULTS_DIR = path.join(__dirname, 'calibration-results');
const RESULTS_FILE = path.join(RESULTS_DIR, 'comprehensive-calibration-results.json');
const CONFIG_OUTPUT_PATH = path.join(RESULTS_DIR, 'repository-model-config.ts');

// Create results directory if it doesn't exist
if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Available categories
const CATEGORIES = [
  'architecture',
  'codeQuality',
  'security',
  'bestPractices',
  'performance'
];

// Available languages and sizes
const TEST_LANGUAGES = [
  'javascript',
  'typescript',
  'python',
  'java',
  'csharp',
  'go',
  'ruby',
  'php',
  'swift'
];

const TEST_SIZES = ['small', 'medium', 'large'];

// Test repositories by language and size
const TEST_REPOSITORIES = {
  javascript: {
    small: ['lodash/lodash', 'axios/axios'],
    medium: ['facebook/react', 'expressjs/express'],
    large: ['microsoft/vscode', 'nodejs/node']
  },
  typescript: {
    small: ['typeorm/typeorm', 'nestjs/nest'],
    medium: ['microsoft/typescript', 'angular/angular'],
    large: ['microsoft/vscode', 'microsoft/TypeScript-Node-Starter']
  },
  python: {
    small: ['psf/requests', 'pallets/flask'],
    medium: ['django/django', 'pandas-dev/pandas'],
    large: ['tensorflow/tensorflow', 'scikit-learn/scikit-learn']
  },
  // Add more repositories for other languages as needed
};

// Helper to get command line arguments
function getCommandLineArg(argName) {
  const args = process.argv.slice(2);
  const arg = args.find(arg => arg.startsWith(`--${argName}=`));
  
  if (arg) {
    return arg.split('=')[1];
  }
  
  return null;
}

// Helper to load existing results
function loadExistingResults() {
  if (fs.existsSync(RESULTS_FILE)) {
    try {
      const data = fs.readFileSync(RESULTS_FILE, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading existing results:', error.message);
    }
  }
  
  return {};
}

// Promisified version of readline question
function question(query) {
  return new Promise(resolve => {
    rl.question(query, resolve);
  });
}

// Main function
async function main() {
  console.log('=== Comprehensive Model Calibration ===');
  
  // Get command line args
  const specificLanguage = getCommandLineArg('language');
  const specificSize = getCommandLineArg('specificSize');
  const onlyGenerateConfig = process.argv.includes('--generate-config');
  
  // Load existing results
  const results = loadExistingResults();
  
  // Just generate config if that's all we need
  if (onlyGenerateConfig) {
    console.log('Generating configuration from existing results...');
    await generateModelConfig(results);
    console.log(`Configuration file generated at: ${CONFIG_OUTPUT_PATH}`);
    rl.close();
    return;
  }
  
  // Load API keys for all providers
  const apiKeys = loadApiKeys();
  
  // Validate API keys
  console.log('Validating API keys...');
  await validateAllApiKeys(apiKeys);
  
  // Filter repositories if needed
  let testLanguages = TEST_LANGUAGES;
  if (specificLanguage) {
    testLanguages = [specificLanguage];
  }
  
  let testSizes = TEST_SIZES;
  if (specificSize) {
    testSizes = [specificSize];
  }
  
  // Main testing loop
  for (const testLanguage of testLanguages) {
    if (!results[testLanguage]) {
      results[testLanguage] = {};
    }
    
    for (const testSize of testSizes) {
      if (!results[testLanguage][testSize]) {
        results[testLanguage][testSize] = {};
      }
      
      // Get repositories for this language/size
      let repos = [];
      if (TEST_REPOSITORIES[testLanguage] && TEST_REPOSITORIES[testLanguage][testSize]) {
        repos = TEST_REPOSITORIES[testLanguage][testSize];
      } else {
        console.warn(`No repositories defined for ${testLanguage}/${testSize}, skipping.`);
        continue;
      }
      
      console.log(`\nTesting ${testLanguage}/${testSize} repositories:`);
      
      for (const repo of repos) {
        console.log(`\nRepository: ${repo}`);
        
        if (!results[testLanguage][testSize][repo]) {
          results[testLanguage][testSize][repo] = {};
        }
        
        // Get repository context
        console.log('Fetching repository context...');
        const repoContext = await getRepositoryContext(repo);
        
        // Test each model
        console.log('Testing models...');
        
        // Track best model for this repo
        let bestModel = null;
        let bestScore = 0;
        
        // Test with all providers and models
        const providers = Object.keys(apiKeys);
        
        for (const provider of providers) {
          // Skip providers with no API key
          if (!apiKeys[provider]) continue;
          
          // Get available models for this provider
          let models = [];
          if (provider === 'anthropic') {
            models = ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307', 'claude-3-5-sonnet-20240620'];
          } else if (provider === 'openai') {
            models = ['gpt-3.5-turbo', 'gpt-4o'];
          } else if (provider === 'deepseek') {
            models = ['deepseek-coder'];
          } else if (provider === 'google') {
            models = ['gemini-1.5-flash-8b-001', 'gemini-1.5-pro'];
          } else if (provider === 'openrouter') {
            models = ['anthropic/claude-3.7-sonnet', 'nousresearch/deephermes-3-mistral-24b-preview:free'];
          }
          
          // Skip provider if no models
          if (models.length === 0) continue;
          
          for (const model of models) {
            const modelKey = `${provider}/${model}`;
            console.log(`\nTesting ${modelKey}...`);
            
            // Skip if already tested
            if (results[testLanguage][testSize][repo][modelKey] && 
                results[testLanguage][testSize][repo][modelKey].categories && 
                Object.keys(results[testLanguage][testSize][repo][modelKey].categories).length === CATEGORIES.length) {
              console.log(`Already tested ${modelKey}, skipping.`);
              continue;
            }
            
            // Initialize or load existing results
            if (!results[testLanguage][testSize][repo][modelKey]) {
              results[testLanguage][testSize][repo][modelKey] = { categories: {} };
            }
            
            if (!results[testLanguage][testSize][repo][modelKey].categories) {
              results[testLanguage][testSize][repo][modelKey].categories = {};
            }
            
            // Tracking metrics for this model
            let totalQuality = 0;
            let totalResponseTime = 0;
            let categoryCount = 0;
            
            // Test each category
            for (const category of CATEGORIES) {
              // Skip if already tested
              if (results[testLanguage][testSize][repo][modelKey].categories[category] && 
                  !results[testLanguage][testSize][repo][modelKey].categories[category].error) {
                console.log(`Category ${category} already tested, skipping.`);
                
                // Add to totals for score calculation
                if (results[testLanguage][testSize][repo][modelKey].categories[category].qualityScore) {
                  totalQuality += results[testLanguage][testSize][repo][modelKey].categories[category].qualityScore;
                  totalResponseTime += results[testLanguage][testSize][repo][modelKey].categories[category].responseTime;
                  categoryCount++;
                }
                
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
          
          console.log(`\nBest model for ${testLanguage}/${testSize}/${repo}: ${bestModel} with score ${bestScore.toFixed(2)}`);
        }
        
        // Save results
        fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
      }
      
      // Calculate best model across all repositories for this language/size
      if (results[testLanguage][testSize]) {
        const repos = Object.keys(results[testLanguage][testSize]);
        const modelScores = {};
        
        // Calculate average scores for each model across repositories
        for (const repo of repos) {
          for (const modelKey of Object.keys(results[testLanguage][testSize][repo])) {
            if (modelKey === 'bestModel') continue;
            
            const modelData = results[testLanguage][testSize][repo][modelKey];
            if (!modelData.categories) continue;
            
            // Calculate combined score for this model in this repo
            let totalQuality = 0;
            let totalResponseTime = 0;
            let categoryCount = 0;
            
            for (const category of Object.keys(modelData.categories)) {
              const categoryData = modelData.categories[category];
              if (!categoryData.error) {
                totalQuality += categoryData.qualityScore || 0;
                totalResponseTime += categoryData.responseTime || 0;
                categoryCount++;
              }
            }
            
            if (categoryCount > 0) {
              const avgQuality = totalQuality / categoryCount;
              const avgResponseTime = totalResponseTime / categoryCount;
              const speedScore = Math.max(0, 10 - (avgResponseTime / 3));
              const combinedScore = (avgQuality * 0.7) + (speedScore * 0.3);
              
              // Add to model scores
              if (!modelScores[modelKey]) {
                modelScores[modelKey] = {
                  totalScore: 0,
                  repoCount: 0
                };
              }
              
              modelScores[modelKey].totalScore += combinedScore;
              modelScores[modelKey].repoCount++;
            }
          }
        }
        
        // Find the best model across all repositories
        let bestModelKey = null;
        let bestAvgScore = 0;
        
        for (const modelKey of Object.keys(modelScores)) {
          const { totalScore, repoCount } = modelScores[modelKey];
          if (repoCount > 0) {
            const avgScore = totalScore / repoCount;
            
            if (avgScore > bestAvgScore) {
              bestAvgScore = avgScore;
              bestModelKey = modelKey;
            }
          }
        }
        
        // Save best model for this language/size
        if (bestModelKey) {
          if (!results.bestModels) results.bestModels = {};
          if (!results.bestModels[testLanguage]) results.bestModels[testLanguage] = {};
          
          results.bestModels[testLanguage][testSize] = {
            model: bestModelKey,
            score: bestAvgScore,
            timestamp: new Date().toISOString()
          };
          
          console.log(`\nBest model for ${testLanguage}/${testSize} (all repos): ${bestModelKey} with average score ${bestAvgScore.toFixed(2)}`);
          
          // Save results
          fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
        }
      }
    }
  }
  
  // Generate configuration
  await generateModelConfig(results);
  
  console.log('\nCalibration complete!');
  console.log('To apply the configuration:');
  console.log(`cp ${CONFIG_OUTPUT_PATH} ../src/config/models/repository-model-config.ts`);
  console.log(`npm run build:core`);
  
  // Close readline interface
  rl.close();
}

// Run the script
main().catch(error => {
  console.error('Script failed:', error);
  rl.close();
  process.exit(1);
});