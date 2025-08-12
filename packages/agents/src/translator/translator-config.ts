/**
 * Model requirements interface
 */
interface ModelRequirements {
  [key: string]: any;
}

/**
 * Translation context configurations with optimized weights
 * for quality, speed, and cost based on use case
 */
export interface TranslationContextConfig {
  quality: number;  // 0-100 weight
  speed: number;    // 0-100 weight  
  cost: number;     // 0-100 weight
  requirements: Partial<ModelRequirements>;
  cacheTTL?: number; // Cache duration in seconds
  maxTokens?: number;
}

export const TRANSLATION_CONTEXTS: Record<string, TranslationContextConfig> = {
  // API responses need balance of speed and quality
  api: {
    quality: 35,
    speed: 45,
    cost: 20,
    requirements: {
      max_latency_ms: 200,
      min_accuracy_score: 0.85,
      supports_json: true,
      supports_streaming: false
    },
    cacheTTL: 3600, // 1 hour cache
    maxTokens: 1000
  },

  // SDK/Technical documentation needs highest quality
  sdk: {
    quality: 70,
    speed: 10,
    cost: 20,
    requirements: {
      min_accuracy_score: 0.95,
      supports_technical_content: true,
      supports_code_preservation: true,
      max_latency_ms: 5000
    },
    cacheTTL: 86400, // 24 hours cache
    maxTokens: 4000
  },

  // Error messages need clarity and speed
  error: {
    quality: 50,
    speed: 35,
    cost: 15,
    requirements: {
      min_accuracy_score: 0.90,
      max_latency_ms: 300,
      supports_technical_content: true
    },
    cacheTTL: 7200, // 2 hours cache
    maxTokens: 500
  },

  // UI elements balance all factors
  ui: {
    quality: 45,
    speed: 25,
    cost: 30,
    requirements: {
      min_accuracy_score: 0.88,
      max_latency_ms: 500,
      supports_short_text: true
    },
    cacheTTL: 86400, // 24 hours cache
    maxTokens: 200
  },

  // Documentation needs highest quality
  docs: {
    quality: 80,
    speed: 5,
    cost: 15,
    requirements: {
      min_accuracy_score: 0.97,
      supports_markdown: true,
      supports_technical_content: true,
      preserves_formatting: true
    },
    cacheTTL: 604800, // 7 days cache
    maxTokens: 8000
  }
};

/**
 * Model selection criteria for translation tasks
 */
export const TRANSLATION_MODEL_CRITERIA = {
  // Tier 1: Premium models for critical translations
  premium: {
    models: [], // Dynamically selected by model selector
    useFor: ['sdk', 'docs'],
    minQualityScore: 0.95
  },

  // Tier 2: Balanced models for general use
  balanced: {
    models: [], // Dynamically selected by model selector
    useFor: ['api', 'error', 'ui'],
    minQualityScore: 0.85
  },

  // Tier 3: Fast models for simple translations
  fast: {
    models: [], // Dynamically selected by model selector
    useFor: ['ui', 'simple_text'],
    minQualityScore: 0.80
  },

  // Specialized translation models
  specialized: {
    models: [], // Dynamically selected by model selector
    useFor: ['batch_translation', 'offline_processing'],
    minQualityScore: 0.88
  }
};

/**
 * Language-specific model preferences
 */
export const LANGUAGE_MODEL_PREFERENCES: Record<string, string[]> = {
  // Language-specific preferences are now dynamically determined
  // The model selector will choose appropriate models based on:
  // - Language complexity and characteristics
  // - Available models with language support
  // - Current best-performing models
  zh: [], // Chinese - dynamically selected
  ja: [], // Japanese - dynamically selected
  ko: [], // Korean - dynamically selected
  hi: [], // Hindi - dynamically selected
  es: [], // Spanish - dynamically selected
  pt: [], // Portuguese - dynamically selected
  de: [], // German - dynamically selected
  fr: [], // French - dynamically selected
  ru: []  // Russian - dynamically selected
};

/**
 * Calculate composite score for model selection
 */
export function calculateModelScore(
  modelMetrics: {
    quality: number;      // 0-1 accuracy score
    latency: number;      // milliseconds
    costPer1kTokens: number; // USD
  },
  contextConfig: TranslationContextConfig
): number {
  // Normalize metrics to 0-1 scale
  const normalizedSpeed = 1 - Math.min(modelMetrics.latency / 1000, 1); // Lower latency = higher score
  const normalizedCost = 1 - Math.min(modelMetrics.costPer1kTokens / 10, 1); // Lower cost = higher score
  
  // Apply weights
  const qualityScore = modelMetrics.quality * (contextConfig.quality / 100);
  const speedScore = normalizedSpeed * (contextConfig.speed / 100);
  const costScore = normalizedCost * (contextConfig.cost / 100);
  
  // Composite score
  return qualityScore + speedScore + costScore;
}

/**
 * Special handling for technical content
 */
export const TECHNICAL_PRESERVATION_RULES = {
  // Never translate these
  preserve: [
    /`[^`]+`/g,                    // Inline code
    /```[\s\S]*?```/g,             // Code blocks
    /\b[A-Z_]+\b/g,                // Constants (API_KEY, MAX_SIZE)
    /\b\w+\(\)/g,                  // Function names
    /https?:\/\/[^\s]+/g,          // URLs
    /\b[a-z]+_[a-z_]+\b/g,         // snake_case identifiers
    /\$\{[^}]+\}/g,                // Template literals
    /\b(GET|POST|PUT|DELETE|PATCH)\b/g, // HTTP methods
  ],
  
  // Translate but keep original in parentheses
  annotate: [
    /\berror\s+\w+/gi,             // Error names
    /\bclass\s+\w+/gi,             // Class names
    /\binterface\s+\w+/gi,         // Interface names
  ]
};