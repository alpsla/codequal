---
description: End-of-session cleanup and documentation
---

# Session Wrapper Workflow

**Purpose**: Wrap up development sessions cleanly with commits, documentation, and handoff

**When to use**: At the end of every development session

**Trigger**: "Wrap session" or "End session"

## Workflow Steps

### Phase 1: Review Session Work

**Check what was accomplished:**

1. **Review git status:**
```bash
git status --short
git log --oneline -10
```

2. **List modified files:**
```bash
git diff --name-only
git diff --cached --name-only
```

3. **Check for uncommitted work:**
   - Staged changes
   - Unstaged modifications
   - Untracked files

### Phase 2: Run Smart Commit Manager

**If uncommitted changes exist:**

**Trigger smart-commit-manager workflow:**
1. Detect all changes
2. Clean up temporary files
3. Resolve competing implementations
4. Create atomic commits
5. Verify tests pass

**Result**: Clean commit history ready to push

### Phase 3: Run Build CI Fixer

**Ensure everything passes:**

**Trigger build-ci-fixer workflow:**
1. Check build status
2. Fix any ESLint violations
3. Resolve test failures
4. Verify CI readiness

**Result**: All checks passing

### Phase 4: Update QUICK_START_NEXT_SESSION.md

**Document session progress:**

```markdown
# 🎯 QUICK START: NEXT SESSION

**Last Updated**: [Current Date]
**Current Phase**: [Phase from plan]
**Status**: [Current status]

---

## 🎉 SESSION ACHIEVEMENTS ([Date])

**Session Focus:** [What you worked on]

### ✅ Completed This Session

1. **[Achievement 1]** ✅
   - **What**: [What was done]
   - **Files**: [Modified files]
   - **Status**: ✅ COMMITTED (commit `[hash]`)

2. **[Achievement 2]** ✅
   - **What**: [What was done]
   - **Impact**: [Impact description]
   - **Status**: ✅ COMMITTED

### ⚠️ Pending Critical Issues

1. **[Issue 1]** 🔴
   - **Problem**: [Description]
   - **Impact**: [Impact]
   - **Next Step**: [What needs to be done]
   - **Status**: ⚠️ IN PROGRESS

### 📋 Immediate Next Priorities

1. **[Priority 1]** (requires [time estimate])
   - [Description]
   - [Why it's important]

2. **[Priority 2]** (requires [time estimate])
   - [Description]
   - [Why it's important]

---

## 🚀 IMMEDIATE NEXT STEPS

### Priority 1: [Task Name]
[Detailed description of what to do]

**Commands:**
```bash
[Copy-paste ready commands]
```

### Priority 2: [Task Name]
[Detailed description]

---

## 📊 PREVIOUS SESSION SUMMARY ([Previous Date])

[Keep previous session summary for context]

---

**Next Session:** [What to focus on]
**Session Owner:** [Your name]
**AI Assistant:** [AI name]
```

### Phase 5: Update Session Summary

**Create detailed session summary:**

Save to `packages/agents/src/two-branch/docs/next/SESSION_SUMMARY_[DATE].md`:

```markdown
# Session Summary - [Date]

**Duration**: [Start time] - [End time]
**Focus**: [Main focus of session]
**Status**: [Overall status]

## Objectives

### Planned:
- [Objective 1]
- [Objective 2]

### Achieved:
- ✅ [Objective 1]
- ✅ [Objective 2]

### Deferred:
- ⏸️ [Deferred item]

## Work Completed

### Feature Development
- [Feature 1]: [Description]
  - Files: [List]
  - Commit: [hash]

### Bug Fixes
- [Bug ID]: [Description]
  - Fix: [What was done]
  - Commit: [hash]

### Refactoring
- [Refactoring work]
  - Impact: [Description]

## Issues Discovered

### New Bugs:
- **BUG-XXX**: [Description]
  - Severity: [High/Medium/Low]
  - Status: [Tracked/Fixed]

### Blockers:
- [Blocker description]
  - Impact: [Impact]
  - Workaround: [If available]

## Metrics

- **Commits**: [Number]
- **Files Changed**: [Number]
- **Lines Added**: [Number]
- **Lines Removed**: [Number]
- **Tests Added**: [Number]
- **Bugs Fixed**: [Number]
- **Bugs Discovered**: [Number]

## Technical Decisions

1. **[Decision 1]**
   - **Context**: [Why decision was needed]
   - **Decision**: [What was decided]
   - **Rationale**: [Why this approach]
   - **Alternatives**: [What was considered]

## Lessons Learned

- [Lesson 1]
- [Lesson 2]

## Next Session Priorities

1. [Priority 1]
2. [Priority 2]
3. [Priority 3]

## Notes for Next Session

- [Important note 1]
- [Important note 2]
```

### Phase 6: Push Changes (Optional)

**If ready to push:**

```bash
# Review commits
git log --oneline -5

# Push to remote
git push origin [branch-name]
```

**If not ready:**
- Document why not pushing
- Note what needs to be done before push

### Phase 7: Generate Session Report

**Provide comprehensive session report:**

```markdown
## Session Wrap-Up Complete

### 📊 Session Statistics
- **Duration**: 3 hours 45 minutes
- **Commits Created**: 4
- **Files Modified**: 12
- **Tests Added**: 8
- **Bugs Fixed**: 2
- **Bugs Discovered**: 1

### ✅ Achievements
1. Implemented authentication system
2. Fixed login timeout bug
3. Added comprehensive test coverage
4. Cleaned up temporary artifacts

### 📝 Documentation Updated
- ✅ QUICK_START_NEXT_SESSION.md
- ✅ SESSION_SUMMARY_2025-11-19.md
- ✅ Bug reports (BUG-071)

### 🔄 Repository Status
- ✅ All changes committed
- ✅ Build passing
- ✅ Tests passing (45/45)
- ✅ ESLint clean
- ⏸️ Not pushed (waiting for review)

### 📋 Next Session Priorities
1. **Fix directory path issue** (30 min)
   - Rename "Code Prjects" → "CodeProjects"
   - Re-run V9 dogfooding test

2. **Complete Python support** (2 hours)
   - Finish testing
   - Update documentation

3. **Review and push changes** (30 min)
   - Final review
   - Push to remote

### 🎯 Ready for Next Session
All context saved to QUICK_START_NEXT_SESSION.md
Session summary saved to SESSION_SUMMARY_2025-11-19.md

**Next session will start with:**
"Start session" → Loads context and provides quick commands
```

## Integration with Other Workflows

### Triggers These Workflows:
1. **Smart Commit Manager** - If uncommitted changes
2. **Build CI Fixer** - To ensure clean state
3. **Bug Tracker** - To document new bugs

### Updates These Documents:
1. **QUICK_START_NEXT_SESSION.md** - For next session
2. **SESSION_SUMMARY_[DATE].md** - Detailed summary
3. **Bug reports** - If bugs discovered

## Common Use Cases

### Normal Session End
**Trigger**: "Wrap session"

**Result**: Commits created, docs updated, ready for next session

### Emergency Session End
**Trigger**: "Quick wrap session"

**Result**: Minimal documentation, work saved, can resume quickly

### Session with Bugs
**Trigger**: "Wrap session with bugs"

**Result**: Bugs documented, tracked, prioritized for next session

## Success Criteria

✅ All uncommitted work committed (or documented why not)
✅ Build and tests passing
✅ QUICK_START_NEXT_SESSION.md updated
✅ Session summary created
✅ Bugs documented (if any)
✅ Next priorities clearly defined
✅ Ready to push (or documented why not)
✅ Clean handoff for next session
