/**
 * Fixed Characteristic-Based Selection
 * 
 * Avoids openrouter/auto and properly identifies outdated models
 */

import { createLogger } from '@codequal/core/utils';

const logger = createLogger('FixedSelection');

interface ModelCharacteristics {
  id: string;
  pricing: {
    prompt: string;
    completion: string;
  };
  context_length: number;
  created?: string;
  architecture?: any;
  top_provider?: any;
}

/**
 * Check if model should be excluded
 */
function shouldExcludeModel(model: ModelCharacteristics): boolean {
  const id = model.id.toLowerCase();
  
  // Exclude openrouter/auto - not a real model selection
  if (id === 'openrouter/auto') return true;
  
  // Exclude clearly outdated models
  const outdatedPatterns = [
    'gpt-4-0314',   // Old GPT-4 version
    'gpt-4-0613',   // Old GPT-4 version
    'gpt-3.5',      // GPT 3.5 is old
    'claude-2',     // Claude 2 is very old
    'claude-3-',    // Claude 3 is old (except 3.7)
    'claude-3.5',   // Claude 3.5 is old
    'gemini-1',     // Gemini 1.x is old
    'llama-2',      // Llama 2 is old
    'gpt-4'         // Base GPT-4 is old (we have GPT-5)
  ];
  
  // Special case: gpt-4 without turbo/o is likely outdated
  if (id === 'openai/gpt-4' || id === 'gpt-4') return true;
  
  // Special case: o1 without preview/mini is likely outdated (we have o3, o4)
  if (id === 'openai/o1' && !id.includes('preview') && !id.includes('mini')) return true;
  
  // Check all outdated patterns
  for (const pattern of outdatedPatterns) {
    if (id.includes(pattern)) {
      // Exception: Claude 3.7 is newer
      if (pattern.startsWith('claude-3') && id.includes('3.7')) continue;
      return true;
    }
  }
  
  return false;
}

/**
 * Identify truly latest generation models
 */
function isLatestGeneration(model: ModelCharacteristics): boolean {
  const id = model.id.toLowerCase();
  
  // Skip if it's an excluded model
  if (shouldExcludeModel(model)) return false;
  
  // Latest patterns (without naming specific models)
  const latestIndicators = [
    /\d{4}/.test(id) && parseInt(id.match(/\d{4}/)?.[0] || '0') >= 2024, // Year 2024+
    /v?[5-9]\.?\d*/.test(id), // Version 5+
    id.includes('preview'),
    id.includes('exp'),
    id.includes('beta'),
    id.includes('latest'),
    /o[3-9]/.test(id), // o3, o4, etc.
    /gpt-[5-9]/.test(id), // GPT-5+
    id.includes('4.1') || id.includes('4.5'), // Version 4.1+
    id.includes('2.5'), // Gemini 2.5
  ];
  
  return latestIndicators.some(indicator => indicator === true);
}

/**
 * Calculate speed score avoiding outdated models
 */
function calculateSpeedScore(model: ModelCharacteristics): number {
  if (shouldExcludeModel(model)) return 0; // Excluded models get 0 score
  
  let score = 50;
  const id = model.id.toLowerCase();
  
  // Price indicator
  const promptPrice = parseFloat(model.pricing?.prompt || '0');
  const totalPrice = promptPrice + parseFloat(model.pricing?.completion || '0');
  
  if (totalPrice === 0) score = 70;
  else if (totalPrice < 0.000001) score = 95;
  else if (totalPrice < 0.000005) score = 90;
  else if (totalPrice < 0.00001) score = 85;
  else if (totalPrice < 0.00005) score = 75;
  else if (totalPrice < 0.0001) score = 65;
  else if (totalPrice < 0.001) score = 55;
  else if (totalPrice < 0.01) score = 40;
  else score = 20;
  
  // Context bonus/penalty
  if (model.context_length <= 4096) score += 10;
  else if (model.context_length <= 8192) score += 5;
  else if (model.context_length >= 100000) score -= 10;
  
  // Speed indicators
  if (id.includes('mini') || id.includes('nano') || id.includes('tiny')) score += 15;
  if (id.includes('lite') || id.includes('small')) score += 10;
  if (id.includes('flash') || id.includes('turbo') || id.includes('fast')) score += 10;
  
  // Latest generation bonus
  if (isLatestGeneration(model)) score += 10;
  
  return Math.min(100, Math.max(0, score));
}

/**
 * Calculate quality score avoiding outdated models
 */
function calculateQualityScore(model: ModelCharacteristics): number {
  if (shouldExcludeModel(model)) return 0;
  
  let score = 50;
  
  const totalPrice = parseFloat(model.pricing?.prompt || '0') + 
                     parseFloat(model.pricing?.completion || '0');
  
  if (totalPrice > 0.0001) score = 85;
  else if (totalPrice > 0.00005) score = 75;
  else if (totalPrice > 0.00001) score = 65;
  else if (totalPrice > 0.000005) score = 55;
  else score = 45;
  
  if (model.context_length >= 128000) score += 10;
  else if (model.context_length >= 32768) score += 5;
  
  if (isLatestGeneration(model)) score += 15;
  
  return Math.min(100, Math.max(0, score));
}

/**
 * Select best models excluding outdated ones
 */
export function selectBestModels(
  models: ModelCharacteristics[],
  role: string,
  context?: { language?: string; size?: string }
): { primary: ModelCharacteristics; fallback: ModelCharacteristics } | null {
  
  // Filter out excluded models first
  const validModels = models.filter(m => !shouldExcludeModel(m));
  
  logger.info(`Filtered to ${validModels.length} valid models (excluded outdated/auto)`);
  
  // Prefer latest generation
  const latestModels = validModels.filter(isLatestGeneration);
  const modelsToUse = latestModels.length >= 10 ? latestModels : validModels;
  
  logger.info(`Using ${modelsToUse.length} models (${latestModels.length} latest gen)`);
  
  // Apply context filters
  let filteredModels = modelsToUse;
  if (context?.size === 'large') {
    filteredModels = modelsToUse.filter(m => m.context_length >= 32768);
  } else if (context?.size === 'small') {
    filteredModels = modelsToUse.filter(m => m.context_length <= 16384);
  } else if (context?.size === 'medium') {
    filteredModels = modelsToUse.filter(m => 
      m.context_length > 8192 && m.context_length < 100000
    );
  }
  
  if (filteredModels.length < 2) {
    logger.warn(`Not enough models after filtering for ${role}`);
    filteredModels = modelsToUse; // Fall back to all valid models
  }
  
  // Score based on role
  let weights = { speed: 0.33, quality: 0.34, cost: 0.33 };
  
  switch (role) {
    case 'ai-parser':
      weights = { speed: 0.60, quality: 0.25, cost: 0.15 };
      break;
    case 'deepwiki':
      weights = { speed: 0.15, quality: 0.60, cost: 0.25 };
      break;
    case 'researcher':
      weights = { speed: 0.25, quality: 0.35, cost: 0.40 };
      break;
    case 'educator':
      weights = { speed: 0.20, quality: 0.55, cost: 0.25 };
      break;
    case 'comparison':
      weights = { speed: 0.30, quality: 0.45, cost: 0.25 };
      break;
    case 'location-finder':
      weights = { speed: 0.40, quality: 0.45, cost: 0.15 };
      break;
    case 'orchestrator':
      weights = { speed: 0.35, quality: 0.40, cost: 0.25 };
      break;
  }
  
  // Score all models
  const scored = filteredModels.map(model => {
    const speedScore = calculateSpeedScore(model);
    const qualityScore = calculateQualityScore(model);
    const costScore = 100 - (parseFloat(model.pricing?.prompt || '0') * 1000000);
    
    const totalScore = 
      (speedScore * weights.speed) +
      (qualityScore * weights.quality) +
      (Math.max(0, costScore) * weights.cost);
    
    return {
      model,
      speedScore,
      qualityScore,
      costScore: Math.max(0, costScore),
      totalScore,
      isLatest: isLatestGeneration(model)
    };
  });
  
  // Sort by score, preferring latest generation
  scored.sort((a, b) => {
    // Strong preference for latest generation
    if (a.isLatest && !b.isLatest) return -1;
    if (!a.isLatest && b.isLatest) return 1;
    
    // Then by total score
    return b.totalScore - a.totalScore;
  });
  
  // Special handling for AI-Parser - must be fast
  if (role === 'ai-parser') {
    const fastModels = scored.filter(s => s.speedScore >= 75);
    if (fastModels.length >= 2) {
      logger.info(`AI-Parser: Selected from ${fastModels.length} fast models`);
      return {
        primary: fastModels[0].model,
        fallback: fastModels[1].model
      };
    }
  }
  
  // Return top 2 models
  if (scored.length >= 2) {
    const primary = scored[0];
    const fallback = scored[1];
    
    logger.info(`Selected primary: ${primary.model.id} (score: ${primary.totalScore.toFixed(1)}, latest: ${primary.isLatest})`);
    logger.info(`Selected fallback: ${fallback.model.id} (score: ${fallback.totalScore.toFixed(1)})`);
    
    return {
      primary: primary.model,
      fallback: fallback.model
    };
  }
  
  logger.error(`Could not select models for ${role} - only ${scored.length} models available`);
  return null;
}