import { createLogger } from '@codequal/core/utils';
import { SkillTrackingService } from './skill-tracking-service';
import { AuthenticatedUser } from '../types/auth-types';
import { DeveloperSkill } from '@codequal/database/models/skill';

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
export class SkillAwareRAGService {
  private readonly logger = createLogger('SkillAwareRAGService');
  private skillTrackingService: SkillTrackingService;

  constructor(private authenticatedUser: AuthenticatedUser) {
    this.skillTrackingService = new SkillTrackingService(authenticatedUser);
  }

  /**
   * Enhance a search query with user skill context
   */
  async enhanceQueryWithSkills(originalQuery: string): Promise<SkillAwareQueryResult> {
    this.logger.info('Enhancing query with skill context', {
      originalQuery,
      userId: this.authenticatedUser.id
    });

    try {
      // Get user's current skills
      const userSkills = await this.skillTrackingService.getCurrentSkills();
      const skillContext = this.buildSkillContext(userSkills);

      // Analyze query intent and required skill level
      const queryAnalysis = this.analyzeQueryRequirements(originalQuery);
      
      // Determine if this is a learning-focused query
      const learningIntent = this.detectLearningIntent(originalQuery);

      // Build enhanced query based on skill level
      const enhancedQuery = this.buildSkillAwareQuery(
        originalQuery, 
        skillContext, 
        queryAnalysis, 
        learningIntent
      );

      // Determine appropriate difficulty filter
      const difficultyFilter = this.determineDifficultyFilter(
        queryAnalysis, 
        skillContext, 
        learningIntent
      );

      const personalizationApplied = this.getPersonalizationStrategies(
        skillContext, 
        queryAnalysis, 
        learningIntent
      );

      return {
        originalQuery,
        enhancedQuery,
        difficultyFilter,
        skillContext,
        learningIntent,
        personalizationApplied
      };

    } catch (error) {
      this.logger.warn('Failed to enhance query with skills, using original query', {
        error: error instanceof Error ? error.message : error
      });

      return {
        originalQuery,
        enhancedQuery: originalQuery,
        difficultyFilter: null,
        skillContext: {
          userLevel: 5,
          categoryLevels: {},
          focusAreas: [],
          strongAreas: []
        },
        learningIntent: false,
        personalizationApplied: []
      };
    }
  }

  /**
   * Re-rank search results based on user skill appropriateness
   */
  async reRankResultsWithSkills(
    results: any[],
    queryEnhancement: SkillAwareQueryResult
  ): Promise<SkillAwareSearchResult[]> {
    this.logger.info('Re-ranking results with skill context', {
      resultCount: results.length,
      userLevel: queryEnhancement.skillContext.userLevel
    });

    const skillAwareResults: SkillAwareSearchResult[] = [];

    for (const result of results) {
      const skillRelevance = this.calculateSkillRelevance(result, queryEnhancement.skillContext);
      const skillAdjustedScore = this.adjustScoreForSkills(
        result.score, 
        skillRelevance, 
        queryEnhancement.learningIntent
      );
      
      const personalizedRanking = this.calculatePersonalizedRanking(
        result, 
        skillRelevance, 
        queryEnhancement
      );

      skillAwareResults.push({
        content: result.content,
        score: result.score,
        skillAdjustedScore,
        metadata: result.metadata,
        skillRelevance,
        personalizedRanking
      });
    }

    // Sort by personalized ranking
    return skillAwareResults.sort((a, b) => b.personalizedRanking - a.personalizedRanking);
  }

  /**
   * Generate skill-based learning recommendations from search results
   */
  async generateLearningRecommendations(
    searchResults: SkillAwareSearchResult[],
    queryEnhancement: SkillAwareQueryResult
  ): Promise<{
    recommendations: string[];
    prerequisites: string[];
    nextSteps: string[];
    difficultyProgression: string[];
  }> {
    const recommendations: string[] = [];
    const prerequisites = new Set<string>();
    const nextSteps: string[] = [];
    const difficultyProgression: string[] = [];

    // Analyze results for learning opportunities
    for (const result of searchResults.slice(0, 5)) { // Top 5 results
      if (result.skillRelevance.learningOpportunity) {
        recommendations.push(
          `Study ${result.metadata.title || 'this content'} to improve understanding of ${queryEnhancement.originalQuery}`
        );
      }

      // Collect prerequisites
      result.skillRelevance.recommendedPrerequisites.forEach(prereq => {
        prerequisites.add(prereq);
      });

      // Add skill gap recommendations
      if (result.skillRelevance.skillGap > 2) {
        const category = this.inferCategoryFromContent(result.content, result.metadata);
        recommendations.push(
          `Focus on foundational ${category} skills before attempting this content`
        );
      }
    }

    // Generate next steps based on current skill levels
    const focusAreas = queryEnhancement.skillContext.focusAreas;
    for (const area of focusAreas.slice(0, 3)) {
      nextSteps.push(`Continue practicing ${area} concepts with real examples`);
    }

    // Build difficulty progression path
    if (queryEnhancement.difficultyFilter === 'beginner') {
      difficultyProgression.push(
        'Start with basic concepts and simple examples',
        'Practice with guided tutorials',
        'Move to intermediate topics when comfortable'
      );
    } else if (queryEnhancement.difficultyFilter === 'intermediate') {
      difficultyProgression.push(
        'Apply concepts to real projects',
        'Explore best practices and patterns',
        'Consider advanced optimization techniques'
      );
    } else {
      difficultyProgression.push(
        'Focus on optimization and scalability',
        'Contribute to open source projects',
        'Mentor others and document patterns'
      );
    }

    return {
      recommendations,
      prerequisites: Array.from(prerequisites),
      nextSteps,
      difficultyProgression
    };
  }

  /**
   * Track search engagement for skill improvement
   */
  async trackSearchEngagement(
    query: string,
    resultsInteracted: SkillAwareSearchResult[],
    learningObserved: boolean
  ): Promise<void> {
    if (resultsInteracted.length === 0) return;

    try {
      // Infer skills targeted by the search
      const skillsTargeted = this.inferSkillsFromQuery(query);
      
      const engagement = {
        educationalContentId: `search-${Date.now()}`,
        engagementType: 'viewed' as const,
        skillsTargeted,
        improvementObserved: learningObserved,
        timestamp: new Date()
      };

      await this.skillTrackingService.trackLearningEngagement(engagement);

      this.logger.info('Tracked search engagement', {
        query,
        skillsTargeted,
        interactionCount: resultsInteracted.length
      });

    } catch (error) {
      this.logger.warn('Failed to track search engagement', {
        error: error instanceof Error ? error.message : error
      });
    }
  }

  // Private helper methods

  private buildSkillContext(userSkills: DeveloperSkill[]): any {
    const categoryLevels = userSkills.reduce((acc, skill) => {
      acc[skill.categoryId] = skill.level;
      return acc;
    }, {} as Record<string, number>);

    const averageLevel = userSkills.length > 0
      ? userSkills.reduce((sum, skill) => sum + skill.level, 0) / userSkills.length
      : 5;

    const focusAreas = userSkills
      .filter(skill => skill.level < 5)
      .map(skill => skill.categoryId);

    const strongAreas = userSkills
      .filter(skill => skill.level >= 7)
      .map(skill => skill.categoryId);

    return {
      userLevel: Math.round(averageLevel),
      categoryLevels,
      focusAreas,
      strongAreas
    };
  }

  private analyzeQueryRequirements(query: string): {
    estimatedDifficulty: number;
    requiredSkills: string[];
    isAdvancedTopic: boolean;
  } {
    const advancedKeywords = ['optimization', 'performance', 'scalability', 'architecture', 'design patterns', 'advanced'];
    const beginnerKeywords = ['tutorial', 'basics', 'getting started', 'introduction', 'beginner'];
    
    const lowerQuery = query.toLowerCase();
    const isAdvanced = advancedKeywords.some(keyword => lowerQuery.includes(keyword));
    const isBeginner = beginnerKeywords.some(keyword => lowerQuery.includes(keyword));

    let estimatedDifficulty = 5; // Default intermediate
    if (isBeginner) estimatedDifficulty = 2;
    else if (isAdvanced) estimatedDifficulty = 8;

    // Infer required skills from query content
    const requiredSkills = this.inferSkillsFromQuery(query);

    return {
      estimatedDifficulty,
      requiredSkills,
      isAdvancedTopic: isAdvanced
    };
  }

  private detectLearningIntent(query: string): boolean {
    const learningIndicators = [
      'how to', 'tutorial', 'learn', 'guide', 'example', 'explain',
      'understand', 'basics', 'introduction', 'getting started'
    ];
    
    const lowerQuery = query.toLowerCase();
    return learningIndicators.some(indicator => lowerQuery.includes(indicator));
  }

  private buildSkillAwareQuery(
    originalQuery: string,
    skillContext: any,
    queryAnalysis: any,
    learningIntent: boolean
  ): string {
    let enhancedQuery = originalQuery;

    // Add skill level context
    if (skillContext.userLevel <= 3 && learningIntent) {
      enhancedQuery += ' beginner tutorial basics';
    } else if (skillContext.userLevel >= 7 && queryAnalysis.isAdvancedTopic) {
      enhancedQuery += ' advanced optimization best practices';
    }

    // Add focus area boosting
    if (skillContext.focusAreas.length > 0 && learningIntent) {
      const relevantFocusAreas = skillContext.focusAreas.filter((area: string) =>
        originalQuery.toLowerCase().includes(area)
      );
      if (relevantFocusAreas.length > 0) {
        enhancedQuery += ` ${relevantFocusAreas.join(' ')} fundamentals`;
      }
    }

    return enhancedQuery;
  }

  private determineDifficultyFilter(
    queryAnalysis: any,
    skillContext: any,
    learningIntent: boolean
  ): 'beginner' | 'intermediate' | 'advanced' | null {
    if (!learningIntent) return null;

    const userLevel = skillContext.userLevel;
    const queryDifficulty = queryAnalysis.estimatedDifficulty;

    // If user is beginner, prefer beginner content even for advanced topics
    if (userLevel <= 3) return 'beginner';
    
    // If user is advanced and query is advanced, show advanced content
    if (userLevel >= 7 && queryDifficulty >= 7) return 'advanced';
    
    // Default to intermediate
    return 'intermediate';
  }

  private getPersonalizationStrategies(
    skillContext: any,
    queryAnalysis: any,
    learningIntent: boolean
  ): string[] {
    const strategies: string[] = [];

    if (learningIntent) strategies.push('learning-focused');
    if (skillContext.userLevel <= 3) strategies.push('beginner-friendly');
    if (skillContext.userLevel >= 7) strategies.push('advanced-optimization');
    if (skillContext.focusAreas.length > 0) strategies.push('focus-area-boosting');
    if (queryAnalysis.isAdvancedTopic) strategies.push('complexity-aware');

    return strategies;
  }

  private calculateSkillRelevance(result: any, skillContext: any): any {
    const contentDifficulty = this.estimateContentDifficulty(result);
    const userLevel = skillContext.userLevel;
    const skillGap = Math.abs(contentDifficulty - userLevel);
    
    const appropriateLevel = skillGap <= 2; // Within 2 levels is appropriate
    const learningOpportunity = skillGap > 0 && skillGap <= 3; // Can learn from it
    
    const recommendedPrerequisites: string[] = [];
    if (skillGap > 3) {
      recommendedPrerequisites.push(`Build foundational skills (current gap: ${skillGap} levels)`);
    }

    return {
      appropriateLevel,
      skillGap,
      learningOpportunity,
      recommendedPrerequisites
    };
  }

  private adjustScoreForSkills(
    originalScore: number,
    skillRelevance: any,
    learningIntent: boolean
  ): number {
    let adjustedScore = originalScore;

    // Boost appropriate level content
    if (skillRelevance.appropriateLevel) {
      adjustedScore *= 1.2;
    }

    // Boost learning opportunities for learning queries
    if (learningIntent && skillRelevance.learningOpportunity) {
      adjustedScore *= 1.3;
    }

    // Penalize content that's too advanced or too basic
    if (skillRelevance.skillGap > 4) {
      adjustedScore *= 0.7;
    }

    return Math.min(adjustedScore, 1.0);
  }

  private calculatePersonalizedRanking(
    result: any,
    skillRelevance: any,
    queryEnhancement: SkillAwareQueryResult
  ): number {
    let ranking = result.score * 100; // Base ranking

    // Apply skill adjustments
    ranking *= (skillRelevance.appropriateLevel ? 1.2 : 0.8);
    
    // Learning intent boosts
    if (queryEnhancement.learningIntent && skillRelevance.learningOpportunity) {
      ranking *= 1.3;
    }

    // Focus area relevance
    const category = this.inferCategoryFromContent(result.content, result.metadata);
    if (queryEnhancement.skillContext.focusAreas.includes(category)) {
      ranking *= 1.15;
    }

    return ranking;
  }

  private estimateContentDifficulty(result: any): number {
    // Simple heuristic based on content and metadata
    const content = result.content.toLowerCase();
    const metadata = result.metadata || {};

    let difficulty = 5; // Default intermediate

    // Check for difficulty indicators
    if (content.includes('basic') || content.includes('tutorial') || content.includes('introduction')) {
      difficulty = 2;
    } else if (content.includes('advanced') || content.includes('optimization') || content.includes('complex')) {
      difficulty = 8;
    }

    // Adjust based on metadata
    if (metadata.difficulty) {
      const difficultyMap = { beginner: 2, intermediate: 5, advanced: 8 };
      difficulty = difficultyMap[metadata.difficulty as keyof typeof difficultyMap] || difficulty;
    }

    return difficulty;
  }

  private inferSkillsFromQuery(query: string): string[] {
    const lowerQuery = query.toLowerCase();
    const skills: string[] = [];

    if (lowerQuery.includes('security') || lowerQuery.includes('auth') || lowerQuery.includes('jwt')) {
      skills.push('security');
    }
    if (lowerQuery.includes('performance') || lowerQuery.includes('optimization') || lowerQuery.includes('speed')) {
      skills.push('performance');
    }
    if (lowerQuery.includes('architecture') || lowerQuery.includes('design') || lowerQuery.includes('pattern')) {
      skills.push('architecture');
    }
    if (lowerQuery.includes('dependency') || lowerQuery.includes('package') || lowerQuery.includes('npm')) {
      skills.push('dependency');
    }
    if (lowerQuery.includes('code') || lowerQuery.includes('refactor') || lowerQuery.includes('clean')) {
      skills.push('codeQuality');
    }

    return skills.length > 0 ? skills : ['general'];
  }

  private inferCategoryFromContent(content: string, metadata: any): string {
    // Simple category inference logic
    const lowerContent = content.toLowerCase();
    
    if (lowerContent.includes('security') || lowerContent.includes('auth')) return 'security';
    if (lowerContent.includes('performance') || lowerContent.includes('optimization')) return 'performance';
    if (lowerContent.includes('architecture') || lowerContent.includes('design')) return 'architecture';
    if (lowerContent.includes('dependency') || lowerContent.includes('package')) return 'dependency';
    
    return 'codeQuality';
  }
}