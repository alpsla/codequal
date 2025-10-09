/**
 * V9 Full Report Formatter
 * 
 * Generates comprehensive V9 reports with all 17+ sections from the original template.
 * This is the COMPLETE report format, while v9-grouped-report-formatter provides
 * the compact version.
 * 
 * Based on: v9-live-report-1758309398137.md
 * 
 * Sections:
 * 1. Repository Information
 * 2. Executive Summary
 * 3. PR Decision
 * 4. Quality Score
 * 5. Issue Summary Statistics
 * 6. Blocking Issues
 * 7. Detailed Issues Analysis (Critical/High/Medium/Low)
 * 8. Resolved Issues
 * 9. Issue Distribution Analysis
 * 10. Phased Educational Plan
 * 11. Business Impact Analysis
 * 12. Individual Skills Tracking
 * 13. Team Skills Tracking
 * 14. Analysis Metadata
 * 15. Recommended Actions
 * 16. PR Comment Template
 * 17. Resolution Metrics
 */

import * as fs from 'fs';
import * as path from 'path';

// Re-use types from grouped report formatter
export interface EnrichedIssue {
  file: string;
  line?: number;
  column?: number;
  rule: string;
  tool: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  category: string;
  snippet?: string;
  fixSuggestion?: {
    fix: string;
    correctedCode: string;
    explanation: string;
    bestPractices?: string[];
  };
  educationalLinks?: string[];
}

export interface V9FullReportMetadata {
  // Repository info
  repository: string;
  repositoryUrl: string;
  prNumber: number;
  prTitle: string;
  prAuthor: string;
  prAuthorEmail?: string;
  organization?: string;
  sourceBranch: string;
  targetBranch: string;
  
  // Analysis info
  analysisDate: Date;
  repositorySize: number; // total files
  totalLines?: number;
  analyzerVersion: string;
  
  // PR stats
  filesModified: number;
  linesAdded: number;
  linesDeleted: number;
  
  // Analysis results
  decision: 'APPROVED' | 'DECLINED';
  confidence: number; // 0-100
  qualityScore: number; // 0-100
  immediateRisk: 'low' | 'moderate' | 'high' | 'critical';
  
  // Timing
  cloneTime: number;
  analysisTime: number;
  reportTime: number;
  totalTime: number;
  
  // Analysis type
  analysisType: 'full' | 'smart-selection';
  filesAnalyzed: number;
  coverage: number; // percentage
}

export class V9FullReportFormatter {
  
  /**
   * Generate complete V9 report with all sections
   */
  async generateFullReport(
    issues: EnrichedIssue[],
    metadata: V9FullReportMetadata
  ): Promise<string> {
    const sections: string[] = [];
    
    // 1. Header
    sections.push(this.generateHeader(metadata));
    sections.push('');
    
    // 2. Repository Information
    sections.push(this.generateRepositoryInfo(metadata));
    sections.push('');
    
    // 3. Executive Summary
    sections.push(this.generateExecutiveSummary(issues, metadata));
    sections.push('');
    
    // 4. PR Decision
    sections.push(this.generatePRDecision(issues, metadata));
    sections.push('');
    
    // 5. Quality Score
    sections.push(this.generateQualityScore(metadata));
    sections.push('');
    
    // 6. Issue Summary Statistics
    sections.push(this.generateIssueSummaryStatistics(issues));
    sections.push('');
    
    // 7. Blocking Issues
    const blockingIssues = this.getBlockingIssues(issues);
    if (blockingIssues.length > 0) {
      sections.push(this.generateBlockingIssues(blockingIssues));
      sections.push('');
    }
    
    // 8. Detailed Issues Analysis
    sections.push(this.generateDetailedIssuesAnalysis(issues));
    sections.push('');
    
    // 9. Resolved Issues
    const resolvedIssues = issues.filter(i => i.category === 'RESOLVED');
    if (resolvedIssues.length > 0) {
      sections.push(this.generateResolvedIssues(resolvedIssues));
      sections.push('');
    }
    
    // 10. Issue Distribution Analysis
    sections.push(this.generateIssueDistribution(issues));
    sections.push('');
    
    // 11. Phased Educational Plan
    sections.push(this.generateEducationalPlan(issues));
    sections.push('');
    
    // 12. Business Impact Analysis
    sections.push(this.generateBusinessImpact(issues, metadata));
    sections.push('');
    
    // 13. Individual Skills Tracking
    sections.push(this.generateIndividualSkills(metadata));
    sections.push('');
    
    // 14. Team Skills Tracking
    sections.push(this.generateTeamSkills());
    sections.push('');
    
    // 15. Analysis Metadata
    sections.push(this.generateAnalysisMetadata(metadata));
    sections.push('');
    
    // 16. Recommended Actions
    sections.push(this.generateRecommendedActions(issues, metadata));
    sections.push('');
    
    // 17. PR Comment Template
    sections.push(this.generatePRCommentTemplate(issues, metadata));
    sections.push('');
    
    // 18. Resolution Metrics (if any resolved issues)
    if (resolvedIssues.length > 0) {
      sections.push(this.generateResolutionMetrics(resolvedIssues));
      sections.push('');
    }
    
    // 19. Footer
    sections.push(this.generateFooter(metadata));
    
    return sections.join('\n');
  }
  
  // ================================================================
  // Section Generators (keeping as placeholders for now - will implement one by one)
  // ================================================================
  
  private generateHeader(metadata: V9FullReportMetadata): string {
    return `# 🔍 V9 Code Quality Analysis Report`;
  }
  
  private generateRepositoryInfo(metadata: V9FullReportMetadata): string {
    return `## Repository Information

**Repository:** [${metadata.repository}](${metadata.repositoryUrl})
**Pull Request:** #${metadata.prNumber} - ${metadata.prTitle}
**Author:** ${metadata.prAuthor}${metadata.prAuthorEmail ? ` (${metadata.prAuthorEmail})` : ''}
${metadata.organization ? `**Organization:** ${metadata.organization}\n` : ''}**Source Branch:** ${metadata.sourceBranch}
**Target Branch:** ${metadata.targetBranch}
**Analysis Date:** ${metadata.analysisDate.toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' })}
**Repository Size:** ${metadata.repositorySize.toLocaleString()} files
**Analyzer Version:** ${metadata.analyzerVersion}`;
  }
  
  private generateExecutiveSummary(issues: EnrichedIssue[], metadata: V9FullReportMetadata): string {
    const byCategory = this.groupByCategory(issues);
    const grade = this.calculateGrade(metadata.qualityScore);
    
    return `## Executive Summary

**Repository Size:** ${metadata.repositorySize.toLocaleString()} files${metadata.totalLines ? ` | ${metadata.totalLines.toLocaleString()} lines` : ''}
**Analysis Duration:** ${Math.round(metadata.totalTime / 60)}m ${metadata.totalTime % 60}s
**Analysis Type:** ${metadata.analysisType === 'full' ? 'Full Coverage' : 'Smart Selection'}
**Files Analyzed:** ${metadata.filesAnalyzed.toLocaleString()} (${metadata.coverage.toFixed(1)}% coverage)

**PR Impact:**
- Files Modified: ${metadata.filesModified}
- Lines Added: +${metadata.linesAdded}
- Lines Deleted: -${metadata.linesDeleted}
- Net Change: ${metadata.linesAdded - metadata.linesDeleted > 0 ? '+' : ''}${metadata.linesAdded - metadata.linesDeleted} lines

**Quality Assessment:**
- Score: ${metadata.qualityScore}/100 (${grade})
- Decision: ${metadata.decision === 'APPROVED' ? '✅ APPROVED' : '❌ REQUIRES CHANGES'}
- New Issues: ${byCategory.NEW} (${this.getBlockingIssues(issues).length} blocking)
- Confidence: ${metadata.confidence}%
- Immediate Risk: ${this.riskIcon(metadata.immediateRisk)} ${metadata.immediateRisk.toUpperCase()}`;
  }
  
  private generatePRDecision(issues: EnrichedIssue[], metadata: V9FullReportMetadata): string {
    const icon = metadata.decision === 'APPROVED' ? '✅' : '❌';
    const blockingCount = this.getBlockingIssues(issues).length;
    
    return `## PR Decision

### ${icon} ${metadata.decision}

**Confidence Level:** ${metadata.confidence}%

**Reasoning:**
> ${blockingCount > 0 ? `Critical issues detected that must be resolved` : 'All quality checks passed'}`;
  }
  
  private generateQualityScore(metadata: V9FullReportMetadata): string {
    const grade = this.calculateGrade(metadata.qualityScore);
    const icon = metadata.qualityScore >= 90 ? '🎉' : metadata.qualityScore >= 70 ? '👍' : '⚠️';
    
    return `## Quality Score

${icon} **${metadata.qualityScore}/100** (Grade: **${grade}**)

**Score Calculation:**
- Base Score: 100.0 (starting point)
- Deductions: See detailed breakdown below
- **Final Score: ${metadata.qualityScore}**

*Note: Score calculation will be detailed in future versions*`;
  }
  
  private generateIssueSummaryStatistics(issues: EnrichedIssue[]): string {
    const byCategory = this.groupByCategory(issues);
    const bySeverity = this.groupBySeverity(issues);
    const byTool = this.groupByTool(issues);
    
    const blockingNew = issues.filter(i => i.category === 'NEW' && (i.severity === 'critical' || i.severity === 'high')).length;
    const blockingModified = issues.filter(i => i.category === 'EXISTING_MODIFIED' && (i.severity === 'critical' || i.severity === 'high')).length;
    
    return `## Issue Summary Statistics

### Total Issues Found
| Type | Count | Blocking |
|------|-------|----------|
| 🆕 New Issues | ${byCategory.NEW} | ${blockingNew} |
| 📝 Existing Issues (Modified) | ${byCategory.EXISTING_MODIFIED} | ${blockingModified} |
| ✅ Resolved Issues | ${byCategory.RESOLVED} | - |
| 📋 Existing Issues (Rest) | ${byCategory.EXISTING_REST} | - |
| **Total Active** | **${byCategory.NEW + byCategory.EXISTING_MODIFIED + byCategory.EXISTING_REST}** | **${blockingNew + blockingModified}** |

### Issues by Severity
| Severity | Count | New | Existing (Modified) | Existing (Rest) | Resolved |
|----------|-------|-----|---------------------|-----------------|----------|
| 🔴 Critical | ${bySeverity.critical} | ${issues.filter(i => i.severity === 'critical' && i.category === 'NEW').length} | ${issues.filter(i => i.severity === 'critical' && i.category === 'EXISTING_MODIFIED').length} | ${issues.filter(i => i.severity === 'critical' && i.category === 'EXISTING_REST').length} | ${issues.filter(i => i.severity === 'critical' && i.category === 'RESOLVED').length} |
| 🟠 High | ${bySeverity.high} | ${issues.filter(i => i.severity === 'high' && i.category === 'NEW').length} | ${issues.filter(i => i.severity === 'high' && i.category === 'EXISTING_MODIFIED').length} | ${issues.filter(i => i.severity === 'high' && i.category === 'EXISTING_REST').length} | ${issues.filter(i => i.severity === 'high' && i.category === 'RESOLVED').length} |
| 🟡 Medium | ${bySeverity.medium} | ${issues.filter(i => i.severity === 'medium' && i.category === 'NEW').length} | ${issues.filter(i => i.severity === 'medium' && i.category === 'EXISTING_MODIFIED').length} | ${issues.filter(i => i.severity === 'medium' && i.category === 'EXISTING_REST').length} | ${issues.filter(i => i.severity === 'medium' && i.category === 'RESOLVED').length} |
| 🟢 Low | ${bySeverity.low} | ${issues.filter(i => i.severity === 'low' && i.category === 'NEW').length} | ${issues.filter(i => i.severity === 'low' && i.category === 'EXISTING_MODIFIED').length} | ${issues.filter(i => i.severity === 'low' && i.category === 'EXISTING_REST').length} | ${issues.filter(i => i.severity === 'low' && i.category === 'RESOLVED').length} |

### Issues by Tool
| Tool | Count | Percentage |
|------|-------|------------|
${Object.entries(byTool).map(([tool, count]) => `| ${tool} | ${count} | ${((count / issues.length) * 100).toFixed(1)}% |`).join('\n')}`;
  }
  
  private generateBlockingIssues(blockingIssues: EnrichedIssue[]): string {
    return `## Blocking Issues

⛔ **${blockingIssues.length} issue(s) must be resolved before merge:**

${blockingIssues.slice(0, 10).map((issue, idx) => {
  const severityLabel = issue.severity === 'critical' ? 'CRITICAL' : 'HIGH';
  return `${idx + 1}. **${issue.rule}** (${severityLabel})
   - File: \`${issue.file}:${issue.line}\`
   - ${issue.message}`;
}).join('\n\n')}

${blockingIssues.length > 10 ? `\n*...and ${blockingIssues.length - 10} more blocking issues*` : ''}`;
  }
  
  private generateDetailedIssuesAnalysis(issues: EnrichedIssue[]): string {
    return `## Detailed Issues Analysis

*Placeholder: Will be implemented with grouped issue sections*
*For detailed analysis, see grouped report format*`;
  }
  
  private generateResolvedIssues(resolvedIssues: EnrichedIssue[]): string {
    return `## Resolved Issues

✅ **${resolvedIssues.length} issue(s) fixed by this PR:**

${resolvedIssues.slice(0, 5).map((issue, idx) => {
  return `${idx + 1}. **${issue.rule}** (${issue.severity.toUpperCase()})
   - File: \`${issue.file}:${issue.line}\`
   - ${issue.message}`;
}).join('\n\n')}

${resolvedIssues.length > 5 ? `\n*...and ${resolvedIssues.length - 5} more resolved issues*` : ''}`;
  }
  
  private generateIssueDistribution(issues: EnrichedIssue[]): string {
    return `## Issue Distribution Analysis

*Placeholder: Charts and visualizations to be added*`;
  }
  
  private generateEducationalPlan(issues: EnrichedIssue[]): string {
    // Generate high-level learning roadmap based on issue patterns
    // NOT repeating the educational resources from each issue
    
    const bySeverity = this.groupBySeverity(issues);
    const hasSecurityIssues = issues.some(i => i.tool === 'semgrep' || i.rule.toLowerCase().includes('security'));
    const hasPerformanceIssues = issues.some(i => i.rule.toLowerCase().includes('performance'));
    const hasQualityIssues = bySeverity.medium + bySeverity.low > 0;
    
    return `## Learning Roadmap

Based on the issues found, here's a suggested learning path:

**Month 1: Critical Foundations**
${bySeverity.critical > 0 ? '- Address critical issues first (see detailed analysis above for specific resources)' : '- ✅ No critical issues - well done!'}
${hasSecurityIssues ? '- Focus on security best practices (see security issue sections)' : ''}

**Month 2: Quality Improvements**
${hasQualityIssues ? '- Review code quality issues and apply best practices (see issue details)' : '- ✅ Code quality is solid'}
${hasPerformanceIssues ? '- Study performance optimization techniques (see performance issues)' : ''}

**Ongoing: Continuous Learning**
- Review issue-specific educational resources provided with each finding
- Implement learned patterns in future PRs
- Share knowledge with team

*Note: Detailed educational resources are provided with each issue above*`;
  }
  
  private generateBusinessImpact(issues: EnrichedIssue[], metadata: V9FullReportMetadata): string {
    return `## Business Impact Analysis

*Placeholder: Financial and risk analysis*`;
  }
  
  private generateIndividualSkills(metadata: V9FullReportMetadata): string {
    return `## Individual Skills Tracking

*Placeholder: Developer skill assessment*`;
  }
  
  private generateTeamSkills(): string {
    return `## Team Skills Tracking

*Placeholder: Team analytics dashboard*`;
  }
  
  private generateAnalysisMetadata(metadata: V9FullReportMetadata): string {
    return `## Analysis Metadata

### Performance Metrics
| Metric | Value |
|--------|-------|
| Repository Clone | ${metadata.cloneTime}s |
| Code Analysis | ${metadata.analysisTime}s |
| Report Generation | ${metadata.reportTime}s |
| **Total Duration** | **${metadata.totalTime}s** |

### Analysis Coverage
| Metric | Value |
|--------|-------|
| Total Repository Files | ${metadata.repositorySize.toLocaleString()} |
| Files Analyzed | ${metadata.filesAnalyzed.toLocaleString()} |
| Coverage | ${metadata.coverage.toFixed(1)}% |
| Analysis Type | ${metadata.analysisType === 'full' ? 'Full Coverage' : 'Smart Selection'} |`;
  }
  
  private generateRecommendedActions(issues: EnrichedIssue[], metadata: V9FullReportMetadata): string {
    return `## Recommended Actions

*Placeholder: Prioritized action items*`;
  }
  
  private generatePRCommentTemplate(issues: EnrichedIssue[], metadata: V9FullReportMetadata): string {
    const icon = metadata.decision === 'APPROVED' ? '✅' : '❌';
    const blockingCount = this.getBlockingIssues(issues).length;
    
    return `## PR Comment Template

### ${icon} Code Quality Analysis: ${metadata.decision}

@${metadata.prAuthor} - Your PR has been analyzed by CodeQual.

**Score:** ${metadata.qualityScore}/100
**Decision:** ${metadata.decision}
${blockingCount > 0 ? `**Blocking Issues:** ${blockingCount} must be resolved\n` : ''}
**View Full Report:** [Link to report]

${blockingCount > 0 ? `**Action Required:** Please address the blocking issues before this PR can be merged.` : `**Great work!** All quality checks passed.`}`;
  }
  
  private generateResolutionMetrics(resolvedIssues: EnrichedIssue[]): string {
    return `## Resolution Metrics

✅ **${resolvedIssues.length} issues resolved** in this PR

*Placeholder: Resolution trends and statistics*`;
  }
  
  private generateFooter(metadata: V9FullReportMetadata): string {
    return `---

**Report Generated:** ${new Date().toISOString()}
**Analyzer Version:** ${metadata.analyzerVersion}
**Analysis Engine:** V9 Full Report Format

*CodeQual - Intelligent Code Review Automation*`;
  }
  
  // ================================================================
  // Helper Methods
  // ================================================================
  
  private getBlockingIssues(issues: EnrichedIssue[]): EnrichedIssue[] {
    return issues.filter(i => 
      (i.category === 'NEW' || i.category === 'EXISTING_MODIFIED') &&
      (i.severity === 'critical' || i.severity === 'high')
    );
  }
  
  private groupByCategory(issues: EnrichedIssue[]): Record<string, number> {
    const result: Record<string, number> = {
      'NEW': 0,
      'EXISTING_MODIFIED': 0,
      'RESOLVED': 0,
      'EXISTING_REST': 0
    };
    issues.forEach(issue => {
      const cat = issue.category || 'unknown';
      result[cat] = (result[cat] || 0) + 1;
    });
    return result;
  }
  
  private groupBySeverity(issues: EnrichedIssue[]): Record<string, number> {
    return {
      critical: issues.filter(i => i.severity === 'critical').length,
      high: issues.filter(i => i.severity === 'high').length,
      medium: issues.filter(i => i.severity === 'medium').length,
      low: issues.filter(i => i.severity === 'low').length
    };
  }
  
  private groupByTool(issues: EnrichedIssue[]): Record<string, number> {
    const result: Record<string, number> = {};
    issues.forEach(issue => {
      result[issue.tool] = (result[issue.tool] || 0) + 1;
    });
    return result;
  }
  
  private calculateGrade(score: number): string {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }
  
  private riskIcon(risk: string): string {
    switch (risk) {
      case 'critical': return '🔴';
      case 'high': return '🟠';
      case 'moderate': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  }
}

