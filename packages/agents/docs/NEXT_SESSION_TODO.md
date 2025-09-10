# Next Session TODO List
*Generated: August 23, 2025*

## 🚨 Critical Priority - Location System Crisis

### 1. Fix Location Parsing Pipeline (BUG-068, BUG-072, BUG-042)
**The Big Problem:** ALL issues show "Unknown location" despite DeepWiki providing data
- [ ] Debug why location data is lost in the pipeline
- [ ] Check DeepWikiResponseTransformer location extraction
- [ ] Verify location data flow from DeepWiki → Parser → Report
- [ ] Test with real DeepWiki responses to see actual data structure

### 2. Clean Up Location Service Duplicates 🧹
**We have 7 different location services!** Time to consolidate:

#### Files to Review and Potentially Archive:
```
src/standard/services/
  ├── location-finder.ts           # Original basic implementation
  ├── location-finder-enhanced.ts  # Enhanced version 1
  ├── enhanced-location-finder.ts  # Enhanced version 2 (different!)
  ├── location-enhancer.ts         # Enhancement layer
  ├── ai-location-finder.ts        # AI-powered finder
  ├── location-validator.ts        # Validation service
  └── src/standard/deepwiki/services/
      └── location-clarifier.ts    # DeepWiki specific
```

**Recommendation:** 
- Keep ONE primary service (likely `enhanced-location-finder.ts` based on recent usage)
- Archive the rest to `_archive/location-services-cleanup/`
- Update all imports to use the single source of truth

### 3. DeepWiki PR Diff Analysis (BUG-092) 
**Major Issue:** DeepWiki analyzes entire repos, not PR diffs!
- [ ] Research alternative tools (CodeQL, Semgrep, GitHub API for diffs)
- [ ] Implement PR diff extraction before DeepWiki analysis
- [ ] Consider hybrid approach: Git diff + DeepWiki on changed files only

## 🔧 High Priority - Core Functionality

### 4. Fix Issue Count Regression (BUG-040)
- [ ] Debug why we went from 15 issues → 7 issues
- [ ] Check if location validation (70% confidence) is too aggressive
- [ ] Review issue filtering logic in comparison agent

### 5. Restore Missing Detection Systems
- [ ] Fix Performance Issues detection (BUG-044)
- [ ] Fix Breaking Changes detection (BUG-046)
- [ ] Fix Architecture ASCII visualization (BUG-075)

### 6. Fix PR Metadata (BUG-070)
- [ ] Repository showing as "Unknown"
- [ ] PR showing as "#0 - Untitled"
- [ ] Extract proper metadata from GitHub URL

## 📊 Medium Priority - Report Quality

### 7. Enhance Report Content
- [ ] Add missing code snippets (BUG-041)
- [ ] Fix issue type showing "undefined" (BUG-069)
- [ ] Improve Educational Insights specificity (BUG-078)
- [ ] Fix Business Impact section quality (BUG-081)

### 8. Fix Score Calculation (BUG-071)
- [ ] Review why scores are 24/100 for minor issues
- [ ] Implement proper severity weighting
- [ ] Update Individual Skills based on scores (BUG-079)

## 🧹 Code Cleanup Tasks

### 9. Archive Obsolete Code
**Location Services Cleanup:**
- [ ] Identify which location service is actually used
- [ ] Archive 6 duplicate implementations
- [ ] Update all imports to single service
- [ ] Document which approach we're keeping and why

**Other Potential Archives:**
- [ ] Review `src/standard/comparison/` for duplicate report generators
- [ ] Check for obsolete DeepWiki parsers
- [ ] Remove commented-out code blocks

### 10. Remove Temporary Solutions
- [ ] Remove console.log statements (BUG-003: ~350 instances!)
- [ ] Replace TODO comments with actual implementations
- [ ] Remove debug files (debug-*.json, debug-*.txt)

## 🚀 Enhancement Opportunities

### 11. Implement Smart Caching
- [ ] Cache DeepWiki responses by commit hash (BUG-093)
- [ ] Implement deterministic test data
- [ ] Add cache invalidation strategy

### 12. Improve Error Handling
- [ ] Add user-friendly error messages when DeepWiki fails
- [ ] Implement fallback strategies for missing data
- [ ] Add retry logic with exponential backoff

### 13. Session State Management (BUG-095)
- [ ] Persist session configuration
- [ ] Auto-restore DeepWiki connection
- [ ] Remember last analyzed repository

## 📝 Documentation Updates

### 14. Update Architecture Docs
- [ ] Document the chosen location service approach
- [ ] Update data flow diagrams
- [ ] Document DeepWiki limitations and workarounds

### 15. Create Troubleshooting Guide
- [ ] Common DeepWiki errors and solutions
- [ ] Location parsing debugging steps
- [ ] Report generation issue checklist

## 🎯 Quick Wins (Can do between other tasks)

- [ ] Fix ESLint errors (40 critical)
- [ ] Add missing TypeScript types
- [ ] Update deprecated dependencies
- [ ] Remove unused imports
- [ ] Standardize error messages

## 📈 Success Metrics

After completing these tasks, we should have:
- ✅ All issues showing proper file:line locations
- ✅ Consistent issue counts across runs
- ✅ ONE location service instead of 7
- ✅ PR-specific analysis (not entire repo)
- ✅ Proper PR metadata display
- ✅ All detection systems working
- ✅ Clean, maintainable codebase

## 🔥 Top 3 for Next Session

1. **Fix Location System** - This breaks everything else
2. **Clean up duplicate location services** - Too confusing
3. **Implement PR diff analysis** - Core functionality gap

---

## Notes from Previous Session
- Removed all mock functionality ✅
- Archived 21 test files ✅
- Now using real DeepWiki always ✅
- Need to handle real failures properly (this TODO list!)

## Commands to Start Next Session
```bash
# 1. Check DeepWiki connection

# 2. Port forward if needed

# 3. Test location parsing
npx ts-node src/standard/tests/regression/manual-pr-validator.ts https://github.com/sindresorhus/ky/pull/700

# 4. Check bug status
cat src/standard/tests/production-ready-state-test.ts | grep "BUG-" | grep -v "FIXED"
```