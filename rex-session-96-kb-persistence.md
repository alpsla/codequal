# Session 96: KB Pattern Persistence Fix & Expansion

**Goal**: Fix the bug where patterns are NOT persisted to Supabase. Then expand KB with more repositories.

## Problem Found in Session 95

```
processIssue() generates fixes but NEVER calls validateAndSubmitFix()
→ Patterns are NOT persisted to Supabase
→ Session 95 added 0 patterns (should have been ~192)
```

## Fix Strategy

```
processIssue()
    ├── Generate fix recommendation
    ├── [NEW] If submitToRegistry=true:
    │       └── Call validateAndSubmitFix()
    │           └── Persists to Supabase
    └── Return enriched issue
```

---

## Task 1: Fix processIssue to persist patterns

**File**: `packages/agents/src/fix-agent/agents/ai-fixer-agent.ts`

After generating fix (around line 265), add:
```typescript
// SESSION 96: Persist successful fixes to KB
if (this.submitToRegistry && recommendation.confidence >= 70) {
  try {
    await this.validateAndSubmitFix(issue, recommendation);
  } catch (e) {
    console.log(`[AI-Fixer] Pattern submission failed (non-blocking): ${e.message}`);
  }
}
```

---

## Task 2: Test with small batch (5 issues)

```bash
# Before
npx ts-node tests/integration/count-kb.ts  # Should show 4 patterns

# Run small batch
npx ts-node tests/integration/run-ai-fixer-batch.ts --repo apache/commons-lang --limit 5

# After
npx ts-node tests/integration/count-kb.ts  # Should show ~9 patterns
```

**Success**: Pattern count increases

---

## Task 3-6: Expand to more repositories

| Task | Repository | Issues | Expected Patterns |
|------|------------|--------|-------------------|
| 3 | apache/commons-io | 100 | 80+ |
| 4 | spring-projects/spring-boot | 100 | 80+ |
| 5 | apache/kafka | 100 | 70+ |
| 6 | elastic/elasticsearch | 100 | 70+ |

---

## Task 7: Generate KB statistics

Query Supabase:
```sql
SELECT rule_id, COUNT(*) as count
FROM fix_pattern_guidance
GROUP BY rule_id
ORDER BY count DESC;
```

---

## Task 8: Test real PR with KB

Run V9 E2E and verify:
- "KB bypass" messages appear
- "Found knowledge base guidance" messages appear
- AI call count is reduced

---

## Expected Outcomes

| Metric | Target |
|--------|--------|
| Patterns in DB | 100+ |
| Unique rules | 30+ |
| Persistence working | ✅ |
| Real PR test passes | ✅ |

---

## Commands

```bash
# Task 1: After fix, build
cd packages/agents && npm run build

# Task 2: Small test
npx ts-node tests/integration/run-ai-fixer-batch.ts --repo apache/commons-lang --limit 5
npx ts-node tests/integration/count-kb.ts

# Tasks 3-6: Full batches
npx ts-node tests/integration/run-ai-fixer-batch.ts --repo apache/commons-io --limit 100
npx ts-node tests/integration/run-ai-fixer-batch.ts --repo spring-projects/spring-boot --limit 100
npx ts-node tests/integration/run-ai-fixer-batch.ts --repo apache/kafka --limit 100
npx ts-node tests/integration/run-ai-fixer-batch.ts --repo elastic/elasticsearch --limit 100

# Task 7: Stats
npx ts-node tests/integration/count-kb.ts

# Task 8: Real PR test
npx ts-node test-v9-e2e-complete.ts
```
