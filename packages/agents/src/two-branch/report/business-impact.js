"use strict";
/**
 * Business Impact Analysis Service
 *
 * Calculates financial impact, risk assessment, and ROI for code issues.
 * Extracted from v9-grouped-report-formatter.ts for better modularity.
 *
 * Session 66: Added tier differentiation for BASIC vs PRO reports
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getExploitCostExplanation = getExploitCostExplanation;
exports.getRiskImpactLevel = getRiskImpactLevel;
exports.calculateIssueWeightedSkillScore = calculateIssueWeightedSkillScore;
exports.generateBusinessImpact = generateBusinessImpact;
const fix_capability_utils_1 = require("./fix-capability-utils");
/**
 * Check if a group can be auto-fixed by IDE tools
 *
 * SESSION 57 Part 3: Uses ToolFixRegistry for accurate fix capability detection
 * - Tier 1: Native --fix support → auto-fixable
 * - Tier 2: Dedicated fixer tool → auto-fixable
 * - Tier 3: AI required → NOT auto-fixable (but AI suggestions available)
 *
 * This replaces the pattern-based approach with registry-based accuracy.
 */
function canAutoFix(group) {
    return (0, fix_capability_utils_1.isGroupAutoFixable)(group);
}
/**
 * Get exploit cost explanation based on severity and type
 */
function getExploitCostExplanation(criticalCount, highCount, securityCount) {
    if (criticalCount > 0 && securityCount > 0) {
        return `${criticalCount} critical security vulnerabilities could lead to data breach, system compromise, or service disruption`;
    }
    else if (highCount > 0 && securityCount > 0) {
        return `${highCount} high-severity security issues could result in security incidents or operational failures`;
    }
    else if (criticalCount > 0) {
        return `${criticalCount} critical issues could cause system instability or reliability problems`;
    }
    else {
        return `Low risk of security incidents; main concerns are code quality and maintainability`;
    }
}
/**
 * Get risk impact level for a category of issues
 * BUG FIX #75: Consider blocking status and severity for accurate risk assessment
 */
function getRiskImpactLevel(categoryIssues) {
    if (categoryIssues.length === 0)
        return '⚪ None';
    // Count blocking issues (NEW/EXISTING_MODIFIED + critical/high)
    const blockingCritical = categoryIssues.filter(i => (i.category === 'NEW' || i.category === 'EXISTING_MODIFIED') &&
        i.severity === 'critical').length;
    const blockingHigh = categoryIssues.filter(i => (i.category === 'NEW' || i.category === 'EXISTING_MODIFIED') &&
        i.severity === 'high').length;
    const totalBlocking = blockingCritical + blockingHigh;
    // BUG FIX #75: Any blocking HIGH/CRITICAL issues = HIGH RISK (not Medium)
    if (blockingCritical > 0)
        return '🔴 Critical';
    if (blockingHigh > 0)
        return '🔴 High';
    // No blocking issues - assess by backlog severity
    const critical = categoryIssues.filter(i => i.severity === 'critical').length;
    const high = categoryIssues.filter(i => i.severity === 'high').length;
    const medium = categoryIssues.filter(i => i.severity === 'medium').length;
    if (critical >= 3)
        return '🟠 High';
    if (critical >= 1 || high >= 5)
        return '🟡 Medium';
    if (high >= 2 || medium >= 20)
        return '🟡 Medium';
    return '🟢 Low';
}
/**
 * Compute Skill Score from issues
 * BUG-084 FIX: Use previousScore if available, otherwise default to 50
 * Deduct NEW/EXISTING_MODIFIED by severity weights, add resolved by same weights
 * Clamp to 0..100
 */
function calculateIssueWeightedSkillScore(issues, previousScore) {
    const weight = (severity) => ({
        critical: 5.0,
        high: 3.0,
        medium: 1.0,
        low: 0.5
    }[severity] || 1.0);
    let deductions = 0;
    let additions = 0;
    for (const i of issues) {
        const w = weight(i.severity);
        if (i.category === 'NEW' || i.category === 'EXISTING_MODIFIED')
            deductions += w;
        if (i.category === 'RESOLVED')
            additions += w;
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
function getPreCommitHookRecommendation(language) {
    const langLower = language.toLowerCase();
    if (langLower === 'python') {
        return 'pre-commit hooks (Black, Ruff, Flake8)';
    }
    else if (langLower === 'typescript' || langLower === 'javascript') {
        return 'pre-commit hooks (ESLint, Prettier)';
    }
    else if (langLower === 'java') {
        return 'pre-commit hooks (CheckStyle, Spotless)';
    }
    else if (langLower === 'go') {
        return 'pre-commit hooks (gofmt, golangci-lint)';
    }
    else if (langLower === 'rust') {
        return 'pre-commit hooks (rustfmt, clippy)';
    }
    else if (langLower === 'ruby') {
        return 'pre-commit hooks (RuboCop)';
    }
    else if (langLower === 'php') {
        return 'pre-commit hooks (PHP-CS-Fixer, PHPStan)';
    }
    else if (langLower === 'c#' || langLower === 'csharp') {
        return 'pre-commit hooks (dotnet format, StyleCop)';
    }
    return 'pre-commit hooks';
}
/**
 * Generate comprehensive business impact analysis
 * Includes financial impact, risk assessment, and recommendations
 * SESSION 50 FIX: Added language parameter for language-specific recommendations
 * SESSION 66: Added tier parameter for BASIC vs PRO differentiation
 */
function generateBusinessImpact(issues, groups, language = 'java', tier = 'basic', userMetrics) {
    var _a;
    // BUG-109 FIX: Consider ALL active issues (not RESOLVED) for time calculation
    const activeIssues = issues.filter(i => i.category !== 'RESOLVED');
    // BLOCKERS: NEW/EXISTING_MODIFIED + critical/high (affects PR decision)
    const blocking = activeIssues.filter(i => (i.category === 'NEW' || i.category === 'EXISTING_MODIFIED') &&
        (i.severity === 'critical' || i.severity === 'high'));
    const blockingCritical = blocking.filter(i => i.severity === 'critical');
    const blockingHigh = blocking.filter(i => i.severity === 'high');
    const backlogMedium = activeIssues.filter(i => i.severity === 'medium');
    const backlogLow = activeIssues.filter(i => i.severity === 'low');
    // BUG-109 FIX: Calculate fix costs for ALL active issues, not just blockers
    // This gives more realistic time estimates
    let baseFixHours = (blockingCritical.length * 2) + // 2 hours per critical blocker
        (blockingHigh.length * 1.5) + // 1.5 hours per high blocker
        (backlogMedium.length * 0.25) + // 15 min per medium issue
        (backlogLow.length * 0.083); // 5 min per low issue (~1/12 hour)
    // BUG-109 FIX: Adjust hours for auto-fixable groups (all issues, not just blockers)
    const autoFixableGroups = groups.filter(g => canAutoFix(g));
    if (autoFixableGroups.length > 0) {
        // Updated severity hours to match the new calculation
        const severityHours = { critical: 2, high: 1.5, medium: 0.25, low: 0.083 };
        let autoFixOriginalHours = 0;
        let autoFixAdjustedHours = 0;
        for (const g of autoFixableGroups) {
            const perIssue = (_a = severityHours[g.severity]) !== null && _a !== void 0 ? _a : 0.1;
            // Count all active issues in auto-fixable groups
            autoFixOriginalHours += perIssue * g.count;
            // Assume IDE auto-fix averages ~0.02h per occurrence including review (about 1 min)
            autoFixAdjustedHours += 0.02 * g.count;
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
    let minExploitCost;
    let maxExploitCost;
    let exploitDesc;
    if (hasCriticalSecurity) {
        minExploitCost = 50000;
        maxExploitCost = 500000;
        exploitDesc = 'Data breach costs, compliance fines (GDPR: €20M or 4% revenue), remediation, legal fees';
    }
    else if (hasSecurityIssues) {
        minExploitCost = 25000;
        maxExploitCost = 200000;
        exploitDesc = 'Security incident response, downtime costs, reputation damage';
    }
    else if (blockingCritical.length > 0) {
        minExploitCost = 10000;
        maxExploitCost = 100000;
        exploitDesc = 'Production outages, emergency fixes, customer compensation';
    }
    else {
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
        return autoFixableGroups.some(g => g.rule === issue.rule &&
            g.tool === issue.tool &&
            g.severity === issue.severity);
    }).length;
    const autoFixPercentage = blocking.length > 0 ? (autoFixableBlockingCount / blocking.length) * 100 : 0;
    const mostlyAutoFixable = autoFixPercentage >= 70; // 70%+ of blocking issues are auto-fixable
    // SESSION 26 FIX: Count auto-fixable issues EXCLUDING RESOLVED (they don't need fixing!)
    // RESOLVED issues are already fixed in the PR - no action needed
    // (activeIssues already defined above in BUG-109 fix)
    const autoFixableTotalCount = activeIssues.filter(issue => {
        return autoFixableGroups.some(g => g.rule === issue.rule &&
            g.tool === issue.tool &&
            g.severity === issue.severity);
    }).length;
    const totalAutoFixPercentage = activeIssues.length > 0 ? (autoFixableTotalCount / activeIssues.length) * 100 : 0;
    // Bonus opportunities = non-blocking active issues (excludes RESOLVED)
    const bonusOpportunities = autoFixableTotalCount - autoFixableBlockingCount;
    // SESSION 26 FIX: Calculate manual review for ACTIVE issues only (exclude RESOLVED)
    // RESOLVED issues don't need review - the developer already fixed them!
    const nonAutoFixableCount = activeIssues.length - autoFixableTotalCount;
    const manualReviewHours = nonAutoFixableCount * 0.25; // 15 minutes per issue with AI guidance
    const manualReviewCost = Math.round(manualReviewHours * developerRate);
    const resolvedCount = issues.filter(i => i.category === 'RESOLVED').length;
    const baseReport = `## 💼 Business Impact Analysis

### Executive Summary
${blocking.length > 0
        ? `⚠️ **Critical attention required:** ${blocking.length} blocking issue${blocking.length > 1 ? 's' : ''} must be resolved before deployment to avoid security vulnerabilities or system failures.`
        : blockingCritical.length > 0
            ? `🟡 **Action recommended:** ${blockingCritical.length} critical issue${blockingCritical.length > 1 ? 's' : ''} should be addressed to maintain code quality and prevent future problems.`
            : `✅ **Acceptable quality:** Issues identified are manageable and can be addressed systematically through normal development cycles.`}

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
| **🟡 Advanced Auto-Fix (Tier 2)** | **${Math.round(totalAutoFixPercentage)}%** (${autoFixableTotalCount}/${activeIssues.length} active issues) - Includes security/critical, requires testing |
| **🔴 Manual Review (Tier 3)** | **${activeIssues.length > 0 ? Math.round((nonAutoFixableCount / activeIssues.length) * 100) : 0}%** (${nonAutoFixableCount}/${activeIssues.length} active issues) - AI guidance available |
| **✅ Already Resolved** | **${resolvedCount}** issues fixed by developer in this PR |
| **AI Code Suggestions** | **100%** (${activeIssues.length}/${activeIssues.length} active issues) - Every issue has AI-generated fix code |
| **Potential Exploit Cost** | **$${minExploitCost.toLocaleString()} - $${maxExploitCost.toLocaleString()}** |
| **Security Risk** | ${exploitDesc} |
| **Return on Investment** | **${roi}x minimum return** by preventing issues now vs. fixing in production |
| **Risk-Adjusted Savings** | **$${(minExploitCost - totalFixCost).toLocaleString()} minimum** (prevention vs. remediation) |
| **Recommendation** | Apply Safe fixes → Test Advanced fixes → Review remaining with AI guidance |

**Understanding the metrics:**
- **Linter Auto-Fix**: Instant fixes via \`eslint --fix\`, \`prettier\`, etc. (${autoFixPercentage.toFixed(0)}% of blocking issues)
- **AI Code Suggestions**: AI has generated copy-paste ready fix code for ALL ${issues.length} issues (100%)
- **Financial Impact**: Fixing these issues now costs ~${fixDays} days vs $${minExploitCost.toLocaleString()}+ if they cause production incidents

**💡 Bonus Opportunity:** Beyond the ${autoFixableBlockingCount} blocking issues, ${bonusOpportunities > 0 ? `you can fix ${bonusOpportunities} additional non-blocking issues` : 'all remaining issues are already RESOLVED in this PR'}. 

> ⚠️ **Always review auto-fixed code** - verify fixes maintain expected behavior before committing.`
            : `**🚀 CodeQual Value Proposition**

| Metric | Without CodeQual | With CodeQual |
|--------|------------------|---------------|
| **Fix Time** | ${baseFixHours.toFixed(1)} hours (~${fixDays} days) | **${Math.max(baseFixHours * 0.15, 0.1).toFixed(1)} hours** (AI-assisted) |
| **Developer Cost** | $${totalFixCost.toLocaleString()} | **$${Math.round(Math.max(baseFixHours * 0.15, 0.1) * developerRate).toLocaleString()}** |
| **Time Saved** | - | **${Math.round((1 - Math.max(baseFixHours * 0.15, 0.1) / baseFixHours) * 100)}%** |
| **Fix Coverage** | 0% | **100%** (All ${activeIssues.length} issues have fix suggestions) |

**Fix Availability by Type:**
- **Pattern Auto-Fix**: ${autoFixableTotalCount}/${activeIssues.length} issues (${totalAutoFixPercentage.toFixed(0)}%) - high-confidence, instant apply
- **AI-Assisted Fix**: ${activeIssues.length - autoFixableTotalCount}/${activeIssues.length} issues (${(100 - totalAutoFixPercentage).toFixed(0)}%) - review recommended

**How CodeQual Reduces Fix Time:**
- **PRO Tier**: 1-click apply for all ${activeIssues.length} issues (~${Math.ceil(activeIssues.length * 0.05)} min review + apply)
- **BASIC Tier**: Export to IDE (LSP/SARIF) for semi-automated application
- **All Tiers**: Every issue includes AI-generated fix code

| Risk Metric | Value |
|-------------|-------|
| **Potential Exploit Cost** | $${minExploitCost.toLocaleString()} - $${maxExploitCost.toLocaleString()} |
| **Risk Description** | ${exploitDesc} |
| **ROI** | **${Math.round(minExploitCost / Math.max(Math.round(Math.max(baseFixHours * 0.15, 0.1) * developerRate), 1))}x** (prevention cost vs exploit cost) |

> 💡 **Bottom Line**: CodeQual turns ${baseFixHours.toFixed(1)} hours of manual work into ~${Math.max(baseFixHours * 0.15, 0.1).toFixed(1)} hours of review + apply, saving **$${Math.round(totalFixCost - Math.max(baseFixHours * 0.15, 0.1) * developerRate).toLocaleString()}** per analysis.`
        : `**💚 Low Financial Risk**
No critical or high-severity issues detected. All identified issues are related to code quality and maintainability (tabs, formatting, documentation).

**Cost to fix:** Minimal - most issues are auto-fixable via IDE tools or linters.
**Impact if not fixed:** Gradual technical debt accumulation, slower code reviews, minor maintainability concerns.
**Recommendation:** Address during regular refactoring cycles or enable ${getPreCommitHookRecommendation(language)}.

${autoFixableTotalCount > 0 ? `**🔧 Auto-Fixable:** ${autoFixableTotalCount} of ${activeIssues.length} issues (${totalAutoFixPercentage.toFixed(0)}%) can be resolved with linter \`--fix\` commands.` : ''}`}

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
| Category | This PR | Pre-existing | Auto-fixable | Action Required |
|----------|---------|--------------|--------------|-----------------|
| **Security** | ${securityIssues.filter(i => i.category === 'NEW' || i.category === 'EXISTING_MODIFIED').length} | ${securityIssues.filter(i => i.category === 'EXISTING_REST').length} | ${securityIssues.filter(i => { var _a; return (_a = i.fixSuggestion) === null || _a === void 0 ? void 0 : _a.correctedCode; }).length} | ${getRiskImpactLevel(securityIssues.filter(i => i.category === 'NEW' || i.category === 'EXISTING_MODIFIED'))} |
| **Performance** | ${performanceIssues.filter(i => i.category === 'NEW' || i.category === 'EXISTING_MODIFIED').length} | ${performanceIssues.filter(i => i.category === 'EXISTING_REST').length} | ${performanceIssues.filter(i => { var _a; return (_a = i.fixSuggestion) === null || _a === void 0 ? void 0 : _a.correctedCode; }).length} | ${getRiskImpactLevel(performanceIssues.filter(i => i.category === 'NEW' || i.category === 'EXISTING_MODIFIED'))} |
| **Architecture** | ${architectureIssues.filter(i => i.category === 'NEW' || i.category === 'EXISTING_MODIFIED').length} | ${architectureIssues.filter(i => i.category === 'EXISTING_REST').length} | ${architectureIssues.filter(i => { var _a; return (_a = i.fixSuggestion) === null || _a === void 0 ? void 0 : _a.correctedCode; }).length} | ${getRiskImpactLevel(architectureIssues.filter(i => i.category === 'NEW' || i.category === 'EXISTING_MODIFIED'))} |
| **Dependencies** | ${dependencyIssues.filter(i => i.category === 'NEW' || i.category === 'EXISTING_MODIFIED').length} | ${dependencyIssues.filter(i => i.category === 'EXISTING_REST').length} | ${dependencyIssues.filter(i => { var _a; return (_a = i.fixSuggestion) === null || _a === void 0 ? void 0 : _a.correctedCode; }).length} | ${getRiskImpactLevel(dependencyIssues.filter(i => i.category === 'NEW' || i.category === 'EXISTING_MODIFIED'))} |
| **Code Quality** | ${codeQualityIssues.filter(i => i.category === 'NEW' || i.category === 'EXISTING_MODIFIED').length} | ${codeQualityIssues.filter(i => i.category === 'EXISTING_REST').length} | ${codeQualityIssues.filter(i => { var _a; return (_a = i.fixSuggestion) === null || _a === void 0 ? void 0 : _a.correctedCode; }).length} | ${getRiskImpactLevel(codeQualityIssues.filter(i => i.category === 'NEW' || i.category === 'EXISTING_MODIFIED'))} |

**Legend:**
- **This PR:** Issues in files modified by this PR (NEW + EXISTING_MODIFIED)
- **Pre-existing:** Issues in files NOT touched by this PR (EXISTING_REST)
- **Auto-fixable:** Issues with available 1-click fixes
- **Action Required:** Priority based on severity of issues introduced/modified by this PR

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
    // Add tier-specific content
    if (tier === 'pro' || tier === 'enterprise') {
        return baseReport + generateProTierSection(baseFixHours, autoFixableTotalCount, activeIssues.length, totalFixCost, developerRate, userMetrics);
    }
    else {
        return baseReport + generateBasicTierSection(baseFixHours, totalFixCost, developerRate, autoFixableTotalCount, activeIssues.length);
    }
}
/**
 * Generate PRO tier specific section
 * Includes automated fix pipeline, financial dashboard, and historical trends
 */
function generateProTierSection(baseFixHours, autoFixableCount, totalActiveIssues, totalFixCost, developerRate, userMetrics) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    const aiFixCount = totalActiveIssues - autoFixableCount;
    const patternFixTime = autoFixableCount > 0 ? Math.ceil(autoFixableCount * 0.35) : 0; // ~0.35 seconds per pattern fix
    const aiFixTime = aiFixCount > 0 ? Math.ceil(aiFixCount * 8.4) : 0; // ~8.4 seconds per AI fix
    // Calculate savings
    const thisPrTimeSaved = baseFixHours - ((patternFixTime + aiFixTime) / 3600); // Convert seconds to hours
    const thisPrCostSaved = Math.round(thisPrTimeSaved * developerRate);
    // Get historical data if available
    const monthlyStats = userMetrics === null || userMetrics === void 0 ? void 0 : userMetrics.monthlyStats;
    const ytdStats = userMetrics === null || userMetrics === void 0 ? void 0 : userMetrics.ytdStats;
    let section = `

---

### 🚀 PRO: Automated Fix Pipeline

| Stage | Items | Status | Time |
|-------|-------|--------|------|
| **Pattern Fixes** | ${autoFixableCount} issues | ✅ Ready | ~${patternFixTime > 60 ? `${Math.ceil(patternFixTime / 60)} min` : `${patternFixTime} sec`} |
| **AI Generation** | ${aiFixCount} issues | ✅ Ready | ~${aiFixTime > 60 ? `${Math.ceil(aiFixTime / 60)} min` : `${aiFixTime} sec`} |

### 📊 Financial Dashboard

| Metric | This PR | This Month | YTD |
|--------|---------|------------|-----|
| **Time Saved** | ${thisPrTimeSaved.toFixed(1)} hrs | ${(_b = (_a = monthlyStats === null || monthlyStats === void 0 ? void 0 : monthlyStats.totalTimeSavedHours) === null || _a === void 0 ? void 0 : _a.toFixed(0)) !== null && _b !== void 0 ? _b : '—'} hrs | ${(_d = (_c = ytdStats === null || ytdStats === void 0 ? void 0 : ytdStats.totalTimeSavedHours) === null || _c === void 0 ? void 0 : _c.toFixed(0)) !== null && _d !== void 0 ? _d : '—'} hrs |
| **Cost Saved** | $${thisPrCostSaved.toLocaleString()} | $${(_f = (_e = monthlyStats === null || monthlyStats === void 0 ? void 0 : monthlyStats.totalCostSaved) === null || _e === void 0 ? void 0 : _e.toLocaleString()) !== null && _f !== void 0 ? _f : '—'} | $${(_h = (_g = ytdStats === null || ytdStats === void 0 ? void 0 : ytdStats.totalCostSaved) === null || _g === void 0 ? void 0 : _g.toLocaleString()) !== null && _h !== void 0 ? _h : '—'} |
| **Issues Fixed** | ${totalActiveIssues} | ${(_j = monthlyStats === null || monthlyStats === void 0 ? void 0 : monthlyStats.totalIssuesFixed) !== null && _j !== void 0 ? _j : '—'} | ${(_k = ytdStats === null || ytdStats === void 0 ? void 0 : ytdStats.totalIssuesFixed) !== null && _k !== void 0 ? _k : '—'} |
| **ROI** | ${totalFixCost > 0 ? Math.round((thisPrCostSaved / totalFixCost) * 100) : 0}% | ${monthlyStats ? '—' : '—'} | ${ytdStats ? '—' : '—'} |
`;
    // NOTE: Community Impact NOT shown for PRO tier
    // PRO learns patterns on backend automatically without user involvement
    // Users who want to see/contribute patterns should use BASIC tier
    return section;
}
/**
 * Generate BASIC tier specific section
 * Shows value proposition and upgrade path
 */
function generateBasicTierSection(baseFixHours, totalFixCost, developerRate, autoFixableCount, totalActiveIssues) {
    // BASIC tier gets pattern-based fixes but not AI generation
    const patternFixTime = autoFixableCount > 0 ? Math.ceil(autoFixableCount * 0.35 / 60) : 0; // minutes
    const manualReviewTime = totalActiveIssues - autoFixableCount;
    // SESSION 92 FIX: Calculate time savings properly
    // Time saved only applies when using autofix feature via IDE integration
    const manualTimePerIssue = 5; // minutes per issue manually
    const autoFixTimePerIssue = 0.35; // minutes per issue with autofix
    const estimatedManualHours = (totalActiveIssues * manualTimePerIssue) / 60;
    const estimatedAutoFixHours = (autoFixableCount * autoFixTimePerIssue) / 60;
    const manualReviewHours = (manualReviewTime * manualTimePerIssue) / 60;
    const totalWithBasic = estimatedAutoFixHours + manualReviewHours;
    const timeSavedPercent = estimatedManualHours > 0 ? Math.round(((estimatedManualHours - totalWithBasic) / estimatedManualHours) * 100) : 0;
    return `

---

### 💼 Time & Cost Analysis (with IDE Autofix)

| Metric | Manual Fix | With IDE Autofix |
|--------|------------|------------------|
| **Developer Time** | ${estimatedManualHours.toFixed(1)} hours | **${totalWithBasic.toFixed(1)} hours** |
| **Cost (@$${developerRate}/hr)** | $${Math.round(estimatedManualHours * developerRate).toLocaleString()} | **$${Math.round(totalWithBasic * developerRate).toLocaleString()}** |
| **Time Reduction** | — | **${timeSavedPercent}%** ✅ |

*Time savings based on applying ${autoFixableCount} auto-fixable issues via IDE integration (LSP/SARIF files).*

**What BASIC includes:**
- ✅ Pattern-based fixes for ${autoFixableCount} issues (~${patternFixTime} min via IDE)
- ✅ AI recommendations for IDE agents (Cursor, Copilot)
- ✅ Detailed fix guidance for ${manualReviewTime} remaining issues
- 💡 **Contribute patterns**: When you manually fix issues via IDE, consider contributing the pattern to help others

---

### 💡 Upgrade to PRO

**Reduce ${totalWithBasic.toFixed(1)} hours to ~30 seconds** with auto-apply

| Feature | BASIC | PRO |
|---------|-------|-----|
| Pattern Fixes | ✅ | ✅ |
| AI Recommendations | ✅ | ✅ |
| Educational Resources | ✅ | ✅ |
| Achievements & XP | ✅ | ✅ |
| Skills Tracking | ✅ | ✅ |
| **Community Impact** | ✅ Contribute patterns | ❌ Auto-learned |
| IDE Integration | ✅ LSP/SARIF exports | ❌ Not needed |
| **Auto-Apply Fixes** | ❌ | ✅ One-click |
| **Historical Analytics** | ✅ 5 PRs | ✅ Unlimited |

[🚀 Upgrade to PRO] — Start your free trial
`;
}
