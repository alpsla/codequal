import { AnalysisResult } from '../types/agent';
/**
 * Service for managing developer skills
 */
export declare class SkillService {
    private skillCategoryMap;
    constructor();
    /**
     * Initialize skill category mapping
     */
    private initializeSkillMap;
    /**
     * Update user skills based on analysis results
     * @param userId User ID
     * @param analysisResult Analysis result
     * @param prReviewId PR review ID
     */
    updateUserSkills(userId: string, analysisResult: AnalysisResult, prReviewId: string): Promise<void>;
    /**
     * Calculate skill adjustments based on insights
     * @param insights Analysis insights
     * @returns Skill adjustments by category ID
     */
    private calculateSkillAdjustments;
    /**
     * Map insight to skill category
     * @param insight Analysis insight
     * @returns Skill category ID or null
     */
    private mapInsightToSkillCategory;
    /**
     * Get skill trends for a user
     * @param userId User ID
     * @param timeRange Time range ('week', 'month', 'year')
     * @returns Skill trends
     */
    getUserSkillTrends(userId: string, timeRange?: 'week' | 'month' | 'year'): Promise<Record<string, unknown>[]>;
    /**
     * Filter skill history by time range
     * @param history Skill history entries
     * @param timeRange Time range
     * @returns Filtered history
     */
    private filterHistoryByTimeRange;
}
