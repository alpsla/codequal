      let bestModel = null;
      let bestScore = 0;
      
      // Test all models from valid providers
      for (const provider of Object.keys(AVAILABLE_MODELS)) {
        // Skip unavailable providers
        if (!validProviders.includes(provider)) continue;
        
        for (const model of AVAILABLE_MODELS[provider]) {
          const modelKey = `${provider}/${model}`;
          console.log(`\nTesting model: ${modelKey}`);
          
          // Skip already tested models if running in batch mode
          if (options.batch && results[language][size][repo][modelKey] && 
              results[language][size][repo][modelKey].categories && 
              Object.keys(results[language][size][repo][modelKey].categories).length === PROMPT_CATEGORIES.length) {
            console.log(`Model ${modelKey} already tested for all categories, skipping...`);
            
            // Calculate combined score from existing results
            const categories = results[language][size][repo][modelKey].categories;
            let totalQuality = 0;
            let totalResponseTime = 0;
            let categoryCount = 0;
            
            for (const category of Object.keys(categories)) {
              if (categories[category].error) continue;
              
              totalQuality += categories[category].qualityScore;
              totalResponseTime += categories[category].responseTime;
              categoryCount++;
            }
            
            if (categoryCount > 0) {
              const avgQuality = totalQuality / categoryCount;
              const avgResponseTime = totalResponseTime / categoryCount;
              const combinedScore = calculateCombinedScore(avgQuality, avgResponseTime);
              
              console.log(`Combined score for ${modelKey}: ${combinedScore.toFixed(2)}/10 (quality: ${avgQuality.toFixed(2)}, speed: ${(10 - (avgResponseTime / 3)).toFixed(2)})`);
              
              // Update best model if needed
              if (combinedScore > bestScore) {
                bestModel = modelKey;
                bestScore = combinedScore;
                console.log(`New best model for ${language}/${size}: ${bestModel} with combined score ${bestScore.toFixed(2)}`);
              }
            }
            
            continue;
          }
          
          // Initialize model result if needed
          if (!results[language][size][repo][modelKey]) {
            results[language][size][repo][modelKey] = {
              categories: {}
            };
          }
          
          // Initialize categories if needed
          if (!results[language][size][repo][modelKey].categories) {
            results[language][size][repo][modelKey].categories = {};
          }
          
          // Test each category
          let modelTotalQuality = 0;
          let modelTotalResponseTime = 0;
          let modelCategoryCount = 0;
          
          for (const category of PROMPT_CATEGORIES) {
            console.log(`\nTesting ${modelKey} with ${category}...`);
            
            // Skip already tested categories if running in batch mode
            if (options.batch && 
                results[language][size][repo][modelKey].categories[category] && 
                !results[language][size][repo][modelKey].categories[category].error) {
              console.log(`Category ${category} already tested for ${modelKey}, skipping...`);
              
              const existingResult = results[language][size][repo][modelKey].categories[category];
              modelTotalQuality += existingResult.qualityScore;
              modelTotalResponseTime += existingResult.responseTime;
              modelCategoryCount++;
              
              continue;
            }
            
            // Create prompts for this category
            const { systemPrompt, userPrompt } = createPrompts(category, repoInfo);
            
            // Call model API
            const result = await callModelApi(provider, model, systemPrompt, userPrompt);
            
            // Save results 
            if (result.error) {
              results[language][size][repo][modelKey].categories[category] = {
                error: result.error.message || 'Unknown error',
                timestamp: new Date().toISOString()
              };
              
              console.log(`❌ Failed: ${result.error.message || 'Unknown error'}`);
            } else {
              // Evaluate response quality
              const qualityScore = evaluateResponseQuality(category, result.content);
              
              results[language][size][repo][modelKey].categories[category] = {
                responseTime: result.responseTime,
                contentSize: result.contentSize,
                qualityScore,
                timestamp: new Date().toISOString()
              };
              
              console.log(`Quality score for ${modelKey} on ${category}: ${qualityScore.toFixed(2)}/10`);
              console.log(`✅ Success (${result.responseTime.toFixed(2)}s, ${result.contentSize} bytes)`);
              
              modelTotalQuality += qualityScore;
              modelTotalResponseTime += result.responseTime;
              modelCategoryCount++;
            }
            
            // Save results after each test
            fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
            console.log(`Results saved to ${RESULTS_FILE}`);
          }
          
          // Calculate combined score for this model
          if (modelCategoryCount > 0) {
            const avgQuality = modelTotalQuality / modelCategoryCount;
            const avgResponseTime = modelTotalResponseTime / modelCategoryCount;
            const combinedScore = calculateCombinedScore(avgQuality, avgResponseTime);
            
            console.log(`Combined score for ${modelKey}: ${combinedScore.toFixed(2)}/10 (quality: ${avgQuality.toFixed(2)}, speed: ${(10 - (avgResponseTime / 3)).toFixed(2)})`);
            
            // Update best model if needed
            if (combinedScore > bestScore) {
              bestModel = modelKey;
              bestScore = combinedScore;
              console.log(`New best model for ${language}/${size}: ${bestModel} with combined score ${bestScore.toFixed(2)}`);
            }
          }
        }
      }
      
      // Save best model for this language/size
      if (bestModel) {
        if (!results.bestModels) results.bestModels = {};
        if (!results.bestModels[language]) results.bestModels[language] = {};
        
        results.bestModels[language][size] = {
          model: bestModel,
          score: bestScore,
          timestamp: new Date().toISOString()
        };
        
        console.log(`\nBest model for ${language}/${size}: ${bestModel} with score ${bestScore.toFixed(2)}`);
      }
    }
  }
  
  // Save final results
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
  console.log(`\nFinal results saved to ${RESULTS_FILE}`);
  
  // Generate configuration if requested
  if (options.generateConfig) {
    generateModelConfig(results);
  }
  
  // Close readline interface
  rl.close();
}

/**
 * Generate model configuration file
 */
function generateModelConfig(results) {
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
  
  // Find the overall best provider and model
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
 * This configuration was created using the batch calibration system.
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

// Run the script
if (options.generateConfig) {
  // Only generate config from existing results
  console.log('Generating configuration from existing results...');
  
  if (fs.existsSync(RESULTS_FILE)) {
    const results = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf-8'));
    generateModelConfig(results);
  } else {
    console.error(`Error: No results file found at ${RESULTS_FILE}`);
    console.log('Run the calibration first to generate results.');
    process.exit(1);
  }
  
  rl.close();
} else {
  // Run the full calibration
  runBatchCalibration().catch(error => {
    console.error('Calibration failed:', error);
    rl.close();
    process.exit(1);
  });
}
