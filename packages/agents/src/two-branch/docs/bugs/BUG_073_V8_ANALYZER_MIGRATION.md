# BUG-073: V8 Analyzer Files Migration Required

## Summary
Critical V8 analyzer files are currently in the `standard` directory, but the standard directory is a candidate for removal. All new development should be in the `two-branch` directory structure.

## Severity: HIGH
**Impact**: Architectural consistency, code organization, potential deletion of actively used code

## Location
- `packages/agents/src/standard/analyzers/v8-base-analyzer.ts` (945 lines) ✅ MIGRATED
- `packages/agents/src/standard/analyzers/v8-java-analyzer.ts` ✅ MIGRATED
- `packages/agents/src/standard/analyzers/v8-rust-analyzer.ts` ✅ MIGRATED
- `packages/agents/src/standard/utils/v8-html-generator.ts` ✅ MIGRATED
- `packages/agents/src/standard/comparison/report-generator-v8-*.ts` (multiple files) ❌ PENDING
- `packages/agents/src/standard/comparison/dynamic-model-selector-v8.ts` ❌ PENDING
- `packages/agents/src/standard/services/dynamic-model-selector.ts` (532 lines) ❌ PENDING

## Description
The V8 analyzer system, which is actively used and working, is currently located in the `standard` directory. According to the current architecture decisions:

1. The `standard` directory is a candidate for removal
2. All new code should be placed in `two-branch` directory
3. The V8 analyzer files are critical components that need to be preserved

## Root Cause
- Historical development placed V8 files in standard directory
- Architecture evolution now requires two-branch structure
- Migration was not completed during refactoring

## Impact
- **Risk of Code Loss**: If standard directory is deleted, active V8 analyzers will be lost
- **Architectural Inconsistency**: Active code in deprecated location
- **Development Confusion**: Developers may not know where to place new analyzer code
- **Build Dependencies**: Other components may depend on these files

## Reproduction Steps
1. Check `packages/agents/src/standard/analyzers/` directory
2. Observe V8 analyzer files present
3. Check `packages/agents/src/two-branch/analyzers/` directory
4. Note that V8 analyzers are not present in two-branch

## Current Workarounds
- None - files are currently functional in standard location

## Proposed Solution
1. **Move all V8 analyzer files to two-branch structure**:
   ```
   packages/agents/src/two-branch/analyzers/
   ├── v8-base-analyzer.ts
   ├── v8-java-analyzer.ts
   ├── v8-rust-analyzer.ts
   └── __tests__/
   ```

2. **Move supporting files**:
   ```
   packages/agents/src/two-branch/utils/
   └── v8-html-generator.ts
   
   packages/agents/src/two-branch/reporters/
   ├── report-generator-v8-final.ts
   └── dynamic-model-selector-v8.ts
   ```

3. **Update all import statements** in dependent files
4. **Update export statements** in index files
5. **Run full test suite** to ensure no regressions

## Dependencies
- Files that import these analyzers need import path updates
- Build configuration may need updates
- Test files may need path updates

## Testing Requirements
- [ ] Unit tests pass after migration
- [ ] Integration tests pass
- [ ] V8 report generation still works
- [ ] All analyzer functionality preserved

## Priority: HIGH
This should be completed before any potential removal of the standard directory.

## Assignee: Next Session
## Created: 2025-09-09
## Status: Open