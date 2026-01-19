# Session 105: E2E Validation of Tier 2 Native Fixers

## Context
Session 104 installed and tested all missing native fixer tools:
- clang-tidy (C/C++ modernization)
- dotnet-format (C# formatting)
- Sorald (Java SonarQube rules)
- OpenRewrite (documented)

**All 16 tier 2 tools are now available and tested locally.**

This session validates the complete fix-agent pipeline end-to-end.

---

### 1. Run E2E Tests for Python Fixers
**Goal**: Validate ruff, black, isort, autoflake work in the pipeline
**Steps**:
1. Create test Python file with multiple issues (F401, F632, formatting)
2. Run fix-agent pipeline targeting the file
3. Verify tier 2 tools are invoked before AI
4. Check fixed output matches expected

---

### 2. Run E2E Tests for Go Fixers
**Goal**: Validate gofmt, goimports, golangci-lint work in the pipeline
**Steps**:
1. Create test Go file with formatting and unused imports
2. Run fix-agent pipeline
3. Verify goimports removes unused imports
4. Verify formatting is corrected

---

### 3. Run E2E Tests for Java Fixers
**Goal**: Validate google-java-format and Sorald work
**Steps**:
1. Create test Java file with formatting issues + SonarQube violations
2. Run fix-agent pipeline
3. Verify google-java-format fixes formatting
4. Verify Sorald fixes S1155, S1132 rules
5. Verify PMD rules fall through to AI tier

---

### 4. Run E2E Tests for C++ Fixers
**Goal**: Validate clang-format and clang-tidy work
**Steps**:
1. Create test C++ file with formatting + modernization issues
2. Run fix-agent pipeline
3. Verify clang-tidy modernize-* checks are applied
4. Document any SDK path requirements for CI

---

### 5. Run E2E Tests for C# Fixers
**Goal**: Validate dotnet-format works
**Steps**:
1. Create test C# project with formatting issues
2. Run fix-agent pipeline
3. Verify dotnet-format fixes formatting
4. Note: requires .csproj context

---

### 6. Run E2E Tests for TypeScript Fixers
**Goal**: Validate ESLint --fix works
**Steps**:
1. Create test TypeScript file with fixable ESLint issues
2. Run fix-agent pipeline
3. Verify ESLint fixes what it can
4. Verify @typescript-eslint/no-explicit-any falls to AI tier

---

### 7. Test Against Real PR on Cloud Instance
**Goal**: Validate full pipeline on production-like environment
**Steps**:
1. Deploy to cloud instance (or use existing staging)
2. Find/create a real PR with code quality issues
3. Run fix-agent against the PR
4. Verify tier 1 → tier 2 → tier 3 cascade works
5. Document any cloud-specific configuration needed

---

### 8. Monitor Supabase Pattern Storage
**Goal**: Verify new patterns are saved correctly
**Steps**:
1. Run fixes that should create new patterns
2. Query Supabase for recently created patterns
3. Verify pattern structure is correct
4. Check success_rate tracking works

---

### 9. Integration Test: Full Fix Pipeline
**Goal**: Single test covering all tiers
**Steps**:
1. Create multi-language repo with issues across all languages
2. Run comprehensive fix-agent test
3. Verify:
   - Tier 1 cache hits work
   - Tier 2 native tools are invoked
   - Tier 3 AI is used only when needed
4. Measure API call savings vs all-AI approach

---

### 10. Update Documentation with E2E Results
**Goal**: Document test coverage and any issues found
**Steps**:
1. Create E2E_TEST_RESULTS.md with test outcomes
2. Document any tool-specific quirks discovered
3. Update TIER2_FIXER_MATRIX.md if needed
4. Add E2E test commands to CI configuration

---

## Pre-requisites
- All tier 2 tools installed (run `scripts/check-tier2-tools.sh`)
- Supabase connection configured
- Cloud instance access (if testing remotely)

## Validation Commands
```bash
# Check tool availability
./scripts/check-tier2-tools.sh

# Run typecheck
npx tsc --noEmit --skipLibCheck -p packages/agents/tsconfig.json

# Run tests
npm test -- --testPathPattern=tier2-executor
```

## Expected Outcomes
- All languages have working tier 2 native fixers
- Pattern cache reduces API calls by 60%+
- Cloud deployment works with all tools
- Supabase correctly stores new patterns

---

*Created: Session 104 → Session 105 transition*
