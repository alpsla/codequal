# Spec Tasks

Tasks for implementing Fresh Context Fix Flow Integration.

## Quality Gates (Must Pass Before Each Story Complete)

```bash
turbo run build
turbo run typecheck
cd packages/agents && npx ts-node tests/integration/test-fix-flow-framework-e2e.ts
```

## Tasks

- [ ] 1. Verify E2E test framework passes with mocks
  - [ ] 1.1 Run `test-fix-flow-framework-e2e.ts` and verify all 6 tests pass
  - [ ] 1.2 Fix any import/type errors in the test file
  - [ ] 1.3 Verify story decomposition creates expected groups
  - [ ] 1.4 Verify fresh context is built correctly per attempt
  - [ ] 1.5 Run quality gates: build, typecheck

- [ ] 2. Apply database migrations
  - [ ] 2.1 Verify migration files exist in `database/migrations/`
  - [ ] 2.2 Apply `20260109_fix_pattern_guidance.sql`
  - [ ] 2.3 Apply `20260109_seed_fix_pattern_guidance.sql`
  - [ ] 2.4 Apply `20260109_fix_failure_tracking.sql`
  - [ ] 2.5 Apply `20260112_repository_learnings.sql`
  - [ ] 2.6 Verify tables exist in database
  - [ ] 2.7 Run quality gates: build, typecheck

- [ ] 3. Create generateFixesWithFreshContext function
  - [ ] 3.1 Add imports for FreshContextFixService at top of v9-analyze.ts
  - [ ] 3.2 Create `generateFixesWithFreshContext` function (~line 2031)
  - [ ] 3.3 Implement issue conversion to FreshContextIssue format
  - [ ] 3.4 Initialize FreshContextFixService with config
  - [ ] 3.5 Wire generateFix callback to AIFixerAgent
  - [ ] 3.6 Wire validateFix callback to verifier
  - [ ] 3.7 Call processAllStories and saveLearningsToRepository
  - [ ] 3.8 Return fixes in expected format
  - [ ] 3.9 Run quality gates: build, typecheck, E2E test

- [ ] 4. Replace generateFixesWithHybridAgents call
  - [ ] 4.1 Locate call site (~line 711 in runAnalysis)
  - [ ] 4.2 Replace with generateFixesWithFreshContext
  - [ ] 4.3 Add session info to response
  - [ ] 4.4 Handle partial failure warnings
  - [ ] 4.5 Run quality gates: build, typecheck, E2E test

- [ ] 5. Integration test with real API
  - [ ] 5.1 Start API server: `cd apps/api && npm run dev`
  - [ ] 5.2 Run 2-tier test with Java: `LANG=java MAX_ISSUES=3 API_BASE_URL=http://localhost:3001 npx ts-node tests/integration/test-v9-2tier-all-languages.ts`
  - [ ] 5.3 Verify PRO tier uses fresh context (check logs)
  - [ ] 5.4 Verify learnings are saved (check database)
  - [ ] 5.5 Run quality gates: build, typecheck, E2E test
