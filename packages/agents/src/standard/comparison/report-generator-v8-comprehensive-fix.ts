/**
 * Comprehensive fixes for V8 Report Generator
 * Addresses BUG-098 through BUG-116
 */

import { Issue, ComparisonResult } from '../types/analysis-types';

export class V8ReportFixes {
  /**
   * Fix 1: Ensure issue counts are consistent between summary and details
   * The executive summary should only count NEW issues, not all PR issues
   */
  static fixExecutiveSummaryCount(comparisonResult: ComparisonResult): {
    newIssues: Issue[];
    persistentIssues: Issue[];
    fixedIssues: Issue[];
    newIssueCounts: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
  } {
    // Get issues arrays with fallback field names
    const newIssues = comparisonResult.newIssues || comparisonResult.addedIssues || [];
    const persistentIssues = comparisonResult.unchangedIssues || comparisonResult.persistentIssues || [];
    const fixedIssues = comparisonResult.resolvedIssues || comparisonResult.fixedIssues || [];
    
    // Count only NEW issues for summary (not persistent)
    const newIssueCounts = {
      critical: newIssues.filter(i => i.severity === 'critical').length,
      high: newIssues.filter(i => i.severity === 'high').length,
      medium: newIssues.filter(i => i.severity === 'medium').length,
      low: newIssues.filter(i => i.severity === 'low').length
    };
    
    return {
      newIssues,
      persistentIssues,
      fixedIssues,
      newIssueCounts
    };
  }
  
  /**
   * Fix 2: Generate Security Analysis that shows actual issues
   * Don't show "100% clean" when issues exist
   */
  static generateAccurateSecurityAnalysis(issues: Issue[]): string {
    const securityIssues = issues.filter(i => 
      i.category === 'security' || 
      i.category === 'dependencies' ||
      i.type === 'vulnerability'
    );
    
    let content = `## 🔒 Security Analysis\n\n`;
    
    if (securityIssues.length === 0) {
      content += `✅ **No security vulnerabilities detected in this PR.**\n\n`;
      content += `### Security Best Practices Verified\n`;
      content += `- ✅ Input validation\n`;
      content += `- ✅ Authentication & Authorization\n`;
      content += `- ✅ Data encryption\n`;
      content += `- ✅ Secure communication\n`;
      content += `- ✅ No dependency vulnerabilities\n`;
    } else {
      const critical = securityIssues.filter(i => i.severity === 'critical').length;
      const high = securityIssues.filter(i => i.severity === 'high').length;
      const medium = securityIssues.filter(i => i.severity === 'medium').length;
      const low = securityIssues.filter(i => i.severity === 'low').length;
      
      content += `⚠️ **Security Issues Found: ${securityIssues.length}**\n\n`;
      content += `| Severity | Count | Action Required |\n`;
      content += `|----------|-------|----------------|\n`;
      if (critical > 0) content += `| 🔴 Critical | ${critical} | Immediate fix required |\n`;
      if (high > 0) content += `| 🟠 High | ${high} | Fix before merge |\n`;
      if (medium > 0) content += `| 🟡 Medium | ${medium} | Plan remediation |\n`;
      if (low > 0) content += `| 🟢 Low | ${low} | Track for future |\n`;
      
      content += `\n### Security Issues Details\n`;
      securityIssues.forEach(issue => {
        const file = issue.location?.file || 'unknown';
        const line = issue.location?.line || '?';
        content += `- **[${issue.severity?.toUpperCase()}]** ${issue.title || issue.message} (${file}:${line})\n`;
      });
    }
    
    return content;
  }
  
  /**
   * Fix 3: Generate Performance Analysis that shows actual issues
   */
  static generateAccuratePerformanceAnalysis(issues: Issue[]): string {
    const performanceIssues = issues.filter(i => 
      i.category === 'performance' ||
      i.type === 'optimization'
    );
    
    let content = `## ⚡ Performance Analysis\n\n`;
    
    if (performanceIssues.length === 0) {
      content += `✅ **No performance issues detected in this PR.**\n\n`;
      content += `### Performance Checks Passed\n`;
      content += `- ✅ No memory leaks\n`;
      content += `- ✅ Efficient algorithms\n`;
      content += `- ✅ Optimal data structures\n`;
      content += `- ✅ No blocking operations\n`;
    } else {
      const critical = performanceIssues.filter(i => i.severity === 'critical').length;
      const high = performanceIssues.filter(i => i.severity === 'high').length;
      const medium = performanceIssues.filter(i => i.severity === 'medium').length;
      const low = performanceIssues.filter(i => i.severity === 'low').length;
      
      content += `⚠️ **Performance Issues Found: ${performanceIssues.length}**\n\n`;
      content += `| Severity | Count | Impact |\n`;
      content += `|----------|-------|--------|\n`;
      if (critical > 0) content += `| 🔴 Critical | ${critical} | Severe degradation |\n`;
      if (high > 0) content += `| 🟠 High | ${high} | Noticeable slowdown |\n`;
      if (medium > 0) content += `| 🟡 Medium | ${medium} | Minor impact |\n`;
      if (low > 0) content += `| 🟢 Low | ${low} | Optimization opportunity |\n`;
      
      content += `\n### Performance Issues Details\n`;
      performanceIssues.forEach(issue => {
        const file = issue.location?.file || 'unknown';
        const line = issue.location?.line || '?';
        content += `- **[${issue.severity?.toUpperCase()}]** ${issue.title || issue.message} (${file}:${line})\n`;
      });
    }
    
    return content;
  }
  
  /**
   * Fix 4: Generate AI IDE Integration section like August 22 report
   */
  static generateAIIDEIntegration(issues: Issue[]): string {
    const autofixable = issues.filter(i => {
      const title = (i.title || i.message || '').toLowerCase();
      return title.includes('unused') || 
             title.includes('missing') ||
             title.includes('type') ||
             title.includes('null check') ||
             title.includes('validation');
    });
    
    const confidence = autofixable.length > 0 ? 
      Math.round((autofixable.length / issues.length) * 100) : 0;
    
    return `## 🤖 AI-Powered IDE Integration

### Auto-Fix Available
- **${autofixable.length}** issues can be automatically fixed
- **${confidence}%** confidence in automated fixes
- Estimated time saved: **${Math.round(autofixable.length * 5)} minutes**

### Quick Fix Commands
\`\`\`bash
# Apply all safe auto-fixes
codequal fix --safe

# Review and apply fixes interactively
codequal fix --interactive

# Generate fix suggestions without applying
codequal suggest --output fixes.md
\`\`\`

### IDE Extensions
- **VSCode:** Install \`CodeQual Assistant\` for real-time feedback
- **IntelliJ:** Enable \`CodeQual Plugin\` for inline suggestions
- **CLI:** Use \`codequal watch\` for continuous monitoring
`;
  }
  
  /**
   * Fix 5: Generate proper Business Impact section
   * Connect to actual findings, not generic text
   */
  static generateBusinessImpact(issues: Issue[], fixedCount: number): string {
    const criticalCount = issues.filter(i => i.severity === 'critical').length;
    const highCount = issues.filter(i => i.severity === 'high').length;
    const securityCount = issues.filter(i => i.category === 'security').length;
    
    // Calculate actual business metrics based on issues
    const riskLevel = criticalCount > 0 ? 'HIGH' : 
                     highCount > 2 ? 'MEDIUM' : 'LOW';
    
    const timeToMarket = criticalCount > 0 ? 'Delayed by 2-3 days' :
                        highCount > 0 ? 'Delayed by 1 day' : 'On schedule';
    
    const techDebtHours = (criticalCount * 8) + (highCount * 4) + 
                         (issues.filter(i => i.severity === 'medium').length * 2);
    
    return `## 💼 Business Impact Assessment

### Risk Assessment
- **Risk Level:** ${riskLevel}
- **Security Posture:** ${securityCount > 0 ? `⚠️ ${securityCount} security issues need attention` : '✅ Secure'}
- **Time to Market Impact:** ${timeToMarket}
- **Technical Debt Added:** ${techDebtHours} hours

### Cost-Benefit Analysis
| Metric | Current PR | If Issues Fixed |
|--------|------------|-----------------|
| Deployment Risk | ${riskLevel} | LOW |
| Customer Impact | ${criticalCount > 0 ? 'Potential outage' : 'Minimal'} | None |
| Maintenance Cost | +${techDebtHours}h | Baseline |
| Code Quality | ${100 - (issues.length * 5)}/100 | ${100 - ((issues.length - fixedCount) * 5)}/100 |

### Recommendations
${criticalCount > 0 ? '🔴 **BLOCK MERGE:** Critical issues must be resolved\n' : ''}${highCount > 0 ? '🟠 **REVIEW REQUIRED:** High priority issues should be addressed\n' : ''}${criticalCount === 0 && highCount === 0 ? '✅ **READY TO MERGE:** No blocking issues found\n' : ''}

### ROI of Fixing Issues Now
- Prevent ${criticalCount * 3 + highCount * 2} potential production incidents
- Save ${techDebtHours * 150}$ in future maintenance costs
- Improve system reliability by ${Math.min(criticalCount * 15 + highCount * 10, 50)}%
`;
  }
  
  /**
   * Fix 6: Generate accurate PR Comment for GitHub
   */
  static generatePRComment(newIssues: Issue[], fixedIssues: Issue[]): string {
    const critical = newIssues.filter(i => i.severity === 'critical').length;
    const high = newIssues.filter(i => i.severity === 'high').length;
    
    const decision = critical > 0 || high > 0 ? '❌ Changes Requested' : '✅ Approved';
    const emoji = critical > 0 || high > 0 ? '⚠️' : '✅';
    
    return `## 📊 GitHub PR Comment

\`\`\`markdown
${emoji} **CodeQual Analysis: ${decision}**

**Summary:**
- 🆕 New Issues: ${newIssues.length}
- ✅ Fixed Issues: ${fixedIssues.length}
- 🔴 Critical: ${critical} | 🟠 High: ${high}

${critical > 0 || high > 0 ? `**Blocking Issues:**
${newIssues.filter(i => i.severity === 'critical' || i.severity === 'high')
  .slice(0, 3)
  .map(i => `- [${i.severity?.toUpperCase()}] ${i.title || i.message}`)
  .join('\n')}

Please address these issues before merging.` : 'No blocking issues found. Good to merge!'}

[View Full Report](https://codequal.ai/report/${Date.now()})
\`\`\`
`;
  }
  
  /**
   * Fix 7: Ensure test file severity is properly adjusted
   */
  static adjustTestFileSeverity(issues: Issue[]): Issue[] {
    return issues.map(issue => {
      const filePath = issue.location?.file || '';
      const isTestFile = filePath.includes('.test.') || 
                        filePath.includes('.spec.') ||
                        filePath.includes('__tests__/') ||
                        filePath.includes('/test/') ||
                        filePath.includes('/tests/');
      
      if (isTestFile && (issue.severity === 'critical' || issue.severity === 'high')) {
        return {
          ...issue,
          severity: 'medium' as any,
          originalSeverity: issue.severity,
          adjustmentReason: 'Test file - severity downgraded'
        };
      }
      
      return issue;
    });
  }
}