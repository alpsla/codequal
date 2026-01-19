# V9 Data Gap Report

**Session:** 109
**Date:** January 19, 2026
**Audited Report:** `test-outputs/v9-codequal-pr69-FINAL.md`
**Purpose:** Identify data gaps for Report UI development

---

## Summary

| Metric | Value |
|--------|-------|
| **Total Required Fields** | 58 |
| **Fields Present** | 45 |
| **Fields Missing** | 13 |
| **Coverage** | 78% |

---

## P0 - Blocks UI Development (Critical)

These fields are **required** for core UI functionality.

| Field | Section | Current State | Action Required |
|-------|---------|---------------|-----------------|
| `progressHistory.history[]` | Quality Scores | Only "last 2 PRs" text, no array data | Add array of last N PR scores with timestamps |
| `progressHistory.chartData` | Quality Scores | Not present | Generate time-series data for score chart |
| `tier` (BASIC/PRO) | Header | Not present | Add tier field to distinguish report types |
| `fixSummary.successfullyFixed[]` | Fix Details (PRO) | Not present | Add array of successful fixes grouped by rule |
| `fixSummary.requiresReview[]` | Fix Details (PRO) | Not present | Add array of fixes requiring human review |
| `commitInfo` | Fix Details (PRO) | Not present | Add branch name, commit SHA, files modified |

---

## P1 - Important for Full Experience

These fields enhance the user experience significantly.

| Field | Section | Current State | Action Required |
|-------|---------|---------------|-----------------|
| `gamification.xp.earned` | Gamification | Not present | Calculate XP earned for this PR |
| `gamification.xp.total` | Gamification | Not present | Track cumulative XP |
| `gamification.xp.toNextLevel` | Gamification | Not present | Calculate XP needed for next level |
| `gamification.badges[]` | Gamification | Not present | Add unlocked/locked badges array |
| `gamification.prContribution` | Gamification | Not present | Add per-PR stats (issues fixed, skills improved) |
| `unfixedIssue.authorAction.steps[]` | Unfixed Issues | Prose only | Add structured action steps array |
| `unfixedIssue.estimatedEffort` | Unfixed Issues | Not present | Add effort estimation (trivial/minor/moderate/significant) |
| `issue.blocksMerge` | Issue Details | Implicit via category | Add explicit boolean field |
| `trend.previousScore` | Quality Scores | Direction only | Add numerical previous score |
| `trend.changePercent` | Quality Scores | Not calculated | Add percentage change |

---

## P2 - Nice to Have

These fields provide polish but aren't blocking.

| Field | Section | Current State | Action Required |
|-------|---------|---------------|-----------------|
| `user.rank` | Gamification | Generic "Ranking #X" | Add title like "Security Champion" |
| `user.level` | Gamification | Not present | Calculate level from XP |
| `communityImpact.patternsContributed` | BASIC Features | Not tracked | Add opt-in pattern sharing for BASIC tier |
| `communityImpact.developersHelped` | BASIC Features | Not tracked | Show potential impact to encourage sharing |

---

## Fields Present (Verified)

### Quality Scores Section ✅

| Field | Status | Location in Report |
|-------|--------|-------------------|
| `overall` | ✅ Present | "0.0/100 (Grade: F)" |
| `grade` | ✅ Present | "Grade: F" |
| `security` | ✅ Present | "Security: 0/100" |
| `performance` | ✅ Present | "Performance: 100/100" |
| `architecture` | ✅ Present | "Architecture: 100/100" |
| `dependency` | ✅ Present | "Dependencies: 95/100" |
| `codeQuality` | ✅ Present | "Code Quality: 91/100" |
| `appScore` | ✅ Present | "APP Score: 0/100" |
| `skillScore` | ✅ Present | "Skill Score: 46/100" |
| `trend.direction` | ✅ Present | "Declining" |

### Issue Summary Section ✅

| Field | Status | Location |
|-------|--------|----------|
| `total` | ✅ Present | "Total Issues: 230" |
| `new` | ✅ Present | "NEW: 6" |
| `existingModified` | ✅ Present | "EXISTING_MODIFIED: 0" |
| `resolved` | ✅ Present | "RESOLVED: 0" |
| `existingRest` | ✅ Present | "EXISTING_REST: 224" |
| `bySeverity` | ✅ Present | Critical/High/Medium/Low breakdown |
| `byCategory` | ✅ Present | Security/Performance/etc table |
| `blocking` | ✅ Present | "6 blocking issues" |
| `autoFixed` | ✅ Present | "227 issues auto-fixable" |

### Issue Details Section ✅

| Field | Status | Notes |
|-------|--------|-------|
| `id` | ✅ Implicit | Via rule + file + line |
| `ruleId` | ✅ Present | "javascript.lang.security.detect-child-process" |
| `tool` | ✅ Present | "semgrep" |
| `file` | ✅ Present | Full path |
| `line` | ✅ Present | Line number |
| `column` | ⚠️ Sometimes | Not always present |
| `message` | ✅ Present | Full description |
| `severity` | ✅ Present | critical/high/medium/low |
| `category` | ✅ Present | NEW/EXISTING_MODIFIED/etc |
| `detectedCategory` | ✅ Present | Security/Performance/etc |
| `codeSnippet` | ✅ Present | Code blocks with context |
| `hasFix` | ✅ Present | Via "Auto-fixable" note |
| `suggestedFix` | ✅ Present | "Recommended Code" section |

### Fix Details Section ✅

| Field | Status | Notes |
|-------|--------|-------|
| `fix` | ✅ Present | Fix description |
| `correctedCode` | ✅ Present | "Recommended Code" block |
| `explanation` | ✅ Present | "How to Fix" section |
| `bestPractices` | ✅ Present | Bullet list |
| `issueDescription` | ✅ Present | what/why/causes/impact |
| `originalCode` | ✅ Present | Code snippet before |
| `diff` | ⚠️ Not present | Could be generated |
| `tier` | ❌ Not present | tier1/tier2/tier3 |
| `confidence` | ⚠️ Partial | Not numerical |

### Educational Content Section ✅

| Field | Status | Notes |
|-------|--------|-------|
| `phasedPlan` | ✅ Present | Phase 1/1.5/2 structure |
| `learningPaths` | ✅ Present | Google search links |
| `curatedResources` | ✅ Present | SEI CERT, OWASP, etc |
| `perIssueExplanation` | ✅ Present | What/Why/Causes/Impact |

### Export Metadata Section ✅

| Field | Status | Notes |
|-------|--------|-------|
| `sarif` | ✅ Present | Download link provided |
| `lsp` | ✅ Present | LSP actions file |
| `gitlabCodeQuality` | ⚠️ Mentioned | Not in this report |
| `analysisId` | ✅ Implicit | In URLs |
| `repositoryUrl` | ✅ Present | Header section |
| `prNumber` | ✅ Present | "#69" |
| `baseBranch` | ✅ Present | "main" |
| `prBranch` | ✅ Present | "pr-69" |
| `analyzedAt` | ✅ Present | Timestamp in footer |
| `duration` | ✅ Present | "1m 30s" |
| `cost` | ✅ Present | "$0.0000" |

---

## BASIC vs PRO Tier Data Requirements

### BASIC Tier Report (Current State)
- ✅ All issues with full detail
- ✅ Educational content for ALL categories
- ✅ Basic skill tracking
- ❌ Missing: Progress history chart data

### PRO Tier Report (Additional Requirements)
- ❌ Missing: BEFORE → AFTER score comparison
- ❌ Missing: Fix summary (grouped by rule)
- ❌ Missing: Fixes requiring review flagged
- ❌ Missing: Remaining issues (only unfixed)
- ❌ Missing: Time/cost SAVED calculation
- ❌ Missing: Commit info (branch, SHA, files)
- ❌ Missing: Community impact metrics

---

## Action Items

### Phase 1: P0 Blockers (Session 112)
1. [ ] Add `progressHistory.history[]` array to V9 output
2. [ ] Add `tier` field to report metadata
3. [ ] Create PRO-specific report generator with fix summary
4. [ ] Add `commitInfo` section for PRO tier

### Phase 2: P1 Enhancements (Session 113)
1. [ ] Implement XP calculation system
2. [ ] Create badges/achievements system
3. [ ] Add structured `authorAction.steps[]` for unfixed issues
4. [ ] Add `estimatedEffort` classification
5. [ ] Calculate and display `trend.changePercent`

### Phase 3: P2 Polish (Session 114)
1. [ ] Add user rank titles ("Security Champion", etc)
2. [ ] Implement level system
3. [ ] Track community impact metrics

---

## Technical Notes

### Progress History Implementation
```typescript
interface ProgressHistory {
  isFirstTimeUser: boolean;
  history: {
    prNumber: number;
    score: number;
    grade: string;
    analyzedAt: string;
  }[];
  displayCount: number; // Default 5
  trend: {
    direction: 'improving' | 'declining' | 'stable';
    previousScore: number;
    changePercent: number;
  };
}
```

### Fix Summary Implementation (PRO)
```typescript
interface FixSummary {
  overview: {
    totalAttempted: number;
    totalSuccessful: number;
    totalRequiringReview: number;
    totalRolledBack: number;
    successRate: number;
  };
  successfullyFixed: {
    total: number;
    byRule: {
      ruleId: string;
      count: number;
      tier: 'tier1_native' | 'tier2_dedicated' | 'tier3_ai';
      files: string[];
    }[];
  };
  requiresReview: {
    highPriority: Issue[]; // Security/Deps/Perf
    lowConfidence: Issue[]; // < threshold
  };
}
```

---

## Source Files Audited

| File | Purpose |
|------|---------|
| `packages/agents/src/two-branch/services/v9-pr-analyzer.ts` | Main analyzer |
| `packages/agents/src/two-branch/analyzers/v9-types.ts` | Type definitions |
| `packages/agents/src/two-branch/analyzers/v9-grouped-report-formatter.ts` | Report generation |
| `packages/agents/src/two-branch/report/score-calculator.ts` | Score calculation |
| `packages/agents/src/two-branch/report/achievements.ts` | Achievements (partial) |
| `packages/agents/test-outputs/v9-codequal-pr69-FINAL.md` | Sample report |

---

*Generated by Rex Session 109 - V9 Data Audit*
*January 19, 2026*
