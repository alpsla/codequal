"use strict";
/**
 * Dynamic Model Selector Service
 *
 * This integrates with the full implementation from standard/services
 * to provide proper dynamic model selection based on Supabase configurations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DynamicModelSelector = void 0;
// Import the full implementation from standard services
const dynamic_model_selector_1 = require("../../standard/services/dynamic-model-selector");
/**
 * Dynamic Model Selector for Two-Branch Architecture
 * Extends the standard implementation with two-branch specific features
 */
class DynamicModelSelector extends dynamic_model_selector_1.DynamicModelSelector {
    constructor(apiKey) {
        super(apiKey);
    }
    /**
     * Override to add two-branch specific model selection logic
     * This ensures we get models optimized for comparing two branches
     *
     * BUG-119 FIX: Each role gets different weights to encourage model diversity
     */
    async selectModelsForTwoBranchAnalysis(role, repoSize) {
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
    getRoleSpecificWeights(role) {
        const normalizedRole = role.toLowerCase();
        switch (normalizedRole) {
            case 'security':
                // Security fix generation is pattern-based (tools already found issues)
                // Prioritize cost since we're templating fixes, not discovering vulnerabilities
                // Still maintain good quality for critical security patterns
                return { quality: 0.35, speed: 0.30, cost: 0.35 };
            case 'performance':
                // Performance fix generation is also pattern-based
                // Balance speed and cost while maintaining adequate quality
                return { quality: 0.30, speed: 0.35, cost: 0.35 };
            case 'architecture':
                // Architecture requires deep reasoning about design patterns
                // Highest quality need, speed less important
                return { quality: 0.90, speed: 0.05, cost: 0.05 };
            case 'codequality':
                // Code quality fix generation is pattern-based (PMD/Checkstyle already found issues)
                // Match security/performance since it's the same workflow: template fixes from tool output
                // This handles 99.8% of issues, so cost optimization is critical
                return { quality: 0.30, speed: 0.35, cost: 0.35 };
            case 'dependency':
                // Dependency checking is mostly database lookups (CVE checking)
                // Increase cost awareness while maintaining speed for large dependency trees
                return { quality: 0.40, speed: 0.40, cost: 0.20 };
            default:
                // Default balanced weights
                return { quality: 0.70, speed: 0.20, cost: 0.10 };
        }
    }
}
exports.DynamicModelSelector = DynamicModelSelector;
// Export for compatibility
exports.default = DynamicModelSelector;
