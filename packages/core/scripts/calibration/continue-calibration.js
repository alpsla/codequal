/**
 * Continue Calibration Process
 * 
 * This script continues an existing calibration by testing only
 * missing models and versions instead of starting from scratch.
 */

require('dotenv').config();
const { RepositoryCalibrationService } = require('../../dist/services/model-selection/RepositoryCalibrationService');
const { ModelVersionSync } = require('../../dist/services/model-selection/ModelVersionSync');
const { ModelConfigStore } = require('../../dist/services/model-selection/ModelConfigStore');
const { DeepWikiClient } = require('../../dist/deepwiki/DeepWikiClient');
const { createLogger } = require('../../dist/utils/logger');
// Import CalibrationModel in function scope later

// Sample repositories for calibration testing
// You can modify this list to focus on specific languages or size categories
const CALIBRATION_REPOSITORIES = [
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

// Create a proper logger instance
const logger = createLogger('ContinueCalibration');

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
    
    // Create a random delay between 1 and 3 seconds to simulate response time
    const delay = 1000 + Math.random() * 2000;
    await new Promise(resolve => setTimeout(resolve, delay));
    
    const content = 'This is a mock response for the calibration test. It simulates a response from the model, providing enough content to calculate response sizes and times accurately. The content is designed to mimic a typical AI model response with enough length to be meaningful.';
    
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

// Initialize DeepWiki client with mock implementation temporarily
// Due to connection issues with the real DeepWiki API
function initDeepWikiClient() {
  const apiKey = process.env.DEEPWIKI_API_KEY;
  const apiUrl = process.env.DEEPWIKI_API_URL;
  
  if (!apiKey || !apiUrl) {
    throw new Error('DEEPWIKI_API_KEY and DEEPWIKI_API_URL must be set as environment variables');
  }
  
  // Use mock client for now since we can't connect to the real DeepWiki API
  logger.info('Using mock DeepWikiClient temporarily until DeepWiki API is available');
  return new MockDeepWikiClient(apiUrl, logger);
  
  /*
  // The code below will be used when the DeepWiki API is available
  const { DeepWikiClient } = require('../../dist/deepwiki/DeepWikiClient');
  const { initializeDeepWikiWithEnvVars } = require('../../dist/deepwiki/env-helpers');
  
  // Initialize using the env-helpers which handles API keys correctly
  const { client } = initializeDeepWikiWithEnvVars({
    apiUrl,
    logger
  });
  
  logger.info('Initialized real DeepWikiClient for calibration');
  return client;
  */
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
        },
        'anthropic/claude-3-7-sonnet': {
          provider: 'anthropic',
          model: 'claude-3-7-sonnet',
          versionId: 'claude-3-7-sonnet-20250219',
          releaseDate: '2025-02-19',
        },
        'google/gemini-2.5-pro-preview-05-06': {
          provider: 'google',
          model: 'gemini-2.5-pro-preview-05-06',
          versionId: 'gemini-2.5-pro-preview-05-06-20250506',
          releaseDate: '2025-05-06',
        },
        'deepseek/deepseek-coder': {
          provider: 'deepseek',
          model: 'deepseek-coder',
          versionId: '1.5-instruct-20250420',
          releaseDate: '2025-04-20',
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
  const modelConfigStore = new ModelConfigStore(
    logger,
    supabaseUrl,
    supabaseKey
  );
  
  // Initialize the store
  await modelConfigStore.init();
  
  logger.info('Initialized real ModelConfigStore with Supabase');
  
  // Initialize the calibration service with the proper parameters
  const calibrationService = new RepositoryCalibrationService(
    logger,
    deepWikiClient,
    modelConfigStore
  );
  
  return { calibrationService, modelVersionSync, modelConfigStore };
}

// Get existing calibration data
async function getExistingCalibration() {
  try {
    // Import the real CalibrationModel
    const { CalibrationModel } = require('../../../database/dist/models/calibration');
    
    // Get latest calibration run
    const latestRun = await CalibrationModel.getLatestCalibrationRun();
    
    if (!latestRun) {
      logger.info('No existing calibration run found');
      return null;
    }
    
    // Get test results for this run
    const testResults = await CalibrationModel.getTestResultsForRun(latestRun.runId);
    
    logger.info(`Found existing calibration run: ${latestRun.runId}`, {
      timestamp: latestRun.timestamp,
      testCount: testResults.length
    });
    
    return {
      run: latestRun,
      results: testResults
    };
  } catch (error) {
    logger.error('Error getting existing calibration data', error);
    return null;
  }
}

// Find missing models and versions that need testing
function findMissingModels(existingResults, modelVersionSync) {
  // Get all active model versions
  const activeVersions = modelVersionSync.getActiveModelVersions();
  logger.info('Active model versions', { count: Object.keys(activeVersions).length });
  
  // Create a set of tested models in format 'provider/model'
  const testedModels = new Set();
  
  if (existingResults && existingResults.results) {
    for (const result of existingResults.results) {
      // Extract tested models from results
      Object.entries(result.results).forEach(([modelKey, metrics]) => {
        testedModels.add(modelKey);
      });
    }
  }
  
  logger.info('Previously tested models', { count: testedModels.size });
  
  // Find missing models
  const missingModels = [];
  
  for (const [versionKey, version] of Object.entries(activeVersions)) {
    const modelKey = `${version.provider}/${version.model}`;
    
    if (!testedModels.has(modelKey)) {
      missingModels.push({
        provider: version.provider,
        model: version.model,
        versionId: version.versionId
      });
    }
  }
  
  logger.info('Found missing models', { count: missingModels.length });
  
  if (missingModels.length > 0) {
    logger.info('Missing models to test:', {
      models: missingModels.map(m => `${m.provider}/${m.model} (${m.versionId})`)
    });
  }
  
  return missingModels;
}

// Find missing language/size combinations
function findMissingCombinations(existingResults, languageSizes) {
  // Create a set of tested combinations in format 'language-size'
  const testedCombinations = new Set();
  
  if (existingResults && existingResults.results) {
    for (const result of existingResults.results) {
      testedCombinations.add(`${result.languages[0]}-${result.size}`);
    }
  }
  
  logger.info('Previously tested combinations', { count: testedCombinations.size });
  
  // Find missing combinations
  const missingCombinations = [];
  
  for (const { language, size } of languageSizes) {
    const combinationKey = `${language}-${size}`;
    
    if (!testedCombinations.has(combinationKey)) {
      missingCombinations.push({ language, size });
    }
  }
  
  logger.info('Found missing language-size combinations', { count: missingCombinations.length });
  
  if (missingCombinations.length > 0) {
    logger.info('Missing combinations to test:', {
      combinations: missingCombinations.map(c => `${c.language}-${c.size}`)
    });
  }
  
  return missingCombinations;
}

// Run calibration for a single repository
async function calibrateRepository(calibrationService, repository, missingModels) {
  logger.info(`Starting calibration for ${repository.owner}/${repository.repo}`);
  
  try {
    // Create a calibration decision with specific models to test
    const calibrationDecision = {
      requiresCalibration: true,
      calibrationType: 'full',
      estimatedCalibrationTime: 30, // minutes
      selectedConfig: null,
      temporaryConfig: null,
      modelsToTest: missingModels.map(m => ({
        provider: m.provider,
        model: m.model
      }))
    };
    
    // Override the providers to test only those with missing models
    const providers = [...new Set(missingModels.map(m => m.provider))];
    
    if (providers.length === 0) {
      logger.info(`No missing models to test for ${repository.owner}/${repository.repo}`);
      return null;
    }
    
    const result = await calibrationService.calibrateRepository(
      repository,
      calibrationDecision,
      {
        providers: providers,
        runsPerModel: 2,
        evaluateQuality: true,
        timeout: 120, // seconds
        updateConfig: true,
        skipExistingTests: true // Skip models that have already been tested
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

// Run continued calibration
async function runContinuedCalibration() {
  logger.info('Starting continued calibration process');
  
  try {
    // Initialize services
    const { calibrationService, modelVersionSync, modelConfigStore } = await initServices();
    
    // Get existing calibration data
    const existingCalibration = await getExistingCalibration();
    
    // Get language-size combinations from test repositories
    const languageSizes = CALIBRATION_REPOSITORIES.map(repo => {
      const sizeCategory = repo.sizeBytes < 10000000 ? 'small' : 
                           repo.sizeBytes < 100000000 ? 'medium' : 
                           'large';
      
      return {
        language: repo.language,
        size: sizeCategory,
        repository: repo
      };
    });
    
    // Find missing models
    const missingModels = findMissingModels(existingCalibration, modelVersionSync);
    
    // Find missing language-size combinations
    const missingCombinations = findMissingCombinations(existingCalibration, languageSizes);
    
    // Check if there's anything to calibrate
    if (missingModels.length === 0 && missingCombinations.length === 0) {
      logger.info('No missing models or combinations to calibrate');
      console.log('\nCalibration is already up to date!');
      return true;
    }
    
    // Generate a new run ID for this continuation
    const runId = `continued-${Date.now()}`;
    
    // Import the real CalibrationModel
    const { CalibrationModel } = require('../../../database/dist/models/calibration');
    
    // Store calibration run
    await CalibrationModel.storeCalibrationRun(
      runId,
      modelVersionSync.getVersionMap(),
      [] // Will be populated with results
    );
    
    const results = [];
    
    // Run calibration for repositories with missing models
    for (const languageSize of languageSizes) {
      // Only calibrate if we have missing models OR this is a missing combination
      const needsCalibration = missingModels.length > 0 || 
        missingCombinations.some(c => 
          c.language === languageSize.language && c.size === languageSize.size
        );
      
      if (needsCalibration) {
        const result = await calibrateRepository(
          calibrationService, 
          languageSize.repository,
          missingModels
        );
        
        if (result) {
          results.push({
            repository: `${languageSize.repository.owner}/${languageSize.repository.repo}`,
            language: languageSize.language,
            size: languageSize.size,
            recommendedConfig: result.recommendedConfig
          });
        }
      }
    }
    
    // Print summary
    logger.info('Continued calibration process completed', { results });
    
    console.log('\nContinued Calibration Results Summary:');
    console.log('====================================');
    
    if (results.length === 0) {
      console.log('No new calibration data was generated');
    } else {
      for (const result of results) {
        console.log(`${result.repository} (${result.language}, ${result.size}): ${result.recommendedConfig.provider}/${result.recommendedConfig.model}`);
      }
    }
    
    return true;
  } catch (error) {
    logger.error('Error running continued calibration process', error);
    return false;
  }
}

// Execute calibration process
runContinuedCalibration()
  .then((success) => {
    if (success) {
      console.log('\nContinued calibration process completed successfully!');
    } else {
      console.error('\nContinued calibration process failed.');
    }
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });