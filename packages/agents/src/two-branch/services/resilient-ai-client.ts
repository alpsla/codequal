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

import OpenAI from 'openai';
import { getOpenRouterKeyManager } from './openrouter-key-manager';
import { getEmergencyFallbackProvider } from './emergency-fallback-provider';

/**
 * Custom error for AI service unavailability
 */
export class AIServiceUnavailableError extends Error {
  constructor(message: string, public role?: string) {
    super(message);
    this.name = 'AIServiceUnavailableError';
  }
}

export interface ChatRequest {
  systemPrompt: string;
  userPrompt: string;
  role?: string; // For logging (e.g., "SecurityAgent", "V9Analyzer")
  model?: string; // Override model selection
  temperature?: number;
  maxTokens?: number;
}

export interface ChatResponse {
  content: string;
  provider: 'openrouter' | 'gemini' | 'anthropic' | 'openai';
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Resilient AI Client
 *
 * Handles all AI API calls with automatic failover and fallback.
 * Thread-safe singleton with complete error recovery.
 */
export class ResilientAIClient {
  private keyManager = getOpenRouterKeyManager();
  private emergencyProvider = getEmergencyFallbackProvider();

  /**
   * Execute chat completion with full resilience chain
   */
  async chat(request: ChatRequest): Promise<ChatResponse> {
    const {
      systemPrompt,
      userPrompt,
      role = 'Unknown',
      model,
      temperature = 0.3,
      maxTokens = 1500
    } = request;

    // Tier 1: Try OpenRouter with multi-key fallback
    try {
      const response = await this.keyManager.executeWithFallback(
        async (client) => {
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
        },
        role
      );

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

    } catch (openRouterError: any) {
      console.error(
        `[ResilientAIClient] ⚠️  OpenRouter failed for ${role}: ${openRouterError.message}`
      );

      // Tier 2: Try emergency fallback provider
      if (this.emergencyProvider.isAvailable()) {
        try {
          console.log(`[ResilientAIClient] 🚨 Using emergency fallback for ${role}...`);

          const emergencyResponse = await this.emergencyProvider.execute(
            systemPrompt,
            userPrompt,
            temperature,
            maxTokens
          );

          console.log(
            `[ResilientAIClient] ✅ Emergency fallback successful for ${role} ` +
            `(${emergencyResponse.provider}/${emergencyResponse.model})`
          );

          return {
            content: emergencyResponse.content,
            provider: emergencyResponse.provider as any,
            model: emergencyResponse.model
          };

        } catch (emergencyError: any) {
          console.error(
            `[ResilientAIClient] ❌ Emergency fallback failed for ${role}: ${emergencyError.message}`
          );
          // Fall through to Tier 3
        }
      } else {
        console.warn(`[ResilientAIClient] ⚠️  No emergency fallback configured for ${role}`);
      }

      // Tier 3: Friendly error message (no static fallback)
      console.error(`[ResilientAIClient] ❌ All AI providers failed for ${role}`);
      throw new AIServiceUnavailableError(
        'We apologize for the inconvenience. Our AI analysis service is temporarily unavailable. ' +
        'We are working to restore service as quickly as possible. Please try again shortly.',
        role
      );
    }
  }

  /**
   * Create OpenAI-compatible client with resilience
   *
   * For services that need raw OpenAI client, this provides a resilient version.
   * The client will automatically use multi-key rotation.
   */
  async createClient(role?: string): Promise<OpenAI> {
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
  hasEmergencyFallback(): boolean {
    return this.emergencyProvider.isAvailable();
  }

  /**
   * Get health status of all providers
   */
  getHealthStatus() {
    return {
      openrouter: {
        keys: this.keyManager.getKeyStatuses(),
        available: this.keyManager.getKeyStatuses().some(
          k => !k.blacklistedUntil || k.blacklistedUntil.getTime() < Date.now()
        )
      },
      emergency: {
        provider: this.emergencyProvider.getConfig().provider,
        model: this.emergencyProvider.getConfig().model,
        available: this.emergencyProvider.isAvailable()
      }
    };
  }
}

// Singleton instance
let instance: ResilientAIClient | null = null;

/**
 * Get singleton resilient AI client
 *
 * Use this in ALL V9 services that need AI capabilities.
 * Provides automatic failover, retry, and graceful degradation.
 */
export function getResilientAIClient(): ResilientAIClient {
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
export async function chat(
  systemPrompt: string,
  userPrompt: string,
  role?: string,
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }
): Promise<string> {
  const client = getResilientAIClient();
  const response = await client.chat({
    systemPrompt,
    userPrompt,
    role,
    ...options
  });
  return response.content;
}
