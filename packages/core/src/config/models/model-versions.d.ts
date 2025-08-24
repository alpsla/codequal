/**
 * Centralized model version configuration
 *
 * This file contains the current version identifiers for all AI models used in the system.
 * Update this file when models are updated or new versions are released.
 */
/**
 * OpenAI model versions
 */
export declare const OPENAI_MODELS: {
    GPT_4O: string;
    GPT_4_TURBO: string;
    GPT_3_5_TURBO: string;
};
/**
 * Anthropic model versions
 */
export declare const ANTHROPIC_MODELS: {
    CLAUDE_3_OPUS: string;
    CLAUDE_3_SONNET: string;
    CLAUDE_3_HAIKU: string;
    CLAUDE_3_5_SONNET: string;
    CLAUDE_3_7_SONNET: string;
};
/**
 * DeepSeek model versions
 *
 * Note: As of May 13, 2025, only the base 'deepseek-coder' model is available.
 * The 'lite' and 'plus' variants returned 'Model Not Exist' errors in testing.
 */
export declare const DEEPSEEK_MODELS: {
    DEEPSEEK_CODER: string;
};
/**
 * DeepSeek pricing information per 1M tokens
 */
export declare const DEEPSEEK_PRICING: {
    [DEEPSEEK_MODELS.DEEPSEEK_CODER]: {
        input: number;
        output: number;
    };
};
/**
 * Gemini model versions
 * Removed Gemini 1.5 models and added Gemini 2.5 models
 */
export declare const GEMINI_MODELS: {
    GEMINI_2_5_PRO: string;
    GEMINI_2_5_PRO_PREVIEW: string;
    GEMINI_2_5_FLASH: string;
};
/**
 * Gemini pricing information per 1M tokens
 */
export declare const GEMINI_PRICING: {
    [GEMINI_MODELS.GEMINI_2_5_PRO]: {
        input: number;
        output: number;
    };
    [GEMINI_MODELS.GEMINI_2_5_PRO_PREVIEW]: {
        input: number;
        output: number;
    };
    [GEMINI_MODELS.GEMINI_2_5_FLASH]: {
        input: number;
        output: number;
    };
};
/**
 * OpenAI pricing information per 1M tokens
 */
export declare const OPENAI_PRICING: {
    [OPENAI_MODELS.GPT_4O]: {
        input: number;
        output: number;
    };
    [OPENAI_MODELS.GPT_4_TURBO]: {
        input: number;
        output: number;
    };
    [OPENAI_MODELS.GPT_3_5_TURBO]: {
        input: number;
        output: number;
    };
};
/**
 * OpenRouter model versions
 */
export declare const OPENROUTER_MODELS: {
    CLAUDE_3_7_SONNET: string;
    DEEPHERMES_3_MISTRAL: string;
};
/**
 * MCP model versions
 */
export declare const MCP_MODELS: {
    MCP_GEMINI: string;
    MCP_OPENAI: string;
    MCP_DEEPSEEK: string;
};
/**
 * Default model selection by provider
 */
export declare const DEFAULT_MODELS_BY_PROVIDER: {
    openai: string;
    anthropic: string;
    deepseek: string;
    google: string;
    openrouter: string;
};
/**
 * Premium model selection by provider for complex analyses
 */
export declare const PREMIUM_MODELS_BY_PROVIDER: {
    openai: string;
    anthropic: string;
    deepseek: string;
    google: string;
    openrouter: string;
};
