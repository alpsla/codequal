import { AuthenticatedUser } from '../multi-agent/types/auth';
/**
 * Skill-aware query enhancement
 */
export interface SkillAwareQueryResult {
    originalQuery: string;
    enhancedQuery: string;
    difficultyFilter: 'beginner' | 'intermediate' | 'advanced' | null;
    skillContext: {
        userLevel: number;
        categoryLevels: Record<string, number>;
        focusAreas: string[];
        strongAreas: string[];
    };
    learningIntent: boolean;
    personalizationApplied: string[];
}
/**
 * Enhanced search results with skill adaptation
 */
export interface SkillAwareSearchResult {
    content: string;
    score: number;
    skillAdjustedScore: number;
    metadata: any;
    skillRelevance: {
        appropriateLevel: boolean;
        skillGap: number;
        learningOpportunity: boolean;
        recommendedPrerequisites: string[];
    };
    personalizedRanking: number;
}
/**
 * Service that enhances RAG queries and results with user skill context
 */
export declare class SkillAwareRAGService {
    private authenticatedUser;
    private readonly logger;
    private skillTrackingService;
    constructor(authenticatedUser: AuthenticatedUser);
    /**
     * Enhance a search query with user skill context
     */
    enhanceQueryWithSkills(originalQuery: string): Promise<SkillAwareQueryResult>;
    /**
     * Re-rank search results based on user skill appropriateness
     */
    reRankResultsWithSkills(results: any[], queryEnhancement: SkillAwareQueryResult): Promise<SkillAwareSearchResult[]>;
    /**
     * Generate skill-based learning recommendations from search results
     */
    generateLearningRecommendations(searchResults: SkillAwareSearchResult[], queryEnhancement: SkillAwareQueryResult): Promise<{
        recommendations: string[];
        prerequisites: string[];
        nextSteps: string[];
        difficultyProgression: string[];
    }>;
    /**
     * Track search engagement for skill improvement
     */
    trackSearchEngagement(query: string, resultsInteracted: SkillAwareSearchResult[], learningObserved: boolean): Promise<void>;
    private buildSkillContext;
    private analyzeQueryRequirements;
    private detectLearningIntent;
    private buildSkillAwareQuery;
    private determineDifficultyFilter;
    private getPersonalizationStrategies;
    private calculateSkillRelevance;
    private adjustScoreForSkills;
    private calculatePersonalizedRanking;
    private estimateContentDifficulty;
    private inferSkillsFromQuery;
    private inferCategoryFromContent;
}
