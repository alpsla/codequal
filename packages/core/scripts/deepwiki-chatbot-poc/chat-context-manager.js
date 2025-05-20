/**
 * Chat Context Manager
 * 
 * This module manages conversation context for the chatbot, including:
 * - Maintaining conversation history
 * - Managing repository context
 * - Applying Model Context Protocol for efficient context handling
 */

const config = require('./config');

class ChatContextManager {
  constructor(options = {}) {
    this.maxHistoryLength = options.maxHistoryLength || config.chat.maxHistoryLength;
    this.systemPrompt = options.systemPrompt || config.chat.systemPrompt;
    this.useModelContextProtocol = options.useModelContextProtocol !== undefined ? 
      options.useModelContextProtocol : config.chat.modelContextProtocol;
    
    // Initialize empty conversation history
    this.history = [];
    this.repositoryContext = null;
    this.repositoryUrl = null;
  }

  /**
   * Set the repository context for the conversation
   * 
   * @param {Object} repositoryContext - Context data about the repository
   * @param {string} repositoryUrl - URL of the repository
   */
  setRepositoryContext(repositoryContext, repositoryUrl) {
    this.repositoryContext = repositoryContext;
    this.repositoryUrl = repositoryUrl;
  }

  /**
   * Add a message to the conversation history
   * 
   * @param {Object} message - Message to add
   * @param {string} message.role - Role of the message sender ('user' or 'assistant')
   * @param {string} message.content - Content of the message
   */
  addMessage(message) {
    this.history.push(message);
    
    // Limit history length
    if (this.history.length > this.maxHistoryLength * 2) { // *2 because we count pairs
      this.history = this.history.slice(-this.maxHistoryLength * 2);
    }
  }

  /**
   * Format the messages for the model, including system prompt and repository context
   * 
   * @param {Object} options - Options for message formatting
   * @param {boolean} options.includeSystemPrompt - Whether to include the system prompt
   * @param {boolean} options.includeRepositoryContext - Whether to include repository context
   * @returns {Array} Formatted messages
   */
  getFormattedMessages(options = {}) {
    const {
      includeSystemPrompt = true,
      includeRepositoryContext = true
    } = options;
    
    const messages = [];
    
    // Add system prompt
    if (includeSystemPrompt) {
      messages.push({
        role: 'system',
        content: this._getSystemPrompt()
      });
    }
    
    // Add repository context using appropriate method
    if (includeRepositoryContext && this.repositoryContext) {
      if (this.useModelContextProtocol) {
        // Use Model Context Protocol for efficient context handling
        messages.push(this._getRepositoryContextWithMCP());
      } else {
        // Standard approach with context in message content
        messages.push({
          role: 'system',
          content: this._getRepositoryContextContent()
        });
      }
    }
    
    // Add conversation history
    messages.push(...this.history);
    
    return messages;
  }

  /**
   * Get the system prompt, customized for the current repository if available
   * 
   * @returns {string} System prompt
   * @private
   */
  _getSystemPrompt() {
    if (!this.repositoryUrl) {
      return this.systemPrompt;
    }
    
    // Customize system prompt with repository information
    return `${this.systemPrompt}

You are currently discussing the repository at ${this.repositoryUrl}.
When answering questions, focus specifically on this repository and its codebase.`;
  }

  /**
   * Get repository context as a standard message content
   * 
   * @returns {string} Repository context content
   * @private
   */
  _getRepositoryContextContent() {
    if (!this.repositoryContext || !this.repositoryContext.success) {
      return "No repository analysis available.";
    }
    
    // If we have multiple analyses, combine them
    if (this.repositoryContext.analyses) {
      let combinedContext = `# Repository Analysis for ${this.repositoryUrl}\n\n`;
      
      for (const [analysisType, analysis] of Object.entries(this.repositoryContext.analyses)) {
        if (analysis.success) {
          combinedContext += `## ${this._capitalizeAnalysisType(analysisType)} Analysis\n\n`;
          combinedContext += analysis.content;
          combinedContext += '\n\n';
        }
      }
      
      return combinedContext;
    }
    
    // Single analysis
    return `# Repository Analysis for ${this.repositoryUrl}\n\n${this.repositoryContext.content}`;
  }

  /**
   * Get repository context using Model Context Protocol
   * This provides the context in a more efficient format for the model
   * 
   * @returns {Object} Message with MCP context
   * @private
   */
  _getRepositoryContextWithMCP() {
    // MCP format for repository context
    return {
      role: 'system',
      content: [
        {
          type: 'context',
          id: 'repository_analysis',
          text: this._getRepositoryContextContent()
        }
      ]
    };
  }

  /**
   * Capitalize the first letter of an analysis type
   * 
   * @param {string} analysisType - Type of analysis
   * @returns {string} Capitalized analysis type
   * @private
   */
  _capitalizeAnalysisType(analysisType) {
    return analysisType.charAt(0).toUpperCase() + analysisType.slice(1);
  }

  /**
   * Clear the conversation history
   */
  clearHistory() {
    this.history = [];
  }

  /**
   * Reset the entire conversation context
   */
  reset() {
    this.history = [];
    this.repositoryContext = null;
    this.repositoryUrl = null;
  }
}

module.exports = ChatContextManager;
