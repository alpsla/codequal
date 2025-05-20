/* eslint-disable no-console */

import { ChatMessage, ChatModelConfig } from './interfaces';
import { logger } from './logger';

/**
 * Interface for DeepWiki API request
 */
interface DeepWikiApiRequest {
  model: string;
  messages: Array<{
    role: string;
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  provider?: string;
}

/**
 * Interface for DeepWiki API response
 */
interface DeepWikiApiResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Integration with the actual DeepWiki API for chat
 */
export class DeepWikiApiClient {
  private apiBaseUrl: string;
  private apiKey: string;
  
  /**
   * Create a new DeepWiki API client
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
   * Call the DeepWiki Chat API
   * 
   * @param chatRequest Request parameters for the DeepWiki API
   * @returns API response
   */
  async callChatApi(chatRequest: DeepWikiApiRequest): Promise<DeepWikiApiResponse> {
    try {
      logger.info(`Calling DeepWiki Chat API with model: ${chatRequest.model}`);
      
      // In a real implementation, this would be a fetch or axios call
      // For the POC, we'll mock the API call
      logger.info('Making API call to:', `${this.apiBaseUrl}/chat/completions`);
      logger.debug('Request payload:', JSON.stringify(chatRequest, null, 2));
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock response based on the model
      const response = this.getMockApiResponse(chatRequest);
      
      return response;
    } catch (error) {
      console.error('Error calling DeepWiki API:', error);
      throw error;
    }
  }
  
  /**
   * Get a mock API response for testing
   */
  private getMockApiResponse(request: DeepWikiApiRequest): DeepWikiApiResponse {
    // Get the last user message
    const lastUserMessage = request.messages
      .filter(msg => msg.role === 'user')
      .pop()?.content.toLowerCase() || '';
    
    // Generate different responses based on the model and query
    let responseContent = '';
    if (request.model.includes('deepseek')) {
      responseContent = this.getDeepSeekResponse(lastUserMessage);
    } else if (request.model.includes('gemini')) {
      responseContent = this.getGeminiResponse(lastUserMessage);
    } else if (request.model.includes('claude')) {
      responseContent = this.getClaudeResponse(lastUserMessage);
    } else {
      responseContent = 'I can help answer questions about this repository.';
    }
    
    // Mock token counts
    const promptTokens = request.messages.reduce((sum, msg) => sum + msg.content.length / 4, 0);
    const completionTokens = responseContent.length / 4;
    
    return {
      id: `chatcmpl-${Date.now().toString(36)}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: request.model,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: responseContent
          },
          finish_reason: 'stop'
        }
      ],
      usage: {
        prompt_tokens: Math.ceil(promptTokens),
        completion_tokens: Math.ceil(completionTokens),
        total_tokens: Math.ceil(promptTokens + completionTokens)
      }
    };
  }
  
  /**
   * Get a mock DeepSeek model response
   */
  private getDeepSeekResponse(query: string): string {
    if (query.includes('architecture')) {
      return 'Based on the repository structure, this project follows a modular architecture with separate components for frontend, backend, and data processing. The backend uses a microservices approach with separate services for different business domains, communicated via message queues. Each component is containerized using Docker for consistent deployment environments.';
    } else if (query.includes('api') || query.includes('endpoint')) {
      return 'The API follows RESTful principles and is documented using OpenAPI (Swagger). Key endpoints include authentication (/auth), user management (/users), data processing (/data), and analytics (/analytics). The API implements proper versioning via URL paths (e.g., /v1/resources) and uses JWT for authentication with proper token rotation.';
    } else if (query.includes('database') || query.includes('data')) {
      return 'The project uses PostgreSQL as its primary relational database with TypeORM for ORM functionality. For caching and temporary data storage, Redis is employed. The database schema includes properly indexed tables with foreign key constraints. For vector operations, the pgvector extension is configured within PostgreSQL to enable efficient similarity searches.';
    } else {
      return 'This repository contains a full-stack application with TypeScript used throughout the codebase. The project implements comprehensive testing with unit, integration, and end-to-end tests. CI/CD is handled via GitHub Actions with deployment pipelines for different environments (dev, staging, production). The code adheres to consistent standards enforced by ESLint and Prettier.';
    }
  }
  
  /**
   * Get a mock Gemini model response
   */
  private getGeminiResponse(query: string): string {
    if (query.includes('architecture')) {
      return 'The repository uses a component-based architecture. Frontend is built with React and TypeScript, while the backend uses Node.js with Express. There\'s a clear separation between the data access layer, business logic, and presentation layer. Services communicate through well-defined APIs.';
    } else if (query.includes('api') || query.includes('endpoint')) {
      return 'The API is organized in the /src/api folder with separate controllers for different resources. Authentication uses JWT tokens stored in HTTP-only cookies. The API implements rate limiting and request validation using middleware.';
    } else if (query.includes('database') || query.includes('data')) {
      return 'The database schema uses PostgreSQL with migrations handled by TypeORM. There are tables for users, products, orders, and analytics. Indexes are set up for frequently queried columns. The vector storage uses pgvector for embedding storage and retrieval.';
    } else {
      return 'This is a web application project with TypeScript used for both frontend and backend. It includes a CI/CD pipeline, comprehensive testing, and documentation. The project follows modern development practices including code reviews and automated quality checks.';
    }
  }
  
  /**
   * Get a mock Claude model response
   */
  private getClaudeResponse(query: string): string {
    if (query.includes('architecture')) {
      return 'The repository implements a clean architecture pattern with clear separation of concerns. The codebase is organized into layers: domain entities, use cases (application logic), interfaces, and infrastructure. This organization ensures that business rules are independent of frameworks and external concerns, making the code more maintainable and testable.';
    } else if (query.includes('api') || query.includes('endpoint')) {
      return 'The API follows a resource-oriented design with clear naming conventions. Endpoints are versioned and follow REST principles. Authentication is implemented using JWTs with proper security considerations including CSRF protection and secure cookie handling. API documentation is generated automatically from code annotations.';
    } else if (query.includes('database') || query.includes('data')) {
      return 'The data layer uses the repository pattern to abstract database operations. Migrations are version-controlled and applied automatically during deployment. The schema includes proper normalization and indexes for performance. For vector operations, the system uses pgvector with HNSW indexing for efficient similarity searches.';
    } else {
      return 'This project is a production-grade application with comprehensive documentation, testing, and deployment pipelines. It follows consistent coding standards and includes accessibility considerations in the UI components. The repository includes detailed setup instructions and contribution guidelines.';
    }
  }
  
  /**
   * Ensure a model name has the required provider prefix for OpenRouter
   * 
   * @param model Model name
   * @returns Model name with provider prefix
   */
  ensureModelPrefix(model: string): string {
    if (!model) {
      return 'openai/gpt-3.5-turbo';
    }
    if (!model.includes('/')) {
      // If no provider prefix, assume openai
      return `openai/${model}`;
    }
    return model;
  }
  
  /**
   * Generate chat completion using DeepWiki API
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
    // Format messages for the API
    const formattedMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
    
    // Ensure model has provider prefix
    const modelWithPrefix = this.ensureModelPrefix(modelConfig.primaryModel);
    
    // Prepare the request
    const request: DeepWikiApiRequest = {
      model: modelWithPrefix,
      messages: formattedMessages,
      temperature: modelConfig.temperature,
      max_tokens: modelConfig.maxTokens,
      stream: false,
      provider: 'openrouter' // Assuming OpenRouter integration
    };
    
    try {
      // Call the API
      const response = await this.callChatApi(request);
      
      // Parse the response
      const content = response.choices[0]?.message?.content || '';
      
      return {
        content,
        modelUsed: modelWithPrefix,
        usage: {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens
        }
      };
    } catch (error) {
      console.error(`Error generating completion with model ${modelWithPrefix}:`, error);
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
        primaryModel: modelConfig.primaryModel
      });
    } catch (primaryError) {
      logger.error(`Error with primary model ${modelConfig.primaryModel}:`, primaryError);
      
      // Try fallback models in sequence
      for (const fallbackModel of modelConfig.fallbackModels) {
        try {
          logger.info(`Attempting with fallback model: ${fallbackModel}`);
          
          return await this.generateChatCompletion(messages, {
            ...modelConfig,
            primaryModel: fallbackModel
          });
        } catch (fallbackError) {
          logger.error(`Error with fallback model ${fallbackModel}:`, fallbackError);
        }
      }
      
      // If all models fail, throw an error
      throw new Error('All models failed to generate completion');
    }
  }
}
