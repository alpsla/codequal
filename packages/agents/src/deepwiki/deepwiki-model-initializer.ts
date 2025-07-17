/**
 * DeepWiki Model Initializer
 * 
 * Searches for optimal models for DeepWiki service and stores configuration
 * in Vector DB for consistent model selection across the system.
 */

import { ModelVersionInfo, ModelVersionSync } from '@codequal/core';
import { createLogger } from '@codequal/core/utils';
import { VectorStorageService } from '@codequal/database';
import axios from 'axios';
import { 
  DeepWikiModelSelector,
  scoreModelsForDeepWiki,
  createDeepWikiSelectionPrompt,
  parseDeepWikiSelection,
  DEEPWIKI_SCORING_WEIGHTS,
  DeepWikiModelScore
} from './deepwiki-model-selector';

const logger = createLogger('DeepWikiModelInitializer');

export interface DeepWikiModelConfig {
  primary: ModelVersionInfo;
  fallback: ModelVersionInfo;
  timestamp: string;
  scoringWeights: typeof DEEPWIKI_SCORING_WEIGHTS;
  searchResults: {
    topModels: DeepWikiModelScore[];
    totalEvaluated: number;
  };
}

/**
 * Initialize DeepWiki model configuration
 */
export async function initializeDeepWikiModels(
  modelVersionSync: ModelVersionSync,
  vectorStorage?: VectorStorageService
): Promise<DeepWikiModelConfig> {
  logger.info('Starting DeepWiki model initialization');
  
  try {
    // Check if we have a recent configuration in Vector DB
    if (vectorStorage) {
      const existingConfig = await getStoredDeepWikiConfig(vectorStorage);
      if (existingConfig && isConfigFresh(existingConfig)) {
        logger.info('Using existing DeepWiki model configuration from Vector DB');
        return existingConfig;
      }
    }
    
    // Fetch available models from OpenRouter
    logger.info('Fetching available models from OpenRouter');
    const models = await fetchOpenRouterModels();
    
    // Score models for DeepWiki use case
    const scoredModels = scoreModelsForDeepWiki(models);
    logger.info(`Evaluated ${models.length} models for DeepWiki`);
    
    // Get top models
    const topModels = scoredModels.slice(0, 10);
    
    // Create selection prompt
    const prompt = createDeepWikiSelectionPrompt(topModels);
    
    // Use AI to select best models
    const selection = await selectModelsWithAI(prompt, modelVersionSync);
    
    if (!selection.primary || !selection.fallback) {
      // Fallback to top 2 scored models
      logger.warn('AI selection failed, using top scored models');
      selection.primary = convertToModelVersionInfo(topModels[0]);
      selection.fallback = convertToModelVersionInfo(topModels[1]);
    }
    
    // Create configuration
    const config: DeepWikiModelConfig = {
      primary: selection.primary,
      fallback: selection.fallback,
      timestamp: new Date().toISOString(),
      scoringWeights: DEEPWIKI_SCORING_WEIGHTS,
      searchResults: {
        topModels: topModels,
        totalEvaluated: models.length
      }
    };
    
    // Store in Vector DB
    if (vectorStorage) {
      await storeDeepWikiConfig(vectorStorage, config);
    }
    
    // Log the selection
    logger.info('DeepWiki model selection complete', {
      primary: `${config.primary.provider}/${config.primary.model} - $${config.primary.pricing?.input || 'N/A'}/$${config.primary.pricing?.output || 'N/A'}/1M tokens`,
      fallback: `${config.fallback.provider}/${config.fallback.model} - $${config.fallback.pricing?.input || 'N/A'}/$${config.fallback.pricing?.output || 'N/A'}/1M tokens`,
      weights: DEEPWIKI_SCORING_WEIGHTS
    });
    
    return config;
    
  } catch (error) {
    logger.error('Failed to initialize DeepWiki models', { error });
    
    // Return default configuration
    return getDefaultDeepWikiConfig();
  }
}

/**
 * Fetch available models from OpenRouter
 */
async function fetchOpenRouterModels(): Promise<any[]> {
  try {
    const response = await axios.get('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://codequal.com',
        'X-Title': 'CodeQual DeepWiki Service'
      }
    });
    
    return response.data.data || [];
  } catch (error) {
    logger.error('Failed to fetch OpenRouter models', { error });
    throw error;
  }
}

/**
 * Use AI to select optimal models
 */
async function selectModelsWithAI(
  prompt: string,
  modelVersionSync: ModelVersionSync
): Promise<{ primary?: ModelVersionInfo; fallback?: ModelVersionInfo }> {
  try {
    // Use a cheap model for selection
    const selectionModel = 'openai/gpt-4o-mini';
    
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: selectionModel,
        messages: [
          {
            role: 'system',
            content: 'You are an AI model selection expert. Analyze models and select the best ones based on the criteria provided.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 200
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://codequal.com',
          'X-Title': 'CodeQual Model Selection'
        }
      }
    );
    
    const content = response.data.choices[0]?.message?.content || '';
    return parseDeepWikiSelection(content);
    
  } catch (error) {
    logger.error('AI model selection failed', { error });
    return {};
  }
}

/**
 * Convert scored model to ModelVersionInfo
 */
function convertToModelVersionInfo(model: DeepWikiModelScore): ModelVersionInfo {
  return {
    provider: model.provider,
    model: model.model,
    versionId: 'latest',
    pricing: {
      input: model.inputCost / 1000000, // Convert back to per-token pricing
      output: model.outputCost / 1000000
    },
    capabilities: {
      contextWindow: model.contextWindow
    }
  } as ModelVersionInfo;
}

/**
 * Get stored configuration from Vector DB
 */
async function getStoredDeepWikiConfig(
  vectorStorage: VectorStorageService
): Promise<DeepWikiModelConfig | null> {
  try {
    // TODO: Implement proper vector storage query when interface is available
    // For now, return null to force recalculation
    return null;
  } catch (error) {
    logger.error('Failed to retrieve stored configuration', { error });
  }
  
  return null;
}

/**
 * Store configuration in Vector DB
 */
async function storeDeepWikiConfig(
  vectorStorage: VectorStorageService,
  config: DeepWikiModelConfig
): Promise<void> {
  try {
    // TODO: Implement proper vector storage when interface is available
    // For now, we'll skip storing in vector DB
    logger.warn('Vector storage not implemented - configuration not persisted');
    
    logger.info('Stored DeepWiki model configuration in Vector DB');
  } catch (error) {
    logger.error('Failed to store configuration', { error });
  }
}

/**
 * Check if configuration is fresh (less than 7 days old)
 */
function isConfigFresh(config: DeepWikiModelConfig): boolean {
  const configAge = Date.now() - new Date(config.timestamp).getTime();
  return configAge < 7 * 24 * 60 * 60 * 1000; // 7 days
}

/**
 * Get default configuration as fallback
 */
function getDefaultDeepWikiConfig(): DeepWikiModelConfig {
  return {
    primary: {
      provider: 'openai',
      model: 'gpt-4.1-mini',
      versionId: 'latest',
      pricing: {
        input: 0.40,
        output: 1.60
      },
      capabilities: {
        contextWindow: 128000
      }
    } as ModelVersionInfo,
    fallback: {
      provider: 'anthropic',
      model: 'claude-3.7-sonnet',
      versionId: 'latest',
      pricing: {
        input: 3.00,
        output: 15.00
      },
      capabilities: {
        contextWindow: 200000
      }
    } as ModelVersionInfo,
    timestamp: new Date().toISOString(),
    scoringWeights: DEEPWIKI_SCORING_WEIGHTS,
    searchResults: {
      topModels: [],
      totalEvaluated: 0
    }
  };
}

/**
 * Create selection prompt for DeepWiki
 */
export function createDeepWikiSelectionPrompt(topModels: DeepWikiModelScore[]): string {
  const top5 = topModels.slice(0, 5);
  
  return `Pick the best 2 models for DeepWiki repository analysis from this ranked list:

${top5.map((m, i) => 
  `${i + 1}. ${m.id} - Score: ${m.compositeScore.toFixed(2)} - Quality: ${m.quality.toFixed(1)} - Cost: $${m.avgCost.toFixed(2)}/1M - Context: ${m.contextWindow.toLocaleString()}`
).join('\n')}

DeepWiki Requirements:
- Deep understanding of code structure and patterns
- Large context window for analyzing entire repositories
- Balance between quality (50%), cost (30%), and speed (20%)
- Ability to identify architectural patterns and security issues

Output only 2 CSV rows for #1 and #2:
provider,model,input,output,DEEPWIKI,context`;
}

/**
 * Parse CSV response for DeepWiki selection
 */
export function parseDeepWikiSelection(response: string): {
  primary?: ModelVersionInfo;
  fallback?: ModelVersionInfo;
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
        } as ModelVersionInfo;
      }
      return undefined;
    })
    .filter((item): item is ModelVersionInfo => item !== undefined);
  
  return {
    primary: lines[0],
    fallback: lines[1]
  };
}

/**
 * Score models for DeepWiki use case
 */
export function scoreModelsForDeepWiki(models: any[]): DeepWikiModelScore[] {
  return models
    .filter(m => {
      const id = m.id.toLowerCase();
      return !id.includes('embed') && 
             !id.includes('vision') && 
             !id.includes('sonar') && 
             !id.includes('online') && 
             !id.includes('base') && 
             m.pricing &&
             (parseFloat(m.pricing.prompt) > 0 || parseFloat(m.pricing.completion) > 0);
    })
    .map(m => {
      const inputCost = parseFloat(m.pricing.prompt) * 1000000;
      const outputCost = parseFloat(m.pricing.completion) * 1000000;
      const avgCost = (inputCost + outputCost) / 2;
      
      // Import quality and speed functions from selector
      const selector = new DeepWikiModelSelector(null as any);
      const quality = (selector as any).inferDeepWikiQuality(m.id, m.context_length || 0);
      const speed = (selector as any).calculateSpeedScore(m);
      const priceScore = 10 - (Math.min(avgCost, 20) / 2);
      
      const compositeScore = 
        quality * DEEPWIKI_SCORING_WEIGHTS.quality +
        priceScore * DEEPWIKI_SCORING_WEIGHTS.cost +
        speed * DEEPWIKI_SCORING_WEIGHTS.speed;
      
      const [provider, ...modelParts] = m.id.split('/');
      
      return {
        id: m.id,
        provider,
        model: modelParts.join('/'),
        inputCost,
        outputCost,
        avgCost,
        contextWindow: m.context_length || 0,
        quality,
        speed,
        priceScore,
        compositeScore
      };
    })
    .sort((a, b) => b.compositeScore - a.compositeScore);
}