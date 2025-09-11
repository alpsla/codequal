import { DeveloperSkill } from '@codequal/database/models/skill';
import { AuthenticatedUser } from '../multi-agent/types/auth';
/**
 * Skill assessment data extracted from PR analysis
 */
export interface SkillAssessment {
    category: string;
    demonstratedLevel: number;
    evidence: {
        type: 'pr_analysis' | 'issue_resolution' | 'educational_engagement' | 'tool_usage';
        sourceId: string;
        description: string;
        severity?: 'low' | 'medium' | 'high' | 'critical';
        complexity?: number;
    };
    confidence: number;
}
/**
 * Skill progression analysis result
 */
export interface SkillProgression {
    previousLevel: number;
    newLevel: number;
    improvement: number;
    trend: 'improving' | 'maintaining' | 'declining';
    recentActivity: {
        prCount: number;
        avgComplexity: number;
        successRate: number;
        timespan: string;
    };
}
/**
 * Learning engagement tracking
 */
export interface LearningEngagement {
    educationalContentId: string;
    engagementType: 'viewed' | 'applied' | 'completed' | 'recommended';
    skillsTargeted: string[];
    improvementObserved: boolean;
    timestamp: Date;
}
/**
 * Comprehensive skill tracking service that integrates with PR analysis,
 * educational content, and learning progression tracking
 */
export declare class SkillTrackingService {
    private authenticatedUser;
    private readonly logger;
    constructor(authenticatedUser: AuthenticatedUser);
    /**
     * Assess skills demonstrated in a PR analysis
     */
    assessSkillsFromPR(prAnalysis: any, prMetadata: {
        prNumber: number;
        repository: string;
        filesChanged: number;
        linesChanged: number;
        complexity: number;
    }, existingRepoIssues?: {
        security?: any[];
        codeQuality?: any[];
        architecture?: any[];
        performance?: any[];
        dependencies?: any[];
    }): Promise<SkillAssessment[]>;
    /**
     * Update user skills based on assessments
     */
    updateSkillsFromAssessments(assessments: SkillAssessment[]): Promise<void>;
    /**
     * Track when repository issues are fixed
     */
    trackRepoIssueResolution(issuesFixed: {
        issueId: string;
        category: string;
        severity: 'critical' | 'high' | 'medium' | 'low';
        repository: string;
        prNumber?: number;
    }[]): Promise<void>;
    /**
     * Apply skill degradation for unresolved repository issues
     */
    applyRepoIssueDegradation(unresolvedIssues: {
        issueId: string;
        category: string;
        severity: 'critical' | 'high' | 'medium' | 'low';
        repository: string;
    }[]): Promise<number>;
    /**
     * Get active skill degradations for the user
     */
    getActiveDegradations(): Promise<{
        repository: string;
        issueCount: number;
        totalDegradation: number;
        bySeverity: Record<string, {
            count: number;
            degradation: number;
        }>;
    }[]>;
    /**
     * Get resolution history for the user
     */
    getResolutionHistory(days?: number): Promise<{
        repository: string;
        resolutions: number;
        skillPointsEarned: number;
        bySeverity: Record<string, {
            count: number;
            points: number;
        }>;
        recentResolutions: any[];
    }[]>;
    /**
     * Track learning engagement from educational content
     */
    trackLearningEngagement(engagement: LearningEngagement): Promise<void>;
    /**
     * Get user's current skill levels
     */
    getCurrentSkills(): Promise<DeveloperSkill[]>;
    /**
     * Get skill progression history
     */
    getSkillProgression(category: string, timespan?: string): Promise<SkillProgression | null>;
    /**
     * Generate skill-based learning recommendations
     */
    generateSkillBasedRecommendations(): Promise<string[]>;
    private updateSkillLevel;
    private calculateSecuritySkillLevel;
    private calculateCodeQualitySkillLevel;
    private calculateArchitectureSkillLevel;
    private calculatePerformanceSkillLevel;
    private calculateDependencySkillLevel;
    private calculateWeightedSkillLevel;
    private calculateLearningImprovement;
    private categorizeSecuritySeverity;
    private calculateCutoffDate;
    private calculateRecentPRActivity;
}
