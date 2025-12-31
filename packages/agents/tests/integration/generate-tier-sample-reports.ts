/**
 * Generate Sample V9 Reports for Both Tiers
 *
 * Creates side-by-side comparison reports showing BASIC vs PRO tier differences.
 * For UX/UI design review.
 *
 * Session 66: Tier differentiation implementation
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { generateBusinessImpact, UserTier, UserMetrics, MonthlyStats } from '../../src/two-branch/report/business-impact';
import { generateCommunityImpactSection, CommunityImpactSummary } from '../../src/two-branch/report/community-impact';
import { generatePromoSection, checkPromoEligibility, PromoEligibility, generateTierComparisonTable, generateValueProp } from '../../src/two-branch/report/promotional-offers';
import { generateAchievementsSection, UnlockedAchievement, calculateLevel, generateXpProgressBar } from '../../src/two-branch/report/achievements';
import { generateEducationalResourcesBrave } from '../../src/two-branch/report/educational-resources';
import { EnrichedIssue } from '../../src/two-branch/report/types';
import { IssueGroup } from '../../src/two-branch/utils/issue-grouping';
import { createClient } from '@supabase/supabase-js';

// ============================================================
// PATTERN COUNT UTILITY
// ============================================================

/**
 * Get the current pattern count from the database
 * Returns cached value if DB unavailable
 */
async function getPatternCount(): Promise<number> {
  // Try to get from Supabase
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { count, error } = await supabase
        .from('fix_patterns')
        .select('*', { count: 'exact', head: true });

      if (!error && count !== null && count > 0) {
        return count;
      }
    } catch {
      // Fall through to default
    }
  }

  // Default fallback - approximate count based on last known value
  // This should be updated periodically
  return 640;
}

// ============================================================
// SAMPLE DATA
// ============================================================

// Sample issues for demonstration (matching EnrichedIssue interface)
const sampleIssues: EnrichedIssue[] = [
  // NEW issues (in newly added/modified files)
  {
    rule: 'javascript.express.security.audit.xss-direct-response-write.direct-response-write',
    message: 'Directly writing user input to response can lead to XSS',
    severity: 'high',
    category: 'NEW',
    detectedCategory: 'Security',
    file: 'src/routes/api.ts',
    line: 45,
    column: 10,
    tool: 'semgrep',
    fixSuggestion: {
      fix: 'Use res.send() with escaped content or a template engine',
      correctedCode: 'res.send(escapeHtml(userInput))',
      explanation: 'XSS occurs when untrusted data is rendered in HTML without proper escaping.'
    },
    educationalLinks: ['https://owasp.org/www-community/xss-filter-evasion-cheatsheet']
  },
  {
    rule: 'javascript.express.security.sql-injection',
    message: 'SQL query constructed from user input without sanitization',
    severity: 'critical',
    category: 'NEW',
    detectedCategory: 'Security',
    file: 'src/db/queries.ts',
    line: 123,
    column: 5,
    tool: 'semgrep',
    fixSuggestion: {
      fix: 'Use parameterized query',
      correctedCode: 'db.query("SELECT * FROM users WHERE id = $1", [userId])',
      explanation: 'SQL injection occurs when user input is directly included in SQL queries.'
    },
    educationalLinks: ['https://owasp.org/www-community/attacks/SQL_Injection']
  },
  {
    rule: 'javascript.lang.security.detect-child-process.detect-child-process',
    message: 'Command injection via child_process with unsanitized input',
    severity: 'critical',
    category: 'NEW',
    detectedCategory: 'Security',
    file: 'src/utils/shell.ts',
    line: 67,
    column: 3,
    tool: 'semgrep',
    fixSuggestion: {
      fix: 'Use execFile with argument array',
      correctedCode: 'execFile("ls", ["-la", sanitizedPath])',
      explanation: 'Command injection allows attackers to execute arbitrary system commands.'
    },
    educationalLinks: ['https://owasp.org/www-community/attacks/Command_Injection']
  },
  {
    rule: 'typescript.performance.avoid-inline-functions',
    message: 'Inline function in JSX causes unnecessary re-renders',
    severity: 'medium',
    category: 'NEW',
    detectedCategory: 'Performance',
    file: 'src/components/Form.tsx',
    line: 89,
    column: 12,
    tool: 'eslint',
    fixSuggestion: {
      fix: 'Extract to useCallback hook',
      correctedCode: 'const handleClick = useCallback(() => { ... }, [deps])',
      explanation: 'Inline functions create new function instances on every render.'
    }
  },
  // EXISTING_MODIFIED (pre-existing issue in a modified file)
  {
    rule: 'typescript.react.best-practice.missing-key',
    message: 'Missing key prop in list rendering',
    severity: 'low',
    category: 'EXISTING_MODIFIED',
    detectedCategory: 'Code Quality',
    file: 'src/components/List.tsx',
    line: 34,
    column: 8,
    tool: 'eslint',
    fixSuggestion: {
      fix: 'Add unique key prop',
      correctedCode: '<Item key={item.id} {...item} />',
      explanation: 'React needs unique keys to efficiently update the DOM.'
    }
  },
  // EXISTING_REST issues (pre-existing in unchanged files - informational only)
  {
    rule: 'typescript.no-unused-vars',
    message: 'Unused variable "tempData"',
    severity: 'low',
    category: 'EXISTING_REST',
    detectedCategory: 'Code Quality',
    file: 'src/utils/helpers.ts',
    line: 45,
    column: 7,
    tool: 'eslint'
  },
  {
    rule: 'typescript.prefer-const',
    message: "Prefer const over let when variable is never reassigned",
    severity: 'low',
    category: 'EXISTING_REST',
    detectedCategory: 'Code Quality',
    file: 'src/services/auth.ts',
    line: 78,
    column: 5,
    tool: 'eslint'
  },
  {
    rule: 'typescript.no-console',
    message: 'Unexpected console statement',
    severity: 'low',
    category: 'EXISTING_REST',
    detectedCategory: 'Code Quality',
    file: 'src/index.ts',
    line: 12,
    column: 3,
    tool: 'eslint'
  }
];

// Sample issue groups (matching IssueGroup interface)
const sampleGroups: IssueGroup[] = [
  {
    rule: 'javascript.express.security.sql-injection',
    tool: 'semgrep',
    severity: 'critical',
    description: 'SQL query constructed from user input without sanitization',
    category: 'NEW',
    detectedCategory: 'Security',
    count: 1,
    examples: [{ file: 'src/db/queries.ts', line: 123 }],
    isRecommendationOnly: false,
    hasNativeFix: false,
    fixTier: 3,
    aiAnalyzed: true,
    costSaved: 0,
    fixSuggestion: {
      fix: 'Use parameterized query',
      correctedCode: 'db.query("SELECT * FROM users WHERE id = $1", [userId])',
      explanation: 'SQL injection occurs when user input is directly included in SQL queries.'
    }
  },
  {
    rule: 'javascript.lang.security.detect-child-process',
    tool: 'semgrep',
    severity: 'critical',
    description: 'Command injection via child_process with unsanitized input',
    category: 'NEW',
    detectedCategory: 'Security',
    count: 1,
    examples: [{ file: 'src/utils/shell.ts', line: 67 }],
    isRecommendationOnly: false,
    hasNativeFix: false,
    fixTier: 3,
    aiAnalyzed: true,
    costSaved: 0
  },
  {
    rule: 'javascript.express.security.audit.xss-direct-response-write',
    tool: 'semgrep',
    severity: 'high',
    description: 'Directly writing user input to response can lead to XSS',
    category: 'NEW',
    detectedCategory: 'Security',
    count: 1,
    examples: [{ file: 'src/routes/api.ts', line: 45 }],
    isRecommendationOnly: false,
    hasNativeFix: false,
    fixTier: 3,
    aiAnalyzed: true,
    costSaved: 0
  },
  {
    rule: 'typescript.performance.avoid-inline-functions',
    tool: 'eslint',
    severity: 'medium',
    description: 'Inline function in JSX causes unnecessary re-renders',
    category: 'NEW',
    detectedCategory: 'Performance',
    count: 1,
    examples: [{ file: 'src/components/Form.tsx', line: 89 }],
    isRecommendationOnly: false,
    hasNativeFix: true,
    fixTier: 1,
    aiAnalyzed: false,
    costSaved: 0.003
  },
  {
    rule: 'typescript.react.best-practice.missing-key',
    tool: 'eslint',
    severity: 'low',
    description: 'Missing key prop in list rendering',
    category: 'EXISTING',
    detectedCategory: 'Code Quality',
    count: 1,
    examples: [{ file: 'src/components/List.tsx', line: 34 }],
    isRecommendationOnly: false,
    hasNativeFix: true,
    fixTier: 1,
    aiAnalyzed: false,
    costSaved: 0.003
  }
];

// Sample PRO user metrics (matching UserMetrics interface)
const sampleProMetrics: UserMetrics = {
  previousAnalyses: [
    { prNumber: 145, repository: 'expressjs/express', analysisDate: new Date('2025-12-15'), score: 72, issuesFound: 8, issuesFixed: 8, timeSavedMinutes: 45, costSavedDollars: 112 },
    { prNumber: 143, repository: 'expressjs/express', analysisDate: new Date('2025-12-12'), score: 85, issuesFound: 4, issuesFixed: 4, timeSavedMinutes: 30, costSavedDollars: 75 },
    { prNumber: 140, repository: 'expressjs/express', analysisDate: new Date('2025-12-08'), score: 78, issuesFound: 6, issuesFixed: 5, timeSavedMinutes: 40, costSavedDollars: 100 },
    { prNumber: 138, repository: 'expressjs/express', analysisDate: new Date('2025-12-05'), score: 90, issuesFound: 2, issuesFixed: 2, timeSavedMinutes: 15, costSavedDollars: 38 },
    { prNumber: 135, repository: 'expressjs/express', analysisDate: new Date('2025-12-01'), score: 65, issuesFound: 12, issuesFixed: 10, timeSavedMinutes: 60, costSavedDollars: 150 }
  ],
  monthlyStats: {
    totalAnalyses: 12,
    totalIssuesFixed: 38,
    totalTimeSavedHours: 9.5,
    totalCostSaved: 475,
    avgScore: 78
  },
  patternsContributed: 8,
  usersHelped: 47
};

// Sample community impact for PRO
const sampleCommunityImpact: CommunityImpactSummary = {
  totalPatternsContributed: 8,
  totalUsersHelped: 47,
  totalTimeSavedHours: 12.5,
  totalUsageCount: 156,
  topPatterns: [
    {
      patternId: 'p-001',
      patternName: 'Express XSS Response Fix',
      ruleId: 'javascript.express.security.audit.xss-direct-response-write',
      language: 'typescript',
      contributedAt: new Date('2025-11-15'),
      usageCount: 89,
      usersHelped: 23,
      timeSavedMinutes: 445
    },
    {
      patternId: 'p-002',
      patternName: 'SQL Injection Parameterization',
      ruleId: 'javascript.express.security.sql-injection',
      language: 'typescript',
      contributedAt: new Date('2025-11-20'),
      usageCount: 45,
      usersHelped: 15,
      timeSavedMinutes: 225
    }
  ],
  monthlyRank: 12,
  percentileRank: 85
};

// Sample achievements for PRO
const sampleAchievements: UnlockedAchievement[] = [
  {
    id: 'first-blood',
    name: 'First Blood',
    description: 'Fix your first security vulnerability',
    category: 'security',
    tier: 'common',
    unlockedAt: new Date('2025-10-15'),
    xpValue: 50
  },
  {
    id: 'vulnerability-hunter',
    name: 'Vulnerability Hunter',
    description: 'Fix 50 security vulnerabilities',
    category: 'security',
    tier: 'epic',
    unlockedAt: new Date('2025-12-10'),
    xpValue: 500,
    progress: 50,
    progressMax: 50
  },
  {
    id: 'quality-champion',
    name: 'Quality Champion',
    description: 'Maintain 90+ score on 5 consecutive PRs',
    category: 'quality',
    tier: 'rare',
    unlockedAt: new Date('2025-12-18'),
    xpValue: 200
  }
];

// Sample promo eligibility for BASIC
const sampleBasicEligibility: PromoEligibility = {
  tier: 'basic',
  daysSinceSignup: 14,
  totalAnalyses: 8,
  analysesThisWeek: 3,
  hasUsedProTrial: false,
  hasSecurityIssues: true,
  issueCount: 5
};

// ============================================================
// REPORT GENERATION
// ============================================================

function generateHeader(tier: UserTier): string {
  const tierBadge = tier === 'pro' ? '🌟 PRO' : tier === 'enterprise' ? '🏢 Enterprise' : '📋 Basic';
  const analysisDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  });

  return `# 🔍 Code Quality Analysis Report

## Repository Information

**Repository:** [expressjs/express](https://github.com/expressjs/express)
**Pull Request:** #6947 - Add new middleware API
**Author:** developer123 (developer123@users.noreply.github.com)
**Organization:** expressjs
**Source Branch:** feature/middleware-api
**Target Branch:** main
**Analysis Date:** ${analysisDate}
**Repository Size:** 1,247 files | 89,432 lines
**Analyzer Version:** 9.0.0
**Tier:** ${tierBadge}

## PR Impact

**Files Modified:** 12
**Lines Added:** +347
**Lines Deleted:** -89
**Net Change:** +258 lines

## Analysis Performance

**Total Duration:** 2m 15s

## Quality Decision

**Result:** ⛔ **DECLINED** (3 blocking issues)

---
`;
}

async function generateExecutiveSummary(tier: UserTier): Promise<string> {
  const patternCount = await getPatternCount();
  const criticalCount = sampleIssues.filter(i => i.severity === 'critical').length;
  const highCount = sampleIssues.filter(i => i.severity === 'high').length;
  const mediumCount = sampleIssues.filter(i => i.severity === 'medium').length;
  const lowCount = sampleIssues.filter(i => i.severity === 'low').length;
  const newCount = sampleIssues.filter(i => i.category === 'NEW').length;
  const existingModCount = sampleIssues.filter(i => i.category === 'EXISTING_MODIFIED').length;
  const existingRestCount = sampleIssues.filter(i => i.category === 'EXISTING_REST').length;

  // Count by detected category
  const securityCount = sampleIssues.filter(i => i.detectedCategory === 'Security').length;
  const performanceCount = sampleIssues.filter(i => i.detectedCategory === 'Performance').length;
  const qualityCount = sampleIssues.filter(i => i.detectedCategory === 'Code Quality').length;

  // =========================================================================
  // APP SCORE CALCULATION (Repository Health)
  // Base: 100, counts ALL issues, uses MIN of categories
  // =========================================================================
  const calculateAppCategoryScore = (issues: EnrichedIssue[]): number => {
    let score = 100;
    issues.forEach(issue => {
      const deduction = { critical: 5, high: 3, medium: 1, low: 0.5 }[issue.severity] || 1;
      score -= deduction;
    });
    return Math.max(0, Math.min(100, Math.round(score)));
  };

  const securityScore = calculateAppCategoryScore(sampleIssues.filter(i => i.detectedCategory === 'Security'));
  const performanceScore = calculateAppCategoryScore(sampleIssues.filter(i => i.detectedCategory === 'Performance'));
  const qualityScore = calculateAppCategoryScore(sampleIssues.filter(i => i.detectedCategory === 'Code Quality'));
  const appScore = Math.min(securityScore, performanceScore, qualityScore);

  // =========================================================================
  // SKILL SCORE CALCULATION (Developer's Code Quality)
  // Base: 50 (new user) or from Supabase (existing user)
  // Only counts NEW + EXISTING_MODIFIED issues (developer's responsibility)
  // =========================================================================
  const SKILL_BASE_SCORE = 50; // New users start at 50, existing users would load from Supabase

  const calculateSkillCategoryScore = (issues: EnrichedIssue[]): number => {
    // Filter to only developer-responsible issues
    const developerIssues = issues.filter(i => i.category === 'NEW' || i.category === 'EXISTING_MODIFIED');
    let score = SKILL_BASE_SCORE;
    developerIssues.forEach(issue => {
      const deduction = { critical: 5, high: 3, medium: 1, low: 0.5 }[issue.severity] || 1;
      score -= deduction;
    });
    return Math.max(0, Math.min(100, Math.round(score)));
  };

  // Calculate skill scores per category (only developer-responsible issues)
  const skillSecurityScore = calculateSkillCategoryScore(sampleIssues.filter(i => i.detectedCategory === 'Security'));
  const skillPerformanceScore = calculateSkillCategoryScore(sampleIssues.filter(i => i.detectedCategory === 'Performance'));
  const skillQualityScore = calculateSkillCategoryScore(sampleIssues.filter(i => i.detectedCategory === 'Code Quality'));
  const skillArchitectureScore = calculateSkillCategoryScore(sampleIssues.filter(i => i.detectedCategory === 'Architecture'));
  const skillDependencyScore = calculateSkillCategoryScore(sampleIssues.filter(i => i.detectedCategory === 'Dependencies'));

  // Skill Score = AVG of all 5 categories
  const skillScore = Math.round(
    (skillSecurityScore + skillPerformanceScore + skillQualityScore +
     skillArchitectureScore + skillDependencyScore) / 5
  );

  const grade = appScore >= 90 ? 'A' : appScore >= 80 ? 'B' : appScore >= 70 ? 'C' : appScore >= 60 ? 'D' : 'F';
  const gradeEmoji = appScore >= 70 ? '✅' : appScore >= 50 ? '⚠️' : '❌';

  return `
## 📊 Executive Summary

### Quality Score

${gradeEmoji} **${appScore}/100** (Grade: **${grade}**) - ${appScore >= 70 ? 'Good' : appScore >= 50 ? 'Needs Improvement' : 'Critical'}

> ${appScore >= 70 ? 'Code quality meets standards' : 'Quality issues require attention'}

**Score Breakdown**:

**Category Scores** (Repository Health):
- 🔒 Security: ${securityScore}/100
- ⚡ Performance: ${performanceScore}/100
- ✨ Code Quality: ${qualityScore}/100

**Overall Scores**:
- 📱 **APP Score**: ${appScore}/100 (MIN of categories - "weakest link")
- 👨‍💻 **Skill Score**: ${skillScore}/100 (base ${SKILL_BASE_SCORE} ± issue deductions)

**Skill Score Breakdown** (NEW + EXISTING_MODIFIED issues only):
- 🔒 Security: ${skillSecurityScore}/100
- ⚡ Performance: ${skillPerformanceScore}/100
- ✨ Code Quality: ${skillQualityScore}/100
- 🏗️ Architecture: ${skillArchitectureScore}/100
- 📦 Dependencies: ${skillDependencyScore}/100

> Scores saved to Supabase for tracking trends over time


> 🚀 **Fix Coverage**: ${sampleIssues.length} issues (100%) have pattern-based fixes available
> See **AI Fix Recommendations** section below for BASIC vs PRO tier details.

---

### Issue Summary

**Total Issues**: ${sampleIssues.length} (${sampleGroups.length} unique types)

**By Severity**:
- 🔴 Critical: ${criticalCount} (${((criticalCount / sampleIssues.length) * 100).toFixed(1)}%)
- 🟠 High: ${highCount} (${((highCount / sampleIssues.length) * 100).toFixed(1)}%)
- 🟡 Medium: ${mediumCount} (${((mediumCount / sampleIssues.length) * 100).toFixed(1)}%)
- 🟢 Low: ${lowCount} (${((lowCount / sampleIssues.length) * 100).toFixed(1)}%)

**By Category & Severity**:

| Category | Critical | High | Medium | Low | Total |
|----------|----------|------|--------|-----|-------|
| 🆕 NEW | ${criticalCount} | ${highCount} | ${mediumCount} | 0 | **${newCount}** |
| ⚠️ EXISTING_MODIFIED | 0 | 0 | 0 | 1 | **${existingModCount}** |
| 📝 EXISTING_REST | 0 | 0 | 0 | ${existingRestCount} | **${existingRestCount}** |
| ✅ RESOLVED | 0 | 0 | 0 | 0 | **0** |
| **TOTAL** | **${criticalCount}** | **${highCount}** | **${mediumCount}** | **${lowCount}** | **${sampleIssues.length}** |

**App Health Score by Category**:

| Category | Critical | High | Medium | Low | Total | Score |
|----------|----------|------|--------|-----|-------|-------|
| 🔒 Security | ${criticalCount} | ${highCount} | 0 | 0 | **${securityCount}** | **${securityScore}/100** |
| ⚡ Performance | 0 | 0 | ${mediumCount} | 0 | **${performanceCount}** | **${performanceScore}/100** |
| ✨ Code Quality | 0 | 0 | 0 | ${lowCount} | **${qualityCount}** | **${qualityScore}/100** |
| **TOTAL** | **${criticalCount}** | **${highCount}** | **${mediumCount}** | **${lowCount}** | **${sampleIssues.length}** | - |

> **Score Calculation:**
> - **APP Score:** Each category starts at 100, deducts for ALL issues: Critical (-5), High (-3), Medium (-1), Low (-0.5). Overall = MIN(all categories).
> - **Skill Score:** Each category starts at ${SKILL_BASE_SCORE} (new user) or previous score (existing user), deducts only for NEW + EXISTING_MODIFIED issues. Overall = AVG(all categories).

---

### Decision & Actions

**Blocking Decision**:
- ${criticalCount + highCount} blocking issues (NEW or EXISTING_MODIFIED with critical/high severity)
- ${criticalCount + highCount > 0 ? '⛔ **PR REQUIRES FIXES BEFORE MERGE**' : '✅ **PR CAN BE MERGED**'}

**Analysis Results**:
- AI-analyzed groups: ${sampleGroups.length}
- Cost-optimized analysis: 85% reduction via pattern reuse
- Coverage: 100% of detected issues
- Duration: 2m 15s

---

### 🤖 AI Fix Recommendations & Auto-Fix Capability

**BASIC vs PRO Tier Fix System**:

**🆓 BASIC Tier** (Issue Detection + IDE Export):
- 🔍 **Full Detection**: All ${sampleIssues.length} issues detected and analyzed
- 📄 **Export Formats**: LSP, SARIF, GitLab - apply fixes in your IDE
- 📖 **Fix Guidance**: AI-generated fix recommendations for every issue
- ⏱️ **Manual Apply**: ~${Math.round(sampleIssues.length * 3)} min to apply fixes via IDE

**⭐ PRO Tier** (One-Click Auto-Fix):
- ⚡ **Instant Apply**: All fixes applied in ~30 seconds (no manual work)
- ✅ **Verified Fixes**: Syntax and behavior validated before apply
- 🔄 **Pattern Library**: ${patternCount}+ pre-learned patterns for fast fixing
- 📈 **100% Coverage**: Every issue gets an actionable fix

---

### 🔑 Key Findings

1. **🔴 2 Critical Security Vulnerabilities** - SQL injection and command injection detected
2. **🟠 1 High Severity XSS Risk** - User input directly written to response
3. **🟡 1 Performance Issue** - Inline functions causing re-renders
4. **⚪ 1 Quality Issue** - Missing key prop in list

---

### ⚡ Critical Blockers

⛔ **${criticalCount + highCount} issues must be fixed before merge**

**Breakdown:**
- 🔴 Critical: ${criticalCount} issues
- 🟠 High: ${highCount} issue

**Primary Focus Areas:** ${securityCount} security, ${performanceCount} performance

**Action Required:**
All blocking issues are detailed in the sections below with:
- ✅ Full AI analysis and explanations
- ✅ Code examples and fix recommendations
- ✅ IDE integration files for automated fixes

---

### 📈 Trends & Recommendations

🚀 **Quick Win**: ${sampleIssues.length} issues (100%) have auto-fix available via IDE integration.

1. **Immediate Action**: ${criticalCount + highCount} blocking issues require review before deployment
2. **Security Posture**: Address SQL injection and command injection immediately
3. **Code Review Process**: Consider pre-commit hooks for automated checks
4. **Automation Opportunity**: 100% of issues auto-fixable

---
`;
}

function generateIssueDetails(): string {
  let content = `
## 🔴 Critical Priority Issues

### 🔴 SQL Injection Vulnerability

**Severity**: CRITICAL | **Tool**: semgrep | **Found in**: 3 files | **Category**: NEW

---

#### 📋 What is this issue?

SQL query constructed from user input without sanitization. This allows attackers to read, modify, or delete database contents.

#### 🎯 Why does it matter?

SQL injection is consistently ranked as one of the most dangerous web application vulnerabilities. It allows attackers to bypass authentication, access sensitive data, modify or delete database contents, and potentially gain full system access.

#### 🔍 Common causes:

- String concatenation in SQL queries
- Missing input validation
- Direct use of user input in queries

#### ⚠️ Impact if not fixed:

**Critical Risk** - Data breach, unauthorized access, complete database compromise. Potential regulatory fines (GDPR: €20M or 4% revenue).

#### ⚡ Risk Assessment

**Overall Risk**: 🔴 **CRITICAL RISK**

Requires immediate attention - could lead to security breach or system failure

**Category**: Security
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: \`src/db/queries.ts\` (Line 123)

**Code**:

\`\`\`typescript
    120 | async function getUser(userId: string) {
    121 |   // VULNERABLE: User input directly in query
>   122 |   const query = "SELECT * FROM users WHERE id = " + userId;
    123 |   return db.query(query);
    124 | }
\`\`\`

#### 🔧 How to Fix

Use parameterized queries instead of string concatenation to prevent SQL injection attacks.

**Recommended Code**:

\`\`\`typescript
const query = "SELECT * FROM users WHERE id = $1";
return db.query(query, [userId]);
\`\`\`

#### 📎 All Occurrences

This issue appears in **3 files** across your codebase:
- \`src/db/queries.ts:123\`
- \`src/db/queries.ts:156\`
- \`src/services/user-service.ts:89\`

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---

### 🔴 Command Injection Vulnerability

**Severity**: CRITICAL | **Tool**: semgrep | **Found in**: 2 files | **Category**: NEW

---

#### 📋 What is this issue?

Command injection via child_process with unsanitized input enables full system compromise.

#### 🎯 Why does it matter?

Command injection allows attackers to execute arbitrary system commands on your server. This can lead to complete system takeover, data exfiltration, or use of your server for malicious purposes.

#### 🔍 Common causes:

- Using exec() with user input
- Template literals with unsanitized variables
- Missing input sanitization

#### ⚠️ Impact if not fixed:

**Critical Risk** - Full server compromise, remote code execution, data theft.

#### ⚡ Risk Assessment

**Overall Risk**: 🔴 **CRITICAL RISK**

Requires immediate attention - could lead to security breach or system failure

**Category**: Security
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: \`src/utils/shell.ts\` (Line 67)

**Code**:

\`\`\`typescript
    64 | function listFiles(path: string) {
    65 |   // VULNERABLE: User input in command
>   66 |   return exec(\`ls -la \${path}\`);
    67 | }
\`\`\`

#### 🔧 How to Fix

Use execFile with an argument array instead of exec with string interpolation.

**Recommended Code**:

\`\`\`typescript
return execFile("ls", ["-la", sanitizedPath]);
\`\`\`

#### 📎 All Occurrences

This issue appears in **2 files** across your codebase:
- \`src/utils/shell.ts:67\`
- \`src/utils/file-ops.ts:34\`

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---

## 🟠 High Priority Issues

### 🟠 XSS Vulnerability (Direct Response Write)

**Severity**: HIGH | **Tool**: semgrep | **Found in**: 1 file | **Category**: NEW

---

#### 📋 What is this issue?

Directly writing user input to response can lead to cross-site scripting attacks.

#### 🎯 Why does it matter?

XSS attacks allow attackers to inject malicious scripts into your web pages, potentially stealing user sessions, credentials, or performing actions on behalf of users.

#### 🔍 Common causes:

- Using res.write() with unsanitized input
- Missing HTML escaping
- Trusting user input in responses

#### ⚠️ Impact if not fixed:

**High Risk** - Session hijacking, credential theft, defacement.

#### ⚡ Risk Assessment

**Overall Risk**: 🟠 **HIGH RISK**

High priority - could cause significant problems in production

**Category**: Security
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: \`src/routes/api.ts\` (Line 45)

**Code**:

\`\`\`typescript
    42 | app.get('/search', (req, res) => {
    43 |   const query = req.query.q;
>   44 |   res.send(\`Results for: \${query}\`);
    45 | });
\`\`\`

#### 🔧 How to Fix

Use proper HTML escaping when outputting user input to responses.

**Recommended Code**:

\`\`\`typescript
res.send(\`Results for: \${escapeHtml(query)}\`);
\`\`\`

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase:
- \`src/routes/api.ts:45\`

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---

## 🟡 Medium Priority Issues

### 🟡 Inline Functions in JSX

**Severity**: MEDIUM | **Tool**: eslint | **Found in**: 1 file | **Category**: NEW

---

#### 📋 What is this issue?

Inline function in JSX causes unnecessary re-renders.

#### 🎯 Why does it matter?

Inline functions create new function instances on every render, causing child components to re-render unnecessarily and impacting performance.

#### ⚠️ Impact if not fixed:

**Medium Risk** - Performance degradation, especially in lists or frequently-updating components.

#### 📍 Representative Example

**Location**: \`src/components/Form.tsx\` (Line 89)

#### 🔧 How to Fix

Extract the function to useCallback hook or define outside the component.

**Recommended Code**:

\`\`\`typescript
const handleClick = useCallback(() => { ... }, [deps]);
\`\`\`

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

---

## 🟢 Low Priority Issues

### 🟢 Missing Key Prop in List

**Severity**: LOW | **Tool**: eslint | **Found in**: 1 file | **Category**: EXISTING

---

#### 📋 What is this issue?

Missing key prop in list rendering.

#### 🎯 Why does it matter?

React needs unique keys to efficiently update the DOM. Missing keys can lead to incorrect component state and subtle bugs.

#### ⚠️ Impact if not fixed:

**Low Risk** - Potential rendering bugs and performance issues.

#### 📍 Representative Example

**Location**: \`src/components/List.tsx\` (Line 34)

#### 🔧 How to Fix

Add unique key prop to list items.

**Recommended Code**:

\`\`\`typescript
<Item key={item.id} {...item} />
\`\`\`

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

---

## 📝 Pre-Existing Issues (EXISTING_REST)

> These issues existed before this PR and are in files that were **not modified**. They are shown for awareness but are **not blocking** this PR.

### 📝 Unused Variables

**Severity**: LOW | **Tool**: eslint | **Found in**: 1 file | **Category**: EXISTING_REST

Unused variable "tempData" in \`src/utils/helpers.ts:45\`

---

### 📝 Prefer Const

**Severity**: LOW | **Tool**: eslint | **Found in**: 1 file | **Category**: EXISTING_REST

Variable is never reassigned, prefer const in \`src/services/auth.ts:78\`

---

### 📝 Console Statements

**Severity**: LOW | **Tool**: eslint | **Found in**: 1 file | **Category**: EXISTING_REST

Unexpected console statement in \`src/index.ts:12\`

---
`;

  return content;
}

function generateAnalysisMetadata(): string {
  return `
## 📋 Analysis Metadata

### Agent/Tool Performance

| Agent | Duration | Issues Found |
|-------|----------|--------------|
| 🔒 Security Agent | 45s | 3 |
| ⚡ Performance Agent | 32s | 1 |
| ✨ Quality Agent | 28s | 1 |
| **Total** | **2m 15s** | **5** |

### Tool Breakdown

| Tool | Rules Matched | Issues |
|------|---------------|--------|
| semgrep | 3 | 3 |
| eslint | 2 | 2 |
| **Total** | **5** | **5** |

### Cost Analysis

| Metric | Value |
|--------|-------|
| **Pattern Hits** | 3 (60%) |
| **AI Calls Made** | 2 (40%) |
| **Estimated AI Cost** | $0.02 |
| **Cost Saved by Patterns** | $0.03 |

---
`;
}

function generatePRCommentTemplate(): string {
  const criticalCount = sampleIssues.filter(i => i.severity === 'critical').length;
  const highCount = sampleIssues.filter(i => i.severity === 'high').length;

  return `
## 💬 PR Comment Template

Copy this to your PR comment:

\`\`\`markdown
## 🔍 CodeQual Analysis

**Result:** ⚠️ CHANGES REQUESTED

### Summary
- **Total Issues:** 5
- **Blocking:** 3 (2 critical, 1 high)
- **Quality Score:** 87/100 (Grade B)

### Critical Issues
1. ⛔ SQL Injection in \`src/db/queries.ts:123\`
2. ⛔ Command Injection in \`src/utils/shell.ts:67\`

### High Priority
1. 🟠 XSS Vulnerability in \`src/routes/api.ts:45\`

### Recommendations
- Fix blocking issues before merge
- Review security practices for user input handling
- Consider using parameterized queries consistently

---
*Analyzed by CodeQual V9 • [View Full Report](link)*
\`\`\`

---
`;
}

/**
 * Generate Skills Growth Tracker for PRO tier
 * Uses base 50 for new users, deducts for issues in NEW/MODIFIED files
 */
function generateSkillsTrackerPro(skillScores: {
  security: number;
  performance: number;
  codeQuality: number;
  architecture: number;
  dependencies: number;
}): string {
  // Calculate trends (sample data - in real implementation would come from Supabase)
  const trends = {
    security: skillScores.security < 50 ? -3 : skillScores.security > 60 ? +2 : 0,
    performance: skillScores.performance < 50 ? -1 : skillScores.performance > 55 ? +1 : 0,
    codeQuality: skillScores.codeQuality < 50 ? -1 : skillScores.codeQuality > 55 ? +1 : 0,
    architecture: 0,
    dependencies: 0
  };

  const formatTrend = (value: number): string => {
    if (value > 0) return `↗️ +${value}`;
    if (value < 0) return `↘️ ${value}`;
    return '→ 0';
  };

  const getNextMilestone = (score: number): string => {
    if (score >= 90) return 'Expert ✓';
    if (score >= 75) return 'Expert (90)';
    if (score >= 60) return 'Advanced (75)';
    if (score >= 45) return 'Intermediate (60)';
    return 'Beginner (45)';
  };

  return `
## 📈 Skills Growth Tracker

### Developer Skill Progress

> 📊 **Base Score:** 50/100 for new developers | Deductions for issues in your code

| Skill | Current | Trend | Next Milestone |
|-------|---------|-------|----------------|
| 🔒 Security | ${skillScores.security}/100 | ${formatTrend(trends.security)} | ${getNextMilestone(skillScores.security)} |
| ⚡ Performance | ${skillScores.performance}/100 | ${formatTrend(trends.performance)} | ${getNextMilestone(skillScores.performance)} |
| ✨ Code Quality | ${skillScores.codeQuality}/100 | ${formatTrend(trends.codeQuality)} | ${getNextMilestone(skillScores.codeQuality)} |
| 🏗️ Architecture | ${skillScores.architecture}/100 | ${formatTrend(trends.architecture)} | ${getNextMilestone(skillScores.architecture)} |
| 📦 Dependencies | ${skillScores.dependencies}/100 | ${formatTrend(trends.dependencies)} | ${getNextMilestone(skillScores.dependencies)} |

### This Month's Activity

- **PRs Analyzed:** 12
- **Issues Fixed:** 38
- **Patterns Contributed:** 3
- **XP Earned:** 450

### Skill Badges Earned

| Badge | Skill | Date |
|-------|-------|------|
| 🛡️ Security Expert | Security | Dec 15 |
| ⚡ Performance Pro | Performance | Dec 10 |
| 🔧 First Fix | General | Nov 20 |

---
`;
}

/**
 * Generate Skills section for BASIC tier - same as PRO (gamification is for all tiers)
 */
function generateSkillsTrackerBasic(skillScores: {
  security: number;
  performance: number;
  codeQuality: number;
  architecture: number;
  dependencies: number;
}): string {
  // Calculate trends (sample data - in real implementation would come from Supabase)
  const trends = {
    security: skillScores.security < 50 ? -3 : skillScores.security > 60 ? +2 : 0,
    performance: skillScores.performance < 50 ? -1 : skillScores.performance > 55 ? +1 : 0,
    codeQuality: skillScores.codeQuality < 50 ? -1 : skillScores.codeQuality > 55 ? +1 : 0,
    architecture: 0,
    dependencies: 0
  };

  const formatTrend = (value: number): string => {
    if (value > 0) return `↗️ +${value}`;
    if (value < 0) return `↘️ ${value}`;
    return '→ 0';
  };

  const getNextMilestone = (score: number): string => {
    if (score >= 90) return 'Expert ✓';
    if (score >= 75) return 'Expert (90)';
    if (score >= 60) return 'Advanced (75)';
    if (score >= 45) return 'Intermediate (60)';
    return 'Beginner (45)';
  };

  return `
## 📈 Skills Growth Tracker

### Developer Skill Progress

> 📊 **Base Score:** 50/100 for new developers | Deductions for issues in your code

| Skill | Current | Trend | Next Milestone |
|-------|---------|-------|----------------|
| 🔒 Security | ${skillScores.security}/100 | ${formatTrend(trends.security)} | ${getNextMilestone(skillScores.security)} |
| ⚡ Performance | ${skillScores.performance}/100 | ${formatTrend(trends.performance)} | ${getNextMilestone(skillScores.performance)} |
| ✨ Code Quality | ${skillScores.codeQuality}/100 | ${formatTrend(trends.codeQuality)} | ${getNextMilestone(skillScores.codeQuality)} |
| 🏗️ Architecture | ${skillScores.architecture}/100 | ${formatTrend(trends.architecture)} | ${getNextMilestone(skillScores.architecture)} |
| 📦 Dependencies | ${skillScores.dependencies}/100 | ${formatTrend(trends.dependencies)} | ${getNextMilestone(skillScores.dependencies)} |

### This Month's Activity

- **PRs Analyzed:** 12
- **Issues Fixed:** 38
- **Patterns Contributed:** 3
- **XP Earned:** 450

### Skill Badges Earned

| Badge | Skill | Date |
|-------|-------|------|
| 🛡️ Security Expert | Security | Dec 15 |
| ⚡ Performance Pro | Performance | Dec 10 |
| 🔧 First Fix | General | Nov 20 |

---
`;
}

/**
 * Generate IDE Integration section with LSP, SARIF, and GitLab formats
 * Available for all tiers - helps users apply fixes using their preferred IDE/CI
 */
function generateIDEIntegrationSection(issueCount: number): string {
  const analysisId = 'a1b2c3d4'; // Sample analysis ID
  const baseUrl = 'https://api.codequal.dev/v1/reports';

  return `
---

## 🔧 IDE Integration & Export Formats

Apply fixes directly in your IDE or integrate with your CI/CD pipeline.

### Quick Fix with IDE

| IDE | Integration | How to Apply |
|-----|-------------|--------------|
| **VS Code** | [CodeQual Extension](https://marketplace.visualstudio.com/items?itemName=codequal.codequal) | Open Command Palette → "CodeQual: Apply Fixes" |
| **Cursor** | Native LSP Support | Ctrl/Cmd + . on highlighted issues |
| **JetBrains** | [CodeQual Plugin](https://plugins.jetbrains.com/plugin/codequal) | Alt + Enter on issues → Quick Fix |
| **Neovim** | LSP Client | \`:lua vim.lsp.buf.code_action()\` |

### Export Formats

Download analysis results in standard formats for integration:

| Format | Use Case | Download |
|--------|----------|----------|
| **LSP (JSON)** | VS Code, Cursor, Neovim | [\`codequal-lsp-actions.json\`](${baseUrl}/${analysisId}/lsp) |
| **SARIF 2.1.0** | GitHub Security, VS Code SARIF Viewer | [\`codequal-sarif-report.json\`](${baseUrl}/${analysisId}/sarif) |
| **GitLab Code Quality** | GitLab MR Integration | [\`codequal-gitlab-codequality.json\`](${baseUrl}/${analysisId}/gitlab) |

### CI/CD Integration

**GitHub Actions:**
\`\`\`yaml
- name: Upload SARIF
  uses: github/codeql-action/upload-sarif@v2
  with:
    sarif_file: codequal-sarif-report.json
\`\`\`

**GitLab CI:**
\`\`\`yaml
code_quality:
  artifacts:
    reports:
      codequality: codequal-gitlab-codequality.json
\`\`\`

### API Endpoints

| Endpoint | Format | Response |
|----------|--------|----------|
| \`GET /api/reports/{id}/lsp\` | LSP Code Actions | JSON with workspace edits |
| \`GET /api/reports/{id}/sarif\` | SARIF 2.1.0 | Industry standard static analysis format |
| \`GET /api/reports/{id}/gitlab\` | Code Climate | GitLab merge request integration |

> 💡 **Tip:** Use LSP format with Cursor or VS Code for the best "Quick Fix" experience - issues appear inline with one-click fixes.

`;
}

async function generateBasicReport(): Promise<string> {
  let report = generateHeader('basic');
  report += await generateExecutiveSummary('basic');
  report += generateIssueDetails();

  // Calculate XP and level (available for all tiers - already computed)
  const totalXp = sampleAchievements.reduce((sum, a) => sum + a.xpValue, 0);
  const levelInfo = calculateLevel(totalXp);

  // Progress section - available for all tiers (data already computed)
  report += `
---

## Your Progress

**Level ${levelInfo.level}: ${levelInfo.title}** | **${totalXp} XP**

${generateXpProgressBar(totalXp, levelInfo.nextLevelXp)}

`;

  // Business impact
  report += generateBusinessImpact(sampleIssues, sampleGroups, 'typescript', 'basic');

  // Achievements section - available for all tiers (data already computed)
  report += generateAchievementsSection(sampleAchievements, 'gamified');

  // Community impact - available for all tiers (data already computed)
  report += generateCommunityImpactSection(sampleCommunityImpact);

  // Educational Resources - available for all tiers (helps developers learn)
  // Uses tool-specific documentation links (Semgrep, ESLint, etc.) instead of generic searches
  report += await generateEducationalResourcesBrave(sampleIssues, 'typescript');

  // IDE Integration section - available for all tiers
  report += generateIDEIntegrationSection(sampleIssues.length);

  // One-Click Auto-Fix section - BASIC tier shows upgrade CTA instead
  report += `
---

## 🚀 Auto-Fix Available with PRO

All ${sampleIssues.length} issues detected can be auto-fixed with PRO tier.

**What you get with BASIC tier:**
- ✅ Detailed fix recommendations (see issue sections above)
- ✅ Code examples showing correct implementation
- ✅ Copy-paste ready fixes for IDE agents (Cursor, Copilot)

**What PRO adds:**
- 🔧 **One-click auto-fix** - Apply fixes directly from this report
- ⏱️ **~30 seconds** to fix all issues (vs 1.5+ hours manually)
- ✅ **Verified fixes** - Syntax and behavior validated before apply

[🚀 **Upgrade to PRO**](/pricing) | [📋 View Fix Recommendations](#issue-details)

---
`;

  // Skills tracking - available for all tiers (data already computed)
  const SKILL_BASE = 50;
  const calculateSkillScore = (categoryIssues: EnrichedIssue[]): number => {
    const devIssues = categoryIssues.filter(i => i.category === 'NEW' || i.category === 'EXISTING_MODIFIED');
    let score = SKILL_BASE;
    devIssues.forEach(issue => {
      const deduction = { critical: 5, high: 3, medium: 1, low: 0.5 }[issue.severity] || 1;
      score -= deduction;
    });
    return Math.max(0, Math.min(100, Math.round(score)));
  };

  const skillScores = {
    security: calculateSkillScore(sampleIssues.filter(i => i.detectedCategory === 'Security')),
    performance: calculateSkillScore(sampleIssues.filter(i => i.detectedCategory === 'Performance')),
    codeQuality: calculateSkillScore(sampleIssues.filter(i => i.detectedCategory === 'Code Quality')),
    architecture: calculateSkillScore(sampleIssues.filter(i => i.detectedCategory === 'Architecture')),
    dependencies: calculateSkillScore(sampleIssues.filter(i => i.detectedCategory === 'Dependencies'))
  };

  report += generateSkillsTrackerPro(skillScores);

  // Add analysis metadata
  report += generateAnalysisMetadata();

  // Add PR comment template
  report += generatePRCommentTemplate();

  // Promotional section for BASIC tier
  const promoType = checkPromoEligibility(sampleBasicEligibility);
  report += generatePromoSection(promoType, sampleBasicEligibility);

  // Add upgrade section
  report += `
---

## 🚀 Recommended Actions

1. **Fix Critical Issues First** - Address SQL injection and command injection immediately
2. **Review Security Practices** - Ensure all user input is validated and sanitized
3. **Enable Auto-Fix** - [Upgrade to PRO](/pricing) for one-click fixes

💡 *PRO tip: Auto-fix all 5 issues in ~30 seconds instead of 1+ hours manually*

---

## ⬆️ Upgrade to PRO

**What PRO adds:**

| Feature | BASIC | PRO |
|---------|-------|-----|
| Issue detection | ✅ | ✅ |
| Detailed recommendations | ✅ | ✅ |
| Achievements & XP | ✅ | ✅ |
| Skills tracking | ✅ | ✅ |
| Community impact | ✅ | ✅ |
| **One-click auto-fix** | ❌ Copy-paste | ✅ **Instant apply** |
| **Historical analytics** | ✅ 5 PR history | ✅ **Unlimited history** |
| **Priority support** | ❌ | ✅ |

${generateTierComparisonTable()}

${generateValueProp(sampleIssues.length, 1.5)}

---

*Report generated by CodeQual V9 • [Upgrade to PRO](/pricing) • [Documentation](/docs)*
`;

  return report;
}

async function generateProReport(): Promise<string> {
  let report = generateHeader('pro');
  report += await generateExecutiveSummary('pro');
  report += generateIssueDetails();

  // Calculate XP and level
  const totalXp = sampleAchievements.reduce((sum, a) => sum + a.xpValue, 0);
  const levelInfo = calculateLevel(totalXp);

  // PRO-exclusive header
  report += `
---

## Your Progress

**Level ${levelInfo.level}: ${levelInfo.title}** | **${totalXp} XP**

${generateXpProgressBar(totalXp, levelInfo.nextLevelXp)}

`;

  // Business impact WITH PRO features (historical data, skills)
  report += generateBusinessImpact(sampleIssues, sampleGroups, 'typescript', 'pro', sampleProMetrics);

  // Achievements section
  report += generateAchievementsSection(sampleAchievements, 'gamified');

  // Community impact
  report += generateCommunityImpactSection(sampleCommunityImpact);

  // Educational Resources - available for all tiers (helps developers learn)
  // Uses tool-specific documentation links (Semgrep, ESLint, etc.) instead of generic searches
  report += await generateEducationalResourcesBrave(sampleIssues, 'typescript');

  // Auto-fix section (PRO exclusive) - PRO users get one-click fixes, no need for IDE export
  report += `
---

## 🚀 One-Click Auto-Fix

All ${sampleIssues.length} issues can be auto-fixed. Click below to apply fixes:

| Issue | File | Confidence | Action |
|-------|------|------------|--------|
| SQL Injection | queries.ts:123 | 95% | [Apply Fix](javascript:void(0)) |
| Command Injection | shell.ts:67 | 90% | [Apply Fix](javascript:void(0)) |
| XSS Response | api.ts:45 | 85% | [Apply Fix](javascript:void(0)) |
| Inline Functions | Form.tsx:89 | 80% | [Apply Fix](javascript:void(0)) |
| Missing Key | List.tsx:34 | 100% | [Apply Fix](javascript:void(0)) |

[🔧 **Apply All Fixes**](javascript:void(0)) | [📋 Review Changes](javascript:void(0)) | [⏭️ Skip This Time](javascript:void(0))

> ⏱️ **Estimated time:** ~30 seconds for all fixes
> 💰 **Value:** Save ~1.5 hours of manual work

---
`;

  // Skills growth tracker - PRO tier with actual calculated scores
  // Calculate skill scores using base 50 for developer-responsible issues
  const SKILL_BASE = 50;
  const calculateSkillScore = (categoryIssues: EnrichedIssue[]): number => {
    const devIssues = categoryIssues.filter(i => i.category === 'NEW' || i.category === 'EXISTING_MODIFIED');
    let score = SKILL_BASE;
    devIssues.forEach(issue => {
      const deduction = { critical: 5, high: 3, medium: 1, low: 0.5 }[issue.severity] || 1;
      score -= deduction;
    });
    return Math.max(0, Math.min(100, Math.round(score)));
  };

  const skillScores = {
    security: calculateSkillScore(sampleIssues.filter(i => i.detectedCategory === 'Security')),
    performance: calculateSkillScore(sampleIssues.filter(i => i.detectedCategory === 'Performance')),
    codeQuality: calculateSkillScore(sampleIssues.filter(i => i.detectedCategory === 'Code Quality')),
    architecture: calculateSkillScore(sampleIssues.filter(i => i.detectedCategory === 'Architecture')),
    dependencies: calculateSkillScore(sampleIssues.filter(i => i.detectedCategory === 'Dependencies'))
  };

  report += generateSkillsTrackerPro(skillScores);

  // Analysis metadata
  report += generateAnalysisMetadata();

  // PR comment template
  report += generatePRCommentTemplate();

  report += `
---

*Report generated by CodeQual V9 PRO • [Profile](/profile) • [Leaderboard](/leaderboard) • [Settings](/settings)*
`;

  return report;
}

// ============================================================
// MAIN
// ============================================================

async function main(): Promise<void> {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║     GENERATING TIER-DIFFERENTIATED V9 SAMPLE REPORTS         ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const outputDir = path.join(__dirname, 'tier-sample-reports');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Generate BASIC tier report
  console.log('📋 Generating BASIC tier report...');
  const basicReport = await generateBasicReport();
  const basicPath = path.join(outputDir, 'sample-v9-report-BASIC.md');
  fs.writeFileSync(basicPath, basicReport);
  console.log(`   ✅ Saved to: ${basicPath}`);

  // Generate PRO tier report
  console.log('🌟 Generating PRO tier report...');
  const proReport = await generateProReport();
  const proPath = path.join(outputDir, 'sample-v9-report-PRO.md');
  fs.writeFileSync(proPath, proReport);
  console.log(`   ✅ Saved to: ${proPath}`);

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('TIER COMPARISON SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log('📋 BASIC Report Features (all free, no extra cost):');
  console.log('   • Issue detection and details');
  console.log('   • Educational content and recommendations');
  console.log('   • Business impact analysis');
  console.log('   • Historical PR analytics (5 PRs) - track improvement');
  console.log('   • XP level and progress bar');
  console.log('   • Achievements with progress');
  console.log('   • Community impact section');
  console.log('   • Skills tracking');
  console.log('   • IDE integration exports (LSP, SARIF, GitLab)');

  console.log('\n🌟 PRO Report Features (BASIC + auto-fix):');
  console.log('   • One-click auto-fix buttons - AI-powered fixes');
  console.log('   • Fix confidence levels and review guidance');
  console.log('   • Commit integration with detailed messages');
  console.log('   • Priority support');

  console.log('\n📂 Reports saved to:');
  console.log(`   ${outputDir}/`);
  console.log('     ├── sample-v9-report-BASIC.md');
  console.log('     └── sample-v9-report-PRO.md');

  console.log('\n✅ Ready for UX/UI review!');
}

main().catch(console.error);
