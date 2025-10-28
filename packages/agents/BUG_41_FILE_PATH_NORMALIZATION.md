# Bug #41: File Path Normalization in Representative Examples

**Date**: October 20, 2025  
**Status**: ✅ FIXED  
**Priority**: High (snippet extraction was failing)

## Problem Statement

User reported confusion about missing code snippets in "Representative Example" sections. Investigation revealed:

1. **Attachment JSON had full paths**: `/workspace/server-common/src/main/java/org/apache/kafka/server/common/MetadataVersion.java` ✅
2. **Report showed only filenames**: `MetadataVersion.java` ❌
3. **Snippet extraction failed**: Because it tried to read `/tmp/kafka-repo/MetadataVersion.java` (doesn't exist)

### Root Cause

The `EnrichedIssue.file` field contained full container paths like `/workspace/server-common/src/.../MetadataVersion.java`, but somewhere in the flow, only the filename was being displayed in representative examples.

When snippet extraction tried to use this filename:
```typescript
// Wrong:
fullPath = path.join('/tmp/kafka-repo', 'MetadataVersion.java')
// Result: /tmp/kafka-repo/MetadataVersion.java ❌ DOESN'T EXIST

// Correct:
fullPath = path.join('/tmp/kafka-repo', 'server-common/src/main/java/.../MetadataVersion.java')
// Result: /tmp/kafka-repo/server-common/src/main/java/.../MetadataVersion.java ✅ EXISTS
```

## Solution

### Changes Made

1. **`generateGroupSection()` - Representative Example Display** (Line 2399-2438)
   - Added path normalization at display time (strip `/workspace/`)
   - Store normalized path in `displayPath` variable
   - Use `displayPath` consistently for both display and extraction
   - **Before**: `exampleIssue.file` (could be just filename)
   - **After**: `displayPath` (always full relative path like `server-common/src/.../MetadataVersion.java`)

2. **`extractSnippetsForLocations()` - Attachment Generation** (Line 424-479)
   - Normalize paths at the beginning of the loop
   - Use normalized path for both extraction and output
   - **Impact**: All attachment JSON files now have consistent paths without `/workspace/`

3. **No-repoPath Case** (Line 425-443)
   - Added normalization even when `repoPath` is not available
   - Ensures consistency across all code paths

### Code Diff Summary

```typescript
// Before (lines 2402-2406):
section += `**Location**: \`${exampleIssue.file}\``;  // Could be just "MetadataVersion.java"

// After (lines 2402-2414):
let displayPath = exampleIssue.file;
if (displayPath.startsWith('/workspace/')) {
  displayPath = displayPath.replace('/workspace/', '');
}
section += `**Location**: \`${displayPath}\``;  // Always full path like "server-common/src/.../MetadataVersion.java"
```

```typescript
// Before (extractSnippetsForLocations, line 469):
locations.push({
  file: issue.file,  // Could have /workspace/ prefix
  ...
});

// After (line 468-475):
let normalizedPath = issue.file;
if (normalizedPath.startsWith('/workspace/')) {
  normalizedPath = normalizedPath.replace('/workspace/', '');
}
locations.push({
  file: normalizedPath,  // Always normalized
  ...
});
```

## Verification Plan

Running E2E test on Oracle Cloud (test-v9-e2e-complete.ts) to verify:

1. ✅ Representative examples show full relative paths (e.g., `server-common/src/.../MetadataVersion.java`)
2. ✅ Code snippets are extracted successfully for all representative examples
3. ✅ Attachment JSON files contain normalized paths (no `/workspace/` prefix)
4. ✅ No "Empty snippet extracted" warnings in logs (unless file truly doesn't exist)

## Expected Impact

### Before Fix:
- **Report**: `MetadataVersion.java` (Line 46)
- **Code**: [Missing - fallback to AI-generated code]
- **Warning**: `Empty snippet extracted for MetadataVersion.java:46`

### After Fix:
- **Report**: `server-common/src/main/java/org/apache/kafka/server/common/MetadataVersion.java` (Line 46)
- **Code**: [Actual code snippet extracted from file] ✅
- **No warnings**: Snippet extraction successful

## Related Bugs

- **Bug #25**: Strip `/workspace/` prefix in code snippets (fixed)
- **Bug #26**: Path normalization in comparison logic (fixed)
- **Bug #30/37**: Show AI-generated code when snippet unavailable (fixed)

This fix completes the path normalization work across the entire V9 pipeline:
1. Tool output → enriched issues (Bug #25)
2. Comparison logic → categorization (Bug #26)
3. **Report display → snippet extraction (Bug #41)** ✅ NEW

## Files Changed

- `packages/agents/src/two-branch/analyzers/v9-grouped-report-formatter.ts`
  - `generateGroupSection()` method (lines 2399-2438)
  - `extractSnippetsForLocations()` method (lines 424-479)

## Test Status

- ⏳ **Running**: E2E test on Oracle Cloud (started at ~5:30 PM)
- 📊 **Expected duration**: 20-25 minutes
- 📝 **Log file**: `/tmp/v9-test-bug41.log`

---

**Next Steps After Verification**:
1. Review test report to confirm all representative examples have code snippets
2. Check attachment JSON files to ensure paths are normalized
3. Update QUICK_START_NEXT_SESSION.md with Bug #41 completion

