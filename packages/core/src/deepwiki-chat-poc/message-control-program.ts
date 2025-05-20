/* eslint-disable no-console */

import {
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatModelConfig,
  VectorSearchResult,
  UserContext,
  RepositoryContext,
  ChatMessage
} from './interfaces';

/**
 * Default model configuration
 */
const DEFAULT_MODEL_CONFIG: ChatModelConfig = {
  primaryModel: 'deepseek/deepseek-chat',
  fallbackModels: ['google/gemini-2.5-flash', 'anthropic/claude-3-haiku'],
  temperature: 0.7,
  maxTokens: 1000
};

/**
 * Message Control Program (MCP) for DeepWiki Chat
 * 
 * Coordinates the chat workflow including:
 * - Authentication and authorization
 * - Context retrieval from vector database
 * - Model selection and fallback
 * - Response formatting
 */
export class MessageControlProgram {
  private modelConfig: ChatModelConfig;
  
  constructor(config?: Partial<ChatModelConfig>) {
    this.modelConfig = {
      ...DEFAULT_MODEL_CONFIG,
      ...config
    };
  }
  
  /**
   * Process a chat completion request
   */
  async processRequest(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const { userContext, messages } = request;
    const modelConfig = request.modelConfig ? { ...this.modelConfig, ...request.modelConfig } : this.modelConfig;
    
    try {
      // Step 1: Validate user and repository permissions
      this.validateUserAccess(userContext);
      
      // Step 2: Get the current repository context
      const repoContext = userContext.currentRepository;
      if (!repoContext) {
        throw new Error('No repository selected. Please select a repository before chatting.');
      }
      
      // Step 3: Process the latest user message to extract query
      const latestUserMessage = this.getLatestUserMessage(messages);
      if (!latestUserMessage) {
        throw new Error('No user message found in the conversation history.');
      }
      
      // Step 4: Retrieve relevant context from vector database
      const relevantContext = await this.retrieveRepositoryContext(repoContext, latestUserMessage);
      
      // Step 5: Format prompt with context
      const formattedPrompt = this.formatPromptWithContext(messages, relevantContext);
      
      // Step 6: Generate completion with fallback
      const completion = await this.generateCompletionWithFallback(formattedPrompt, modelConfig);
      
      // Step 7: Format and return response
      return {
        message: {
          role: 'assistant',
          content: completion.content,
          timestamp: new Date()
        },
        modelUsed: completion.modelUsed,
        contextChunks: relevantContext,
        usage: completion.usage
      };
    } catch (error) {
      console.error('Error processing chat request:', error);
      throw error;
    }
  }
  
  /**
   * Validate user's access to the selected repository
   */
  private validateUserAccess(userContext: UserContext): void {
    // Ensure user is authenticated
    if (!userContext.userId || !userContext.email) {
      throw new Error('User not authenticated');
    }
    
    // Ensure user has selected a repository
    if (!userContext.currentRepository) {
      throw new Error('No repository selected');
    }
    
    // Verify user has access to the selected repository
    const hasAccess = userContext.repositories.some(
      repo => repo.repositoryId === userContext.currentRepository?.repositoryId
    );
    
    if (!hasAccess) {
      throw new Error('User does not have access to the selected repository');
    }
  }
  
  /**
   * Get the latest user message from the conversation history
   */
  private getLatestUserMessage(messages: ChatMessage[]): ChatMessage | undefined {
    return [...messages].reverse().find(message => message.role === 'user');
  }
  
  /**
   * Retrieve relevant context from the vector database
   */
  private async retrieveRepositoryContext(
    repoContext: RepositoryContext, 
    userMessage: ChatMessage
  ): Promise<VectorSearchResult[]> {
    // TODO: Implement actual vector DB retrieval
    // This is a placeholder for the POC
    console.log(`Retrieving context for repository: ${repoContext.name} with query: ${userMessage.content}`);
    
    // Mock vector search results for POC
    return [
      {
        content: `Repository ${repoContext.name} uses ${repoContext.primaryLanguage} as its main language.`,
        score: 0.92,
        filePath: 'README.md',
        repositoryId: repoContext.repositoryId
      },
      {
        content: `The main architecture follows a modular design with separate components for UI, API, and data access.`,
        score: 0.85,
        filePath: 'docs/architecture.md',
        repositoryId: repoContext.repositoryId
      }
    ];
  }
  
  /**
   * Format prompt with retrieved context
   */
  private formatPromptWithContext(
    messages: ChatMessage[], 
    contextChunks: VectorSearchResult[]
  ): ChatMessage[] {
    // Create a new array to avoid modifying the original
    const formattedMessages = [...messages];
    
    // If we have relevant context, insert it as a system message before the latest user message
    if (contextChunks.length > 0) {
      // Find the index of the last user message
      const lastUserMessageIndex = formattedMessages
        .map((msg, index) => ({ role: msg.role, index }))
        .filter(item => item.role === 'user')
        .pop()?.index;
      
      if (lastUserMessageIndex !== undefined) {
        // Format the context chunks
        const contextText = `
Relevant repository information:
${contextChunks.map(chunk => `[${chunk.filePath}]: ${chunk.content}`).join('\n\n')}

Answer the user's question using the provided repository information.
`;
        
        // Insert as a system message before the last user message
        formattedMessages.splice(lastUserMessageIndex, 0, {
          role: 'system',
          content: contextText,
          timestamp: new Date()
        });
      }
    }
    
    return formattedMessages;
  }
  
  /**
   * Generate completion with fallback support
   */
  private async generateCompletionWithFallback(
    messages: ChatMessage[], 
    modelConfig: ChatModelConfig
  ): Promise<{ content: string; modelUsed: string; usage?: { promptTokens: number; completionTokens: number; totalTokens: number } }> {
    // Try primary model first
    try {
      console.log(`Attempting to generate completion with primary model: ${modelConfig.primaryModel}`);
      // TODO: Implement actual API call to DeepWiki
      // This is a placeholder for the POC
      
      // Mock successful response
      return {
        content: `This is a mock response from the primary model (${modelConfig.primaryModel}).`,
        modelUsed: modelConfig.primaryModel,
        usage: {
          promptTokens: 250,
          completionTokens: 100,
          totalTokens: 350
        }
      };
    } catch (error) {
      console.error(`Error with primary model ${modelConfig.primaryModel}:`, error);
      
      // Try fallback models in sequence
      for (const fallbackModel of modelConfig.fallbackModels) {
        try {
          console.log(`Attempting to generate completion with fallback model: ${fallbackModel}`);
          // TODO: Implement actual API call to DeepWiki with fallback model
          
          // Mock successful fallback response
          return {
            content: `This is a mock response from the fallback model (${fallbackModel}).`,
            modelUsed: fallbackModel,
            usage: {
              promptTokens: 250,
              completionTokens: 85,
              totalTokens: 335
            }
          };
        } catch (fallbackError) {
          console.error(`Error with fallback model ${fallbackModel}:`, fallbackError);
        }
      }
      
      // If all models fail, throw an error
      throw new Error('All models failed to generate completion');
    }
  }
}
