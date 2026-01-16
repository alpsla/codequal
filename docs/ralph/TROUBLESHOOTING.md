# Ralph Troubleshooting Guide

## Common Issues

### Story Keeps Failing (3+ Attempts)

**Symptoms:**
```
warn "Story has failed 3 times. Consider:"
```

**Causes:**
1. Story is too large for one context window
2. Missing dependencies from previous stories
3. Unclear acceptance criteria

**Solutions:**

1. **Check progress.txt for error patterns:**
   ```bash
   cat progress.txt | grep -A5 "Status: FAILED"
   ```

2. **Split the story:**
   ```bash
   # Edit tasks.json manually
   # Break story into 2-3 smaller stories
   ```

3. **Add context to progress.txt Learnings section:**
   ```
   ## Learnings
   - Component X requires import from Y
   - API endpoint expects Z format
   ```

---

### No Result Tag Found

**Symptoms:**
```
warn "? No result tag found in output"
```

**Causes:**
1. Claude ran out of context before finishing
2. Iteration timed out
3. Claude got confused by complex story

**Solutions:**

1. **Check if iteration timed out:**
   ```bash
   grep "TIMEOUT" progress.txt
   ```

2. **Increase timeout:**
   ```bash
   ~/.claude/scripts/claude-ralph.sh 10 tasks.json 600  # 10 min timeout
   ```

3. **Simplify the current story:**
   Edit `tasks.json` to break down the failing story.

---

### Progress File Not Updated

**Symptoms:**
```
warn "Claude did not update progress.txt - adding fallback entry"
```

**Causes:**
- Claude prioritized implementation over logging
- Context window exhausted before logging

**Solutions:**

This is handled automatically with fallback logging. The shell script adds an entry when Claude fails to. Check progress.txt for `(Logged by shell)` entries.

---

### Loop Stuck on Same Story

**Symptoms:**
- Same story attempted many times
- No progress despite iterations

**Solutions:**

1. **Check lastError in tasks.json:**
   ```bash
   cat tasks.json | jq '.stories[] | select(.passes == false) | {title, attempts, lastError}'
   ```

2. **Manual intervention:**
   - Fix the issue manually
   - Mark story complete: Edit `tasks.json`, set `passes: true`
   - Resume loop

3. **Skip problematic story:**
   ```bash
   # Edit tasks.json
   # Set passes: true (even if incomplete)
   # Add note to description: "SKIPPED - needs manual work"
   ```

---

### Permission Denied Errors

**Symptoms:**
```
error "Permission denied" or hanging on prompts
```

**Causes:**
- Script missing `--dangerously-skip-permissions` flag
- File system permissions

**Solutions:**

1. **Verify script has correct flag:**
   ```bash
   grep "dangerously-skip-permissions" ~/.claude/scripts/claude-ralph.sh
   ```

2. **Check file permissions:**
   ```bash
   ls -la tasks.json progress.txt
   chmod 644 tasks.json progress.txt
   ```

---

### Branch Conflicts

**Symptoms:**
```
error "Cannot switch to branch"
```

**Solutions:**

1. **Stash changes:**
   ```bash
   git stash
   ~/.claude/scripts/claude-ralph.sh 10
   git stash pop  # after completion
   ```

2. **Clean working directory:**
   ```bash
   git status
   git checkout -- .  # discard changes
   ```

---

### jq Not Found

**Symptoms:**
```
error "jq not found"
```

**Solution:**
```bash
# macOS
brew install jq

# Ubuntu/Debian
sudo apt install jq
```

---

## Debugging

### View Full Iteration Output

```bash
# If running in background
cat ralph-output.log

# Live follow
tail -f ralph-output.log
```

### Check Task State

```bash
# All stories
cat tasks.json | jq '.stories[]'

# Just incomplete
cat tasks.json | jq '.stories[] | select(.passes == false)'

# Summary
cat tasks.json | jq '{
  feature: .feature,
  complete: [.stories[] | select(.passes == true)] | length,
  total: .stories | length,
  currentIteration: .currentIteration
}'
```

### View Error History

```bash
# All failures
grep -A10 "Status: FAILED" progress.txt

# Last failure
grep -A10 "Status: FAILED" progress.txt | tail -12
```

### Manual Iteration Test

Run a single iteration manually to debug:

```bash
claude --print --dangerously-skip-permissions "
Read tasks.json and progress.txt.
What is the first incomplete story?
What errors occurred in previous attempts?
"
```

---

## Recovery Procedures

### Reset and Start Fresh

```bash
# Archive current attempt
mkdir -p archive/$(date +%Y%m%d)
mv tasks.json progress.txt archive/$(date +%Y%m%d)/

# Re-run /rex or /ralph
/rex Your feature description
```

### Resume from Specific Story

```bash
# Edit tasks.json
# Set all completed stories to passes: true
# Set story to resume from to passes: false, attempts: 0

# Run loop
~/.claude/scripts/claude-ralph.sh 10
```

### Force Complete a Story

```bash
# Edit tasks.json directly
jq '.stories[0].passes = true | .stories[0].completedAt = now' tasks.json > tmp.json
mv tmp.json tasks.json
```
