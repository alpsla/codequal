# Report Validation Issues

## Current Problems with Generated Report

### 1. Missing Unfixed Issues from Main Branch
- The report shows "0 unfixed" for all severity levels
- This is suspicious - most repositories have existing issues
- The comparison logic might not be properly identifying which main branch issues remain unfixed

### 2. Missing Code Snippets and Details
- Issues show "undefined" for titles
- No actual code snippets are displayed
- No descriptions of what the issues are

### 3. Generic Score Breakdowns
Current report shows:
```
- Response Time: 52/100
- Throughput: 75/100
```

But should show detailed metrics like:
```
- Response Time: 62/100 (P95 degraded to 450ms)
- Throughput: 65/100 (Decreased to 3.5K RPS)
- Resource Efficiency: 68/100 (CPU 78%, Memory 82%)
```

## Root Causes

### 1. Data Structure Mismatch
The mock data structure doesn't match what the report generator expects:
- Missing `title` property (using `message` instead)
- Missing detailed metrics for score breakdowns
- Unfixed issues calculation may be incorrect

### 2. Comparison Logic
The comparison between main and feature branch issues might not be working correctly:
- Need to verify fingerprint generation
- Need to ensure unfixed issues are properly identified

### 3. AI Analysis Integration
The AI comparison agent should be generating:
- Detailed performance metrics
- Specific code quality measurements
- Actual analysis of the code changes

## Required Fixes

1. **Update mock data structure** to include all required fields
2. **Fix unfixed issue detection** in the comparison logic
3. **Add detailed metrics** to the AI analysis results
4. **Ensure code snippets** are properly passed through

## Test Validation Checklist

- [ ] Unfixed issues from main branch appear in report
- [ ] Code snippets are shown for each issue
- [ ] Detailed descriptions explain each issue
- [ ] Score breakdowns include specific metrics (ms, RPS, %)
- [ ] GitHub username is properly extracted
- [ ] Issue fingerprints correctly identify same issues across branches