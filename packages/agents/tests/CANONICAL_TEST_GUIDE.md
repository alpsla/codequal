# Canonical Test Guide - Preventing Future Confusion

**Created**: November 8, 2025  
**Purpose**: Document the CORRECT test to use and why

---

## ⭐ THE CANONICAL TEST

### `tests/integration/test-v9-lite-e2e.ts`

**This is the ONLY production-verified, working test.**

**Use this for**:
- Java repository analysis
- Multi-repository validation
- Verifying all Session 19 fixes

**DO NOT**:
- ❌ Create new test runners
- ❌ Modify the core logic
- ❌ Try to "improve" it without understanding why

---

## 🐛 What Went Wrong in Session 19

### The Mistake

We created `run-single-repo-test.ts` thinking it would be "simpler" for single-repository testing.

**Problems**:
1. **Wrong categorization**: Tried to compare main vs non-existent PR
2. **Result**: 1,051 "NEW" issues when they were all existing
3. **Confusion**: Multiple tests doing similar things differently
4. **Wasted time**: Debugging broken logic instead of using working test

### Root Cause

**Lack of clear documentation** about which test is canonical.

---

## ✅ The Correct Flow (From Canonical Test)

### For Two-Branch PR Analysis:

```typescript
// 1. Clone repository
cloneRepository(repoUrl, repoPath);

// 2. Run tools on MAIN branch
const mainResult = await orchestrator.orchestrate(
  repoPath, 
  'base', 
  { analysisMode: 'complete' }
);

// 3. Checkout PR branch
execSync(`git -C ${repoPath} fetch origin pull/${prNumber}/head:pr-${prNumber}`);
execSync(`git -C ${repoPath} checkout pr-${prNumber}`);

// 4. Run tools on PR branch
const prResult = await orchestrator.orchestrate(
  repoPath, 
  'pr', 
  { analysisMode: 'complete' }
);

// 5. Extract all issues from BOTH branches
const allMainIssues = mainResults.flatMap(r => r.issues || []);
const allPrIssues = prResults.flatMap(r => r.issues || []);

// 6. Identify NEW issues (in PR but not in main)
const newIssues = allPrIssues.filter(issue => 
  !mainResults.some(m => 
    m.issues.some(mainIssue => 
      mainIssue.file === issue.file && 
      mainIssue.line === issue.line
    )
  )
);

// 7. Categorize ALL PR issues
const formattedIssues = allPrIssues.map(issue => ({
  ...issue,
  category: newIssues.includes(issue) ? 'NEW' : 'EXISTING_REST',
  detectedCategory: detectIssueCategory(issue.tool, issue.rule)
}));
```

**This handles**:
- ✅ NEW: Issues in PR but not in main
- ✅ RESOLVED: Issues in main but not in PR (can be added)
- ✅ EXISTING_MODIFIED: Issues in both, file modified (needs comparator)
- ✅ EXISTING_REST: Issues in both, file not modified

---

## 📋 How to Add New Repositories

### In Canonical Test:

```typescript
const TEST_SCENARIOS: TestScenario[] = [
  {
    name: 'Spring PetClinic',  // ← Just added!
    repoUrl: 'https://github.com/spring-projects/spring-petclinic',
    prNumber: 1,
    expectedFramework: 'spring',
    expectedToolCount: 5
  },
  // ... add more here
];
```

**Then run**:
```bash
cd packages/agents
npx ts-node tests/integration/test-v9-lite-e2e.ts
```

It will test ALL scenarios in sequence!

---

## 🚫 What NOT to Do

### DON'T Create New Test Runners

**Bad**:
```typescript
// ❌ Creating yet another test file
// tests/integration/my-new-test.ts
```

**Good**:
```typescript
// ✅ Adding to canonical test
// tests/integration/test-v9-lite-e2e.ts
const TEST_SCENARIOS = [
  // ... existing scenarios
  { name: 'New Repo', repoUrl: '...', prNumber: 1 }
];
```

### DON'T Bypass the Comparator

**Bad**:
```typescript
// ❌ Manual categorization
category: 'NEW'  // How do you know it's new?
```

**Good**:
```typescript
// ✅ Use comparison logic
const isNew = !mainIssues.includes(issue);
category: isNew ? 'NEW' : 'EXISTING_REST'
```

---

## 🎯 Future: API Will Solve This

Once the API is ready:
- ✅ Single endpoint: `POST /api/analyze`
- ✅ No CLI tests needed
- ✅ Clear separation of concerns
- ✅ No more test file proliferation

**Until then**: **USE THE CANONICAL TEST ONLY!**

---

## 📊 Session 19 Lessons Learned

### What We Learned:

1. **Don't reinvent** - Use working tests
2. **Document clearly** - Mark canonical tests
3. **Delete quickly** - Remove broken attempts immediately
4. **One source of truth** - Avoid parallel implementations

### Files Deleted (Session 19):

- ❌ `tests/integration/run-single-repo-test.ts` - Broken categorization
- ❌ `scripts/run-single-test.ts` - Duplicate logic
- ❌ 179 old test output files - Clutter

### Files to Keep:

- ✅ `tests/integration/test-v9-lite-e2e.ts` - CANONICAL
- ✅ `tests/shared/*` - Infrastructure
- ✅ `tests/README.md` - Documentation

---

## ✅ Current Status

- **Canonical test**: Updated with Spring PetClinic
- **Broken tests**: Deleted
- **Documentation**: Clear markers added
- **Confusion**: Eliminated

**Next**: Run canonical test and get CORRECT results!

---

*Preventing future confusion by establishing clear patterns and deleting broken alternatives.*

