---
description: Intelligent commit management and codebase cleanup
---

# Smart Commit Manager Workflow

**Purpose**: Comprehensive change detection, codebase cleanup, and well-structured atomic commits

**When to use**: After development sessions, before pushing changes, when multiple files modified

**Trigger**: "Smart commit" or "Prepare commits"

## Workflow Steps

### Phase 1: Comprehensive Change Detection

1. **Scan all changes:**
```bash
git status --porcelain -uall
git diff --name-only
git diff --cached --name-only
```

2. **Identify change types:**
   - Staged files
   - Unstaged modifications
   - Untracked files
   - Deleted files

### Phase 2: Artifact and Code Cleanup

**Identify cleanup candidates:**

1. **Temporary Files:**
   - `*.tmp`, `*.bak`, `*.log`
   - Debug outputs
   - Cache files
   - Test artifacts

2. **Dead Code:**
   - Commented-out old implementations
   - Deprecated functions
   - Unused imports/variables
   - Stale documentation

3. **Competing Implementations:**
   - Multiple versions of same feature
   - Different approaches to same problem
   - Duplicate logic

### Phase 3: Analysis and Recommendations

**For each changed file:**

1. **Examine modifications:**
   ```bash
   git diff [file]
   ```

2. **Categorize changes:**
   - Feature additions
   - Bug fixes
   - Refactoring
   - Cleanup
   - Documentation

3. **Identify patterns:**
   - Related changes across files
   - Competing implementations
   - Temporary debug code

### Phase 4: Cleanup Confirmation

**Present findings:**

```markdown
## Cleanup Analysis

### Temporary Artifacts to Remove:
- `debug.log` - Debug output file
- `test.tmp` - Temporary test file
- `backup.bak` - Old backup file

### Competing Implementations Found:
- `feature-v1.ts` vs `feature-v2.ts`
  - v2 is newer (modified 2 hours ago)
  - v2 has more complete implementation
  - v2 has better test coverage
  - **Recommendation**: Keep v2, remove v1

### Dead Code Identified:
- `old-implementation.ts` - No references found
- Commented code in `main.ts` lines 45-67
- Unused import in `utils.ts`

### Changes to Keep (Organized by commit):
**Commit 1: Feature - Add authentication**
- `auth.ts` (new)
- `middleware.ts` (modified)
- `types.ts` (modified)

**Commit 2: Fix - Resolve login timeout**
- `session.ts` (modified)
- `config.ts` (modified)

**Commit 3: Refactor - Extract validation logic**
- `validation.ts` (new)
- `user.ts` (modified)

**Commit 4: Cleanup - Remove temporary files**
- Delete debug.log, test.tmp, backup.bak
```

**Ask for confirmation before removing anything**

### Phase 5: Commit Creation

**For each logical group:**

1. **Stage related changes:**
```bash
git add [files]
```

2. **Create commit with detailed message:**
```
<type>: <subject line (50 chars max)>

<detailed description explaining:>
- What was implemented/changed
- Why this approach was taken
- What was cleaned up or removed
- Impact on other parts of the codebase

<if applicable:>
Removed: <list of cleaned up files/code>
Resolves: <any related issues>
```

**Commit types:**
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code refactoring
- `docs`: Documentation
- `test`: Tests
- `chore`: Maintenance
- `perf`: Performance improvement

### Phase 6: Validation

**After each commit:**

1. **Verify staging area:**
```bash
git status
```

2. **Check commit message:**
```bash
git log -1 --pretty=format:"%s%n%n%b"
```

3. **Ensure tests pass:**
```bash
npm test
```

### Phase 7: Final Summary

**Provide comprehensive summary:**

```markdown
## Commit Summary

### Commits Created: 4

1. **feat: Add authentication system**
   - Files: auth.ts, middleware.ts, types.ts
   - Lines: +245 -0

2. **fix: Resolve login timeout issue**
   - Files: session.ts, config.ts
   - Lines: +15 -8

3. **refactor: Extract validation logic**
   - Files: validation.ts, user.ts
   - Lines: +67 -45

4. **chore: Remove temporary artifacts**
   - Removed: debug.log, test.tmp, backup.bak, feature-v1.ts
   - Lines: +0 -123

### Cleanup Summary:
- Removed 4 temporary files
- Resolved 1 competing implementation
- Cleaned up 2 instances of dead code

### Repository Status:
✅ All changes committed
✅ Working directory clean
✅ Tests passing
✅ Ready to push

### Recommendations:
- Review commits before pushing
- Consider squashing commits 3-4 if preferred
- Run full test suite before pushing to main
```

## Decision Frameworks

### For Identifying Latest Implementation:
- ✅ Check file modification timestamps
- ✅ Analyze code completeness and test coverage
- ✅ Look for TODO/FIXME comments
- ✅ Consider code quality and project patterns

### For Cleanup Decisions:
- **Temporary files**: Remove if clearly generated (*.tmp, *.bak, *.log)
- **Debug code**: Remove if wrapped in debug flags or console.log/print
- **Commented code**: Remove if older than current implementation
- **Dead code**: Remove if no references exist and tests pass

## Safety Mechanisms

✅ Never remove files without explicit user confirmation
✅ Create cleanup summary before executing deletions
✅ Suggest creating backup branch before major cleanup
✅ Verify tests still pass after cleanup
✅ Provide clear explanations for all removals

## Common Use Cases

### After Feature Development
**Trigger**: "Smart commit after implementing authentication"

**Result**: Organized commits separating feature code, tests, and cleanup

### Before Pull Request
**Trigger**: "Smart commit and prepare for PR"

**Result**: Clean commit history ready for review

### After Experimentation
**Trigger**: "Smart commit after trying multiple approaches"

**Result**: Single best implementation, competing versions removed

## Success Criteria

✅ All changes detected (staged, unstaged, untracked)
✅ Temporary artifacts identified
✅ Competing implementations resolved
✅ Dead code removed (with confirmation)
✅ Related changes grouped into atomic commits
✅ Commit messages follow conventional format
✅ Tests pass after all commits
✅ Working directory clean
✅ Ready to push
