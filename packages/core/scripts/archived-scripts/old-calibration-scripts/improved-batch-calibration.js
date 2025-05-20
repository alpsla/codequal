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
 * This configuration was created using the improved batch calibration system.
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
main().catch(error => {
  console.error('Script failed:', error);
  rl.close();
  process.exit(1);
});
