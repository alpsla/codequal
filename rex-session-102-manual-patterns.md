# Session 102: Create Manual Patterns for Failing Rules

## Context
Six rules are failing in the AI fixer. We need to add manual patterns to `fix-pattern-guidance.ts` to provide proper fix guidance.

Reference file: `/Users/alpinro/CodePrjects/codequal/packages/agents/src/fix-agent/fix-pattern-registry/fix-pattern-guidance.ts`

---

### 1. Add UselessParentheses pattern (PMD/Java)
**Goal**: Add manual pattern for PMD's UselessParentheses rule
**File**: `packages/agents/src/fix-agent/fix-pattern-registry/fix-pattern-guidance.ts`
**Steps**:
1. Add entry to FALLBACK_GUIDANCE Map with key `UselessParentheses:java:pmd`
2. Include antiPatterns showing redundant parentheses like `return (x);`, `if ((a == b))`
3. Include correctPatterns showing clean versions without unnecessary parentheses
4. Add promptAdditions with clear instructions to remove only truly unnecessary parentheses while preserving those needed for operator precedence

---

### 2. Add F632 pattern (Ruff/Python)
**Goal**: Add manual pattern for Ruff's F632 rule (use `==` to compare to literals)
**File**: `packages/agents/src/fix-agent/fix-pattern-registry/fix-pattern-guidance.ts`
**Steps**:
1. Add entry to FALLBACK_GUIDANCE Map with key `F632:python:ruff`
2. Include antiPatterns showing `is` comparisons with literals like `x is ""`, `x is 0`, `x is None` (None is ok with is)
3. Include correctPatterns showing proper `==` comparisons for strings/numbers
4. Add promptAdditions explaining that `is` checks identity while `==` checks equality, and literals should use `==` except for None/True/False

---

### 3. Add @typescript-eslint/no-explicit-any pattern (ESLint/TypeScript)
**Goal**: Add manual pattern for ESLint's no-explicit-any rule
**File**: `packages/agents/src/fix-agent/fix-pattern-registry/fix-pattern-guidance.ts`
**Steps**:
1. Add entry to FALLBACK_GUIDANCE Map with key `@typescript-eslint/no-explicit-any:typescript:eslint`
2. Include antiPatterns showing `any` type usage like `function foo(x: any)`, `const data: any`
3. Include correctPatterns showing proper typing with `unknown`, generics, or specific types
4. Add promptAdditions explaining when to use `unknown` vs specific types vs generics

---

### 4. Add AvoidDollarSigns pattern (PMD/Java)
**Goal**: Add manual pattern for PMD's AvoidDollarSigns rule
**File**: `packages/agents/src/fix-agent/fix-pattern-registry/fix-pattern-guidance.ts`
**Steps**:
1. Add entry to FALLBACK_GUIDANCE Map with key `AvoidDollarSigns:java:pmd`
2. Include antiPatterns showing identifiers with `$` like `int $count`, `String my$var`
3. Include correctPatterns showing clean naming without dollar signs
4. Add promptAdditions noting that `$` is typically reserved for generated code and inner class references

---

### 5. Add UnnecessaryAnnotationValueElement pattern (PMD/Java)
**Goal**: Add manual pattern for PMD's UnnecessaryAnnotationValueElement rule
**File**: `packages/agents/src/fix-agent/fix-pattern-registry/fix-pattern-guidance.ts`
**Steps**:
1. Add entry to FALLBACK_GUIDANCE Map with key `UnnecessaryAnnotationValueElement:java:pmd`
2. Include antiPatterns showing explicit `value=` when it's the only element: `@SuppressWarnings(value="unchecked")`
3. Include correctPatterns showing shorthand: `@SuppressWarnings("unchecked")`
4. Add promptAdditions explaining when `value=` is necessary (multiple elements) vs unnecessary

---

### 6. Add UseUtilityClass pattern (PMD/Java)
**Goal**: Add manual pattern for PMD's UseUtilityClass rule
**File**: `packages/agents/src/fix-agent/fix-pattern-registry/fix-pattern-guidance.ts`
**Steps**:
1. Add entry to FALLBACK_GUIDANCE Map with key `UseUtilityClass:java:pmd`
2. Include antiPatterns showing utility class without private constructor
3. Include correctPatterns showing final class with private constructor
4. Add promptAdditions explaining utility class pattern: final class + private constructor + static methods only

---

### 7. Run validation tests
**Goal**: Verify patterns compile and integrate correctly
**Steps**:
1. Run TypeScript compilation: `npm run build -w packages/agents`
2. Check for any type errors in the guidance file
3. Verify the patterns are syntactically correct

---

### 8. Test AI Fixer integration
**Goal**: Verify patterns are loaded and used by the fixer
**Steps**:
1. Check that FixPatternGuidance class loads the new patterns
2. Verify getGuidance() returns correct data for each new rule
3. Document any issues found for future improvement
