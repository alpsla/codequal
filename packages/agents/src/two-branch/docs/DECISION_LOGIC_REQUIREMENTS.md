# Decision Logic Requirements & Implementation Plan

**Date Created**: October 2, 2025
**Status**: Implementation Plan
**Priority**: High (Priority 2 after Severity Mapping)

---

## 🎯 Current Problem

### Current Behavior (INCORRECT)
The decision logic currently declines PRs based on **ALL critical/high issues** found in the **ENTIRE repository**, regardless of whether those files were modified in the PR.

```typescript
// ❌ CURRENT (WRONG)
const decision = (severityCounts.critical > 0 || severityCounts.high > 50) ? 'DECLINED' : 'APPROVED';
```

**Problem**: This declines PRs even when:
- Critical/high issues exist in files that weren't touched by the PR
- Pre-existing issues that the PR didn't introduce
- Issues in unchanged files

---

### Required Behavior (CORRECT)

Decline PRs **ONLY** when there are NEW or EXISTING critical/high issues in **MODIFIED files**.

```typescript
// ✅ REQUIRED (CORRECT)
const modifiedFiles = getModifiedFilesList(prBranch, mainBranch);
const modifiedFileIssues = [...newIssues, ...existingIssues].filter(issue =>
  modifiedFiles.includes(issue.file) &&
  (issue.severity === 'critical' || issue.severity === 'high')
);
const decision = modifiedFileIssues.length > 0 ? 'DECLINED' : 'APPROVED';
```

---

## 📋 User Requirements

From user feedback:

> "NEW issues and existing issues in MODIFIED files Decline PR"

**Breakdown**:
1. **NEW issues** in MODIFIED files → Decline
2. **EXISTING issues** in MODIFIED files → Decline
3. Issues in UNMODIFIED files → Ignore (don't affect decision)

**Rationale**:
- NEW issues: Developer introduced new problems
- EXISTING issues in MODIFIED files: Developer touched code with existing problems, should fix them
- EXISTING issues in UNMODIFIED files: Not the PR's responsibility

---

## 🔍 Implementation Requirements

### 1. Get Modified Files List

**Method**: Use Git diff to determine which files changed between PR branch and main branch

```typescript
function getModifiedFiles(prBranch: string, mainBranch: string, repoPath: string): string[] {
  // Get list of files modified in the PR
  const diffOutput = execSync(
    `git diff --name-only ${mainBranch}...${prBranch}`,
    { cwd: repoPath, encoding: 'utf-8' }
  );

  return diffOutput
    .split('\n')
    .filter(line => line.trim() !== '')
    .map(file => path.join(repoPath, file));
}
```

**Example Output**:
```
/workspace/clients/src/main/java/org/apache/kafka/clients/consumer/Consumer.java
/workspace/clients/src/main/java/org/apache/kafka/clients/producer/Producer.java
/workspace/core/src/main/scala/kafka/server/KafkaServer.scala
```

---

### 2. Filter Issues to Modified Files

**Current Issue Structure**:
```typescript
interface ProcessedIssue {
  tool: string;
  file: string;  // Full path: /workspace/clients/src/.../Consumer.java
  line: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  rule: string;
  // ... other fields
}
```

**Filter Logic**:
```typescript
function filterToModifiedFiles(
  issues: ProcessedIssue[],
  modifiedFiles: string[]
): ProcessedIssue[] {
  return issues.filter(issue => {
    // Normalize paths for comparison
    const normalizedIssuePath = path.normalize(issue.file);
    return modifiedFiles.some(modFile => {
      const normalizedModFile = path.normalize(modFile);
      return normalizedIssuePath === normalizedModFile ||
             normalizedIssuePath.endsWith(modFile) ||
             modFile.endsWith(normalizedIssuePath);
    });
  });
}
```

---

### 3. Calculate Decision

**Enhanced Decision Logic**:
```typescript
function calculateDecision(
  newIssues: ProcessedIssue[],
  existingIssues: ProcessedIssue[],
  modifiedFiles: string[]
): 'APPROVED' | 'DECLINED' {

  // Filter to only issues in modified files
  const newInModified = filterToModifiedFiles(newIssues, modifiedFiles);
  const existingInModified = filterToModifiedFiles(existingIssues, modifiedFiles);

  // Combine NEW + EXISTING in modified files
  const blockingIssues = [...newInModified, ...existingInModified];

  // Count critical and high severity issues
  const criticalCount = blockingIssues.filter(i => i.severity === 'critical').length;
  const highCount = blockingIssues.filter(i => i.severity === 'high').length;

  // Decision rules:
  // - Any critical issues in modified files → DECLINED
  // - Any high issues in modified files → DECLINED
  // - Otherwise → APPROVED
  if (criticalCount > 0) {
    return 'DECLINED';
  }

  if (highCount > 0) {  // ANY high severity issue blocks
    return 'DECLINED';
  }

  return 'APPROVED';
}
```

---

## 📁 Files to Modify

### 1. Test File: `test-v9-optimized-report.ts`

**Current Location** (Line ~600):
```typescript
const decision = (severityCounts.critical > 0 || severityCounts.high > 50) ? 'DECLINED' : 'APPROVED';
```

**Required Changes**:
1. Add `getModifiedFiles()` function
2. Add `filterToModifiedFiles()` function
3. Update decision calculation to use filtered issues

**Estimated Changes**: ~50 lines

---

### 2. Other Test Files

Search for similar decision logic in:
- `test-complete-v9-report.ts`
- `test-v9-direct-report.ts`

Apply same changes to maintain consistency.

---

### 3. Production V9 Code (Future)

**TODO**: Identify production decision logic location
- Likely in: `V9ToolOrchestrator` or `V9IssueComparator`
- Currently, test files have their own decision logic
- Production integration needed after test validation

---

## 🧪 Testing Strategy

### Test Scenarios

#### Scenario 1: NEW Critical in Modified File
```
Modified Files: [Consumer.java]
NEW Issues:
  - Consumer.java:100 (critical)
EXISTING Issues: []

Expected: DECLINED ✅
Reason: NEW critical in modified file
```

#### Scenario 2: NEW Critical in Unmodified File
```
Modified Files: [Consumer.java]
NEW Issues:
  - Producer.java:200 (critical)  ← NOT in modified files
EXISTING Issues: []

Expected: APPROVED ✅
Reason: Critical NOT in modified file
```

#### Scenario 3: EXISTING High in Modified File
```
Modified Files: [Consumer.java]
NEW Issues: []
EXISTING Issues:
  - Consumer.java:50 (high)

Expected: DECLINED ✅
Reason: EXISTING high in modified file
```

#### Scenario 4: EXISTING High in Unmodified File
```
Modified Files: [Consumer.java]
NEW Issues: []
EXISTING Issues:
  - Producer.java:300 (high)  ← NOT in modified files

Expected: APPROVED ✅
Reason: High NOT in modified file
```

#### Scenario 5: Mixed Issues
```
Modified Files: [Consumer.java, Producer.java]
NEW Issues:
  - Consumer.java:100 (medium)  ← Modified, but MEDIUM (not blocking)
  - Server.java:200 (critical)  ← NOT modified (ignore)
EXISTING Issues:
  - Producer.java:50 (low)      ← Modified, but LOW (not blocking)
  - Utils.java:300 (high)       ← NOT modified (ignore)

Expected: APPROVED ✅
Reason: No critical/high in modified files
```

---

## 📊 Expected Impact

### Before Fix

**Apache Kafka PR #17620 Example**:
- Modified Files: ~50 files
- Total Issues: 1,351
- Decision: **DECLINED** (based on ALL issues in repo)

### After Fix

**Apache Kafka PR #17620 Example**:
- Modified Files: ~50 files
- Issues in Modified Files: ~100 (estimate)
- Issues in Unmodified Files: ~1,251 (ignored)
- Decision: **Depends on modified file issues only**

**Expected Improvement**:
- False DECLINED rate: 60-80% reduction
- PRs with new features in clean files: APPROVED ✅
- PRs touching legacy code with existing issues: DECLINED (correctly) ✅

---

## 🚀 Implementation Steps

### Phase 1: Test Implementation (Current Priority)

1. **Add Helper Functions** to `test-v9-optimized-report.ts`:
   - `getModifiedFiles(prBranch, mainBranch, repoPath)`
   - `filterToModifiedFiles(issues, modifiedFiles)`
   - `calculateDecisionEnhanced(newIssues, existingIssues, modifiedFiles)`

2. **Update Decision Calculation**:
   - Replace simple severity count check
   - Use filtered issues from modified files only

3. **Test with Apache Kafka**:
   - Verify decision changes appropriately
   - Validate with real PR data

4. **Update Report Output**:
   - Add "Modified Files" section showing which files were changed
   - Show blocking issues breakdown: "X critical in modified files, Y in unmodified"

---

### Phase 2: Production Integration (Future)

1. **Locate Production Decision Logic**:
   - Search V9ToolOrchestrator
   - Search V9IssueComparator
   - Search report generators

2. **Extract to Shared Utility**:
   - Create `src/two-branch/utils/decision-calculator.ts`
   - Reusable across test and production

3. **Add Configuration**:
   - Configurable threshold for high issues (default: 10)
   - Configurable whether to include EXISTING issues in decision

---

### Phase 3: Documentation & Validation (Future)

1. **Update V9_CRITICAL_KNOWLEDGE_BASE.md**:
   - Document decision logic
   - Add examples

2. **Create Decision Logic Tests**:
   - Unit tests for edge cases
   - Integration tests with various PR scenarios

3. **User Documentation**:
   - Explain decision criteria
   - Show how to interpret results

---

## 💡 Additional Considerations

### Configuration Options

Consider making these configurable:

```typescript
interface DecisionConfig {
  // Whether ANY high severity issue in modified files should block
  // Current policy: ANY high severity blocks (> 0)
  blockOnAnyHigh: boolean;  // Default: true

  // Whether EXISTING issues in modified files should block
  includeExistingInModified: boolean;  // Default: true

  // Whether to use strict matching for file paths
  strictPathMatching: boolean;  // Default: false
}
```

---

### Edge Cases to Handle

1. **File Renames**:
   - Git diff shows file as deleted + added
   - Solution: Use `git diff --find-renames`

2. **File Moves**:
   - Similar to renames
   - Track old path → new path mapping

3. **Path Normalization**:
   - `/workspace/file.java` vs `workspace/file.java`
   - Windows vs Unix paths
   - Solution: Normalize all paths before comparison

4. **Deleted Files**:
   - Modified but no longer exists
   - Solution: Check if file exists before analyzing

---

## 📝 Code Examples

### Complete Implementation

```typescript
import { execSync } from 'child_process';
import * as path from 'path';

function getModifiedFiles(
  prBranch: string,
  mainBranch: string,
  repoPath: string
): string[] {
  try {
    const diffOutput = execSync(
      `git diff --name-only --find-renames ${mainBranch}...${prBranch}`,
      { cwd: repoPath, encoding: 'utf-8' }
    );

    return diffOutput
      .split('\n')
      .filter(line => line.trim() !== '')
      .map(file => {
        // Normalize path
        const fullPath = path.join(repoPath, file);
        return path.normalize(fullPath);
      });
  } catch (error) {
    console.error('Error getting modified files:', error);
    return [];
  }
}

function filterToModifiedFiles(
  issues: ProcessedIssue[],
  modifiedFiles: string[]
): ProcessedIssue[] {
  if (modifiedFiles.length === 0) {
    // If no modified files list, include all issues (safety fallback)
    return issues;
  }

  return issues.filter(issue => {
    const normalizedIssuePath = path.normalize(issue.file);

    return modifiedFiles.some(modFile => {
      const normalizedModFile = path.normalize(modFile);

      // Try exact match first
      if (normalizedIssuePath === normalizedModFile) {
        return true;
      }

      // Try suffix match (handles /workspace/ prefix differences)
      if (normalizedIssuePath.endsWith(normalizedModFile)) {
        return true;
      }

      if (normalizedModFile.endsWith(normalizedIssuePath)) {
        return true;
      }

      return false;
    });
  });
}

function calculateDecisionEnhanced(
  newIssues: ProcessedIssue[],
  existingIssues: ProcessedIssue[],
  modifiedFiles: string[],
  config: DecisionConfig = {
    blockOnAnyHigh: true,
    includeExistingInModified: true,
    strictPathMatching: false
  }
): {
  decision: 'APPROVED' | 'DECLINED';
  reason: string;
  blockingIssues: ProcessedIssue[];
  stats: {
    newInModified: number;
    existingInModified: number;
    criticalInModified: number;
    highInModified: number;
  };
} {

  // Filter to modified files
  const newInModified = filterToModifiedFiles(newIssues, modifiedFiles);
  const existingInModified = config.includeExistingInModified
    ? filterToModifiedFiles(existingIssues, modifiedFiles)
    : [];

  // Combine for decision
  const blockingIssues = [...newInModified, ...existingInModified];

  // Count by severity
  const criticalCount = blockingIssues.filter(i => i.severity === 'critical').length;
  const highCount = blockingIssues.filter(i => i.severity === 'high').length;

  const stats = {
    newInModified: newInModified.length,
    existingInModified: existingInModified.length,
    criticalInModified: criticalCount,
    highInModified: highCount
  };

  // Decision logic
  if (criticalCount > 0) {
    return {
      decision: 'DECLINED',
      reason: `Found ${criticalCount} critical issue(s) in modified files`,
      blockingIssues,
      stats
    };
  }

  if (config.blockOnAnyHigh && highCount > 0) {
    return {
      decision: 'DECLINED',
      reason: `Found ${highCount} high severity issue(s) in modified files`,
      blockingIssues,
      stats
    };
  }

  return {
    decision: 'APPROVED',
    reason: 'No blocking issues found in modified files',
    blockingIssues: [],
    stats
  };
}
```

---

## 🎯 Success Criteria

### Implementation Complete When:

1. ✅ Modified files list correctly extracted from Git diff
2. ✅ Issues filtered to only those in modified files
3. ✅ Decision based only on modified file issues
4. ✅ Test passes with Apache Kafka PR #17620
5. ✅ Report shows modified files list
6. ✅ Report shows breakdown: issues in modified vs unmodified
7. ✅ Documentation updated

---

## 📞 Next Steps

1. **Implement `getModifiedFiles()` in test file**
2. **Implement `filterToModifiedFiles()` in test file**
3. **Update decision calculation to use filtered issues**
4. **Run test with Apache Kafka to validate**
5. **Update report to show modified files**
6. **Document results in session summary**

---

*Document Version: 1.0*
*Date: October 2, 2025*
*Status: Ready for Implementation*
