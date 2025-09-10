# V9 Dependency Migration Plan

## Overview

This document outlines the plan to fix broken utility dependencies that prevent V9 analyzers from working in production.

## 🔴 Critical Dependencies to Fix

### 1. OptimizedRepoManager
**Location**: `src/two-branch/utils/optimized-repo-manager.ts`

**Issues**:
- Logger type incompatibility
- Missing `prepareRepositories` method
- Incorrect property names in PRWorkspace

**Fix Actions**:
1. Update logger import to use correct type
2. Rename methods to match actual implementation
3. Update PRWorkspace interface properties
4. Add proper error handling

**Migration Steps**:
```typescript
// Before
prepareRepositories(owner, repo, prNumber)
workspace.prDir

// After  
createPRWorkspace(owner, repo, prNumber, baseBranch)
workspace.path
```

### 2. SmartFileSelector
**Location**: `src/two-branch/utils/smart-file-selector.ts`

**Issues**:
- `selectFiles` expects single config object, not multiple parameters
- Property name mismatches (totalFiles vs totalSelected, coreFiles vs criticalFiles)

**Fix Actions**:
1. Update method signature to accept config object
2. Rename properties in SelectedFiles interface
3. Add backward compatibility layer

**Migration Steps**:
```typescript
// Before
selectFiles(repoPath, maxFiles, extensions)
result.totalFiles
result.coreFiles

// After
selectFiles({ repoPath, maxFiles, language })  
result.totalSelected
result.criticalFiles
```

### 3. V9RepositoryManager
**Location**: `src/two-branch/analyzers/v9-repository-manager.ts`

**Issues**:
- Uses broken utility methods
- Property mismatches

**Fix Actions**:
1. Update to use correct OptimizedRepoManager methods
2. Fix property references
3. Add null safety checks

**Status**: ⚠️ Partially fixed, needs testing

## 📋 Implementation Phases

### Phase 1: Create Compatibility Layer (Day 1)
**Goal**: Make V9 work without breaking existing code

1. Create adapter classes for utilities:
   ```typescript
   // v9-repo-manager-adapter.ts
   export class V9RepoManagerAdapter {
     private manager: OptimizedRepoManager;
     
     async prepareRepositories(...) {
       // Translate to createPRWorkspace
     }
   }
   ```

2. Create property mappers:
   ```typescript
   // v9-file-selector-adapter.ts
   export class V9FileSelectorAdapter {
     private selector: SmartFileSelector;
     
     async selectFiles(...) {
       // Map parameters to config object
       // Map result properties
     }
   }
   ```

3. Update V9RepositoryManager to use adapters

### Phase 2: Fix Utility Classes (Day 2)
**Goal**: Fix the actual utility implementations

1. **Fix OptimizedRepoManager**:
   - Update logger imports
   - Add missing methods or rename existing ones
   - Fix TypeScript errors

2. **Fix SmartFileSelector**:
   - Standardize method signatures
   - Update property names
   - Ensure backward compatibility

3. **Run integration tests**

### Phase 3: Remove Adapters (Day 3)
**Goal**: Clean integration without adapters

1. Update V9RepositoryManager to use fixed utilities directly
2. Remove adapter classes
3. Update all imports
4. Run full test suite

### Phase 4: Archive Deprecated Code (Day 4)
**Goal**: Clean up codebase

1. Move deprecated files to `_deprecated/` folder:
   - v9-base-analyzer.ts (old version)
   - v9-report-formatter.ts (old version)
   - v9-report-formatter-enhanced.ts
   - v9-java-analyzer.ts (old version)

2. Update imports in any remaining code
3. Update documentation

## 🧪 Testing Strategy

### Unit Tests
Create tests for each fixed component:
```typescript
// test/v9-dependency-fixes.test.ts
describe('V9 Dependency Fixes', () => {
  test('OptimizedRepoManager.createPRWorkspace', async () => {
    // Test workspace creation
  });
  
  test('SmartFileSelector.selectFiles with config', async () => {
    // Test file selection
  });
});
```

### Integration Tests
Test full pipeline with fixed dependencies:
```typescript
// test/v9-integration.test.ts
describe('V9 Full Pipeline', () => {
  test('Complete analysis flow', async () => {
    // Create analyzer
    // Prepare repositories
    // Select files
    // Run analysis
    // Generate report
  });
});
```

### Regression Tests
Ensure existing functionality still works:
```typescript
// test/v9-regression.test.ts
describe('V9 Backward Compatibility', () => {
  test('Existing code still works', async () => {
    // Test with old patterns
  });
});
```

## 🚦 Success Criteria

1. ✅ All V9 components pass tests
2. ✅ No TypeScript compilation errors
3. ✅ Integration tests pass
4. ✅ Can analyze a real PR end-to-end
5. ✅ Performance meets requirements (<5s for small repos)

## 📊 Risk Assessment

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Breaking existing code | High | Medium | Use adapters first |
| Performance regression | Medium | Low | Benchmark before/after |
| Missing edge cases | Medium | Medium | Comprehensive testing |
| Type incompatibilities | Low | High | Fix incrementally |

## 🗓️ Timeline

- **Day 1**: Create compatibility layer (4 hours)
- **Day 2**: Fix utility classes (6 hours)
- **Day 3**: Integration and testing (4 hours)
- **Day 4**: Cleanup and documentation (2 hours)

**Total Estimated Time**: 16 hours

## 📝 Implementation Checklist

- [ ] Create V9RepoManagerAdapter
- [ ] Create V9FileSelectorAdapter
- [ ] Update V9RepositoryManager to use adapters
- [ ] Fix OptimizedRepoManager logger issues
- [ ] Fix OptimizedRepoManager method names
- [ ] Fix SmartFileSelector method signature
- [ ] Fix SmartFileSelector property names
- [ ] Create unit tests for fixes
- [ ] Create integration tests
- [ ] Remove adapters after fixes
- [ ] Archive deprecated files
- [ ] Update documentation
- [ ] Run full regression suite
- [ ] Deploy to staging
- [ ] Monitor for issues

## 🔄 Rollback Plan

If issues arise:
1. Keep adapters in place longer
2. Revert utility changes
3. Use minimal working example as fallback
4. Document specific failures for next attempt

## 📚 Related Documentation

- [V9 Working Components](./V9_WORKING_COMPONENTS.md)
- [V9 Fix Strategy](./V9_FIX_STRATEGY.md)
- [Minimal Working Test](../../test-v9-minimal-working.ts)