# CRITICAL REGRESSION REPORT
**Date:** 2025-08-15
**Test:** Real Data Test with DeepWiki (sindresorhus/ky PR #700)
**Status:** 🔴 CRITICAL - Multiple major features broken

## Summary
After fixing BUG-2025-08-14-001 and BUG-2025-08-14-002, we have introduced severe regressions that break core functionality of the CodeQual analysis reports.

## 🚨 CRITICAL REGRESSION ISSUES

### 1. Model Selection Issue
**Severity:** HIGH
**Status:** BROKEN
**Evidence:** Line 7 of report shows `google/gemini-2.0-flash`
**Problem:** 
- Model appears hardcoded or incorrectly selected
- Should be using dynamic model selection (gpt-4o, claude-3, etc.)
- The model `google/gemini-2.0-flash` is outdated
**Impact:** Using suboptimal models for analysis

### 2. Floating Point Errors Still Present
**Severity:** MEDIUM  
**Status:** PARTIALLY BROKEN
**Evidence:** 
- Line 22: `54.010000000000005/100`
- Line 30: `-20.989999999999995 points`
**Problem:** Our roundToDecimal fix is not being applied everywhere
**Files to Check:** 
- `report-generator-v7-fixed.ts`
- All score calculation locations

### 3. File Paths Missing - Shows "unknown"
**Severity:** HIGH
**Status:** BROKEN
**Evidence:** Throughout report, e.g.:
- Line 68: `**File:** unknown:471:55`
- Line 74: `**File:** unknown:82:57`
**Problem:** 
- File paths are lost/not passed through
- Location within file is present (line:column) but filename is "unknown"
**Impact:** Developers cannot locate issues to fix them

### 4. Issue Titles/Descriptions Missing or Generic
**Severity:** HIGH
**Status:** BROKEN
**Evidence:**
- Line 67-70: Title is actually the full description
- Line 249: Generic/unhelpful titles
**Problem:**
- Issues lack concise titles
- Descriptions are being used as titles
- No clear separation between title and description
**Impact:** Poor readability, unclear action items

### 5. Educational Insights Not Specific
**Severity:** MEDIUM
**Status:** BROKEN
**Evidence:** Lines 291-307
**Problem:**
- Generic recommendations instead of specific to actual issues
- Missing integration with training materials search
- Lost the feature to find relevant tutorials/courses
**Previous Feature:** Used to search for specific training based on actual issue types

### 6. Technical Debt Section Empty
**Severity:** MEDIUM
**Status:** BROKEN
**Evidence:** Line 427 - Section header exists but no content
**Problem:**
- Repository issues (pre-existing) should be listed here
- Report shows 3 pre-existing issues but they're not in this section
**Expected:** Should list the 2 medium and 1 low pre-existing issues

### 7. Team Impact Section Missing
**Severity:** MEDIUM
**Status:** MISSING
**Problem:** 
- Entire team performance metrics section is missing
- Should show team averages, performance trends
- Missing collaborative metrics

### 8. Issue Categorization Problems
**Severity:** MEDIUM
**Evidence:** Many issues have category "unknown"
**Problem:**
- AI categorization not working
- Categories defaulting to "unknown"
- Impacts skill tracking accuracy

## Root Cause Analysis

### CONFIRMED ROOT CAUSES:

1. **Model Selection Failure:**
   - `DynamicModelSelector.fetchAllModels()` throws error: "OpenRouter API key not configured"
   - This causes fallback to hardcoded `google/gemini-2.0-flash` in `comparison-agent.ts`
   - The system SHOULD be using stored model configurations from Supabase based on context (role, language, size)
   - Instead, it's trying to fetch from OpenRouter API which fails

2. **File Path Loss:**
   - `deepwiki-service.ts` line 169 & 176: Defaults to 'unknown' when file not in response
   - DeepWiki may not be returning file paths in the expected format
   - Location mapping is incomplete

3. **Data Structure Issues:**
   - Issues are missing proper title/description separation
   - The full description is being used as the title
   - Categories are not being properly assigned

### Likely Causes:
1. **Configuration Service Not Connected:** Model configuration service that should fetch from stored configs is not being used
2. **DeepWiki Response Format:** May have changed or not providing expected data
3. **Mapping Layer Broken:** Issue transformation losing critical data
4. **Missing Service Initialization:** Required services not properly initialized

### Investigation Points:
1. Check DeepWikiApiWrapper response parsing
2. Verify ComparisonAgentProduction data flow
3. Review issue mapping in comparison logic
4. Check ReportGeneratorV7Fixed input validation

## Immediate Actions Required

1. **Rollback Option:** Consider reverting recent changes
2. **Debug Data Flow:** Add logging at each transformation point
3. **Verify DeepWiki Response:** Check actual API response structure
4. **Fix Model Selection:** Investigate hardcoded model issue
5. **Restore File Paths:** Trace where file information is lost
6. **Fix Scoring:** Apply roundToDecimal everywhere needed
7. **Restore Features:** Re-implement missing sections

## Test Cases Needed

```typescript
// Test 1: Verify file paths are preserved
expect(issue.file).not.toBe('unknown');
expect(issue.file).toMatch(/\.(ts|js|tsx|jsx)$/);

// Test 2: Verify issue titles exist
expect(issue.title).toBeDefined();
expect(issue.title).not.toBe(issue.description);

// Test 3: Verify model selection
expect(modelUsed).not.toContain('gemini-2.0-flash');
expect(['gpt-4o', 'claude-3-opus', 'gpt-4-turbo']).toContain(modelUsed);

// Test 4: Verify floating point precision
expect(score.toString()).not.toMatch(/\.\d{10,}/);

// Test 5: Verify educational insights are specific
expect(educationalInsights).toContain(actualIssueTypes);

// Test 6: Verify technical debt section
expect(technicalDebtSection).toHaveLength(preExistingIssues.length);

// Test 7: Verify team impact exists
expect(report).toContain('Team Performance Metrics');
```

## Priority Order

1. 🔴 Fix file paths (blocks developer action)
2. 🔴 Fix issue titles/descriptions (blocks understanding)
3. 🟠 Fix model selection (impacts quality)
4. 🟠 Restore Technical Debt section
5. 🟡 Fix floating point completely
6. 🟡 Restore Educational Insights
7. 🟡 Add Team Impact section
8. 🟢 Fix categorization

## Next Session Tasks

This requires a dedicated debugging session to:
1. Trace the complete data flow from DeepWiki → ComparisonAgent → ReportGenerator
2. Add comprehensive logging at each step
3. Fix each issue systematically
4. Add regression tests to prevent recurrence

---

**Recommendation:** This is a CRITICAL regression that has broken core functionality. We should prioritize fixing these issues before any new development.