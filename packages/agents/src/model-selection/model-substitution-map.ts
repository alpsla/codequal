/**
 * Model Substitution Map
 * 
 * Complete fix for BUG-034: Instead of just filtering out unavailable models,
 * this provides intelligent substitutions based on role, language, and size.
 * 
 * When a model is unavailable, we substitute with the best alternative
 * that matches the requirements.
 */

import { createLogger } from '@codequal/core/utils';

const logger = createLogger('ModelSubstitutionMap');

export interface ModelSubstitution {
  original: string;
  substitute: string;
  reason: string;
  contexts?: {
    role?: string;
    language?: string;
    size?: string;
  }[];
}

/**
 * Global exclusion list with substitutions
 * These models should NEVER be selected, with recommended alternatives
 */
export const MODEL_EXCLUSION_MAP: Record<string, ModelSubstitution> = {
  'google/gemini-2.5-pro-exp-03-25': {
    original: 'google/gemini-2.5-pro-exp-03-25',
    substitute: 'google/gemini-2.5-flash',  // FIXED: Use current 2.5 flash, not outdated 2.0
    reason: 'Model does not exist on OpenRouter (404 error)',
    contexts: [
      { role: 'ai-parser', language: 'any', size: 'any' }
    ]
  },
  
  'google/gemini-2.5-pro-exp': {
    original: 'google/gemini-2.5-pro-exp',
    substitute: 'google/gemini-2.5-pro',  // FIXED: Use stable 2.5 pro, not older version
    reason: 'Experimental model frequently unavailable',
    contexts: [
      { role: 'any', language: 'any', size: 'large' }
    ]
  },
  
  'openai/gpt-5-turbo': {
    original: 'openai/gpt-5-turbo',
    substitute: 'openai/gpt-4-turbo-preview',
    reason: 'Model does not exist yet',
    contexts: [
      { role: 'any', language: 'any', size: 'any' }
    ]
  },
  
  'anthropic/claude-opus-5': {
    original: 'anthropic/claude-opus-5',
    substitute: 'anthropic/claude-opus-4-1-20250805',
    reason: 'Model does not exist',
    contexts: [
      { role: 'any', language: 'any', size: 'any' }
    ]
  }
};

/**
 * Role-specific model preferences after web search discovery
 * Updated with latest models from BUG-035 fix
 */
export const ROLE_MODEL_PREFERENCES = {
  'ai-parser': {
    // Dynamic selection based on speed requirements
    primary: [],  // Will be filled by researcher based on SPEED priority
    fallback: []  // Will be filled by researcher based on SPEED priority
  },
  
  'deepwiki': {
    primary: [
      'anthropic/claude-opus-4-1-20250805',  // Best for deep analysis
      'openai/o1-preview',                   // Reasoning capabilities
      'anthropic/claude-opus-4'
    ],
    fallback: [
      'anthropic/claude-sonnet-4',
      'openai/gpt-4-turbo-preview',
      'google/gemini-2.0-flash-exp'
    ]
  },
  
  'comparison': {
    primary: [
      'anthropic/claude-sonnet-4',           // Balanced performance
      'openai/gpt-4-turbo-preview',
      'google/gemini-pro-1.5'
    ],
    fallback: [
      'openai/gpt-4',
      'anthropic/claude-haiku-3',
      'google/gemini-flash'
    ]
  },
  
  'researcher': {
    primary: [
      'openai/gpt-4-turbo-preview',          // Cost-effective for high volume
      'anthropic/claude-sonnet-4',
      'google/gemini-pro-1.5'
    ],
    fallback: [
      'anthropic/claude-haiku-3',
      'openai/gpt-3.5-turbo',
      'google/gemini-flash'
    ]
  }
};

/**
 * Language-specific preferences
 */
export const LANGUAGE_MODEL_PREFERENCES = {
  'typescript': {
    preferred: ['anthropic/claude-opus-4-1-20250805', 'openai/gpt-4-turbo-preview'],
    reason: 'Best TypeScript understanding'
  },
  'python': {
    preferred: ['anthropic/claude-opus-4-1-20250805', 'openai/o1-preview'],
    reason: 'Strong Python capabilities'
  },
  'go': {
    preferred: ['anthropic/claude-opus-4', 'openai/gpt-4-turbo-preview'],
    reason: 'Good Go language support'
  },
  'rust': {
    preferred: ['anthropic/claude-opus-4-1-20250805', 'openai/gpt-4-turbo-preview'],
    reason: 'Complex type system understanding'
  }
};

/**
 * Size-based preferences
 */
export const SIZE_MODEL_PREFERENCES = {
  'small': {
    preferred: ['anthropic/claude-haiku-3', 'google/gemini-flash', 'openai/gpt-3.5-turbo'],
    reason: 'Cost-effective for small codebases'
  },
  'medium': {
    preferred: ['anthropic/claude-sonnet-4', 'openai/gpt-4', 'google/gemini-pro-1.5'],
    reason: 'Balanced performance'
  },
  'large': {
    preferred: ['anthropic/claude-opus-4-1-20250805', 'openai/o1-preview', 'openai/gpt-4-turbo-preview'],
    reason: 'Maximum capability for complex codebases'
  }
};

export class ModelSubstitutionService {
  /**
   * Get substitution for an unavailable model
   */
  getSubstitution(
    modelId: string,
    context?: {
      role?: string;
      language?: string;
      size?: string;
    }
  ): string {
    // Check if model is in exclusion list
    const exclusion = MODEL_EXCLUSION_MAP[modelId];
    if (exclusion) {
      logger.info(`Substituting ${modelId} with ${exclusion.substitute}: ${exclusion.reason}`);
      return exclusion.substitute;
    }
    
    // If not explicitly excluded but unavailable, find best alternative
    return this.findBestAlternative(modelId, context);
  }
  
  /**
   * Find best alternative model based on context
   */
  private findBestAlternative(
    modelId: string,
    context?: {
      role?: string;
      language?: string;
      size?: string;
    }
  ): string {
    // Start with role preferences
    if (context?.role && ROLE_MODEL_PREFERENCES[context.role as keyof typeof ROLE_MODEL_PREFERENCES]) {
      const rolePrefs = ROLE_MODEL_PREFERENCES[context.role as keyof typeof ROLE_MODEL_PREFERENCES];
      
      // Try primary models first
      for (const model of rolePrefs.primary) {
        if (model !== modelId && !MODEL_EXCLUSION_MAP[model]) {
          logger.info(`Using role-based alternative: ${model} for ${context.role}`);
          return model;
        }
      }
      
      // Then fallback models
      for (const model of rolePrefs.fallback) {
        if (model !== modelId && !MODEL_EXCLUSION_MAP[model]) {
          logger.info(`Using role-based fallback: ${model} for ${context.role}`);
          return model;
        }
      }
    }
    
    // Check language preferences
    if (context?.language && LANGUAGE_MODEL_PREFERENCES[context.language as keyof typeof LANGUAGE_MODEL_PREFERENCES]) {
      const langPrefs = LANGUAGE_MODEL_PREFERENCES[context.language as keyof typeof LANGUAGE_MODEL_PREFERENCES];
      for (const model of langPrefs.preferred) {
        if (model !== modelId && !MODEL_EXCLUSION_MAP[model]) {
          logger.info(`Using language-based alternative: ${model} for ${context.language}`);
          return model;
        }
      }
    }
    
    // Check size preferences
    if (context?.size && SIZE_MODEL_PREFERENCES[context.size as keyof typeof SIZE_MODEL_PREFERENCES]) {
      const sizePrefs = SIZE_MODEL_PREFERENCES[context.size as keyof typeof SIZE_MODEL_PREFERENCES];
      for (const model of sizePrefs.preferred) {
        if (model !== modelId && !MODEL_EXCLUSION_MAP[model]) {
          logger.info(`Using size-based alternative: ${model} for ${context.size} repositories`);
          return model;
        }
      }
    }
    
    // Default fallback
    logger.warn(`No specific alternative found for ${modelId}, using default`);
    return 'openai/gpt-4-turbo-preview';
  }
  
  /**
   * Check if a model should be excluded
   */
  isExcluded(modelId: string): boolean {
    return !!MODEL_EXCLUSION_MAP[modelId];
  }
  
  /**
   * Get all excluded models
   */
  getExcludedModels(): string[] {
    return Object.keys(MODEL_EXCLUSION_MAP);
  }
  
  /**
   * Get substitution recommendations for a role
   */
  getRecommendationsForRole(role: string): {
    primary: string[];
    fallback: string[];
  } {
    const rolePrefs = ROLE_MODEL_PREFERENCES[role as keyof typeof ROLE_MODEL_PREFERENCES];
    if (!rolePrefs) {
      // Default recommendations
      return {
        primary: ['anthropic/claude-opus-4-1-20250805', 'openai/gpt-4-turbo-preview'],
        fallback: ['anthropic/claude-sonnet-4', 'openai/gpt-4']
      };
    }
    return rolePrefs;
  }
}

// Export singleton
export const modelSubstitutionService = new ModelSubstitutionService();