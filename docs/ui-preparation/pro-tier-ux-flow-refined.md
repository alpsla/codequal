# PRO Tier UX Flow - Refined Design

*Created: December 23, 2025*
*Updated: December 23, 2025 - Incorporated user feedback*

---

## ✅ Confirmed Design Decisions

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| **Fixed Issues Display** | Grouped by rule, collapsible | Not overwhelming, details on demand |
| **Score Display** | Progress chart over time | Shows improvement trajectory |
| **First-Time Users** | Simplified view (no history) | Can't show what doesn't exist |
| **Output Options** | Configurable with defaults | User control, sensible defaults |
| **Default Commit** | Single commit | Simple, can be changed |
| **Report Structure** | Single unified report | Analysis + fixes in one place |
| **Review Highlights** | Low confidence + Security/Deps/Perf | User knows what needs attention |

---

## 📊 Progress Tracking Design

### For Returning Users (Has History)

```
┌─────────────────────────────────────────────────────────────────┐
│  📈 YOUR QUALITY PROGRESS                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Score: 85/100 (Grade: B)                                       │
│         ↑ +15 from last analysis                                │
│                                                                 │
│  100 ┤                                            ●━━● 85      │
│   90 ┤                                    ●━━━━━━●             │
│   80 ┤                            ●━━━━━━●                      │
│   70 ┤                    ●━━━━━━●        ← Last: 70            │
│   60 ┤            ●━━━━━━●                                      │
│   50 ┤    ●━━━━━━●                                              │
│   40 ┤━━━●                                                      │
│      └────┴────┴────┴────┴────┴────┴────┴────┴────┴────┴────   │
│        PR   PR   PR   PR   PR   PR   PR   PR   PR   PR   Now   │
│        #60  #61  #62  #63  #64  #65  #66  #67  #68  #69        │
│                                                                 │
│  Trend: ↗️ Improving (+45 points over 10 PRs)                   │
│  Best Score: 85 (this PR)                                       │
│  Average: 67                                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### For First-Time Users (No History)

```
┌─────────────────────────────────────────────────────────────────┐
│  📊 YOUR FIRST ANALYSIS                                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │              🎯 Starting Score: 45/100                  │    │
│  │                    (Grade: D)                           │    │
│  │                                                         │    │
│  │     ┌──────────────────────────────────────────────┐    │    │
│  │     │████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░│    │    │
│  │     └──────────────────────────────────────────────┘    │    │
│  │              45%                                        │    │
│  │                                                         │    │
│  │  This is your baseline. Future analyses will show       │    │
│  │  your improvement trend over time.                      │    │
│  │                                                         │    │
│  │  📈 Track progress across your next PRs                 │    │
│  │  🎯 Set a goal: reach 80+ for "Good" rating             │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### After PRO Fixes Applied (With Before/After)

```
┌─────────────────────────────────────────────────────────────────┐
│  📈 QUALITY IMPROVEMENT                                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  This Analysis:                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │   BEFORE          AFTER           CHANGE                │    │
│  │   ┌─────┐        ┌─────┐                                │    │
│  │   │     │        │█████│                                │    │
│  │   │     │   ──▶  │█████│         +65 points             │    │
│  │   │░░░░░│        │█████│         ↑ F → A                │    │
│  │   │░░░░░│        │█████│                                │    │
│  │   └─────┘        └─────┘                                │    │
│  │    20/100         85/100                                │    │
│  │   (Grade: F)     (Grade: B)                             │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  Historical Trend (last 5 PRs):                                 │
│  PR #65: 55 → PR #66: 60 → PR #67: 65 → PR #68: 70 → Now: 85   │
│  ───────────────────────────────────────●━━━━━━━━━━━━━━━━━━●    │
│                                        Before    After          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📋 Fixed Issues Display (Grouped by Rule)

### Collapsed View (Default)

```
┌─────────────────────────────────────────────────────────────────┐
│  ✅ SUCCESSFULLY FIXED ISSUES (210)                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  By Category:                                                   │
│  ├─ 🔒 Security: 45 issues fixed                               │
│  ├─ 📝 Code Quality: 120 issues fixed                          │
│  ├─ 📦 Dependencies: 25 issues fixed                           │
│  └─ ⚡ Performance: 20 issues fixed                            │
│                                                                 │
│  ▼ eslint/no-unused-vars                           35 fixed    │
│  ▼ prettier/format                                 30 fixed    │
│  ▼ security/sql-injection                          12 fixed    │
│  ▼ typescript/no-explicit-any                      18 fixed    │
│  ▼ react/exhaustive-deps                           15 fixed    │
│  ... and 12 more rules                            100 fixed    │
│                                                                 │
│  [Expand All] [Collapse All]                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Expanded Rule View (On Click)

```
┌─────────────────────────────────────────────────────────────────┐
│  ▲ security/sql-injection                          12 fixed    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Tier: Cloud API (Corgea)                                       │
│  Confidence: 85%                                                │
│  Verification: ✅ All 12 passed                                 │
│                                                                 │
│  Files affected:                                                │
│  ├─ src/db/queries.ts (4 occurrences)                          │
│  │   └─ Lines: 45, 78, 120, 156                                │
│  ├─ src/api/users.ts (3 occurrences)                           │
│  │   └─ Lines: 23, 89, 134                                     │
│  ├─ src/api/products.ts (3 occurrences)                        │
│  │   └─ Lines: 56, 112, 178                                    │
│  └─ src/utils/search.ts (2 occurrences)                        │
│      └─ Lines: 34, 67                                          │
│                                                                 │
│  [View Code Changes] [View Explanation]                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Deep Dive View (Code Changes)

```
┌─────────────────────────────────────────────────────────────────┐
│  security/sql-injection → src/db/queries.ts:45                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  BEFORE:                                                        │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 44│                                                     │    │
│  │ 45│ const query = `SELECT * FROM users WHERE id = ${id}`;│   │
│  │ 46│ return db.execute(query);                           │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  AFTER:                                                         │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 44│                                                     │    │
│  │ 45│ const query = 'SELECT * FROM users WHERE id = $1';  │    │
│  │ 46│ return db.execute(query, [id]);                     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  Why this fix:                                                  │
│  Parameterized queries prevent SQL injection by treating        │
│  user input as data, not executable SQL code.                   │
│                                                                 │
│  [← Previous] [Next →] (3 of 12)                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## ⚠️ Review Required Section (NEW)

This is a critical UX element - highlighting what the user MUST review:

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚠️ REQUIRES YOUR REVIEW (38 items)                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  These items need manual verification before merging:           │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 🔴 HIGH PRIORITY - Security/Dependencies/Performance     │    │
│  │    Review these even if confidence is high               │    │
│  ├─────────────────────────────────────────────────────────┤    │
│  │                                                         │    │
│  │ 🔒 security/command-injection         Fixed (75%)  ⚠️   │    │
│  │    src/utils/exec.ts:34                                 │    │
│  │    [Review Fix] [View Code]                             │    │
│  │                                                         │    │
│  │ 📦 dependency/critical-cve            Fixed (80%)  ⚠️   │    │
│  │    package.json (lodash upgrade)                        │    │
│  │    [Review Fix] [View Code]                             │    │
│  │                                                         │    │
│  │ ⚡ performance/n-plus-one             Fixed (70%)  ⚠️   │    │
│  │    src/api/posts.ts:89                                  │    │
│  │    [Review Fix] [View Code]                             │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 🟡 LOW CONFIDENCE FIXES (<80%)                          │    │
│  │    AI-generated fixes that may need adjustment          │    │
│  ├─────────────────────────────────────────────────────────┤    │
│  │                                                         │    │
│  │ 📝 complexity/cognitive-load          Fixed (65%)  ⚠️   │    │
│  │    src/components/Dashboard.tsx:120                     │    │
│  │    [Review Fix] [View Code]                             │    │
│  │                                                         │    │
│  │ 📝 architecture/god-class             Fixed (60%)  ⚠️   │    │
│  │    src/services/UserService.ts:1                        │    │
│  │    [Review Fix] [View Code]                             │    │
│  │                                                         │    │
│  │ ... and 33 more low-confidence fixes                    │    │
│  │ [Show All Low Confidence]                               │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 🔄 ROLLED BACK (Failed Verification)                    │    │
│  │    These fixes were attempted but caused regressions    │    │
│  ├─────────────────────────────────────────────────────────┤    │
│  │                                                         │    │
│  │ ❌ eslint/prefer-const               Rolled Back        │    │
│  │    src/utils/state.ts:45                                │    │
│  │    Reason: Created type error                           │    │
│  │    [View Attempted Fix] [Manual Fix Guide]              │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  📊 Review Summary:                                             │
│  • High Priority (Security/Deps/Perf): 3 items                  │
│  • Low Confidence (<80%): 33 items                              │
│  • Rolled Back: 2 items                                         │
│                                                                 │
│  [Mark All as Reviewed] [Export Review List]                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## ⚙️ Output Configuration (User Preferences)

### Default Settings Screen

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚙️ FIX OUTPUT PREFERENCES                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  How should CodeQual deliver your fixes?                        │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ DEFAULT OUTPUT METHOD                                   │    │
│  ├─────────────────────────────────────────────────────────┤    │
│  │                                                         │    │
│  │ ● Commit to Current Branch          [DEFAULT]           │    │
│  │   Adds fixes directly to your PR                        │    │
│  │                                                         │    │
│  │ ○ Create New Branch                                     │    │
│  │   codequal/fixes-pr-{number}                            │    │
│  │                                                         │    │
│  │ ○ Create Pull Request                                   │    │
│  │   Opens PR with fix changes                             │    │
│  │                                                         │    │
│  │ ○ Download Patch Only                                   │    │
│  │   No git operations, just download                      │    │
│  │                                                         │    │
│  │ ○ Always Ask                                            │    │
│  │   Show selection each time                              │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ COMMIT PREFERENCES                                      │    │
│  ├─────────────────────────────────────────────────────────┤    │
│  │                                                         │    │
│  │ Commit Style:                                           │    │
│  │ ● Single commit (all fixes together)       [DEFAULT]    │    │
│  │ ○ Grouped by category (security, quality, etc.)         │    │
│  │ ○ Grouped by tier (native, AI, etc.)                    │    │
│  │ ○ One commit per rule                                   │    │
│  │                                                         │    │
│  │ Commit Message Template:                                │    │
│  │ ┌─────────────────────────────────────────────────┐     │    │
│  │ │ fix: CodeQual auto-fixes ({count} issues)       │     │    │
│  │ │                                                 │     │    │
│  │ │ {summary}                                       │     │    │
│  │ │                                                 │     │    │
│  │ │ Report: {report_url}                            │     │    │
│  │ └─────────────────────────────────────────────────┘     │    │
│  │ Variables: {count}, {summary}, {report_url}, {pr_num}   │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ AUTO-APPLY PREFERENCES                                  │    │
│  ├─────────────────────────────────────────────────────────┤    │
│  │                                                         │    │
│  │ Default Fix Scope:                                      │    │
│  │ ○ Safe Only (Tier 1+2, 95%+ confidence)                 │    │
│  │ ● Recommended (includes patterns)          [DEFAULT]    │    │
│  │ ○ Maximum (includes AI-generated)                       │    │
│  │ ○ Custom (show selection each time)                     │    │
│  │                                                         │    │
│  │ Auto-apply without confirmation:                        │    │
│  │ □ Safe fixes (95%+ confidence)                          │    │
│  │ □ Pattern-matched fixes (from library)                  │    │
│  │ ☑ Never auto-apply (always show preview)   [DEFAULT]    │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ REVIEW REQUIREMENTS                                     │    │
│  ├─────────────────────────────────────────────────────────┤    │
│  │                                                         │    │
│  │ Always flag for review:                                 │    │
│  │ ☑ Security-related fixes                    [DEFAULT]   │    │
│  │ ☑ Dependency updates                        [DEFAULT]   │    │
│  │ ☑ Performance-related fixes                 [DEFAULT]   │    │
│  │ ☑ Low confidence fixes (<80%)               [DEFAULT]   │    │
│  │ □ All AI-generated fixes                                │    │
│  │ □ Fixes touching test files                             │    │
│  │                                                         │    │
│  │ Confidence threshold for "low confidence":              │    │
│  │ [====●=====] 80%                                        │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  [Reset to Defaults] [Save Preferences]                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📄 Unified Report Structure (Single Report)

Based on your decision for a single unified report:

```
UNIFIED REPORT STRUCTURE (PRO)
══════════════════════════════

┌─────────────────────────────────────────────────────────────────┐
│ 1. HEADER & SCORE                                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ • Quality Score (Before → After for PRO)                        │
│ • Progress Chart (returning users) or Baseline (first-time)     │
│ • Decision: APPROVED/DECLINED                                   │
│ • Quick Stats: Found X, Fixed Y, Remaining Z                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 2. FIX SUMMARY (PRO)                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ • ✅ Successfully Fixed (grouped by rule, collapsible)          │
│ • ⚠️ Requires Your Review (security/deps/perf + low confidence) │
│ • 🔄 Rolled Back (attempted but failed)                         │
│ • ❌ Cannot Auto-Fix (requires manual action)                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 3. REMAINING ISSUES (Unfixed)                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ • Critical Blockers (full detail)                               │
│ • High Priority (full detail)                                   │
│ • Medium/Low Priority (grouped, collapsible)                    │
│ • Why couldn't we fix? (explanation per issue)                  │
│ • Manual fix guidance                                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 4. BUSINESS IMPACT                                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ • Time Saved: X hours                                           │
│ • Cost Saved: $Y                                                │
│ • Risk Reduction: Z critical issues eliminated                  │
│ • Remaining Effort: W hours for manual items                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 5. EDUCATIONAL (For Remaining Issues Only)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ • Learning paths for unfixed categories                         │
│ • No training shown for fixed issues (already resolved!)        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 6. TRACKING & ACHIEVEMENTS                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ • Skills Progress (with improvement from this PR)               │
│ • XP Earned (analysis + fixes + verified)                       │
│ • Achievements Unlocked                                         │
│ • Community Impact (patterns contributed)                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 7. COMMIT/BRANCH INFO (PRO)                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ • Branch name                                                   │
│ • Commit SHA                                                    │
│ • Files modified                                                │
│ • Link to PR/branch                                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 8. METADATA & TOOLS                                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ • Analysis duration                                             │
│ • Tools used                                                    │
│ • Cost breakdown                                                │
│ • Export options                                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key UX Principles Confirmed

1. **Progressive Disclosure**
   - Default: Summary view (grouped by rule)
   - On demand: Full details (code changes)
   - Never overwhelming

2. **Review Prioritization**
   - Security/Dependencies/Performance ALWAYS flagged
   - Low confidence (<80%) ALWAYS flagged
   - User can configure threshold

3. **Progress Tracking**
   - Returning users: Historical chart
   - First-time users: Baseline establishment
   - Always show improvement after fixes

4. **User Control**
   - Configurable defaults
   - Always can override per-analysis
   - Save preferences for future

5. **Single Unified Report**
   - Analysis + fixes combined
   - No need to navigate between reports
   - Clear sections for different concerns

---

## 🔜 Next Steps

With these decisions confirmed, we can now design:

1. **Visual Components**
   - Progress chart (line/area chart)
   - Score gauge (before/after)
   - Collapsible rule groups
   - Review priority badges

2. **Interactive Elements**
   - Expand/collapse animations
   - Code diff viewer
   - Configuration panel
   - Review checklist

3. **Data Flow**
   - How history is fetched
   - How preferences are saved
   - How report is generated

Which area should we tackle first?
