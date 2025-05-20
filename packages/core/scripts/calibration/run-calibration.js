/**
 * Run Calibration Process
 * 
 * This script initiates a full calibration process for all configured repositories
 * and model combinations. It will test all providers and determine optimal configurations.
 */

require('dotenv').config();
const { RepositoryCalibrationService } = require('../../dist/services/model-selection/RepositoryCalibrationService');
const { ModelVersionSync } = require('../../dist/services/model-selection/ModelVersionSync');
// Use our custom wrapper instead of the standard DeepWikiClient
const { createDeepWikiClient } = require('./deepwiki-client-wrapper');
const { createLogger } = require('../../dist/utils/logger');

// Sample repositories for calibration testing
// You may need to adapt these to real repositories you have access to
const ALL_CALIBRATION_REPOSITORIES = [
  {
    owner: 'nodejs',
    repo: 'node',
    repoType: 'github',
    language: 'javascript',
    sizeBytes: 120000000, // ~120 MB
    visibility: 'public'
  },
  {
    owner: 'microsoft',
    repo: 'TypeScript',
    repoType: 'github',
    language: 'typescript',
    sizeBytes: 80000000, // ~80 MB
    visibility: 'public'
  },
  {
    owner: 'rust-lang',
    repo: 'rust',
    repoType: 'github',
    language: 'rust',
    sizeBytes: 200000000, // ~200 MB
    visibility: 'public'
  },
  {
    owner: 'python',
    repo: 'cpython',
    repoType: 'github',
    language: 'python',
    sizeBytes: 150000000, // ~150 MB
    visibility: 'public'
  }
];

// Determine which repositories to test based on environment
const CALIBRATION_REPOSITORIES = process.env.QUICK_TEST === 'true'
  ? [ALL_CALIBRATION_REPOSITORIES[0]] // Only test one repository in quick mode
  : ALL_CALIBRATION_REPOSITORIES.slice(0, 2); // For realistic test, use 2 repositories to be faster

// Create a proper logger instance
const logger = createLogger('CalibrationProcess');

// Create a simple mock implementation of DeepWikiClient for the calibration process
class MockDeepWikiClient {
  constructor(baseUrl, logger) {
    this.baseUrl = baseUrl;
    this.logger = logger;
    this.logger.info('Mock DeepWikiClient initialized', { baseUrl });
  }
  
  // Mock method for repository size - returns placeholder value for testing
  async getRepositorySize(repository) {
    this.logger.info('Mock: Getting repository size', { repository });
    return repository.sizeBytes || 0;
  }
  
  // Mock method that returns recommended model configs based on language and size
  recommendModelConfig(language, sizeBytes) {
    this.logger.info('Mock: Recommending model config', { language, sizeBytes });
    
    // Determine size category
    let sizeCategory = 'small';
    if (sizeBytes > 50 * 1024 * 1024) {
      sizeCategory = 'large';
    } else if (sizeBytes > 5 * 1024 * 1024) {
      sizeCategory = 'medium';
    }
    
    // Default configurations by size
    const defaultConfigs = {
      'small': {
        provider: 'openai',
        model: 'gpt-4o'
      },
      'medium': {
        provider: 'google',
        model: 'gemini-2.5-pro-preview-05-06'
      },
      'large': {
        provider: 'google',
        model: 'gemini-2.5-pro-preview-05-06'
      }
    };
    
    return defaultConfigs[sizeCategory];
  }
  
  // Mock method to generate wiki
  async generateWiki(repository, options) {
    this.logger.info('Mock: Generating wiki', { repository, options });
    return {
      success: true,
      pages: [
        { title: 'Main Documentation', content: 'Mock wiki content' }
      ]
    };
  }
  
  // Mock method for chat completion that returns in the format expected by the calibration service
  async getChatCompletion(repoUrl, options) {
    this.logger.info('Mock: Getting chat completion', { repoUrl, options });
    
    // Check if we should simulate longer API calls to better match real behavior
    const simulateRealDelay = process.env.SIMULATE_REAL_DELAY === 'true';
    
    // Create a delay to simulate response time
    let delay;
    if (simulateRealDelay) {
      // Use a shorter simulated delay of 5-10 seconds for testing
      delay = 5000 + Math.random() * 5000;
      this.logger.info(`Simulating real API delay of ${Math.round(delay/1000)} seconds`);
    } else {
      // Quick delay of 1-3 seconds for testing
      delay = 1000 + Math.random() * 2000;
    }
    
    await new Promise(resolve => setTimeout(resolve, delay));
    
    const content = 'This is a mock response for the calibration test. It simulates a response from the model, providing enough content to calculate response sizes and times accurately. The content is designed to mimic a typical AI model response with enough length to be meaningful.';
    
    // Add simulated quality score between 0.7 and 0.98 with slight advantage to openai and anthropic
    const qualityScore = (() => {
      const baseScore = 0.7 + Math.random() * 0.2;
      const providerBonus = 
        options.modelConfig?.provider === 'openai' ? 0.08 : 
        options.modelConfig?.provider === 'anthropic' ? 0.07 : 
        options.modelConfig?.provider === 'google' ? 0.05 : 
        options.modelConfig?.provider === 'deepseek' ? 0.04 : 0;
      return Math.min(0.98, baseScore + providerBonus);
    })();
    
    return {
      choices: [
        {
          message: {
            role: 'assistant',
            content: content
          }
        }
      ],
      usage: {
        prompt_tokens: 100,
        completion_tokens: 200,
        total_tokens: 300
      },
      metadata: {
        quality_score: qualityScore
      }
    };
  }
  
  // Mock chat completion for a repository
  async getChatCompletionForRepo(repository, options) {
    this.logger.info('Mock: Getting chat completion for repo', { repository, options });
    const repoUrl = `https://github.com/${repository.owner}/${repository.repo}`;
    return this.getChatCompletion(repoUrl, options);
  }
}

// Initialize DeepWiki client
function initDeepWikiClient() {
  // Set default values if not provided in environment
  if (!process.env.DEEPSEEK_API_KEY) {
    process.env.DEEPSEEK_API_KEY = 'mock-key-for-testing';
    logger.info('Using default DEEPSEEK_API_KEY for testing');
  }
  
  if (!process.env.DEEPWIKI_API_URL) {
    process.env.DEEPWIKI_API_URL = 'http://localhost:8001';
    logger.info('Using default DEEPWIKI_API_URL');
  }
  
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const apiUrl = process.env.DEEPWIKI_API_URL;
  
  logger.info('DeepWiki API configuration', { apiUrl, keyProvided: !!apiKey });
  
  // Check if we should use the real DeepWiki client
  const useRealClient = process.env.USE_REAL_DEEPWIKI === 'true';
  
  if (useRealClient) {
    try {
      logger.info('Using enhanced DeepWikiClientWrapper...');
      
      // Create our enhanced client wrapper
      const client = createDeepWikiClient({
        apiUrl,
        apiKey,
        logger,
        maxRetries: 3,
        timeout: 120000, // 2 minutes for general requests
        chatTimeout: 600000 // 10 minutes for chat completions
      });
      
      logger.info('Successfully initialized enhanced DeepWikiClientWrapper');
      return client;
    } catch (error) {
      logger.error('Failed to initialize DeepWikiClientWrapper', { error: error.message });
      logger.info('Falling back to mock implementation');
    }
  } else {
    logger.info('Using mock DeepWikiClient as requested');
  }
  
  // Create and return mock client
  return new MockDeepWikiClient(apiUrl, logger);
}

// Initialize services
async function initServices() {
  const deepWikiClient = initDeepWikiClient();
  
  // Create a mock ModelVersionSync that includes required methods
  const modelVersionSync = {
    getActiveModelVersions: () => {
      logger.info('Mock: Getting active model versions');
      // Return mock active versions
      return {
        'openai/gpt-4o': {
          provider: 'openai',
          model: 'gpt-4o',
          releaseDate: '2025-03-15',
          pricing: {
            input: 0.00050,   // $0.50 per 1000 tokens
            output: 0.00150,  // $1.50 per 1000 tokens
            unit: 'tokens'
          }
        },
        'anthropic/claude-3-7-sonnet': {
          provider: 'anthropic',
          model: 'claude-3-7-sonnet',
          versionId: 'claude-3-7-sonnet-20250219',
          releaseDate: '2025-02-19',
          pricing: {
            input: 0.00045,   // $0.45 per 1000 tokens
            output: 0.00145,  // $1.45 per 1000 tokens
            unit: 'tokens'
          }
        },
        'google/gemini-2.5-pro-preview-05-06': {
          provider: 'google',
          model: 'gemini-2.5-pro-preview-05-06',
          versionId: 'gemini-2.5-pro-preview-05-06-20250506',
          releaseDate: '2025-05-06',
          pricing: {
            input: 0.00035,   // $0.35 per 1000 tokens
            output: 0.00105,  // $1.05 per 1000 tokens
            unit: 'tokens'
          }
        },
        'deepseek/deepseek-coder': {
          provider: 'deepseek',
          model: 'deepseek-coder',
          versionId: '1.5-instruct-20250420',
          releaseDate: '2025-04-20',
          pricing: {
            input: 0.00025,   // $0.25 per 1000 tokens
            output: 0.00075,  // $0.75 per 1000 tokens
            unit: 'tokens'
          }
        }
      };
    },
    getVersionMap: () => {
      return {
        timestamp: new Date().toISOString(),
        versions: [
          {
            provider: 'openai',
            model: 'gpt-4o',
            versionId: ''
          },
          {
            provider: 'anthropic',
            model: 'claude-3-7-sonnet',
            versionId: 'claude-3-7-sonnet-20250219'
          },
          {
            provider: 'google',
            model: 'gemini-2.5-pro-preview-05-06',
            versionId: 'gemini-2.5-pro-preview-05-06-20250506'
          },
          {
            provider: 'deepseek',
            model: 'deepseek-coder',
            versionId: '1.5-instruct-20250420'
          }
        ]
      };
    },
    logger: logger
  };
  
  logger.info('ModelVersionSync initialized');
  
  // Initialize real ModelConfigStore with Supabase connection
  const { ModelConfigStore } = require('../../dist/services/model-selection/ModelConfigStore');
  
  // Get Supabase credentials from environment
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set as environment variables');
  }
  
  // Create real ModelConfigStore
  const configStore = new ModelConfigStore(
    logger,
    supabaseUrl,
    supabaseKey
  );
  
  // Initialize the store
  await configStore.init();
  
  logger.info('Initialized real ModelConfigStore with Supabase');
  
  // Initialize the calibration service with the proper parameters
  const calibrationService = new RepositoryCalibrationService(
    logger,
    deepWikiClient,
    configStore
  );
  
  return { calibrationService, modelVersionSync };
}

// Run calibration for a single repository
async function calibrateRepository(calibrationService, repository, progressCallback, modelVersionSync) {
  logger.info(`Starting calibration for ${repository.owner}/${repository.repo}`);
  
  try {
    // Check if we should do a quick test run
    const quickTest = process.env.QUICK_TEST === 'true';
    
    // Create calibration options based on mode
    const calibrationType = quickTest ? 'quick' : 'full';
    const providers = quickTest 
      ? ['openai'] // Only test one provider in quick mode
      : ['openai', 'anthropic', 'google', 'deepseek'];
    const runsPerModel = quickTest ? 1 : 2;
    const timeout = quickTest ? 60 : 240; // seconds
    
    // Create a wrapper around the calibration service to track progress
    const originalRunCalibrationTest = calibrationService.runCalibrationTest.bind(calibrationService);
    
    calibrationService.runCalibrationTest = async function(repo, modelConfig, timeoutValue) {
      try {
        const result = await originalRunCalibrationTest(repo, modelConfig, timeoutValue);
        
        // Add quality score to result if response has quality score
        if (result && !result.qualityScore && result.rawResponse?.metadata?.quality_score) {
          result.qualityScore = result.rawResponse.metadata.quality_score;
          logger.info(`Added quality score to calibration result: ${result.qualityScore}`);
        }
        
        // Add cost estimation based on token counts and pricing data
        if (result && !result.costEstimate) {
          // Get pricing info from model version
          const modelKey = `${modelConfig.provider}/${modelConfig.model}`;
          const activeVersions = modelVersionSync.getActiveModelVersions();
          const modelPricing = activeVersions[modelKey]?.pricing;
          
          if (modelPricing) {
            // Get token counts from the response (or use defaults)
            const inputTokens = result.rawResponse?.usage?.prompt_tokens || 1000;
            const outputTokens = result.rawResponse?.usage?.completion_tokens || 200;
            
            // Calculate cost estimate
            const inputCost = inputTokens * modelPricing.input;
            const outputCost = outputTokens * modelPricing.output;
            const totalCost = inputCost + outputCost;
            
            result.costEstimate = {
              inputCost,
              outputCost,
              totalCost,
              inputTokens,
              outputTokens,
              pricePerInputToken: modelPricing.input,
              pricePerOutputToken: modelPricing.output
            };
            
            logger.info(`Added cost estimation to calibration result: $${totalCost.toFixed(6)}`);
          }
        }
        
        if (progressCallback) progressCallback();
        return result;
      } catch (error) {
        // Enhance error handling, especially for API errors
        let errorMessage = error.message || 'Unknown error';
        let statusCode = null;
        
        // Check if this is an Axios error with a status code
        if (error.isAxiosError && error.response) {
          statusCode = error.response.status;
          errorMessage = `API error (${statusCode}): ${error.response.statusText || 'Unknown error'}`;
          
          // Special handling for common error codes
          if (statusCode === 500) {
            errorMessage = `Server error (500): The DeepWiki API server encountered an internal error. This is likely an issue with the ${modelConfig.provider}/${modelConfig.model} model configuration.`;
            logger.error(`DeepWiki API 500 error with ${modelConfig.provider}/${modelConfig.model}`, {
              repository: `${repo.owner}/${repo.repo}`,
              statusCode,
              provider: modelConfig.provider,
              model: modelConfig.model
            });
          } else if (statusCode === 401 || statusCode === 403) {
            errorMessage = `Authentication error (${statusCode}): Check your API keys and permissions.`;
          } else if (statusCode === 404) {
            errorMessage = `Not found (404): The requested endpoint or resource was not found.`;
          } else if (statusCode >= 400 && statusCode < 500) {
            errorMessage = `Client error (${statusCode}): ${error.response.statusText || 'The request was invalid or could not be processed'}.`;
          }
        }
        
        // Log the enhanced error and continue tracking progress
        logger.error(`Calibration test error for ${modelConfig.provider}/${modelConfig.model}`, {
          repository: `${repo.owner}/${repo.repo}`,
          statusCode,
          error: errorMessage
        });
        
        if (progressCallback) progressCallback();
        
        // Return a failed test result instead of throwing
        return {
          modelConfig,
          responseTime: 0,
          responseSize: 0,
          error: errorMessage,
          timestamp: new Date().toISOString()
        };
      }
    };
    
    // Add our custom calibration algorithm that takes quality and cost into account
    const originalSelectBestModel = calibrationService.selectBestModel?.bind(calibrationService);
    if (originalSelectBestModel) {
      calibrationService.selectBestModel = function(results) {
        // If only one result, return it
        if (results.length === 1) {
          return results[0];
        }
        
        // Calculate a combined score for each model that factors in:
        // 1. Response time (faster is better)
        // 2. Quality score (higher is better)
        // 3. Cost (lower is better)
        const scoredResults = results.map(result => {
          const responseTimeScore = 1 / (result.responseTime || 1); // Faster is better
          const qualityScore = result.qualityScore || 0.5; // Higher is better
          const costScore = result.costEstimate ? (1 / (result.costEstimate.totalCost * 10000 || 1)) : 0; // Lower cost is better
          
          // Weight the factors according to business requirements:
          // 50% quality, 35% price, 15% response time
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
        
        // Store detailed metrics for all models tested
        const comparisonReport = {
      repository: results && results.length > 0 && results[0].repository ? results[0].repository : 'unknown-repo',
      language: results && results.length > 0 && results[0].repository && results[0].repository.language ? results[0].repository.language : 'unknown',
      sizeCategory: results && results.length > 0 && results[0].repository && results[0].repository.sizeBytes ? 
        (results[0].repository.sizeBytes > 100000000 ? 'large' : results[0].repository.sizeBytes > 10000000 ? 'medium' : 'small') : 'unknown',
      timestamp: new Date().toISOString(),
      selectedModel: `${scoredResults[0].modelConfig.provider}/${scoredResults[0].modelConfig.model}`,
      models: scoredResults.map(result => ({
        provider: result.modelConfig.provider,
        model: result.modelConfig.model,
        metrics: {
          weightedScore: parseFloat(result.weightedScore.toFixed(4)),
          qualityScore: parseFloat((result.qualityScore || 0).toFixed(4)),
          responseTime: parseFloat(result.responseTime.toFixed(2)),
          cost: parseFloat((result.costEstimate?.totalCost || 0).toFixed(6)),
          scoreBreakdown: {
            qualityComponent: parseFloat(((result.qualityScore || 0.5) * 0.5).toFixed(4)),
            costComponent: parseFloat(((result.costEstimate ? (1 / (result.costEstimate.totalCost * 10000 || 1)) : 0) * 0.35).toFixed(4)),
            speedComponent: parseFloat(((1 / (result.responseTime || 1)) * 0.15).toFixed(4))
          }
        }
      }))
    };
    
        // Log the detailed comparison report
        logger.info(`Model comparison report for ${comparisonReport.repository}`, { 
          comparisonReport: JSON.stringify(comparisonReport, null, 2) 
        });
        
        // Log the selected model
        logger.info(`Selected best model: ${scoredResults[0].modelConfig.provider}/${scoredResults[0].modelConfig.model}`, {
          score: scoredResults[0].weightedScore,
          qualityScore: scoredResults[0].qualityScore,
          responseTime: scoredResults[0].responseTime,
          cost: scoredResults[0].costEstimate?.totalCost
        });
        
        // Try to save the comparison report to files (JSON and CSV for analysis)
        try {
          const fs = require('fs');
          const path = require('path');
          const reportsDir = path.join(__dirname, 'calibration-reports');
          
          // Create reports directory if it doesn't exist
          if (!fs.existsSync(reportsDir)) {
            fs.mkdirSync(reportsDir, { recursive: true });
          }
          
          // Create a file name based on repository and timestamp
          const repoName = typeof comparisonReport.repository === 'string' ? 
            comparisonReport.repository : 
            (comparisonReport.repository && comparisonReport.repository.owner && comparisonReport.repository.repo) ? 
              `${comparisonReport.repository.owner}-${comparisonReport.repository.repo}` : 'unknown-repo';
          
          const timestamp = Date.now();
          const jsonFileName = `${repoName.replace(/\//g, '-')}-${timestamp}.json`;
          const csvFileName = `${repoName.replace(/\//g, '-')}-${timestamp}.csv`;
          const jsonFilePath = path.join(reportsDir, jsonFileName);
          const csvFilePath = path.join(reportsDir, csvFileName);
          
          // Write the JSON report
          fs.writeFileSync(jsonFilePath, JSON.stringify(comparisonReport, null, 2));
          logger.info(`Saved JSON comparison report to ${jsonFilePath}`);
          
          // Write the CSV report with all raw data for spreadsheet analysis
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
          
          const csvRows = comparisonReport.models.map(model => {
            const rawQualityValue = model.metrics.qualityScore || 0.5;
            const rawCostValue = model.metrics.cost || 0;
            const rawSpeedValue = model.metrics.responseTime || 1;
            
            return [
              comparisonReport.repository,
              comparisonReport.language,
              comparisonReport.sizeCategory,
              model.provider,
              model.model,
              model.metrics.weightedScore,
              rawQualityValue,
              rawSpeedValue,
              rawCostValue,
              rawQualityValue,
              rawCostValue,
              rawSpeedValue,
              comparisonReport.timestamp
            ].join(',');
          });
          
          const csvContent = [csvHeader, ...csvRows].join('\n');
          fs.writeFileSync(csvFilePath, csvContent);
          logger.info(`Saved CSV raw data report to ${csvFilePath}`);
          
          // Write an all-models CSV file that gets appended to over time
          const allModelsPath = path.join(reportsDir, 'all-models-data.csv');
          const fileExists = fs.existsSync(allModelsPath);
          
          // If file doesn't exist, create it with headers
          if (!fileExists) {
            fs.writeFileSync(allModelsPath, csvHeader + '\n');
          }
          
          // Append data to the all-models file
          fs.appendFileSync(allModelsPath, csvRows.join('\n') + '\n');
          logger.info(`Appended data to cumulative report: ${allModelsPath}`);
          
        } catch (error) {
          logger.warn(`Failed to save comparison reports: ${error.message}`);
        }
        
        return scoredResults[0];
      };
      
      logger.info('Enhanced model selection algorithm installed with quality and cost factors');
    }
    
    const result = await calibrationService.calibrateRepository(
      repository,
      {
        requiresCalibration: true,
        calibrationType,
        estimatedCalibrationTime: quickTest ? 5 : 30, // minutes
        selectedConfig: null,
        temporaryConfig: null
      },
      {
        providers,
        runsPerModel,
        evaluateQuality: true,
        timeout,
        updateConfig: true
      }
    );
    
    logger.info(`Calibration completed for ${repository.owner}/${repository.repo}`, {
      recommendedModel: `${result.recommendedConfig.provider}/${result.recommendedConfig.model}`
    });
    
    return result;
  } catch (error) {
    logger.error(`Error calibrating ${repository.owner}/${repository.repo}`, error);
    return null;
  }
}

// Run calibration for all repositories
async function runCalibration() {
  logger.info('Starting calibration process');
  
  try {
    const { calibrationService, modelVersionSync } = await initServices();
    
    // Get active versions
    const activeVersions = modelVersionSync.getActiveModelVersions();
    logger.info('Active model versions', { count: Object.keys(activeVersions).length });
    
    // Define total work units for progress tracking
    const isQuickTest = process.env.QUICK_TEST === 'true';
    const simulateRealDelay = process.env.SIMULATE_REAL_DELAY === 'true';
    
    // Get providers to test and handle skipping providers
    let providers = isQuickTest ? ['openai'] : ['openai', 'anthropic', 'google', 'deepseek'];
    
    // Check if we should skip any providers
    if (process.env.SKIP_PROVIDERS) {
      const skipProviders = process.env.SKIP_PROVIDERS.split(',').map(p => p.trim().toLowerCase());
      logger.info(`Skipping providers: ${skipProviders.join(', ')}`);
      providers = providers.filter(p => !skipProviders.includes(p.toLowerCase()));
      logger.info(`Testing providers: ${providers.join(', ')}`);
    }
    
    const runsPerModel = isQuickTest ? 1 : 2;
    const repoCount = CALIBRATION_REPOSITORIES.length;
    
    // Calculate total number of tests to run
    const totalTests = repoCount * providers.length * runsPerModel;
    let completedTests = 0;
    const startTime = Date.now();
    
    // Estimate total runtime
    const avgTestTime = simulateRealDelay ? 60 : 2; // seconds per test
    const totalEstimatedSeconds = totalTests * avgTestTime;
    const estimatedHours = Math.floor(totalEstimatedSeconds / 3600);
    const estimatedMinutes = Math.floor((totalEstimatedSeconds % 3600) / 60);
    
    // Show calibration plan
    console.log('\nCalibration Plan:');
    console.log('===================');
    console.log(`Repositories: ${repoCount}`);
    console.log(`Providers: ${providers.length} (${providers.join(', ')})`);
    console.log(`Runs per model: ${runsPerModel}`);
    console.log(`Total tests: ${totalTests}`);
    console.log(`Estimated time: ${estimatedHours > 0 ? estimatedHours + 'h ' : ''}${estimatedMinutes}m`);
    console.log('===================\n');
    
    // Set up progress display interval
    const progressInterval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000; // seconds
      const percentComplete = Math.round((completedTests / totalTests) * 100);
      const testsRemaining = totalTests - completedTests;
      
      // Calculate average time per test based on completed tests
      const avgTimePerTest = completedTests > 0 ? elapsed / completedTests : 0;
      
      // Estimate remaining time
      const estimatedRemainingSeconds = avgTimePerTest * testsRemaining;
      const remainingMinutes = Math.floor(estimatedRemainingSeconds / 60);
      const remainingSeconds = Math.floor(estimatedRemainingSeconds % 60);
      
      console.log(`Calibration Progress: ${percentComplete}% complete | ${completedTests}/${totalTests} tests | Est. remaining: ${remainingMinutes}m ${remainingSeconds}s`);
    }, 10000); // Update every 10 seconds
    
    // Generate a new run ID for this calibration
    const runId = `full-${Date.now()}`;
    
    // Import the real CalibrationModel
    const { CalibrationModel } = require('../../../database/dist/models/calibration');
    
    // Store calibration run
    await CalibrationModel.storeCalibrationRun(
      runId,
      modelVersionSync.getVersionMap(),
      [] // Will be populated with results
    );
    
    const results = [];
    
    // Run calibration for each repository
    for (const repository of CALIBRATION_REPOSITORIES) {
      // Update progress counter for a single repository calibration
      // We'll increment completedTests when each test finishes
      const trackProgressCallback = () => {
        completedTests++;
      };
      
      const result = await calibrateRepository(calibrationService, repository, trackProgressCallback, modelVersionSync);
      if (result) {
        // Determine size category
        const sizeCategory = 
          repository.language === 'javascript' && repository.sizeBytes > 100000000 ? 'large' :
          repository.language === 'typescript' && repository.sizeBytes > 50000000 ? 'medium' : 'small';
        
        try {
          // Store test result in the database
          await CalibrationModel.storeTestResult(
            runId,
            `${repository.owner}/${repository.repo}`, // Repository ID
            sizeCategory,
            [repository.language],
            'standard', // Default architecture
            result.results
          );
          
          logger.info(`Stored calibration results for ${repository.owner}/${repository.repo}`, {
            runId,
            language: repository.language,
            sizeCategory
          });
        } catch (error) {
          logger.error(`Failed to store calibration results for ${repository.owner}/${repository.repo}`, {
            error: error.message || error
          });
        }
        
        results.push({
          repository: `${repository.owner}/${repository.repo}`,
          language: repository.language,
          recommendedConfig: result.recommendedConfig
        });
      }
    }
    
    // Print summary
    logger.info('Calibration process completed', { results });
    
    console.log('\nCalibration Results Summary:');
    console.log('=============================');
    
    for (const result of results) {
      console.log(`${result.repository} (${result.language}): ${result.recommendedConfig.provider}/${result.recommendedConfig.model}`);
    }
    
    // Clear progress interval when done
    clearInterval(progressInterval);
    
    // Show final progress
    console.log(`Calibration complete: 100% | ${totalTests}/${totalTests} tests | Total time: ${Math.round((Date.now() - startTime) / 60000)}m`);
    
    return true;
  } catch (error) {
    // Progress interval is defined within the try block, so it's not accessible here
    // No need to clear it as it will be automatically cleaned up when the process exits
    
    logger.error('Error running calibration process', error);
    return false;
  }
}

// Execute calibration process
runCalibration()
  .then((success) => {
    if (success) {
      console.log('\nCalibration process completed successfully!');
    } else {
      console.error('\nCalibration process failed.');
    }
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });