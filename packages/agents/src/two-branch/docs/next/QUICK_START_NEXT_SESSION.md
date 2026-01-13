# Quick Start - Next Session

**Last Updated**: Session 82 (January 12, 2026) - Complete
**Current Phase**: V9 Two-Branch Analysis - Ralph-Inspired State Management
**Status**: All Session 82 tasks COMPLETED

---

## Session 82 Completed

### Ralph Integration Analysis ✅ COMPLETE

Analyzed how Ralph autonomous iteration patterns can enhance CodeQual in two ways:
1. **Development Process**: Using Ralph to develop CodeQual (codequal-ralph.sh)
2. **App Enhancement**: Using Ralph patterns in PR analysis fix flow

### Part 1: Process Enhancement ✅ COMPLETE

Created Ralph-style autonomous iteration system for CodeQual development:

| Component | Location | Purpose |
|-----------|----------|---------|
| `codequal-ralph-prompt.txt` | `~/.claude/prompts/` | Iteration instructions |
| `codequal-ralph.sh` | `~/.claude/scripts/` | Loop script |
| `RALPH_DEVELOPMENT_GUIDE.md` | `docs/development/` | Usage documentation |

### Part 2: App Enhancement ✅ COMPLETE

Created Ralph-inspired state management for PR fix operations:

| Component | Purpose |
|-----------|---------|
| `PRFixStateManager` | Explicit state tracking (pr-fix-state.json) |
| `StoryDecomposer` | Group related issues into atomic fix stories |
| `FreshContextFixService` | Fresh context per attempt (A5) |
| `formatPriorAttemptsForPrompt` | Structured failure summaries |

### A5: Fresh Context Per Fix Attempt ✅ COMPLETE

**The Problem:**
Current retry loop appends failures → context grows → AI gets stuck

**The Ralph Solution:**
Each fix attempt spawns completely new AI API call with:
- Full 200K context available
- Structured summary of what didn't work (not raw feedback)
- Cross-fix awareness (later fixes know about earlier ones)
- Within-PR learnings accumulated so far

---

## Files Created Session 82

```
Part 1 (Process Enhancement):
~/.claude/prompts/codequal-ralph-prompt.txt (NEW)
  - Ralph iteration prompt with CodeQual-specific rules

~/.claude/scripts/codequal-ralph.sh (NEW)
  - Executable loop script for autonomous iteration

docs/development/RALPH_DEVELOPMENT_GUIDE.md (NEW)
  - Comprehensive 500+ line usage guide

CLAUDE.md
  - Added Ralph section and updated KB section

Part 2 (App Enhancement):
packages/agents/src/fix-agent/state/index.ts (NEW)
  - Exports all state management components

packages/agents/src/fix-agent/state/pr-fix-state.ts (NEW)
  - PRFixStateManager class
  - FixStory, PRLearning types
  - Cross-fix awareness methods
  - Within-PR learnings system

packages/agents/src/fix-agent/state/story-decomposer.ts (NEW)
  - StoryDecomposer class
  - Groups by file then rule
  - Splits large groups, merges tiny ones
  - Priority by severity and security

packages/agents/src/fix-agent/state/fresh-context-fixer.ts (NEW)
  - FreshContextFixService class
  - Implements Ralph's fresh context pattern
  - Resumable state across invocations

packages/agents/src/fix-agent/state/example-integration.ts (NEW)
  - Integration example with AIFixerAgent
  - Usage patterns for state management
```

---

## Session 83 TODO

### P0: Test Ralph Development Workflow

```bash
# Create a simple test task
cd ~/CodePrjects/codequal
cat > tasks.json << 'EOF'
{
  "feature": "Test Ralph workflow",
  "branchName": "test/ralph-workflow",
  "stories": [
    {
      "id": 1,
      "title": "Add test file",
      "description": "Create a simple test file to verify Ralph works",
      "passes": false,
      "attempts": 0
    }
  ]
}
EOF

# Run Ralph (single iteration)
~/.claude/scripts/codequal-ralph.sh 1
```

### P1: Integrate FreshContextFixService with v9-analyze.ts

The FreshContextFixService is ready but needs integration with the main fix flow:

```typescript
// In v9-analyze.ts PRO tier fix section
import { FreshContextFixService } from '../fix-agent/state';

// Use fresh context pattern for fix attempts
const fixService = new FreshContextFixService(
  prUrl, prNumber, repository, language,
  {
    maxAttemptsPerStory: 3,
    generateFix: async (context) => { /* use AIFixerAgent */ },
    validateFix: async (fixCode, issues) => { /* use verifier */ },
  }
);
```

### P2: Apply Database Migrations (from Session 81)

```bash
psql $DATABASE_URL -f database/migrations/20260109_fix_pattern_guidance.sql
psql $DATABASE_URL -f database/migrations/20260109_seed_fix_pattern_guidance.sql
psql $DATABASE_URL -f database/migrations/20260109_fix_failure_tracking.sql
```

### P3: Run Full E2E Test

```bash
cd ~/CodePrjects/codequal/apps/api && npm run dev

cd ~/CodePrjects/codequal/packages/agents
MAX_ISSUES=5 LANG=java API_BASE_URL=http://localhost:3001 \
  npx ts-node tests/integration/test-v9-2tier-all-languages.ts
```

---

## Ralph-Inspired Fix Flow (New Architecture)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    RALPH-INSPIRED FIX FLOW                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Issues Detected → StoryDecomposer                               │
│        ↓                                                            │
│  2. Group into Fix Stories (related issues together)                │
│        ↓                                                            │
│  3. Initialize PRFixStateManager                                    │
│        ↓                                                            │
│  4. For each story (priority order):                                │
│     │                                                               │
│     ├─→ FRESH CONTEXT (new AI call)                                 │
│     │   • Full system prompt with KB guidance                       │
│     │   • Structured prior attempt summary                          │
│     │   • Cross-fix awareness                                       │
│     │   • Within-PR learnings                                       │
│     │                                                               │
│     ├─→ Generate Fix (AIFixerAgent)                                 │
│     │                                                               │
│     ├─→ Validate (tool re-validation)                               │
│     │                                                               │
│     └─→ [PASS] Complete story, add learning                         │
│         [FAIL] Mark failure, retry with fresh context (max 3x)      │
│                                                                     │
│  5. All stories processed → markComplete()                          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

Key Benefits:
• Fresh 200K context each attempt (no bloat)
• Resumable via state files (pr-fix-state.json)
• Related issues fixed together (stories)
• Accumulated learnings help later fixes
```

---

## Quick Test Commands

```bash
# Build check
cd ~/CodePrjects/codequal/packages/agents
npx tsc --skipLibCheck --noEmit

# Start API
cd ~/CodePrjects/codequal/apps/api && npm run dev

# Test Ralph workflow
~/.claude/scripts/codequal-ralph.sh 1

# Test with cost control (5 issues only)
cd ~/CodePrjects/codequal/packages/agents
MAX_ISSUES=5 LANG=java API_BASE_URL=http://localhost:3001 \
  npx ts-node tests/integration/test-v9-2tier-all-languages.ts

# Review KB failures
cd packages/agents/src/fix-agent/fix-pattern-registry
npx ts-node kb-review-cli.ts list
```

---

## Branch Status

```
Branch: fix/v9-tool-parsers
Last commit: 68df497b (feat(session-82): Implement A5 fresh context per fix attempt)
Uncommitted changes: None

Recent commits:
68df497b feat(session-82): Implement A5 fresh context per fix attempt
72a560e0 feat(session-82): Add Ralph-inspired state management for PR fixes
b66980c2 feat(session-81): Add fix pattern KB with AI-assisted maintenance
a8d7583b feat(session-80): Fix pattern reuse validation, add regression reporting
```

---

## Key Architecture Decisions (Session 82)

1. **Fresh Context Per Attempt**: Each fix attempt = new AI API call with full context
2. **Story Decomposition**: Related issues grouped for atomic processing
3. **Explicit State Machine**: pr-fix-state.json enables inspection and resumption
4. **Within-PR Learnings**: Insights accumulated during single PR session
5. **Cross-Fix Awareness**: Later fixes in same file know about earlier ones
6. **Structured Failure Summaries**: Concise "what to avoid" vs raw feedback
