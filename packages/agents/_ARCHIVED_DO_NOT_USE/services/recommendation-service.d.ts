/**
 * Recommendation Service
 * Generates structured, actionable recommendations from compiled agent findings
 */
import { RecommendationModule } from '../types/recommendation-types';
import { AuthenticatedUser } from '../multi-agent/types/auth';
export declare class RecommendationService {
    private authenticatedUser?;
    private skillTrackingService?;
    constructor(authenticatedUser?: AuthenticatedUser | undefined);
    /**
     * Generate comprehensive recommendations from processed results
     */
    generateRecommendations(processedResults: any, deepWikiSummary?: any): Promise<RecommendationModule>;
    /**
     * Generate skill-aware security recommendations
     */
    private generateSkillAwareSecurityRecommendations;
    /**
     * Generate skill-aware performance recommendations
     */
    private generateSkillAwarePerformanceRecommendations;
    /**
     * Generate skill-aware architecture recommendations
     */
    private generateSkillAwareArchitectureRecommendations;
    /**
     * Generate skill-aware code quality recommendations
     */
    private generateSkillAwareCodeQualityRecommendations;
    /**
     * Generate skill-aware dependency recommendations
     */
    private generateSkillAwareDependencyRecommendations;
    /**
     * Generate skill development recommendations based on current skills and progression
     */
    private generateSkillDevelopmentRecommendations;
    /**
     * Adapt recommendation based on user's skill level and progression
     */
    private adaptRecommendationToSkillLevel;
    /**
     * Infer category from skill recommendation text
     */
    private inferCategoryFromSkillRecommendation;
    /**
     * Generate security-specific recommendations
     */
    private generateSecurityRecommendations;
    /**
     * Generate performance-specific recommendations
     */
    private generatePerformanceRecommendations;
    /**
     * Generate architecture-specific recommendations
     */
    private generateArchitectureRecommendations;
    /**
     * Generate code quality recommendations
     */
    private generateCodeQualityRecommendations;
    /**
     * Generate dependency recommendations
     */
    private generateDependencyRecommendations;
    /**
     * Generate DeepWiki-specific recommendations
     */
    private generateDeepWikiRecommendations;
    /**
     * Calculate priority based on security finding
     */
    private calculateSecurityPriority;
    /**
     * Calculate priority for other categories
     */
    private calculatePerformancePriority;
    private calculateArchitecturePriority;
    private calculateCodeQualityPriority;
    private calculateDependencyPriority;
    /**
     * Generate action steps for different categories
     */
    private generateSecurityActionSteps;
    private generatePerformanceActionSteps;
    private generateArchitectureActionSteps;
    private generateCodeQualityActionSteps;
    private generateDependencyActionSteps;
    /**
     * Helper methods
     */
    private inferSkillLevel;
    private calculateDifficultyScore;
    private mapDeepWikiCategory;
    /**
     * Prioritize recommendations by impact and urgency
     */
    private prioritizeRecommendations;
    /**
     * Generate learning path guidance
     */
    private generateLearningPathGuidance;
    /**
     * Generate summary statistics
     */
    private generateSummary;
    /**
     * Calculate confidence score
     */
    private calculateConfidence;
}
