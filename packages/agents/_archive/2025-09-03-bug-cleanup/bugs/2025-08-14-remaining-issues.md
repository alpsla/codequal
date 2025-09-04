# Bug Tickets - Report Generation Issues
**Date:** 2025-08-14
**Component:** Report Generator V7 Fixed

## 🐛 BUG-001: Model Name Shows Mock Value in Production Reports
**Severity:** Medium
**Status:** Open

### Description
When running with real DeepWiki API, the report still shows "mock/MOCK-MODEL-NOT-FROM-SUPABASE" instead of the actual model used (e.g., "gpt-4o").

### Current Behavior
- Model name displays mock value even in production runs
- The filter for mock models is in place but may not be capturing all cases

### Expected Behavior
- Should display actual model name used (e.g., "gpt-4o", "gpt-4-turbo")
- Mock model names should never appear in production reports

### Location
- File: `src/standard/comparison/report-generator-v7-fixed.ts`
- Method: `generateHeader()`
- Line: ~145

### Suggested Fix
```typescript
// Ensure model name is properly passed from orchestrator
// Check if modelUsed is being set correctly in ComparisonAgentProduction
// May need to trace through the full data flow from DeepWiki response
```

---

## 🐛 BUG-002: Decimal Precision Still Shows Floating Point Errors
**Severity:** Low
**Status:** Open

### Description
Some score values still show floating point precision errors (e.g., "55.010000000000005" instead of "55.01").

### Current Behavior
- Overall scores sometimes show excessive decimal places
- Score calculations use Math.round() but some edge cases remain

### Expected Behavior
- All scores should show exactly 2 decimal places
- No floating point artifacts should be visible

### Location
- Various score calculations throughout report generator
- May be related to JavaScript floating point arithmetic

### Suggested Fix
```typescript
// Use a more robust rounding function:
const roundToTwo = (num: number) => {
  return Math.round((num + Number.EPSILON) * 100) / 100;
};
```

---

## 🐛 BUG-003: Skills Tracking Section Format Inconsistent
**Severity:** Low
**Status:** Open

### Description
The enhanced skills tracking section with team performance table doesn't always render in production reports.

### Current Behavior
- Sometimes shows old format without team table
- Detailed skill breakdown may be missing

### Expected Behavior
- Should always show enhanced format with:
  - Individual skill breakdown by category
  - Team performance table
  - Detailed calculation explanations

### Location
- File: `src/standard/comparison/report-generator-v7-fixed.ts`
- Method: `generateSkillsTracking()`
- Line: ~889

### Notes
- May be related to caching or report generation timing
- Enhanced format is implemented but not consistently applied

---

## 📝 Notes for Future Improvements

1. **Caching Considerations**
   - Redis cache may be serving old report formats
   - Consider cache invalidation strategy when report format changes

2. **Model Selection**
   - Dynamic model selector should pass selected model through entire pipeline
   - Ensure model name is preserved from DeepWiki response to final report

3. **Decimal Precision**
   - Consider using a decimal library for financial/score calculations
   - Implement consistent rounding utility function

4. **Testing**
   - Add specific test cases for model name display
   - Add test cases for decimal precision edge cases
   - Ensure skills tracking format is tested