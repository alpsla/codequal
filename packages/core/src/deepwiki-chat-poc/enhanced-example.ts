/**
 * Enhanced example using the DeepWiki API Client
 * 
 * This example demonstrates a more realistic usage scenario
 * with the actual DeepWiki API client.
 */

import {
  MessageControlProgram,
  VectorDatabaseService,
  DeepWikiApiClient,
  UserRepositoryService,
  ChatMessage,
  UserContext
} from './index';
import { logger } from './logger';

// Mock environment variables
const DEEPWIKI_API_BASE_URL = process.env.DEEPWIKI_API_BASE_URL || 'http://localhost:3000';
const DEEPWIKI_API_KEY = process.env.DEEPWIKI_API_KEY || 'mock-api-key';

/**
 * Models to test in the POC
 */
const MODELS_TO_TEST = {
  deepseek: 'deepseek/deepseek-chat',
  gemini: 'google/gemini-2.5-flash',
  claude: 'anthropic/claude-3-haiku'
};

/**
 * Run the enhanced example
 */
async function runEnhancedExample() {
  try {
    logger.info('Starting Enhanced DeepWiki Chat POC Example');
    logger.info(`API Base URL: ${DEEPWIKI_API_BASE_URL}`);
    
    // Initialize services
    const _vectorDb = new VectorDatabaseService();
    const deepwikiApi = new DeepWikiApiClient({
      apiBaseUrl: DEEPWIKI_API_BASE_URL,
      apiKey: DEEPWIKI_API_KEY
    });
    const userRepoService = new UserRepositoryService();
    
    // Create Message Control Program with our preferred model options
    const mcp = new MessageControlProgram({
      primaryModel: MODELS_TO_TEST.deepseek,
      fallbackModels: [MODELS_TO_TEST.gemini, MODELS_TO_TEST.claude],
      temperature: 0.7,
      maxTokens: 1000
    });
    
    // Get user context
    const userContext: UserContext = await userRepoService.getUserContext('user-001', 'user@example.com');
    logger.info(`User has access to ${userContext.repositories.length} repositories`);
    logger.info(`Current repository: ${userContext.currentRepository?.name}`);
    
    // Test questions for different repositories
    const testQuestions = [
      'What is the architecture of this repository?',
      'How are the APIs organized?',
      'Explain the database schema'
    ];
    
    // Test each model individually first
    logger.info('\n=== Testing Individual Models ===');
    
    for (const [modelName, modelId] of Object.entries(MODELS_TO_TEST)) {
      logger.info(`\nTesting model: ${modelName} (${modelId})`);
      
      try {
        // Create a simple conversation with the first test question
        const messages: ChatMessage[] = [
          {
            role: 'system',
            content: 'You are an assistant that helps with questions about code repositories.',
            timestamp: new Date()
          },
          {
            role: 'user',
            content: testQuestions[0],
            timestamp: new Date()
          }
        ];
        
        // Generate completion with just this model
        const response = await deepwikiApi.generateChatCompletion(messages, {
          primaryModel: modelId,
          fallbackModels: [],
          temperature: 0.7,
          maxTokens: 1000
        });
        
        logger.info(`Response: ${response.content.substring(0, 100)}...`);
        logger.info(`Tokens: ${response.usage.totalTokens}`);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Error testing model ${modelName}:`, errorMessage);
      }
    }
    
    // Now test the full MCP with vector retrieval and fallback
    logger.info('\n=== Testing MCP with Vector Retrieval ===');
    
    // Test each repository with a different question
    for (let i = 0; i < userContext.repositories.length; i++) {
      const repoId = userContext.repositories[i].repositoryId;
      const question = testQuestions[i % testQuestions.length];
      
      logger.info(`\nTesting repository: ${userContext.repositories[i].name}`);
      logger.info(`Question: ${question}`);
      
      // Update the current repository
      const updatedContext = await userRepoService.selectRepository(userContext, repoId);
      
      // Create conversation
      const messages: ChatMessage[] = [
        {
          role: 'system',
          content: 'You are an assistant that helps with questions about code repositories.',
          timestamp: new Date()
        },
        {
          role: 'user',
          content: question,
          timestamp: new Date()
        }
      ];
      
      // Process the request
      try {
        const response = await mcp.processRequest({
          userContext: updatedContext,
          messages,
          modelConfig: {
            primaryModel: MODELS_TO_TEST.deepseek,
            fallbackModels: [MODELS_TO_TEST.gemini, MODELS_TO_TEST.claude]
          }
        });
        
        logger.info(`Model used: ${response.modelUsed}`);
        logger.info(`Response: ${response.message.content.substring(0, 150)}...`);
        
        if (response.contextChunks && response.contextChunks.length > 0) {
          logger.info(`Context chunks: ${response.contextChunks.length}`);
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Error processing request:`, errorMessage);
      }
    }
    
    // Test fallback mechanism by intentionally using an invalid model
    logger.info('\n=== Testing Fallback Mechanism ===');
    
    try {
      const messages: ChatMessage[] = [
        {
          role: 'system',
          content: 'You are an assistant that helps with questions about code repositories.',
          timestamp: new Date()
        },
        {
          role: 'user',
          content: 'Explain how the authentication system works in this repository.',
          timestamp: new Date()
        }
      ];
      
      // Use an invalid model to force fallback
      const response = await deepwikiApi.generateWithFallback(messages, {
        primaryModel: 'invalid-model',
        fallbackModels: Object.values(MODELS_TO_TEST),
        temperature: 0.7,
        maxTokens: 1000
      });
      
      logger.info(`Failed over to model: ${response.modelUsed}`);
      logger.info(`Response: ${response.content.substring(0, 150)}...`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Fallback test error:', errorMessage);
    }
    
    logger.info('\nEnhanced DeepWiki Chat POC Example completed');
  } catch (error: unknown) {
    logger.error('Fatal error running enhanced example:', error);
  }
}

// Run the enhanced example
runEnhancedExample().catch(error => {
  logger.error('Unhandled error:', error);
  process.exit(1);
});
