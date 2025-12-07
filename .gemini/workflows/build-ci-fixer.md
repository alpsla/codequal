---
description: Fix build errors, ESLint violations, and CI failures
---

# Build CI Fixer Workflow

**Purpose**: Systematically resolve build errors, lint violations, test failures, and CI issues

**When to use**: Build failures, ESLint errors, failing tests, CI pipeline issues

**Trigger**: "Fix build" or "Fix CI"

## Workflow Steps

### Phase 1: Project Analysis

**Understand project structure:**

1. **Check build system:**
```bash
cat package.json | grep -A5 "scripts"
```

2. **Identify testing framework:**
```bash
cat package.json | grep -E "(jest|vitest|mocha)"
```

3. **Check ESLint config:**
```bash
cat .eslintrc.json
# or
cat .eslintrc.js
```

4. **Review CI configuration:**
```bash
cat .github/workflows/*.yml
```

### Phase 2: Issue Detection

**Run diagnostic commands:**

1. **Check build:**
```bash
npm run build
```

2. **Check linting:**
```bash
npm run lint
```

3. **Check tests:**
```bash
npm test
```

4. **Check TypeScript:**
```bash
npm run typecheck
```

### Phase 3: Issue Prioritization

**Address in this order:**

1. **Build/compilation errors** (blocks everything)
2. **Critical dependency issues**
3. **Type errors** (TypeScript projects)
4. **ESLint violations**
5. **Test failures**
6. **CI-specific validation issues**

### Phase 4: Fix Build Errors

**Common build error fixes:**

1. **Missing dependencies:**
```bash
npm install [missing-package]
```

2. **Import path issues:**
   - Fix relative paths
   - Update module resolution
   - Check tsconfig.json paths

3. **Syntax errors:**
   - Fix TypeScript syntax
   - Resolve type mismatches
   - Update deprecated APIs

4. **Configuration issues:**
   - Update tsconfig.json
   - Fix webpack/vite config
   - Resolve module aliases

### Phase 5: Fix ESLint Violations

**ESLint fix strategy:**

1. **Auto-fix safe violations:**
```bash
npm run lint:fix
# or
npx eslint --fix .
```

2. **Manual fixes for complex issues:**
   - Unused variables: Remove or prefix with `_`
   - Missing types: Add proper type annotations
   - Complexity issues: Refactor code
   - Formatting: Apply prettier

3. **Verify fixes don't break functionality:**
```bash
npm test
```

### Phase 6: Fix Test Failures

**Test failure resolution:**

1. **Identify failure type:**
   - Implementation bug
   - Outdated test expectations
   - Async timing issues
   - Mock/stub problems

2. **Fix implementation bugs:**
   - Correct logic errors
   - Handle edge cases
   - Fix type issues

3. **Update test expectations:**
   - If implementation changed intentionally
   - Update snapshots if needed
   - Fix mock data

4. **Handle async issues:**
   - Add proper await
   - Increase timeouts if needed
   - Fix promise chains

### Phase 7: Fix CI Issues

**CI-specific fixes:**

1. **Environment configuration:**
   - Check environment variables
   - Verify CI-specific configs
   - Update secrets if needed

2. **Dependency issues:**
   - Lock file conflicts
   - Version mismatches
   - Platform-specific deps

3. **Path and permission issues:**
   - Fix absolute vs relative paths
   - Check file permissions
   - Verify directory structure

4. **Platform-specific problems:**
   - Windows vs Linux paths
   - Case sensitivity
   - Line endings

### Phase 8: Incremental Validation

**After each fix:**

1. **Run affected checks:**
```bash
# After build fix
npm run build

# After lint fix
npm run lint

# After test fix
npm test
```

2. **Check for new issues:**
```bash
git status
git diff
```

3. **Verify no regressions:**
```bash
npm run build && npm run lint && npm test
```

### Phase 9: Final Validation

**Complete CI validation:**

```bash
# Full build
npm run build

# Full lint
npm run lint

# Full test suite
npm test

# Type checking
npm run typecheck

# If available, run CI locally
npm run ci:validate
```

### Phase 10: Summary Report

**Provide comprehensive summary:**

```markdown
## Build CI Fix Summary

### Issues Found: 15

**Build Errors: 3**
- Missing dependency: `@types/node` (installed)
- Import path error in `utils.ts` (fixed)
- TypeScript syntax error in `main.ts` (fixed)

**ESLint Violations: 8**
- Unused variables: 5 (removed)
- Missing types: 2 (added)
- Complexity warning: 1 (refactored)

**Test Failures: 4**
- Async timeout in `auth.test.ts` (fixed)
- Outdated snapshot in `ui.test.ts` (updated)
- Mock data issue in `api.test.ts` (fixed)
- Type error in `utils.test.ts` (fixed)

### Fixes Applied:

1. **Installed missing dependencies:**
   - `@types/node@^20.0.0`

2. **Fixed import paths:**
   - `utils.ts`: Updated relative path
   - `main.ts`: Fixed module alias

3. **Resolved ESLint violations:**
   - Removed 5 unused variables
   - Added type annotations to 2 functions
   - Refactored complex function in `processor.ts`

4. **Fixed test failures:**
   - Increased timeout for async tests
   - Updated snapshots
   - Fixed mock data structure
   - Added proper type assertions

### Validation Results:

✅ Build: Passing
✅ ESLint: No violations
✅ Tests: All passing (45/45)
✅ TypeScript: No errors
✅ CI: Ready to pass

### Files Modified: 12
- `package.json` (dependencies)
- `utils.ts` (imports, unused vars)
- `main.ts` (syntax, imports)
- `processor.ts` (refactoring)
- `auth.test.ts` (timeout)
- `ui.test.ts` (snapshot)
- `api.test.ts` (mock data)
- `utils.test.ts` (types)
- [4 more files]

### Recommendations:
- Run full test suite before pushing
- Consider adding pre-commit hooks
- Update CI cache if dependencies changed
```

## Fix Strategies

### For Build Errors:
✅ Check for missing dependencies
✅ Resolve import path issues
✅ Fix syntax errors and type mismatches
✅ Update configuration files
✅ Address module resolution problems

### For ESLint Violations:
✅ Apply automatic fixes where safe
✅ Manually fix complex issues
✅ Ensure fixes maintain functionality
✅ Never disable rules without permission
✅ Respect project ESLint config

### For Test Failures:
✅ Identify if test or implementation is wrong
✅ Update test expectations if needed
✅ Fix implementation bugs
✅ Handle async timing issues
✅ Update mocks and stubs

### For CI Issues:
✅ Check environment-specific configs
✅ Resolve dependency version conflicts
✅ Fix path and permission issues
✅ Address platform-specific problems
✅ Ensure all CI steps pass

## Safety Mechanisms

✅ If a fix introduces new errors, immediately revert it
✅ Try alternative solutions when first approach fails
✅ Escalate to user if architectural decisions needed
✅ Never leave codebase in worse state
✅ Test incrementally after each fix

## Common Use Cases

### After Code Changes
**Trigger**: "Fix build after implementing feature"

**Result**: All build, lint, and test issues resolved

### Before Pull Request
**Trigger**: "Fix CI before PR"

**Result**: Clean CI validation, ready to merge

### CI Pipeline Failure
**Trigger**: "Fix failing CI pipeline"

**Result**: All CI steps passing

## Success Criteria

✅ Build completes successfully
✅ ESLint shows no violations
✅ All tests passing
✅ TypeScript has no errors
✅ CI validation passes
✅ No new issues introduced
✅ Changes documented
✅ Ready to push/merge
