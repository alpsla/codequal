#!/usr/bin/env npx ts-node --transpile-only

/**
 * Generate a clean Markdown report from the analysis data
 */

import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';

function generateMarkdownReport(data: any): string {
  const mainIssues = data.mainBranchIssues || [];
  const prIssues = data.prBranchIssues || [];
  const categorized = data.categorized || {};
  
  // Extract actual issues from the wrapper
  const newIssues = (categorized.newIssues || []).map((item: any) => item.issue || item);
  const fixedIssues = (categorized.fixedIssues || []).map((item: any) => item.issue || item);
  const unchangedIssues = (categorized.unchangedIssues || []).map((item: any) => item.issue || item);
  
  // Count by severity
  const countBySeverity = (issues: any[], severity: string) => 
    issues.filter(i => i.severity === severity).length;
  
  const formatIssue = (issue: any, index: number): string => {
    const location = issue.location?.file || issue.file || 'Unknown location';
    const line = issue.location?.line || issue.line || '';
    
    return `
#### ${index + 1}. ${issue.title || issue.message || 'Untitled Issue'}

- **Severity:** ${issue.severity?.toUpperCase() || 'MEDIUM'}
- **Category:** ${issue.category || 'code-quality'}
- **Type:** ${issue.type || 'issue'}
- **Location:** \`${location}${line ? `:${line}` : ''}\`

**Description:**
${issue.description || 'No description provided'}

${issue.impact ? `**Impact:**
${issue.impact}

` : ''}${issue.recommendation || issue.remediation ? `**Recommendation:**
${issue.recommendation || issue.remediation}

` : ''}${issue.codeSnippet ? `**Code:**
\`\`\`javascript
${issue.codeSnippet}
\`\`\`

` : ''}`;
  };
  
  const markdown = `# CodeQual PR Analysis Report

## 📊 Executive Summary

**Repository:** ${data.repositoryUrl}  
**PR Number:** #${data.prNumber}  
**Analysis Date:** ${new Date().toISOString().split('T')[0]}

### Overall Statistics

| Branch | Total Issues | Critical | High | Medium | Low |
|--------|-------------|----------|------|--------|-----|
| Main Branch | ${mainIssues.length} | ${countBySeverity(mainIssues, 'critical')} | ${countBySeverity(mainIssues, 'high')} | ${countBySeverity(mainIssues, 'medium')} | ${countBySeverity(mainIssues, 'low')} |
| PR Branch | ${prIssues.length} | ${countBySeverity(prIssues, 'critical')} | ${countBySeverity(prIssues, 'high')} | ${countBySeverity(prIssues, 'medium')} | ${countBySeverity(prIssues, 'low')} |

### PR Impact Analysis

| Metric | Count | Description |
|--------|-------|-------------|
| 🆕 **New Issues** | ${newIssues.length} | Issues introduced by this PR |
| ✅ **Fixed Issues** | ${fixedIssues.length} | Issues resolved by this PR |
| ➖ **Unchanged Issues** | ${unchangedIssues.length} | Pre-existing issues not addressed |
| 📈 **Net Impact** | ${newIssues.length - fixedIssues.length} | Overall change in issue count |

### Quality Score

**PR Quality Score:** ${categorized.summary?.prQualityScore || 0}/100

${categorized.summary?.prQualityScore >= 80 ? '✅ **Excellent** - This PR significantly improves code quality' :
  categorized.summary?.prQualityScore >= 60 ? '🟡 **Good** - This PR maintains code quality with minor issues' :
  categorized.summary?.prQualityScore >= 40 ? '🟠 **Fair** - This PR has some quality concerns that should be addressed' :
  '🔴 **Poor** - This PR introduces significant quality issues'}

---

## 🆕 New Issues Introduced (${newIssues.length})

${newIssues.length > 0 ? 
  `These issues were not present in the main branch and have been introduced by this PR:

${newIssues.map((issue: any, i: number) => formatIssue(issue, i)).join('\n---\n')}`
  : 'No new issues introduced by this PR.'}

---

## ✅ Fixed Issues (${fixedIssues.length})

${fixedIssues.length > 0 ?
  `These issues were present in the main branch and have been resolved by this PR:

${fixedIssues.map((issue: any, i: number) => formatIssue(issue, i)).join('\n---\n')}`
  : 'No issues were fixed by this PR.'}

---

## ➖ Unchanged Issues (${unchangedIssues.length})

${unchangedIssues.length > 0 ?
  `These pre-existing issues remain unaddressed:

${unchangedIssues.map((issue: any, i: number) => formatIssue(issue, i)).join('\n---\n')}`
  : 'No pre-existing issues.'}

---

## 📋 Recommendations

### Immediate Actions Required

${newIssues.filter((i: any) => i.severity === 'critical').length > 0 ? 
  `⚠️ **Critical Issues:** This PR introduces ${newIssues.filter((i: any) => i.severity === 'critical').length} critical issue(s) that must be fixed before merging.
  
${newIssues.filter((i: any) => i.severity === 'critical').map((i: any) => 
  `- Fix ${i.title} in \`${i.location?.file || i.file || 'unknown'}\``).join('\n')}
` : ''}

${newIssues.filter((i: any) => i.severity === 'high').length > 0 ?
  `🟠 **High Priority Issues:** ${newIssues.filter((i: any) => i.severity === 'high').length} high severity issue(s) should be addressed.
  
${newIssues.filter((i: any) => i.severity === 'high').map((i: any) =>
  `- Address ${i.title} in \`${i.location?.file || i.file || 'unknown'}\``).join('\n')}
` : ''}

### Merge Decision

${newIssues.filter((i: any) => i.severity === 'critical').length > 0 ?
  '❌ **DECLINE** - Critical issues must be resolved before merging' :
  newIssues.filter((i: any) => i.severity === 'high').length > 3 ?
    '⚠️ **REVIEW REQUIRED** - Multiple high-priority issues need attention' :
    fixedIssues.length > newIssues.length ?
      '✅ **APPROVE** - This PR improves overall code quality' :
      '🟡 **CONDITIONAL APPROVAL** - Minor issues should be addressed in follow-up'}

---

## 📊 Detailed Metrics

### Issues by Category

| Category | Main Branch | PR Branch | Change |
|----------|-------------|-----------|--------|
${Array.from(new Set([...mainIssues, ...prIssues].map((i: any) => i.category)))
  .map(category => {
    const mainCount = mainIssues.filter((i: any) => i.category === category).length;
    const prCount = prIssues.filter((i: any) => i.category === category).length;
    const change = prCount - mainCount;
    const indicator = change > 0 ? '📈' : change < 0 ? '📉' : '➡️';
    return `| ${category} | ${mainCount} | ${prCount} | ${change > 0 ? '+' : ''}${change} ${indicator} |`;
  }).join('\n')}

### Performance Impact

- **Analysis Duration:** ${((data.metadata?.mainBranchAnalysisDuration || 0) + (data.metadata?.prBranchAnalysisDuration || 0)).toFixed(1)}s
- **Tokens Used:** ${data.metadata?.tokensUsed || 0}
- **Estimated Cost:** $${((data.metadata?.tokensUsed || 0) / 1000000 * 0.15).toFixed(4)}

---

*Generated by CodeQual Analysis v8 - ${new Date().toISOString()}*
`;

  return markdown;
}

async function main() {
  // Load existing JSON data
  const jsonPath = '/Users/alpinro/Code Prjects/codequal/packages/agents/test-reports/pr-analysis-v8-2025-08-25T18-51-36-141Z.json';
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  
  console.log('📊 Generating Markdown Report...');
  
  // Generate markdown report
  const markdown = generateMarkdownReport(data);
  
  // Save markdown report
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputPath = path.join(process.cwd(), 'test-reports', `pr-analysis-v8-${timestamp}.md`);
  fs.writeFileSync(outputPath, markdown);
  
  console.log(`✅ Markdown report saved: ${outputPath}`);
  
  // Also save as HTML with basic markdown viewer
  const htmlPath = path.join(process.cwd(), 'test-reports', `pr-analysis-v8-${timestamp}.html`);
  const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>CodeQual PR Analysis Report</title>
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #24292e;
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
            background: #ffffff;
        }
        h1 { border-bottom: 2px solid #e1e4e8; padding-bottom: 0.3em; }
        h2 { border-bottom: 1px solid #e1e4e8; padding-bottom: 0.3em; margin-top: 24px; }
        h3 { margin-top: 24px; }
        h4 { margin-top: 16px; color: #24292e; }
        table { border-collapse: collapse; width: 100%; margin: 16px 0; }
        th, td { border: 1px solid #e1e4e8; padding: 8px 12px; text-align: left; }
        th { background: #f6f8fa; font-weight: 600; }
        tr:nth-child(even) { background: #f6f8fa; }
        code { background: #f6f8fa; padding: 2px 4px; border-radius: 3px; font-family: monospace; }
        pre { background: #f6f8fa; padding: 16px; border-radius: 6px; overflow-x: auto; }
        pre code { background: none; padding: 0; }
        blockquote { border-left: 4px solid #0366d6; margin: 0; padding-left: 16px; color: #6a737d; }
        hr { border: none; border-top: 1px solid #e1e4e8; margin: 24px 0; }
        strong { font-weight: 600; }
        ul, ol { padding-left: 2em; }
        li { margin: 4px 0; }
        .severity-critical { color: #d73a49; }
        .severity-high { color: #fb8500; }
        .severity-medium { color: #f9c74f; }
        .severity-low { color: #43aa8b; }
    </style>
</head>
<body>
    <div id="content"></div>
    <script>
        const markdown = ${JSON.stringify(markdown)};
        document.getElementById('content').innerHTML = marked.parse(markdown);
    </script>
</body>
</html>`;
  
  fs.writeFileSync(htmlPath, html);
  console.log(`✅ HTML viewer saved: ${htmlPath}`);
  
  // Open in browser
  console.log('📂 Opening in browser...');
  exec(`open "${htmlPath}"`);
}

main().catch(console.error);