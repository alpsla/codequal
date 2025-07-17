import { Request, Response, NextFunction } from 'express';
import { TranslatorAgent, SupportedLanguage } from '@codequal/agents/translator/translator-agent';

// Type augmentation is handled in types/express.d.ts

// Create singleton translator instance
const translator = new TranslatorAgent();

// Common API messages for pre-caching
const COMMON_MESSAGES = {
  errors: {
    unauthorized: 'Authentication required',
    forbidden: 'Access denied',
    not_found: 'Resource not found',
    rate_limit: 'Rate limit exceeded',
    invalid_request: 'Invalid request parameters',
    server_error: 'Internal server error'
  },
  success: {
    created: 'Resource created successfully',
    updated: 'Resource updated successfully',
    deleted: 'Resource deleted successfully',
    analysis_started: 'Analysis started',
    api_key_created: 'API key created successfully'
  }
};

// Pre-cache common translations on startup
async function preCacheTranslations() {
  const languages: SupportedLanguage[] = ['es', 'zh', 'hi', 'pt', 'ja', 'de', 'ru', 'fr', 'ko'];
  const contexts = ['api', 'error'] as const;
  
  for (const lang of languages) {
    for (const context of contexts) {
      // Cache error messages
      for (const [key, message] of Object.entries(COMMON_MESSAGES.errors)) {
        await translator.translate({
          content: message,
          targetLanguage: lang,
          context: context === 'api' ? 'api' : 'error',
          tone: 'technical'
        });
      }
      
      // Cache success messages
      if (context === 'api') {
        for (const [key, message] of Object.entries(COMMON_MESSAGES.success)) {
          await translator.translate({
            content: message,
            targetLanguage: lang,
            context: 'api',
            tone: 'friendly'
          });
        }
      }
    }
  }
  
  console.log('Pre-cached translations for', languages.length, 'languages');
}

// Initialize pre-caching
// Temporarily disabled to get server running
// preCacheTranslations().catch(console.error);

/**
 * Internationalization middleware
 * Detects user language and provides translation helpers
 */
export function i18nMiddleware(req: Request, res: Response, next: NextFunction) {
  // Detect language from (in order of priority):
  // 1. Query parameter (?lang=es)
  // 2. X-Language header
  // 3. Accept-Language header
  // 4. Default to English
  
  let language: SupportedLanguage = 'en';
  
  // Check query parameter
  if (req.query.lang && TranslatorAgent.isLanguageSupported(req.query.lang as string)) {
    language = req.query.lang as SupportedLanguage;
  }
  // Check custom header
  else if (req.headers['x-language'] && TranslatorAgent.isLanguageSupported(req.headers['x-language'] as string)) {
    language = req.headers['x-language'] as SupportedLanguage;
  }
  // Check Accept-Language header
  else if (req.headers['accept-language']) {
    language = TranslatorAgent.detectLanguageFromHeader(req.headers['accept-language']);
  }
  
  // Set language on request
  req.language = language;
  
  // Add translation helper
  req.t = (key: string, params?: Record<string, any>) => {
    // Simple key-based translation (can be enhanced with i18n files)
    const keys = key.split('.');
    let message = key; // Fallback to key if not found
    
    if (keys[0] === 'errors' && keys[1] in COMMON_MESSAGES.errors) {
      message = COMMON_MESSAGES.errors[keys[1] as keyof typeof COMMON_MESSAGES.errors];
    } else if (keys[0] === 'success' && keys[1] in COMMON_MESSAGES.success) {
      message = COMMON_MESSAGES.success[keys[1] as keyof typeof COMMON_MESSAGES.success];
    }
    
    // Replace parameters
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        message = message.replace(`{${key}}`, String(value));
      });
    }
    
    return message;
  };
  
  // Set response language header
  res.setHeader('Content-Language', language);
  
  next();
}

/**
 * Translate response middleware
 * Automatically translates JSON responses based on user language
 */
export function translateResponse(
  context: 'api' | 'error' = 'api'
): (req: Request, res: Response, next: NextFunction) => void {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.language === 'en') {
      return next(); // No translation needed
    }
    
    // Override res.json to translate responses
    const originalJson = res.json;
    res.json = function(data: any) {
      // Don't translate if explicitly disabled
      if (req.headers['x-no-translation'] === 'true') {
        return originalJson.call(this, data);
      }
      
      // Translate the response asynchronously
      translator.translate({
        content: data,
        targetLanguage: req.language!,
        context,
        preserveKeys: true,
        tone: context === 'error' ? 'technical' : 'friendly'
      })
      .then(translatedData => {
        originalJson.call(this, translatedData);
      })
      .catch(error => {
        console.error('Translation error:', error);
        // Fallback to original data
        originalJson.call(this, data);
      });
      
      return this;
    };
    
    next();
  };
}

/**
 * Language validation middleware
 * Ensures valid language parameter
 */
export function validateLanguage(req: Request, res: Response, next: NextFunction) {
  const lang = req.query.lang || req.headers['x-language'];
  
  if (lang && !TranslatorAgent.isLanguageSupported(lang as string)) {
    const supportedLangs = Object.keys(TranslatorAgent.getSupportedLanguages());
    return res.status(400).json({
      error: 'Invalid language code',
      code: 'INVALID_LANGUAGE',
      details: {
        provided: lang,
        supported: supportedLangs
      }
    });
  }
  
  next();
}

/**
 * Get available languages endpoint helper
 */
export function getAvailableLanguages() {
  const languages = TranslatorAgent.getSupportedLanguages();
  return Object.entries(languages).map(([code, config]) => ({
    code,
    name: config.name,
    nativeName: config.nativeName,
    rtl: config.rtl
  }));
}