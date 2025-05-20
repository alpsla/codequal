/**
 * Model Interface
 * 
 * This module handles communication with language models through OpenRouter.
 * It provides a unified interface for sending chat completions and manages
 * model fallback functionality.
 */

const axios = require('axios');
const config = require('./config');

class ModelInterface {
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.OPENROUTER_API_KEY || config.openRouter.apiKey;
    this.baseUrl = options.baseUrl || config.openRouter.baseUrl;
    this.defaultModel = options.defaultModel || config.openRouter.defaultModel;
    this.fallbackModels = options.fallbackModels || config.openRouter.fallbackModels;
    this.timeout = options.timeout || config.openRouter.timeout;
    
    if (!this.apiKey) {
      console.warn('No OpenRouter API key provided. API calls will fail.');
    }
  }

  /**
   * Send a chat completion request to the model
   * 
   * @param {Object} options - Chat completion options
   * @param {Array} options.messages - Array of message objects in OpenAI format
   * @param {string} options.model - Primary model to use
   * @param {string[]} options.fallbackModels - Fallback models if primary fails
   * @param {Object} options.parameters - Additional parameters for the model
   * @returns {Promise<Object>} Chat completion response
   */
  async getChatCompletion(options) {
    const {
      messages,
      model = this.defaultModel,
      fallbackModels = this.fallbackModels,
      parameters = {}
    } = options;
    
    // Try primary model first
    try {
      const result = await this._makeCompletionRequest(model, messages, parameters);
      return {
        ...result,
        model_used: model
      };
    } catch (error) {
      console.warn(`Primary model ${model} failed: ${error.message}`);
      
      // Try fallback models in sequence
      for (const fallbackModel of fallbackModels) {
        try {
          console.log(`Trying fallback model: ${fallbackModel}`);
          const result = await this._makeCompletionRequest(fallbackModel, messages, parameters);
          return {
            ...result,
            model_used: fallbackModel
          };
        } catch (fallbackError) {
          console.warn(`Fallback model ${fallbackModel} failed: ${fallbackError.message}`);
        }
      }
      
      // All models failed
      throw new Error('All models failed to generate a response');
    }
  }

  /**
   * Make a chat completion request to OpenRouter API
   * 
   * @param {string} model - Model to use
   * @param {Array} messages - Array of message objects
   * @param {Object} parameters - Additional parameters
   * @returns {Promise<Object>} API response
   * @private
   */
  async _makeCompletionRequest(model, messages, parameters) {
    // Ensure model has provider prefix for OpenRouter
    const formattedModel = this._ensureModelPrefix(model);
    
    try {
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: formattedModel,
          messages,
          ...parameters
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: this.timeout
        }
      );
      
      return {
        success: true,
        content: response.data.choices[0].message.content,
        raw_response: response.data
      };
    } catch (error) {
      const errorDetails = error.response?.data || {};
      console.error(`OpenRouter API error with model ${formattedModel}:`, errorDetails);
      
      throw new Error(`Model ${formattedModel} error: ${error.message}`);
    }
  }

  /**
   * Ensure model name has the correct provider prefix for OpenRouter
   * 
   * @param {string} modelName - Model name to check
   * @returns {string} Correctly formatted model name
   * @private
   */
  _ensureModelPrefix(modelName) {
    if (!modelName) {
      return "openai/gpt-3.5-turbo";
    }
    
    if ('/' in modelName) {
      return modelName;
    }
    
    return `openai/${modelName}`;
  }
}

module.exports = ModelInterface;
