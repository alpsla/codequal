/**
 * Model Research Validator
 * 
 * Ensures researcher always selects valid, up-to-date models
 * and follows our configuration rules
 */

import { createLogger } from '@codequal/core/utils';

const logger = createLogger('model-research-validator');

export interface ModelValidationRules {
  // List of deprecated models that should NEVER be selected
  deprecatedModels: string[];
  
  // Valid model patterns (provider/model format)
  validModelPatterns: RegExp[];
  
  // Latest model versions (to ensure we use current versions)
  latestModels: Record<string, string>;
  
  // Cost thresholds
  maxInputCostPer1K: number;
  maxOutputCostPer1K: number;
}

export class ModelResearchValidator {
  private rules: ModelValidationRules = {
    deprecatedModels: [
      'claude-3.5-sonnet',
      'claude-3-sonnet',
      'gpt-4-32k',
      'gpt-3.5-turbo-16k',
      'text-davinci-003',
      'code-davinci-002'
    ],
    
    validModelPatterns: [
      /^openai\/gpt-4o-\d{4}-\d{2}$/,     // openai/gpt-4o-2025-01
      /^anthropic\/claude-[\w-]+-4$/,      // anthropic/claude-sonnet-4
      /^anthropic\/claude-\d+\.\d+-[\w]+$/, // anthropic/claude-3.7-sonnet
      /^openai\/gpt-4\.\d+$/,              // openai/gpt-4.1
      /^google\/gemini-[\w-]+$/,           // google/gemini-pro
      /^meta\/llama-[\w-]+$/               // meta/llama-3-70b
    ],
    
    latestModels: {
      'gpt-4': 'openai/gpt-4o-2025-01',
      'claude': 'anthropic/claude-sonnet-4',
      'claude-backup': 'anthropic/claude-3.7-sonnet',
      'gemini': 'google/gemini-1.5-pro',
      'llama': 'meta/llama-3-70b'
    },
    
    maxInputCostPer1K: 0.01,   // $0.01 per 1K tokens
    maxOutputCostPer1K: 0.03   // $0.03 per 1K tokens
  };
  
  /**
   * Create enhanced research prompt with validation rules
   */
  createEnhancedResearchPrompt(
    language: string,
    repositorySize: string,
    context: string[]
  ): string {
    return `You are researching optimal AI models for code analysis.

CONTEXT:
- Language: ${language}
- Repository Size: ${repositorySize}
- Tags: ${context.join(', ')}

STRICT REQUIREMENTS:
1. NEVER use deprecated models:
   ${this.rules.deprecatedModels.map(m => `- ${m}`).join('\n   ')}

2. ALWAYS use the latest model versions:
   ${Object.entries(this.rules.latestModels).map(([key, model]) => `- For ${key}: use ${model}`).join('\n   ')}

3. Model format MUST be: provider/model-name (e.g., openai/gpt-4o-2025-01)

4. Cost limits:
   - Input cost: max ${this.rules.maxInputCostPer1K} per 1K tokens
   - Output cost: max ${this.rules.maxOutputCostPer1K} per 1K tokens

5. For fallback models:
   - Primary: Use latest high-quality model (e.g., gpt-4o-2025-01)
   - Fallback: Use latest alternative provider (e.g., claude-sonnet-4, NOT claude-3.5-sonnet)

SELECTION CRITERIA:
- For ${repositorySize} repositories in ${language}:
  * Quality weight: ${this.getQualityWeight(repositorySize)}
  * Cost weight: ${this.getCostWeight(repositorySize)}
  * Speed weight: ${this.getSpeedWeight(repositorySize)}

Research and recommend models that:
1. Are currently available and not deprecated
2. Match the repository characteristics
3. Provide good quality/cost balance
4. Have proven track record for ${language} analysis

Return ONLY valid model names from 2025, not older versions.`;
  }
  
  /**
   * Validate research results
   */
  validateResearchResult(result: Record<string, unknown>): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Check primary model
    if (result.primary && typeof result.primary === 'string') {
      const primaryValidation = this.validateModel(result.primary);
      errors.push(...primaryValidation.errors);
      warnings.push(...primaryValidation.warnings);
    } else {
      errors.push('Missing primary model');
    }
    
    // Check fallback model
    if (result.fallback && typeof result.fallback === 'string') {
      const fallbackValidation = this.validateModel(result.fallback);
      errors.push(...fallbackValidation.errors.map(e => `Fallback: ${e}`));
      warnings.push(...fallbackValidation.warnings.map(w => `Fallback: ${w}`));
    }
    
    // Ensure different providers for resilience
    if (result.primary && result.fallback && 
        typeof result.primary === 'string' && typeof result.fallback === 'string') {
      const primaryProvider = result.primary.split('/')[0];
      const fallbackProvider = result.fallback.split('/')[0];
      if (primaryProvider === fallbackProvider) {
        warnings.push('Primary and fallback use same provider - consider diversifying');
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  /**
   * Validate individual model
   */
  private validateModel(model: string): {
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Check if deprecated
    if (this.rules.deprecatedModels.includes(model)) {
      errors.push(`Model "${model}" is deprecated and should not be used`);
    }
    
    // Check format
    const validFormat = this.rules.validModelPatterns.some(pattern => pattern.test(model));
    if (!validFormat) {
      errors.push(`Model "${model}" doesn't match valid format (provider/model-name)`);
    }
    
    // TODO: Check against Vector DB for deprecated models
    // This should query the model configurations to validate
    // For now, just check format
    if (!this.rules.validModelPatterns.some(pattern => pattern.test(model))) {
      warnings.push(`Model "${model}" format may not be standard`);
    }
    
    return { errors, warnings };
  }
  
  /**
   * Auto-fix common issues
   * TODO: Load model mappings from Vector DB
   */
  autoFixModel(model: string): string {
    // In production, this will query the model configurations
    // from Vector DB to suggest appropriate replacements
    
    // Add provider if missing
    if (!model.includes('/')) {
      if (model.startsWith('gpt')) {
        return `openai/${model}`;
      }
      if (model.startsWith('claude')) {
        return `anthropic/${model}`;
      }
    }
    
    return model;
  }
  
  private getQualityWeight(size: string): string {
    const weights: Record<string, string> = {
      'small': '40%',
      'medium': '50%',
      'large': '60%',
      'enterprise': '70%'
    };
    return weights[size] || '50%';
  }
  
  private getCostWeight(size: string): string {
    const weights: Record<string, string> = {
      'small': '40%',
      'medium': '35%',
      'large': '30%',
      'enterprise': '25%'
    };
    return weights[size] || '35%';
  }
  
  private getSpeedWeight(size: string): string {
    const weights: Record<string, string> = {
      'small': '20%',
      'medium': '15%',
      'large': '10%',
      'enterprise': '5%'
    };
    return weights[size] || '15%';
  }
}

// Export singleton
export const modelResearchValidator = new ModelResearchValidator();