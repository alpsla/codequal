#!/usr/bin/env node

/**
 * V9 Report Sample Generator
 * Generates a complete sample report for review
 */

// Mock the environment variables to avoid Supabase initialization
process.env.SUPABASE_URL = 'https://mock.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-key';
process.env.OPENROUTER_API_KEY = 'mock-key';

const fs = require('fs');
const path = require('path');

// Create mock V9ReportFormatter that doesn't call AI
class MockV9ReportFormatter {
  constructor() {
    this.severityWeights = {
      critical: 5,
      high: 3,
      medium: 1,
      low: 0.5
    };
  }

  formatDate(dateStr) {
    if (!dateStr) return new Date().toLocaleDateString();
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return new Date().toLocaleDateString();
      }
      return date.toLocaleDateString();
    } catch {
      return new Date().toLocaleDateString();
    }
  }

  generateCompleteReport(result, metadata, language) {
    const now = new Date();
    const timeOfDay = now.getHours();
    let greeting = '🌅 Good morning';
    if (timeOfDay >= 12 && timeOfDay < 17) greeting = '☀️ Good afternoon';
    else if (timeOfDay >= 17) greeting = '🌙 Good evening';

    const report = `
# 📊 CODEQUAL V9 ANALYSIS REPORT

## 📋 Report Metadata
- **Analysis Date:** ${this.formatDate(metadata.analyzedAt)}
- **Repository:** ${metadata.repository}
- **PR Number:** #${metadata.prNumber}
- **Analyzer Version:** V9.0.0
- **Total Duration:** ${Math.round(metadata.totalDuration / 1000)}s

---

## 🎯 Executive Summary

**Decision:** ${result.decision === 'APPROVE_WITH_SUGGESTIONS' ? '✅ APPROVED WITH SUGGESTIONS' : '❌ REQUIRES CHANGES'}
**Confidence:** ${(result.confidence * 100).toFixed(1)}%
**Quality Score:** ${result.qualityScore}/100 (Grade: ${result.grade})

**Immediate Risk:** ${result.blockingIssues?.length > 0 ? '⚠️ Critical issues require immediate attention' : '✅ No blocking issues'}

---

## 📊 Issue Summary

### 🆕 New Issues (${result.newIssues?.length || 0})
${this.formatIssuesList(result.newIssues)}

### 📌 Existing Issues (${result.existingIssues?.length || 0})
${this.formatIssuesList(result.existingIssues)}

### ✅ Resolved Issues (${result.resolvedIssues?.length || 0})
${this.formatIssuesList(result.resolvedIssues)}

### 🚨 Blocking Issues (${result.blockingIssues?.length || 0})
${result.blockingIssues?.length > 0 ? this.formatIssuesList(result.blockingIssues) : 'None - PR can proceed'}

---

## 💼 Business Impact Analysis

**Overall Risk Score:** ${result.businessImpact?.score || 75}/100
**Risk Level:** ${this.getRiskLevel(result.businessImpact?.score)}
**Estimated Resolution Cost:** $${result.businessImpact?.estimatedCost || 5000}
**Time to Resolve:** ${result.businessImpact?.timeToResolve || '2-3 days'}

### Risk Factors:
${(result.businessImpact?.riskFactors || ['Security vulnerabilities', 'Performance degradation']).map(f => `- ${f}`).join('\n')}

### Exploit Cost Explanation:
${this.getExploitCostExplanation(result.businessImpact?.score)}

### Risk Matrix:
\`\`\`
Likelihood vs Impact Matrix:
         Low    Medium   High
High   |  🟨  |  🟧  |  🔴  |
Medium |  🟩  |  🟨  |  🟧  |
Low    |  🟢  |  🟩  |  🟨  |
\`\`\`
${this.getRiskMatrixExplanation()}

---

## 📈 Score Calculation

### Severity Weights Applied:
- Critical Issues: ${(result.newIssues?.filter(i => i.severity === 'critical').length || 0)} × 5 points
- High Issues: ${(result.newIssues?.filter(i => i.severity === 'high').length || 0)} × 3 points
- Medium Issues: ${(result.newIssues?.filter(i => i.severity === 'medium').length || 0)} × 1 point
- Low Issues: ${(result.newIssues?.filter(i => i.severity === 'low').length || 0)} × 0.5 points

**Total Deduction:** ${this.calculateTotalDeduction(result.newIssues)} points
**Base Score:** ${metadata.previousScore || 100}/100
**Final Score:** ${result.qualityScore}/100

---

## 🎓 Skills Development Tracking

**Current Skill Score:** ${result.skillScore?.current || 72}/100
**Previous Score:** ${result.skillScore?.previous || 50}/100
**Improvement:** ${result.skillScore?.delta > 0 ? '📈' : '📉'} ${Math.abs(result.skillScore?.delta || 22)} points

### Skill Level: ${this.getSkillLevel(result.skillScore?.current || 72)}

### Areas of Improvement:
${(result.skillScore?.improvements || ['Better error handling', 'Code organization', 'Security awareness']).map(i => `✅ ${i}`).join('\n')}

---

## 💬 Personalized PR Comment

${greeting}! Great work on PR #${metadata.prNumber}!

${this.getPersonalizedEncouragement(result.qualityScore)}

### Key Achievements:
- ✅ Resolved ${result.resolvedIssues?.length || 0} existing issues
- 📝 Modified ${metadata.filesModified} files
- 📊 Maintained ${result.qualityScore}% quality score

${this.getContextSpecificAdvice(result.newIssues)}

---

## 🛠️ AI-Powered Fix Suggestions

${result.newIssues?.slice(0, 3).map(issue => this.generateFixSuggestion(issue)).join('\n\n')}

---

## 📚 Educational Resources

### Recommended Learning Path:
1. 🔒 **Security Best Practices**
   - OWASP Top 10 Guide
   - Secure Coding Standards

2. ⚡ **Performance Optimization**
   - Algorithm Complexity Analysis
   - Database Query Optimization

3. 🏗️ **Architecture Patterns**
   - Design Patterns in ${language}
   - Microservices Best Practices

---

## 📊 Analysis Performance Metrics

### Agent Performance:
${metadata.agentsUsed?.map(agent => `
- **${agent.agentName}**
  - Execution Time: ${(agent.executionTime / 1000).toFixed(1)}s
  - Issues Found: ${agent.issuesFound}
  - Model Used: ${agent.modelUsed.model}
  - Cost: $${agent.cost.toFixed(3)}
`).join('\n')}

### Tool Execution:
${metadata.toolsUsed?.map(tool => `
- **${tool.toolName}**: ${tool.issuesFound} issues in ${(tool.executionTime / 1000).toFixed(1)}s
`).join('\n')}

### Total Analysis Cost: $${metadata.totalCost?.toFixed(2) || '0.35'}

---

## 📋 Recommended Actions

1. **Immediate (Blocking):**
   ${result.blockingIssues?.length > 0 ?
     result.blockingIssues.map(i => `- Fix ${i.severity} ${i.type} issue in ${i.file}`).join('\n') :
     '- No blocking issues'}

2. **Short-term (This Sprint):**
   - Address high-severity security vulnerabilities
   - Fix performance bottlenecks
   - Update deprecated dependencies

3. **Long-term (Technical Debt):**
   - Refactor complex methods
   - Improve test coverage
   - Update documentation

---

## 📈 Progress Tracking

\`\`\`
Quality Trend (Last 5 PRs):
100 |
 90 |     ╱╲
 80 |    ╱  ╲    ← Current: ${result.qualityScore}
 70 |   ╱    ╲╱
 60 |  ╱
 50 |_╱__________
    1  2  3  4  5
\`\`\`

---

## 🏁 Conclusion

${result.qualityScore >= 80 ?
  '**Excellent work!** The code quality is high and the PR is ready for merge with minor suggestions.' :
  result.qualityScore >= 60 ?
    '**Good progress!** Please address the identified issues to improve code quality.' :
    '**Attention needed!** Several critical issues require resolution before merging.'}

**Next Steps:**
1. Review and address blocking issues
2. Implement suggested fixes
3. Re-run analysis after changes

---

*Generated by CodeQual V9 Analysis Engine*
*All fixes integrated - No placeholders - Real insights*
*Report Date: ${this.formatDate(new Date())} | Duration: ${Math.round(metadata.totalDuration / 1000)}s*
`;
    return report;
  }

  formatIssuesList(issues) {
    if (!issues || issues.length === 0) return 'No issues in this category';

    return issues.slice(0, 5).map(issue =>
      `- **[${issue.severity.toUpperCase()}]** ${issue.message || issue.description}
  - File: \`${issue.file}:${issue.line}\`
  - Tool: ${issue.tool}`
    ).join('\n');
  }

  getRiskLevel(score) {
    if (score >= 80) return '🔴 HIGH RISK';
    if (score >= 60) return '🟧 MEDIUM RISK';
    if (score >= 40) return '🟨 LOW RISK';
    return '🟢 MINIMAL RISK';
  }

  getExploitCostExplanation(score) {
    if (score >= 80) {
      return 'Critical vulnerabilities present a high exploit value for attackers. Immediate remediation required to prevent potential breaches.';
    }
    if (score >= 60) {
      return 'Moderate vulnerabilities could be chained together for exploitation. Priority fixes recommended within this sprint.';
    }
    return 'Low severity issues present minimal exploit value but should be addressed for defense in depth.';
  }

  getRiskMatrixExplanation() {
    return `Current position: Based on issue severity and likelihood of exploitation.
- 🔴 Critical: Immediate action required
- 🟧 High: Address within 48 hours
- 🟨 Medium: Fix within sprint
- 🟢 Low: Track in backlog`;
  }

  getSkillLevel(score) {
    if (score >= 90) return '🏆 Expert';
    if (score >= 75) return '💎 Advanced';
    if (score >= 60) return '⭐ Intermediate';
    if (score >= 40) return '📚 Developing';
    return '🌱 Beginner';
  }

  getPersonalizedEncouragement(score) {
    if (score >= 90) {
      return "🌟 Outstanding code quality! You're setting the bar high for the team. Your attention to security and performance is exemplary.";
    }
    if (score >= 75) {
      return "💪 Strong work! Your code shows good understanding of best practices. A few minor adjustments will make it perfect.";
    }
    if (score >= 60) {
      return "📈 Good progress! You're on the right track. Focus on the highlighted areas to level up your code quality.";
    }
    return "💡 Learning opportunity ahead! Each issue fixed is a step toward mastery. Don't hesitate to ask for help.";
  }

  getContextSpecificAdvice(issues) {
    if (!issues || issues.length === 0) return "Keep up the excellent work maintaining high code quality!";

    const hasSecurityIssues = issues.some(i => i.type === 'security');
    const hasPerformanceIssues = issues.some(i => i.type === 'performance');

    if (hasSecurityIssues) {
      return "⚠️ **Security Focus:** The security vulnerabilities identified should be your top priority. Consider using parameterized queries and input validation.";
    }
    if (hasPerformanceIssues) {
      return "⚡ **Performance Tips:** Consider optimizing the identified bottlenecks. Look into caching strategies and algorithm improvements.";
    }
    return "💡 **Quality Tips:** Focus on code maintainability and readability. Consider refactoring complex methods.";
  }

  generateFixSuggestion(issue) {
    return `### 🔧 Fix for: ${issue.message}
**File:** \`${issue.file}:${issue.line}\`
**Severity:** ${issue.severity}

**Suggested Fix:**
\`\`\`${this.getLanguageFromFile(issue.file)}
// AI-generated fix suggestion
${this.getGenericFix(issue)}
\`\`\`

**Explanation:** This fix addresses the ${issue.type} issue by implementing proper ${issue.type === 'security' ? 'input validation' : issue.type === 'performance' ? 'optimization' : 'best practices'}.`;
  }

  getLanguageFromFile(file) {
    if (file.endsWith('.java')) return 'java';
    if (file.endsWith('.ts') || file.endsWith('.tsx')) return 'typescript';
    if (file.endsWith('.js') || file.endsWith('.jsx')) return 'javascript';
    if (file.endsWith('.py')) return 'python';
    return 'code';
  }

  getGenericFix(issue) {
    if (issue.type === 'security' && issue.message.includes('SQL')) {
      return `// Use parameterized queries
PreparedStatement stmt = connection.prepareStatement(
    "SELECT * FROM users WHERE id = ?"
);
stmt.setInt(1, userId);
ResultSet rs = stmt.executeQuery();`;
    }
    if (issue.type === 'performance') {
      return `// Use StringBuilder for string concatenation
StringBuilder sb = new StringBuilder();
for (String item : items) {
    sb.append(item);
}
return sb.toString();`;
    }
    return '// Apply recommended fix based on tool suggestion';
  }

  calculateTotalDeduction(issues) {
    if (!issues) return 0;
    return issues.reduce((total, issue) => {
      return total + (this.severityWeights[issue.severity] || 0);
    }, 0);
  }
}

// Generate sample report
async function generateSampleReport() {
  console.log('🚀 Generating V9 Sample Report for Review...\n');

  const mockResult = {
    decision: 'APPROVE_WITH_SUGGESTIONS',
    confidence: 0.85,
    reason: 'Minor issues found but overall code quality is good',
    qualityScore: 82,
    grade: 'B+',

    newIssues: [
      {
        id: 'SEC-001',
        type: 'security',
        severity: 'critical',
        file: 'src/auth/LoginController.java',
        line: 145,
        message: 'SQL Injection vulnerability - user input concatenated directly into query',
        tool: 'semgrep'
      },
      {
        id: 'PERF-001',
        type: 'performance',
        severity: 'high',
        file: 'src/utils/DataProcessor.java',
        line: 287,
        message: 'Inefficient string concatenation in loop',
        tool: 'spotbugs'
      },
      {
        id: 'QUAL-001',
        type: 'quality',
        severity: 'medium',
        file: 'src/services/UserService.java',
        line: 92,
        message: 'Method complexity is 25 (threshold: 10)',
        tool: 'pmd'
      },
      {
        id: 'STYLE-001',
        type: 'style',
        severity: 'low',
        file: 'src/models/User.java',
        line: 15,
        message: 'Missing Javadoc for public method',
        tool: 'checkstyle'
      }
    ],

    existingIssues: [
      {
        id: 'TECH-001',
        type: 'technical-debt',
        severity: 'medium',
        file: 'src/legacy/OldAPI.java',
        line: 234,
        message: 'Deprecated API usage',
        tool: 'deprecation-checker'
      }
    ],

    resolvedIssues: [
      {
        id: 'BUG-001',
        type: 'bug',
        severity: 'high',
        file: 'src/controllers/APIController.java',
        line: 78,
        message: 'Fixed NullPointerException',
        tool: 'spotbugs'
      }
    ],

    blockingIssues: [
      {
        id: 'SEC-001',
        type: 'security',
        severity: 'critical',
        file: 'src/auth/LoginController.java',
        line: 145,
        message: 'SQL Injection vulnerability - user input concatenated directly into query',
        tool: 'semgrep'
      }
    ],

    businessImpact: {
      score: 75,
      level: 'medium',
      description: 'Security vulnerability poses risk',
      riskFactors: ['SQL Injection vulnerability', 'Performance degradation under load', 'Technical debt accumulation'],
      estimatedCost: 8500,
      timeToResolve: '3-4 days'
    },

    skillScore: {
      current: 72,
      previous: 50,
      delta: 22,
      level: 'intermediate',
      improvements: ['Security awareness improved', 'Better error handling', 'Code organization enhanced']
    }
  };

  const mockMetadata = {
    repository: 'apache/kafka',
    repoUrl: 'https://github.com/apache/kafka',
    prNumber: 17620,
    prTitle: 'KAFKA-12345: Improve consumer group rebalancing',
    branch: 'feature/improve-rebalancing',
    baseBranch: 'trunk',

    prAuthor: 'john.doe',
    prAuthorEmail: 'john.doe@apache.org',
    repoOwner: 'apache',
    organizationName: 'Apache Software Foundation',

    totalLinesOfCode: 125432,
    linesAdded: 542,
    linesDeleted: 189,
    linesModified: 731,
    filesModified: 12,
    totalFiles: 5583,

    totalDuration: 45000,
    cloneTime: 5000,
    analysisTime: 35000,
    reportGenerationTime: 5000,

    agentsUsed: [
      {
        agentName: 'SecurityAgent',
        executionTime: 12000,
        issuesFound: 1,
        filesAnalyzed: 50,
        tokensUsed: 1500,
        modelUsed: {
          provider: 'openrouter',
          model: 'claude-3-sonnet',
          temperature: 0.3
        },
        cost: 0.15,
        status: 'completed'
      },
      {
        agentName: 'PerformanceAgent',
        executionTime: 8000,
        issuesFound: 1,
        filesAnalyzed: 30,
        tokensUsed: 1000,
        modelUsed: {
          provider: 'openrouter',
          model: 'gpt-4',
          temperature: 0.2
        },
        cost: 0.10,
        status: 'completed'
      },
      {
        agentName: 'QualityAgent',
        executionTime: 10000,
        issuesFound: 2,
        filesAnalyzed: 40,
        tokensUsed: 1200,
        modelUsed: {
          provider: 'openrouter',
          model: 'claude-3-haiku',
          temperature: 0.3
        },
        cost: 0.08,
        status: 'completed'
      }
    ],

    toolsUsed: [
      {
        toolName: 'semgrep',
        executionTime: 5000,
        filesScanned: 127,
        issuesFound: 1,
        exitCode: 0
      },
      {
        toolName: 'spotbugs',
        executionTime: 8000,
        filesScanned: 200,
        issuesFound: 2,
        exitCode: 0
      },
      {
        toolName: 'pmd',
        executionTime: 6000,
        filesScanned: 150,
        issuesFound: 1,
        exitCode: 0
      }
    ],

    totalCost: 0.45,
    costBreakdown: {
      aiModels: 0.33,
      infrastructure: 0.10,
      tools: 0.02
    },

    analyzer: 'V9JavaAnalyzer',
    analyzerVersion: '9.0.0',
    analyzedAt: new Date().toISOString(),
    previousScore: 85
  };

  const formatter = new MockV9ReportFormatter();
  const report = formatter.generateCompleteReport(mockResult, mockMetadata, 'Java');

  console.log(report);

  // Save to file
  const filename = `V9-Sample-Report-${Date.now()}.md`;
  fs.writeFileSync(filename, report);
  console.log(`\n✅ Report saved to: ${filename}`);
}

generateSampleReport().catch(console.error);