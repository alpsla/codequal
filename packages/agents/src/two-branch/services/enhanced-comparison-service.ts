/**
 * Enhanced Comparison Service
 * 
 * Receives data from specialized agents (Security, Performance, Code Quality, etc.)
 * and generates comprehensive comparison reports with full metadata
 */

import { IssueComparisonService, ComparisonResult, GitDiffResult } from './issue-comparison-service';
import { StandardizedFinding } from '../types/mcp-types';

/**
 * Issue with complete metadata from specialized agents
 */
export interface EnhancedIssue {
  // Core identification
  id: string;
  category: 'security' | 'performance' | 'code-quality' | 'dependency' | 'architecture';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  
  // Detailed information
  title: string;
  description: string;
  
  // Location
  location: {
    file: string;
    startLine: number;
    endLine?: number;
    column?: number;
  };
  
  // Code context
  codeSnippet?: {
    before: string;
    issue: string;
    after: string;
  };
  
  // Fix recommendation from specialized agent
  recommendation?: {
    description: string;
    codeExample?: string;
    estimatedEffort?: 'trivial' | 'small' | 'medium' | 'large';
    documentation?: string[];
  };
  
  // Metadata
  source: string; // Which tool/agent found this
  confidence: number; // 0-1 confidence score
  tags?: string[];
}

/**
 * Data from specialized agents for a branch
 */
export interface SpecializedAgentReports {
  security: {
    agent: 'SecurityAgent';
    tools: string[]; // e.g., ['semgrep', 'bandit']
    issues: EnhancedIssue[];
    summary: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
  };
  performance: {
    agent: 'PerformanceAgent';
    tools: string[]; // e.g., ['lighthouse', 'webpack-analyzer']
    issues: EnhancedIssue[];
    summary: {
      bottlenecks: number;
      memoryLeaks: number;
      slowQueries: number;
    };
  };
  codeQuality: {
    agent: 'CodeQualityAgent';
    tools: string[]; // e.g., ['eslint', 'sonarjs']
    issues: EnhancedIssue[];
    summary: {
      duplications: number;
      complexFunctions: number;
      codeSmells: number;
    };
  };
  dependency: {
    agent: 'DependencyAgent';
    tools: string[]; // e.g., ['npm-audit', 'snyk']
    issues: EnhancedIssue[];
    summary: {
      vulnerabilities: number;
      outdated: number;
      unused: number;
    };
  };
  architecture: {
    agent: 'ArchitectureAgent';
    tools: string[]; // e.g., ['madge', 'dependency-cruiser']
    issues: EnhancedIssue[];
    summary: {
      circularDeps: number;
      violations: number;
      antiPatterns: number;
    };
  };
  licenseCompliance?: {
    agent: 'LicenseComplianceAgent';
    tools: string[]; // e.g., ['scancode', 'fossology']
    issues: EnhancedIssue[];
    summary: {
      incompatibleLicenses: number;
      missingLicenses: number;
      copyleftLicenses: number;
      totalIssues: number;
    };
  };
}

/**
 * Enhanced comparison result with full categorization
 */
export interface EnhancedComparisonResult {
  // Per-category breakdown
  byCategory: {
    security: CategoryComparison;
    performance: CategoryComparison;
    codeQuality: CategoryComparison;
    dependency: CategoryComparison;
    architecture: CategoryComparison;
  };
  
  // Overall summary
  summary: {
    totalResolved: number;
    totalExisting: number;
    totalNewInDiff: number;
    totalNewInFiles: number;
    
    recommendation: {
      action: 'approve' | 'block';  // Simple binary decision
      confidence: number;
      reasons: string[];
    };
    
    prQualityScore: number; // 0-100
    developerScore: {
      current: number;
      change: number; // +/- from this PR
    };
  };
  
  // Detailed reports
  detailedReport: {
    markdown: string;
    html?: string;
    json: any;
  };
  
  // PR comment (concise summary)
  prComment: string;
}

interface CategoryComparison {
  category: string;
  
  resolved: EnhancedIssue[];
  existing: EnhancedIssue[];
  newInDiff: EnhancedIssue[];
  newInFiles: EnhancedIssue[];
  
  summary: {
    totalResolved: number;
    totalExisting: number;
    totalNewInDiff: number;
    totalNewInFiles: number;
    
    bySeverity: Record<string, {
      resolved: number;
      existing: number;
      newInDiff: number;
      newInFiles: number;
    }>;
  };
  
  toolsUsed: string[];
  agentName: string;
}

/**
 * Enhanced Comparison Service
 * Initialized by Orchestrator with specialized agent reports
 */
export class EnhancedComparisonService {
  private issueComparisonService: IssueComparisonService;
  
  constructor() {
    this.issueComparisonService = new IssueComparisonService();
  }
  
  /**
   * Main comparison method - called by Orchestrator
   * 
   * @param mainBranchReports - Reports from all specialized agents for main branch
   * @param prBranchReports - Reports from all specialized agents for PR branch
   * @param gitDiff - Git diff information for the PR
   * @param prMetadata - PR metadata (author, title, etc.)
   */
  async compareWithFullMetadata(
    mainBranchReports: SpecializedAgentReports,
    prBranchReports: SpecializedAgentReports,
    gitDiff: GitDiffResult,
    prMetadata?: any
  ): Promise<EnhancedComparisonResult> {
    console.log('📊 Starting enhanced comparison with full metadata...');
    
    // Process each category separately
    const categoryComparisons: Record<string, CategoryComparison> = {};
    
    for (const category of ['security', 'performance', 'codeQuality', 'dependency', 'architecture'] as const) {
      const mainIssues = mainBranchReports[category].issues;
      const prIssues = prBranchReports[category].issues;
      
      // Convert to StandardizedFinding for comparison
      const mainFindings = this.convertToStandardizedFindings(mainIssues);
      const prFindings = this.convertToStandardizedFindings(prIssues);
      
      // Use issue comparison service to categorize
      const comparison = await this.issueComparisonService.compareIssues(
        mainFindings,
        prFindings,
        gitDiff
      );
      
      // Map back to enhanced issues with full metadata
      categoryComparisons[category] = {
        category,
        resolved: this.mapToEnhancedIssues(comparison.resolvedIssues, mainIssues),
        existing: this.mapToEnhancedIssues(comparison.existingIssues, prIssues),
        newInDiff: this.mapToEnhancedIssues(comparison.newIssues.inDiffLines, prIssues),
        newInFiles: this.mapToEnhancedIssues(comparison.newIssues.inChangedFiles, prIssues),
        summary: {
          totalResolved: comparison.summary.totalResolved,
          totalExisting: comparison.summary.totalExisting,
          totalNewInDiff: comparison.summary.totalNewInDiff,
          totalNewInFiles: comparison.summary.totalNewInFiles,
          bySeverity: comparison.summary.bySeverity
        },
        toolsUsed: prBranchReports[category].tools,
        agentName: prBranchReports[category].agent
      };
    }
    
    // Generate overall summary
    const summary = this.generateOverallSummary(categoryComparisons, prMetadata);
    
    // Generate detailed reports
    const detailedReport = this.generateDetailedReports(categoryComparisons, summary, prMetadata);
    
    // Generate PR comment
    const prComment = this.generatePRComment(categoryComparisons, summary);
    
    return {
      byCategory: categoryComparisons as any,
      summary,
      detailedReport,
      prComment
    };
  }
  
  /**
   * Convert enhanced issues to standardized findings for comparison
   */
  private convertToStandardizedFindings(issues: EnhancedIssue[]): StandardizedFinding[] {
    return issues.map(issue => ({
      id: issue.id,
      tool: issue.source,
      toolSource: issue.source,
      type: issue.category,
      severity: issue.severity,
      message: issue.description,
      title: issue.title,
      description: issue.description,
      file: issue.location.file,
      line: issue.location.startLine,
      location: issue.location,
      metadata: {
        confidence: issue.confidence,
        tags: issue.tags || []
      }
    }));
  }
  
  /**
   * Map standardized findings back to enhanced issues with full metadata
   */
  private mapToEnhancedIssues(
    findings: StandardizedFinding[],
    originalIssues: EnhancedIssue[]
  ): EnhancedIssue[] {
    return findings.map(finding => {
      // Find the original issue with full metadata
      const original = originalIssues.find(i => 
        i.id === finding.id || 
        (i.title === finding.title && 
         i.location.file === finding.location.file &&
         i.location.startLine === finding.location.startLine)
      );
      
      if (original) {
        return original;
      }
      
      // Fallback: create from finding
      return {
        id: finding.id,
        category: finding.type as any,
        severity: finding.severity,
        title: finding.title,
        description: finding.description || '',
        location: {
          file: finding.location.file,
          startLine: finding.location.startLine || finding.location.line || 0,
          endLine: finding.location.endLine,
          column: finding.location.column
        },
        source: finding.toolSource,
        confidence: finding.metadata?.confidence || 0.5
      } as EnhancedIssue;
    });
  }
  
  /**
   * Generate overall summary from category comparisons
   */
  private generateOverallSummary(
    categoryComparisons: Record<string, CategoryComparison>,
    prMetadata?: any
  ): EnhancedComparisonResult['summary'] {
    let totalResolved = 0;
    let totalExisting = 0;
    let totalNewInDiff = 0;
    let totalNewInFiles = 0;
    
    let criticalInDiff = 0;
    let highInDiff = 0;
    let criticalInFiles = 0;
    let highInFiles = 0;
    
    // Aggregate counts
    Object.values(categoryComparisons).forEach(cat => {
      totalResolved += cat.summary.totalResolved;
      totalExisting += cat.summary.totalExisting;
      totalNewInDiff += cat.summary.totalNewInDiff;
      totalNewInFiles += cat.summary.totalNewInFiles;
      
      // Count critical/high issues
      criticalInDiff += cat.newInDiff.filter(i => i.severity === 'critical').length;
      highInDiff += cat.newInDiff.filter(i => i.severity === 'high').length;
      criticalInFiles += cat.newInFiles.filter(i => i.severity === 'critical').length;
      highInFiles += cat.newInFiles.filter(i => i.severity === 'high').length;
    });
    
    // Simple decision logic: BLOCK if any NEW critical/high issues, APPROVE otherwise
    // IMPORTANT: Existing issues (present in both branches) do NOT block the PR
    let action: 'approve' | 'block' = 'approve';
    let confidence = 0.95;
    const reasons: string[] = [];
    
    // Check for NEW critical or high severity issues only
    // These are issues that exist in PR but NOT in main (introduced or should have been cleaned)
    const hasNewCriticalOrHigh = (criticalInDiff > 0 || highInDiff > 0 || criticalInFiles > 0 || highInFiles > 0);
    
    if (hasNewCriticalOrHigh) {
      action = 'block';
      confidence = 0.99;
      
      // List all critical/high issues found
      if (criticalInDiff > 0) {
        reasons.push(`${criticalInDiff} CRITICAL issue(s) introduced in changed lines`);
      }
      if (highInDiff > 0) {
        reasons.push(`${highInDiff} HIGH severity issue(s) introduced in changed lines`);
      }
      if (criticalInFiles > 0) {
        reasons.push(`${criticalInFiles} CRITICAL issue(s) in modified files not addressed`);
      }
      if (highInFiles > 0) {
        reasons.push(`${highInFiles} HIGH severity issue(s) in modified files not addressed`);
      }
      reasons.push('❌ PR must resolve all NEW critical and high severity issues before approval');
    } else {
      action = 'approve';
      confidence = 0.95;
      
      // Positive feedback for approval
      reasons.push('✅ No NEW critical or high severity issues introduced');
      
      if (totalResolved > 0) {
        reasons.push(`🎉 Fixed ${totalResolved} existing issue(s)`);
      }
      if (totalNewInDiff === 0) {
        reasons.push('✨ No new issues introduced in changed code');
      }
      if (totalNewInFiles === 0) {
        reasons.push('🧹 Modified files are clean');
      } else if (totalNewInFiles > 0) {
        // Note about medium/low issues but don't block
        reasons.push(`ℹ️ ${totalNewInFiles} medium/low issue(s) in modified files (non-blocking)`);
      }
      
      // Note about existing critical/high issues if any
      const existingCriticalHigh = Object.values(categoryComparisons).reduce((sum, cat) => {
        return sum + cat.existing.filter(i => ['critical', 'high'].includes(i.severity)).length;
      }, 0);
      
      if (existingCriticalHigh > 0) {
        reasons.push(`📝 ${existingCriticalHigh} existing critical/high issue(s) from main branch (pre-existing, non-blocking)`);
      }
    }
    
    // Calculate PR quality score
    const prQualityScore = this.calculatePRQualityScore(
      totalResolved,
      totalNewInDiff,
      totalNewInFiles,
      criticalInDiff,
      highInDiff
    );
    
    // Calculate developer score change
    const developerScoreChange = this.calculateDeveloperScoreChange(
      totalResolved,
      totalNewInDiff,
      totalNewInFiles
    );
    
    return {
      totalResolved,
      totalExisting,
      totalNewInDiff,
      totalNewInFiles,
      recommendation: {
        action,
        confidence,
        reasons
      },
      prQualityScore,
      developerScore: {
        current: 75, // Would come from skill provider
        change: developerScoreChange
      }
    };
  }
  
  /**
   * Calculate PR quality score (0-100)
   */
  private calculatePRQualityScore(
    resolved: number,
    newInDiff: number,
    newInFiles: number,
    criticalInDiff: number,
    highInDiff: number
  ): number {
    let score = 85; // Base score
    
    // Positive factors
    score += Math.min(resolved * 2, 15); // Up to +15 for fixes
    
    // Negative factors
    score -= criticalInDiff * 15;
    score -= highInDiff * 8;
    score -= newInDiff * 3;
    score -= newInFiles * 1; // Less penalty for pre-existing in files
    
    return Math.max(0, Math.min(100, score));
  }
  
  /**
   * Calculate developer score change
   */
  private calculateDeveloperScoreChange(
    resolved: number,
    newInDiff: number,
    newInFiles: number
  ): number {
    let change = 0;
    
    change += resolved * 0.5; // +0.5 points per fix
    change -= newInDiff * 1; // -1 point per new issue introduced
    change -= newInFiles * 0.2; // -0.2 points per issue not cleaned
    
    return Math.round(change * 10) / 10; // Round to 1 decimal
  }
  
  /**
   * Generate detailed reports in multiple formats
   */
  private generateDetailedReports(
    categoryComparisons: Record<string, CategoryComparison>,
    summary: EnhancedComparisonResult['summary'],
    prMetadata?: any
  ): EnhancedComparisonResult['detailedReport'] {
    const markdown = this.generateMarkdownReport(categoryComparisons, summary, prMetadata);
    const json = {
      categories: categoryComparisons,
      summary,
      metadata: prMetadata
    };
    
    return {
      markdown,
      json,
      html: undefined // Could generate HTML if needed
    };
  }
  
  /**
   * Generate comprehensive markdown report
   */
  private generateMarkdownReport(
    categoryComparisons: Record<string, CategoryComparison>,
    summary: EnhancedComparisonResult['summary'],
    prMetadata?: any
  ): string {
    const lines: string[] = [];
    
    // Header
    lines.push('# Code Analysis Report');
    if (prMetadata?.title) {
      lines.push(`## PR: ${prMetadata.title}`);
    }
    lines.push('');
    
    // Summary
    lines.push('## Summary');
    lines.push(`- **Recommendation**: ${summary.recommendation.action.toUpperCase()} ${this.getRecommendationEmoji(summary.recommendation.action)}`);
    lines.push(`- **PR Quality Score**: ${summary.prQualityScore}/100`);
    lines.push(`- **Issues Resolved**: ${summary.totalResolved}`);
    lines.push(`- **New Issues Introduced**: ${summary.totalNewInDiff}`);
    lines.push(`- **Issues Not Cleaned**: ${summary.totalNewInFiles}`);
    lines.push('');
    
    // Reasoning
    if (summary.recommendation.reasons.length > 0) {
      lines.push('### Reasoning');
      summary.recommendation.reasons.forEach(reason => {
        lines.push(`- ${reason}`);
      });
      lines.push('');
    }
    
    // Per-category details
    lines.push('## Detailed Analysis by Category');
    lines.push('');
    
    for (const [category, comparison] of Object.entries(categoryComparisons)) {
      lines.push(`### ${this.formatCategoryName(category)}`);
      lines.push(`*Agent: ${comparison.agentName} | Tools: ${comparison.toolsUsed.join(', ')}*`);
      lines.push('');
      
      // Category summary
      lines.push('| Status | Count | Critical | High | Medium | Low |');
      lines.push('|--------|-------|----------|------|--------|-----|');
      
      const getSeverityCounts = (issues: EnhancedIssue[]) => ({
        critical: issues.filter(i => i.severity === 'critical').length,
        high: issues.filter(i => i.severity === 'high').length,
        medium: issues.filter(i => i.severity === 'medium').length,
        low: issues.filter(i => i.severity === 'low').length
      });
      
      const resolved = getSeverityCounts(comparison.resolved);
      const newInDiff = getSeverityCounts(comparison.newInDiff);
      const newInFiles = getSeverityCounts(comparison.newInFiles);
      const existing = getSeverityCounts(comparison.existing);
      
      lines.push(`| ✅ Resolved | ${comparison.summary.totalResolved} | ${resolved.critical} | ${resolved.high} | ${resolved.medium} | ${resolved.low} |`);
      lines.push(`| ❌ New (diff) | ${comparison.summary.totalNewInDiff} | ${newInDiff.critical} | ${newInDiff.high} | ${newInDiff.medium} | ${newInDiff.low} |`);
      lines.push(`| ⚠️ New (files) | ${comparison.summary.totalNewInFiles} | ${newInFiles.critical} | ${newInFiles.high} | ${newInFiles.medium} | ${newInFiles.low} |`);
      lines.push(`| 📌 Existing | ${comparison.summary.totalExisting} | ${existing.critical} | ${existing.high} | ${existing.medium} | ${existing.low} |`);
      lines.push('');
      
      // Show critical/high new issues with details
      const criticalAndHigh = [
        ...comparison.newInDiff.filter(i => ['critical', 'high'].includes(i.severity)),
        ...comparison.newInFiles.filter(i => ['critical', 'high'].includes(i.severity))
      ];
      
      if (criticalAndHigh.length > 0) {
        lines.push('#### Critical & High Priority Issues');
        criticalAndHigh.forEach(issue => {
          lines.push(`- **[${issue.severity.toUpperCase()}]** ${issue.title}`);
          lines.push(`  - File: \`${issue.location.file}:${issue.location.startLine}\``);
          lines.push(`  - ${issue.description}`);
          if (issue.recommendation) {
            lines.push(`  - **Fix**: ${issue.recommendation.description}`);
            if (issue.recommendation.codeExample) {
              lines.push('    ```');
              lines.push(`    ${issue.recommendation.codeExample}`);
              lines.push('    ```');
            }
          }
        });
        lines.push('');
      }
    }
    
    return lines.join('\n');
  }
  
  /**
   * Generate concise PR comment
   */
  private generatePRComment(
    categoryComparisons: Record<string, CategoryComparison>,
    summary: EnhancedComparisonResult['summary']
  ): string {
    const emoji = this.getRecommendationEmoji(summary.recommendation.action);
    const action = summary.recommendation.action.toUpperCase();
    
    const lines: string[] = [];
    lines.push(`${emoji} **Code Analysis: ${action}**`);
    lines.push('');
    lines.push(`**Quality Score**: ${summary.prQualityScore}/100`);
    lines.push('');
    
    // Quick stats
    lines.push('| Category | ✅ Fixed | ❌ New | ⚠️ Not Cleaned |');
    lines.push('|----------|---------|--------|----------------|');
    
    for (const [category, comparison] of Object.entries(categoryComparisons)) {
      if (comparison.summary.totalResolved > 0 || 
          comparison.summary.totalNewInDiff > 0 || 
          comparison.summary.totalNewInFiles > 0) {
        lines.push(`| ${this.formatCategoryName(category)} | ${comparison.summary.totalResolved} | ${comparison.summary.totalNewInDiff} | ${comparison.summary.totalNewInFiles} |`);
      }
    }
    
    lines.push('');
    
    // Key reasons
    if (summary.recommendation.reasons.length > 0) {
      lines.push('**Key Findings:**');
      summary.recommendation.reasons.slice(0, 3).forEach(reason => {
        lines.push(`- ${reason}`);
      });
    }
    
    lines.push('');
    lines.push('*Generated by CodeQual Analysis Engine*');
    
    return lines.join('\n');
  }
  
  /**
   * Format category name for display
   */
  private formatCategoryName(category: string): string {
    const names: Record<string, string> = {
      security: '🔒 Security',
      performance: '⚡ Performance',
      codeQuality: '✨ Code Quality',
      dependency: '📦 Dependencies',
      architecture: '🏗️ Architecture'
    };
    return names[category] || category;
  }
  
  /**
   * Get emoji for recommendation
   */
  private getRecommendationEmoji(action: string): string {
    switch (action) {
      case 'approve': return '✅';
      case 'block': return '🚫';
      default: return '📊';
    }
  }
}