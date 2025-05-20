/* eslint-disable no-console */

import { ChatMessage, ChatModelConfig } from './interfaces';
import { logger } from './logger';

/**
 * Service for communicating with DeepWiki
 */
export class DeepWikiChatService {
  private apiBaseUrl: string;
  private apiKey: string;
  
  /**
   * Create a new DeepWiki Chat Service
   * 
   * @param options Configuration options
   */
  constructor(options: {
    apiBaseUrl: string;
    apiKey: string;
  }) {
    this.apiBaseUrl = options.apiBaseUrl;
    this.apiKey = options.apiKey;
  }
  
  /**
   * Generate a chat completion using DeepWiki
   * 
   * @param messages Array of chat messages
   * @param modelConfig Model configuration
   * @returns Generated content and usage statistics
   */
  async generateChatCompletion(
    messages: ChatMessage[],
    modelConfig: ChatModelConfig
  ): Promise<{
    content: string;
    modelUsed: string;
    usage: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
  }> {
    try {
      logger.info(`Generating chat completion with model: ${modelConfig.primaryModel}`);
      
      // Format messages for DeepWiki API
      const formattedMessages = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      // TODO: Implement actual API call to DeepWiki
      // This is a placeholder for the POC
      logger.info(`API call would be made to: ${this.apiBaseUrl}/chat/completions`);
      logger.debug('Request payload would be:', {
        model: modelConfig.primaryModel,
        messages: formattedMessages,
        temperature: modelConfig.temperature,
        max_tokens: modelConfig.maxTokens
      });
      
      // For POC, simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock successful response
      return {
        content: this.generateMockResponse(messages, modelConfig.primaryModel),
        modelUsed: modelConfig.primaryModel,
        usage: {
          promptTokens: 350,
          completionTokens: 120,
          totalTokens: 470
        }
      };
    } catch (error) {
      console.error('Error generating chat completion:', error);
      throw error;
    }
  }
  
  /**
   * Generate a chat completion with fallback support
   * 
   * @param messages Array of chat messages
   * @param modelConfig Model configuration with fallback options
   * @returns Generated content and usage statistics
   */
  async generateWithFallback(
    messages: ChatMessage[],
    modelConfig: ChatModelConfig
  ): Promise<{
    content: string;
    modelUsed: string;
    usage: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
  }> {
    // Try primary model first
    try {
      return await this.generateChatCompletion(messages, {
        ...modelConfig,
        primaryModel: modelConfig.primaryModel,
        fallbackModels: [] // No fallbacks for the primary call
      });
    } catch (error) {
      logger.error(`Error with primary model ${modelConfig.primaryModel}:`, error);
      
      // Try fallback models in sequence
      for (const fallbackModel of modelConfig.fallbackModels) {
        try {
          logger.info(`Attempting with fallback model: ${fallbackModel}`);
          
          return await this.generateChatCompletion(messages, {
            ...modelConfig,
            primaryModel: fallbackModel,
            fallbackModels: [] // No nested fallbacks
          });
        } catch (fallbackError) {
          console.error(`Error with fallback model ${fallbackModel}:`, fallbackError);
        }
      }
      
      // If all models fail, throw an error
      throw new Error('All models failed to generate completion');
    }
  }
  
  /**
   * Generate a mock response for testing the POC
   */
  private generateMockResponse(messages: ChatMessage[], model: string): string {
    // Find the last user message
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    
    if (!lastUserMessage) {
      return `I don't see a question to respond to. How can I help you? (Response from ${model})`;
    }
    
    const query = lastUserMessage.content.toLowerCase();
    
    // Generate different responses based on the query content
    if (query.includes('architecture')) {
      return `Based on the repository information, the architecture follows a microservices approach with separate components for different concerns. The services communicate through a message broker for asynchronous operations. The frontend is built with React and TypeScript. (Response from ${model})`;
    } else if (query.includes('api') || query.includes('endpoint')) {
      return `The API endpoints are RESTful and defined in the /api/routes directory. Authentication uses JWT tokens with refresh capabilities, and rate limiting is implemented using Redis to prevent abuse. (Response from ${model})`;
    } else if (query.includes('database') || query.includes('data')) {
      return `The application uses PostgreSQL as its primary database with TypeORM for object-relational mapping. Migrations are handled automatically through TypeORM scripts in the /migrations directory. For vector storage, the pgvector extension is used within PostgreSQL. (Response from ${model})`;
    } else {
      return `Based on the repository context, this is a software project with various components including frontend, backend, and database layers. The codebase follows modern best practices for testing, code quality, and CI/CD. Would you like more specific information about any aspect of the repository? (Response from ${model})`;
    }
  }
}
