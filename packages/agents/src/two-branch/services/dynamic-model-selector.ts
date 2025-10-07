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
   *
   * BUG-119 FIX: Each role gets different weights to encourage model diversity
   */
  async selectModelsForTwoBranchAnalysis(role: string, repoSize: 'small' | 'medium' | 'large' | 'enterprise') {
    // BUG-119 FIX: Role-specific weights to encourage different model selection
    const roleWeights = this.getRoleSpecificWeights(role);

    const requirements = {
      role,
      description: `Two-branch ${role} analysis for issue comparison`,
      repositorySize: repoSize,
      weights: roleWeights,
      requiresReasoning: true,
      requiresCodeAnalysis: true,
      minContextWindow: repoSize === 'enterprise' ? 100000 : 32000
    };

    return this.selectModelsForRole(requirements);
  }

  /**
   * BUG-119 FIX: Get role-specific weights to encourage model diversity
   * Different roles prioritize different model characteristics
   */
  private getRoleSpecificWeights(role: string): { quality: number; speed: number; cost: number } {
    const normalizedRole = role.toLowerCase();

    switch (normalizedRole) {
      case 'security':
        // Security needs highest quality for accurate vulnerability detection
        // Reasoning is critical, speed is secondary
        return { quality: 0.85, speed: 0.10, cost: 0.05 };

      case 'performance':
        // Performance analysis benefits from faster models
        // Can trade some quality for speed since issues are measurable
        return { quality: 0.55, speed: 0.35, cost: 0.10 };

      case 'architecture':
        // Architecture requires deep reasoning about design patterns
        // Highest quality need, speed less important
        return { quality: 0.90, speed: 0.05, cost: 0.05 };

      case 'codequality':
        // Code quality is balanced - needs good reasoning but not extreme
        return { quality: 0.70, speed: 0.20, cost: 0.10 };

      case 'dependency':
        // Dependency checking can use faster models
        // Often checking against databases, less reasoning needed
        return { quality: 0.50, speed: 0.40, cost: 0.10 };

      default:
        // Default balanced weights
        return { quality: 0.70, speed: 0.20, cost: 0.10 };
    }
  }
}

// Export for compatibility
export default DynamicModelSelector;