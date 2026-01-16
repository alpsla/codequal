# Ralph Quick Start Guide

## Fastest Way to Start

```bash
/rex Add your feature description here
```

That's it. Ralph will:
1. Ask clarifying questions
2. Generate PRD and tasks
3. Execute autonomously

---

## Step-by-Step Example

### 1. Invoke Ralph Execute

```bash
/rex Add task priority with color badges and filtering
```

### 2. Answer Questions

Claude asks:
```
1. What priority levels?
   A. Simple (High/Low)
   B. Standard (High/Medium/Low)
   C. Extended (Critical/High/Medium/Low/None)
   D. Custom

2. Visual indicators?
   A. Color badges
   B. Icons
   C. Both
   D. None

3. Filter behavior?
   A. Single select
   B. Multi-select
   C. No filtering
```

You respond:
```
1B, 2A, 3A
```

### 3. Review and Confirm

Claude shows:
```
╔════════════════════════════════════════════════════════════╗
║              RALPH READY TO EXECUTE                        ║
╚════════════════════════════════════════════════════════════╝

Feature:     Task Priority
Branch:      feature/task-priority
Stories:     4

Stories to implement:
  1. [ ] Add priority field to database
  2. [ ] Display priority badges on cards
  3. [ ] Add priority selector to edit
  4. [ ] Filter tasks by priority

Ready to start?
  A. Yes, start now
  B. Review PRD first
  C. Adjust stories
  D. Cancel
```

You respond:
```
A
```

### 4. Monitor Progress

```bash
# Watch live output
tail -f ralph-output.log

# Check task status
cat tasks.json | jq '.stories[] | {title, passes, attempts}'

# View learnings
cat progress.txt
```

---

## Alternative Workflows

### Manual Step-by-Step

```bash
# Step 1: Create PRD only
/prd Add dark mode toggle

# Step 2: Convert to tasks
/ralph tasks/prd-dark-mode.md

# Step 3: Run loop manually
~/.claude/scripts/claude-ralph.sh 10
```

### Resume Interrupted Loop

```bash
# Check current state
cat tasks.json | jq '.stories[] | select(.passes == false) | .title'

# Continue with more iterations
~/.claude/scripts/claude-ralph.sh 15
```

---

## Monitoring Commands

| Command | Purpose |
|---------|---------|
| `tail -f ralph-output.log` | Live output |
| `cat tasks.json \| jq '.'` | Full task state |
| `cat progress.txt` | Learnings & errors |
| `git log --oneline -10` | Recent commits |

---

## Stopping Execution

```bash
# Find the process
ps aux | grep claude-ralph

# Kill it
kill <PID>
```

Or simply close the terminal window.
