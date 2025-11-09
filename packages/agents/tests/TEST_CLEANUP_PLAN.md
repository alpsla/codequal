# Test Cleanup Plan - Session 19

**Goal**: Keep only working, canonical tests. Remove confusion.

---

## ✅ KEEP - Canonical Working Tests

### 1. `tests/integration/test-v9-lite-e2e.ts` ✅ **CANONICAL**
**Status**: Working, used in production  
**Purpose**: Java multi-repository validation (JHipster, Spring Boot Admin, Netflix Conductor)  
**Flow**: Correct two-branch analysis with proper comparator logic  
**Keep**: YES - This is the reference implementation

### 2. `tests/shared/test-config.ts` ✅ **INFRASTRUCTURE**
**Status**: Configuration  
**Purpose**: Shared test configuration  
**Keep**: YES

### 3. `tests/shared/test-helpers.ts` ✅ **INFRASTRUCTURE**
**Status**: Helper functions  
**Purpose**: Common utilities  
**Keep**: YES

---

## ❌ REMOVE - Outdated/Broken Tests

### 1. `tests/integration/run-single-repo-test.ts` ❌ **DELETE**
**Status**: Broken (wrong categorization logic)  
**Problem**: 
- Tries two-branch comparison with non-existent PR
- Results in 1,051 NEW issues (wrong!)
- Doesn't use proper comparator
**Action**: DELETE - Use test-v9-lite-e2e.ts instead

### 2. `tests/integration/test-v9-e2e-complete.ts` ❓ **REVIEW**
**Status**: Unknown - need to check if working  
**Action**: Review and decide

### 3. `tests/integration/test-v9-multi-framework.ts` ❓ **REVIEW**
**Status**: Unknown  
**Action**: Review and decide

### 4. `tests/integration/python/test-v9-python-lite-e2e.ts` ❓ **REVIEW**
**Status**: Unknown  
**Action**: Check if it works like Java lite test

### 5. `tests/integration/typescript/test-v9-typescript-e2e.ts` ❓ **REVIEW**
**Status**: Unknown  
**Action**: Check if it works

### 6. `tests/integration/typescript/test-v9-typescript-validation.ts` ❓ **REVIEW**
**Status**: Validation test  
**Action**: Keep if working

### 7. `tests/quick-tests/quick-pmd-test.ts` ❓ **REVIEW**
**Status**: Quick validation  
**Action**: Keep if useful for debugging

### 8. `src/two-branch/tests/integration/test-java-full-analysis.ts` ❌ **DELETE**
**Status**: Old location (wrong directory)  
**Action**: DELETE

### 9. `src/two-branch/tests/regression/v9-report-sections.test.ts` ✅ **KEEP**
**Status**: Regression test  
**Purpose**: Validate report sections  
**Keep**: YES if working

---

## 📋 Recommended Actions

### Immediate:
1. **Delete** `run-single-repo-test.ts` (broken logic)
2. **Use** `test-v9-lite-e2e.ts` as canonical reference
3. **Document** the correct flow in README

### Future (When API Ready):
- Retire all CLI tests
- Use API endpoints only
- Clear separation of concerns

---

## 🎯 Correct Flow (From test-v9-lite-e2e.ts)

```typescript
// STEP 1: Clone repository
cloneRepository(repoUrl, repoPath);

// STEP 2: Run tools on MAIN branch
const mainResult = await orchestrator.orchestrate(repoPath, 'base', { analysisMode: 'complete' });

// STEP 3: Checkout PR branch
execSync(`git -C ${repoPath} fetch origin pull/${prNumber}/head:pr-${prNumber}`);
execSync(`git -C ${repoPath} checkout pr-${prNumber}`);

// STEP 4: Run tools on PR branch  
const prResult = await orchestrator.orchestrate(repoPath, 'pr', { analysisMode: 'complete' });

// STEP 5: Compare to find NEW issues
const newIssues = allPrIssues.filter(issue => 
  !mainResults.some(m => 
    m.issues.some(mainIssue => 
      mainIssue.file === issue.file && 
      mainIssue.line === issue.line
    )
  )
);

// STEP 6: Categorize all issues
const formattedIssues = allPrIssues.map(issue => ({
  ...issue,
  category: isNew ? 'NEW' : 'EXISTING_REST',
  detectedCategory: detectIssueCategory(issue.tool, issue.rule)
}));
```

This is the CORRECT flow that should be preserved!

---

## 🚨 Why We Got Confused

1. **Multiple test files** with similar names
2. **Broken test** (`run-single-repo-test.ts`) created during session
3. **No clear** "this is canonical" marker
4. **Different purposes**: PR review vs repository baseline vs validation

---

## 💡 Solution

1. **Delete broken test now**
2. **Mark canonical test clearly** in filename or header
3. **Document in README** which test to use for what
4. **Wait for API** to eliminate CLI test confusion

---

*Cleanup prevents future confusion and establishes clear patterns.*

