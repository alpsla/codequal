import { RecommendationModule } from '../types/recommendation-types';
import { AuthenticatedUser } from '../multi-agent/types/auth';
/**
 * Compiled findings from all analysis agents
 */
export interface CompiledFindings {
    codeQuality: {
        complexityIssues: any[];
        maintainabilityIssues: any[];
        codeSmells: any[];
        patterns: string[];
    };
    security: {
        vulnerabilities: any[];
        securityPatterns: string[];
        complianceIssues: any[];
        threatLandscape: any[];
    };
    architecture: {
        designPatternViolations: any[];
        technicalDebt: any[];
        refactoringOpportunities: any[];
        architecturalDecisions: any[];
    };
    performance: {
        performanceIssues: any[];
        optimizationOpportunities: any[];
        bottlenecks: any[];
        benchmarkResults: any[];
    };
    dependency: {
        vulnerabilityIssues: any[];
        licenseIssues: any[];
        outdatedPackages: any[];
        conflictResolution: any[];
    };
    criticalIssues: any[];
    learningOpportunities: LearningOpportunity[];
    knowledgeGaps: string[];
}
/**
 * Learning opportunity identified from analysis
 */
export interface LearningOpportunity {
    topic: string;
    context: any[];
    learningLevel: 'beginner' | 'intermediate' | 'advanced';
    priority: 'low' | 'medium' | 'high';
    category: 'code_quality' | 'security' | 'architecture' | 'performance' | 'dependency';
}
/**
 * Educational content types
 */
export interface EducationalContent {
    explanations: Array<{
        concept: string;
        simpleExplanation: string;
        technicalDetails: string;
        whyItMatters: string;
        examples: CodeExample[];
    }>;
    tutorials: Array<{
        title: string;
        difficulty: 'beginner' | 'intermediate' | 'advanced';
        steps: string[];
        codeExamples: CodeExample[];
        expectedOutcome: string;
    }>;
    bestPractices: Array<{
        practice: string;
        rationale: string;
        implementation: string;
        commonMistakes: string[];
        examples: CodeExample[];
    }>;
    resources: Array<{
        type: 'documentation' | 'tutorial' | 'video' | 'book' | 'course';
        title: string;
        url?: string;
        description: string;
        difficulty: string;
        status?: 'available' | 'research_requested';
        requestId?: string;
    }>;
}
/**
 * Code example for educational content
 */
export interface CodeExample {
    title: string;
    language: string;
    code: string;
    explanation: string;
    type: 'good' | 'bad' | 'before' | 'after';
}
/**
 * Educational analysis result
 */
export interface EducationalResult {
    learningPath: {
        title: string;
        description: string;
        estimatedTime: string;
        difficulty: 'beginner' | 'intermediate' | 'advanced';
        steps: string[];
    };
    explanations: EducationalContent['explanations'];
    tutorials: EducationalContent['tutorials'];
    bestPractices: EducationalContent['bestPractices'];
    additionalResources: EducationalContent['resources'];
    metadata?: {
        costOptimization?: any;
        [key: string]: any;
    };
    content?: {
        resources?: any;
        [key: string]: any;
    };
    skillGaps: string[];
    recommendedNextSteps: string[];
    relatedTopics: string[];
}
export declare class EducationalAgent {
    private vectorDB;
    private researcherAgent?;
    private authenticatedUser?;
    private readonly logger;
    private educationalContentService?;
    private skillTrackingService?;
    constructor(vectorDB: any, // Vector database for educational content
    researcherAgent?: any | undefined, // Optional researcher for missing content
    authenticatedUser?: AuthenticatedUser | undefined);
    /**
     * NEW: Analyze recommendations with orchestrator-provided tool results
     * This follows the proper architectural pattern where tools are managed by orchestrator
     */
    analyzeFromRecommendationsWithTools(recommendations: RecommendationModule, toolResults: any): Promise<EducationalResult>;
    /**
     * LEGACY: Analyze recommendations and generate educational content
     * Kept for backward compatibility
     */
    analyzeFromRecommendations(recommendations: RecommendationModule): Promise<EducationalResult>;
    /**
     * LEGACY: Analyze compiled findings and generate educational content
     * Kept for backward compatibility
     */
    analyze(compiledFindings: CompiledFindings): Promise<EducationalResult>;
    /**
     * Create skill-aware learning path that adapts to user's current abilities
     */
    private createSkillAwareLearningPath;
    /**
     * Gather educational content with orchestrator-provided tool results
     */
    private gatherSkillAwareEducationalContentWithTools;
    /**
     * Gather educational content adapted to user's skill levels
     */
    private gatherSkillAwareEducationalContent;
    /**
     * Identify comprehensive skill gaps combining recommendations with current skills
     */
    private identifyComprehensiveSkillGaps;
    /**
     * Track educational engagement for skill progression
     */
    private trackEducationalEngagement;
    /**
     * Generate skill-aware next steps
     */
    private generateSkillAwareNextSteps;
    private calculateSkillAwareTime;
    private createSkillAdaptedExplanation;
    private createSkillAdaptedTutorial;
    private createSkillAdaptedBestPractice;
    private getSkillAppropriateResources;
    private generateSkillGapDescription;
    private isPrerequisiteGap;
    private generateBeginnerResourceUrl;
    private generateAdvancedResourceUrl;
    /**
     * Extract learning opportunities from compiled findings with tool awareness
     */
    private extractLearningOpportunities;
    /**
     * Gather educational content from Vector DB and research requests
     */
    private gatherEducationalContent;
    /**
     * Search Vector DB for educational content
     */
    private searchEducationalContent;
    /**
     * Request researcher to gather educational content
     */
    private requestResearcherContent;
    /**
     * Enhance educational content with tool-specific insights
     */
    private enhanceWithToolInsights;
    /**
     * Extract tool-specific findings from compiled findings
     */
    private extractToolFindings;
    /**
     * Create learning path from opportunities
     */
    private createLearningPath;
    /**
     * Identify skill gaps from findings
     */
    private identifySkillGaps;
    /**
     * Generate next steps recommendations
     */
    private generateNextStepsLegacy;
    /**
     * Find related topics for further learning
     */
    private findRelatedTopics;
    private formatSearchResults;
    private estimateLearningTime;
    private getMaxDifficulty;
    /**
     * Create learning path from structured recommendations
     */
    private createLearningPathFromRecommendations;
    /**
     * Gather educational content based on recommendations
     */
    private gatherEducationalContentFromRecommendations;
    /**
     * Create educational explanation from recommendation
     */
    private createExplanationFromRecommendation;
    /**
     * Create tutorial from recommendation action steps
     */
    private createTutorialFromRecommendation;
    /**
     * Create best practice from recommendation
     */
    private createBestPracticeFromRecommendation;
    /**
     * Identify skill gaps from recommendations
     */
    private identifySkillGapsFromRecommendations;
    /**
     * Extract related topics from recommendations
     */
    private extractRelatedTopics;
    /**
     * Generate next steps from recommendations
     */
    private generateNextSteps;
    /**
     * Helper methods for recommendation-based processing
     */
    private mapCategoryToTopic;
    private generateExampleCode;
    private generateResourceUrl;
}
