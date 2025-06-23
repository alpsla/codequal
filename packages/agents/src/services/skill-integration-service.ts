import { createLogger } from '@codequal/core/utils';
import { SkillTrackingService } from './skill-tracking-service';
import { PRSkillAssessmentService, PRMetadata } from './pr-skill-assessment-service';
import { RecommendationService } from './recommendation-service';
import { AuthenticatedUser } from '../types/auth-types';

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
export class SkillIntegrationService {
  private readonly logger = createLogger('SkillIntegrationService');
  private skillTrackingService: SkillTrackingService;
  private prSkillAssessmentService: PRSkillAssessmentService;
  private recommendationService: RecommendationService;

  constructor(private authenticatedUser: AuthenticatedUser) {
    this.skillTrackingService = new SkillTrackingService(authenticatedUser);
    this.prSkillAssessmentService = new PRSkillAssessmentService(authenticatedUser);
    this.recommendationService = new RecommendationService(authenticatedUser);
  }

  /**
   * Main integration method called by Result Orchestrator
   */
  async integrateSkillTracking(
    prAnalysis: any,
    prMetadata: PRMetadata,
    processedResults: any
  ): Promise<SkillIntegrationResult> {
    this.logger.info('Starting skill tracking integration', {
      prNumber: prMetadata.prNumber,
      repository: prMetadata.repository,
      userId: this.authenticatedUser.id
    });

    try {
      // 1. Assess and update skills based on PR analysis
      const skillAssessment = await this.prSkillAssessmentService.assessAndUpdateSkills(
        prAnalysis, 
        prMetadata
      );

      // 2. Generate skill-aware recommendations
      const personalizedRecommendations = await this.recommendationService.generateRecommendations(
        processedResults
      );

      // 3. Track educational engagement (will be done by Educational Agent)
      const engagementTracked = true;

      // 4. Get progression analytics
      const progressionAnalytics = await this.generateProgressionAnalytics();

      // 5. Check if learning path needs updating
      const learningPathUpdated = await this.shouldUpdateLearningPath(skillAssessment);

      const result: SkillIntegrationResult = {
        skillAssessment: {
          assessments: skillAssessment.assessments,
          skillsUpdated: skillAssessment.skillsUpdated,
          improvements: skillAssessment.improvements
        },
        personalizedRecommendations,
        learningPathUpdated,
        engagementTracked,
        progressionAnalytics
      };

      this.logger.info('Skill tracking integration completed', {
        skillsUpdated: skillAssessment.skillsUpdated.length,
        recommendationsGenerated: personalizedRecommendations.recommendations.length,
        overallTrend: progressionAnalytics.overallTrend
      });

      return result;

    } catch (error) {
      this.logger.error('Failed to integrate skill tracking', {
        error: error instanceof Error ? error.message : error,
        prNumber: prMetadata.prNumber
      });

      // Return minimal result on error
      return {
        skillAssessment: {
          assessments: [],
          skillsUpdated: [],
          improvements: {}
        },
        personalizedRecommendations: await this.recommendationService.generateRecommendations(processedResults),
        learningPathUpdated: false,
        engagementTracked: false,
        progressionAnalytics: {
          overallTrend: 'maintaining',
          focusAreas: [],
          nextMilestones: []
        }
      };
    }
  }

  /**
   * Generate comprehensive skill report for user dashboard
   */
  async generateSkillReport(): Promise<{
    currentSkills: any[];
    progressionTrends: Record<string, any>;
    learningPlan: any;
    achievements: string[];
    recommendations: string[];
  }> {
    const currentSkills = await this.skillTrackingService.getCurrentSkills();
    
    const progressionTrends: Record<string, any> = {};
    for (const skill of currentSkills) {
      progressionTrends[skill.categoryId] = await this.skillTrackingService.getSkillProgression(skill.categoryId);
    }

    const learningPlan = await this.prSkillAssessmentService.generateSkillDevelopmentPlan();
    const recommendations = await this.skillTrackingService.generateSkillBasedRecommendations();
    
    // Generate achievements based on skill improvements
    const achievements = this.generateAchievements(currentSkills, progressionTrends);

    return {
      currentSkills,
      progressionTrends,
      learningPlan,
      achievements,
      recommendations
    };
  }

  /**
   * Track skill improvement when user applies recommendations
   */
  async trackRecommendationApplication(
    recommendationId: string,
    applied: boolean,
    improvementObserved: boolean
  ): Promise<void> {
    this.logger.info('Tracking recommendation application', {
      recommendationId,
      applied,
      improvementObserved
    });

    if (applied) {
      const engagement = {
        educationalContentId: recommendationId,
        engagementType: 'applied' as const,
        skillsTargeted: ['general'], // Would need to map recommendation to skills
        improvementObserved,
        timestamp: new Date()
      };

      await this.skillTrackingService.trackLearningEngagement(engagement);
    }
  }

  /**
   * Get skill-based filtering for educational content
   */
  async getSkillBasedContentFiltering(): Promise<{
    difficultyPreferences: Record<string, 'beginner' | 'intermediate' | 'advanced'>;
    focusAreas: string[];
    avoidAreas: string[];
  }> {
    const currentSkills = await this.skillTrackingService.getCurrentSkills();
    
    const difficultyPreferences: Record<string, 'beginner' | 'intermediate' | 'advanced'> = {};
    const focusAreas: string[] = [];
    const avoidAreas: string[] = [];

    currentSkills.forEach(skill => {
      // Set difficulty preference based on skill level
      if (skill.level <= 3) {
        difficultyPreferences[skill.categoryId] = 'beginner';
        focusAreas.push(skill.categoryId); // Focus on weak areas
      } else if (skill.level <= 6) {
        difficultyPreferences[skill.categoryId] = 'intermediate';
      } else {
        difficultyPreferences[skill.categoryId] = 'advanced';
        avoidAreas.push(skill.categoryId); // Don't focus on strong areas
      }
    });

    return {
      difficultyPreferences,
      focusAreas,
      avoidAreas
    };
  }

  // Private helper methods

  private async generateProgressionAnalytics(): Promise<{
    overallTrend: 'improving' | 'maintaining' | 'declining';
    focusAreas: string[];
    nextMilestones: string[];
  }> {
    const analytics = await this.prSkillAssessmentService.getSkillProgressionAnalytics();
    
    // Identify focus areas (skills below level 5)
    const currentSkills = await this.skillTrackingService.getCurrentSkills();
    const focusAreas = currentSkills
      .filter(skill => skill.level < 5)
      .map(skill => skill.categoryId);

    // Generate next milestones
    const nextMilestones = currentSkills
      .filter(skill => skill.level < 8)
      .map(skill => `Reach level ${Math.min(skill.level + 2, 10)} in ${skill.categoryName}`)
      .slice(0, 3);

    return {
      overallTrend: analytics.overallTrend,
      focusAreas,
      nextMilestones
    };
  }

  private async shouldUpdateLearningPath(skillAssessment: any): Promise<boolean> {
    // Update learning path if significant skill changes occurred
    const significantChanges = Object.values(skillAssessment.improvements).some(
      (improvement: any) => Math.abs(improvement) >= 1
    );

    return significantChanges;
  }

  private generateAchievements(currentSkills: any[], progressionTrends: Record<string, any>): string[] {
    const achievements: string[] = [];

    currentSkills.forEach(skill => {
      const progression = progressionTrends[skill.categoryId];
      
      // Achievement for reaching milestones
      if (skill.level >= 5 && skill.level < 6) {
        achievements.push(`🎯 Reached intermediate level in ${skill.categoryName}`);
      } else if (skill.level >= 7) {
        achievements.push(`🌟 Achieved advanced proficiency in ${skill.categoryName}`);
      }

      // Achievement for consistent improvement
      if (progression?.trend === 'improving' && progression.improvement >= 1) {
        achievements.push(`📈 Steadily improving in ${skill.categoryName} (+${progression.improvement.toFixed(1)})`);
      }
    });

    // Achievement for overall progress
    const averageLevel = currentSkills.reduce((sum, skill) => sum + skill.level, 0) / currentSkills.length;
    if (averageLevel >= 6) {
      achievements.push('🏆 Strong overall development skills');
    }

    return achievements.slice(0, 5); // Limit to top 5 achievements
  }

  /**
   * Integration with Result Orchestrator
   * This method is called during the analysis pipeline
   */
  static async integrateWithResultOrchestrator(
    authenticatedUser: AuthenticatedUser,
    prAnalysis: any,
    prMetadata: PRMetadata,
    processedResults: any
  ): Promise<SkillIntegrationResult | null> {
    try {
      const skillIntegrationService = new SkillIntegrationService(authenticatedUser);
      return await skillIntegrationService.integrateSkillTracking(prAnalysis, prMetadata, processedResults);
    } catch (error) {
      const logger = createLogger('SkillIntegrationService');
      logger.warn('Skill integration failed, continuing without skill tracking', {
        error: error instanceof Error ? error.message : error,
        userId: authenticatedUser.id
      });
      return null;
    }
  }
}