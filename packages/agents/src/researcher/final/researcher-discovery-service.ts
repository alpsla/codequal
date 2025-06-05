/**
 * Dynamic Researcher Model Discovery Service
 * 
 * Fetches current models from OpenRouter and selects the best
 * researcher model based on composite scoring.
 */

import { Logger } from 'winston';
import { 
  ResearcherSelectionResult,
  scoreModelsForResearcher,
  createSimpleSelectionPrompt,
  parseResearcherSelection,
  DEFAULT_RESEARCHER_CONFIG
} from './researcher-model-selector';

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
        return DEFAULT_RESEARCHER_CONFIG;
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
        }
      };

    } catch (error) {
      this.logger.error('Failed to select researcher model', { error });
      return DEFAULT_RESEARCHER_CONFIG;
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
      return DEFAULT_RESEARCHER_CONFIG;
    }

    // Select best researcher
    const result = await this.selectResearcherModel(models);
    
    this.logger.info('Researcher selection complete', {
      primary: result.primary.provider + '/' + result.primary.model,
      fallback: result.fallback.provider + '/' + result.fallback.model,
      primaryScore: result.scores.primary.compositeScore.toFixed(2),
      fallbackScore: result.scores.fallback.compositeScore.toFixed(2),
      tokenCost: `$${result.tokenUsage.cost.toFixed(6)}`
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
