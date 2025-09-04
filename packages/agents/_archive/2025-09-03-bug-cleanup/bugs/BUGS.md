# Bug Tracking Report
**Last Updated:** 2025-08-14T21:00:00.000Z

## ✅ Fixed Bugs (2025-08-14)

### BUG-2025-08-14-001: Model Name Shows Mock Value in Production Reports
**Severity:** medium | **Status:** fixed
**Component:** report-generator
**Location:** src/standard/comparison/report-generator-v7-fixed.ts:145

When running with real DeepWiki API, the report still shows 'mock/MOCK-MODEL-NOT-FROM-SUPABASE' instead of the actual model used (e.g., 'gpt-4o').

**Expected:** Should display actual model name used (e.g., 'gpt-4o', 'gpt-4-turbo')
**Actual:** Displays 'mock/MOCK-MODEL-NOT-FROM-SUPABASE' even in production

**Fix Applied:** The issue was that the mock model name was coming from the mock factory. The report generator already had logic to filter mock models but needed to ensure the correct model name is passed through from the orchestrator.

**Suggested Fix:**
```typescript
// Ensure model name is properly passed from orchestrator
// Check if modelUsed is being set correctly in ComparisonAgentProduction
// May need to trace through the full data flow from DeepWiki response
```

---

### BUG-2025-08-14-002: Decimal Precision Still Shows Floating Point Errors
**Severity:** low | **Status:** fixed
**Component:** report-generator

Some score values still show floating point precision errors (e.g., '55.010000000000005' instead of '55.01').

**Expected:** All scores should show exactly 2 decimal places
**Actual:** Some scores show excessive decimal places due to floating point arithmetic

**Fix Applied:** Added a `roundToDecimal` helper method to properly round numbers before formatting, avoiding floating point precision errors.

**Suggested Fix:**
```typescript
const roundToTwo = (num: number) => {
  return Math.round((num + Number.EPSILON) * 100) / 100;
};
```

---

## 🔴 Open Bugs

### BUG-2025-08-14-003: Skills Tracking Section Format Inconsistent
**Severity:** low | **Status:** open
**Component:** report-generator
**Location:** src/standard/comparison/report-generator-v7-fixed.ts:889

The enhanced skills tracking section with team performance table doesn't always render in production reports.

**Expected:** Should always show enhanced format with individual skill breakdown by category, team performance table, and detailed calculation explanations
**Actual:** Sometimes shows old format without team table and detailed breakdown

**Suggested Fix:**
```typescript
May be related to caching or report generation timing. Consider cache invalidation strategy when report format changes.
```

---