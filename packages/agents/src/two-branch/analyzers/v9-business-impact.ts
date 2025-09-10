/**
 * V9 Business Impact Module
 * 
 * Calculates business impact, financial implications, and risk assessments
 */

import { Issue, IssueCategory, BusinessImpact, SkillScore } from './v9-types';
import { V9ScoringCalculator } from './v9-scoring-calculator';

export class V9BusinessImpact {
  private readonly scoringCalculator: V9ScoringCalculator;
  private readonly hourlyRate = 150; // Default hourly rate for fixes
  private readonly exploitCostMultiplier = 10; // Exploit costs are typically 10x fix costs

  constructor() {
    this.scoringCalculator = new V9ScoringCalculator();
  }

  /**
   * Calculate comprehensive business impact
   */
  calculateBusinessImpact(
    blockingIssues: Issue[],
    backlogIssues: Issue[]
  ): BusinessImpact {
    const categories: IssueCategory[] = ['Security', 'Performance', 'Architecture', 'Dependency', 'Quality'];
    const riskMatrix = [];
    
    for (const category of categories) {
      const blockingCategoryIssues = blockingIssues.filter(i => i.category === category);
      const backlogCategoryIssues = backlogIssues.filter(i => i.category === category);
      
      const blockingRisk = this.scoringCalculator.calculateCategoryPoints(blockingCategoryIssues);
      const backlogRisk = this.scoringCalculator.calculateCategoryPoints(backlogCategoryIssues);
      
      riskMatrix.push({
        category,
        blockingRisk,
        backlogRisk,
        score: (blockingRisk + backlogRisk * 0.5).toFixed(1)
      });
    }
    
    // Calculate financial impact
    const blockingFinancial = this.calculateFinancialImpact(blockingIssues);
    const backlogFinancial = this.calculateFinancialImpact(backlogIssues);
    
    const totalFixCost = blockingFinancial.fixCost + backlogFinancial.fixCost;
    const totalExploitCost = totalFixCost * this.exploitCostMultiplier;
    const roi = ((totalExploitCost - totalFixCost) / totalFixCost * 100);
    
    return {
      summary: this.generateImpactSummary(blockingIssues, backlogIssues),
      immediateRisk: this.assessImmediateRisk(blockingIssues),
      futureRisk: this.assessFutureRisk(backlogIssues),
      financialImpact: {
        fixCost: `$${totalFixCost.toFixed(2)}`,
        exploitCost: `$${totalExploitCost.toFixed(2)}`,
        roi: `${roi.toFixed(2)}%`
      },
      riskMatrix
    };
  }

  /**
   * Calculate financial impact of issues
   */
  calculateFinancialImpact(issues: Issue[]): {
    fixCost: number;
    hourEstimate: number;
  } {
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
      fixCost: totalHours * this.hourlyRate,
      hourEstimate: totalHours
    };
  }

  /**
   * Generate business impact summary
   */
  private generateImpactSummary(blockingIssues: Issue[], backlogIssues: Issue[]): string {
    const totalIssues = blockingIssues.length + backlogIssues.length;
    
    if (totalIssues === 0) {
      return 'No significant business impact identified. Code meets quality standards.';
    }
    
    const criticalCount = [...blockingIssues, ...backlogIssues].filter(i => i.severity === 'critical').length;
    const securityCount = [...blockingIssues, ...backlogIssues].filter(i => i.category === 'Security').length;
    
    if (criticalCount > 0) {
      return `${criticalCount} critical issue(s) pose immediate business risk. Immediate remediation required to prevent potential system failures or security breaches.`;
    }
    
    if (securityCount > 0) {
      return `${securityCount} security issue(s) identified that could expose sensitive data or allow unauthorized access. Priority remediation recommended.`;
    }
    
    if (blockingIssues.length > 0) {
      return `${blockingIssues.length} blocking issue(s) require resolution before deployment. These issues affect code reliability and maintainability.`;
    }
    
    return `${backlogIssues.length} non-critical issue(s) identified for future improvement. Current code is deployable with acceptable risk levels.`;
  }

  /**
   * Assess immediate risk from blocking issues
   */
  private assessImmediateRisk(blockingIssues: Issue[]): string {
    if (blockingIssues.length === 0) {
      return 'Low - No blocking issues identified';
    }
    
    const criticalCount = blockingIssues.filter(i => i.severity === 'critical').length;
    const highCount = blockingIssues.filter(i => i.severity === 'high').length;
    const securityCount = blockingIssues.filter(i => i.category === 'Security').length;
    
    if (criticalCount > 0) {
      return `Critical - ${criticalCount} critical issue(s) could cause immediate system failure or data breach`;
    }
    
    if (securityCount > 0) {
      return `High - ${securityCount} security vulnerability(ies) expose the system to potential attacks`;
    }
    
    if (highCount > 0) {
      return `Medium - ${highCount} high-priority issue(s) may impact system stability or performance`;
    }
    
    return 'Low - Minor issues with minimal immediate impact';
  }

  /**
   * Assess future risk from backlog issues
   */
  private assessFutureRisk(backlogIssues: Issue[]): string {
    if (backlogIssues.length === 0) {
      return 'Minimal - No technical debt accumulation';
    }
    
    const points = this.scoringCalculator.calculateCategoryPoints(backlogIssues);
    
    if (points > 20) {
      return 'High - Significant technical debt will increase maintenance costs and reduce development velocity';
    }
    
    if (points > 10) {
      return 'Medium - Growing technical debt may impact future development efficiency';
    }
    
    if (points > 5) {
      return 'Low - Minor technical debt that should be addressed in future sprints';
    }
    
    return 'Minimal - Very low technical debt with negligible future impact';
  }

  /**
   * Calculate developer skill score
   */
  calculateSkillScore(
    developer: string,
    newIssues: Issue[],
    resolvedIssues: Issue[],
    existingIssues: Issue[]
  ): SkillScore {
    // Calculate base score
    const baseScore = this.scoringCalculator.calculateSkillScore(newIssues, resolvedIssues);
    
    // Calculate category scores
    const categories = {
      security: this.calculateCategorySkill(newIssues, resolvedIssues, 'Security'),
      performance: this.calculateCategorySkill(newIssues, resolvedIssues, 'Performance'),
      architecture: this.calculateCategorySkill(newIssues, resolvedIssues, 'Architecture'),
      dependency: this.calculateCategorySkill(newIssues, resolvedIssues, 'Dependency'),
      quality: this.calculateCategorySkill(newIssues, resolvedIssues, 'Quality')
    };
    
    // Generate recommendations
    const recommendations = this.generateSkillRecommendations(categories, newIssues);
    
    // Calculate trend (mock data for now)
    const trend = this.calculateSkillTrend(baseScore);
    
    return {
      developer,
      score: baseScore,
      trend,
      categories,
      recommendations
    };
  }

  /**
   * Calculate skill score for a specific category
   */
  private calculateCategorySkill(
    newIssues: Issue[],
    resolvedIssues: Issue[],
    category: IssueCategory
  ): number {
    const newCategoryIssues = newIssues.filter(i => i.category === category);
    const resolvedCategoryIssues = resolvedIssues.filter(i => i.category === category);
    
    let score = 70; // Base score
    
    // Penalize for new issues
    score -= this.scoringCalculator.calculateCategoryPoints(newCategoryIssues) * 5;
    
    // Reward for resolved issues
    score += this.scoringCalculator.calculateCategoryPoints(resolvedCategoryIssues) * 10;
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate skill improvement recommendations
   */
  private generateSkillRecommendations(
    categories: Record<string, number>,
    newIssues: Issue[]
  ): string[] {
    const recommendations: string[] = [];
    
    // Find weakest categories
    const weakCategories = Object.entries(categories)
      .filter(([_, score]) => score < 60)
      .map(([category]) => category);
    
    if (weakCategories.includes('security')) {
      recommendations.push('Consider security training: OWASP Top 10 and secure coding practices');
    }
    
    if (weakCategories.includes('performance')) {
      recommendations.push('Review performance optimization techniques and profiling tools');
    }
    
    if (weakCategories.includes('architecture')) {
      recommendations.push('Study design patterns and SOLID principles');
    }
    
    if (weakCategories.includes('dependency')) {
      recommendations.push('Learn dependency management and supply chain security best practices');
    }
    
    if (weakCategories.includes('quality')) {
      recommendations.push('Improve code quality with better testing and code review practices');
    }
    
    // Add specific recommendations based on common issues
    const commonPatterns = this.findCommonIssuePatterns(newIssues);
    for (const pattern of commonPatterns) {
      recommendations.push(`Focus on: ${pattern}`);
    }
    
    return recommendations.slice(0, 5); // Return top 5 recommendations
  }

  /**
   * Find common patterns in issues
   */
  private findCommonIssuePatterns(issues: Issue[]): string[] {
    const patterns = new Map<string, number>();
    
    for (const issue of issues) {
      const searchText = `${issue.title} ${issue.description}`.toLowerCase();
      
      if (searchText.includes('null') || searchText.includes('undefined')) {
        patterns.set('Null safety and error handling', (patterns.get('Null safety and error handling') || 0) + 1);
      }
      
      if (searchText.includes('unused')) {
        patterns.set('Code cleanup and dead code removal', (patterns.get('Code cleanup and dead code removal') || 0) + 1);
      }
      
      if (searchText.includes('test') || searchText.includes('coverage')) {
        patterns.set('Test coverage and testing practices', (patterns.get('Test coverage and testing practices') || 0) + 1);
      }
      
      if (searchText.includes('documentation') || searchText.includes('comment')) {
        patterns.set('Code documentation and comments', (patterns.get('Code documentation and comments') || 0) + 1);
      }
    }
    
    // Sort by frequency and return top patterns
    return Array.from(patterns.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([pattern]) => pattern)
      .slice(0, 3);
  }

  /**
   * Calculate skill trend (mock implementation)
   */
  private calculateSkillTrend(currentScore: number): number[] {
    // Generate a mock trend showing improvement
    const trend = [];
    let score = currentScore - 15;
    
    for (let i = 0; i < 5; i++) {
      trend.push(Math.max(0, Math.min(100, score)));
      score += 3 + Math.random() * 3;
    }
    
    trend.push(currentScore);
    return trend;
  }

  /**
   * Get risk matrix icon
   */
  getRiskIcon(score: number): string {
    if (score === 0) return '✅';
    if (score < 2) return '🟢';
    if (score < 5) return '🟡';
    if (score < 10) return '🟠';
    return '🔴';
  }

  /**
   * Format currency values
   */
  formatCurrency(value: number): string {
    return `$${value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  }

  /**
   * Format time estimates
   */
  formatTimeEstimate(hours: number): string {
    if (hours < 1) {
      return `${Math.round(hours * 60)} minutes`;
    } else if (hours === 1) {
      return '1 hour';
    } else if (hours < 8) {
      return `${hours.toFixed(1)} hours`;
    } else {
      const days = Math.floor(hours / 8);
      const remainingHours = hours % 8;
      if (remainingHours === 0) {
        return `${days} day${days > 1 ? 's' : ''}`;
      }
      return `${days} day${days > 1 ? 's' : ''} ${remainingHours.toFixed(1)} hours`;
    }
  }
}