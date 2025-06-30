import { BaseTranslator, TranslationResult } from './base-translator';
import { SupportedLanguage } from '../translator-agent';
import { createAdvancedPrompt } from '../translator-prompts';

/**
 * Specialized translator for API responses
 * Optimized for: Speed, JSON structure preservation, technical accuracy
 */
export class APITranslator extends BaseTranslator {
  constructor() {
    super('APITranslator');
  }
  
  getContext(): string {
    return 'api';
  }
  
  getCacheTTL(): number {
    return 3600; // 1 hour - API responses change frequently
  }
  
  async translate(
    content: string | object,
    targetLanguage: SupportedLanguage,
    options?: {
      preserveKeys?: boolean;
      includeTimestamps?: boolean;
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
      // Get optimal model for API translation
      const model = await this.researcher.findOptimalTranslationModel('api', targetLanguage);
      
      // Pre-process: Extract translatable content
      const processed = this.extractTranslatableContent(content);
      
      // Generate prompt
      const { system, user } = createAdvancedPrompt(processed.content, {
        context: 'api',
        sourceLanguage: 'en',
        targetLanguage,
        preserveFormatting: true
      });
      
      // Translate
      const response = await this.openai.chat.completions.create({
        model: model.modelId,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ],
        temperature: 0.1,
        max_tokens: 1000
      });
      
      let translated = this.parseResponse(response.choices[0].message.content);
      
      // Reconstruct with preserved keys - always preserve structure for objects
      if (typeof content === 'object') {
        translated = this.mergeWithOriginalStructure(content, translated, processed.map);
      }
      
      // Post-process
      translated = this.postProcessAPI(translated, targetLanguage);
      
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
      this.logger.error('API translation failed', { error, content });
      throw error;
    }
  }
  
  /**
   * Extract only translatable content from API response
   */
  private extractTranslatableContent(content: any): {
    content: any;
    map: Map<string, string>;
  } {
    const map = new Map<string, string>();
    
    if (typeof content === 'string') {
      return { content, map };
    }
    
    const extract = (obj: any, path = ''): any => {
      if (Array.isArray(obj)) {
        return obj.map((item, index) => extract(item, `${path}[${index}]`));
      }
      
      if (typeof obj === 'object' && obj !== null) {
        const result: any = {};
        
        for (const [key, value] of Object.entries(obj)) {
          const currentPath = path ? `${path}.${key}` : key;
          
          // Keys that contain translatable content
          const translatableKeys = ['message', 'error', 'description', 'title', 
                                   'status', 'label', 'text', 'summary', 'details'];
          
          if (translatableKeys.includes(key) && typeof value === 'string') {
            // Don't translate technical identifiers
            if (!/^[A-Z_]+$/.test(value) && !/^\w+_\w+$/.test(value)) {
              const placeholder = `__TRANSLATE_${map.size}__`;
              map.set(placeholder, currentPath);
              result[key] = placeholder;
            } else {
              result[key] = value;
            }
          } else {
            result[key] = extract(value, currentPath);
          }
        }
        
        return result;
      }
      
      return obj;
    };
    
    return {
      content: extract(content),
      map
    };
  }
  
  /**
   * Merge translated content back into original structure
   */
  private mergeWithOriginalStructure(
    original: any,
    translated: any,
    map: Map<string, string>
  ): any {
    // Deep clone original
    const result = JSON.parse(JSON.stringify(original));
    
    // Apply translations
    for (const [placeholder, path] of map.entries()) {
      const keys = path.split('.');
      let target = result;
      let translatedTarget = translated;
      
      for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (key.includes('[')) {
          const [arrayKey, index] = key.match(/(\w+)\[(\d+)\]/)!.slice(1);
          target = target[arrayKey][parseInt(index)];
          translatedTarget = translatedTarget?.[arrayKey]?.[parseInt(index)];
        } else {
          target = target[key];
          translatedTarget = translatedTarget?.[key];
        }
      }
      
      const finalKey = keys[keys.length - 1];
      if (translatedTarget && placeholder in translatedTarget) {
        target[finalKey] = translatedTarget[placeholder];
      }
    }
    
    return result;
  }
  
  /**
   * Parse translation response
   */
  private parseResponse(response: string | null): any {
    if (!response) return null;
    
    try {
      return JSON.parse(response);
    } catch {
      // If not JSON, return as string
      return response;
    }
  }
  
  /**
   * Post-process API translations
   */
  private postProcessAPI(translated: any, language: SupportedLanguage): any {
    if (typeof translated === 'string') {
      // Fix common API translation issues
      translated = translated
        .replace(/"(true|false)"/g, (match, bool) => bool) // Don't quote booleans
        .replace(/"(null)"/g, 'null'); // Don't quote null
    }
    
    if (typeof translated === 'object' && translated !== null) {
      // Ensure status codes remain numbers
      if ('statusCode' in translated && typeof translated.statusCode === 'string') {
        translated.statusCode = parseInt(translated.statusCode);
      }
      
      // Ensure timestamps remain in ISO format
      if ('timestamp' in translated && typeof translated.timestamp === 'string') {
        if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(translated.timestamp)) {
          translated.timestamp = new Date().toISOString();
        }
      }
    }
    
    return translated;
  }
}