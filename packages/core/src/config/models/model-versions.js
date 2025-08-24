"use strict";
/**
 * Centralized model version configuration
 *
 * This file contains the current version identifiers for all AI models used in the system.
 * Update this file when models are updated or new versions are released.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PREMIUM_MODELS_BY_PROVIDER = exports.DEFAULT_MODELS_BY_PROVIDER = exports.MCP_MODELS = exports.OPENROUTER_MODELS = exports.OPENAI_PRICING = exports.GEMINI_PRICING = exports.GEMINI_MODELS = exports.DEEPSEEK_PRICING = exports.DEEPSEEK_MODELS = exports.ANTHROPIC_MODELS = exports.OPENAI_MODELS = void 0;
/**
 * OpenAI model versions
 */
exports.OPENAI_MODELS = {
    GPT_4O: 'gpt-4o-2024-05-13',
    GPT_4_TURBO: 'gpt-4-turbo-2024-04-09',
    GPT_3_5_TURBO: 'gpt-3.5-turbo-0125',
    // Add more models as needed
};
/**
 * Anthropic model versions
 */
exports.ANTHROPIC_MODELS = {
    CLAUDE_3_OPUS: 'claude-3-opus-20240229',
    CLAUDE_3_SONNET: 'claude-3-sonnet-20240229',
    CLAUDE_3_HAIKU: 'claude-3-haiku-20240307',
    CLAUDE_3_5_SONNET: 'claude-3-5-sonnet-20240620',
    CLAUDE_3_7_SONNET: 'claude-3-7-sonnet', // Added Claude 3.7 Sonnet
    // Add more models as needed
};
/**
 * DeepSeek model versions
 *
 * Note: As of May 13, 2025, only the base 'deepseek-coder' model is available.
 * The 'lite' and 'plus' variants returned 'Model Not Exist' errors in testing.
 */
exports.DEEPSEEK_MODELS = {
    DEEPSEEK_CODER: 'deepseek-coder', // This is the only working DeepSeek model as of May 13, 2025
    // DeepSeek's API doesn't recognize these models anymore
    // DEEPSEEK_CODER_LITE: 'deepseek-coder-lite-instruct',
    // DEEPSEEK_CODER_PLUS: 'deepseek-coder-plus-instruct',
};
/**
 * DeepSeek pricing information per 1M tokens
 */
exports.DEEPSEEK_PRICING = {
    [exports.DEEPSEEK_MODELS.DEEPSEEK_CODER]: { input: 0.7, output: 1.0 },
    // Removed pricing for models that no longer exist
};
/**
 * Gemini model versions
 * Removed Gemini 1.5 models and added Gemini 2.5 models
 */
exports.GEMINI_MODELS = {
    GEMINI_2_5_PRO: 'gemini-2.5-pro', // Base model without version suffix for auto-updates
    GEMINI_2_5_PRO_PREVIEW: 'gemini-2.5-pro-preview-05-06', // Specific preview version
    GEMINI_2_5_FLASH: 'gemini-2.5-flash', // Base model without version suffix for auto-updates
    // Add more models as needed
};
/**
 * Gemini pricing information per 1M tokens
 */
exports.GEMINI_PRICING = {
    [exports.GEMINI_MODELS.GEMINI_2_5_PRO]: { input: 1.75, output: 14.00 },
    [exports.GEMINI_MODELS.GEMINI_2_5_PRO_PREVIEW]: { input: 1.75, output: 14.00 },
    [exports.GEMINI_MODELS.GEMINI_2_5_FLASH]: { input: 0.3, output: 1.25 }
    // Add more models as needed
};
/**
 * OpenAI pricing information per 1M tokens
 */
exports.OPENAI_PRICING = {
    [exports.OPENAI_MODELS.GPT_4O]: { input: 5.0, output: 15.0 },
    [exports.OPENAI_MODELS.GPT_4_TURBO]: { input: 10.0, output: 30.0 },
    [exports.OPENAI_MODELS.GPT_3_5_TURBO]: { input: 0.5, output: 1.5 }
    // Add more models as needed
};
/**
 * OpenRouter model versions
 */
exports.OPENROUTER_MODELS = {
    CLAUDE_3_7_SONNET: 'anthropic/claude-3.7-sonnet',
    DEEPHERMES_3_MISTRAL: 'nousresearch/deephermes-3-mistral-24b-preview:free'
    // Add more models as needed
};
/**
 * MCP model versions
 */
exports.MCP_MODELS = {
    MCP_GEMINI: 'mcp-gemini-pro',
    MCP_OPENAI: 'mcp-gpt-4',
    MCP_DEEPSEEK: 'mcp-deepseek-coder',
    // Add more models as needed
};
/**
 * Default model selection by provider
 */
exports.DEFAULT_MODELS_BY_PROVIDER = {
    'openai': exports.OPENAI_MODELS.GPT_3_5_TURBO,
    'anthropic': exports.ANTHROPIC_MODELS.CLAUDE_3_HAIKU,
    'deepseek': exports.DEEPSEEK_MODELS.DEEPSEEK_CODER,
    'google': exports.GEMINI_MODELS.GEMINI_2_5_FLASH, // Updated to Gemini 2.5 Flash
    'openrouter': exports.OPENROUTER_MODELS.DEEPHERMES_3_MISTRAL,
    // Add more providers as needed
};
/**
 * Premium model selection by provider for complex analyses
 */
exports.PREMIUM_MODELS_BY_PROVIDER = {
    'openai': exports.OPENAI_MODELS.GPT_4O,
    'anthropic': exports.ANTHROPIC_MODELS.CLAUDE_3_OPUS,
    'deepseek': exports.DEEPSEEK_MODELS.DEEPSEEK_CODER, // No longer using PLUS as it doesn't exist
    'google': exports.GEMINI_MODELS.GEMINI_2_5_PRO, // Updated to Gemini 2.5 Pro
    'openrouter': exports.OPENROUTER_MODELS.CLAUDE_3_7_SONNET,
    // Add more providers as needed
};
