"use strict";
/**
 * Simple OpenRouter Client - NO RETRIES, NO FALLBACKS
 *
 * Use this for testing/development to avoid excessive API calls.
 * Logic:
 * 1. Try OpenRouter once with primary key
 * 2. If 401 error → switch to EMERGENCY_FALLBACK_MODEL (Gemini/Claude direct)
 * 3. Otherwise → throw error (no retries)
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimpleOpenRouterClient = void 0;
exports.getSimpleOpenRouterClient = getSimpleOpenRouterClient;
const openai_1 = __importDefault(require("openai"));
class SimpleOpenRouterClient {
    constructor() {
        this.geminiClient = null;
        this.useEmergencyFallback = false;
        // Key rotation support (matching ModelConfigResolver)
        this.openrouterKeys = [];
        this.currentKeyIndex = 0;
        this.failedKeys = new Set();
        // Rate limiting to prevent runaway costs
        // SESSION 53: Increased from 100 to 150 to allow more complex repos to complete calibration
        // At ~$0.02/call, max cost = $3 per calibration run (acceptable safety limit)
        this.callCount = 0;
        this.sessionStartTime = Date.now();
        this.MAX_CALLS_PER_SESSION = parseInt(process.env.MAX_AI_CALLS_PER_SESSION || '150');
        this.SESSION_DURATION_MS = 60 * 60 * 1000; // 1 hour
        this.DEBUG_MODE = (process.env.DEBUG_MODE || process.env.DISABLE_RATE_LIMIT || '').toLowerCase() === 'true';
        // Load OpenRouter API keys (supports multiple keys via OPENROUTER_API_KEYS)
        this.loadOpenRouterKeys();
        // Initialize OpenRouter client with first available key
        const initialKey = this.getNextOpenRouterKey() || process.env.OPENROUTER_API_KEY || '';
        this.openrouterClient = new openai_1.default({
            apiKey: initialKey,
            baseURL: 'https://openrouter.ai/api/v1',
            defaultHeaders: {
                'HTTP-Referer': 'https://codequal.com',
                'X-Title': 'CodeQual Test'
            }
        });
        // Initialize Gemini fallback if configured
        if (process.env.GEMINI_API_KEY) {
            this.geminiClient = new openai_1.default({
                apiKey: process.env.GEMINI_API_KEY,
                baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/'
            });
        }
        if (this.DEBUG_MODE) {
            console.log(`[SimpleClient] DEBUG_MODE: Rate limiting DISABLED`);
        }
        else {
            console.log(`[SimpleClient] Rate limit: ${this.MAX_CALLS_PER_SESSION} calls per session`);
        }
        console.log(`[SimpleClient] Loaded ${this.openrouterKeys.length} OpenRouter API key(s)`);
    }
    /**
     * Load OpenRouter API keys from environment variables
     * Supports both single key (OPENROUTER_API_KEY) and multiple keys (OPENROUTER_API_KEYS)
     */
    loadOpenRouterKeys() {
        const keysString = process.env.OPENROUTER_API_KEYS || process.env.OPENROUTER_API_KEY || '';
        if (keysString) {
            // Split by comma, semicolon, or newline and filter empty strings
            this.openrouterKeys = keysString
                .split(/[,;\n]/)
                .map(key => key.trim())
                .filter(key => key.length > 0);
        }
    }
    /**
     * Get the next available OpenRouter API key
     * Rotates through available keys, skipping failed ones
     */
    getNextOpenRouterKey() {
        if (this.openrouterKeys.length === 0) {
            return null;
        }
        // Try all keys once
        const startIndex = this.currentKeyIndex;
        do {
            const key = this.openrouterKeys[this.currentKeyIndex];
            // Move to next key for subsequent calls
            this.currentKeyIndex = (this.currentKeyIndex + 1) % this.openrouterKeys.length;
            // Skip if this key has failed
            if (!this.failedKeys.has(key)) {
                return key;
            }
        } while (this.currentKeyIndex !== startIndex);
        // All keys have failed
        return null;
    }
    /**
     * Mark an OpenRouter key as failed and rotate to next key
     */
    markKeyAsFailedAndRotate() {
        const currentKey = this.openrouterClient.apiKey;
        if (currentKey) {
            this.failedKeys.add(currentKey);
            console.warn(`[SimpleClient] ⚠️  Marked OpenRouter key as failed (${this.failedKeys.size}/${this.openrouterKeys.length} failed)`);
        }
        // Try to get next available key
        const nextKey = this.getNextOpenRouterKey();
        if (nextKey) {
            console.log(`[SimpleClient] 🔄 Rotating to next OpenRouter key`);
            // Update the client with new key
            this.openrouterClient = new openai_1.default({
                apiKey: nextKey,
                baseURL: 'https://openrouter.ai/api/v1',
                defaultHeaders: {
                    'HTTP-Referer': 'https://codequal.com',
                    'X-Title': 'CodeQual Test'
                }
            });
            return true; // Successfully rotated
        }
        return false; // No more keys available
    }
    /**
     * Reset call counter (called automatically after session duration)
     */
    resetIfNeeded() {
        const elapsed = Date.now() - this.sessionStartTime;
        if (elapsed > this.SESSION_DURATION_MS) {
            console.log(`[SimpleClient] Session expired, resetting counter (was ${this.callCount} calls)`);
            this.callCount = 0;
            this.sessionStartTime = Date.now();
        }
    }
    /**
     * Check rate limit before making API call
     * Skipped when DEBUG_MODE=true (for E2E tests running multiple PR analyses)
     */
    checkRateLimit() {
        // Skip rate limit checks in debug mode (E2E tests, development)
        if (this.DEBUG_MODE) {
            return;
        }
        this.resetIfNeeded();
        if (this.callCount >= this.MAX_CALLS_PER_SESSION) {
            const elapsed = Date.now() - this.sessionStartTime;
            const remainingMs = this.SESSION_DURATION_MS - elapsed;
            const remainingMin = Math.ceil(remainingMs / 60000);
            throw new Error(`🚨 RATE LIMIT EXCEEDED: Made ${this.callCount} API calls in this session. ` +
                `Maximum allowed: ${this.MAX_CALLS_PER_SESSION}. ` +
                `Please wait ${remainingMin} minutes or restart the process. ` +
                `This is a safety measure to prevent runaway costs.`);
        }
    }
    /**
     * Simple chat completion - WITH KEY ROTATION on 401 errors
     * WITH RATE LIMITING to prevent runaway costs
     */
    async chat(request) {
        var _a, _b, _c, _d, _e, _f;
        // Check rate limit BEFORE making API call
        this.checkRateLimit();
        const { systemPrompt, userPrompt, model, temperature = 0.3, maxTokens = 1500 } = request;
        // Increment call counter
        this.callCount++;
        console.log(`[SimpleClient] API call ${this.callCount}/${this.MAX_CALLS_PER_SESSION}`);
        // If already using fallback, go straight to Gemini
        if (this.useEmergencyFallback && (process.env.STRICT_NO_FALLBACK === 'true' || process.env.E2E_DISABLE_EMERGENCY_FALLBACK === 'true')) {
            throw new Error('ALERT: Emergency fallback is disabled by STRICT_NO_FALLBACK');
        }
        // Try OpenRouter with current key
        try {
            const response = await this.openrouterClient.chat.completions.create({
                model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature,
                max_tokens: maxTokens
            });
            // SESSION 21 FIX: Extract cost from OpenRouter response
            // NOTE: OpenRouter API does NOT include total_cost in the response.
            // Per https://openrouter.ai/docs/api/reference/overview, cost must be either:
            // 1. Fetched via /api/v1/generation endpoint (requires additional API call)
            // 2. Calculated from tokens and model pricing
            // We use option 2 for efficiency.
            const usage = response.usage || {};
            const cost = this.calculateCostFromTokens(model, usage.prompt_tokens || 0, usage.completion_tokens || 0);
            // SESSION 24 DEBUG: Log cost calculation
            console.log(`[OpenRouter] Response usage:`, {
                prompt_tokens: usage.prompt_tokens,
                completion_tokens: usage.completion_tokens,
                model: model
            });
            console.log(`[OpenRouter] Calculated cost: $${cost.toFixed(6)}`);
            return {
                content: ((_b = (_a = response.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) || '',
                provider: 'openrouter',
                model,
                usage: {
                    promptTokens: usage.prompt_tokens || 0,
                    completionTokens: usage.completion_tokens || 0,
                    totalTokens: usage.total_tokens || 0
                },
                cost // SESSION 21 FIX: Include actual cost from OpenRouter
            };
        }
        catch (error) {
            // On 401 authentication error, try key rotation
            if (error.status === 401 || ((_c = error.message) === null || _c === void 0 ? void 0 : _c.includes('401')) || ((_d = error.message) === null || _d === void 0 ? void 0 : _d.includes('authentication'))) {
                console.warn('[SimpleClient] ⚠️  OpenRouter 401 error - attempting key rotation');
                // Try to rotate to next available key
                if (this.markKeyAsFailedAndRotate()) {
                    console.log('[SimpleClient] 🔄 Retrying with rotated key...');
                    // Retry the request with new key (recursive call)
                    return this.chat(request);
                }
                // All keys failed - SESSION-96 FIX: Use Supabase fallback_model, NOT hardcoded Gemini
                // BUG-101 FIX: Use Supabase fallback_model for 401 errors too
                const fallbackModel = request.fallbackModel;
                if (fallbackModel && fallbackModel !== model) {
                    console.log(`[SimpleClient] 🔄 All keys exhausted - switching to Supabase fallback_model: ${fallbackModel}`);
                    return this.chat({
                        ...request,
                        model: fallbackModel,
                        fallbackModel: undefined // Don't retry fallback again
                    });
                }
                // SESSION-96 FIX: REMOVED hardcoded Gemini fallback - MUST configure fallback_model in Supabase
                throw new Error('All OpenRouter keys failed and no Supabase fallback_model configured! ' +
                    'Run monthly-model-refresh.ts to populate model_configurations table with fallback_model.');
            }
            // BUG-101 FIX: Handle 429 rate limit errors - switch to Supabase fallback_model (NOT Gemini)
            if (error.status === 429 || ((_e = error.message) === null || _e === void 0 ? void 0 : _e.includes('429')) || ((_f = error.message) === null || _f === void 0 ? void 0 : _f.includes('Rate limit'))) {
                console.warn('[SimpleClient] ⚠️  OpenRouter 429 RATE LIMIT');
                console.warn(`[SimpleClient] Rate limit details: ${error.message}`);
                // Check if fallback is allowed
                if (process.env.STRICT_NO_FALLBACK === 'true' || process.env.E2E_DISABLE_EMERGENCY_FALLBACK === 'true') {
                    throw new Error('ALERT: Rate limited and STRICT_NO_FALLBACK is enabled - cannot use fallback');
                }
                // BUG-101 FIX: Use Supabase fallback_model (NOT Gemini) - both are OpenRouter models
                const fallbackModel = request.fallbackModel;
                if (fallbackModel && fallbackModel !== model) {
                    console.log(`[SimpleClient] 🔄 Switching to Supabase fallback_model: ${fallbackModel}`);
                    // Retry with fallback model (still using OpenRouter)
                    return this.chat({
                        ...request,
                        model: fallbackModel,
                        fallbackModel: undefined // Don't retry fallback again
                    });
                }
                // No Supabase fallback model - try key rotation
                if (this.markKeyAsFailedAndRotate()) {
                    console.log('[SimpleClient] 🔄 Rate limited - trying next OpenRouter key...');
                    return this.chat(request);
                }
                // SESSION-96 FIX: REMOVED hardcoded Gemini fallback - MUST configure fallback_model in Supabase
                throw new Error(`Rate limit exceeded and no Supabase fallback_model configured! ` +
                    `Run monthly-model-refresh.ts to populate model_configurations table with fallback_model. ` +
                    `Original error: ${error.message}`);
            }
            // For any other error, throw immediately (no retries)
            throw new Error(`OpenRouter API error: ${error.message}`);
        }
    }
    /**
     * Get current rate limit status
     */
    getStatus() {
        this.resetIfNeeded();
        const elapsed = Date.now() - this.sessionStartTime;
        const remainingMs = this.SESSION_DURATION_MS - elapsed;
        return {
            callCount: this.callCount,
            maxCalls: this.MAX_CALLS_PER_SESSION,
            resetIn: Math.ceil(remainingMs / 60000) // minutes
        };
    }
    /**
     * Calculate cost from token counts and model pricing
     * Pricing data per 1M tokens (as of Dec 2025)
     * Source: https://openrouter.ai/models
     */
    calculateCostFromTokens(model, inputTokens, outputTokens) {
        // Pricing per 1M tokens (input, output) - updated Dec 2025
        const MODEL_PRICING = {
            // Claude models
            'anthropic/claude-3.5-sonnet': { input: 3.0, output: 15.0 },
            'anthropic/claude-3-5-sonnet-20241022': { input: 3.0, output: 15.0 },
            'anthropic/claude-3-haiku': { input: 0.25, output: 1.25 },
            'anthropic/claude-3-opus': { input: 15.0, output: 75.0 },
            // GPT-4 models
            'openai/gpt-4-turbo': { input: 10.0, output: 30.0 },
            'openai/gpt-4o': { input: 2.5, output: 10.0 },
            'openai/gpt-4o-mini': { input: 0.15, output: 0.6 },
            'openai/gpt-4': { input: 30.0, output: 60.0 },
            // Gemini models
            'google/gemini-2.0-flash-exp': { input: 0.0, output: 0.0 }, // Free tier
            'google/gemini-pro': { input: 0.5, output: 1.5 },
            'google/gemini-pro-1.5': { input: 1.25, output: 5.0 },
            // DeepSeek models (very cheap)
            'deepseek/deepseek-chat': { input: 0.14, output: 0.28 },
            'deepseek/deepseek-coder': { input: 0.14, output: 0.28 },
            // Qwen models
            'qwen/qwen-2.5-72b-instruct': { input: 0.35, output: 0.4 },
            'qwen/qwen-2-72b-instruct': { input: 0.56, output: 0.77 },
            // Llama models
            'meta-llama/llama-3.1-405b-instruct': { input: 2.7, output: 2.7 },
            'meta-llama/llama-3.1-70b-instruct': { input: 0.52, output: 0.75 },
            'meta-llama/llama-3.1-8b-instruct': { input: 0.055, output: 0.055 },
            // Mistral models
            'mistralai/mistral-large': { input: 2.0, output: 6.0 },
            'mistralai/mixtral-8x7b-instruct': { input: 0.24, output: 0.24 },
        };
        // Look up pricing (try exact match, then prefix match)
        let pricing = MODEL_PRICING[model];
        if (!pricing) {
            // Try prefix match for versioned models
            const modelPrefix = Object.keys(MODEL_PRICING).find(key => model.startsWith(key));
            pricing = modelPrefix ? MODEL_PRICING[modelPrefix] : null;
        }
        // Default fallback pricing (conservative estimate)
        if (!pricing) {
            console.warn(`[OpenRouter] No pricing data for model ${model}, using default`);
            pricing = { input: 1.0, output: 3.0 }; // $1/$3 per 1M tokens
        }
        // Calculate cost (pricing is per 1M tokens)
        const inputCost = (inputTokens / 1000000) * pricing.input;
        const outputCost = (outputTokens / 1000000) * pricing.output;
        return inputCost + outputCost;
    }
    /**
     * Call Gemini directly as emergency fallback
     */
    async callGemini(systemPrompt, userPrompt, temperature, maxTokens) {
        var _a, _b;
        if (!this.geminiClient) {
            throw new Error('Gemini fallback not configured (missing GEMINI_API_KEY)');
        }
        try {
            const response = await this.geminiClient.chat.completions.create({
                model: 'gemini-2.0-flash-exp',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature,
                max_tokens: maxTokens
            });
            return {
                content: ((_b = (_a = response.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) || '',
                provider: 'gemini',
                model: 'gemini-2.0-flash-exp'
            };
        }
        catch (error) {
            throw new Error(`Emergency fallback (Gemini) failed: ${error.message}`);
        }
    }
}
exports.SimpleOpenRouterClient = SimpleOpenRouterClient;
// Singleton instance
let instance = null;
function getSimpleOpenRouterClient() {
    if (!instance) {
        instance = new SimpleOpenRouterClient();
    }
    return instance;
}
