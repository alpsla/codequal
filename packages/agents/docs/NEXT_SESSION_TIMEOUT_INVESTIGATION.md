# CRITICAL BUG: Infinite Loop Causing $25+ API Costs

## URGENT - Session 85 Discovery

**Bug:** PatternAwareFixer enters infinite retry loop on certain stories, making 100,000+ API calls.

**Cost Impact:** $25+ in a single test run (actual amount higher)

**Root Cause:** Story 8 "Code quality fixes" never completes, keeps retrying indefinitely.

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

### 1. Add Max Retry Limit Per Story
```typescript
// In pattern-aware-fixer.ts
const MAX_STORY_RETRIES = 3;
let retryCount = 0;

while (!storyFixed && retryCount < MAX_STORY_RETRIES) {
  retryCount++;
  // ... existing logic
}

if (!storyFixed) {
  console.error(`[PatternAwareFixer] ❌ Story ${storyId} failed after ${MAX_STORY_RETRIES} attempts - SKIPPING`);
  continue; // Move to next story
}
```

### 2. Add Global Call Limit Safety
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
