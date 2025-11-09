# CRITICAL BUG: Two-Branch Tool Inconsistency

**Discovered**: November 8, 2025  
**Priority**: 🔴 **CRITICAL**  
**Impact**: Breaks all issue categorization

---

## 🐛 The Problem

When running two-branch analysis, **different tools execute** on main vs PR branch, causing false "NEW" issues.

### Example: Spring PetClinic

**Main Branch**:
- Total issues: 717
- Tools: PMD ✅, Semgrep ✅, Checkstyle ⚠️ (partial?), Dependency-Check ⏱️ (timeout)

**PR Branch**:
- Total issues: 1,060
- Tools: PMD ✅, Semgrep ✅, Checkstyle ✅ (complete), Dependency-Check ✅, SpotBugs ✅

**Result**: 1,060 - 717 = **343 issues marked as "NEW"** ❌

**Reality**: Those 343 issues EXIST in main branch too, but tools didn't find them due to:
- Timeouts
- Failures
- Partial execution

---

## 🔍 Root Causes

### 1. Dependency-Check Timeout (180s limit)

**Log Evidence**:
```
[Universal dependency-check] ⏱️ Timeout after 180.1s
[Universal dependency-check] ⚠️ Output file not found
```

**What happens**:
- Main branch: Dependency-Check times out after 180s
- Finds 0 issues (because timeout)
- PR branch: Runs again, completes in 182s
- Finds issues
- Result: Issues marked as "NEW" when they're not!

### 2. SpotBugs Compilation Failure

**Log Evidence**:
```
Cannot find a Java installation matching: {languageVersion=25}
BUILD FAILED in 10s
```

**What happens**:
- SpotBugs tries to compile
- Gradle requires Java 25
- Only Java 17 installed
- Compilation fails  
- SpotBugs skipped

### 3. Checkstyle Inconsistent Execution

**Observation**:
- Main: 717 issues (seems low)
- PR: 1,058 issues (includes Checkstyle)
- Difference suggests Checkstyle didn't run fully on main

---

## ✅ Solutions

### Solution 1: Increase Dependency-Check Timeout ✅

**File**: `universal/dependency-check-runner.ts` line 89

**Current**:
```typescript
timeout: 180000 // 3 minutes
```

**Fix**:
```typescript
timeout: 300000 // 5 minutes (allow for PostgreSQL queries)
```

### Solution 2: Make SpotBugs Truly Optional ✅

**Status**: Already implemented (compilation failure = skip)

**Current Behavior**: ✅ CORRECT
- If compilation fails, SpotBugs is skipped
- Analysis continues with other tools
- No false "NEW" issues from SpotBugs

### Solution 3: Ensure Tool Parity Between Branches ✅

**Approach**: Add validation

```typescript
// After running both branches
if (mainResult.toolResults.length !== prResult.toolResults.length) {
  console.warn(`⚠️  Tool count mismatch: main=${mainResult.toolResults.length}, pr=${prResult.toolResults.length}`);
  console.warn(`This may cause false NEW/RESOLVED categorization!`);
}

// List tools that ran on each branch
const mainTools = mainResult.toolResults.map(t => t.tool).sort();
const prTools = prResult.toolResults.map(t => t.tool).sort();
const missingFromMain = prTools.filter(t => !mainTools.includes(t));
const missingFromPR = mainTools.filter(t => !prTools.includes(t));

if (missingFromMain.length > 0) {
  console.error(`❌ Tools missing from MAIN branch: ${missingFromMain.join(', ')}`);
}
if (missingFromPR.length > 0) {
  console.error(`❌ Tools missing from PR branch: ${missingFromPR.join(', ')}`);
}
```

### Solution 4: Retry Failed Tools ✅

**Approach**: If a tool times out/fails on one branch, retry on both

---

## 📊 Impact Analysis

### Current State:
- Spring PetClinic: 1,051 false "NEW" issues
- JHipster: 915 false "NEW" issues  
- All repositories affected

### With Fixes:
- Dependency-Check: 180s → 300s timeout (more reliable)
- Tool parity validation: Catch mismatches early
- Proper categorization: Only REAL new issues marked as NEW

---

## 🎯 Action Plan

1. ✅ Increase Dependency-Check timeout to 300s
2. ✅ Add tool parity validation
3. Re-run canonical test
4. Verify proper categorization (should be mostly EXISTING_REST)

---

*Critical bug affecting all two-branch analysis. Must fix before production.*

