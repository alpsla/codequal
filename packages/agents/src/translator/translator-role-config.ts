/**
 * Translator Role Configuration for Model Selection
 * 
 * This module defines translator roles that integrate with the existing
 * model selection and research architecture. Each translator context
 * is treated as a distinct role that can be researched and optimized.
 */

import { ModelVersionInfo } from '@codequal/core/services/model-selection/ModelVersionSync';

/**
 * Translator role definitions for model research
 */
export enum TranslatorRole {
  API_TRANSLATOR = 'api_translator',
  ERROR_TRANSLATOR = 'error_translator',
  DOCS_TRANSLATOR = 'docs_translator',
  UI_TRANSLATOR = 'ui_translator',
  SDK_TRANSLATOR = 'sdk_translator'
}

/**
 * Translator role configurations for the researcher
 */
export interface TranslatorRoleConfig {
  role: TranslatorRole;
  name: string;
  description: string;
  researchPrompt: string;
  requirements: {
    maxLatency: number;
    minQuality: number;
    maxCostPerMillion: number;
    supportedLanguages: string[];
    specialCapabilities?: string[];
  };
  evaluationCriteria: {
    qualityWeight: number;
    speedWeight: number;
    costWeight: number;
  };
}

/**
 * Stored translator model configuration in Vector DB
 */
export interface StoredTranslatorConfig {
  role: TranslatorRole;
  provider: string;
  model: string;
  versionId: string;
  capabilities: {
    translationQuality: number;
    speed: number;
    contextWindow: number;
    languageSupport: number;
    formatPreservation: number;
  };
  pricing: {
    input: number;
    output: number;
  };
  supportedLanguages: string[];
  specialCapabilities: string[];
  testResults?: {
    avgTranslationTime: number;
    accuracyScore: number;
    formatPreservationScore: number;
    testCount: number;
    lastTested: string;
  };
  reason: string;
  previousModel?: {
    provider: string;
    model: string;
  };
  operationId?: string;
  timestamp?: string;
}

/**
 * Translator role configurations for different contexts
 */
export const TRANSLATOR_ROLE_CONFIGS: Record<TranslatorRole, TranslatorRoleConfig> = {
  [TranslatorRole.API_TRANSLATOR]: {
    role: TranslatorRole.API_TRANSLATOR,
    name: 'API Response Translator',
    description: 'Optimized for translating API responses while preserving JSON structure',
    researchPrompt: (() => {
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.toLocaleString('default', { month: 'long' });
      
      return `Find the SINGLE BEST AI model across ALL providers for API RESPONSE TRANSLATION tasks.

**CRITICAL REQUIREMENT: LATEST MODELS ONLY**
- Focus EXCLUSIVELY on models released in the last 6 months (since ${currentMonth} ${currentYear - 1})
- Prioritize models with the most recent training data (${currentYear} releases)
- Do NOT consider older models even if they were previously good
- Check for newest multilingual capabilities and JSON handling features

**API TRANSLATOR REQUIREMENTS:**
- MUST preserve JSON structure and keys exactly
- Fast response time (<500ms) for real-time API usage
- High accuracy for technical terms and status messages
- Cost-effective for high-volume usage
- Support for 10 languages: English, Spanish, Chinese, Hindi, Portuguese, Japanese, German, Russian, French, Korean

**LATEST MODEL DISCOVERY (${currentMonth} ${currentYear}):**
Search for the newest models from ALL providers released in ${currentYear}:
- OpenAI: Latest GPT-4.1, GPT-4-turbo, or newer models with JSON mode
- Anthropic: Newest Claude 3.5 Sonnet or Haiku models with structured output
- Google: Most recent Gemini 1.5 Flash or Pro models with API optimization
- DeepSeek: Latest DeepSeek-V3 or newer models with technical translation
- Mistral: Newest Mistral models with multilingual support
- Emerging providers: Search for new fast multilingual models

**CURRENT YEAR CONTEXT:** ${currentYear}
**RESEARCH DATE:** ${currentDate.toISOString().split('T')[0]}

**ROLE-SPECIFIC EVALUATION:**
- **JSON Preservation** (30%): Maintains structure and never translates keys
- **Translation Speed** (25%): Sub-500ms response times
- **Technical Accuracy** (20%): Correct technical terminology
- **Latest Model Benefits** (15%): Advantages from ${currentYear} training
- **Cost Efficiency** (10%): Low cost per million tokens

Focus on models that excel at:
- JSON format preservation and structured output
- Technical vocabulary in multiple languages
- Consistent API terminology translation
- Low latency streaming responses
- Batch translation capabilities`;
    })(),
    requirements: {
      maxLatency: 500,
      minQuality: 0.85,
      maxCostPerMillion: 5.0,
      supportedLanguages: ['en', 'es', 'zh', 'hi', 'pt', 'ja', 'de', 'ru', 'fr', 'ko'],
      specialCapabilities: ['json_support', 'streaming', 'batch_processing']
    },
    evaluationCriteria: {
      qualityWeight: 35,
      speedWeight: 45,
      costWeight: 20
    }
  },

  [TranslatorRole.ERROR_TRANSLATOR]: {
    role: TranslatorRole.ERROR_TRANSLATOR,
    name: 'Error Message Translator',
    description: 'Specialized in translating error messages for clarity and actionability',
    researchPrompt: (() => {
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.toLocaleString('default', { month: 'long' });
      
      return `Find the SINGLE BEST AI model across ALL providers for ERROR MESSAGE TRANSLATION tasks.

**CRITICAL REQUIREMENT: LATEST MODELS ONLY**
- Focus EXCLUSIVELY on models released in the last 6 months (since ${currentMonth} ${currentYear - 1})
- Prioritize models with the most recent training data (${currentYear} releases)
- Look for models with enhanced reasoning and solution generation capabilities

**ERROR TRANSLATOR REQUIREMENTS:**
- Clarity and actionability are paramount
- Must preserve error codes and technical identifiers
- Should suggest solutions when appropriate
- Moderate response time acceptable (<1000ms)
- Support for 10 languages with cultural sensitivity

**LATEST MODEL DISCOVERY (${currentMonth} ${currentYear}):**
Search for the newest models from ALL providers released in ${currentYear}:
- Anthropic: Latest Claude 3.5 Sonnet or Claude 4 models with reasoning
- OpenAI: Newest GPT-4.1 or GPT-4o models with problem-solving
- Google: Recent Gemini 1.5 Pro models with technical understanding
- Meta: Latest Llama 3.1+ models with instruction following
- Cohere: Newest Command models with action generation
- Emerging: Search for models specialized in technical communication

**CURRENT YEAR CONTEXT:** ${currentYear}
**RESEARCH DATE:** ${currentDate.toISOString().split('T')[0]}

**ROLE-SPECIFIC EVALUATION:**
- **Clarity & Actionability** (35%): Creates clear, helpful error messages
- **Solution Generation** (25%): Suggests fixes in target language
- **Latest Model Reasoning** (20%): Benefits from ${currentYear} improvements
- **Technical Preservation** (15%): Maintains error codes correctly
- **Cultural Adaptation** (5%): Appropriate tone for each language

Focus on models that excel at:
- Clear, empathetic error communication
- Technical accuracy with human readability
- Solution-oriented translations
- Context preservation
- Multi-step reasoning for error resolution`;
    })(),
    requirements: {
      maxLatency: 1000,
      minQuality: 0.90,
      maxCostPerMillion: 10.0,
      supportedLanguages: ['en', 'es', 'zh', 'hi', 'pt', 'ja', 'de', 'ru', 'fr', 'ko']
    },
    evaluationCriteria: {
      qualityWeight: 50,
      speedWeight: 35,
      costWeight: 15
    }
  },

  [TranslatorRole.DOCS_TRANSLATOR]: {
    role: TranslatorRole.DOCS_TRANSLATOR,
    name: 'Documentation Translator',
    description: 'High-quality translation for technical documentation',
    researchPrompt: (() => {
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.toLocaleString('default', { month: 'long' });
      
      return `Find the SINGLE BEST AI model across ALL providers for TECHNICAL DOCUMENTATION TRANSLATION tasks.

**CRITICAL REQUIREMENT: LATEST MODELS ONLY**
- Focus EXCLUSIVELY on models released in the last 6 months (since ${currentMonth} ${currentYear - 1})
- Prioritize models with extended context windows (200K+ tokens)
- Look for models with enhanced markdown and code understanding

**DOCUMENTATION TRANSLATOR REQUIREMENTS:**
- Highest quality translations with technical accuracy
- Preserve markdown formatting, code blocks, and structure
- Handle long documents efficiently
- Maintain consistency across document sections
- Support for 10 languages with technical terminology

**LATEST MODEL DISCOVERY (${currentMonth} ${currentYear}):**
Search for the newest models from ALL providers released in ${currentYear}:
- Anthropic: Latest Claude 3.5 Opus or Claude 4 models with 200K+ context
- OpenAI: Newest GPT-4.1-128K or GPT-4-turbo with extended context
- Google: Recent Gemini 1.5 Pro with 1M+ token context window
- Cohere: Latest Command-R+ models with document processing
- AI21: Newest Jamba models with long context support
- Emerging: Search for models specialized in technical documentation

**CURRENT YEAR CONTEXT:** ${currentYear}
**RESEARCH DATE:** ${currentDate.toISOString().split('T')[0]}

**ROLE-SPECIFIC EVALUATION:**
- **Translation Quality** (40%): Highest accuracy for technical content
- **Format Preservation** (25%): Maintains markdown, code blocks perfectly
- **Context Window** (20%): Handles entire documents coherently
- **Latest Model Benefits** (10%): ${currentYear} improvements in technical understanding
- **Consistency** (5%): Terminology consistency across sections

Focus on models that excel at:
- Long-form technical content translation
- Perfect markdown and code preservation
- Cross-reference consistency
- Technical terminology accuracy
- Document structure understanding`;
    })(),
    requirements: {
      maxLatency: 5000,
      minQuality: 0.95,
      maxCostPerMillion: 20.0,
      supportedLanguages: ['en', 'es', 'zh', 'hi', 'pt', 'ja', 'de', 'ru', 'fr', 'ko'],
      specialCapabilities: ['markdown_support', 'long_context', 'glossary_support']
    },
    evaluationCriteria: {
      qualityWeight: 80,
      speedWeight: 5,
      costWeight: 15
    }
  },

  [TranslatorRole.UI_TRANSLATOR]: {
    role: TranslatorRole.UI_TRANSLATOR,
    name: 'UI Text Translator',
    description: 'Optimized for user interface text with length constraints',
    researchPrompt: (() => {
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.toLocaleString('default', { month: 'long' });
      
      return `Find the SINGLE BEST AI model across ALL providers for UI TEXT TRANSLATION tasks.

**CRITICAL REQUIREMENT: LATEST MODELS ONLY**
- Focus EXCLUSIVELY on models released in the last 6 months (since ${currentMonth} ${currentYear - 1})
- Prioritize fastest models with <300ms latency
- Look for models optimized for short text and UI terminology

**UI TRANSLATOR REQUIREMENTS:**
- Respect UI space constraints and text length
- Use natural, user-friendly language
- Fast response for dynamic UI updates (<300ms)
- Consistent terminology for UI elements
- Support for 10 languages with UI conventions

**LATEST MODEL DISCOVERY (${currentMonth} ${currentYear}):**
Search for the newest models from ALL providers released in ${currentYear}:
- Anthropic: Latest Claude 3.5 Haiku or instant models
- OpenAI: Newest GPT-4o-mini or GPT-3.5-turbo variants
- Google: Recent Gemini 1.5 Flash or Nano models
- Mistral: Latest Mistral 7B or smaller models
- Meta: Newest Llama 3.2 models optimized for speed
- Emerging: Search for edge-optimized translation models

**CURRENT YEAR CONTEXT:** ${currentYear}
**RESEARCH DATE:** ${currentDate.toISOString().split('T')[0]}

**ROLE-SPECIFIC EVALUATION:**
- **Response Speed** (35%): Sub-300ms latency requirement
- **Conciseness** (25%): Respects UI length constraints
- **UI Terminology** (20%): Consistent UI element naming
- **Latest Model Speed** (15%): ${currentYear} latency improvements
- **Cost Efficiency** (5%): Low cost for high-volume UI updates

Focus on models that excel at:
- Ultra-fast response times
- Concise, natural translations
- UI-specific terminology
- Variable/placeholder handling
- Batch processing for UI element sets`;
    })(),
    requirements: {
      maxLatency: 300,
      minQuality: 0.88,
      maxCostPerMillion: 8.0,
      supportedLanguages: ['en', 'es', 'zh', 'hi', 'pt', 'ja', 'de', 'ru', 'fr', 'ko'],
      specialCapabilities: ['length_control', 'ui_terminology']
    },
    evaluationCriteria: {
      qualityWeight: 45,
      speedWeight: 25,
      costWeight: 30
    }
  },

  [TranslatorRole.SDK_TRANSLATOR]: {
    role: TranslatorRole.SDK_TRANSLATOR,
    name: 'SDK/Code Comment Translator',
    description: 'Specialized in translating code comments and SDK documentation',
    researchPrompt: (() => {
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.toLocaleString('default', { month: 'long' });
      
      return `Find the SINGLE BEST AI model across ALL providers for SDK AND CODE COMMENT TRANSLATION tasks.

**CRITICAL REQUIREMENT: LATEST MODELS ONLY**
- Focus EXCLUSIVELY on models released in the last 6 months (since ${currentMonth} ${currentYear - 1})
- Prioritize models with the most recent training data (${currentYear} releases)
- Do NOT consider older models even if they were previously good
- Check for newest code understanding and multi-language capabilities

**SDK TRANSLATOR REQUIREMENTS:**
- Preserve code structure and syntax exactly
- Translate ONLY comments and documentation strings
- Maintain technical accuracy and terminology
- Support various programming languages (JS, TS, Python, Java, etc.)
- Support for 10 natural languages: English, Spanish, Chinese, Hindi, Portuguese, Japanese, German, Russian, French, Korean

**LATEST MODEL DISCOVERY (${currentMonth} ${currentYear}):**
Search for the newest models from ALL providers released in ${currentYear}:
- OpenAI: Latest GPT-4.1-turbo, GPT-4o, or newer models with code understanding
- Anthropic: Newest Claude 3.5 Sonnet or Opus models with technical precision
- Google: Most recent Gemini 1.5 Pro models with code awareness
- DeepSeek: Latest DeepSeek-Coder-V3 or newer specialized coding models
- Meta: Newest Code Llama or Llama 3.1+ models with code capabilities
- Emerging providers: Search for new code-specific translation models

**CURRENT YEAR CONTEXT:** ${currentYear}
**RESEARCH DATE:** ${currentDate.toISOString().split('T')[0]}

**ROLE-SPECIFIC EVALUATION:**
- **Code Understanding** (35%): Correctly identifies code vs comments
- **Translation Accuracy** (30%): Precise technical terminology
- **Format Preservation** (20%): Maintains JSDoc/docstring structure
- **Latest Model Benefits** (10%): Advantages from ${currentYear} improvements
- **Language Coverage** (5%): Quality across 10 target languages

Focus on models that excel at:
- Code syntax preservation
- Comment extraction and translation
- Technical terminology consistency
- JSDoc/docstring format preservation
- Programming language awareness
- Multi-file context understanding`;
    })(),
    requirements: {
      maxLatency: 2000,
      minQuality: 0.92,
      maxCostPerMillion: 15.0,
      supportedLanguages: ['en', 'es', 'zh', 'hi', 'pt', 'ja', 'de', 'ru', 'fr', 'ko'],
      specialCapabilities: ['code_awareness', 'comment_extraction', 'syntax_preservation']
    },
    evaluationCriteria: {
      qualityWeight: 70,
      speedWeight: 10,
      costWeight: 20
    }
  }
};

/**
 * Get research prompt for a translator role
 */
export function getTranslatorResearchPrompt(role: TranslatorRole): string {
  const config = TRANSLATOR_ROLE_CONFIGS[role];
  if (!config) {
    throw new Error(`Unknown translator role: ${role}`);
  }
  
  return config.researchPrompt;
}

/**
 * Convert stored config to ModelVersionInfo for model registry
 */
export function translatorConfigToModelInfo(
  config: StoredTranslatorConfig
): ModelVersionInfo {
  return {
    provider: config.provider,
    model: config.model,
    versionId: config.versionId,
    releaseDate: new Date().toISOString().split('T')[0],
    description: `Translator model for ${config.role}: ${config.reason}`,
    capabilities: {
      codeQuality: config.capabilities.translationQuality,
      speed: config.capabilities.speed,
      contextWindow: config.capabilities.contextWindow,
      reasoning: config.capabilities.languageSupport,
      detailLevel: config.capabilities.formatPreservation
    },
    pricing: config.pricing,
    tier: 'STANDARD' as any,
    preferredFor: [config.role, 'translation', ...config.supportedLanguages]
  };
}

/**
 * Create evaluation criteria for translator model research
 */
export function getTranslatorEvaluationCriteria(role: TranslatorRole) {
  const config = TRANSLATOR_ROLE_CONFIGS[role];
  return {
    requirements: config.requirements,
    weights: config.evaluationCriteria,
    specialNeeds: config.requirements.specialCapabilities || []
  };
}