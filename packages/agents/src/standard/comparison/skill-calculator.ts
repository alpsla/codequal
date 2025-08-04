/**
 * Skill Calculator for Developer Progress Tracking
 * 
 * Calculates skill impacts based on code analysis results
 */

import { ComparisonResult, DeveloperSkills } from '../types/analysis-types';

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

export class SkillCalculator {
  /**
   * Calculate skill impact from comparison results
   */
  calculateSkillImpact(
    comparison: ComparisonResult,
    userProfile: any,
    historicalIssues: any[]
  ): SkillUpdate {
    const adjustments: SkillAdjustment[] = [];
    const categoryChanges: Record<string, number> = {};
    
    // Current skill scores
    const currentSkills = userProfile.skills || {};
    const previousScore = this.calculateOverallScore(currentSkills);
    
    // Positive adjustments for resolved issues
    const resolved = comparison.resolvedIssues || comparison.comparison?.resolvedIssues || [];
    if (resolved && resolved.length > 0) {
      const resolvedByCategory = this.groupByCategory(resolved.map((r: any) => r.issue || r));
      
      Object.entries(resolvedByCategory).forEach(([category, issues]) => {
        const points = this.calculatePositivePoints(category, issues.length);
        adjustments.push({
          category,
          points,
          reason: `Fixed ${issues.length} ${category} issue${issues.length > 1 ? 's' : ''}`
        });
        categoryChanges[category] = (categoryChanges[category] || 0) + points;
      });
    }
    
    // Negative adjustments for new issues
    const newIssues = comparison.newIssues || comparison.comparison?.newIssues || [];
    if (newIssues && newIssues.length > 0) {
      const newByCategory = this.groupByCategory(newIssues);
      
      Object.entries(newByCategory).forEach(([category, issues]) => {
        const criticalCount = issues.filter((i: any) => i.severity === 'critical').length;
        const highCount = issues.filter((i: any) => i.severity === 'high').length;
        
        if (criticalCount > 0 || highCount > 0) {
          const points = -this.calculateNegativePoints(category, criticalCount, highCount);
          adjustments.push({
            category,
            points,
            reason: `Introduced ${criticalCount} critical, ${highCount} high ${category} issues`
          });
          categoryChanges[category] = (categoryChanges[category] || 0) + points;
        }
      });
    }
    
    // Deduct for unfixed pre-existing issues
    if (historicalIssues && historicalIssues.length > 0) {
      const stillExists = historicalIssues.filter(issue => 
        !resolved.some((r: any) => (r.issue?.id || r.id) === issue.id)
      );
      
      if (stillExists.length > 0) {
        const byCategory = this.groupByCategory(stillExists);
        Object.entries(byCategory).forEach(([category, issues]) => {
          const deduction = -Math.min(issues.length * 0.5, 5);
          adjustments.push({
            category,
            points: deduction,
            reason: `${issues.length} pre-existing ${category} issues not addressed`
          });
          categoryChanges[category] = (categoryChanges[category] || 0) + deduction;
        });
      }
    }
    
    // Calculate new overall score
    const newSkills = this.applyAdjustments(currentSkills, categoryChanges);
    const newScore = this.calculateOverallScore(newSkills);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(adjustments, categoryChanges);
    
    return {
      previousScore,
      newScore,
      adjustments,
      categoryChanges,
      recommendations
    };
  }
  
  /**
   * Group issues by category
   */
  private groupByCategory(issues: any[]): Record<string, any[]> {
    const groups: Record<string, any[]> = {};
    
    issues.forEach(issue => {
      const category = issue.category || 'general';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(issue);
    });
    
    return groups;
  }
  
  /**
   * Calculate positive points for fixing issues
   */
  private calculatePositivePoints(category: string, count: number): number {
    const basePoints: Record<string, number> = {
      security: 5,
      performance: 4,
      codeQuality: 3,
      architecture: 4,
      testing: 3,
      general: 2
    };
    
    const base = basePoints[category] || 2;
    return Math.min(base * count, 20); // Cap at 20 points per category
  }
  
  /**
   * Calculate negative points for introducing issues
   */
  private calculateNegativePoints(category: string, critical: number, high: number): number {
    const criticalPenalty: Record<string, number> = {
      security: 10,
      performance: 8,
      codeQuality: 5,
      architecture: 7,
      testing: 5,
      general: 5
    };
    
    const highPenalty: Record<string, number> = {
      security: 5,
      performance: 4,
      codeQuality: 3,
      architecture: 4,
      testing: 3,
      general: 2
    };
    
    const critPenalty = criticalPenalty[category] || 5;
    const highPen = highPenalty[category] || 2;
    
    return (critical * critPenalty) + (high * highPen);
  }
  
  /**
   * Calculate overall score from skills
   */
  private calculateOverallScore(skills: Record<string, number>): number {
    const weights = {
      security: 0.25,
      performance: 0.20,
      codeQuality: 0.25,
      architecture: 0.15,
      testing: 0.15
    };
    
    let weightedSum = 0;
    let totalWeight = 0;
    
    Object.entries(weights).forEach(([category, weight]) => {
      const score = skills[category] || 50;
      weightedSum += score * weight;
      totalWeight += weight;
    });
    
    return Math.round(weightedSum / totalWeight);
  }
  
  /**
   * Apply adjustments to current skills
   */
  private applyAdjustments(
    currentSkills: Record<string, number>,
    adjustments: Record<string, number>
  ): Record<string, number> {
    const newSkills = { ...currentSkills };
    
    Object.entries(adjustments).forEach(([category, change]) => {
      const current = newSkills[category] || 50;
      newSkills[category] = Math.max(0, Math.min(100, current + change));
    });
    
    return newSkills;
  }
  
  /**
   * Generate personalized recommendations
   */
  private generateRecommendations(
    adjustments: SkillAdjustment[],
    categoryChanges: Record<string, number>
  ): string[] {
    const recommendations: string[] = [];
    
    // Find categories with negative changes
    const needsImprovement = Object.entries(categoryChanges)
      .filter(([_, change]) => change < 0)
      .sort((a, b) => a[1] - b[1])
      .map(([category]) => category);
    
    if (needsImprovement.length > 0) {
      const topCategory = needsImprovement[0];
      recommendations.push(`Focus on improving ${topCategory} skills`);
      
      // Specific recommendations by category
      const categoryRecs: Record<string, string> = {
        security: 'Review OWASP Top 10 and security best practices',
        performance: 'Study performance profiling and optimization techniques',
        codeQuality: 'Practice clean code principles and refactoring',
        architecture: 'Learn design patterns and architectural principles',
        testing: 'Improve test coverage and learn testing strategies'
      };
      
      if (categoryRecs[topCategory]) {
        recommendations.push(categoryRecs[topCategory]);
      }
    }
    
    // Positive reinforcement
    const improvements = adjustments.filter(a => a.points > 0);
    if (improvements.length > 0) {
      const topImprovement = improvements.sort((a, b) => b.points - a.points)[0];
      recommendations.push(`Great work on ${topImprovement.reason}! Keep it up!`);
    }
    
    return recommendations.slice(0, 3); // Return top 3 recommendations
  }
}