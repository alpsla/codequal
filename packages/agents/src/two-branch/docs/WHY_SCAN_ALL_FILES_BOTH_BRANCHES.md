# Why We Scan ALL Files on BOTH Branches

**Created**: January 13, 2025  
**Status**: Critical Architecture Decision  
**Issue**: Different scanning approaches break comparison logic

---

## 🚨 The Problem

**Current (WRONG) Approach**:
- **Main branch**: Scans ALL files ✅
- **PR branch**: Scans only `changedFiles` ❌

**Result**: Comparison logic breaks!

---

## 🔍 Why This Breaks Comparison

### Example Scenario

**Main branch**:
- `src/foo.ts` (line 10): Issue X (scanned ✅)
- `src/bar.ts` (line 20): Issue Y (scanned ✅)

**PR branch**:
- `src/foo.ts` (line 10): Issue X still exists (unchanged file)
- `src/bar.ts` (line 20): Issue Y still exists (unchanged file)
- `src/new.ts` (line 5): Issue Z (new file)

**If we only scan `changedFiles = ['src/new.ts']` on PR branch**:
- We find: Issue Z in `src/new.ts` ✅
- We miss: Issue X in `src/foo.ts` ❌
- We miss: Issue Y in `src/bar.ts` ❌

**Comparison Result** (WRONG):
- Issue Z → NEW ✅ (correct)
- Issue X → RESOLVED ❌ (WRONG! It still exists, should be EXISTING_REST)
- Issue Y → RESOLVED ❌ (WRONG! It still exists, should be EXISTING_REST)

---

## 📊 Categorization Logic Requirements

### EXISTING_REST (from PR side)
```typescript
// Line 697-704: Issues in PR that exist in main, but NOT in modified files
const existingRestFromPr = allPrIssues.filter(i => {
  return mainSigs.has(getSig(i)) && !modifiedFilesSet.has(normalizedFile);
});
```

**Requires**: `allPrIssues` must include issues from ALL files, not just changed files!

### EXISTING_REST (from main side)
```typescript
// Line 708-715: Issues in main that don't exist in PR, but NOT in modified files
const existingRestFromMain = allMainIssues.filter(i => {
  return !prSigs.has(getSig(i)) && !modifiedFilesSet.has(normalizedFile);
});
```

**Requires**: `prSigs` must include issues from ALL files to properly exclude them!

### RESOLVED
```typescript
// Line 720-732: Issues in main but not in PR, in modified files
const resolvedIssues = allMainIssues.filter(i => {
  return (
    !prSigs.has(sig) &&                      // Issue gone from PR
    modifiedFilesSet.has(normalizedFile) &&   // File was modified
    prFileExists.has(normalizedFile)          // File still exists
  );
});
```

**Requires**: `prSigs` must include issues from ALL files to confirm they're truly resolved!

---

## ✅ Correct Approach

**Scan ALL files on BOTH branches**:

```typescript
// Main branch
const mainResult = await orchestrator.orchestrate(repoPath, 'base', { 
  analysisMode: 'complete'
  // No changedFiles = scans ALL files
});

// PR branch
const prResult = await orchestrator.orchestrate(repoPath, 'pr', { 
  analysisMode: 'complete'
  // No changedFiles = scans ALL files (same as main)
});
```

**Then use `modifiedFiles` for categorization only**:
```typescript
const modifiedFiles = getModifiedFilesBetweenBranches(repoPath, defaultBranch, prBranchName);
// Use modifiedFiles to categorize issues, NOT to limit scanning
```

---

## 🎯 Why `changedFiles` Was Added (Misunderstanding)

**Original Intent**: Performance optimization - scan only changed files to save time.

**Problem**: This breaks comparison logic because:
1. We can't find issues in unchanged files on PR
2. We can't properly categorize EXISTING_REST
3. We can't properly identify RESOLVED issues

**Solution**: 
- Scan ALL files on both branches (for accurate comparison)
- Use `modifiedFiles` only for categorization (not tool execution)
- Performance: Tools are fast enough, accuracy is more important

---

## 📋 Updated Architecture

### Tool Execution
- **Main branch**: Scan ALL files ✅
- **PR branch**: Scan ALL files ✅ (same approach)

### Categorization (After Tool Execution)
- Use `modifiedFiles` to categorize issues:
  - **NEW**: In PR, not in main
  - **EXISTING_MODIFIED**: In both, in modified files
  - **EXISTING_REST**: In both, NOT in modified files
  - **RESOLVED**: In main, not in PR, in modified files

---

## 💡 Performance Consideration

**Question**: Won't scanning all files be slow?

**Answer**: 
- Tools are already fast (ESLint, TypeScript, etc.)
- Accuracy is more important than speed
- We can optimize later with caching if needed
- Current approach: ~45 seconds for full scan (acceptable)

**Future Optimization** (if needed):
- Cache results for unchanged files
- Only re-scan changed files
- But comparison still needs full issue sets

---

## ✅ Conclusion

**We MUST scan ALL files on BOTH branches** for accurate comparison. The categorization logic (EXISTING_REST, RESOLVED) requires complete issue sets from both branches.

`changedFiles` should be used for **categorization only**, not for limiting tool execution.


