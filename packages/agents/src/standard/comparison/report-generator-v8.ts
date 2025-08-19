/**
 * Report Generator V8 - Consolidated Structure
 * 
 * Key improvements over V7:
 * - Single source of truth for issues (no duplication)
 * - Issues shown ONCE in consolidated section
 * - Category sections become impact summaries
 * - 40-50% report size reduction for large PRs
 * - Cleaner navigation and better UX
 */

import { 
  Issue as CodeIssue,
  ComparisonResult as AnalysisResult,
  DeveloperSkills
} from '../types/analysis-types';
import { EducatorAgent } from '../educator/educator-agent';
import { 
  DeveloperProfile,
  EducationalPath
} from '../educator/interfaces/types';

interface V8ReportOptions {
  format: 'markdown' | 'html' | 'json';
  includeEducation?: boolean;
  includeCodeSnippets?: boolean;
  verbosity?: 'minimal' | 'standard' | 'detailed';
}

interface IssueGroup {
  new: CodeIssue[];
  resolved: CodeIssue[];
  preExisting: CodeIssue[];
}

interface ImpactSummary {
  category: string;
  issueCount: number;
  issueIds: string[];
  severity: 'critical' | 'high' | 'medium' | 'low';
  impact: string;
  recommendations: string[];
}

export class ReportGeneratorV8 {
  private educatorAgent: EducatorAgent;
  
  constructor() {
    this.educatorAgent = new EducatorAgent();
  }

  /**
   * Generate consolidated V8 report with no duplication
   */
  async generateReport(
    analysisResult: AnalysisResult,
    options: V8ReportOptions = { format: 'markdown' }
  ): Promise<string> {
    // Group issues by status to avoid duplication
    const issueGroups = this.groupIssuesByStatus(analysisResult);
    
    // Generate impact summaries instead of repeating issues
    const impactSummaries = this.generateImpactSummaries(issueGroups.new);
    
    // Generate educational insights if requested
    const educationalInsights = options.includeEducation 
      ? await this.generateEducationalInsights(issueGroups.new)
      : null;

    // Build report sections
    const sections = [
      this.generateExecutiveSummary(analysisResult, issueGroups),
      this.generateConsolidatedIssuesSection(issueGroups, options),
      this.generateImpactAnalysis(impactSummaries),
      educationalInsights ? this.generateEducationalSection(educationalInsights) : '',
      this.generateActionItems(issueGroups.new),
      this.generatePRComment(analysisResult, issueGroups)
    ];

    return sections.filter(Boolean).join('\n\n---\n\n');
  }

  /**
   * Group issues by their status to prevent duplication
   */
  private groupIssuesByStatus(analysisResult: AnalysisResult): IssueGroup {
    const allIssues = [
      ...(analysisResult.prIssues || []),
      ...(analysisResult.repositoryIssues || [])
    ];

    // Deduplicate issues based on unique key
    const uniqueIssues = this.deduplicateIssues(allIssues);

    return {
      new: uniqueIssues.filter(i => i.status === 'new' || !i.status),
      resolved: uniqueIssues.filter(i => i.status === 'resolved'),
      preExisting: uniqueIssues.filter(i => i.status === 'pre-existing')
    };
  }

  /**
   * Deduplicate issues based on file, line, and message
   */
  private deduplicateIssues(issues: CodeIssue[]): CodeIssue[] {
    const seen = new Set<string>();
    return issues.filter(issue => {
      const key = `${issue.file}:${issue.line}:${issue.message}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Generate executive summary section
   */
  private generateExecutiveSummary(
    analysisResult: AnalysisResult,
    issueGroups: IssueGroup
  ): string {
    const decision = analysisResult.score >= 70 ? 'APPROVE ✅' : 'NEEDS WORK ⚠️';
    const scoreChange = analysisResult.scoreChange 
      ? `(${analysisResult.scoreChange > 0 ? '▲' : '▼'} ${Math.abs(analysisResult.scoreChange)})`
      : '';

    const severityCounts = this.countBySeverity(issueGroups.new);

    return `# CodeQual Analysis Report V8

## Executive Summary

**Decision:** ${decision}
**PR:** #${analysisResult.prNumber} - ${analysisResult.prTitle}
**Score:** ${analysisResult.score}/100 ${scoreChange}
**Issues:** 🔴 Critical: ${severityCounts.critical} | 🟠 High: ${severityCounts.high} | 🟡 Medium: ${severityCounts.medium} | 🟢 Low: ${severityCounts.low}
**New Issues:** ${issueGroups.new.length} | **Resolved:** ${issueGroups.resolved.length} | **Pre-existing:** ${issueGroups.preExisting.length}`;
  }

  /**
   * Generate consolidated issues section (single source of truth)
   */
  private generateConsolidatedIssuesSection(
    issueGroups: IssueGroup,
    options: V8ReportOptions
  ): string {
    let content = '## 1. Issues Overview\n\n';

    // New issues with full details
    if (issueGroups.new.length > 0) {
      content += '### 📍 New Issues (Introduced in this PR)\n\n';
      content += this.formatIssuesByCategory(issueGroups.new, options, true);
    }

    // Resolved issues - brief listing
    if (issueGroups.resolved.length > 0) {
      content += '\n### ✅ Resolved Issues (Fixed in this PR)\n\n';
      issueGroups.resolved.forEach(issue => {
        content += `- **${issue.id || 'FIXED'}:** ${issue.message} (${issue.file}:${issue.line})\n`;
      });
    }

    // Pre-existing issues - reference only
    if (issueGroups.preExisting.length > 0) {
      content += '\n### 📌 Pre-existing Issues (Not addressed)\n\n';
      content += '*These issues existed before this PR and remain unaddressed:*\n\n';
      issueGroups.preExisting.forEach(issue => {
        content += `- **${issue.id || 'OLD'}:** ${issue.message} (${issue.file}:${issue.line})\n`;
      });
    }

    return content;
  }

  /**
   * Format issues by category with full details for new issues
   */
  private formatIssuesByCategory(
    issues: CodeIssue[], 
    options: V8ReportOptions,
    showFullDetails: boolean
  ): string {
    const bySeverity = this.groupBySeverity(issues);
    let content = '';

    ['critical', 'high', 'medium', 'low'].forEach(severity => {
      const severityIssues = bySeverity[severity];
      if (!severityIssues || severityIssues.length === 0) return;

      const emoji = this.getSeverityEmoji(severity);
      content += `#### ${emoji} ${this.capitalize(severity)} (${severityIssues.length})\n\n`;

      severityIssues.forEach((issue, index) => {
        const issueId = issue.id || `${severity.toUpperCase()}-${index + 1}`;
        
        if (showFullDetails) {
          content += this.formatDetailedIssue(issue, issueId, options);
        } else {
          content += `- **${issueId}:** ${issue.message} (${issue.file}:${issue.line})\n`;
        }
      });
      content += '\n';
    });

    return content;
  }

  /**
   * Format a single issue with full details
   */
  private formatDetailedIssue(
    issue: CodeIssue,
    issueId: string,
    options: V8ReportOptions
  ): string {
    let content = `##### ${issueId}: ${issue.message}\n\n`;
    content += `📁 **Location:** \`${issue.file}:${issue.line}\`\n`;
    content += `📝 **Description:** ${issue.description || issue.message}\n`;

    if (options.includeCodeSnippets && issue.code) {
      content += `\n🔍 **Problematic Code:**\n`;
      content += '```' + (issue.language || 'javascript') + '\n';
      content += issue.code + '\n';
      content += '```\n';
    }

    if (issue.suggestedFix) {
      content += `\n✅ **Recommended Fix:**\n`;
      if (options.includeCodeSnippets && issue.fixedCode) {
        content += '```' + (issue.language || 'javascript') + '\n';
        content += issue.fixedCode + '\n';
        content += '```\n';
      } else {
        content += issue.suggestedFix + '\n';
      }
    }

    if (issue.impact) {
      content += `💡 **Impact:** ${issue.impact}\n`;
    }

    if (issue.educationalUrl) {
      content += `📚 **Learn More:** [${issue.educationalTitle || 'Documentation'}](${issue.educationalUrl})\n`;
    }

    if (issue.estimatedFixTime) {
      content += `⏱️ **Fix Time:** ~${issue.estimatedFixTime} minutes\n`;
    }

    content += '\n';
    return content;
  }

  /**
   * Generate impact analysis by category (no issue repetition)
   */
  private generateImpactAnalysis(summaries: ImpactSummary[]): string {
    let content = '## 2. Impact Analysis by Category\n\n';

    summaries.forEach(summary => {
      const emoji = this.getCategoryEmoji(summary.category);
      content += `### ${emoji} ${summary.category} Impact\n\n`;
      content += `- **Issues Found:** ${summary.issueCount} issues (${summary.issueIds.join(', ')})\n`;
      content += `- **Severity:** ${this.capitalize(summary.severity)}\n`;
      content += `- **Impact:** ${summary.impact}\n`;
      
      if (summary.recommendations.length > 0) {
        content += `- **Recommendations:**\n`;
        summary.recommendations.forEach(rec => {
          content += `  - ${rec}\n`;
        });
      }
      content += '\n';
    });

    return content;
  }

  /**
   * Generate impact summaries from issues
   */
  private generateImpactSummaries(issues: CodeIssue[]): ImpactSummary[] {
    const byCategory = this.groupByCategory(issues);
    const summaries: ImpactSummary[] = [];

    Object.entries(byCategory).forEach(([category, categoryIssues]) => {
      if (categoryIssues.length === 0) return;

      const highestSeverity = this.getHighestSeverity(categoryIssues);
      const issueIds = categoryIssues.map((issue, i) => 
        issue.id || `${category.toUpperCase()}-${i + 1}`
      );

      summaries.push({
        category,
        issueCount: categoryIssues.length,
        issueIds,
        severity: highestSeverity,
        impact: this.generateCategoryImpact(category, categoryIssues),
        recommendations: this.generateCategoryRecommendations(category, categoryIssues)
      });
    });

    return summaries;
  }

  /**
   * Generate educational insights section
   */
  private async generateEducationalInsights(issues: CodeIssue[]): Promise<EducationalPath[]> {
    const profile: DeveloperProfile = {
      level: 'intermediate',
      strengths: [],
      weaknesses: this.extractWeaknesses(issues),
      learningStyle: 'practical'
    };

    return this.educatorAgent.research(issues, profile);
  }

  /**
   * Generate educational section from insights
   */
  private generateEducationalSection(insights: EducationalPath[]): string {
    let content = '## 3. Educational Insights & Skill Development\n\n';

    insights.forEach(path => {
      content += `### ${path.skillName}\n`;
      content += `**Current Level:** ${path.currentLevel} → **Target:** ${path.targetLevel}\n`;
      content += `**Time to Master:** ${path.estimatedTime}\n\n`;
      
      content += '**Learning Resources:**\n';
      path.resources.forEach(resource => {
        content += `- [${resource.title}](${resource.url}) - ${resource.type}\n`;
      });
      content += '\n';
    });

    return content;
  }

  /**
   * Generate prioritized action items
   */
  private generateActionItems(issues: CodeIssue[]): string {
    let content = '## 4. Action Items & Next Steps\n\n';

    const prioritized = this.prioritizeIssues(issues);
    
    content += '### Priority Actions\n\n';
    prioritized.slice(0, 5).forEach((issue, i) => {
      content += `${i + 1}. **${issue.message}** (${issue.file}:${issue.line})\n`;
      content += `   - Severity: ${issue.severity}\n`;
      content += `   - Fix: ${issue.suggestedFix || 'See details above'}\n\n`;
    });

    return content;
  }

  /**
   * Generate concise PR comment for GitHub
   */
  private generatePRComment(
    analysisResult: AnalysisResult,
    issueGroups: IssueGroup
  ): string {
    const decision = analysisResult.score >= 70 ? '✅ Approved' : '⚠️ Needs Work';
    
    let content = '## 5. PR Comment\n\n';
    content += '```markdown\n';
    content += `## CodeQual Analysis: ${decision}\n\n`;
    content += `**Score:** ${analysisResult.score}/100\n`;
    content += `**New Issues:** ${issueGroups.new.length} | **Resolved:** ${issueGroups.resolved.length}\n\n`;
    
    if (issueGroups.new.length > 0) {
      content += '### Top Issues to Address:\n';
      issueGroups.new.slice(0, 3).forEach(issue => {
        content += `- ${issue.message} (${issue.file}:${issue.line})\n`;
      });
    }
    
    content += '\n[View Full Report](#)\n';
    content += '```';

    return content;
  }

  // Helper methods
  private groupBySeverity(issues: CodeIssue[]): Record<string, CodeIssue[]> {
    return issues.reduce((acc, issue) => {
      const severity = issue.severity || 'medium';
      if (!acc[severity]) acc[severity] = [];
      acc[severity].push(issue);
      return acc;
    }, {} as Record<string, CodeIssue[]>);
  }

  private groupByCategory(issues: CodeIssue[]): Record<string, CodeIssue[]> {
    return issues.reduce((acc, issue) => {
      const category = issue.category || 'General';
      if (!acc[category]) acc[category] = [];
      acc[category].push(issue);
      return acc;
    }, {} as Record<string, CodeIssue[]>);
  }

  private countBySeverity(issues: CodeIssue[]): Record<string, number> {
    const counts = { critical: 0, high: 0, medium: 0, low: 0 };
    issues.forEach(issue => {
      const severity = issue.severity || 'medium';
      counts[severity] = (counts[severity] || 0) + 1;
    });
    return counts;
  }

  private getHighestSeverity(issues: CodeIssue[]): 'critical' | 'high' | 'medium' | 'low' {
    const severityOrder = ['critical', 'high', 'medium', 'low'];
    for (const severity of severityOrder) {
      if (issues.some(i => i.severity === severity)) {
        return severity as any;
      }
    }
    return 'low';
  }

  private getSeverityEmoji(severity: string): string {
    const emojis = {
      critical: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '🟢'
    };
    return emojis[severity] || '⚪';
  }

  private getCategoryEmoji(category: string): string {
    const emojis = {
      Security: '🔒',
      Performance: '⚡',
      Architecture: '🏗️',
      'Best Practices': '✨',
      Style: '🎨',
      Testing: '🧪',
      Documentation: '📚'
    };
    return emojis[category] || '📌';
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private prioritizeIssues(issues: CodeIssue[]): CodeIssue[] {
    const severityWeights = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1
    };

    return [...issues].sort((a, b) => {
      const weightA = severityWeights[a.severity || 'medium'];
      const weightB = severityWeights[b.severity || 'medium'];
      return weightB - weightA;
    });
  }

  private extractWeaknesses(issues: CodeIssue[]): string[] {
    const categories = new Set<string>();
    issues.forEach(issue => {
      if (issue.category) categories.add(issue.category);
    });
    return Array.from(categories);
  }

  private generateCategoryImpact(category: string, issues: CodeIssue[]): string {
    const severityCounts = this.countBySeverity(issues);
    const criticalCount = severityCounts.critical || 0;
    const highCount = severityCounts.high || 0;

    if (criticalCount > 0) {
      return `Critical ${category.toLowerCase()} vulnerabilities that require immediate attention`;
    } else if (highCount > 0) {
      return `Significant ${category.toLowerCase()} issues that should be addressed before deployment`;
    } else {
      return `Minor ${category.toLowerCase()} improvements recommended for code quality`;
    }
  }

  private generateCategoryRecommendations(category: string, issues: CodeIssue[]): string[] {
    const recommendations: string[] = [];
    const hasSecurityIssues = category === 'Security' && issues.length > 0;
    const hasPerformanceIssues = category === 'Performance' && issues.length > 0;

    if (hasSecurityIssues) {
      recommendations.push('Conduct security review with team lead');
      recommendations.push('Implement input validation and sanitization');
    }

    if (hasPerformanceIssues) {
      recommendations.push('Profile application to identify bottlenecks');
      recommendations.push('Consider implementing caching strategies');
    }

    if (issues.length > 5) {
      recommendations.push(`Address ${category.toLowerCase()} issues systematically`);
    }

    return recommendations;
  }
}