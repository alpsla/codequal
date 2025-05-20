/**
 * API functions for enhanced calibration
 */

const { callModelApi } = require('../../../src/utils/api-utils');
const { manualApiKeys, question, logError } = require('./utils');

/**
 * Call model API with support for manual API keys
 * @param {string} provider - The provider name
 * @param {string} model - The model name
 * @param {string} systemPrompt - The system prompt
 * @param {string} userPrompt - The user prompt
 * @return {Promise<object>} - API response with content and timing metrics
 */
async function callModelApiWithManualKey(provider, model, systemPrompt, userPrompt) {
  const modelKey = `${provider}/${model}`;
  
  // Use manual API key if available
  if (manualApiKeys[modelKey]) {
    try {
      // Implement manual API call based on provider
      // This would need specific implementation for each provider's API
      console.log(`Using manual API key for ${modelKey}`);
      
      // Example implementation for different providers would go here
      // For now, we'll just pass the manual key to the existing callModelApi function
      // This would need to be enhanced for proper implementation
      return await callModelApi(provider, model, systemPrompt, userPrompt, manualApiKeys[modelKey]);
    } catch (error) {
      console.error(`Error using manual API key for ${modelKey}:`, error.message);
      // Fall back to standard API call
    }
  }
  
  // Use standard API call
  return await callModelApi(provider, model, systemPrompt, userPrompt);
}

/**
 * Prompt user for manual API key
 * @param {readline.Interface} rl - Readline interface 
 * @param {string} provider - The provider name
 * @param {string} model - The model name
 * @return {Promise<boolean>} - Whether a key was provided
 */
async function promptForApiKey(rl, provider, model) {
  const modelKey = `${provider}/${model}`;
  
  console.log(`\nAPI key issue detected for ${modelKey}`);
  const useManualKey = await question(rl, 'Would you like to provide a manual API key? (y/n): ');
  
  if (useManualKey.toLowerCase() === 'y') {
    const apiKey = await question(rl, `Enter API key for ${modelKey}: `);
    if (apiKey) {
      manualApiKeys[modelKey] = apiKey;
      console.log(`Manual API key for ${modelKey} has been set`);
      return true;
    }
  }
  
  return false;
}

/**
 * Get available models for a provider
 * @param {string} provider - The provider name
 * @return {string[]} - Array of available model names
 */
function getProviderModels(provider) {
  switch(provider) {
    case 'anthropic':
      // Only keeping Claude 3.5 Sonnet and Claude 3.7 Sonnet
      // Removed: claude-3-opus-20240229, claude-3-sonnet-20240229, claude-3-haiku-20240307
      return ['claude-3.5-sonnet-20240620', 'claude-3.7-sonnet'];
    case 'openai':
      return ['gpt-3.5-turbo', 'gpt-4o', 'gpt-4-turbo'];
    case 'deepseek':
      // Adding all Deepseek models
      return [
        'deepseek-coder', 
        'deepseek-coder-v2',
        'deepseek-chat-v2'
      ];
    case 'google':
      // Only using Gemini 2.5 models
      return ['gemini-2.5-pro', 'gemini-2.5-pro-preview-05-06', 'gemini-2.5-flash'];
    case 'openrouter':
      return ['anthropic/claude-3.7-sonnet', 'nousresearch/deephermes-3-mistral-24b-preview:free'];
    default:
      return [];
  }
}

module.exports = {
  callModelApiWithManualKey,
  promptForApiKey,
  getProviderModels
};