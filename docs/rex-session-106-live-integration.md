# Session 106: Live Integration Test - Full Pipeline Validation

**Goal**: Run REAL integration tests with actual API calls and Supabase persistence to validate the complete fix-agent pipeline.

**Prerequisites**:
- OpenRouter API key configured
- Supabase connection active
- Real test repository with known issues

---

## Tasks

### 1. Verify Environment Configuration
**Goal**: Ensure all required environment variables and connections are active
**Steps**:
1. Check for OPENROUTER_API_KEY in environment
2. Check for SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
3. Verify Supabase connection by querying current pattern count
4. Document baseline pattern count before testing
**Files**:
- packages/agents/src/fix-agent/__tests__/live-env-check.test.ts

---

### 2. Create Live Test Fixture - Python
**Goal**: Create a Python test file with REAL fixable issues (not mocked)
**Steps**:
1. Create a temporary Python file with known issues:
   - F401 (unused import)
   - F632 (is comparison)
   - E711 (== None)
   - Formatting issues
2. This file will be used for actual fix execution
**Files**:
- packages/agents/src/fix-agent/__tests__/fixtures/live-test-python.py

---

### 3. Create Live Test Fixture - TypeScript
**Goal**: Create a TypeScript test file with REAL fixable issues
**Steps**:
1. Create a temporary TypeScript file with known issues:
   - Missing semicolons
   - Quote style violations
   - @typescript-eslint/no-explicit-any (requires AI)
2. This file will be used for actual fix execution
**Files**:
- packages/agents/src/fix-agent/__tests__/fixtures/live-test-typescript.ts

---

### 4. Create Live Test Fixture - Java
**Goal**: Create a Java test file with REAL fixable issues
**Steps**:
1. Create a temporary Java file with known issues:
   - Formatting issues (google-java-format)
   - S1155 isEmpty() pattern (Sorald)
   - PMD rule violation (requires AI)
2. This file will be used for actual fix execution
**Files**:
- packages/agents/src/fix-agent/__tests__/fixtures/live-test-java/TestClass.java

---

### 5. Run Live Tier 1 Test - Native Fix Commands
**Goal**: Execute REAL tier 1 fixes and verify files are modified
**Steps**:
1. Run ESLint --fix on TypeScript fixture
2. Run Ruff --fix on Python fixture
3. Run google-java-format on Java fixture
4. Verify files were actually modified (not dry run)
5. Check that fixable issues are resolved
**Files**:
- packages/agents/src/fix-agent/__tests__/live-tier1.test.ts

---

### 6. Run Live Tier 2 Test - Dedicated Fixers
**Goal**: Execute REAL tier 2 dedicated fixers
**Steps**:
1. Run isort on Python fixture
2. Run black on Python fixture
3. Run autoflake on Python fixture
4. Verify files were actually modified
5. Log which tools successfully fixed issues
**Files**:
- packages/agents/src/fix-agent/__tests__/live-tier2.test.ts

---

### 7. Run Live Tier 3 Test - AI Fixer with Pattern Creation
**Goal**: Execute REAL AI fixes and verify patterns are created in Supabase
**Steps**:
1. Query Supabase for current pattern count (baseline)
2. Run AI fixer on an issue that requires AI (e.g., @typescript-eslint/no-explicit-any)
3. Verify AI generates a fix
4. Query Supabase again - pattern count should increase by 1
5. Verify pattern structure is correct (rule_id, tool, fix_template)
**Files**:
- packages/agents/src/fix-agent/__tests__/live-tier3-ai.test.ts

---

### 8. Test Pattern Cache Hit Flow
**Goal**: Verify second issue of same type uses cached pattern (no AI call)
**Steps**:
1. Create a second file with the SAME issue type as task 7
2. Run fix pipeline on this new file
3. Verify fix is applied WITHOUT making AI API call
4. Confirm pattern was retrieved from KB cache
5. Verify Supabase pattern count did NOT increase
**Files**:
- packages/agents/src/fix-agent/__tests__/live-pattern-cache.test.ts

---

### 9. Run Full Pipeline Integration Test
**Goal**: Execute complete three-tier cascade on multi-issue file
**Steps**:
1. Create a file with 10+ issues across all tiers
2. Run full fix orchestrator
3. Track which issues went to tier 1, tier 2, tier 3
4. Verify tier 1 and tier 2 issues were fixed without API calls
5. Verify tier 3 issues created/used patterns
6. Generate summary report with actual API cost
**Files**:
- packages/agents/src/fix-agent/__tests__/live-full-pipeline.test.ts

---

### 10. Query Supabase and Generate Report
**Goal**: Final validation - query Supabase and document results
**Steps**:
1. Query fix_patterns table for patterns created today
2. Compare to baseline from task 1
3. Document: new patterns created, cache hits, API costs
4. Generate LIVE_INTEGRATION_RESULTS.md with actual data
5. Include recommendations for production deployment
**Files**:
- docs/LIVE_INTEGRATION_RESULTS.md

---

## Validation

For this session, validation should:
- Run the actual test files (not skip them)
- Check that Supabase was queried
- Verify pattern counts changed as expected

```bash
# Validation commands
npm test -- --testPathPattern="live-" --verbose
```

## Expected Outcomes

| Metric | Expected |
|--------|----------|
| Tier 1 fixes executed | 5-10 |
| Tier 2 fixes executed | 3-5 |
| Tier 3 AI fixes | 2-3 |
| New patterns created | 2-3 |
| Cache hits | 1+ |
| Total API cost | < $0.05 |

## Notes

- This is a LIVE test - it will make real API calls
- Ensure OPENROUTER_API_KEY has sufficient credits
- All fixture files should be cleaned up after tests
- Monitor Supabase dashboard during execution
