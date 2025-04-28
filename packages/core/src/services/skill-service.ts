import { AnalysisResult, Insight } from '../types/agent';
import { createLogger } from '../utils';

// Define interfaces for the SkillModel
interface SkillCategory {
  id: string;
  name: string;
}

interface UserSkill {
  id: string;
  categoryId: string;
  categoryName: string;
  level: number;
}

interface SkillHistoryEntry {
  id: string;
  level: number;
  evidenceType: string;
  createdAt: Date;
}

interface SkillModelInterface {
  getAllCategories(): Promise<SkillCategory[]>;
  getUserSkills(userId: string): Promise<UserSkill[]>;
  updateSkill(skillId: string, level: number, evidenceType: string, evidenceId: string): Promise<void>;
  getSkillHistory(skillId: string): Promise<SkillHistoryEntry[]>;
}

// Import implementation (to be injected in a production environment)
/* eslint-disable @typescript-eslint/no-var-requires */
const SkillModel: SkillModelInterface = require('../../../database/src/models/skill').SkillModel;
/* eslint-enable @typescript-eslint/no-var-requires */

// Create logger
const logger = createLogger('SkillService');

/**
 * Service for managing developer skills
 */
export class SkillService {
  // Mapping of insight types to skill categories
  private skillCategoryMap: Map<string, string> = new Map();
  
  constructor() {
    this.initializeSkillMap();
  }
  
  /**
   * Initialize skill category mapping
   */
  private async initializeSkillMap(): Promise<void> {
    try {
      // Get all skill categories
      const categories = await SkillModel.getAllCategories();
      
      // Create mapping from insight types to category IDs
      const mappings: [string, string][] = [
        // Security skills
        ['security', categories.find((c: SkillCategory) => c.name === 'Security')?.id || ''],
        ['sql_injection', categories.find((c: SkillCategory) => c.name === 'Security')?.id || ''],
        ['xss', categories.find((c: SkillCategory) => c.name === 'Security')?.id || ''],
        ['authentication', categories.find((c: SkillCategory) => c.name === 'Security')?.id || ''],
        
        // Performance skills
        ['performance', categories.find((c: SkillCategory) => c.name === 'Performance')?.id || ''],
        ['memory_leak', categories.find((c: SkillCategory) => c.name === 'Performance')?.id || ''],
        ['complexity', categories.find((c: SkillCategory) => c.name === 'Performance')?.id || ''],
        
        // Code quality skills
        ['code_quality', categories.find((c: SkillCategory) => c.name === 'Code Quality')?.id || ''],
        ['readability', categories.find((c: SkillCategory) => c.name === 'Code Quality')?.id || ''],
        ['maintainability', categories.find((c: SkillCategory) => c.name === 'Code Quality')?.id || ''],
        
        // Dependency skills
        ['dependency', categories.find((c: SkillCategory) => c.name === 'Dependencies')?.id || ''],
        ['library', categories.find((c: SkillCategory) => c.name === 'Dependencies')?.id || ''],
        ['version', categories.find((c: SkillCategory) => c.name === 'Dependencies')?.id || ''],
      ];
      
      // Fill the map
      for (const [insightType, categoryId] of mappings) {
        if (categoryId) {
          this.skillCategoryMap.set(insightType.toLowerCase(), categoryId);
        }
      }
    } catch (error) {
      logger.error('Error initializing skill map:', error);
    }
  }
  
  /**
   * Update user skills based on analysis results
   * @param userId User ID
   * @param analysisResult Analysis result
   * @param prReviewId PR review ID
   */
  async updateUserSkills(
    userId: string,
    analysisResult: AnalysisResult,
    prReviewId: string
  ): Promise<void> {
    try {
      // Ensure skill map is initialized
      if (this.skillCategoryMap.size === 0) {
        await this.initializeSkillMap();
      }
      
      // Get user's current skills
      const userSkills = await SkillModel.getUserSkills(userId);
      
      // Calculate skill adjustments based on insights
      const skillAdjustments = this.calculateSkillAdjustments(analysisResult.insights);
      
      // Apply adjustments to user skills
      for (const [categoryId, adjustment] of Object.entries(skillAdjustments)) {
        // Find existing skill or create new one
        const existingSkill = userSkills.find((s: UserSkill) => s.categoryId === categoryId);
        
        if (existingSkill) {
          // Calculate new level (clamped between 1 and 5)
          const newLevel = Math.max(1, Math.min(5, existingSkill.level + adjustment));
          
          // Update if level changed
          if (newLevel !== existingSkill.level) {
            await SkillModel.updateSkill(
              existingSkill.id,
              newLevel,
              'pr_review',
              prReviewId
            );
          }
        } else {
          // Create new skill
          // This would typically involve creating the skill first, then adding history
          // For simplicity, we're skipping this implementation detail here
          logger.info(`Would create new skill for user ${userId}, category ${categoryId}`);
        }
      }
    } catch (error) {
      logger.error('Error updating user skills:', error);
    }
  }
  
  /**
   * Calculate skill adjustments based on insights
   * @param insights Analysis insights
   * @returns Skill adjustments by category ID
   */
  private calculateSkillAdjustments(insights: Insight[]): Record<string, number> {
    const adjustments: Record<string, number> = {};
    
    for (const insight of insights) {
      // Get category ID for this insight type
      const categoryId = this.mapInsightToSkillCategory(insight);
      if (!categoryId) continue;
      
      // Calculate adjustment based on severity
      let adjustment = 0;
      
      switch (insight.severity) {
        case 'high':
          // High severity issues indicate significant skill gaps
          adjustment = -0.2;
          break;
        case 'medium':
          // Medium severity issues indicate minor skill gaps
          adjustment = -0.1;
          break;
        case 'low':
          // Low severity issues indicate awareness of best practices
          adjustment = 0.1;
          break;
      }
      
      // Add to category adjustments
      adjustments[categoryId] = (adjustments[categoryId] || 0) + adjustment;
    }
    
    return adjustments;
  }
  
  /**
   * Map insight to skill category
   * @param insight Analysis insight
   * @returns Skill category ID or null
   */
  private mapInsightToSkillCategory(insight: Insight): string | null {
    // Try direct mapping first
    if (this.skillCategoryMap.has(insight.type.toLowerCase())) {
      return this.skillCategoryMap.get(insight.type.toLowerCase()) || null;
    }
    
    // Try keyword matching in type and message
    const textToMatch = `${insight.type} ${insight.message}`.toLowerCase();
    
    for (const [keyword, categoryId] of this.skillCategoryMap.entries()) {
      if (textToMatch.includes(keyword)) {
        return categoryId;
      }
    }
    
    return null;
  }
  
  /**
   * Get skill trends for a user
   * @param userId User ID
   * @param timeRange Time range ('week', 'month', 'year')
   * @returns Skill trends
   */
  async getUserSkillTrends(
    userId: string,
    timeRange: 'week' | 'month' | 'year' = 'month'
  ): Promise<Record<string, unknown>[]> {
    // Get user skills
    const userSkills = await SkillModel.getUserSkills(userId);
    
    // Get skill history for each skill
    const skillTrends = await Promise.all(
      userSkills.map(async (skill: UserSkill) => {
        const history = await SkillModel.getSkillHistory(skill.id);
        
        // Filter by time range
        const filteredHistory = this.filterHistoryByTimeRange(history, timeRange);
        
        return {
          skill: {
            id: skill.id,
            categoryId: skill.categoryId,
            categoryName: skill.categoryName,
            currentLevel: skill.level
          },
          history: filteredHistory.map((entry: SkillHistoryEntry) => ({
            date: entry.createdAt,
            level: entry.level,
            evidenceType: entry.evidenceType
          }))
        };
      })
    );
    
    return skillTrends;
  }
  
  /**
   * Filter skill history by time range
   * @param history Skill history entries
   * @param timeRange Time range
   * @returns Filtered history
   */
  private filterHistoryByTimeRange(
    history: SkillHistoryEntry[],
    timeRange: 'week' | 'month' | 'year'
  ): SkillHistoryEntry[] {
    const now = new Date();
    let cutoffDate: Date;
    
    switch (timeRange) {
      case 'week':
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        cutoffDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        break;
      case 'year':
        cutoffDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
    }
    
    return history.filter(entry => entry.createdAt >= cutoffDate);
  }
}