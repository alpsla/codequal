import { BaseTranslator, TranslationResult } from './base-translator';
import { SupportedLanguage } from '../translator-agent';
import { createAdvancedPrompt } from '../translator-prompts';

/**
 * Specialized translator for UI elements
 * Optimized for: Conciseness, cultural appropriateness, consistency
 */
export class UITranslator extends BaseTranslator {
  // UI terminology consistency map
  private uiTerms = new Map<string, Map<string, string>>();
  
  constructor() {
    super('UITranslator');
    this.initializeUITerms();
  }
  
  getContext(): string {
    return 'ui';
  }
  
  getCacheTTL(): number {
    return 86400; // 24 hours - UI elements are stable
  }
  
  async translate(
    content: string | object,
    targetLanguage: SupportedLanguage,
    options?: {
      maxLength?: number;
      context?: 'button' | 'label' | 'tooltip' | 'menu' | 'message';
      variables?: Record<string, string>;
      plural?: boolean;
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
    
    try {
      // Get optimal model for UI translation
      const model = await this.researcher.findOptimalTranslationModel('ui', targetLanguage);
      
      // Pre-process content
      const processed = this.preprocessUI(content, options);
      
      // Check UI terms dictionary first
      const quickTranslation = this.checkUITerms(processed.content, targetLanguage);
      if (quickTranslation && typeof processed.content === 'string') {
        const result = this.restoreVariables(quickTranslation, processed.variables);
        this.setCache(cacheKey, result);
        return {
          translated: result,
          confidence: 1.0,
          modelUsed: 'ui-terms',
          processingTime: Date.now() - startTime,
          cached: false
        };
      }
      
      // Generate prompt
      const { system, user } = createAdvancedPrompt(processed.content, {
        context: 'ui',
        sourceLanguage: 'en',
        targetLanguage,
        tone: 'friendly'
      });
      
      // Enhance system prompt for UI
      const enhancedSystem = system + `
        
Additional instructions for UI translation:
1. Keep translations concise - UI space is limited
2. Maximum length: ${options?.maxLength || 'appropriate for ' + (options?.context || 'general UI')}
3. Use common UI terminology for ${targetLanguage}
4. Be culturally appropriate
5. Maintain consistency with platform conventions
6. Context: ${options?.context || 'general UI element'}
${options?.plural ? '7. Handle plural forms correctly for ' + targetLanguage : ''}

Examples of good UI translations:
- "Save" → Keep short and action-oriented
- "Click here to continue" → Natural and friendly
- Error messages → Clear but not alarming`;
      
      // Translate
      const response = await this.openai.chat.completions.create({
        model: model.modelId,
        messages: [
          { role: 'system', content: enhancedSystem },
          { role: 'user', content: user }
        ],
        temperature: 0.3, // Bit higher for natural UI text
        max_tokens: 200 // UI elements are short
      });
      
      let translated = response.choices[0].message.content || '';
      
      // Restore variables
      if (processed.variables.size > 0) {
        translated = this.restoreVariables(translated, processed.variables);
      }
      
      // Apply length constraints
      if (options?.maxLength) {
        translated = this.enforceMaxLength(translated, options.maxLength, targetLanguage);
      }
      
      // Post-process for UI
      translated = this.postProcessUI(translated, targetLanguage, options?.context);
      
      // Cache result
      this.setCache(cacheKey, translated);
      
      return {
        translated,
        confidence: model.qualityScore,
        modelUsed: model.modelId,
        processingTime: Date.now() - startTime,
        cached: false
      };
      
    } catch (error) {
      this.logger.error('UI translation failed', { error, content });
      throw error;
    }
  }
  
  /**
   * Initialize common UI terms
   */
  private initializeUITerms(): void {
    // Buttons
    this.addUITerm('Save', {
      es: 'Guardar',
      zh: '保存',
      ja: '保存',
      de: 'Speichern',
      fr: 'Enregistrer',
      pt: 'Salvar',
      ru: 'Сохранить',
      hi: 'सहेजें',
      ko: '저장'
    });
    
    this.addUITerm('Cancel', {
      es: 'Cancelar',
      zh: '取消',
      ja: 'キャンセル',
      de: 'Abbrechen',
      fr: 'Annuler',
      pt: 'Cancelar',
      ru: 'Отмена',
      hi: 'रद्द करें',
      ko: '취소'
    });
    
    this.addUITerm('Delete', {
      es: 'Eliminar',
      zh: '删除',
      ja: '削除',
      de: 'Löschen',
      fr: 'Supprimer',
      pt: 'Excluir',
      ru: 'Удалить',
      hi: 'हटाएं',
      ko: '삭제'
    });
    
    // Common labels
    this.addUITerm('Settings', {
      es: 'Configuración',
      zh: '设置',
      ja: '設定',
      de: 'Einstellungen',
      fr: 'Paramètres',
      pt: 'Configurações',
      ru: 'Настройки',
      hi: 'सेटिंग्स',
      ko: '설정'
    });
    
    // Add more common UI terms...
  }
  
  private addUITerm(english: string, translations: Record<string, string>): void {
    const map = new Map<string, string>();
    for (const [lang, translation] of Object.entries(translations)) {
      map.set(lang, translation);
    }
    this.uiTerms.set(english.toLowerCase(), map);
  }
  
  private checkUITerms(content: string, language: SupportedLanguage): string | null {
    if (typeof content !== 'string') return null;
    
    const termMap = this.uiTerms.get(content.toLowerCase());
    return termMap?.get(language) || null;
  }
  
  /**
   * Pre-process UI content
   */
  private preprocessUI(
    content: string | object,
    options?: any
  ): {
    content: string;
    variables: Map<string, string>;
  } {
    if (typeof content !== 'string') {
      return { content: JSON.stringify(content), variables: new Map() };
    }
    
    const variables = new Map<string, string>();
    let processed = content;
    let varIndex = 0;
    
    // Preserve variables like {name}, {{count}}, %s, %d
    processed = processed.replace(/(\{+[^}]+\}+|%[sd])/g, (match) => {
      const placeholder = `__VAR_${varIndex++}__`;
      variables.set(placeholder, match);
      return placeholder;
    });
    
    // Preserve HTML entities
    processed = processed.replace(/&[a-z]+;/gi, (match) => {
      const placeholder = `__ENTITY_${varIndex++}__`;
      variables.set(placeholder, match);
      return placeholder;
    });
    
    return { content: processed, variables };
  }
  
  /**
   * Restore variables in translated text
   */
  private restoreVariables(translated: string, variables: Map<string, string>): string {
    let result = translated;
    
    for (const [placeholder, original] of variables) {
      result = result.replace(placeholder, original);
    }
    
    return result;
  }
  
  /**
   * Enforce maximum length constraints
   */
  private enforceMaxLength(
    text: string,
    maxLength: number,
    language: SupportedLanguage
  ): string {
    if (text.length <= maxLength) return text;
    
    // Try to shorten intelligently
    const shortened = text.substring(0, maxLength - 3);
    
    // Add appropriate ellipsis based on language
    const ellipsis: Record<string, string> = {
      zh: '…',
      ja: '…',
      ko: '…',
      default: '...'
    };
    
    return shortened + (ellipsis[language] || ellipsis.default);
  }
  
  /**
   * Post-process UI translations
   */
  private postProcessUI(
    content: string,
    language: SupportedLanguage,
    context?: string
  ): string {
    let result = content;
    
    // Language-specific formatting
    switch (language) {
      case 'de':
        // German often capitalizes nouns
        if (context === 'button' || context === 'menu') {
          result = result.charAt(0).toUpperCase() + result.slice(1);
        }
        break;
        
      case 'ja':
      case 'zh':
      case 'ko':
        // Remove unnecessary spaces in CJK languages
        result = result.replace(/\s+/g, '');
        // Re-add spaces around variables
        result = result.replace(/(\{[^}]+\})/g, ' $1 ').trim();
        break;
        
      case 'fr':
        // French spacing before punctuation
        result = result.replace(/\s*([!?:;])/g, ' $1');
        break;
    }
    
    // Context-specific formatting
    if (context === 'button') {
      // Buttons should be action-oriented and concise
      result = result.replace(/^(please|por favor|bitte|s'il vous plaît)\s+/i, '');
    }
    
    return result.trim();
  }
}