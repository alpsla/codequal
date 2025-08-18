/**
 * Enhanced Web Search for Latest AI Models
 * 
 * Properly discovers latest models and matches them to actual OpenRouter IDs
 */

import { createLogger } from '@codequal/core/utils';
import axios from 'axios';

const logger = createLogger('EnhancedWebSearch');

export interface DiscoveredModel {
  provider: string;
  modelName: string;
  openRouterId: string;
  releaseInfo: string;
  speedScore: number; // 0-100, higher is faster
  qualityScore: number; // 0-100, higher is better
  costScore: number; // 0-100, higher is cheaper
}

/**
 * Enhanced search queries to find truly latest models
 */
export function generateLatestModelQueries(): string[] {
  const date = new Date();
  const year = date.getFullYear();
  const month = date.toLocaleString('en', { month: 'long' });
  
  return [
    // Specific searches for latest models
    `Claude Opus 4.1 latest AI model ${year} anthropic`,
    `Claude Sonnet 4 latest features ${year}`,
    `OpenAI o3 model release ${year} latest`,
    `GPT-5 OpenAI latest model ${year}`,
    `Google Gemini 2.5 Flash latest ${year}`,
    `Meta Llama 4 Scout Maverick ${year}`,
    
    // General searches for recent releases
    `latest AI models released ${month} ${year}`,
    `newest LLM models ${year} benchmark results`,
    `AI model releases last 30 days ${year}`,
    
    // Speed-focused searches for AI-Parser
    `fastest AI models ${year} low latency`,
    `quick response AI models flash lite mini ${year}`,
    
    // Provider-specific searches
    `Anthropic latest models ${year} Claude 4 family`,
    `OpenAI newest models ${year} o3 GPT-5`,
    `Google AI models ${year} Gemini 2.5`,
    `Meta AI models ${year} Llama 4 Scout`
  ];
}

/**
 * Match discovered models to actual OpenRouter IDs
 */
export async function matchToOpenRouterModels(
  discoveredNames: string[],
  openRouterModels: any[]
): Promise<DiscoveredModel[]> {
  const matched: DiscoveredModel[] = [];
  
  // Create mapping of common names to actual OpenRouter IDs
  const knownMappings: Record<string, string> = {
    // Anthropic models
    'claude opus 4.1': 'anthropic/claude-opus-4.1',
    'claude opus 4': 'anthropic/claude-opus-4',
    'claude sonnet 4': 'anthropic/claude-sonnet-4',
    'claude 3.7 sonnet': 'anthropic/claude-3.7-sonnet',
    'claude 3.5 sonnet': 'anthropic/claude-3.5-sonnet',
    'claude 3.5 haiku': 'anthropic/claude-3.5-haiku',
    
    // OpenAI models
    'gpt-5': 'openai/gpt-5',
    'gpt-5 mini': 'openai/gpt-5-mini',
    'gpt-4o': 'openai/gpt-4o',
    'o3': 'openai/o3',
    'o3 pro': 'openai/o3-pro',
    'o3 mini': 'openai/o3-mini',
    'o4 mini': 'openai/o4-mini',
    
    // Google models
    'gemini 2.5 flash': 'google/gemini-2.5-flash',
    'gemini 2.5 flash lite': 'google/gemini-2.5-flash-lite',
    'gemini 2.5 pro': 'google/gemini-2.5-pro',
    'gemini flash 1.5': 'google/gemini-flash-1.5',
    
    // Meta models
    'llama 4 scout': 'meta-llama/llama-4-scout',
    'llama 4 maverick': 'meta-llama/llama-4-maverick',
    'llama 3.3 70b': 'meta-llama/llama-3.3-70b-instruct'
  };
  
  for (const name of discoveredNames) {
    const normalized = name.toLowerCase().trim();
    
    // Check known mappings first
    let openRouterId: string | null = null;
    for (const [key, value] of Object.entries(knownMappings)) {
      if (normalized.includes(key) || key.includes(normalized)) {
        // Verify it exists in OpenRouter
        const exists = openRouterModels.some(m => m.id === value);
        if (exists) {
          openRouterId = value;
          break;
        }
      }
    }
    
    // If not found in mappings, try fuzzy matching
    if (!openRouterId) {
      const found = openRouterModels.find(m => {
        const modelId = m.id.toLowerCase();
        return modelId.includes(normalized.replace(/\s+/g, '-')) ||
               normalized.includes(modelId.split('/')[1]);
      });
      
      if (found) {
        openRouterId = found.id;
      }
    }
    
    if (openRouterId) {
      const [provider, ...modelParts] = openRouterId.split('/');
      const modelName = modelParts.join('/');
      
      // Calculate scores based on model characteristics
      const speedScore = calculateSpeedScore(openRouterId);
      const qualityScore = calculateQualityScore(openRouterId);
      const costScore = calculateCostScore(openRouterId);
      
      matched.push({
        provider,
        modelName,
        openRouterId,
        releaseInfo: `Discovered via web search: ${name}`,
        speedScore,
        qualityScore,
        costScore
      });
      
      logger.info(`✅ Matched: ${name} -> ${openRouterId}`);
    } else {
      logger.warn(`❌ Could not match: ${name}`);
    }
  }
  
  return matched;
}

/**
 * Calculate speed score based on model characteristics
 */
function calculateSpeedScore(modelId: string): number {
  const id = modelId.toLowerCase();
  
  // Ultra-fast models
  if (id.includes('flash-lite') || id.includes('haiku')) return 95;
  if (id.includes('gpt-5-mini') || id.includes('o3-mini') || id.includes('o4-mini')) return 93;
  if (id.includes('flash') || id.includes('turbo')) return 90;
  if (id.includes('3.5') || id.includes('mini')) return 88;
  
  // Medium speed
  if (id.includes('sonnet') || id.includes('gpt-4')) return 70;
  if (id.includes('gemini-2.5-pro')) return 65;
  
  // Slower models
  if (id.includes('opus') || id.includes('o3-pro')) return 30;
  if (id.includes('o1') || id.includes('pro')) return 40;
  
  return 50; // Default
}

/**
 * Calculate quality score based on model characteristics
 */
function calculateQualityScore(modelId: string): number {
  const id = modelId.toLowerCase();
  
  // Highest quality
  if (id.includes('opus-4.1')) return 98;
  if (id.includes('opus-4')) return 95;
  if (id.includes('o3-pro')) return 94;
  if (id.includes('gpt-5') && !id.includes('mini')) return 93;
  
  // High quality
  if (id.includes('sonnet-4')) return 90;
  if (id.includes('o3') && !id.includes('mini')) return 88;
  if (id.includes('gpt-4o')) return 85;
  if (id.includes('gemini-2.5-pro')) return 83;
  
  // Good quality
  if (id.includes('sonnet')) return 80;
  if (id.includes('llama-4')) return 78;
  if (id.includes('gemini-2.5-flash')) return 75;
  
  // Basic quality
  if (id.includes('haiku') || id.includes('mini')) return 65;
  if (id.includes('3.5')) return 60;
  
  return 70; // Default
}

/**
 * Calculate cost score (inverse - higher score = cheaper)
 */
function calculateCostScore(modelId: string): number {
  const id = modelId.toLowerCase();
  
  // Very cheap
  if (id.includes('haiku')) return 95;
  if (id.includes('flash-lite')) return 93;
  if (id.includes('3.5')) return 90;
  if (id.includes('mini')) return 88;
  
  // Moderate cost
  if (id.includes('flash')) return 80;
  if (id.includes('sonnet') && !id.includes('4')) return 75;
  if (id.includes('turbo')) return 70;
  
  // Expensive
  if (id.includes('gpt-5') && !id.includes('mini')) return 40;
  if (id.includes('sonnet-4')) return 35;
  if (id.includes('o3') && !id.includes('mini')) return 30;
  
  // Very expensive
  if (id.includes('opus')) return 20;
  if (id.includes('o3-pro') || id.includes('o1-pro')) return 10;
  
  return 50; // Default
}

/**
 * Filter models suitable for AI-Parser (speed priority)
 */
export function filterForAIParser(models: DiscoveredModel[]): DiscoveredModel[] {
  // AI-Parser needs FAST models
  return models
    .filter(m => m.speedScore >= 85) // Only fast models
    .filter(m => !m.openRouterId.includes('opus')) // No slow Opus models
    .filter(m => !m.openRouterId.includes('o1-pro')) // No expensive pro models
    .sort((a, b) => {
      // Sort by weighted score: 50% speed, 30% quality, 20% cost
      const scoreA = (a.speedScore * 0.5) + (a.qualityScore * 0.3) + (a.costScore * 0.2);
      const scoreB = (b.speedScore * 0.5) + (b.qualityScore * 0.3) + (b.costScore * 0.2);
      return scoreB - scoreA;
    });
}

/**
 * Get best models for a specific role
 */
export function selectBestForRole(
  models: DiscoveredModel[],
  role: string
): { primary: DiscoveredModel; fallback: DiscoveredModel } | null {
  let filtered: DiscoveredModel[];
  
  switch (role) {
    case 'ai-parser':
      // Speed is critical
      filtered = filterForAIParser(models);
      break;
      
    case 'deepwiki':
      // Quality is critical
      filtered = models
        .filter(m => m.qualityScore >= 80)
        .sort((a, b) => {
          const scoreA = (a.qualityScore * 0.5) + (a.speedScore * 0.3) + (a.costScore * 0.2);
          const scoreB = (b.qualityScore * 0.5) + (b.speedScore * 0.3) + (b.costScore * 0.2);
          return scoreB - scoreA;
        });
      break;
      
    case 'researcher':
      // Cost-optimized for high volume
      filtered = models
        .filter(m => m.costScore >= 70)
        .sort((a, b) => {
          const scoreA = (a.costScore * 0.4) + (a.qualityScore * 0.35) + (a.speedScore * 0.25);
          const scoreB = (b.costScore * 0.4) + (b.qualityScore * 0.35) + (b.speedScore * 0.25);
          return scoreB - scoreA;
        });
      break;
      
    default:
      // Balanced approach
      filtered = models.sort((a, b) => {
        const scoreA = (a.qualityScore * 0.4) + (a.speedScore * 0.35) + (a.costScore * 0.25);
        const scoreB = (b.qualityScore * 0.4) + (b.speedScore * 0.35) + (b.costScore * 0.25);
        return scoreB - scoreA;
      });
  }
  
  if (filtered.length >= 2) {
    return {
      primary: filtered[0],
      fallback: filtered[1]
    };
  }
  
  return null;
}