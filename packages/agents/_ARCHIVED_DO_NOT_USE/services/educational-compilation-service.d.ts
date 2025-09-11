/**
 * Educational Compilation Service
 * Compiles and structures educational content with other analysis results
 * Ready for Reporter Agent consumption
 */
import { EducationalResult } from '../multi-agent/educational-agent';
import { RecommendationModule } from '../types/recommendation-types';
/**
 * Compiled educational data structure ready for Reporter Agent
 */
export interface CompiledEducationalData {
    educational: {
        learningPath: {
            title: string;
            description: string;
            totalSteps: number;
            estimatedTime: string;
            difficulty: 'beginner' | 'intermediate' | 'advanced';
            steps: Array<{
                stepNumber: number;
                title: string;
                category: string;
                difficulty: string;
                estimatedTime: string;
                priority: 'critical' | 'high' | 'medium' | 'low';
            }>;
        };
        content: {
            explanations: Array<{
                id: string;
                concept: string;
                category: string;
                difficulty: string;
                summary: string;
                technicalDetails: string;
                whyItMatters: string;
                codeExamples: any[];
            }>;
            tutorials: Array<{
                id: string;
                title: string;
                category: string;
                difficulty: string;
                estimatedTime: string;
                totalSteps: number;
                prerequisites: string[];
                outcome: string;
                actionableSteps: any[];
            }>;
            bestPractices: Array<{
                id: string;
                title: string;
                category: string;
                difficulty: string;
                guidelines: string[];
                antiPatterns: string[];
                tools: string[];
                applicability: string;
            }>;
            resources: Array<{
                id: string;
                type: string;
                title: string;
                category: string;
                url?: string;
                description: string;
                difficulty: string;
                estimatedTime: string;
                relevanceScore: number;
            }>;
        };
        insights: {
            skillGaps: Array<{
                skill: string;
                category: string;
                priority: string;
                description: string;
                learningResources: string[];
            }>;
            relatedTopics: Array<{
                topic: string;
                category: string;
                relevance: number;
                description: string;
            }>;
            nextSteps: Array<{
                step: string;
                category: string;
                priority: string;
                estimatedEffort: string;
                dependencies: string[];
            }>;
        };
    };
    recommendationMapping: {
        totalRecommendations: number;
        priorityBreakdown: Record<string, number>;
        categoryBreakdown: Record<string, number>;
        learningPathMapping: Array<{
            recommendationId: string;
            learningStepIndex: number;
            contentIds: string[];
        }>;
    };
    metadata: {
        compiledAt: Date;
        sourceDataQuality: {
            recommendationConfidence: number;
            educationalContentCoverage: number;
            totalDataPoints: number;
        };
        processingInfo: {
            recommendationsProcessed: number;
            educationalItemsGenerated: number;
            compilationMethod: string;
        };
    };
}
/**
 * Service for compiling educational content with analysis results
 */
export declare class EducationalCompilationService {
    /**
     * Compile educational content with recommendations and analysis results
     */
    compileEducationalData(educationalResult: EducationalResult, recommendationModule: RecommendationModule, analysisResults: any): Promise<CompiledEducationalData>;
    /**
     * Compile learning path with enhanced metadata
     */
    private compileLearningPath;
    /**
     * Compile educational content with IDs and metadata
     */
    private compileEducationalContent;
    /**
     * Compile educational insights
     */
    private compileEducationalInsights;
    /**
     * Create mapping between recommendations and educational content
     */
    private createRecommendationMapping;
    /**
     * Generate compilation metadata
     */
    private generateCompilationMetadata;
    private inferCategory;
    private inferDifficulty;
    private inferCategoryFromSkill;
    private inferPriorityFromSkill;
    private generateSkillGapDescription;
    private findRelatedResources;
    private inferCategoryFromTopic;
    private calculateTopicRelevance;
    private generateTopicDescription;
    private findRelatedRecommendation;
    private estimateStepEffort;
    private findStepDependencies;
    private findRelatedContentIds;
    private calculateCategoryBreakdown;
    private calculateContentCoverage;
    private calculateRelevanceScore;
}
