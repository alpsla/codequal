import { SkillAssessment } from './skill-tracking-service';
import { AuthenticatedUser } from '../multi-agent/types/auth';
/**
 * PR metadata for skill assessment
 */
export interface PRMetadata {
    prNumber: number;
    repository: string;
    filesChanged: number;
    linesChanged: number;
    complexity: number;
    branch: string;
    author: string;
    reviewers: string[];
    mergedAt?: Date;
}
/**
 * Assessment result with skill updates
 */
export interface PRSkillAssessmentResult {
    assessments: SkillAssessment[];
    skillsUpdated: string[];
    previousLevels: Record<string, number>;
    newLevels: Record<string, number>;
    improvements: Record<string, number>;
}
/**
 * Service that assesses and updates user skills based on PR analysis
 */
export declare class PRSkillAssessmentService {
    private authenticatedUser;
    private readonly logger;
    private skillTrackingService;
    constructor(authenticatedUser: AuthenticatedUser);
    /**
     * Assess and update skills based on PR analysis results
     */
    assessAndUpdateSkills(prAnalysis: any, prMetadata: PRMetadata): Promise<PRSkillAssessmentResult>;
    /**
     * Get skill progression analytics for a user
     */
    getSkillProgressionAnalytics(timespan?: string): Promise<{
        progressions: Record<string, any>;
        overallTrend: 'improving' | 'maintaining' | 'declining';
        recommendations: string[];
    }>;
    /**
     * Calculate PR complexity score for skill assessment
     */
    calculatePRComplexity(prMetadata: PRMetadata, analysisResults: any): number;
    /**
     * Generate skill development plan based on current weaknesses
     */
    generateSkillDevelopmentPlan(): Promise<{
        plan: {
            category: string;
            currentLevel: number;
            targetLevel: number;
            actions: string[];
            timeframe: string;
        }[];
        overallGoal: string;
        estimatedTimeframe: string;
    }>;
    private countTotalFindings;
    private generateSkillActions;
    private estimateSkillImprovementTime;
}
