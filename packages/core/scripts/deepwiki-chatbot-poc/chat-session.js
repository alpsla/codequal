/**
 * Chat Session
 * 
 * This class manages an individual chat session, coordinating between:
 * - Chat context manager
 * - Repository context provider
 * - Model interface
 */

const ChatContextManager = require('./chat-context-manager');
const RepositoryContextProvider = require('./repository-context-provider');
const ModelInterface = require('./model-interface');
const config = require('./config');

class ChatSession {
  constructor(options = {}) {
    this.chatContextManager = options.chatContextManager || new ChatContextManager();
    this.repositoryContextProvider = options.repositoryContextProvider || new RepositoryContextProvider();
    this.modelInterface = options.modelInterface || new ModelInterface();
    
    this.sessionId = options.sessionId || this._generateSessionId();
    this.currentRepositoryUrl = null;
  }

  /**
   * Initialize the chat session
   */
  async initialize() {
    await this.repositoryContextProvider.initialize();
  }

  /**
   * Clean up resources when the session is no longer needed
   */
  cleanup() {
    this.repositoryContextProvider.cleanup();
  }

  /**
   * Set the repository for this chat session
   * 
   * @param {Object} options - Options for setting the repository
   * @param {string} options.repositoryUrl - URL of the repository
   * @param {boolean} options.generateAnalysis - Whether to generate a new analysis
   * @param {string} options.model - Model to use for analysis
   * @returns {Promise<Object>} Status of the repository setup
   */
  async setRepository(options) {
    const {
      repositoryUrl,
      generateAnalysis = true,
      model = config.openRouter.defaultModel,
      fallbackModels = config.openRouter.fallbackModels
    } = options;
    
    this.currentRepositoryUrl = repositoryUrl;
    
    // If we should generate analysis, do it now
    if (generateAnalysis) {
      try {
        console.log(`Generating repository analyses for ${repositoryUrl}`);
        
        const repositoryContext = await this.repositoryContextProvider.getMultipleAnalyses({
          repositoryUrl,
          model,
          fallbackModels
        });
        
        // Set the repository context in the chat context manager
        this.chatContextManager.setRepositoryContext(repositoryContext, repositoryUrl);
        
        return {
          success: true,
          message: `Repository analyses generated successfully: ${repositoryUrl}`,
          analysisSuccess: repositoryContext.success
        };
      } catch (error) {
        console.error(`Failed to generate repository analyses: ${error.message}`);
        
        return {
          success: false,
          message: `Failed to generate repository analyses: ${error.message}`
        };
      }
    } else {
      // Just set the repository URL without generating analysis
      this.chatContextManager.setRepositoryContext(null, repositoryUrl);
      
      return {
        success: true,
        message: `Repository set without analysis: ${repositoryUrl}`
      };
    }
  }

  /**
   * Send a message in the chat session
   * 
   * @param {Object} options - Options for sending a message
   * @param {string} options.message - Message content
   * @param {string} options.model - Model to use
   * @returns {Promise<Object>} Response from the model
   */
  async sendMessage(options) {
    const {
      message,
      model = config.openRouter.defaultModel,
      fallbackModels = config.openRouter.fallbackModels
    } = options;
    
    // Add user message to context
    this.chatContextManager.addMessage({
      role: 'user',
      content: message
    });
    
    // If no repository is set or we don't have repository context,
    // check if the message is asking to set a repository
    if (!this.currentRepositoryUrl || !this.chatContextManager.repositoryContext) {
      const repositoryUrl = this._extractRepositoryUrl(message);
      if (repositoryUrl) {
        // User is likely asking about a specific repository, so set it
        await this.setRepository({
          repositoryUrl,
          generateAnalysis: true,
          model,
          fallbackModels
        });
      }
    }
    
    try {
      // Get formatted messages for the model
      const formattedMessages = this.chatContextManager.getFormattedMessages();
      
      // Get response from model
      const response = await this.modelInterface.getChatCompletion({
        messages: formattedMessages,
        model,
        fallbackModels
      });
      
      // Add assistant response to context
      this.chatContextManager.addMessage({
        role: 'assistant',
        content: response.content
      });
      
      return {
        success: true,
        message: response.content,
        model_used: response.model_used
      };
    } catch (error) {
      console.error(`Failed to get model response: ${error.message}`);
      
      // Try specific repository question approach if we have a repository set
      if (this.currentRepositoryUrl) {
        try {
          console.log(`Falling back to direct repository question for: ${message}`);
          
          const questionResponse = await this.repositoryContextProvider.askRepositoryQuestion({
            repositoryUrl: this.currentRepositoryUrl,
            question: message,
            model,
            fallbackModels
          });
          
          if (questionResponse.success) {
            // Add assistant response to context
            this.chatContextManager.addMessage({
              role: 'assistant',
              content: questionResponse.content
            });
            
            return {
              success: true,
              message: questionResponse.content,
              model_used: questionResponse.model_used,
              using_fallback: true
            };
          }
        } catch (fallbackError) {
          console.error(`Fallback question approach failed: ${fallbackError.message}`);
        }
      }
      
      // All approaches failed, return error
      const errorMessage = "I'm having trouble generating a response right now. Please try again or ask a different question.";
      
      // Add error response to context
      this.chatContextManager.addMessage({
        role: 'assistant',
        content: errorMessage
      });
      
      return {
        success: false,
        message: errorMessage,
        error: error.message
      };
    }
  }

  /**
   * Get the conversation history
   * 
   * @returns {Array} Conversation history
   */
  getHistory() {
    return this.chatContextManager.history;
  }

  /**
   * Clear the conversation history
   */
  clearHistory() {
    this.chatContextManager.clearHistory();
  }

  /**
   * Reset the entire chat session
   */
  reset() {
    this.chatContextManager.reset();
    this.currentRepositoryUrl = null;
  }

  /**
   * Extract a repository URL from a message
   * 
   * @param {string} message - Message to check
   * @returns {string|null} Repository URL if found, null otherwise
   * @private
   */
  _extractRepositoryUrl(message) {
    // Look for GitHub URLs in the message
    const githubRegex = /https?:\/\/github\.com\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+/g;
    const matches = message.match(githubRegex);
    
    if (matches && matches.length > 0) {
      return matches[0];
    }
    
    return null;
  }

  /**
   * Generate a random session ID
   * 
   * @returns {string} Random session ID
   * @private
   */
  _generateSessionId() {
    return `session_${Math.random().toString(36).substring(2, 15)}_${Date.now().toString(36)}`;
  }
}

module.exports = ChatSession;
