/**
 * Model Researcher Service
 * Discovers and evaluates AI models for each role/language/size combination
 * Updates configurations with actual model IDs
 */

export class ModelResearcher {
  // Current top models available via OpenRouter as of August 2025
  // All models will be called through OpenRouter API with OPENROUTER_API_KEY
  private availableModels = [
    // Anthropic Models (via OpenRouter)
    { provider: 'openrouter', model: 'anthropic/claude-3.5-sonnet', quality: 0.95, speed: 0.85, cost: 0.70, freshness: 1.0, contextWindow: 0.95 },
    { provider: 'openrouter', model: 'anthropic/claude-3-opus', quality: 0.98, speed: 0.60, cost: 0.40, freshness: 0.90, contextWindow: 0.95 },
    { provider: 'openrouter', model: 'anthropic/claude-3-haiku', quality: 0.75, speed: 0.95, cost: 0.90, freshness: 0.90, contextWindow: 0.85 },
    
    // OpenAI Models (via OpenRouter)
    { provider: 'openrouter', model: 'openai/gpt-4-turbo-2024-04-09', quality: 0.93, speed: 0.75, cost: 0.60, freshness: 1.0, contextWindow: 0.90 },
    { provider: 'openrouter', model: 'openai/gpt-4o', quality: 0.91, speed: 0.88, cost: 0.65, freshness: 0.95, contextWindow: 0.90 },
    { provider: 'openrouter', model: 'openai/gpt-4o-mini', quality: 0.80, speed: 0.92, cost: 0.85, freshness: 0.95, contextWindow: 0.80 },
    
    // Google Models (via OpenRouter)
    { provider: 'openrouter', model: 'google/gemini-pro-1.5', quality: 0.92, speed: 0.70, cost: 0.55, freshness: 0.95, contextWindow: 1.0 },
    { provider: 'openrouter', model: 'google/gemini-flash-1.5', quality: 0.82, speed: 0.90, cost: 0.80, freshness: 0.95, contextWindow: 0.90 },
    
    // Meta Models (via OpenRouter)
    { provider: 'openrouter', model: 'meta-llama/llama-3.1-405b-instruct', quality: 0.90, speed: 0.50, cost: 0.45, freshness: 0.85, contextWindow: 0.90 },
    { provider: 'openrouter', model: 'meta-llama/llama-3.1-70b-instruct', quality: 0.85, speed: 0.70, cost: 0.70, freshness: 0.85, contextWindow: 0.85 },
    
    // Mistral Models (via OpenRouter)
    { provider: 'openrouter', model: 'mistralai/mistral-large', quality: 0.88, speed: 0.80, cost: 0.75, freshness: 0.80, contextWindow: 0.85 },
    { provider: 'openrouter', model: 'mistralai/mixtral-8x22b-instruct', quality: 0.83, speed: 0.85, cost: 0.82, freshness: 0.75, contextWindow: 0.80 },
    
    // Cohere Models (via OpenRouter)
    { provider: 'openrouter', model: 'cohere/command-r-plus', quality: 0.86, speed: 0.78, cost: 0.68, freshness: 0.70, contextWindow: 0.88 },
    { provider: 'openrouter', model: 'cohere/command-r', quality: 0.78, speed: 0.88, cost: 0.83, freshness: 0.70, contextWindow: 0.82 }
  ];
  
  /**
   * Select best model for given weights
   */
  selectBestModel(weights: {
    quality: number;
    speed: number;
    cost: number;
    freshness: number;
    contextWindow: number;
  }, excludeProviders: string[] = []): { provider: string; model: string; score: number } {
    let bestModel = null;
    let bestScore = -1;
    
    for (const model of this.availableModels) {
      // Skip if provider is excluded (for fallback selection)
      if (excludeProviders.includes(model.provider)) continue;
      
      // Calculate weighted score
      const score = 
        model.quality * weights.quality +
        model.speed * weights.speed +
        model.cost * weights.cost +
        model.freshness * weights.freshness +
        model.contextWindow * weights.contextWindow;
      
      if (score > bestScore) {
        bestScore = score;
        bestModel = model;
      }
    }
    
    return {
      provider: bestModel!.provider,
      model: bestModel!.model,
      score: bestScore
    };
  }
  
  /**
   * Get model recommendations for a specific role
   */
  getModelForRole(
    role: string,
    weights: {
      quality: number;
      speed: number;
      cost: number;
      freshness: number;
      contextWindow: number;
    },
    language?: string,
    size?: string
  ): { primary: any; fallback: any } {
    // Adjust weights based on language complexity if provided
    const adjustedWeights = { ...weights };
    
    if (language) {
      const complexLanguages = ['rust', 'cpp', 'c', 'scala'];
      const simpleLanguages = ['python', 'javascript', 'ruby'];
      
      if (complexLanguages.includes(language.toLowerCase())) {
        // Complex languages need higher quality
        adjustedWeights.quality *= 1.2;
        adjustedWeights.speed *= 0.9;
      } else if (simpleLanguages.includes(language.toLowerCase())) {
        // Simple languages can prioritize speed
        adjustedWeights.speed *= 1.1;
        adjustedWeights.cost *= 1.1;
      }
    }
    
    // Adjust for repository size
    if (size === 'large') {
      adjustedWeights.contextWindow *= 1.3;
      adjustedWeights.quality *= 1.1;
    } else if (size === 'small') {
      adjustedWeights.speed *= 1.2;
      adjustedWeights.cost *= 1.2;
    }
    
    // Normalize weights
    const sum = Object.values(adjustedWeights).reduce((a: number, b: any) => a + (b as number), 0);
    Object.keys(adjustedWeights).forEach(key => {
      adjustedWeights[key as keyof typeof adjustedWeights] = adjustedWeights[key as keyof typeof adjustedWeights] / sum;
    });
    
    // Select primary model
    const primary = this.selectBestModel(adjustedWeights);
    
    // Select fallback from different provider
    const fallback = this.selectBestModel(adjustedWeights, [primary.provider]);
    
    return { primary, fallback };
  }
}