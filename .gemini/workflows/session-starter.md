---
description: Quick session preparation and environment setup
---

# Session Starter Workflow

**Purpose**: Quickly prepare the CodeQual development environment and provide complete session context.

**When to use**: At the start of every development session.

**Trigger**: "Start session" or "Session startup"

## Workflow Steps

### Phase 1: Read Session Transition Documentation (CRITICAL)

1. **FIRST READ:** `packages/agents/src/two-branch/docs/next/QUICK_START_NEXT_SESSION.md`
   - Latest status, current todos, immediate context
   - Completed work from previous session
   - Pending tasks and priorities
   - Known issues and blockers

2. Read `packages/agents/src/two-branch/docs/next/V9_CRITICAL_KNOWLEDGE_BASE.md`
   - Current solutions, expectations, recent fixes

### Phase 2: Check Environment Status

3. **Check Redis:**
```bash
redis-cli ping
```
Expected: PONG

4. **Check Build Status:**
```bash
ls packages/agents/dist
```
Expected: Directory exists with compiled files

5. **Check Dependencies:**
```bash
ls packages/agents/node_modules
```
Expected: Directory exists

6. **Check Git Status:**
```bash
git status --short
```
Note: Any uncommitted changes

### Phase 3: Review Active Work

7. **Check Active Bugs:**
```bash
ls docs/bugs/BUG_*.md 2>/dev/null | wc -l
```
Count active bugs

8. **Check Recent Commits:**
```bash
git log --oneline -5
```
See recent development activity

9. **Check Current Branch:**
```bash
git branch --show-current
```
Verify working branch

### Phase 4: Provide Session Summary

Generate standardized output:

```
🚀 CodeQual Session Ready

📅 Last Session: [date from QUICK_START_NEXT_SESSION.md]
📁 Git Status: [clean/X uncommitted files]

🔧 Services:
✅/❌ Redis: localhost:6379 [Connected/Down]
✅/❌ Build: dist/ [Ready/Required]
✅/❌ Dependencies: node_modules/ [Installed/Missing]

🐛 Active Bugs: [X open bugs]
- [BUG-ID]: [brief description from QUICK_START_NEXT_SESSION.md]

📋 Current Phase: [Phase from QUICK_START_NEXT_SESSION.md]
- Priority: [current priority task]

⚡ Quick Commands:
[3-5 context-aware commands based on current state]

📌 Continue from: [last task from QUICK_START_NEXT_SESSION.md]
```

### Phase 5: Provide Quick Fix Commands (if needed)

**If Redis is down:**
```bash
redis-server --daemonize yes
```

**If Build is missing:**
```bash
cd packages/agents && npm run build
```

**If Dependencies are missing:**
```bash
cd packages/agents && npm install
```

### Phase 6: Provide Context-Aware Commands

Based on current status from QUICK_START_NEXT_SESSION.md, provide ready-to-execute commands:

**Example for V9 Testing:**
```bash
# Navigate to agents directory
cd packages/agents

# Run V9 E2E test
npx ts-node test-v9-e2e-complete.ts

# Check test output
ls test-outputs/
```

**Example for Bug Fixing:**
```bash
# Navigate to agents directory
cd packages/agents

# Run specific test for bug
npx ts-node tests/integration/[test-file].ts

# Check logs
tail -f logs/[relevant-log].log
```

**Example for Feature Development:**
```bash
# Navigate to agents directory
cd packages/agents

# Build and test
npm run build && npm test

# Run integration tests
npm run test:integration
```

## Quick Start Template

Always provide this copy-paste block:

```bash
# Quick session start (from project root):
cd packages/agents
redis-cli ping
git status --short
npm run build
echo "✅ Environment ready"
```

## Environment Verification Checklist

✅ QUICK_START_NEXT_SESSION.md read
✅ Redis running
✅ Build exists
✅ Dependencies installed
✅ Git status checked
✅ Active bugs identified
✅ Current priorities understood
✅ Quick commands provided

## Common Session Scenarios

### Scenario 1: Fresh Start (All Services Down)

**Status:**
- ❌ Redis: Down
- ❌ Build: Missing
- ✅ Dependencies: Installed

**Quick Fix:**
```bash
# Start Redis
redis-server --daemonize yes

# Build project
cd packages/agents && npm run build

# Verify
redis-cli ping && ls dist/ && echo "✅ Ready"
```

### Scenario 2: Resume Work (Services Running)

**Status:**
- ✅ Redis: Running
- ✅ Build: Exists
- ✅ Dependencies: Installed
- 📝 Uncommitted changes: 3 files

**Quick Start:**
```bash
# Review uncommitted changes
git status

# Continue from last task
cd packages/agents
[command from QUICK_START_NEXT_SESSION.md]
```

### Scenario 3: Bug Fix Session

**Status:**
- ✅ All services running
- 🐛 Active bugs: 2
- 📋 Priority: Fix BUG-XXX

**Quick Start:**
```bash
# Navigate to agents
cd packages/agents

# Review bug details
cat ../docs/bugs/BUG-XXX.md

# Run relevant tests
npx ts-node [test-file-from-bug-doc]
```

### Scenario 4: Testing Session

**Status:**
- ✅ All services running
- 📋 Priority: Run V9 E2E tests

**Quick Start:**
```bash
# Navigate to agents
cd packages/agents

# Run V9 tests
npx ts-node test-v9-e2e-complete.ts

# Check results
cat test-outputs/[latest-report].md
```

## Integration with Session Wrapper

This workflow is the **START** of the session cycle:

**Session Cycle:**
1. **Session Starter** (this workflow) - Read QUICK_START_NEXT_SESSION.md, prepare environment
2. **Development Work** - Execute tasks
3. **Session Wrapper** - Update QUICK_START_NEXT_SESSION.md, document progress

**Contract Between Sessions:**
- Session Wrapper WRITES to QUICK_START_NEXT_SESSION.md
- Session Starter READS from QUICK_START_NEXT_SESSION.md
- This ensures continuity across sessions

## Success Criteria

✅ Environment status verified
✅ All services checked
✅ Session context loaded from QUICK_START_NEXT_SESSION.md
✅ Active bugs identified
✅ Current priorities understood
✅ Quick fix commands provided (if needed)
✅ Context-aware commands provided
✅ Ready to start development work

## Time Constraint

Complete entire session preparation in **under 2 minutes**.

Be concise, accurate, and action-oriented.
