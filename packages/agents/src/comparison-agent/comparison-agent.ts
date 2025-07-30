/**
 * Comparison Agent - Cloud Function Implementation
 * 
 * This agent replaces the 5 specialized role agents by intelligently
 * comparing two complete DeepWiki analysis reports to determine:
 * - What issues were fixed
 * - What new issues were introduced
 * - What issues remain unchanged
 * - Overall impact assessment
 */

import { Handler } from 'aws-lambda';
import { z } from 'zod';
import { ScoringSystem, IssueWithAge, RepositoryScore, SkillImprovement } from './scoring-system';

// Input validation schema
const ComparisonRequestSchema = z.object({
  mainBranchReport: z.object({
    overall_score: z.number(),
    issues: z.array(z.object({
      id: z.string(),
      title: z.string(),
      severity: z.enum(['critical', 'high', 'medium', 'low']),
      category: z.enum(['security', 'performance', 'quality', 'architecture', 'dependencies', 'documentation']),
      file_path: z.string(),
      line_number: z.number().optional(),
      description: z.string(),
      code_snippet: z.string().optional(),
      recommendation: z.string()
    })),
    metadata: z.object({
      repository: z.string(),
      branch: z.string(),
      commit: z.string(),
      analysis_date: z.string(),
      model_used: z.string()
    })
  }),
  featureBranchReport: z.object({
    overall_score: z.number(),
    issues: z.array(z.object({
      id: z.string(),
      title: z.string(),
      severity: z.enum(['critical', 'high', 'medium', 'low']),
      category: z.enum(['security', 'performance', 'quality', 'architecture', 'dependencies', 'documentation']),
      file_path: z.string(),
      line_number: z.number().optional(),
      description: z.string(),
      code_snippet: z.string().optional(),
      recommendation: z.string()
    })),
    metadata: z.object({
      repository: z.string(),
      branch: z.string(),
      commit: z.string(),
      analysis_date: z.string(),
      model_used: z.string()
    })
  }),
  prMetadata: z.object({
    pr_number: z.number(),
    pr_title: z.string(),
    files_changed: z.array(z.string()),
    lines_added: z.number(),
    lines_removed: z.number(),
    author_id: z.string().optional(),
    author_skills: z.record(z.number()).optional()
  }),
  // Optional: existing issue age data
  issueAgeData: z.record(z.object({
    first_detected: z.string(),
    age_days: z.number()
  })).optional()
});

export type ComparisonRequest = z.infer<typeof ComparisonRequestSchema>;
export type Issue = ComparisonRequest['mainBranchReport']['issues'][0];

export interface ComparisonResult {
  fixed_issues: Issue[];
  new_issues: Issue[];
  unchanged_issues: Issue[];
  moved_issues: Array<{
    issue: Issue;
    old_location: { file: string; line?: number };
    new_location: { file: string; line?: number };
  }>;
  impact_analysis: {
    overall_impact: number;
    security_impact: number;
    performance_impact: number;
    quality_impact: number;
    architecture_impact: number;
    dependencies_impact: number;
  };
  pr_decision: {
    should_block: boolean;
    blocking_issues: Issue[];
    reason: string;
  };
  insights: string[];
  // Comprehensive final report
  final_report: {
    repository_analysis: {
      total_issues: number;
      issues_by_severity: Record<string, number>;
      issues_by_category: Record<string, number>;
      all_issues: Issue[];
      overall_score: number;
    };
    pr_impact: {
      issues_fixed: number;
      issues_introduced: number;
      issues_moved: number;
      score_change: number;
      percentage_improvement: number;
    };
    prioritized_issues: Array<{
      issue: Issue;
      priority_score: number;
      status: 'existing' | 'new' | 'fixed' | 'moved';
    }>;
    recommendations: Array<{
      category: string;
      priority: 'critical' | 'high' | 'medium' | 'low';
      recommendation: string;
      affected_files: string[];
    }>;
  };
  // Advanced scoring results
  scoring: {
    repository_score: RepositoryScore;
    previous_score?: number;
    skill_improvements?: SkillImprovement;
  };
}

export class ComparisonAgent {
  private scoringSystem: ScoringSystem;

  constructor() {
    this.scoringSystem = new ScoringSystem();
  }

  /**
   * Compare two analysis reports and identify changes
   */
  async compare(request: ComparisonRequest): Promise<ComparisonResult> {
    const { mainBranchReport, featureBranchReport, prMetadata } = request;
    
    // Initialize result structure
    const result: ComparisonResult = {
      fixed_issues: [],
      new_issues: [],
      unchanged_issues: [],
      moved_issues: [],
      impact_analysis: {
        overall_impact: 0,
        security_impact: 0,
        performance_impact: 0,
        quality_impact: 0,
        architecture_impact: 0,
        dependencies_impact: 0
      },
      pr_decision: {
        should_block: false,
        blocking_issues: [],
        reason: ''
      },
      insights: [],
      final_report: {
        repository_analysis: {
          total_issues: 0,
          issues_by_severity: {},
          issues_by_category: {},
          all_issues: [],
          overall_score: 0
        },
        pr_impact: {
          issues_fixed: 0,
          issues_introduced: 0,
          issues_moved: 0,
          score_change: 0,
          percentage_improvement: 0
        },
        prioritized_issues: [],
        recommendations: []
      },
      scoring: {
        repository_score: {
          overall_score: 0,
          role_scores: {
            security_score: 0,
            performance_score: 0,
            quality_score: 0,
            architecture_score: 0,
            dependencies_score: 0,
            documentation_score: 0
          },
          score_breakdown: {
            base_score: 0,
            aging_penalty: 0,
            improvement_bonus: 0,
            final_score: 0
          },
          health_status: 'fair'
        }
      }
    };

    // Create maps for efficient lookup
    const mainIssuesMap = this.createIssueMap(mainBranchReport.issues);
    const featureIssuesMap = this.createIssueMap(featureBranchReport.issues);
    
    // Track which issues we've processed
    const processedFeatureIssues = new Set<string>();

    // Find fixed and unchanged issues
    for (const [, mainIssue] of Array.from(mainIssuesMap)) {
      const featureIssue = this.findMatchingIssue(mainIssue, featureBranchReport.issues, prMetadata);
      
      if (!featureIssue) {
        // Issue was fixed
        result.fixed_issues.push(mainIssue);
      } else {
        processedFeatureIssues.add(this.getIssueKey(featureIssue));
        
        // Check if issue moved
        if (this.hasIssueMoved(mainIssue, featureIssue)) {
          result.moved_issues.push({
            issue: featureIssue,
            old_location: { file: mainIssue.file_path, line: mainIssue.line_number },
            new_location: { file: featureIssue.file_path, line: featureIssue.line_number }
          });
        } else {
          result.unchanged_issues.push(mainIssue);
        }
      }
    }

    // Find new issues
    for (const [key, featureIssue] of Array.from(featureIssuesMap)) {
      if (!processedFeatureIssues.has(key)) {
        result.new_issues.push(featureIssue);
      }
    }

    // Calculate impact
    result.impact_analysis = this.calculateImpact(result, mainBranchReport, featureBranchReport);
    
    // Make PR decision
    result.pr_decision = this.makePRDecision(result);
    
    // Generate insights
    result.insights = this.generateInsights(result, prMetadata);
    
    // Generate comprehensive final report
    result.final_report = this.generateFinalReport(
      result,
      mainBranchReport,
      featureBranchReport,
      prMetadata
    );
    
    // Calculate advanced scoring
    result.scoring = this.calculateScoring(
      result,
      featureBranchReport,
      prMetadata,
      request.issueAgeData
    );

    return result;
  }

  /**
   * Create a map of issues for efficient lookup
   */
  private createIssueMap(issues: Issue[]): Map<string, Issue> {
    const map = new Map<string, Issue>();
    for (const issue of issues) {
      map.set(this.getIssueKey(issue), issue);
    }
    return map;
  }

  /**
   * Generate a unique key for an issue
   */
  private getIssueKey(issue: Issue): string {
    // Use ID and file path for uniqueness
    return `${issue.id}-${issue.file_path}`;
  }

  /**
   * Find a matching issue in the feature branch, considering code movement
   */
  private findMatchingIssue(
    mainIssue: Issue,
    featureIssues: Issue[],
    prMetadata: ComparisonRequest['prMetadata']
  ): Issue | null {
    // First try exact match (same ID, file, and approximate line)
    const exactMatch = featureIssues.find(issue => 
      issue.id === mainIssue.id &&
      issue.file_path === mainIssue.file_path &&
      this.isLineNumberClose(mainIssue.line_number, issue.line_number, 10)
    );
    
    if (exactMatch) return exactMatch;

    // Try fuzzy match (same issue type, similar code)
    if (!mainIssue.code_snippet) return null;
    
    const fuzzyMatch = featureIssues.find(issue => 
      issue.id === mainIssue.id &&
      issue.code_snippet &&
      mainIssue.code_snippet &&
      this.isSimilarCode(mainIssue.code_snippet, issue.code_snippet) &&
      prMetadata.files_changed.includes(issue.file_path)
    );
    
    return fuzzyMatch || null;
  }

  /**
   * Check if line numbers are within acceptable range
   */
  private isLineNumberClose(line1?: number, line2?: number, threshold = 10): boolean {
    if (!line1 || !line2) return true; // If no line numbers, assume match
    return Math.abs(line1 - line2) <= threshold;
  }

  /**
   * Check if two code snippets are similar (handles minor changes)
   */
  private isSimilarCode(code1: string, code2: string): boolean {
    // Remove whitespace and compare
    const normalize = (code: string) => code.replace(/\s+/g, ' ').trim();
    const normalized1 = normalize(code1);
    const normalized2 = normalize(code2);
    
    // If exactly the same after normalization
    if (normalized1 === normalized2) return true;
    
    // Calculate similarity ratio
    const similarity = this.calculateSimilarity(normalized1, normalized2);
    return similarity > 0.8; // 80% similar
  }

  /**
   * Calculate string similarity ratio (0-1)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Check if an issue has moved locations
   */
  private hasIssueMoved(mainIssue: Issue, featureIssue: Issue): boolean {
    return mainIssue.file_path !== featureIssue.file_path ||
           !this.isLineNumberClose(mainIssue.line_number, featureIssue.line_number, 5);
  }

  /**
   * Calculate the impact of changes
   */
  private calculateImpact(
    result: ComparisonResult,
    mainReport: ComparisonRequest['mainBranchReport'],
    featureReport: ComparisonRequest['featureBranchReport']
  ): ComparisonResult['impact_analysis'] {
    const impact = {
      overall_impact: 0,
      security_impact: 0,
      performance_impact: 0,
      quality_impact: 0,
      architecture_impact: 0,
      dependencies_impact: 0
    };

    // Score changes for impact calculation
    const severityScores = {
      critical: 10,
      high: 5,
      medium: 2,
      low: 1
    };

    // Calculate impact by category
    const categories: Array<keyof typeof impact> = [
      'security_impact',
      'performance_impact', 
      'quality_impact',
      'architecture_impact',
      'dependencies_impact'
    ];

    for (const category of categories) {
      const categoryName = category.replace('_impact', '') as Issue['category'];
      
      // Positive impact from fixed issues
      const fixedScore = result.fixed_issues
        .filter(issue => issue.category === categoryName)
        .reduce((sum, issue) => sum + severityScores[issue.severity], 0);
      
      // Negative impact from new issues
      const newScore = result.new_issues
        .filter(issue => issue.category === categoryName)
        .reduce((sum, issue) => sum + severityScores[issue.severity], 0);
      
      impact[category] = fixedScore - newScore;
    }

    // Overall impact is the sum of category impacts
    impact.overall_impact = featureReport.overall_score - mainReport.overall_score;

    return impact;
  }

  /**
   * Decide if PR should be blocked based on issues
   */
  private makePRDecision(result: ComparisonResult): ComparisonResult['pr_decision'] {
    const blockingIssues = result.new_issues.filter(issue => 
      issue.severity === 'critical' || 
      (issue.severity === 'high' && issue.category === 'security')
    );

    if (blockingIssues.length > 0) {
      return {
        should_block: true,
        blocking_issues: blockingIssues,
        reason: `PR introduces ${blockingIssues.length} critical/high-security issues that must be fixed`
      };
    }

    // Check if too many new issues overall
    if (result.new_issues.length > result.fixed_issues.length * 2) {
      return {
        should_block: true,
        blocking_issues: result.new_issues.filter(i => i.severity === 'high'),
        reason: `PR introduces ${result.new_issues.length} new issues while only fixing ${result.fixed_issues.length}`
      };
    }

    return {
      should_block: false,
      blocking_issues: [],
      reason: 'PR meets quality standards'
    };
  }

  /**
   * Generate intelligent insights about the changes
   */
  private generateInsights(
    result: ComparisonResult,
    prMetadata: ComparisonRequest['prMetadata']
  ): string[] {
    const insights: string[] = [];

    // Insight about moved issues
    if (result.moved_issues.length > 0) {
      insights.push(
        `${result.moved_issues.length} issues appear to have moved due to code refactoring. ` +
        `These are not new issues but require attention in their new locations.`
      );
    }

    // Insight about security improvements
    const securityFixed = result.fixed_issues.filter(i => i.category === 'security').length;
    const securityNew = result.new_issues.filter(i => i.category === 'security').length;
    if (securityFixed > securityNew) {
      insights.push(
        `Security posture improved: ${securityFixed} vulnerabilities fixed, only ${securityNew} introduced.`
      );
    }

    // Insight about performance
    if (result.impact_analysis.performance_impact < -5) {
      insights.push(
        `Performance degradation detected. Consider profiling the changes in: ` +
        prMetadata.files_changed.slice(0, 3).join(', ')
      );
    }

    // Insight about technical debt
    const qualityIssues = result.new_issues.filter(i => i.category === 'quality').length;
    if (qualityIssues > 5) {
      insights.push(
        `Technical debt increasing: ${qualityIssues} new code quality issues. ` +
        `Consider refactoring before adding more features.`
      );
    }

    return insights;
  }

  /**
   * Generate comprehensive final report with all issues and analysis
   */
  private generateFinalReport(
    result: ComparisonResult,
    mainReport: ComparisonRequest['mainBranchReport'],
    featureReport: ComparisonRequest['featureBranchReport'],
    prMetadata: ComparisonRequest['prMetadata']
  ): ComparisonResult['final_report'] {
    // Collect all current issues (from feature branch)
    const allCurrentIssues = featureReport.issues;
    
    // Calculate issues by severity and category
    const issuesBySeverity = this.groupIssuesBySeverity(allCurrentIssues);
    const issuesByCategory = this.groupIssuesByCategory(allCurrentIssues);
    
    // Create prioritized issue list
    const prioritizedIssues = this.prioritizeIssues(result);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(
      result,
      featureReport.issues,
      prMetadata
    );
    
    // Calculate score change and improvement
    const scoreChange = featureReport.overall_score - mainReport.overall_score;
    const percentageImprovement = mainReport.overall_score > 0
      ? ((scoreChange / mainReport.overall_score) * 100)
      : 0;

    return {
      repository_analysis: {
        total_issues: allCurrentIssues.length,
        issues_by_severity: issuesBySeverity,
        issues_by_category: issuesByCategory,
        all_issues: allCurrentIssues,
        overall_score: featureReport.overall_score
      },
      pr_impact: {
        issues_fixed: result.fixed_issues.length,
        issues_introduced: result.new_issues.length,
        issues_moved: result.moved_issues.length,
        score_change: scoreChange,
        percentage_improvement: Math.round(percentageImprovement * 100) / 100
      },
      prioritized_issues: prioritizedIssues,
      recommendations: recommendations
    };
  }

  /**
   * Group issues by severity
   */
  private groupIssuesBySeverity(issues: Issue[]): Record<string, number> {
    const grouped: Record<string, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };
    
    for (const issue of issues) {
      grouped[issue.severity] = (grouped[issue.severity] || 0) + 1;
    }
    
    return grouped;
  }

  /**
   * Group issues by category
   */
  private groupIssuesByCategory(issues: Issue[]): Record<string, number> {
    const grouped: Record<string, number> = {};
    
    for (const issue of issues) {
      grouped[issue.category] = (grouped[issue.category] || 0) + 1;
    }
    
    return grouped;
  }

  /**
   * Create prioritized list of all issues with their status
   */
  private prioritizeIssues(
    result: ComparisonResult
  ): ComparisonResult['final_report']['prioritized_issues'] {
    const prioritized: ComparisonResult['final_report']['prioritized_issues'] = [];
    
    // Priority scoring: critical=40, high=30, medium=20, low=10
    // Additional points for security(+10) and new issues(+5)
    const severityScores = { critical: 40, high: 30, medium: 20, low: 10 };
    const categoryBonus = { security: 10, performance: 5, architecture: 5, dependencies: 3, quality: 0, documentation: 0 };
    
    // Add new issues (highest priority)
    for (const issue of result.new_issues) {
      prioritized.push({
        issue,
        priority_score: severityScores[issue.severity] + categoryBonus[issue.category] + 5,
        status: 'new'
      });
    }
    
    // Add moved issues
    for (const movedItem of result.moved_issues) {
      prioritized.push({
        issue: movedItem.issue,
        priority_score: severityScores[movedItem.issue.severity] + categoryBonus[movedItem.issue.category],
        status: 'moved'
      });
    }
    
    // Add unchanged issues
    for (const issue of result.unchanged_issues) {
      prioritized.push({
        issue,
        priority_score: severityScores[issue.severity] + categoryBonus[issue.category],
        status: 'existing'
      });
    }
    
    // Sort by priority score (descending)
    prioritized.sort((a, b) => b.priority_score - a.priority_score);
    
    return prioritized;
  }

  /**
   * Generate actionable recommendations based on analysis
   */
  private generateRecommendations(
    result: ComparisonResult,
    currentIssues: Issue[],
    prMetadata: ComparisonRequest['prMetadata']
  ): ComparisonResult['final_report']['recommendations'] {
    const recommendations: ComparisonResult['final_report']['recommendations'] = [];
    
    // Group issues by category for recommendations
    const issuesByCategory = new Map<string, Issue[]>();
    for (const issue of currentIssues) {
      const list = issuesByCategory.get(issue.category) || [];
      list.push(issue);
      issuesByCategory.set(issue.category, list);
    }
    
    // Security recommendations
    const securityIssues = issuesByCategory.get('security') || [];
    if (securityIssues.length > 0) {
      const criticalSecurity = securityIssues.filter(i => i.severity === 'critical');
      if (criticalSecurity.length > 0) {
        recommendations.push({
          category: 'security',
          priority: 'critical',
          recommendation: `Fix ${criticalSecurity.length} critical security vulnerabilities immediately. These include: ${
            criticalSecurity.map(i => i.title).join(', ')
          }. Consider using security scanning tools and implementing secure coding practices.`,
          affected_files: Array.from(new Set(criticalSecurity.map(i => i.file_path)))
        });
      }
    }
    
    // Performance recommendations
    const perfIssues = issuesByCategory.get('performance') || [];
    if (perfIssues.length > 2) {
      recommendations.push({
        category: 'performance',
        priority: 'high',
        recommendation: `Address ${perfIssues.length} performance issues. Common patterns include N+1 queries and inefficient algorithms. Consider profiling and load testing.`,
        affected_files: Array.from(new Set(perfIssues.map(i => i.file_path)))
      });
    }
    
    // Architecture recommendations
    const archIssues = issuesByCategory.get('architecture') || [];
    if (archIssues.length > 0) {
      recommendations.push({
        category: 'architecture',
        priority: 'medium',
        recommendation: `Review architectural issues in ${archIssues.length} areas. Focus on separation of concerns, dependency management, and design patterns.`,
        affected_files: Array.from(new Set(archIssues.map(i => i.file_path)))
      });
    }
    
    // Code quality recommendations
    const qualityIssues = issuesByCategory.get('quality') || [];
    if (qualityIssues.length > 5) {
      recommendations.push({
        category: 'quality',
        priority: 'medium',
        recommendation: `Improve code quality in ${qualityIssues.length} areas. Consider refactoring complex functions, improving test coverage, and following coding standards.`,
        affected_files: Array.from(new Set(qualityIssues.map(i => i.file_path)))
      });
    }
    
    // PR-specific recommendations
    if (result.new_issues.length > result.fixed_issues.length) {
      recommendations.push({
        category: 'general',
        priority: 'high',
        recommendation: `This PR introduces more issues (${result.new_issues.length}) than it fixes (${result.fixed_issues.length}). Review the changes carefully and consider splitting into smaller PRs.`,
        affected_files: prMetadata.files_changed
      });
    }
    
    // Sort recommendations by priority
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    
    return recommendations;
  }

  /**
   * Calculate advanced scoring with aging and skill improvements
   */
  private calculateScoring(
    result: ComparisonResult,
    featureReport: ComparisonRequest['featureBranchReport'],
    prMetadata: ComparisonRequest['prMetadata'],
    issueAgeData?: ComparisonRequest['issueAgeData']
  ): ComparisonResult['scoring'] {
    // Enhance issues with age data
    const issuesWithAge: IssueWithAge[] = featureReport.issues.map(issue => {
      const ageData = issueAgeData?.[issue.id];
      return {
        ...issue,
        age_days: ageData?.age_days || 0,
        first_detected: ageData ? new Date(ageData.first_detected) : new Date()
      };
    });

    // Calculate repository score
    const repositoryScore = this.scoringSystem.calculateRepositoryScore(
      issuesWithAge,
      result.fixed_issues
    );

    // Calculate skill improvements if author data provided
    let skillImprovements: SkillImprovement | undefined;
    if (prMetadata.author_id && prMetadata.author_skills) {
      skillImprovements = this.scoringSystem.calculateSkillImprovement(
        prMetadata.author_id,
        result.fixed_issues,
        result.new_issues,
        prMetadata.author_skills
      );
    }

    return {
      repository_score: repositoryScore,
      previous_score: featureReport.overall_score,
      skill_improvements: skillImprovements
    };
  }
}

// AWS Lambda handler
export const handler: Handler = async (event) => {
  try {
    // Parse and validate input
    const request = ComparisonRequestSchema.parse(JSON.parse(event.body || '{}'));
    
    // Create agent and perform comparison
    const agent = new ComparisonAgent();
    const result = await agent.compare(request);
    
    return {
      statusCode: 200,
      body: JSON.stringify(result),
      headers: {
        'Content-Type': 'application/json'
      }
    };
  } catch (error) {
    console.error('Comparison failed:', error);
    
    if (error instanceof z.ZodError) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Invalid request format',
          details: error.errors
        })
      };
    }
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};