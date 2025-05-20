/**
 * Modified Run Calibration For Testing
 * This version forces the calibration to use mocks without requiring Supabase
 */

require('dotenv').config();
const { createLogger } = require('../../dist/utils/logger');

// Sample repositories for calibration testing
const CALIBRATION_REPOSITORIES = [
  {
    owner: 'nodejs',
    repo: 'node',
    repoType: 'github',
    language: 'javascript',
    sizeBytes: 120000000, // ~120 MB
    visibility: 'public'
  }
];

// Create a proper logger instance
const logger = createLogger('CalibrationProcess');

// Create a mock DeepWikiClient
class MockDeepWikiClient {
  constructor(baseUrl, logger) {
    this.baseUrl = baseUrl;
    this.logger = logger;
    this.logger.info('Mock DeepWikiClient initialized', { baseUrl });
  }
  
  async getRepositorySize(repository) {
    this.logger.info('Mock: Getting repository size', { repository });
    return repository.sizeBytes || 0;
  }
  
  recommendModelConfig(language, sizeBytes) {
    this.logger.info('Mock: Recommending model config', { language, sizeBytes });
    return {
      provider: 'openai',
      model: 'gpt-4o'
    };
  }
  
  async generateWiki(repository, options) {
    this.logger.info('Mock: Generating wiki', { repository, options });
    return {
      success: true,
      pages: [{ title: 'Main Documentation', content: 'Mock wiki content' }]
    };
  }
  
  async getChatCompletion(repoUrl, options) {
    this.logger.info('Mock: Getting chat completion', { repoUrl, options });
    
    // Add a short delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      choices: [
        {
          message: {
            role: 'assistant',
            content: 'This is a mock response for the calibration test.'
          }
        }
      ],
      usage: {
        prompt_tokens: 100,
        completion_tokens: 200,
        total_tokens: 300
      },
      metadata: {
        quality_score: 0.9
      }
    };
  }
  
  async getChatCompletionForRepo(repository, options) {
    return this.getChatCompletion(`https://github.com/${repository.owner}/${repository.repo}`, options);
  }
}

// Create mock ModelConfigStore
class MockModelConfigStore {
  constructor() {
    this.logger = logger;
    this.configs = {};
  }
  
  async init() {
    logger.info('Initialized MockModelConfigStore');
    return true;
  }
  
  async storeModelConfig(repoId, language, sizeCategory, config) {
    const key = `${repoId}:${language}:${sizeCategory}`;
    this.configs[key] = config;
    logger.info(`Stored model config for ${key}`, { config });
    return true;
  }
  
  async getModelConfig(repoId, language, sizeCategory) {
    const key = `${repoId}:${language}:${sizeCategory}`;
    return this.configs[key] || null;
  }
  
  async getAllModelConfigs() {
    return Object.entries(this.configs).map(([key, config]) => {
      const [repoId, language, sizeCategory] = key.split(':');
      return {
        repoId,
        language,
        sizeCategory,
        ...config
      };
    });
  }
}

// Mock RepositoryCalibrationService
class MockRepositoryCalibrationService {
  constructor(logger, deepWikiClient, configStore) {
    this.logger = logger;
    this.deepWikiClient = deepWikiClient;
    this.configStore = configStore;
  }
  
  async calibrateRepository(repository, decision, options) {
    this.logger.info(`Mock: Calibrating repository ${repository.owner}/${repository.repo}`);
    
    // Simulate calibration process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Generate a mock recommended config
    const recommendedConfig = {
      provider: 'anthropic',
      model: 'claude-3-7-sonnet',
      score: 0.95,
      responseTime: 2500,
      timestamp: new Date().toISOString()
    };
    
    // Store in mock config store
    await this.configStore.storeModelConfig(
      `${repository.owner}/${repository.repo}`,
      repository.language,
      repository.sizeBytes > 50000000 ? 'large' : 'small',
      recommendedConfig
    );
    
    return {
      repository,
      recommendedConfig,
      results: [
        {
          modelConfig: { provider: 'anthropic', model: 'claude-3-7-sonnet' },
          responseTime: 2500,
          responseSize: 1500,
          qualityScore: 0.95
        },
        {
          modelConfig: { provider: 'openai', model: 'gpt-4o' },
          responseTime: 3000,
          responseSize: 1400,
          qualityScore: 0.92
        },
        {
          modelConfig: { provider: 'google', model: 'gemini-2.5-pro-preview-05-06' },
          responseTime: 4000,
          responseSize: 1200,
          qualityScore: 0.85
        }
      ]
    };
  }
}

// Run calibration with mocks
async function runCalibration() {
  logger.info('Starting mock calibration process');
  
  try {
    // Initialize mock services
    const deepWikiClient = new MockDeepWikiClient('http://localhost:8001', logger);
    const configStore = new MockModelConfigStore();
    await configStore.init();
    
    const calibrationService = new MockRepositoryCalibrationService(
      logger,
      deepWikiClient,
      configStore
    );
    
    const results = [];
    
    // Run calibration for each repository
    for (const repository of CALIBRATION_REPOSITORIES) {
      logger.info(`Calibrating ${repository.owner}/${repository.repo}`);
      
      const result = await calibrationService.calibrateRepository(
        repository,
        {
          requiresCalibration: true,
          calibrationType: 'quick',
          estimatedCalibrationTime: 5
        },
        {
          providers: ['openai', 'anthropic', 'google'],
          runsPerModel: 1,
          evaluateQuality: true,
          timeout: 60,
          updateConfig: true
        }
      );
      
      results.push({
        repository: `${repository.owner}/${repository.repo}`,
        language: repository.language,
        recommendedConfig: result.recommendedConfig
      });
    }
    
    // Print summary
    logger.info('Mock calibration process completed', { results });
    
    console.log('\nMock Calibration Results Summary:');
    console.log('=============================');
    
    for (const result of results) {
      console.log(`${result.repository} (${result.language}): ${result.recommendedConfig.provider}/${result.recommendedConfig.model}`);
    }
    
    console.log('\nAll configurations have been stored in the mock database.');
    console.log('In a real setup, these would be persisted to Supabase.');
    
    return true;
  } catch (error) {
    logger.error('Error running mock calibration process', error);
    return false;
  }
}

// Execute calibration process
runCalibration()
  .then((success) => {
    if (success) {
      console.log('\nMock calibration process completed successfully!');
      console.log('This demonstrates the calibration workflow without requiring real dependencies.');
    } else {
      console.error('\nMock calibration process failed.');
    }
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
