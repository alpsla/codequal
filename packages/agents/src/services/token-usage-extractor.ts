/**
 * Token Usage Extractor
 * 
 * This service provides an abstraction layer for extracting token usage
 * information from various AI model API responses dynamically.
 */

import { createLogger, Logger } from '@codequal/core/utils';

/**
 * Standard token usage format
 */
export interface TokenUsage {
  input: number;
  output: number;
  total: number;
}

/**
 * Token usage extraction strategy interface
 */
export interface TokenUsageExtractor {
  /**
   * Check if this extractor can handle the given response
   */
  canExtract(response: any): boolean;
  
  /**
   * Extract token usage from the response
   */
  extract(response: any): TokenUsage | null;
  
  /**
   * Provider name for logging
   */
  providerName: string;
}

/**
 * OpenAI/OpenRouter token usage extractor
 */
export class OpenAITokenExtractor implements TokenUsageExtractor {
  providerName = 'OpenAI/OpenRouter';
  
  canExtract(response: any): boolean {
    return response?.usage && 
           typeof response.usage.prompt_tokens === 'number' &&
           typeof response.usage.completion_tokens === 'number';
  }
  
  extract(response: any): TokenUsage | null {
    if (!this.canExtract(response)) return null;
    
    return {
      input: response.usage.prompt_tokens || 0,
      output: response.usage.completion_tokens || 0,
      total: response.usage.total_tokens || 
             (response.usage.prompt_tokens + response.usage.completion_tokens) || 0
    };
  }
}

/**
 * Anthropic/Claude token usage extractor
 */
export class AnthropicTokenExtractor implements TokenUsageExtractor {
  providerName = 'Anthropic';
  
  canExtract(response: any): boolean {
    return response?.usage && 
           typeof response.usage.input_tokens === 'number' &&
           typeof response.usage.output_tokens === 'number';
  }
  
  extract(response: any): TokenUsage | null {
    if (!this.canExtract(response)) return null;
    
    return {
      input: response.usage.input_tokens || 0,
      output: response.usage.output_tokens || 0,
      total: (response.usage.input_tokens || 0) + (response.usage.output_tokens || 0)
    };
  }
}

/**
 * Google/Gemini token usage extractor
 */
export class GoogleTokenExtractor implements TokenUsageExtractor {
  providerName = 'Google';
  
  canExtract(response: any): boolean {
    return response?.usageMetadata && 
           typeof response.usageMetadata.promptTokenCount === 'number' &&
           typeof response.usageMetadata.candidatesTokenCount === 'number';
  }
  
  extract(response: any): TokenUsage | null {
    if (!this.canExtract(response)) return null;
    
    return {
      input: response.usageMetadata.promptTokenCount || 0,
      output: response.usageMetadata.candidatesTokenCount || 0,
      total: response.usageMetadata.totalTokenCount || 
             (response.usageMetadata.promptTokenCount + response.usageMetadata.candidatesTokenCount) || 0
    };
  }
}

/**
 * Cohere token usage extractor
 */
export class CohereTokenExtractor implements TokenUsageExtractor {
  providerName = 'Cohere';
  
  canExtract(response: any): boolean {
    return response?.meta?.tokens && 
           typeof response.meta.tokens.input_tokens === 'number' &&
           typeof response.meta.tokens.output_tokens === 'number';
  }
  
  extract(response: any): TokenUsage | null {
    if (!this.canExtract(response)) return null;
    
    return {
      input: response.meta.tokens.input_tokens || 0,
      output: response.meta.tokens.output_tokens || 0,
      total: (response.meta.tokens.input_tokens || 0) + (response.meta.tokens.output_tokens || 0)
    };
  }
}

/**
 * Generic token usage extractor that tries multiple strategies
 */
export class DynamicTokenUsageExtractor {
  private readonly logger: Logger;
  private readonly extractors: TokenUsageExtractor[];
  
  constructor() {
    this.logger = createLogger('DynamicTokenUsageExtractor');
    
    // Register all known extractors
    this.extractors = [
      new OpenAITokenExtractor(),
      new AnthropicTokenExtractor(),
      new GoogleTokenExtractor(),
      new CohereTokenExtractor()
    ];
  }
  
  /**
   * Extract token usage from any supported API response
   */
  extractTokenUsage(response: any): TokenUsage | null {
    if (!response) return null;
    
    // Try each extractor until one works
    for (const extractor of this.extractors) {
      if (extractor.canExtract(response)) {
        const usage = extractor.extract(response);
        if (usage) {
          this.logger.debug('Token usage extracted', {
            provider: extractor.providerName,
            usage
          });
          return usage;
        }
      }
    }
    
    // If no extractor worked, try to find usage data heuristically
    const heuristicUsage = this.extractHeuristically(response);
    if (heuristicUsage) {
      this.logger.debug('Token usage extracted heuristically', { usage: heuristicUsage });
      return heuristicUsage;
    }
    
    this.logger.debug('No token usage found in response');
    return null;
  }
  
  /**
   * Try to extract token usage heuristically from unknown response formats
   */
  private extractHeuristically(response: any): TokenUsage | null {
    // Look for common patterns in the response
    const possibleUsageKeys = ['usage', 'token_usage', 'tokenUsage', 'tokens', 'meta'];
    
    for (const key of possibleUsageKeys) {
      if (response[key] && typeof response[key] === 'object') {
        const usage = response[key];
        
        // Try different naming conventions
        const inputTokens = usage.input_tokens || usage.inputTokens || usage.prompt_tokens || 
                           usage.promptTokens || usage.input || usage.prompt || 0;
        const outputTokens = usage.output_tokens || usage.outputTokens || usage.completion_tokens || 
                            usage.completionTokens || usage.output || usage.completion || 0;
        const totalTokens = usage.total_tokens || usage.totalTokens || usage.total || 
                           (inputTokens + outputTokens) || 0;
        
        if (inputTokens > 0 || outputTokens > 0) {
          return {
            input: inputTokens,
            output: outputTokens,
            total: totalTokens
          };
        }
      }
    }
    
    return null;
  }
  
  /**
   * Register a custom token extractor
   */
  registerExtractor(extractor: TokenUsageExtractor): void {
    this.extractors.push(extractor);
    this.logger.info('Registered custom token extractor', {
      provider: extractor.providerName
    });
  }
}

// Singleton instance
let extractorInstance: DynamicTokenUsageExtractor | null = null;

/**
 * Get the dynamic token usage extractor instance
 */
export function getTokenUsageExtractor(): DynamicTokenUsageExtractor {
  if (!extractorInstance) {
    extractorInstance = new DynamicTokenUsageExtractor();
  }
  return extractorInstance;
}

/**
 * Extract token usage from any API response
 */
export function extractTokenUsage(response: any): TokenUsage | null {
  return getTokenUsageExtractor().extractTokenUsage(response);
}