# SESSION 13 - P0 ISSUE #2 COMPLETE: Config-Based Model for AI Severity Classifier

**Date:** 2025-10-28
**Status:** ✅ COMPLETE
**Priority:** P0 (Blocking)

## Issue Summary

AI Severity Classifier was using hardcoded Gemini model instead of config-based Qwen model from ModelConfigResolver, violating the architecture pattern and causing rate limiting issues.

## Root Cause

From previous Session 13 testing, the AI Severity Classifier had:
1. Hardcoded fallback to `'google/gemini-2.0-flash-exp'` in `ai-severity-classifier.ts`
2. No integration with ModelConfigResolver
3. Using Gemini free tier causing rate limits (20/29 groups failed)

**User Feedback:**
> "we are not using this gemini models where did you get it. Please remove it. We use only OpenROuter gate to the qween model from Config"

## Solution Implemented

### 1. Updated `ai-enrichment.ts` (lines 73-77, 110-124)

**Changed function signature** to accept `modelConfigResolver`:
```typescript
export async function enrichIssuesWithSeverityClassification(
  issues: EnrichedIssue[],
  groups: IssueGroup[],
  modelConfigResolver: any | null  // Changed from modelOverride?: string
): Promise<EnrichedIssue[]>
```

**Implemented proper model retrieval**:
```typescript
// Get model from config resolver (uses Qwen via OpenRouter)
// SESSION 13 FIX #3 (CONFIG-BASED): Use config resolver to get model configuration
// Severity classification doesn't need a specific role, use code_quality as default
let model: string | undefined;
if (modelConfigResolver) {
  const modelConfig = await modelConfigResolver.getModelConfiguration(
    'code_quality', // Severity classification uses code_quality role
    'java',        // Default to java (works for all languages)
    'medium'       // Default to medium repo size
  );
  model = modelConfig.primary_model;
}

// Call AI Severity Classifier with config-based model
const classification = await classifyIssueSeverity(classificationInput, model);
```

### 2. Updated `v9-grouped-report-formatter.ts` (line 377)

Pass `modelConfigResolver` to enrichment function:
```typescript
// SESSION 13 FIX #3 (CONFIG-BASED): Pass modelConfigResolver for config-based Qwen model
const severityClassifiedIssues = await enrichIssuesWithSeverityClassification(issues, groups, this.modelConfigResolver);
```

### 3. Updated `ai-severity-classifier.ts` (lines 109-116)

Removed hardcoded Gemini fallback:
```typescript
// SESSION 13 FIX #3 (CONFIG-BASED): Use config-based model (Qwen via OpenRouter)
// Priority: modelOverride > env var > error (no default fallback to Gemini)
const model = modelOverride || process.env.SEVERITY_CLASSIFIER_MODEL || (strict
  ? (() => { throw new Error('ALERT: No model configured for severity classifier under STRICT_NO_FALLBACK'); })()
  : (() => { throw new Error('ALERT: No model provided for severity classifier. Pass model from ModelConfigResolver.'); })()
);
```

## Test Results

### Spring Boot - Petclinic (PR #950)
✅ **All 29 groups successfully classified**

- Model: `qwen/qwen-2.5-coder-32b-instruct` (from Supabase config)
- All severity classifications completed without errors
- No "No model provided" errors
- Execution time: 6247ms for 578 issues

**Example Classifications:**
- `LineLengthCheck: high → low` ✅ (high confidence)
- `MissingJavadocMethodCheck: high → low` ✅ (high confidence)
- `DesignForExtensionCheck: high → medium` ✅ (high confidence)
- `HiddenFieldCheck: high → medium` ✅ (high confidence)

### Quarkus - Quickstarts (PR #100)
✅ **All 28 groups successfully classified**

- Model: `qwen/qwen-2.5-coder-32b-instruct` (from Supabase config)
- All severity classifications completed without errors
- Execution time: 4794ms for 831 issues

**Example Classifications:**
- `WhitespaceAroundCheck: high → low` ✅ (high confidence)
- `VisibilityModifierCheck: high → low` ✅ (high confidence)
- `detected-bcrypt-hash: critical → high` ✅ (high confidence)
- `HideUtilityClassConstructorCheck: high → medium` ✅ (high confidence)

## Architecture Pattern Learned

### Correct ModelConfigResolver Usage

```typescript
// ❌ WRONG: Cannot access primary_model directly
const model = modelConfigResolver?.primary_model;

// ✅ CORRECT: Must call getModelConfiguration() first
const modelConfig = await modelConfigResolver.getModelConfiguration(
  role,      // e.g., 'code_quality', 'security'
  language,  // e.g., 'java', 'python'
  repoSize   // e.g., 'small', 'medium', 'large'
);
const model = modelConfig.primary_model;
```

**Reference:** `specialized-agents.ts:904-918` shows the correct pattern

## Impact

### Before Fix
- ❌ Using hardcoded Gemini model (free tier)
- ❌ 20/29 groups failing with rate limits
- ❌ Violating architecture (config-based models)
- ❌ Not using OpenRouter gateway

### After Fix
- ✅ Using config-based Qwen model from Supabase
- ✅ 57/57 groups across 2 frameworks successfully classified (100% success rate)
- ✅ Following correct architecture pattern
- ✅ Routing through OpenRouter gateway
- ✅ No rate limiting issues

## Files Modified

1. `src/two-branch/report/ai-enrichment.ts` (lines 73-77, 110-124)
2. `src/two-branch/analyzers/v9-grouped-report-formatter.ts` (line 377)
3. `src/two-branch/services/ai-severity-classifier.ts` (lines 109-116)

## Verification

Test command:
```bash
cd /Users/alpinro/Code\ Prjects/codequal/packages/agents
timeout 300 npx ts-node test-v9-lite-e2e.ts 2>&1 | tee /tmp/session13-config-model-fix-test.log
```

Log analysis:
```bash
tail -200 /tmp/session13-config-model-fix-test.log | grep "AI Severity"
```

## Next Steps

With P0 Issue #2 (Config-Based Model) complete, the remaining P0 issues are:

- **P0 Issue #3**: Fix Individual Score to use base=50 for Skill Score
- **P0 Issue #4**: Fix Financial Impact to account for auto-fixable issues

## Session Files

- Test log: `/tmp/session13-config-model-fix-test.log`
- This summary: `SESSION_13_P0_ISSUE_2_COMPLETE.md`
- Previous context: `SESSION_13_AI_SEVERITY_TEST_RESULTS.md`
- Remaining issues: `SESSION_13_REMAINING_ISSUES.md`
