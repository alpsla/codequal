/**
 * Main runner code for enhanced calibration
 */

const { generateDetailedReport } = require('../../generate-detailed-report');
const { generateModelConfig } = require('../../../src/utils/config-generator');
const { loadApiKeys, validateAllApiKeys } = require('../../../src/utils/api-utils');
const { createPrompts, evaluateQuality } = require('../../../src/utils/prompt-utils');
const { getRepositoryContext } = require('../../../src/utils/repository-utils');

const { 
  CATEGORIES, 
  TEST_LANGUAGES, 
  TEST_SIZES, 
  TEST_REPOSITORIES,
  CONFIG_OUTPUT_PATH,
  CSV_REPORT_PATH
} = require('./config');

const {
  getCommandLineArg,
  loadExistingResults,
  saveResults,
  createReadlineInterface,
  calculatePriceScore,
  logError
} = require('./utils');

const {
  callModelApiWithManualKey,
  promptForApiKey,
  getProviderModels
} = require('./api');

/**
 * Main function to run calibration process
 * @return {Promise<void>}
 */
async function runCalibration() {
  // Create readline interface
  const rl = createReadlineInterface();
  
  console.log('=== Enhanced Model Calibration ===');
  
  try {
    // Get command line args
    const specificLanguage = getCommandLineArg('language');
    const specificSize = getCommandLineArg('size');
    const specificModel = getCommandLineArg('model');
    const specificProvider = getCommandLineArg('provider');
    const onlyGenerateConfig = process.argv.includes('--generate-config');
    const onlyGenerateReport = process.argv.includes('--generate-report');
    const skipApiValidation = process.argv.includes('--skip-api-validation');
    
    // Load existing results
    const results = loadExistingResults();
    
    // Just generate config if that's all we need
    if (onlyGenerateConfig) {
      console.log('Generating configuration from existing results...');
      try {
        await generateModelConfig(results);
        console.log(`Configuration file generated at: ${CONFIG_OUTPUT_PATH}`);
      } catch (error) {
        logError('Error generating configuration', error);
      }
      rl.close();
      return;
    }
    
    // Just generate CSV report if that's all we need
    if (onlyGenerateReport) {
      console.log('Generating detailed CSV report from existing results...');
      try {
        await generateDetailedReport(results, CSV_REPORT_PATH);
        console.log(`Detailed report generated at: ${CSV_REPORT_PATH}`);
      } catch (error) {
        logError('Error generating report', error);
      }
      rl.close();
      return;
    }
    
    // Load API keys for all providers
    const apiKeys = loadApiKeys();
    
    // Validate API keys unless skipped
    if (!skipApiValidation) {
      console.log('Validating API keys...');
      try {
        await validateAllApiKeys(apiKeys);
      } catch (error) {
        logError('API key validation error', error);
        console.warn('Continuing despite API key validation errors...');
      }
    } else {
      console.log('Skipping API key validation...');
    }
    
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
    await runTestingLoop(
      rl,
      testLanguages,
      testSizes,
      results,
      apiKeys,
      specificProvider,
      specificModel,
      skipApiValidation
    );
    
    // Generate final report
    await generateFinalReport(results);
    
    console.log('\nCalibration complete!');
    console.log(`Results saved to the calibration-results directory`);
    console.log(`\nFor tabular analysis, review the detailed CSV report at: ${CSV_REPORT_PATH}`);
    console.log('\nTo apply the configuration:');
    console.log(`cp ${CONFIG_OUTPUT_PATH} ../src/config/models/repository-model-config.ts`);
    console.log(`npm run build:core`);
  } catch (error) {
    logError('Calibration process error', error);
  } finally {
    // Close readline interface
    rl.close();
  }
}

/**
 * Run the main testing loop
 * @param {readline.Interface} rl - Readline interface
 * @param {string[]} testLanguages - Languages to test
 * @param {string[]} testSizes - Sizes to test
 * @param {object} results - Results object
 * @param {object} apiKeys - API keys
 * @param {string} specificProvider - Specific provider to test (optional)
 * @param {string} specificModel - Specific model to test (optional)
 * @param {boolean} skipApiValidation - Whether to skip API validation
 */
async function runTestingLoop(
  rl,
  testLanguages,
  testSizes,
  results,
  apiKeys,
  specificProvider,
  specificModel,
  skipApiValidation
) {
  // Process each language
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
      
      // Process each repository
      for (const repo of repos) {
        await processRepository(
          rl,
          repo,
          testLanguage,
          testSize,
          results,
          apiKeys,
          specificProvider,
          specificModel,
          skipApiValidation
        );
      }
      
      // Calculate best model across all repositories for this language/size
      calculateBestModelForLanguageSize(results, testLanguage, testSize);
    }
  }
}

/**
 * Process a single repository
 */
async function processRepository(
  rl,
  repo,
  testLanguage,
  testSize,
  results,
  apiKeys,
  specificProvider,
  specificModel,
  skipApiValidation
) {
  console.log(`\nRepository: ${repo}`);
  
  if (!results[testLanguage][testSize][repo]) {
    results[testLanguage][testSize][repo] = {};
  }
  
  // Get repository context
  console.log('Fetching repository context...');
  try {
    const repoContext = await getRepositoryContext(repo);
    
    // Test each model
    console.log('Testing models...');
    
    // Track best model for this repo
    let bestModel = null;
    let bestScore = 0;
    
    // Test with providers and models
    const providers = specificProvider ? [specificProvider] : Object.keys(apiKeys);
    
    for (const provider of providers) {
      // Skip providers with no API key unless using manual keys
      if (!apiKeys[provider] && !skipApiValidation) {
        console.log(`Skipping provider ${provider} - no API key available`);
        continue;
      }
      
      // Get available models for this provider
      let models = getProviderModels(provider);
      
      // Filter models if specific model requested
      if (specificModel) {
        models = models.filter(model => model.includes(specificModel));
      }
      
      // Skip provider if no models
      if (models.length === 0) continue;

      for (const model of models) {
        const modelKey = `${provider}/${model}`;
        console.log(`\nTesting ${modelKey}...`);
        
        // Skip if already tested
        if (results[testLanguage][testSize][repo][modelKey] && 
            results[testLanguage][testSize][repo][modelKey].categories && 
            Object.keys(results[testLanguage][testSize][repo][modelKey].categories).length === CATEGORIES.length &&
            !process.argv.includes('--force')) {
          console.log(`Already tested ${modelKey}, skipping. Use --force to retest.`);
          continue;
        }
        
        // Initialize or load existing results
        if (!results[testLanguage][testSize][repo][modelKey]) {
          results[testLanguage][testSize][repo][modelKey] = { categories: {} };
        }
        
        if (!results[testLanguage][testSize][repo][modelKey].categories) {
          results[testLanguage][testSize][repo][modelKey].categories = {};
        }
        
        // Test model on this repository
        const hasError = await testModelOnRepository(
          rl,
          provider,
          model,
          repoContext,
          results,
          testLanguage,
          testSize,
          repo
        );
        
        // Update best model if needed
        updateBestModelIfNeeded(
          results, 
          testLanguage, 
          testSize, 
          repo, 
          modelKey, 
          hasError, 
          bestModel, 
          bestScore
        );
      }
    }
  } catch (error) {
    logError(`Error processing repository ${repo}`, error);
  }
}

/**
 * Test a specific model on a repository
 */
async function testModelOnRepository(
  rl,
  provider,
  model,
  repoContext,
  results,
  testLanguage,
  testSize,
  repo
) {
  const modelKey = `${provider}/${model}`;
  
  // Tracking metrics for this model
  let totalQuality = 0;
  let totalResponseTime = 0;
  let categoryCount = 0;
  let hasError = false;
  
  // Test each category
  for (const category of CATEGORIES) {
    // Skip if already tested
    if (results[testLanguage][testSize][repo][modelKey].categories[category] && 
        !results[testLanguage][testSize][repo][modelKey].categories[category].error &&
        !process.argv.includes('--force')) {
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
      
      // Call API with support for manual keys
      const result = await callModelApiWithManualKey(provider, model, prompts.systemPrompt, prompts.userPrompt);
      
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
      
      // Save after each category
      saveResults(results);
    } catch (error) {
      logError(`Error testing ${modelKey} with ${category}`, error);
      hasError = true;
      
      results[testLanguage][testSize][repo][modelKey].categories[category] = {
        error: error.message,
        timestamp: new Date().toISOString()
      };
      
      // Save error result
      saveResults(results);
      
      // Prompt for manual API key if this might be an API key issue
      if (error.message.includes('authentication') || 
          error.message.includes('unauthorized') || 
          error.message.includes('api key') ||
          error.message.includes('API key') ||
          error.message.includes('400')) {
        try {
          const provided = await promptForApiKey(rl, provider, model);
          
          // If user provided a manual key, retry this category
          if (provided) {
            console.log(`Retrying ${category} with manual API key...`);
            try {
              const prompts = createPrompts(category, repoContext);
              const result = await callModelApiWithManualKey(provider, model, prompts.systemPrompt, prompts.userPrompt);
              const qualityScore = evaluateQuality(result.content, category);
              
              // Update result
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
              
              // Reset error flag for this retry
              hasError = false;
              
              // Save successful retry
              saveResults(results);
            } catch (retryError) {
              logError(`Retry failed for ${modelKey} with ${category}`, retryError);
              saveResults(results);
            }
          }
        } catch (promptError) {
          logError(`Error prompting for API key`, promptError);
        }
      }
    }
  }

  // Calculate combined score using improved weighting
  if (categoryCount > 0) {
    const avgQuality = totalQuality / categoryCount;
    const avgResponseTime = totalResponseTime / categoryCount;
    
    // Speed score (15% impact - reduced from 30%)
    const speedScore = Math.max(0, 10 - (avgResponseTime / 3));
    
    // Price score (35% impact - just slightly less than quality)
    const priceScore = calculatePriceScore(provider, model);
    
    // Calculate combined score with new weighting
    // Quality: 50%, Speed: 15%, Price: 35%
    const combinedScore = (avgQuality * 0.50) + (speedScore * 0.15) + (priceScore * 0.35);
    
    console.log(`\nScores for ${modelKey}:`);
    console.log(`- Quality: ${avgQuality.toFixed(2)}/10 (50% weight)`);
    console.log(`- Speed: ${speedScore.toFixed(2)}/10 (15% weight)`);
    console.log(`- Price: ${priceScore.toFixed(2)}/10 (35% weight)`);
    console.log(`Combined score: ${combinedScore.toFixed(2)}/10`);
    
    try {
      // Save scores to results
      results[testLanguage][testSize][repo][modelKey].scores = {
        quality: avgQuality,
        speed: speedScore,
        price: priceScore,
        combined: combinedScore,
        timestamp: new Date().toISOString()
      };
      
      // Save after score calculation
      saveResults(results);
    } catch (saveError) {
      logError(`Error saving scores for ${modelKey}`, saveError);
    }
  } else if (hasError) {
    console.warn(`No valid results for ${modelKey} due to errors`);
  }

  return hasError;
}

/**
 * Update the best model for a repository if needed
 */
function updateBestModelIfNeeded(
  results, 
  testLanguage, 
  testSize, 
  repo, 
  modelKey, 
  hasError,
  bestModel,
  bestScore
) {
  try {
    const modelData = results[testLanguage][testSize][repo][modelKey];
    if (!hasError && modelData.scores && modelData.scores.combined > bestScore) {
      bestModel = modelKey;
      bestScore = modelData.scores.combined;
      
      // Save best model for this repo
      results[testLanguage][testSize][repo].bestModel = {
        model: bestModel,
        score: bestScore,
        timestamp: new Date().toISOString()
      };
      
      console.log(`\nBest model for ${repo}: ${bestModel} with score ${bestScore.toFixed(2)}/10`);
      
      // Save results
      saveResults(results);
    }
  } catch (error) {
    logError(`Error updating best model for ${repo}`, error);
  }
}

/**
 * Calculate best model for a language/size combination
 */
function calculateBestModelForLanguageSize(results, testLanguage, testSize) {
  try {
    if (results[testLanguage][testSize]) {
      const repos = Object.keys(results[testLanguage][testSize]).filter(key => key !== 'bestModel');
      const modelScores = {};
      
      // Calculate average scores for each model across repositories
      for (const repo of repos) {
        const repoResults = results[testLanguage][testSize][repo];
        for (const modelKey of Object.keys(repoResults)) {
          // Skip the bestModel entry
          if (modelKey === 'bestModel') continue;
          
          const modelData = repoResults[modelKey];
          if (!modelData.scores || !modelData.scores.combined) continue;
          
          // Add to model scores
          if (!modelScores[modelKey]) {
            modelScores[modelKey] = {
              totalScore: 0,
              repoCount: 0
            };
          }
          
          modelScores[modelKey].totalScore += modelData.scores.combined;
          modelScores[modelKey].repoCount++;
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
        
        console.log(`\nBest model for ${testLanguage}/${testSize} (all repos): ${bestModelKey} with average score ${bestAvgScore.toFixed(2)}/10`);
        
        // Save results
        saveResults(results);
      }
    }
  } catch (error) {
    logError(`Error determining best model for ${testLanguage}/${testSize}`, error);
  }
}

/**
 * Generate the final report
 */
async function generateFinalReport(results) {
  console.log('\n=== Generating Final Report ===');
  
  // Generate detailed CSV report for manual analysis
  try {
    await generateDetailedReport(results, CSV_REPORT_PATH);
    console.log(`Detailed CSV report generated at: ${CSV_REPORT_PATH}`);
  } catch (reportError) {
    logError('Error generating CSV report', reportError);
    console.error('Failed to generate detailed CSV report');
  }
  
  // Summarize best models for each language/size combination
  console.log('\nDetermining optimal models for each language/size combination...');
  
  if (results.bestModels) {
    for (const language of Object.keys(results.bestModels)) {
      for (const size of Object.keys(results.bestModels[language])) {
        const bestModel = results.bestModels[language][size];
        console.log(`Best model for ${language}/${size}: ${bestModel.model} with average score ${bestModel.score.toFixed(2)}/10`);
      }
    }
  }
  
  // Generate configuration
  try {
    await generateModelConfig(results);
    console.log(`Configuration file generated at: ${CONFIG_OUTPUT_PATH}`);
  } catch (configError) {
    logError('Error generating configuration', configError);
    console.error('Failed to generate configuration file');
  }
}

module.exports = {
  runCalibration
};