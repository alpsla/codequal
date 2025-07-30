import { Logger } from '@codequal/core/utils';

// This is a pure analyzer - no external connections
// It only compares historical data with current issues

export interface RepositoryIssueHistory {
  repositoryUrl: string;
  issueId: string;
  firstSeen: Date;
  lastSeen: Date;
  occurrences: number;
  severity: string;
  category: string;
  status: 'active' | 'resolved' | 'recurring';
}

export interface RepositoryAnalysis {
  newIssues: string[];
  recurringIssues: string[];
  resolvedIssues: string[];
  technicalDebt: TechnicalDebtMetrics;
  issueUpdates: IssueUpdate[]; // For Orchestrator to persist
}

export interface IssueUpdate {
  issueId: string;
  action: 'create' | 'update' | 'resolve';
  data: any;
}

export interface TechnicalDebtMetrics {
  totalDebt: number; // in hours
  debtByCategory: Record<string, number>;
  debtTrend: 'increasing' | 'stable' | 'decreasing';
  estimatedCost: number; // in dollars
  prioritizedIssues: Array<{
    issueId: string;
    impact: 'critical' | 'high' | 'medium' | 'low';
    effort: number; // hours
    roi: number; // impact/effort ratio
  }>;
}

export class RepositoryAnalyzer {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Analyze repository issues - compare historical with current
   * Returns analysis and updates for Orchestrator to persist
   */
  analyzeRepositoryIssues(
    historicalIssues: RepositoryIssueHistory[],
    currentIssues: any[],
    analysisDate: Date = new Date()
  ): RepositoryAnalysis {
    this.logger.info('Analyzing repository issues');
    
    const currentIssueIds = new Set(currentIssues.map(i => this.generateIssueId(i)));
    const historicalIssueIds = new Set(historicalIssues.map(h => h.issueId));
    
    // Categorize issues
    const newIssues = currentIssues
      .filter(i => !historicalIssueIds.has(this.generateIssueId(i)))
      .map(i => this.generateIssueId(i));
    
    const recurringIssues = historicalIssues
      .filter(h => currentIssueIds.has(h.issueId) && h.occurrences > 1)
      .map(h => h.issueId);
    
    const resolvedIssues = historicalIssues
      .filter(h => !currentIssueIds.has(h.issueId) && h.status === 'active')
      .map(h => h.issueId);
    
    // Calculate technical debt
    const technicalDebt = this.calculateTechnicalDebt(
      currentIssues,
      historicalIssues
    );
    
    // Prepare updates for Orchestrator
    const issueUpdates = this.prepareIssueUpdates(
      currentIssues,
      historicalIssues,
      analysisDate
    );
    
    return {
      newIssues,
      recurringIssues,
      resolvedIssues,
      technicalDebt,
      issueUpdates
    };
  }

  /**
   * Generate educational request based on issues and skills
   */
  generateEducationalRequest(
    issues: any[],
    userSkillLevel: Record<string, number>,
    technicalDebt: TechnicalDebtMetrics
  ): EducationalAgentRequest {
    const issuePatterns = this.analyzeIssuePatterns(issues);
    const skillGaps = this.identifySkillGaps(issuePatterns, userSkillLevel);
    const prioritizedTopics = this.prioritizeLearningTopics(
      issuePatterns,
      skillGaps,
      technicalDebt
    );

    return {
      userSkillLevel,
      issuePatterns,
      skillGaps,
      prioritizedTopics,
      context: {
        totalIssues: issues.length,
        criticalCount: issues.filter(i => i.severity === 'critical').length,
        technicalDebtHours: technicalDebt.totalDebt,
        recurringPatterns: this.findRecurringPatterns(issues)
      },
      requestedModules: prioritizedTopics.slice(0, 5).map(topic => ({
        topic: topic.name,
        reason: topic.reason,
        urgency: topic.urgency,
        currentSkillLevel: userSkillLevel[topic.skillArea] || 0,
        targetSkillLevel: topic.targetLevel,
        estimatedLearningTime: topic.estimatedTime
      }))
    };
  }

  // Helper methods
  private generateIssueId(issue: any): string {
    return `${issue.category}-${issue.type || issue.title}-${issue.location?.file || 'global'}-${issue.location?.line || 0}`;
  }

  private prepareIssueUpdates(
    currentIssues: any[],
    historicalIssues: RepositoryIssueHistory[],
    analysisDate: Date
  ): IssueUpdate[] {
    const updates: IssueUpdate[] = [];
    
    // Updates for existing issues
    historicalIssues.forEach(historical => {
      const stillExists = currentIssues.some(i => 
        this.generateIssueId(i) === historical.issueId
      );
      
      if (stillExists) {
        // Issue still exists - needs update
        updates.push({
          issueId: historical.issueId,
          action: 'update',
          data: {
            lastSeen: analysisDate,
            occurrences: (historical.occurrences || 0) + 1,
            status: historical.occurrences > 2 ? 'recurring' : 'active'
          }
        });
      } else if (historical.status === 'active') {
        // Issue resolved
        updates.push({
          issueId: historical.issueId,
          action: 'resolve',
          data: {
            status: 'resolved',
            resolvedAt: analysisDate
          }
        });
      }
    });
    
    // New issues to create
    const historicalIds = new Set(historicalIssues.map(h => h.issueId));
    currentIssues
      .filter(i => !historicalIds.has(this.generateIssueId(i)))
      .forEach(issue => {
        updates.push({
          issueId: this.generateIssueId(issue),
          action: 'create',
          data: {
            issueId: this.generateIssueId(issue),
            firstSeen: analysisDate,
            lastSeen: analysisDate,
            occurrences: 1,
            severity: issue.severity,
            category: issue.category,
            title: issue.title,
            description: issue.description,
            status: 'active'
          }
        });
      });
    
    return updates;
  }

  private calculateTechnicalDebt(
    currentIssues: any[],
    historicalIssues: RepositoryIssueHistory[]
  ): TechnicalDebtMetrics {
    const effortMap = {
      critical: { security: 8, performance: 6, other: 4 },
      high: { security: 4, performance: 3, other: 2 },
      medium: { security: 2, performance: 2, other: 1 },
      low: { security: 1, performance: 1, other: 0.5 }
    };

    let totalDebt = 0;
    const debtByCategory: Record<string, number> = {};
    const prioritizedIssues: any[] = [];

    currentIssues.forEach(issue => {
      const severity = issue.severity as keyof typeof effortMap;
      const category = issue.category === 'security' || issue.category === 'performance' 
        ? issue.category 
        : 'other';
      
      const effort = (effortMap[severity] as any)?.[category] || 1;
      const historical = historicalIssues.find(h => h.issueId === this.generateIssueId(issue));
      
      // Increase effort for recurring issues
      const adjustedEffort = (historical?.occurrences || 0) > 1 ? effort * 1.5 : effort;
      
      totalDebt += adjustedEffort;
      debtByCategory[issue.category] = (debtByCategory[issue.category] || 0) + adjustedEffort;
      
      // Calculate ROI (impact/effort)
      const impactScore = severity === 'critical' ? 10 : severity === 'high' ? 7 : severity === 'medium' ? 4 : 2;
      const roi = impactScore / adjustedEffort;
      
      prioritizedIssues.push({
        issueId: this.generateIssueId(issue),
        impact: severity,
        effort: adjustedEffort,
        roi
      });
    });

    // Sort by ROI
    prioritizedIssues.sort((a, b) => b.roi - a.roi);

    // Determine trend based on historical data
    const previousDebtLevels = historicalIssues
      .filter(h => h.status === 'active')
      .length;
    
    let debtTrend: 'increasing' | 'stable' | 'decreasing' = 'stable';
    if (currentIssues.length > previousDebtLevels * 1.1) {
      debtTrend = 'increasing';
    } else if (currentIssues.length < previousDebtLevels * 0.9) {
      debtTrend = 'decreasing';
    }

    return {
      totalDebt: Math.round(totalDebt * 10) / 10,
      debtByCategory,
      debtTrend,
      estimatedCost: Math.round(totalDebt * 150), // $150/hour average
      prioritizedIssues: prioritizedIssues.slice(0, 10)
    };
  }

  private analyzeIssuePatterns(issues: any[]): IssuePattern[] {
    const patterns: Record<string, IssuePattern> = {};

    issues.forEach(issue => {
      const key = `${issue.category}-${issue.type || 'general'}`;
      
      if (!patterns[key]) {
        patterns[key] = {
          category: issue.category,
          type: issue.type || 'general',
          count: 0,
          severity: issue.severity,
          examples: []
        };
      }
      
      patterns[key].count++;
      if (patterns[key].examples.length < 3) {
        patterns[key].examples.push(issue);
      }
    });

    return Object.values(patterns).sort((a, b) => b.count - a.count);
  }

  private identifySkillGaps(
    patterns: IssuePattern[],
    userSkills: Record<string, number>
  ): SkillGap[] {
    const gaps: SkillGap[] = [];
    const skillThresholds = {
      critical: 85,
      high: 75,
      medium: 65,
      low: 50
    };

    patterns.forEach(pattern => {
      const requiredSkill = skillThresholds[pattern.severity as keyof typeof skillThresholds];
      const currentSkill = userSkills[pattern.category] || 0;
      
      if (currentSkill < requiredSkill) {
        gaps.push({
          skill: pattern.category,
          current: currentSkill,
          required: requiredSkill,
          gap: requiredSkill - currentSkill,
          priority: pattern.severity
        });
      }
    });

    return gaps.sort((a, b) => b.gap - a.gap);
  }

  private prioritizeLearningTopics(
    patterns: IssuePattern[],
    gaps: SkillGap[],
    technicalDebt: TechnicalDebtMetrics
  ): LearningTopic[] {
    const topics: LearningTopic[] = [];
    const topDebtCategories = Object.entries(technicalDebt.debtByCategory)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([category]) => category);

    // Priority 1: Critical security issues
    const criticalSecurity = patterns.filter(p => 
      p.category === 'security' && p.severity === 'critical'
    );
    
    criticalSecurity.forEach(pattern => {
      topics.push({
        name: `${pattern.type} Security Vulnerabilities`,
        skillArea: 'security',
        reason: `${pattern.count} critical security issues found`,
        urgency: 'immediate',
        targetLevel: 85,
        estimatedTime: '2-3 hours',
        examples: pattern.examples
      });
    });

    // Priority 2: High-debt categories
    topDebtCategories.forEach(category => {
      const gap = gaps.find(g => g.skill === category);
      if (gap && gap.gap > 15) {
        topics.push({
          name: `${category} Best Practices`,
          skillArea: category,
          reason: `High technical debt (${Math.round(technicalDebt.debtByCategory[category])} hours)`,
          urgency: 'high',
          targetLevel: gap.required,
          estimatedTime: '1-2 hours',
          examples: patterns.filter(p => p.category === category).flatMap(p => p.examples)
        });
      }
    });

    return topics;
  }

  private findRecurringPatterns(issues: any[]): string[] {
    const patternCounts: Record<string, number> = {};
    
    issues.forEach(issue => {
      const pattern = `${issue.category}-${issue.type || issue.title}`;
      patternCounts[pattern] = (patternCounts[pattern] || 0) + 1;
    });

    return Object.entries(patternCounts)
      .filter(([, count]) => count > 1)
      .map(([pattern]) => pattern);
  }
}

// Type definitions
interface IssuePattern {
  category: string;
  type: string;
  count: number;
  severity: string;
  examples: any[];
}

interface SkillGap {
  skill: string;
  current: number;
  required: number;
  gap: number;
  priority: string;
}

interface LearningTopic {
  name: string;
  skillArea: string;
  reason: string;
  urgency: 'immediate' | 'high' | 'medium' | 'low';
  targetLevel: number;
  estimatedTime: string;
  examples: any[];
}

export interface EducationalAgentRequest {
  userSkillLevel: Record<string, number>;
  issuePatterns: IssuePattern[];
  skillGaps: SkillGap[];
  prioritizedTopics: LearningTopic[];
  context: {
    totalIssues: number;
    criticalCount: number;
    technicalDebtHours: number;
    recurringPatterns: string[];
  };
  requestedModules: Array<{
    topic: string;
    reason: string;
    urgency: string;
    currentSkillLevel: number;
    targetSkillLevel: number;
    estimatedLearningTime: string;
  }>;
}