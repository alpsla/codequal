/**
 * Enhanced V8 Report Generator for CodeQual
 * 
 * Implements complete report structure including:
 * - Per-issue details with code snippets
 * - Education insights from Educator agent
 * - Business impact analysis
 * - Skills tracking
 * - Priority action plans
 * - PR decision logic
 */

import { createClient } from '@supabase/supabase-js';
import Redis from 'ioredis';

export interface EnhancedIssue {
  id: string;
  title: string;
  description: string;
  type: 'security' | 'performance' | 'quality' | 'architecture' | 'dependency';
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  file: string;
  line: number;
  column?: number;
  endLine?: number;
  impact: string;
  businessImpact: string;
  codeSnippet?: string;
  fixSuggestion?: string;
  fixCodeSnippet?: string;
  educationInsight?: EducationResource[];
  tool?: string;
  agent?: string;
  confidence: number;
  effortEstimate?: string;
  skillImpact?: number;
  isExisting?: boolean;
  age?: string;
}

export interface EducationResource {
  title: string;
  url: string;
  type: 'course' | 'video' | 'documentation' | 'article';
  provider: string;
  duration?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
}

export interface BusinessImpact {
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  financialImpact: string;
  timeToResolution: string;
  userImpact: string;
  complianceImpact: string;
  reputationImpact: string;
  productivityImpact: string;
}

export interface SkillMetrics {
  developer: string;
  overallScore: number;
  previousScore: number;
  change: number;
  skills: {
    security: number;
    performance: number;
    architecture: number;
    codeQuality: number;
    dependency: number;
    testing: number;
  };
  skillChanges: {
    security: number;
    performance: number;
    architecture: number;
    codeQuality: number;
    dependency: number;
    testing: number;
  };
  deductions: {
    newIssues: number;
    unfixedIssues: number;
    dependencies: number;
    total: number;
  };
}

export interface TeamMetrics {
  averageScore: number;
  teamGrade: string;
  velocity: number;
  knowledgeGaps: string[];
  trainingNeeds: string[];
  collaborationScore: number;
}

export interface PriorityActionPlan {
  immediate: ActionItem[];
  thisWeek: ActionItem[];
  nextSprint: ActionItem[];
  backlog: ActionItem[];
}

export interface ActionItem {
  id: string;
  issue: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  effort: string;
  assignee?: string;
  dueDate?: string;
}

export interface EnhancedReport {
  // Core information
  timestamp: Date;
  repository: string;
  prNumber: number;
  author: string;
  sessionId: string;
  
  // Decision
  decision: 'APPROVED' | 'REJECTED' | 'NEEDS_REVIEW';
  confidence: number;
  decisionReason: string;
  
  // Scores
  overallScore: number;
  grade: string;
  scoreBreakdown: {
    security: number;
    performance: number;
    architecture: number;
    codeQuality: number;
    dependency: number;
    testing: number;
  };
  
  // Issues
  issues: {
    new: EnhancedIssue[];
    resolved: EnhancedIssue[];
    existing: EnhancedIssue[];
    unchanged: EnhancedIssue[];
  };
  
  // Business Impact
  businessImpact: BusinessImpact;
  
  // Skills Tracking
  skillMetrics: SkillMetrics;
  teamMetrics: TeamMetrics;
  
  // Education
  educationInsights: {
    highPriority: EducationResource[];
    recommended: EducationResource[];
    skillGaps: string[];
  };
  
  // Action Plans
  actionPlan: PriorityActionPlan;
  
  // PR Comment
  prComment: {
    summary: string;
    blockingIssues: string[];
    achievements: string[];
    requiredActions: string[];
    nextSteps: string[];
  };
  
  // Performance
  performanceMetrics: {
    totalTime: number;
    cloneTime: number;
    analysisTime: number;
    reportGenerationTime: number;
  };
}

export class EnhancedReportGenerator {
  private redis: Redis;
  private supabase: ReturnType<typeof createClient>;
  
  constructor(
    redisUrl: string,
    supabaseUrl: string,
    supabaseKey: string
  ) {
    this.redis = new Redis(redisUrl);
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }
  
  /**
   * Fetch code snippet from cached repository
   */
  private async getCodeSnippet(
    sessionId: string,
    file: string,
    line: number,
    contextLines = 3
  ): Promise<string | undefined> {
    try {
      const cacheKey = `repo:${sessionId}:${file}`;
      const fileContent = await this.redis.get(cacheKey);
      
      if (!fileContent) {
        return undefined;
      }
      
      const lines = fileContent.split('\n');
      const startLine = Math.max(0, line - contextLines - 1);
      const endLine = Math.min(lines.length, line + contextLines);
      
      const snippet = lines.slice(startLine, endLine)
        .map((l, i) => {
          const lineNum = startLine + i + 1;
          const marker = lineNum === line ? '>' : ' ';
          return `${marker} ${lineNum.toString().padStart(4)} | ${l}`;
        })
        .join('\n');
      
      return snippet;
    } catch (error) {
      console.error(`Failed to get code snippet: ${error}`);
      return undefined;
    }
  }
  
  /**
   * Get education resources from Educator agent
   */
  private async getEducationInsights(
    issues: EnhancedIssue[]
  ): Promise<EducationResource[]> {
    // Group issues by type and severity
    const groupedIssues = issues.reduce((acc, issue) => {
      const key = `${issue.type}-${issue.severity}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(issue);
      return acc;
    }, {} as Record<string, EnhancedIssue[]>);
    
    const resources: EducationResource[] = [];
    
    // Map issue types to educational resources
    for (const [key, issueGroup] of Object.entries(groupedIssues)) {
      const [type, severity] = key.split('-');
      
      if (type === 'security' && (severity === 'critical' || severity === 'high')) {
        resources.push({
          title: 'OWASP Top 10 Security Training',
          url: 'https://owasp.org/www-project-top-ten/',
          type: 'course',
          provider: 'OWASP',
          duration: '4 hours',
          difficulty: 'intermediate'
        });
      }
      
      if (type === 'performance') {
        resources.push({
          title: 'Performance Optimization Best Practices',
          url: 'https://web.dev/performance/',
          type: 'documentation',
          provider: 'Google Web',
          difficulty: 'intermediate'
        });
      }
      
      if (type === 'dependency') {
        resources.push({
          title: 'Dependency Management & Security',
          url: 'https://docs.github.com/en/code-security/supply-chain-security',
          type: 'documentation',
          provider: 'GitHub',
          difficulty: 'beginner'
        });
      }
    }
    
    return resources;
  }
  
  /**
   * Calculate business impact based on issues
   */
  private calculateBusinessImpact(issues: EnhancedIssue[]): BusinessImpact {
    const criticalCount = issues.filter(i => i.severity === 'critical').length;
    const highCount = issues.filter(i => i.severity === 'high').length;
    const securityCount = issues.filter(i => i.type === 'security').length;
    
    let riskLevel: 'critical' | 'high' | 'medium' | 'low' = 'low';
    if (criticalCount > 0) riskLevel = 'critical';
    else if (highCount > 2) riskLevel = 'high';
    else if (highCount > 0) riskLevel = 'medium';
    
    const financialImpact = criticalCount > 0 ? '$10K-$50K' :
                           highCount > 0 ? '$5K-$10K' :
                           '$1K-$5K';
    
    const timeToResolution = criticalCount > 0 ? '1-2 days' :
                            highCount > 0 ? '3-5 days' :
                            '1 week';
    
    return {
      riskLevel,
      financialImpact,
      timeToResolution,
      userImpact: securityCount > 0 ? 'High - Security vulnerabilities affect users' : 'Low',
      complianceImpact: securityCount > 0 ? 'Potential compliance violations' : 'None',
      reputationImpact: criticalCount > 0 ? 'High risk to brand reputation' : 'Minimal',
      productivityImpact: `${(criticalCount + highCount) * 25}% reduction if not addressed`
    };
  }
  
  /**
   * Calculate skill metrics for developer
   */
  private calculateSkillMetrics(
    developer: string,
    newIssues: EnhancedIssue[],
    resolvedIssues: EnhancedIssue[],
    existingIssues: EnhancedIssue[]
  ): SkillMetrics {
    const baseScore = 75;
    
    // Calculate deductions
    const newIssuesPenalty = newIssues.reduce((sum, i) => {
      if (i.severity === 'critical') return sum + 5;
      if (i.severity === 'high') return sum + 3;
      if (i.severity === 'medium') return sum + 1;
      return sum + 0.5;
    }, 0);
    
    const unfixedPenalty = existingIssues.length * 0.5;
    
    // Calculate improvements
    const fixBonus = resolvedIssues.reduce((sum, i) => {
      if (i.severity === 'critical') return sum + 4;
      if (i.severity === 'high') return sum + 2;
      return sum + 1;
    }, 0);
    
    const overallScore = Math.max(0, Math.min(100, baseScore - newIssuesPenalty - unfixedPenalty + fixBonus));
    
    return {
      developer,
      overallScore: Math.round(overallScore),
      previousScore: baseScore,
      change: Math.round(overallScore - baseScore),
      skills: {
        security: Math.round(baseScore - (newIssues.filter(i => i.type === 'security').length * 2)),
        performance: Math.round(baseScore - (newIssues.filter(i => i.type === 'performance').length * 1.5)),
        architecture: Math.round(baseScore - (newIssues.filter(i => i.type === 'architecture').length * 2)),
        codeQuality: Math.round(baseScore - (newIssues.filter(i => i.type === 'quality').length * 1)),
        dependency: Math.round(baseScore - (newIssues.filter(i => i.type === 'dependency').length * 1.5)),
        testing: 70 // Default
      },
      skillChanges: {
        security: -Math.round(newIssues.filter(i => i.type === 'security').length * 2),
        performance: -Math.round(newIssues.filter(i => i.type === 'performance').length * 1.5),
        architecture: -Math.round(newIssues.filter(i => i.type === 'architecture').length * 2),
        codeQuality: -Math.round(newIssues.filter(i => i.type === 'quality').length * 1),
        dependency: -Math.round(newIssues.filter(i => i.type === 'dependency').length * 1.5),
        testing: 0
      },
      deductions: {
        newIssues: Math.round(newIssuesPenalty),
        unfixedIssues: Math.round(unfixedPenalty),
        dependencies: 0,
        total: Math.round(newIssuesPenalty + unfixedPenalty)
      }
    };
  }
  
  /**
   * Generate priority action plan
   */
  private generateActionPlan(issues: EnhancedIssue[]): PriorityActionPlan {
    const immediate = issues
      .filter(i => i.severity === 'critical' || (i.severity === 'high' && i.type === 'security'))
      .map(i => ({
        id: i.id,
        issue: i.title,
        priority: i.severity as 'critical' | 'high',
        effort: i.effortEstimate || '2-4 hours'
      }));
    
    const thisWeek = issues
      .filter(i => i.severity === 'high' && i.type !== 'security')
      .map(i => ({
        id: i.id,
        issue: i.title,
        priority: 'high' as const,
        effort: i.effortEstimate || '4-8 hours'
      }));
    
    const nextSprint = issues
      .filter(i => i.severity === 'medium')
      .map(i => ({
        id: i.id,
        issue: i.title,
        priority: 'medium' as const,
        effort: i.effortEstimate || '1-2 days'
      }));
    
    const backlog = issues
      .filter(i => i.severity === 'low')
      .map(i => ({
        id: i.id,
        issue: i.title,
        priority: 'low' as const,
        effort: i.effortEstimate || '2-4 hours'
      }));
    
    return {
      immediate,
      thisWeek,
      nextSprint,
      backlog
    };
  }
  
  /**
   * Generate PR comment
   */
  private generatePRComment(
    decision: string,
    issues: { new: EnhancedIssue[]; resolved: EnhancedIssue[]; existing: EnhancedIssue[] }
  ): EnhancedReport['prComment'] {
    const criticalNew = issues.new.filter(i => i.severity === 'critical').length;
    const highNew = issues.new.filter(i => i.severity === 'high').length;
    
    const blockingIssues: string[] = [];
    if (criticalNew > 0) {
      blockingIssues.push(`${criticalNew} critical security/stability issues`);
    }
    if (highNew > 0) {
      blockingIssues.push(`${highNew} high severity issues requiring immediate attention`);
    }
    
    const achievements: string[] = [];
    if (issues.resolved.length > 0) {
      achievements.push(`Fixed ${issues.resolved.length} issues`);
    }
    
    const requiredActions = [
      ...issues.new.filter(i => i.severity === 'critical' || i.severity === 'high')
        .map(i => `Fix ${i.severity} ${i.type} issue in ${i.file}`)
    ];
    
    const nextSteps = [];
    if (decision === 'REJECTED') {
      nextSteps.push('Fix all blocking issues');
      nextSteps.push('Run security scan');
      nextSteps.push('Resubmit PR for review');
    } else {
      nextSteps.push('Monitor for any regression');
      nextSteps.push('Update documentation if needed');
    }
    
    return {
      summary: decision === 'APPROVED' ? 
        'PR is ready to merge with minor improvements suggested' :
        `PR cannot be merged due to ${blockingIssues.length} blocking issues`,
      blockingIssues,
      achievements,
      requiredActions,
      nextSteps
    };
  }
  
  /**
   * Main method to generate enhanced report
   */
  public async generateEnhancedReport(
    basicReport: any,
    sessionId: string,
    developer = 'unknown'
  ): Promise<EnhancedReport> {
    // Enhance issues with code snippets
    const enhancedNewIssues: EnhancedIssue[] = await Promise.all(
      basicReport.comparison.newIssues.map(async (issue: any) => {
        const codeSnippet = await this.getCodeSnippet(sessionId, issue.file, issue.line);
        return {
          ...issue,
          title: issue.message,
          description: issue.message,
          impact: this.getImpactDescription(issue.type, issue.severity),
          businessImpact: this.getBusinessImpactDescription(issue.type, issue.severity),
          codeSnippet,
          confidence: 0.85,
          skillImpact: this.getSkillImpact(issue.severity)
        };
      })
    );
    
    // Get education insights
    const educationResources = await this.getEducationInsights(enhancedNewIssues);
    
    // Calculate metrics
    const businessImpact = this.calculateBusinessImpact(enhancedNewIssues);
    const skillMetrics = this.calculateSkillMetrics(
      developer,
      enhancedNewIssues,
      basicReport.comparison.resolvedIssues,
      basicReport.comparison.existingIssues
    );
    
    // Determine decision
    const hasCritical = enhancedNewIssues.some(i => i.severity === 'critical');
    const hasHighSecurity = enhancedNewIssues.some(i => i.severity === 'high' && i.type === 'security');
    const decision = (hasCritical || hasHighSecurity) ? 'REJECTED' : 
                    enhancedNewIssues.filter(i => i.severity === 'high').length > 3 ? 'NEEDS_REVIEW' :
                    'APPROVED';
    
    const overallScore = basicReport.summary.overallScore;
    const grade = overallScore >= 90 ? 'A' :
                 overallScore >= 80 ? 'B' :
                 overallScore >= 70 ? 'C' :
                 overallScore >= 60 ? 'D' : 'F';
    
    return {
      timestamp: new Date(),
      repository: basicReport.repository,
      prNumber: basicReport.prNumber,
      author: developer,
      sessionId,
      
      decision,
      confidence: 0.92,
      decisionReason: hasCritical ? 'Critical issues must be fixed' :
                     hasHighSecurity ? 'High security issues block merge' :
                     'PR meets quality standards',
      
      overallScore,
      grade,
      scoreBreakdown: {
        security: skillMetrics.skills.security,
        performance: skillMetrics.skills.performance,
        architecture: skillMetrics.skills.architecture,
        codeQuality: skillMetrics.skills.codeQuality,
        dependency: skillMetrics.skills.dependency,
        testing: skillMetrics.skills.testing
      },
      
      issues: {
        new: enhancedNewIssues,
        resolved: basicReport.comparison.resolvedIssues,
        existing: basicReport.comparison.existingIssues,
        unchanged: basicReport.comparison.unchangedIssues
      },
      
      businessImpact,
      skillMetrics,
      
      teamMetrics: {
        averageScore: skillMetrics.overallScore,
        teamGrade: grade,
        velocity: 85,
        knowledgeGaps: this.identifyKnowledgeGaps(enhancedNewIssues),
        trainingNeeds: educationResources.map(r => r.title),
        collaborationScore: 80
      },
      
      educationInsights: {
        highPriority: educationResources.filter(r => r.difficulty === 'intermediate' || r.difficulty === 'advanced'),
        recommended: educationResources,
        skillGaps: this.identifyKnowledgeGaps(enhancedNewIssues)
      },
      
      actionPlan: this.generateActionPlan(enhancedNewIssues),
      
      prComment: this.generatePRComment(decision, {
        new: enhancedNewIssues,
        resolved: basicReport.comparison.resolvedIssues,
        existing: basicReport.comparison.existingIssues
      }),
      
      performanceMetrics: {
        totalTime: basicReport.performanceMetrics.totalExecutionTime,
        cloneTime: basicReport.performanceMetrics.cloneTime,
        analysisTime: basicReport.performanceMetrics.analysisTime,
        reportGenerationTime: 0
      }
    };
  }
  
  private getImpactDescription(type: string, severity: string): string {
    if (type === 'security' && severity === 'critical') {
      return 'Critical security vulnerability that could lead to data breach';
    }
    if (type === 'security' && severity === 'high') {
      return 'Security issue that exposes sensitive data or functionality';
    }
    if (type === 'performance' && severity === 'high') {
      return 'Significant performance degradation affecting user experience';
    }
    return 'Issue that affects code quality and maintainability';
  }
  
  private getBusinessImpactDescription(type: string, severity: string): string {
    if (type === 'security' && (severity === 'critical' || severity === 'high')) {
      return 'Potential data breach, compliance violations, and reputation damage';
    }
    if (type === 'performance' && severity === 'high') {
      return 'User churn, reduced conversion rates, and poor user satisfaction';
    }
    return 'Technical debt accumulation and increased maintenance costs';
  }
  
  private getSkillImpact(severity: string): number {
    switch (severity) {
      case 'critical': return -5;
      case 'high': return -3;
      case 'medium': return -1;
      case 'low': return -0.5;
      default: return 0;
    }
  }
  
  private identifyKnowledgeGaps(issues: EnhancedIssue[]): string[] {
    const gaps = new Set<string>();
    
    issues.forEach(issue => {
      if (issue.type === 'security') gaps.add('Security best practices');
      if (issue.type === 'performance') gaps.add('Performance optimization');
      if (issue.type === 'dependency') gaps.add('Dependency management');
      if (issue.severity === 'critical') gaps.add('Critical issue prevention');
    });
    
    return Array.from(gaps);
  }
}