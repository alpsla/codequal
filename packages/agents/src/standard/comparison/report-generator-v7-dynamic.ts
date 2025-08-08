/**
 * Dynamic Report Generator V7 - Fully synchronized with actual issues
 * All sections dynamically reflect the actual issues found
 */

export class ReportGeneratorV7Dynamic {
  private readonly SCORING_VALUES = {
    critical: 5,
    high: 3,
    medium: 1,
    low: 0.5
  };

  private readonly UNFIXED_PENALTIES = {
    critical: 5,
    high: 3,
    medium: 1,
    low: 0.5
  };

  generateReport(comparison: any): string {
    let report = '';
    
    // Calculate all issues upfront for consistency
    const issueAnalysis = this.analyzeAllIssues(comparison);
    
    // Generate decision based on actual issues
    const decision = this.makeDecision(comparison, issueAnalysis);
    
    // Header
    report += this.generateHeader(comparison, issueAnalysis);
    
    // Decision
    report += this.generateDecision(decision);
    
    // Executive Summary
    report += this.generateExecutiveSummary(comparison, issueAnalysis);
    
    // Breaking Changes (conditional)
    if (issueAnalysis.breakingChanges.total > 0) {
      report += this.generateBreakingChangesSection(comparison);
    }
    
    // Category Analyses - synchronized with actual issues
    report += this.generateSecurityAnalysis(comparison, issueAnalysis);
    report += this.generatePerformanceAnalysis(comparison, issueAnalysis);
    report += this.generateCodeQualityAnalysis(comparison, issueAnalysis);
    report += this.generateArchitectureAnalysis(comparison, issueAnalysis);
    report += this.generateDependenciesAnalysis(comparison, issueAnalysis);
    
    // Issues sections
    report += this.generatePRIssuesSection(comparison, issueAnalysis);
    report += this.generateRepositoryIssuesSection(comparison, issueAnalysis);
    
    // Educational - reflects actual priorities
    report += this.generateEducationalInsights(comparison, issueAnalysis);
    
    // Skills tracking
    report += this.generateSkillsTracking(comparison, issueAnalysis);
    
    // Business Impact
    report += this.generateBusinessImpact(comparison, issueAnalysis);
    
    // Action Items
    report += this.generateActionItems(comparison, issueAnalysis);
    
    // Conclusion and footnotes
    report += this.generateConclusion(decision);
    report += this.generateScoreSummary(comparison);
    report += this.generateFootnotes();
    
    return report;
  }

  private analyzeAllIssues(comparison: any): any {
    const newIssues = comparison.comparison?.newIssues || comparison.newIssues || [];
    const resolvedIssues = comparison.comparison?.resolvedIssues || comparison.resolvedIssues || [];
    const unchangedIssues = comparison.comparison?.unchangedIssues || comparison.unchangedIssues || [];
    const breakingChanges = comparison.breakingChanges || [];
    
    // Categorize issues by severity and type
    const analysis = {
      new: {
        critical: newIssues.filter((i: any) => i.severity === 'critical'),
        high: newIssues.filter((i: any) => i.severity === 'high'),
        medium: newIssues.filter((i: any) => i.severity === 'medium'),
        low: newIssues.filter((i: any) => i.severity === 'low'),
        total: newIssues.length,
        byCategory: {
          security: newIssues.filter((i: any) => i.category === 'security'),
          performance: newIssues.filter((i: any) => i.category === 'performance'),
          codeQuality: newIssues.filter((i: any) => i.category === 'code-quality'),
          dependencies: newIssues.filter((i: any) => i.category === 'dependencies'),
          testing: newIssues.filter((i: any) => i.category === 'testing')
        }
      },
      resolved: {
        total: resolvedIssues.length,
        byCategory: {
          security: resolvedIssues.filter((i: any) => i.category === 'security'),
          performance: resolvedIssues.filter((i: any) => i.category === 'performance'),
          codeQuality: resolvedIssues.filter((i: any) => i.category === 'code-quality')
        }
      },
      unchanged: {
        total: unchangedIssues.length,
        high: unchangedIssues.filter((i: any) => i.severity === 'high'),
        medium: unchangedIssues.filter((i: any) => i.severity === 'medium')
      },
      breakingChanges: {
        critical: breakingChanges.filter((bc: any) => bc.severity === 'critical'),
        high: breakingChanges.filter((bc: any) => bc.severity === 'high'),
        medium: breakingChanges.filter((bc: any) => bc.severity === 'medium'),
        total: breakingChanges.length
      }
    };
    
    return analysis;
  }

  private makeDecision(comparison: any, issues: any): any {
    // Priority 1: Critical breaking changes
    if (issues.breakingChanges.critical.length > 0) {
      return {
        decision: '❌ DECLINED - CRITICAL BREAKING CHANGES',
        confidence: 95,
        reason: `${issues.breakingChanges.critical.length} critical breaking changes must be addressed`
      };
    }
    
    // Priority 2: High breaking changes
    if (issues.breakingChanges.high.length > 0) {
      return {
        decision: '❌ DECLINED - HIGH SEVERITY BREAKING CHANGES',
        confidence: 93,
        reason: `${issues.breakingChanges.high.length} high severity breaking changes require migration planning`
      };
    }
    
    // Priority 3: Critical new issues
    if (issues.new.critical.length > 0) {
      return {
        decision: '❌ DECLINED - CRITICAL ISSUES DETECTED',
        confidence: 94,
        reason: `${issues.new.critical.length} critical issues must be fixed`
      };
    }
    
    // Priority 4: High new issues
    if (issues.new.high.length > 0) {
      return {
        decision: '❌ DECLINED - HIGH PRIORITY ISSUES',
        confidence: 92,
        reason: `${issues.new.high.length} high priority issues must be resolved`
      };
    }
    
    // Priority 5: Breaking changes without migration
    const breakingChanges = comparison.breakingChanges || [];
    if (breakingChanges.length > 0 && !breakingChanges.every((c: any) => c.migrationPath)) {
      return {
        decision: '⚠️ CONDITIONAL - MIGRATION GUIDES REQUIRED',
        confidence: 88,
        reason: 'Breaking changes need migration documentation'
      };
    }
    
    return {
      decision: '✅ APPROVED - Ready to merge',
      confidence: 90,
      reason: 'No blocking issues found'
    };
  }

  private generateHeader(comparison: any, issues: any): string {
    const repository = comparison.repository || 'Unknown';
    const prNumber = comparison.prNumber || 'N/A';
    const author = comparison.aiAnalysis?.author || { name: 'Unknown', username: 'unknown' };
    const prTitle = comparison.aiAnalysis?.prTitle || 'Untitled PR';
    const breakingCount = issues.breakingChanges.total;
    
    let header = `# Pull Request Analysis Report\n\n`;
    header += `**Repository:** ${repository}  \n`;
    header += `**PR:** #${prNumber} - ${prTitle}  \n`;
    header += `**Author:** ${author.name} (@${author.username})  \n`;
    header += `**Analysis Date:** ${new Date().toISOString()}  \n`;
    header += `**Model Used:** ${comparison.aiAnalysis?.modelUsed || 'openai/gpt-4o'}`;
    
    if (comparison.diffAnalysis?.usedDiffAnalysis) {
      header += ` (Enhanced with DiffAnalyzer)`;
    }
    header += `  \n`;
    
    header += `**Scan Duration:** ${comparison.aiAnalysis?.scanDuration || 'N/A'} seconds  \n`;
    
    if (breakingCount > 0) {
      header += `**Breaking Changes Detected:** ${breakingCount} 🚨\n`;
    }
    
    header += `---\n\n`;
    return header;
  }

  private generateDecision(decision: any): string {
    let section = `## PR Decision: ${decision.decision}\n\n`;
    section += `**Confidence:** ${decision.confidence}%\n\n`;
    section += `${decision.reason}\n\n`;
    section += `---\n\n`;
    return section;
  }

  private generateExecutiveSummary(comparison: any, issues: any): string {
    const score = this.calculateOverallScore(comparison, issues);
    const grade = this.getGrade(score);
    
    let section = `## Executive Summary\n\n`;
    section += `**Overall Score: ${score}/100 (Grade: ${grade})**\n\n`;
    
    // Dynamic summary based on actual issues
    const filesChanged = comparison.filesChanged || 0;
    const linesChanged = comparison.linesChanged || 0;
    
    section += `This PR (${filesChanged} files, ${linesChanged} lines) `;
    
    if (issues.new.total > 0) {
      section += `introduces ${issues.new.total} new issues `;
      section += `(${issues.new.critical.length} critical, ${issues.new.high.length} high, `;
      section += `${issues.new.medium.length} medium, ${issues.new.low.length} low)`;
      
      if (issues.new.critical.length > 0 || issues.new.high.length > 0) {
        section += ` that must be resolved before merge`;
      }
    } else {
      section += `introduces no new issues`;
    }
    
    if (issues.unchanged.total > 0) {
      section += `. Additionally, ${issues.unchanged.total} pre-existing issues remain unaddressed`;
    }
    
    section += `.\n\n`;
    
    // Key metrics
    section += `### Key Metrics\n`;
    section += `- **Issues Resolved:** ${issues.resolved.total} total ✅\n`;
    section += `- **New Issues:** ${issues.new.total} total`;
    
    if (issues.new.critical.length > 0 || issues.new.high.length > 0) {
      section += ` 🚨 **[BLOCKING]**`;
    }
    section += `\n`;
    
    if (issues.breakingChanges.total > 0) {
      section += `- **Breaking Changes:** ${issues.breakingChanges.total} total 🚨`;
      if (issues.breakingChanges.critical.length > 0 || issues.breakingChanges.high.length > 0) {
        section += ` **[BLOCKING]**`;
      }
      section += `\n`;
    }
    
    section += `- **Pre-existing Issues:** ${issues.unchanged.total} total ⚠️ **[Not blocking, but impacts scores]**\n`;
    section += `- **Files Changed:** ${filesChanged}\n`;
    section += `- **Lines Added/Removed:** +${comparison.linesAdded || 0} / -${comparison.linesRemoved || 0}\n\n`;
    
    section += `---\n\n`;
    return section;
  }

  private generateSecurityAnalysis(comparison: any, issues: any): string {
    const score = comparison.categoryScores?.security || 75;
    const grade = this.getGrade(score);
    
    let section = `## Security Analysis\n\n`;
    section += `### Score: ${score}/100 (Grade: ${grade})\n\n`;
    
    // Only show issues if they exist
    const securityIssues = issues.new.byCategory.security;
    const securityFixed = issues.resolved.byCategory.security;
    
    if (securityIssues.length > 0) {
      section += `### Security Issues Found\n`;
      securityIssues.forEach((issue: any) => {
        section += `- **${issue.severity.toUpperCase()}**: ${issue.message}`;
        if (issue.location) {
          section += ` (${issue.location.file}:${issue.location.line})`;
        }
        section += `\n`;
      });
      section += `\n`;
    }
    
    if (securityFixed.length > 0) {
      section += `### Security Improvements\n`;
      securityFixed.forEach((issue: any) => {
        section += `- ✅ Fixed: ${issue.message}\n`;
      });
      section += `\n`;
    }
    
    if (securityIssues.length === 0 && securityFixed.length === 0) {
      section += `No security issues detected in this PR.\n\n`;
    }
    
    section += `---\n\n`;
    return section;
  }

  private generatePerformanceAnalysis(comparison: any, issues: any): string {
    const score = comparison.categoryScores?.performance || 75;
    const grade = this.getGrade(score);
    
    let section = `## Performance Analysis\n\n`;
    section += `### Score: ${score}/100 (Grade: ${grade})\n\n`;
    
    const perfIssues = issues.new.byCategory.performance;
    const perfFixed = issues.resolved.byCategory.performance;
    
    if (perfIssues.length > 0) {
      section += `### Performance Issues Found\n`;
      perfIssues.forEach((issue: any) => {
        section += `- **${issue.severity.toUpperCase()}**: ${issue.message}`;
        if (issue.location) {
          section += ` (${issue.location.file}:${issue.location.line})`;
        }
        section += `\n`;
        
        // Add code snippet if available
        if (issue.metadata?.codeSnippet) {
          section += '```javascript\n';
          section += issue.metadata.codeSnippet;
          section += '\n```\n';
        }
      });
      section += `\n`;
    }
    
    if (perfFixed.length > 0) {
      section += `### Performance Improvements\n`;
      perfFixed.forEach((issue: any) => {
        section += `- ✅ Fixed: ${issue.message}\n`;
      });
      section += `\n`;
    }
    
    section += `---\n\n`;
    return section;
  }

  private generateCodeQualityAnalysis(comparison: any, issues: any): string {
    const score = comparison.categoryScores?.codeQuality || 75;
    const grade = this.getGrade(score);
    
    let section = `## Code Quality Analysis\n\n`;
    section += `### Score: ${score}/100 (Grade: ${grade})\n\n`;
    
    const qualityIssues = issues.new.byCategory.codeQuality;
    
    if (qualityIssues.length > 0) {
      section += `### Code Quality Issues\n`;
      qualityIssues.forEach((issue: any) => {
        section += `- **${issue.severity.toUpperCase()}**: ${issue.message}`;
        if (issue.location) {
          section += ` (${issue.location.file}:${issue.location.line})`;
        }
        section += `\n`;
      });
      section += `\n`;
    }
    
    // Show actual metrics
    section += `### Major Code Changes\n`;
    section += `- 📁 **${comparison.filesChanged || 0} files changed**\n`;
    section += `- 📏 **${comparison.linesChanged || 0} lines changed** `;
    section += `(+${comparison.linesAdded || 0} / -${comparison.linesRemoved || 0})\n\n`;
    
    section += `---\n\n`;
    return section;
  }

  private generateArchitectureAnalysis(comparison: any, issues: any): string {
    const score = comparison.categoryScores?.architecture || 80;
    const grade = this.getGrade(score);
    
    let section = `## Architecture Analysis\n\n`;
    section += `### Score: ${score}/100 (Grade: ${grade})\n\n`;
    
    if (issues.breakingChanges.total > 0) {
      section += `### Breaking Changes Impact\n`;
      section += `- ${issues.breakingChanges.total} breaking changes detected\n`;
      section += `- API stability impacted\n`;
      section += `- Migration required for consumers\n\n`;
    }
    
    section += `---\n\n`;
    return section;
  }

  private generateDependenciesAnalysis(comparison: any, issues: any): string {
    const score = comparison.categoryScores?.dependencies || 75;
    const grade = this.getGrade(score);
    
    let section = `## Dependencies Analysis\n\n`;
    section += `### Score: ${score}/100 (Grade: ${grade})\n\n`;
    
    const depIssues = issues.new.byCategory.dependencies;
    
    if (depIssues.length > 0) {
      section += `### Dependency Issues Found\n`;
      depIssues.forEach((issue: any) => {
        section += `- **${issue.severity.toUpperCase()}**: ${issue.message}\n`;
      });
      section += `\n`;
    }
    
    // If vulnerabilities mentioned in score, show them
    const vulnCount = comparison.aiAnalysis?.vulnerableDependencies || 0;
    if (vulnCount > 0) {
      section += `### Vulnerable Dependencies\n`;
      section += `- ${vulnCount} vulnerable dependencies detected\n`;
      section += `- Run \`npm audit\` for details\n\n`;
    }
    
    section += `---\n\n`;
    return section;
  }

  private generatePRIssuesSection(comparison: any, issues: any): string {
    if (issues.new.total === 0) {
      return '';
    }
    
    let section = `## PR Issues (NEW - MUST BE FIXED)\n\n`;
    section += `*These issues were introduced in this PR and must be resolved before merge.*\n\n`;
    
    // Group by severity
    ['critical', 'high', 'medium', 'low'].forEach(severity => {
      const severityIssues = issues.new[severity];
      if (severityIssues.length > 0) {
        const icon = severity === 'critical' ? '🚨' : 
                     severity === 'high' ? '⚠️' : 
                     severity === 'medium' ? '🟡' : '🟢';
        
        section += `### ${icon} ${this.capitalize(severity)} Issues (${severityIssues.length})\n\n`;
        
        severityIssues.forEach((issue: any, index: number) => {
          section += `#### ${issue.id || `PR-${severity.toUpperCase()}-${index + 1}`}: ${issue.message}\n`;
          
          if (issue.location) {
            section += `**File:** ${issue.location.file}:${issue.location.line}  \n`;
          }
          
          section += `**Category:** ${issue.category}  \n\n`;
          
          if (issue.metadata?.codeSnippet) {
            section += `**Problematic Code:**\n`;
            section += '```javascript\n';
            section += issue.metadata.codeSnippet;
            section += '\n```\n\n';
          }
        });
      }
    });
    
    section += `---\n\n`;
    return section;
  }

  private generateRepositoryIssuesSection(comparison: any, issues: any): string {
    if (issues.unchanged.total === 0) {
      return '';
    }
    
    let section = `## Repository Issues (Pre-existing - NOT BLOCKING)\n\n`;
    section += `*These issues exist in the main branch and don't block this PR, but impact skill scores.*\n\n`;
    
    const unchangedIssues = comparison.comparison?.unchangedIssues || comparison.unchangedIssues || [];
    
    ['high', 'medium', 'low'].forEach(severity => {
      const severityIssues = unchangedIssues.filter((i: any) => i.severity === severity);
      if (severityIssues.length > 0) {
        section += `### ${this.capitalize(severity)} Repository Issues (${severityIssues.length})\n\n`;
        
        severityIssues.forEach((issue: any, index: number) => {
          section += `#### ${issue.id || `REPO-${severity.toUpperCase()}-${index + 1}`}: ${issue.message}\n`;
          
          if (issue.location) {
            section += `**File:** ${issue.location.file}`;
            if (issue.location.line) {
              section += `:${issue.location.line}`;
            }
            section += `  \n`;
          }
          
          if (issue.age) {
            section += `**Age:** ${issue.age}  \n`;
          }
          
          section += `\n`;
        });
      }
    });
    
    section += `---\n\n`;
    return section;
  }

  private generateEducationalInsights(comparison: any, issues: any): string {
    let section = `## Educational Insights & Recommendations\n\n`;
    section += `### Learning Path Based on This PR\n\n`;
    
    // Priority 1: Breaking changes education
    if (issues.breakingChanges.total > 0) {
      section += `#### 1. API Versioning & Breaking Changes (CRITICAL)\n`;
      section += `- You introduced ${issues.breakingChanges.total} breaking changes\n`;
      section += `- Learn semantic versioning and deprecation strategies\n\n`;
    }
    
    // Priority 2: Critical/High issues education
    if (issues.new.critical.length > 0) {
      section += `#### 2. Critical Issue Prevention (URGENT)\n`;
      issues.new.critical.forEach((issue: any) => {
        section += `- ${issue.category}: ${issue.message}\n`;
      });
      section += `\n`;
    }
    
    if (issues.new.high.length > 0) {
      section += `#### 3. High Priority Issues (THIS WEEK)\n`;
      issues.new.high.forEach((issue: any) => {
        section += `- ${issue.category}: ${issue.message}\n`;
      });
      section += `\n`;
    }
    
    // Priority 3: Category-specific education
    if (issues.new.byCategory.security.length > 0) {
      section += `#### Security Best Practices\n`;
      section += `- ${issues.new.byCategory.security.length} security issues found\n`;
      section += `- Focus on: Input validation, authentication, data protection\n\n`;
    }
    
    if (issues.new.byCategory.performance.length > 0) {
      section += `#### Performance Optimization\n`;
      section += `- ${issues.new.byCategory.performance.length} performance issues found\n`;
      section += `- Study: Algorithm optimization, caching strategies, async patterns\n\n`;
    }
    
    section += `---\n\n`;
    return section;
  }

  private generateBreakingChangesSection(comparison: any): string {
    const breakingChanges = comparison.breakingChanges || [];
    if (breakingChanges.length === 0) return '';
    
    let section = `## 🚨 Breaking Changes Analysis\n\n`;
    section += `### Breaking Changes Detected: ${breakingChanges.length}\n\n`;
    
    breakingChanges.forEach((change: any, index: number) => {
      section += `#### ${index + 1}. ${change.type.toUpperCase()}: \`${change.component}\`\n`;
      section += `**Severity:** ${change.severity.toUpperCase()}  \n`;
      
      if (change.file) {
        section += `**File:** \`${change.file}\`  \n`;
      }
      
      section += `**Impact:** ${change.description}  \n\n`;
      
      if (change.before) {
        section += `**Before:**\n\`\`\`javascript\n${change.before}\n\`\`\`\n\n`;
      }
      
      if (change.after) {
        section += `**After:**\n\`\`\`javascript\n${change.after}\n\`\`\`\n\n`;
      }
      
      if (change.migrationPath) {
        section += `**Required Migration:**\n\`\`\`javascript\n${change.migrationPath}\n\`\`\`\n\n`;
      }
      
      if (change.affectedFiles && change.affectedFiles.length > 0) {
        section += `**Affected Files:**\n`;
        change.affectedFiles.forEach((file: string) => {
          section += `- \`${file}\`\n`;
        });
        section += `\n`;
      }
      
      section += `---\n\n`;
    });
    
    return section;
  }

  private generateSkillsTracking(comparison: any, issues: any): string {
    // Simplified skills tracking
    let section = `## Skills Tracking\n\n`;
    
    const previousScore = comparison.aiAnalysis?.previousScore || 75;
    const currentScore = this.calculateDeveloperScore(comparison, issues, previousScore);
    
    section += `**Previous Score:** ${previousScore}/100\n`;
    section += `**Current Score:** ${currentScore}/100\n`;
    section += `**Change:** ${currentScore >= previousScore ? '+' : ''}${currentScore - previousScore}\n\n`;
    
    section += `---\n\n`;
    return section;
  }

  private generateBusinessImpact(comparison: any, issues: any): string {
    let section = `## Business Impact Analysis\n\n`;
    
    if (issues.breakingChanges.total > 0) {
      section += `### Breaking Changes Impact\n`;
      section += `- ${issues.breakingChanges.total} breaking changes detected\n`;
      section += `- Migration effort required: ${issues.breakingChanges.total * 4} hours estimated\n`;
      section += `- Consumer services must be updated\n\n`;
    }
    
    if (issues.new.critical.length > 0 || issues.new.high.length > 0) {
      section += `### Risk Assessment\n`;
      section += `- **Immediate Risk:** ${issues.new.critical.length > 0 ? 'CRITICAL' : 'HIGH'}\n`;
      section += `- **Issues to fix:** ${issues.new.critical.length + issues.new.high.length}\n\n`;
    }
    
    section += `---\n\n`;
    return section;
  }

  private generateActionItems(comparison: any, issues: any): string {
    let section = `## Action Items & Recommendations\n\n`;
    
    // Priority 1: Breaking changes
    if (issues.breakingChanges.total > 0) {
      section += `### 🚨 Breaking Changes (IMMEDIATE)\n`;
      comparison.breakingChanges.forEach((bc: any) => {
        section += `- Fix: ${bc.component} - ${bc.description}\n`;
      });
      section += `\n`;
    }
    
    // Priority 2: Critical issues
    if (issues.new.critical.length > 0) {
      section += `### 🚨 Critical Issues (IMMEDIATE)\n`;
      issues.new.critical.forEach((issue: any) => {
        section += `- Fix: ${issue.message}\n`;
      });
      section += `\n`;
    }
    
    // Priority 3: High issues  
    if (issues.new.high.length > 0) {
      section += `### ⚠️ High Priority Issues (THIS WEEK)\n`;
      issues.new.high.forEach((issue: any) => {
        section += `- Fix: ${issue.message}\n`;
      });
      section += `\n`;
    }
    
    section += `---\n\n`;
    return section;
  }

  private generateConclusion(decision: any): string {
    let section = `## Conclusion\n\n`;
    section += `**Decision:** ${decision.decision}\n\n`;
    section += `${decision.reason}\n\n`;
    section += `---\n\n`;
    return section;
  }

  private generateScoreSummary(comparison: any): string {
    let section = `## Score Summary\n\n`;
    
    section += `| Category | Score | Grade |\n`;
    section += `|----------|-------|-------|\n`;
    
    const categories = comparison.categoryScores || {};
    Object.entries(categories).forEach(([cat, score]) => {
      section += `| ${this.capitalize(cat)} | ${score}/100 | ${this.getGrade(score as number)} |\n`;
    });
    
    section += `\n---\n\n`;
    return section;
  }

  private generateFootnotes(): string {
    let section = `## Report Footnotes\n\n`;
    section += `*Generated by CodeQual AI Analysis Platform v4.0*  \n`;
    section += `*For questions or support: support@codequal.com*\n`;
    return section;
  }

  private calculateOverallScore(comparison: any, issues: any): number {
    let score = 100;
    
    // Deduct for new issues
    score -= issues.new.critical.length * 10;
    score -= issues.new.high.length * 5;
    score -= issues.new.medium.length * 2;
    score -= issues.new.low.length * 1;
    
    // Deduct for breaking changes
    score -= issues.breakingChanges.critical.length * 10;
    score -= issues.breakingChanges.high.length * 5;
    score -= issues.breakingChanges.medium.length * 3;
    
    // Add for resolved issues
    score += issues.resolved.total * 2;
    
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private calculateDeveloperScore(comparison: any, issues: any, previousScore: number): number {
    let score = previousScore;
    
    // Penalties
    score -= issues.new.critical.length * 5;
    score -= issues.new.high.length * 3;
    score -= issues.new.medium.length * 1;
    score -= issues.breakingChanges.total * 5;
    
    // Bonuses
    score += issues.resolved.total * 2;
    
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private getGrade(score: number): string {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}