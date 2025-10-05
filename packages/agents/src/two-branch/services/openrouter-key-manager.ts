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

import OpenAI from 'openai';

export interface KeyStatus {
  key: string;
  lastUsed?: Date;
  failureCount: number;
  lastError?: string;
  blacklistedUntil?: Date;
}

export interface OpenRouterConfig {
  apiKeys: string[];
  maxRetriesPerKey: number;
  blacklistDurationMs: number;
  retryDelayMs: number;
}

export class OpenRouterKeyManager {
  private config: OpenRouterConfig;
  private keyStatuses: Map<string, KeyStatus>;
  private currentKeyIndex: number = 0;

  constructor(customConfig?: Partial<OpenRouterConfig>) {
    // Load API keys from environment
    const keys = this.loadKeysFromEnv();

    if (keys.length === 0) {
      throw new Error(
        'No OpenRouter API keys configured. Set OPENROUTER_API_KEYS or OPENROUTER_API_KEY in .env'
      );
    }

    this.config = {
      apiKeys: keys,
      maxRetriesPerKey: customConfig?.maxRetriesPerKey ?? 2,
      blacklistDurationMs: customConfig?.blacklistDurationMs ?? 5 * 60 * 1000, // 5 minutes
      retryDelayMs: customConfig?.retryDelayMs ?? 1000
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
  private loadKeysFromEnv(): string[] {
    const keys: string[] = [];

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
      keys.push(process.env[`OPENROUTER_API_KEY_${keyNum}`]!);
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
  async getWorkingKey(): Promise<string> {
    const availableKeys = this.getAvailableKeys();

    if (availableKeys.length === 0) {
      throw new Error(
        'All OpenRouter API keys are currently blacklisted. ' +
        'Wait 5 minutes or add more keys to .env'
      );
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
  async createClient(agentRole?: string): Promise<OpenAI> {
    const key = await this.getWorkingKey();

    const config: any = {
      apiKey: key,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': 'https://codequal.com',
        'X-Title': agentRole ? `CodeQual ${agentRole} Agent` : 'CodeQual'
      }
    };

    return new OpenAI(config);
  }

  /**
   * Execute API call with automatic retry and key rotation
   */
  async executeWithFallback<T>(
    fn: (client: OpenAI) => Promise<T>,
    agentRole?: string
  ): Promise<T> {
    let lastError: Error | undefined;
    const availableKeys = this.getAvailableKeys();

    for (const key of availableKeys) {
      for (let attempt = 1; attempt <= this.config.maxRetriesPerKey; attempt++) {
        try {
          const client = new OpenAI({
            apiKey: key,
            baseURL: 'https://openrouter.ai/api/v1',
            defaultHeaders: {
              'HTTP-Referer': 'https://codequal.com',
              'X-Title': agentRole ? `CodeQual ${agentRole} Agent` : 'CodeQual'
            }
          } as any);

          const result = await fn(client);

          // Success - reset failure count
          const status = this.keyStatuses.get(key)!;
          status.failureCount = 0;
          status.lastUsed = new Date();

          console.log(`[OpenRouterKeyManager] ✅ Success with key ${this.maskKey(key)}`);
          return result;

        } catch (error: any) {
          lastError = error;
          const status = this.keyStatuses.get(key)!;
          status.failureCount++;
          status.lastError = error.message;

          // Check if this is a permanent failure (authentication error)
          if (this.isPermanentError(error)) {
            console.error(
              `[OpenRouterKeyManager] ❌ Permanent failure with key ${this.maskKey(key)}: ${error.message}`
            );
            this.blacklistKey(key);
            break; // Try next key immediately
          }

          // Check if this is a rate limit
          if (this.isRateLimitError(error)) {
            console.warn(
              `[OpenRouterKeyManager] ⏳ Rate limit hit on key ${this.maskKey(key)}, trying next key`
            );
            this.blacklistKey(key, 60 * 1000); // Blacklist for 1 minute
            break; // Try next key immediately
          }

          // Transient error - retry with same key
          if (attempt < this.config.maxRetriesPerKey) {
            const delay = Math.pow(2, attempt) * this.config.retryDelayMs;
            console.warn(
              `[OpenRouterKeyManager] ⚠️  Retry ${attempt}/${this.config.maxRetriesPerKey} ` +
              `for key ${this.maskKey(key)} after ${delay}ms`
            );
            await this.sleep(delay);
          }
        }
      }
    }

    // All keys failed
    throw new Error(
      `All OpenRouter API keys failed. Last error: ${lastError?.message}. ` +
      `Consider adding more keys or implementing graceful degradation.`
    );
  }

  /**
   * Test if a key is working
   */
  private async testKey(key: string): Promise<boolean> {
    try {
      const client = new OpenAI({
        apiKey: key,
        baseURL: 'https://openrouter.ai/api/v1'
      } as any);

      // Quick test call
      await client.chat.completions.create({
        model: 'openai/gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 1
      });

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get list of non-blacklisted keys
   */
  private getAvailableKeys(): string[] {
    const now = Date.now();
    return this.config.apiKeys.filter(key => {
      const status = this.keyStatuses.get(key)!;
      return !status.blacklistedUntil || status.blacklistedUntil.getTime() < now;
    });
  }

  /**
   * Blacklist a key temporarily
   */
  private blacklistKey(key: string, durationMs?: number): void {
    const status = this.keyStatuses.get(key)!;
    const duration = durationMs ?? this.config.blacklistDurationMs;
    status.blacklistedUntil = new Date(Date.now() + duration);

    console.warn(
      `[OpenRouterKeyManager] 🚫 Key ${this.maskKey(key)} blacklisted for ${duration / 1000}s`
    );
  }

  /**
   * Check if error is permanent (authentication/authorization)
   */
  private isPermanentError(error: any): boolean {
    return (
      error.status === 401 || // Unauthorized (bad key, user not found)
      error.status === 403 || // Forbidden
      error.message?.includes('User not found') ||
      error.message?.includes('Invalid API key')
    );
  }

  /**
   * Check if error is rate limit
   */
  private isRateLimitError(error: any): boolean {
    return error.status === 429 || error.message?.includes('rate limit');
  }

  /**
   * Mask API key for logging (show first 10 and last 3 characters)
   */
  private maskKey(key: string): string {
    if (key.length < 20) return '***';
    return `${key.substring(0, 10)}...${key.substring(key.length - 3)}`;
  }

  /**
   * Get status of all keys
   */
  getKeyStatuses(): KeyStatus[] {
    return Array.from(this.keyStatuses.values());
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
let instance: OpenRouterKeyManager | null = null;

export function getOpenRouterKeyManager(): OpenRouterKeyManager {
  if (!instance) {
    instance = new OpenRouterKeyManager();
  }
  return instance;
}
