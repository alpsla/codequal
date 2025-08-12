/**
 * DeepWiki Model Initializer
 * 
 * Searches for optimal models for DeepWiki service and stores configuration
 * in Vector DB for consistent model selection across the system.
 */

import { ModelVersionInfo, ModelVersionSync } from '@codequal/core';
import { createLogger } from '@codequal/core/utils';
import { VectorStorageService } from '@codequal/database';
import { DeepWikiConfigStorage } from './deepwiki-config-storage';
import axios from 'axios';
import { 
  UnifiedModelSelector,
  createUnifiedModelSelector,
  ROLE_SCORING_PROFILES,
  ModelScore as DeepWikiModelScore
} from '../model-selection/unified-model-selector';

// Use DeepWiki scoring weights from unified selector
const DEEPWIKI_SCORING_WEIGHTS = ROLE_SCORING_PROFILES.deepwiki;

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
  // Use dedicated config storage to avoid RLS issues
  const configStorage = new DeepWikiConfigStorage();
  logger.info('Starting DeepWiki model initialization');
  
  try {
    // Check if we have a recent configuration
    const existingConfig = await configStorage.getGlobalConfig();
    if (existingConfig && isConfigFresh(existingConfig)) {
      logger.info('Using existing DeepWiki model configuration from storage');
      return existingConfig;
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
    
    // Store configuration
    await configStorage.storeGlobalConfig(config);
    
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
    const selectionModel = 'dynamic'; // Will be selected dynamically
    
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
    // Search for existing DeepWiki configuration
    const results = await vectorStorage.searchByMetadata({
      'metadata.type': 'deepwiki-model-config',
      'metadata.configType': 'model-selection'
    }, 1);
    
    if (results && results.length > 0) {
      const stored = results[0];
      const config = (stored as any).metadata as DeepWikiModelConfig;
      
      // Check if configuration is still fresh
      if (isConfigFresh(config)) {
        logger.info('Using existing DeepWiki model configuration from Vector DB');
        return config;
      }
    }
    
    return null;
  } catch (error) {
    logger.error('Failed to retrieve stored configuration', { error });
    return null;
  }
}

/**
 * Store configuration in Vector DB
 */
async function storeDeepWikiConfig(
  vectorStorage: VectorStorageService,
  config: DeepWikiModelConfig
): Promise<void> {
  try {
    // Create a chunk to store the configuration
    const configChunk: any = {
      id: `deepwiki-config-${Date.now()}`,
      content: JSON.stringify(config),
      metadata: {
        ...config,
        type: 'deepwiki-model-config',
        configType: 'model-selection',
        timestamp: config.timestamp
      }
    };
    
    // Store with a dummy embedding (configuration doesn't need semantic search)
    const dummyEmbedding = new Array(1536).fill(0);
    
    await vectorStorage.storeChunk(
      configChunk,
      dummyEmbedding,
      'deepwiki-system', // Special repository ID for system configs
      'configuration',
      'model-selection',
      'permanent' // Keep configuration permanently
    );
    
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
      model: 'dynamic', // Will be selected dynamically,
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
      model: 'dynamic', // Will be selected dynamically,
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
 * Infer quality score for DeepWiki analysis
 * (Copied from original DeepWikiModelSelector for compatibility)
 */
function inferDeepWikiQuality(modelId: string, contextWindow: number): number {
  const id = modelId.toLowerCase();
  let score = 7.0; // default
  
  // Latest high-capability models ideal for code analysis
  if (id.includes('opus-4') || id.includes('claude-opus-4')) score = 9.8;
  else if (id.includes('gpt-4.5')) score = 9.7;
  else if (id.includes('sonnet-4') || id.includes('claude-sonnet-4')) score = 9.5;
  else if (id.includes('gpt-4.1') && !id.includes('nano')) score = 9.3;
  else if (id.includes('claude-3.7-sonnet')) score = 9.2;
  else if (id.includes('opus') || id.includes('gpt-4-turbo')) score = 9.0;
  
  // Good mid-range models for standard analysis
  else if (id.includes('gpt-4.1-nano')) score = 8.5;
  else if (id.includes('claude-3.5-sonnet')) score = 8.7;
  else if (id.includes('gpt-4o') && !id.includes('mini')) score = 8.6;
  else if (id.includes('gemini') && id.includes('pro')) score = 8.4;
  else if (id.includes('deepseek') && id.includes('r1')) score = 8.3;
  
  // Efficient models for simple repos
  else if (id.includes('gpt-4o-mini')) score = 7.8;
  else if (id.includes('claude') && id.includes('haiku')) score = 7.5;
  else if (id.includes('gemini') && id.includes('flash')) score = 7.6;
  else if (id.includes('mistral') && id.includes('large')) score = 7.4;
  
  // Code-specific model boost
  if (id.includes('code') || id.includes('coder')) score += 0.4;
  
  // Large context windows crucial for repo analysis
  if (contextWindow >= 100000) score += 0.3;
  if (contextWindow >= 200000) score += 0.5;
  
  return Math.min(score, 10);
}

/**
 * Infer speed score from model characteristics
 */
function inferSpeed(modelId: string): number {
  const id = modelId.toLowerCase();
  
  // Fast models
  if (id.includes('haiku') || id.includes('flash')) return 9.5;
  if (id.includes('gpt-4o-mini')) return 9.0;
  if (id.includes('nano')) return 8.8;
  if (id.includes('mini')) return 8.5;
  
  // Medium speed
  if (id.includes('sonnet') || id.includes('gpt-4o')) return 7.5;
  if (id.includes('mistral')) return 7.0;
  
  // Slower but powerful
  if (id.includes('opus') || id.includes('gpt-4.5')) return 5.0;
  if (id.includes('gpt-4-turbo')) return 6.0;
  
  return 7.0; // default
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
      
      // Use unified scoring logic
      const quality = inferDeepWikiQuality(m.id, m.context_length || 0);
      const speed = inferSpeed(m.id);
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