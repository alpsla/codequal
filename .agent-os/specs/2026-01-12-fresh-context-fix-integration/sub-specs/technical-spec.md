# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2026-01-12-fresh-context-fix-integration/spec.md

## Technical Requirements

### Component Integration Points

1. **Replace `generateFixesWithHybridAgents`** in `apps/api/src/routes/v9-analyze.ts`
   - Current: Direct AIFixerAgent calls with pattern matching
   - New: FreshContextFixService wrapping AIFixerAgent with:
     - Story decomposition
     - Fresh context per attempt
     - State persistence
     - Repository learnings

2. **State Directory Configuration**
   - State files: `pr-fix-state.json`, `pr-learnings.json`
   - Location: Per-analysis temp directory or `/tmp/codequal-fixes/{analysisId}/`
   - Cleanup: After successful completion, retain on failure for resume

3. **Repository Learning Integration**
   - Detect frameworks from changed file paths
   - Fetch learnings matching: repo > org > language > framework
   - Include in AI prompt via `toolContext.bestPractices`

### Data Flow

```
v9-analyze.ts (PRO tier)
    │
    ├─→ Detect language/frameworks from PR files
    │
    ├─→ Initialize FreshContextFixService
    │     ├── prUrl, prNumber, repository, language
    │     ├── config.repositoryInfo (org, frameworks)
    │     ├── config.generateFix → AIFixerAgent.processIssue()
    │     └── config.validateFix → AIFixerVerifier.verifyAndSubmit()
    │
    ├─→ fixService.initialize(issues)
    │     └── StoryDecomposer groups issues into stories
    │
    ├─→ fixService.processAllStories()
    │     │
    │     └── For each story (fresh context per attempt):
    │           ├── Fetch KB guidance
    │           ├── Fetch repository learnings
    │           ├── Fetch within-PR learnings
    │           ├── Generate fix (new AI call)
    │           ├── Validate fix
    │           ├── Retry up to 3x if failed
    │           └── Save state after each attempt
    │
    ├─→ fixService.saveLearningsToRepository()
    │     └── Persist valuable insights to KB
    │
    └─→ Return fixed issues with metadata
```

### Interface Requirements

```typescript
// In v9-analyze.ts PRO tier section
import {
  FreshContextFixService,
  FreshContextIssue,
  getRepositoryLearningService
} from '@codequal/agents/fix-agent/state';

// Convert tool issues to FreshContextIssue format
interface FreshContextIssue {
  id: string;
  ruleId: string;
  file: string;
  line: number;
  column?: number;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  codeContext?: string;
  language: string;
  tool: string;
}

// Config for the service
const fixService = new FreshContextFixService(
  prUrl, prNumber, repository, language,
  {
    maxAttemptsPerStory: 3,
    stateDir: `/tmp/codequal-fixes/${analysisId}`,
    repositoryInfo: { organization, frameworks },
    generateFix: async (context) => { /* AIFixerAgent */ },
    validateFix: async (fixCode, issues) => { /* verifier */ },
  }
);
```

### Error Handling

1. **Generation Failure**: Mark story as failed, continue to next
2. **Validation Failure**: Retry with structured feedback (up to 3x)
3. **Service Crash**: State persisted, can resume on next request
4. **Timeout**: Partial progress saved, resume supported

### Performance Considerations

- Story decomposition: O(n log n) - one-time grouping
- Fresh context per attempt: ~2-5 seconds per AI call
- Max 3 attempts per story: Bounded retry cost
- State file I/O: Minimal, JSON serialization

## Quality Gates (Ralph Requirements)

All gates must pass before each story is marked complete:

```bash
# Gate 1: Build
turbo run build

# Gate 2: Type check
turbo run typecheck

# Gate 3: Lint (optional but recommended)
turbo run lint

# Gate 4: E2E Test (mock)
cd packages/agents
npx ts-node tests/integration/test-fix-flow-framework-e2e.ts

# Gate 5: Integration Test (real API, run manually after all stories)
# Requires: API running, database migrations applied
```

## Files to Modify

| File | Change |
|------|--------|
| `apps/api/src/routes/v9-analyze.ts` | Replace `generateFixesWithHybridAgents` call with FreshContextFixService |
| `packages/agents/src/fix-agent/state/index.ts` | Already complete (Session 82) |
| `database/migrations/*.sql` | Apply pending migrations |

## Files to Create

| File | Purpose |
|------|---------|
| None | All components already exist from Session 82 |
