"use strict";
/**
 * OpenRouter API Key Manager with Multi-Key Fallback
 *
 * Handles automatic failover between multiple OpenRouter API keys to ensure
 * service continuity when individual keys fail due to:
 * - Rate limits (429)
 * - Authentication failures (401, 403)
 * - Account issues
 * - Service degradation
 *
 * Configuration:
 * - Set OPENROUTER_API_KEYS in .env (comma-separated list)
 * - Or set individual keys: OPENROUTER_API_KEY_1, OPENROUTER_API_KEY_2, etc.
 *
 * Example .env:
 * OPENROUTER_API_KEYS=sk-or-v1-key1,sk-or-v1-key2,sk-or-v1-key3
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenRouterKeyManager = void 0;
exports.getOpenRouterKeyManager = getOpenRouterKeyManager;
const openai_1 = __importDefault(require("openai"));
class OpenRouterKeyManager {
    constructor(customConfig) {
        var _a, _b, _c;
        this.currentKeyIndex = 0;
        // Load API keys from environment
        const keys = this.loadKeysFromEnv();
        if (keys.length === 0) {
            throw new Error('No OpenRouter API keys configured. Set OPENROUTER_API_KEYS or OPENROUTER_API_KEY in .env');
        }
        this.config = {
            apiKeys: keys,
            maxRetriesPerKey: (_a = customConfig === null || customConfig === void 0 ? void 0 : customConfig.maxRetriesPerKey) !== null && _a !== void 0 ? _a : 2,
            blacklistDurationMs: (_b = customConfig === null || customConfig === void 0 ? void 0 : customConfig.blacklistDurationMs) !== null && _b !== void 0 ? _b : 5 * 60 * 1000, // 5 minutes
            retryDelayMs: (_c = customConfig === null || customConfig === void 0 ? void 0 : customConfig.retryDelayMs) !== null && _c !== void 0 ? _c : 1000
        };
        // Initialize key statuses
        this.keyStatuses = new Map();
        this.config.apiKeys.forEach(key => {
            this.keyStatuses.set(key, {
                key: this.maskKey(key),
                failureCount: 0
            });
        });
        console.log(`[OpenRouterKeyManager] Initialized with ${keys.length} API key(s)`);
    }
    /**
     * Load API keys from environment variables
     */
    loadKeysFromEnv() {
        const keys = [];
        // Option 1: Comma-separated list
        if (process.env.OPENROUTER_API_KEYS) {
            const keyList = process.env.OPENROUTER_API_KEYS.split(',')
                .map(k => k.trim())
                .filter(k => k.length > 0);
            keys.push(...keyList);
        }
        // Option 2: Individual numbered keys
        let keyNum = 1;
        while (process.env[`OPENROUTER_API_KEY_${keyNum}`]) {
            keys.push(process.env[`OPENROUTER_API_KEY_${keyNum}`]);
            keyNum++;
        }
        // Option 3: Single key (fallback for backward compatibility)
        if (keys.length === 0 && process.env.OPENROUTER_API_KEY) {
            keys.push(process.env.OPENROUTER_API_KEY);
        }
        return [...new Set(keys)]; // Remove duplicates
    }
    /**
     * Get next available API key with automatic fallback
     */
    async getWorkingKey() {
        const availableKeys = this.getAvailableKeys();
        if (availableKeys.length === 0) {
            throw new Error('All OpenRouter API keys are currently blacklisted. ' +
                'Wait 5 minutes or add more keys to .env');
        }
        // Try each available key
        for (const key of availableKeys) {
            if (await this.testKey(key)) {
                this.currentKeyIndex = this.config.apiKeys.indexOf(key);
                return key;
            }
        }
        throw new Error('No working OpenRouter API keys available');
    }
    /**
     * Create OpenAI client with automatic key rotation
     */
    async createClient(agentRole) {
        const key = await this.getWorkingKey();
        const config = {
            apiKey: key,
            baseURL: 'https://openrouter.ai/api/v1',
            defaultHeaders: {
                'HTTP-Referer': 'https://codequal.com',
                'X-Title': agentRole ? `CodeQual ${agentRole} Agent` : 'CodeQual'
            }
        };
        return new openai_1.default(config);
    }
    /**
     * Execute API call with automatic retry and key rotation
     */
    async executeWithFallback(fn, agentRole) {
        let lastError;
        const availableKeys = this.getAvailableKeys();
        for (const key of availableKeys) {
            for (let attempt = 1; attempt <= this.config.maxRetriesPerKey; attempt++) {
                try {
                    const client = new openai_1.default({
                        apiKey: key,
                        baseURL: 'https://openrouter.ai/api/v1',
                        defaultHeaders: {
                            'HTTP-Referer': 'https://codequal.com',
                            'X-Title': agentRole ? `CodeQual ${agentRole} Agent` : 'CodeQual'
                        }
                    });
                    const result = await fn(client);
                    // Success - reset failure count
                    const status = this.keyStatuses.get(key);
                    status.failureCount = 0;
                    status.lastUsed = new Date();
                    console.log(`[OpenRouterKeyManager] ✅ Success with key ${this.maskKey(key)}`);
                    return result;
                }
                catch (error) {
                    lastError = error;
                    const status = this.keyStatuses.get(key);
                    status.failureCount++;
                    status.lastError = error.message;
                    // Check if this is a permanent failure (authentication error)
                    if (this.isPermanentError(error)) {
                        console.error(`[OpenRouterKeyManager] ❌ Permanent failure with key ${this.maskKey(key)}: ${error.message}`);
                        this.blacklistKey(key);
                        break; // Try next key immediately
                    }
                    // Check if this is a rate limit
                    if (this.isRateLimitError(error)) {
                        console.warn(`[OpenRouterKeyManager] ⏳ Rate limit hit on key ${this.maskKey(key)}, trying next key`);
                        this.blacklistKey(key, 60 * 1000); // Blacklist for 1 minute
                        break; // Try next key immediately
                    }
                    // Transient error - retry with same key
                    if (attempt < this.config.maxRetriesPerKey) {
                        const delay = Math.pow(2, attempt) * this.config.retryDelayMs;
                        console.warn(`[OpenRouterKeyManager] ⚠️  Retry ${attempt}/${this.config.maxRetriesPerKey} ` +
                            `for key ${this.maskKey(key)} after ${delay}ms`);
                        await this.sleep(delay);
                    }
                }
            }
        }
        // All keys failed
        throw new Error(`All OpenRouter API keys failed. Last error: ${lastError === null || lastError === void 0 ? void 0 : lastError.message}. ` +
            `Consider adding more keys or implementing graceful degradation.`);
    }
    /**
     * Test if a key is working
     */
    async testKey(key) {
        try {
            const client = new openai_1.default({
                apiKey: key,
                baseURL: 'https://openrouter.ai/api/v1'
            });
            // Quick test call
            await client.chat.completions.create({
                model: 'openai/gpt-3.5-turbo',
                messages: [{ role: 'user', content: 'test' }],
                max_tokens: 1
            });
            return true;
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Get list of non-blacklisted keys
     */
    getAvailableKeys() {
        const now = Date.now();
        return this.config.apiKeys.filter(key => {
            const status = this.keyStatuses.get(key);
            return !status.blacklistedUntil || status.blacklistedUntil.getTime() < now;
        });
    }
    /**
     * Blacklist a key temporarily
     */
    blacklistKey(key, durationMs) {
        const status = this.keyStatuses.get(key);
        const duration = durationMs !== null && durationMs !== void 0 ? durationMs : this.config.blacklistDurationMs;
        status.blacklistedUntil = new Date(Date.now() + duration);
        console.warn(`[OpenRouterKeyManager] 🚫 Key ${this.maskKey(key)} blacklisted for ${duration / 1000}s`);
    }
    /**
     * Check if error is permanent (authentication/authorization)
     */
    isPermanentError(error) {
        var _a, _b;
        return (error.status === 401 || // Unauthorized (bad key, user not found)
            error.status === 403 || // Forbidden
            ((_a = error.message) === null || _a === void 0 ? void 0 : _a.includes('User not found')) ||
            ((_b = error.message) === null || _b === void 0 ? void 0 : _b.includes('Invalid API key')));
    }
    /**
     * Check if error is rate limit
     */
    isRateLimitError(error) {
        var _a;
        return error.status === 429 || ((_a = error.message) === null || _a === void 0 ? void 0 : _a.includes('rate limit'));
    }
    /**
     * Mask API key for logging (show first 10 and last 3 characters)
     */
    maskKey(key) {
        if (key.length < 20)
            return '***';
        return `${key.substring(0, 10)}...${key.substring(key.length - 3)}`;
    }
    /**
     * Get status of all keys
     */
    getKeyStatuses() {
        return Array.from(this.keyStatuses.values());
    }
    /**
     * Sleep utility
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.OpenRouterKeyManager = OpenRouterKeyManager;
// Singleton instance
let instance = null;
function getOpenRouterKeyManager() {
    if (!instance) {
        instance = new OpenRouterKeyManager();
    }
    return instance;
}
