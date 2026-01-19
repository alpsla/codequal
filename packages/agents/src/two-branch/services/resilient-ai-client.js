"use strict";
/**
 * Resilient AI Client Factory
 *
 * Single source of truth for ALL AI API calls in V9 system.
 * Provides complete 3-tier resilience:
 * 1. OpenRouter multi-key rotation (3+ keys with exponential backoff)
 * 2. Emergency fallback provider (Gemini/Claude/GPT direct)
 * 3. User-friendly error message (no static fallback)
 *
 * Usage:
 * ```typescript
 * const aiClient = getResilientAIClient();
 * const response = await aiClient.chat({
 *   systemPrompt: "You are a security expert",
 *   userPrompt: "Analyze this code...",
 *   role: "SecurityAgent"
 * });
 * ```
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResilientAIClient = exports.AIServiceUnavailableError = void 0;
exports.getResilientAIClient = getResilientAIClient;
exports.chat = chat;
const openrouter_key_manager_1 = require("./openrouter-key-manager");
const emergency_fallback_provider_1 = require("./emergency-fallback-provider");
/**
 * Custom error for AI service unavailability
 */
class AIServiceUnavailableError extends Error {
    constructor(message, role) {
        super(message);
        this.role = role;
        this.name = 'AIServiceUnavailableError';
    }
}
exports.AIServiceUnavailableError = AIServiceUnavailableError;
/**
 * Resilient AI Client
 *
 * Handles all AI API calls with automatic failover and fallback.
 * Thread-safe singleton with complete error recovery.
 */
class ResilientAIClient {
    constructor() {
        this.keyManager = (0, openrouter_key_manager_1.getOpenRouterKeyManager)();
        this.emergencyProvider = (0, emergency_fallback_provider_1.getEmergencyFallbackProvider)();
    }
    /**
     * Execute chat completion with full resilience chain
     */
    async chat(request) {
        const { systemPrompt, userPrompt, role = 'Unknown', model, temperature = 0.3, maxTokens = 1500 } = request;
        // Tier 1: Try OpenRouter with multi-key fallback
        try {
            const response = await this.keyManager.executeWithFallback(async (client) => {
                return await client.chat.completions.create({
                    model: model || 'google/gemini-2.0-flash-thinking-exp',
                    messages: [
                        {
                            role: 'system',
                            content: systemPrompt
                        },
                        {
                            role: 'user',
                            content: userPrompt
                        }
                    ],
                    temperature,
                    max_tokens: maxTokens
                });
            }, role);
            return {
                content: response.choices[0].message.content || '',
                provider: 'openrouter',
                model: model || response.model,
                usage: response.usage ? {
                    promptTokens: response.usage.prompt_tokens,
                    completionTokens: response.usage.completion_tokens,
                    totalTokens: response.usage.total_tokens
                } : undefined
            };
        }
        catch (openRouterError) {
            console.error(`[ResilientAIClient] ⚠️  OpenRouter failed for ${role}: ${openRouterError.message}`);
            // Tier 2: Try emergency fallback provider
            if (this.emergencyProvider.isAvailable()) {
                try {
                    console.log(`[ResilientAIClient] 🚨 Using emergency fallback for ${role}...`);
                    const emergencyResponse = await this.emergencyProvider.execute(systemPrompt, userPrompt, temperature, maxTokens);
                    console.log(`[ResilientAIClient] ✅ Emergency fallback successful for ${role} ` +
                        `(${emergencyResponse.provider}/${emergencyResponse.model})`);
                    return {
                        content: emergencyResponse.content,
                        provider: emergencyResponse.provider,
                        model: emergencyResponse.model
                    };
                }
                catch (emergencyError) {
                    console.error(`[ResilientAIClient] ❌ Emergency fallback failed for ${role}: ${emergencyError.message}`);
                    // Fall through to Tier 3
                }
            }
            else {
                console.warn(`[ResilientAIClient] ⚠️  No emergency fallback configured for ${role}`);
            }
            // Tier 3: Friendly error message (no static fallback)
            console.error(`[ResilientAIClient] ❌ All AI providers failed for ${role}`);
            throw new AIServiceUnavailableError('We apologize for the inconvenience. Our AI analysis service is temporarily unavailable. ' +
                'We are working to restore service as quickly as possible. Please try again shortly.', role);
        }
    }
    /**
     * Create OpenAI-compatible client with resilience
     *
     * For services that need raw OpenAI client, this provides a resilient version.
     * The client will automatically use multi-key rotation.
     */
    async createClient(role) {
        return await this.keyManager.createClient(role);
    }
    /**
     * Get key manager for direct access (advanced use)
     */
    getKeyManager() {
        return this.keyManager;
    }
    /**
     * Get emergency provider for direct access (advanced use)
     */
    getEmergencyProvider() {
        return this.emergencyProvider;
    }
    /**
     * Check if emergency fallback is available
     */
    hasEmergencyFallback() {
        return this.emergencyProvider.isAvailable();
    }
    /**
     * Get health status of all providers
     */
    getHealthStatus() {
        return {
            openrouter: {
                keys: this.keyManager.getKeyStatuses(),
                available: this.keyManager.getKeyStatuses().some(k => !k.blacklistedUntil || k.blacklistedUntil.getTime() < Date.now())
            },
            emergency: {
                provider: this.emergencyProvider.getConfig().provider,
                model: this.emergencyProvider.getConfig().model,
                available: this.emergencyProvider.isAvailable()
            }
        };
    }
}
exports.ResilientAIClient = ResilientAIClient;
// Singleton instance
let instance = null;
/**
 * Get singleton resilient AI client
 *
 * Use this in ALL V9 services that need AI capabilities.
 * Provides automatic failover, retry, and graceful degradation.
 */
function getResilientAIClient() {
    if (!instance) {
        instance = new ResilientAIClient();
    }
    return instance;
}
/**
 * Helper: Execute simple chat with automatic resilience
 *
 * Convenience wrapper for quick AI calls.
 */
async function chat(systemPrompt, userPrompt, role, options) {
    const client = getResilientAIClient();
    const response = await client.chat({
        systemPrompt,
        userPrompt,
        role,
        ...options
    });
    return response.content;
}
