# Session 95: KB Auto-Filling via AI Fixer

**Goal**: Run AI fixer on Java repositories to auto-populate KB. No rule filtering - try ALL issues. Failures auto-tracked for later manual review.

## Principle

```
AI fixer tries ALL issues
    ├── SUCCESS → Pattern auto-added to KB ✅
    └── FAILURE → Auto-tracked in fix_failure_tracking table 📋
                  (We'll manually create patterns for these later)
```

---

## Task 1: Run AI Fixer on Apache Commons-Lang (Universal Java)

**Repository**: `apache/commons-lang`
**Expected Issues**: 500-1000
**Why First**: Most downloaded Java library, universal patterns

**Steps**:
1. Clone apache/commons-lang
2. Run PMD to collect ALL issues (no filtering)
3. Run AI fixer with auto-learning enabled
4. Record: total issues, AI success count, failures tracked
5. Save results to `kb-filling-results-commons-lang.json`

**Success Criteria**:
- AI success rate > 70%
- Patterns auto-added to KB
- Failures tracked in DB

---

## Task 2: Run AI Fixer on Apache Commons-Collections

**Repository**: `apache/commons-collections`
**Expected Issues**: 300-600
**Why**: Heavily used collections utilities, different patterns than commons-lang

**Steps**:
1. Clone apache/commons-collections
2. Run PMD on ALL files
3. Run AI fixer (auto-learning enabled)
4. Record results

---

## Task 3: Run AI Fixer on Spring PetClinic

**Repository**: `spring-projects/spring-petclinic`
**Expected Issues**: 100-300
**Why**: Reference Spring Boot application, Spring-specific patterns

**Steps**:
1. Clone spring-petclinic
2. Run PMD on ALL files
3. Run AI fixer (auto-learning enabled)
4. Record results
5. Note any Spring-specific failures for manual patterns

---

## Task 4: Run AI Fixer on Google Guava

**Repository**: `google/guava`
**Expected Issues**: 1000+
**Why**: Widely used utility library, high-quality codebase

**Steps**:
1. Clone google/guava
2. Run PMD on ALL files (limit 200 for time)
3. Run AI fixer (auto-learning enabled)
4. Record results

---

## Task 5: Analyze Failure Patterns

**Goal**: Review what AI failed to fix

**Steps**:
1. Query fix_failure_tracking table for failures with count >= 3
2. Group failures by ruleId
3. Identify top 10 rules AI struggles with
4. Create `failures-needing-manual-patterns.json`
5. Document which rules need manual KB patterns

---

## Task 6: Generate KB Coverage Report

**Goal**: Document current KB state after auto-filling

**Steps**:
1. Count total patterns in KB (Supabase + fallback)
2. List rules with patterns vs without
3. Calculate coverage by:
   - Universal Java rules
   - Spring-specific rules
   - Volume-weighted coverage
4. Create `kb-coverage-report-session-95.md`

---

## Expected Outcomes

| Metric | Target |
|--------|--------|
| Repositories processed | 4 |
| Total issues attempted | 1500+ |
| AI success rate | >70% |
| Patterns auto-added | 50+ |
| Failures tracked | <30% |

---

## Key Commands

```bash
# Task 1: Commons-Lang
cd packages/agents
npx ts-node tests/integration/run-ai-fixer-batch.ts --repo apache/commons-lang --limit 200

# Task 2: Commons-Collections
npx ts-node tests/integration/run-ai-fixer-batch.ts --repo apache/commons-collections --limit 200

# Task 3: Spring PetClinic
npx ts-node tests/integration/run-ai-fixer-batch.ts --repo spring-projects/spring-petclinic --limit 100

# Task 4: Google Guava
npx ts-node tests/integration/run-ai-fixer-batch.ts --repo google/guava --limit 200

# Task 5: Check failures
npx ts-node src/fix-agent/fix-pattern-registry/kb-review-cli.ts list
```

---

## Notes

- **No rule filtering** - AI tries everything
- **Auto-learning enabled** - successful fixes auto-add to KB
- **Failures tracked** - we'll manually create patterns for these in Session 96
- **Limit per repo** - 200 issues max to keep session manageable
