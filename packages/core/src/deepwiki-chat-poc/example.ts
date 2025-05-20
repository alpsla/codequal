/**
 * Example usage of the DeepWiki Chat POC
 * 
 * This script demonstrates how to use the DeepWiki Chat POC
 * with a sample user context and chat history.
 */

import {
  MessageControlProgram,
  VectorDatabaseService,
  DeepWikiChatService,
  UserRepositoryService,
  ChatMessage,
  UserContext
} from './index';
import { logger } from './logger';

// Create mock environment variables
const DEEPWIKI_API_BASE_URL = 'http://localhost:3000';
const DEEPWIKI_API_KEY = 'mock-api-key';

/**
 * Run the example
 */
async function runExample() {
  try {
    logger.info('Starting DeepWiki Chat POC Example');
    
    // Initialize services
    const _vectorDb = new VectorDatabaseService();
    const _deepwikiChat = new DeepWikiChatService({
      apiBaseUrl: DEEPWIKI_API_BASE_URL,
      apiKey: DEEPWIKI_API_KEY
    });
    const userRepoService = new UserRepositoryService();
    
    // Create Message Control Program
    const mcp = new MessageControlProgram({
      primaryModel: 'deepseek/deepseek-chat',
      fallbackModels: ['google/gemini-2.5-flash', 'anthropic/claude-3-haiku'],
      temperature: 0.7,
      maxTokens: 1000
    });
    
    // Get mock user context
    const userContext: UserContext = await userRepoService.getUserContext('user-001', 'user@example.com');
    logger.info(`User has access to ${userContext.repositories.length} repositories`);
    logger.info(`Current repository: ${userContext.currentRepository?.name}`);
    
    // Create a sample conversation
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: 'You are an assistant that helps with questions about code repositories.',
        timestamp: new Date()
      },
      {
        role: 'user',
        content: 'Can you tell me about the architecture of this project?',
        timestamp: new Date()
      }
    ];
    
    // Process the chat request
    logger.info('\nSending chat request...');
    const response = await mcp.processRequest({
      userContext,
      messages,
      modelConfig: {
        primaryModel: 'deepseek/deepseek-chat',
        fallbackModels: ['google/gemini-2.5-flash', 'anthropic/claude-3-haiku']
      }
    });
    
    // Output the results
    logger.info('\n=== Chat Response ===');
    logger.info(`Model used: ${response.modelUsed}`);
    logger.info(`Response: ${response.message.content}`);
    
    if (response.contextChunks && response.contextChunks.length > 0) {
      logger.info('\n=== Context Chunks Used ===');
      for (const chunk of response.contextChunks) {
        logger.info(`- [${chunk.filePath}] (Score: ${chunk.score})`);
        logger.info(`  ${chunk.content.substring(0, 100)}...`);
      }
    }
    
    logger.info('\n=== Token Usage ===');
    logger.info(`Prompt tokens: ${response.usage?.promptTokens || 'N/A'}`);
    logger.info(`Completion tokens: ${response.usage?.completionTokens || 'N/A'}`);
    logger.info(`Total tokens: ${response.usage?.totalTokens || 'N/A'}`);
    
    // Try switching repositories and asking another question
    logger.info('\nSwitching repository...');
    const updatedUserContext = await userRepoService.selectRepository(userContext, 'repo-003');
    logger.info(`Now using repository: ${updatedUserContext.currentRepository?.name}`);
    
    const newMessages: ChatMessage[] = [
      ...messages,
      response.message, // Add the assistant's previous response
      {
        role: 'user',
        content: 'How does the database integration work?',
        timestamp: new Date()
      }
    ];
    
    // Process the new request
    logger.info('\nSending new chat request...');
    const newResponse = await mcp.processRequest({
      userContext: updatedUserContext,
      messages: newMessages
    });
    
    // Output the results
    logger.info('\n=== New Chat Response ===');
    logger.info(`Model used: ${newResponse.modelUsed}`);
    logger.info(`Response: ${newResponse.message.content}`);
    
    if (newResponse.contextChunks && newResponse.contextChunks.length > 0) {
      logger.info('\n=== Context Chunks Used ===');
      for (const chunk of newResponse.contextChunks) {
        logger.info(`- [${chunk.filePath}] (Score: ${chunk.score})`);
        logger.info(`  ${chunk.content.substring(0, 100)}...`);
      }
    }
    
    logger.info('\nDeepWiki Chat POC Example completed successfully');
  } catch (error) {
    logger.error('Error running DeepWiki Chat POC example:', error);
  }
}

// Run the example and handle errors
runExample().catch(error => {
  logger.error('Unhandled error in example:', error);
  process.exit(1);
});
