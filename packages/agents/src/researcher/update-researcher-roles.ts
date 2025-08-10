/**
 * Update Researcher to Include Location Finder Role
 * 
 * This ensures the ResearcherAgent includes location_finder in its quarterly
 * research cycles alongside other roles.
 */

import { AgentRole } from '@codequal/core/config/agent-registry';

/**
 * Roles that should be researched quarterly
 * Updated to include LOCATION_FINDER
 */
export const ROLES_TO_RESEARCH = [
  AgentRole.ORCHESTRATOR,
  AgentRole.CODE_QUALITY,
  AgentRole.SECURITY,
  AgentRole.PERFORMANCE,
  AgentRole.ARCHITECTURE,
  AgentRole.DEPENDENCY,
  AgentRole.EDUCATIONAL,
  AgentRole.REPORT_GENERATION,
  AgentRole.LOCATION_FINDER  // NEW: Added location finder role
];

/**
 * Language and size contexts for research
 */
export const RESEARCH_CONTEXTS = {
  languages: [
    'javascript',
    'typescript', 
    'python',
    'java',
    'go',
    'rust',
    'c',
    'cpp'
  ],
  sizes: ['small', 'medium', 'large'],
  // Special contexts for location_finder
  locationFinderSizes: ['small', 'large'] // Simplified for location finding
};

/**
 * Research configuration for location_finder role
 */
export const LOCATION_FINDER_RESEARCH_CONFIG = {
  role: 'location_finder',
  description: 'AI-powered exact issue location identification',
  weights: {
    quality: 0.55,  // Accuracy in finding correct locations is crucial
    cost: 0.25,     // Moderate cost sensitivity for volume processing
    speed: 0.20     // Reasonable response time for interactive use
  },
  contexts: [
    // JavaScript/TypeScript
    { language: 'javascript', size: 'small', specialization: 'Fast for frequent small files' },
    { language: 'javascript', size: 'large', specialization: 'Balanced for complex files' },
    { language: 'typescript', size: 'small', specialization: 'Fast for frequent small files' },
    { language: 'typescript', size: 'large', specialization: 'Balanced for complex files' },
    
    // Python
    { language: 'python', size: 'small', specialization: 'Balance quality and speed' },
    { language: 'python', size: 'large', specialization: 'Quality over speed' },
    
    // Java
    { language: 'java', size: 'small', specialization: 'Complex code understanding' },
    { language: 'java', size: 'large', specialization: 'Deep code analysis' },
    
    // Go
    { language: 'go', size: 'small', specialization: 'System code balance' },
    { language: 'go', size: 'large', specialization: 'Complex system code' },
    
    // Rust
    { language: 'rust', size: 'small', specialization: 'Critical code accuracy' },
    { language: 'rust', size: 'large', specialization: 'Maximum quality' },
    
    // C/C++
    { language: 'c', size: 'small', specialization: 'System code analysis' },
    { language: 'c', size: 'large', specialization: 'Complex system code' },
    { language: 'cpp', size: 'small', specialization: 'System code analysis' },
    { language: 'cpp', size: 'large', specialization: 'Complex system code' },
    
    // Default fallback
    { language: 'all', size: 'all', specialization: 'General purpose fallback' }
  ]
};

/**
 * Generate research tasks for all roles including location_finder
 */
export function generateResearchTasks(): Array<{
  role: string;
  language: string;
  size: string;
  priority: number;
}> {
  const tasks: Array<{
    role: string;
    language: string;
    size: string;
    priority: number;
  }> = [];
  
  // Generate tasks for all roles
  for (const role of ROLES_TO_RESEARCH) {
    // Special handling for location_finder
    if (role === AgentRole.LOCATION_FINDER) {
      for (const context of LOCATION_FINDER_RESEARCH_CONFIG.contexts) {
        tasks.push({
          role: role,
          language: context.language,
          size: context.size,
          priority: context.language === 'all' ? 0 : 1  // Default config has lower priority
        });
      }
    } else {
      // Standard roles - research for common language/size combinations
      for (const language of RESEARCH_CONTEXTS.languages) {
        for (const size of RESEARCH_CONTEXTS.sizes) {
          tasks.push({
            role: role,
            language: language,
            size: size,
            priority: 1
          });
        }
      }
    }
  }
  
  // Sort by priority (higher priority first)
  return tasks.sort((a, b) => b.priority - a.priority);
}

/**
 * Check if a role should be researched
 */
export function shouldResearchRole(role: string): boolean {
  return ROLES_TO_RESEARCH.includes(role as AgentRole);
}

/**
 * Get research configuration for a specific role
 */
export function getResearchConfig(role: string): any {
  if (role === AgentRole.LOCATION_FINDER) {
    return LOCATION_FINDER_RESEARCH_CONFIG;
  }
  
  // Return default config for other roles
  return {
    role: role,
    description: `Research for ${role} role`,
    weights: {
      quality: 0.50,
      cost: 0.30,
      speed: 0.20
    }
  };
}

// Export for use in ResearcherAgent
export default {
  ROLES_TO_RESEARCH,
  RESEARCH_CONTEXTS,
  LOCATION_FINDER_RESEARCH_CONFIG,
  generateResearchTasks,
  shouldResearchRole,
  getResearchConfig
};