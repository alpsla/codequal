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
 *
 * SESSION 53 REFACTOR: Language-neutral approach
 * CodeQual generates AI fixes for ALL issues, so most are auto-fixable.
 * We only exclude specific patterns that require manual intervention.
 */
function canAutoFix(group: IssueGroup): boolean {
  const ruleLower = group.rule?.toLowerCase() || '';

  // ===== NON-AUTO-FIXABLE PATTERNS =====
  // These require architectural changes or manual decision-making

  // Circular dependencies require architectural refactoring
  if (ruleLower.includes('circular-dependency') || ruleLower.includes('cyclic')) {
    return false;
  }

  // Complex architectural issues
  if (ruleLower.includes('god-class') || ruleLower.includes('god-object')) {
    return false;
  }

  // Issues requiring human judgment on business logic
  if (ruleLower.includes('magic-number') && group.severity === 'low') {
    // Magic numbers often need context to determine correct constant names
    return false;
  }

  // ===== DEFAULT: AUTO-FIXABLE =====
  // CodeQual generates AI fix suggestions for 100% of issues
  // LSP file contains ready-to-apply fixes for IDEs
  // Even complex security issues have AI-generated fix code
  return true;
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
 * BUG-084 FIX: Use previousScore if available, otherwise default to 50
 * Deduct NEW/EXISTING_MODIFIED by severity weights, add resolved by same weights
 * Clamp to 0..100
 */
export function calculateIssueWeightedSkillScore(
  issues: EnrichedIssue[],
  previousScore?: number
): number {
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

  // BUG-084 FIX: Use previous score if provided (from Supabase), otherwise default to 50
  const baseScore = previousScore !== undefined ? previousScore : 50;
  const score = baseScore - deductions + additions;
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Get language-specific pre-commit hook recommendations
 * SESSION 50 FIX: Provide relevant tool recommendations based on detected language
 */
function getPreCommitHookRecommendation(language: string): string {
  const langLower = language.toLowerCase();

  if (langLower === 'python') {
    return 'pre-commit hooks (Black, Ruff, Flake8)';
  } else if (langLower === 'typescript' || langLower === 'javascript') {
    return 'pre-commit hooks (ESLint, Prettier)';
  } else if (langLower === 'java') {
    return 'pre-commit hooks (CheckStyle, Spotless)';
  } else if (langLower === 'go') {
    return 'pre-commit hooks (gofmt, golangci-lint)';
  } else if (langLower === 'rust') {
    return 'pre-commit hooks (rustfmt, clippy)';
  } else if (langLower === 'ruby') {
    return 'pre-commit hooks (RuboCop)';
  } else if (langLower === 'php') {
    return 'pre-commit hooks (PHP-CS-Fixer, PHPStan)';
  } else if (langLower === 'c#' || langLower === 'csharp') {
    return 'pre-commit hooks (dotnet format, StyleCop)';
  }
  return 'pre-commit hooks';
}

/**
 * Generate comprehensive business impact analysis
 * Includes financial impact, risk assessment, and recommendations
 * SESSION 50 FIX: Added language parameter for language-specific recommendations
 */
export function generateBusinessImpact(issues: EnrichedIssue[], groups: IssueGroup[], language = 'java'): string {
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

  // SESSION 13 FIX #3 + TYPESCRIPT FIX: Count auto-fixable issues (both blocking and total)
  // Don't count entire group - only count the actual issues within auto-fixable groups

  // Count blocking issues that are auto-fixable
  const autoFixableBlockingCount = blocking.filter(issue => {
    return autoFixableGroups.some(g =>
      g.rule === issue.rule &&
      g.tool === issue.tool &&
      g.severity === issue.severity
    );
  }).length;
  const autoFixPercentage = blocking.length > 0 ? (autoFixableBlockingCount / blocking.length) * 100 : 0;
  const mostlyAutoFixable = autoFixPercentage >= 70; // 70%+ of blocking issues are auto-fixable

  // Count ALL auto-fixable issues (not just blocking) - gives full cleanup potential
  const autoFixableTotalCount = issues.filter(issue => {
    return autoFixableGroups.some(g =>
      g.rule === issue.rule &&
      g.tool === issue.tool &&
      g.severity === issue.severity
    );
  }).length;
  const totalAutoFixPercentage = issues.length > 0 ? (autoFixableTotalCount / issues.length) * 100 : 0;

  // Calculate manual review time for non-auto-fixable issues (Tier 3: Manual with AI guidance)
  const nonAutoFixableCount = issues.length - autoFixableTotalCount;
  const manualReviewHours = nonAutoFixableCount * 0.25; // 15 minutes per issue with AI guidance
  const manualReviewCost = Math.round(manualReviewHours * developerRate);

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
| **Auto-Fix Time** | **${Math.ceil(autoFixableBlockingCount / 100)} minutes** (run formatters + linters) |
| **Manual Review Time** | **${manualReviewHours.toFixed(1)} hours** (${nonAutoFixableCount} issues × 15 min with AI guidance = $${manualReviewCost.toLocaleString()}) |
| **🟢 Safe Auto-Fix (Tier 1)** | **Subset of Tier 2** - Apply immediately, no testing needed |
| **🟡 Advanced Auto-Fix (Tier 2)** | **${Math.round(totalAutoFixPercentage)}%** (${autoFixableTotalCount}/${issues.length} issues) - Includes security/critical, requires testing |
| **🔴 Manual Review (Tier 3)** | **${Math.round((nonAutoFixableCount / issues.length) * 100)}%** (${nonAutoFixableCount}/${issues.length} issues) - Full review with AI guidance |
| **AI Code Suggestions** | **100%** (${issues.length}/${issues.length} issues) - Every issue has AI-generated fix code |
| **Potential Exploit Cost** | **$${minExploitCost.toLocaleString()} - $${maxExploitCost.toLocaleString()}** |
| **Security Risk** | ${exploitDesc} |
| **Return on Investment** | **${roi}x minimum return** by preventing issues now vs. fixing in production |
| **Risk-Adjusted Savings** | **$${(minExploitCost - totalFixCost).toLocaleString()} minimum** (prevention vs. remediation) |
| **Recommendation** | Apply Safe fixes → Test Advanced fixes → Review remaining with AI guidance |

**Understanding the metrics:**
- **Linter Auto-Fix**: Instant fixes via \`eslint --fix\`, \`prettier\`, etc. (${autoFixPercentage.toFixed(0)}% of blocking issues)
- **AI Code Suggestions**: AI has generated copy-paste ready fix code for ALL ${issues.length} issues (100%)
- **Financial Impact**: Fixing these issues now costs ~${fixDays} days vs $${minExploitCost.toLocaleString()}+ if they cause production incidents

**💡 Bonus Opportunity:** Beyond the ${autoFixableBlockingCount} blocking issues, you can apply linter auto-fix to ${autoFixableTotalCount - autoFixableBlockingCount} additional issues (~${Math.ceil(autoFixableTotalCount / 60)} min). For issues not auto-fixable by linters, use the AI-generated code suggestions.`
        : `**🚀 CodeQual Value Proposition**

| Metric | Without CodeQual | With CodeQual |
|--------|------------------|---------------|
| **Fix Time** | ${baseFixHours.toFixed(1)} hours (~${fixDays} days) | **${Math.max(1, Math.ceil(blocking.length * 0.05))} hours** (AI-assisted) |
| **Developer Cost** | $${totalFixCost.toLocaleString()} | **$${Math.round(Math.max(1, blocking.length * 0.05) * developerRate).toLocaleString()}** |
| **Time Saved** | - | **${Math.round((baseFixHours - Math.max(1, blocking.length * 0.05)) / baseFixHours * 100)}%** |
| **Auto-Fix Coverage** | 0% | **${totalAutoFixPercentage.toFixed(0)}%** (${autoFixableTotalCount}/${issues.length} issues) |

**How CodeQual Reduces Fix Time:**
- **PRO Tier**: 1-click auto-fix for ${autoFixableTotalCount} issues (~3 min review + apply)
- **BASIC Tier**: AI recommendations ready for IDE agents (Cursor, Copilot) to apply
- **All Tiers**: 100% of issues have AI-generated fix code suggestions

| Risk Metric | Value |
|-------------|-------|
| **Potential Exploit Cost** | $${minExploitCost.toLocaleString()} - $${maxExploitCost.toLocaleString()} |
| **Risk Description** | ${exploitDesc} |
| **ROI** | **${Math.round(minExploitCost / Math.max(Math.round(Math.max(1, blocking.length * 0.05) * developerRate), 1))}x** (prevention cost vs exploit cost) |

> 💡 **Bottom Line**: CodeQual turns ${fixDays} days of manual work into ~${Math.max(1, Math.ceil(blocking.length * 0.05))} hours of review + apply, saving **$${(totalFixCost - Math.round(Math.max(1, blocking.length * 0.05) * developerRate)).toLocaleString()}** per analysis.`
      : `**💚 Low Financial Risk**
No critical or high-severity issues detected. All identified issues are related to code quality and maintainability (tabs, formatting, documentation).

**Cost to fix:** Minimal - most issues are auto-fixable via IDE tools or linters.
**Impact if not fixed:** Gradual technical debt accumulation, slower code reviews, minor maintainability concerns.
**Recommendation:** Address during regular refactoring cycles or enable ${getPreCommitHookRecommendation(language)}.

${autoFixableTotalCount > 0 ? `**🎁 Quick Win:** ${autoFixableTotalCount} of ${issues.length} issues (${totalAutoFixPercentage.toFixed(0)}%) can be auto-fixed in ~${Math.ceil(autoFixableTotalCount / 60)} minutes with linter \`--fix\` commands.` : ''}`
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

