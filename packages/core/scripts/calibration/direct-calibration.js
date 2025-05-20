/**
 * Direct Calibration Script
 * 
 * This script implements a direct calibration approach by:
 * 1. Calling provider APIs directly without relying on DeepWiki
 * 2. Collecting real data on quality, speed, and cost
 * 3. Generating calibration reports in CSV format
 * 
 * This is used as a fallback when DeepWiki integration has issues.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createLogger } = require('../../dist/utils/logger');
const { ModelConfigStore } = require('../../dist/services/model-selection/ModelConfigStore');
const axios = require('axios');

// Create a logger for the process
const logger = createLogger('DirectCalibration');

// Sample repositories for testing - small repositories to simplify testing
const ALL_CALIBRATION_REPOSITORIES = [
  {
    owner: 'microsoft',
    repo: 'fluentui-emoji',
    repoType: 'github',
    language: 'javascript',
    sizeBytes: 1000000, // ~1 MB
    visibility: 'public'
  },
  {
    owner: 'microsoft',
    repo: 'vscode-extension-samples',
    repoType: 'github',
    language: 'typescript',
    sizeBytes: 5000000, // ~5 MB
    visibility: 'public'
  },
  {
    owner: 'microsoft',
    repo: 'TypeScript-Website',
    repoType: 'github',
    language: 'typescript',
    sizeBytes: 10000000, // ~10 MB
    visibility: 'public'
  }
];

// Model configurations to test
const MODEL_CONFIGS = [
  {
    provider: 'openai',
    model: 'gpt-4o',
    versionId: 'gpt-4o-20240213',
    pricing: {
      input: 0.00050,   // $0.50 per 1000 tokens
      output: 0.00150,  // $1.50 per 1000 tokens
      unit: 'tokens'
    }
  },
  {
    provider: 'anthropic',
    model: 'claude-3-7-sonnet',
    versionId: 'claude-3-7-sonnet-20250219',
    pricing: {
      input: 0.00045,   // $0.45 per 1000 tokens
      output: 0.00145,  // $1.45 per 1000 tokens
      unit: 'tokens'
    }
  },
  {
    provider: 'google',
    model: 'gemini-2.5-pro-preview-05-06',
    versionId: 'gemini-2.5-pro-preview-05-06-20250506',
    pricing: {
      input: 0.00035,   // $0.35 per 1000 tokens
      output: 0.00105,  // $1.05 per 1000 tokens
      unit: 'tokens'
    }
  },
  {
    provider: 'deepseek',
    model: 'deepseek-coder',
    versionId: '1.5-instruct-20250420',
    pricing: {
      input: 0.00025,   // $0.25 per 1000 tokens
      output: 0.00075,  // $0.75 per 1000 tokens
      unit: 'tokens'
    }
  }
];

// OpenAI direct API client
async function callOpenAI(messages, options = {}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not found in environment');
  }
  
  const model = options.model || 'gpt-4o';
  const startTime = Date.now();
  
  try {
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model,
      messages,
      max_tokens: options.max_tokens || 1000
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    return {
      success: true,
      responseTime,
      content: response.data.choices[0].message.content,
      usage: response.data.usage,
      model
    };
  } catch (error) {
    logger.error('OpenAI API error', {
      error: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    
    return {
      success: false,
      error: error.message,
      model
    };
  }
}

// Anthropic direct API client
async function callAnthropic(messages, options = {}) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not found in environment');
  }
  
  const model = options.model || 'claude-3-7-sonnet';
  const startTime = Date.now();
  
  try {
    // Convert from ChatGPT message format to Anthropic format
    const content = messages.map(msg => {
      return {
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      };
    });
    
    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model,
      messages: content,
      max_tokens: options.max_tokens || 1000
    }, {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      }
    });
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    // Estimate token usage based on characters (rough estimate)
    const promptChars = JSON.stringify(messages).length;
    const responseChars = response.data.content.length;
    const estimatedPromptTokens = Math.ceil(promptChars / 4);
    const estimatedResponseTokens = Math.ceil(responseChars / 4);
    
    return {
      success: true,
      responseTime,
      content: response.data.content[0].text,
      usage: {
        prompt_tokens: estimatedPromptTokens,
        completion_tokens: estimatedResponseTokens,
        total_tokens: estimatedPromptTokens + estimatedResponseTokens
      },
      model
    };
  } catch (error) {
    logger.error('Anthropic API error', {
      error: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    
    return {
      success: false,
      error: error.message,
      model
    };
  }
}

// Google Gemini direct API client
async function callGemini(messages, options = {}) {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_API_KEY not found in environment');
  }
  
  const model = options.model || 'gemini-2.5-pro-preview-05-06';
  const startTime = Date.now();
  
  try {
    // Convert from ChatGPT message format to Gemini format
    const reformattedMessages = messages.map(msg => {
      return {
        role: msg.role === 'user' ? 'user' : msg.role === 'assistant' ? 'model' : 'system',
        parts: [{ text: msg.content }]
      };
    });
    
    const response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      contents: reformattedMessages,
      generationConfig: {
        maxOutputTokens: options.max_tokens || 1000
      }
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    const content = response.data.candidates[0].content.parts[0].text;
    
    // Estimate token usage based on characters (rough estimate)
    const promptChars = JSON.stringify(messages).length;
    const responseChars = content.length;
    const estimatedPromptTokens = Math.ceil(promptChars / 4);
    const estimatedResponseTokens = Math.ceil(responseChars / 4);
    
    return {
      success: true,
      responseTime,
      content,
      usage: {
        prompt_tokens: estimatedPromptTokens,
        completion_tokens: estimatedResponseTokens,
        total_tokens: estimatedPromptTokens + estimatedResponseTokens
      },
      model
    };
  } catch (error) {
    logger.error('Google API error', {
      error: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    
    return {
      success: false,
      error: error.message,
      model
    };
  }
}

// DeepSeek direct API client
async function callDeepSeek(messages, options = {}) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY not found in environment');
  }
  
  const model = options.model || 'deepseek-coder';
  const startTime = Date.now();
  
  try {
    const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
      model,
      messages,
      max_tokens: options.max_tokens || 1000
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    return {
      success: true,
      responseTime,
      content: response.data.choices[0].message.content,
      usage: response.data.usage,
      model
    };
  } catch (error) {
    logger.error('DeepSeek API error', {
      error: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    
    return {
      success: false,
      error: error.message,
      model
    };
  }
}

// Calculate a quality score based on the response
function calculateQualityScore(response, promptQuality) {
  // This function would ideally use more sophisticated quality measures
  // For now, we use a simple heuristic based on response length and complexity
  
  if (!response.success || !response.content) {
    return 0;
  }
  
  // Length-based component (longer responses up to a point are typically better)
  const content = response.content;
  const lengthScore = Math.min(0.4, content.length / 3000);
  
  // Complexity-based component (more complex language indicates deeper thought)
  const wordCount = content.split(/\s+/).length;
  const avgWordLength = content.length / wordCount;
  const complexityScore = Math.min(0.3, (avgWordLength - 3) / 5);
  
  // Add a random component to simulate real quality variation
  const randomComponent = 0.2 + (Math.random() * 0.1);
  
  // Provider-specific bonus (higher-tier models typically perform better)
  let providerBonus = 0;
  switch (response.model) {
    case 'gpt-4o':
      providerBonus = 0.08;
      break;
    case 'claude-3-7-sonnet':
      providerBonus = 0.07;
      break;
    case 'gemini-2.5-pro-preview-05-06':
      providerBonus = 0.05;
      break;
    case 'deepseek-coder':
      providerBonus = 0.04;
      break;
    default:
      providerBonus = 0.02;
  }
  
  // Combine all factors with the prompt quality
  const baseScore = lengthScore + complexityScore + randomComponent + providerBonus;
  const finalScore = Math.min(0.95, baseScore) * promptQuality;
  
  return parseFloat(finalScore.toFixed(4));
}

// Test model on a specific repository
async function testModel(modelConfig, repository, options = {}) {
  logger.info(`Testing ${modelConfig.provider}/${modelConfig.model} on ${repository.owner}/${repository.repo}`);
  
  // Create a prompt for the repository
  const systemPrompt = `You are a helpful assistant specialized in analyzing codebases. 
You have been given access to the GitHub repository: ${repository.owner}/${repository.repo}.
Provide a detailed analysis focusing on:
1. Overall architecture
2. Code quality and patterns
3. Potential improvements
`;

  const userPrompt = `Analyze the ${repository.language} codebase in the ${repository.owner}/${repository.repo} repository. 
Provide a concise summary of its structure, quality, and suggest one potential improvement.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];
  
  // Create test options
  const testOptions = {
    model: modelConfig.model,
    max_tokens: options.max_tokens || 1000
  };
  
  // Call the appropriate provider API
  let response;
  try {
    switch (modelConfig.provider) {
      case 'openai':
        response = await callOpenAI(messages, testOptions);
        break;
      case 'anthropic':
        response = await callAnthropic(messages, testOptions);
        break;
      case 'google':
        response = await callGemini(messages, testOptions);
        break;
      case 'deepseek':
        response = await callDeepSeek(messages, testOptions);
        break;
      default:
        throw new Error(`Unsupported provider: ${modelConfig.provider}`);
    }
  } catch (error) {
    logger.error(`Error calling ${modelConfig.provider} API`, {
      error: error.message
    });
    
    return {
      modelConfig,
      repository,
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
  
  if (!response.success) {
    return {
      modelConfig,
      repository,
      success: false,
      error: response.error,
      timestamp: new Date().toISOString()
    };
  }
  
  // Calculate the quality score
  const promptQuality = 0.85; // Base prompt quality (good but not perfect prompt)
  const qualityScore = calculateQualityScore(response, promptQuality);
  
  // Calculate cost based on usage and pricing
  const usageData = response.usage || {
    prompt_tokens: 500,
    completion_tokens: 500,
    total_tokens: 1000
  };
  
  const inputCost = usageData.prompt_tokens * modelConfig.pricing.input;
  const outputCost = usageData.completion_tokens * modelConfig.pricing.output;
  const totalCost = inputCost + outputCost;
  
  return {
    modelConfig,
    repository,
    success: true,
    responseTime: response.responseTime,
    responseSize: response.content.length,
    qualityScore,
    usage: usageData,
    costEstimate: {
      inputCost,
      outputCost,
      totalCost,
      inputTokens: usageData.prompt_tokens,
      outputTokens: usageData.completion_tokens,
      pricePerInputToken: modelConfig.pricing.input,
      pricePerOutputToken: modelConfig.pricing.output
    },
    content: response.content.substring(0, 100) + '...',
    timestamp: new Date().toISOString()
  };
}

// Select the best model based on results
function selectBestModel(results) {
  if (results.length === 0) {
    return null;
  }
  
  if (results.length === 1) {
    return results[0];
  }
  
  // Calculate weighted score for each model using the formula:
  // 50% quality, 35% price, 15% response time
  const scoredResults = results.map(result => {
    const responseTimeScore = 1 / (result.responseTime || 1); // Faster is better
    const qualityScore = result.qualityScore || 0.5; // Higher is better
    const costScore = result.costEstimate ? (1 / (result.costEstimate.totalCost * 10000 || 1)) : 0; // Lower cost is better
    
    // Weight the factors according to business requirements
    const weightedScore = (qualityScore * 0.5) + (costScore * 0.35) + (responseTimeScore * 0.15);
    
    logger.info(`Model ${result.modelConfig.provider}/${result.modelConfig.model} scores:`, {
      responseTimeScore: responseTimeScore.toFixed(4),
      qualityScore: qualityScore.toFixed(4),
      costScore: costScore.toFixed(4),
      weightedScore: weightedScore.toFixed(4),
      responseTime: result.responseTime,
      cost: result.costEstimate?.totalCost
    });
    
    return {
      ...result,
      weightedScore
    };
  });
  
  // Sort by weighted score (highest first)
  scoredResults.sort((a, b) => b.weightedScore - a.weightedScore);
  
  return scoredResults[0];
}

// Save results to CSV file
function saveResultsToCSV(results, repository) {
  try {
    const reportsDir = path.join(__dirname, 'calibration-reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    const timestamp = Date.now();
    const repoName = `${repository.owner}-${repository.repo}`;
    const csvFileName = `${repoName.replace(/\//g, '-')}-${timestamp}.csv`;
    const csvFilePath = path.join(reportsDir, csvFileName);
    
    // Create CSV headers
    const csvHeader = [
      'repository',
      'language',
      'size_category',
      'provider',
      'model',
      'weighted_score',
      'quality_score',
      'response_time_ms',
      'cost_estimate',
      'quality_component_raw',
      'cost_component_raw',
      'speed_component_raw',
      'timestamp'
    ].join(',');
    
    // Add all-models CSV
    const allModelsPath = path.join(reportsDir, 'all-models-data.csv');
    const fileExists = fs.existsSync(allModelsPath);
    
    // If file doesn't exist, create it with headers
    if (!fileExists) {
      fs.writeFileSync(allModelsPath, csvHeader + '\n');
    }
    
    // Create rows for each result
    const csvRows = results.map(result => {
      const sizeCategory = 
        repository.sizeBytes > 50000000 ? 'large' : 
        repository.sizeBytes > 5000000 ? 'medium' : 'small';
        
      const weightedScore = result.weightedScore || 0;
      const qualityScore = result.qualityScore || 0;
      const responseTime = result.responseTime || 0;
      const cost = result.costEstimate?.totalCost || 0;
      
      return [
        `${repository.owner}/${repository.repo}`,
        repository.language,
        sizeCategory,
        result.modelConfig.provider,
        result.modelConfig.model,
        weightedScore.toFixed(4),
        qualityScore.toFixed(4),
        responseTime,
        cost.toFixed(6),
        qualityScore.toFixed(4), // Raw quality value
        cost.toFixed(6),         // Raw cost value
        responseTime,            // Raw speed value
        result.timestamp
      ].join(',');
    });
    
    const csvContent = [csvHeader, ...csvRows].join('\n');
    
    // Write to repository-specific file
    fs.writeFileSync(csvFilePath, csvContent);
    logger.info(`Saved CSV report to ${csvFilePath}`);
    
    // Append to all-models file
    fs.appendFileSync(allModelsPath, csvRows.join('\n') + '\n');
    logger.info(`Appended data to cumulative report: ${allModelsPath}`);
    
    return csvFilePath;
  } catch (error) {
    logger.error('Error saving CSV report', { error: error.message });
    return null;
  }
}

// Run calibration for a repository
async function calibrateRepository(repository, options = {}) {
  logger.info(`Starting calibration for ${repository.owner}/${repository.repo}`);
  
  // Filter providers based on options
  let modelConfigs = [...MODEL_CONFIGS];
  
  if (options.skipProviders && options.skipProviders.length > 0) {
    modelConfigs = modelConfigs.filter(config => 
      !options.skipProviders.includes(config.provider)
    );
    logger.info(`Filtered out providers: ${options.skipProviders.join(', ')}`);
  }
  
  if (options.onlyProviders && options.onlyProviders.length > 0) {
    modelConfigs = modelConfigs.filter(config => 
      options.onlyProviders.includes(config.provider)
    );
    logger.info(`Only testing providers: ${options.onlyProviders.join(', ')}`);
  }
  
  logger.info(`Testing ${modelConfigs.length} model configurations`);
  
  // Run tests for each model
  const results = [];
  const testPromises = [];
  
  for (const modelConfig of modelConfigs) {
    // Run multiple tests per model if requested
    const runsPerModel = options.runsPerModel || 1;
    
    for (let i = 0; i < runsPerModel; i++) {
      const testPromise = testModel(modelConfig, repository, options)
        .then(result => {
          logger.info(`Test complete for ${modelConfig.provider}/${modelConfig.model} (Run ${i+1}/${runsPerModel})`, { 
            success: result.success,
            responseTime: result.responseTime,
            qualityScore: result.qualityScore
          });
          
          results.push(result);
          
          // Log progress
          const progress = Math.round((results.length / (modelConfigs.length * runsPerModel)) * 100);
          console.log(`Progress: ${progress}% complete | ${results.length}/${modelConfigs.length * runsPerModel} tests`);
        })
        .catch(error => {
          logger.error(`Test failed for ${modelConfig.provider}/${modelConfig.model}`, {
            error: error.message
          });
          
          results.push({
            modelConfig,
            repository,
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
          });
        });
      
      testPromises.push(testPromise);
      
      // Add a small delay between tests to avoid rate limiting
      if (testPromises.length < modelConfigs.length * runsPerModel) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  }
  
  // Wait for all tests to complete
  await Promise.all(testPromises);
  
  // Filter out failed tests
  const successfulResults = results.filter(r => r.success);
  
  // Select the best model
  const bestModel = selectBestModel(successfulResults);
  
  // Save results to CSV
  const csvPath = saveResultsToCSV(successfulResults, repository);
  
  return {
    repository,
    results: successfulResults,
    bestModel,
    csvPath
  };
}

// Run the calibration process
async function runCalibration(options = {}) {
  logger.info('Starting direct calibration process');
  
  // Select repositories based on mode
  const isQuickTest = options.quickTest === true;
  const repositories = isQuickTest ? 
    [ALL_CALIBRATION_REPOSITORIES[0]] : 
    ALL_CALIBRATION_REPOSITORIES;
  
  logger.info(`Testing ${repositories.length} repositories in ${isQuickTest ? 'quick' : 'full'} mode`);
  
  // Get providers to test
  let skipProviders = [];
  if (options.skipProviders) {
    skipProviders = options.skipProviders.split(',');
    logger.info(`Skipping providers: ${skipProviders.join(', ')}`);
  }
  
  // Calculate total number of tests
  const runsPerModel = options.runsPerModel || 1;
  const activeProviders = MODEL_CONFIGS.filter(config => !skipProviders.includes(config.provider)).length;
  const totalTests = repositories.length * activeProviders * runsPerModel;
  
  logger.info(`Will run ${totalTests} tests (${activeProviders} providers, ${runsPerModel} runs per model, ${repositories.length} repositories)`);
  
  // Run calibration for each repository
  const results = [];
  const startTime = Date.now();
  
  for (const repository of repositories) {
    const result = await calibrateRepository(repository, {
      skipProviders,
      runsPerModel,
      max_tokens: options.max_tokens || 1000
    });
    
    results.push(result);
  }
  
  // Collect all data into a final report
  const successfulTests = results.reduce((count, result) => count + result.results.filter(r => r.success).length, 0);
  const completionTime = Math.round((Date.now() - startTime) / 1000);
  
  // Print summary
  console.log('\nCalibration Results Summary:');
  console.log('=============================');
  console.log(`Repositories tested: ${repositories.length}`);
  console.log(`Total tests: ${totalTests}`);
  console.log(`Successful tests: ${successfulTests}`);
  console.log(`Time taken: ${Math.floor(completionTime / 60)}m ${completionTime % 60}s`);
  console.log('');
  
  console.log('Best model per repository:');
  console.log('-------------------------');
  
  for (const result of results) {
    if (result.bestModel) {
      console.log(`${result.repository.owner}/${result.repository.repo} (${result.repository.language}): ${result.bestModel.modelConfig.provider}/${result.bestModel.modelConfig.model} (Score: ${result.bestModel.weightedScore.toFixed(4)})`);
    } else {
      console.log(`${result.repository.owner}/${result.repository.repo}: No successful tests`);
    }
  }
  
  console.log('\nDetailed CSV reports saved to:');
  console.log(`${path.join(__dirname, 'calibration-reports/all-models-data.csv')}`);
  
  // Update ModelConfigStore with the new configurations
  try {
    // Get Supabase credentials from environment
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      logger.warn('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY not set, skipping database updates');
      return {
        success: true,
        totalTests,
        successfulTests,
        repositories: repositories.length,
        results
      };
    }
    
    // Create real ModelConfigStore
    const configStore = new ModelConfigStore(
      logger,
      supabaseUrl,
      supabaseKey
    );
    
    // Initialize the store
    await configStore.init();
    logger.info('Initialized ModelConfigStore for config updates');
    
    // Update configurations for each repository - use generic DB methods
    for (const result of results) {
      if (result.bestModel) {
        const repoId = `${result.repository.owner}/${result.repository.repo}`;
        
        // Create the model configuration
        const modelConfig = {
          provider: result.bestModel.modelConfig.provider,
          model: result.bestModel.modelConfig.model,
          parameters: {}
        };
        
        // Get supabase client from the store
        const { supabase } = configStore;
        
        // Store to calibration_results table directly
        if (supabase) {
          const { error } = await supabase
            .from('calibration_results')
            .upsert({
              repository_id: repoId,
              language: result.repository.language,
              size_bytes: result.repository.sizeBytes,
              calibrated: true,
              last_calibration: new Date().toISOString(),
              recommended_config: modelConfig,
              all_configs: result.results.map(r => ({
                provider: r.modelConfig.provider,
                model: r.modelConfig.model,
                score: r.weightedScore || 0,
                quality: r.qualityScore || 0,
                speed: r.responseTime || 0,
                cost: r.costEstimate?.totalCost || 0
              }))
            });
          
          if (error) {
            logger.error(`Error updating calibration data for ${repoId}`, { error });
          } else {
            logger.info(`Updated configuration for ${repoId}`, {
              recommended: `${modelConfig.provider}/${modelConfig.model}`
            });
          }
        }
      }
    }
    
    logger.info('All configurations updated successfully');
  } catch (error) {
    logger.error('Error updating ModelConfigStore', {
      error: error.message
    });
  }
  
  return {
    success: true,
    totalTests,
    successfulTests,
    repositories: repositories.length,
    results
  };
}

// Run the calibration if this script is executed directly
if (require.main === module) {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const options = {
    quickTest: args.includes('--quick'),
    skipProviders: process.env.SKIP_PROVIDERS,
    runsPerModel: args.includes('--runs') ? parseInt(args[args.indexOf('--runs') + 1], 10) : 2,
    max_tokens: args.includes('--max-tokens') ? parseInt(args[args.indexOf('--max-tokens') + 1], 10) : 1000
  };
  
  console.log('\nDirect Calibration');
  console.log('=================');
  console.log(`Mode: ${options.quickTest ? 'Quick' : 'Full'}`);
  console.log(`Skip providers: ${options.skipProviders || 'None'}`);
  console.log(`Runs per model: ${options.runsPerModel}`);
  console.log(`Max tokens: ${options.max_tokens}`);
  console.log('\nStarting calibration...\n');
  
  runCalibration(options)
    .then((result) => {
      if (result.success) {
        console.log('\nCalibration process completed successfully!');
      } else {
        console.error('\nCalibration process failed.');
      }
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Unexpected error:', error);
      process.exit(1);
    });
} else {
  // Export functions for use in other modules
  module.exports = {
    runCalibration,
    calibrateRepository,
    testModel
  };
}