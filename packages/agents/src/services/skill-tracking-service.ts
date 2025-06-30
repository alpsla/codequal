import { createLogger } from '@codequal/core/utils';
import { SkillModel, DeveloperSkill, SkillHistoryEntry } from '@codequal/database/models/skill';
import { AuthenticatedUser } from '../multi-agent/types/auth';
import { getSupabase } from '@codequal/database/supabase/client';

/**
 * Skill assessment data extracted from PR analysis
 */
export interface SkillAssessment {
  category: string;
  demonstratedLevel: number; // 1-10 scale
  evidence: {
    type: 'pr_analysis' | 'issue_resolution' | 'educational_engagement' | 'tool_usage';
    sourceId: string; // PR number, issue ID, etc.
    description: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    complexity?: number; // 1-10 scale
  };
  confidence: number; // 0-1 scale
}

/**
 * Skill progression analysis result
 */
export interface SkillProgression {
  previousLevel: number;
  newLevel: number;
  improvement: number;
  trend: 'improving' | 'maintaining' | 'declining';
  recentActivity: {
    prCount: number;
    avgComplexity: number;
    successRate: number;
    timespan: string;
  };
}

/**
 * Learning engagement tracking
 */
export interface LearningEngagement {
  educationalContentId: string;
  engagementType: 'viewed' | 'applied' | 'completed' | 'recommended';
  skillsTargeted: string[];
  improvementObserved: boolean;
  timestamp: Date;
}

/**
 * Comprehensive skill tracking service that integrates with PR analysis,
 * educational content, and learning progression tracking
 */
export class SkillTrackingService {
  private readonly logger = createLogger('SkillTrackingService');

  constructor(
    private authenticatedUser: AuthenticatedUser
  ) {}

  /**
   * Assess skills demonstrated in a PR analysis
   */
  async assessSkillsFromPR(
    prAnalysis: any,
    prMetadata: {
      prNumber: number;
      repository: string;
      filesChanged: number;
      linesChanged: number;
      complexity: number;
    },
    existingRepoIssues?: {
      security?: any[];
      codeQuality?: any[];
      architecture?: any[];
      performance?: any[];
      dependencies?: any[];
    }
  ): Promise<SkillAssessment[]> {
    this.logger.info('Assessing skills from PR analysis', {
      userId: this.authenticatedUser.id,
      prNumber: prMetadata.prNumber,
      repository: prMetadata.repository
    });

    const assessments: SkillAssessment[] = [];

    // Assess security skills
    if (prAnalysis.security?.vulnerabilities?.length > 0 || (existingRepoIssues?.security && existingRepoIssues.security.length > 0)) {
      const securityLevel = await this.calculateSecuritySkillLevel(
        prAnalysis.security,
        prMetadata.complexity,
        existingRepoIssues?.security
      );
      
      const prIssues = prAnalysis.security?.vulnerabilities?.length || 0;
      const repoIssues = existingRepoIssues?.security?.length || 0;
      
      assessments.push({
        category: 'security',
        demonstratedLevel: securityLevel.level,
        evidence: {
          type: 'pr_analysis',
          sourceId: `pr-${prMetadata.prNumber}`,
          description: `PR: ${prIssues} new issues, Repo: ${repoIssues} unresolved issues${securityLevel.activeDegradation > 0 ? ` (Active degradation: -${securityLevel.activeDegradation.toFixed(1)} points)` : ''}`,
          severity: this.categorizeSecuritySeverity([
            ...(prAnalysis.security?.vulnerabilities || []),
            ...(existingRepoIssues?.security || [])
          ]),
          complexity: prMetadata.complexity
        },
        confidence: securityLevel.confidence
      });
    }

    // Assess code quality skills
    if (prAnalysis.codeQuality) {
      const codeQualityLevel = this.calculateCodeQualitySkillLevel(
        prAnalysis.codeQuality,
        prMetadata
      );
      
      assessments.push({
        category: 'codeQuality',
        demonstratedLevel: codeQualityLevel.level,
        evidence: {
          type: 'pr_analysis',
          sourceId: `pr-${prMetadata.prNumber}`,
          description: `Code quality analysis: ${codeQualityLevel.reasoning}`,
          complexity: prMetadata.complexity
        },
        confidence: codeQualityLevel.confidence
      });
    }

    // Assess architecture skills
    if (prAnalysis.architecture) {
      const architectureLevel = this.calculateArchitectureSkillLevel(
        prAnalysis.architecture,
        prMetadata
      );
      
      if (architectureLevel.level > 0) {
        assessments.push({
          category: 'architecture',
          demonstratedLevel: architectureLevel.level,
          evidence: {
            type: 'pr_analysis',
            sourceId: `pr-${prMetadata.prNumber}`,
            description: `Architecture changes: ${architectureLevel.reasoning}`,
            complexity: prMetadata.complexity
          },
          confidence: architectureLevel.confidence
        });
      }
    }

    // Assess performance optimization skills
    if (prAnalysis.performance) {
      const performanceLevel = this.calculatePerformanceSkillLevel(
        prAnalysis.performance,
        prMetadata
      );
      
      if (performanceLevel.level > 0) {
        assessments.push({
          category: 'performance',
          demonstratedLevel: performanceLevel.level,
          evidence: {
            type: 'pr_analysis',
            sourceId: `pr-${prMetadata.prNumber}`,
            description: `Performance improvements: ${performanceLevel.reasoning}`,
            complexity: prMetadata.complexity
          },
          confidence: performanceLevel.confidence
        });
      }
    }

    // Assess dependency management skills
    if (prAnalysis.dependency) {
      const dependencyLevel = this.calculateDependencySkillLevel(
        prAnalysis.dependency,
        prMetadata
      );
      
      if (dependencyLevel.level > 0) {
        assessments.push({
          category: 'dependency',
          demonstratedLevel: dependencyLevel.level,
          evidence: {
            type: 'pr_analysis',
            sourceId: `pr-${prMetadata.prNumber}`,
            description: `Dependency management: ${dependencyLevel.reasoning}`,
            complexity: prMetadata.complexity
          },
          confidence: dependencyLevel.confidence
        });
      }
    }

    return assessments;
  }

  /**
   * Update user skills based on assessments
   */
  async updateSkillsFromAssessments(assessments: SkillAssessment[]): Promise<void> {
    this.logger.info('Updating skills from assessments', {
      userId: this.authenticatedUser.id,
      assessmentCount: assessments.length
    });

    for (const assessment of assessments) {
      try {
        await this.updateSkillLevel(assessment);
      } catch (error) {
        this.logger.error('Failed to update skill from assessment', {
          category: assessment.category,
          error: error instanceof Error ? error.message : error
        });
      }
    }
  }

  /**
   * Track when repository issues are fixed
   */
  async trackRepoIssueResolution(
    issuesFixed: {
      issueId: string;
      category: string;
      severity: 'critical' | 'high' | 'medium' | 'low';
      repository: string;
      prNumber?: number;
    }[]
  ): Promise<void> {
    this.logger.info('Tracking repository issue resolution', {
      userId: this.authenticatedUser.id,
      issuesFixedCount: issuesFixed.length
    });

    const supabase = getSupabase();
    let totalPointsEarned = 0;

    for (const fix of issuesFixed) {
      try {
        // Call the database function to handle resolution
        const { data, error } = await supabase
          .rpc('handle_issue_resolution', {
            p_repository: fix.repository,
            p_issue_id: fix.issueId,
            p_issue_category: fix.category,
            p_issue_severity: fix.severity,
            p_resolved_by_user_id: this.authenticatedUser.id,
            p_pr_number: fix.prNumber || null
          });

        if (error) {
          this.logger.error('Failed to handle issue resolution', {
            issueId: fix.issueId,
            error: error.message
          });
          continue;
        }

        const pointsEarned = data || 0;
        totalPointsEarned += Number(pointsEarned) || 0;

        // Create assessment for skill update
        const assessment: SkillAssessment = {
          category: fix.category,
          demonstratedLevel: Number(pointsEarned) || 0,
          evidence: {
            type: 'issue_resolution',
            sourceId: `issue-${fix.issueId}`,
            description: `Fixed ${fix.severity} ${fix.category} issue in ${fix.repository}`,
            severity: fix.severity,
            complexity: fix.severity === 'critical' ? 8 : fix.severity === 'high' ? 6 : 4
          },
          confidence: 0.95 // High confidence for fixing issues
        };

        await this.updateSkillLevel(assessment);
      } catch (error) {
        this.logger.error('Error tracking issue resolution', {
          issueId: fix.issueId,
          error: error instanceof Error ? error.message : error
        });
      }
    }

    this.logger.info('Completed tracking issue resolutions', {
      totalPointsEarned,
      issuesFixed: issuesFixed.length
    });
  }

  /**
   * Apply skill degradation for unresolved repository issues
   */
  async applyRepoIssueDegradation(
    unresolvedIssues: {
      issueId: string;
      category: string;
      severity: 'critical' | 'high' | 'medium' | 'low';
      repository: string;
    }[]
  ): Promise<number> {
    this.logger.info('Applying skill degradation for unresolved issues', {
      userId: this.authenticatedUser.id,
      issueCount: unresolvedIssues.length
    });

    const supabase = getSupabase();
    let totalDegradation = 0;

    for (const issue of unresolvedIssues) {
      try {
        const { data, error } = await supabase
          .rpc('apply_issue_degradation', {
            p_user_id: this.authenticatedUser.id,
            p_repository: issue.repository,
            p_issue_id: issue.issueId,
            p_issue_category: issue.category,
            p_issue_severity: issue.severity
          });

        if (error) {
          this.logger.error('Failed to apply issue degradation', {
            issueId: issue.issueId,
            error: error.message
          });
          continue;
        }

        totalDegradation += Number(data) || 0;
      } catch (error) {
        this.logger.error('Error applying issue degradation', {
          issueId: issue.issueId,
          error: error instanceof Error ? error.message : error
        });
      }
    }

    this.logger.info('Completed applying issue degradations', {
      totalDegradation,
      issuesProcessed: unresolvedIssues.length
    });

    return totalDegradation;
  }

  /**
   * Get active skill degradations for the user
   */
  async getActiveDegradations(): Promise<{
    repository: string;
    issueCount: number;
    totalDegradation: number;
    bySeverity: Record<string, { count: number; degradation: number }>;
  }[]> {
    const supabase = getSupabase();
    
    const { data, error } = await supabase
      .rpc('get_active_degradations', {
        p_user_id: this.authenticatedUser.id
      });

    if (error) {
      this.logger.error('Failed to get active degradations', {
        error: error.message
      });
      return [];
    }

    return Array.isArray(data) ? data.map((row: any) => ({
      repository: row.repository,
      issueCount: Number(row.issue_count),
      totalDegradation: Number(row.total_degradation),
      bySeverity: row.by_severity || {}
    })) : [];
  }

  /**
   * Get resolution history for the user
   */
  async getResolutionHistory(days = 90): Promise<{
    repository: string;
    resolutions: number;
    skillPointsEarned: number;
    bySeverity: Record<string, { count: number; points: number }>;
    recentResolutions: any[];
  }[]> {
    const supabase = getSupabase();
    
    const { data, error } = await supabase
      .rpc('get_resolution_history', {
        p_user_id: this.authenticatedUser.id,
        p_days: days
      });

    if (error) {
      this.logger.error('Failed to get resolution history', {
        error: error.message
      });
      return [];
    }

    return Array.isArray(data) ? data.map((row: any) => ({
      repository: row.repository,
      resolutions: Number(row.resolutions),
      skillPointsEarned: Number(row.skill_points_earned),
      bySeverity: row.by_severity || {},
      recentResolutions: row.recent_resolutions || []
    })) : [];
  }

  /**
   * Track learning engagement from educational content
   */
  async trackLearningEngagement(engagement: LearningEngagement): Promise<void> {
    this.logger.info('Tracking learning engagement', {
      userId: this.authenticatedUser.id,
      contentId: engagement.educationalContentId,
      type: engagement.engagementType
    });

    // Update skills based on educational engagement
    for (const skillCategory of engagement.skillsTargeted) {
      const improvementLevel = this.calculateLearningImprovement(engagement);
      
      if (improvementLevel > 0) {
        const assessment: SkillAssessment = {
          category: skillCategory,
          demonstratedLevel: improvementLevel,
          evidence: {
            type: 'educational_engagement',
            sourceId: engagement.educationalContentId,
            description: `Engaged with educational content: ${engagement.engagementType}`
          },
          confidence: engagement.improvementObserved ? 0.8 : 0.4
        };

        await this.updateSkillLevel(assessment);
      }
    }
  }

  /**
   * Get user's current skill levels
   */
  async getCurrentSkills(): Promise<DeveloperSkill[]> {
    const skills = await SkillModel.getUserSkills(this.authenticatedUser.id);
    return skills || [];
  }

  /**
   * Get skill progression history
   */
  async getSkillProgression(category: string, timespan = '3m'): Promise<SkillProgression | null> {
    const currentSkills = await this.getCurrentSkills();
    const currentSkill = currentSkills.find(s => s.categoryId === category);
    
    if (!currentSkill) {
      return null;
    }

    const history = await SkillModel.getSkillHistory(currentSkill.id);
    const cutoffDate = this.calculateCutoffDate(timespan);
    const recentHistory = history.filter((h: any) => h.createdAt >= cutoffDate);

    if (recentHistory.length === 0) {
      return null;
    }

    const oldestLevel = recentHistory[recentHistory.length - 1].level;
    const currentLevel = currentSkill.level;
    const improvement = currentLevel - oldestLevel;

    // Calculate recent activity metrics
    const prActivity = this.calculateRecentPRActivity(recentHistory);

    return {
      previousLevel: oldestLevel,
      newLevel: currentLevel,
      improvement,
      trend: improvement > 0 ? 'improving' : improvement < 0 ? 'declining' : 'maintaining',
      recentActivity: prActivity
    };
  }

  /**
   * Generate skill-based learning recommendations
   */
  async generateSkillBasedRecommendations(): Promise<string[]> {
    const currentSkills = await this.getCurrentSkills();
    const recommendations: string[] = [];

    for (const skill of currentSkills) {
      const progression = await this.getSkillProgression(skill.categoryId);
      
      if (!progression || progression.trend === 'declining') {
        recommendations.push(`Focus on improving ${skill.categoryName} skills through targeted practice`);
      } else if (skill.level >= 7 && progression.trend === 'improving') {
        recommendations.push(`Consider mentoring others in ${skill.categoryName} to solidify expertise`);
      } else if (skill.level < 4) {
        recommendations.push(`Build foundational knowledge in ${skill.categoryName} through structured learning`);
      }
    }

    return recommendations;
  }

  // Private helper methods

  private async updateSkillLevel(assessment: SkillAssessment): Promise<void> {
    const currentSkills = await this.getCurrentSkills();
    const existingSkill = currentSkills.find(s => s.categoryId === assessment.category);

    if (existingSkill) {
      // Calculate new level using weighted average
      const weightedLevel = this.calculateWeightedSkillLevel(
        existingSkill.level,
        assessment.demonstratedLevel,
        assessment.confidence
      );

      await SkillModel.updateSkill(
        existingSkill.id,
        weightedLevel,
        assessment.evidence.type,
        assessment.evidence.sourceId
      );
    } else {
      // Create new skill entry - would need to implement createSkill method
      this.logger.warn('Skill category not found for user, skipping update', {
        category: assessment.category,
        userId: this.authenticatedUser.id
      });
    }
  }

  private async calculateSecuritySkillLevel(
    securityAnalysis: any, 
    complexity: number,
    existingRepoIssues?: any[]
  ): Promise<{ level: number; confidence: number; activeDegradation: number }> {
    const prVulnerabilities = securityAnalysis?.vulnerabilities || [];
    const repoVulnerabilities = existingRepoIssues || [];
    
    // Count PR issues
    const prVulnerabilityCount = prVulnerabilities.length;
    const prCriticalCount = prVulnerabilities.filter((v: any) => v.severity === 'critical').length;
    const prHighCount = prVulnerabilities.filter((v: any) => v.severity === 'high').length;
    
    let baseLevel = 5; // Default starting level
    let degradationFactor = 0;
    
    // Assess based on new PR issues
    if (prVulnerabilityCount === 0) {
      baseLevel = 8; // Good security practices in PR
    } else if (prCriticalCount === 0 && prHighCount === 0) {
      baseLevel = 6; // Some issues but not critical/high
    } else {
      baseLevel = 3; // Critical/high security issues introduced
      // Apply degradation for new critical/high issues
      degradationFactor = (prCriticalCount * 1.5) + (prHighCount * 1.0);
    }
    
    // Get active degradations from database
    const activeDegradations = await this.getActiveDegradations();
    let activeDegradationAmount = 0;
    
    // Sum up all active degradations for security category
    for (const degradation of activeDegradations) {
      activeDegradationAmount += degradation.totalDegradation;
    }
    
    // Apply active degradation
    degradationFactor += activeDegradationAmount;

    // Adjust for complexity
    const complexityModifier = Math.min(complexity / 10, 0.5);
    const finalLevel = Math.min(10, Math.max(1, baseLevel + complexityModifier - degradationFactor));
    
    return {
      level: Math.round(finalLevel),
      confidence: (prVulnerabilityCount > 0 || repoVulnerabilities.length > 0) ? 0.9 : 0.7,
      activeDegradation: activeDegradationAmount
    };
  }

  private calculateCodeQualitySkillLevel(codeQualityAnalysis: any, metadata: any): { level: number; confidence: number; reasoning: string } {
    const issues = codeQualityAnalysis.complexityIssues?.length || 0;
    const codeSmells = codeQualityAnalysis.codeSmells?.length || 0;
    const linesChanged = metadata.linesChanged || 0;
    
    // Count critical/high code quality issues
    const criticalQualityIssues = codeQualityAnalysis.complexityIssues?.filter((i: any) => 
      i.severity === 'critical' || i.severity === 'high'
    ).length || 0;
    
    let baseLevel = 5;
    let reasoning = '';
    let degradationFactor = 0;

    if (issues === 0 && codeSmells === 0) {
      baseLevel = 8;
      reasoning = 'Clean code with no quality issues';
    } else if (issues + codeSmells < 3) {
      baseLevel = 6;
      reasoning = 'Minor quality issues';
    } else {
      baseLevel = 3;
      reasoning = 'Multiple quality issues detected';
      // Apply degradation for unresolved critical/high issues
      degradationFactor = criticalQualityIssues * 0.8;
    }

    // Adjust for change size
    if (linesChanged > 500) {
      baseLevel += 1; // Bonus for handling large changes well
      reasoning += ', handled large changeset';
    }

    return {
      level: Math.min(10, Math.max(1, baseLevel - degradationFactor)),
      confidence: 0.8,
      reasoning
    };
  }

  private calculateArchitectureSkillLevel(architectureAnalysis: any, metadata: any): { level: number; confidence: number; reasoning: string } {
    const designViolations = architectureAnalysis.designPatternViolations?.length || 0;
    const technicalDebt = architectureAnalysis.technicalDebt?.length || 0;
    const filesChanged = metadata.filesChanged || 0;
    
    // Only assess if significant architectural changes
    if (filesChanged < 5) {
      return { level: 0, confidence: 0, reasoning: 'Insufficient architectural scope' };
    }

    let baseLevel = 5;
    let reasoning = '';

    if (designViolations === 0 && technicalDebt === 0) {
      baseLevel = 8;
      reasoning = 'Good architectural decisions';
    } else if (designViolations + technicalDebt < 3) {
      baseLevel = 6;
      reasoning = 'Minor architectural issues';
    } else {
      baseLevel = 4;
      reasoning = 'Several architectural concerns';
    }

    return {
      level: baseLevel,
      confidence: filesChanged > 10 ? 0.9 : 0.6,
      reasoning
    };
  }

  private calculatePerformanceSkillLevel(performanceAnalysis: any, metadata: any): { level: number; confidence: number; reasoning: string } {
    const performanceIssues = performanceAnalysis.performanceIssues?.length || 0;
    const optimizations = performanceAnalysis.optimizationOpportunities?.length || 0;
    
    if (performanceIssues === 0 && optimizations === 0) {
      return { level: 0, confidence: 0, reasoning: 'No performance context' };
    }

    let baseLevel = 5;
    let reasoning = '';

    if (performanceIssues === 0) {
      baseLevel = 7;
      reasoning = 'No performance issues introduced';
    } else if (performanceIssues < 3) {
      baseLevel = 5;
      reasoning = 'Minor performance concerns';
    } else {
      baseLevel = 3;
      reasoning = 'Multiple performance issues';
    }

    return {
      level: baseLevel,
      confidence: 0.7,
      reasoning
    };
  }

  private calculateDependencySkillLevel(dependencyAnalysis: any, metadata: any): { level: number; confidence: number; reasoning: string } {
    const vulnerabilities = dependencyAnalysis.vulnerabilityIssues?.length || 0;
    const licenseIssues = dependencyAnalysis.licenseIssues?.length || 0;
    const outdated = dependencyAnalysis.outdatedPackages?.length || 0;
    
    if (vulnerabilities === 0 && licenseIssues === 0 && outdated === 0) {
      return { level: 0, confidence: 0, reasoning: 'No dependency context' };
    }

    let baseLevel = 5;
    let reasoning = '';

    if (vulnerabilities === 0 && licenseIssues === 0) {
      baseLevel = 7;
      reasoning = 'Good dependency management';
    } else if (vulnerabilities + licenseIssues < 3) {
      baseLevel = 5;
      reasoning = 'Minor dependency issues';
    } else {
      baseLevel = 3;
      reasoning = 'Dependency management needs attention';
    }

    return {
      level: baseLevel,
      confidence: 0.8,
      reasoning
    };
  }

  private calculateWeightedSkillLevel(currentLevel: number, newLevel: number, confidence: number): number {
    // Use confidence as weight for new assessment
    const weight = confidence * 0.3; // Max 30% influence from single assessment
    const weightedLevel = (currentLevel * (1 - weight)) + (newLevel * weight);
    return Math.min(10, Math.max(1, Math.round(weightedLevel)));
  }

  private calculateLearningImprovement(engagement: LearningEngagement): number {
    switch (engagement.engagementType) {
      case 'viewed':
        return engagement.improvementObserved ? 0.5 : 0.2;
      case 'applied':
        return engagement.improvementObserved ? 1.5 : 0.8;
      case 'completed':
        return engagement.improvementObserved ? 2.0 : 1.0;
      case 'recommended':
        return 0.1; // Small boost for following recommendations
      default:
        return 0;
    }
  }

  private categorizeSecuritySeverity(vulnerabilities: any[]): 'low' | 'medium' | 'high' | 'critical' {
    const hasCritical = vulnerabilities.some((v: any) => v.severity === 'critical');
    const hasHigh = vulnerabilities.some(v => v.severity === 'high');
    const hasMedium = vulnerabilities.some(v => v.severity === 'medium');
    
    if (hasCritical) return 'critical';
    if (hasHigh) return 'high';
    if (hasMedium) return 'medium';
    return 'low';
  }

  private calculateCutoffDate(timespan: string): Date {
    const now = new Date();
    switch (timespan) {
      case '1m':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '3m':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      case '6m':
        return new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
      case '1y':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    }
  }

  private calculateRecentPRActivity(history: SkillHistoryEntry[]): {
    prCount: number;
    avgComplexity: number;
    successRate: number;
    timespan: string;
  } {
    const prEntries = history.filter((h: any) => h.evidenceType === 'pr_analysis');
    const prCount = prEntries.length;
    
    // Simplified metrics - in real implementation, would analyze actual PR data
    return {
      prCount,
      avgComplexity: 5, // Would calculate from actual PR complexity
      successRate: 0.95, // Would calculate from PR success/failure rates
      timespan: '3m'
    };
  }
}