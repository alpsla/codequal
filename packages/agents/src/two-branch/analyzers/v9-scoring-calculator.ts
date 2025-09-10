/**
 * V9 Scoring Calculator Module
 * 
 * Handles all scoring and grading calculations for V9 analyzer
 * Features consistent weights for all issue states
 */

import { Issue, IssueSeverity, IssueCategory, ScoringConfig } from './v9-types';

export class V9ScoringCalculator {
  private readonly config: ScoringConfig = {
    weights: {
      critical: 5,
      high: 3,
      medium: 1,
      low: 0.5
    },
    passingScore: 70,
    gradeThresholds: {
      A: 90,
      B: 80,
      C: 70,
      D: 60
    }
  };

  /**
   * Calculate quality score based on issues
   * Uses consistent weights: Critical=5, High=3, Medium=1, Low=0.5
   */
  calculateQualityScore(
    newIssues: Issue[],
    existingIssues: Issue[],
    resolvedIssues: Issue[]
  ): number {
    // Base score starts at 100
    let score = 100;
    
    // Deduct points for new issues (standard weight)
    for (const issue of newIssues) {
      score -= this.getSeverityWeight(issue.severity);
    }
    
    // Deduct points for existing issues (same weight as new)
    for (const issue of existingIssues) {
      score -= this.getSeverityWeight(issue.severity);
    }
    
    // Add points for resolved issues (same positive weight)
    for (const issue of resolvedIssues) {
      score += this.getSeverityWeight(issue.severity);
    }
    
    // Ensure score is between 0 and 100
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Get weight for a severity level
   */
  getSeverityWeight(severity: IssueSeverity): number {
    return this.config.weights[severity] || 0;
  }

  /**
   * Calculate total points for a set of issues
   */
  calculateCategoryPoints(issues: Issue[]): number {
    return issues.reduce((total, issue) => {
      return total + this.getSeverityWeight(issue.severity);
    }, 0);
  }

  /**
   * Calculate points with proper formatting
   */
  calculateFormattedPoints(issues: Issue[]): string {
    const points = this.calculateCategoryPoints(issues);
    return points.toFixed(1);
  }

  /**
   * Get letter grade based on score
   */
  getGrade(score: number): string {
    const { gradeThresholds } = this.config;
    
    if (score >= gradeThresholds.A) return 'A';
    if (score >= gradeThresholds.B) return 'B';
    if (score >= gradeThresholds.C) return 'C';
    if (score >= gradeThresholds.D) return 'D';
    return 'F';
  }

  /**
   * Determine if PR should be approved based on score
   */
  shouldApprove(score: number): boolean {
    return score >= this.config.passingScore;
  }

  /**
   * Get confidence level based on issue analysis
   */
  getConfidenceLevel(
    newIssues: Issue[],
    existingIssues: Issue[],
    resolvedIssues: Issue[]
  ): number {
    // High confidence if many issues were found and analyzed
    const totalIssues = newIssues.length + existingIssues.length + resolvedIssues.length;
    
    if (totalIssues === 0) return 0.5; // Medium confidence if no issues
    if (totalIssues < 5) return 0.6;
    if (totalIssues < 10) return 0.7;
    if (totalIssues < 20) return 0.8;
    if (totalIssues < 50) return 0.9;
    return 0.95; // Very high confidence with many issues analyzed
  }

  /**
   * Calculate severity breakdown for reporting
   */
  getSeverityBreakdown(issues: Issue[]): Record<IssueSeverity, number> {
    const breakdown: Record<IssueSeverity, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };
    
    for (const issue of issues) {
      breakdown[issue.severity]++;
    }
    
    return breakdown;
  }

  /**
   * Calculate category breakdown for reporting
   */
  getCategoryBreakdown(issues: Issue[]): Record<IssueCategory, number> {
    const breakdown: Partial<Record<IssueCategory, number>> = {};
    
    for (const issue of issues) {
      breakdown[issue.category] = (breakdown[issue.category] || 0) + 1;
    }
    
    return breakdown as Record<IssueCategory, number>;
  }

  /**
   * Calculate financial impact based on issues
   */
  calculateFinancialImpact(issues: Issue[]): {
    fixCost: number;
    hourEstimate: number;
  } {
    const hourlyRate = 150; // Default hourly rate for fixes
    let totalHours = 0;
    
    for (const issue of issues) {
      switch (issue.severity) {
        case 'critical':
          totalHours += 4; // 4 hours for critical issues
          break;
        case 'high':
          totalHours += 2; // 2 hours for high issues
          break;
        case 'medium':
          totalHours += 1; // 1 hour for medium issues
          break;
        case 'low':
          totalHours += 0.5; // 30 minutes for low issues
          break;
      }
    }
    
    return {
      fixCost: totalHours * hourlyRate,
      hourEstimate: totalHours
    };
  }

  /**
   * Format financial values with proper decimal places
   */
  formatFinancial(value: number): string {
    return value.toFixed(2);
  }

  /**
   * Calculate risk score for a category
   */
  calculateRiskScore(issues: Issue[], category: IssueCategory): number {
    const categoryIssues = issues.filter(i => i.category === category);
    return this.calculateCategoryPoints(categoryIssues);
  }

  /**
   * Get risk level description
   */
  getRiskLevel(score: number): string {
    if (score === 0) return 'None';
    if (score < 2) return 'Low';
    if (score < 5) return 'Medium';
    if (score < 10) return 'High';
    return 'Critical';
  }

  /**
   * Calculate developer skill score based on issues
   * Uses consistent weights for fair scoring
   */
  calculateSkillScore(
    newIssues: Issue[],
    resolvedIssues: Issue[]
  ): number {
    // Start with base score
    let score = 70;
    
    // Penalize for new issues introduced (standard weight)
    const newPoints = this.calculateCategoryPoints(newIssues);
    score -= newPoints;
    
    // Reward for issues resolved (standard positive weight)
    const resolvedPoints = this.calculateCategoryPoints(resolvedIssues);
    score += resolvedPoints;
    
    // Ensure score is between 0 and 100
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Get skill level description
   */
  getSkillLevel(score: number): string {
    if (score >= 90) return 'Expert';
    if (score >= 75) return 'Senior';
    if (score >= 60) return 'Mid-Level';
    if (score >= 40) return 'Junior';
    return 'Beginner';
  }
}