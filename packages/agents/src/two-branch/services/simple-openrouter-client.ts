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
}

export class SimpleOpenRouterClient {
  private openrouterClient: OpenAI;
  private geminiClient: OpenAI | null = null;
  private useEmergencyFallback = false;
  
  // Rate limiting to prevent runaway costs
  private callCount = 0;
  private sessionStartTime = Date.now();
  private readonly MAX_CALLS_PER_SESSION = parseInt(process.env.MAX_AI_CALLS_PER_SESSION || '100');
  private readonly SESSION_DURATION_MS = 60 * 60 * 1000; // 1 hour

  constructor() {
    // Initialize OpenRouter client
    this.openrouterClient = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY || '',
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
    
    console.log(`[SimpleClient] Rate limit: ${this.MAX_CALLS_PER_SESSION} calls per session`);
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
   */
  private checkRateLimit(): void {
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
   * Simple chat completion - ONE call, fallback on 401 only
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

    // Try OpenRouter once
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

      return {
        content: response.choices[0]?.message?.content || '',
        provider: 'openrouter',
        model
      };

    } catch (error: any) {
      // On 401 authentication error
      if (error.status === 401 || error.message?.includes('401') || error.message?.includes('authentication')) {
        if (process.env.STRICT_NO_FALLBACK === 'true' || process.env.E2E_DISABLE_EMERGENCY_FALLBACK === 'true') {
          throw new Error('ALERT: OpenRouter authentication failed and STRICT_NO_FALLBACK is enabled');
        }
        console.warn('[SimpleClient] ⚠️  OpenRouter 401 error - switching to Gemini fallback');
        if (this.geminiClient) {
          this.useEmergencyFallback = true;
          return this.callGemini(systemPrompt, userPrompt, temperature, maxTokens);
        }
        throw new Error('OpenRouter authentication failed and no emergency fallback configured');
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

