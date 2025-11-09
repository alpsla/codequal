# Fix: Agent Category Mapping for Model Tracking

**Date**: November 8, 2025  
**Priority**: CRITICAL  
**Status**: ✅ FIXED

---

## Problem

Only Security Agent showed model (`qwen/qwen3-coder-30b-a3b-instruct`), while Code Quality Agent showed N/A even though it processed 1,058 Checkstyle issues.

**Agent Performance Table (Before)**:
```
| Agent | Model | Files | Issues | Time | Cost |
|-------|-------|-------|--------|------|------|
| Security Agent | qwen/qwen3-coder-30b-a3b-instruct | 2 | 2 | 186s | FREE |
| Code Quality Agent | N/A | 73 | 1058 | 7.5s | FREE |  ← WRONG!
```

---

## Root Cause

Tools were setting incorrect category values that didn't match agent categories:

**Agent Categories** (for model selection):
- Security
- Performance
- Architecture
- Dependencies  
- Code Quality

**What Tools Were Setting** (WRONG):
- PMD: `category: violation.ruleset` → "java-basic" ❌
- Checkstyle: `category: 'Style'` ❌
- Semgrep: `category: 'Security'` ✅ (correct)

**Model Tracking Logic**:
```typescript
// ai-enrichment.ts line 134
const agentRole = representative.detectedCategory || 'Code Quality';
modelsByAgent[agentRole] = fixSuggestion.model;
```

**Why Security Worked**:
- Semgrep sets `category: 'Security'` ✅
- Matches agent category exactly
- Model gets tracked correctly

**Why Code Quality Failed**:
- PMD sets `category: 'java-basic'` ❌
- Checkstyle sets `category: 'Style'` ❌  
- Doesn't match `'Code Quality'` agent category
- Model not tracked

---

## Solution

Fixed category mapping in both PMD and Checkstyle parsers.

### Fix 1: PMD Category

**File**: `java-tool-orchestrator.ts` line 328

**Before**:
```typescript
category: violation.ruleset,  // "java-basic"
```

**After**:
```typescript
category: 'Code Quality',  // Matches agent category
```

### Fix 2: Checkstyle Category

**File**: `java-tool-orchestrator.ts` line 799

**Before**:
```typescript
category: 'Style',  // Doesn't match agent
```

**After**:
```typescript
category: 'Code Quality',  // Matches agent category
```

---

## Expected Result

**Agent Performance Table (After)**:
```
| Agent | Model | Files | Issues | Time | Cost |
|-------|-------|-------|--------|------|------|
| Security Agent | qwen/qwen3-coder-30b-a3b-instruct | 2 | 2 | 186s | FREE |
| Code Quality Agent | qwen/qwen3-coder-30b-a3b-instruct | 73 | 1058 | 7.5s | FREE |  ← FIXED!
```

Now all agents that process issues will show the model they used.

---

## Verification

After final test completes, verify:
- ✅ Code Quality Agent shows `qwen/qwen3-coder-30b-a3b-instruct`
- ✅ Model is consistent across all analysis agents
- ✅ Cost tracking is accurate for all agents
- ✅ No "N/A" models for agents with issues

---

## Related Issues

This fix completes the BUG #6 model tracking implementation. Previously BUG #6 was implemented but only worked for Security Agent because of incorrect category mappings.

---

*Critical fix for model transparency and cost tracking accuracy.*

