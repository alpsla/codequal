import { ModelVersionSync } from '@codequal/core/services/model-selection/ModelVersionSync';
import { createLogger } from '@codequal/core/utils';
import { 
  TRANSLATION_CONTEXTS, 
  TRANSLATION_MODEL_CRITERIA,
  LANGUAGE_MODEL_PREFERENCES,
  calculateModelScore,
  TranslationContextConfig
} from './translator-config';

interface TranslationModelCandidate {
  modelId: string;
  provider: string;
  qualityScore: number;
  averageLatency: number;
  costPer1kTokens: number;
  supportedLanguages: string[];
  specialCapabilities: string[];
  overallScore?: number;
}

export class TranslatorResearcher {
  private modelSync: ModelVersionSync;
  private logger = createLogger('TranslatorResearcher');
  private modelCache = new Map<string, TranslationModelCandidate[]>();

  constructor() {
    this.modelSync = new ModelVersionSync(this.logger);
  }

  /**
   * Research and select the best model for translation
   */
  async findOptimalTranslationModel(
    context: string,
    targetLanguage: string,
    requirements?: any
  ): Promise<TranslationModelCandidate> {
    const cacheKey = `${context}-${targetLanguage}`;
    
    // Check cache first
    if (this.modelCache.has(cacheKey)) {
      const cached = this.modelCache.get(cacheKey)!;
      return cached[0]; // Return best model
    }

    this.logger.info('Researching translation models', { context, targetLanguage });

    // Get context configuration
    const contextConfig = TRANSLATION_CONTEXTS[context] || TRANSLATION_CONTEXTS.api;

    // Research available models
    const candidates = await this.researchTranslationModels(
      targetLanguage,
      contextConfig,
      requirements
    );

    // Score and rank models
    const rankedModels = this.rankModels(candidates, contextConfig, targetLanguage);

    // Cache results
    this.modelCache.set(cacheKey, rankedModels);

    // Return best model
    return rankedModels[0];
  }

  /**
   * Research available translation models
   */
  private async researchTranslationModels(
    targetLanguage: string,
    contextConfig: TranslationContextConfig,
    additionalRequirements?: any
  ): Promise<TranslationModelCandidate[]> {
    // Get language-specific preferences
    const languagePreferences = LANGUAGE_MODEL_PREFERENCES[targetLanguage] || [];
    
    // Determine model tier based on context
    const modelTier = this.getModelTier(contextConfig);
    const tierModels = TRANSLATION_MODEL_CRITERIA[modelTier as keyof typeof TRANSLATION_MODEL_CRITERIA].models;

    // Combine tier models with language preferences
    const candidateModels = [...new Set([...languagePreferences, ...tierModels])];

    // Research each candidate
    const researchPromises = candidateModels.map(modelId => 
      this.researchSingleModel(modelId, targetLanguage)
    );

    const results = await Promise.all(researchPromises);
    
    // Filter out failed researches
    return results.filter(r => r !== null) as TranslationModelCandidate[];
  }

  /**
   * Research a single model's translation capabilities
   */
  private async researchSingleModel(
    modelId: string,
    targetLanguage: string
  ): Promise<TranslationModelCandidate | null> {
    try {
      const researchQuery = `
        Analyze ${modelId} for translation capabilities:
        1. Translation quality score (0-1) for ${targetLanguage}
        2. Average latency in milliseconds
        3. Cost per 1000 tokens
        4. Supported languages list
        5. Special capabilities (JSON support, formatting preservation, etc.)
        
        Focus on technical translation accuracy and API response translation.
      `;

      // Create mock model info based on known models
      const modelInfo = this.createModelInfo(modelId, targetLanguage);
      
      // Verify language support
      if (!modelInfo.supportedLanguages.includes(targetLanguage)) {
        this.logger.warn(`Model ${modelId} does not support ${targetLanguage}`);
        return null;
      }

      return modelInfo;
    } catch (error: any) {
      this.logger.error(`Failed to research model ${modelId}`, { error: error.message });
      return null;
    }
  }

  /**
   * Create model info based on known model characteristics
   */
  private createModelInfo(
    modelId: string,
    targetLanguage: string
  ): TranslationModelCandidate {
    // Known model characteristics
    const modelProfiles: Record<string, Partial<TranslationModelCandidate>> = {
      'gpt-4-turbo': {
        provider: 'openai',
        qualityScore: 0.95,
        averageLatency: 800,
        costPer1kTokens: 0.03,
        supportedLanguages: ['en', 'es', 'zh', 'hi', 'pt', 'ja', 'de', 'ru', 'fr', 'ko'],
        specialCapabilities: ['json_support', 'technical_translation', 'context_preservation']
      },
      'gpt-3.5-turbo': {
        provider: 'openai',
        qualityScore: 0.85,
        averageLatency: 400,
        costPer1kTokens: 0.002,
        supportedLanguages: ['en', 'es', 'zh', 'hi', 'pt', 'ja', 'de', 'ru', 'fr', 'ko'],
        specialCapabilities: ['json_support', 'fast_response']
      },
      'claude-3-opus': {
        provider: 'anthropic',
        qualityScore: 0.96,
        averageLatency: 1200,
        costPer1kTokens: 0.075,
        supportedLanguages: ['en', 'es', 'zh', 'hi', 'pt', 'ja', 'de', 'ru', 'fr', 'ko'],
        specialCapabilities: ['technical_translation', 'documentation', 'nuanced_translation']
      },
      'claude-3-sonnet': {
        provider: 'anthropic',
        qualityScore: 0.92,
        averageLatency: 600,
        costPer1kTokens: 0.015,
        supportedLanguages: ['en', 'es', 'zh', 'hi', 'pt', 'ja', 'de', 'ru', 'fr', 'ko'],
        specialCapabilities: ['balanced_performance', 'technical_translation']
      },
      'claude-3-haiku': {
        provider: 'anthropic',
        qualityScore: 0.82,
        averageLatency: 200,
        costPer1kTokens: 0.0008,
        supportedLanguages: ['en', 'es', 'zh', 'hi', 'pt', 'ja', 'de', 'ru', 'fr', 'ko'],
        specialCapabilities: ['fast_response', 'cost_effective']
      }
    };

    const profile = modelProfiles[modelId] || {
      provider: this.extractProvider(modelId),
      qualityScore: 0.8,
      averageLatency: 500,
      costPer1kTokens: 0.01,
      supportedLanguages: ['en', 'es', 'zh', 'hi', 'pt', 'ja', 'de', 'ru', 'fr', 'ko'],
      specialCapabilities: []
    };

    return {
      modelId,
      ...profile
    } as TranslationModelCandidate;
  }

  /**
   * Parse research results into structured data
   */
  private parseModelResearch(
    researchText: string,
    modelId: string
  ): TranslationModelCandidate {
    // Default values if parsing fails
    const defaults: TranslationModelCandidate = {
      modelId,
      provider: this.extractProvider(modelId),
      qualityScore: 0.85,
      averageLatency: 500,
      costPer1kTokens: 0.5,
      supportedLanguages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'pl', 'ru', 'ja', 'ko', 'zh'],
      specialCapabilities: []
    };

    try {
      // Extract quality score
      const qualityMatch = researchText.match(/quality[:\s]+(\d+\.?\d*)/i);
      if (qualityMatch) {
        defaults.qualityScore = parseFloat(qualityMatch[1]);
        if (defaults.qualityScore > 1) defaults.qualityScore /= 100; // Convert percentage
      }

      // Extract latency
      const latencyMatch = researchText.match(/latency[:\s]+(\d+)\s*ms/i);
      if (latencyMatch) {
        defaults.averageLatency = parseInt(latencyMatch[1]);
      }

      // Extract cost
      const costMatch = researchText.match(/cost[:\s]+\$?(\d+\.?\d*)/i);
      if (costMatch) {
        defaults.costPer1kTokens = parseFloat(costMatch[1]);
      }

      // Extract capabilities
      if (researchText.toLowerCase().includes('json')) {
        defaults.specialCapabilities.push('json_support');
      }
      if (researchText.toLowerCase().includes('format')) {
        defaults.specialCapabilities.push('format_preservation');
      }
      if (researchText.toLowerCase().includes('technical')) {
        defaults.specialCapabilities.push('technical_translation');
      }

    } catch (error) {
      this.logger.warn(`Failed to parse research for ${modelId}, using defaults`);
    }

    return defaults;
  }

  /**
   * Extract provider from model ID
   */
  private extractProvider(modelId: string): string {
    if (modelId.includes('gpt')) return 'openai';
    if (modelId.includes('claude')) return 'anthropic';
    if (modelId.includes('gemini')) return 'google';
    if (modelId.includes('llama')) return 'meta';
    if (modelId.includes('mixtral')) return 'mistral';
    return 'unknown';
  }

  /**
   * Determine model tier based on context
   */
  private getModelTier(contextConfig: TranslationContextConfig): string {
    const qualityWeight = contextConfig.quality;
    
    if (qualityWeight >= 70) return 'premium';
    if (qualityWeight >= 45) return 'balanced';
    return 'fast';
  }

  /**
   * Rank models based on context requirements
   */
  private rankModels(
    candidates: TranslationModelCandidate[],
    contextConfig: TranslationContextConfig,
    targetLanguage: string
  ): TranslationModelCandidate[] {
    // Calculate scores for each model
    const scoredModels = candidates.map(model => {
      const score = calculateModelScore(
        {
          quality: model.qualityScore,
          latency: model.averageLatency,
          costPer1kTokens: model.costPer1kTokens
        },
        contextConfig
      );

      // Bonus for language-specific preferences
      const languageBonus = LANGUAGE_MODEL_PREFERENCES[targetLanguage]?.includes(model.modelId) 
        ? 0.1 : 0;

      // Bonus for special capabilities
      const capabilityBonus = model.specialCapabilities.includes('technical_translation') 
        ? 0.05 : 0;

      return {
        ...model,
        overallScore: score + languageBonus + capabilityBonus
      };
    });

    // Sort by score (highest first)
    return scoredModels.sort((a, b) => (b.overallScore || 0) - (a.overallScore || 0));
  }

  /**
   * Get model recommendation report
   */
  async getModelRecommendation(
    context: string,
    targetLanguage: string
  ): Promise<string> {
    const model = await this.findOptimalTranslationModel(context, targetLanguage);
    const contextConfig = TRANSLATION_CONTEXTS[context];

    return `
## Translation Model Recommendation

**Context**: ${context}
**Target Language**: ${targetLanguage}
**Recommended Model**: ${model.modelId}

### Model Details
- Provider: ${model.provider}
- Quality Score: ${(model.qualityScore * 100).toFixed(1)}%
- Average Latency: ${model.averageLatency}ms
- Cost: $${model.costPer1kTokens}/1k tokens
- Special Capabilities: ${model.specialCapabilities.join(', ') || 'None'}

### Context Requirements
- Quality Weight: ${contextConfig.quality}%
- Speed Weight: ${contextConfig.speed}%
- Cost Weight: ${contextConfig.cost}%

### Score Breakdown
- Overall Score: ${(model.overallScore || 0).toFixed(3)}
- Quality Contribution: ${(model.qualityScore * contextConfig.quality / 100).toFixed(3)}
- Speed Contribution: ${((1 - model.averageLatency / 1000) * contextConfig.speed / 100).toFixed(3)}
- Cost Contribution: ${((1 - model.costPer1kTokens / 10) * contextConfig.cost / 100).toFixed(3)}

This model was selected as the optimal balance for ${context} translation needs.
    `;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.modelCache.clear();
  }
}