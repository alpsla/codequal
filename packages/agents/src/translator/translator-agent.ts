import { createLogger } from '@codequal/core/utils';
import { TranslatorFactory, TranslationContext, quickTranslate } from './translator-factory';

export type SupportedLanguage = 'en' | 'es' | 'zh' | 'hi' | 'pt' | 'ja' | 'de' | 'ru' | 'fr' | 'ko';

export interface TranslationRequest {
  content: string | object;
  targetLanguage: SupportedLanguage;
  sourceLanguage?: SupportedLanguage;
  context: 'api' | 'ui' | 'docs' | 'sdk' | 'error';
  preserveKeys?: boolean; // For JSON objects
  tone?: 'technical' | 'friendly' | 'formal';
}

// Language configuration
export const LANGUAGE_CONFIG = {
  en: { name: 'English', nativeName: 'English', rtl: false },
  es: { name: 'Spanish', nativeName: 'Español', rtl: false },
  zh: { name: 'Mandarin', nativeName: '中文', rtl: false },
  hi: { name: 'Hindi', nativeName: 'हिन्दी', rtl: false },
  pt: { name: 'Portuguese', nativeName: 'Português', rtl: false },
  ja: { name: 'Japanese', nativeName: '日本語', rtl: false },
  de: { name: 'German', nativeName: 'Deutsch', rtl: false },
  ru: { name: 'Russian', nativeName: 'Русский', rtl: false },
  fr: { name: 'French', nativeName: 'Français', rtl: false },
  ko: { name: 'Korean', nativeName: '한국어', rtl: false }
};

export class TranslatorAgent {
  private logger = createLogger('TranslatorAgent');
  private factory: TranslatorFactory;

  constructor() {
    this.factory = TranslatorFactory.getInstance();
  }

  async translate(request: TranslationRequest): Promise<any> {
    try {
      // Map old context to new context if needed
      const context = this.mapContext(request.context) as TranslationContext;
      
      // Use factory for translation
      const result = await this.factory.translate({
        content: request.content,
        targetLanguage: request.targetLanguage,
        sourceLanguage: request.sourceLanguage,
        context,
        options: {
          preserveKeys: request.preserveKeys,
          tone: request.tone,
          ...this.getContextOptions(request)
        }
      });
      
      return result.translated;
    } catch (error) {
      this.logger.error('Translation failed', { error, request });
      return request.content; // Fallback to original
    }
  }

  /**
   * Map old context values to new TranslationContext types
   */
  private mapContext(context: string): string {
    const contextMap: Record<string, TranslationContext> = {
      'api': 'api',
      'error': 'error',
      'docs': 'docs',
      'documentation': 'docs',
      'ui': 'ui',
      'sdk': 'sdk',
      'code': 'sdk'
    };
    
    return contextMap[context] || 'api';
  }
  
  /**
   * Get context-specific options
   */
  private getContextOptions(request: TranslationRequest): any {
    const options: any = {};
    
    switch (request.context) {
      case 'error':
        options.includeSuggestions = true;
        options.technicalLevel = 'intermediate';
        break;
      case 'ui':
        options.maxLength = 50;
        break;
      case 'sdk':
        options.translateInlineComments = true;
        options.preserveJSDoc = true;
        break;
      case 'docs':
        options.preserveCodeBlocks = true;
        options.format = 'markdown';
        break;
    }
    
    return options;
  }

  private getSystemPrompt(context: string): string {
    const prompts = {
      api: `You are a technical translator for API responses. Maintain JSON structure, 
            error codes, and technical accuracy. Keep translations concise.`,
      ui: `You are a UI translator. Keep translations short and action-oriented for 
           buttons and labels. Maintain consistency across the interface.`,
      docs: `You are a documentation translator. Preserve markdown formatting, code 
            examples, and technical terminology. Ensure clarity and accuracy.`,
      sdk: `You are a code translator for SDKs. Keep method names, variables, and 
           code structure intact. Only translate comments and documentation.`,
      error: `You are translating error messages. Be clear, helpful, and maintain 
             the original meaning. Include actionable suggestions when possible.`
    };

    return prompts[context as keyof typeof prompts] || prompts.api;
  }

  private buildPrompt(request: TranslationRequest): string {
    const { content, targetLanguage, sourceLanguage = 'en', tone } = request;
    const targetLangName = LANGUAGE_CONFIG[targetLanguage].name;
    const sourceLangName = LANGUAGE_CONFIG[sourceLanguage].name;
    
    let prompt = `Translate the following from ${sourceLangName} to ${targetLangName}:\n\n`;
    
    if (typeof content === 'object') {
      prompt += `JSON content (preserve structure and keys):\n${JSON.stringify(content, null, 2)}`;
    } else {
      prompt += `Text: "${content}"`;
    }
    
    if (tone) {
      prompt += `\n\nTone: ${tone}`;
    }
    
    // Add language-specific instructions
    if (targetLanguage === 'zh' || targetLanguage === 'ja' || targetLanguage === 'ko') {
      prompt += '\n\nNote: Use appropriate honorifics and formal language where suitable.';
    }
    
    if (LANGUAGE_CONFIG[targetLanguage].rtl) {
      prompt += '\n\nNote: This is a right-to-left language.';
    }
    
    return prompt;
  }

  private parseResponse(response: string | null, request: TranslationRequest): any {
    if (!response) return request.content;
    
    if (typeof request.content === 'object') {
      try {
        return JSON.parse(response);
      } catch {
        return request.content;
      }
    }
    
    return response.trim();
  }

  private getCacheKey(request: TranslationRequest): string {
    const contentHash = typeof request.content === 'string' 
      ? request.content 
      : JSON.stringify(request.content);
    
    return `${request.targetLanguage}-${request.context}-${contentHash}`;
  }

  // Batch translation for efficiency
  async translateBatch(requests: TranslationRequest[]): Promise<any[]> {
    return Promise.all(requests.map(req => this.translate(req)));
  }

  // Clear cache (useful for updates)
  clearCache(language?: SupportedLanguage): void {
    // Clear all translator caches
    this.factory.clearAllCaches();
    
    if (language) {
      this.logger.info(`Cleared cache for language: ${language}`);
    } else {
      this.logger.info('Cleared all translation caches');
    }
  }

  // Get supported languages
  static getSupportedLanguages(): typeof LANGUAGE_CONFIG {
    return LANGUAGE_CONFIG;
  }

  // Validate language code
  static isLanguageSupported(lang: string): lang is SupportedLanguage {
    return lang in LANGUAGE_CONFIG;
  }

  // Get language display name
  static getLanguageName(lang: SupportedLanguage, native = false): string {
    const config = LANGUAGE_CONFIG[lang];
    return native ? config.nativeName : config.name;
  }

  // Detect language from Accept-Language header
  static detectLanguageFromHeader(acceptLanguage: string): SupportedLanguage {
    const languages = acceptLanguage.split(',').map(lang => {
      const [code] = lang.trim().split(';');
      return code.toLowerCase().split('-')[0];
    });

    for (const lang of languages) {
      if (this.isLanguageSupported(lang)) {
        return lang as SupportedLanguage;
      }
    }

    return 'en'; // Default to English
  }
  
  // Get model recommendation
  async getModelRecommendation(context: string, targetLanguage: SupportedLanguage): Promise<string> {
    // Model recommendations are now handled by the TranslatorFactory
    return this.factory.getRecommendedModel(context as TranslationContext, targetLanguage);
  }
  
  // Get translation statistics
  getStatistics(): any {
    return this.factory.getStatistics();
  }
  
  // Quick translate helper
  static async quickTranslate(
    content: string | object,
    targetLanguage: SupportedLanguage,
    context?: string
  ): Promise<any> {
    return quickTranslate(content, targetLanguage, context as TranslationContext);
  }
}