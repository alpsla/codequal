import { BaseTranslator, TranslationResult } from './base-translator';
import { SupportedLanguage } from '../translator-agent';
import { createAdvancedPrompt } from '../translator-prompts';

/**
 * Specialized translator for error messages
 * Optimized for: Clarity, actionability, user guidance
 */
export class ErrorTranslator extends BaseTranslator {
  // Common error patterns and their translations
  private commonErrors = new Map<string, Map<string, string>>();
  
  constructor() {
    super('ErrorTranslator');
    this.initializeCommonErrors();
  }
  
  getContext(): string {
    return 'error';
  }
  
  getCacheTTL(): number {
    return 7200; // 2 hours - errors are relatively static
  }
  
  async translate(
    content: string | object,
    targetLanguage: SupportedLanguage,
    options?: {
      includeStackTrace?: boolean;
      technicalLevel?: 'beginner' | 'intermediate' | 'advanced';
      includeSuggestions?: boolean;
    }
  ): Promise<TranslationResult> {
    const startTime = Date.now();
    const cacheKey = this.getCacheKey(content, targetLanguage, options);
    
    // Check cache
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return {
        translated: cached,
        confidence: 1.0,
        modelUsed: 'cache',
        processingTime: Date.now() - startTime,
        cached: true
      };
    }
    
    // Check common errors first
    if (typeof content === 'string') {
      const commonTranslation = this.getCommonErrorTranslation(content, targetLanguage);
      if (commonTranslation) {
        this.setCache(cacheKey, commonTranslation);
        return {
          translated: commonTranslation,
          confidence: 1.0,
          modelUsed: 'common-errors',
          processingTime: Date.now() - startTime,
          cached: false
        };
      }
    }
    
    try {
      // Ensure we have a model configuration from Vector DB
      if (!this.modelConfig) {
        throw new Error('Translator not initialized with Vector DB configuration');
      }
      
      // Get model ID from configuration
      const modelId = this.getModelId();
      const qualityScore = this.modelConfig.capabilities?.translationQuality || 0.90;
      
      this.logger.debug('Using Vector DB configured model', { 
        modelId, 
        provider: this.modelConfig.provider 
      });
      
      // Extract error components
      const errorInfo = this.parseErrorContent(content);
      
      // Generate prompt with error context
      const promptContent = this.formatErrorForTranslation(errorInfo, options);
      const { system, user } = createAdvancedPrompt(promptContent, {
        context: 'error',
        sourceLanguage: 'en',
        targetLanguage,
        tone: 'technical'
      });
      
      // Add specific instructions for error translation
      const enhancedSystem = system + `
        
Additional instructions for error translation:
1. Preserve all error codes exactly as they are (e.g., ERR_404, AUTH_FAILED)
2. Make the error message clear and actionable
3. If there's a suggestion, make it specific and helpful
4. Technical level: ${options?.technicalLevel || 'intermediate'}
5. ${options?.includeSuggestions ? 'Include helpful suggestions for resolving the error' : ''}`;
      
      // Translate using configured model via OpenRouter
      const client = this.ensureClient();
      const response = await client.chat.completions.create({
        model: modelId,
        messages: [
          { role: 'system', content: enhancedSystem },
          { role: 'user', content: user }
        ],
        temperature: 0.2, // Slightly higher for more natural error messages
        max_tokens: 500
      });
      
      let translated = this.parseResponse(response.choices[0].message.content);
      
      // Reconstruct error structure
      if (typeof content === 'object') {
        translated = this.reconstructErrorObject(errorInfo, translated, content);
      }
      
      // Add suggestions if requested
      if (options?.includeSuggestions && !this.hasSuggestions(translated)) {
        translated = this.addLocalizedSuggestions(translated, errorInfo.code, targetLanguage);
      }
      
      // Cache result
      this.setCache(cacheKey, translated);
      
      return {
        translated,
        confidence: qualityScore,
        modelUsed: modelId,
        processingTime: Date.now() - startTime,
        cached: false
      };
      
    } catch (error) {
      this.logger.error('Error translation failed', { error, content });
      // Return original with basic translation attempt
      return {
        translated: this.fallbackTranslation(content, targetLanguage),
        confidence: 0.5,
        modelUsed: 'fallback',
        processingTime: Date.now() - startTime,
        cached: false
      };
    }
  }
  
  /**
   * Initialize common error translations
   */
  private initializeCommonErrors(): void {
    // 404 errors
    this.addCommonError('Not found', {
      es: 'No encontrado',
      zh: '未找到',
      ja: '見つかりません',
      de: 'Nicht gefunden',
      fr: 'Non trouvé',
      pt: 'Não encontrado',
      ru: 'Не найдено',
      hi: 'नहीं मिला',
      ko: '찾을 수 없음'
    });
    
    // Authentication errors
    this.addCommonError('Authentication required', {
      es: 'Autenticación requerida',
      zh: '需要身份验证',
      ja: '認証が必要です',
      de: 'Authentifizierung erforderlich',
      fr: 'Authentification requise',
      pt: 'Autenticação necessária',
      ru: 'Требуется аутентификация',
      hi: 'प्रमाणीकरण आवश्यक',
      ko: '인증 필요'
    });
    
    // Add more common errors...
  }
  
  private addCommonError(english: string, translations: Record<string, string>): void {
    const map = new Map<string, string>();
    for (const [lang, translation] of Object.entries(translations)) {
      map.set(lang, translation);
    }
    this.commonErrors.set(english.toLowerCase(), map);
  }
  
  private getCommonErrorTranslation(error: string, language: SupportedLanguage): string | null {
    const errorMap = this.commonErrors.get(error.toLowerCase());
    return errorMap?.get(language) || null;
  }
  
  /**
   * Parse error content into structured format
   */
  private parseErrorContent(content: string | object): {
    message: string;
    code?: string;
    details?: any;
    stack?: string;
  } {
    if (typeof content === 'string') {
      // Try to extract error code from string
      const codeMatch = content.match(/\[([A-Z_]+\d*)\]/);
      return {
        message: content,
        code: codeMatch ? codeMatch[1] : undefined
      };
    }
    
    const errorContent = content as any;
    return {
      message: errorContent.error || errorContent.message || 'Unknown error',
      code: errorContent.code || errorContent.errorCode,
      details: errorContent.details || errorContent.data,
      stack: errorContent.stack
    };
  }
  
  /**
   * Format error for translation
   */
  private formatErrorForTranslation(errorInfo: any, options?: any): string {
    let formatted = errorInfo.message;
    
    if (errorInfo.code) {
      formatted = `[${errorInfo.code}] ${formatted}`;
    }
    
    if (errorInfo.details && !options?.includeStackTrace) {
      formatted += `\nDetails: ${JSON.stringify(errorInfo.details)}`;
    }
    
    return formatted;
  }
  
  /**
   * Parse translation response
   */
  private parseResponse(response: string | null): any {
    if (!response) return null;
    
    try {
      return JSON.parse(response);
    } catch {
      return response;
    }
  }
  
  /**
   * Reconstruct error object with translations
   */
  private reconstructErrorObject(
    errorInfo: any,
    translated: string,
    original: any
  ): any {
    const result = { ...original };
    
    // Update message/error field
    if ('error' in result) {
      result.error = translated;
    } else if ('message' in result) {
      result.message = translated;
    }
    
    // Preserve error code
    if (errorInfo.code) {
      result.code = errorInfo.code;
    }
    
    return result;
  }
  
  /**
   * Check if error has suggestions
   */
  private hasSuggestions(error: any): boolean {
    if (typeof error === 'string') return false;
    return 'suggestion' in error || 'suggestions' in error || 'resolution' in error;
  }
  
  /**
   * Add localized suggestions based on error code
   */
  private addLocalizedSuggestions(
    error: any,
    errorCode: string | undefined,
    language: SupportedLanguage
  ): any {
    if (!errorCode) return error;
    
    const suggestions: Record<string, Record<string, string>> = {
      'AUTH_FAILED': {
        es: 'Verifique su clave API y asegúrese de que no haya expirado',
        zh: '请检查您的API密钥并确保它没有过期',
        ja: 'APIキーを確認し、有効期限が切れていないことを確認してください',
        // ... other languages
      },
      'RATE_LIMIT': {
        es: 'Espere unos momentos antes de intentar nuevamente o actualice su plan',
        zh: '请稍等片刻再试，或升级您的计划',
        ja: 'しばらく待ってから再試行するか、プランをアップグレードしてください',
        // ... other languages
      }
    };
    
    const suggestion = suggestions[errorCode]?.[language];
    if (suggestion) {
      if (typeof error === 'string') {
        return `${error}\n\n💡 ${suggestion}`;
      } else {
        error.suggestion = suggestion;
      }
    }
    
    return error;
  }
  
  /**
   * Fallback translation for critical errors
   */
  private fallbackTranslation(content: any, language: SupportedLanguage): any {
    const fallbacks: Record<string, string> = {
      es: 'Se produjo un error. Por favor, inténtelo de nuevo.',
      zh: '发生错误。请重试。',
      ja: 'エラーが発生しました。もう一度お試しください。',
      de: 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.',
      fr: 'Une erreur s\'est produite. Veuillez réessayer.',
      pt: 'Ocorreu um erro. Por favor, tente novamente.',
      ru: 'Произошла ошибка. Пожалуйста, попробуйте еще раз.',
      hi: 'एक त्रुटि हुई। कृपया पुनः प्रयास करें।',
      ko: '오류가 발생했습니다. 다시 시도해 주세요.'
    };
    
    if (typeof content === 'string') {
      return fallbacks[language] || content;
    }
    
    return {
      ...content,
      message: fallbacks[language] || content.message || content.error
    };
  }
}