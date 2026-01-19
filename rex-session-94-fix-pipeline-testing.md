# Session 94: Fix Pipeline E2E Testing

## Goal
Test the complete fix pipeline: Scan → Fix → Re-validate for all tool tiers.

## Current Status
- Two-branch scanning: ✅ Working
- Issue categorization: ✅ Working
- Tier 1 native fixers: ⚠️ Untested with real code
- Tier 2 dedicated fixers: ⚠️ Mocks only
- Tier 3 AI fixer: ⚠️ Dry-run only
- Re-validation loop: ❌ Never tested

## Test Matrix

| Tier | Tool | Fixer | Test Repo | Expected |
|------|------|-------|-----------|----------|
| 1 | ESLint | `--fix` | TypeScript repo | Auto-fix style issues |
| 1 | Semgrep | `--autofix` | Security repo | Auto-fix security patterns |
| 2 | PMD | Sorald | apache/commons-io | Fix CloseResource, etc. |
| 2 | Checkstyle | google-java-format | Java repo | Fix formatting |
| 3 | JDepend | AI + KB | spring-petclinic | Generate architecture guidance |
| 3 | graphql-cop | AI + KB | Netflix DGS | Generate config fixes |

---

### 1. Test Tier 1: ESLint Native Fix
**Goal**: Verify ESLint `--fix` works end-to-end
**Steps**:
1. Find/create TypeScript file with ESLint violations
2. Run ESLint to detect issues
3. Run ESLint with `--fix` flag
4. Re-run ESLint to confirm issues resolved
5. Document before/after issue counts
**Files**: packages/agents/src/fix-agent/tool-fixers/tier1-executor.ts

### 2. Test Tier 1: Semgrep Native Fix
**Goal**: Verify Semgrep `--autofix` works end-to-end
**Steps**:
1. Create test file with security pattern (e.g., hardcoded secret)
2. Run Semgrep to detect issue
3. Run Semgrep with `--autofix`
4. Re-run Semgrep to confirm fix worked
5. Verify no regressions introduced
**Files**: packages/agents/src/fix-agent/tool-fixers/tier1-executor.ts

### 3. Test Tier 2: Sorald for PMD Issues
**Goal**: Verify Sorald fixes PMD violations on real Java code
**Steps**:
1. Clone apache/commons-io (has PMD issues)
2. Run PMD to get baseline issues
3. Run Sorald to fix issues (CloseResource, EmptyCatchBlock, etc.)
4. Re-run PMD to count resolved issues
5. Document which rules Sorald successfully fixed
**Files**: packages/agents/src/fix-agent/tool-fixers/tier2-executor.ts

### 4. Implement & Test google-java-format for Checkstyle
**Goal**: Create executor for Checkstyle fixes and test it
**Steps**:
1. Check if google-java-format is installed
2. Implement executor in tier2-executor.ts if missing
3. Find Java file with Checkstyle violations
4. Run Checkstyle to detect issues
5. Run google-java-format to fix formatting
6. Re-run Checkstyle to confirm fixes
**Files**: packages/agents/src/fix-agent/tool-fixers/tier2-executor.ts

### 5. Test Tier 3: AI Fixer with KB Guidance
**Goal**: Verify AI fixer uses KB patterns and generates valid fixes
**Steps**:
1. Get PMD issue that Sorald can't fix (e.g., LooseCoupling)
2. Fetch KB guidance for the rule
3. Generate AI fix with KB context
4. Apply fix to code
5. Re-run PMD to validate fix worked
6. Check for regressions
**Files**: packages/agents/src/fix-agent/ai-fixer-agent.ts

### 6. Test Tool Re-validation Loop
**Goal**: Verify the re-validation flow works correctly
**Steps**:
1. Read tool-revalidator.ts to understand the flow
2. Create test that applies a fix
3. Invoke re-validation with original tool
4. Verify pass/fail detection works
5. Test regression detection (new issues after fix)
**Files**: packages/agents/src/fix-agent/fix-pattern-registry/tool-revalidator.ts

### 7. Test Full Pipeline: Scan → Fix → Re-validate
**Goal**: End-to-end test of complete fix flow
**Steps**:
1. Clone test repo with known issues (multiple tools)
2. Run full V9 scan on both branches
3. Trigger fix pipeline for NEW issues
4. Verify Tier 1 → Tier 2 → Tier 3 routing
5. Confirm all fixable issues were attempted
6. Re-run tools to validate fixes
7. Generate fix effectiveness report
**Files**: packages/agents/tests/integration/

### 8. Create Fix Pipeline Test Suite
**Goal**: Formalize tests for CI/CD
**Steps**:
1. Create test-fix-pipeline-e2e.ts
2. Add test cases for each tier
3. Add test cases for re-validation
4. Add regression detection tests
5. Document expected fix rates per tool
**Files**: packages/agents/tests/integration/test-fix-pipeline-e2e.ts

---

## Success Criteria
- [ ] Tier 1: ESLint --fix resolves 70%+ of style issues
- [ ] Tier 1: Semgrep --autofix resolves detected security patterns
- [ ] Tier 2: Sorald fixes at least 3 PMD rule types
- [ ] Tier 2: google-java-format fixes Checkstyle formatting issues
- [ ] Tier 3: AI fixer generates valid code for KB-guided rules
- [ ] Re-validation: Tool confirms fix worked (0 issues for fixed item)
- [ ] Regression: No new issues introduced by fixes
- [ ] Full Pipeline: Complete flow works for mixed-tool PR

## Test Repositories

| Tool | Repository | Why |
|------|------------|-----|
| ESLint | Any TS project | Style violations |
| Semgrep | OWASP test files | Security patterns |
| PMD/Sorald | apache/commons-io | Known PMD issues |
| Checkstyle | spring-petclinic | Java formatting |
| JDepend | spring-petclinic | Architecture issues |
| graphql-cop | Netflix/dgs-examples | GraphQL config |
