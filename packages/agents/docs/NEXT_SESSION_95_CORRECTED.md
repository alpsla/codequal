# Session 95: Test-First KB Pattern Creation

**Principle**: Only create KB patterns for rules where AI fixer FAILS. Don't pre-create patterns.

## Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                  TEST-FIRST APPROACH                        │
├─────────────────────────────────────────────────────────────┤
│  1. Select high-volume rule (e.g., no-console)              │
│  2. Create 5-10 test samples                                │
│  3. Run AI fixer WITHOUT KB pattern                         │
│  4. Record results:                                         │
│     ├── PASS → Mark rule as "AI-handles-without-KB"         │
│     └── FAIL → Create KB pattern from failure analysis      │
│  5. If pattern created, re-test to confirm improvement      │
└─────────────────────────────────────────────────────────────┘
```

## Why Session 94 Added Patterns for Successes

In Session 94, we added patterns for rules that PASSED. This was for:
- **Consistency**: Ensure future fixes follow same pattern
- **Confidence**: Higher confidence scores with explicit guidance
- **Speed**: Less AI reasoning needed with guidance

But the user is right - we should FIRST test untested rules before creating patterns.

---

## Task Queue for Session 95

### Phase 1: Test Untested High-Volume Rules

#### Task 1: Test no-console WITHOUT KB (2,588 issues)

**Goal**: Determine if AI can fix no-console without KB guidance

**Steps**:
1. Create 10 no-console samples from packages/agents/src
2. Run AI fixer on each sample WITHOUT KB pattern
3. Validate fixes by re-running ESLint
4. Record: pass/fail, confidence, fix quality

**Expected Outcomes**:
- If ≥80% pass → No KB pattern needed
- If <80% pass → Analyze failures, create KB pattern

#### Task 2: Test LongVariable WITHOUT KB (155 issues)

Same approach - test first, pattern only if fails.

#### Task 3: Test LinguisticNaming WITHOUT KB (45 issues)

Same approach.

#### Task 4: Test AvoidReassigningParameters WITHOUT KB (26 issues)

Same approach.

#### Task 5: Test AvoidDuplicateLiterals WITHOUT KB (21 issues)

Same approach.

---

### Phase 2: Create Patterns ONLY for Failures

#### Task 6: Create KB Patterns for Failed Rules

For each rule that failed in Phase 1:
1. Analyze failure patterns (what went wrong?)
2. Extract anti-patterns from bad fixes
3. Extract correct patterns from manual fixes
4. Add to KB
5. Re-test to confirm improvement

---

### Phase 3: Document Results

#### Task 7: Generate Test-First Report

**Output**: `ai-fixer-rule-coverage.json`

```json
{
  "testedRules": [
    {
      "rule": "no-console",
      "tool": "eslint",
      "volume": 2588,
      "aiSuccessWithoutKB": "85%",
      "kbPatternNeeded": false,
      "notes": "AI handles logging replacement well"
    },
    {
      "rule": "LongVariable",
      "tool": "pmd",
      "volume": 155,
      "aiSuccessWithoutKB": "60%",
      "kbPatternNeeded": true,
      "failureReason": "AI shortens too aggressively, loses meaning",
      "patternCreated": true
    }
  ]
}
```

---

## Key Principle

> **"Test first, pattern second"**
>
> Don't assume AI needs help. Test it first. Only create KB patterns when there's evidence of failure.

---

## Questions to Answer

1. **Does AI fixer handle no-console without KB?** (2,588 issues at stake)
2. **Does AI fixer handle LongVariable without KB?** (155 issues)
3. **Which rules actually NEED KB patterns?**

---

## Session 94 Learnings

The 5 patterns we added in Session 94 came from SUCCESSFUL fixes. This is valid for:
- Ensuring consistency
- Documenting the "right way"
- Reducing AI variability

But for UNTESTED rules, we must test first before creating patterns.
