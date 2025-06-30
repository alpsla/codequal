/**
 * CodeQual Translator Module
 * 
 * Provides multi-language translation capabilities with specialized translators
 * optimized for different contexts (API, errors, documentation, UI, code)
 */

// Main translator agent (backward compatible)
export { TranslatorAgent, SupportedLanguage, LANGUAGE_CONFIG } from './translator-agent';
export type { TranslationRequest } from './translator-agent';

// Translator factory and specialized translators
export { TranslatorFactory, quickTranslate } from './translator-factory';
export type { TranslationContext, TranslationRequest as FactoryTranslationRequest } from './translator-factory';

// Base translator for extensions
export { BaseTranslator } from './specialized/base-translator';
export type { TranslationResult } from './specialized/base-translator';

// Specialized translators
export { APITranslator } from './specialized/api-translator';
export { ErrorTranslator } from './specialized/error-translator';
export { DocumentationTranslator } from './specialized/documentation-translator';
export { UITranslator } from './specialized/ui-translator';
export { CodeTranslator } from './specialized/code-translator';

// Configuration and utilities
export { TRANSLATION_CONTEXTS, TRANSLATION_MODEL_CRITERIA, calculateModelScore } from './translator-config';
export type { TranslationContextConfig } from './translator-config';

// Researcher for model selection
export { TranslatorResearcher } from './translator-researcher';

// Prompt generation
export { generateTranslationPrompt, createAdvancedPrompt } from './translator-prompts';
export type { TranslationPromptConfig } from './translator-prompts';

/**
 * Quick start examples:
 * 
 * 1. Simple translation:
 * ```typescript
 * import { quickTranslate } from '@codequal/agents/translator';
 * const translated = await quickTranslate('Hello world', 'es');
 * ```
 * 
 * 2. Context-aware translation:
 * ```typescript
 * import { TranslatorFactory } from '@codequal/agents/translator';
 * const factory = TranslatorFactory.getInstance();
 * const result = await factory.translate({
 *   content: { error: 'Not found' },
 *   targetLanguage: 'ja',
 *   context: 'error'
 * });
 * ```
 * 
 * 3. Backward compatible:
 * ```typescript
 * import { TranslatorAgent } from '@codequal/agents/translator';
 * const agent = new TranslatorAgent();
 * const translated = await agent.translate({
 *   content: 'Save',
 *   targetLanguage: 'de',
 *   context: 'ui'
 * });
 * ```
 */