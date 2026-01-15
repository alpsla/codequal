# Next Session: Timeout & OpenRouter Request Handling

## Issue Identified (Session 85)

**Problem:** PRO tier analysis times out on large PRs (102 issues) but continues sending OpenRouter requests even after timeout.

**Impact:**
- Wasted API costs (~100 calls before timeout)
- No graceful shutdown of AI processing
- User gets timeout error but costs are incurred

## Root Cause Investigation Needed

### 1. Where Timeout Occurs
- Check `packages/agents/src/two-branch/v9-analyze-pr-two-branch.ts`
- Check test harness timeout settings
- Check API endpoint timeout configuration

### 2. Where OpenRouter Calls Are Made
- `packages/agents/src/fix-agent/state/pattern-aware-fixer.ts`
- `packages/agents/src/fix-agent/ai-fixer.ts`
- OpenRouter calls via `OpenRouterKeyManager`

### 3. Missing Abort Signal
- Need `AbortController` passed through fix generation pipeline
- On timeout, signal should cancel pending AI requests

## Proposed Solutions

### Solution 1: Abort Controller Pattern
```typescript
// In v9-analyze-pr-two-branch.ts
const abortController = new AbortController();
const timeoutId = setTimeout(() => {
  abortController.abort();
  console.log('[v9-analyze] Aborting AI requests due to timeout');
}, MAX_ANALYSIS_TIME);

// Pass to fix generation
await generateFixes(issues, { signal: abortController.signal });

// In ai-fixer.ts
if (options.signal?.aborted) {
  throw new Error('Analysis aborted due to timeout');
}
```

### Solution 2: Chunked Processing with Checkpoints
```typescript
// Process stories in batches with progress saves
const BATCH_SIZE = 10;
for (let i = 0; i < stories.length; i += BATCH_SIZE) {
  const batch = stories.slice(i, i + BATCH_SIZE);
  await processBatch(batch);
  await saveCheckpoint(i + BATCH_SIZE); // Resume point if timeout
}
```

### Solution 3: Adaptive Timeout Based on Issue Count
```typescript
// Scale timeout with complexity
const baseTimeout = 5 * 60 * 1000; // 5 min base
const perIssueTime = 3 * 1000; // 3 sec per issue
const maxTimeout = 30 * 60 * 1000; // 30 min max

const dynamicTimeout = Math.min(
  baseTimeout + (issueCount * perIssueTime),
  maxTimeout
);
```

### Solution 4: Parallel Story Processing
```typescript
// Current: Sequential stories (slow)
for (const story of stories) {
  await processStory(story);
}

// Better: Parallel batches
const PARALLEL_STORIES = 3;
await Promise.all(
  chunk(stories, PARALLEL_STORIES).map(batch =>
    Promise.all(batch.map(processStory))
  )
);
```

## Files to Modify

1. **`v9-analyze-pr-two-branch.ts`** - Add abort controller, dynamic timeout
2. **`pattern-aware-fixer.ts`** - Check abort signal before AI calls
3. **`ai-fixer.ts`** - Respect abort signal, cleanup on cancel
4. **`fresh-context-fixer.ts`** - Pass abort signal through chain
5. **API routes** - Expose cancel endpoint for long-running analyses

## Test Cases Needed

1. Timeout with graceful shutdown (verify 0 AI calls after timeout)
2. Large PR (100+ issues) completes within reasonable time
3. Cancel mid-analysis via API
4. Resume from checkpoint after timeout

## Priority for Next Session

1. **HIGH**: Add abort controller to stop OpenRouter calls on timeout
2. **HIGH**: Investigate why 88 stories takes so long (sequential processing?)
3. **MEDIUM**: Implement parallel story processing
4. **MEDIUM**: Add progress checkpoints for resume capability

## Session 85 Stats

- Java BASIC: 102 issues, 110s, 0 AI calls ✅
- Java PRO: 102 issues, >10min timeout, ~100 AI calls wasted ❌
- TypeScript BASIC: 42 issues, 210s, 0 AI calls ✅

## Commands for Investigation

```bash
# Check current timeout settings
grep -r "timeout" packages/agents/src/two-branch/ | grep -v node_modules

# Find OpenRouter call sites
grep -r "OpenRouter" packages/agents/src/ | grep -v node_modules

# Check abort signal usage
grep -r "AbortController\|abort" packages/agents/src/ | grep -v node_modules
```
