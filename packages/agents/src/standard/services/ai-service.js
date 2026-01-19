"use strict";
/**
 * Standard AI Service for LLM Calls
 *
 * Provides a unified interface for making AI/LLM calls using models
 * selected by the ResearcherAgent and stored in Supabase.
 *
 * This service:
 * - Uses models from UnifiedModelSelector (no hardcoded models)
 * - Supports primary and fallback models
 * - Integrates with OpenRouter API
 * - Provides cost tracking and monitoring
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIService = void 0;
exports.createAIService = createAIService;
exports.getSharedAIService = getSharedAIService;
// Create a simple logger for now
const createLogger = (name) => ({
    debug: (...args) => console.log(`[${name}] [DEBUG]`, ...args),
    info: (...args) => console.log(`[${name}] [INFO]`, ...args),
    warn: (...args) => console.warn(`[${name}] [WARN]`, ...args),
    error: (...args) => console.error(`[${name}] [ERROR]`, ...args)
});
const logger = createLogger('AIService');
/**
 * Standard AI Service for making LLM calls
 */
class AIService {
    constructor(config = {}) {
        this.config = {
            maxRetries: 2,
            timeout: 60000,
            temperature: 0.1,
            maxTokens: 2000,
            ...config
        };
        this.apiKey = config.openRouterApiKey || process.env.OPENROUTER_API_KEY || '';
        if (!this.apiKey) {
            logger.warn('OpenRouter API key not configured - AI calls will fail');
        }
    }
    /**
     * Make an AI call using the provided model
     */
    async call(model, request) {
        var _a;
        const startTime = Date.now();
        const modelIdentifier = this.getModelIdentifier(model);
        logger.debug(`Calling model: ${modelIdentifier}`, {
            temperature: request.temperature || this.config.temperature,
            maxTokens: request.maxTokens || this.config.maxTokens
        });
        try {
            const response = await this.makeOpenRouterRequest(modelIdentifier, request);
            const latency = Date.now() - startTime;
            const result = {
                content: response.content,
                model: model.model,
                provider: model.provider,
                usage: response.usage,
                cost: this.calculateCost(response.usage, model),
                latency
            };
            logger.info('AI call successful', {
                model: modelIdentifier,
                tokens: (_a = response.usage) === null || _a === void 0 ? void 0 : _a.totalTokens,
                cost: result.cost,
                latency
            });
            return result;
        }
        catch (error) {
            logger.error(`AI call failed for ${modelIdentifier}:`, error);
            throw error;
        }
    }
    /**
     * Make an AI call with automatic fallback
     */
    async callWithFallback(models, request) {
        try {
            // Try primary model first
            return await this.call(models.primary, request);
        }
        catch (primaryError) {
            logger.warn('Primary model failed, trying fallback', {
                primary: this.getModelIdentifier(models.primary),
                fallback: this.getModelIdentifier(models.fallback),
                error: primaryError
            });
            try {
                // Try fallback model
                const response = await this.call(models.fallback, request);
                response.model = `${response.model} (fallback)`;
                return response;
            }
            catch (fallbackError) {
                logger.error('Both primary and fallback models failed', {
                    primary: this.getModelIdentifier(models.primary),
                    fallback: this.getModelIdentifier(models.fallback),
                    primaryError,
                    fallbackError
                });
                throw new Error('All models failed: ' + fallbackError.message);
            }
        }
    }
    /**
     * Make request to OpenRouter API
     */
    async makeOpenRouterRequest(modelIdentifier, request) {
        var _a, _b, _c, _d, _e, _f, _g;
        const messages = [];
        if (request.systemPrompt) {
            messages.push({
                role: 'system',
                content: request.systemPrompt
            });
        }
        messages.push({
            role: 'user',
            content: request.prompt
        });
        const body = {
            model: modelIdentifier,
            messages,
            temperature: (_a = request.temperature) !== null && _a !== void 0 ? _a : this.config.temperature,
            max_tokens: (_b = request.maxTokens) !== null && _b !== void 0 ? _b : this.config.maxTokens,
            top_p: (_c = request.topP) !== null && _c !== void 0 ? _c : 0.95,
            stream: (_d = request.stream) !== null && _d !== void 0 ? _d : false
        };
        // Add response format for JSON mode
        if (request.jsonMode) {
            body.response_format = { type: 'json_object' };
        }
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://codequal.com',
                'X-Title': 'CodeQual AI Service'
            },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(this.config.timeout)
        });
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`OpenRouter API error (${response.status}): ${error}`);
        }
        const data = await response.json();
        if (!((_g = (_f = (_e = data.choices) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f.message) === null || _g === void 0 ? void 0 : _g.content)) {
            throw new Error('Invalid response from OpenRouter');
        }
        return {
            content: data.choices[0].message.content,
            usage: data.usage ? {
                promptTokens: data.usage.prompt_tokens,
                completionTokens: data.usage.completion_tokens,
                totalTokens: data.usage.total_tokens
            } : undefined
        };
    }
    /**
     * Get OpenRouter model identifier
     */
    getModelIdentifier(model) {
        // Handle various model ID formats
        const modelId = model.model_id || model.model;
        // Some models already include provider prefix
        if (modelId.includes('/')) {
            return modelId;
        }
        // Construct provider/model format for OpenRouter
        return `${model.provider}/${modelId}`;
    }
    /**
     * Calculate cost based on usage and model pricing
     */
    calculateCost(usage, model) {
        if (!usage || !model.pricing) {
            return 0;
        }
        const inputCost = (usage.promptTokens / 1000000) * model.pricing.input;
        const outputCost = (usage.completionTokens / 1000000) * model.pricing.output;
        return inputCost + outputCost;
    }
    /**
     * Validate that API key is configured
     */
    isConfigured() {
        return !!this.apiKey;
    }
    /**
     * Update configuration
     */
    updateConfig(config) {
        this.config = { ...this.config, ...config };
        if (config.openRouterApiKey) {
            this.apiKey = config.openRouterApiKey;
        }
    }
}
exports.AIService = AIService;
/**
 * Factory function to create AI Service
 */
function createAIService(config) {
    return new AIService(config);
}
/**
 * Singleton instance for shared use
 */
let sharedInstance = null;
function getSharedAIService(config) {
    if (!sharedInstance) {
        sharedInstance = createAIService(config);
    }
    else if (config) {
        sharedInstance.updateConfig(config);
    }
    return sharedInstance;
}
