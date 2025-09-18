/**
 * V9 Report Formatter - All Sections Implementation
 * 
 * This formatter generates reports with ALL 21 sections required by the V9 template
 */

import {
  AnalysisResult,
  Issue,
  IssueCategory,
  IssueSeverity,
  BusinessImpact,
  SkillScore,
  EducationalResource
} from './v9-types';
import { V9_DEFAULT_CONFIG } from '../templates/v9-template-config';

export interface CompleteMetadata {
  // Repository Information
  repository: string;
  repoUrl: string;
  prNumber: number;
  prTitle: string;
  branch: string;
  baseBranch: string;
  
  // Author Information
  prAuthor: string;
  prAuthorEmail: string;
  repoOwner: string;
  organizationName: string;
  
  // Code Statistics
  totalLinesOfCode: number;
  linesAdded: number;
  linesDeleted: number;
  linesModified: number;
  filesModified: number;
  totalFiles: number;
  languageBreakdown: Record<string, number>;
  
  // Performance Metrics
  totalDuration: number;
  cloneTime: number;
  analysisTime: number;
  reportGenerationTime: number;
  
  // Agent Performance
  agentsUsed: Array<{
    agentName: string;
    executionTime: number;
    issuesFound: number;
    filesAnalyzed: number;
    tokensUsed: number;
    modelUsed: {
      provider: string;
      model: string;
      temperature: number;
    };
    cost: number;
    status: string;
  }>;
  
  // Tool Performance
  toolsUsed: Array<{
    toolName: string;
    executionTime: number;
    filesScanned: number;
    issuesFound: number;
    exitCode: number;
    stdout: string;
    stderr: string;
  }>;
  
  // Cost Analysis
  totalCost: number;
  costBreakdown: {
    aiModels: number;
    infrastructure: number;
    tools: number;
  };
  estimatedMonthlyCost: number;
  
  // Analysis Configuration
  analyzer: string;
  analyzerVersion: string;
  smartFileSelection: boolean;
  maxFilesAnalyzed: number;
  
  // Timestamps
  startTime: string;
  endTime: string;
  timestamp: string;
}

export class V9ReportFormatterAllSections {
  async generateCompleteReport(
    result: AnalysisResult,
    metadata: CompleteMetadata,
    language: string,
    options?: any
  ): Promise<string> {
    const sections: string[] = [];
    
    // 1. Header (required)
    sections.push(this.generateHeader(metadata));
    
    // 2. Decision (required)
    sections.push(this.generateDecision(result));
    
    // 3. Overall Score (required)
    sections.push(this.generateOverallScore(result));
    
    // 4. Blocking Issues (required)
    sections.push(this.generateBlockingIssues(result));
    
    // 5-12. Issue categories by severity and type (optional, only if issues exist)
    const criticalNew = result.newIssues.filter(i => i.severity === 'critical');
    const criticalExistingModified = result.existingIssues.filter(i => i.severity === 'critical' && i.inModifiedFile);
    const criticalExistingUnmodified = result.existingIssues.filter(i => i.severity === 'critical' && !i.inModifiedFile);
    const highNew = result.newIssues.filter(i => i.severity === 'high');
    const highExistingModified = result.existingIssues.filter(i => i.severity === 'high' && i.inModifiedFile);
    const highExistingUnmodified = result.existingIssues.filter(i => i.severity === 'high' && !i.inModifiedFile);
    const mediumIssues = [...result.newIssues, ...result.existingIssues].filter(i => i.severity === 'medium');
    const lowIssues = [...result.newIssues, ...result.existingIssues].filter(i => i.severity === 'low');
    
    if (criticalNew.length > 0) {
      sections.push(this.generateIssueSection('Critical Issues - NEW', criticalNew, '🔴'));
    }
    if (criticalExistingModified.length > 0) {
      sections.push(this.generateIssueSection('Critical Issues - EXISTING IN MODIFIED', criticalExistingModified, '🔴'));
    }
    if (criticalExistingUnmodified.length > 0) {
      sections.push(this.generateIssueSection('Critical Issues - EXISTING IN UNMODIFIED', criticalExistingUnmodified, '🔴'));
    }
    if (highNew.length > 0) {
      sections.push(this.generateIssueSection('High Priority Issues - NEW', highNew, '🟠'));
    }
    if (highExistingModified.length > 0) {
      sections.push(this.generateIssueSection('High Priority Issues - EXISTING IN MODIFIED', highExistingModified, '🟠'));
    }
    if (highExistingUnmodified.length > 0) {
      sections.push(this.generateIssueSection('High Priority Issues - EXISTING IN UNMODIFIED', highExistingUnmodified, '🟠'));
    }
    if (mediumIssues.length > 0) {
      sections.push(this.generateIssueSection('Medium Priority Issues', mediumIssues, '🟡'));
    }
    if (lowIssues.length > 0) {
      sections.push(this.generateIssueSection('Low Priority Issues', lowIssues, '🟢'));
    }
    
    // 13. Resolved Issues (required)
    sections.push(this.generateResolvedIssues(result));
    
    // 14. Issue Distribution Analysis (required)
    sections.push(this.generateIssueDistribution(result));
    
    // 15. Educational Insights (required)
    sections.push(this.generateEducationalInsights(result));
    
    // 16. Business Impact Analysis (required)
    sections.push(this.generateBusinessImpact(result));
    
    // 17. Individual & Team Skills Tracking (required)
    sections.push(this.generateSkillsTracking(result));
    
    // 18. Analysis Metadata (required)
    sections.push(this.generateAnalysisMetadata(metadata));
    
    // 19. Recommended Actions (required)
    sections.push(this.generateRecommendedActions(result));
    
    // 20. PR Comment (required)
    sections.push(this.generatePRComment(result, metadata));
    
    // 21. Resolution Metrics (required)
    sections.push(this.generateResolutionMetrics(result));
    
    // Footer
    sections.push(this.generateFooter(metadata));
    
    return sections.join('\n\n');
  }
  
  private generateHeader(metadata: CompleteMetadata): string {
    return `# 🔍 V9 Code Quality Analysis Report

## Header

**Repository:** [${metadata.repository}](${metadata.repoUrl})  
**Pull Request:** #${metadata.prNumber} - ${metadata.prTitle}  
**Author:** ${metadata.prAuthor} (${metadata.prAuthorEmail})  
**Organization:** ${metadata.organizationName}  
**Source Branch:** ${metadata.branch}  
**Target Branch:** ${metadata.baseBranch}  
**Analysis Date:** ${metadata.timestamp}  
**Analyzer Version:** ${metadata.analyzerVersion}`;
  }
  
  private generateDecision(result: AnalysisResult): string {
    const emoji = result.decision === 'approved' ? '✅' : '❌';
    const text = result.decision === 'approved' ? 'APPROVED' : 'REJECTED';
    
    return `## Decision

${emoji} **${text}**

**Confidence Level:** ${(result.confidence * 100).toFixed(0)}%

**Reasoning:**
> ${result.reason}`;
  }
  
  private generateOverallScore(result: AnalysisResult): string {
    const scoreEmoji = result.qualityScore >= 90 ? '🏆' : result.qualityScore >= 80 ? '✨' : result.qualityScore >= 70 ? '👍' : result.qualityScore >= 60 ? '⚠️' : '❌';
    
    return `## Overall Score

${scoreEmoji} **Quality Score:** ${result.qualityScore.toFixed(1)}/100

**Grade:** ${result.grade}

**Score Breakdown:**
- Base Score: 100.0
- New Issues Impact: -${this.calculateImpact(result.newIssues)}
- Existing Issues Impact: -${this.calculateImpact(result.existingIssues)}
- Resolved Issues Bonus: +${result.resolvedIssues.length * 2}
- **Final Score:** ${result.qualityScore.toFixed(1)}`;
  }
  
  private generateBlockingIssues(result: AnalysisResult): string {
    const blockingIssues = result.newIssues.filter(i => 
      i.severity === 'critical' || i.severity === 'high'
    );
    
    if (blockingIssues.length === 0) {
      return `## Blocking Issues

✅ **No blocking issues found!**

All critical and high severity issues have been resolved.`;
    }
    
    let content = `## Blocking Issues

⛔ **${blockingIssues.length} blocking issue(s) must be resolved before merge:**

`;
    
    blockingIssues.forEach((issue, index) => {
      content += `### ${index + 1}. ${issue.title}
- **File:** \`${issue.file}:${issue.line}\`
- **Severity:** ${issue.severity.toUpperCase()}
- **Tool:** ${issue.tool}
- **Impact:** ${issue.businessImpact}

`;
    });
    
    return content;
  }
  
  private generateIssueSection(title: string, issues: Issue[], emoji: string): string {
    let content = `## ${title}

${emoji} **${issues.length} issue(s) found**

`;
    
    issues.forEach((issue, index) => {
      content += `### ${index + 1}. ${issue.title}
- **ID:** ${issue.id}
- **File:** \`${issue.file}:${issue.line}\`
- **Tool:** ${issue.tool}
- **Agent:** ${issue.agent}

**Description:**
${issue.description}

**Impact:**
${issue.impact}

**Suggested Fix:**
${issue.suggestedFix}

`;
      
      if (issue.codeSnippet) {
        content += `**Current Code:**
\`\`\`${this.getLanguageFromFile(issue.file)}
${issue.codeSnippet}
\`\`\`

`;
      }
      
      if (issue.suggestedCodeSnippet) {
        content += `**Suggested Code:**
\`\`\`${this.getLanguageFromFile(issue.file)}
${issue.suggestedCodeSnippet}
\`\`\`

`;
      }
    });
    
    return content;
  }
  
  private generateResolvedIssues(result: AnalysisResult): string {
    if (result.resolvedIssues.length === 0) {
      return `## Resolved Issues

ℹ️ No issues were resolved in this PR.`;
    }
    
    let content = `## Resolved Issues

✅ **${result.resolvedIssues.length} issue(s) resolved in this PR:**

`;
    
    result.resolvedIssues.forEach((issue, index) => {
      content += `${index + 1}. **${issue.title}** (${issue.severity})
   - File: \`${issue.file}:${issue.line}\`
   - ${issue.description}
`;
    });
    
    return content;
  }
  
  private generateIssueDistribution(result: AnalysisResult): string {
    const allIssues = [...result.newIssues, ...result.existingIssues];
    const bySeverity = this.groupBySeverity(allIssues);
    const byCategory = this.groupByCategory(allIssues);
    
    return `## Issue Distribution Analysis

### By Severity
| Severity | Count | Percentage |
|----------|-------|------------|
| Critical | ${bySeverity.critical} | ${((bySeverity.critical / allIssues.length) * 100).toFixed(1)}% |
| High | ${bySeverity.high} | ${((bySeverity.high / allIssues.length) * 100).toFixed(1)}% |
| Medium | ${bySeverity.medium} | ${((bySeverity.medium / allIssues.length) * 100).toFixed(1)}% |
| Low | ${bySeverity.low} | ${((bySeverity.low / allIssues.length) * 100).toFixed(1)}% |

### By Category
| Category | Count | Percentage |
|----------|-------|------------|
| Security | ${byCategory.Security} | ${((byCategory.Security / allIssues.length) * 100).toFixed(1)}% |
| Performance | ${byCategory.Performance} | ${((byCategory.Performance / allIssues.length) * 100).toFixed(1)}% |
| Quality | ${byCategory.Quality} | ${((byCategory.Quality / allIssues.length) * 100).toFixed(1)}% |
| Architecture | ${byCategory.Architecture} | ${((byCategory.Architecture / allIssues.length) * 100).toFixed(1)}% |
| Dependency | ${byCategory.Dependency} | ${((byCategory.Dependency / allIssues.length) * 100).toFixed(1)}% |

### Issue State Distribution
| State | Count |
|-------|-------|
| New Issues (This PR) | ${result.newIssues.length} |
| Existing in Modified Files | ${result.existingIssues.filter(i => i.inModifiedFile).length} |
| Existing in Unmodified Files | ${result.existingIssues.filter(i => !i.inModifiedFile).length} |
| Resolved Issues | ${result.resolvedIssues.length} |`;
  }
  
  private generateEducationalInsights(result: AnalysisResult): string {
    if (!result.educationalResources || result.educationalResources.length === 0) {
      return `## Educational Insights

📚 No specific educational resources identified for this PR.`;
    }
    
    let content = `## Educational Insights

📚 **Recommended Learning Resources**

Based on the issues found, here are educational resources to improve your skills:

`;
    
    result.educationalResources.forEach((resource, index) => {
      content += `### ${index + 1}. ${resource.title}
- **Type:** ${resource.type}
- **Description:** ${resource.description}
- **Link:** [View Resource](${resource.url})

`;
    });
    
    return content;
  }
  
  private generateBusinessImpact(result: AnalysisResult): string {
    const impact = result.businessImpact;
    
    return `## Business Impact Analysis

### Executive Summary
${impact.summary}

### Risk Assessment
- **Immediate Risk:** ${impact.immediateRisk}
- **Future Risk:** ${impact.futureRisk}

### Financial Impact
- **Fix Cost:** ${impact.financialImpact.fixCost}
- **Potential Exploit Cost:** ${impact.financialImpact.exploitCost}
- **ROI of Fixing:** ${impact.financialImpact.roi}

### Risk Matrix by Category
| Category | Blocking Risk | Backlog Risk | Overall Score |
|----------|---------------|--------------|---------------|
${impact.riskMatrix.map(r => `| ${r.category} | ${r.blockingRisk} | ${r.backlogRisk} | ${r.score} |`).join('\n')}`;
  }
  
  private generateSkillsTracking(result: AnalysisResult): string {
    const skills = result.skillScore;
    
    return `## Individual & Team Skills Tracking

### Developer: ${skills.developer}

**Overall Skill Score:** ${skills.score.toFixed(1)}/100

**Score Trend:** ${skills.trend.map(s => s.toFixed(1)).join(' → ')}

### Skills by Category
| Category | Score | Status |
|----------|-------|--------|
| Security | ${skills.categories.security} | ${this.getSkillStatus(skills.categories.security)} |
| Performance | ${skills.categories.performance} | ${this.getSkillStatus(skills.categories.performance)} |
| Quality | ${skills.categories.quality} | ${this.getSkillStatus(skills.categories.quality)} |
| Architecture | ${skills.categories.architecture} | ${this.getSkillStatus(skills.categories.architecture)} |
| Dependency | ${skills.categories.dependency} | ${this.getSkillStatus(skills.categories.dependency)} |

### Recommendations for Improvement
${skills.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}`;
  }
  
  private generateAnalysisMetadata(metadata: CompleteMetadata): string {
    return `## Analysis Metadata

### Performance Metrics
| Metric | Value |
|--------|-------|
| Total Duration | ${(metadata.totalDuration / 1000).toFixed(1)}s |
| Clone Time | ${(metadata.cloneTime / 1000).toFixed(1)}s |
| Analysis Time | ${(metadata.analysisTime / 1000).toFixed(1)}s |
| Report Generation | ${(metadata.reportGenerationTime / 1000).toFixed(1)}s |

### Code Statistics
| Metric | Value |
|--------|-------|
| Total Lines of Code | ${metadata.totalLinesOfCode.toLocaleString()} |
| Lines Added | +${metadata.linesAdded} |
| Lines Deleted | -${metadata.linesDeleted} |
| Lines Modified | ±${metadata.linesModified} |
| Files Modified | ${metadata.filesModified} |
| Total Files | ${metadata.totalFiles.toLocaleString()} |

### Agent Performance
| Agent | Time | Issues | Files | Cost |
|-------|------|--------|-------|------|
${metadata.agentsUsed.map(a => `| ${a.agentName} | ${(a.executionTime / 1000).toFixed(1)}s | ${a.issuesFound} | ${a.filesAnalyzed} | $${a.cost.toFixed(4)} |`).join('\n')}

### Tool Performance
| Tool | Time | Files | Issues |
|------|------|-------|--------|
${metadata.toolsUsed.map(t => `| ${t.toolName} | ${(t.executionTime / 1000).toFixed(1)}s | ${t.filesScanned} | ${t.issuesFound} |`).join('\n')}

### Cost Analysis
- **Total Cost:** $${metadata.totalCost.toFixed(4)}
- **AI Models:** $${metadata.costBreakdown.aiModels.toFixed(4)}
- **Infrastructure:** $${metadata.costBreakdown.infrastructure.toFixed(4)}
- **Estimated Monthly:** $${metadata.estimatedMonthlyCost.toFixed(2)}`;
  }
  
  private generateRecommendedActions(result: AnalysisResult): string {
    const critical = result.newIssues.filter(i => i.severity === 'critical');
    const high = result.newIssues.filter(i => i.severity === 'high');
    
    let content = `## Recommended Actions

### Immediate Actions Required
`;
    
    if (critical.length > 0) {
      content += `1. **Fix ${critical.length} critical security issue(s)** - These are blocking the PR
`;
    }
    
    if (high.length > 0) {
      content += `2. **Address ${high.length} high priority issue(s)** - These are also blocking
`;
    }
    
    content += `
### Before Next PR
1. Review and fix existing issues in modified files
2. Consider addressing technical debt in affected modules
3. Update dependencies with known vulnerabilities

### Long-term Improvements
1. Implement automated security scanning in CI/CD
2. Add pre-commit hooks for code quality checks
3. Schedule regular dependency updates
4. Conduct security training for the team`;
    
    return content;
  }
  
  private generatePRComment(result: AnalysisResult, metadata: CompleteMetadata): string {
    const emoji = result.decision === 'approved' ? '✅' : '❌';
    const decision = result.decision === 'approved' ? 'APPROVED' : 'CHANGES REQUESTED';
    
    return `## PR Comment

\`\`\`markdown
## ${emoji} Code Quality Analysis: ${decision}

Hi @${metadata.prAuthor}! I've analyzed your PR and found:

**Quality Score:** ${result.qualityScore.toFixed(1)}/100 (Grade: ${result.grade})

### Summary
- 🆕 New Issues: ${result.newIssues.length}
- 📝 Existing Issues: ${result.existingIssues.length}
- ✅ Resolved Issues: ${result.resolvedIssues.length}

${result.newIssues.filter(i => i.severity === 'critical' || i.severity === 'high').length > 0 ? 
`### ⛔ Blocking Issues
${result.newIssues.filter(i => i.severity === 'critical' || i.severity === 'high').map(i => `- ${i.title} (\`${i.file}:${i.line}\`)`).join('\n')}

Please fix these before merge.` : '✅ No blocking issues found!'}

${result.skillScore.recommendations.length > 0 ? `
### 💡 Skill Improvement Tips
${result.skillScore.recommendations.slice(0, 2).map(r => `- ${r}`).join('\n')}` : ''}

---
*Generated by V9 Code Quality Analyzer*
\`\`\``;
  }
  
  private generateResolutionMetrics(result: AnalysisResult): string {
    const totalIssues = result.newIssues.length + result.existingIssues.length;
    const estimatedHours = this.estimateFixTime(result);
    
    return `## Resolution Metrics

### Fix Time Estimates
| Priority | Count | Est. Hours | Est. Cost |
|----------|-------|------------|-----------|
| Critical | ${result.newIssues.filter(i => i.severity === 'critical').length} | ${result.newIssues.filter(i => i.severity === 'critical').length * 2} | $${result.newIssues.filter(i => i.severity === 'critical').length * 2 * 150} |
| High | ${result.newIssues.filter(i => i.severity === 'high').length} | ${result.newIssues.filter(i => i.severity === 'high').length * 1.5} | $${result.newIssues.filter(i => i.severity === 'high').length * 1.5 * 150} |
| Medium | ${result.newIssues.filter(i => i.severity === 'medium').length} | ${result.newIssues.filter(i => i.severity === 'medium').length * 1} | $${result.newIssues.filter(i => i.severity === 'medium').length * 1 * 150} |
| Low | ${result.newIssues.filter(i => i.severity === 'low').length} | ${result.newIssues.filter(i => i.severity === 'low').length * 0.5} | $${result.newIssues.filter(i => i.severity === 'low').length * 0.5 * 150} |
| **Total** | **${result.newIssues.length}** | **${estimatedHours}** | **$${estimatedHours * 150}** |

### Resolution Progress
- Issues Resolved This PR: ${result.resolvedIssues.length}
- New Issues Introduced: ${result.newIssues.length}
- Net Change: ${result.resolvedIssues.length - result.newIssues.length >= 0 ? '+' : ''}${result.resolvedIssues.length - result.newIssues.length}
- Resolution Rate: ${totalIssues > 0 ? ((result.resolvedIssues.length / totalIssues) * 100).toFixed(1) : 0}%`;
  }
  
  private generateFooter(metadata: CompleteMetadata): string {
    return `---

*Generated by ${metadata.analyzer} v${metadata.analyzerVersion}*  
*Analysis completed in ${(metadata.totalDuration / 1000).toFixed(1)} seconds*  
*Repository: [${metadata.repository}](${metadata.repoUrl})*  
*Analysis ID: ${metadata.prNumber}-${Date.now()}*`;
  }
  
  // Helper methods
  private calculateImpact(issues: Issue[]): number {
    let impact = 0;
    issues.forEach(issue => {
      switch (issue.severity) {
        case 'critical': impact += 5; break;
        case 'high': impact += 3; break;
        case 'medium': impact += 1; break;
        case 'low': impact += 0.5; break;
      }
    });
    return impact;
  }
  
  private groupBySeverity(issues: Issue[]): Record<string, number> {
    return {
      critical: issues.filter(i => i.severity === 'critical').length,
      high: issues.filter(i => i.severity === 'high').length,
      medium: issues.filter(i => i.severity === 'medium').length,
      low: issues.filter(i => i.severity === 'low').length
    };
  }
  
  private groupByCategory(issues: Issue[]): Record<string, number> {
    const categories: Record<string, number> = {
      Security: 0,
      Performance: 0,
      Quality: 0,
      Architecture: 0,
      Dependency: 0
    };
    
    issues.forEach(issue => {
      if (categories[issue.category]) {
        categories[issue.category]++;
      }
    });
    
    return categories;
  }
  
  private getLanguageFromFile(file: string): string {
    if (file.endsWith('.java')) return 'java';
    if (file.endsWith('.scala')) return 'scala';
    if (file.endsWith('.py')) return 'python';
    if (file.endsWith('.js') || file.endsWith('.ts')) return 'javascript';
    if (file.endsWith('.go')) return 'go';
    if (file.endsWith('.rs')) return 'rust';
    if (file.endsWith('.rb')) return 'ruby';
    return 'text';
  }
  
  private getSkillStatus(score: number): string {
    if (score >= 90) return '🏆 Excellent';
    if (score >= 80) return '✨ Good';
    if (score >= 70) return '👍 Satisfactory';
    if (score >= 60) return '⚠️ Needs Improvement';
    return '❌ Critical';
  }
  
  private estimateFixTime(result: AnalysisResult): number {
    let hours = 0;
    result.newIssues.forEach(issue => {
      switch (issue.severity) {
        case 'critical': hours += 2; break;
        case 'high': hours += 1.5; break;
        case 'medium': hours += 1; break;
        case 'low': hours += 0.5; break;
      }
    });
    return hours;
  }
}