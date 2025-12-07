# Best Practice Workflow Combinations

This document describes recommended workflow combinations for common development scenarios.

## 🎯 Complete Session Cycle

**The ideal development session flow:**

### 1. Session Start
```
"Start session"
```
**Workflow**: session-starter.md
**Result**: Environment ready, context loaded, priorities clear

### 2. Development Work
[Your coding work here]

### 3. Session End
```
"Wrap session"
```
**Workflow**: session-wrapper.md
**Result**: Clean commits, documentation updated, ready for next session

---

## 🔄 Common Workflow Combinations

### Combination 1: Feature Development Cycle

**Scenario**: Implementing a new feature from start to finish

**Workflow Sequence:**

1. **Start Session**
   ```
   "Start session"
   ```
   - Load context
   - Check environment
   - Review priorities

2. **Develop Feature**
   - Write code
   - Add tests
   - Update documentation

3. **Fix Build Issues**
   ```
   "Fix build"
   ```
   - Resolve any build errors
   - Fix ESLint violations
   - Ensure tests pass

4. **Create Commits**
   ```
   "Smart commit"
   ```
   - Clean up temporary files
   - Create atomic commits
   - Write good commit messages

5. **Wrap Session**
   ```
   "Wrap session"
   ```
   - Update session docs
   - Document progress
   - Set next priorities

**Total Time**: ~4-6 hours
**Result**: Feature complete, tested, committed, documented

---

### Combination 2: Bug Fix Cycle

**Scenario**: Fixing a reported bug

**Workflow Sequence:**

1. **Start Session**
   ```
   "Start session"
   ```

2. **Track Bug** (if not already tracked)
   ```
   "Track bug for [description]"
   ```
   - Create bug report
   - Assign severity
   - Document reproduction

3. **Fix Bug**
   - Implement fix
   - Add regression test
   - Verify fix works

4. **Fix Build**
   ```
   "Fix build"
   ```
   - Ensure tests pass
   - Fix any lint issues

5. **Commit Fix**
   ```
   "Smart commit"
   ```
   - Create fix commit
   - Reference bug ID

6. **Wrap Session**
   ```
   "Wrap session"
   ```
   - Update bug status
   - Document resolution

**Total Time**: ~1-2 hours
**Result**: Bug fixed, tested, committed, documented

---

### Combination 3: Weekly Strategic Review

**Scenario**: Weekly business and technical review

**Workflow Sequence:**

1. **Start Session**
   ```
   "Start session"
   ```

2. **Business Analysis**
   ```
   "Run business owner analysis for weekly status"
   ```
   - Review development progress
   - Check bug status
   - Analyze metrics
   - Get market intelligence (auto-triggers market researcher)

3. **Review Recommendations**
   - Read generated report
   - Make strategic decisions
   - Update priorities

4. **Update Planning**
   - Adjust roadmap if needed
   - Reprioritize features
   - Update QUICK_START_NEXT_SESSION.md

**Total Time**: ~1 hour
**Result**: Strategic clarity, priorities updated, informed decisions

---

### Combination 4: Pre-Release Checklist

**Scenario**: Preparing for a release

**Workflow Sequence:**

1. **Start Session**
   ```
   "Start session"
   ```

2. **Fix All Issues**
   ```
   "Fix build"
   ```
   - Resolve all build errors
   - Fix all ESLint violations
   - Ensure all tests pass

3. **Clean Up Codebase**
   ```
   "Smart commit"
   ```
   - Remove temporary files
   - Clean up dead code
   - Create final commits

4. **Business Review**
   ```
   "Run business owner analysis for release decision"
   ```
   - Verify release readiness
   - Check bug status
   - Review market timing

5. **Final Documentation**
   ```
   "Wrap session"
   ```
   - Update all docs
   - Create release notes
   - Tag release

**Total Time**: ~2-3 hours
**Result**: Release-ready codebase, documented, approved

---

### Combination 5: Competitive Analysis

**Scenario**: Analyzing competitor moves

**Workflow Sequence:**

1. **Market Research**
   ```
   "Run market researcher for [competitor] latest features"
   ```
   - Research competitor
   - Analyze features
   - Check pricing

2. **Strategic Analysis**
   ```
   "Run business owner analysis for competitive response"
   ```
   - Analyze competitive threat
   - Determine response strategy
   - Prioritize features

3. **Update Roadmap**
   - Adjust feature priorities
   - Update marketing messaging
   - Document decisions

**Total Time**: ~1-2 hours
**Result**: Competitive intelligence, response strategy, updated priorities

---

### Combination 6: Debugging Session

**Scenario**: Investigating and fixing multiple bugs

**Workflow Sequence:**

1. **Start Session**
   ```
   "Start session"
   ```

2. **Track Bugs**
   ```
   "Track bug for [bug 1]"
   "Track bug for [bug 2]"
   "Track bug for [bug 3]"
   ```

3. **Fix Bugs One by One**
   - Fix bug 1
   - Test fix
   - Commit
   - Repeat for each bug

4. **Verify All Fixes**
   ```
   "Fix build"
   ```
   - Run full test suite
   - Check for regressions

5. **Wrap Session**
   ```
   "Wrap session"
   ```
   - Update bug statuses
   - Document fixes

**Total Time**: ~3-4 hours
**Result**: Multiple bugs fixed, tested, documented

---

## 📅 Recommended Schedules

### Daily (Every Session)
```
1. "Start session" (beginning)
2. [Development work]
3. "Wrap session" (end)
```

### Weekly
```
1. "Run business owner analysis for weekly status"
2. Review and adjust priorities
```

### As Needed
```
- "Smart commit" (before pushing)
- "Fix build" (when CI fails)
- "Track bug" (when bugs discovered)
- "Run market researcher" (for competitive intel)
```

---

## 🎯 Workflow Decision Tree

```
Starting work?
  → "Start session"

Finished coding?
  → Has uncommitted changes?
      → Yes: "Smart commit"
      → No: Continue

Build/tests failing?
  → "Fix build"

Found bugs?
  → "Track bug"

Need strategic guidance?
  → "Run business owner analysis"

Need market intelligence?
  → "Run market researcher"

Ending session?
  → "Wrap session"
```

---

## 💡 Pro Tips

### 1. Always Start and End Properly
```
Start: "Start session"
End: "Wrap session"
```
This ensures continuity between sessions.

### 2. Commit Often
```
After each feature: "Smart commit"
```
Don't wait until end of session.

### 3. Fix Issues Immediately
```
Build fails: "Fix build" immediately
```
Don't accumulate technical debt.

### 4. Track Bugs When Discovered
```
Found bug: "Track bug" right away
```
Don't rely on memory.

### 5. Weekly Strategic Reviews
```
Every Monday: "Run business owner analysis"
```
Stay aligned with business goals.

---

## 🚀 Advanced Combinations

### Full Development Sprint (1 Week)

**Monday:**
```
1. "Start session"
2. "Run business owner analysis for weekly status"
3. Review priorities
4. "Wrap session"
```

**Tuesday-Thursday:**
```
1. "Start session"
2. [Development work]
3. "Smart commit" (multiple times)
4. "Fix build" (as needed)
5. "Wrap session"
```

**Friday:**
```
1. "Start session"
2. "Fix build" (final cleanup)
3. "Smart commit" (final commits)
4. "Run business owner analysis for weekly review"
5. "Wrap session"
```

---

## 📊 Workflow Metrics

Track these metrics to optimize your workflow:

- **Session Start Time**: How long to get started?
- **Commit Frequency**: How often do you commit?
- **Build Fix Time**: How long to fix build issues?
- **Bug Discovery Rate**: How many bugs per session?
- **Documentation Quality**: Are session docs complete?

**Goal**: Reduce friction, increase productivity, maintain quality.

---

**Remember**: These are guidelines, not rigid rules. Adapt to your needs!
