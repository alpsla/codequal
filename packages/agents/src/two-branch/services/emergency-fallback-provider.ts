/**
 * Emergency Fallback AI Provider
 *
 * Provides direct API access to AI providers when OpenRouter fails.
 * Configurable via environment variables to support multiple providers.
 *
 * Configuration:
 * - EMERGENCY_FALLBACK_PROVIDER: Provider name (gemini, anthropic, openai)
 * - EMERGENCY_FALLBACK_MODEL: Model to use for the provider
 * - Provider-specific API keys (GOOGLE_API_KEY, ANTHROPIC_API_KEY, OPENAI_API_KEY)
 */

export type EmergencyProvider = 'gemini' | 'anthropic' | 'openai' | 'none';

export interface EmergencyFallbackConfig {
  provider: EmergencyProvider;
  model: string;
  apiKey: string;
}

export interface EmergencyFallbackResponse {
  content: string;
  provider: string;
  model: string;
}

/**
 * Emergency Fallback Provider Manager
 *
 * Handles direct API calls to AI providers when all OpenRouter keys fail.
 * Supports Gemini, Anthropic, and OpenAI with configurable models.
 */
import { GoogleGenerativeAI } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

export class EmergencyFallbackProvider {
  private config: EmergencyFallbackConfig;

  constructor() {
    this.config = this.loadConfig();
  }

  /**
   * Load emergency fallback configuration from environment
   *
   * Configuration options:
   * - EMERGENCY_FALLBACK_PROVIDER: Provider to use (gemini, anthropic, openai)
   * - EMERGENCY_FALLBACK_MODEL: Specific model for the provider
   * - GEMINI_MODEL: Gemini-specific model override
   * - CLAUDE_MODEL: Anthropic-specific model override
   * - GPT_MODEL: OpenAI-specific model override
   */
  private loadConfig(): EmergencyFallbackConfig {
    const provider = (process.env.EMERGENCY_FALLBACK_PROVIDER || 'gemini') as EmergencyProvider;

    // Helper to strip provider prefix from model name (e.g., "google/gemini-2.5-pro" → "gemini-2.5-pro")
    const stripProviderPrefix = (modelName: string): string => {
      return modelName.replace(/^(google|anthropic|openai)\//i, '');
    };

    // Get model for selected provider
    // Priority: EMERGENCY_FALLBACK_MODEL (global) > Provider-specific env > Provider default
    const getModelForProvider = (providerName: EmergencyProvider): string => {
      const globalFallback = process.env.EMERGENCY_FALLBACK_MODEL;
      if (globalFallback) return globalFallback;

      switch (providerName) {
        case 'gemini':
          return process.env.GEMINI_MODEL || 'gemini-2.5-flash';
        case 'anthropic':
          return process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514';
        case 'openai':
          return process.env.GPT_MODEL || 'gpt-4o';
        case 'none':
          return '';
      }
    };

    // Resolve final model with priority rules
    const rawModel = getModelForProvider(provider);
    const model = stripProviderPrefix(rawModel);

    // Get API key for the selected provider
    const apiKeyMap: Record<EmergencyProvider, string> = {
      gemini: process.env.GOOGLE_API_KEY || '',
      anthropic: process.env.ANTHROPIC_API_KEY || '',
      openai: process.env.OPENAI_API_KEY || '',
      none: ''
    };

    const apiKey = apiKeyMap[provider];

    if (provider !== 'none' && !apiKey) {
      console.warn(
        `[EmergencyFallbackProvider] Provider "${provider}" selected but no API key found. ` +
        `Set ${provider === 'gemini' ? 'GOOGLE_API_KEY' : provider === 'anthropic' ? 'ANTHROPIC_API_KEY' : 'OPENAI_API_KEY'}`
      );
    }

    // Log the configuration for transparency
    if (provider !== 'none' && apiKey) {
      const source = process.env.EMERGENCY_FALLBACK_MODEL
        ? 'EMERGENCY_FALLBACK_MODEL'
        : (process.env.GEMINI_MODEL || process.env.CLAUDE_MODEL || process.env.GPT_MODEL)
          ? 'provider-specific'
          : 'default';
      console.log(`[EmergencyFallbackProvider] ✅ Configured: ${provider}/${model} (from ${source})`);
    }

    return {
      provider,
      model,
      apiKey
    };
  }

  /**
   * Check if emergency fallback is configured and available
   */
  isAvailable(): boolean {
    return this.config.provider !== 'none' && this.config.apiKey.length > 0;
  }

  /**
   * Get current configuration
   */
  getConfig(): EmergencyFallbackConfig {
    return { ...this.config };
  }

  /**
   * Execute AI request using emergency fallback provider
   */
  async execute(
    systemPrompt: string,
    userPrompt: string,
    temperature = 0.3,
    maxTokens = 1500
  ): Promise<EmergencyFallbackResponse> {
    if (!this.isAvailable()) {
      throw new Error(
        `Emergency fallback provider not configured. ` +
        `Set EMERGENCY_FALLBACK_PROVIDER and corresponding API key.`
      );
    }

    console.log(
      `[EmergencyFallbackProvider] 🚨 Using emergency fallback: ${this.config.provider} ` +
      `(model: ${this.config.model})`
    );

    switch (this.config.provider) {
      case 'gemini':
        return this.executeGemini(systemPrompt, userPrompt, temperature, maxTokens);
      case 'anthropic':
        return this.executeAnthropic(systemPrompt, userPrompt, temperature, maxTokens);
      case 'openai':
        return this.executeOpenAI(systemPrompt, userPrompt, temperature, maxTokens);
      default:
        throw new Error(`Unknown emergency fallback provider: ${this.config.provider}`);
    }
  }

  /**
   * Execute using Google Gemini API
   */
  private async executeGemini(
    systemPrompt: string,
    userPrompt: string,
    temperature: number,
    maxTokens: number
  ): Promise<EmergencyFallbackResponse> {
    try {
      const genAI = new GoogleGenerativeAI(this.config.apiKey);
      const model = genAI.getGenerativeModel({
        model: this.config.model,
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
        }
      });

      // Combine system and user prompts for Gemini
      const combinedPrompt = `${systemPrompt}\n\n${userPrompt}`;

      const result = await model.generateContent(combinedPrompt);
      const response = result.response;

      // Get text from response
      const content = response.text();

      return {
        content,
        provider: 'gemini',
        model: this.config.model
      };
    } catch (error: any) {
      console.error('[EmergencyFallbackProvider] Gemini API error:', error.message);
      throw new Error(`Gemini emergency fallback failed: ${error.message}`);
    }
  }

  /**
   * Execute using Anthropic Claude API
   */
  private async executeAnthropic(
    systemPrompt: string,
    userPrompt: string,
    temperature: number,
    maxTokens: number
  ): Promise<EmergencyFallbackResponse> {
    try {
      const anthropic = new Anthropic({
        apiKey: this.config.apiKey,
      });

      const response = await anthropic.messages.create({
        model: this.config.model,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt
          }
        ]
      });

      // Safely extract text from content blocks (handle tool_use, images, etc.)
      const blocks = (response as any).content as Array<any>;
      const content = Array.isArray(blocks)
        ? blocks
            .map((b: any) => {
              if (b && typeof b === 'object' && b.type === 'text' && typeof b.text === 'string') {
                return b.text;
              }
              // Ignore non-text blocks but keep placeholders minimal
              return '';
            })
            .filter(Boolean)
            .join('\n')
        : '';

      return {
        content,
        provider: 'anthropic',
        model: this.config.model
      };
    } catch (error: any) {
      console.error('[EmergencyFallbackProvider] Anthropic API error:', error.message);
      throw new Error(`Anthropic emergency fallback failed: ${error.message}`);
    }
  }

  /**
   * Execute using OpenAI API
   */
  private async executeOpenAI(
    systemPrompt: string,
    userPrompt: string,
    temperature: number,
    maxTokens: number
  ): Promise<EmergencyFallbackResponse> {
    try {
      const openai = new OpenAI({
        apiKey: this.config.apiKey,
      });

      const response = await openai.chat.completions.create({
        model: this.config.model,
        temperature,
        max_tokens: maxTokens,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ]
      });

      return {
        content: response.choices[0].message.content || '',
        provider: 'openai',
        model: this.config.model
      };
    } catch (error: any) {
      console.error('[EmergencyFallbackProvider] OpenAI API error:', error.message);
      throw new Error(`OpenAI emergency fallback failed: ${error.message}`);
    }
  }
}

// Singleton instance
let instance: EmergencyFallbackProvider | null = null;

export function getEmergencyFallbackProvider(): EmergencyFallbackProvider {
  if (!instance) {
    instance = new EmergencyFallbackProvider();
  }
  return instance;
}
