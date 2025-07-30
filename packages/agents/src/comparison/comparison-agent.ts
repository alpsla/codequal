import { BaseAgent } from '../base/base-agent';
import { AnalysisResult, Insight as CoreInsight, Suggestion } from '../agent';
import { createLogger } from '@codequal/core/utils';
import { RepositoryAnalyzer, RepositoryAnalysis, EducationalAgentRequest, RepositoryIssueHistory } from './repository-analyzer';
import { ComparisonReportGenerator, ComprehensiveReport } from './report-generator';
import { SkillProfile } from './skill-tracker';

// DeepWiki types - we'll define locally for now
interface DeepWikiAnalysisResult {
  issues: Array<{
    id: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    category: string;
    title: string;
    description: string;
    location?: { file: string; line: number };
    impact?: string;
    recommendation?: string;
    type?: string;
  }>;
  recommendations: Array<{
    id: string;
    category: string;
    priority: string;
    title: string;
    description: string;
    impact: string;
    effort: string;
    steps?: string[];
  }>;
  scores: {
    overall: number;
    security: number;
    performance: number;
    maintainability: number;
    testing?: number;
  } | null;
  metadata?: {
    patterns?: string[];
    [key: string]: any;
  };
}

export interface ComparisonAnalysis {
  // What changed
  newIssues: CategorizedIssues;
  resolvedIssues: CategorizedIssues;
  modifiedPatterns: ArchitecturalChanges;
  
  // Impact analysis
  securityImpact: SecurityDelta;
  performanceImpact: PerformanceDelta;
  dependencyChanges: DependencyDelta;
  codeQualityDelta: QualityMetrics;
  
  // Intelligent insights
  insights: Insight[];
  recommendations: PrioritizedRecommendation[];
  riskAssessment: RiskLevel;
  
  // Summary
  summary: string;
  overallScore: number;
  scoreChanges: Record<string, { before: number; after: number; change: number }>;
}

interface CategorizedIssues {
  critical: Issue[];
  high: Issue[];
  medium: Issue[];
  low: Issue[];
  total: number;
}

interface Issue {
  id: string;
  title: string;
  description: string;
  severity: string;
  category: string;
  file?: string;
  line?: number;
  location?: { file: string; line: number };
  [key: string]: any; // Allow additional properties from DeepWiki
}

interface ArchitecturalChanges {
  added: string[];
  removed: string[];
  modified: string[];
  impact: string;
}

interface SecurityDelta {
  score: number;
  vulnerabilitiesAdded: number;
  vulnerabilitiesResolved: number;
  criticalIssues: string[];
  improvements: string[];
}

interface PerformanceDelta {
  score: number;
  improvements: string[];
  regressions: string[];
  metrics: Record<string, number>;
}

interface DependencyDelta {
  added: Array<{ name: string; version: string; risk?: string }>;
  removed: Array<{ name: string; version: string }>;
  updated: Array<{ name: string; from: string; to: string; risk?: string }>;
  securityAlerts: string[];
}

interface QualityMetrics {
  maintainability: number;
  testCoverage: number;
  codeComplexity: number;
  duplicatedCode: number;
}

interface Insight {
  type: 'positive' | 'negative' | 'neutral';
  title: string;
  description: string;
  evidence: string[];
}

interface PrioritizedRecommendation {
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  effort: string;
  impact: string;
  steps: string[];
}

type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * Comparison Agent - Analyzes differences between main and feature branches
 * Replaces 5 specialized agents with intelligent full-context analysis
 */
export class ComparisonAgent extends BaseAgent {
  private repositoryAnalyzer: RepositoryAnalyzer;
  
  constructor(config: Record<string, unknown> = {}) {
    super(config);
    this.logger = createLogger('ComparisonAgent');
    this.repositoryAnalyzer = new RepositoryAnalyzer(this.logger);
  }

  /**
   * Main analysis method - expects data from Orchestrator
   */
  async analyze(data: any): Promise<AnalysisResult> {
    const { 
      mainBranchAnalysis, 
      featureBranchAnalysis, 
      prMetadata, 
      userProfile,
      teamProfiles,
      historicalIssues = [] // From Orchestrator/Supabase
    } = data;
    
    this.logger.info('Starting comparison analysis');
    
    try {
      // 1. Categorize issues
      const newIssues = this.categorizeNewIssues(mainBranchAnalysis, featureBranchAnalysis);
      const resolvedIssues = this.categorizeResolvedIssues(mainBranchAnalysis, featureBranchAnalysis);
      
      // 2. Analyze repository history (no persistence, just analysis)
      let repositoryAnalysis: RepositoryAnalysis | null = null;
      let educationalRequest: EducationalAgentRequest | null = null;
      
      if (historicalIssues && featureBranchAnalysis.issues) {
        repositoryAnalysis = this.repositoryAnalyzer.analyzeRepositoryIssues(
          historicalIssues,
          featureBranchAnalysis.issues,
          new Date()
        );
        
        // Generate educational request if user profile provided
        if (userProfile?.skills && repositoryAnalysis) {
          educationalRequest = this.repositoryAnalyzer.generateEducationalRequest(
            featureBranchAnalysis.issues,
            this.extractSkillLevels(userProfile.skills),
            repositoryAnalysis.technicalDebt
          );
        }
      }
      
      // 3. Analyze architectural changes
      const modifiedPatterns = this.analyzeArchitecturalChanges(
        mainBranchAnalysis,
        featureBranchAnalysis
      );
      
      // 4. Calculate impact deltas
      const securityImpact = this.calculateSecurityImpact(
        mainBranchAnalysis,
        featureBranchAnalysis,
        newIssues,
        resolvedIssues
      );
      
      const performanceImpact = this.calculatePerformanceImpact(
        mainBranchAnalysis,
        featureBranchAnalysis
      );
      
      const dependencyChanges = this.analyzeDependencyChanges(
        mainBranchAnalysis,
        featureBranchAnalysis
      );
      
      const codeQualityDelta = this.calculateQualityMetrics(
        mainBranchAnalysis,
        featureBranchAnalysis
      );
      
      // 5. Generate insights and recommendations (including historical data)
      const insights = this.generateInsights({
        newIssues,
        resolvedIssues,
        modifiedPatterns,
        securityImpact,
        performanceImpact,
        dependencyChanges,
        codeQualityDelta,
        repositoryAnalysis
      });
      
      const recommendations = this.generateRecommendations({
        newIssues,
        insights,
        securityImpact,
        performanceImpact,
        prMetadata
      });
      
      // 5. Assess overall risk
      const riskAssessment = this.assessRisk({
        newIssues,
        securityImpact,
        performanceImpact,
        dependencyChanges
      });
      
      // 6. Calculate score changes
      const scoreChanges = this.calculateScoreChanges(
        mainBranchAnalysis,
        featureBranchAnalysis
      );
      
      // 7. Generate summary
      const summary = this.generateSummary({
        newIssues,
        resolvedIssues,
        scoreChanges,
        riskAssessment,
        prMetadata
      });
      
      const overallScore = this.calculateOverallScore(
        featureBranchAnalysis,
        scoreChanges
      );

      const comparisonResult: ComparisonAnalysis = {
        newIssues,
        resolvedIssues,
        modifiedPatterns,
        securityImpact,
        performanceImpact,
        dependencyChanges,
        codeQualityDelta,
        insights,
        recommendations,
        riskAssessment,
        summary,
        overallScore,
        scoreChanges
      };
      
      // Generate comprehensive report if requested
      if (data.generateReport) {
        const report = ComparisonReportGenerator.generateReport(
          comparisonResult,
          mainBranchAnalysis,
          featureBranchAnalysis,
          prMetadata,
          userProfile,
          teamProfiles,
          repositoryAnalysis
        );
        
        return this.formatResult(comparisonResult, report, repositoryAnalysis, educationalRequest);
      }
      
      return this.formatResult(comparisonResult, null, repositoryAnalysis, educationalRequest);
    } catch (error) {
      this.logger.error('Comparison analysis failed:', error as any);
      return this.handleError(error);
    }
  }

  /**
   * Categorize new issues introduced in the feature branch
   */
  private categorizeNewIssues(
    mainAnalysis: DeepWikiAnalysisResult,
    featureAnalysis: DeepWikiAnalysisResult
  ): CategorizedIssues {
    const mainIssueIds = new Set(mainAnalysis.issues.map(i => this.getIssueFingerprint(i)));
    const newIssues = featureAnalysis.issues.filter(
      issue => !mainIssueIds.has(this.getIssueFingerprint(issue))
    );

    return {
      critical: newIssues.filter((i: any) => i.severity === 'critical'),
      high: newIssues.filter((i: any) => i.severity === 'high'),
      medium: newIssues.filter((i: any) => i.severity === 'medium'),
      low: newIssues.filter((i: any) => i.severity === 'low'),
      total: newIssues.length
    };
  }

  /**
   * Categorize resolved issues in the feature branch
   */
  private categorizeResolvedIssues(
    mainAnalysis: DeepWikiAnalysisResult,
    featureAnalysis: DeepWikiAnalysisResult
  ): CategorizedIssues {
    const featureIssueIds = new Set(featureAnalysis.issues.map(i => this.getIssueFingerprint(i)));
    const resolvedIssues = mainAnalysis.issues.filter(
      issue => !featureIssueIds.has(this.getIssueFingerprint(issue))
    );

    return {
      critical: resolvedIssues.filter((i: any) => i.severity === 'critical'),
      high: resolvedIssues.filter((i: any) => i.severity === 'high'),
      medium: resolvedIssues.filter((i: any) => i.severity === 'medium'),
      low: resolvedIssues.filter((i: any) => i.severity === 'low'),
      total: resolvedIssues.length
    };
  }

  /**
   * Generate unique fingerprint for an issue to detect duplicates
   */
  private getIssueFingerprint(issue: any): string {
    return `${issue.category}-${issue.type || issue.title}-${issue.location?.file || 'global'}-${issue.location?.line || 0}`;
  }

  /**
   * Analyze architectural pattern changes
   */
  private analyzeArchitecturalChanges(
    mainAnalysis: DeepWikiAnalysisResult,
    featureAnalysis: DeepWikiAnalysisResult
  ): ArchitecturalChanges {
    const mainPatterns = new Set(mainAnalysis.metadata?.patterns || []);
    const featurePatterns = new Set(featureAnalysis.metadata?.patterns || []);
    
    const added = Array.from(featurePatterns).filter((p: any) => !mainPatterns.has(p));
    const removed = Array.from(mainPatterns).filter((p: any) => !featurePatterns.has(p));
    const modified: string[] = []; // Could be enhanced with more sophisticated detection
    
    const impact = this.assessArchitecturalImpact(added, removed);

    return { added, removed, modified, impact };
  }

  /**
   * Assess the impact of architectural changes
   */
  private assessArchitecturalImpact(added: string[], removed: string[]): string {
    if (added.length === 0 && removed.length === 0) {
      return 'No architectural changes detected';
    }
    
    const impacts: string[] = [];
    
    if (added.includes('microservices') || removed.includes('monolithic')) {
      impacts.push('Major architectural shift detected');
    }
    
    if (added.includes('event-driven') || added.includes('messaging')) {
      impacts.push('New asynchronous patterns introduced');
    }
    
    if (removed.length > added.length) {
      impacts.push('Architectural simplification observed');
    }
    
    return impacts.length > 0 ? impacts.join('. ') : 'Minor architectural adjustments';
  }

  /**
   * Calculate security impact
   */
  private calculateSecurityImpact(
    mainAnalysis: DeepWikiAnalysisResult,
    featureAnalysis: DeepWikiAnalysisResult,
    newIssues: CategorizedIssues,
    resolvedIssues: CategorizedIssues
  ): SecurityDelta {
    const mainScore = mainAnalysis.scores?.security || 0;
    const featureScore = featureAnalysis.scores?.security || 0;
    
    const criticalIssues = newIssues.critical.map(i => i.title);
    const improvements = resolvedIssues.critical.concat(resolvedIssues.high)
      .map(i => `Resolved: ${i.title}`);

    return {
      score: featureScore - mainScore,
      vulnerabilitiesAdded: newIssues.critical.length + newIssues.high.length,
      vulnerabilitiesResolved: resolvedIssues.critical.length + resolvedIssues.high.length,
      criticalIssues,
      improvements
    };
  }

  /**
   * Calculate performance impact
   */
  private calculatePerformanceImpact(
    mainAnalysis: DeepWikiAnalysisResult,
    featureAnalysis: DeepWikiAnalysisResult
  ): PerformanceDelta {
    const mainScore = mainAnalysis.scores?.performance || 0;
    const featureScore = featureAnalysis.scores?.performance || 0;
    
    // Extract performance-related issues
    const mainPerfIssues = mainAnalysis.issues.filter((i: any) => 
      i.category === 'performance' || i.title.toLowerCase().includes('performance')
    );
    const featurePerfIssues = featureAnalysis.issues.filter((i: any) => 
      i.category === 'performance' || i.title.toLowerCase().includes('performance')
    );
    
    const improvements: string[] = [];
    const regressions: string[] = [];
    
    // Simple comparison - could be enhanced
    if (featurePerfIssues.length < mainPerfIssues.length) {
      improvements.push('Reduced performance issues');
    } else if (featurePerfIssues.length > mainPerfIssues.length) {
      regressions.push('New performance issues introduced');
    }

    return {
      score: featureScore - mainScore,
      improvements,
      regressions,
      metrics: {
        issueCount: featurePerfIssues.length - mainPerfIssues.length,
        scoreChange: featureScore - mainScore
      }
    };
  }

  /**
   * Analyze dependency changes
   */
  private analyzeDependencyChanges(
    mainAnalysis: DeepWikiAnalysisResult,
    featureAnalysis: DeepWikiAnalysisResult
  ): DependencyDelta {
    // This is a simplified implementation
    // In production, would parse actual dependency files
    const added: Array<{ name: string; version: string; risk?: string }> = [];
    const removed: Array<{ name: string; version: string }> = [];
    const updated: Array<{ name: string; from: string; to: string; risk?: string }> = [];
    const securityAlerts: string[] = [];

    // Check for dependency-related issues
    const depIssues = featureAnalysis.issues.filter((i: any) => 
      i.category === 'dependencies' || i.title.toLowerCase().includes('dependency')
    );
    
    depIssues.forEach((issue: any) => {
      if (issue.severity === 'critical' || issue.severity === 'high') {
        securityAlerts.push(issue.title);
      }
    });

    return { added, removed, updated, securityAlerts };
  }

  /**
   * Calculate code quality metrics
   */
  private calculateQualityMetrics(
    mainAnalysis: DeepWikiAnalysisResult,
    featureAnalysis: DeepWikiAnalysisResult
  ): QualityMetrics {
    return {
      maintainability: featureAnalysis.scores?.maintainability || 0,
      testCoverage: featureAnalysis.scores?.testing || 0,
      codeComplexity: 0, // Would need deeper analysis
      duplicatedCode: 0  // Would need deeper analysis
    };
  }

  /**
   * Generate insights from the analysis
   */
  private generateInsights(data: any): Insight[] {
    const insights: Insight[] = [];

    // Security insights
    if (data.securityImpact.vulnerabilitiesResolved > 0) {
      insights.push({
        type: 'positive',
        title: 'Security Improvements',
        description: `${data.securityImpact.vulnerabilitiesResolved} security vulnerabilities have been resolved`,
        evidence: data.securityImpact.improvements
      });
    }

    if (data.securityImpact.criticalIssues.length > 0) {
      insights.push({
        type: 'negative',
        title: 'Critical Security Issues Introduced',
        description: `${data.securityImpact.criticalIssues.length} critical security issues need immediate attention`,
        evidence: data.securityImpact.criticalIssues
      });
    }

    // Architecture insights
    if (data.modifiedPatterns.added.length > 0) {
      insights.push({
        type: 'neutral',
        title: 'Architectural Changes',
        description: data.modifiedPatterns.impact,
        evidence: data.modifiedPatterns.added.map((p: string) => `Added pattern: ${p}`)
      });
    }

    // Performance insights
    if (data.performanceImpact.score > 0) {
      insights.push({
        type: 'positive',
        title: 'Performance Improvements',
        description: `Performance score improved by ${data.performanceImpact.score} points`,
        evidence: data.performanceImpact.improvements
      });
    }
    
    // Repository analysis insights
    if (data.repositoryAnalysis) {
      const { recurringIssues, technicalDebt } = data.repositoryAnalysis;
      
      if (recurringIssues.length > 0) {
        insights.push({
          type: 'negative',
          title: 'Recurring Issues Detected',
          description: `${recurringIssues.length} issues have appeared multiple times in the repository history`,
          evidence: recurringIssues.slice(0, 5)
        });
      }
      
      if (technicalDebt.debtTrend === 'increasing') {
        insights.push({
          type: 'negative',
          title: 'Technical Debt Increasing',
          description: `Technical debt is trending upward (${technicalDebt.totalDebt} hours, ~$${technicalDebt.estimatedCost})`,
          evidence: Object.entries(technicalDebt.debtByCategory)
            .sort(([, a], [, b]) => (b as number) - (a as number))
            .slice(0, 3)
            .map(([cat, hours]) => `${cat}: ${hours} hours`)
        });
      }
    }

    return insights;
  }

  /**
   * Generate prioritized recommendations
   */
  private generateRecommendations(data: any): PrioritizedRecommendation[] {
    const recommendations: PrioritizedRecommendation[] = [];

    // Critical security recommendations
    if (data.securityImpact.criticalIssues.length > 0) {
      recommendations.push({
        priority: 'critical',
        title: 'Address Critical Security Vulnerabilities',
        description: 'Critical security issues must be resolved before merging',
        effort: 'high',
        impact: 'critical',
        steps: [
          'Review each critical security issue',
          'Apply recommended fixes',
          'Add security tests',
          'Request security review'
        ]
      });
    }

    // High priority issues
    if (data.newIssues.high.length > 0) {
      recommendations.push({
        priority: 'high',
        title: 'Resolve High Priority Issues',
        description: `${data.newIssues.high.length} high priority issues should be addressed`,
        effort: 'medium',
        impact: 'high',
        steps: [
          'Review high priority issues',
          'Prioritize based on impact',
          'Fix or create follow-up tickets'
        ]
      });
    }

    // Performance recommendations
    if (data.performanceImpact.regressions.length > 0) {
      recommendations.push({
        priority: 'medium',
        title: 'Investigate Performance Regressions',
        description: 'Performance issues detected that may impact user experience',
        effort: 'medium',
        impact: 'medium',
        steps: [
          'Profile affected code paths',
          'Identify bottlenecks',
          'Optimize or document trade-offs'
        ]
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Assess overall risk level
   */
  private assessRisk(data: any): RiskLevel {
    if (data.newIssues.critical.length > 0 || data.securityImpact.criticalIssues.length > 0) {
      return 'critical';
    }
    
    if (data.newIssues.high.length > 2 || data.securityImpact.vulnerabilitiesAdded > 5) {
      return 'high';
    }
    
    if (data.newIssues.total > 10 || data.performanceImpact.regressions.length > 0) {
      return 'medium';
    }
    
    return 'low';
  }

  /**
   * Calculate score changes
   */
  private calculateScoreChanges(
    mainAnalysis: DeepWikiAnalysisResult,
    featureAnalysis: DeepWikiAnalysisResult
  ): Record<string, { before: number; after: number; change: number }> {
    const categories = ['overall', 'security', 'performance', 'maintainability', 'testing'];
    const changes: Record<string, { before: number; after: number; change: number }> = {};

    categories.forEach(category => {
      const before = (mainAnalysis.scores as any)?.[category] || 0;
      const after = (featureAnalysis.scores as any)?.[category] || 0;
      changes[category] = {
        before,
        after,
        change: after - before
      };
    });

    return changes;
  }

  /**
   * Generate executive summary
   */
  private generateSummary(data: any): string {
    const parts: string[] = [];
    
    // Risk assessment
    parts.push(`Risk Level: ${data.riskAssessment.toUpperCase()}`);
    
    // Issue summary
    if (data.newIssues.total > 0) {
      parts.push(`${data.newIssues.total} new issues introduced (${data.newIssues.critical.length} critical)`);
    }
    
    if (data.resolvedIssues.total > 0) {
      parts.push(`${data.resolvedIssues.total} issues resolved`);
    }
    
    // Score summary
    const overallChange = data.scoreChanges.overall?.change || 0;
    if (overallChange !== 0) {
      parts.push(`Overall score ${overallChange > 0 ? 'improved' : 'decreased'} by ${Math.abs(overallChange)} points`);
    }
    
    // PR context
    if (data.prMetadata?.title) {
      parts.push(`PR: "${data.prMetadata.title}"`);
    }

    return parts.join('. ') + '.';
  }

  /**
   * Calculate overall score for the analysis
   */
  private calculateOverallScore(
    featureAnalysis: DeepWikiAnalysisResult,
    scoreChanges: Record<string, { before: number; after: number; change: number }>
  ): number {
    return featureAnalysis.scores?.overall || scoreChanges.overall?.after || 0;
  }

  /**
   * Format the comparison result to match the standard AnalysisResult interface
   */
  protected formatResult(
    comparisonResult: ComparisonAnalysis, 
    report?: ComprehensiveReport | null,
    repositoryAnalysis?: RepositoryAnalysis | null,
    educationalRequest?: EducationalAgentRequest | null
  ): AnalysisResult {
    // Convert insights to the expected format
    const insights: CoreInsight[] = comparisonResult.insights.map(insight => ({
      type: insight.type === 'positive' ? 'improvement' : 
            insight.type === 'negative' ? 'security' : 'info',
      severity: insight.type === 'negative' ? 'high' as const : 'low' as const,
      message: `${insight.title}: ${insight.description}`
    }));

    // Convert recommendations to suggestions - using dummy file/line for now
    const suggestions: Suggestion[] = comparisonResult.recommendations
      .filter(rec => rec.priority === 'critical' || rec.priority === 'high')
      .slice(0, 5)
      .map(rec => ({
        file: 'README.md', // Placeholder - would be extracted from actual issues
        line: 1,
        suggestion: `${rec.title}: ${rec.description}. Steps: ${rec.steps.join(', ')}`
      }));

    return {
      insights,
      suggestions,
      metadata: {
        summary: comparisonResult.summary,
        overallScore: comparisonResult.overallScore,
        riskAssessment: comparisonResult.riskAssessment,
        scoreChanges: comparisonResult.scoreChanges,
        newIssuesCount: comparisonResult.newIssues.total,
        resolvedIssuesCount: comparisonResult.resolvedIssues.total,
        // Include the full comparison data for detailed reporting
        comparisonData: comparisonResult,
        // Include comprehensive report if generated
        report,
        // Include repository analysis results for Orchestrator
        repositoryAnalysis,
        // Include educational request for orchestrator
        educationalRequest
      }
    };
  }
  
  /**
   * Extract skill levels from user profile for repository tracker
   */
  private extractSkillLevels(skills: any): Record<string, number> {
    const levels: Record<string, number> = {};
    
    Object.entries(skills).forEach(([skill, data]: [string, any]) => {
      levels[skill] = data.current || 0;
    });
    
    return levels;
  }
}