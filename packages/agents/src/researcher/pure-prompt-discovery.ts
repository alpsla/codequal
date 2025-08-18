/**
 * Pure Prompt-Based Model Discovery
 * 
 * NO hardcoded model names - discovery through prompts only
 */

import { createLogger } from '@codequal/core/utils';

const logger = createLogger('PurePromptDiscovery');

/**
 * Generate discovery prompts WITHOUT any model names
 * Only describe requirements and characteristics
 */
export function generatePureDiscoveryPrompts(role: string): string[] {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().toLocaleString('en', { month: 'long' });
  
  // Base prompts for discovering latest models (no specific names!)
  const basePrompts = [
    `latest artificial intelligence language models released ${currentMonth} ${currentYear}`,
    `newest LLM releases last 30 days ${currentYear} benchmarks`,
    `most recent AI model announcements ${currentYear}`,
    `cutting-edge language models ${currentYear} state of the art`,
    `brand new AI models just released this month`
  ];
  
  // Role-specific prompts based on requirements ONLY
  switch (role) {
    case 'ai-parser':
      return [
        ...basePrompts,
        `fastest AI models ${currentYear} ultra low latency under 2 seconds`,
        `quickest response language models instant processing ${currentYear}`,
        `lightweight AI models optimized for speed millisecond response`,
        `high throughput AI models thousands requests per second`,
        `most efficient language models minimal compute requirements ${currentYear}`
      ];
      
    case 'deepwiki':
      return [
        ...basePrompts,
        `highest quality AI models ${currentYear} best accuracy benchmarks`,
        `most capable language models deep understanding reasoning`,
        `top performing AI models code analysis ${currentYear}`,
        `advanced reasoning models complex problem solving`,
        `state of the art language models maximum capabilities`
      ];
      
    case 'researcher':
      return [
        ...basePrompts,
        `most cost effective AI models ${currentYear} low price per token`,
        `economical language models high volume usage`,
        `budget friendly AI models good performance low cost`,
        `efficient models thousands of queries daily`,
        `best value language models price performance ratio ${currentYear}`
      ];
      
    case 'educator':
      return [
        ...basePrompts,
        `best explaining AI models clear communication ${currentYear}`,
        `educational language models teaching capabilities`,
        `patient AI models detailed explanations`,
        `models excellent at breaking down complex concepts`,
        `language models specialized in knowledge transfer`
      ];
      
    case 'orchestrator':
      return [
        ...basePrompts,
        `balanced AI models good speed and quality ${currentYear}`,
        `versatile language models multiple capabilities`,
        `reliable AI models consistent performance`,
        `well-rounded models coordination tasks`,
        `dependable language models task management ${currentYear}`
      ];
      
    default:
      return basePrompts;
  }
}

/**
 * Extract model information from search results WITHOUT looking for specific names
 * Instead, extract ANY model that appears to be mentioned
 */
export function extractModelsFromSearchResults(searchText: string): string[] {
  const models: Set<string> = new Set();
  
  // Generic patterns to find model mentions (no specific names!)
  const patterns = [
    // Provider/Model format
    /([a-z]+)\/([a-z0-9\-\.]+(?:opus|sonnet|haiku|turbo|flash|mini|pro|small|large|xl)?[a-z0-9\-\.]*)/gi,
    
    // Version patterns (X.Y format)
    /(?:version|v|model)\s*(\d+\.?\d*)/gi,
    
    // Release date patterns
    /(?:released|announced|available)\s+([A-Z][a-z]+\s+\d{4})/gi,
    
    // Performance descriptors that might indicate models
    /(?:fastest|quickest|best|latest|newest)\s+([a-z]+\s+(?:model|ai|llm))/gi
  ];
  
  patterns.forEach(pattern => {
    const matches = searchText.matchAll(pattern);
    for (const match of matches) {
      if (match[0] && match[0].length > 3) {
        models.add(match[0].trim());
      }
    }
  });
  
  return Array.from(models);
}

/**
 * Score a model based on characteristics WITHOUT knowing its specific name
 * Uses only observable properties from the model metadata
 */
export function scoreModelByCharacteristics(
  modelMetadata: any,
  requirements: {
    speedWeight: number;
    qualityWeight: number;
    costWeight: number;
  }
): number {
  let speedScore = 50;
  let qualityScore = 50;
  let costScore = 50;
  
  // Score based on metadata, not name
  if (modelMetadata.pricing) {
    const inputPrice = parseFloat(modelMetadata.pricing.prompt || 0);
    const outputPrice = parseFloat(modelMetadata.pricing.completion || 0);
    const totalPrice = inputPrice + outputPrice;
    
    // Cost scoring (lower price = higher score)
    if (totalPrice < 0.001) costScore = 95;
    else if (totalPrice < 0.005) costScore = 85;
    else if (totalPrice < 0.01) costScore = 75;
    else if (totalPrice < 0.05) costScore = 60;
    else if (totalPrice < 0.1) costScore = 40;
    else costScore = 20;
  }
  
  // Speed scoring based on context length and architecture
  if (modelMetadata.context_length) {
    if (modelMetadata.context_length <= 4096) speedScore = 90;
    else if (modelMetadata.context_length <= 8192) speedScore = 80;
    else if (modelMetadata.context_length <= 16384) speedScore = 70;
    else if (modelMetadata.context_length <= 32768) speedScore = 60;
    else speedScore = 40;
  }
  
  // Quality scoring based on pricing (generally higher price = higher quality)
  if (modelMetadata.pricing) {
    const totalPrice = parseFloat(modelMetadata.pricing.prompt || 0) + 
                       parseFloat(modelMetadata.pricing.completion || 0);
    
    if (totalPrice > 0.1) qualityScore = 95;
    else if (totalPrice > 0.05) qualityScore = 85;
    else if (totalPrice > 0.01) qualityScore = 75;
    else if (totalPrice > 0.005) qualityScore = 65;
    else qualityScore = 55;
  }
  
  // Calculate weighted score
  const totalScore = 
    (speedScore * requirements.speedWeight) +
    (qualityScore * requirements.qualityWeight) +
    (costScore * requirements.costWeight);
    
  return Math.round(totalScore);
}

/**
 * Select best models for role using ONLY characteristics, not names
 */
export function selectByCharacteristics(
  availableModels: any[],
  role: string
): { primary: any; fallback: any } | null {
  
  // Define requirements by role
  const requirements = {
    'ai-parser': { speedWeight: 0.50, qualityWeight: 0.30, costWeight: 0.20 },
    'deepwiki': { speedWeight: 0.20, qualityWeight: 0.50, costWeight: 0.30 },
    'researcher': { speedWeight: 0.30, qualityWeight: 0.35, costWeight: 0.35 },
    'educator': { speedWeight: 0.25, qualityWeight: 0.50, costWeight: 0.25 },
    'orchestrator': { speedWeight: 0.35, qualityWeight: 0.40, costWeight: 0.25 }
  };
  
  const roleReqs = requirements[role as keyof typeof requirements] || 
                   { speedWeight: 0.33, qualityWeight: 0.33, costWeight: 0.34 };
  
  // Score all models based on characteristics only
  const scored = availableModels
    .map(model => ({
      model,
      score: scoreModelByCharacteristics(model, roleReqs)
    }))
    .sort((a, b) => b.score - a.score);
  
  // For AI-Parser, filter out expensive models (indicates they're slow/heavy)
  if (role === 'ai-parser') {
    const fastModels = scored.filter(s => {
      const price = parseFloat(s.model.pricing?.prompt || 0);
      return price < 0.01; // Only cheap models are typically fast
    });
    
    if (fastModels.length >= 2) {
      return {
        primary: fastModels[0].model,
        fallback: fastModels[1].model
      };
    }
  }
  
  // For other roles, return top 2
  if (scored.length >= 2) {
    return {
      primary: scored[0].model,
      fallback: scored[1].model
    };
  }
  
  return null;
}

/**
 * Generate prompts that emphasize specific requirements without naming models
 */
export function generateRequirementPrompts(role: string): string {
  const year = new Date().getFullYear();
  
  const prompts: Record<string, string> = {
    'ai-parser': `
      Find the absolute FASTEST language models available in ${year}.
      Requirements:
      - Response time MUST be under 2 seconds
      - Latency is the TOP priority - speed over everything else
      - Need models that can handle thousands of requests per second
      - Lightweight, efficient, minimal compute requirements
      - Quick parsing and extraction capabilities
      - NO heavy or slow models, even if they're high quality
      The model MUST be optimized for SPEED above all else.
    `,
    
    'deepwiki': `
      Find the highest quality language models available in ${year}.
      Requirements:
      - Maximum understanding and reasoning capabilities
      - Deep code analysis and comprehension
      - Excellent at complex problem solving
      - State-of-the-art performance on benchmarks
      - Quality and accuracy are top priorities
      - Can handle sophisticated technical tasks
    `,
    
    'researcher': `
      Find the most cost-effective language models available in ${year}.
      Requirements:
      - Optimized for high-volume usage (3000+ queries daily)
      - Best price-to-performance ratio
      - Low cost per token while maintaining good quality
      - Economical for continuous operation
      - Good enough quality for research tasks
      - Budget-friendly for extensive use
    `,
    
    'educator': `
      Find language models best at explanation and teaching in ${year}.
      Requirements:
      - Excellent at breaking down complex concepts
      - Clear, patient communication style
      - Good at providing detailed explanations
      - Strong pedagogical capabilities
      - Ability to adapt explanations to different levels
      - Focus on clarity and understanding
    `,
    
    'orchestrator': `
      Find well-balanced language models available in ${year}.
      Requirements:
      - Good balance of speed and quality
      - Reliable and consistent performance
      - Versatile across different types of tasks
      - Dependable for coordination and management
      - Reasonable cost for regular use
      - Stable and predictable behavior
    `
  };
  
  return prompts[role] || prompts['orchestrator'];
}