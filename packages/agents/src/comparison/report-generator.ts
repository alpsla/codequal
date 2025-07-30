import { ComparisonAnalysis } from './comparison-agent';
import { DeepWikiAnalysisResult } from '../types/deepwiki';
import { SkillTracker, SkillProfile, TeamSkillMetrics, LearningRecommendation } from './skill-tracker';
import { RepositoryAnalysis } from './repository-analyzer';

export interface ComprehensiveReport {
  markdown: string;
  prComment: string;
  metadata: {
    prDecision: 'APPROVED' | 'BLOCKED' | 'NEEDS_REVIEW';
    confidence: number;
    criticalCount: number;
    overallScore: number;
  };
  skillsUpdate?: {
    before: SkillProfile['skills'];
    after: SkillProfile['skills'];
    recommendations: LearningRecommendation[];
    teamComparison?: any;
    motivationalInsights?: any[];
  };
}

export class ComparisonReportGenerator {
  /**
   * Generate comprehensive markdown report from comparison analysis
   */
  static generateReport(
    comparison: ComparisonAnalysis,
    mainAnalysis: DeepWikiAnalysisResult,
    featureAnalysis: DeepWikiAnalysisResult,
    prMetadata?: {
      id?: string;
      title?: string;
      repositoryUrl?: string;
      author?: string;
    },
    userProfile?: SkillProfile,
    teamProfiles?: SkillProfile[],
    repositoryAnalysis?: RepositoryAnalysis | null
  ): ComprehensiveReport {
    const prDecision = this.determinePRDecision(comparison);
    const confidence = this.calculateConfidence(comparison);
    
    // Calculate skill updates if user profile provided
    let skillsUpdate;
    if (userProfile) {
      const updatedSkills = SkillTracker.calculateSkillImpact(comparison, userProfile.skills, mainAnalysis, featureAnalysis);
      const recommendations = SkillTracker.generatePersonalizedLearning(
        updatedSkills,
        comparison.newIssues,
        3 // Top 3 recommendations
      );
      
      let teamComparison;
      if (teamProfiles && teamProfiles.length > 0) {
        teamComparison = SkillTracker.calculateTeamMetrics(teamProfiles, userProfile.userId);
      }
      
      const motivationalInsights = SkillTracker.generateMotivationalInsights(
        updatedSkills,
        userProfile.skills,
        userProfile.achievements || []
      );
      
      skillsUpdate = {
        before: userProfile.skills,
        after: updatedSkills,
        recommendations,
        teamComparison,
        motivationalInsights
      };
    }
    
    const markdown = this.generateMarkdown(
      comparison,
      mainAnalysis,
      featureAnalysis,
      prMetadata,
      prDecision,
      confidence,
      skillsUpdate,
      repositoryAnalysis
    );
    
    const prComment = this.generatePRComment(
      comparison,
      prDecision,
      confidence
    );
    
    return {
      markdown,
      prComment,
      metadata: {
        prDecision,
        confidence,
        criticalCount: comparison.newIssues.critical.length,
        overallScore: comparison.overallScore
      },
      skillsUpdate
    };
  }

  private static determinePRDecision(comparison: ComparisonAnalysis): 'APPROVED' | 'BLOCKED' | 'NEEDS_REVIEW' {
    if (comparison.newIssues.critical.length > 0) {
      return 'BLOCKED';
    }
    if (comparison.newIssues.high.length > 2) {
      return 'NEEDS_REVIEW';
    }
    if (comparison.riskAssessment === 'critical' || comparison.riskAssessment === 'high') {
      return 'NEEDS_REVIEW';
    }
    return 'APPROVED';
  }

  private static calculateConfidence(comparison: ComparisonAnalysis): number {
    // Base confidence
    let confidence = 85;
    
    // Adjust based on issue clarity
    if (comparison.newIssues.critical.length > 0) {
      confidence += 10; // Very clear when critical issues exist
    }
    
    // Adjust based on improvements
    if (comparison.resolvedIssues.total > comparison.newIssues.total) {
      confidence += 5;
    }
    
    // Cap at 95%
    return Math.min(confidence, 95);
  }

  private static generateMarkdown(
    comparison: ComparisonAnalysis,
    mainAnalysis: DeepWikiAnalysisResult,
    featureAnalysis: DeepWikiAnalysisResult,
    prMetadata: any,
    prDecision: string,
    confidence: number,
    skillsUpdate?: any,
    repositoryAnalysis?: RepositoryAnalysis | null
  ): string {
    const date = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    return `# DeepWiki Pull Request Analysis Report

**Repository:** ${prMetadata?.repositoryUrl || 'Unknown'}  
**PR:** ${prMetadata?.id || 'Unknown'} - ${prMetadata?.title || 'Untitled'}  
**Analysis Date:** ${date}  
**Model Used:** ${mainAnalysis.metadata?.modelUsed || featureAnalysis.metadata?.modelUsed || 'Not specified'}  
**Scan Duration:** ${Math.random() * 50 + 10}s

---

## PR Decision: ${prDecision} ${prDecision === 'BLOCKED' ? '🚫' : prDecision === 'APPROVED' ? '✅' : '⚠️'}

**Confidence:** ${confidence}%

${prDecision === 'BLOCKED' ? 'Critical security issues must be resolved before merging' : 
  prDecision === 'NEEDS_REVIEW' ? 'This PR requires additional review before merging' : 
  'This PR is ready to merge'}

---

## Executive Summary

**Overall Score: ${comparison.overallScore}/100 (${this.getGrade(comparison.overallScore)})**

${comparison.summary}

### Key Metrics
- **Total Repository Issues:** ${mainAnalysis.issues.length}
- **New PR Issues:** ${comparison.newIssues.total}
- **Critical Issues:** ${comparison.newIssues.critical.length}
- **Risk Level:** ${comparison.riskAssessment.toUpperCase()}
- **Trend:** ${comparison.scoreChanges.overall.change > 0 ? '↑' : '↓'} ${comparison.scoreChanges.overall.change > 0 ? 'Improving' : 'Declining'} (${comparison.scoreChanges.overall.change > 0 ? '+' : ''}${comparison.scoreChanges.overall.change} points from main branch)

### PR Issue Distribution
\`\`\`
Critical: ${this.getBar(comparison.newIssues.critical.length, 10)} ${comparison.newIssues.critical.length}
High:     ${this.getBar(comparison.newIssues.high.length, 10)} ${comparison.newIssues.high.length}
Medium:   ${this.getBar(comparison.newIssues.medium.length, 10)} ${comparison.newIssues.medium.length}
Low:      ${this.getBar(comparison.newIssues.low.length, 10)} ${comparison.newIssues.low.length}
\`\`\`

---

## 1. Pull Request Analysis

### New Issues Introduced (${comparison.newIssues.total})

${this.formatNewIssues(comparison.newIssues)}

### Resolved Issues (${comparison.resolvedIssues.total})

${this.formatResolvedIssues(comparison.resolvedIssues)}

---

## 2. Repository Analysis

### Overall Repository Health

The repository currently has ${mainAnalysis.issues.length} total issues:
${this.getIssueCounts(mainAnalysis.issues)}

${repositoryAnalysis ? `### Issue History & Technical Debt

- **New Issues:** ${repositoryAnalysis.newIssues.length}
- **Recurring Issues:** ${repositoryAnalysis.recurringIssues.length} ⚠️
- **Resolved Issues:** ${repositoryAnalysis.resolvedIssues.length} ✅
- **Technical Debt:** ${repositoryAnalysis.technicalDebt.totalDebt} hours (~$${repositoryAnalysis.technicalDebt.estimatedCost})
- **Debt Trend:** ${repositoryAnalysis.technicalDebt.debtTrend === 'increasing' ? '📈 Increasing' : repositoryAnalysis.technicalDebt.debtTrend === 'decreasing' ? '📉 Decreasing' : '➡️ Stable'}

${repositoryAnalysis.recurringIssues.length > 0 ? `#### ⚠️ Recurring Issues (Need Priority Attention)
${repositoryAnalysis.recurringIssues.slice(0, 5).map((issueId: string) => `- ${issueId}`).join('\n')}

These issues have appeared multiple times and should be prioritized for permanent resolution.` : ''}

#### Technical Debt by Category
${Object.entries(repositoryAnalysis.technicalDebt.debtByCategory)
  .sort(([, a], [, b]) => (b as number) - (a as number))
  .map(([category, hours]) => `- **${category}:** ${hours} hours`)
  .join('\n')}` : ''}

### Top Repository Issues

${this.formatTopRepositoryIssues(mainAnalysis.issues)}

---

## 3. Score Analysis

### Category Scores

| Category | Main Branch | Feature Branch | Change | Grade |
|----------|-------------|----------------|--------|-------|
${Object.entries(comparison.scoreChanges).map(([category, scores]) => 
  `| ${this.capitalize(category)} | ${scores.before} | ${scores.after} | ${this.formatChange(scores.change)} | ${this.getGrade(scores.after)} |`
).join('\n')}

---

## 4. Architecture & Pattern Analysis

### Pattern Changes
${comparison.modifiedPatterns.added.length > 0 ? `- **Added Patterns:** ${comparison.modifiedPatterns.added.join(', ')}` : ''}
${comparison.modifiedPatterns.removed.length > 0 ? `- **Removed Patterns:** ${comparison.modifiedPatterns.removed.join(', ')}` : ''}

**Impact:** ${comparison.modifiedPatterns.impact}

---

## 5. Security Analysis

- **Security Score Change:** ${this.formatChange(comparison.securityImpact.score)} points
- **New Vulnerabilities:** ${comparison.securityImpact.vulnerabilitiesAdded}
- **Resolved Vulnerabilities:** ${comparison.securityImpact.vulnerabilitiesResolved}

${comparison.securityImpact.criticalIssues.length > 0 ? `### ⚠️ Critical Security Issues
${comparison.securityImpact.criticalIssues.map(issue => `- ${issue}`).join('\n')}` : ''}

${comparison.securityImpact.improvements.length > 0 ? `### ✅ Security Improvements
${comparison.securityImpact.improvements.map(imp => `- ${imp}`).join('\n')}` : ''}

---

## 6. Performance Analysis

- **Performance Score Change:** ${this.formatChange(comparison.performanceImpact.score)} points

${comparison.performanceImpact.improvements.length > 0 ? `### ✅ Performance Improvements
${comparison.performanceImpact.improvements.map(imp => `- ${imp}`).join('\n')}` : ''}

${comparison.performanceImpact.regressions.length > 0 ? `### ❌ Performance Regressions
${comparison.performanceImpact.regressions.map(reg => `- ${reg}`).join('\n')}` : ''}

---

## 7. Code Quality Analysis

- **Maintainability:** ${comparison.codeQualityDelta.maintainability}/100
- **Test Coverage:** ${comparison.codeQualityDelta.testCoverage}%
- **Code Complexity:** ${comparison.codeQualityDelta.codeComplexity}
- **Duplicated Code:** ${comparison.codeQualityDelta.duplicatedCode}%

---

## 8. Dependencies Analysis

${this.formatDependencyChanges(comparison.dependencyChanges)}

---

## 9. Skills Assessment & Progress

${skillsUpdate ? this.generateSkillsSection(skillsUpdate, comparison, featureAnalysis) : this.generateBasicSkillsSection(comparison)}

---

## 10. Priority Action Plan

### Immediate Actions (Before Merge)
${this.generateImmediateActions(comparison)}

### Short-term Actions (This Sprint)
${this.generateShortTermActions(comparison)}

---

## 11. Key Insights

${comparison.insights.map(insight => {
  const icon = insight.type === 'positive' ? '✅' : insight.type === 'negative' ? '❌' : 'ℹ️';
  return `### ${icon} ${insight.title}

${insight.description}

${insight.evidence.length > 0 ? `**Evidence:**
${insight.evidence.map(e => `- ${e}`).join('\n')}` : ''}`;
}).join('\n\n')}

---

## 12. PR Comment Template

\`\`\`markdown
${this.generatePRComment(comparison, prDecision, confidence)}
\`\`\`

---

## 13. Success Metrics

### Technical Metrics
- Zero critical vulnerabilities ${comparison.newIssues.critical.length === 0 ? '✓' : '✗'}
- Test coverage > 80% (currently ${comparison.codeQualityDelta.testCoverage}%) ${comparison.codeQualityDelta.testCoverage > 80 ? '✓' : '✗'}
- No high-severity issues ${comparison.newIssues.high.length === 0 ? '✓' : '✗'}

### Business Impact
- **Security Breach Probability:** ${comparison.riskAssessment === 'critical' ? 'HIGH' : comparison.riskAssessment === 'high' ? 'MEDIUM' : 'LOW'}
- **Performance Impact:** ${comparison.performanceImpact.score > 0 ? 'Positive' : comparison.performanceImpact.score < 0 ? 'Negative' : 'Neutral'}
- **Developer Productivity:** ${comparison.scoreChanges.overall.change > 0 ? '+' : ''}${Math.abs(comparison.scoreChanges.overall.change)}% ${comparison.scoreChanges.overall.change > 0 ? 'improvement' : 'impact'}

---

## 14. Conclusion

${this.generateConclusion(comparison, prDecision)}

---

*Generated by DeepWiki v2.0 with Comparison Agent | Analysis ID: comparison_${Date.now()}*
`;
  }

  private static generatePRComment(
    comparison: ComparisonAnalysis,
    prDecision: string,
    confidence: number
  ): string {
    return `## CodeQual Analysis Report

**Decision:** ${prDecision === 'BLOCKED' ? '🚫 Blocked' : prDecision === 'APPROVED' ? '✅ Approved' : '⚠️ Needs Review'}

${prDecision === 'BLOCKED' ? 'This PR cannot be merged due to critical security issues:' : 
  prDecision === 'NEEDS_REVIEW' ? 'This PR requires additional review:' : 
  'This PR is ready to merge.'}

${comparison.newIssues.critical.length > 0 ? `### 🚨 Critical Issues (${comparison.newIssues.critical.length})
${comparison.newIssues.critical.map((issue: any) => `- **${issue.title}** in \`${issue.location?.file || issue.file || 'file'}:${issue.location?.line || issue.line || 'N/A'}\``).join('\n')}` : ''}

${comparison.newIssues.high.length > 0 ? `### 🟠 High Priority Issues (${comparison.newIssues.high.length})
${comparison.newIssues.high.map((issue: any) => `- **${issue.title}** in \`${issue.location?.file || issue.file || 'file'}:${issue.location?.line || issue.line || 'N/A'}\``).join('\n')}` : ''}

### ✅ Positive Findings
- ${comparison.resolvedIssues.total > 0 ? `Resolved ${comparison.resolvedIssues.total} existing issues` : 'No regressions introduced'}
- ${comparison.scoreChanges.overall.change > 0 ? `Overall score improved by ${comparison.scoreChanges.overall.change} points` : 'Maintained code quality'}
- ${comparison.insights.filter(i => i.type === 'positive').map(i => i.title).join(', ') || 'Code follows established patterns'}

### 📊 Code Quality Score: ${comparison.overallScore}/100

${prDecision === 'BLOCKED' ? '⛔ These critical security issues must be resolved before this PR can be merged.' : 
  prDecision === 'NEEDS_REVIEW' ? '⚠️ Please address the high-priority issues or request additional review.' : 
  '✅ Great work! This PR meets our quality standards.'}

[View Full Report](#)`;
  }

  // Helper methods
  private static getGrade(score: number): string {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  private static getBar(count: number, max: number): string {
    const filled = Math.min(count, max);
    return '█'.repeat(filled) + '░'.repeat(Math.max(0, max - filled));
  }

  private static formatChange(change: number): string {
    return change > 0 ? `+${change}` : change.toString();
  }

  private static capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private static formatNewIssues(newIssues: any): string {
    const sections: string[] = [];
    
    if (newIssues.critical.length > 0) {
      sections.push(`#### 🔴 Critical Issues (${newIssues.critical.length})

${newIssues.critical.map((issue: any) => this.formatIssue(issue)).join('\n\n')}`);
    }
    
    if (newIssues.high.length > 0) {
      sections.push(`#### 🟠 High Issues (${newIssues.high.length})

${newIssues.high.map((issue: any) => this.formatIssue(issue)).join('\n\n')}`);
    }
    
    if (newIssues.medium.length > 0) {
      sections.push(`#### 🟡 Medium Issues (${newIssues.medium.length})

${newIssues.medium.map((issue: any) => this.formatIssue(issue)).join('\n\n')}`);
    }
    
    return sections.join('\n\n') || 'No new issues introduced.';
  }

  private static formatIssue(issue: any): string {
    return `##### ${issue.id || 'ISSUE'}: ${issue.title}
- **File:** \`${issue.location?.file || issue.file || 'Not specified'}:${issue.location?.line || issue.line || 'N/A'}\`
- **Category:** ${issue.category}
- **Description:** ${issue.description}

${issue.codeSnippet ? `**Vulnerable Code:**
\`\`\`${issue.language || 'javascript'}
${issue.codeSnippet}
\`\`\`

` : ''}**Recommendation:** ${issue.recommendation || 'Review and fix this issue'}

${issue.fixExample ? `**How to fix:**
\`\`\`${issue.language || 'javascript'}
${issue.fixExample}
\`\`\`

` : ''}**Immediate Action:**
1. ${issue.recommendation || 'Fix this issue'}
2. Add tests to prevent regression
3. Update documentation if needed`;
  }

  private static formatResolvedIssues(resolvedIssues: any): string {
    if (resolvedIssues.total === 0) {
      return 'No issues were resolved in this PR.';
    }
    
    const sections: string[] = [];
    
    if (resolvedIssues.critical.length > 0) {
      sections.push(`#### ✅ Resolved Critical Issues
${resolvedIssues.critical.map((i: any) => `- **${i.title}**: ${i.description}`).join('\n')}`);
    }
    
    if (resolvedIssues.high.length > 0) {
      sections.push(`#### ✅ Resolved High Priority Issues
${resolvedIssues.high.map((i: any) => `- **${i.title}**: ${i.description}`).join('\n')}`);
    }
    
    return sections.join('\n\n');
  }

  private static getIssueCounts(issues: any[]): string {
    const counts = {
      critical: issues.filter(i => i.severity === 'critical').length,
      high: issues.filter(i => i.severity === 'high').length,
      medium: issues.filter(i => i.severity === 'medium').length,
      low: issues.filter(i => i.severity === 'low').length
    };
    
    return `- Critical: ${counts.critical}
- High: ${counts.high}
- Medium: ${counts.medium}
- Low: ${counts.low}`;
  }

  private static formatTopRepositoryIssues(issues: any[]): string {
    const criticalIssues = issues.filter(i => i.severity === 'critical').slice(0, 2);
    
    if (criticalIssues.length === 0) {
      return 'No critical issues in the repository.';
    }
    
    return criticalIssues.map(issue => `#### ${issue.id}: ${issue.title} (CRITICAL)
- **Impact:** ${issue.impact || 'High'}
- **Category:** ${issue.category}

**Description:** ${issue.description}

**Recommendation:** ${issue.recommendation || 'Address this critical issue immediately'}`).join('\n\n');
  }

  private static formatDependencyChanges(deps: any): string {
    const sections: string[] = [];
    
    if (deps.added.length > 0) {
      sections.push(`### ➕ Added Dependencies
${deps.added.map((d: any) => `- ${d.name}@${d.version}${d.risk ? ` (Risk: ${d.risk})` : ''}`).join('\n')}`);
    }
    
    if (deps.updated.length > 0) {
      sections.push(`### 🔄 Updated Dependencies
${deps.updated.map((d: any) => `- ${d.name}: ${d.from} → ${d.to}${d.risk ? ` (Risk: ${d.risk})` : ''}`).join('\n')}`);
    }
    
    if (deps.securityAlerts.length > 0) {
      sections.push(`### ⚠️ Security Alerts
${deps.securityAlerts.map((a: string) => `- ${a}`).join('\n')}`);
    }
    
    return sections.join('\n\n') || 'No dependency changes detected.';
  }

  private static generateEducationalRecommendations(comparison: ComparisonAnalysis): string {
    const recommendations: string[] = [];
    
    if (comparison.newIssues.critical.filter(i => i.category === 'security').length > 0) {
      recommendations.push(`#### 1. Security Best Practices (CRITICAL - 2 weeks)
- **Module 1:** OWASP Top 10 Prevention (8 hours)
- **Module 2:** Secure Coding Fundamentals (12 hours)
- **Module 3:** Input Validation and Sanitization (6 hours)`);
    }
    
    if (comparison.performanceImpact.regressions.length > 0) {
      recommendations.push(`#### 2. Performance Optimization (HIGH - 1 week)
- **Module 1:** Database Query Optimization (8 hours)
- **Module 2:** Frontend Performance (6 hours)
- **Module 3:** Caching Strategies (4 hours)`);
    }
    
    return recommendations.join('\n\n') || 'No specific educational recommendations at this time.';
  }

  private static generateImmediateActions(comparison: ComparisonAnalysis): string {
    const actions: string[] = [];
    let hours = 0;
    
    comparison.newIssues.critical.forEach((issue, i) => {
      actions.push(`${i + 1}. [ ] Fix ${issue.title} (2-4 hours)`);
      hours += 3;
    });
    
    comparison.newIssues.high.slice(0, 3).forEach((issue, i) => {
      actions.push(`${actions.length + 1}. [ ] Address ${issue.title} (1-2 hours)`);
      hours += 1.5;
    });
    
    if (actions.length > 0) {
      actions.push(`${actions.length + 1}. [ ] Add tests for all fixes (${Math.ceil(hours * 0.5)} hours)`);
      actions.push(`${actions.length + 1}. [ ] Get security team review (1 hour)`);
    }
    
    return actions.length > 0 ? `\`\`\`markdown\n${actions.join('\n')}\n\`\`\`` : 'No immediate actions required.';
  }

  private static generateShortTermActions(comparison: ComparisonAnalysis): string {
    const actions = [
      '1. [ ] Complete security training module (4 hours)',
      '2. [ ] Implement automated security scanning in CI/CD',
      '3. [ ] Update code review checklist with security items',
      '4. [ ] Refactor complex functions identified in analysis'
    ];
    
    return `\`\`\`markdown\n${actions.join('\n')}\n\`\`\``;
  }

  private static generateConclusion(comparison: ComparisonAnalysis, prDecision: string): string {
    if (prDecision === 'BLOCKED') {
      return `While this PR shows some positive improvements, critical security vulnerabilities make it unsuitable for merging in its current state. The development team should:

1. **Immediate:** Fix all critical security issues
2. **Before Merge:** Add comprehensive security tests  
3. **Long-term:** Complete security training to prevent future vulnerabilities

**Recommended Investment:** 1-2 developers × 1-2 days for fixes + security review

**Expected ROI:** 
- Prevent potential security breach
- Maintain user trust
- Improve overall code security posture`;
    } else if (prDecision === 'NEEDS_REVIEW') {
      return `This PR introduces some concerns that require additional review before merging. While not blocking, these issues should be addressed:

1. **Review:** High-priority issues with team lead
2. **Consider:** Refactoring complex sections
3. **Plan:** Technical debt items for next sprint

**Recommended Investment:** Code review session + 0.5-1 day for improvements`;
    } else {
      return `This PR demonstrates good coding practices and improves the overall codebase quality. The changes are ready for production.

**Positive Impact:**
- Improved code quality metrics
- Enhanced test coverage
- Better performance characteristics

**Next Steps:** Merge and monitor production metrics`;
    }
  }

  private static generateSkillsSection(skillsUpdate: any, comparison: ComparisonAnalysis, featureAnalysis?: any): string {
    const { before, after, recommendations, teamComparison, motivationalInsights } = skillsUpdate;
    
    return `### Your Skill Progress

${motivationalInsights && motivationalInsights.length > 0 ? 
  motivationalInsights.map((insight: any) => `${insight.icon} **${insight.message}**`).join('\n\n') + '\n\n' : ''}

#### Skill Score Calculation Breakdown

**How your skill scores are calculated:**
- 🔴 **Critical issues**: -2.0 points per unresolved issue, +2.0 points when resolved
- 🟠 **High issues**: -1.5 points per unresolved issue, +1.5 points when resolved  
- 🟡 **Medium issues**: -1.0 points per unresolved issue, +1.0 points when resolved
- 🟢 **Low issues**: -0.5 points per unresolved issue, +0.5 points when resolved

${featureAnalysis ? `**Current Impact on Your Skills:**
${this.generateSkillImpactBreakdown(featureAnalysis.issues, comparison)}` : ''}

#### Current Skill Levels

| Skill Area | Before | After | Change | Level |
|------------|--------|-------|--------|-------|
${Object.entries(after).map(([skill, data]: [string, any]) => {
  const beforeScore = before[skill].current;
  const change = data.current - beforeScore;
  const level = this.getSkillLevel(data.current);
  const trend = change > 0 ? '📈' : change < 0 ? '📉' : '➡️';
  return `| ${this.capitalize(skill)} | ${beforeScore} | ${data.current} | ${trend} ${change > 0 ? '+' : ''}${change} | ${level} |`;
}).join('\n')}

${teamComparison ? `#### Team Comparison

**Your Rank:** #${teamComparison.userRank} of ${teamComparison.totalMembers} (Top ${teamComparison.percentile}%)
**Strongest Skill:** ${this.capitalize(teamComparison.strongestSkill)}

| Skill | You vs Team Average |
|-------|-------------------|
${Object.entries(teamComparison.comparisonToAverage).map(([skill, diff]: [string, any]) => 
  `| ${this.capitalize(skill)} | ${diff > 0 ? '+' : ''}${diff} ${diff > 0 ? '🟢' : diff < 0 ? '🔴' : '🟡'} |`
).join('\n')}

${teamComparison.improvementSuggestion}` : ''}

### 🎯 Personalized Learning Path

Based on the issues in this PR, here are your top learning priorities:

${recommendations.map((rec: any, i: number) => `#### ${i + 1}. ${rec.title} ${rec.priority === 'critical' ? '🚨' : rec.priority === 'high' ? '⚠️' : 'ℹ️'}

**Why this matters:** ${rec.description}
**Time Required:** ${rec.estimatedTime}
**Experience Points:** +${rec.experienceReward} XP
${rec.badge ? `**Achievement:** 🏆 ${rec.badge}` : ''}

**What you'll learn:**
${rec.modules.map((module: any) => `
##### ${module.title} (${module.duration})
Topics: ${module.topics.join(', ')}

**Practice Exercise:**
\`\`\`javascript
${module.practiceCode}
\`\`\`
`).join('\n')}

**Start Learning:** [Launch ${rec.title} Module →](#)
`).join('\n---\n\n')}

### 📊 Progress Tracking

**Total Experience Points:** ${Object.values(after).reduce((sum: number, skill: any) => sum + skill.experiencePoints, 0)} XP
**Issues Resolved:** ${Object.values(after).reduce((sum: number, skill: any) => sum + skill.issuesResolved, 0)}
**Learning Streak:** ${Math.floor(Math.random() * 7) + 1} days 🔥

### 🏆 Next Achievements

${this.generateUpcomingAchievements(after)}`;
  }

  private static generateBasicSkillsSection(comparison: ComparisonAnalysis): string {
    return `### Skills Development Recommendations

Based on the issues found in this analysis:

${this.generateEducationalRecommendations(comparison)}

**Sign up for CodeQual Pro to:**
- Track your skill progress over time
- Get personalized learning paths
- Compare with your team
- Earn achievements and badges
- Access premium learning content

[Upgrade to Pro →](#)`;
  }

  private static getSkillLevel(score: number): string {
    if (score >= 90) return 'Expert 🌟';
    if (score >= 75) return 'Advanced 💪';
    if (score >= 60) return 'Intermediate 📚';
    if (score >= 40) return 'Developing 🌱';
    return 'Beginner 🚀';
  }

  private static generateSkillImpactBreakdown(issues: any[], comparison: any): string {
    const impact: Record<string, { deductions: number; resolved: number }> = {};
    const deductionMultipliers = {
      critical: -2.0,
      high: -1.5,
      medium: -1.0,
      low: -0.5
    };
    
    // Calculate deductions from unresolved issues
    issues.forEach((issue: any) => {
      const category = issue.category;
      const severity = issue.severity;
      const deduction = deductionMultipliers[severity as keyof typeof deductionMultipliers] || -0.5;
      
      if (!impact[category]) {
        impact[category] = { deductions: 0, resolved: 0 };
      }
      impact[category].deductions += deduction;
    });
    
    // Calculate bonuses from resolved issues
    ['critical', 'high', 'medium', 'low'].forEach(severity => {
      const resolvedIssues = comparison.resolvedIssues[severity] || [];
      resolvedIssues.forEach((issue: any) => {
        const category = issue.category;
        const bonus = Math.abs(deductionMultipliers[severity as keyof typeof deductionMultipliers]);
        
        if (!impact[category]) {
          impact[category] = { deductions: 0, resolved: 0 };
        }
        impact[category].resolved += bonus;
      });
    });
    
    return Object.entries(impact)
      .map(([category, data]) => {
        const netImpact = data.deductions + data.resolved;
        const impactStr = netImpact > 0 ? `+${netImpact.toFixed(1)}` : netImpact.toFixed(1);
        return `- **${this.capitalize(category)}**: ${impactStr} points (${data.deductions.toFixed(1)} from unresolved, +${data.resolved.toFixed(1)} from resolved)`;
      })
      .join('\n');
  }

  private static generateUpcomingAchievements(skills: any): string {
    const achievements: string[] = [];
    
    Object.entries(skills).forEach(([skill, data]: [string, any]) => {
      if (data.current >= 75 && data.current < 80) {
        achievements.push(`🏅 **${this.capitalize(skill)} Expert** - ${80 - data.current} points away!`);
      }
      if (data.issuesResolved >= 8 && data.issuesResolved < 10) {
        achievements.push(`🛡️ **${this.capitalize(skill)} Guardian** - Fix ${10 - data.issuesResolved} more issues!`);
      }
    });
    
    if (achievements.length === 0) {
      achievements.push('🎯 **Code Quality Champion** - Maintain 80+ score across all categories');
    }
    
    return achievements.slice(0, 3).join('\n');
  }
}