/**
 * Dynamic Model Selector Service - Temporary Stub
 * 
 * TODO: Move full implementation from standard/services/dynamic-model-selector.ts
 * This is currently a 532-line file that needs to be split according to CLAUDE.md guidelines.
 */

export interface RoleRequirements {
  role: string;
  description: string;
  languages?: string[];
  repositorySize: 'small' | 'medium' | 'large' | 'enterprise';
  maxCostPerMillion?: number;
  weights: {
    quality: number;
    speed: number;
    cost: number;
  };
  minContextWindow?: number;
  requiresReasoning?: boolean;
  requiresCodeAnalysis?: boolean;
}

export interface ModelCandidate {
  id: string;
  provider: string;
  model: string;
  contextLength: number;
  pricing: {
    prompt: number;
    completion: number;
  };
  qualityScore?: number;
  speedScore?: number;
  costScore?: number;
  totalScore?: number;
}

/**
 * Temporary stub implementation
 * Full implementation needs to be moved and split from standard directory
 */
export class DynamicModelSelector {
  private openRouterApiKey: string;
  
  constructor(apiKey?: string) {
    this.openRouterApiKey = apiKey || process.env.OPENROUTER_API_KEY || '';
  }
  
  /**
   * Temporary fallback implementation
   * Returns hardcoded models until full service is migrated
   */
  async selectModelsForRole(requirements: RoleRequirements): Promise<{
    primary: ModelCandidate;
    fallback: ModelCandidate;
    reasoning: string;
  }> {
    // Fallback to default models based on role
    const defaultModels = this.getDefaultModels(requirements.role);
    
    return {
      primary: defaultModels.primary,
      fallback: defaultModels.fallback,
      reasoning: `Using fallback models until full DynamicModelSelector is migrated to two-branch architecture. Role: ${requirements.role}`
    };
  }
  
  private getDefaultModels(role: string): { primary: ModelCandidate; fallback: ModelCandidate } {
    const primaryModel: ModelCandidate = {
      id: 'anthropic/claude-3-opus-20240229',
      provider: 'anthropic',
      model: 'anthropic/claude-3-opus-20240229',
      contextLength: 200000,
      pricing: { prompt: 15, completion: 75 }
    };
    
    const fallbackModel: ModelCandidate = {
      id: 'openai/gpt-4o-mini',
      provider: 'openai', 
      model: 'openai/gpt-4o-mini',
      contextLength: 128000,
      pricing: { prompt: 0.15, completion: 0.6 }
    };
    
    return { primary: primaryModel, fallback: fallbackModel };
  }
}

// Export for compatibility
export default DynamicModelSelector;