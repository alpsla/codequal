#!/usr/bin/env npx ts-node

/**
 * V9 Second Review Report Generator
 * Simulates a PR after the developer has addressed critical issues from first review
 */

import * as fs from 'fs';
import * as path from 'path';

// Configuration for second review
const CONFIG = {
  repository: 'Apache Kafka',
  repoUrl: 'https://github.com/apache/kafka',
  prNumber: 17620,
  prAuthor: 'john.doe',
  prTitle: 'KAFKA-17620: Optimize consumer batch processing (Review 2)',
  baseBranch: 'trunk',
  prBranch: 'feature/optimize-batch',
  language: 'java',
  teamName: 'Platform Team',
  analysisDate: new Date(),
  reviewRound: 2,
  previousScore: 49.25,
  previousGrade: 'F'
};

// Updated issue data - critical issues fixed, some new minor issues found
const ISSUES_DATA = {
  // NEW issues in this revision (minor issues introduced during fixes)
  newInPR: [
    {
      id: 'QUAL-004',
      severity: 'low',
      category: 'Code Quality',
      file: 'src/main/java/kafka/consumer/BatchProcessor.java',
      line: 248,
      column: 12,
      title: 'Unused Import Statement',
      description: 'Import java.util.HashMap is not used after refactoring',
      tool: 'checkstyle',
      agent: 'QualityAnalyzer',
      confidence: 0.99
    },
    {
      id: 'BP-003',
      severity: 'low',
      category: 'Best Practices',
      file: 'src/main/java/kafka/consumer/BatchProcessor.java',
      line: 182,
      column: 8,
      title: 'Missing Null Check',
      description: 'PreparedStatement should check for null connection',
      tool: 'spotbugs',
      agent: 'BestPracticesAnalyzer',
      confidence: 0.87
    }
  ],
  
  // Existing issues in MODIFIED files (still present)
  existingInModified: [
    {
      id: 'QUAL-001',
      severity: 'medium',
      category: 'Code Quality',
      file: 'src/main/java/kafka/utils/Utils.java',
      line: 234,
      column: 4,
      title: 'High Cyclomatic Complexity',
      description: 'Method processData has complexity of 25 (threshold: 10)',
      tool: 'pmd',
      agent: 'QualityAnalyzer',
      confidence: 0.92
    },
    {
      id: 'TEST-001',
      severity: 'low',
      category: 'Testing',
      file: 'src/main/java/kafka/consumer/BatchProcessor.java',
      line: 350,
      column: 1,
      title: 'Insufficient Test Coverage',
      description: 'New method getRecordsSecurely() has only 45% test coverage',
      tool: 'jacoco',
      agent: 'TestAnalyzer',
      confidence: 0.95
    }
  ],
  
  // Existing issues in UNMODIFIED files
  existingInUnmodified: [
    {
      id: 'SEC-003',
      severity: 'medium',
      category: 'Security',
      file: 'src/main/java/kafka/network/SocketServer.java',
      line: 512,
      column: 20,
      title: 'Weak TLS Configuration',
      description: 'TLS 1.0 enabled, should use TLS 1.2+',
      tool: 'gosec',
      agent: 'SecurityAnalyzer',
      cwe: 'CWE-326',
      confidence: 0.85
    },
    {
      id: 'QUAL-002',
      severity: 'low',
      category: 'Code Quality',
      file: 'src/main/java/kafka/common/Config.java',
      line: 89,
      column: 1,
      title: 'Missing JavaDoc',
      description: 'Public method lacks documentation',
      tool: 'checkstyle',
      agent: 'QualityAnalyzer',
      confidence: 0.90
    },
    {
      id: 'BP-001',
      severity: 'low',
      category: 'Best Practices',
      file: 'src/main/java/kafka/controller/Controller.java',
      line: 456,
      column: 12,
      title: 'Empty Catch Block',
      description: 'Exception swallowed without logging',
      tool: 'errorprone',
      agent: 'BestPracticesAnalyzer',
      confidence: 0.88
    }
  ],
  
  // Issues RESOLVED since last review
  resolved: [
    {
      id: 'SEC-001',
      severity: 'critical',
      category: 'Security',
      file: 'src/main/java/kafka/consumer/BatchProcessor.java',
      line: 245,
      title: 'Fixed: SQL Injection Vulnerability',
      description: 'Now using PreparedStatement with parameterized queries',
      confidence: 0.95
    },
    {
      id: 'PERF-001',
      severity: 'high',
      category: 'Performance',
      file: 'src/main/java/kafka/consumer/BatchProcessor.java',
      line: 178,
      title: 'Fixed: N+1 Query Pattern',
      description: 'Optimized to use batch query with IN clause',
      confidence: 0.88
    },
    {
      id: 'SEC-002',
      severity: 'high',
      category: 'Security',
      file: 'src/main/java/kafka/security/AuthManager.java',
      line: 67,
      title: 'Fixed: Hardcoded Credentials',
      description: 'Credentials now loaded from environment variables',
      confidence: 0.99
    }
  ]
};

// Code snippets for active issues
const CODE_SNIPPETS: { [key: string]: any } = {
  'QUAL-004': {
    before: 'import java.util.HashMap;',
    issue:  'import java.util.LinkedList; // Other imports',
    after:  'import java.sql.PreparedStatement;',
    fix: {
      before: '// Remove unused import',
      issue:  'import java.util.LinkedList; // Other imports',
      after:  'import java.sql.PreparedStatement;'
    }
  },
  'BP-003': {
    before: '    public List<Record> getRecordsSecurely(String userId) {',
    issue:  '        PreparedStatement stmt = conn.prepareStatement(QUERY);',
    after:  '        stmt.setString(1, userId);',
    fix: {
      before: '    public List<Record> getRecordsSecurely(String userId) {',
      issue:  '        if (conn == null) throw new IllegalStateException("No connection");',
      after:  '        PreparedStatement stmt = conn.prepareStatement(QUERY);'
    }
  },
  'QUAL-001': {
    before: '    public Result processData(Input input) {',
    issue:  '        // 200 lines of nested if-else statements',
    after:  '        return result;',
    fix: {
      before: '    public Result processData(Input input) {',
      issue:  '        return processWithStrategy(input, getStrategy(input.type));',
      after:  '    }'
    }
  },
  'TEST-001': {
    before: '    @Test',
    issue:  '    public void testGetRecordsSecurely_happyPath() {',
    after:  '        // Only tests happy path',
    fix: {
      before: '    @Test',
      issue:  '    public void testGetRecordsSecurely_withNullConnection() {',
      after:  '        // Add edge case tests'
    }
  }
};

function generateDecision(): { decision: string; emoji: string; reason: string } {
  const hasNewCritical = ISSUES_DATA.newInPR.some(i => i.severity === 'critical');
  const hasNewHigh = ISSUES_DATA.newInPR.some(i => i.severity === 'high');
  const hasModifiedCritical = ISSUES_DATA.existingInModified.some(i => i.severity === 'critical');
  const hasModifiedHigh = ISSUES_DATA.existingInModified.some(i => i.severity === 'high');
  
  if (hasNewCritical || hasModifiedCritical) {
    return {
      decision: 'DECLINED',
      emoji: '❌',
      reason: 'Critical issues must be fixed before merging'
    };
  }
  
  if (hasNewHigh || hasModifiedHigh) {
    return {
      decision: 'CHANGES REQUESTED',
      emoji: '🔄',
      reason: 'High-severity issues require attention'
    };
  }
  
  const totalNewIssues = ISSUES_DATA.newInPR.length;
  if (totalNewIssues > 5) {
    return {
      decision: 'REVIEW REQUIRED',
      emoji: '⚠️',
      reason: 'Multiple new issues need review'
    };
  }
  
  return {
    decision: 'APPROVED',
    emoji: '✅',
    reason: 'All critical issues resolved. Minor issues can be addressed in follow-up tickets'
  };
}

function calculateScore(): { score: number; grade: string; confidence: number } {
  const weights = {
    critical: 25,
    high: 15,
    medium: 8,
    low: 3
  };
  
  let deductions = 0;
  
  // New issues have full weight
  ISSUES_DATA.newInPR.forEach(issue => {
    deductions += weights[issue.severity as keyof typeof weights] || 0;
  });
  
  // Modified file issues have 75% weight
  ISSUES_DATA.existingInModified.forEach(issue => {
    deductions += (weights[issue.severity as keyof typeof weights] || 0) * 0.75;
  });
  
  // Unmodified file issues have 25% weight
  ISSUES_DATA.existingInUnmodified.forEach(issue => {
    deductions += (weights[issue.severity as keyof typeof weights] || 0) * 0.25;
  });
  
  // Bonus for resolved issues
  const resolvedBonus = ISSUES_DATA.resolved.length * 8; // Higher bonus for fixing critical issues
  
  const score = Math.max(0, Math.min(100, 100 - deductions + resolvedBonus));
  const grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';
  
  // Calculate confidence
  const allIssues = [...ISSUES_DATA.newInPR, ...ISSUES_DATA.existingInModified, ...ISSUES_DATA.existingInUnmodified];
  const avgConfidence = allIssues.reduce((sum, i) => sum + (i.confidence || 0.9), 0) / allIssues.length;
  
  return { score, grade, confidence: avgConfidence };
}

function generatePersonalizedComment(author: string, teamName: string): string {
  const { decision, emoji } = generateDecision();
  const { score, grade } = calculateScore();
  const resolvedCount = ISSUES_DATA.resolved.length;
  const improvement = score - CONFIG.previousScore;
  
  let greeting = '';
  let feedback = '';
  let encouragement = '';
  
  greeting = `Excellent progress @${author}! 🎯`;
  feedback = `You've successfully fixed all ${resolvedCount} critical issues from the previous review.`;
  encouragement = `Your code quality improved by ${improvement.toFixed(1)} points (${CONFIG.previousGrade} → ${grade}).`;
  
  return `${greeting}

${feedback} ${encouragement}

Your current quality score is **${score.toFixed(1)}/100 (${grade})**.

Great job addressing the security vulnerabilities and performance issues! The remaining items are minor and won't block merging.

---

## ${emoji} PR Decision: **${decision}**`;
}

function formatIssueWithSnippets(issue: any, snippets: any): string {
  const locationStr = issue.column 
    ? `\`${issue.file}:${issue.line}:${issue.column}\``
    : `\`${issue.file}:${issue.line}\``;
    
  const snippet = snippets[issue.id];
  
  let output = `
### ${issue.severity === 'critical' ? '🔴' : issue.severity === 'high' ? '🟠' : issue.severity === 'medium' ? '🟡' : '🟢'} ${issue.title}

**ID:** ${issue.id} | **Severity:** ${issue.severity.toUpperCase()} | **Category:** ${issue.category}  
**Location:** ${locationStr}  
**Tool:** ${issue.tool} | **Confidence:** ${((issue.confidence || 0.9) * 100).toFixed(0)}%  
${issue.cwe ? `**CWE:** ${issue.cwe} ` : ''}${issue['owasp'] ? `| **OWASP:** ${issue['owasp']}` : ''}

**Description:** ${issue.description}  
${issue.impact ? `**Impact:** ${issue.impact}` : ''}

**Current Code:**
\`\`\`java
${snippet?.before || '// Previous line'}
${snippet?.issue || '// Issue on this line'} // ← ISSUE HERE
${snippet?.after || '// Next line'}
\`\`\`

**Suggested Fix:**
\`\`\`java
${snippet?.fix?.before || '// Previous line'}
${snippet?.fix?.issue || '// Fixed code here'} // ← FIXED
${snippet?.fix?.after || '// Next line'}
\`\`\`
`;
  
  return output;
}

function generateCompleteReport(): string {
  const { decision, emoji, reason } = generateDecision();
  const { score, grade, confidence } = calculateScore();
  const personalizedComment = generatePersonalizedComment(CONFIG.prAuthor, CONFIG.teamName);
  
  const allIssues = [
    ...ISSUES_DATA.newInPR,
    ...ISSUES_DATA.existingInModified,
    ...ISSUES_DATA.existingInUnmodified
  ];
  
  const report = `# 🔍 CodeQual V9 Analysis Report - Review Round ${CONFIG.reviewRound}

${personalizedComment}

**Reason:** ${reason}

---

## 📋 Report Metadata

| Field | Value |
|-------|-------|
| **Repository** | ${CONFIG.repository} |
| **Repository URL** | ${CONFIG.repoUrl} |
| **PR Number** | #${CONFIG.prNumber} |
| **PR Title** | ${CONFIG.prTitle} |
| **PR Author** | @${CONFIG.prAuthor} |
| **Base Branch** | ${CONFIG.baseBranch} |
| **PR Branch** | ${CONFIG.prBranch} |
| **Language** | ${CONFIG.language} |
| **Analysis Date** | ${CONFIG.analysisDate.toISOString()} |
| **Analyzer Version** | V9.0.0 |
| **Report ID** | ${`RPT-${Date.now()}`} |
| **Review Round** | ${CONFIG.reviewRound} |
| **Team** | ${CONFIG.teamName} |
| **Files Analyzed** | 165 of 6,948 (2.4%) |
| **Analysis Duration** | 11.2 seconds |
| **Total API Calls** | 32 |
| **Total Cost** | $1.85 |

---

## 📊 Executive Summary

### Overall Assessment
- **Decision:** ${decision} ${emoji}
- **Quality Score:** ${score.toFixed(1)}/100 (Grade: **${grade}**)
- **Previous Score:** ${CONFIG.previousScore}/100 (Grade: **${CONFIG.previousGrade}**)
- **Improvement:** ${score > CONFIG.previousScore ? '📈' : '📉'} ${(score - CONFIG.previousScore).toFixed(1)} points
- **Confidence Level:** ${(confidence * 100).toFixed(0)}%
- **Decision Rationale:** ${reason}

### Issue Distribution

| Category | New in PR | Existing (Modified) | Existing (Unmodified) | Resolved | Total Active |
|----------|-----------|-------------------|---------------------|----------|--------------|
| **Critical** 🔴 | ${ISSUES_DATA.newInPR.filter(i => i.severity === 'critical').length} | ${ISSUES_DATA.existingInModified.filter(i => i.severity === 'critical').length} | ${ISSUES_DATA.existingInUnmodified.filter(i => i.severity === 'critical').length} | ${ISSUES_DATA.resolved.filter(i => i.severity === 'critical').length} | ${allIssues.filter(i => i.severity === 'critical').length} |
| **High** 🟠 | ${ISSUES_DATA.newInPR.filter(i => i.severity === 'high').length} | ${ISSUES_DATA.existingInModified.filter(i => i.severity === 'high').length} | ${ISSUES_DATA.existingInUnmodified.filter(i => i.severity === 'high').length} | ${ISSUES_DATA.resolved.filter(i => i.severity === 'high').length} | ${allIssues.filter(i => i.severity === 'high').length} |
| **Medium** 🟡 | ${ISSUES_DATA.newInPR.filter(i => i.severity === 'medium').length} | ${ISSUES_DATA.existingInModified.filter(i => i.severity === 'medium').length} | ${ISSUES_DATA.existingInUnmodified.filter(i => i.severity === 'medium').length} | ${ISSUES_DATA.resolved.filter(i => i.severity === 'medium').length} | ${allIssues.filter(i => i.severity === 'medium').length} |
| **Low** 🟢 | ${ISSUES_DATA.newInPR.filter(i => i.severity === 'low').length} | ${ISSUES_DATA.existingInModified.filter(i => i.severity === 'low').length} | ${ISSUES_DATA.existingInUnmodified.filter(i => i.severity === 'low').length} | ${ISSUES_DATA.resolved.filter(i => i.severity === 'low').length} | ${allIssues.filter(i => i.severity === 'low').length} |
| **Total** | **${ISSUES_DATA.newInPR.length}** | **${ISSUES_DATA.existingInModified.length}** | **${ISSUES_DATA.existingInUnmodified.length}** | **${ISSUES_DATA.resolved.length}** | **${allIssues.length}** |

### Key Insights
- ✅ **All critical/high issues resolved** from previous review
- 🆕 **${ISSUES_DATA.newInPR.length} minor issues** introduced (low priority)
- 📝 **${ISSUES_DATA.existingInModified.length} existing issues** in modified files (medium/low)
- 🎉 **${ISSUES_DATA.resolved.length} issues fixed** including all blockers!
- 📈 **Score improved** from ${CONFIG.previousScore} to ${score.toFixed(1)} (+${(score - CONFIG.previousScore).toFixed(1)} points)

---

## 🆕 New Issues in PR (Non-blocking - all low severity)

Minor issues introduced during the fixes - these won't block merging:

${ISSUES_DATA.newInPR.map(issue => formatIssueWithSnippets(issue, CODE_SNIPPETS)).join('\n')}

---

## 📝 Existing Issues in Modified Files (Non-blocking)

Pre-existing issues that could be addressed but won't block the PR:

${ISSUES_DATA.existingInModified.map(issue => formatIssueWithSnippets(issue, CODE_SNIPPETS)).join('\n')}

---

## 📊 Existing Issues in Unmodified Files (Score Impact Only)

These issues exist in the codebase but are not in files you modified. They affect your score but won't block the PR:

${ISSUES_DATA.existingInUnmodified.map(issue => {
  const locationStr = issue.column 
    ? `\`${issue.file}:${issue.line}:${issue.column}\``
    : `\`${issue.file}:${issue.line}\``;
  
  return `
### ${issue.severity === 'medium' ? '🟡' : '🟢'} ${issue.title}

**ID:** ${issue.id} | **Severity:** ${issue.severity.toUpperCase()} | **Category:** ${issue.category}  
**Location:** ${locationStr}  
**Tool:** ${issue.tool} | **Confidence:** ${((issue.confidence || 0.9) * 100).toFixed(0)}%  
${issue.cwe ? `**CWE:** ${issue.cwe}` : ''}

**Description:** ${issue.description}
`;
}).join('\n')}

---

## ✅ Resolved Issues (Great Work!)

Excellent job fixing these critical issues from the previous review:

${ISSUES_DATA.resolved.map(issue => `
### ✅ ${issue.title}
**Location:** \`${issue.file}:${issue.line}\` | **Previous Severity:** ${issue.severity.toUpperCase()}  
**Resolution:** ${issue.description}
`).join('\n')}

---

## 💰 Business Impact Analysis

### Financial Impact

| Issue Category | Count | Fix Cost | Potential Loss if Unfixed | ROI |
|---------------|-------|----------|--------------------------|-----|
| Resolved Critical/High | ${ISSUES_DATA.resolved.filter(i => i.severity === 'critical' || i.severity === 'high').length} | -$${ISSUES_DATA.resolved.filter(i => i.severity === 'critical' || i.severity === 'high').length * 5000} | Avoided $${ISSUES_DATA.resolved.filter(i => i.severity === 'critical' || i.severity === 'high').length * 500000} | ♻️ Excellent |
| New Low Priority | ${ISSUES_DATA.newInPR.length} | $${ISSUES_DATA.newInPR.length * 200} | $${ISSUES_DATA.newInPR.length * 1000} | 400% |
| Existing Medium | ${ISSUES_DATA.existingInModified.filter(i => i.severity === 'medium').length} | $${ISSUES_DATA.existingInModified.filter(i => i.severity === 'medium').length * 500} | $${ISSUES_DATA.existingInModified.filter(i => i.severity === 'medium').length * 5000} | 900% |
| **Net Impact** | **Positive** | **-$${(ISSUES_DATA.resolved.filter(i => i.severity === 'critical' || i.severity === 'high').length * 5000) - (ISSUES_DATA.newInPR.length * 200)}** | **Avoided Major Loss** | **♻️ Positive** |

### Risk Assessment (Improved)
- **Security Risk:** LOW 🟢 (was HIGH 🔴) - All vulnerabilities fixed!
- **Performance Risk:** LOW 🟢 (was HIGH 🔴) - N+1 query resolved!
- **Maintainability Risk:** MEDIUM 🟡 (unchanged)
- **Compliance Risk:** LOW 🟢 (was HIGH 🔴) - Security issues addressed!

---

## 🎯 Recommendations

### Optional Improvements (Not Required for Merge)

${ISSUES_DATA.newInPR.length > 0 ? `
#### Clean up minor issues
${ISSUES_DATA.newInPR.map((issue, idx) => `
${idx + 1}. **${issue.title}** in \`${issue.file}:${issue.line}\` (Low priority)
`).join('')}
` : '✅ No new issues to address!'}

### Future Sprint Items
1. Refactor high complexity method in Utils.java (technical debt)
2. Increase test coverage for new security methods (currently 45%)
3. Update TLS configuration in SocketServer.java
4. Add missing JavaDoc for public APIs

### Commendation
🏆 Excellent work fixing all critical security vulnerabilities!  
🎯 Great improvement in code quality score!  
💪 Strong security awareness demonstrated!

---

## 📈 Code Quality Metrics

| Metric | This PR (R2) | Previous (R1) | Change | Target | Status |
|--------|--------------|---------------|--------|--------|--------|
| Quality Score | ${score.toFixed(1)}/100 | ${CONFIG.previousScore}/100 | +${(score - CONFIG.previousScore).toFixed(1)} | ≥80 | ${score >= 80 ? '✅' : '⚠️'} |
| Critical Issues | 0 | 1 | -1 | 0 | ✅ |
| High Issues | 0 | 2 | -2 | 0 | ✅ |
| Security Score | 95/100 | 45/100 | +50 | ≥90 | ✅ |
| Test Coverage | 82% | 78% | +4% | >80% | ✅ |
| Tech Debt | 38h | 42h | -4h | <20h | ⚠️ |

---

## 🏆 Developer & Team Skill Assessment

### Individual Performance (@${CONFIG.prAuthor})
- **Security Awareness:** 92/100 (Excellent) ⬆️ +27 from R1
- **Code Quality:** 81/100 (Very Good) ⬆️ +3 from R1
- **Performance Optimization:** 88/100 (Very Good) ⬆️ +16 from R1
- **Best Practices:** 83/100 (Very Good) ⬆️ +2 from R1
- **Issue Resolution:** 95/100 (Excellent) ⬆️ +5 from R1
- **Overall:** 88/100 (Very Good) ⬆️ +14 from R1

### Growth Demonstrated
✅ Successfully fixed SQL injection vulnerability  
✅ Resolved performance bottleneck  
✅ Removed hardcoded credentials  
✅ Improved test coverage  
✅ Quick turnaround on critical fixes  

### Team Performance (${CONFIG.teamName})
- **Average Score:** 79/100 ⬆️ +3
- **Trend:** 📈 Improving
- **Ranking:** 2nd of 8 teams ⬆️ (was 3rd)
- **Issues Fixed This Sprint:** 26 (+3)
- **Critical Issues Fixed:** 3 (100% resolution rate)

---

## 📊 Review History

| Review | Date | New Issues | Resolved | Score | Decision | Turnaround |
|--------|------|------------|----------|-------|----------|------------|
| **R2** | **Today** | **2 (low)** | **3 (critical/high)** | **${score.toFixed(1)}/100** | **APPROVED** | **4 hours** |
| R1 | Yesterday | 2 (critical/high) | 2 | ${CONFIG.previousScore}/100 | DECLINED | - |

**Response Time:** Excellent - Fixed all blockers in 4 hours!

---

## 🔧 Analysis Tools Performance

| Tool | Status | Issues Found | Execution Time | vs R1 |
|------|--------|--------------|----------------|-------|
| semgrep | ✅ | 0 | 2.8s | -1 issue |
| trufflehog | ✅ | 0 | 0.9s | -1 issue |
| spotbugs | ✅ | 1 | 3.2s | +1 issue |
| pmd | ✅ | 1 | 2.1s | No change |
| checkstyle | ✅ | 2 | 1.5s | +1 issue |
| jacoco | ✅ | 1 | 0.4s | New |
| errorprone | ✅ | 1 | 0.6s | No change |

---

## 📚 Educational Resources

### Based on Issues Fixed
- ✅ [SQL Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html) - Successfully applied!
- ✅ [Secrets Management](https://www.12factor.net/config) - Properly implemented!
- ✅ [Query Optimization](https://use-the-index-luke.com/) - Well executed!

### For Remaining Improvements
- [Clean Code Principles](https://www.amazon.com/Clean-Code-Handbook-Software-Craftsmanship/dp/0132350882) - For complexity reduction
- [JUnit Best Practices](https://www.baeldung.com/junit-5) - For test coverage
- [Java Code Conventions](https://www.oracle.com/java/technologies/javase/codeconventions-contents.html) - For consistency

---

## 📝 Pull Request Details

### Changes Summary (Updated)
- **Files Modified:** 15
- **Lines Added:** 512 (+) ⬆️ from 450
- **Lines Removed:** 278 (-) ⬆️ from 220
- **Net Change:** +234 lines
- **Test Coverage:** 82% of new code ⬆️ from 78%
- **Security Fixes:** 3 critical/high resolved

### Modified Files (Key Changes)
\`\`\`diff
src/main/java/kafka/consumer/BatchProcessor.java     | +289 -45  [SECURED]
src/main/java/kafka/security/AuthManager.java        | +67  -23  [SECURED]
src/main/java/kafka/utils/Utils.java                 | +89  -67  [UNCHANGED]
src/test/java/kafka/consumer/BatchProcessorTest.java | +112 -8   [NEW TESTS]
... and 11 more files
\`\`\`

### PR Checklist (Updated)
- [x] Code compiles without warnings
- [x] All existing tests pass
- [x] New tests added for security fixes
- [x] Security vulnerabilities addressed ✅ NEW
- [x] Performance impact assessed ✅ IMPROVED
- [x] Documentation updated
- [x] Code review completed
- [x] Ready to merge ✅

---

## 🔄 Next Steps

### For Developer (@${CONFIG.prAuthor})
1. ✅ Merge when CI passes
2. Monitor production metrics after deployment
3. Create tickets for minor improvements
4. Share security fix patterns with team

### For Team
1. Deploy to staging environment
2. Run integration tests
3. Monitor for 24 hours
4. Promote to production

### For Management
1. Recognize quick turnaround on critical fixes
2. Update security training based on lessons learned
3. Consider security champion role for @${CONFIG.prAuthor}

---

## 📧 Notifications

**Subscribed:** @${CONFIG.prAuthor}, @${CONFIG.teamName}-leads, @security-team  
**CC:** @platform-architects  
**Slack Channel:** #${CONFIG.teamName.toLowerCase().replace(' ', '-')}-prs  
**Alert:** Security fixes successfully implemented ✅

---

*Generated by CodeQual V9 - Enterprise Edition*  
*Report ID: RPT-${Date.now()}*  
*Review Round: ${CONFIG.reviewRound} of ${CONFIG.reviewRound}*  
*For support: devops@codequal.com | Slack: #codequal-support*

---

## 💬 Personalized PR Comment

\`\`\`markdown
Excellent progress @${CONFIG.prAuthor}! 🎯

You've successfully fixed all 3 critical issues from the previous review. Your code quality improved by ${(score - CONFIG.previousScore).toFixed(1)} points (${CONFIG.previousGrade} → ${grade}).

Your current quality score is **${score.toFixed(1)}/100 (${grade})**.

Great job addressing the security vulnerabilities and performance issues! The remaining items are minor and won't block merging.

---

## ✅ PR Decision: **APPROVED**

### 📊 Quick Stats
- **Critical Issues Fixed:** 3 ✅
- **New Issues:** 2 (all low priority)
- **Quality Score:** ${score.toFixed(1)}/100 (${grade}) ⬆️ +${(score - CONFIG.previousScore).toFixed(1)}
- **Security Score:** 95/100 ⬆️ +50

### ✅ What You Fixed
- SQL Injection vulnerability - Now using PreparedStatements
- N+1 Query pattern - Optimized with batch queries
- Hardcoded credentials - Using environment variables

### 🎉 Ready to Merge!
All blocking issues have been resolved. The minor issues can be addressed in follow-up tickets.

Great work on the quick turnaround! 🚀

---
<sub>🤖 CodeQual V9 | Review ${CONFIG.reviewRound} | [Previous Report](#r1) | [Configure](https://codequal.com/settings)</sub>
\`\`\`
`;

  return report;
}

// Generate the report
console.log('🚀 Generating V9 Second Review Report...\n');

const report = generateCompleteReport();
const timestamp = Date.now();
const reportPath = path.join(
  process.cwd(),
  `v9-second-review-${CONFIG.prNumber}-${timestamp}.md`
);

fs.writeFileSync(reportPath, report);

const { decision } = generateDecision();
const { score, grade } = calculateScore();

console.log('✅ Second Review Report Generated!\n');
console.log('📊 Report Statistics:');
console.log(`  - File: ${reportPath}`);
console.log(`  - Size: ${(report.length / 1024).toFixed(1)} KB`);
console.log(`  - Review Round: 2`);
console.log(`  - Decision: ${decision}`);
console.log(`  - Score: ${score.toFixed(1)}/100 (${grade})`);
console.log(`  - Previous Score: ${CONFIG.previousScore}/100 (${CONFIG.previousGrade})`);
console.log(`  - Improvement: +${(score - CONFIG.previousScore).toFixed(1)} points`);
console.log(`  - Issues Fixed: ${ISSUES_DATA.resolved.length}`);
console.log(`  - New Issues: ${ISSUES_DATA.newInPR.length} (all low)`);
console.log(`  - Remaining: ${ISSUES_DATA.existingInModified.length + ISSUES_DATA.existingInUnmodified.length}`);

console.log('\n🎉 PR APPROVED for merge after successful fixes!');