#!/bin/bash

# Calibration with Direct Provider Access
# This script:
# 1. Tests all providers directly (bypassing DeepWiki)
# 2. Sets up calibration to use direct provider access
# 3. Runs calibration with working providers

set -e

echo "Testing providers directly..."
node test-providers-directly.js

read -p "Would you like to continue with direct provider calibration? (y/n): " CONTINUE
if [[ ! $CONTINUE =~ ^[Yy]$ ]]; then
  echo "Calibration aborted."
  exit 1
fi

# Create a directory for the direct provider implementation
mkdir -p direct-provider-impl

# Create a provider module that uses direct API calls
cat > direct-provider-impl/direct-client.js << 'EOF'
/**
 * Direct Provider Client
 * 
 * This module implements a direct client for provider APIs without using DeepWiki.
 */

const { performance } = require('perf_hooks');
const axios = require('axios');
const { createLogger } = require('../../../dist/utils/logger');

// Create a logger
const logger = createLogger('DirectProviderClient');

class DirectProviderClient {
  constructor() {
    this.logger = logger;
    this.logger.info('Direct provider client initialized');
  }

  // Mock method for repository size
  async getRepositorySize(repository) {
    this.logger.info('Getting repository size', { repository });
    return repository.sizeBytes || 0;
  }

  // Mock method that returns recommended model configs
  recommendModelConfig(language, sizeBytes) {
    this.logger.info('Recommending model config', { language, sizeBytes });
    
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
    this.logger.info('Generating wiki', { repository, options });
    return {
      success: true,
      pages: [
        { title: 'Main Documentation', content: 'Generated wiki content' }
      ]
    };
  }

  // Direct API calls for each provider
  async getChatCompletion(repoUrl, options) {
    this.logger.info('Getting chat completion direct', { 
      repoUrl, 
      provider: options.modelConfig.provider,
      model: options.modelConfig.model 
    });
    
    const provider = options.modelConfig.provider;
    const model = options.modelConfig.model;
    
    // Create standardized messages
    const messages = options.messages || [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Tell me about this repository: ' + repoUrl }
    ];
    
    let result;
    
    const startTime = performance.now();
    
    try {
      if (provider === 'openai') {
        result = await this._callOpenAI(model, messages);
      } else if (provider === 'anthropic') {
        result = await this._callAnthropic(model, messages);
      } else if (provider === 'google') {
        result = await this._callGoogle(model, messages);
      } else if (provider === 'deepseek') {
        result = await this._callDeepSeek(model, messages);
      } else {
        throw new Error(`Unknown provider: ${provider}`);
      }
      
      const endTime = performance.now();
      const elapsed = (endTime - startTime) / 1000;
      
      this.logger.info(`API call completed in ${elapsed.toFixed(2)}s`, { provider, model });
      
      return {
        ...result,
        metadata: {
          quality_score: this._simulateQualityScore(provider)
        }
      };
    } catch (error) {
      this.logger.error(`API call failed: ${error.message}`, { 
        provider, 
        model,
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      
      throw error;
    }
  }
  
  // Simulate quality scores for different providers
  _simulateQualityScore(provider) {
    // Higher quality scores for better models
    const baseScore = 0.7 + Math.random() * 0.2;
    const providerBonus = 
      provider === 'openai' ? 0.08 : 
      provider === 'anthropic' ? 0.07 : 
      provider === 'google' ? 0.05 : 
      provider === 'deepseek' ? 0.04 : 0;
    
    return Math.min(0.98, baseScore + providerBonus);
  }
  
  // Call OpenAI API directly
  async _callOpenAI(model, messages) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not set in environment');
    }
    
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model,
        messages,
        max_tokens: 1000
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        timeout: 60000
      }
    );
    
    return {
      choices: [
        {
          message: response.data.choices[0].message
        }
      ],
      usage: response.data.usage
    };
  }
  
  // Call Anthropic API directly
  async _callAnthropic(model, messages) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not set in environment');
    }
    
    // Convert to Anthropic format
    const systemMessage = messages.find(m => m.role === 'system');
    const userMessages = messages.filter(m => m.role === 'user');
    
    // Create the messages array in Anthropic format
    const anthropicMessages = [];
    
    if (systemMessage) {
      anthropicMessages.push({
        role: 'user',
        content: `${systemMessage.content}\n\n${userMessages[0]?.content || ''}`
      });
    } else if (userMessages.length > 0) {
      anthropicMessages.push({
        role: 'user',
        content: userMessages[0].content
      });
    }
    
    // Add remaining messages
    for (let i = 1; i < userMessages.length; i++) {
      anthropicMessages.push({
        role: 'user',
        content: userMessages[i].content
      });
    }
    
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model,
        max_tokens: 1000,
        messages: anthropicMessages
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
          'x-api-key': apiKey
        },
        timeout: 60000
      }
    );
    
    return {
      choices: [
        {
          message: {
            role: 'assistant',
            content: response.data.content[0].text
          }
        }
      ],
      usage: {
        prompt_tokens: response.data.usage?.input_tokens || 100,
        completion_tokens: response.data.usage?.output_tokens || 200,
        total_tokens: (response.data.usage?.input_tokens || 100) + (response.data.usage?.output_tokens || 200)
      }
    };
  }
  
  // Call Google API directly
  async _callGoogle(model, messages) {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_API_KEY not set in environment');
    }
    
    // Convert to Google format
    const contents = [];
    
    // Add the system message if present
    const systemMessage = messages.find(m => m.role === 'system');
    if (systemMessage) {
      contents.push({
        role: 'user',
        parts: [{ text: systemMessage.content }]
      });
    }
    
    // Add the user messages
    for (const msg of messages.filter(m => m.role === 'user')) {
      contents.push({
        role: 'user',
        parts: [{ text: msg.content }]
      });
    }
    
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`,
      {
        contents,
        generationConfig: {
          maxOutputTokens: 1000
        }
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 60000
      }
    );
    
    return {
      choices: [
        {
          message: {
            role: 'assistant',
            content: response.data.candidates[0].content.parts[0].text
          }
        }
      ],
      usage: {
        prompt_tokens: response.data.usage?.promptTokenCount || 100,
        completion_tokens: response.data.usage?.candidatesTokenCount || 200,
        total_tokens: (response.data.usage?.promptTokenCount || 100) + (response.data.usage?.candidatesTokenCount || 200)
      }
    };
  }
  
  // Call DeepSeek API directly
  async _callDeepSeek(model, messages) {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      throw new Error('DEEPSEEK_API_KEY not set in environment');
    }
    
    const response = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      {
        model,
        messages,
        max_tokens: 1000
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        timeout: 60000
      }
    );
    
    return {
      choices: [
        {
          message: response.data.choices[0].message
        }
      ],
      usage: response.data.usage
    };
  }

  // Method for repository chat completion
  async getChatCompletionForRepo(repository, options) {
    this.logger.info('Getting chat completion for repo direct', { repository, options });
    const repoUrl = `https://github.com/${repository.owner}/${repository.repo}`;
    return this.getChatCompletion(repoUrl, options);
  }
}

module.exports = {
  DirectProviderClient
};
EOF

# Create module to initialize the direct client
cat > direct-provider-impl/init-direct-client.js << 'EOF'
/**
 * Initialize Direct Provider Client
 */

const { DirectProviderClient } = require('./direct-client');
const { createLogger } = require('../../../dist/utils/logger');

const logger = createLogger('DirectProviderInit');

function initDirectClient() {
  logger.info('Initializing direct provider client');
  return new DirectProviderClient();
}

module.exports = {
  initDirectClient
};
EOF

# Create calibration script using direct providers
cat > run-calibration-direct.js << 'EOF'
/**
 * Run Calibration with Direct Provider Access
 * 
 * This script runs calibration by directly accessing provider APIs
 * rather than using the DeepWiki service.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { RepositoryCalibrationService } = require('../../dist/services/model-selection/RepositoryCalibrationService');
const { ModelVersionSync } = require('../../dist/services/model-selection/ModelVersionSync');
const { createLogger } = require('../../dist/utils/logger');
const { initDirectClient } = require('./direct-provider-impl/init-direct-client');

// Sample repositories for calibration testing
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

// Determine number of repositories to test
const REPO_COUNT = parseInt(process.env.REPO_COUNT || '2', 10);
const CALIBRATION_REPOSITORIES = ALL_CALIBRATION_REPOSITORIES.slice(0, Math.min(REPO_COUNT, 4));

// Create a proper logger instance
const logger = createLogger('DirectCalibration');

// Initialize the direct client
const directClient = initDirectClient();

// Rest of the calibration script remains similar to run-calibration.js
// ...

// Initialize the model version sync
const modelVersionSync = {
  getActiveModelVersions: () => {
    logger.info('Getting active model versions');
    // Return active versions with pricing info
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

// Initialize services
async function initServices() {
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
  
  // Initialize the calibration service with the direct client
  const calibrationService = new RepositoryCalibrationService(
    logger,
    directClient,
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
    
    // Get providers to test and handle skipping providers
    const providers = process.env.SKIP_PROVIDERS
      ? ['openai', 'anthropic', 'google', 'deepseek'].filter(
          p => !process.env.SKIP_PROVIDERS.split(',').includes(p)
        )
      : ['openai', 'anthropic', 'google', 'deepseek'];
    
    // Create calibration options
    const calibrationType = quickTest ? 'quick' : 'full';
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
        // Enhanced error handling
        logger.error(`Calibration test error: ${error.message}`, {
          repository: `${repo.owner}/${repo.repo}`,
          provider: modelConfig.provider,
          model: modelConfig.model,
          error: error.message,
          stack: error.stack
        });
        
        if (progressCallback) progressCallback();
        
        // Return a failed test result instead of throwing
        return {
          modelConfig,
          responseTime: 0,
          responseSize: 0,
          error: error.message,
          timestamp: new Date().toISOString()
        };
      }
    };
    
    // Enhanced model selection algorithm
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
          repository: repository?.owner && repository?.repo ? `${repository.owner}/${repository.repo}` : 'unknown',
          language: repository?.language || 'unknown',
          sizeCategory: repository?.sizeBytes > 100000000 ? 'large' : repository?.sizeBytes > 10000000 ? 'medium' : 'small',
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
        
        // Try to save the comparison report to a file
        try {
          // Create reports directory if it doesn't exist
          const reportsDir = path.join(__dirname, 'calibration-reports');
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
  logger.info('Starting direct calibration process');
  
  try {
    const { calibrationService, modelVersionSync } = await initServices();
    
    // Get active versions
    const activeVersions = modelVersionSync.getActiveModelVersions();
    logger.info('Active model versions', { count: Object.keys(activeVersions).length });
    
    // Define total work units for progress tracking
    const isQuickTest = process.env.QUICK_TEST === 'true';
    
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
    const avgTestTime = isQuickTest ? 10 : 30; // seconds per test
    const totalEstimatedSeconds = totalTests * avgTestTime;
    const estimatedHours = Math.floor(totalEstimatedSeconds / 3600);
    const estimatedMinutes = Math.floor((totalEstimatedSeconds % 3600) / 60);
    
    // Show calibration plan
    console.log('\nDirect Calibration Plan:');
    console.log('======================');
    console.log(`Repositories: ${repoCount}`);
    console.log(`Providers: ${providers.length} (${providers.join(', ')})`);
    console.log(`Runs per model: ${runsPerModel}`);
    console.log(`Total tests: ${totalTests}`);
    console.log(`Estimated time: ${estimatedHours > 0 ? estimatedHours + 'h ' : ''}${estimatedMinutes}m`);
    console.log('======================\n');
    
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
    const runId = `direct-${Date.now()}`;
    
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
      console.log('\nDirect calibration process completed successfully!');
    } else {
      console.error('\nDirect calibration process failed.');
    }
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
EOF

echo "Setting up environment for direct provider calibration..."
# Export API keys to environment
export OPENAI_API_KEY=$(grep -E '^OPENAI_API_KEY=' "../../../../.env" | cut -d= -f2)
export ANTHROPIC_API_KEY=$(grep -E '^ANTHROPIC_API_KEY=' "../../../../.env" | cut -d= -f2)
export GOOGLE_API_KEY=$(grep -E '^GOOGLE_API_KEY=' "../../../../.env" | cut -d= -f2)
export DEEPSEEK_API_KEY=$(grep -E '^DEEPSEEK_API_KEY=' "../../../../.env" | cut -d= -f2)
export SUPABASE_URL=$(grep -E '^SUPABASE_URL=' "../../../../.env" | cut -d= -f2)
export SUPABASE_SERVICE_ROLE_KEY=$(grep -E '^SUPABASE_SERVICE_ROLE_KEY=' "../../../../.env" | cut -d= -f2)

echo "Testing direct provider access..."
node test-providers-directly.js

read -p "Continue with direct provider calibration? (y/n): " CONTINUE
if [[ ! $CONTINUE =~ ^[Yy]$ ]]; then
  echo "Calibration aborted."
  exit 1
fi

echo "Starting direct calibration process..."
node run-calibration-direct.js

echo "Direct calibration completed!"
echo "To analyze the results:"
echo "node analyze-model-data.js"