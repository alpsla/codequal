# Report Quality Fixes - Current Status

**Date:** October 13, 2025  
**Session:** Money-burning bugs fixed, Report quality IN PROGRESS

---

## ✅ Fixed Issues (Verified Working)

### 1. User-Friendly Titles ✅ **WORKING**
**Before:** `Java.lang.security.audit.command-injection-process-builder.command-injection-process-builder`  
**After:** `Command Injection via ProcessBuilder`

**Status:** getUserFriendlyTitle method working with 30+ mappings  
**File:** v9-grouped-report-formatter.ts (uploaded to Oracle)

---

## ❌ Still Broken Issues

### 2. Quality Score **STILL WRONG** ❌
**Current:** 100/100 (Grade A) with 9,449 issues  
**Expected:** ~30/100 (Grade F) with 1,746 NEW issues

**Root Cause:** 
- Supabase is returning default 100/100 for all categories
- When Supabase is available, it bypasses `calculateSimplifiedScore`
- Need to calculate BEFORE saving to Supabase

**Fix Needed:**
```typescript
// In calculateQualityScore():
// 1. Calculate detailed score FIRST using calculateSimplifiedScore
// 2. Use that score to set category scores
// 3. THEN save to Supabase
// NOT: Get score from Supabase (which returns default 100/100)
```

### 3. Generic Descriptions ❌
**Current:** "This issue was detected by semgrep as a critical severity problem."  
**Expected:** Detailed "What/Why/Causes/Impact" for each rule

**Status:** getIssueDescription method exists with 30+ detailed descriptions  
**Problem:** Method exists but generic fallback is being used

**Need to investigate:** Why aren't the specific descriptions being matched?

### 4. Missing Code Snippets ❌
**Status:** Code snippet extraction exists but not showing in report  
**Need to check:** generateGroupSection method and CodeSnippetExtractor integration

### 5. Fix Suggestions Not Provided ❌
**Status:** AI is generating fixes (17 API calls made) but not displaying properly  
**Need to check:** How fixSuggestion is being displayed in the report template

---

## 💰 Cost vs Value Analysis

**Current State:**
- Cost per analysis: $0.10 (2x expected due to Claude Opus for security)
- Value delivered: **POOR** (broken scoring, generic descriptions, missing snippets)
- **User paying for AI but getting static fallback quality**

**Target State:**
- Cost per analysis: $0.10 (acceptable for multi-model strategy)
- Value delivered: **EXCELLENT** (accurate scoring, specific descriptions, code snippets, AI fixes)
- **User gets real value for money spent**

---

## 🎯 Next Steps (Priority Order)

### Priority 1: Fix Scoring (30 min)
**File:** v9-grouped-report-formatter.ts  
**Method:** calculateQualityScore()  
**Change:** Calculate scores BEFORE Supabase, use those for saving

### Priority 2: Fix Descriptions (20 min)
**File:** v9-grouped-report-formatter.ts  
**Method:** getIssueDescription()  
**Debug:** Why specific descriptions aren't matching rules

### Priority 3: Fix Code Snippets (20 min)
**File:** v9-grouped-report-formatter.ts  
**Method:** generateGroupSection()  
**Debug:** Why snippets aren't being extracted/displayed

### Priority 4: Fix Fix Suggestions (20 min)
**File:** v9-grouped-report-formatter.ts  
**Method:** generateGroupSection()  
**Debug:** Why AI-generated fixes aren't displaying

---

## 📝 Test Plan

After each fix:
1. Upload to Oracle
2. Run quick E2E test (5-10 min)
3. Download report
4. Verify specific section is fixed
5. Move to next fix

**Goal:** All fixes working by end of session

---

## 🔧 Files Modified This Session

**Uploaded to Oracle:**
1. ✅ model-researcher-service.ts - Quarterly research bug fix
2. ✅ simple-openrouter-client.ts - Rate limiting
3. ✅ v9-grouped-report-formatter.ts - Report quality fixes (PARTIAL)
4. ✅ .env - New API key

**Still Local Only:**
- None (all changes uploaded)

**Needs Re-upload After Next Fixes:**
- v9-grouped-report-formatter.ts (after scoring/descriptions/snippets fixes)

---

**Session Status:** In Progress  
**Estimated Completion:** 90 minutes (4 fixes × ~20 min each)



