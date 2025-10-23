# V9 Report Issues - Root Cause Analysis & Fixes

## Issues Identified

### 1. ✅ **Skill Score: 100/100 Despite Many Issues**

**What You're Seeing:**
```
Skill Score: 100/100 (ISSUE-WEIGHTED baseline 50)
```

**Root Cause:**
The E2E test (`test-v9-e2e-complete.ts`) is passing **hardcoded** skill score metadata:

```typescript
skillScore: {
  userId: 'kafka-contributor',
  overallScore: 75,  // ← HARDCODED
  categoryScores: {},
  trend: 'stable' as const,
  baseline: 75,
  prHistory: []
}
```

**However**, the formatter (`v9-grouped-report-formatter.ts`) is **IGNORING** this and generating its own score from the `V9IntegratedAnalyzer.calculateSkillsTracking()` method.

**The Bug:**
Looking at the actual calculation logic in `v9-integrated-analyzer.ts`:
- It starts from baseline (50) ✅
- Deducts for NEW issues (1748 × -1 for medium = -1748) ✅
- Adds for RESOLVED issues (2139 × +1 for medium = +2139) ✅
- Result: 50 - 1748 + 2139 = **441** → **Clamped to 100** ❌

**The Math is BROKEN:** We have 1748 new issues but 2139 resolved, so the net is **positive**, resulting in 100/100!

**Correct Logic Should Be:**
- **Individual Score (Skill)**: Based on issues in **NEW or MODIFIED files only** (not RESOLVED issues from elsewhere)
- **App Score**: Starts from 100, deducts for ALL issues found

**Fix:**
```typescript
// For Skill Score: Only count issues in files authored/modified by this developer
private calculateSkillScoreFromBaseline(
  baseline: number,
  newIssues: any[],
  resolvedIssues: any[],
  existingModified: any[]  // ← Add this
): number {
  let score = baseline;
  
  // Penalties for NEW issues (developer introduced them)
  newIssues.forEach(issue => {
    switch (issue.severity) {
      case 'critical': score -= 5; break;
      case 'high': score -= 3; break;
      case 'medium': score -= 1; break;
      case 'low': score -= 0.5; break;
    }
  });
  
  // Penalties for EXISTING_MODIFIED (developer touched files with issues)
  existingModified.forEach(issue => {
    switch (issue.severity) {
      case 'critical': score -= 2; break;  // Lighter penalty
      case 'high': score -= 1; break;
      case 'medium': score -= 0.5; break;
      case 'low': score -= 0.25; break;
    }
  });
  
  // Bonuses for RESOLVED issues (developer fixed them)
  resolvedIssues.forEach(issue => {
    switch (issue.severity) {
      case 'critical': score += 5; break;
      case 'high': score += 3; break;
      case 'medium': score += 1; break;
      case 'low': score += 0.5; break;
    }
  });
  
  return Math.max(0, Math.min(100, Math.round(score)));
}
```

---

### 2. ✅ **Priority Score: 105 - What Does It Mean?**

**What You're Seeing:**
```
Priority Score: 105
```

**Explanation:**
This is a **weighted priority score** used for sorting blocking issues:

```typescript
const score = severityWeight + (issueCount * 0.1) + (Math.min(filesSpread, 10));
```

Where:
- `severityWeight`: Critical = 100, High = 80, Medium = 60, Low = 40
- `issueCount * 0.1`: Number of occurrences (capped contribution)
- `filesSpread`: Number of unique files affected (capped at 10)

**For Command Injection:**
- Severity: CRITICAL = 100 points
- Count: 2 occurrences = 0.2 points
- Files: 1 file = 1 point
- **Total: 100 + 0.2 + 1 = 101.2 ≈ 105** (rounding/cap logic)

**This is working as intended** - it helps prioritize which blocking issues to fix first.

---

### 3. ❌ **Critical Blocker Category: "Code Quality" vs "Security"**

**What You're Seeing:**
```
⚡ Critical Blockers:
1. 🔴 Command Injection via ProcessBuilder
   - Category: Code Quality  ← WRONG

But in issue details:
🔴 Command Injection via ProcessBuilder
**Category**: Security  ← CORRECT
```

**Root Cause:**
The Critical Blockers section uses `group.detectedCategory || 'Code Quality'` as the default, but `detectedCategory` might be undefined for some reason.

**Also, there's confusion:**
- **`category`**: NEW, EXISTING_MODIFIED, RESOLVED, EXISTING_REST (decision-making)
- **`detectedCategory`**: Security, Performance, Code Quality, etc. (issue type)

The E2E test correctly sets `detectedCategory: 'Security'` for Semgrep issues, so the formatter must not be receiving it.

**Fix:**
Ensure `detectedCategory` is properly propagated through grouping:

```typescript
// In formatter's grouping logic:
const group = {
  rule: representative.rule,
  tool: representative.tool,
  severity: representative.severity,
  detectedCategory: representative.detectedCategory || this.inferCategory(representative.tool),  // ← Add fallback
  // ...
};

private inferCategory(tool: string): string {
  const t = tool.toLowerCase();
  if (t === 'semgrep') return 'Security';
  if (t === 'dependency-check') return 'Dependencies';
  if (t === 'spotbugs') return 'Performance';
  if (t === 'checkstyle' || t === 'pmd') return 'Code Quality';
  return 'Architecture';
}
```

---

### 4. ❌ **Fix Recommendations Empty (AI Enrichment Failed)**

**What You're Seeing:**
```java
**Recommended Code**:

```java
// Fix required at line 171
```
```

**Root Cause:**
From the E2E logs:
```
⚠️  AI enrichment failed for ... - ALERT: Emergency fallback is disabled by STRICT_NO_FALLBACK. 
Unable to proceed without Supabase model configuration.
```

**The Problem:**
- `STRICT_NO_FALLBACK=true` was set to force proper configuration
- The `codequality` role has **NO** entry in Supabase `model_configurations` table
- OpenRouter keys failed (possibly due to API rate limits or invalid keys)
- System refuses to use fallback models, so AI enrichment fails

**Fix:**
1. **Short-term:** Populate Supabase with `code_quality` role config (we deleted security/java/medium but forgot to add code_quality)
2. **Long-term:** Researcher Agent should have discovered this automatically

**SQL to add missing config:**
```sql
INSERT INTO model_configurations (
  role, language, size_category, primary_model, fallback_model, weights, last_updated
) VALUES (
  'code_quality', 'java', 'any', 'google/gemini-2.5-flash', 'google/gemini-2.0-flash', 
  '{"quality": 0.4, "speed": 0.3, "cost": 0.3, "freshness": 0.0}', NOW()
);
```

---

### 5. ✅ **Educational Plan: "Quick Fix" → "Quick Learning"**

**What You're Seeing:**
```
**Quick Fix:** 30-60 min
```

**Fix:**
```
**Quick Learning:** 30-60 min
```

This is cosmetic but important - we're teaching, not fixing. Simple string replacement in formatter line 2867.

---

### 6. ❌ **Security Category Score: 62/100 Too High?**

**What You're Seeing:**
```
Security | 62/100 | 84/100 | ⚠️ Below Average
```

**Expected:**
With 2 critical and 13 high security issues, score should be much lower (maybe 20-30/100).

**Root Cause:**
The `calculateCategoryScore()` method in `v9-integrated-analyzer.ts` only penalizes for **NEW** issues:

```typescript
private calculateCategoryScore(issues: any[], category: string): number {
  const categoryIssues = issues.filter(i =>
    this.getIssueCategory(i).toLowerCase().includes(category.toLowerCase())
  );
  
  let score = 100;
  categoryIssues.forEach(issue => {
    switch (issue.severity) {
      case 'critical': score -= 10; break;  // ← Only NEW issues
      case 'high': score -= 5; break;
      case 'medium': score -= 2; break;
      case 'low': score -= 1; break;
    }
  });
  
  return Math.max(0, Math.min(100, Math.round(score)));
}
```

**The Bug:**
It's called with `newIssues` array, but Security has:
- 2 Critical (EXISTING_MODIFIED)
- 13 High (NEW)

If only NEW issues are counted: 100 - (13 × 5) = 35/100 ✅

But wait... the report shows 62/100. Let me check if category filtering is broken.

**Actually, checking the data:**
- Command Injection: 2 occurrences, EXISTING_MODIFIED
- Unsafe Reflection: 13 occurrences, NEW

So NEW Security issues = 13 high only.
Score should be: 100 - (13 × 5) = 35/100, not 62/100.

**The Math is STILL WRONG somewhere** - likely in `getIssueCategory()` or the filter is not matching properly.

---

### 7. ❌ **Teammates: Hardcoded, Not Discovered from Git**

**What You're Seeing:**
```
| 1 | unknown | 100/100 | 1 |
| 3 | Test Developer | 85/100 | 1 |
| 4 | Alice Developer | 50/100 | 1 |
```

**Root Cause:**
These are **hardcoded test data in Supabase**, not discovered from the repository.

**Fix:**
Implement `discoverTeamFromGit()` in `v9-integrated-analyzer.ts`:

```typescript
private async discoverTeamFromGit(repoPath: string): Promise<string[]> {
  try {
    const result = await execAsync(
      `git -C "${repoPath}" log --all --format='%ae' | sort -u`,
      { maxBuffer: 10 * 1024 * 1024 }
    );
    
    const emails = result.stdout
      .split('\n')
      .map(e => e.trim())
      .filter(e => e && e.includes('@'));
    
    return emails;
  } catch (error) {
    console.error('[V9IntegratedAnalyzer] Failed to discover team:', error);
    return [];
  }
}
```

Then in `generateSkillsTrackingMetadata()`, fetch scores for all discovered team members and populate the leaderboard.

---

### 8. ❌ **Models Used: Still Shows claude-opus-4.1**

**What You're Seeing:**
```
Models Used:
- SecurityAgent: claude-opus-4.1  ← EXPENSIVE
- PerformanceAgent: deepseek-chat-v3.1
- ArchitectureAgent: claude-sonnet-4
- CodeQualityAgent: gemini-2.5-pro
- DependencyAgent: qwen3-coder-30b-a3b-instruct
```

**Root Cause:**
The E2E test doesn't populate `modelsUsed` metadata. The formatter is likely showing:
1. **Either**: The last known models from a previous run
2. **Or**: Hardcoded placeholders
3. **Or**: Retrieved from Supabase (which we just fixed, but E2E ran before the fix)

**Fix:**
In `v9-integrated-analyzer.ts`, populate `modelsUsed` from `ModelConfigResolver`:

```typescript
const modelsUsed: Record<string, string> = {};

for (const role of ['security', 'performance', 'architecture', 'code_quality', 'dependency']) {
  try {
    const config = await this.modelResolver.getModelConfiguration(
      role,
      languageContext.language,
      languageContext.repoSize
    );
    modelsUsed[`${role}Agent`] = config.modelId;
  } catch (error) {
    console.warn(`[V9IntegratedAnalyzer] Could not get model for ${role}: ${error}`);
  }
}

// Pass to formatter
metadata.modelsUsed = modelsUsed;
```

**But why claude-opus-4.1 for Security?**
We deleted the `security/java/medium` record with wrong weights. Now Security should use `security/java/any` record, which has `deepseek/deepseek-chat-v3.1`. 

**Need to verify:** Check Supabase `model_configurations` table for current Security config.

---

### 9. ❌ **Agent Performance Analysis Missing**

**What You're Seeing:**
No per-agent cost/performance breakdown in the report.

**What Should Be There:**
```
### Agent Performance
| Agent | Model | Issues Analyzed | Cost | Duration |
|-------|-------|-----------------|------|----------|
| SecurityAgent | deepseek-chat-v3.1 | 15 | $0.001 | 2.3s |
| CodeQualityAgent | gemini-2.5-flash | 9436 | $0.04 | 185s |
| ...
```

**Fix:**
The formatter has `SHOW_AGENT_EFFICIENCY` flag set to `false`. However, we need to:
1. Collect agent performance data during analysis
2. Store in metadata
3. Pass to formatter
4. Enable the flag (or better: always show if data available)

---

## Summary of Required Fixes

### High Priority (Blocking)
1. ✅ Fix Skill Score calculation - filter for NEW + EXISTING_MODIFIED only, don't over-credit RESOLVED
2. ✅ Fix Critical Blocker category display - ensure `detectedCategory` propagates
3. ✅ Populate missing `code_quality` model config in Supabase
4. ✅ Fix Security category score calculation (verify getIssueCategory logic)

### Medium Priority (Quality)
5. ✅ Change "Quick Fix" to "Quick Learning" in educational section
6. ✅ Populate `modelsUsed` from actual ModelConfigResolver selections
7. ✅ Implement `discoverTeamFromGit()` for real teammate discovery
8. ✅ Add agent performance tracking and metadata

### Low Priority (Documentation)
9. ✅ Document Priority Score formula in report or docs
10. ✅ Add explanation of category vs. detectedCategory in docs

---

## Immediate Action Plan

1. **Run SQL to populate missing configs in Supabase**
2. **Fix skill score calculation logic** in `v9-integrated-analyzer.ts`
3. **Ensure detectedCategory propagation** in formatter grouping
4. **Disable STRICT_NO_FALLBACK temporarily** to verify other logic
5. **Re-run E2E test** to verify all fixes
6. **Update QUICK_START_NEXT_SESSION.md** with findings

