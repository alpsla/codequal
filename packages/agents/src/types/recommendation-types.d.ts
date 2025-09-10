/**
 * Recommendation Module Types
 * Defines the structured recommendations that feed into the Educational Agent
 */
export interface RecommendationPriority {
    level: 'critical' | 'high' | 'medium' | 'low';
    score: number;
    urgency: 'immediate' | 'next_sprint' | 'backlog';
    justification?: string;
}
export interface ActionableRecommendation {
    id: string;
    title: string;
    description: string;
    category: 'security' | 'performance' | 'architecture' | 'codeQuality' | 'dependency';
    priority: RecommendationPriority;
    actionSteps: {
        step: number;
        action: string;
        estimatedEffort: string;
        toolsRequired?: string[];
    }[];
    learningContext: {
        skillLevel: 'beginner' | 'intermediate' | 'advanced';
        prerequisites: string[];
        relatedConcepts: string[];
        difficultyScore: number;
    };
    evidence: {
        findingIds: string[];
        affectedFiles: string[];
        impact: string;
        riskLevel: string;
    };
    successCriteria: {
        measurable: string[];
        testable: string[];
    };
}
export interface RecommendationModule {
    summary: {
        totalRecommendations: number;
        priorityBreakdown: {
            critical: number;
            high: number;
            medium: number;
            low: number;
        };
        estimatedTotalEffort: string;
        focusAreas: string[];
        description: string;
    };
    recommendations: ActionableRecommendation[];
    learningPathGuidance: {
        suggestedOrder: string[];
        parallelizable: string[][];
        dependencies: Record<string, string[]>;
    };
    metadata: {
        generatedAt: Date;
        basedOnFindings: number;
        confidence: number;
        generationMethod: 'ai_analysis' | 'rule_based' | 'hybrid';
    };
}
