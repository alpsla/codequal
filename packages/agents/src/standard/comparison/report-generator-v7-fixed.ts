/**
 * Fixed V7 Report Generator - Uses actual data instead of hardcoded templates
 */

import { 
  ComparisonResult, 
  Issue
} from '../types/analysis-types';

export class ReportGeneratorV7Fixed {
  generateReport(comparison: ComparisonResult): string {
    // Extract actual data
    const newIssues = this.extractNewIssues(comparison);
    const resolvedIssues = this.extractResolvedIssues(comparison);
    const unchangedIssues = this.extractUnchangedIssues(comparison);
    const allCurrentIssues = [...newIssues, ...unchangedIssues];
    
    // Count by severity
    const criticalCount = newIssues.filter(i => i.severity === 'critical').length;
    const highCount = newIssues.filter(i => i.severity === 'high').length;
    const mediumCount = newIssues.filter(i => i.severity === 'medium').length;
    const lowCount = newIssues.filter(i => i.severity === 'low').length;
    
    // Get metadata
    const prMetadata = (comparison as any).prMetadata || {};
    const author = prMetadata.author || 'Unknown';
    const prNumber = prMetadata.id || 'Unknown';
    const repoUrl = prMetadata.repository_url || 'Unknown';
    const scanDuration = (comparison as any).scanDuration || 0;
    
    let report = '';
    
    // Header
    report += `# Pull Request Analysis Report\n\n`;
    report += `**Repository:** ${repoUrl}\n`;
    report += `**PR:** #${prNumber} - Code Changes\n`;
    report += `**Author:** ${this.formatAuthor(author)}\n`;
    report += `**Analysis Date:** ${new Date().toISOString()}\n`;
    report += `**Scan Duration:** ${(scanDuration / 1000).toFixed(1)} seconds\n`;
    report += `---\n\n`;
    
    // Decision
    const decision = this.makeDecision(criticalCount, highCount);
    report += `## PR Decision: ${decision.icon} ${decision.text}\n\n`;
    report += `**Confidence:** ${decision.confidence}%\n\n`;
    report += `${decision.reason}\n\n`;
    report += `---\n\n`;
    
    // Executive Summary
    report += this.generateExecutiveSummary(newIssues, resolvedIssues, unchangedIssues, prMetadata);
    
    // Breaking Changes Section (if any)
    report += this.generateBreakingChangesSection(newIssues);
    
    // Detailed Analysis Sections
    report += this.generateSecurityAnalysis(allCurrentIssues);
    report += this.generatePerformanceAnalysis(allCurrentIssues);
    report += this.generateCodeQualityAnalysis(allCurrentIssues);
    report += this.generateDependencyAnalysis(allCurrentIssues);
    
    // Educational Insights - Based on actual issues
    report += this.generateEducationalInsights(newIssues);
    
    // Skills Tracking - Using actual data
    report += this.generateSkillsTracking(author, newIssues, unchangedIssues);
    
    // Action Items - Based on actual issues
    report += this.generateActionItems(newIssues, unchangedIssues);
    
    // Conclusion
    report += this.generateConclusion(newIssues, decision);
    
    return report;
  }
  
  private extractNewIssues(comparison: ComparisonResult): Issue[] {
    const comp = comparison.comparison as any;
    if (comp?.newIssues?.issues) {
      return comp.newIssues.issues.map((item: any) => item.issue || item);
    }
    return (comparison as any).newIssues || [];
  }
  
  private extractResolvedIssues(comparison: ComparisonResult): Issue[] {
    const comp = comparison.comparison as any;
    if (comp?.resolvedIssues?.issues) {
      return comp.resolvedIssues.issues.map((item: any) => item.issue || item);
    }
    return (comparison as any).resolvedIssues || [];
  }
  
  private extractUnchangedIssues(comparison: ComparisonResult): Issue[] {
    const comp = comparison.comparison as any;
    if (comp?.unchangedIssues?.issues) {
      return comp.unchangedIssues.issues.map((item: any) => item.issue || item);
    }
    return (comparison as any).unchangedIssues || [];
  }
  
  private formatAuthor(author: string): string {
    if (!author || author === 'Unknown') return 'Unknown (@unknown)';
    return `${author.charAt(0).toUpperCase() + author.slice(1)} (@${author})`;
  }
  
  private makeDecision(criticalCount: number, highCount: number) {
    if (criticalCount > 0) {
      return {
        icon: '❌',
        text: 'DECLINED - CRITICAL ISSUES MUST BE FIXED',
        confidence: 95,
        reason: `${criticalCount} critical issue(s) must be resolved before merge`
      };
    }
    if (highCount > 0) {
      return {
        icon: '⚠️',
        text: 'CONDITIONAL APPROVAL - HIGH ISSUES SHOULD BE ADDRESSED',
        confidence: 85,
        reason: `${highCount} high severity issue(s) should be addressed`
      };
    }
    return {
      icon: '✅',
      text: 'APPROVED - Ready to merge',
      confidence: 90,
      reason: 'No blocking issues found'
    };
  }
  
  private generateExecutiveSummary(newIssues: Issue[], resolvedIssues: Issue[], unchangedIssues: Issue[], prMetadata: any): string {
    let section = `## Executive Summary\n\n`;
    
    const totalNew = newIssues.length;
    const totalResolved = resolvedIssues.length;
    const totalUnchanged = unchangedIssues.length;
    
    // Calculate score based on actual issues
    const score = Math.max(0, 100 - (newIssues.filter(i => i.severity === 'critical').length * 20) -
                                    (newIssues.filter(i => i.severity === 'high').length * 10) -
                                    (newIssues.filter(i => i.severity === 'medium').length * 5) -
                                    (newIssues.filter(i => i.severity === 'low').length * 2));
    
    section += `**Overall Score: ${score}/100 (Grade: ${this.getGrade(score)})**\n\n`;
    
    section += `This PR introduces:\n`;
    section += `- **${totalNew} new issues** (${this.countBySeverity(newIssues)})\n`;
    section += `- **${totalResolved} resolved issues** ✅\n`;
    section += `- **${totalUnchanged} unchanged issues** from main branch\n\n`;
    
    section += `### Key Metrics\n`;
    section += `- **Files Changed:** ${prMetadata.filesChanged || 'Unknown'}\n`;
    section += `- **Lines Added/Removed:** +${prMetadata.linesAdded || 0} / -${prMetadata.linesRemoved || 0}\n`;
    section += `- **Risk Level:** ${this.calculateRiskLevel(newIssues)}\n`;
    section += `- **Estimated Review Time:** ${this.estimateReviewTime(newIssues)} minutes\n\n`;
    
    // Visual distribution
    section += `### Issue Distribution\n`;
    section += '```\n';
    section += this.generateIssueDistributionChart(newIssues, unchangedIssues);
    section += '```\n\n';
    
    section += `---\n\n`;
    return section;
  }
  
  private countBySeverity(issues: Issue[]): string {
    const critical = issues.filter(i => i.severity === 'critical').length;
    const high = issues.filter(i => i.severity === 'high').length;
    const medium = issues.filter(i => i.severity === 'medium').length;
    const low = issues.filter(i => i.severity === 'low').length;
    
    const parts = [];
    if (critical > 0) parts.push(`${critical} critical`);
    if (high > 0) parts.push(`${high} high`);
    if (medium > 0) parts.push(`${medium} medium`);
    if (low > 0) parts.push(`${low} low`);
    
    return parts.length > 0 ? parts.join(', ') : '0';
  }
  
  private calculateRiskLevel(newIssues: Issue[]): string {
    const critical = newIssues.filter(i => i.severity === 'critical').length;
    const high = newIssues.filter(i => i.severity === 'high').length;
    
    if (critical > 0) return 'CRITICAL';
    if (high > 2) return 'HIGH';
    if (high > 0) return 'MEDIUM';
    return 'LOW';
  }
  
  private estimateReviewTime(issues: Issue[]): number {
    const timePerIssue = {
      critical: 30,
      high: 20,
      medium: 10,
      low: 5
    };
    
    return issues.reduce((total, issue) => {
      return total + (timePerIssue[issue.severity as keyof typeof timePerIssue] || 5);
    }, 15); // Base 15 minutes
  }
  
  private generateIssueDistributionChart(newIssues: Issue[], unchangedIssues: Issue[]): string {
    const newBySeverity = {
      critical: newIssues.filter(i => i.severity === 'critical').length,
      high: newIssues.filter(i => i.severity === 'high').length,
      medium: newIssues.filter(i => i.severity === 'medium').length,
      low: newIssues.filter(i => i.severity === 'low').length
    };
    
    const unchangedBySeverity = {
      critical: unchangedIssues.filter(i => i.severity === 'critical').length,
      high: unchangedIssues.filter(i => i.severity === 'high').length,
      medium: unchangedIssues.filter(i => i.severity === 'medium').length,
      low: unchangedIssues.filter(i => i.severity === 'low').length
    };
    
    let chart = 'NEW PR ISSUES:\n';
    chart += `Critical: ${this.generateBar(newBySeverity.critical, 10)} ${newBySeverity.critical}${newBySeverity.critical > 0 ? ' 🚨 MUST FIX' : ''}\n`;
    chart += `High:     ${this.generateBar(newBySeverity.high, 10)} ${newBySeverity.high}${newBySeverity.high > 0 ? ' ⚠️ SHOULD FIX' : ''}\n`;
    chart += `Medium:   ${this.generateBar(newBySeverity.medium, 10)} ${newBySeverity.medium}\n`;
    chart += `Low:      ${this.generateBar(newBySeverity.low, 10)} ${newBySeverity.low}\n`;
    chart += '\n';
    chart += 'EXISTING ISSUES (from main branch):\n';
    chart += `Critical: ${this.generateBar(unchangedBySeverity.critical, 10)} ${unchangedBySeverity.critical}\n`;
    chart += `High:     ${this.generateBar(unchangedBySeverity.high, 10)} ${unchangedBySeverity.high}\n`;
    chart += `Medium:   ${this.generateBar(unchangedBySeverity.medium, 10)} ${unchangedBySeverity.medium}\n`;
    chart += `Low:      ${this.generateBar(unchangedBySeverity.low, 10)} ${unchangedBySeverity.low}`;
    
    return chart;
  }
  
  private generateBar(count: number, max: number): string {
    const filled = Math.min(count, max);
    const empty = Math.max(0, max - filled);
    return '█'.repeat(filled) + '░'.repeat(empty);
  }
  
  private generateBreakingChangesSection(issues: Issue[]): string {
    // Filter for breaking changes
    const breakingChanges = issues.filter(i => {
      const category = (i.category || '').toLowerCase();
      const type = ((i as any).type || i.type || '').toLowerCase();
      const title = (i.title || i.message || '').toLowerCase();
      const isBreaking = (i as any).breaking === true;
      
      return isBreaking || 
             category.includes('breaking') || 
             type.includes('breaking') ||
             title.includes('breaking change') ||
             title.includes('removed') ||
             title.includes('renamed') ||
             title.includes('changed');
    });
    
    if (breakingChanges.length === 0) {
      return ''; // No breaking changes section if none found
    }
    
    let section = `## 🚨 Breaking Changes\n\n`;
    section += `**This PR introduces ${breakingChanges.length} breaking change${breakingChanges.length > 1 ? 's' : ''} that will affect existing users.**\n\n`;
    
    // Add migration effort assessment
    const effort = this.assessMigrationEffort(breakingChanges);
    section += `**Migration Effort:** ${effort.level} (${effort.description})\n`;
    section += `**Estimated Time:** ${effort.estimatedTime}\n\n`;
    
    section += `### Breaking Changes List\n\n`;
    
    breakingChanges.forEach((change, idx) => {
      section += `#### ${idx + 1}. ${change.message || change.title}\n`;
      
      // Severity badge
      const severityBadge = this.getSeverityBadge(change.severity || 'high');
      section += `${severityBadge} **Severity:** ${(change.severity || 'high').toUpperCase()}\n\n`;
      
      // Location
      if (change.location?.file) {
        section += `📍 **Location:** \`${change.location.file}${change.location.line ? ':' + change.location.line : ''}\`\n\n`;
      }
      
      // Impact
      const impact = (change as any).impact || this.inferImpact(change);
      if (impact) {
        section += `⚠️  **Impact:**\n${impact}\n\n`;
      }
      
      // Affected APIs
      const affectedAPIs = (change as any).affectedAPIs;
      if (affectedAPIs && affectedAPIs.length > 0) {
        section += `🔧 **Affected APIs:**\n`;
        affectedAPIs.forEach((api: string) => {
          section += `- \`${api}\`\n`;
        });
        section += '\n';
      }
      
      // Migration Guide
      const remediation = (change as any).suggestion || (change as any).remediation || (change as any).migrationGuide;
      if (remediation) {
        section += `📝 **Migration Guide:**\n`;
        section += `\`\`\`\n${remediation}\n\`\`\`\n`;
      }
      
      section += '\n';
    });
    
    // Add general migration recommendations
    section += `### Migration Recommendations\n\n`;
    section += `1. **Before upgrading:**\n`;
    section += `   - Review all breaking changes above\n`;
    section += `   - Search your codebase for affected APIs\n`;
    section += `   - Plan the migration in a separate branch\n\n`;
    section += `2. **During migration:**\n`;
    section += `   - Update one breaking change at a time\n`;
    section += `   - Run tests after each change\n`;
    section += `   - Use TypeScript/linting to catch issues\n\n`;
    section += `3. **After migration:**\n`;
    section += `   - Run full test suite\n`;
    section += `   - Test in staging environment\n`;
    section += `   - Update documentation\n\n`;
    
    section += `---\n\n`;
    return section;
  }
  
  private assessMigrationEffort(breakingChanges: Issue[]): { level: string; description: string; estimatedTime: string } {
    const count = breakingChanges.length;
    const hasCritical = breakingChanges.some(c => c.severity === 'critical');
    const hasApiChanges = breakingChanges.some(c => 
      (c.message || c.title || '').toLowerCase().includes('api') ||
      (c.message || c.title || '').toLowerCase().includes('removed') ||
      (c.message || c.title || '').toLowerCase().includes('renamed')
    );
    
    if (count > 5 || hasCritical) {
      return {
        level: '🔴 HIGH',
        description: 'Significant changes requiring careful migration',
        estimatedTime: '2-4 hours per consuming application'
      };
    } else if (count > 2 || hasApiChanges) {
      return {
        level: '🟡 MEDIUM',
        description: 'Moderate changes with clear migration path',
        estimatedTime: '1-2 hours per consuming application'
      };
    } else {
      return {
        level: '🟢 LOW',
        description: 'Minor changes with straightforward fixes',
        estimatedTime: '< 1 hour per consuming application'
      };
    }
  }
  
  private getSeverityBadge(severity: string): string {
    switch (severity.toLowerCase()) {
      case 'critical': return '🔴';
      case 'high': return '🟠';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  }
  
  private inferImpact(change: Issue): string {
    const message = (change.message || change.title || '').toLowerCase();
    
    if (message.includes('removed')) {
      return 'All code using this feature will break and must be refactored.';
    } else if (message.includes('renamed')) {
      return 'All references must be updated to use the new name.';
    } else if (message.includes('type') || message.includes('signature')) {
      return 'Type incompatibilities may cause compilation errors in TypeScript projects.';
    } else if (message.includes('deprecated')) {
      return 'While still functional, this feature will be removed in a future version.';
    } else {
      return 'Existing code may need to be updated to work with this change.';
    }
  }
  
  private generateSecurityAnalysis(issues: Issue[]): string {
    const securityIssues = issues.filter(i => {
      const category = (i.category || '').toLowerCase();
      return category.includes('security') || 
             (i as any).type === 'security' ||
             i.type === 'vulnerability';
    });
    
    if (securityIssues.length === 0) {
      return ''; // Skip section if no security issues
    }
    
    let section = `## Security Analysis\n\n`;
    section += `### Found ${securityIssues.length} Security Issues\n\n`;
    
    // Group by severity
    const bySeverity = this.groupBySeverity(securityIssues);
    
    for (const [severity, severityIssues] of Object.entries(bySeverity)) {
      if (severityIssues.length === 0) continue;
      
      section += `#### ${severity.toUpperCase()} (${severityIssues.length})\n`;
      severityIssues.forEach((issue, idx) => {
        section += `${idx + 1}. **${issue.message || issue.title}**\n`;
        if (issue.location?.file) {
          section += `   - Location: \`${issue.location.file}${issue.location.line ? ':' + issue.location.line : ''}\`\n`;
        }
        const suggestion = (issue as any).suggestion || (issue as any).remediation;
        if (suggestion) {
          section += `   - Fix: ${suggestion}
`;
        }
      });
      section += '\n';
    }
    
    section += `---\n\n`;
    return section;
  }
  
  private generatePerformanceAnalysis(issues: Issue[]): string {
    const perfIssues = issues.filter(i => {
      const category = (i.category || '').toLowerCase();
      return category.includes('performance') || 
             (i as any).type === 'performance' ||
             i.type === 'optimization';
    });
    
    if (perfIssues.length === 0) {
      return ''; // Skip section if no performance issues
    }
    
    let section = `## Performance Analysis\n\n`;
    section += `### Found ${perfIssues.length} Performance Issues\n\n`;
    
    const bySeverity = this.groupBySeverity(perfIssues);
    
    for (const [severity, severityIssues] of Object.entries(bySeverity)) {
      if (severityIssues.length === 0) continue;
      
      section += `#### ${severity.toUpperCase()} (${severityIssues.length})\n`;
      severityIssues.forEach((issue, idx) => {
        section += `${idx + 1}. **${issue.message || issue.title}**\n`;
        if (issue.location?.file) {
          section += `   - Location: \`${issue.location.file}${issue.location.line ? ':' + issue.location.line : ''}\`\n`;
        }
        const suggestion = (issue as any).suggestion || (issue as any).remediation;
        if (suggestion) {
          section += `   - Fix: ${suggestion}
`;
        }
      });
      section += '\n';
    }
    
    section += `---\n\n`;
    return section;
  }
  
  private generateCodeQualityAnalysis(issues: Issue[]): string {
    const qualityIssues = issues.filter(i => {
      const category = (i.category || '').toLowerCase();
      const type = i.type || (i as any).type || '';
      return category.includes('quality') || 
             category.includes('code') ||
             type === 'code-smell' ||
             type === 'maintainability';
    });
    
    if (qualityIssues.length === 0) {
      return ''; // Skip section if no quality issues
    }
    
    let section = `## Code Quality Analysis\n\n`;
    section += `### Found ${qualityIssues.length} Code Quality Issues\n\n`;
    
    const bySeverity = this.groupBySeverity(qualityIssues);
    
    for (const [severity, severityIssues] of Object.entries(bySeverity)) {
      if (severityIssues.length === 0) continue;
      
      section += `#### ${severity.toUpperCase()} (${severityIssues.length})\n`;
      severityIssues.forEach((issue, idx) => {
        section += `${idx + 1}. **${issue.message || issue.title}**\n`;
        if (issue.location?.file) {
          section += `   - Location: \`${issue.location.file}${issue.location.line ? ':' + issue.location.line : ''}\`\n`;
        }
        const suggestion = (issue as any).suggestion || (issue as any).remediation;
        if (suggestion) {
          section += `   - Fix: ${suggestion}
`;
        }
      });
      section += '\n';
    }
    
    section += `---\n\n`;
    return section;
  }
  
  private generateDependencyAnalysis(issues: Issue[]): string {
    const depIssues = issues.filter(i => {
      const category = (i.category || '').toLowerCase();
      const type = i.type || (i as any).type || '';
      return category.includes('dependency') || 
             category.includes('dependencies') ||
             type === 'dependency';
    });
    
    if (depIssues.length === 0) {
      return ''; // Skip section if no dependency issues
    }
    
    let section = `## Dependency Analysis\n\n`;
    section += `### Found ${depIssues.length} Dependency Issues\n\n`;
    
    depIssues.forEach((issue, idx) => {
      section += `${idx + 1}. **${issue.message || issue.title}**
`;
      section += `   - Severity: ${issue.severity}
`;
      const suggestion = (issue as any).suggestion || (issue as any).remediation;
      if (suggestion) {
        section += `   - Fix: ${suggestion}
`;
      }
    });
    
    section += `\n---\n\n`;
    return section;
  }
  
  private generateEducationalInsights(newIssues: Issue[]): string {
    if (newIssues.length === 0) return '';
    
    let section = `## Educational Insights & Recommendations\n\n`;
    section += `### Learning Opportunities Based on This PR\n\n`;
    
    // Group issues by category to suggest learning paths
    const categories = new Set(newIssues.map(i => (i.category || 'general').toLowerCase()));
    
    if (categories.has('security')) {
      section += `#### 🔒 Security Best Practices\n`;
      section += `Based on the security issues found, consider reviewing:\n`;
      section += `- Input validation and sanitization\n`;
      section += `- Authentication and authorization patterns\n`;
      section += `- OWASP Top 10 vulnerabilities\n`;
      section += `- Secure coding guidelines for your language\n\n`;
    }
    
    if (categories.has('performance')) {
      section += `#### ⚡ Performance Optimization\n`;
      section += `Based on the performance issues found, consider studying:\n`;
      section += `- Algorithm complexity and Big O notation\n`;
      section += `- Database query optimization\n`;
      section += `- Caching strategies\n`;
      section += `- Async/await patterns and concurrency\n\n`;
    }
    
    if (categories.has('code quality') || categories.has('code-quality')) {
      section += `#### 📝 Code Quality Improvements\n`;
      section += `Based on the code quality issues found, focus on:\n`;
      section += `- Clean Code principles\n`;
      section += `- SOLID design principles\n`;
      section += `- Design patterns relevant to your domain\n`;
      section += `- Code review best practices\n\n`;
    }
    
    // Add specific examples from actual issues
    section += `### Specific Issues to Learn From\n\n`;
    const topIssues = newIssues
      .filter(i => i.severity === 'high' || i.severity === 'critical')
      .slice(0, 3);
    
    topIssues.forEach((issue, idx) => {
      section += `${idx + 1}. **${issue.message}**
`;
      const suggestion = (issue as any).suggestion || (issue as any).remediation;
      if (suggestion) {
        section += `   - Learning: ${suggestion}
`;
      }
    });
    
    section += `\n---\n\n`;
    return section;
  }
  
  private generateSkillsTracking(author: string, newIssues: Issue[], unchangedIssues: Issue[]): string {
    let section = `## Developer Skills Analysis\n\n`;
    section += `**Developer:** ${this.formatAuthor(author)}\n\n`;
    
    // Calculate skill impact based on actual issues
    const impact = this.calculateSkillImpact(newIssues, unchangedIssues);
    
    section += `### PR Impact on Skills\n\n`;
    section += `| Metric | Impact | Details |\n`;
    section += `|--------|--------|---------||\n`;
    section += `| New Issues | ${impact.newIssuesPenalty} points | ${newIssues.length} issues introduced |\n`;
    section += `| Unfixed Issues | ${impact.unfixedPenalty} points | ${unchangedIssues.length} issues remain |\n`;
    section += `| **Total Impact** | **${impact.total} points** | ${impact.summary} |\n\n`;
    
    // Breakdown by category
    section += `### Skills Breakdown by Category\n\n`;
    const categories = this.analyzeSkillsByCategory(newIssues);
    
    section += `| Category | Issues | Impact |\n`;
    section += `|----------|--------|--------|\n`;
    for (const [category, count] of Object.entries(categories)) {
      const impact = count > 3 ? 'Needs improvement' : count > 0 ? 'Minor gaps' : 'Good';
      section += `| ${category} | ${count} | ${impact} |\n`;
    }
    
    section += `\n---\n\n`;
    return section;
  }
  
  private calculateSkillImpact(newIssues: Issue[], unchangedIssues: Issue[]) {
    const penalties = {
      critical: -15,
      high: -10,
      medium: -5,
      low: -2
    };
    
    let newIssuesPenalty = 0;
    newIssues.forEach(issue => {
      newIssuesPenalty += penalties[issue.severity as keyof typeof penalties] || -2;
    });
    
    let unfixedPenalty = 0;
    unchangedIssues.forEach(issue => {
      unfixedPenalty += (penalties[issue.severity as keyof typeof penalties] || -2) / 2; // Half penalty for unfixed
    });
    
    const total = newIssuesPenalty + unfixedPenalty;
    const summary = total < -20 ? 'Significant negative impact' :
                    total < -10 ? 'Moderate negative impact' :
                    total < 0 ? 'Minor negative impact' :
                    'Neutral';
    
    return {
      newIssuesPenalty,
      unfixedPenalty,
      total,
      summary
    };
  }
  
  private analyzeSkillsByCategory(issues: Issue[]): Record<string, number> {
    const categories: Record<string, number> = {};
    
    issues.forEach(issue => {
      const category = issue.category || 'General';
      categories[category] = (categories[category] || 0) + 1;
    });
    
    return categories;
  }
  
  private generateActionItems(newIssues: Issue[], unchangedIssues: Issue[]): string {
    let section = `## Action Items & Recommendations\n\n`;
    
    // Group new issues by severity
    const critical = newIssues.filter(i => i.severity === 'critical');
    const high = newIssues.filter(i => i.severity === 'high');
    const medium = newIssues.filter(i => i.severity === 'medium');
    const low = newIssues.filter(i => i.severity === 'low');
    
    // Critical issues - MUST FIX
    if (critical.length > 0) {
      section += `### 🚨 CRITICAL Issues (Must Fix Before Merge)\n\n`;
      critical.forEach((issue, idx) => {
        section += `${idx + 1}. **${issue.message}**\n`;
        section += `   - Location: \`${issue.location?.file || 'unknown'}${issue.location?.line ? ':' + issue.location.line : ''}\`\n`;
        const suggestion = (issue as any).suggestion || (issue as any).remediation;
        if (suggestion) {
          section += `   - Fix: ${suggestion}
`;
        }
        section += '\n';
      });
    }
    
    // High issues - SHOULD FIX
    if (high.length > 0) {
      section += `### ⚠️ HIGH Priority Issues (Should Fix)\n\n`;
      high.forEach((issue, idx) => {
        section += `${idx + 1}. **${issue.message}**\n`;
        section += `   - Location: \`${issue.location?.file || 'unknown'}${issue.location?.line ? ':' + issue.location.line : ''}\`\n`;
        const suggestion = (issue as any).suggestion || (issue as any).remediation;
        if (suggestion) {
          section += `   - Fix: ${suggestion}
`;
        }
        section += '\n';
      });
    }
    
    // Medium issues - CONSIDER FIXING
    if (medium.length > 0) {
      section += `### 📋 MEDIUM Priority Issues (Consider Fixing)\n\n`;
      section += `Found ${medium.length} medium priority issues:\n`;
      medium.slice(0, 5).forEach((issue, idx) => {
        section += `- ${issue.message} (\`${issue.location?.file || 'unknown'}\`)\n`;
      });
      if (medium.length > 5) {
        section += `- ... and ${medium.length - 5} more\n`;
      }
      section += '\n';
    }
    
    // Existing unfixed issues
    if (unchangedIssues.length > 0) {
      const criticalUnfixed = unchangedIssues.filter(i => i.severity === 'critical');
      const highUnfixed = unchangedIssues.filter(i => i.severity === 'high');
      
      if (criticalUnfixed.length > 0 || highUnfixed.length > 0) {
        section += `### 📌 Pre-existing Issues (Not Blocking This PR)\n\n`;
        section += `The following issues exist in the main branch and remain unfixed:\n`;
        section += `- ${criticalUnfixed.length} critical issues\n`;
        section += `- ${highUnfixed.length} high priority issues\n`;
        section += `- ${unchangedIssues.length - criticalUnfixed.length - highUnfixed.length} other issues\n\n`;
        section += `*Consider creating a separate task to address these technical debt items.*\n\n`;
      }
    }
    
    section += `---\n\n`;
    return section;
  }
  
  private generateConclusion(newIssues: Issue[], decision: any): string {
    let section = `## Summary\n\n`;
    
    section += `### PR Status: ${decision.text}\n\n`;
    
    const critical = newIssues.filter(i => i.severity === 'critical').length;
    const high = newIssues.filter(i => i.severity === 'high').length;
    
    if (critical > 0 || high > 0) {
      section += `**Action Required:**\n`;
      if (critical > 0) {
        section += `- Fix ${critical} critical issue(s) before merge\n`;
      }
      if (high > 0) {
        section += `- Address ${high} high priority issue(s)\n`;
      }
    } else {
      section += `This PR is ready for merge with ${newIssues.length} minor issues that can be addressed in follow-up PRs.\n`;
    }
    
    section += `\n---\n\n`;
    section += `*Generated by CodeQual AI Analysis Platform*\n`;
    
    return section;
  }
  
  private groupBySeverity(issues: Issue[]): Record<string, Issue[]> {
    return {
      critical: issues.filter(i => i.severity === 'critical'),
      high: issues.filter(i => i.severity === 'high'),
      medium: issues.filter(i => i.severity === 'medium'),
      low: issues.filter(i => i.severity === 'low')
    };
  }
  
  private getGrade(score: number): string {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }
  
  /**
   * Generate a concise PR comment
   */
  generatePRComment(comparison: ComparisonResult): string {
    // Extract actual data
    const newIssues = this.extractNewIssues(comparison);
    
    // Check for breaking changes
    const breakingChanges = newIssues.filter(i => {
      const category = (i.category || '').toLowerCase();
      const type = ((i as any).type || i.type || '').toLowerCase();
      const title = (i.title || i.message || '').toLowerCase();
      const isBreaking = (i as any).breaking === true;
      
      return isBreaking || 
             category.includes('breaking') || 
             type.includes('breaking') ||
             title.includes('breaking change');
    });
    
    // Count by severity (excluding breaking changes from regular counts)
    const nonBreakingIssues = newIssues.filter(i => !breakingChanges.includes(i));
    const criticalCount = nonBreakingIssues.filter(i => i.severity === 'critical').length;
    const highCount = nonBreakingIssues.filter(i => i.severity === 'high').length;
    const mediumCount = nonBreakingIssues.filter(i => i.severity === 'medium').length;
    const lowCount = nonBreakingIssues.filter(i => i.severity === 'low').length;
    
    // Calculate score
    const score = Math.max(0, 100 - (breakingChanges.length * 25) - (criticalCount * 20) - (highCount * 10) - (mediumCount * 5) - (lowCount * 2));
    
    // Get decision (breaking changes are treated as critical)
    const decision = this.makeDecision(criticalCount + breakingChanges.length, highCount);
    
    let comment = `## 🔍 Code Analysis Results\n\n`;
    comment += `**Decision:** ${decision.icon} ${decision.text}\n`;
    comment += `**Confidence:** ${decision.confidence}%\n\n`;
    
    // Highlight breaking changes first
    if (breakingChanges.length > 0) {
      comment += `### ⚠️ BREAKING CHANGES DETECTED\n`;
      comment += `This PR introduces **${breakingChanges.length} breaking change${breakingChanges.length > 1 ? 's' : ''}** that will affect existing users:\n`;
      breakingChanges.slice(0, 3).forEach((change, idx) => {
        comment += `${idx + 1}. ${change.message || change.title}\n`;
      });
      if (breakingChanges.length > 3) {
        comment += `... and ${breakingChanges.length - 3} more\n`;
      }
      comment += `\n`;
    }
    
    if (criticalCount > 0 || highCount > 0) {
      comment += `### 🚨 Other Blocking Issues Found\n`;
      comment += `This PR introduces **${criticalCount} critical** and **${highCount} high** severity issues that must be fixed before merging.\n\n`;
    }
    
    comment += `### 📊 Issue Summary\n`;
    comment += `| Severity | New Issues | Action Required |\n`;
    comment += `|----------|------------|----------------|\n`;
    comment += `| 🚨 Critical | ${criticalCount} | ${criticalCount > 0 ? 'MUST FIX' : 'None'} |\n`;
    comment += `| ⚠️ High | ${highCount} | ${highCount > 0 ? 'MUST FIX' : 'None'} |\n`;
    comment += `| 🟡 Medium | ${mediumCount} | ${mediumCount > 0 ? 'Review recommended' : 'None'} |\n`;
    comment += `| 🟢 Low | ${lowCount} | ${lowCount > 0 ? 'Consider fixing' : 'None'} |\n\n`;
    
    if (criticalCount > 0 || highCount > 0) {
      comment += `### 🛑 Next Steps\n`;
      comment += `1. Fix all critical and high severity issues\n`;
      comment += `2. Re-run analysis after fixes\n`;
      comment += `3. Request re-review once issues are resolved\n\n`;
    }
    
    comment += `**Overall Score:** ${score}/100 (${this.getGrade(score)})\n\n`;
    comment += `---\n`;
    comment += `*Generated by CodeQual Analysis Engine*`;
    
    return comment;
  }
}