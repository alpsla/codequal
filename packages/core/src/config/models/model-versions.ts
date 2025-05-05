/**
 * Centralized model version configuration
 * 
 * This file contains the current version identifiers for all AI models used in the system.
 * Update this file when models are updated or new versions are released.
 */

/**
 * OpenAI model versions
 */
export const OPENAI_MODELS = {
  GPT_4O: 'gpt-4o-2024-05-13',
  GPT_4_TURBO: 'gpt-4-turbo-2024-04-09',
  GPT_3_5_TURBO: 'gpt-3.5-turbo-0125',
  // Add more models as needed
};

/**
 * Anthropic model versions
 */
export const ANTHROPIC_MODELS = {
  CLAUDE_3_OPUS: 'claude-3-opus-20240229',
  CLAUDE_3_SONNET: 'claude-3-sonnet-20240229',
  CLAUDE_3_HAIKU: 'claude-3-haiku-20240307',
  CLAUDE_2: 'claude-2.1',
  // Add more models as needed
};

/**
 * DeepSeek model versions
 * 
 * Pricing information from https://api-docs.deepseek.com/quick_start/pricing/
 */
export const DEEPSEEK_MODELS = {
  DEEPSEEK_CODER: 'deepseek-coder-33b-instruct',
  DEEPSEEK_CHAT: 'deepseek-chat',
  DEEPSEEK_CODER_LITE: 'deepseek-coder-lite-instruct',
  DEEPSEEK_CODER_PLUS: 'deepseek-coder-plus-instruct',
  // Add more models as needed
};

/**
 * DeepSeek pricing information per 1M tokens
 */
export const DEEPSEEK_PRICING = {
  [DEEPSEEK_MODELS.DEEPSEEK_CODER_LITE]: { input: 0.3, output: 0.3 },
  [DEEPSEEK_MODELS.DEEPSEEK_CODER]: { input: 0.7, output: 1.0 },
  [DEEPSEEK_MODELS.DEEPSEEK_CODER_PLUS]: { input: 1.5, output: 2.0 },
  // Add more models as needed
};

/**
 * Gemini model versions
 */
export const GEMINI_MODELS = {
  GEMINI_2_5_PRO: 'gemini-2.5-pro',
  GEMINI_2_5_FLASH: 'gemini-2.5-flash'
  // Add more models as needed
};

/**
 * Gemini pricing information per 1M tokens
 */
export const GEMINI_PRICING = {
  [GEMINI_MODELS.GEMINI_2_5_PRO]: { input: 1.25, output: 10.00 },
  [GEMINI_MODELS.GEMINI_2_5_FLASH]: { input: 0.15, output: 0.60, thinkingOutput: 3.50 }
  // Add more models as needed
};

/**
 * OpenAI pricing information per 1M tokens
 */
export const OPENAI_PRICING = {
  [OPENAI_MODELS.GPT_4O]: { input: 5.0, output: 15.0 },
  [OPENAI_MODELS.GPT_4_TURBO]: { input: 10.0, output: 30.0 },
  [OPENAI_MODELS.GPT_3_5_TURBO]: { input: 0.5, output: 1.5 }
  // Add more models as needed
};

// CodeWhisperer integration has been removed completely

/**
 * MCP model versions
 */
export const MCP_MODELS = {
  MCP_GEMINI: 'mcp-gemini-pro',
  MCP_OPENAI: 'mcp-gpt-4',
  MCP_DEEPSEEK: 'mcp-deepseek-coder',
  // Add more models as needed
};

/**
 * Default model selection by provider
 */
export const DEFAULT_MODELS_BY_PROVIDER = {
  'openai': OPENAI_MODELS.GPT_3_5_TURBO,
  'anthropic': ANTHROPIC_MODELS.CLAUDE_3_HAIKU,
  'deepseek': DEEPSEEK_MODELS.DEEPSEEK_CODER,
  'gemini': GEMINI_MODELS.GEMINI_2_5_FLASH, // Using the faster, more cost-effective model by default
  // Add more providers as needed
};

/**
 * Premium model selection by provider for complex analyses
 */
export const PREMIUM_MODELS_BY_PROVIDER = {
  'openai': OPENAI_MODELS.GPT_4O,
  'anthropic': ANTHROPIC_MODELS.CLAUDE_3_OPUS,
  'deepseek': DEEPSEEK_MODELS.DEEPSEEK_CODER_PLUS,
  'gemini': GEMINI_MODELS.GEMINI_2_5_PRO,
  // Add more providers as needed
};