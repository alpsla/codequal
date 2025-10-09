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
  }

  /**
   * Simple chat completion - ONE call, fallback on 401 only
   */
  async chat(request: SimpleAIRequest): Promise<SimpleAIResponse> {
    const {
      systemPrompt,
      userPrompt,
      model = 'google/gemini-2.5-flash',
      temperature = 0.3,
      maxTokens = 1500
    } = request;

    // If already using fallback, go straight to Gemini
    if (this.useEmergencyFallback && this.geminiClient) {
      return this.callGemini(systemPrompt, userPrompt, temperature, maxTokens);
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
      // On 401 authentication error, switch to emergency fallback
      if (error.status === 401 || error.message?.includes('401') || error.message?.includes('authentication')) {
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

