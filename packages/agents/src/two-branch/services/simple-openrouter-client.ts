/**
 * Simple OpenRouter Client - NO RETRIES, NO FALLBACKS
 * 
 * Use this for testing/development to avoid excessive API calls.
 * Logic:
 * 1. Try OpenRouter once with primary key
 * 2. If 401 error → switch to EMERGENCY_FALLBACK_MODEL (Gemini/Claude direct)
 * 3. Otherwise → throw error (no retries)
 */

import OpenAI from 'openai';

export interface SimpleAIRequest {
  systemPrompt: string;
  userPrompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface SimpleAIResponse {
  content: string;
  provider: 'openrouter' | 'gemini';
  model: string;
  usage?: {  // SESSION 21 FIX: Add usage tracking
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  cost?: number;  // SESSION 21 FIX: Add cost from OpenRouter
}

export class SimpleOpenRouterClient {
  private openrouterClient: OpenAI;
  private geminiClient: OpenAI | null = null;
  private useEmergencyFallback = false;

  // Key rotation support (matching ModelConfigResolver)
  private openrouterKeys: string[] = [];
  private currentKeyIndex = 0;
  private failedKeys: Set<string> = new Set();

  // Rate limiting to prevent runaway costs
  private callCount = 0;
  private sessionStartTime = Date.now();
  private readonly MAX_CALLS_PER_SESSION = parseInt(process.env.MAX_AI_CALLS_PER_SESSION || '100');
  private readonly SESSION_DURATION_MS = 60 * 60 * 1000; // 1 hour
  private readonly DEBUG_MODE = (process.env.DEBUG_MODE || process.env.DISABLE_RATE_LIMIT || '').toLowerCase() === 'true';

  constructor() {
    // Load OpenRouter API keys (supports multiple keys via OPENROUTER_API_KEYS)
    this.loadOpenRouterKeys();

    // Initialize OpenRouter client with first available key
    const initialKey = this.getNextOpenRouterKey() || process.env.OPENROUTER_API_KEY || '';
    this.openrouterClient = new OpenAI({
      apiKey: initialKey,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': 'https://codequal.com',
        'X-Title': 'CodeQual Test'
      }
    } as any);

    // Initialize Gemini fallback if configured
    if (process.env.GEMINI_API_KEY) {
      this.geminiClient = new OpenAI({
        apiKey: process.env.GEMINI_API_KEY,
        baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/'
      } as any);
    }

    if (this.DEBUG_MODE) {
      console.log(`[SimpleClient] DEBUG_MODE: Rate limiting DISABLED`);
    } else {
      console.log(`[SimpleClient] Rate limit: ${this.MAX_CALLS_PER_SESSION} calls per session`);
    }
    console.log(`[SimpleClient] Loaded ${this.openrouterKeys.length} OpenRouter API key(s)`);
  }

  /**
   * Load OpenRouter API keys from environment variables
   * Supports both single key (OPENROUTER_API_KEY) and multiple keys (OPENROUTER_API_KEYS)
   */
  private loadOpenRouterKeys(): void {
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
  private getNextOpenRouterKey(): string | null {
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
  private markKeyAsFailedAndRotate(): boolean {
    const currentKey = (this.openrouterClient as any).apiKey;
    if (currentKey) {
      this.failedKeys.add(currentKey);
      console.warn(`[SimpleClient] ⚠️  Marked OpenRouter key as failed (${this.failedKeys.size}/${this.openrouterKeys.length} failed)`);
    }

    // Try to get next available key
    const nextKey = this.getNextOpenRouterKey();
    if (nextKey) {
      console.log(`[SimpleClient] 🔄 Rotating to next OpenRouter key`);
      // Update the client with new key
      this.openrouterClient = new OpenAI({
        apiKey: nextKey,
        baseURL: 'https://openrouter.ai/api/v1',
        defaultHeaders: {
          'HTTP-Referer': 'https://codequal.com',
          'X-Title': 'CodeQual Test'
        }
      } as any);
      return true; // Successfully rotated
    }

    return false; // No more keys available
  }
  
  /**
   * Reset call counter (called automatically after session duration)
   */
  private resetIfNeeded(): void {
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
  private checkRateLimit(): void {
    // Skip rate limit checks in debug mode (E2E tests, development)
    if (this.DEBUG_MODE) {
      return;
    }

    this.resetIfNeeded();

    if (this.callCount >= this.MAX_CALLS_PER_SESSION) {
      const elapsed = Date.now() - this.sessionStartTime;
      const remainingMs = this.SESSION_DURATION_MS - elapsed;
      const remainingMin = Math.ceil(remainingMs / 60000);

      throw new Error(
        `🚨 RATE LIMIT EXCEEDED: Made ${this.callCount} API calls in this session. ` +
        `Maximum allowed: ${this.MAX_CALLS_PER_SESSION}. ` +
        `Please wait ${remainingMin} minutes or restart the process. ` +
        `This is a safety measure to prevent runaway costs.`
      );
    }
  }

  /**
   * Simple chat completion - WITH KEY ROTATION on 401 errors
   * WITH RATE LIMITING to prevent runaway costs
   */
  async chat(request: SimpleAIRequest): Promise<SimpleAIResponse> {
    // Check rate limit BEFORE making API call
    this.checkRateLimit();

    const {
      systemPrompt,
      userPrompt,
      model,
      temperature = 0.3,
      maxTokens = 1500
    } = request;

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
      const usage = (response as any).usage || {};
      const cost = usage.total_cost || 0;  // OpenRouter includes total_cost in usage
      
      // SESSION 24 DEBUG: Log cost extraction
      console.log(`[OpenRouter] Response usage:`, {
        prompt_tokens: usage.prompt_tokens,
        completion_tokens: usage.completion_tokens,
        total_cost: usage.total_cost
      });
      console.log(`[OpenRouter] Extracted cost: $${cost}`);
      
      return {
        content: response.choices[0]?.message?.content || '',
        provider: 'openrouter',
        model,
        usage: {
          promptTokens: usage.prompt_tokens || 0,
          completionTokens: usage.completion_tokens || 0,
          totalTokens: usage.total_tokens || 0
        },
        cost  // SESSION 21 FIX: Include actual cost from OpenRouter
      };

    } catch (error: any) {
      // On 401 authentication error, try key rotation
      if (error.status === 401 || error.message?.includes('401') || error.message?.includes('authentication')) {
        console.warn('[SimpleClient] ⚠️  OpenRouter 401 error - attempting key rotation');

        // Try to rotate to next available key
        if (this.markKeyAsFailedAndRotate()) {
          console.log('[SimpleClient] 🔄 Retrying with rotated key...');
          // Retry the request with new key (recursive call)
          return this.chat(request);
        }

        // All keys failed, check if fallback is allowed
        if (process.env.STRICT_NO_FALLBACK === 'true' || process.env.E2E_DISABLE_EMERGENCY_FALLBACK === 'true') {
          throw new Error('ALERT: All OpenRouter keys failed and STRICT_NO_FALLBACK is enabled');
        }

        // Fall back to Gemini if available
        console.warn('[SimpleClient] ⚠️  All OpenRouter keys exhausted - switching to Gemini fallback');
        if (this.geminiClient) {
          this.useEmergencyFallback = true;
          return this.callGemini(systemPrompt, userPrompt, temperature, maxTokens);
        }
        throw new Error('All OpenRouter keys failed and no emergency fallback configured');
      }

      // For any other error, throw immediately (no retries)
      throw new Error(`OpenRouter API error: ${error.message}`);
    }
  }

  /**
   * Get current rate limit status
   */
  getStatus(): { callCount: number; maxCalls: number; resetIn: number } {
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
   * Call Gemini directly as emergency fallback
   */
  private async callGemini(
    systemPrompt: string,
    userPrompt: string,
    temperature: number,
    maxTokens: number
  ): Promise<SimpleAIResponse> {
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
        content: response.choices[0]?.message?.content || '',
        provider: 'gemini',
        model: 'gemini-2.0-flash-exp'
      };

    } catch (error: any) {
      throw new Error(`Emergency fallback (Gemini) failed: ${error.message}`);
    }
  }
}

// Singleton instance
let instance: SimpleOpenRouterClient | null = null;

export function getSimpleOpenRouterClient(): SimpleOpenRouterClient {
  if (!instance) {
    instance = new SimpleOpenRouterClient();
  }
  return instance;
}

