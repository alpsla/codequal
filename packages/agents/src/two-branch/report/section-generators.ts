/**
 * Report Section Generators
 * 
 * Generate individual sections of the V9 grouped report.
 * Each method is responsible for one section of the markdown report.
 */

import { EnrichedIssue, ReportMetadata, ScoreBreakdown } from './types';
import { IssueGroup } from '../utils/issue-grouping';

export class SectionGenerators {
  /**
   * Generate report header
   */
  generateHeader(metadata: ReportMetadata, score: ScoreBreakdown): string {
    let header = '# 🔍 Code Quality Analysis Report\n\n';
    header += '## Repository Information\n\n';
    
    const repoName = metadata.repositoryName || this.extractRepoName(metadata.repositoryUrl);
    header += `**Repository:** [${repoName}](${metadata.repositoryUrl})\n`;
    header += `**Pull Request:** #${metadata.prNumber}`;
    
    if (metadata.prTitle) {
      header += ` - ${metadata.prTitle}`;
    }
    header += '\n';
    
    if (metadata.prAuthor) {
      header += `**Author:** ${metadata.prAuthor}\n`;
    }
    
    header += `**Analysis Date:** ${this.formatDate(metadata.analysisDate)}\n`;
    header += `**Total Duration:** ${metadata.duration}\n`;
    
    // Overall result
    const resultEmoji = score.overall >= 70 ? '✅' : score.overall >= 50 ? '⚠️' : '❌';
    header += `**Result:** ${resultEmoji} `;
    
    if (score.overall >= 70) {
      header += '**APPROVED**\n\n';
    } else if (score.overall >= 50) {
      header += '**NEEDS REVIEW**\n\n';
    } else {
      header += '**CHANGES REQUIRED**\n\n';
    }
    
    return header;
  }

  /**
   * Generate score summary section
   */
  generateScoreSummary(score: ScoreBreakdown, issues: EnrichedIssue[]): string {
    let section = '## 📊 Quality Score\n\n';
    
    section += `${score.interpretation.emoji} **${score.overall}/100** `;
    section += `(Grade: **${score.grade}**) - ${score.interpretation.label}\n\n`;
    section += `*${score.interpretation.description}*\n\n`;
    
    section += '**Category Breakdown:**\n\n';
    section += `- 🔒 Security: ${score.security}/100\n`;
    section += `- ⚡ Performance: ${score.performance}/100\n`;
    section += `- ✨ Code Quality: ${score.quality}/100\n`;
    section += `- 🏗️  Architecture: ${score.architecture}/100\n`;
    section += `- 📦 Dependencies: ${score.dependencies}/100\n\n`;
    
    return section;
  }

  /**
   * Generate issue summary section
   */
  generateIssueSummary(issues: EnrichedIssue[], groups: IssueGroup[]): string {
    let section = '## 📋 Issue Summary\n\n';
    
    const byCategory = this.groupByCategory(issues);
    const bySeverity = this.groupBySeverity(issues);
    
    section += `**Total Issues:** ${issues.length} (grouped into ${groups.length} issue types)\n\n`;
    
    section += '**By Severity**:\n';
    section += `- 🔴 Critical: ${bySeverity.critical || 0}\n`;
    section += `- 🟠 High: ${bySeverity.high || 0}\n`;
    section += `- 🟡 Medium: ${bySeverity.medium || 0}\n`;
    section += `- 🟢 Low: ${bySeverity.low || 0}\n\n`;
    
    section += '**By Category**:\n';
    section += `- 🆕 NEW: ${byCategory.NEW || 0} (introduced in this PR)\n`;
    section += `- ⚠️  EXISTING_MODIFIED: ${byCategory.EXISTING_MODIFIED || 0} (pre-existing in modified files)\n`;
    section += `- ✅ RESOLVED: ${byCategory.RESOLVED || 0} (fixed by this PR)\n`;
    section += `- 📝 EXISTING_REST: ${byCategory.EXISTING_REST || 0} (pre-existing in unchanged files)\n\n`;
    
    return section;
  }

  /**
   * Generate key findings section
   */
  generateKeyFindings(
    issues: EnrichedIssue[],
    groups: IssueGroup[],
    blockingIssues: EnrichedIssue[]
  ): string {
    let section = '## 🎯 Key Findings\n\n';
    
    if (blockingIssues.length > 0) {
      section += `### 🚨 Blocking Issues (${blockingIssues.length})\n\n`;
      section += 'Critical and high-severity issues that should be addressed before merging:\n\n';
      
      const grouped = this.groupBySeverityAndTool(blockingIssues);
      for (const [severity, toolGroups] of Object.entries(grouped)) {
        for (const [tool, toolIssues] of Object.entries(toolGroups as any)) {
          section += `- **${tool}**: ${toolIssues.length} ${severity} issue(s)\n`;
        }
      }
      section += '\n';
    }
    
    // Auto-fixable issues
    const autoFixable = groups.filter(g => this.isAutoFixable(g));
    if (autoFixable.length > 0) {
      const totalAutoFixable = autoFixable.reduce((sum, g) => sum + g.issues.length, 0);
      section += `### ⚡ Quick Wins (${totalAutoFixable} auto-fixable)\n\n`;
      section += 'These issues can be automatically fixed using IDE tools:\n\n';
      
      for (const group of autoFixable.slice(0, 5)) {
        section += `- **${this.getRuleTitle(group.rule, group.tool)}**: `;
        section += `${group.issues.length} occurrence(s)\n`;
      }
      
      if (autoFixable.length > 5) {
        section += `\n*... and ${autoFixable.length - 5} more auto-fixable groups*\n`;
      }
      section += '\n';
    }
    
    return section;
  }

  /**
   * Generate financial impact section
   */
  generateFinancialImpact(issues: EnrichedIssue[], groups: IssueGroup[]): string {
    const critical = issues.filter(i => i.severity === 'critical').length;
    const high = issues.filter(i => i.severity === 'high').length;
    
    let section = '### Financial Impact\n\n';
    
    if (critical === 0 && high === 0) {
      section += '**💚 Low Financial Risk**\n\n';
      section += 'No critical or high-severity issues detected. ';
      section += 'All identified issues are related to code quality and maintainability.\n\n';
      section += '**Cost to fix:** Minimal - most issues are auto-fixable via IDE tools or linters.\n';
      section += '**Impact if not fixed:** Gradual technical debt accumulation, slower code reviews.\n';
      section += '**Recommendation:** Address during regular refactoring cycles.\n\n';
      return section;
    }
    
    // High-risk scenario
    section += '**🔴 High Financial Risk**\n\n';
    section += `Detected **${critical} critical** and **${high} high-severity** issues.\n\n`;
    
    // Estimate fix cost
    const fixCost = this.estimateFixCost(issues);
    section += `**Estimated fix cost:** ${fixCost.time} (${fixCost.range})\n`;
    section += `**Potential exploit cost:** ${this.estimateExploitCost(critical, high)}\n`;
    section += `**Business impact:** ${this.estimateBusinessImpact(critical, high)}\n\n`;
    
    return section;
  }

  // ================================================================
  // Helper Methods
  // ================================================================

  private extractRepoName(url: string): string {
    const match = url.match(/\/([^\/]+)(\.git)?$/);
    return match ? match[1] : 'repository';
  }

  private formatDate(dateString?: string): string {
    if (!dateString) {
      const now = new Date();
      return now.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'GMT',
        timeZoneName: 'short'
      });
    }
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'GMT',
      timeZoneName: 'short'
    });
  }

  private groupByCategory(issues: EnrichedIssue[]): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const issue of issues) {
      counts[issue.category] = (counts[issue.category] || 0) + 1;
    }
    return counts;
  }

  private groupBySeverity(issues: EnrichedIssue[]): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const issue of issues) {
      counts[issue.severity] = (counts[issue.severity] || 0) + 1;
    }
    return counts;
  }

  private groupBySeverityAndTool(issues: EnrichedIssue[]): Record<string, Record<string, EnrichedIssue[]>> {
    const grouped: Record<string, Record<string, EnrichedIssue[]>> = {};
    
    for (const issue of issues) {
      if (!grouped[issue.severity]) {
        grouped[issue.severity] = {};
      }
      if (!grouped[issue.severity][issue.tool]) {
        grouped[issue.severity][issue.tool] = [];
      }
      grouped[issue.severity][issue.tool].push(issue);
    }
    
    return grouped;
  }

  private isAutoFixable(group: IssueGroup): boolean {
    const autoFixableRules = [
      'TabCharacter',
      'MissingJavadocMethod',
      'MissingJavadocType',
      'WhitespaceAround',
      'IndentationCheck'
    ];
    return autoFixableRules.includes(group.rule);
  }

  private getRuleTitle(rule: string, tool: string): string {
    // Simplified version - would normally lookup from knowledge base
    return rule.replace(/([A-Z])/g, ' $1').trim();
  }

  private estimateFixCost(issues: EnrichedIssue[]): { time: string; range: string } {
    const critical = issues.filter(i => i.severity === 'critical').length;
    const high = issues.filter(i => i.severity === 'high').length;
    const medium = issues.filter(i => i.severity === 'medium').length;
    
    const hours = (critical * 4) + (high * 2) + (medium * 0.5);
    const cost = hours * 150; // $150/hour average
    
    return {
      time: `${Math.ceil(hours)} developer hours`,
      range: `$${Math.floor(cost * 0.8).toLocaleString()} - $${Math.ceil(cost * 1.2).toLocaleString()}`
    };
  }

  private estimateExploitCost(critical: number, high: number): string {
    if (critical > 0) {
      return '$500K - $5M+ (data breach, compliance fines, reputation damage)';
    }
    if (high > 0) {
      return '$100K - $500K (security incident response, potential downtime)';
    }
    return 'Low - primarily technical debt';
  }

  private estimateBusinessImpact(critical: number, high: number): string {
    if (critical > 0) {
      return 'Critical - blocks production deployment, compliance risk';
    }
    if (high > 0) {
      return 'High - security vulnerabilities, performance degradation';
    }
    return 'Medium - maintainability and code quality concerns';
  }
}

