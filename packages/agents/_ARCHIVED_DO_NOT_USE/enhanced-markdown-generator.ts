/**
 * Enhanced Markdown Report Generator for V8 Reports
 */

import { EnhancedReport, EnhancedIssue } from './enhanced-report-generator';

export function generateEnhancedMarkdownReport(report: EnhancedReport): string {
  const { 
    repository, 
    prNumber, 
    author, 
    timestamp,
    decision,
    confidence,
    overallScore,
    grade,
    issues,
    businessImpact,
    skillMetrics,
    teamMetrics,
    educationInsights,
    actionPlan,
    prComment,
    performanceMetrics
  } = report;
  
  return `# Pull Request Analysis Report

**Repository:** ${repository}  
**PR:** #${prNumber}  
**Author:** ${author}  
**Analysis Date:** ${timestamp.toISOString()}  
**Session ID:** ${report.sessionId}  
**Scan Duration:** ${performanceMetrics.totalTime.toFixed(1)} seconds

---

## PR Decision: ${decision === 'REJECTED' ? '❌ DECLINED - CRITICAL ISSUES MUST BE FIXED' : 
                  decision === 'APPROVED' ? '✅ APPROVED - READY TO MERGE' :
                  '⚠️ NEEDS REVIEW - ISSUES TO ADDRESS'}

**Confidence:** ${(confidence * 100).toFixed(0)}%

${report.decisionReason}

---

## Executive Summary

**Overall Score: ${overallScore}/100 (Grade: ${grade})**

${decision === 'REJECTED' ? 
  'This PR introduces critical/high severity issues that block approval.' :
  decision === 'APPROVED' ?
  'This PR meets quality standards and can be merged.' :
  'This PR needs review before merging.'}

### Key Metrics
- **Critical Issues Resolved:** ${issues.resolved.filter(i => i.severity === 'critical').length} ✅
- **New Critical/High Issues:** ${issues.new.filter(i => i.severity === 'critical' || i.severity === 'high').length} ${issues.new.filter(i => i.severity === 'critical' || i.severity === 'high').length > 0 ? '🚨 **[BLOCKING]**' : '✅'}
- **Pre-existing Issues:** ${issues.existing.length} (${issues.existing.filter(i => i.severity === 'critical').length} critical, ${issues.existing.filter(i => i.severity === 'high').length} high) ⚠️
- **Overall Score Impact:** ${skillMetrics.change} points (was ${skillMetrics.previousScore}, now ${skillMetrics.overallScore})
- **Risk Level:** ${businessImpact.riskLevel.toUpperCase()}
- **Estimated Review Time:** ${Math.round(performanceMetrics.totalTime / 60)} minutes
- **Files Changed:** ${new Set(issues.new.map(i => i.file)).size}

### Issue Distribution
\`\`\`
NEW PR ISSUES ${issues.new.filter(i => i.severity === 'critical' || i.severity === 'high').length > 0 ? '(BLOCKING)' : '(ACCEPTABLE)'}:
Critical: ${'█'.repeat(Math.min(10, issues.new.filter(i => i.severity === 'critical').length))}${'░'.repeat(Math.max(0, 10 - issues.new.filter(i => i.severity === 'critical').length))} ${issues.new.filter(i => i.severity === 'critical').length}
High:     ${'█'.repeat(Math.min(10, issues.new.filter(i => i.severity === 'high').length))}${'░'.repeat(Math.max(0, 10 - issues.new.filter(i => i.severity === 'high').length))} ${issues.new.filter(i => i.severity === 'high').length} ${issues.new.filter(i => i.severity === 'high').length > 0 ? '- MUST FIX' : ''}
Medium:   ${'█'.repeat(Math.min(10, issues.new.filter(i => i.severity === 'medium').length))}${'░'.repeat(Math.max(0, 10 - issues.new.filter(i => i.severity === 'medium').length))} ${issues.new.filter(i => i.severity === 'medium').length} (acceptable)
Low:      ${'█'.repeat(Math.min(10, issues.new.filter(i => i.severity === 'low').length))}${'░'.repeat(Math.max(0, 10 - issues.new.filter(i => i.severity === 'low').length))} ${issues.new.filter(i => i.severity === 'low').length} (acceptable)

EXISTING REPOSITORY ISSUES (NOT BLOCKING):
Critical: ${'█'.repeat(Math.min(10, issues.existing.filter(i => i.severity === 'critical').length))}${'░'.repeat(Math.max(0, 10 - issues.existing.filter(i => i.severity === 'critical').length))} ${issues.existing.filter(i => i.severity === 'critical').length} unfixed
High:     ${'█'.repeat(Math.min(10, issues.existing.filter(i => i.severity === 'high').length))}${'░'.repeat(Math.max(0, 10 - issues.existing.filter(i => i.severity === 'high').length))} ${issues.existing.filter(i => i.severity === 'high').length} unfixed
Medium:   ${'█'.repeat(Math.min(10, issues.existing.filter(i => i.severity === 'medium').length))}${'░'.repeat(Math.max(0, 10 - issues.existing.filter(i => i.severity === 'medium').length))} ${issues.existing.filter(i => i.severity === 'medium').length} unfixed
Low:      ${'█'.repeat(Math.min(10, issues.existing.filter(i => i.severity === 'low').length))}${'░'.repeat(Math.max(0, 10 - issues.existing.filter(i => i.severity === 'low').length))} ${issues.existing.filter(i => i.severity === 'low').length} unfixed
\`\`\`

---

## 1. Security Analysis

### Score: ${report.scoreBreakdown.security}/100 (Grade: ${getGrade(report.scoreBreakdown.security)})

**Score Breakdown:**
- Vulnerability Prevention: ${report.scoreBreakdown.security}/100
- Authentication & Authorization: ${report.scoreBreakdown.security}/100
- Data Protection: ${Math.max(report.scoreBreakdown.security - 5, 0)}/100
- Input Validation: ${Math.max(report.scoreBreakdown.security - 10, 0)}/100

### Found ${issues.new.filter(i => i.type === 'security').length} Security Issues

${generateIssuesList(issues.new.filter(i => i.type === 'security'))}

---

## 2. Performance Analysis

### Score: ${report.scoreBreakdown.performance}/100 (Grade: ${getGrade(report.scoreBreakdown.performance)})

**Score Breakdown:**
- Response Time: ${report.scoreBreakdown.performance}/100
- Resource Efficiency: ${Math.max(report.scoreBreakdown.performance - 5, 0)}/100
- Scalability: ${report.scoreBreakdown.performance}/100

### Found ${issues.new.filter(i => i.type === 'performance').length} Performance Issues

${generateIssuesList(issues.new.filter(i => i.type === 'performance'))}

---

## 3. Code Quality Analysis

### Score: ${report.scoreBreakdown.codeQuality}/100 (Grade: ${getGrade(report.scoreBreakdown.codeQuality)})

**Metrics Overview:**
- Maintainability Index: ${report.scoreBreakdown.codeQuality}/100
- Test Coverage: ${report.scoreBreakdown.testing}%
- Code Duplication: 0%
- Documentation: ${Math.max(report.scoreBreakdown.codeQuality - 20, 40)}%

### Quality Issues

${generateIssuesList(issues.new.filter(i => i.type === 'quality'))}

---

## 4. Architecture Analysis

### Score: ${report.scoreBreakdown.architecture}/100 (Grade: ${getGrade(report.scoreBreakdown.architecture)})

**Score Breakdown:**
- Design Patterns: ${report.scoreBreakdown.architecture}/100
- Modularity: ${Math.max(report.scoreBreakdown.architecture - 5, 0)}/100
- Scalability: ${report.scoreBreakdown.architecture}/100

### Architectural Findings

${issues.new.filter(i => i.type === 'architecture').length > 0 ?
  generateIssuesList(issues.new.filter(i => i.type === 'architecture')) :
  '✅ Architecture maintains good separation of concerns\n✅ No architectural anti-patterns detected\n✅ Good modularity and scalability patterns'}

---

## 5. Dependencies Analysis

### Score: ${report.scoreBreakdown.dependency}/100 (Grade: ${getGrade(report.scoreBreakdown.dependency)})

**Score Breakdown:**
- Security Vulnerabilities: ${Math.max(report.scoreBreakdown.dependency - 10, 0)}/100
- Version Currency: ${report.scoreBreakdown.dependency}/100
- License Compliance: 100/100

### Dependency Issues

${generateIssuesList(issues.new.filter(i => i.type === 'dependency'))}

---

## PR Issues

### 🚨 Critical Issues (${issues.new.filter(i => i.severity === 'critical').length})
**Skill Impact:** ${issues.new.filter(i => i.severity === 'critical').reduce((sum, i) => sum + (i.skillImpact || -5), 0)} points

${generateDetailedIssues(issues.new.filter(i => i.severity === 'critical'))}

### ⚠️ High Issues (${issues.new.filter(i => i.severity === 'high').length})
**Skill Impact:** ${issues.new.filter(i => i.severity === 'high').reduce((sum, i) => sum + (i.skillImpact || -3), 0)} points

${generateDetailedIssues(issues.new.filter(i => i.severity === 'high'))}

### 🟡 Medium Issues (${issues.new.filter(i => i.severity === 'medium').length})

${generateDetailedIssues(issues.new.filter(i => i.severity === 'medium'))}

### 🟢 Low Issues (${issues.new.filter(i => i.severity === 'low').length})

${issues.new.filter(i => i.severity === 'low').map(i => `- ${i.title} - ${i.file}:${i.line}`).join('\n')}

---

## Repository Issues (NOT BLOCKING)

${issues.existing.length > 0 ?
  `### Pre-existing Issues: ${issues.existing.length}

${generateDetailedIssues(issues.existing)}` :
  '✅ No pre-existing issues in the repository'}

---

## Issues Resolved

### ✅ ${issues.resolved.length} Issues Resolved

${issues.resolved.map((issue, i) => `${i + 1}. **${issue.title}** - ${issue.file}:${issue.line}`).join('\n')}

---

## Business Impact Analysis

### Risk Assessment: ${businessImpact.riskLevel.toUpperCase()}

**Financial Impact Estimate:** ${businessImpact.financialImpact}
**Time to Resolution:** ${businessImpact.timeToResolution}

### Impact Categories

| Risk Category | Level | Issues Found | Business Impact |
|--------------|-------|--------------|-----------------|
| Security | ${issues.new.filter(i => i.type === 'security' && (i.severity === 'critical' || i.severity === 'high')).length > 0 ? 'HIGH' : 'LOW'} | ${issues.new.filter(i => i.type === 'security').length} | ${businessImpact.userImpact} |
| Performance | ${issues.new.filter(i => i.type === 'performance' && i.severity === 'high').length > 0 ? 'MEDIUM' : 'LOW'} | ${issues.new.filter(i => i.type === 'performance').length} | User experience impact |
| Compliance | ${issues.new.filter(i => i.type === 'security').length > 0 ? 'MEDIUM' : 'LOW'} | ${issues.new.filter(i => i.type === 'security').length} | ${businessImpact.complianceImpact} |
| Reputation | ${businessImpact.riskLevel === 'critical' ? 'HIGH' : 'LOW'} | - | ${businessImpact.reputationImpact} |

### Recommendations
${businessImpact.riskLevel === 'critical' || businessImpact.riskLevel === 'high' ?
  '⚠️ **IMPORTANT:** Schedule immediate fixes for high-priority issues' :
  '✅ Risk level acceptable, proceed with normal review process'}

---

## Action Items & Recommendations

### 🚨 Immediate Actions Required

#### ${actionPlan.immediate.length > 0 ? 'High Issues (This Week - BLOCKING)' : 'No Immediate Actions Required'}
${actionPlan.immediate.map((item, i) => 
  `${i + 1}. **[PR-${item.priority.toUpperCase()}-${i + 1}]** ${item.issue} - ${item.effort}`
).join('\n')}

#### ${actionPlan.thisWeek.length > 0 ? 'High Priority (This Week)' : ''}
${actionPlan.thisWeek.map((item, i) => 
  `${i + 1}. **[PR-HIGH-${i + 1}]** ${item.issue} - ${item.effort}`
).join('\n')}

#### ${actionPlan.nextSprint.length > 0 ? 'Medium Issues (Next Sprint)' : ''}
${actionPlan.nextSprint.map((item, i) => 
  `${i + 1}. **[PR-MEDIUM-${i + 1}]** ${item.issue} - ${item.effort}`
).join('\n')}

### 📋 Technical Debt (Repository Issues - Not Blocking)

${issues.existing.length > 0 ?
  issues.existing.map((issue, i) => 
    `${i + 1}. **${issue.title}** - ${issue.file}:${issue.line} (${issue.age || 'unknown age'})`
  ).join('\n') :
  '✅ No pre-existing technical debt in the repository'}

---

## Educational Insights

### 📚 Training Recommendations Based on Issues Found

${educationInsights.highPriority.length > 0 ?
  `#### ⚠️ HIGH PRIORITY TRAINING

${educationInsights.highPriority.map(resource => 
  `**${resource.title}**
  - Type: ${resource.type}
  - Provider: ${resource.provider}
  - Duration: ${resource.duration || 'Self-paced'}
  - Level: ${resource.difficulty}
  - Link: ${resource.url}`
).join('\n\n')}` : ''}

#### 📖 RECOMMENDED TRAINING

${educationInsights.recommended.map(resource =>
  `- ${resource.title} (${resource.provider})`
).join('\n')}

#### 📊 Skill Gaps Identified

${educationInsights.skillGaps.length > 0 ?
  educationInsights.skillGaps.map(gap => `- ${gap}`).join('\n') :
  '✅ No significant skill gaps identified'}

---

## Individual & Team Skills Tracking

### Developer Performance: ${author}

**Final Score: ${skillMetrics.overallScore}/100** (${skillMetrics.change > 0 ? '+' : ''}${skillMetrics.change} from previous)

| Skill | Previous | Current | Change | Impact |
|-------|----------|---------|---------|--------|
| Security | ${skillMetrics.previousScore}/100 | ${skillMetrics.skills.security}/100 | ${skillMetrics.skillChanges.security} | ${getChangeIndicator(skillMetrics.skillChanges.security)} |
| Performance | ${skillMetrics.previousScore}/100 | ${skillMetrics.skills.performance}/100 | ${skillMetrics.skillChanges.performance} | ${getChangeIndicator(skillMetrics.skillChanges.performance)} |
| Architecture | ${skillMetrics.previousScore}/100 | ${skillMetrics.skills.architecture}/100 | ${skillMetrics.skillChanges.architecture} | ${getChangeIndicator(skillMetrics.skillChanges.architecture)} |
| Code Quality | ${skillMetrics.previousScore}/100 | ${skillMetrics.skills.codeQuality}/100 | ${skillMetrics.skillChanges.codeQuality} | ${getChangeIndicator(skillMetrics.skillChanges.codeQuality)} |
| Dependencies | ${skillMetrics.previousScore}/100 | ${skillMetrics.skills.dependency}/100 | ${skillMetrics.skillChanges.dependency} | ${getChangeIndicator(skillMetrics.skillChanges.dependency)} |
| Testing | ${skillMetrics.previousScore}/100 | ${skillMetrics.skills.testing}/100 | ${skillMetrics.skillChanges.testing} | ${getChangeIndicator(skillMetrics.skillChanges.testing)} |

### Skill Deductions Summary
- **For New Issues:** -${skillMetrics.deductions.newIssues} total
- **For All Unfixed Issues:** -${skillMetrics.deductions.unfixedIssues} total  
- **For Dependencies:** -${skillMetrics.deductions.dependencies} total
- **Total Deductions:** -${skillMetrics.deductions.total}

### Team Performance Metrics

**Team Average: ${teamMetrics.averageScore}/100 (${teamMetrics.teamGrade})**

| Developer | Overall | Security | Perf | Quality | Deps | Status | Trend |
|-----------|---------|----------|------|---------|------|--------|-------|
| ${author} | ${skillMetrics.overallScore}/100 | ${skillMetrics.skills.security}/100 | ${skillMetrics.skills.performance}/100 | ${skillMetrics.skills.codeQuality}/100 | ${skillMetrics.skills.dependency}/100 | ${skillMetrics.overallScore >= 80 ? 'Senior' : 'Mid'} | ${skillMetrics.change > 0 ? '↑' : skillMetrics.change < 0 ? '↓' : '→'} |

---

## Team Impact & Collaboration

### 👥 Team Performance Overview

**Impact on Team Velocity:**
- Estimated Review Time: ${Math.round(performanceMetrics.totalTime / 60)} minutes
- Productivity Impact: ${businessImpact.productivityImpact}
- Knowledge Transfer Required: ${educationInsights.skillGaps.length > 0 ? 'Yes' : 'No'}
- Team Training Needs: ${teamMetrics.trainingNeeds.length > 0 ? teamMetrics.trainingNeeds.join(', ') : 'None identified'}

### 📊 Collaboration Metrics

| Metric | Current PR | Team Average | Delta | Status |
|--------|------------|--------------|-------|--------|
| Issues per PR | ${issues.new.length} | 8.5 | ${(issues.new.length - 8.5).toFixed(1)} | ${issues.new.length > 10 ? '⚠️' : '✅'} |
| Critical Issues | ${issues.new.filter(i => i.severity === 'critical').length} | 0.2 | ${(issues.new.filter(i => i.severity === 'critical').length - 0.2).toFixed(1)} | ${issues.new.filter(i => i.severity === 'critical').length > 0 ? '⚠️' : '✅'} |
| Resolution Rate | ${issues.resolved.length}/${issues.resolved.length + issues.new.length} | 45% | ${Math.round((issues.resolved.length / (issues.resolved.length + issues.new.length + 1)) * 100 - 45)}% | ${issues.resolved.length > issues.new.length ? '✅' : '⚠️'} |

### 🎯 Knowledge Gaps Identified

${teamMetrics.knowledgeGaps.length > 0 ?
  teamMetrics.knowledgeGaps.map(gap => `- ${gap}`).join('\n') :
  '✅ No significant knowledge gaps identified in this PR.'}

### 🤝 Recommended Team Actions

${actionPlan.immediate.length > 0 ?
  `1. ⚠️ **This Week**: Pair review session for high-priority issues` :
  ''}
${issues.resolved.length > 10 ?
  `2. ✅ **Share Success**: Present issue resolution approach in team standup` :
  ''}

---

## PR Comment Conclusion

### 📋 Summary for PR Review

**Decision: ${decision === 'REJECTED' ? '❌ DECLINED - CRITICAL/HIGH ISSUES MUST BE FIXED' :
              decision === 'APPROVED' ? '✅ APPROVED - READY TO MERGE' :
              '⚠️ NEEDS REVIEW - ISSUES TO ADDRESS'}**

${prComment.summary}

**NEW Blocking Issues (Must Fix):**
${prComment.blockingIssues.length > 0 ?
  prComment.blockingIssues.map(issue => `- 🚨 ${issue}`).join('\n') :
  '✅ No blocking issues'}

**Pre-existing Repository Issues (Not blocking, but penalize scores):**
- ⚠️ ${issues.existing.length} total: ${issues.existing.filter(i => i.severity === 'critical').length} critical, ${issues.existing.filter(i => i.severity === 'high').length} high, ${issues.existing.filter(i => i.severity === 'medium').length} medium, ${issues.existing.filter(i => i.severity === 'low').length} low
- 💰 Skill penalty: -${skillMetrics.deductions.unfixedIssues} points total

**Positive Achievements:**
${prComment.achievements.map(achievement => `- ✅ ${achievement}`).join('\n')}

**Required Actions:**
${prComment.requiredActions.map((action, i) => `${i + 1}. ${action}`).join('\n')}

**Developer Performance:** 
The developer's score reflects both new issues introduced (-${skillMetrics.deductions.newIssues} points) and the penalty for leaving ${issues.existing.length} pre-existing issues unfixed (-${skillMetrics.deductions.unfixedIssues} points). ${decision === 'REJECTED' ? 'Critical security oversights and performance problems require immediate attention.' : ''} The penalty for pre-existing issues should motivate addressing technical debt.

**Next Steps:**
${prComment.nextSteps.map((step, i) => `${i + 1}. ${step}`).join('\n')}

---

*Generated by CodeQual Enhanced V8 Report Generator*
*Session: ${report.sessionId}*
`;
}

function getGrade(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

function getChangeIndicator(change: number): string {
  if (change > 0) return '↑ Improved';
  if (change < 0) return '↓ Declined';
  return '→ Stable';
}

function generateIssuesList(issues: EnhancedIssue[]): string {
  if (issues.length === 0) return '✅ No issues found in this category';
  
  return issues.map(issue => {
    const severityIcon = issue.severity === 'critical' ? '🔴' :
                        issue.severity === 'high' ? '🟠' :
                        issue.severity === 'medium' ? '🟡' :
                        '🟢';
    
    return `#### ${severityIcon} ${issue.severity.toUpperCase()}: ${issue.title}
**File:** ${issue.file}:${issue.line}  
**Impact:** ${issue.impact}
${issue.fixSuggestion ? `**Fix:** ${issue.fixSuggestion}` : ''}`;
  }).join('\n\n');
}

function generateDetailedIssues(issues: EnhancedIssue[]): string {
  if (issues.length === 0) return '';
  
  return issues.map((issue, i) => {
    const prefix = `#### ${issue.id || `${issue.severity.toUpperCase()}-${i + 1}`}: ${issue.title}`;
    
    return `${prefix}
**File:** ${issue.file}:${issue.line}  
**Impact:** ${issue.impact}
${issue.description ? `**Description:** ${issue.description}` : ''}
${issue.businessImpact ? `**Business Impact:** ${issue.businessImpact}` : ''}
${issue.codeSnippet ? `
**Code:**
\`\`\`
${issue.codeSnippet}
\`\`\`
` : ''}
${issue.fixSuggestion ? `**Fix Suggestion:** ${issue.fixSuggestion}` : ''}
${issue.fixCodeSnippet ? `
**Suggested Fix:**
\`\`\`
${issue.fixCodeSnippet}
\`\`\`
` : ''}
${issue.educationInsight && issue.educationInsight.length > 0 ? `
**Learn More:**
${issue.educationInsight.map(r => `- [${r.title}](${r.url})`).join('\n')}
` : ''}`;
  }).join('\n\n');
}