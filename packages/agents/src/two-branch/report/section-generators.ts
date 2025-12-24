/**
 * Report Section Generators
 * 
 * Generate individual sections of the V9 grouped report.
 * Each method is responsible for one section of the markdown report.
 */

import { EnrichedIssue, ReportMetadata, ScoreBreakdown } from './types';
import { IssueGroup } from '../utils/issue-grouping';
import { isGroupAutoFixable, getTierBadge, getFixCapabilityInfo, getScannerToolGuidance } from './fix-capability-utils';

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
   * SESSION 13 FIX: Generate category breakdown section
   * Shows issues grouped by detected category (Security, Performance, etc.) with severity counts
   */
  generateCategoryBreakdown(issues: EnrichedIssue[], score: ScoreBreakdown): string {
    let section = '## 📊 Issues by Category and Severity\n\n';
    section += '*This table shows how issues are distributed across quality categories and their impact on scores.*\n\n';

    // Group issues by detected category
    const byDetectedCategory: Record<string, EnrichedIssue[]> = {
      'Security': [],
      'Performance': [],
      'Architecture': [],
      'Dependencies': [],
      'Code Quality': []
    };

    for (const issue of issues) {
      const category = issue.detectedCategory || 'Code Quality';
      if (byDetectedCategory[category]) {
        byDetectedCategory[category].push(issue);
      } else {
        // Fallback for any unexpected categories
        byDetectedCategory['Code Quality'].push(issue);
      }
    }

    // Calculate severity counts per category
    const categoryData: Array<{
      emoji: string;
      name: string;
      critical: number;
      high: number;
      medium: number;
      low: number;
      total: number;
      score: number;
    }> = [];

    const categoryMap = {
      'Security': { emoji: '🔒', score: score.security },
      'Performance': { emoji: '⚡', score: score.performance },
      'Architecture': { emoji: '🏗️', score: score.architecture },
      'Dependencies': { emoji: '📦', score: score.dependencies },
      'Code Quality': { emoji: '✨', score: score.quality }
    };

    for (const [categoryName, categoryIssues] of Object.entries(byDetectedCategory)) {
      const critical = categoryIssues.filter(i => i.severity === 'critical').length;
      const high = categoryIssues.filter(i => i.severity === 'high').length;
      const medium = categoryIssues.filter(i => i.severity === 'medium').length;
      const low = categoryIssues.filter(i => i.severity === 'low').length;
      const total = categoryIssues.length;

      const meta = categoryMap[categoryName as keyof typeof categoryMap];

      categoryData.push({
        emoji: meta.emoji,
        name: categoryName,
        critical,
        high,
        medium,
        low,
        total,
        score: meta.score
      });
    }

    // Generate markdown table
    section += '| Category | Critical | High | Medium | Low | Total | Score |\n';
    section += '|----------|----------|------|--------|-----|-------|-------|\n';

    for (const data of categoryData) {
      section += `| ${data.emoji} ${data.name} | `;
      section += `${data.critical} | `;
      section += `${data.high} | `;
      section += `${data.medium} | `;
      section += `${data.low} | `;
      section += `**${data.total}** | `;
      section += `**${data.score}/100** |\n`;
    }

    section += '\n';

    // Add calculation explanation
    section += '**Score Calculation:**\n\n';
    section += '- **APP Score (Repository Health)**: Categories start at 100/100, deduct based on severity\n';
    section += '- **Skill Score (Developer Competency)**: Categories start at 50/100, deduct based on severity\n';
    section += '- **Deduction rates**: Critical (-5), High (-3), Medium (-1), Low (-0.5)\n';
    section += '- **APP Score** = MIN of all categories (weakest link)\n';
    section += '- **Skill Score** = AVG of all categories\n\n';

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
          const issueArray = toolIssues as any[];
          section += `- **${tool}**: ${issueArray.length} ${severity} issue(s)\n`;
        }
      }
      section += '\n';
    }
    
    // Auto-fixable issues
    const autoFixable = groups.filter(g => this.isAutoFixable(g));
    if (autoFixable.length > 0) {
      const totalAutoFixable = autoFixable.reduce((sum, g) => sum + g.count, 0);
      section += `### ⚡ Quick Wins (${totalAutoFixable} auto-fixable)\n\n`;
      section += 'These issues can be automatically fixed using IDE tools:\n\n';
      
      for (const group of autoFixable.slice(0, 5)) {
        section += `- **${this.getRuleTitle(group.rule, group.tool)}**: `;
        section += `${group.count} occurrence(s)\n`;
      }
      
      if (autoFixable.length > 5) {
        section += `\n*... and ${autoFixable.length - 5} more auto-fixable groups*\n`;
      }
      section += '\n';
    }
    
    return section;
  }

  /**
   * Generate scanner tool guidance section for Tier 3 (scanner-only) tools
   * This shows users what they get even without auto-fix capabilities
   * Session 57 Part 5: Added to ensure scanner value is communicated
   */
  generateScannerGuidanceSection(issues: EnrichedIssue[]): string {
    // Group issues by tool
    const toolCounts = new Map<string, number>();
    for (const issue of issues) {
      toolCounts.set(issue.tool, (toolCounts.get(issue.tool) || 0) + 1);
    }

    // Get scanner guidance for each tool
    const scannerTools: Array<{ tool: string; count: number; guidance: any }> = [];
    for (const [tool, count] of toolCounts.entries()) {
      const guidance = getScannerToolGuidance(tool);
      if (guidance) {
        scannerTools.push({ tool, count, guidance });
      }
    }

    if (scannerTools.length === 0) {
      return '';
    }

    let section = '## 🔍 Scanner Tool Insights\n\n';
    section += '*These tools provide valuable analysis even without auto-fix capabilities. ';
    section += 'Review the findings and apply fixes manually using the guidance below.*\n\n';

    for (const { tool, count, guidance } of scannerTools) {
      section += `### ${guidance.tool} (${count} issues)\n\n`;
      section += `**Category:** ${guidance.category}\n\n`;

      section += `**What You Get:**\n`;
      for (const item of guidance.whatYouGet) {
        section += `- ${item}\n`;
      }
      section += '\n';

      section += `**How to Fix:**\n`;
      for (const item of guidance.howToFix) {
        section += `- ${item}\n`;
      }
      section += '\n';

      if (guidance.resources && guidance.resources.length > 0) {
        section += `**Resources:**\n`;
        for (const resource of guidance.resources) {
          section += `- ${resource}\n`;
        }
        section += '\n';
      }
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
    const match = url.match(/\/([^/]+)(\.git)?$/);
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

  /**
   * Check if a group is auto-fixable using the ToolFixRegistry
   * Session 57 Part 3: Uses registry instead of hardcoded rules
   */
  private isAutoFixable(group: IssueGroup): boolean {
    return isGroupAutoFixable(group);
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

