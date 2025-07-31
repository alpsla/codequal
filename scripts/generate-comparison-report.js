#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

async function generateMarkdownReport() {
  // Sample comparison data (from our test)
  const comparisonData = {
    newIssues: {
      critical: [{
        id: 'sec-002',
        title: 'XSS Vulnerability',
        description: 'User input rendered without escaping',
        severity: 'critical',
        category: 'security',
        file: 'src/components/Comment.jsx',
        line: 34
      }],
      high: [],
      medium: [],
      low: [],
      total: 1
    },
    resolvedIssues: {
      critical: [],
      high: [],
      medium: [],
      low: [],
      total: 0
    },
    modifiedPatterns: {
      added: ['Event-Driven'],
      removed: [],
      modified: [],
      impact: 'New asynchronous patterns introduced'
    },
    securityImpact: {
      score: 5,
      vulnerabilitiesAdded: 1,
      vulnerabilitiesResolved: 0,
      criticalIssues: ['XSS Vulnerability'],
      improvements: []
    },
    performanceImpact: {
      score: 3,
      improvements: ['Performance score improved by 3 points'],
      regressions: [],
      metrics: {
        issueCount: 0,
        scoreChange: 3
      }
    },
    dependencyChanges: {
      added: [],
      removed: [],
      updated: [],
      securityAlerts: []
    },
    codeQualityDelta: {
      maintainability: 80,
      testCoverage: 70,
      codeComplexity: 0,
      duplicatedCode: 0
    },
    insights: [
      {
        type: 'negative',
        title: 'Critical Security Issues Introduced',
        description: '1 critical security issues need immediate attention',
        evidence: ['XSS Vulnerability']
      },
      {
        type: 'neutral',
        title: 'Architectural Changes',
        description: 'New asynchronous patterns introduced',
        evidence: ['Added pattern: Event-Driven']
      },
      {
        type: 'positive',
        title: 'Performance Improvements',
        description: 'Performance score improved by 3 points',
        evidence: ['Performance score improved by 3 points']
      }
    ],
    recommendations: [
      {
        priority: 'critical',
        title: 'Address Critical Security Vulnerabilities',
        description: 'Critical security issues must be resolved before merging',
        effort: 'high',
        impact: 'critical',
        steps: [
          'Review each critical security issue',
          'Apply recommended fixes',
          'Add security tests',
          'Request security review'
        ]
      }
    ],
    riskAssessment: 'critical',
    summary: 'Risk Level: CRITICAL. 1 new issues introduced (1 critical). Overall score improved by 4 points. PR: "Test PR".',
    overallScore: 72,
    scoreChanges: {
      overall: { before: 68, after: 72, change: 4 },
      security: { before: 60, after: 65, change: 5 },
      performance: { before: 75, after: 78, change: 3 },
      maintainability: { before: 80, after: 80, change: 0 },
      testing: { before: 70, after: 70, change: 0 }
    }
  };

  // Generate Markdown report
  const report = `# Pull Request Analysis Report

## Executive Summary

${comparisonData.summary}

**Risk Assessment:** ${comparisonData.riskAssessment.toUpperCase()}  
**Overall Score:** ${comparisonData.overallScore}/100

## Score Changes

| Category | Before | After | Change |
|----------|--------|-------|--------|
${Object.entries(comparisonData.scoreChanges).map(([key, scores]) => 
  `| ${key.charAt(0).toUpperCase() + key.slice(1)} | ${scores.before} | ${scores.after} | ${scores.change > 0 ? '+' : ''}${scores.change} |`
).join('\n')}

## Issues Summary

### New Issues (${comparisonData.newIssues.total})

${comparisonData.newIssues.critical.length > 0 ? `#### 🔴 Critical (${comparisonData.newIssues.critical.length})
${comparisonData.newIssues.critical.map(issue => 
  `- **${issue.title}**: ${issue.description}
  - File: \`${issue.file}:${issue.line}\`
  - Category: ${issue.category}`
).join('\n\n')}` : ''}

${comparisonData.newIssues.high.length > 0 ? `#### 🟠 High (${comparisonData.newIssues.high.length})
${comparisonData.newIssues.high.map(issue => 
  `- **${issue.title}**: ${issue.description}
  - File: \`${issue.file}:${issue.line}\`
  - Category: ${issue.category}`
).join('\n\n')}` : ''}

${comparisonData.newIssues.medium.length > 0 ? `#### 🟡 Medium (${comparisonData.newIssues.medium.length})
${comparisonData.newIssues.medium.map(issue => 
  `- **${issue.title}**: ${issue.description}
  - File: \`${issue.file}:${issue.line}\`
  - Category: ${issue.category}`
).join('\n\n')}` : ''}

### Resolved Issues (${comparisonData.resolvedIssues.total})

${comparisonData.resolvedIssues.total > 0 ? 'Issues resolved in this PR:' : 'No issues were resolved in this PR.'}

## Architectural Analysis

### Pattern Changes
${comparisonData.modifiedPatterns.added.length > 0 ? `- **Added Patterns:** ${comparisonData.modifiedPatterns.added.join(', ')}` : ''}
${comparisonData.modifiedPatterns.removed.length > 0 ? `- **Removed Patterns:** ${comparisonData.modifiedPatterns.removed.join(', ')}` : ''}

**Impact:** ${comparisonData.modifiedPatterns.impact}

## Security Analysis

- **Security Score Change:** ${comparisonData.securityImpact.score > 0 ? '+' : ''}${comparisonData.securityImpact.score} points
- **New Vulnerabilities:** ${comparisonData.securityImpact.vulnerabilitiesAdded}
- **Resolved Vulnerabilities:** ${comparisonData.securityImpact.vulnerabilitiesResolved}

${comparisonData.securityImpact.criticalIssues.length > 0 ? `### ⚠️ Critical Security Issues
${comparisonData.securityImpact.criticalIssues.map(issue => `- ${issue}`).join('\n')}` : ''}

## Performance Analysis

- **Performance Score Change:** ${comparisonData.performanceImpact.score > 0 ? '+' : ''}${comparisonData.performanceImpact.score} points

${comparisonData.performanceImpact.improvements.length > 0 ? `### ✅ Improvements
${comparisonData.performanceImpact.improvements.map(imp => `- ${imp}`).join('\n')}` : ''}

${comparisonData.performanceImpact.regressions.length > 0 ? `### ❌ Regressions
${comparisonData.performanceImpact.regressions.map(reg => `- ${reg}`).join('\n')}` : ''}

## Code Quality Metrics

- **Maintainability:** ${comparisonData.codeQualityDelta.maintainability}/100
- **Test Coverage:** ${comparisonData.codeQualityDelta.testCoverage}%
- **Code Complexity:** ${comparisonData.codeQualityDelta.codeComplexity}
- **Duplicated Code:** ${comparisonData.codeQualityDelta.duplicatedCode}%

## Key Insights

${comparisonData.insights.map(insight => {
  const icon = insight.type === 'positive' ? '✅' : insight.type === 'negative' ? '❌' : 'ℹ️';
  return `### ${icon} ${insight.title}

${insight.description}

${insight.evidence.length > 0 ? `**Evidence:**
${insight.evidence.map(e => `- ${e}`).join('\n')}` : ''}`;
}).join('\n\n')}

## Recommendations

${comparisonData.recommendations.map(rec => {
  const priorityEmoji = {
    critical: '🔴',
    high: '🟠',
    medium: '🟡',
    low: '🟢'
  };
  return `### ${priorityEmoji[rec.priority]} ${rec.title}

${rec.description}

**Priority:** ${rec.priority.toUpperCase()}  
**Effort:** ${rec.effort}  
**Impact:** ${rec.impact}

**Action Steps:**
${rec.steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}`;
}).join('\n\n')}

## Next Steps

Based on the analysis, here are the recommended next steps:

1. **Immediate Actions:**
   - Address all critical security vulnerabilities before merging
   - Review and fix high-priority issues
   
2. **Before Merge:**
   - Ensure all tests pass
   - Get security team review for critical issues
   - Update documentation for architectural changes

3. **Post-Merge:**
   - Monitor performance metrics
   - Track resolution of medium/low priority issues
   - Schedule follow-up review

---

*This report was generated by the CodeQual Comparison Agent*  
*Analysis performed on: ${new Date().toISOString()}*
`;

  // Write to file
  const outputPath = path.join(__dirname, '..', 'docs', 'sample-comparison-report.md');
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, report);
  
  console.log(`✅ Sample report generated at: ${outputPath}`);
  console.log('\nPreview:');
  console.log('='.repeat(50));
  console.log(report.substring(0, 500) + '...');
}

generateMarkdownReport().catch(console.error);