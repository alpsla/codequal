# Ralph Development Guide for CodeQual

> Autonomous AI-assisted development using iterative story completion

**Version:** 1.0
**Created:** Session 82 (January 2026)
**Status:** Production Ready

---

## Table of Contents

1. [Overview](#1-overview)
2. [Quick Start](#2-quick-start)
3. [How It Works](#3-how-it-works)
4. [Creating Tasks](#4-creating-tasks)
5. [Running the Loop](#5-running-the-loop)
6. [Quality Gates](#6-quality-gates)
7. [Progress Tracking](#7-progress-tracking)
8. [Best Practices](#8-best-practices)
9. [Troubleshooting](#9-troubleshooting)
10. [File Reference](#10-file-reference)

---

## 1. Overview

### What is Ralph?

Ralph is an autonomous iteration pattern that runs Claude repeatedly until all tasks ("stories") are complete. Each iteration:

- **Spawns fresh context** - No drift from long sessions
- **Re-reads project rules** - CLAUDE.md respected every time
- **Focuses on ONE story** - Atomic, testable changes
- **Enforces quality gates** - Must pass before advancing
- **Accumulates learnings** - progress.txt grows with insights

### Why Use Ralph for CodeQual?

| Challenge | Ralph Solution |
|-----------|----------------|
| Complex V9 architecture | Fresh context reads V9 docs each time |
| Many forbidden patterns | CLAUDE.md re-read every iteration |
| Multi-package changes | turbo validates all dependencies |
| Long-running features | Resumable via tasks.json |
| Quality requirements | Mandatory gates before pass=true |

### When to Use Ralph

✅ **Use Ralph for:**
- Features spanning 3+ files
- Multi-package changes
- Test-driven bug fixes
- Refactoring with verification
- Any task with discrete steps

❌ **Don't use Ralph for:**
- Quick single-file fixes
- Exploratory research
- Documentation-only changes
- Interactive debugging

---

## 2. Quick Start

### Prerequisites

```bash
# Verify prerequisites
command -v claude   # Claude CLI installed
command -v jq       # JSON processor
command -v turbo    # Turbo build tool
```

### 5-Minute Setup

```bash
# 1. Navigate to CodeQual
cd ~/CodePrjects/codequal

# 2. Create tasks.json for your feature
cat > tasks.json << 'EOF'
{
  "feature": "Add retry logic to API client",
  "branchName": "feature/api-retry",
  "stories": [
    {
      "id": 1,
      "title": "Add retry configuration interface",
      "description": "Create RetryConfig type in packages/core",
      "passes": false,
      "attempts": 0
    },
    {
      "id": 2,
      "title": "Implement exponential backoff",
      "description": "Add backoff logic to API client",
      "passes": false,
      "attempts": 0
    },
    {
      "id": 3,
      "title": "Add unit tests",
      "description": "Test retry behavior with mocks",
      "passes": false,
      "attempts": 0
    }
  ]
}
EOF

# 3. Run Ralph (10 iterations max)
~/.claude/scripts/codequal-ralph.sh 10

# 4. When complete, review and push
git log --oneline -5
git push origin feature/api-retry
```

---

## 3. How It Works

### Iteration Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    RALPH ITERATION LOOP                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐                                                │
│  │ Start Loop  │                                                │
│  └──────┬──────┘                                                │
│         │                                                       │
│         ▼                                                       │
│  ┌─────────────────────────────────────┐                        │
│  │ 1. FRESH CLAUDE CONTEXT             │                        │
│  │    • Read CLAUDE.md (37KB)          │                        │
│  │    • Read V9_CRITICAL_KB.md         │                        │
│  │    • Read tasks.json                │                        │
│  │    • Read progress.txt              │                        │
│  └──────┬──────────────────────────────┘                        │
│         │                                                       │
│         ▼                                                       │
│  ┌─────────────────────────────────────┐                        │
│  │ 2. FIND NEXT STORY                  │                        │
│  │    First where passes=false         │                        │
│  └──────┬──────────────────────────────┘                        │
│         │                                                       │
│         ▼                                                       │
│  ┌─────────────────────────────────────┐                        │
│  │ 3. IMPLEMENT STORY                  │                        │
│  │    • Write code                     │                        │
│  │    • Follow CLAUDE.md rules         │                        │
│  │    • Keep changes minimal           │                        │
│  └──────┬──────────────────────────────┘                        │
│         │                                                       │
│         ▼                                                       │
│  ┌─────────────────────────────────────┐                        │
│  │ 4. RUN QUALITY GATES                │                        │
│  │    • turbo run build                │                        │
│  │    • turbo run typecheck            │                        │
│  │    • turbo run lint                 │                        │
│  │    • V9 E2E test (if agents/)       │                        │
│  └──────┬──────────────────────────────┘                        │
│         │                                                       │
│    ┌────┴────┐                                                  │
│   PASS      FAIL                                                │
│    │         │                                                  │
│    ▼         ▼                                                  │
│ ┌───────┐ ┌─────────────┐                                       │
│ │Commit │ │Increment    │                                       │
│ │passes │ │attempts     │                                       │
│ │=true  │ │Log failure  │                                       │
│ └───┬───┘ └──────┬──────┘                                       │
│     │            │                                              │
│     └─────┬──────┘                                              │
│           │                                                     │
│           ▼                                                     │
│  ┌─────────────────────────────────────┐                        │
│  │ 5. UPDATE PROGRESS.TXT              │                        │
│  │    • What was done/tried            │                        │
│  │    • Learnings for future           │                        │
│  └──────┬──────────────────────────────┘                        │
│         │                                                       │
│         ▼                                                       │
│  ┌─────────────────────────────────────┐                        │
│  │ 6. CHECK COMPLETION                 │                        │
│  │    All stories pass? → EXIT         │                        │
│  │    More stories? → NEXT ITERATION   │                        │
│  └─────────────────────────────────────┘                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Key Principles

1. **Fresh Context**: Each iteration starts with clean 200K token context
2. **One Story Per Iteration**: Focus prevents scope creep
3. **Gates Before Commit**: Quality enforced, not optional
4. **Learnings Persist**: progress.txt survives across iterations
5. **Atomic Commits**: Each story = one commit

---

## 4. Creating Tasks

### tasks.json Structure

```json
{
  "feature": "Feature name for logging",
  "branchName": "feature/branch-name",
  "stories": [
    {
      "id": 1,
      "title": "Short descriptive title",
      "description": "Detailed description of what to implement",
      "passes": false,
      "attempts": 0,
      "lastError": null,
      "completedAt": null
    }
  ],
  "currentIteration": 0,
  "lastRun": null
}
```

### Story Sizing Guidelines

**Right-Sized Stories:**
- Add a new TypeScript interface ✅
- Implement a single function ✅
- Add tests for one module ✅
- Update configuration file ✅

**Too Large (Split These):**
- Implement entire feature ❌ → Split into interface, logic, tests
- Refactor whole package ❌ → Split by file or component
- Add multiple endpoints ❌ → One story per endpoint

### Example: Feature Breakdown

```
Feature: "Add caching to V9RepositoryManager"

Stories:
1. "Define CacheConfig interface" (packages/core)
2. "Add Redis cache service" (packages/core)
3. "Integrate cache into V9RepositoryManager" (packages/agents)
4. "Add cache invalidation logic" (packages/agents)
5. "Add unit tests for cache service" (packages/core)
6. "Add integration tests" (packages/agents)
```

---

## 5. Running the Loop

### Basic Usage

```bash
# Run with default 10 iterations
~/.claude/scripts/codequal-ralph.sh

# Run with custom iteration limit
~/.claude/scripts/codequal-ralph.sh 20

# Run with verbose output (see Claude responses)
~/.claude/scripts/codequal-ralph.sh 10 2>&1 | tee ralph.log
```

### Output Interpretation

```
╔════════════════════════════════════════════════════════════╗
║           CODEQUAL RALPH - Autonomous Iteration            ║
╚════════════════════════════════════════════════════════════╝

[ralph] Feature:      Add caching to V9RepositoryManager
[ralph] Branch:       feature/v9-cache
[ralph] Stories:      0/6 complete
[ralph] Max Iters:    10

════════════════════════════════════════════════════════════
[ralph] ITERATION 1 of 10
════════════════════════════════════════════════════════════
[ralph] Remaining:    6 stories
[ralph] Next story:   Define CacheConfig interface
[ralph] Attempts:     0

[ralph] Invoking Claude...
[ralph] ✓ Story completed successfully

════════════════════════════════════════════════════════════
[ralph] ITERATION 2 of 10
════════════════════════════════════════════════════════════
...
```

### Resuming After Interruption

Ralph is fully resumable. Just run the script again:

```bash
# Interrupted or need to continue later
~/.claude/scripts/codequal-ralph.sh 10

# Ralph reads tasks.json and continues from where it left off
```

---

## 6. Quality Gates

### Gate Definitions

| Gate | Command | When Required |
|------|---------|---------------|
| Build | `turbo run build` | Always |
| Type Check | `turbo run typecheck` | Always |
| Lint | `turbo run lint` | Always |
| Unit Tests | `turbo run test` | When logic changes |
| V9 E2E | `npx tsx packages/agents/tests/integration/test-v9-lite-e2e.ts` | When agents/ changes |

### Gate Failure Handling

When a gate fails:
1. Story stays `passes: false`
2. `attempts` counter increments
3. Error logged to `lastError`
4. Learnings added to progress.txt
5. Next iteration retries with fresh context

### Max Attempts

After 3 failed attempts on a story:
- Ralph warns but continues trying
- Consider splitting the story
- Review progress.txt for patterns
- May need manual intervention

---

## 7. Progress Tracking

### progress.txt Format

```
# Ralph Progress Log
# Feature: Add caching to V9RepositoryManager
# Started: 2026-01-12T10:30:00Z

=== ITERATION 1 - 2026-01-12T10:30:15Z ===
Story: Define CacheConfig interface
Status: COMPLETE
Changes: packages/core/src/types/cache.ts
Learnings: Use Zod for runtime validation of config

=== ITERATION 2 - 2026-01-12T10:32:00Z ===
Story: Add Redis cache service
Status: FAILED (attempt 1)
Error: turbo run build failed - missing ioredis types
Analysis: Need to add @types/ioredis to devDependencies
Next approach: Install types first, then implement

=== ITERATION 3 - 2026-01-12T10:34:00Z ===
Story: Add Redis cache service
Status: COMPLETE
Changes: packages/core/src/services/redis-cache.ts, package.json
Learnings: Always check types exist before using new packages
```

### Using Progress for Debugging

```bash
# View recent progress
tail -50 progress.txt

# Find all failures
grep -A5 "FAILED" progress.txt

# Count attempts per story
grep "Story:" progress.txt | sort | uniq -c
```

---

## 8. Best Practices

### DO ✅

1. **Size stories to fit one context window**
   - Can be fully implemented in < 30 minutes
   - Touches < 5 files typically

2. **Write clear story descriptions**
   - Include package names
   - Specify file paths if known
   - Mention dependencies

3. **Review progress.txt after failures**
   - Patterns emerge across attempts
   - Learnings help future iterations

4. **Let Ralph finish before intervening**
   - Trust the quality gates
   - Manual edits confuse state

5. **Commit tasks.json to git**
   - Track feature progress
   - Enable team visibility

### DON'T ❌

1. **Don't edit tasks.json during loop**
   - Ralph manages state
   - Edits cause confusion

2. **Don't skip quality gates**
   - They exist for a reason
   - Broken code compounds

3. **Don't create mega-stories**
   - "Implement entire feature" will fail
   - Break into 3-7 focused stories

4. **Don't ignore progress.txt**
   - Contains valuable learnings
   - Helps debug stuck stories

---

## 9. Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| "Not in CodeQual project root" | Run from `~/CodePrjects/codequal` |
| "tasks.json not found" | Create tasks.json first |
| "claude CLI not found" | Install Claude CLI |
| "jq not found" | `brew install jq` |
| Story keeps failing | Split into smaller stories |
| Build fails across packages | `turbo run build --force` |
| V9 test failing | Read V9_CRITICAL_KNOWLEDGE_BASE.md |

### Debugging Stuck Stories

```bash
# 1. Check the error
jq '.stories[] | select(.passes == false) | {title, attempts, lastError}' tasks.json

# 2. Review progress
grep -A10 "FAILED" progress.txt | tail -30

# 3. Check if story is too large
# If attempts > 3, consider splitting

# 4. Manual intervention
# Edit code, run gates manually, then update tasks.json
```

### Resetting a Story

```bash
# Reset attempts for a stuck story
jq '.stories[0].attempts = 0 | .stories[0].lastError = null' tasks.json > tmp.json
mv tmp.json tasks.json
```

---

## 10. File Reference

### Files Created by Setup

| File | Location | Purpose |
|------|----------|---------|
| `codequal-ralph-prompt.txt` | `~/.claude/prompts/` | Iteration instructions |
| `codequal-ralph.sh` | `~/.claude/scripts/` | Loop script |

### Files Created Per Feature

| File | Location | Purpose |
|------|----------|---------|
| `tasks.json` | Project root | Story state tracking |
| `progress.txt` | Project root | Accumulated learnings |

### Related Documentation

| Document | Location |
|----------|----------|
| CLAUDE.md | Project root |
| V9_CRITICAL_KNOWLEDGE_BASE.md | `packages/agents/src/two-branch/docs/next/` |
| QUICK_START_NEXT_SESSION.md | `packages/agents/src/two-branch/docs/next/` |

---

## Appendix: Sample tasks.json Templates

### Bug Fix

```json
{
  "feature": "Fix issue categorization bug",
  "branchName": "fix/issue-categorization",
  "stories": [
    { "id": 1, "title": "Add failing test case", "passes": false, "attempts": 0 },
    { "id": 2, "title": "Identify root cause", "passes": false, "attempts": 0 },
    { "id": 3, "title": "Implement fix", "passes": false, "attempts": 0 },
    { "id": 4, "title": "Verify test passes", "passes": false, "attempts": 0 }
  ]
}
```

### New Feature

```json
{
  "feature": "Add webhook notifications",
  "branchName": "feature/webhooks",
  "stories": [
    { "id": 1, "title": "Define webhook config schema", "passes": false, "attempts": 0 },
    { "id": 2, "title": "Create webhook service", "passes": false, "attempts": 0 },
    { "id": 3, "title": "Add API endpoint", "passes": false, "attempts": 0 },
    { "id": 4, "title": "Integrate with analysis pipeline", "passes": false, "attempts": 0 },
    { "id": 5, "title": "Add unit tests", "passes": false, "attempts": 0 },
    { "id": 6, "title": "Add integration test", "passes": false, "attempts": 0 }
  ]
}
```

### Refactoring

```json
{
  "feature": "Refactor API client to use fetch",
  "branchName": "refactor/api-fetch",
  "stories": [
    { "id": 1, "title": "Create new fetch-based client", "passes": false, "attempts": 0 },
    { "id": 2, "title": "Migrate first endpoint", "passes": false, "attempts": 0 },
    { "id": 3, "title": "Migrate remaining endpoints", "passes": false, "attempts": 0 },
    { "id": 4, "title": "Update tests", "passes": false, "attempts": 0 },
    { "id": 5, "title": "Remove old axios client", "passes": false, "attempts": 0 }
  ]
}
```

---

_Last updated: Session 82 - January 2026_
