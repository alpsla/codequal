/**
 * V9 Enhanced Report Formatter Module
 * 
 * Generates comprehensive reports with all required sections:
 * - PR Decision with clear reasoning
 * - Complete issue metadata (title, description, impact, category, severity, file, line)
 * - Code snippets and fix recommendations with code examples
 * - Business impact analysis
 * - Educational resources
 */

import { 
  Issue, 
  IssueCategory, 
  IssueSeverity,
  AnalysisResult, 
  ReportOptions,
  BusinessImpact,
  EducationalResource,
  SkillScore
} from './v9-types';
import { V9ScoringCalculator } from './v9-scoring-calculator';
import { V9BusinessImpact } from './v9-business-impact';
import { V9EducationalResources } from './v9-educational-resources';

export class V9ReportFormatterEnhanced {
  private readonly scoringCalculator: V9ScoringCalculator;
  private readonly businessImpact: V9BusinessImpact;
  private readonly educationalResources: V9EducationalResources;

  constructor() {
    this.scoringCalculator = new V9ScoringCalculator();
    this.businessImpact = new V9BusinessImpact();
    this.educationalResources = new V9EducationalResources();
  }

  /**
   * Generate comprehensive report with all required sections
   */
  async generateComprehensiveReport(
    result: AnalysisResult,
    language: string,
    options: ReportOptions = {
      format: 'markdown',
      includeCodeSnippets: true,
      includeEducationalResources: true,
      includeBusinessImpact: true,
      includeSkillScore: true,
      groupSimilarIssues: false // Show each issue individually for full detail
    }
  ): Promise<string> {
    const report: string[] = [];
    
    // ============= HEADER =============
    report.push('# 🔍 V9 Code Quality Analysis Report');
    report.push('');
    report.push(`**Repository:** ${result.metadata.repository}`);
    report.push(`**Pull Request:** #${result.metadata.prNumber}`);
    report.push(`**Branch:** ${result.metadata.branch}`);
    report.push(`**Language:** ${language}`);
    report.push(`**Analysis Date:** ${new Date(result.metadata.timestamp).toISOString()}`);
    report.push(`**Analyzer Version:** V9 with ModelAwareBaseAgent Integration`);
    report.push('');
    report.push('---');
    report.push('');
    
    // ============= EXECUTIVE SUMMARY =============
    report.push('## 📊 Executive Summary');
    report.push('');
    
    // PR Decision Section
    report.push('### 🎯 PR Decision');
    const decisionEmoji = result.decision === 'approved' ? '✅' : '❌';
    const decisionText = result.decision === 'approved' ? 'APPROVED' : 'REJECTED';
    report.push(`**Decision:** ${decisionEmoji} **${decisionText}**`);
    report.push(`**Confidence Level:** ${(result.confidence * 100).toFixed(0)}%`);
    report.push(`**Quality Score:** ${result.qualityScore.toFixed(1)}/100 (Grade: **${result.grade}**)`);
    report.push('');
    report.push('**Decision Reasoning:**');
    report.push(`> ${result.reason}`);
    report.push('');
    
    // Quick Stats
    report.push('### 📈 Quick Statistics');
    report.push('| Metric | Value |');
    report.push('|--------|-------|');
    report.push(`| Total Issues Found | ${result.newIssues.length + result.existingIssues.length} |`);
    report.push(`| New Issues (This PR) | ${result.newIssues.length} |`);
    report.push(`| Blocking Issues | ${result.blockingIssues.length} |`);
    report.push(`| Resolved Issues | ${result.resolvedIssues.length} |`);
    report.push(`| Files Modified | ${result.modifiedFiles.length} |`);
    report.push(`| Files Analyzed | ${result.metadata.totalFiles} |`);
    report.push(`| Analysis Time | ${result.metadata.analysisTime}ms |`);
    report.push('');
    
    // Issue Severity Breakdown
    report.push('### 🔥 Issue Severity Distribution');
    const allIssues = [...result.newIssues, ...result.existingIssues];
    const severityBreakdown = this.scoringCalculator.getSeverityBreakdown(allIssues);
    report.push('| Severity | Count | Impact Points |');
    report.push('|----------|-------|---------------|');
    report.push(`| 🔴 Critical | ${severityBreakdown.critical || 0} | ${(severityBreakdown.critical || 0) * 5} |`);
    report.push(`| 🟠 High | ${severityBreakdown.high || 0} | ${(severityBreakdown.high || 0) * 3} |`);
    report.push(`| 🟡 Medium | ${severityBreakdown.medium || 0} | ${(severityBreakdown.medium || 0) * 1} |`);
    report.push(`| 🟢 Low | ${severityBreakdown.low || 0} | ${((severityBreakdown.low || 0) * 0.5).toFixed(1)} |`);
    report.push('');
    
    // ============= BLOCKING ISSUES (MUST FIX) =============
    if (result.blockingIssues.length > 0) {
      report.push('---');
      report.push('');
      report.push('## 🚨 BLOCKING ISSUES - MUST FIX BEFORE MERGE');
      report.push('');
      report.push('These critical issues must be resolved before this PR can be approved:');
      report.push('');
      
      for (let i = 0; i < result.blockingIssues.length; i++) {
        const issue = result.blockingIssues[i];
        await this.addDetailedIssue(report, issue, i + 1, language, options, 'blocking');
      }
    }
    
    // ============= NEW ISSUES (THIS PR) =============
    if (result.newIssues.length > 0) {
      report.push('---');
      report.push('');
      report.push('## 🆕 NEW ISSUES INTRODUCED IN THIS PR');
      report.push('');
      report.push('Issues that were introduced by the changes in this pull request:');
      report.push('');
      
      for (let i = 0; i < result.newIssues.length; i++) {
        const issue = result.newIssues[i];
        if (!result.blockingIssues.includes(issue)) {
          await this.addDetailedIssue(report, issue, i + 1, language, options, 'new');
        }
      }
    }
    
    // ============= EXISTING ISSUES (BACKLOG) =============
    if (result.backlogIssues.length > 0) {
      report.push('---');
      report.push('');
      report.push('## 📝 EXISTING ISSUES (BACKLOG)');
      report.push('');
      report.push('Pre-existing issues that should be addressed in future sprints:');
      report.push('');
      
      // Group by category for better organization
      const byCategory = this.groupByCategory(result.backlogIssues);
      
      for (const [category, issues] of Object.entries(byCategory)) {
        if (issues.length > 0) {
          report.push(`### ${this.getCategoryIcon(category as IssueCategory)} ${category} Issues (${issues.length})`);
          report.push('');
          
          for (let i = 0; i < Math.min(issues.length, 3); i++) {
            await this.addDetailedIssue(report, issues[i], i + 1, language, options, 'backlog');
          }
          
          if (issues.length > 3) {
            report.push(`*... and ${issues.length - 3} more ${category} issues*`);
            report.push('');
          }
        }
      }
    }
    
    // ============= RESOLVED ISSUES =============
    if (result.resolvedIssues.length > 0) {
      report.push('---');
      report.push('');
      report.push('## ✅ RESOLVED ISSUES');
      report.push('');
      report.push('Great work! The following issues were fixed in this PR:');
      report.push('');
      
      for (const issue of result.resolvedIssues) {
        report.push(`- ✅ **${issue.title}** (${issue.severity}) in \`${issue.file}:${issue.line}\``);
      }
      report.push('');
    }
    
    // ============= BUSINESS IMPACT ANALYSIS =============
    if (options.includeBusinessImpact && result.businessImpact) {
      report.push('---');
      report.push('');
      report.push('## 💼 Business Impact Analysis');
      report.push('');
      await this.addBusinessImpactSection(report, result.businessImpact);
    }
    
    // ============= DEVELOPER SKILLS ANALYSIS =============
    if (options.includeSkillScore && result.skillScore) {
      report.push('---');
      report.push('');
      report.push('## 🎯 Developer Skills Analysis');
      report.push('');
      await this.addSkillScoreSection(report, result.skillScore);
    }
    
    // ============= EDUCATIONAL RESOURCES =============
    if (options.includeEducationalResources && result.educationalResources && result.educationalResources.length > 0) {
      report.push('---');
      report.push('');
      report.push('## 📚 Educational Resources');
      report.push('');
      report.push('Recommended learning resources based on the issues found:');
      report.push('');
      
      const resourcesByType = this.groupResourcesByType(result.educationalResources);
      
      for (const [type, resources] of Object.entries(resourcesByType)) {
        report.push(`### ${this.getResourceTypeIcon(type)} ${this.capitalizeFirst(type)}`);
        report.push('');
        
        for (const resource of resources.slice(0, 5)) {
          report.push(`- [${resource.title}](${resource.url})`);
          report.push(`  ${resource.description}`);
        }
        report.push('');
      }
    }
    
    // ============= TECHNICAL DETAILS =============
    report.push('---');
    report.push('');
    report.push('## ⚙️ Technical Details');
    report.push('');
    report.push('### Analysis Configuration');
    report.push(`- **Analyzer:** V9 ${language} Analyzer`);
    report.push(`- **Model:** ${result.metadata.model ? `${result.metadata.model.primary_provider}/${result.metadata.model.primary_model}` : 'Default'}`);
    report.push(`- **Tools Used:** ${result.metadata.tools.join(', ')}`);
    report.push(`- **Execution Time:** ${result.metadata.analysisTime}ms`);
    report.push('');
    
    report.push('### Files Modified in PR');
    report.push('```');
    for (const file of result.modifiedFiles.slice(0, 10)) {
      report.push(file);
    }
    if (result.modifiedFiles.length > 10) {
      report.push(`... and ${result.modifiedFiles.length - 10} more files`);
    }
    report.push('```');
    report.push('');
    
    // ============= FOOTER =============
    report.push('---');
    report.push('');
    report.push('*Generated by V9 Code Quality Analyzer with ModelAwareBaseAgent*');
    report.push(`*Analysis completed at ${new Date().toISOString()}*`);
    report.push(`*Repository: ${result.metadata.repoUrl}*`);
    
    return report.join('\n');
  }

  /**
   * Add detailed issue with all metadata
   */
  private async addDetailedIssue(
    report: string[],
    issue: Issue,
    index: number,
    language: string,
    options: ReportOptions,
    context: 'blocking' | 'new' | 'backlog'
  ): Promise<void> {
    const severityIcon = this.getSeverityIcon(issue.severity);
    const categoryIcon = this.getCategoryIcon(issue.category);
    
    // Issue Header
    report.push(`### ${index}. ${severityIcon} ${issue.title}`);
    report.push('');
    
    // Issue Metadata Table
    report.push('| Property | Value |');
    report.push('|----------|-------|');
    report.push(`| **Category** | ${categoryIcon} ${issue.category} |`);
    report.push(`| **Severity** | ${this.getSeverityBadge(issue.severity)} |`);
    report.push(`| **File Location** | \`${issue.file}:${issue.line}\` |`);
    report.push(`| **Detection Tool** | ${issue.tool} |`);
    report.push(`| **Analysis Agent** | ${issue.agent} |`);
    report.push(`| **Status** | ${this.getStatusBadge(issue.status)} |`);
    if (issue.inModifiedFile) {
      report.push(`| **In Modified File** | ✅ Yes |`);
    }
    report.push('');
    
    // Description
    report.push('**Description:**');
    report.push(`> ${issue.description}`);
    report.push('');
    
    // Impact
    if (issue.impact) {
      report.push('**Technical Impact:**');
      report.push(`> ${issue.impact}`);
      report.push('');
    }
    
    // Business Impact
    if (issue.businessImpact) {
      report.push('**Business Impact:**');
      report.push(`> ${issue.businessImpact}`);
      report.push('');
    }
    
    // Code Snippet
    if (options.includeCodeSnippets && issue.codeSnippet) {
      report.push('**📄 Code Snippet:**');
      report.push('```' + this.getLanguageHighlight(language));
      
      // Add line numbers to code snippet
      const lines = issue.codeSnippet.split('\n');
      const startLine = Math.max(1, issue.line - 3);
      
      for (let i = 0; i < lines.length; i++) {
        const lineNum = startLine + i;
        const isIssueLine = lineNum === issue.line;
        const prefix = isIssueLine ? '>>> ' : '    ';
        report.push(`${prefix}${lineNum.toString().padStart(4)}: ${lines[i]}`);
      }
      
      report.push('```');
      report.push('');
    }
    
    // Suggested Fix
    if (issue.suggestedFix || issue.suggestedCodeSnippet) {
      report.push('**✨ Recommended Fix:**');
      
      if (issue.suggestedFix) {
        report.push(`> ${issue.suggestedFix}`);
        report.push('');
      }
      
      if (issue.suggestedCodeSnippet) {
        report.push('**Fixed Code:**');
        report.push('```' + this.getLanguageHighlight(language));
        report.push(issue.suggestedCodeSnippet);
        report.push('```');
        report.push('');
      }
    }
    
    // Educational Resources for this specific issue
    if (options.includeEducationalResources) {
      const resources = await this.educationalResources.getEducationalResources(issue, language);
      if (resources.length > 0) {
        report.push('**📚 Learn More:**');
        for (const resource of resources.slice(0, 2)) {
          report.push(`- [${resource.title}](${resource.url})`);
        }
        report.push('');
      }
    }
    
    report.push('---');
    report.push('');
  }

  /**
   * Add business impact section
   */
  private async addBusinessImpactSection(report: string[], impact: BusinessImpact): Promise<void> {
    report.push(`**Executive Summary:** ${impact.summary}`);
    report.push('');
    
    report.push('### Risk Assessment');
    report.push(`- **Immediate Risk:** ${impact.immediateRisk}`);
    report.push(`- **Future Risk:** ${impact.futureRisk}`);
    report.push('');
    
    report.push('### Financial Analysis');
    report.push('| Metric | Value |');
    report.push('|--------|-------|');
    report.push(`| Fix Cost (Engineering Hours) | ${impact.financialImpact.fixCost} |`);
    report.push(`| Potential Loss if Exploited | ${impact.financialImpact.exploitCost} |`);
    report.push(`| ROI of Fixing Issues | ${impact.financialImpact.roi} |`);
    report.push('');
    
    report.push('### Risk Matrix by Category');
    report.push('| Category | Blocking Risk | Backlog Risk | Total Risk Score |');
    report.push('|----------|---------------|--------------|------------------|');
    
    for (const risk of impact.riskMatrix) {
      const icon = this.getRiskIcon(parseFloat(risk.score));
      report.push(`| ${risk.category} | ${risk.blockingRisk.toFixed(1)} | ${risk.backlogRisk.toFixed(1)} | ${icon} ${risk.score} |`);
    }
    report.push('');
  }

  /**
   * Add skill score section
   */
  private async addSkillScoreSection(report: string[], skillScore: SkillScore): Promise<void> {
    const level = this.scoringCalculator.getSkillLevel(skillScore.score);
    
    report.push(`**Developer:** ${skillScore.developer}`);
    report.push(`**Overall Skill Level:** ${level} (${skillScore.score.toFixed(0)}/100)`);
    report.push('');
    
    report.push('### Skill Categories');
    report.push('| Category | Score | Progress |');
    report.push('|----------|-------|----------|');
    report.push(`| Security | ${skillScore.categories.security}/100 | ${this.getProgressBar(skillScore.categories.security)} |`);
    report.push(`| Performance | ${skillScore.categories.performance}/100 | ${this.getProgressBar(skillScore.categories.performance)} |`);
    report.push(`| Architecture | ${skillScore.categories.architecture}/100 | ${this.getProgressBar(skillScore.categories.architecture)} |`);
    report.push(`| Dependencies | ${skillScore.categories.dependency}/100 | ${this.getProgressBar(skillScore.categories.dependency)} |`);
    report.push(`| Code Quality | ${skillScore.categories.quality}/100 | ${this.getProgressBar(skillScore.categories.quality)} |`);
    report.push('');
    
    if (skillScore.trend && skillScore.trend.length > 0) {
      report.push('### Recent Trend');
      report.push(`Last 5 PRs: ${skillScore.trend.map(s => s.toFixed(0)).join(' → ')} (${skillScore.trend[skillScore.trend.length - 1] > skillScore.trend[0] ? '📈 Improving' : '📉 Declining'})`);
      report.push('');
    }
    
    if (skillScore.recommendations.length > 0) {
      report.push('### Personalized Recommendations');
      for (const rec of skillScore.recommendations) {
        report.push(`- ${rec}`);
      }
      report.push('');
    }
  }

  // ============= HELPER METHODS =============

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

  private groupResourcesByType(resources: EducationalResource[]): Record<string, EducationalResource[]> {
    const grouped: Record<string, EducationalResource[]> = {};
    
    for (const resource of resources) {
      if (!grouped[resource.type]) {
        grouped[resource.type] = [];
      }
      grouped[resource.type].push(resource);
    }
    
    return grouped;
  }

  private getCategoryIcon(category: IssueCategory): string {
    const icons: Record<IssueCategory, string> = {
      'Security': '🔒',
      'Performance': '⚡',
      'Architecture': '🏗️',
      'Dependency': '📦',
      'Quality': '✨'
    };
    return icons[category] || '📌';
  }

  private getSeverityIcon(severity: IssueSeverity): string {
    const icons: Record<IssueSeverity, string> = {
      'critical': '🔴',
      'high': '🟠',
      'medium': '🟡',
      'low': '🟢'
    };
    return icons[severity] || '⚪';
  }

  private getSeverityBadge(severity: IssueSeverity): string {
    const badges: Record<IssueSeverity, string> = {
      'critical': '🔴 **CRITICAL**',
      'high': '🟠 **HIGH**',
      'medium': '🟡 **MEDIUM**',
      'low': '🟢 **LOW**'
    };
    return badges[severity] || severity;
  }

  private getStatusBadge(status: string): string {
    switch (status) {
      case 'new': return '🆕 New';
      case 'existing': return '📌 Existing';
      case 'resolved': return '✅ Resolved';
      default: return status;
    }
  }

  private getRiskIcon(score: number): string {
    if (score >= 8) return '🔴';
    if (score >= 5) return '🟠';
    if (score >= 3) return '🟡';
    return '🟢';
  }

  private getResourceTypeIcon(type: string): string {
    switch (type) {
      case 'documentation': return '📖';
      case 'tutorial': return '🎓';
      case 'example': return '💡';
      case 'video': return '🎥';
      default: return '📚';
    }
  }

  private getProgressBar(score: number): string {
    const filled = Math.floor(score / 10);
    const empty = 10 - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  }

  private getLanguageHighlight(language: string): string {
    const highlights: Record<string, string> = {
      'Java': 'java',
      'Rust': 'rust',
      'Python': 'python',
      'JavaScript': 'javascript',
      'TypeScript': 'typescript',
      'Go': 'go',
      'C++': 'cpp',
      'C#': 'csharp',
      'Ruby': 'ruby',
      'PHP': 'php'
    };
    return highlights[language] || language.toLowerCase();
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}