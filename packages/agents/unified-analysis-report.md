# Unified Analysis Report

## Summary

- **Repository:** https://github.com/sindresorhus/ky
- **Branch:** main
- **PR:** 700
- **Success:** ✅
- **Duration:** 3581ms

## Flow Steps

✅ **DeepWiki Analysis** (0ms)
   - issuesFound: 7
   - modelUsed: mock-model
⚠️ **Location Validation** (2ms)
   - valid: 2
   - invalid: 5
   - averageConfidence: 66
⚠️ **Location Clarification** (3572ms)
   - clarified: 0
   - remaining: 5
⚠️ **Location Validation** (7ms)
   - valid: 2
   - invalid: 5
   - averageConfidence: 66

## Validation Statistics

- **Total Issues:** 7
- **Valid Locations:** 2 (29%)
- **Clarified Locations:** 0
- **Invalid Locations:** 5
- **Average Confidence:** 88%

## Issues Found

### HIGH: SQL Injection Vulnerability
- **Location:** `source/utils/options.ts:45`
- **Category:** security
- **Description:** User input is not properly sanitized in query

### MEDIUM: Memory Leak in Cache Service
- **Location:** `source/types/options.ts:89`
- **Category:** performance
- **Description:** Cache grows unbounded leading to memory issues

### LOW: Unused Import
- **Location:** `source/index.ts:3`
- **Category:** code-quality
- **Description:** Imported module is never used

### HIGH: Missing CSRF Protection
- **Location:** `test/hooks.ts:78`
- **Category:** security
- **Description:** State-changing endpoints lack CSRF token validation

### MEDIUM: N+1 Query Problem
- **Location:** `test/retry.ts:156`
- **Category:** performance
- **Description:** Database queries executed in a loop

### MEDIUM: Outdated Dependency
- **Location:** `package.json:24`
- **Category:** dependencies
- **Description:** Package "express" is 3 major versions behind

### LOW: Console Log in Production Code
- **Location:** `test/main.ts:234`
- **Category:** code-quality
- **Description:** Debug console.log statement left in code

