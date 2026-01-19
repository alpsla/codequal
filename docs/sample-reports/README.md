# Sample Reports - BASIC vs PRO Tiers

**Session:** 109
**Date:** January 19, 2026
**Purpose:** Document BASIC and PRO tier report differences for UI development

---

## Report Tiers Overview

| Feature | BASIC Tier | PRO Tier |
|---------|------------|----------|
| **Price** | Free | $X/month |
| **Analysis** | Full detection | Full detection |
| **Fixes** | NO auto-fix | THREE-TIER FIX CASCADE |
| **Issues Shown** | ALL issues | REMAINING (unfixed) only |
| **Score Display** | Current score | BEFORE → AFTER comparison |
| **Educational** | All categories | Remaining issues only |
| **IDE Integration** | SARIF/LSP (view only) | SARIF/LSP + apply fixes |
| **Time Savings** | 0% | 47-60% auto-fixed |

---

## BASIC Tier Report

**File:** `BASIC_TIER_REPORT.md`
**Source:** `alpsla/codequal` PR #69 (November 20, 2025)

### What BASIC Includes

1. **Header Section**
   - Repository info, PR details, author
   - Analysis date and duration
   - Current quality score and grade

2. **Quality Score**
   - Overall score (0-100)
   - Category breakdown (Security, Performance, Architecture, Dependencies, Code Quality)
   - APP Score (MIN of categories)
   - Skill Score (AVG of categories)

3. **Issue Summary**
   - Total issues with categorization (NEW/RESOLVED/EXISTING)
   - Severity breakdown (Critical/High/Medium/Low)
   - Blocking issues count

4. **ALL Issues Listed**
   - Full details for every detected issue
   - Educational explanations (what/why/causes/impact)
   - Manual fix suggestions (no auto-fix)

5. **Educational Content**
   - Phased learning plan for ALL issue categories
   - Curated resources (OWASP, SEI CERT, etc.)

6. **Skills Tracking**
   - Developer score comparison
   - Team rankings
   - Basic trend (last 2 PRs)

7. **Export Files**
   - SARIF (read-only diagnostics)
   - LSP actions (view issues, no apply)

---

## PRO Tier Report

**File:** `PRO_TIER_REPORT.md` (Not yet generated - requires Oracle Cloud fix)
**Status:** Template based on codebase analysis

### What PRO Adds

1. **BEFORE → AFTER Score Comparison**
   ```
   ┌─────────────────────────────────────────┐
   │  QUALITY SCORE IMPROVEMENT              │
   ├─────────────────────────────────────────┤
   │  BEFORE: 45/100 (Grade: D)              │
   │  AFTER:  78/100 (Grade: B)              │
   │  IMPROVEMENT: +33 points (+73%)         │
   └─────────────────────────────────────────┘
   ```

2. **Fix Summary Section** (NEW)
   ```markdown
   ## Fix Summary

   ### Overview
   - Total Issues Detected: 230
   - Successfully Fixed: 108 (47%)
   - Requires Review: 5 (2%)
   - Remaining: 117 (51%)

   ### Fixes by Tier
   | Tier | Count | Cost | Time |
   |------|-------|------|------|
   | Tier 1 (Native --fix) | 85 | $0.00 | 2.3s |
   | Tier 2 (Dedicated) | 12 | $0.00 | 4.1s |
   | Tier 3 (AI) | 11 | $0.11 | 18.2s |

   ### Fixes by Rule (Grouped)
   | Rule | Fixed | Tool | Files |
   |------|-------|------|-------|
   | @typescript-eslint/no-unused-vars | 45 | ESLint | 23 |
   | prettier/prettier | 32 | Prettier | 18 |
   | no-explicit-any | 8 | ESLint | 5 |
   ```

3. **Remaining Issues Only**
   - Shows ONLY issues that couldn't be auto-fixed
   - Focused on what author needs to address manually
   - Reduces noise from 230 → 117 issues

4. **Business Impact - Time/Cost SAVED**
   ```markdown
   ### Cost Savings
   | Metric | Value |
   |--------|-------|
   | Issues Auto-Fixed | 108 |
   | Estimated Manual Time | 5.4 hours |
   | Time Saved | 5.4 hours × $150/hr = $810 |
   | CodeQual Cost | $0.11 |
   | NET SAVINGS | $809.89 |
   ```

5. **Commit Information** (NEW)
   ```markdown
   ## Applied Fixes

   **Branch:** `codequal/auto-fixes-pr69`
   **Commit:** `a1b2c3d`
   **Files Modified:** 45

   ### Changed Files
   - src/components/Button.tsx (+15 -8)
   - src/utils/helpers.ts (+3 -12)
   ...
   ```

6. **Educational - Remaining Only**
   - Learning resources only for UNFIXED issues
   - Focused training path

7. **Community Impact** (NEW)
   ```markdown
   ## Community Impact

   Your PR contributed **3 new patterns** to the CodeQual knowledge base!

   | Pattern | Reuses | Developers Helped |
   |---------|--------|-------------------|
   | TS6133 fix | 47 | 23 |
   | react-hooks/exhaustive-deps | 31 | 18 |
   ```

---

## How to Generate Reports

### BASIC Tier (Analysis Only)
```bash
cd packages/agents
npx ts-node tests/integration/test-v9-lite-e2e.ts \
  --repo "owner/repo" \
  --pr 123 \
  --tier basic
```

### PRO Tier (With Fixes)
```bash
# Requires Oracle Cloud infrastructure
cd packages/agents
bash scripts/testing/oracle/oracle-run-v9-e2e-complete.sh \
  --repo "owner/repo" \
  --pr 123 \
  --tier pro \
  --apply-fixes
```

### Current Blockers for PRO Report Generation
1. **Docker Registry Auth** - Oracle Cloud needs DigitalOcean registry credentials
2. **Container Services** - Java/Python/TypeScript analyzer containers not running
3. **Fix Cascade** - Requires all three tiers (native → dedicated → AI) operational

---

## Data Structure Differences

### BASIC Tier JSON Structure
```typescript
interface BasicTierReport {
  header: ReportHeader;
  qualityScore: QualityScore;
  decision: 'APPROVED' | 'DECLINED';
  issueSummary: IssueSummary;
  allIssues: Issue[];           // ALL detected issues
  businessImpact: BusinessImpact;
  educational: {
    allCategories: EducationalResource[];  // For ALL issue types
  };
  skillsTracking: SkillScore;
  metadata: AnalysisMetadata;
  exports: {
    sarif: string;              // View-only
    lsp: string;                // View-only
  };
}
```

### PRO Tier JSON Structure
```typescript
interface ProTierReport {
  header: ReportHeader & {
    beforeScore: number;
    afterScore: number;
    improvement: number;
  };
  qualityScore: QualityScore;
  decision: 'APPROVED' | 'DECLINED';

  // NEW: Fix summary section
  fixSummary: {
    overview: FixOverview;
    byTier: TierBreakdown[];
    byRule: RuleFixSummary[];
    successRate: number;
  };

  remainingIssues: Issue[];     // Only UNFIXED issues

  businessImpact: BusinessImpact & {
    timeSaved: string;
    costSaved: number;
    netSavings: number;
  };

  educational: {
    remainingOnly: EducationalResource[];  // Only for unfixed
  };

  // NEW: Commit information
  commitInfo: {
    branch: string;
    commitSha: string;
    filesModified: number;
    changedFiles: FileChange[];
  };

  // NEW: Community impact
  communityImpact: {
    patternsContributed: number;
    totalReuses: number;
    developersHelped: number;
  };

  skillsTracking: SkillScore;
  metadata: AnalysisMetadata;
  exports: {
    sarif: string;              // With fix actions
    lsp: string;                // With apply capability
  };
}
```

---

## Next Steps

1. **Session 110**: Fix Oracle Cloud Docker registry authentication
2. **Session 111**: Generate live PRO tier report with fixes
3. **Session 112**: Fill V9 data gaps identified in gap report
4. **Session 113**: Build Report UI components

---

*Generated by Rex Session 109*
*January 19, 2026*
