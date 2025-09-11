/**
 * Context-specific Weight Configuration
 * 
 * Defines weights for different combinations of:
 * - Languages (8-10 major languages)
 * - Sizes (small, medium, large)
 * - Roles (deepwiki, comparator, location_finder, orchestrator, researcher, educator)
 * 
 * Weights are for: quality, speed, cost, freshness, contextWindow
 */

import { DYNAMIC_ROLE_WEIGHTS } from './dynamic-model-evaluator';

export interface ContextWeights {
  quality: number;
  speed: number;
  cost: number;
  freshness: number;
  contextWindow: number;
}

export interface ContextConfig {
  language: string;
  size: 'small' | 'medium' | 'large';
  role: string;
  weights: ContextWeights;
  minRequirements?: {
    minQuality?: number;
    maxCost?: number;
    minSpeed?: number;
    minContextWindow?: number;
  };
}

/**
 * Supported languages for comprehensive coverage
 */
export const SUPPORTED_LANGUAGES = [
  'typescript',
  'javascript', 
  'python',
  'java',
  'csharp',
  'go',
  'rust',
  'cpp',
  'ruby',
  'php'
] as const;

/**
 * Repository size categories
 */
export const REPOSITORY_SIZES = ['small', 'medium', 'large'] as const;

/**
 * All roles that need model selection
 */
export const MODEL_ROLES = [
  'deepwiki',        // Requires language & size
  'comparator',      // Requires language & size
  'location_finder', // Requires language & size
  'text-parser',     // No language/size params - fast text extraction
  'orchestrator',    // No language/size params
  'researcher',      // No language/size params
  'educator',        // No language/size params
  'security',        // Requires language & size
  'performance',     // Requires language & size
  'architecture',    // Requires language & size
  'code_quality',    // Requires language & size
  'testing',         // Requires language & size
  'documentation'    // Requires language & size
] as const;

/**
 * Get context-specific weights
 * More aggressive adjustments based on context
 */
export function getContextWeights(
  role: string,
  language?: string,
  size?: 'small' | 'medium' | 'large'
): ContextWeights {
  // Base weights by role
  const baseWeights = getRoleBaseWeights(role);
  
  // No context adjustments for roles that don't use language/size
  if (!language || !size) {
    return baseWeights;
  }
  
  // Apply language-specific adjustments
  const langAdjusted = applyLanguageAdjustments(baseWeights, role, language);
  
  // Apply size-specific adjustments (AGGRESSIVE)
  const sizeAdjusted = applySizeAdjustments(langAdjusted, role, size);
  
  // Normalize weights to sum to 1
  return normalizeWeights(sizeAdjusted);
}

/**
 * Base weights for each role - using existing DYNAMIC_ROLE_WEIGHTS
 */
function getRoleBaseWeights(role: string): ContextWeights {
  // Use the existing DYNAMIC_ROLE_WEIGHTS we already defined
  const dynamicWeights = DYNAMIC_ROLE_WEIGHTS as any;
  
  // Map role names (some are slightly different)
  const roleMapping: Record<string, string> = {
    'educator': 'educational',
    'comparator': 'comparison', // If exists
    // Add any other mappings if needed
  };
  
  const weightKey = roleMapping[role] || role;
  
  // If we have weights defined in DYNAMIC_ROLE_WEIGHTS, use them
  if (dynamicWeights[weightKey]) {
    return dynamicWeights[weightKey];
  }
  
  // For roles not in DYNAMIC_ROLE_WEIGHTS, provide reasonable defaults
  switch (role) {
    case 'comparator':
      // Not in DYNAMIC_ROLE_WEIGHTS, balanced for comparisons
      return {
        quality: 0.45,
        speed: 0.15,
        cost: 0.20,
        freshness: 0.15,
        contextWindow: 0.05
      };
    
    case 'text-parser':
      // Fast text extraction from analysis outputs
      // Prioritize speed over quality since it's just pattern matching
      return {
        quality: 0.20,  // Low - just pattern extraction
        speed: 0.50,    // High - avoid timeouts
        cost: 0.20,     // Moderate - want cheap but reliable
        freshness: 0.05, // Low - model version doesn't matter much
        contextWindow: 0.05 // Low - parsing text not code
      };
      
    default:
      // Default balanced weights
      return {
        quality: 0.35,
        speed: 0.20,
        cost: 0.25,
        freshness: 0.15,
        contextWindow: 0.05
      };
  }
}

/**
 * Language-specific adjustments
 */
function applyLanguageAdjustments(
  weights: ContextWeights,
  role: string,
  language: string
): ContextWeights {
  const adjusted = { ...weights };
  
  switch (language.toLowerCase()) {
    case 'rust':
    case 'cpp':
    case 'c':
      // Systems languages need highest quality
      if (role === 'security' || role === 'performance') {
        adjusted.quality += 0.15;
        adjusted.cost -= 0.10;
        adjusted.speed -= 0.05;
      } else {
        adjusted.quality += 0.10;
        adjusted.cost -= 0.05;
        adjusted.speed -= 0.05;
      }
      break;
      
    case 'typescript':
    case 'javascript':
      // Dynamic languages need good type inference
      if (role === 'code_quality' || role === 'testing') {
        adjusted.quality += 0.10;
        adjusted.speed -= 0.05;
        adjusted.cost -= 0.05;
      }
      break;
      
    case 'python':
      // Python can use faster models generally
      if (role !== 'security' && role !== 'deepwiki') {
        adjusted.speed += 0.10;
        adjusted.quality -= 0.05;
        adjusted.cost -= 0.05;
      }
      break;
      
    case 'java':
    case 'csharp':
      // Enterprise languages balance quality and cost
      if (role === 'architecture' || role === 'documentation') {
        adjusted.quality += 0.05;
        adjusted.contextWindow += 0.05;
        adjusted.cost -= 0.10;
      }
      break;
      
    case 'go':
      // Go needs good concurrency understanding
      if (role === 'performance' || role === 'architecture') {
        adjusted.quality += 0.10;
        adjusted.cost -= 0.05;
        adjusted.speed -= 0.05;
      }
      break;
      
    case 'ruby':
    case 'php':
      // Scripting languages can be more cost-conscious
      adjusted.cost += 0.10;
      adjusted.quality -= 0.05;
      adjusted.speed -= 0.05;
      break;
  }
  
  return adjusted;
}

/**
 * Size-specific adjustments (MORE MODERATE)
 */
function applySizeAdjustments(
  weights: ContextWeights,
  role: string,
  size: 'small' | 'medium' | 'large'
): ContextWeights {
  const adjusted = { ...weights };
  
  switch (size) {
    case 'large':
      // Large repos need higher quality, but don't destroy the base weights
      adjusted.quality *= 1.15;       // +15% quality multiplier
      adjusted.contextWindow *= 1.20; // +20% context multiplier
      adjusted.speed *= 0.90;         // -10% speed multiplier
      adjusted.cost *= 0.85;          // -15% cost importance
      
      // Role-specific large repo adjustments
      if (role === 'deepwiki' || role === 'security') {
        adjusted.quality *= 1.10;    // Additional 10% for critical roles
      }
      break;
      
    case 'small':
      // Small repos prefer speed and cost, but keep base proportions
      adjusted.speed *= 1.30;         // +30% speed multiplier
      adjusted.cost *= 1.25;          // +25% cost importance
      adjusted.quality *= 0.85;       // -15% quality
      adjusted.contextWindow *= 0.80; // -20% context
      
      // Role-specific small repo adjustments
      if (role === 'location_finder' || role === 'documentation') {
        adjusted.speed *= 1.15;      // Additional speed for frequent operations
      }
      break;
      
    case 'medium':
    default:
      // Medium repos stay mostly the same
      // No adjustments - use base weights
      break;
  }
  
  return adjusted;
}

/**
 * Normalize weights to sum to 1 (ensure all positive)
 */
function normalizeWeights(weights: ContextWeights): ContextWeights {
  // First ensure all weights are positive (min 0.01)
  const positiveWeights = {
    quality: Math.max(0.01, weights.quality),
    speed: Math.max(0.01, weights.speed),
    cost: Math.max(0.01, weights.cost),
    freshness: Math.max(0.01, weights.freshness),
    contextWindow: Math.max(0.01, weights.contextWindow)
  };
  
  // Then normalize to sum to 1
  const sum = positiveWeights.quality + positiveWeights.speed + positiveWeights.cost + 
              positiveWeights.freshness + positiveWeights.contextWindow;
  
  if (sum === 0) return positiveWeights;
  
  return {
    quality: positiveWeights.quality / sum,
    speed: positiveWeights.speed / sum,
    cost: positiveWeights.cost / sum,
    freshness: positiveWeights.freshness / sum,
    contextWindow: positiveWeights.contextWindow / sum
  };
}

/**
 * Get minimum requirements for a context
 */
export function getMinimumRequirements(
  role: string,
  language?: string,
  size?: 'small' | 'medium' | 'large'
) {
  const requirements: any = {};
  
  // Role-based minimums
  switch (role) {
    case 'deepwiki':
      requirements.minQuality = 8.0;
      requirements.minContextWindow = 100000;
      break;
      
    case 'security':
      requirements.minQuality = 8.5;
      break;
      
    case 'location_finder':
      requirements.minSpeed = 7.0;
      requirements.maxCost = 0.01;
      break;
      
    case 'educator':
      requirements.maxCost = 0.005;
      break;
  }
  
  // Size-based adjustments
  if (size === 'large') {
    requirements.minQuality = Math.max(requirements.minQuality || 0, 7.5);
    requirements.minContextWindow = Math.max(requirements.minContextWindow || 0, 128000);
  } else if (size === 'small') {
    requirements.maxCost = Math.min(requirements.maxCost || 1, 0.01);
    requirements.minSpeed = Math.max(requirements.minSpeed || 0, 6.0);
  }
  
  // Language-based adjustments
  if (language === 'rust' || language === 'cpp') {
    requirements.minQuality = Math.max(requirements.minQuality || 0, 7.0);
  }
  
  return requirements;
}

/**
 * Generate all possible context combinations
 */
export function generateAllContexts(): ContextConfig[] {
  const configs: ContextConfig[] = [];
  
  // Roles that DON'T use language/size parameters (universal)
  const universalRoles = ['orchestrator', 'researcher', 'educator'];
  
  for (const role of MODEL_ROLES) {
    if (universalRoles.includes(role)) {
      // Only ONE config per universal role (no language/size variations)
      configs.push({
        language: 'universal',
        size: 'medium',
        role,
        weights: getContextWeights(role),
        minRequirements: getMinimumRequirements(role)
      });
    } else {
      // Roles that require language/size context
      // These are: deepwiki, comparator, location_finder, security, performance, 
      //            architecture, code_quality, testing, documentation
      for (const language of SUPPORTED_LANGUAGES) {
        for (const size of REPOSITORY_SIZES) {
          configs.push({
            language,
            size,
            role,
            weights: getContextWeights(role, language, size),
            minRequirements: getMinimumRequirements(role, language, size)
          });
        }
      }
    }
  }
  
  return configs;
}

/**
 * Get fallback trigger condition
 * When orchestrator can't find a config, it should trigger researcher
 */
export function shouldTriggerResearcher(
  role: string,
  configExists: boolean,
  language?: string,
  size?: 'small' | 'medium' | 'large'
): boolean {
  // Always trigger if config doesn't exist
  if (!configExists) {
    return true;
  }
  
  // Additional conditions for triggering research
  // - New language not in our supported list
  // - Critical roles with outdated configs
  // - Periodic refresh for important contexts
  
  return false;
}