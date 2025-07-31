#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

async function generateComprehensiveReport() {
  // Sample comparison data with both repository and PR analysis
  const comparisonData = {
    repository: {
      url: 'https://github.com/codequal-dev/codequal',
      branch: 'main',
      scanDuration: 52.3,
      totalIssues: 287,
      criticalIssues: 12,
      highIssues: 34,
      mediumIssues: 98,
      lowIssues: 143
    },
    pullRequest: {
      id: '#123',
      title: 'Add new authentication feature',
      branch: 'feature/auth-update',
      newIssues: {
        critical: [{
          id: 'sec-002',
          title: 'XSS Vulnerability',
          description: 'User input rendered without escaping',
          severity: 'critical',
          category: 'security',
          file: 'src/components/Comment.jsx',
          line: 34,
          codeSnippet: `document.getElementById('output').innerHTML = userComment; // XSS Risk!`,
          recommendation: 'Use textContent instead of innerHTML or properly escape HTML'
        }],
        high: [{
          id: 'sec-003',
          title: 'Unvalidated User Input',
          description: 'User input is being used without proper validation',
          severity: 'high',
          category: 'security',
          file: 'src/api/auth.js',
          line: 156,
          codeSnippet: `const userInput = req.body.search;
db.query(\`SELECT * FROM products WHERE name LIKE '%\${userInput}%'\`);`,
          recommendation: 'Validate and sanitize all user input before using it in queries'
        }],
        medium: [],
        low: [],
        total: 2
      },
      resolvedIssues: {
        critical: [],
        high: [{
          id: 'perf-001',
          title: 'N+1 Query Problem',
          description: 'Multiple database queries in a loop - FIXED',
          severity: 'high',
          category: 'performance'
        }],
        medium: [],
        low: [],
        total: 1
      }
    },
    scoreChanges: {
      overall: { before: 68, after: 72, change: 4 },
      security: { before: 60, after: 65, change: 5 },
      performance: { before: 75, after: 78, change: 3 },
      maintainability: { before: 80, after: 80, change: 0 },
      testing: { before: 70, after: 75, change: 5 }
    },
    prDecision: {
      status: 'BLOCKED',
      reason: 'Critical security issues must be resolved before merging',
      confidence: 95
    },
    skills: {
      current: {
        security: 65,
        codeQuality: 82,
        performance: 78,
        architecture: 90,
        testing: 75
      },
      gaps: [
        { area: 'Security Practices', priority: 'CRITICAL' },
        { area: 'Input Validation', priority: 'HIGH' }
      ],
      trend: 'improving' // or 'declining', 'stable'
    },
    educationalRecommendations: [
      {
        title: 'Preventing XSS Attacks',
        description: 'Learn how to properly escape user input in JavaScript applications',
        estimatedTime: '30 minutes',
        priority: 'critical',
        link: '#xss-prevention'
      },
      {
        title: 'SQL Injection Prevention',
        description: 'Best practices for parameterized queries',
        estimatedTime: '45 minutes',
        priority: 'high',
        link: '#sql-injection'
      }
    ],
    teamMetrics: {
      averageScore: 75,
      teamTrend: 'improving',
      commonIssues: ['Input validation', 'Security practices']
    }
  };

  // Generate Markdown report
  const report = `# DeepWiki Pull Request Analysis Report

**Repository:** ${comparisonData.repository.url}  
**PR:** ${comparisonData.pullRequest.id} - ${comparisonData.pullRequest.title}  
**Analysis Date:** ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}  
**Model Used:** Claude-3-Opus (Primary), GPT-4-Turbo (Fallback)  
**Scan Duration:** ${comparisonData.repository.scanDuration} seconds

---

## PR Decision: ${comparisonData.prDecision.status} 🚫

**Confidence:** ${comparisonData.prDecision.confidence}%

${comparisonData.prDecision.reason}

---

## Executive Summary

**Overall Score: ${comparisonData.scoreChanges.overall.after}/100 (${getGrade(comparisonData.scoreChanges.overall.after)})**

This pull request introduces new authentication features but contains critical security vulnerabilities that must be addressed before merging. The repository shows improvement trends, but immediate attention is required for security issues.

### Key Metrics
- **Total Repository Issues:** ${comparisonData.repository.totalIssues}
- **New PR Issues:** ${comparisonData.pullRequest.newIssues.total}
- **Critical Issues:** ${comparisonData.pullRequest.newIssues.critical.length}
- **Risk Level:** HIGH
- **Trend:** ↑ Improving (+${comparisonData.scoreChanges.overall.change} points from main branch)

### PR Issue Distribution
\`\`\`
Critical: ${getBar(comparisonData.pullRequest.newIssues.critical.length, 2)} ${comparisonData.pullRequest.newIssues.critical.length}
High:     ${getBar(comparisonData.pullRequest.newIssues.high.length, 2)} ${comparisonData.pullRequest.newIssues.high.length}
Medium:   ${getBar(comparisonData.pullRequest.newIssues.medium.length, 2)} ${comparisonData.pullRequest.newIssues.medium.length}
Low:      ${getBar(comparisonData.pullRequest.newIssues.low.length, 2)} ${comparisonData.pullRequest.newIssues.low.length}
\`\`\`

---

## 1. Pull Request Analysis

### New Issues Introduced (${comparisonData.pullRequest.newIssues.total})

${comparisonData.pullRequest.newIssues.critical.length > 0 ? `#### 🔴 Critical Issues (${comparisonData.pullRequest.newIssues.critical.length})

${comparisonData.pullRequest.newIssues.critical.map(issue => formatIssue(issue, 'CRITICAL')).join('\n\n')}` : ''}

${comparisonData.pullRequest.newIssues.high.length > 0 ? `#### 🟠 High Issues (${comparisonData.pullRequest.newIssues.high.length})

${comparisonData.pullRequest.newIssues.high.map(issue => formatIssue(issue, 'HIGH')).join('\n\n')}` : ''}

### Resolved Issues (${comparisonData.pullRequest.resolvedIssues.total})

${comparisonData.pullRequest.resolvedIssues.high.length > 0 ? `#### ✅ Fixed High Priority Issues

${comparisonData.pullRequest.resolvedIssues.high.map(issue => `- **${issue.title}**: ${issue.description}`).join('\n')}` : 'No issues were resolved in this PR.'}

---

## 2. Repository Analysis

### Overall Repository Health

The repository currently has ${comparisonData.repository.totalIssues} total issues:
- Critical: ${comparisonData.repository.criticalIssues}
- High: ${comparisonData.repository.highIssues}
- Medium: ${comparisonData.repository.mediumIssues}
- Low: ${comparisonData.repository.lowIssues}

### Top Repository Issues

#### SEC-001: Hardcoded API Keys in Repository (CRITICAL)
- **CVSS Score:** 9.8/10
- **Impact:** Complete system compromise if repository is breached

**Vulnerable Code:**
\`\`\`yaml
# k8s/deployments/production/api-deployment.yaml (lines 23, 45)
- name: OPENROUTER_API_KEY
  value: "sk-or-v1-1234567890abcdef"  # EXPOSED!
\`\`\`

**Fix:**
\`\`\`yaml
# Use Kubernetes secrets instead
- name: OPENROUTER_API_KEY
  valueFrom:
    secretKeyRef:
      name: api-keys
      key: openrouter-key
\`\`\`

---

## 3. Score Analysis

### Category Scores

| Category | Main Branch | Feature Branch | Change | Grade |
|----------|-------------|----------------|--------|-------|
| Overall | ${comparisonData.scoreChanges.overall.before} | ${comparisonData.scoreChanges.overall.after} | ${formatChange(comparisonData.scoreChanges.overall.change)} | ${getGrade(comparisonData.scoreChanges.overall.after)} |
| Security | ${comparisonData.scoreChanges.security.before} | ${comparisonData.scoreChanges.security.after} | ${formatChange(comparisonData.scoreChanges.security.change)} | ${getGrade(comparisonData.scoreChanges.security.after)} |
| Performance | ${comparisonData.scoreChanges.performance.before} | ${comparisonData.scoreChanges.performance.after} | ${formatChange(comparisonData.scoreChanges.performance.change)} | ${getGrade(comparisonData.scoreChanges.performance.after)} |
| Maintainability | ${comparisonData.scoreChanges.maintainability.before} | ${comparisonData.scoreChanges.maintainability.after} | ${formatChange(comparisonData.scoreChanges.maintainability.change)} | ${getGrade(comparisonData.scoreChanges.maintainability.after)} |
| Testing | ${comparisonData.scoreChanges.testing.before} | ${comparisonData.scoreChanges.testing.after} | ${formatChange(comparisonData.scoreChanges.testing.change)} | ${getGrade(comparisonData.scoreChanges.testing.after)} |

---

## 4. Skills Assessment & Educational Recommendations

### Current Skill Levels

| Skill Area | Score | Assessment |
|------------|-------|------------|
| Security | ${comparisonData.skills.current.security}/100 | Needs Improvement |
| Code Quality | ${comparisonData.skills.current.codeQuality}/100 | Good |
| Performance | ${comparisonData.skills.current.performance}/100 | Good |
| Architecture | ${comparisonData.skills.current.architecture}/100 | Excellent |
| Testing | ${comparisonData.skills.current.testing}/100 | Good |

### Skill Gap Analysis

${comparisonData.skills.gaps.map(gap => `- **${gap.area}** (${gap.priority})`).join('\n')}

### Recommended Learning Path

${comparisonData.educationalRecommendations.map((rec, i) => `#### ${i + 1}. ${rec.title} (${rec.priority.toUpperCase()})
- **Description:** ${rec.description}
- **Estimated Time:** ${rec.estimatedTime}
- **Priority:** ${rec.priority.toUpperCase()}`).join('\n\n')}

### Team Metrics
- **Team Average Score:** ${comparisonData.teamMetrics.averageScore}/100
- **Team Trend:** ${comparisonData.teamMetrics.teamTrend}
- **Common Issues:** ${comparisonData.teamMetrics.commonIssues.join(', ')}

---

## 5. Priority Action Plan

### Immediate Actions (Before Merge)
\`\`\`markdown
1. [ ] Fix XSS vulnerability in Comment.jsx (2 hours)
2. [ ] Implement input validation in auth.js (1 hour)
3. [ ] Add security tests for new features (2 hours)
4. [ ] Get security team review
\`\`\`

### Short-term Actions (This Sprint)
\`\`\`markdown
5. [ ] Complete security training module (4 hours)
6. [ ] Implement automated security scanning
7. [ ] Update code review checklist
\`\`\`

---

## 6. PR Comment Template

\`\`\`markdown
## CodeQual Analysis Report

**Decision:** 🚫 Blocked

This PR cannot be merged due to critical security issues:

### 🚨 Critical Issues (${comparisonData.pullRequest.newIssues.critical.length})
${comparisonData.pullRequest.newIssues.critical.map(issue => `- **${issue.title}** in \`${issue.file}:${issue.line}\``).join('\n')}

### ✅ Positive Findings
- Resolved ${comparisonData.pullRequest.resolvedIssues.total} existing issues
- Testing coverage improved by ${comparisonData.scoreChanges.testing.change}%
- Overall score improved by ${comparisonData.scoreChanges.overall.change} points

### 📊 Code Quality Score: ${comparisonData.scoreChanges.overall.after}/100

⛔ These critical security issues must be resolved before this PR can be merged.

[View Full Report](#)
\`\`\`

---

## 7. Success Metrics

### Technical Metrics
- Zero critical vulnerabilities ✗
- Page load time < 1.5s ✓
- Test coverage > 80% (currently ${comparisonData.scoreChanges.testing.after}%) ✗
- Bundle size < 500KB ✓

### Business Impact
- **Security Breach Probability:** HIGH (due to XSS vulnerability)
- **Performance Impact:** Minimal
- **Developer Productivity:** +5% after improvements

---

## 8. Conclusion

While this PR shows positive improvements in testing and overall code quality, the introduction of critical security vulnerabilities makes it unsuitable for merging in its current state. The development team should:

1. **Immediate:** Fix all critical security issues
2. **Before Merge:** Add comprehensive security tests
3. **Long-term:** Complete security training to prevent future vulnerabilities

**Recommended Investment:** 1 developer × 1 day for fixes + security review

**Expected ROI:** 
- Prevent potential security breach
- Maintain user trust
- Improve overall code security posture

---

*Generated by DeepWiki v2.0 with Comparison Agent | Analysis ID: comparison_${Date.now()}*
`;

  // Helper functions
  function getGrade(score) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  function getBar(count, max) {
    const filled = Math.min(count, max);
    return '█'.repeat(filled) + '░'.repeat(Math.max(0, max - filled));
  }

  function formatChange(change) {
    return change > 0 ? `+${change}` : change.toString();
  }

  function formatIssue(issue, severity) {
    return `##### ${issue.id}: ${issue.title} (${severity})
- **File:** \`${issue.file}:${issue.line}\`
- **Category:** ${issue.category}
- **Description:** ${issue.description}

**Vulnerable Code:**
\`\`\`javascript
${issue.codeSnippet}
\`\`\`

**Recommendation:** ${issue.recommendation}

**Immediate Action Required:**
1. ${issue.recommendation}
2. Add tests to prevent regression
3. Update security documentation`;
  }

  // Write to file
  const outputPath = path.join(__dirname, '..', 'docs', 'sample-comprehensive-comparison-report.md');
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, report);
  
  console.log(`✅ Comprehensive report generated at: ${outputPath}`);
  console.log('\nReport includes:');
  console.log('- PR decision with confidence score');
  console.log('- Both repository and PR issues');
  console.log('- Code snippets and recommendations');
  console.log('- Skills assessment and education recommendations');
  console.log('- Team metrics tracking');
  console.log('- PR comment template for CI/CD integration');
}

generateComprehensiveReport().catch(console.error);