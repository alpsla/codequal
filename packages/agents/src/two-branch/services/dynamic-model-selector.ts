/**
 * Dynamic Model Selector Service
 * 
 * This integrates with the full implementation from standard/services
 * to provide proper dynamic model selection based on Supabase configurations
 */

// Import the full implementation from standard services
import { DynamicModelSelector as StandardDynamicModelSelector } from '../../standard/services/dynamic-model-selector';

// Re-export interfaces for compatibility
export { RoleRequirements, ModelCandidate } from '../../standard/services/dynamic-model-selector';

/**
 * Dynamic Model Selector for Two-Branch Architecture
 * Extends the standard implementation with two-branch specific features
 */
export class DynamicModelSelector extends StandardDynamicModelSelector {
  constructor(apiKey?: string) {
    super(apiKey);
  }
  
  /**
   * Override to add two-branch specific model selection logic
   * This ensures we get models optimized for comparing two branches
   */
  async selectModelsForTwoBranchAnalysis(role: string, repoSize: 'small' | 'medium' | 'large' | 'enterprise') {
    // For two-branch analysis, we need models with good reasoning
    // to properly categorize issues as new/existing/resolved
    const requirements = {
      role,
      description: `Two-branch ${role} analysis for issue comparison`,
      repositorySize: repoSize,
      weights: {
        quality: 0.7,  // High quality for accurate comparison
        speed: 0.2,    // Speed is less critical
        cost: 0.1      // Cost is lowest priority for accuracy
      },
      requiresReasoning: true,
      requiresCodeAnalysis: true,
      minContextWindow: repoSize === 'enterprise' ? 100000 : 32000
    };
    
    return this.selectModelsForRole(requirements);
  }
}

// Export for compatibility
export default DynamicModelSelector;