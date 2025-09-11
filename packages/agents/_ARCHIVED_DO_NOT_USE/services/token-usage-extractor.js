"use strict";
/**
 * Token Usage Extractor
 *
 * This service provides an abstraction layer for extracting token usage
 * information from various AI model API responses dynamically.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DynamicTokenUsageExtractor = exports.CohereTokenExtractor = exports.GoogleTokenExtractor = exports.AnthropicTokenExtractor = exports.OpenAITokenExtractor = void 0;
exports.getTokenUsageExtractor = getTokenUsageExtractor;
exports.extractTokenUsage = extractTokenUsage;
const utils_1 = require("@codequal/core/utils");
/**
 * OpenAI/OpenRouter token usage extractor
 */
class OpenAITokenExtractor {
    constructor() {
        this.providerName = 'OpenAI/OpenRouter';
    }
    canExtract(response) {
        return response?.usage &&
            typeof response.usage.prompt_tokens === 'number' &&
            typeof response.usage.completion_tokens === 'number';
    }
    extract(response) {
        if (!this.canExtract(response))
            return null;
        return {
            input: response.usage.prompt_tokens || 0,
            output: response.usage.completion_tokens || 0,
            total: response.usage.total_tokens ||
                (response.usage.prompt_tokens + response.usage.completion_tokens) || 0
        };
    }
}
exports.OpenAITokenExtractor = OpenAITokenExtractor;
/**
 * Anthropic/Claude token usage extractor
 */
class AnthropicTokenExtractor {
    constructor() {
        this.providerName = 'Anthropic';
    }
    canExtract(response) {
        return response?.usage &&
            typeof response.usage.input_tokens === 'number' &&
            typeof response.usage.output_tokens === 'number';
    }
    extract(response) {
        if (!this.canExtract(response))
            return null;
        return {
            input: response.usage.input_tokens || 0,
            output: response.usage.output_tokens || 0,
            total: (response.usage.input_tokens || 0) + (response.usage.output_tokens || 0)
        };
    }
}
exports.AnthropicTokenExtractor = AnthropicTokenExtractor;
/**
 * Google/Gemini token usage extractor
 */
class GoogleTokenExtractor {
    constructor() {
        this.providerName = 'Google';
    }
    canExtract(response) {
        return response?.usageMetadata &&
            typeof response.usageMetadata.promptTokenCount === 'number' &&
            typeof response.usageMetadata.candidatesTokenCount === 'number';
    }
    extract(response) {
        if (!this.canExtract(response))
            return null;
        return {
            input: response.usageMetadata.promptTokenCount || 0,
            output: response.usageMetadata.candidatesTokenCount || 0,
            total: response.usageMetadata.totalTokenCount ||
                (response.usageMetadata.promptTokenCount + response.usageMetadata.candidatesTokenCount) || 0
        };
    }
}
exports.GoogleTokenExtractor = GoogleTokenExtractor;
/**
 * Cohere token usage extractor
 */
class CohereTokenExtractor {
    constructor() {
        this.providerName = 'Cohere';
    }
    canExtract(response) {
        return response?.meta?.tokens &&
            typeof response.meta.tokens.input_tokens === 'number' &&
            typeof response.meta.tokens.output_tokens === 'number';
    }
    extract(response) {
        if (!this.canExtract(response))
            return null;
        return {
            input: response.meta.tokens.input_tokens || 0,
            output: response.meta.tokens.output_tokens || 0,
            total: (response.meta.tokens.input_tokens || 0) + (response.meta.tokens.output_tokens || 0)
        };
    }
}
exports.CohereTokenExtractor = CohereTokenExtractor;
/**
 * Generic token usage extractor that tries multiple strategies
 */
class DynamicTokenUsageExtractor {
    constructor() {
        this.logger = (0, utils_1.createLogger)('DynamicTokenUsageExtractor');
        // Register all known extractors
        this.extractors = [
            new OpenAITokenExtractor(),
            new AnthropicTokenExtractor(),
            new GoogleTokenExtractor(),
            new CohereTokenExtractor()
        ];
    }
    /**
     * Extract token usage from any supported API response
     */
    extractTokenUsage(response) {
        if (!response)
            return null;
        // Try each extractor until one works
        for (const extractor of this.extractors) {
            if (extractor.canExtract(response)) {
                const usage = extractor.extract(response);
                if (usage) {
                    this.logger.debug('Token usage extracted', {
                        provider: extractor.providerName,
                        usage
                    });
                    return usage;
                }
            }
        }
        // If no extractor worked, try to find usage data heuristically
        const heuristicUsage = this.extractHeuristically(response);
        if (heuristicUsage) {
            this.logger.debug('Token usage extracted heuristically', { usage: heuristicUsage });
            return heuristicUsage;
        }
        this.logger.debug('No token usage found in response');
        return null;
    }
    /**
     * Try to extract token usage heuristically from unknown response formats
     */
    extractHeuristically(response) {
        // Look for common patterns in the response
        const possibleUsageKeys = ['usage', 'token_usage', 'tokenUsage', 'tokens', 'meta'];
        for (const key of possibleUsageKeys) {
            if (response[key] && typeof response[key] === 'object') {
                const usage = response[key];
                // Try different naming conventions
                const inputTokens = usage.input_tokens || usage.inputTokens || usage.prompt_tokens ||
                    usage.promptTokens || usage.input || usage.prompt || 0;
                const outputTokens = usage.output_tokens || usage.outputTokens || usage.completion_tokens ||
                    usage.completionTokens || usage.output || usage.completion || 0;
                const totalTokens = usage.total_tokens || usage.totalTokens || usage.total ||
                    (inputTokens + outputTokens) || 0;
                if (inputTokens > 0 || outputTokens > 0) {
                    return {
                        input: inputTokens,
                        output: outputTokens,
                        total: totalTokens
                    };
                }
            }
        }
        return null;
    }
    /**
     * Register a custom token extractor
     */
    registerExtractor(extractor) {
        this.extractors.push(extractor);
        this.logger.info('Registered custom token extractor', {
            provider: extractor.providerName
        });
    }
}
exports.DynamicTokenUsageExtractor = DynamicTokenUsageExtractor;
// Singleton instance
let extractorInstance = null;
/**
 * Get the dynamic token usage extractor instance
 */
function getTokenUsageExtractor() {
    if (!extractorInstance) {
        extractorInstance = new DynamicTokenUsageExtractor();
    }
    return extractorInstance;
}
/**
 * Extract token usage from any API response
 */
function extractTokenUsage(response) {
    return getTokenUsageExtractor().extractTokenUsage(response);
}
