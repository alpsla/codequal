# Maintain Fix Pattern Knowledge Base

Review and fix failed patterns in the Knowledge Base.

## What This Command Does

1. Fetches all fix failures needing review (failed 3+ times)
2. For each failure, analyzes:
   - All attempted fixes and why they failed
   - The regression patterns that occurred
   - The original code context
3. Generates proper fix guidance including:
   - Anti-patterns to avoid (learned from failures)
   - Correct patterns to use (based on rule knowledge)
   - Related rules to watch for
   - Prompt additions for AI
4. Adds guidance to KB and marks failures as resolved

## Usage

```
/maintain-kb                    # Review all pending failures
/maintain-kb --rule CloseResource  # Review specific rule
/maintain-kb --dry-run          # Preview without making changes
```

## Process

When invoked, Claude will:

1. **Read failures from database**:
   ```typescript
   const failures = await getFailuresNeedingReview();
   ```

2. **For each failure, analyze the attempts**:
   - Parse the `attempted_fix` JSON containing all attempts
   - Identify common patterns in what went wrong
   - Understand the root cause of repeated failures

3. **Generate guidance based on analysis**:
   - Create anti-patterns from the failed code patterns
   - Create correct patterns based on rule documentation and best practices
   - Add specific prompt instructions to prevent future failures

4. **Add to KB and mark resolved**:
   ```typescript
   await addFixGuidance(guidance);
   await markFailureReviewed(id, 'guidance_added', 'claude-maintain-kb');
   ```

## Example Session

```
User: /maintain-kb

Claude: I found 3 patterns needing review:

### 1. CloseResource (java/pmd) - 5 failures

**Analysis of 5 failed attempts:**
- Attempt 1: Used manual close() → EmptyCatchBlock
- Attempt 2: Added catch but empty → EmptyCatchBlock
- Attempt 3: Added logging but still manual → CloseResource not fixed
- Attempt 4: Used try-with-resources but caught Throwable → AvoidCatchingThrowable
- Attempt 5: Fixed catch type but wrong resource type

**Root Cause:** AI doesn't understand try-with-resources syntax properly

**Generated Guidance:**
- Anti-patterns: manual close(), empty catch, catching Throwable
- Correct patterns: try-with-resources with specific exception types
- Prompt: "MUST use try-with-resources. NEVER generate empty catch blocks."

✅ Added guidance for CloseResource
✅ Marked 5 failures as resolved

### 2. [Next failure...]
```

## Scheduling

For production use, schedule this as a weekly job:

```bash
# Run every Monday at 9am
0 9 * * 1 cd /path/to/codequal && claude-code --skill maintain-kb
```

Or trigger after each analysis run if failures > threshold.
