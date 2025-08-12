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
    
    // Positive adjustments for resolved issues (BUG-010: severity-based points)
    const resolved = comparison.resolvedIssues || comparison.comparison?.resolvedIssues || [];
    if (resolved && resolved.length > 0) {
      const resolvedIssues = resolved.map((r: any) => r.issue || r);
      const resolvedByCategory = this.groupByCategory(resolvedIssues);
      
      Object.entries(resolvedByCategory).forEach(([category, issues]) => {
        // Use severity-based calculation (BUG-010 fix)
        const points = this.calculatePositivePointsBySeverity(issues);
        
        // Create detailed reason with severity breakdown
        const severityCounts: Record<string, number> = {};
        issues.forEach((issue: any) => {
          const severity = issue.severity || 'medium';
          severityCounts[severity] = (severityCounts[severity] || 0) + 1;
        });
        
        const severityDetails = Object.entries(severityCounts)
          .map(([sev, count]) => `${count} ${sev}`)
          .join(', ');
        
        adjustments.push({
          category,
          points,
          reason: `Fixed ${issues.length} ${category} issue${issues.length > 1 ? 's' : ''} (${severityDetails})`
        });
        categoryChanges[category] = (categoryChanges[category] || 0) + points;
      });
    }
    
    // Negative adjustments for new issues (BUG-013: severity-based penalties)
    const newIssues = comparison.newIssues || comparison.comparison?.newIssues || [];
    if (newIssues && newIssues.length > 0) {
      const newByCategory = this.groupByCategory(newIssues);
      
      Object.entries(newByCategory).forEach(([category, issues]) => {
        // Use severity-based calculation (BUG-013 fix)
        const penalty = this.calculateNegativePointsBySeverity(issues);
        
        if (penalty > 0) {
          // Create detailed reason with severity breakdown
          const severityCounts: Record<string, number> = {};
          issues.forEach((issue: any) => {
            const severity = issue.severity || 'medium';
            severityCounts[severity] = (severityCounts[severity] || 0) + 1;
          });
          
          const severityDetails = Object.entries(severityCounts)
            .map(([sev, count]) => `${count} ${sev}`)
            .join(', ');
          
          adjustments.push({
            category,
            points: -penalty,  // Negative points
            reason: `Introduced ${issues.length} ${category} issue${issues.length > 1 ? 's' : ''} (${severityDetails})`
          });
          categoryChanges[category] = (categoryChanges[category] || 0) - penalty;
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
   * BUG-010 FIX: Use severity-based scoring (+5/+3/+1/+0.5)
   */
  private calculatePositivePoints(category: string, count: number): number {
    // This method needs to be refactored to accept severity instead of just count
    // For now, return a conservative estimate
    // TODO: Refactor to pass issue severity information
    return count * 2; // Temporary: average 2 points per resolved issue
  }
  
  /**
   * Calculate positive points based on severity (BUG-010 implementation)
   */
  private calculatePositivePointsBySeverity(issues: any[]): number {
    const severityPoints: Record<string, number> = {
      critical: 5,
      high: 3,
      medium: 1,
      low: 0.5
    };
    
    let totalPoints = 0;
    issues.forEach(issue => {
      const severity = issue.severity || 'medium';
      totalPoints += severityPoints[severity] || 1;
    });
    
    return totalPoints;
  }
  
  /**
   * Calculate negative points for introducing issues
   * BUG-013 FIX: Use new scoring system (-5/-3/-1/-0.5)
   */
  private calculateNegativePoints(category: string, critical: number, high: number): number {
    // Old system was category-based, new system is severity-based
    // This method needs refactoring to accept all severities
    const criticalPenalty = 5;  // BUG-013: New scoring
    const highPenalty = 3;       // BUG-013: New scoring
    
    return (critical * criticalPenalty) + (high * highPenalty);
  }
  
  /**
   * Calculate negative points based on severity (BUG-013 implementation)
   */
  private calculateNegativePointsBySeverity(issues: any[]): number {
    const severityPenalties: Record<string, number> = {
      critical: 5,
      high: 3,
      medium: 1,
      low: 0.5
    };
    
    let totalPenalty = 0;
    issues.forEach(issue => {
      const severity = issue.severity || 'medium';
      totalPenalty += severityPenalties[severity] || 1;
    });
    
    return totalPenalty;
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