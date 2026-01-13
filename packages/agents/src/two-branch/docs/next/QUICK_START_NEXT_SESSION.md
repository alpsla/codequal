# Quick Start - Next Session

**Last Updated**: Session 82 (January 12, 2026) - Complete
**Current Phase**: V9 Two-Branch Analysis - Ralph-Inspired State Management + Cross-Repo Learning
**Status**: All Session 82 tasks COMPLETED - Ready to test integrations

---

## Session 82 Summary

### What Was Built

**Part 1: Development Process Enhancement (Ralph)**
- `codequal-ralph.sh` - Autonomous iteration loop script
- `codequal-ralph-prompt.txt` - CodeQual-specific iteration instructions
- `RALPH_DEVELOPMENT_GUIDE.md` - 500+ line usage documentation

**Part 2: App Enhancement (Fix Flow)**
- `PRFixStateManager` - Explicit state tracking (pr-fix-state.json)
- `StoryDecomposer` - Group related issues into atomic fix stories
- `FreshContextFixService` - Fresh context per attempt (A5 pattern)
- `RepositoryLearningService` - Cross-repo learning system

### Key Architectural Changes

```
┌─────────────────────────────────────────────────────────────────────┐
│              ENHANCED FIX FLOW (Session 82)                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Issues Detected                                                 │
│        ↓                                                            │
│  2. StoryDecomposer → Group into Fix Stories                        │
│        ↓                                                            │
│  3. PRFixStateManager → Initialize State                            │
│        ↓                                                            │
│  4. For each story:                                                 │
│     │                                                               │
│     ├─→ FRESH CONTEXT (new AI call each attempt)                    │
│     │   • KB guidance (fix_pattern_guidance)                        │
│     │   • Repository learnings (same repo: 100%)                    │
│     │   • Cross-repo learnings (same org: 80%, language: 60%)       │
│     │   • Prior fixes in same file                                  │
│     │   • Within-PR learnings                                       │
│     │                                                               │
│     ├─→ Generate Fix → Validate → [PASS/FAIL]                       │
│     │                                                               │
│     └─→ Update state, accumulate learnings                          │
│                                                                     │
│  5. saveLearningsToRepository() → Persist to KB                     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Session 83 TODO: Test Both Integrations

### P0: Test Ralph Development Workflow (Part 1)

Create a simple test task and run the Ralph loop:

```bash
cd ~/CodePrjects/codequal

# 1. Create test task
cat > tasks.json << 'EOF'
{
  "feature": "Test Ralph workflow",
  "branchName": "test/ralph-workflow",
  "stories": [
    {
      "id": 1,
      "title": "Create test utility file",
      "description": "Create a simple TypeScript utility file in packages/core/src/utils/test-ralph.ts with a hello() function",
      "passes": false,
      "attempts": 0
    },
    {
      "id": 2,
      "title": "Add unit test",
      "description": "Add a Jest test for the hello() function",
      "passes": false,
      "attempts": 0
    }
  ]
}
EOF

# 2. Run Ralph (2 iterations should complete both stories)
~/.claude/scripts/codequal-ralph.sh 5

# 3. Verify completion
cat tasks.json | jq '.stories[] | {title, passes, attempts}'

# 4. Clean up test files after verification
git checkout -- . && rm -f tasks.json progress.txt
```

**Expected:**
- Ralph creates branch `test/ralph-workflow`
- Each iteration reads CLAUDE.md, creates/modifies files
- Stories marked `passes: true` after quality gates pass
- Progress tracked in `progress.txt`

### P1: Test Cross-Repo Learning System (Part 2)

Run the integration test to verify learnings are fetched and saved:

```bash
cd ~/CodePrjects/codequal/packages/agents

# 1. Ensure Supabase has the migration
# (or test with in-memory fallback)

# 2. Run a quick test to verify the learning service
cat > /tmp/test-repo-learnings.ts << 'EOF'
import { getRepositoryLearningService } from './src/fix-agent/state';

async function test() {
  const svc = getRepositoryLearningService();

  // Test framework detection
  const frameworks = svc.detectFrameworks([
    'src/main/java/Application.java',
    'pom.xml',
    'lombok.config'
  ]);
  console.log('Detected frameworks:', frameworks);

  // Test fetching learnings (will use in-memory seed data)
  const learnings = await svc.formatLearningsForPrompt({
    repository: 'github.com/spring-projects/spring-petclinic',
    organization: 'spring-projects',
    language: 'java',
    frameworks: ['spring-boot', 'lombok']
  });
  console.log('Learnings for prompt:', learnings.substring(0, 500));
}

test().catch(console.error);
EOF

npx ts-node /tmp/test-repo-learnings.ts
```

**Expected:**
- Frameworks detected: `['spring', 'lombok']`
- Learnings include seed data for Spring Boot and Lombok patterns

### P2: Test Full Fix Flow with Fresh Context

Run the 2-tier integration test with fresh context:

```bash
cd ~/CodePrjects/codequal/apps/api && npm run dev &

cd ~/CodePrjects/codequal/packages/agents
MAX_ISSUES=3 LANG=java API_BASE_URL=http://localhost:3001 \
  npx ts-node tests/integration/test-v9-2tier-all-languages.ts
```

**Expected:**
- Issues grouped into stories
- Fresh context built for each attempt
- Repository learnings included in AI prompts
- Learnings saved after completion

### P3: Apply Database Migrations

```bash
# Fix pattern guidance (Session 81)
psql $DATABASE_URL -f database/migrations/20260109_fix_pattern_guidance.sql
psql $DATABASE_URL -f database/migrations/20260109_seed_fix_pattern_guidance.sql
psql $DATABASE_URL -f database/migrations/20260109_fix_failure_tracking.sql

# Repository learnings (Session 82)
psql $DATABASE_URL -f database/migrations/20260112_repository_learnings.sql
```

### P4: Integrate FreshContextFixService with v9-analyze.ts

After testing, integrate with the main API:

```typescript
// In apps/api/src/routes/v9-analyze.ts PRO tier section
import {
  FreshContextFixService,
  getRepositoryLearningService
} from '@codequal/agents/fix-agent/state';

// Detect frameworks
const repoLearnings = getRepositoryLearningService();
const frameworks = repoLearnings.detectFrameworks(changedFiles);

// Create fix service
const fixService = new FreshContextFixService(
  prUrl, prNumber, repository, language,
  {
    maxAttemptsPerStory: 3,
    repositoryInfo: { organization, frameworks },
    generateFix: async (context) => { /* use AIFixerAgent */ },
    validateFix: async (fixCode, issues) => { /* use verifier */ },
  }
);
```

---

## Files Created Session 82

```
Part 1 (Process Enhancement):
~/.claude/prompts/codequal-ralph-prompt.txt
~/.claude/scripts/codequal-ralph.sh
docs/development/RALPH_DEVELOPMENT_GUIDE.md
CLAUDE.md (updated with Ralph section)

Part 2 (App Enhancement):
packages/agents/src/fix-agent/state/
├── index.ts              - Exports all components
├── pr-fix-state.ts       - PRFixStateManager
├── story-decomposer.ts   - StoryDecomposer
├── fresh-context-fixer.ts - FreshContextFixService
├── repository-learnings.ts - RepositoryLearningService
└── example-integration.ts - Usage examples

database/migrations/
└── 20260112_repository_learnings.sql - Cross-repo learning schema
```

---

## Key Architecture Components

### Knowledge Base Hierarchy

```
┌─────────────────────────────────────────────────────────────────────┐
│                      KNOWLEDGE BASE LAYERS                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Layer 1: fix_pattern_guidance (Session 81)                         │
│    • Rule-specific anti-patterns and correct patterns               │
│    • Applies to ALL repositories using that rule                    │
│    • Updated via /maintain-kb or kb-ai-maintainer.ts                │
│                                                                     │
│  Layer 2: repository_learnings (Session 82)                         │
│    • Repository-specific insights                                   │
│    • Cross-repo sharing by org/language/framework                   │
│    • Confidence-weighted (same repo 100%, same org 80%, etc.)       │
│                                                                     │
│  Layer 3: PR learnings (pr-learnings.json)                          │
│    • Within-PR accumulated insights                                 │
│    • Promoted to Layer 2 after successful session                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Confidence Weights for Cross-Repo Sharing

| Source | Weight | Shareable |
|--------|--------|-----------|
| Same Repository | 100% | All learnings |
| Same Organization | 80% | `cross_repo_shareable = true` |
| Same Language | 60% | `confidence >= 70` |
| Same Framework | 60% | `confidence >= 70` |

---

## Quick Reference Commands

```bash
# Build check
cd ~/CodePrjects/codequal/packages/agents
npx tsc --skipLibCheck --noEmit

# Run Ralph workflow
~/.claude/scripts/codequal-ralph.sh 5

# Test repository learnings
npx ts-node -e "
  const { getRepositoryLearningService } = require('./src/fix-agent/state');
  const svc = getRepositoryLearningService();
  console.log(svc.detectFrameworks(['pom.xml', '@Autowired']));
"

# Start API
cd ~/CodePrjects/codequal/apps/api && npm run dev

# Run integration test
cd ~/CodePrjects/codequal/packages/agents
MAX_ISSUES=3 LANG=java API_BASE_URL=http://localhost:3001 \
  npx ts-node tests/integration/test-v9-2tier-all-languages.ts

# Review KB failures
cd packages/agents/src/fix-agent/fix-pattern-registry
npx ts-node kb-review-cli.ts list
```

---

## Branch Status

```
Branch: fix/v9-tool-parsers
Last commit: bbc437b6 (feat(session-82): Add cross-repo learning system for KB)

Session 82 Commits:
bbc437b6 feat(session-82): Add cross-repo learning system for KB
68df497b feat(session-82): Implement A5 fresh context per fix attempt
72a560e0 feat(session-82): Add Ralph-inspired state management for PR fixes
```

---

## Architecture Decisions (Session 82)

1. **Fresh Context Per Attempt**: Each fix = new AI API call with full 200K context
2. **Story Decomposition**: Related issues grouped for atomic processing
3. **Explicit State Machine**: pr-fix-state.json enables inspection and resumption
4. **Three-Layer KB**: Global patterns → Repo learnings → PR learnings
5. **Cross-Repo Sharing**: Confidence-weighted by similarity
6. **Framework Detection**: Auto-detect from file patterns
7. **Structured Failures**: Concise "what to avoid" vs raw feedback
