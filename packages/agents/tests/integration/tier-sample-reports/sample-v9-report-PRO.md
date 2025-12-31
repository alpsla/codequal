# 🔍 Code Quality Analysis Report

## Repository Information

**Repository:** [expressjs/express](https://github.com/expressjs/express)
**Pull Request:** #6947 - Add new middleware API
**Author:** developer123 (developer123@users.noreply.github.com)
**Organization:** expressjs
**Source Branch:** feature/middleware-api
**Target Branch:** main
**Analysis Date:** December 31, 2025 at 02:23 PM EST
**Repository Size:** 1,247 files | 89,432 lines
**Analyzer Version:** 9.0.0
**Tier:** 🌟 PRO

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

## 📊 Executive Summary

### Quality Score

✅ **87/100** (Grade: **B**) - Good

> Code quality meets standards

**Score Breakdown**:

**Category Scores** (Repository Health):
- 🔒 Security: 87/100
- ⚡ Performance: 99/100
- ✨ Code Quality: 98/100

**Overall Scores**:
- 📱 **APP Score**: 87/100 (MIN of categories - "weakest link")
- 👨‍💻 **Skill Score**: 47/100 (base 50 ± issue deductions)

**Skill Score Breakdown** (NEW + EXISTING_MODIFIED issues only):
- 🔒 Security: 37/100
- ⚡ Performance: 49/100
- ✨ Code Quality: 50/100
- 🏗️ Architecture: 50/100
- 📦 Dependencies: 50/100

> Scores saved to Supabase for tracking trends over time


> 🚀 **Fix Coverage**: 8 issues (100%) have pattern-based fixes available
> See **AI Fix Recommendations** section below for BASIC vs PRO tier details.

---

### Issue Summary

**Total Issues**: 8 (5 unique types)

**By Severity**:
- 🔴 Critical: 2 (25.0%)
- 🟠 High: 1 (12.5%)
- 🟡 Medium: 1 (12.5%)
- 🟢 Low: 4 (50.0%)

**By Category & Severity**:

| Category | Critical | High | Medium | Low | Total |
|----------|----------|------|--------|-----|-------|
| 🆕 NEW | 2 | 1 | 1 | 0 | **4** |
| ⚠️ EXISTING_MODIFIED | 0 | 0 | 0 | 1 | **1** |
| 📝 EXISTING_REST | 0 | 0 | 0 | 3 | **3** |
| ✅ RESOLVED | 0 | 0 | 0 | 0 | **0** |
| **TOTAL** | **2** | **1** | **1** | **4** | **8** |

**App Health Score by Category**:

| Category | Critical | High | Medium | Low | Total | Score |
|----------|----------|------|--------|-----|-------|-------|
| 🔒 Security | 2 | 1 | 0 | 0 | **3** | **87/100** |
| ⚡ Performance | 0 | 0 | 1 | 0 | **1** | **99/100** |
| ✨ Code Quality | 0 | 0 | 0 | 4 | **4** | **98/100** |
| **TOTAL** | **2** | **1** | **1** | **4** | **8** | - |

> **Score Calculation:**
> - **APP Score:** Each category starts at 100, deducts for ALL issues: Critical (-5), High (-3), Medium (-1), Low (-0.5). Overall = MIN(all categories).
> - **Skill Score:** Each category starts at 50 (new user) or previous score (existing user), deducts only for NEW + EXISTING_MODIFIED issues. Overall = AVG(all categories).

---

### Decision & Actions

**Blocking Decision**:
- 3 blocking issues (NEW or EXISTING_MODIFIED with critical/high severity)
- ⛔ **PR REQUIRES FIXES BEFORE MERGE**

**Analysis Results**:
- AI-analyzed groups: 5
- Cost-optimized analysis: 85% reduction via pattern reuse
- Coverage: 100% of detected issues
- Duration: 2m 15s

---

### 🤖 AI Fix Recommendations & Auto-Fix Capability

**BASIC vs PRO Tier Fix System**:

**🆓 BASIC Tier** (Issue Detection + IDE Export):
- 🔍 **Full Detection**: All 8 issues detected and analyzed
- 📄 **Export Formats**: LSP, SARIF, GitLab - apply fixes in your IDE
- 📖 **Fix Guidance**: AI-generated fix recommendations for every issue
- ⏱️ **Manual Apply**: ~24 min to apply fixes via IDE

**⭐ PRO Tier** (One-Click Auto-Fix):
- ⚡ **Instant Apply**: All fixes applied in ~30 seconds (no manual work)
- ✅ **Verified Fixes**: Syntax and behavior validated before apply
- 🔄 **Pattern Library**: 640+ pre-learned patterns for fast fixing
- 📈 **100% Coverage**: Every issue gets an actionable fix

---

### 🔑 Key Findings

1. **🔴 2 Critical Security Vulnerabilities** - SQL injection and command injection detected
2. **🟠 1 High Severity XSS Risk** - User input directly written to response
3. **🟡 1 Performance Issue** - Inline functions causing re-renders
4. **⚪ 1 Quality Issue** - Missing key prop in list

---

### ⚡ Critical Blockers

⛔ **3 issues must be fixed before merge**

**Breakdown:**
- 🔴 Critical: 2 issues
- 🟠 High: 1 issue

**Primary Focus Areas:** 3 security, 1 performance

**Action Required:**
All blocking issues are detailed in the sections below with:
- ✅ Full AI analysis and explanations
- ✅ Code examples and fix recommendations
- ✅ IDE integration files for automated fixes

---

### 📈 Trends & Recommendations

🚀 **Quick Win**: 8 issues (100%) have auto-fix available via IDE integration.

1. **Immediate Action**: 3 blocking issues require review before deployment
2. **Security Posture**: Address SQL injection and command injection immediately
3. **Code Review Process**: Consider pre-commit hooks for automated checks
4. **Automation Opportunity**: 100% of issues auto-fixable

---

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

**Location**: `src/db/queries.ts` (Line 123)

**Code**:

```typescript
    120 | async function getUser(userId: string) {
    121 |   // VULNERABLE: User input directly in query
>   122 |   const query = "SELECT * FROM users WHERE id = " + userId;
    123 |   return db.query(query);
    124 | }
```

#### 🔧 How to Fix

Use parameterized queries instead of string concatenation to prevent SQL injection attacks.

**Recommended Code**:

```typescript
const query = "SELECT * FROM users WHERE id = $1";
return db.query(query, [userId]);
```

#### 📎 All Occurrences

This issue appears in **3 files** across your codebase:
- `src/db/queries.ts:123`
- `src/db/queries.ts:156`
- `src/services/user-service.ts:89`

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

**Location**: `src/utils/shell.ts` (Line 67)

**Code**:

```typescript
    64 | function listFiles(path: string) {
    65 |   // VULNERABLE: User input in command
>   66 |   return exec(`ls -la ${path}`);
    67 | }
```

#### 🔧 How to Fix

Use execFile with an argument array instead of exec with string interpolation.

**Recommended Code**:

```typescript
return execFile("ls", ["-la", sanitizedPath]);
```

#### 📎 All Occurrences

This issue appears in **2 files** across your codebase:
- `src/utils/shell.ts:67`
- `src/utils/file-ops.ts:34`

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

**Location**: `src/routes/api.ts` (Line 45)

**Code**:

```typescript
    42 | app.get('/search', (req, res) => {
    43 |   const query = req.query.q;
>   44 |   res.send(`Results for: ${query}`);
    45 | });
```

#### 🔧 How to Fix

Use proper HTML escaping when outputting user input to responses.

**Recommended Code**:

```typescript
res.send(`Results for: ${escapeHtml(query)}`);
```

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase:
- `src/routes/api.ts:45`

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

**Location**: `src/components/Form.tsx` (Line 89)

#### 🔧 How to Fix

Extract the function to useCallback hook or define outside the component.

**Recommended Code**:

```typescript
const handleClick = useCallback(() => { ... }, [deps]);
```

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

**Location**: `src/components/List.tsx` (Line 34)

#### 🔧 How to Fix

Add unique key prop to list items.

**Recommended Code**:

```typescript
<Item key={item.id} {...item} />
```

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

---

## 📝 Pre-Existing Issues (EXISTING_REST)

> These issues existed before this PR and are in files that were **not modified**. They are shown for awareness but are **not blocking** this PR.

### 📝 Unused Variables

**Severity**: LOW | **Tool**: eslint | **Found in**: 1 file | **Category**: EXISTING_REST

Unused variable "tempData" in `src/utils/helpers.ts:45`

---

### 📝 Prefer Const

**Severity**: LOW | **Tool**: eslint | **Found in**: 1 file | **Category**: EXISTING_REST

Variable is never reassigned, prefer const in `src/services/auth.ts:78`

---

### 📝 Console Statements

**Severity**: LOW | **Tool**: eslint | **Found in**: 1 file | **Category**: EXISTING_REST

Unexpected console statement in `src/index.ts:12`

---

---

## Your Progress

**Level 4: Senior Developer** | **750 XP**

[███████████████░░░░░] 75% to next level

## 💼 Business Impact Analysis

### Executive Summary
⚠️ **Critical attention required:** 3 blocking issues must be resolved before deployment to avoid security vulnerabilities or system failures.

### Financial Impact
**🚀 CodeQual Value Proposition**

| Metric | Without CodeQual | With CodeQual |
|--------|------------------|---------------|
| **Fix Time** | 3.6 hours (~1 days) | **1 hours** (AI-assisted) |
| **Developer Cost** | $540 | **$150** |
| **Time Saved** | - | **72%** |
| **Fix Coverage** | 0% | **100%** (All 8 issues have fix suggestions) |

**Fix Availability by Type:**
- **Pattern Auto-Fix**: 3/8 issues (38%) - high-confidence, instant apply
- **AI-Assisted Fix**: 5/8 issues (63%) - review recommended

**How CodeQual Reduces Fix Time:**
- **PRO Tier**: 1-click apply for all 8 issues (~1 min review + apply)
- **BASIC Tier**: Export to IDE (LSP/SARIF) for semi-automated application
- **All Tiers**: Every issue includes AI-generated fix code

| Risk Metric | Value |
|-------------|-------|
| **Potential Exploit Cost** | $50,000 - $500,000 |
| **Risk Description** | Data breach costs, compliance fines (GDPR: €20M or 4% revenue), remediation, legal fees |
| **ROI** | **333x** (prevention cost vs exploit cost) |

> 💡 **Bottom Line**: CodeQual turns 1 days of manual work into ~1 hours of review + apply, saving **$390** per analysis.

### Risk Assessment
- **Immediate Risk:** 🔴 High
  - 3 blocking issues require attention before deployment
  - 2 critical issues need urgent resolution
  - 1 high-severity issues should be prioritized
  
- **Future Risk:** 🟡 Medium
  - Technical debt will compound if 5 backlog issues are not addressed
  - Code maintainability may decrease over time
  - Security vulnerabilities (3) pose ongoing risk

### Risk Matrix by Category
| Category | This PR | Pre-existing | Auto-fixable | Action Required |
|----------|---------|--------------|--------------|-----------------|
| **Security** | 3 | 0 | 3 | 🔴 Critical |
| **Performance** | 1 | 0 | 1 | 🟢 Low |
| **Architecture** | 0 | 0 | 0 | ⚪ None |
| **Dependencies** | 0 | 0 | 0 | ⚪ None |
| **Code Quality** | 1 | 3 | 1 | 🟢 Low |

**Legend:**
- **This PR:** Issues in files modified by this PR (NEW + EXISTING_MODIFIED)
- **Pre-existing:** Issues in files NOT touched by this PR (EXISTING_REST)
- **Auto-fixable:** Issues with available 1-click fixes
- **Action Required:** Priority based on severity of issues introduced/modified by this PR

### Recommendations

1. **Immediate Action:** Resolve 3 blocking issues before deployment
2. **Priority:** Address critical blockers first
3. **Planning:** Schedule time for 1 medium-severity issues in upcoming sprints
4. **Continuous Improvement:** Track and reduce 4 low-severity issues over time


**Note:** Each issue group section above includes detailed business impact analysis specific to that issue type.

---

### 🚀 PRO: Automated Fix Pipeline

| Stage | Items | Status | Time |
|-------|-------|--------|------|
| **Pattern Fixes** | 3 issues | ✅ Ready | ~2 sec |
| **AI Generation** | 5 issues | ✅ Ready | ~42 sec |

### 📊 Financial Dashboard

| Metric | This PR | This Month | YTD |
|--------|---------|------------|-----|
| **Time Saved** | 3.6 hrs | 10 hrs | — hrs |
| **Cost Saved** | $538 | $475 | $— |
| **Issues Fixed** | 8 | 38 | — |
| **ROI** | 100% | — | — |

### 🌟 Your Community Impact

Your fix patterns have helped **47 developers** across the community.
You've contributed **8 patterns** that accelerate fixes for everyone.

## 🏆 Achievements Unlocked!

**Total XP:** 750 | **Badges:** 3

| Tier | Count |
|------|-------|
| 🏆 Legendary | 0 |
| 💜 Epic | 1 |
| 💙 Rare | 1 |
| ⚪ Common | 1 |

### Recently Unlocked

#### ✨ Quality Champion 💙

*RARE — 15% of users*

PERFECT COMBO! 5 flawless reviews in a row. Unstoppable!

**+200 XP** | Unlocked: 1 weeks ago

---

#### 🛡️ Vulnerability Hunter 💜

*EPIC — 5% of users*

Master hunter! 50 vulnerabilities eliminated from the codebase.

**+500 XP** | Unlocked: 3 weeks ago

Progress: [██████████] 100%

---

#### 🛡️ First Blood ⚪

*COMMON — 50% of users*

First security bug slain! The journey of a thousand fixes begins with a single patch.

**+50 XP** | Unlocked: 10/14/2025

---


[View Trophy Case] | [Share Achievement] | [Leaderboard]

## 🌟 Your Community Impact

### Contribution Summary

You've contributed **8 patterns** that have been reused
**156 times** by **47 developers**,
saving the community **12.5 hours** of development time.

| Metric | Value |
|--------|-------|
| **Patterns Contributed** | 8 |
| **Times Reused** | 156 |
| **Developers Helped** | 47 |
| **Total Time Saved** | 12.5 hours |

### 🏆 Recognition

⭐ **Rank #12** contributor this month
📊 Top **15%** of all contributors

### Top Patterns

| Pattern | Language | Uses | Time Saved |
|---------|----------|------|------------|
| Express XSS Response Fix | typescript | 89 | 7.4 hrs |
| SQL Injection Parameterization | typescript | 45 | 3.8 hrs |

---

[View All Patterns] | [Enable Profile Sharing]
## 📚 Phased Educational Plan

### 📚 Phase 1: Blocker Issues Training (MUST FIX BEFORE MERGE)
**Quick Learning:** 30-60 min per issue type | **Deep Dive:** 1-2 weeks

**Javascript Express Security Audit Xss Direct Response Write Direct Response Write** (1 occurrence):
- [📚 Semgrep: direct-response-write](https://semgrep.dev/r/javascript.express.security.audit.xss-direct-response-write.direct-response-write)

**Javascript Express Security Sql Injection** (1 occurrence):
- [📚 Semgrep: sql-injection](https://semgrep.dev/r/javascript.express.security.sql-injection)

**Javascript Lang Security Detect Child Process** (1 occurrence):
- [📚 Semgrep: detect-child-process](https://semgrep.dev/r/javascript.lang.security.detect-child-process)
- [📋 Node.js Child Process](https://nodejs.org/api/child_process.html#child_process_security_considerations)

### 📚 Phase 2: Dedicated Training (Extended Learning)

**Required Time:** 2-4 weeks | **Format:** Self-paced courses and documentation

**Goal:** Address knowledge gaps identified by this analysis to prevent future issues.

**Security Fundamentals** (based on Security issues found):
- [🎓 PortSwigger Web Security Academy](https://portswigger.net/web-security) - Interactive hands-on labs
- [🛡️ OWASP Top 10](https://owasp.org/www-project-top-ten/) - Critical security risks
- [🔒 OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/) - Quick security reference
- [📖 CWE Top 25](https://cwe.mitre.org/top25/) - Most dangerous software weaknesses

> 💡 **Note**: Focus on the knowledge areas above to write better code and avoid similar issues in future PRs.

### 📚 Phase 3: Code Style & Formatting (Optional)

**5 style/formatting issues** can be addressed to improve code consistency.

| Tool | Issues | Reference |
|------|--------|----------|
| ESLint | 5 | [📚 ESLint Rules Reference](https://eslint.org/docs/rules/) |

> 💡 **Tip**: These are style issues with no runtime impact. Fix via IDE auto-format or linter `--fix` commands.
---

## 🚀 One-Click Auto-Fix

All 8 issues can be auto-fixed. Click below to apply fixes:

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

## 📈 Skills Growth Tracker

### Developer Skill Progress

> 📊 **Base Score:** 50/100 for new developers | Deductions for issues in your code

| Skill | Current | Trend | Next Milestone |
|-------|---------|-------|----------------|
| 🔒 Security | 37/100 | ↘️ -3 | Beginner (45) |
| ⚡ Performance | 49/100 | ↘️ -1 | Intermediate (60) |
| ✨ Code Quality | 50/100 | → 0 | Intermediate (60) |
| 🏗️ Architecture | 50/100 | → 0 | Intermediate (60) |
| 📦 Dependencies | 50/100 | → 0 | Intermediate (60) |

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

## 💬 PR Comment Template

Copy this to your PR comment:

```markdown
## 🔍 CodeQual Analysis

**Result:** ⚠️ CHANGES REQUESTED

### Summary
- **Total Issues:** 5
- **Blocking:** 3 (2 critical, 1 high)
- **Quality Score:** 87/100 (Grade B)

### Critical Issues
1. ⛔ SQL Injection in `src/db/queries.ts:123`
2. ⛔ Command Injection in `src/utils/shell.ts:67`

### High Priority
1. 🟠 XSS Vulnerability in `src/routes/api.ts:45`

### Recommendations
- Fix blocking issues before merge
- Review security practices for user input handling
- Consider using parameterized queries consistently

---
*Analyzed by CodeQual V9 • [View Full Report](link)*
```

---

---

*Report generated by CodeQual V9 PRO • [Profile](/profile) • [Leaderboard](/leaderboard) • [Settings](/settings)*
