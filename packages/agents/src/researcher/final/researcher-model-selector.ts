/**
 * Researcher Model Selector
 * 
 * Dynamically selects the best AI model for the researcher role
 * based on composite scoring of quality, cost, and speed.
 * 
 * Results from June 5, 2025 calibration:
 * - Primary: openai/gpt-4.1-nano (Score: 9.81, $0.30/1M tokens)
 * - Fallback: openai/gpt-4.1-mini (Score: 9.22, $1.00/1M tokens)
 */

import { ModelVersionInfo } from '@codequal/core';

export interface ResearcherModelScore {
  id: string;
  provider: string;
  model: string;
  inputCost: number;
  outputCost: number;
  avgCost: number;
  contextWindow: number;
  quality: number;
  speed: number;
  priceScore: number;
  compositeScore: number;
}

export interface ResearcherSelectionResult {
  primary: ModelVersionInfo;
  fallback: ModelVersionInfo;
  tokenUsage: {
    prompt: number;
    completion: number;
    total: number;
    cost: number;
  };
  scores: {
    primary: ResearcherModelScore;
    fallback: ResearcherModelScore;
  };
}

/**
 * Scoring weights for researcher role
 * Based on calibration results showing these weights produce optimal selections
 */
export const RESEARCHER_SCORING_WEIGHTS = {
  quality: 0.50,  // Research capability and accuracy
  price: 0.35,    // Cost efficiency for 3,000 daily queries
  speed: 0.15     // Response time
} as const;

/**
 * Infer research quality score based on model characteristics
 */
export function inferResearcherQuality(modelId: string, contextWindow: number): number {
  const id = modelId.toLowerCase();
  let score = 7.0; // default
  
  // Latest high-capability models
  if (id.includes('opus-4') || id.includes('claude-opus-4')) score = 9.8;
  else if (id.includes('sonnet-4') || id.includes('claude-sonnet-4')) score = 9.6;
  else if (id.includes('gpt-4.5')) score = 9.7;
  else if (id.includes('gpt-4.1') && !id.includes('nano')) score = 9.5;
  else if (id.includes('gpt-4.1-nano')) score = 9.3;
  else if (id.includes('claude-3.7')) score = 9.4;
  else if (id.includes('opus') || (id.includes('gpt-4') && !id.includes('mini'))) score = 9.2;
  else if (id.includes('sonnet')) score = 9.0;
  else if (id.includes('claude-3.5')) score = 8.9;
  else if (id.includes('gpt-4o') && !id.includes('mini')) score = 8.8;
  else if (id.includes('deepseek') && id.includes('r1')) score = 8.6;
  else if (id.includes('gemini') && id.includes('pro')) score = 8.5;
  
  // Mid-range models suitable for research
  else if (id.includes('gemini') && id.includes('flash')) score = 8.0;
  else if (id.includes('claude') && id.includes('haiku')) score = 7.8;
  else if (id.includes('gpt-4o-mini')) score = 7.9;
  else if (id.includes('mistral') && id.includes('large')) score = 7.6;
  
  // Reasoning variants get a boost
  if (id.includes('thinking') || id.includes('reason')) score += 0.3;
  
  // Large context windows important for research
  if (contextWindow >= 100000) score += 0.2;
  if (contextWindow >= 200000) score += 0.3;
  
  // Recent models get a small boost
  if (id.includes('2025') || id.includes('preview')) score += 0.1;
  
  // Newer versions get priority
  if (id.includes('4.1') || id.includes('3.7') || id.includes('4.5')) score += 0.2;
  
  return Math.min(score, 10);
}

/**
 * Infer speed score from model characteristics
 */
export function inferSpeed(modelId: string): number {
  const id = modelId.toLowerCase();
  
  if (id.includes('flash') || (id.includes('mini') && !id.includes('4.1'))) return 9.5;
  if (id.includes('haiku') || id.includes('small')) return 9.0;
  if (id.includes('nano')) return 9.0;
  if (id.includes('thinking')) return 6.0; // Slower due to reasoning
  if (id.includes('1b') || id.includes('3b')) return 10.0;
  if (id.includes('7b') || id.includes('8b')) return 8.5;
  if (id.includes('32b') || id.includes('34b')) return 7.0;
  if (id.includes('70b')) return 5.0;
  if (id.includes('opus') || id.includes('pro')) return 4.0;
  
  return 6.0; // default
}

/**
 * Calculate composite score for researcher role
 */
export function calculateResearcherScore(
  quality: number,
  priceScore: number,
  speed: number
): number {
  return (
    quality * RESEARCHER_SCORING_WEIGHTS.quality +
    priceScore * RESEARCHER_SCORING_WEIGHTS.price +
    speed * RESEARCHER_SCORING_WEIGHTS.speed
  );
}

/**
 * Score and rank models for researcher role
 */
export function scoreModelsForResearcher(models: any[]): ResearcherModelScore[] {
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
      
      const quality = inferResearcherQuality(m.id, m.context_length || 0);
      const speed = inferSpeed(m.id);
      const priceScore = 10 - (Math.min(avgCost, 20) / 2);
      const compositeScore = calculateResearcherScore(quality, priceScore, speed);
      
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

/**
 * Create simple selection prompt
 */
export function createSimpleSelectionPrompt(topModels: ResearcherModelScore[]): string {
  const top5 = topModels.slice(0, 5);
  
  return `Pick the best 2 models for AI research from this ranked list:

${top5.map((m, i) => 
  `${i + 1}. ${m.id} - Score: ${m.compositeScore.toFixed(2)} - $${m.inputCost.toFixed(2)}/$${m.outputCost.toFixed(2)}`
).join('\n')}

Output only 2 CSV rows for #1 and #2:
provider,model,input,output,RESEARCHER,context`;
}

/**
 * Parse CSV response from AI
 */
export function parseResearcherSelection(response: string): {
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
          versionId: 'latest', // We'll use latest version
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
 * Default researcher configuration based on calibration results
 */
export const DEFAULT_RESEARCHER_CONFIG: ResearcherSelectionResult = {
  primary: {
    provider: 'openai',
    model: 'gpt-4.1-nano',
    versionId: 'latest',
    pricing: {
      input: 0.10,
      output: 0.40
    },
    capabilities: {
      contextWindow: 128000
    }
  },
  fallback: {
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
  },
  tokenUsage: {
    prompt: 276,
    completion: 102,
    total: 378,
    cost: 0.0001026
  },
  scores: {
    primary: {
      id: 'openai/gpt-4.1-nano',
      provider: 'openai',
      model: 'gpt-4.1-nano',
      inputCost: 0.10,
      outputCost: 0.40,
      avgCost: 0.25,
      contextWindow: 128000,
      quality: 9.7,
      speed: 9.0,
      priceScore: 9.875,
      compositeScore: 9.81
    },
    fallback: {
      id: 'openai/gpt-4.1-mini',
      provider: 'openai',
      model: 'gpt-4.1-mini',
      inputCost: 0.40,
      outputCost: 1.60,
      avgCost: 1.00,
      contextWindow: 128000,
      quality: 9.7,
      speed: 9.5,
      priceScore: 9.5,
      compositeScore: 9.22
    }
  }
};
