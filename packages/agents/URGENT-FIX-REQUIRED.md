# 🚨 URGENT: Critical System Regression

**Date:** 2025-08-15  
**Severity:** CRITICAL  
**Impact:** Core functionality broken

## Executive Summary

The CodeQual analysis system has severe regressions that make reports unusable. The system is falling back to hardcoded models instead of using stored configurations, losing critical data like file paths, and missing entire report sections.

## Critical Issues (Must Fix Immediately)

### 1. 🔴 File Paths Lost - Developers Can't Find Issues
- **Current:** Shows "unknown:line:column" 
- **Expected:** "src/components/Button.tsx:45:12"
- **Root Cause:** `deepwiki-service.ts` defaults to 'unknown'
- **Impact:** Developers cannot locate and fix issues

### 2. 🔴 Model Configuration System Broken  
- **Current:** Falls back to hardcoded `google/gemini-2.0-flash`
- **Expected:** Use stored configs based on context (role, language, size)
- **Root Cause:** DynamicModelSelector tries OpenRouter instead of stored configs
- **Impact:** Using outdated/suboptimal models for analysis

### 3. 🔴 Issue Structure Broken
- **Current:** Full description used as title, no proper separation
- **Expected:** Clear title + detailed description
- **Impact:** Reports are unreadable, action items unclear

## The System Should Work Like This:

```
1. Context Determined (role, language, repo size)
   ↓
2. Fetch Stored Model Config from Supabase
   ↓
3. Use Primary Model (with Fallback if needed)
   ↓
4. DeepWiki Analysis with Proper Model
   ↓
5. Complete Issue Data (file, line, title, description)
   ↓
6. Full Report with All Sections
```

## Current Reality:

```
1. Context Ignored
   ↓
2. Try OpenRouter (FAILS - No API Key)
   ↓
3. Fallback to Hardcoded google/gemini-2.0-flash
   ↓
4. DeepWiki Returns Data (file paths missing?)
   ↓
5. Data Loss During Transformation
   ↓
6. Incomplete Report Missing Sections
```

## Missing Report Sections:

1. **Technical Debt** - Empty despite having data
2. **Team Impact** - Completely missing
3. **Educational Insights** - Generic, not specific to issues
4. **Training Materials** - Feature completely broken

## Immediate Actions:

1. **FIX MODEL CONFIG:** Connect to stored configurations, stop using OpenRouter
2. **FIX FILE PATHS:** Ensure DeepWiki response includes files, map them correctly
3. **FIX ISSUE STRUCTURE:** Separate title from description
4. **RESTORE SECTIONS:** Add back Technical Debt and Team Impact
5. **FIX FLOATING POINT:** Apply rounding everywhere

## Files to Fix:

1. `src/standard/comparison/comparison-agent.ts` - Remove hardcoded fallback
2. `src/standard/services/deepwiki-service.ts` - Fix file path mapping
3. `src/standard/services/dynamic-model-selector.ts` - Use stored configs
4. `src/standard/comparison/report-generator-v7-fixed.ts` - Restore missing sections
5. `src/standard/comparison/comparison-agent-production.ts` - Fix data flow

## Test to Verify Fixes:

```bash
# With real DeepWiki
USE_DEEPWIKI_MOCK=false npx ts-node src/standard/tests/regression/manual-pr-validator.ts https://github.com/sindresorhus/ky/pull/700

# Check for:
# - File paths not "unknown"
# - Model not "gemini-2.0-flash"
# - Technical Debt section populated
# - Team Impact section present
# - Clear issue titles
```

## Definition of Done:

- [ ] File paths show actual file names
- [ ] Model selection uses stored configs
- [ ] Issues have clear titles AND descriptions
- [ ] Technical Debt section shows pre-existing issues
- [ ] Team Impact section is present
- [ ] Educational Insights are specific to actual issues
- [ ] No floating point errors in scores
- [ ] All regression tests pass

---

**This is blocking production deployment. These regressions must be fixed before any new features.**