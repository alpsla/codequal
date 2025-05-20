/**
 * Configuration settings for the DeepWiki Chatbot
 */

module.exports = {
  // OpenRouter configuration
  openRouter: {
    apiKey: process.env.OPENROUTER_API_KEY,
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'anthropic/claude-3.7-sonnet',
    fallbackModels: [
      'openai/gpt-4o',
      'anthropic/claude-3-opus',
      'openai/gpt-4'
    ],
    timeout: 120000, // 2 minutes
  },

  // DeepWiki Kubernetes configuration
  kubernetes: {
    namespace: process.env.KUBERNETES_NAMESPACE || 'codequal-dev',
    podSelector: process.env.DEEPWIKI_POD_SELECTOR || 'deepwiki-fixed',
    port: process.env.DEEPWIKI_PORT || '8001',
    timeout: 300000, // 5 minutes
  },

  // Chat context configuration
  chat: {
    maxHistoryLength: 10, // Maximum number of message pairs to retain
    systemPrompt: `You are DeepWiki Chat, a helpful assistant that specializes in helping users understand codebases.
You have access to DeepWiki's repository analysis system, which provides in-depth insights about code repositories.
Your goal is to answer questions about repositories in a clear, accurate, and helpful manner.
When you don't know the answer, say so clearly and offer to generate a new analysis or check a different part of the repository.`,
    modelContextProtocol: true, // Use Model Context Protocol for efficient context handling
  },

  // Repository context provider configuration
  repository: {
    analysisTypes: [
      'overview',
      'architecture',
      'code-quality',
      'security'
    ],
    cacheEnabled: true,
    cacheTTL: 86400000, // 24 hours
  }
};
