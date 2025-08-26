# TODO List - Post-Cleanup Testing & Bug Fixes
## Created: 2025-08-25

## 🚨 CRITICAL PRIORITY - Validate Cleanup Impact

### 1. Build & Compilation Verification
- [ ] Run full build: `npm run build`
- [ ] Check for any TypeScript errors that may have been missed
- [ ] Verify all imports are resolved correctly
- [ ] Check that archived files are not being imported anywhere

### 2. Test Suite Health Check
- [ ] Run all unit tests: `npm test`
- [ ] Run integration tests: `npm test src/standard/tests/integration/`
- [ ] Run regression tests: `npm test src/standard/tests/regression/`
- [ ] Document any failing tests after cleanup

## 🔍 HIGH PRIORITY - Location Service Issues

### 3. Consolidate Location Services (BUG-096)
**Problem**: 7 duplicate location finding services identified
- [ ] Review and document differences between:
  - `EnhancedLocationFinder` (keeping this one)
  - `UnifiedLocationService` 
  - `LocationEnhancer`
  - `BatchLocationEnhancer`
  - Any remaining duplicates
- [ ] Create migration plan to single service
- [ ] Update all references to use consolidated service
- [ ] Remove/archive redundant implementations

### 4. Fix "Unknown Location" Bug (BUG-097)
**Problem**: All issues showing "Unknown location" in reports
- [ ] Verify DirectDeepWikiApiWithLocation returns code snippets
- [ ] Check EnhancedLocationFinder receives snippets correctly
- [ ] Debug location search in cloned repositories
- [ ] Ensure repository cloning works for both main and PR branches
- [ ] Test with real PR: `https://github.com/sindresorhus/ky/pull/700`

## 🧪 MEDIUM PRIORITY - Integration Testing

### 5. DeepWiki Integration Validation
```bash
# Test command sequence
kubectl port-forward -n codequal-dev deployment/deepwiki 8001:8001
USE_DEEPWIKI_MOCK=false npm test
```
- [ ] Test with mock mode: `USE_DEEPWIKI_MOCK=true`
- [ ] Test with real DeepWiki: `USE_DEEPWIKI_MOCK=false`
- [ ] Verify response parsing works correctly
- [ ] Check that code snippets are extracted

### 6. End-to-End PR Analysis Testing
- [ ] Test with small PR (< 100 lines)
- [ ] Test with medium PR (100-500 lines)
- [ ] Test with large PR (> 500 lines)
- [ ] Verify all report sections generate correctly
- [ ] Check skill tracking calculations
- [ ] Validate PR impact statistics

### 7. Report Generation Validation
- [ ] Verify ReportGeneratorV8Final works without HTMLIssueFormatter
- [ ] Check all 12 sections render correctly
- [ ] Validate markdown formatting
- [ ] Test HTML output generation
- [ ] Ensure location data appears in reports

## 🔧 NORMAL PRIORITY - Service Integration

### 8. Orchestrator Integration Check
- [ ] Verify ComparisonOrchestrator works with cleaned services
- [ ] Test model configuration pull from Supabase
- [ ] Check parallel processing (location enhancement + education)
- [ ] Validate error handling paths

### 9. API Endpoint Testing
- [ ] Test `/api/analyze` endpoint
- [ ] Verify run-complete-analysis.ts script works
- [ ] Check manual-pr-validator.ts functionality
- [ ] Test CLI integration

### 10. Caching & Performance
- [ ] Verify repository caching in `/tmp/codequal-repos`
- [ ] Test Redis caching if configured
- [ ] Check location search performance
- [ ] Monitor memory usage during analysis

## 📊 LOW PRIORITY - Monitoring & Documentation

### 11. Update Documentation
- [ ] Update README with current architecture
- [ ] Document known issues and solutions
- [ ] Create troubleshooting guide
- [ ] Update API documentation

### 12. Setup Monitoring
- [ ] Add logging for location finding process
- [ ] Track success rate of location searches
- [ ] Monitor DeepWiki response times
- [ ] Setup alerts for critical failures

## 🐛 Known Issues to Fix

### From Previous Testing
1. **PR Stats Issue**: "0 new, 21 resolved" - likely due to location mismatch
2. **Code Snippets**: Verify DeepWiki returns actual code, not just descriptions
3. **Branch Handling**: Ensure correct branch is analyzed for PRs
4. **Cache Invalidation**: Old cached results may have wrong structure

### Quick Test Commands

```bash
# 1. Build verification
npm run build && npm run typecheck

# 2. Quick integration test
USE_DEEPWIKI_MOCK=true npx ts-node test-v8-final.ts

# 3. Location finder test
USE_DEEPWIKI_MOCK=true npx ts-node test-location-enhancement.ts

# 4. Full PR analysis test
USE_DEEPWIKI_MOCK=false npx ts-node src/standard/tests/regression/manual-pr-validator.ts https://github.com/sindresorhus/ky/pull/700

# 5. Check for remaining imports to archived files
grep -r "from.*_archive" src --include="*.ts" | grep -v "^src/.*_archive"
```

## 📈 Success Metrics

The cleanup and fixes are successful when:
- ✅ All tests pass (unit, integration, regression)
- ✅ No "Unknown location" in reports
- ✅ PR statistics are accurate (new/fixed/unchanged counts)
- ✅ Location confidence > 70% for most issues
- ✅ Build has 0 errors and 0 warnings
- ✅ Real DeepWiki integration works end-to-end

## 🎯 Next Session Focus

**Primary Goal**: Get location finding working reliably
1. Start with build/test validation (30 min)
2. Focus on BUG-096 and BUG-097 (2 hours)
3. Run comprehensive integration tests (1 hour)
4. Document findings and fixes (30 min)

**Expected Outcome**: Working PR analysis with accurate file locations

---
*Created after cleanup session on 2025-08-25*
*Estimated completion time: 1-2 sessions*
*Priority: CRITICAL - System not usable without location fixes*