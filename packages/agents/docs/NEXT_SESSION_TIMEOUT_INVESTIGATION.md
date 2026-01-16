# CRITICAL BUG: Infinite Loop Causing $25+ API Costs

## Session 86 FIX IMPLEMENTED

**Status: FIXED** - The infinite loop bug has been patched in `pattern-aware-fixer.ts`

### What Was Fixed (Session 86):

1. **MAX_STORY_ATTEMPTS = 3** - Each story now limited to 3 retry attempts
2. **MAX_API_CALLS_PER_ANALYSIS = 30** - Global limit ~$3 (reduced from 50)
3. **processedStories Set** - Tracks which stories have been processed to prevent re-processing
4. **storyAttempts Map** - Tracks retry attempts per story
5. **storyErrors Map** - Tracks last error for each story
6. **globalApiCalls counter** - Tracks total API calls with abort when limit reached
7. **checkAndTrackApiCall()** - Central method to track all AI calls and enforce limits
8. **FailedStoryReport interface** - Captures failure details for final report
9. **generateRecommendation()** - Provides actionable recommendations for failed stories
10. **getFailedStoriesReport()** - Public method to retrieve failure details

### Key Changes in processAllStories():
- Changed from `while (!this.isComplete())` to `for (const story of allStories)`
- Each story processed exactly once (tracked in processedStories Set)
- Stories that exceed MAX_STORY_ATTEMPTS are marked as 'skipped'
- Global API limit triggers abort for remaining stories
- Proper status updates: 'fixed', 'failed', or 'skipped'
- Failed stories include detailed reports with recommendations

### Failed Story Report Format:
```typescript
interface FailedStoryReport {
  storyId: number;
  storyName: string;
  ruleIds: string[];
  files: string[];
  failureReason: 'max_attempts' | 'api_limit' | 'validation_failed' | 'error';
  attempts: number;
  lastError?: string;
  recommendation: string;  // Actionable suggestion for manual fix
}
```

### Testing Required:
1. Run E2E test with these limits active
2. Verify cost stays under $3 for full analysis
3. Confirm no story is processed more than 3 times
4. Verify failed stories have proper recommendations in output

---

## ORIGINAL BUG - Session 85 Discovery

**Bug:** PatternAwareFixer enters infinite retry loop on certain stories, making 100,000+ API calls.

**Cost Impact:** $25+ in a single test run (actual amount higher)

**Root Cause:** Story 8 "Code quality fixes" never completes, keeps retrying indefinitely.

---

## EXPECTED BEHAVIOR (Cost Control)

### When AI-Fixer Should Be Called:
1. **Pattern EXISTS in KB** → Apply directly, **0 AI calls**
2. **Pattern NOT in KB** → Try AI (attempt 1)
3. **AI fix fails validation** → Retry AI (attempt 2)
4. **Still fails** → Final retry (attempt 3)
5. **Still fails** → **SKIP and move on** (don't loop)

### Cost Expectations:
- **With 642 patterns in KB:** Most issues = 0 AI calls
- **New pattern needed:** Max 3 AI calls per issue
- **Full analysis:** Should cost < $1 for mature KB
- **Current bug:** $25+ due to infinite loops

### The Broken Logic:
```
CURRENT (WRONG):
Story → Check KB → Pattern exists → STILL calls AI for "first issue" → Loop forever

CORRECT:
Story → Check KB → Pattern exists? → YES → Apply directly (0 AI)
                                   → NO  → AI attempt 1/3 → Save to KB
```

## Evidence from Logs

```
[PatternAwareFixer] Processing story 8: "Code quality fixes"
[PatternAwareFixer] Processing story 8: "Code quality fixes"
[PatternAwareFixer] Processing story 8: "Code quality fixes"
... (repeats thousands of times)
```

**Stats from single test run:**
- 116,454 `AIFixer:Start` calls (should be ~100)
- Same file `vhost/index.js:30` processed **15,316 times**
- 772 actual OpenRouter API calls made
- Cost: **$25+ and climbing**

## Immediate Fixes Required (NEXT SESSION PRIORITY #1)

### 1. FIX: Skip AI When Pattern Exists in KB
```typescript
// In pattern-aware-fixer.ts - THIS IS THE MAIN FIX
async function fixIssue(issue: Issue): Promise<FixResult> {
  // Step 1: Check KB for existing pattern
  const pattern = await getPatternFromKB(issue.rule);

  if (pattern && pattern.confidence >= 80) {
    // Pattern exists - apply directly, NO AI CALL
    console.log(`[PatternAwareFixer] ✅ KB pattern found for ${issue.rule} - 0 AI calls`);
    return applyPatternDirectly(pattern, issue);
  }

  // Step 2: No pattern - try AI with max 3 attempts
  for (let attempt = 1; attempt <= 3; attempt++) {
    const result = await callAI(issue); // Only place AI is called
    if (result.success) {
      await savePatternToKB(issue.rule, result); // Save for future
      return result;
    }
    console.log(`[PatternAwareFixer] AI attempt ${attempt}/3 failed`);
  }

  // Step 3: All attempts failed - skip this issue
  console.error(`[PatternAwareFixer] ❌ Skipping ${issue.rule} after 3 failed attempts`);
  return { success: false, skipped: true };
}
```

### 2. Add Global Call Limit Safety (Backup Protection)
```typescript
// In ai-fixer-agent.ts
const MAX_API_CALLS_PER_ANALYSIS = 50;
let apiCallCount = 0;

private async executeOpenRouterCall() {
  if (apiCallCount >= MAX_API_CALLS_PER_ANALYSIS) {
    throw new Error(`API call limit reached (${MAX_API_CALLS_PER_ANALYSIS}). Aborting to prevent cost overrun.`);
  }
  apiCallCount++;
  // ... existing logic
}
```

### 3. Add Max Retry Limit Per Story (Prevent Infinite Loop)
```typescript
// In pattern-aware-fixer.ts
const MAX_STORY_ATTEMPTS = 3;

for (const story of stories) {
  let attempts = 0;
  while (!storyFixed && attempts < MAX_STORY_ATTEMPTS) {
    attempts++;
    // ... fix logic
  }

  if (!storyFixed) {
    console.error(`[PatternAwareFixer] ❌ Story "${story.title}" failed after ${attempts} attempts - SKIPPING`);
    continue; // MUST move to next story, not loop forever
  }
}
```

### 3. Track Processed Issues (Prevent Re-processing)
```typescript
// In pattern-aware-fixer.ts
const processedIssues = new Set<string>();

function getIssueKey(issue: Issue): string {
  return `${issue.file}:${issue.line}:${issue.rule}`;
}

// Before processing
if (processedIssues.has(getIssueKey(issue))) {
  console.log(`[PatternAwareFixer] ⏭️ Skipping already processed: ${issue.file}`);
  continue;
}
processedIssues.add(getIssueKey(issue));
```

### 4. Add Abort Controller for Timeout
```typescript
// In v9-analyze-pr-two-branch.ts
const abortController = new AbortController();
const MAX_ANALYSIS_TIME = 10 * 60 * 1000; // 10 minutes

setTimeout(() => {
  abortController.abort();
  console.error('[v9-analyze] ⛔ TIMEOUT - Aborting all AI calls');
}, MAX_ANALYSIS_TIME);

// Pass to fix generation
await generateFixes(issues, { signal: abortController.signal });
```

## Files to Fix

1. **`pattern-aware-fixer.ts`** - Add retry limit, processed tracking
2. **`ai-fixer-agent.ts`** - Add global call limit
3. **`v9-analyze-pr-two-branch.ts`** - Add abort controller
4. **`fresh-context-fixer.ts`** - Respect abort signal

## Why Story 8 Loops Forever

Need to investigate:
- What makes "Code quality fixes" story different?
- Is it a validation failure causing retry?
- Is it a pattern mismatch causing re-attempt?

Check logs for:
```bash
grep -A5 "Processing story 8" /tmp/api.log | head -50
```

## Test Before Deploying

1. Run with MAX_API_CALLS = 10 first
2. Verify loop stops after 3 retries
3. Confirm timeout kills processing
4. Check cost stays under $1 for test

## DO NOT START API WITHOUT THESE FIXES

The current code will burn through API credits in minutes.

---

## Original Investigation Notes

### Issue Identified (Session 85)

**Problem:** PRO tier analysis times out on large PRs (102 issues) but continues sending OpenRouter requests even after timeout.

### Where Timeout Occurs
- Check `packages/agents/src/two-branch/v9-analyze-pr-two-branch.ts`
- Check test harness timeout settings
- Check API endpoint timeout configuration

### Where OpenRouter Calls Are Made
- `packages/agents/src/fix-agent/state/pattern-aware-fixer.ts`
- `packages/agents/src/fix-agent/ai-fixer.ts`
- OpenRouter calls via `OpenRouterKeyManager`

## Commands for Investigation

```bash
# Check story 8 failure reason
grep -A10 "Processing story 8" /tmp/api.log | head -100

# Count retries per story
grep "Processing story" /tmp/api.log | sort | uniq -c | sort -rn

# Find what causes retry
grep -B5 "Processing story 8" /tmp/api.log | grep -E "error|fail|retry"
```
