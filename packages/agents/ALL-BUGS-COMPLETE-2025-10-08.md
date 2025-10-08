# Complete Bug List - User Feedback (October 8, 2025)

## ✅ FIXED (Committed)
1. **BUG-129**: Existing issues = 0 (Two-branch analysis) - FIXED
2. **BUG-128**: Score = 50 instead of 0 - FIXED
3. **BUG-125**: Analysis Duration 0s (timing) - FIXED
4. **BUG-131**: Code snippets missing - FIXED

## 🔴 NOT YET FIXED (Need to implement)

### Report Formatter Issues (v9-report-formatter.ts)

**BUG-142: Confidence Display Shows 8500%**
- Location: v9-report-formatter.ts
- Issue: Confidence 85 multiplied by 100 = 8500%
- Fix: Don't multiply confidence by 100
```typescript
// Wrong:
Confidence: ${result.confidence * 100}%

// Right:
Confidence: ${result.confidence}%
```

**BUG-143: Dependency-Check Timing Shows 0s Instead of 219s**
- Location: Report tool performance table
- Issue: Tool timing not propagated from orchestrator
- Fix: Use real timing from toolResults
```typescript
toolsUsed: prResult.toolResults.map(t => ({
  executionTime: t.duration || 0, // Use actual duration
}))
```

**BUG-144: Score Calculation Explanation Confusing**
- Location: Score calculation section
- Current shows:
  ```
  Base Score: 100.0
  New Issues Deduction: -268.0
  Existing Issues Deduction: -0.0
  Final Score: 50.0  ← Should be 0
  ```
- After BUG-128 fix, this will show 0, but explanation still confusing
- Fix: Show clamping clearly
```typescript
Base Score: 100.0
Issues Penalty: -268.0 (84 blocking × 5 + 16 medium × 2)
Calculated Score: -168.0
Final Score: 0.0 (clamped to minimum)
```

**BUG-145: Lines per Second Calculation Wrong**
- Shows: 1,455,479 lines/sec
- Reality: 850,000 lines / 594s = 1,431 lines/sec
- Fix: Correct division

**BUG-146: Repository Clone Timing Shows 0.0s**
- Location: Performance metrics table
- Issue: Not using real cloneTime variable
- Fix: Use actual cloneTime from metadata

**BUG-147: Financial Impact Section All N/A**
- Location: Executive Summary
- Shows meaningless N/A values
- Options:
  1. Remove section entirely (recommended)
  2. Calculate real estimates
- Recommendation: REMOVE until we have real calculations

**BUG-148: Risk Matrix Contradiction**
- Shows "No risks identified"
- But also shows "Architecture: 84 blocking, High impact"
- This is contradictory!
- Fix: Single consistent risk calculation

**BUG-149: Personalized Recommendations Hardcoded**
- Not based on actual issue patterns
- Fix: Generate from actual data:
```typescript
if (hasMany('LoggerIsNotStaticFinal')) {
  recommend("Review logging patterns")
}
```

**BUG-150: Team Analytics Shows "Coming Soon"**
- Should query Supabase for user history
- Use git history for baseline scores
- Calculate trends
- Fix: Implement real team analytics

**BUG-151: Training Priorities Hardcoded**
- Not connected to actual issues
- Fix: Generate from issue categories

**BUG-152: Educator Returns 0 Results**
- Educational links show no results
- Fix: Debug V9EducationalResources
- Add fallback to general best practices

**BUG-153: Missing Agent Models Performance Table**
- Should show:
  - Agent name
  - Model used
  - Tokens consumed
  - Time taken
  - Cost
  - Issues found
- Fix: Add new section with agent metrics

**BUG-154: Semgrep Issues Missing from Report**
- Test found 11 Semgrep issues
- Report doesn't show them
- Shows "0.0s | 3472 | 11 | 100%" - timing wrong
- Fix: Ensure all tool issues included

### Orchestrator/Tool Issues

**BUG-155: PMD Severity Mapping Too Aggressive**
- LoggerIsNotStaticFinal → HIGH (should be MEDIUM)
- ReturnEmptyCollectionRatherThanNull → HIGH (should be MEDIUM)
- Fix: Add severity override map in java-tool-orchestrator.ts
```typescript
const severityOverrides = {
  'LoggerIsNotStaticFinal': 'medium',
  'ReturnEmptyCollectionRatherThanNull': 'medium',
  'AvoidBranchingStatementAsLastInLoop': 'medium'
};
```

**BUG-156: Dependency-Check Wrong Expected Time**
- User says "should take 5 seconds"
- Actually took 219s in test
- Either:
  1. Expectation wrong (CVE database takes time)
  2. Configuration issue (not using cache properly)
- Investigation needed

**BUG-157: Issue Grouping Needed**
- 84 identical LoggerIsNotStaticFinal issues listed separately
- Should group by rule with file list
- Fix: Add grouping logic in report formatter
```markdown
LoggerIsNotStaticFinal (84 instances)
Files:
- AbortTransactionHandler.java:43
- AdminMetadataManager.java:46
... (show all)
```

**BUG-158: AI Fix Quality Inconsistent**
- One fix shows full code example
- Others show truncated/generic fixes
- Fix: Ensure consistent AI prompt + response handling

**BUG-159: Files Modified Count Wrong**
- Shows 4509 modified files
- Repository only has 3472 total files!
- Fix: Debug getModifiedFilesBetweenBranches
- May be counting renames/moves twice

## Priority Implementation Order

### Phase 1: Critical Data Accuracy (30 min)
1. ✅ BUG-142: Confidence display (1 line)
2. ✅ BUG-143: Dependency-Check timing (propagate from orchestrator)
3. ✅ BUG-144: Score explanation clarity
4. ✅ BUG-145: Lines per second calculation
5. ✅ BUG-146: Clone timing display
6. ✅ BUG-159: Files modified count

### Phase 2: Remove Placeholders (15 min)
7. ✅ BUG-147: Remove Financial Impact section
8. ✅ BUG-148: Fix Risk Matrix logic
9. ✅ BUG-151: Remove hardcoded training priorities

### Phase 3: Severity & Grouping (30 min)
10. ✅ BUG-155: PMD severity overrides
11. ✅ BUG-157: Issue grouping by rule

### Phase 4: Missing Features (45 min)
12. ✅ BUG-149: Generate personalized recommendations
13. ✅ BUG-152: Fix Educator or add fallback
14. ✅ BUG-153: Add agent performance table
15. ✅ BUG-154: Include all Semgrep issues

### Phase 5: Quality Improvements (30 min)
16. ✅ BUG-150: Team analytics from Supabase
17. ✅ BUG-158: AI fix consistency
18. ✅ BUG-156: Investigate Dependency-Check timing

## Total: 18 bugs remaining
**Estimated time: 2.5 hours**

## Files to Modify

1. **v9-report-formatter.ts** (Most bugs)
   - BUG-142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 157

2. **java-tool-orchestrator.ts**
   - BUG-143 (timing propagation)
   - BUG-155 (severity overrides)

3. **test-v9-e2e-complete.ts**
   - BUG-159 (file count validation)

4. **git-utils.ts**
   - BUG-159 (investigate getModifiedFilesBetweenBranches)

5. **specialized-agents.ts**
   - BUG-158 (AI fix consistency)

## Next Steps

1. Implement Phase 1 (Critical Data Accuracy)
2. Commit
3. Run test on Oracle
4. Validate fixes
5. Continue with Phase 2-5
