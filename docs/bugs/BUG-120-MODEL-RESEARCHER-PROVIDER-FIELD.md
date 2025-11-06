# BUG-120: ModelResearcher Provider Field Incorrect

**Date**: November 5, 2025
**Severity**: High
**Status**: Open
**Component**: model-researcher.ts
**Impact**: Model configuration updates fail

---

## 🐛 Bug Description

The `ModelResearcher.selectBestModel()` method crashes when selecting fallback models because all models have `provider: 'openrouter'` instead of their actual provider names.

---

## 🔍 Root Cause

**File**: `packages/agents/src/two-branch/research-services/model-researcher.ts`

**Problem**: All models in `availableModels` array use `provider: 'openrouter'`:

```typescript
private availableModels = [
  { provider: 'openrouter', model: 'anthropic/claude-3.5-sonnet', ... },
  { provider: 'openrouter', model: 'openai/gpt-4-turbo-2024-04-09', ... },
  { provider: 'openrouter', model: 'google/gemini-pro-1.5', ... },
  // All have provider: 'openrouter'!
];
```

**Fallback Selection Logic** (line 128):
```typescript
const fallback = this.selectBestModel(adjustedWeights, [primary.provider]);
// Excludes 'openrouter' provider, leaving NO models available!
```

**Result**: `bestModel` is null, causing crash at line 70:
```typescript
return {
  provider: bestModel!.provider,  // ← TypeError: Cannot read properties of null
  model: bestModel!.model,
  score: bestScore
};
```

---

## 📋 Error Output

```
🔬 Model Researcher - Discovering and Updating Configurations
📊 Found 125 configurations to update

TypeError: Cannot read properties of null (reading 'provider')
    at ModelResearcher.selectBestModel (.../model-researcher.ts:70:28)
    at ModelResearcher.getModelForRole (.../model-researcher.ts:128:27)
```

---

## 🔧 Proposed Fix

**Option 1**: Extract actual provider from model ID (RECOMMENDED)
```typescript
private availableModels = [
  { provider: 'anthropic', model: 'anthropic/claude-3.5-sonnet', ... },
  { provider: 'openai', model: 'openai/gpt-4-turbo-2024-04-09', ... },
  { provider: 'google', model: 'google/gemini-pro-1.5', ... },
  { provider: 'meta-llama', model: 'meta-llama/llama-3.1-405b-instruct', ... },
  // Extract from model ID prefix
];
```

**Option 2**: Add separate `actualProvider` and `apiGateway` fields
```typescript
private availableModels = [
  {
    apiGateway: 'openrouter',
    actualProvider: 'anthropic',
    model: 'anthropic/claude-3.5-sonnet',
    ...
  },
];
```

**Option 3**: Change fallback logic to use model family instead of provider

---

## 🎯 Impact

**Blocked Functionality**:
- ✅ `update-with-real-models.ts` script fails completely
- ✅ Model configuration updates cannot run
- ✅ Cannot refresh model recommendations

**Workaround**: Manual model configuration updates via database

---

## 📝 Steps to Reproduce

```bash
cd packages/agents
npx ts-node src/standard/scripts/update-with-real-models.ts
# Error: TypeError: Cannot read properties of null (reading 'provider')
```

---

## ✅ Acceptance Criteria

- [ ] `selectBestModel()` returns valid model even when providers are excluded
- [ ] Fallback model selection uses different actual provider (anthropic vs openai)
- [ ] `update-with-real-models.ts` script runs successfully
- [ ] All 125 model configurations can be updated
- [ ] No null pointer errors in model selection

---

## 🔗 Related

- Script: `packages/agents/src/standard/scripts/update-with-real-models.ts`
- Service: `packages/agents/src/two-branch/research-services/model-researcher.ts`
- Context: Discovered during Phase 2H cleanup verification (Nov 5, 2025)

---

**Priority**: High - Blocks model configuration updates
**Estimated Fix Time**: 15-30 minutes
**Testing Required**: Run update-with-real-models.ts successfully
