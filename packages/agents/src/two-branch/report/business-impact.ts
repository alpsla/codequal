/**
 * Business Impact Analysis Service
 * 
 * Calculates financial impact, risk assessment, and ROI for code issues.
 * Extracted from v9-grouped-report-formatter.ts for better modularity.
 */

import { EnrichedIssue } from './types';
import { IssueGroup } from '../utils/issue-grouping';

/**
 * Check if a group can be auto-fixed by IDE tools
 */
function canAutoFix(group: IssueGroup): boolean {
  const autoFixableRules = [
    'SystemPrintln',
    'GuardLogStatement',
    'LineLength',
    'WhitespaceAround',
    'WhitespaceAfter',
    'AvoidStarImport',
    'UnusedImports',
    'RedundantImport',
    'SimplifyBooleanReturns',
    'SimplifyBooleanExpressions',
    'ForLoopCanBeForeach',
    'UseStringBufferForStringAppends',
    'ConsecutiveLiteralAppends',
    'MissingJavadocMethod',
    'MissingJavadocType'
  ];
  
  return autoFixableRules.includes(group.rule) || 
         group.tool === 'checkstyle' && group.rule.toLowerCase().includes('whitespace');
}

/**
 * Get exploit cost explanation based on severity and type
 */
export function getExploitCostExplanation(
  criticalCount: number, 
  highCount: number, 
  securityCount: number
): string {
  if (criticalCount > 0 && securityCount > 0) {
    return `${criticalCount} critical security vulnerabilities could lead to data breach, system compromise, or service disruption`;
  } else if (highCount > 0 && securityCount > 0) {
    return `${highCount} high-severity security issues could result in security incidents or operational failures`;
  } else if (criticalCount > 0) {
    return `${criticalCount} critical issues could cause system instability or reliability problems`;
  } else {
    return `Low risk of security incidents; main concerns are code quality and maintainability`;
  }
}

/**
 * Get risk impact level for a category of issues
 * BUG FIX #75: Consider blocking status and severity for accurate risk assessment
 */
export function getRiskImpactLevel(categoryIssues: EnrichedIssue[]): string {
  if (categoryIssues.length === 0) return '⚪ None';
  
  // Count blocking issues (NEW/EXISTING_MODIFIED + critical/high)
  const blockingCritical = categoryIssues.filter(i => 
    (i.category === 'NEW' || i.category === 'EXISTING_MODIFIED') && 
    i.severity === 'critical'
  ).length;
  
  const blockingHigh = categoryIssues.filter(i => 
    (i.category === 'NEW' || i.category === 'EXISTING_MODIFIED') && 
    i.severity === 'high'
  ).length;
  
  const totalBlocking = blockingCritical + blockingHigh;
  
  // BUG FIX #75: Any blocking HIGH/CRITICAL issues = HIGH RISK (not Medium)
  if (blockingCritical > 0) return '🔴 Critical';
  if (blockingHigh > 0) return '🔴 High';
  
  // No blocking issues - assess by backlog severity
  const critical = categoryIssues.filter(i => i.severity === 'critical').length;
  const high = categoryIssues.filter(i => i.severity === 'high').length;
  const medium = categoryIssues.filter(i => i.severity === 'medium').length;
  
  if (critical >= 3) return '🟠 High';
  if (critical >= 1 || high >= 5) return '🟡 Medium';
  if (high >= 2 || medium >= 20) return '🟡 Medium';
  return '🟢 Low';
}

/**
 * Compute Skill Score from issues
 * Start at 50, deduct NEW/EXISTING_MODIFIED by severity weights, add resolved by same weights
 * Clamp to 0..100
 */
export function calculateIssueWeightedSkillScore(issues: EnrichedIssue[]): number {
  const weight = (severity: string): number => ({
    critical: 5.0,
    high: 3.0,
    medium: 1.0,
    low: 0.5
  } as any)[severity] || 1.0;

  let deductions = 0;
  let additions = 0;
  for (const i of issues) {
    const w = weight(i.severity);
    if (i.category === 'NEW' || i.category === 'EXISTING_MODIFIED') deductions += w;
    if (i.category === 'RESOLVED') additions += w;
  }
  const score = 50 - deductions + additions;
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Generate comprehensive business impact analysis
 * Includes financial impact, risk assessment, and recommendations
 */
export function generateBusinessImpact(issues: EnrichedIssue[], groups: IssueGroup[]): string {
  // BLOCKERS ONLY: NEW/EXISTING_MODIFIED + critical/high
  const blocking = issues.filter(i =>
    (i.category === 'NEW' || i.category === 'EXISTING_MODIFIED') &&
    (i.severity === 'critical' || i.severity === 'high')
  );

  const blockingCritical = blocking.filter(i => i.severity === 'critical');
  const blockingHigh = blocking.filter(i => i.severity === 'high');
  const backlogMedium = issues.filter(i => i.severity === 'medium');
  const backlogLow = issues.filter(i => i.severity === 'low');

  // Calculate fix costs (hours) for BLOCKERS ONLY, with auto-fix adjustment
  let baseFixHours =
    (blockingCritical.length * 2) +      // 2 hours per critical blocker
    (blockingHigh.length * 1.5);         // 1.5 hours per high blocker

  // Adjust hours for auto-fixable groups: replace original severity time with a small per-occurrence cost
  const autoFixableGroups = groups.filter(g => canAutoFix(g));
  if (autoFixableGroups.length > 0) {
    // Original hours attributed to auto-fixable occurrences by severity
    const severityHours: Record<string, number> = { critical: 2, high: 1.5, medium: 1, low: 0.5 };
    let autoFixOriginalHours = 0;
    let autoFixAdjustedHours = 0;
    for (const g of autoFixableGroups) {
      const perIssue = severityHours[g.severity] ?? 1;
      // Only count auto-fix occurrences that are part of BLOCKERS
      const isBlockingGroup = blocking.some(i => i.rule === g.rule && i.tool === g.tool && i.severity === g.severity);
      if (!isBlockingGroup) continue;
      autoFixOriginalHours += perIssue * g.count;
      // Assume IDE auto-fix averages ~0.1h per occurrence including review
      autoFixAdjustedHours += 0.1 * g.count;
    }
    baseFixHours = Math.max(0, baseFixHours - autoFixOriginalHours + autoFixAdjustedHours);
  }
  
  const developerRate = 150; // $150/hour average
  const totalFixCost = Math.round(baseFixHours * developerRate);
  const fixDays = Math.ceil(baseFixHours / 8);
  
  // Calculate issues by detected category
  const securityIssues = issues.filter(i => i.detectedCategory === 'Security');
  const performanceIssues = issues.filter(i => i.detectedCategory === 'Performance');
  const architectureIssues = issues.filter(i => i.detectedCategory === 'Architecture');
  const dependencyIssues = issues.filter(i => i.detectedCategory === 'Dependencies');
  const codeQualityIssues = issues.filter(i => i.detectedCategory === 'Code Quality');
  
  // Calculate potential exploit costs
  const hasSecurityIssues = securityIssues.length > 0;
  const hasCriticalSecurity = securityIssues.filter(i => i.severity === 'critical').length > 0;
  
  let minExploitCost: number;
  let maxExploitCost: number;
  let exploitDesc: string;
  
  if (hasCriticalSecurity) {
    minExploitCost = 50000;
    maxExploitCost = 500000;
    exploitDesc = 'Data breach costs, compliance fines (GDPR: €20M or 4% revenue), remediation, legal fees';
  } else if (hasSecurityIssues) {
    minExploitCost = 25000;
    maxExploitCost = 200000;
    exploitDesc = 'Security incident response, downtime costs, reputation damage';
  } else if (blockingCritical.length > 0) {
    minExploitCost = 10000;
    maxExploitCost = 100000;
    exploitDesc = 'Production outages, emergency fixes, customer compensation';
  } else {
    minExploitCost = 5000;
    maxExploitCost = 50000;
    exploitDesc = 'Technical debt accumulation, slower development velocity';
  }
  
  const roi = Math.round(minExploitCost / Math.max(totalFixCost, 1));

  const immediateRisk = blocking.length > 0 ? '🔴 High' : '🟢 Low';

  // SESSION 13 FIX #3: Detect if most/all blocking issues are auto-fixable
  const blockingAutoFixableGroups = autoFixableGroups.filter(g =>
    blocking.some(i => i.rule === g.rule && i.tool === g.tool && i.severity === g.severity)
  );
  const autoFixableBlockingCount = blockingAutoFixableGroups.reduce((sum, g) => sum + g.count, 0);
  const autoFixPercentage = blocking.length > 0 ? (autoFixableBlockingCount / blocking.length) * 100 : 0;
  const mostlyAutoFixable = autoFixPercentage >= 70; // 70%+ of blocking issues are auto-fixable

  return `## 💼 Business Impact Analysis

### Executive Summary
${blocking.length > 0
  ? `⚠️ **Critical attention required:** ${blocking.length} blocking issue${blocking.length > 1 ? 's' : ''} must be resolved before deployment to avoid security vulnerabilities or system failures.`
  : blockingCritical.length > 0
    ? `🟡 **Action recommended:** ${blockingCritical.length} critical issue${blockingCritical.length > 1 ? 's' : ''} should be addressed to maintain code quality and prevent future problems.`
    : `✅ **Acceptable quality:** Issues identified are manageable and can be addressed systematically through normal development cycles.`
}

### Financial Impact
${blocking.length > 0
  ? mostlyAutoFixable
    ? `**🟢 Auto-Fix Available**
${autoFixableBlockingCount} of ${blocking.length} blocking issues (${autoFixPercentage.toFixed(0)}%) can be automatically fixed using IDE tools or linters.

| Metric | Value |
|--------|-------|
| **Manual Fix Cost** | **$${totalFixCost.toLocaleString()}** (${baseFixHours.toFixed(1)} hours - minimal, mostly for review/testing) |
| **Auto-Fix Coverage** | **${autoFixPercentage.toFixed(0)}%** of blocking issues |
| **Recommendation** | Run IDE auto-fix + code formatter, then review changes |

**Note:** Most issues are auto-fixable (LineLength, MissingJavadoc, Whitespace). The cost shown reflects review time, not manual coding.`
    : `| Metric | Value |
|--------|-------|
| **Total Fix Cost** | **$${totalFixCost.toLocaleString()}** (${baseFixHours.toFixed(1)} hours, ~${fixDays} developer-days at $${developerRate}/hour) |
${autoFixableBlockingCount > 0 ? `| **Cost Breakdown** | ${autoFixableBlockingCount} auto-fixable (${autoFixPercentage.toFixed(0)}%, ~${(autoFixableBlockingCount * 0.1).toFixed(1)}h) + ${blocking.length - autoFixableBlockingCount} manual (~${((blocking.length - autoFixableBlockingCount) * 1.75).toFixed(1)}h) |` : ''}
| **Potential Exploit Cost** | **$${minExploitCost.toLocaleString()} - $${maxExploitCost.toLocaleString()}** |
| **Security Risk** | ${exploitDesc} |
| **Return on Investment** | **${roi}x minimum return** by preventing issues now vs. fixing in production |
| **Risk-Adjusted Savings** | $${(minExploitCost - totalFixCost).toLocaleString()} minimum (prevention vs. remediation) |${autoFixableBlockingCount > 0 ? `\n\n**💡 Tip:** ${autoFixableBlockingCount} issue${autoFixableBlockingCount > 1 ? 's' : ''} can be auto-fixed with IDE tools (Checkstyle, Spotless, ESLint) in ~${Math.ceil(autoFixableBlockingCount / 60)} minute${Math.ceil(autoFixableBlockingCount / 60) > 1 ? 's' : ''}` : ''}`
  : `**💚 Low Financial Risk**
No critical or high-severity issues detected. All identified issues are related to code quality and maintainability (tabs, formatting, documentation).

**Cost to fix:** Minimal - most issues are auto-fixable via IDE tools or linters.
**Impact if not fixed:** Gradual technical debt accumulation, slower code reviews, minor maintainability concerns.
**Recommendation:** Address during regular refactoring cycles or enable pre-commit hooks (CheckStyle, Spotless).`
}

### Risk Assessment
- **Immediate Risk:** ${immediateRisk}
  - ${blocking.length} blocking issues require attention before deployment
  - ${blockingCritical.length} critical issues need urgent resolution
  - ${blockingHigh.length} high-severity issues should be prioritized
  
- **Future Risk:** ${backlogMedium.length + backlogLow.length > 0 ? '🟡 Medium' : '🟢 Low'}
  - Technical debt will compound if ${backlogMedium.length + backlogLow.length} backlog issues are not addressed
  - Code maintainability may decrease over time
  - ${securityIssues.length > 0 ? `Security vulnerabilities (${securityIssues.length}) pose ongoing risk` : 'Security posture is acceptable'}

### Risk Matrix by Category
| Category | Blocking | Backlog | Total Issues | Risk Level |
|----------|----------|---------|--------------|------------|
| **Security** | ${securityIssues.filter(i => (i.severity === 'critical' || i.severity === 'high') && (i.category === 'NEW' || i.category === 'EXISTING_MODIFIED')).length} | ${securityIssues.length - securityIssues.filter(i => (i.severity === 'critical' || i.severity === 'high') && (i.category === 'NEW' || i.category === 'EXISTING_MODIFIED')).length} | ${securityIssues.length} | ${getRiskImpactLevel(securityIssues)} |
| **Performance** | ${performanceIssues.filter(i => (i.severity === 'critical' || i.severity === 'high') && (i.category === 'NEW' || i.category === 'EXISTING_MODIFIED')).length} | ${performanceIssues.length - performanceIssues.filter(i => (i.severity === 'critical' || i.severity === 'high') && (i.category === 'NEW' || i.category === 'EXISTING_MODIFIED')).length} | ${performanceIssues.length} | ${getRiskImpactLevel(performanceIssues)} |
| **Architecture** | ${architectureIssues.filter(i => (i.severity === 'critical' || i.severity === 'high') && (i.category === 'NEW' || i.category === 'EXISTING_MODIFIED')).length} | ${architectureIssues.length - architectureIssues.filter(i => (i.severity === 'critical' || i.severity === 'high') && (i.category === 'NEW' || i.category === 'EXISTING_MODIFIED')).length} | ${architectureIssues.length} | ${getRiskImpactLevel(architectureIssues)} |
| **Dependencies** | ${dependencyIssues.filter(i => (i.severity === 'critical' || i.severity === 'high') && (i.category === 'NEW' || i.category === 'EXISTING_MODIFIED')).length} | ${dependencyIssues.length - dependencyIssues.filter(i => (i.severity === 'critical' || i.severity === 'high') && (i.category === 'NEW' || i.category === 'EXISTING_MODIFIED')).length} | ${dependencyIssues.length} | ${getRiskImpactLevel(dependencyIssues)} |
| **Code Quality** | ${codeQualityIssues.filter(i => (i.severity === 'critical' || i.severity === 'high') && (i.category === 'NEW' || i.category === 'EXISTING_MODIFIED')).length} | ${codeQualityIssues.length - codeQualityIssues.filter(i => (i.severity === 'critical' || i.severity === 'high') && (i.category === 'NEW' || i.category === 'EXISTING_MODIFIED')).length} | ${codeQualityIssues.length} | ${getRiskImpactLevel(codeQualityIssues)} |

**Legend:**
- **Blocking:** Critical/High severity issues in NEW or EXISTING_MODIFIED files (must fix before merge)
- **Backlog:** Medium/Low severity or pre-existing issues (can be addressed later)
- **Risk Level:** Overall impact assessment based on severity distribution

### Recommendations
${blocking.length > 0 ? `
1. **Immediate Action:** Resolve ${blocking.length} blocking issues before deployment
2. **Priority:** Address critical blockers first
3. **Planning:** Schedule time for ${backlogMedium.length} medium-severity issues in upcoming sprints
4. **Continuous Improvement:** Track and reduce ${backlogLow.length} low-severity issues over time
` : blockingCritical.length + blockingHigh.length > 0 ? `
1. **Priority:** Address ${blockingCritical.length} critical issues in current sprint
2. **Planning:** Schedule ${blockingHigh.length} high-severity issues for upcoming work
3. **Continuous Improvement:** Integrate static analysis into CI/CD to prevent new issues
` : `
1. **Maintain Quality:** Continue current development practices
2. **Address Backlog:** Systematically reduce ${backlogMedium.length + backlogLow.length} identified issues
3. **Prevention:** Integrate static analysis into CI/CD pipeline
`}

**Note:** Each issue group section above includes detailed business impact analysis specific to that issue type.`;
}

