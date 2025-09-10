import { PRMetadata } from './pr-skill-assessment-service';
import { AuthenticatedUser } from '../multi-agent/types/auth';
/**
 * Skill integration result for reporting
 */
export interface SkillIntegrationResult {
    skillAssessment: {
        assessments: any[];
        skillsUpdated: string[];
        improvements: Record<string, number>;
    };
    personalizedRecommendations: any;
    learningPathUpdated: boolean;
    engagementTracked: boolean;
    progressionAnalytics: {
        overallTrend: 'improving' | 'maintaining' | 'declining';
        focusAreas: string[];
        nextMilestones: string[];
    };
}
/**
 * Central service that integrates skill tracking with the entire analysis workflow
 */
export declare class SkillIntegrationService {
    private authenticatedUser;
    private readonly logger;
    private skillTrackingService;
    private prSkillAssessmentService;
    private recommendationService;
    constructor(authenticatedUser: AuthenticatedUser);
    /**
     * Main integration method called by Result Orchestrator
     */
    integrateSkillTracking(prAnalysis: any, prMetadata: PRMetadata, processedResults: any): Promise<SkillIntegrationResult>;
    /**
     * Generate comprehensive skill report for user dashboard
     */
    generateSkillReport(): Promise<{
        currentSkills: any[];
        progressionTrends: Record<string, any>;
        learningPlan: any;
        achievements: string[];
        recommendations: string[];
    }>;
    /**
     * Track skill improvement when user applies recommendations
     */
    trackRecommendationApplication(recommendationId: string, applied: boolean, improvementObserved: boolean): Promise<void>;
    /**
     * Get skill-based filtering for educational content
     */
    getSkillBasedContentFiltering(): Promise<{
        difficultyPreferences: Record<string, 'beginner' | 'intermediate' | 'advanced'>;
        focusAreas: string[];
        avoidAreas: string[];
    }>;
    private generateProgressionAnalytics;
    private shouldUpdateLearningPath;
    private generateAchievements;
    /**
     * Integration with Result Orchestrator
     * This method is called during the analysis pipeline
     */
    static integrateWithResultOrchestrator(authenticatedUser: AuthenticatedUser, prAnalysis: any, prMetadata: PRMetadata, processedResults: any): Promise<SkillIntegrationResult | null>;
}
