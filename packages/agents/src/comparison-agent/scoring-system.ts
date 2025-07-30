/**
 * Advanced Scoring System for CodeQual
 * 
 * Implements:
 * - Role-based priority scoring
 * - Issue aging penalties
 * - Historical tracking
 * - Skill improvement calculations
 * - Team trend analysis
 */

import { Issue } from './comparison-agent';

export interface ScoringConfig {
  // Base scores by severity
  severityScores: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  
  // Role-based multipliers (security > performance > documentation)
  roleMultipliers: {
    security: number;
    performance: number;
    architecture: number;
    dependencies: number;
    quality: number;
    documentation: number;
  };
  
  // Aging penalty (per day)
  agingPenalty: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  
  // Score ranges
  scoreRanges: {
    excellent: number;  // 90+
    good: number;       // 75-89
    fair: number;       // 60-74
    poor: number;       // 45-59
    critical: number;   // <45
  };
}

export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  severityScores: {
    critical: 40,
    high: 25,
    medium: 15,
    low: 5
  },
  roleMultipliers: {
    security: 2.0,      // Highest priority
    performance: 1.5,
    architecture: 1.3,
    dependencies: 1.2,
    quality: 1.0,
    documentation: 0.5  // Lowest priority
  },
  agingPenalty: {
    critical: 2.0,  // -2 points per day
    high: 1.0,      // -1 point per day
    medium: 0.5,    // -0.5 points per day
    low: 0.2        // -0.2 points per day
  },
  scoreRanges: {
    excellent: 90,
    good: 75,
    fair: 60,
    poor: 45,
    critical: 0
  }
};

export interface IssueWithAge extends Issue {
  age_days?: number;
  first_detected?: Date;
}

export interface TeamTrend {
  team_id: string;
  period: 'daily' | 'weekly' | 'monthly';
  start_date: Date;
  end_date: Date;
  skill_trends: {
    [category: string]: {
      start_average: number;
      end_average: number;
      change: number;
      trend: 'improving' | 'declining' | 'stable';
      top_improvers: Array<{ user_id: string; improvement: number }>;
      struggling_members: Array<{ user_id: string; decline: number }>;
    };
  };
  overall_trend: 'improving' | 'declining' | 'stable';
  recommendations: string[];
}

export interface RepositoryScore {
  overall_score: number;
  role_scores: {
    security_score: number;
    performance_score: number;
    quality_score: number;
    architecture_score: number;
    dependencies_score: number;
    documentation_score: number;
  };
  score_breakdown: {
    base_score: number;
    aging_penalty: number;
    improvement_bonus: number;
    final_score: number;
  };
  health_status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
}

export interface SkillImprovement {
  user_id: string;
  skill_changes: {
    [category: string]: {
      previous_level: number;
      new_level: number;
      change: number;
      reason: string;
    };
  };
  milestones_achieved: string[];
  recommendations: string[];
}

type Severity = keyof ScoringConfig['severityScores'];
type Category = keyof ScoringConfig['roleMultipliers'];
type RoleScoreKey = keyof RepositoryScore['role_scores'];

export class ScoringSystem {
  constructor(private readonly config: ScoringConfig = DEFAULT_SCORING_CONFIG) {}

  /**
   * Calculate comprehensive repository score with role-based priorities
   */
  public calculateRepositoryScore(
    issues: IssueWithAge[],
    fixedIssues: Issue[]
  ): RepositoryScore {
    // Start with perfect score
    let baseScore = 100;
    const roleScores: RepositoryScore['role_scores'] = {
      security_score: 100,
      performance_score: 100,
      quality_score: 100,
      architecture_score: 100,
      dependencies_score: 100,
      documentation_score: 100
    };

    // Deduct points for active issues
    for (const issue of issues) {
      const severity = issue.severity as Severity;
      const category = issue.category as Category;
      
      const severityScore = this.config.severityScores[severity];
      const roleMultiplier = this.config.roleMultipliers[category];
      const ageDays = issue.age_days ?? 0;
      const agingPenalty = this.config.agingPenalty[severity] * ageDays;
      
      // Calculate total penalty
      const totalPenalty = (severityScore + agingPenalty) * roleMultiplier;
      
      // Apply to overall and role-specific scores
      baseScore -= totalPenalty;
      const roleScoreKey = `${category}_score` as RoleScoreKey;
      if (roleScoreKey in roleScores) {
        roleScores[roleScoreKey] = Math.max(0, roleScores[roleScoreKey] - totalPenalty);
      }
    }

    // Add improvement bonus for fixed issues
    let improvementBonus = 0;
    for (const fixed of fixedIssues) {
      const severity = fixed.severity as Severity;
      const category = fixed.category as Category;
      
      const severityScore = this.config.severityScores[severity];
      const roleMultiplier = this.config.roleMultipliers[category];
      improvementBonus += severityScore * roleMultiplier * 0.5; // 50% bonus for fixes
    }

    // Calculate aging penalty summary
    const totalAgingPenalty = issues.reduce((sum, issue) => {
      const severity = issue.severity as Severity;
      const ageDays = issue.age_days ?? 0;
      return sum + (this.config.agingPenalty[severity] * ageDays);
    }, 0);

    // Ensure scores don't go below 0 or above 100
    const finalScore = Math.max(0, Math.min(100, baseScore + improvementBonus));
    
    // Normalize all role scores
    const normalizedRoleScores = Object.entries(roleScores).reduce((acc, [key, value]) => {
      acc[key as RoleScoreKey] = Math.max(0, Math.min(100, value));
      return acc;
    }, {} as RepositoryScore['role_scores']);

    return {
      overall_score: Math.round(finalScore),
      role_scores: normalizedRoleScores,
      score_breakdown: {
        base_score: Math.round(baseScore),
        aging_penalty: Math.round(totalAgingPenalty),
        improvement_bonus: Math.round(improvementBonus),
        final_score: Math.round(finalScore)
      },
      health_status: this.getHealthStatus(finalScore)
    };
  }

  /**
   * Calculate user skill improvement based on PR contributions
   */
  public calculateSkillImprovement(
    userId: string,
    fixedIssues: Issue[],
    introducedIssues: Issue[],
    currentSkills: Record<string, number>
  ): SkillImprovement {
    const skillChanges: SkillImprovement['skill_changes'] = {};
    const milestones: string[] = [];

    // Group issues by category
    const fixedByCategory = this.groupByCategory(fixedIssues);
    const introducedByCategory = this.groupByCategory(introducedIssues);

    // Calculate skill change for each category
    const categories = Object.keys(this.config.roleMultipliers) as Category[];
    for (const category of categories) {
      const currentLevel = currentSkills[category] ?? 50; // Default to 50 if new
      const fixed = fixedByCategory[category] ?? [];
      const introduced = introducedByCategory[category] ?? [];

      const skillChange = this.calculateCategorySkillChange(
        fixed,
        introduced,
        currentLevel
      );

      if (fixed.length > 0 || introduced.length > 0) {
        skillChanges[category] = {
          previous_level: currentLevel,
          new_level: Math.max(0, Math.min(100, currentLevel + skillChange)),
          change: skillChange,
          reason: this.getSkillChangeReason(fixed.length, introduced.length)
        };
      }

      // Check for milestones
      if (currentLevel < 60 && currentLevel + skillChange >= 60) {
        milestones.push(`Reached proficient level in ${category}`);
      }
      if (fixed.some(i => i.severity === 'critical') && category === 'security') {
        milestones.push('First critical security fix!');
      }
    }

    // Generate recommendations
    const recommendations = this.generateSkillRecommendations(
      skillChanges,
      introducedByCategory
    );

    return {
      user_id: userId,
      skill_changes: skillChanges,
      milestones_achieved: milestones,
      recommendations
    };
  }

  /**
   * Calculate team skill trends over time
   */
  public calculateTeamTrend(
    teamId: string,
    startSkills: Array<{ user_id: string; skills: Record<string, number> }>,
    endSkills: Array<{ user_id: string; skills: Record<string, number> }>,
    period: TeamTrend['period'],
    startDate: Date,
    endDate: Date
  ): TeamTrend {
    const skillTrends: TeamTrend['skill_trends'] = {};
    const recommendations: string[] = [];

    // Calculate trends for each skill category
    const categories = Object.keys(this.config.roleMultipliers) as Category[];
    for (const category of categories) {
      const startAvg = this.calculateTeamAverage(startSkills, category);
      const endAvg = this.calculateTeamAverage(endSkills, category);
      const change = endAvg - startAvg;

      // Find top improvers and struggling members
      const improvements = this.calculateIndividualChanges(startSkills, endSkills, category);
      const topImprovers = improvements
        .filter(i => i.improvement > 0)
        .sort((a, b) => b.improvement - a.improvement)
        .slice(0, 3);
      
      const strugglingMembers = improvements
        .filter(i => i.improvement < -2)
        .sort((a, b) => a.improvement - b.improvement)
        .slice(0, 3);

      skillTrends[category] = {
        start_average: Math.round(startAvg * 10) / 10,
        end_average: Math.round(endAvg * 10) / 10,
        change: Math.round(change * 10) / 10,
        trend: this.getTrendDirection(change),
        top_improvers: topImprovers,
        struggling_members: strugglingMembers.map(m => ({
          user_id: m.user_id,
          decline: Math.abs(m.improvement)
        }))
      };

      // Generate category-specific recommendations
      if (change < -5) {
        recommendations.push(
          `Team ${category} skills declining significantly. Consider training sessions or pair programming.`
        );
      }
      if (strugglingMembers.length > 0) {
        recommendations.push(
          `${strugglingMembers.length} team members struggling with ${category}. Assign mentors from top performers.`
        );
      }
    }

    // Calculate overall trend
    const overallChange = Object.values(skillTrends).reduce(
      (sum, trend) => sum + trend.change,
      0
    ) / Object.keys(skillTrends).length;

    return {
      team_id: teamId,
      period,
      start_date: startDate,
      end_date: endDate,
      skill_trends: skillTrends,
      overall_trend: this.getTrendDirection(overallChange),
      recommendations
    };
  }

  /**
   * Calculate team skill balance and recommendations
   */
  public calculateTeamBalance(
    teamSkills: Array<{ user_id: string; skills: Record<string, number> }>
  ): {
    balanced: boolean;
    gaps: string[];
    strengths: string[];
    recommendations: string[];
  } {
    const categoryAverages: Record<string, number> = {};
    const categoryExperts: Record<string, string[]> = {};

    // Calculate averages and identify experts
    const categories = Object.keys(this.config.roleMultipliers) as Category[];
    for (const category of categories) {
      const scores = teamSkills.map(member => member.skills[category] ?? 0);
      categoryAverages[category] = scores.reduce((a, b) => a + b, 0) / scores.length;
      
      // Find experts (80+ skill level)
      categoryExperts[category] = teamSkills
        .filter(member => (member.skills[category] ?? 0) >= 80)
        .map(member => member.user_id);
    }

    // Identify gaps and strengths
    const gaps = Object.entries(categoryAverages)
      .filter(([_, avg]) => avg < 60)
      .map(([cat]) => cat);
    
    const strengths = Object.entries(categoryAverages)
      .filter(([_, avg]) => avg >= 75)
      .map(([cat]) => cat);

    // Generate recommendations
    const recommendations: string[] = [];
    
    for (const gap of gaps) {
      if (categoryExperts[gap].length === 0) {
        recommendations.push(`Critical: No experts in ${gap}. Consider training or hiring.`);
      } else {
        recommendations.push(`Skill gap in ${gap}. Have experts mentor other team members.`);
      }
    }

    const balanced = gaps.length === 0 && strengths.length >= 3;

    return { balanced, gaps, strengths, recommendations };
  }

  /**
   * Calculate skill change for a specific category
   */
  private calculateCategorySkillChange(
    fixed: Issue[],
    introduced: Issue[],
    currentLevel: number
  ): number {
    let change = 0;

    // Positive change for fixes
    for (const issue of fixed) {
      const severity = issue.severity as Severity;
      const baseGain = this.config.severityScores[severity] / 10;
      const learningMultiplier = currentLevel < 50 ? 1.5 : (currentLevel < 80 ? 1.0 : 0.7);
      change += baseGain * learningMultiplier;
    }

    // Negative change for introduced issues
    for (const issue of introduced) {
      const severity = issue.severity as Severity;
      const baseLoss = this.config.severityScores[severity] / 20; // Half penalty
      const penaltyMultiplier = issue.severity === 'critical' ? 2 : 1;
      change -= baseLoss * penaltyMultiplier;
    }

    return Math.round(change * 10) / 10; // Round to 1 decimal
  }

  /**
   * Group issues by category
   */
  private groupByCategory(issues: Issue[]): Record<string, Issue[]> {
    const grouped: Record<string, Issue[]> = {};
    for (const issue of issues) {
      if (!grouped[issue.category]) {
        grouped[issue.category] = [];
      }
      grouped[issue.category].push(issue);
    }
    return grouped;
  }

  /**
   * Get health status based on score
   */
  private getHealthStatus(score: number): RepositoryScore['health_status'] {
    if (score >= this.config.scoreRanges.excellent) return 'excellent';
    if (score >= this.config.scoreRanges.good) return 'good';
    if (score >= this.config.scoreRanges.fair) return 'fair';
    if (score >= this.config.scoreRanges.poor) return 'poor';
    return 'critical';
  }

  /**
   * Generate reason for skill change
   */
  private getSkillChangeReason(fixedCount: number, introducedCount: number): string {
    if (fixedCount > 0 && introducedCount === 0) {
      return `Fixed ${fixedCount} issue(s) without introducing new ones`;
    }
    if (fixedCount > introducedCount) {
      return `Net improvement: fixed ${fixedCount}, introduced ${introducedCount}`;
    }
    if (introducedCount > 0 && fixedCount === 0) {
      return `Introduced ${introducedCount} new issue(s)`;
    }
    return `Mixed results: fixed ${fixedCount}, introduced ${introducedCount}`;
  }

  /**
   * Generate personalized skill recommendations
   */
  private generateSkillRecommendations(
    skillChanges: SkillImprovement['skill_changes'],
    introducedByCategory: Record<string, Issue[]>
  ): string[] {
    const recommendations: string[] = [];

    // Find weakest skills
    const weakSkills = Object.entries(skillChanges)
      .filter(([_, change]) => change.new_level < 60)
      .sort((a, b) => a[1].new_level - b[1].new_level);

    if (weakSkills.length > 0) {
      const [category, data] = weakSkills[0];
      recommendations.push(
        `Focus on improving ${category} skills (current level: ${data.new_level}). Consider reviewing best practices and examples.`
      );
    }

    // Recommendations for introduced critical issues
    for (const [category, issues] of Object.entries(introducedByCategory)) {
      const criticalIssues = issues.filter(i => i.severity === 'critical');
      if (criticalIssues.length > 0) {
        recommendations.push(
          `Review ${category} fundamentals - introduced ${criticalIssues.length} critical issue(s). Consider pair programming for complex ${category} tasks.`
        );
      }
    }

    // Positive reinforcement
    const improvedSkills = Object.entries(skillChanges)
      .filter(([_, change]) => change.change > 5)
      .sort((a, b) => b[1].change - a[1].change);

    if (improvedSkills.length > 0) {
      const [category] = improvedSkills[0];
      recommendations.push(
        `Great progress in ${category}! Continue this momentum by tackling more complex ${category} issues.`
      );
    }

    return recommendations;
  }

  /**
   * Calculate team average for a specific skill
   */
  private calculateTeamAverage(
    teamSkills: Array<{ user_id: string; skills: Record<string, number> }>,
    category: string
  ): number {
    const scores = teamSkills.map(member => member.skills[category] ?? 0);
    return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  }

  /**
   * Calculate individual skill changes
   */
  private calculateIndividualChanges(
    startSkills: Array<{ user_id: string; skills: Record<string, number> }>,
    endSkills: Array<{ user_id: string; skills: Record<string, number> }>,
    category: string
  ): Array<{ user_id: string; improvement: number }> {
    const changes: Array<{ user_id: string; improvement: number }> = [];
    
    for (const endMember of endSkills) {
      const startMember = startSkills.find(s => s.user_id === endMember.user_id);
      if (startMember) {
        const startLevel = startMember.skills[category] ?? 0;
        const endLevel = endMember.skills[category] ?? 0;
        changes.push({
          user_id: endMember.user_id,
          improvement: endLevel - startLevel
        });
      }
    }
    
    return changes;
  }

  /**
   * Get trend direction based on change value
   */
  private getTrendDirection(change: number): 'improving' | 'declining' | 'stable' {
    if (change > 2) return 'improving';
    if (change < -2) return 'declining';
    return 'stable';
  }
}