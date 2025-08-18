/**
 * OpenRouter Model Matcher
 * 
 * Matches discovered model names to exact OpenRouter model IDs
 * Fixes truncation issues and ensures exact syntax
 */

import axios from 'axios';
import { createLogger } from '@codequal/core/utils';

const logger = createLogger('OpenRouterModelMatcher');

export interface OpenRouterModel {
  id: string;
  name: string;
  pricing: {
    prompt: string;
    completion: string;
  };
  context_length: number;
  architecture?: {
    tokenizer?: string;
    instruct_type?: string;
  };
  top_provider?: {
    max_completion_tokens?: number;
  };
}

export class OpenRouterModelMatcher {
  private models: OpenRouterModel[] = [];
  private lastFetch: Date | null = null;
  private cacheExpiry = 60 * 60 * 1000; // 1 hour
  
  constructor(private apiKey?: string) {
    this.apiKey = apiKey || process.env.OPENROUTER_API_KEY;
  }
  
  /**
   * Fetch all available models from OpenRouter
   */
  async fetchOpenRouterModels(): Promise<OpenRouterModel[]> {
    // Check cache
    if (this.lastFetch && this.models.length > 0) {
      const age = Date.now() - this.lastFetch.getTime();
      if (age < this.cacheExpiry) {
        return this.models;
      }
    }
    
    try {
      logger.info('Fetching models from OpenRouter API...');
      
      const response = await axios.get('https://openrouter.ai/api/v1/models', {
        headers: this.apiKey ? {
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://codequal.ai',
          'X-Title': 'CodeQual Model Research'
        } : {}
      });
      
      this.models = response.data.data || [];
      this.lastFetch = new Date();
      
      logger.info(`Fetched ${this.models.length} models from OpenRouter`);
      
      return this.models;
    } catch (error) {
      logger.error('Failed to fetch OpenRouter models:', error);
      return [];
    }
  }
  
  /**
   * Match a discovered model name to exact OpenRouter ID
   */
  async matchToOpenRouterId(discoveredName: string): Promise<string | null> {
    const models = await this.fetchOpenRouterModels();
    
    // Clean up the discovered name
    const cleaned = discoveredName.toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-\/\.]/g, '');
    
    // Direct match
    const directMatch = models.find(m => m.id.toLowerCase() === cleaned);
    if (directMatch) {
      logger.debug(`Direct match: ${discoveredName} -> ${directMatch.id}`);
      return directMatch.id;
    }
    
    // Fuzzy matching based on key terms
    const matches = this.fuzzyMatch(cleaned, models);
    if (matches.length > 0) {
      logger.debug(`Fuzzy match: ${discoveredName} -> ${matches[0].id}`);
      return matches[0].id;
    }
    
    logger.warn(`No match found for: ${discoveredName}`);
    return null;
  }
  
  /**
   * Fuzzy match based on model characteristics
   */
  private fuzzyMatch(searchTerm: string, models: OpenRouterModel[]): OpenRouterModel[] {
    const scored = models.map(model => {
      let score = 0;
      const modelId = model.id.toLowerCase();
      const modelName = (model.name || '').toLowerCase();
      
      // Check for key terms
      if (searchTerm.includes('claude')) {
        if (modelId.includes('claude')) score += 10;
        if (searchTerm.includes('opus') && modelId.includes('opus')) score += 5;
        if (searchTerm.includes('sonnet') && modelId.includes('sonnet')) score += 5;
        if (searchTerm.includes('haiku') && modelId.includes('haiku')) score += 5;
        if (searchTerm.includes('4') && modelId.includes('3-5')) score += 3;
        if (searchTerm.includes('4.1') && modelId.includes('3-5-')) score += 4;
      }
      
      if (searchTerm.includes('gpt')) {
        if (modelId.includes('gpt')) score += 10;
        if (searchTerm.includes('4') && modelId.includes('4')) score += 5;
        if (searchTerm.includes('turbo') && modelId.includes('turbo')) score += 5;
        if (searchTerm.includes('3.5') && modelId.includes('3.5')) score += 5;
      }
      
      if (searchTerm.includes('gemini')) {
        if (modelId.includes('gemini')) score += 10;
        if (searchTerm.includes('2.5') && !modelId.includes('2.0')) {
          // Prefer 1.5 models (current) over 2.0 (doesn't exist)
          if (modelId.includes('1.5')) score += 8;
        }
        if (searchTerm.includes('flash') && modelId.includes('flash')) score += 5;
        if (searchTerm.includes('pro') && modelId.includes('pro')) score += 5;
      }
      
      // Penalize outdated versions
      if (modelId.includes('2.0')) score -= 5; // Gemini 2.0 doesn't exist
      if (modelId.includes('instruct')) score -= 2; // Usually older
      
      return { model, score };
    });
    
    // Return top matches with score > 0
    return scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(s => s.model);
  }
  
  /**
   * Get latest/best models for each provider
   */
  async getLatestModels(): Promise<{
    anthropic: string[];
    openai: string[];
    google: string[];
    meta: string[];
  }> {
    const models = await this.fetchOpenRouterModels();
    
    const result = {
      anthropic: [] as string[],
      openai: [] as string[],
      google: [] as string[],
      meta: [] as string[]
    };
    
    // Filter and sort by provider
    models.forEach(model => {
      const id = model.id.toLowerCase();
      
      // Anthropic - prefer Claude 3.5 models (latest)
      if (id.startsWith('anthropic/')) {
        if (id.includes('claude-3.5-sonnet')) {
          result.anthropic.unshift(model.id); // Latest Sonnet at front
        } else if (id.includes('claude-3-opus')) {
          result.anthropic.push(model.id);
        } else if (id.includes('claude-3-haiku')) {
          result.anthropic.push(model.id);
        } else if (!id.includes('claude-2') && !id.includes('instant')) {
          result.anthropic.push(model.id);
        }
      }
      
      // OpenAI - prefer GPT-4 Turbo and newer
      if (id.startsWith('openai/')) {
        if (id.includes('gpt-4-turbo') || id.includes('gpt-4o')) {
          result.openai.unshift(model.id); // Latest at front
        } else if (id.includes('gpt-4-') && !id.includes('0314')) {
          result.openai.push(model.id);
        } else if (id.includes('gpt-3.5-turbo') && !id.includes('0301')) {
          result.openai.push(model.id);
        }
      }
      
      // Google - prefer Gemini 1.5 (current) models
      if (id.startsWith('google/')) {
        if (id.includes('gemini-pro-1.5') || id.includes('gemini-flash-1.5')) {
          result.google.unshift(model.id); // 1.5 models are current
        } else if (id.includes('gemini') && !id.includes('2.0')) {
          result.google.push(model.id);
        }
      }
      
      // Meta Llama
      if (id.startsWith('meta-llama/')) {
        if (id.includes('llama-3.1') || id.includes('llama-3.2')) {
          result.meta.unshift(model.id); // Latest versions
        } else if (id.includes('llama-3')) {
          result.meta.push(model.id);
        }
      }
    });
    
    return result;
  }
  
  /**
   * Get fast models suitable for AI Parser
   */
  async getFastModels(): Promise<string[]> {
    const models = await this.fetchOpenRouterModels();
    
    const fastModels: string[] = [];
    
    models.forEach(model => {
      const id = model.id.toLowerCase();
      const name = (model.name || '').toLowerCase();
      
      // Known fast models
      if (
        id.includes('flash') ||
        id.includes('haiku') ||
        id.includes('3.5-turbo') ||
        id.includes('mistral-7b') ||
        id.includes('mixtral') ||
        (id.includes('gemini') && id.includes('flash')) ||
        (id.includes('claude') && id.includes('haiku'))
      ) {
        fastModels.push(model.id);
      }
    });
    
    logger.info(`Found ${fastModels.length} fast models suitable for AI Parser`);
    return fastModels;
  }
}

// Export singleton
export const openRouterMatcher = new OpenRouterModelMatcher();