/**
 * Skill Calculator for Developer Progress Tracking
 *
 * Calculates skill impacts based on code analysis results
 */
import { ComparisonResult } from '../types/analysis-types';
export interface SkillAdjustment {
    category: string;
    points: number;
    reason: string;
}
export interface SkillUpdate {
    previousScore: number;
    newScore: number;
    adjustments: SkillAdjustment[];
    categoryChanges: Record<string, number>;
    recommendations: string[];
}
export declare class SkillCalculator {
    /**
     * Calculate skill impact from comparison results
     */
    calculateSkillImpact(comparison: ComparisonResult, userProfile: any, historicalIssues: any[]): SkillUpdate;
    /**
     * Group issues by category
     */
    private groupByCategory;
    /**
     * Calculate positive points for fixing issues
     * BUG-010 FIX: Use severity-based scoring (+5/+3/+1/+0.5)
     */
    private calculatePositivePoints;
    /**
     * Calculate positive points based on severity (BUG-010 implementation)
     */
    private calculatePositivePointsBySeverity;
    /**
     * Calculate negative points for introducing issues
     * BUG-013 FIX: Use new scoring system (-5/-3/-1/-0.5)
     */
    private calculateNegativePoints;
    /**
     * Calculate negative points based on severity (BUG-013 implementation)
     */
    private calculateNegativePointsBySeverity;
    /**
     * Calculate overall score from skills
     */
    private calculateOverallScore;
    /**
     * Apply adjustments to current skills
     */
    private applyAdjustments;
    /**
     * Generate personalized recommendations
     */
    private generateRecommendations;
}
