#!/usr/bin/env ts-node

/**
 * V9 Enhanced Complete Report Generator with All Fixes
 * - Proper code snippets for unmodified files
 * - Detailed tool performance metadata
 * - Agent and model usage with costs
 * - Fixed file selection logic
 */

import * as fs from 'fs';
import * as path from 'path';

// Mock issues data with complete structure
const ISSUES_DATA = {
  newInPR: [
    {
      id: 'SEC-001',
      title: 'SQL Injection Vulnerability in New Code',
      severity: 'critical',
      category: 'Security',
      file: 'src/main/java/kafka/consumer/BatchProcessor.java',
      line: 245,
      column: 12,
      tool: 'semgrep',
      confidence: 0.95,
      cwe: 'CWE-89',
      owasp: 'A03:2021',
      description: 'User input directly concatenated in SQL query without sanitization in newly added method'
    },
    {
      id: 'PERF-001', 
      title: 'N+1 Query Pattern in New Loop',
      severity: 'high',
      category: 'Performance',
      file: 'src/main/java/kafka/consumer/BatchProcessor.java',
      line: 178,
      column: 8,
      tool: 'custom-analyzer',
      confidence: 0.88,
      description: 'Database query inside loop will cause performance degradation',
      impact: '100x performance degradation with large datasets'
    }
  ],
  existingInModified: [
    {
      id: 'SEC-002',
      title: 'Hardcoded Credentials',
      severity: 'high', 
      category: 'Security',
      file: 'src/main/java/kafka/security/AuthManager.java',
      line: 67,
      column: 15,
      tool: 'trufflehog',
      confidence: 0.99,
      cwe: 'CWE-798',
      description: 'Password hardcoded in modified file (pre-existing issue)'
    },
    {
      id: 'QUAL-001',
      title: 'High Cyclomatic Complexity',
      severity: 'medium',
      category: 'Code Quality',
      file: 'src/main/java/kafka/utils/Utils.java',
      line: 234,
      column: 4,
      tool: 'pmd',
      confidence: 0.92,
      description: 'Method processData has complexity of 25 (threshold: 10)'
    }
  ],
  existingInUnmodified: [
    {
      id: 'SEC-003',
      title: 'Weak TLS Configuration',
      severity: 'medium',
      category: 'Security',
      file: 'src/main/java/kafka/network/SocketServer.java',
      line: 512,
      column: 20,
      tool: 'gosec',
      confidence: 0.85,
      cwe: 'CWE-326',
      description: 'TLS 1.0 enabled, should use TLS 1.2+'
    },
    {
      id: 'QUAL-002',
      title: 'Missing JavaDoc',
      severity: 'low',
      category: 'Code Quality',
      file: 'src/main/java/kafka/common/Config.java',
      line: 89,
      column: 1,
      tool: 'checkstyle',
      confidence: 0.90,
      description: 'Public method lacks documentation'
    },
    {
      id: 'BP-001',
      title: 'Empty Catch Block',
      severity: 'low',
      category: 'Best Practices',
      file: 'src/main/java/kafka/controller/Controller.java',
      line: 456,
      column: 12,
      tool: 'errorprone',
      confidence: 0.88,
      description: 'Exception swallowed without logging'
    }
  ],
  resolved: [
    {
      id: 'SEC-004',
      title: 'Fixed: Insecure Random Number Generator',
      severity: 'high',
      file: 'src/main/java/kafka/auth/TokenValidator.java',
      line: 123,
      description: 'Math.random() replaced with SecureRandom'
    },
    {
      id: 'PERF-003',
      title: 'Fixed: Memory Leak in Cache',
      severity: 'medium',
      file: 'src/main/java/kafka/cache/CacheManager.java',
      line: 234,
      description: 'Unbounded cache now has size limit'
    }
  ]
};

// Enhanced code snippets with proper context
const CODE_SNIPPETS: { [key: string]: any } = {
  'SEC-001': {
    current: {
      before: '    public List<Record> getRecords(String userId) {',
      issue: '        String query = "SELECT * FROM records WHERE user_id = " + userId;',
      after: '        return database.execute(query);'
    },
    fix: {
      before: '    public List<Record> getRecords(String userId) {',
      issue: '        PreparedStatement stmt = conn.prepareStatement("SELECT * FROM records WHERE user_id = ?");',
      after: '        stmt.setString(1, userId);'
    }
  },
  'PERF-001': {
    current: {
      before: '    public void processItems(List<Item> items) {',
      issue: '        for (Item item : items) { db.query("SELECT * FROM data WHERE id = " + item.id); }',
      after: '        results.add(queryResult);'
    },
    fix: {
      before: '    public void processItems(List<Item> items) {',
      issue: '        String ids = items.stream().map(i -> i.id).collect(Collectors.joining(","));',
      after: '        List<Data> allData = db.query("SELECT * FROM data WHERE id IN (" + ids + ")");\n'
    }
  },
  'SEC-002': {
    current: {
      before: '    private void authenticate() {',
      issue: '        String password = "admin123"; // TODO: move to config',
      after: '        login(username, password);'
    },
    fix: {
      before: '    private void authenticate() {',
      issue: '        String password = System.getenv("AUTH_PASSWORD");',
      after: '        login(username, password);'
    }
  },
  'QUAL-001': {
    current: {
      before: '    public Result processData(Input input) {',
      issue: '        // 200 lines of nested if-else statements',
      after: '        return result;'
    },
    fix: {
      before: '    public Result processData(Input input) {',
      issue: '        return processWithStrategy(input, getStrategy(input.type));',
      after: '    }'
    }
  },
  'SEC-003': {
    current: {
      before: '    private void configureTLS() {',
      issue: '        tlsContext.setProtocols(new String[] {"TLSv1.0", "TLSv1.1"});',
      after: '        tlsContext.setMaxConnections(100);'
    },
    fix: {
      before: '    private void configureTLS() {',
      issue: '        tlsContext.setProtocols(new String[] {"TLSv1.2", "TLSv1.3"});',
      after: '        tlsContext.setMaxConnections(100);'
    }
  },
  'QUAL-002': {
    current: {
      before: '    // Config processing methods',
      issue: '    public void processConfig() {',
      after: '        loadConfigFromFile();'
    },
    fix: {
      before: '    /**',
      issue: '     * Processes configuration settings from all sources',
      after: '     */'
    }
  },
  'BP-001': {
    current: {
      before: '        try {',
      issue: '            processRequest();',
      after: '        } catch (Exception e) { /* Empty */ }'
    },
    fix: {
      before: '        try {',
      issue: '            processRequest();',
      after: '        } catch (Exception e) { logger.error("Request processing failed", e); }'
    }
  }
};

// Tool performance data
const TOOLS_PERFORMANCE = [
  { name: 'semgrep', status: '✅', issues: 1, time: '3.2s', errorRate: '0%' },
  { name: 'trufflehog', status: '✅', issues: 1, time: '1.1s', errorRate: '0%' },
  { name: 'pmd', status: '✅', issues: 1, time: '2.3s', errorRate: '0%' },
  { name: 'checkstyle', status: '✅', issues: 1, time: '1.8s', errorRate: '0%' },
  { name: 'gosec', status: '✅', issues: 1, time: '2.1s', errorRate: '0%' },
  { name: 'errorprone', status: '✅', issues: 1, time: '0.7s', errorRate: '0%' },
  { name: 'custom-analyzer', status: '✅', issues: 1, time: '4.5s', errorRate: '0%' }
];

// Agent and model usage data
const AGENT_MODEL_USAGE = [
  {
    agent: 'SecurityAnalyzer',
    model: 'gpt-4o-mini',
    calls: 5,
    tokensIn: 4500,
    tokensOut: 1200,
    cost: 0.75,
    purpose: 'Security vulnerability detection'
  },
  {
    agent: 'PerformanceAnalyzer',
    model: 'claude-3-haiku',
    calls: 3,
    tokensIn: 3200,
    tokensOut: 850,
    cost: 0.45,
    purpose: 'Performance bottleneck analysis'
  },
  {
    agent: 'QualityAnalyzer',
    model: 'gpt-3.5-turbo',
    calls: 8,
    tokensIn: 6800,
    tokensOut: 1600,
    cost: 0.35,
    purpose: 'Code quality and best practices'
  },
  {
    agent: 'DependencyAnalyzer',
    model: 'gpt-4o-mini',
    calls: 2,
    tokensIn: 1800,
    tokensOut: 450,
    cost: 0.25,
    purpose: 'Dependency vulnerability scanning'
  },
  {
    agent: 'ReportGenerator',
    model: 'claude-3-sonnet',
    calls: 1,
    tokensIn: 8500,
    tokensOut: 3200,
    cost: 0.85,
    purpose: 'Comprehensive report generation'
  }
];

function calculateFilesAnalyzed(totalFiles: number): { analyzed: number; percentage: string } {
  // Fixed logic: repos under 10k files should be fully scanned
  if (totalFiles < 10000) {
    return { analyzed: totalFiles, percentage: '100.0' };
  }
  
  // For larger repos, use smart selection
  const targetPercentage = Math.max(1, Math.min(10, 1000 / totalFiles * 10));
  const analyzed = Math.ceil(totalFiles * targetPercentage / 100);
  
  return { analyzed, percentage: targetPercentage.toFixed(1) };
}

function generateDecision(): { decision: string; emoji: string; reason: string } {
  const hasNewCritical = ISSUES_DATA.newInPR.some(i => i.severity === 'critical');
  const hasNewHigh = ISSUES_DATA.newInPR.some(i => i.severity === 'high');
  const hasModifiedCritical = ISSUES_DATA.existingInModified.some(i => i.severity === 'critical');
  const hasModifiedHigh = ISSUES_DATA.existingInModified.some(i => i.severity === 'high');

  if (hasNewCritical || hasModifiedCritical) {
    return {
      decision: 'DECLINED',
      emoji: '❌',
      reason: 'Critical security vulnerability must be fixed before merging'
    };
  }
  
  if (hasNewHigh || hasModifiedHigh) {
    return {
      decision: 'CHANGES REQUESTED',
      emoji: '⚠️',
      reason: 'High priority issues must be addressed'
    };
  }

  return {
    decision: 'APPROVED',
    emoji: '✅',
    reason: 'All checks passed, minor issues can be addressed in follow-up'
  };
}

function calculateQualityScore(): number {
  const allIssues = [
    ...ISSUES_DATA.newInPR,
    ...ISSUES_DATA.existingInModified,
    ...ISSUES_DATA.existingInUnmodified
  ];
  
  const weights: { [key: string]: number } = {
    critical: 30,
    high: 20,
    medium: 10,
    low: 5
  };
  
  const totalPenalty = allIssues.reduce((sum, issue) => {
    return sum + (weights[issue.severity] || 0);
  }, 0);
  
  const bonusForResolved = ISSUES_DATA.resolved.length * 5;
  const score = Math.max(0, Math.min(100, 100 - totalPenalty + bonusForResolved));
  
  return score;
}

function getGrade(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

function generateReport(): string {
  const now = new Date();
  const reportId = `RPT-${Date.now()}`;
  const score = calculateQualityScore();
  const grade = getGrade(score);
  const { decision, emoji, reason } = generateDecision();
  const allIssues = [...ISSUES_DATA.newInPR, ...ISSUES_DATA.existingInModified, ...ISSUES_DATA.existingInUnmodified];
  
  // Fixed file selection logic
  const totalFiles = 6948;
  const { analyzed, percentage } = calculateFilesAnalyzed(totalFiles);
  
  // Calculate total costs
  const totalApiCalls = AGENT_MODEL_USAGE.reduce((sum, a) => sum + a.calls, 0);
  const totalTokensIn = AGENT_MODEL_USAGE.reduce((sum, a) => sum + a.tokensIn, 0);
  const totalTokensOut = AGENT_MODEL_USAGE.reduce((sum, a) => sum + a.tokensOut, 0);
  const totalCost = AGENT_MODEL_USAGE.reduce((sum, a) => sum + a.cost, 0);

  const report = `# 🔍 CodeQual V9 Analysis Report

Hi @john.doe,

${decision === 'DECLINED' ? 'We found critical issues that must be addressed.' : decision === 'CHANGES REQUESTED' ? 'Some high priority issues need attention.' : 'Great work! Your PR meets our quality standards.'} Your code quality score is **${score.toFixed(2)}/100 (${grade})**.

${ISSUES_DATA.resolved.length > 0 ? `🏆 Excellent job fixing ${ISSUES_DATA.resolved.length} existing issues!` : ''}

Please review the detailed report below and let us know if you need help.

---

## ${emoji} PR Decision: **${decision}**

**Reason:** ${reason}

---

## 📋 Report Metadata

| Field | Value |
|-------|-------|
| **Repository** | Apache Kafka |
| **Repository URL** | https://github.com/apache/kafka |
| **PR Number** | #17620 |
| **PR Title** | KAFKA-17620: Optimize consumer batch processing |
| **PR Author** | @john.doe |
| **Base Branch** | trunk |
| **PR Branch** | feature/optimize-batch |
| **Language** | java |
| **Analysis Date** | ${now.toISOString()} |
| **Analyzer Version** | V9.0.0 |
| **Report ID** | ${reportId} |
| **Team** | Platform Team |
| **Total Files in Repo** | ${totalFiles.toLocaleString()} |
| **Files Analyzed** | ${analyzed.toLocaleString()} (${percentage}%) |
| **File Selection** | ${totalFiles < 10000 ? 'Full Scan' : 'Smart Selection'} |
| **Analysis Duration** | 13.9 seconds |
| **Total API Calls** | ${totalApiCalls} |
| **Total Tokens** | ${(totalTokensIn + totalTokensOut).toLocaleString()} |
| **Total Cost** | $${totalCost.toFixed(2)} |

---

## 📊 Executive Summary

### Overall Assessment
- **Decision:** ${decision} ${emoji}
- **Quality Score:** ${score.toFixed(2)}/100 (Grade: **${grade}**)
- **Confidence Level:** 91%
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
- 🆕 **${ISSUES_DATA.newInPR.length} new issues** introduced in this PR${ISSUES_DATA.newInPR.some(i => i.severity === 'critical' || i.severity === 'high') ? ' (including critical/high severity)' : ''}
- 📝 **${ISSUES_DATA.existingInModified.length} existing issues** in modified files that should be addressed
- 📊 **${ISSUES_DATA.existingInUnmodified.length} existing issues** in unmodified files (affects score only)
- ✅ **${ISSUES_DATA.resolved.length} issues resolved** - great progress!

---

## 🆕 New Issues in PR (Blocking if Critical/High)

These issues were introduced by the new code in this PR and must be fixed if they are critical or high severity:

${ISSUES_DATA.newInPR.map(issue => {
  const locationStr = issue.column 
    ? `\`${issue.file}:${issue.line}:${issue.column}\``
    : `\`${issue.file}:${issue.line}\``;
  const snippet = CODE_SNIPPETS[issue.id];
  
  return `
### ${issue.severity === 'critical' ? '🔴' : issue.severity === 'high' ? '🟠' : issue.severity === 'medium' ? '🟡' : '🟢'} ${issue.title}

**ID:** ${issue.id} | **Severity:** ${issue.severity.toUpperCase()} | **Category:** ${issue.category}  
**Location:** ${locationStr}  
**Tool:** ${issue.tool} | **Confidence:** ${((issue.confidence || 0.9) * 100).toFixed(0)}%  
${issue.cwe ? `**CWE:** ${issue.cwe} | ` : ''}${issue.owasp ? `**OWASP:** ${issue.owasp}` : ''}

**Description:** ${issue.description}  
${issue.impact ? `**Impact:** ${issue.impact}` : ''}

**Current Code:**
\`\`\`java
${snippet?.current?.before || '    // Previous line'}
${snippet?.current?.issue || '    // Issue here'} // ← ISSUE HERE
${snippet?.current?.after || '    // Next line'}
\`\`\`

**Suggested Fix:**
\`\`\`java
${snippet?.fix?.before || '    // Previous line'}
${snippet?.fix?.issue || '    // Fixed code'} // ← FIXED
${snippet?.fix?.after || '    // Next line'}
\`\`\`
`;
}).join('\n')}

---

## 📝 Existing Issues in Modified Files (Blocking if Critical/High)

These pre-existing issues are in files you modified. Critical/High severity issues here will block the PR:

${ISSUES_DATA.existingInModified.map(issue => {
  const locationStr = issue.column 
    ? `\`${issue.file}:${issue.line}:${issue.column}\``
    : `\`${issue.file}:${issue.line}\``;
  const snippet = CODE_SNIPPETS[issue.id];
  
  return `
### ${issue.severity === 'high' ? '🟠' : issue.severity === 'medium' ? '🟡' : '🟢'} ${issue.title}

**ID:** ${issue.id} | **Severity:** ${issue.severity.toUpperCase()} | **Category:** ${issue.category}  
**Location:** ${locationStr}  
**Tool:** ${issue.tool} | **Confidence:** ${((issue.confidence || 0.9) * 100).toFixed(0)}%  
${issue.cwe ? `**CWE:** ${issue.cwe} ` : ''}

**Description:** ${issue.description}  

**Current Code:**
\`\`\`java
${snippet?.current?.before || '    // Previous line'}
${snippet?.current?.issue || '    // Issue here'} // ← ISSUE HERE
${snippet?.current?.after || '    // Next line'}
\`\`\`

**Suggested Fix:**
\`\`\`java
${snippet?.fix?.before || '    // Previous line'}
${snippet?.fix?.issue || '    // Fixed code'} // ← FIXED
${snippet?.fix?.after || '    // Next line'}
\`\`\`
`;
}).join('\n')}

---

## 📊 Existing Issues in Unmodified Files (Score Impact Only)

These issues exist in the codebase but are not in files you modified. They affect your score but won't block the PR:

${ISSUES_DATA.existingInUnmodified.map(issue => {
  const locationStr = issue.column 
    ? `\`${issue.file}:${issue.line}:${issue.column}\``
    : `\`${issue.file}:${issue.line}\``;
  const snippet = CODE_SNIPPETS[issue.id];
  
  return `
### ${issue.severity === 'medium' ? '🟡' : '🟢'} ${issue.title}

**ID:** ${issue.id} | **Severity:** ${issue.severity.toUpperCase()} | **Category:** ${issue.category}  
**Location:** ${locationStr}  
**Tool:** ${issue.tool} | **Confidence:** ${((issue.confidence || 0.9) * 100).toFixed(0)}%  
${issue.cwe ? `**CWE:** ${issue.cwe}` : ''}

**Description:** ${issue.description}

**Current Code:**
\`\`\`java
${snippet?.current?.before || '    // Previous line'}
${snippet?.current?.issue || '    // Issue here'} // ← ISSUE HERE
${snippet?.current?.after || '    // Next line'}
\`\`\`

**Suggested Fix:**
\`\`\`java
${snippet?.fix?.before || '    // Previous line'}
${snippet?.fix?.issue || '    // Fixed code'} // ← FIXED
${snippet?.fix?.after || '    // Next line'}
\`\`\`
`;
}).join('\n')}

---

## ✅ Resolved Issues

Excellent work! These issues were present in the main branch but have been fixed in your PR:

${ISSUES_DATA.resolved.map(issue => `
### ✅ ${issue.title}
**Location:** \`${issue.file}:${issue.line}\` | **Previous Severity:** ${issue.severity.toUpperCase()}  
**Resolution:** ${issue.description}
`).join('\n')}

---

## 🔧 Analysis Tools Performance

| Tool | Status | Issues Found | Execution Time | Error Rate |
|------|--------|--------------|----------------|------------|
${TOOLS_PERFORMANCE.map(tool => 
  `| ${tool.name} | ${tool.status} | ${tool.issues} | ${tool.time} | ${tool.errorRate} |`
).join('\n')}

---

## 🤖 Agent & Model Performance

### Agent Execution Details

| Agent | Model | API Calls | Tokens In | Tokens Out | Cost | Purpose |
|-------|-------|-----------|-----------|------------|------|---------|
${AGENT_MODEL_USAGE.map(agent => 
  `| ${agent.agent} | ${agent.model} | ${agent.calls} | ${agent.tokensIn.toLocaleString()} | ${agent.tokensOut.toLocaleString()} | $${agent.cost.toFixed(2)} | ${agent.purpose} |`
).join('\n')}
| **Total** | **-** | **${totalApiCalls}** | **${totalTokensIn.toLocaleString()}** | **${totalTokensOut.toLocaleString()}** | **$${totalCost.toFixed(2)}** | **-** |

### Model Distribution
- **Primary Model:** gpt-4o-mini (40% of calls)
- **Secondary Models:** claude-3-haiku (20%), gpt-3.5-turbo (30%)
- **Report Generation:** claude-3-sonnet (10%)

### Cost Breakdown by Category
- **Security Analysis:** $1.00 (37%)
- **Performance Analysis:** $0.45 (17%)
- **Quality Analysis:** $0.35 (13%)
- **Dependency Analysis:** $0.25 (9%)
- **Report Generation:** $0.85 (31%)
- **Overhead/Retries:** $0.00 (0%)

---

## 💰 Business Impact Analysis

### Financial Impact

| Issue Category | Count | Fix Cost | Potential Loss if Unfixed | ROI |
|---------------|-------|----------|--------------------------|-----|
| New Critical/High | ${ISSUES_DATA.newInPR.filter(i => i.severity === 'critical' || i.severity === 'high').length} | $${ISSUES_DATA.newInPR.filter(i => i.severity === 'critical' || i.severity === 'high').length * 3000} | $${ISSUES_DATA.newInPR.filter(i => i.severity === 'critical' || i.severity === 'high').length * 250000} | ${ISSUES_DATA.newInPR.filter(i => i.severity === 'critical' || i.severity === 'high').length > 0 ? '8,233%' : 'N/A'} |
| Existing in Modified | ${ISSUES_DATA.existingInModified.length} | $${ISSUES_DATA.existingInModified.length * 1500} | $${ISSUES_DATA.existingInModified.length * 50000} | ${ISSUES_DATA.existingInModified.length > 0 ? '3,233%' : 'N/A'} |
| Resolved | ${ISSUES_DATA.resolved.length} | -$${ISSUES_DATA.resolved.length * 2000} | Avoided Loss | ♻️ Positive |
| **Net Impact** | **${allIssues.length - ISSUES_DATA.resolved.length}** | **$${(ISSUES_DATA.newInPR.filter(i => i.severity === 'critical' || i.severity === 'high').length * 3000) + (ISSUES_DATA.existingInModified.length * 1500) - (ISSUES_DATA.resolved.length * 2000)}** | **$${(ISSUES_DATA.newInPR.filter(i => i.severity === 'critical' || i.severity === 'high').length * 250000) + (ISSUES_DATA.existingInModified.length * 50000)}** | **Very High** |

### Risk Assessment
- **Security Risk:** ${ISSUES_DATA.newInPR.some(i => i.category === 'Security' && (i.severity === 'critical' || i.severity === 'high')) ? 'HIGH 🔴' : 'MEDIUM 🟡'}
- **Performance Risk:** ${ISSUES_DATA.newInPR.some(i => i.category === 'Performance' && i.severity === 'high') ? 'HIGH 🔴' : 'LOW 🟢'}
- **Maintainability Risk:** MEDIUM 🟡
- **Compliance Risk:** ${allIssues.some((i: any) => i.cwe || i.owasp) ? 'HIGH 🔴' : 'LOW 🟢'}

---

## 🎯 Recommendations

### Immediate Actions (Required for Approval)

${ISSUES_DATA.newInPR.filter(i => i.severity === 'critical' || i.severity === 'high').length > 0 ? 
ISSUES_DATA.newInPR.filter(i => i.severity === 'critical' || i.severity === 'high').map((issue, idx) => {
  const snippet = CODE_SNIPPETS[issue.id];
  return `
#### ${idx + 1}. Fix ${issue.title}
**File:** \`${issue.file}:${issue.line}\`  
**Severity:** ${issue.severity.toUpperCase()}

**Quick Fix:**
\`\`\`java
${snippet?.fix?.issue || '// Apply the suggested fix shown above'}
\`\`\`
`;
}).join('\n') : '✅ None - no critical/high issues in new code!'}

### Should Fix (In Modified Files)

${ISSUES_DATA.existingInModified.filter(i => i.severity === 'high' || i.severity === 'medium').length > 0 ?
ISSUES_DATA.existingInModified.filter(i => i.severity === 'high' || i.severity === 'medium').map((issue, idx) => {
  const snippet = CODE_SNIPPETS[issue.id];
  return `
#### ${idx + 1}. Address ${issue.title}
**File:** \`${issue.file}:${issue.line}\`  
**Severity:** ${issue.severity.toUpperCase()}

**Quick Fix:**
\`\`\`java
${snippet?.fix?.issue || '// Apply security/quality best practices'}
\`\`\`
`;
}).join('\n') : '✅ None - modified files are clean!'}

### Future Improvements (Technical Debt)
1. Address remaining ${ISSUES_DATA.existingInUnmodified.length} issues in unmodified files
2. Improve test coverage (currently at 78%, target 80%)
3. Reduce cyclomatic complexity in complex methods
4. Add missing documentation for public APIs

---

## 📈 Code Quality Metrics

| Metric | This PR | Main Branch | Change | Target | Status |
|--------|---------|-------------|--------|--------|--------|
| Quality Score | ${score.toFixed(2)}/100 | 75/100 | ${(score - 75).toFixed(2)} | ≥80 | ${score >= 80 ? '✅' : '⚠️'} |
| Issues/KLOC | 3.2 | 4.1 | -0.9 | <2.0 | ⚠️ |
| Test Coverage | 78% | 76% | +2% | >80% | ⚠️ |
| Documentation | 65% | 63% | +2% | >70% | ⚠️ |
| Tech Debt | 42h | 45h | -3h | <20h | ⚠️ |

---

## 🏆 Developer & Team Skill Assessment

### Individual Performance (@john.doe)
- **Security Awareness:** 65/100 (Needs Improvement) 
- **Code Quality:** 78/100 (Good)
- **Performance Optimization:** 70/100 (Fair)
- **Best Practices:** 81/100 (Very Good)
- **Issue Resolution:** 90/100 (Excellent)

### Team Performance (Platform Team)
- **Average Score:** 76/100
- **Trend:** 📉 Declining
- **Ranking:** 3rd of 8 teams
- **Issues Fixed This Sprint:** 23
- **New Issues This Sprint:** 12

### Growth Areas
1. **Security:** Review OWASP Top 10 and secure coding practices
2. **Performance:** Study query optimization and caching strategies
3. **Clean Code:** Consider refactoring complex methods

---

## 📊 Historical Comparison

| PR # | Author | New Issues | Score | Decision | Date |
|------|--------|------------|-------|----------|------|
| **#17620** | **@john.doe** | **${ISSUES_DATA.newInPR.length}** | **${score.toFixed(2)}/100** | **${decision}** | **Today** |
| #17619 | @jane.smith | 1 | 85/100 | Approved | Yesterday |
| #17618 | @bob.jones | 5 | 68/100 | Changes Requested | 2 days ago |
| #17617 | @alice.wong | 0 | 92/100 | Approved | 3 days ago |
| #17616 | @john.doe | 3 | 74/100 | Approved | 4 days ago |

**Your Trend:** 📉 Needs attention (Last PR: 74/100)

---

## 📚 Educational Resources

### For Your Specific Issues

${ISSUES_DATA.newInPR.some(i => i.category === 'Security') ? `
**Security Issues:**
- [SQL Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
- [OWASP Top 10 2021](https://owasp.org/Top10/)
- [Secure Coding in Java](https://www.oracle.com/java/technologies/javase/seccodeguide.html)
` : ''}

${ISSUES_DATA.newInPR.some(i => i.category === 'Performance') ? `
**Performance Issues:**
- [N+1 Query Problem](https://stackoverflow.com/questions/97197/what-is-the-n1-selects-problem-in-orm)
- [Database Query Optimization](https://use-the-index-luke.com/)
- [Java Performance Best Practices](https://www.oracle.com/technical-resources/articles/java/performance.html)
` : ''}

### Recommended Learning Path
1. Complete security training module (2 hours)
2. Review team coding standards (30 minutes)
3. Study similar high-quality PRs from senior developers

---

## 📝 Pull Request Details

### Changes Summary
- **Files Modified:** 15
- **Lines Added:** 450 (+)
- **Lines Removed:** 220 (-)
- **Net Change:** +230 lines
- **Test Coverage:** 78% of new code

### Modified Files
\`\`\`
src/main/java/kafka/consumer/BatchProcessor.java     | +234 -45
src/main/java/kafka/security/AuthManager.java        | +45  -23
src/main/java/kafka/utils/Utils.java                 | +89  -67
src/main/java/kafka/cache/CacheManager.java          | +34  -56
src/main/java/kafka/auth/TokenValidator.java         | +23  -12
... and 10 more files
\`\`\`

### PR Checklist
- [x] Code compiles without warnings
- [x] All existing tests pass
- [x] New tests added for new functionality
- [${decision === 'DECLINED' || decision === 'CHANGES REQUESTED' ? ' ' : 'x'}] Security vulnerabilities addressed
- [x] Performance impact assessed
- [ ] Documentation updated
- [x] Code review requested
- [${decision === 'APPROVED' ? 'x' : ' '}] Ready to merge

---

## 🔄 Next Steps

${decision === 'DECLINED' || decision === 'CHANGES REQUESTED' ? `
### For Developer (@john.doe)
1. Fix critical/high issues listed above
2. Run security scanner locally before re-submitting
3. Add tests for security-critical code paths
4. Request re-review when complete

### For Reviewers
1. Verify security fixes are properly implemented
2. Check test coverage for new code
3. Validate performance impact
` : `
### For Developer (@john.doe)
1. Consider addressing low priority issues in follow-up PR
2. Update documentation for new features
3. Monitor production metrics after deployment

### For Reviewers
1. Approve and merge when CI passes
2. Tag for deployment to staging
3. Schedule production release
`}

---

## 📧 Notifications

**Subscribed:** @john.doe, @Platform Team-leads, @security-team  
**CC:** @platform-architects  
**Slack Channel:** #platform-team-prs

---

*Generated by CodeQual V9 - Enterprise Edition*  
*Report ID: ${reportId}*  
*For support: devops@codequal.com | Slack: #codequal-support*

---

## 💬 Personalized PR Comment

\`\`\`markdown
Hi @john.doe,

${decision === 'DECLINED' ? 'We found critical issues that must be addressed.' : decision === 'CHANGES REQUESTED' ? 'Some high priority issues need attention.' : 'Great work! Your PR meets our quality standards.'} Your code quality score is **${score.toFixed(2)}/100 (${grade})**.

${ISSUES_DATA.resolved.length > 0 ? `🏆 Excellent job fixing ${ISSUES_DATA.resolved.length} existing issues!` : ''}

Please review the detailed report below and let us know if you need help.

---

## ${emoji} PR Decision: **${decision}**

### 📊 Quick Stats
- **New Issues:** ${ISSUES_DATA.newInPR.length} ${ISSUES_DATA.newInPR.some(i => i.severity === 'critical' || i.severity === 'high') ? '⚠️' : ''}
- **Resolved Issues:** ${ISSUES_DATA.resolved.length} ${ISSUES_DATA.resolved.length > 0 ? '🎉' : ''}
- **Quality Score:** ${score.toFixed(2)}/100 (${grade})
- **Decision:** ${decision}

${decision === 'DECLINED' || decision === 'CHANGES REQUESTED' ? `### 🚨 Critical/High Issues to Fix
${ISSUES_DATA.newInPR.filter(i => i.severity === 'critical' || i.severity === 'high').map(issue => 
  `- [ ] ${issue.title} (\`${issue.file}:${issue.line}\`)`
).join('\n')}

Please address these before we can approve.
` : '### ✅ Ready to Merge\n\nAll critical checks passed! Minor issues can be addressed in follow-up PRs.'}

${ISSUES_DATA.resolved.length > 0 ? `
### ✅ Issues You Fixed
${ISSUES_DATA.resolved.map(issue => `- ${issue.title}`).join('\n')}

Great job cleaning up technical debt!` : ''}

View the [full report](#) for detailed analysis and suggested fixes.

---
<sub>🤖 CodeQual V9 | [Configure](https://codequal.com/settings) | [Docs](https://docs.codequal.com)</sub>
\`\`\`

`;

  return report;
}

// Main execution
console.log('🚀 Generating Enhanced V9 Report with All Fixes...\n');

const report = generateReport();
const filename = `v9-enhanced-complete-17620-${Date.now()}.md`;
const filepath = path.join(__dirname, filename);

fs.writeFileSync(filepath, report);

console.log('✅ Enhanced V9 Report Generated!\n');
console.log('📊 Report Statistics:');
console.log(`  - File: ${filepath}`);
console.log(`  - Size: ${(report.length / 1024).toFixed(1)} KB`);

const { decision } = generateDecision();
const score = calculateQualityScore();
const grade = getGrade(score);

console.log(`  - Decision: ${decision}`);
console.log(`  - Score: ${score.toFixed(2)}/100 (${grade})`);
console.log(`  - Issues: ${[...ISSUES_DATA.newInPR, ...ISSUES_DATA.existingInModified, ...ISSUES_DATA.existingInUnmodified].length} active, ${ISSUES_DATA.resolved.length} resolved`);

// File selection info
const totalFiles = 6948;
const { analyzed, percentage } = calculateFilesAnalyzed(totalFiles);
console.log(`  - Files: ${analyzed.toLocaleString()}/${totalFiles.toLocaleString()} analyzed (${percentage}%)`);
console.log(`  - Selection Mode: ${totalFiles < 10000 ? 'Full Scan' : 'Smart Selection'}`);

// Cost info
const totalCost = AGENT_MODEL_USAGE.reduce((sum, a) => sum + a.cost, 0);
console.log(`  - Total Cost: $${totalCost.toFixed(2)}`);
console.log(`  - Agents Used: ${AGENT_MODEL_USAGE.length}`);

console.log('\n🎉 Enhanced report includes:');
console.log('  ✓ Proper code snippets for ALL issues (including unmodified files)');
console.log('  ✓ Detailed tool performance metadata');
console.log('  ✓ Agent and model usage with costs');
console.log('  ✓ Fixed file selection logic (full scan for <10k files)');
console.log('  ✓ Complete cost breakdown by category');