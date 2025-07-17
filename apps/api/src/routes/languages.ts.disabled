import { Router, Request, Response } from 'express';
import { getAvailableLanguages } from '../middleware/i18n-middleware';
import { TranslatorAgent } from '@codequal/agents/translator/translator-agent';

const router = Router();

/**
 * @swagger
 * /languages:
 *   get:
 *     summary: Get supported languages
 *     description: Returns a list of all supported languages for API responses
 *     tags: [Internationalization]
 *     responses:
 *       200:
 *         description: List of supported languages
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 languages:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       code:
 *                         type: string
 *                         description: ISO language code
 *                         example: es
 *                       name:
 *                         type: string
 *                         description: English name of the language
 *                         example: Spanish
 *                       nativeName:
 *                         type: string
 *                         description: Native name of the language
 *                         example: Español
 *                       rtl:
 *                         type: boolean
 *                         description: Whether the language is right-to-left
 *                         example: false
 *                 default:
 *                   type: string
 *                   description: Default language
 *                   example: en
 *             example:
 *               languages:
 *                 - code: en
 *                   name: English
 *                   nativeName: English
 *                   rtl: false
 *                 - code: es
 *                   name: Spanish
 *                   nativeName: Español
 *                   rtl: false
 *                 - code: zh
 *                   name: Mandarin
 *                   nativeName: 中文
 *                   rtl: false
 *               default: en
 */
router.get('/', (req: Request, res: Response) => {
  const languages = getAvailableLanguages();
  
  res.json({
    languages,
    default: 'en',
    total: languages.length
  });
});

/**
 * @swagger
 * /languages/detect:
 *   post:
 *     summary: Detect language from text
 *     description: Analyzes text to detect its language (useful for automatic translation)
 *     tags: [Internationalization]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *                 description: Text to analyze
 *                 example: "Hola, ¿cómo estás?"
 *     responses:
 *       200:
 *         description: Detected language
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 detectedLanguage:
 *                   type: string
 *                   description: ISO code of detected language
 *                   example: es
 *                 confidence:
 *                   type: number
 *                   description: Confidence score (0-1)
 *                   example: 0.95
 *                 languageName:
 *                   type: string
 *                   example: Spanish
 *       400:
 *         description: Invalid request
 */
router.post('/detect', async (req: Request, res: Response) => {
  const { text } = req.body;
  
  if (!text || typeof text !== 'string') {
    return res.status(400).json({
      error: 'Text is required',
      code: 'INVALID_REQUEST'
    });
  }
  
  // For now, return a simple detection based on common patterns
  // In production, this would use a language detection model
  const detectedLang = detectSimpleLanguage(text);
  
  res.json({
    detectedLanguage: detectedLang.code,
    confidence: detectedLang.confidence,
    languageName: TranslatorAgent.getLanguageName(detectedLang.code)
  });
});

/**
 * @swagger
 * /languages/translate:
 *   post:
 *     summary: Translate text
 *     description: Translate text between supported languages
 *     tags: [Internationalization]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *               - targetLanguage
 *             properties:
 *               text:
 *                 type: string
 *                 description: Text to translate
 *                 example: "Hello, how are you?"
 *               targetLanguage:
 *                 type: string
 *                 description: Target language code
 *                 example: es
 *               sourceLanguage:
 *                 type: string
 *                 description: Source language code (auto-detect if not provided)
 *                 example: en
 *               context:
 *                 type: string
 *                 enum: [api, ui, docs, sdk, error]
 *                 description: Translation context for better accuracy
 *                 default: api
 *     responses:
 *       200:
 *         description: Translation result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 translation:
 *                   type: string
 *                   example: "Hola, ¿cómo estás?"
 *                 sourceLanguage:
 *                   type: string
 *                   example: en
 *                 targetLanguage:
 *                   type: string
 *                   example: es
 *                 context:
 *                   type: string
 *                   example: api
 *       400:
 *         description: Invalid request
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 */
router.post('/translate', async (req: Request, res: Response) => {
  const { text, targetLanguage, sourceLanguage = 'en', context = 'api' } = req.body;
  
  // Validate input
  if (!text || typeof text !== 'string') {
    return res.status(400).json({
      error: 'Text is required',
      code: 'INVALID_REQUEST'
    });
  }
  
  if (!targetLanguage || !TranslatorAgent.isLanguageSupported(targetLanguage)) {
    return res.status(400).json({
      error: 'Invalid target language',
      code: 'INVALID_LANGUAGE',
      details: {
        supported: Object.keys(TranslatorAgent.getSupportedLanguages())
      }
    });
  }
  
  if (sourceLanguage && !TranslatorAgent.isLanguageSupported(sourceLanguage)) {
    return res.status(400).json({
      error: 'Invalid source language',
      code: 'INVALID_LANGUAGE'
    });
  }
  
  try {
    const translator = new TranslatorAgent();
    const translation = await translator.translate({
      content: text,
      targetLanguage,
      sourceLanguage,
      context,
      tone: 'technical'
    });
    
    res.json({
      translation,
      sourceLanguage,
      targetLanguage,
      context
    });
  } catch (error) {
    console.error('Translation error:', error);
    res.status(500).json({
      error: 'Translation failed',
      code: 'TRANSLATION_ERROR'
    });
  }
});

// Simple language detection (for demo - in production use a proper model)
function detectSimpleLanguage(text: string): { code: any; confidence: number } {
  const patterns = {
    es: /\b(hola|cómo|está|qué|por|para|gracias|adiós)\b/i,
    zh: /[\u4e00-\u9fa5]/,
    hi: /[\u0900-\u097F]/,
    pt: /\b(olá|como|está|obrigado|português)\b/i,
    ja: /[\u3040-\u309F\u30A0-\u30FF]/,
    de: /\b(hallo|wie|geht|danke|auf|wiedersehen)\b/i,
    ru: /[\u0400-\u04FF]/,
    fr: /\b(bonjour|comment|allez|merci|revoir)\b/i,
    ko: /[\uAC00-\uD7AF]/
  };
  
  for (const [lang, pattern] of Object.entries(patterns)) {
    if (pattern.test(text)) {
      return { code: lang as any, confidence: 0.8 };
    }
  }
  
  return { code: 'en', confidence: 0.5 };
}

export default router;