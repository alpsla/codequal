import { createLogger } from '@codequal/core/utils';
import { SupportedLanguage } from './translator-agent';
import { BaseTranslator, TranslationResult } from './specialized/base-translator';
import { APITranslator } from './specialized/api-translator';
import { ErrorTranslator } from './specialized/error-translator';
import { DocumentationTranslator } from './specialized/documentation-translator';
import { UITranslator } from './specialized/ui-translator';
import { CodeTranslator } from './specialized/code-translator';
import { TranslatorRole, StoredTranslatorConfig } from './translator-role-config';
import { initializeTranslatorsFromVectorDB } from './load-translator-config';
import { AuthenticatedUser } from '../multi-agent/types/auth';

export type TranslationContext = 'api' | 'error' | 'docs' | 'ui' | 'sdk';

export interface TranslationRequest {
  content: string | object;
  targetLanguage: SupportedLanguage;
  sourceLanguage?: SupportedLanguage;
  context: TranslationContext;
  options?: Record<string, any>;
}

/**
 * Factory for managing specialized translators
 * Routes translation requests to the appropriate translator based on context
 */
export class TranslatorFactory {
  private static instance: TranslatorFactory;
  private translators: Map<TranslationContext, BaseTranslator>;
  private logger = createLogger('TranslatorFactory');
  private modelConfigs: Map<TranslatorRole, StoredTranslatorConfig> = new Map();
  private initialized = false;
  
  private constructor() {
    this.translators = new Map();
    this.initializeTranslators();
  }
  
  /**
   * Get singleton instance
   */
  static getInstance(): TranslatorFactory {
    if (!TranslatorFactory.instance) {
      TranslatorFactory.instance = new TranslatorFactory();
    }
    return TranslatorFactory.instance;
  }
  
  /**
   * Initialize all specialized translators
   */
  private initializeTranslators(): void {
    this.translators.set('api', new APITranslator());
    this.translators.set('error', new ErrorTranslator());
    this.translators.set('docs', new DocumentationTranslator());
    this.translators.set('ui', new UITranslator());
    this.translators.set('sdk', new CodeTranslator());
    
    this.logger.info('Initialized specialized translators', {
      contexts: Array.from(this.translators.keys())
    });
  }
  
  /**
   * Translate content using the appropriate specialized translator
   */
  async translate(request: TranslationRequest): Promise<TranslationResult> {
    const translator = this.translators.get(request.context);
    
    if (!translator) {
      this.logger.warn(`No translator found for context: ${request.context}, using API translator`);
      return this.translators.get('api')!.translate(
        request.content,
        request.targetLanguage,
        request.options
      );
    }
    
    this.logger.debug('Routing translation request', {
      context: request.context,
      targetLanguage: request.targetLanguage,
      contentType: typeof request.content
    });
    
    try {
      const result = await translator.translate(
        request.content,
        request.targetLanguage,
        request.options
      );
      
      this.logger.info('Translation completed', {
        context: request.context,
        language: request.targetLanguage,
        modelUsed: result.modelUsed,
        cached: result.cached,
        processingTime: result.processingTime
      });
      
      return result;
    } catch (error) {
      this.logger.error('Translation failed', { error, request });
      throw error;
    }
  }
  
  /**
   * Batch translate multiple items
   */
  async translateBatch(requests: TranslationRequest[]): Promise<TranslationResult[]> {
    // Group by context for efficiency
    const grouped = new Map<TranslationContext, TranslationRequest[]>();
    
    for (const request of requests) {
      const group = grouped.get(request.context) || [];
      group.push(request);
      grouped.set(request.context, group);
    }
    
    // Process each group in parallel
    const results: TranslationResult[] = [];
    const promises: Promise<void>[] = [];
    
    for (const [context, contextRequests] of grouped) {
      const translator = this.translators.get(context)!;
      
      // Process requests for this context
      const promise = Promise.all(
        contextRequests.map(req => 
          translator.translate(req.content, req.targetLanguage, req.options)
        )
      ).then(contextResults => {
        results.push(...contextResults);
      });
      
      promises.push(promise);
    }
    
    await Promise.all(promises);
    return results;
  }
  
  /**
   * Get translator for specific context
   */
  getTranslator(context: TranslationContext): BaseTranslator | undefined {
    return this.translators.get(context);
  }
  
  /**
   * Clear all caches
   */
  clearAllCaches(): void {
    for (const translator of this.translators.values()) {
      translator.clearCache();
    }
    this.logger.info('Cleared all translator caches');
  }
  
  /**
   * Get statistics for all translators
   */
  getStatistics(): Record<TranslationContext, any> {
    const stats: Record<string, any> = {};
    
    for (const [context, translator] of this.translators) {
      stats[context] = translator.getStats();
    }
    
    return stats;
  }
  
  /**
   * Determine best context based on content analysis
   */
  static detectContext(content: string | object): TranslationContext {
    if (typeof content === 'object') {
      // Check for API response patterns
      if ('error' in content || 'message' in content || 'code' in content) {
        return 'error';
      }
      if ('status' in content || 'data' in content || 'results' in content) {
        return 'api';
      }
    }
    
    if (typeof content === 'string') {
      // Check for code patterns
      if (content.includes('```') || content.includes('function') || content.includes('class')) {
        return content.includes('#') || content.includes('//') ? 'sdk' : 'docs';
      }
      
      // Check for error patterns
      if (content.match(/error|failed|invalid|unauthorized/i)) {
        return 'error';
      }
      
      // Check for documentation patterns
      if (content.includes('##') || content.length > 500) {
        return 'docs';
      }
      
      // Short text is likely UI
      if (content.length < 50 && !content.includes('{')) {
        return 'ui';
      }
    }
    
    return 'api'; // Default
  }
  
  /**
   * Validate translation request
   */
  static validateRequest(request: TranslationRequest): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!request.content) {
      errors.push('Content is required');
    }
    
    if (!request.targetLanguage) {
      errors.push('Target language is required');
    }
    
    if (!request.context) {
      errors.push('Context is required');
    }
    
    const validContexts = ['api', 'error', 'docs', 'ui', 'sdk'];
    if (request.context && !validContexts.includes(request.context)) {
      errors.push(`Invalid context. Must be one of: ${validContexts.join(', ')}`);
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Initialize factory with model configurations from Vector DB
   */
  async initializeWithVectorDB(authenticatedUser: AuthenticatedUser): Promise<void> {
    if (this.initialized) {
      this.logger.info('Translator factory already initialized with Vector DB');
      return;
    }
    
    try {
      this.logger.info('Initializing translator factory with Vector DB configurations');
      
      // Load configurations from Vector DB
      this.modelConfigs = await initializeTranslatorsFromVectorDB(authenticatedUser);
      
      // Map translator roles to contexts
      const roleToContext: Record<TranslatorRole, TranslationContext> = {
        [TranslatorRole.API_TRANSLATOR]: 'api',
        [TranslatorRole.ERROR_TRANSLATOR]: 'error',
        [TranslatorRole.DOCS_TRANSLATOR]: 'docs',
        [TranslatorRole.UI_TRANSLATOR]: 'ui',
        [TranslatorRole.SDK_TRANSLATOR]: 'sdk'
      };
      
      // Update each translator with its configuration
      for (const [role, config] of this.modelConfigs) {
        const context = roleToContext[role];
        const translator = this.translators.get(context);
        
        if (translator) {
          // Pass model configuration to translator
          translator.setModelConfig({
            provider: config.provider,
            model: config.model,
            capabilities: config.capabilities,
            pricing: config.pricing
          });
          
          this.logger.info(`Updated ${context} translator with model ${config.provider}/${config.model}`);
        }
      }
      
      this.initialized = true;
      this.logger.info('Successfully initialized translator factory with Vector DB configurations', {
        configuredRoles: Array.from(this.modelConfigs.keys())
      });
      
    } catch (error) {
      this.logger.error('Failed to initialize with Vector DB', {
        error: error instanceof Error ? error.message : String(error)
      });
      // Continue with default configurations
    }
  }
  
  /**
   * Get current model configuration for a context
   */
  getModelConfig(context: TranslationContext): StoredTranslatorConfig | undefined {
    const roleMap: Record<TranslationContext, TranslatorRole> = {
      'api': TranslatorRole.API_TRANSLATOR,
      'error': TranslatorRole.ERROR_TRANSLATOR,
      'docs': TranslatorRole.DOCS_TRANSLATOR,
      'ui': TranslatorRole.UI_TRANSLATOR,
      'sdk': TranslatorRole.SDK_TRANSLATOR
    };
    
    const role = roleMap[context];
    return role ? this.modelConfigs.get(role) : undefined;
  }
  
  /**
   * Get all model configurations
   */
  getAllModelConfigs(): Map<TranslatorRole, StoredTranslatorConfig> {
    return new Map(this.modelConfigs);
  }
  
  /**
   * Get recommended model for a context and language
   */
  async getRecommendedModel(context: TranslationContext, targetLanguage: SupportedLanguage): Promise<string> {
    const config = this.getModelConfig(context);
    if (config) {
      return `${config.provider}/${config.model}`;
    }
    
    // Default recommendations based on context
    const defaults: Record<TranslationContext, string> = {
      'api': 'openai/gpt-3.5-turbo',
      'error': 'anthropic/claude-3-haiku',
      'docs': 'openai/gpt-4',
      'ui': 'openai/gpt-3.5-turbo',
      'sdk': 'openai/gpt-4'
    };
    
    return defaults[context] || 'openai/gpt-3.5-turbo';
  }
}

/**
 * Convenience function for quick translation
 */
export async function quickTranslate(
  content: string | object,
  targetLanguage: SupportedLanguage,
  context?: TranslationContext,
  options?: any
): Promise<any> {
  const factory = TranslatorFactory.getInstance();
  const detectedContext = context || TranslatorFactory.detectContext(content);
  
  const result = await factory.translate({
    content,
    targetLanguage,
    context: detectedContext,
    options
  });
  
  return result.translated;
}