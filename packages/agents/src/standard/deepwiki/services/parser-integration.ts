/**
 * Parser Integration Module
 * 
 * Handles the transition from rule-based parsers to AI-driven parsing
 * while maintaining backward compatibility.
 */

import { DeepWikiResponseParserAI, DeepWikiParseResult } from './deepwiki-response-parser-ai';
import { parseDeepWikiResponse as legacyParse } from './deepwiki-response-parser';
import { ParseConfig } from './unified-ai-parser';
import { ILogger } from '../../services/interfaces/logger.interface';

export interface ParserOptions {
  useAI?: boolean;
  modelConfig?: {
    provider: string;
    model: string;
  };
  language?: string;
  framework?: string;
  repositorySize?: 'small' | 'medium' | 'large' | 'enterprise';
  complexity?: 'low' | 'medium' | 'high' | 'very-high';
  logger?: ILogger;
}

/**
 * Integrated parser that can use both AI and rule-based approaches
 */
export class IntegratedDeepWikiParser {
  private aiParser: DeepWikiResponseParserAI;
  private logger?: ILogger;
  private useAI: boolean;
  
  constructor(options: ParserOptions = {}) {
    this.logger = options.logger;
    this.aiParser = new DeepWikiResponseParserAI(this.logger);
    
    // Determine if AI should be used
    this.useAI = this.shouldUseAI(options);
    
    this.log('info', 'Initialized integrated parser', {
      useAI: this.useAI,
      hasModelConfig: !!options.modelConfig,
      hasOpenRouterKey: !!process.env.OPENROUTER_API_KEY,
      openRouterKeyLength: process.env.OPENROUTER_API_KEY?.length || 0
    });
  }
  
  /**
   * Parse DeepWiki response using the appropriate method
   */
  async parse(
    content: string,
    options: ParserOptions = {}
  ): Promise<DeepWikiParseResult> {
    const startTime = Date.now();
    
    // Override instance setting if explicitly provided
    const useAI = options.useAI !== undefined ? options.useAI : this.useAI;
    
    this.log('info', `Parsing DeepWiki response using ${useAI ? 'AI' : 'rule-based'} approach`);
    
    try {
      if (useAI) {
        // Use AI-driven parsing
        const config: Partial<ParseConfig> = {
          language: options.language,
          framework: options.framework,
          repositorySize: options.repositorySize,
          complexity: options.complexity,
          useAI: true
        };
        
        const result = await this.aiParser.parse(content, config);
        
        this.log('info', 'AI parsing completed', {
          issuesFound: result.issues.length,
          parseTime: Date.now() - startTime,
          confidence: result.metadata?.confidence
        });
        
        return result;
      } else {
        // Use legacy rule-based parsing
        const legacyResult = await this.parseLegacy(content);
        
        this.log('info', 'Rule-based parsing completed', {
          issuesFound: legacyResult.issues.length,
          parseTime: Date.now() - startTime
        });
        
        return legacyResult;
      }
    } catch (error) {
      this.log('error', 'Parsing failed, falling back to legacy parser', error);
      
      // Fallback to legacy parser on error
      return this.parseLegacy(content);
    }
  }
  
  /**
   * Determine if AI should be used based on configuration
   */
  private shouldUseAI(options: ParserOptions): boolean {
    // Explicit setting takes precedence
    if (options.useAI !== undefined) {
      return options.useAI;
    }
    
    // Check if we're in mock mode
    if (process.env.USE_DEEPWIKI_MOCK === 'true') {
      return false; // Use rule-based in mock mode
    }
    
    // Check if we have necessary configuration for AI
    const hasOpenRouterKey = !!(process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY);
    if (options.modelConfig || hasOpenRouterKey) {
      return true; // Use AI if we have model config
    }
    
    // Default to rule-based for backward compatibility
    return false;
  }
  
  /**
   * Parse using legacy rule-based parser
   */
  private async parseLegacy(content: string): Promise<DeepWikiParseResult> {
    const result = legacyParse(content);
    
    // Convert to async result format
    if (result instanceof Promise) {
      return result;
    }
    
    // Add metadata to match AI parser format
    return {
      ...result,
      metadata: {
        parseMethod: 'pattern',
        parseTime: 0,
        confidence: 0.7 // Fixed confidence for rule-based
      }
    };
  }
  
  /**
   * Static method for easy integration
   */
  static async parse(
    content: string,
    options: ParserOptions = {}
  ): Promise<DeepWikiParseResult> {
    const parser = new IntegratedDeepWikiParser(options);
    return parser.parse(content, options);
  }
  
  /**
   * Get parser capabilities
   */
  getCapabilities(): string[] {
    const capabilities = ['rule-based-parsing'];
    
    if (this.useAI) {
      capabilities.push(
        'ai-driven-parsing',
        'dynamic-model-selection',
        'context-aware-extraction',
        'multi-category-analysis'
      );
    }
    
    return capabilities;
  }
  
  /**
   * Enable AI parsing dynamically
   */
  enableAI(modelConfig?: { provider: string; model: string }): void {
    this.useAI = true;
    this.log('info', 'AI parsing enabled', { modelConfig });
  }
  
  /**
   * Disable AI parsing and use rule-based
   */
  disableAI(): void {
    this.useAI = false;
    this.log('info', 'AI parsing disabled, using rule-based approach');
  }
  
  private log(level: 'info' | 'error' | 'warn', message: string, data?: any): void {
    if (this.logger) {
      const logMessage = `[IntegratedParser] ${message}`;
      switch (level) {
        case 'info':
          this.logger.info(logMessage, data);
          break;
        case 'error':
          this.logger.error(logMessage, data);
          break;
        case 'warn':
          this.logger.warn(logMessage, data);
          break;
      }
    } else {
      console.log(`[IntegratedParser] [${level.toUpperCase()}] ${message}`, data || '');
    }
  }
}

/**
 * Export convenience function for backward compatibility
 */
export async function parseDeepWikiResponseWithAI(
  content: string,
  options?: ParserOptions
): Promise<DeepWikiParseResult> {
  return IntegratedDeepWikiParser.parse(content, { ...options, useAI: true });
}

/**
 * Export convenience function for rule-based parsing
 */
export async function parseDeepWikiResponseRuleBased(
  content: string,
  options?: ParserOptions
): Promise<DeepWikiParseResult> {
  return IntegratedDeepWikiParser.parse(content, { ...options, useAI: false });
}