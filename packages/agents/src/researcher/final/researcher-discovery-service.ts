/**
 * Dynamic Researcher Model Discovery Service
 * 
 * Fetches current models from OpenRouter and selects the best
 * researcher model based on composite scoring.
 */

import { Logger } from 'winston';
import { 
  UnifiedModelSelection as ResearcherSelectionResult,
  ROLE_SCORING_PROFILES
} from '../../model-selection/unified-model-selector';

// Use local implementations for OpenRouter specific logic
// These functions handle the OpenRouter API response format

// Default configuration fallback
const DEFAULT_RESEARCHER_CONFIG: ResearcherSelectionResult = {
  primary: {
    provider: 'openai',
    model: 'dynamic', // Will be selected dynamically,
    versionId: 'latest',
    pricing: { input: 0.15, output: 0.60 }
  },
  fallback: {
    provider: 'anthropic', 
    model: 'dynamic', // Will be selected dynamically,
    versionId: 'latest',
    pricing: { input: 3.00, output: 15.00 }
  },
  reasoning: ['Default configuration - no API available'],
  scores: {
    primary: {} as any,
    fallback: {} as any
  }
};

export interface OpenRouterModel {
  id: string;
  name: string;
  pricing: {
    prompt: string;
    completion: string;
  };
  context_length?: number;
  top_provider?: boolean;
}

export class ResearcherDiscoveryService {
  private logger: Logger;
  private openRouterApiKey: string;
  private selectorModel: string;

  constructor(
    logger: Logger,
    openRouterApiKey: string,
    selectorModel = 'google/gemini-2.5-flash-preview-05-20'
  ) {
    this.logger = logger;
    this.openRouterApiKey = openRouterApiKey;
    this.selectorModel = selectorModel;
  }

  /**
   * Fetch available models from OpenRouter
   */
  async fetchAvailableModels(): Promise<OpenRouterModel[]> {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: {
          'Authorization': `Bearer ${this.openRouterApiKey}`,
          'HTTP-Referer': 'https://github.com/codequal/researcher-discovery',
          'X-Title': 'CodeQual Researcher Discovery'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data as OpenRouterModel[];
    } catch (error) {
      this.logger.error('Failed to fetch OpenRouter models', { error });
      return [];
    }
  }

  /**
   * Select best researcher model using AI selection
   */
  async selectResearcherModel(models: OpenRouterModel[]): Promise<ResearcherSelectionResult> {
    try {
      // Score and rank all models
      const scoredModels = scoreModelsForResearcher(models);
      
      if (scoredModels.length === 0) {
        this.logger.warn('No suitable models found, using defaults');
        return {
        ...DEFAULT_RESEARCHER_CONFIG,
        reasoning: ['Using default configuration - OpenRouter API unavailable']
      } as ResearcherSelectionResult;
      }

      // Create simple prompt with top 5
      const prompt = createSimpleSelectionPrompt(scoredModels);
      
      // Call selector model
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openRouterApiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://github.com/codequal/researcher-discovery',
          'X-Title': 'CodeQual Researcher Selection'
        },
        body: JSON.stringify({
          model: this.selectorModel,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 100,
          temperature: 0
        })
      });

      if (!response.ok) {
        throw new Error(`Selection API error: ${response.statusText}`);
      }

      const data = await response.json();
      const result = data.choices[0].message.content;
      const usage = data.usage;

      // Parse selection
      const selection = parseResearcherSelection(result);
      
      if (!selection.primary || !selection.fallback) {
        this.logger.warn('Failed to parse selection, using top 2 by score');
        selection.primary = {
          provider: scoredModels[0].provider,
          model: scoredModels[0].model,
          versionId: 'latest',
          pricing: {
            input: scoredModels[0].inputCost,
            output: scoredModels[0].outputCost
          },
          capabilities: {
            contextWindow: scoredModels[0].contextWindow
          }
        };
        selection.fallback = {
          provider: scoredModels[1].provider,
          model: scoredModels[1].model,
          versionId: 'latest',
          pricing: {
            input: scoredModels[1].inputCost,
            output: scoredModels[1].outputCost
          },
          capabilities: {
            contextWindow: scoredModels[1].contextWindow
          }
        };
      }

      return {
        primary: selection.primary!,
        fallback: selection.fallback!,
        tokenUsage: {
          prompt: usage.prompt_tokens,
          completion: usage.completion_tokens,
          total: usage.prompt_tokens + usage.completion_tokens,
          cost: (usage.prompt_tokens * 0.15 + usage.completion_tokens * 0.60) / 1000000
        },
        scores: {
          primary: scoredModels.find(m => m.id === `${selection.primary!.provider}/${selection.primary!.model}`) || scoredModels[0],
          fallback: scoredModels.find(m => m.id === `${selection.fallback!.provider}/${selection.fallback!.model}`) || scoredModels[1]
        },
        reasoning: ['Selected using AI model evaluation based on composite scoring']
      } as ResearcherSelectionResult;

    } catch (error) {
      this.logger.error('Failed to select researcher model', { error });
      return {
        ...DEFAULT_RESEARCHER_CONFIG,
        reasoning: ['Using default configuration - OpenRouter API unavailable']
      } as ResearcherSelectionResult;
    }
  }

  /**
   * Discover and select the best researcher model
   */
  async discoverBestResearcher(): Promise<ResearcherSelectionResult> {
    this.logger.info('Starting researcher model discovery...');
    
    // Fetch current models
    const models = await this.fetchAvailableModels();
    this.logger.info(`Found ${models.length} available models`);
    
    if (models.length === 0) {
      this.logger.warn('No models found, using default configuration');
      return {
        ...DEFAULT_RESEARCHER_CONFIG,
        reasoning: ['Using default configuration - OpenRouter API unavailable']
      } as ResearcherSelectionResult;
    }

    // Select best researcher
    const result = await this.selectResearcherModel(models);
    
    this.logger.info('Researcher selection complete', {
      primary: result.primary.provider + '/' + result.primary.model,
      fallback: result.fallback.provider + '/' + result.fallback.model,
      primaryScore: result.scores.primary.compositeScore.toFixed(2),
      fallbackScore: result.scores.fallback.compositeScore.toFixed(2),
      tokenCost: `$${result.tokenUsage?.cost.toFixed(6) || '0.000000'}`
    });

    return result;
  }

  /**
   * Compare current researcher with discovered best option
   */
  compareWithCurrent(
    current: { provider: string; model: string; cost: number },
    discovered: ResearcherSelectionResult
  ): {
    shouldUpgrade: boolean;
    reasoning: string;
    qualityImprovement: number;
    costDifference: number;
  } {
    const currentMonthlyCost = current.cost * 0.001 * 3000 * 30;
    const discoveredMonthlyCost = discovered.scores.primary.avgCost * 0.001 * 3000 * 30;
    const costDifference = discoveredMonthlyCost - currentMonthlyCost;
    
    // Estimate quality improvement (would need actual scoring of current model)
    const qualityImprovement = discovered.scores.primary.quality - 8.0; // Assuming current ~8.0
    
    let shouldUpgrade = false;
    let reasoning = '';

    if (qualityImprovement > 0.5 && costDifference < 50) {
      shouldUpgrade = true;
      reasoning = `Significant quality improvement (+${qualityImprovement.toFixed(1)}) with acceptable cost increase ($${costDifference.toFixed(2)}/month)`;
    } else if (qualityImprovement > 0 && costDifference < 0) {
      shouldUpgrade = true;
      reasoning = `Better quality (+${qualityImprovement.toFixed(1)}) AND cost savings ($${Math.abs(costDifference).toFixed(2)}/month)`;
    } else if (qualityImprovement < -0.5) {
      shouldUpgrade = false;
      reasoning = 'Current model has better quality';
    } else {
      shouldUpgrade = false;
      reasoning = 'Marginal improvements do not justify change';
    }

    return {
      shouldUpgrade,
      reasoning,
      qualityImprovement,
      costDifference
    };
  }
}

// Helper functions for OpenRouter model processing

function scoreModelsForResearcher(models: any[]): any[] {
  const weights = ROLE_SCORING_PROFILES.researcher;
  
  return models
    .filter(m => {
      const id = m.id.toLowerCase();
      return !id.includes('embed') && 
             !id.includes('vision') && 
             m.pricing &&
             (parseFloat(m.pricing.prompt) > 0 || parseFloat(m.pricing.completion) > 0);
    })
    .map(m => {
      const inputCost = parseFloat(m.pricing.prompt) * 1000000;
      const outputCost = parseFloat(m.pricing.completion) * 1000000;
      const avgCost = (inputCost + outputCost) / 2;
      
      const quality = inferQuality(m.id);
      const speed = inferSpeed(m.id);
      const priceScore = 10 - (Math.min(avgCost, 20) / 2);
      const compositeScore = quality * weights.quality + priceScore * weights.cost + speed * weights.speed;
      
      const [provider, ...modelParts] = m.id.split('/');
      
      return {
        id: m.id,
        provider,
        model: modelParts.join('/'),
        inputCost,
        outputCost,
        avgCost,
        contextWindow: m.context_length || 128000,
        quality,
        speed,
        priceScore,
        compositeScore
      };
    })
    .sort((a, b) => b.compositeScore - a.compositeScore);
}

function createSimpleSelectionPrompt(topModels: any[]): string {
  const top5 = topModels.slice(0, 5);
  
  return `Pick the best 2 models for AI research from this ranked list:

${top5.map((m, i) => 
  `${i + 1}. ${m.id} - Score: ${m.compositeScore.toFixed(2)} - $${m.inputCost.toFixed(2)}/$${m.outputCost.toFixed(2)}`
).join('\n')}

Output only 2 CSV rows for #1 and #2:
provider,model,input,output,RESEARCHER,context`;
}

function parseResearcherSelection(response: string): {
  primary?: any;
  fallback?: any;
} {
  const lines = response.split('\n')
    .filter(line => line.trim() && line.includes(','))
    .map(line => {
      const parts = line.split(',').map(p => p.trim());
      if (parts.length >= 6) {
        return {
          provider: parts[0],
          model: parts[1],
          versionId: 'latest',
          pricing: {
            input: parseFloat(parts[2]),
            output: parseFloat(parts[3])
          },
          capabilities: {
            contextWindow: parseInt(parts[5]) || 128000
          }
        };
      }
      return undefined;
    })
    .filter(item => item !== undefined);
  
  return {
    primary: lines[0],
    fallback: lines[1]
  };
}

function inferQuality(modelId: string): number {
  const id = modelId.toLowerCase();
  if (id.includes('gpt-4.5')) return 9.7;
  if (id.includes('opus') || id.includes('claude-3.7')) return 9.5;
  if (id.includes('gpt-4o') && !id.includes('mini')) return 8.8;
  if (id.includes('claude-3.5')) return 8.9;
  if (id.includes('gemini') && id.includes('2.0')) return 8.5;
  if (id.includes('gpt-4o-mini')) return 7.9;
  return 7.0;
}

function inferSpeed(modelId: string): number {
  const id = modelId.toLowerCase();
  if (id.includes('flash') || id.includes('mini')) return 9.0;
  if (id.includes('sonnet')) return 7.5;
  if (id.includes('opus')) return 5.0;
  return 7.0;
}
