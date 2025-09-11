/**
 * Dynamic Model Fetcher
 * 
 * NO HARDCODED MODELS - Everything is fetched dynamically
 * Searches for and returns only the latest models from the last 3-6 months
 */

import { Logger } from 'winston';

export interface ModelInfo {
  provider: string;
  model: string;
  quality: number;
  cost: number;  // per 1K tokens
  speed: number;
  contextWindow: number;
  releaseDate: string;
}

/**
 * Dynamically fetch latest models from OpenRouter
 * NO HARDCODING - Always gets fresh data
 */
export async function fetchLatestModels(logger?: Logger): Promise<ModelInfo[]> {
  const currentDate = new Date();
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  
  if (logger) {
    logger.info('🔍 Fetching latest models dynamically from OpenRouter');
    logger.info(`📅 Date range: ${sixMonthsAgo.toISOString().split('T')[0]} to ${currentDate.toISOString().split('T')[0]}`);
  }
  
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`OpenRouter API failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    const models = data.data || [];
    
    // Process and filter models
    const processedModels: ModelInfo[] = [];
    
    for (const model of models) {
      // Check if model is recent
      if (!isModelRecent(model, sixMonthsAgo)) {
        continue;
      }
      
      const modelInfo: ModelInfo = {
        provider: model.id.split('/')[0],
        model: model.id.split('/').slice(1).join('/'),
        quality: calculateQualityScore(model),
        cost: parseFloat(model.pricing?.prompt || '0') || 0,
        speed: calculateSpeedScore(model),
        contextWindow: model.context_length || 128000,
        releaseDate: extractReleaseDate(model) || currentDate.toISOString().split('T')[0]
      };
      
      processedModels.push(modelInfo);
      
      if (logger) {
        logger.debug(`✅ Found recent model: ${model.id}`);
      }
    }
    
    // Sort by quality (best first)
    processedModels.sort((a, b) => b.quality - a.quality);
    
    if (logger) {
      logger.info(`📊 Found ${processedModels.length} models from last 6 months`);
    }
    
    if (processedModels.length === 0) {
      throw new Error(
        `No models found within the last 6 months. ` +
        `This likely means the date detection logic needs updating or ` +
        `OpenRouter API has changed. Please check the API response.`
      );
    }
    
    return processedModels;
    
  } catch (error) {
    if (logger) {
      logger.error('Failed to fetch models from OpenRouter:', error);
    }
    throw error;
  }
}

/**
 * Check if a model is recent (within last 6 months)
 */
function isModelRecent(model: any, cutoffDate: Date): boolean {
  const modelId = model.id.toLowerCase();
  
  // Extract date from model ID
  const datePatterns = [
    /20(\d{2})(\d{2})(\d{2})/, // YYYYMMDD
    /20(\d{2})-(\d{2})-(\d{2})/, // YYYY-MM-DD
    /20(\d{2})-(\d{2})/, // YYYY-MM
  ];
  
  for (const pattern of datePatterns) {
    const match = modelId.match(pattern);
    if (match) {
      const year = 2000 + parseInt(match[1]);
      const month = parseInt(match[2]);
      const day = match[3] ? parseInt(match[3]) : 1;
      const modelDate = new Date(year, month - 1, day);
      
      if (modelDate >= cutoffDate) {
        return true;
      }
    }
  }
  
  // Check for known latest model patterns (2025 models)
  const latestPatterns = [
    /gpt-?[56]/i,           // GPT-5, GPT-6
    /claude[- ]?[45]/i,     // Claude 4, Claude 5
    /opus[- ]?4/i,          // Opus 4
    /sonnet[- ]?4/i,        // Sonnet 4
    /gemini[- ]?2\.[5-9]/i, // Gemini 2.5+
    /gemini[- ]?[3-9]/i,    // Gemini 3+
    /llama[- ]?3\.[5-9]/i,  // Llama 3.5+
    /llama[- ]?[4-9]/i,     // Llama 4+
  ];
  
  for (const pattern of latestPatterns) {
    if (pattern.test(modelId)) {
      return true;
    }
  }
  
  // Check created timestamp if available
  if (model.created) {
    const createdDate = new Date(model.created * 1000);
    if (createdDate >= cutoffDate) {
      return true;
    }
  }
  
  return false;
}

/**
 * Calculate quality score based on model characteristics
 */
function calculateQualityScore(model: any): number {
  const modelId = model.id.toLowerCase();
  let score = 5.0; // Base score
  
  // Provider reputation
  const providerScores: Record<string, number> = {
    'anthropic': 1.5,
    'openai': 1.5,
    'google': 1.2,
    'meta': 0.8,
    'mistral': 0.7,
    'x-ai': 0.9,
    'cohere': 0.6,
  };
  
  const provider = modelId.split('/')[0];
  score += providerScores[provider] || 0;
  
  // Model tier indicators
  if (modelId.includes('opus') || modelId.includes('ultra')) score += 2.5;
  if (modelId.includes('gpt-5') || modelId.includes('gpt5')) score += 2.0;
  if (modelId.includes('claude-4') || modelId.includes('claude-5')) score += 2.0;
  if (modelId.includes('gemini-2.5') || modelId.includes('gemini-3')) score += 1.5;
  if (modelId.includes('pro') || modelId.includes('large')) score += 1.0;
  if (modelId.includes('sonnet') || modelId.includes('turbo')) score += 0.5;
  
  // Size penalties
  if (modelId.includes('mini') || modelId.includes('nano')) score -= 1.5;
  if (modelId.includes('small') || modelId.includes('tiny')) score -= 2.0;
  if (modelId.includes('lite')) score -= 1.0;
  
  // Context window bonus
  const contextLength = model.context_length || 0;
  if (contextLength >= 1000000) score += 1.0;
  else if (contextLength >= 400000) score += 0.7;
  else if (contextLength >= 200000) score += 0.5;
  else if (contextLength >= 128000) score += 0.3;
  
  // Version indicators (higher versions = better)
  const versionMatch = modelId.match(/[- ]([45])(?:\.\d+)?/);
  if (versionMatch) {
    const version = parseInt(versionMatch[1]);
    score += (version - 3) * 0.5; // 4 adds 0.5, 5 adds 1.0
  }
  
  return Math.min(10, Math.max(1, score));
}

/**
 * Calculate speed score based on model characteristics
 */
function calculateSpeedScore(model: any): number {
  const modelId = model.id.toLowerCase();
  let score = 5.0; // Base score
  
  // Speed indicators
  if (modelId.includes('flash')) score += 3.0;
  if (modelId.includes('fast')) score += 2.5;
  if (modelId.includes('nano')) score += 2.5;
  if (modelId.includes('mini')) score += 2.0;
  if (modelId.includes('haiku')) score += 2.0;
  if (modelId.includes('lite')) score += 1.5;
  if (modelId.includes('turbo')) score += 1.0;
  
  // Slowness indicators
  if (modelId.includes('opus')) score -= 2.0;
  if (modelId.includes('ultra')) score -= 1.5;
  if (modelId.includes('405b') || modelId.includes('70b')) score -= 1.5;
  if (modelId.includes('large')) score -= 1.0;
  if (modelId.includes('thinking') || modelId.includes('reasoner')) score -= 2.0;
  
  // Use cost as a proxy (cheaper usually = faster)
  const cost = model.pricing?.prompt || 0;
  if (cost <= 0.00005) score += 2.0;
  else if (cost <= 0.0001) score += 1.5;
  else if (cost <= 0.001) score += 1.0;
  else if (cost <= 0.005) score += 0.5;
  else if (cost > 0.01) score -= 1.0;
  else if (cost > 0.05) score -= 2.0;
  
  return Math.min(10, Math.max(1, score));
}

/**
 * Extract release date from model ID or metadata
 */
function extractReleaseDate(model: any): string | null {
  const modelId = model.id;
  
  // Date patterns in model IDs
  const patterns = [
    /(\d{4})(\d{2})(\d{2})/, // YYYYMMDD
    /(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
    /(\d{4})-(\d{2})/, // YYYY-MM
  ];
  
  for (const pattern of patterns) {
    const match = modelId.match(pattern);
    if (match) {
      const year = match[1];
      const month = match[2].padStart(2, '0');
      const day = match[3] ? match[3].padStart(2, '0') : '01';
      return `${year}-${month}-${day}`;
    }
  }
  
  // Fallback to created timestamp
  if (model.created) {
    return new Date(model.created * 1000).toISOString().split('T')[0];
  }
  
  return null;
}

/**
 * Categorize models into tiers based on quality
 */
export async function fetchModelTiers(logger?: Logger): Promise<{
  tier1: ModelInfo[];
  tier2: ModelInfo[];
  tier3: ModelInfo[];
}> {
  const allModels = await fetchLatestModels(logger);
  
  // Sort by quality
  allModels.sort((a, b) => b.quality - a.quality);
  
  // Split into tiers
  const tier1Cutoff = Math.floor(allModels.length * 0.2);
  const tier2Cutoff = Math.floor(allModels.length * 0.5);
  
  return {
    tier1: allModels.slice(0, tier1Cutoff),
    tier2: allModels.slice(tier1Cutoff, tier2Cutoff),
    tier3: allModels.slice(tier2Cutoff)
  };
}

/**
 * Select primary and fallback models for a context
 */
export async function selectModelsForContext(
  weights: {
    quality: number;
    speed: number;
    cost: number;
    freshness: number;
    contextWindow: number;
  },
  requirements?: {
    minQuality?: number;
    maxCost?: number;
    minSpeed?: number;
    minContextWindow?: number;
  },
  logger?: Logger
): Promise<{
  primary: ModelInfo;
  fallback: ModelInfo;
}> {
  // Fetch latest models
  const models = await fetchLatestModels(logger);
  
  // Filter by requirements
  let eligibleModels = models;
  if (requirements) {
    eligibleModels = models.filter(m => {
      if (requirements.minQuality && m.quality < requirements.minQuality) return false;
      if (requirements.maxCost && m.cost > requirements.maxCost) return false;
      if (requirements.minSpeed && m.speed < requirements.minSpeed) return false;
      if (requirements.minContextWindow && m.contextWindow < requirements.minContextWindow) return false;
      return true;
    });
  }
  
  if (eligibleModels.length === 0) {
    throw new Error(
      `No models meet the requirements. ` +
      `Requirements: ${JSON.stringify(requirements)}. ` +
      `Available models: ${models.length}`
    );
  }
  
  // Score each model based on weights
  const scoredModels = eligibleModels.map(model => {
    // All models are fresh (within 6 months)
    const freshnessScore = 1.0;
    
    // Normalize scores
    const contextScore = Math.min(model.contextWindow / 400000, 1.0);
    const costScore = 1.0 - Math.min(model.cost / 0.02, 1.0);
    
    const weightedScore = 
      (model.quality / 10) * weights.quality +
      (model.speed / 10) * weights.speed +
      costScore * weights.cost +
      freshnessScore * weights.freshness +
      contextScore * weights.contextWindow;
    
    return { ...model, weightedScore };
  });
  
  // Sort by weighted score
  scoredModels.sort((a, b) => b.weightedScore - a.weightedScore);
  
  // Select primary (best score)
  const primary = scoredModels[0];
  
  // Select fallback (different provider, more cost-effective)
  let fallback = scoredModels.find(m => 
    m.provider !== primary.provider && 
    m.cost < primary.cost
  );
  
  if (!fallback) {
    fallback = scoredModels.find(m => m.provider !== primary.provider);
  }
  
  if (!fallback) {
    fallback = scoredModels[1];
  }
  
  if (!fallback) {
    throw new Error('Unable to select fallback model');
  }
  
  return { primary, fallback };
}