# Archived Model Selectors

**Archived on:** October 6, 2025
**Reason:** Replaced by proper V9 architecture with ModelConfigResolver

## Architecture Change

The V9 system uses a proper architecture:

1. **ModelConfigResolver** (CURRENT) - Retrieves model configurations from Supabase
2. **ModelResearcherService** - Conducts quarterly web research for latest AI models
3. **Supabase Storage** - Stores researched configurations by (role, language, size_category)

## Archived Files

### 1. dynamic-model-selector-v8.ts
- **Original Path:** `src/standard/comparison/dynamic-model-selector-v8.ts`
- **Replaced By:** `ModelConfigResolver` + `ModelResearcherService`
- **Reason:** V8 selector directly queried OpenRouter API instead of using Supabase-first approach

### 2. unified-model-selector.ts
- **Original Path:** `src/model-selection/unified-model-selector.ts`
- **Status:** Already marked as legacy stub
- **Reason:** Never fully implemented, just a compatibility stub

## Current Active Selectors

### Primary (Correct to Use)
- **ModelConfigResolver** (`src/standard/orchestrator/model-config-resolver.ts`)
  - Supabase-first lookup
  - Triggers Researcher if config missing
  - Two-level fallback (OpenRouter key rotation + emergency provider)

### Secondary (For Report Formatting Only)
- **DynamicModelSelector** (`src/standard/services/dynamic-model-selector.ts`)
  - Used by V8 report generator for formatting
  - NOT used by actual V9 analyzers
  - Provides backward compatibility for report templates

## Migration Notes

If you see imports of old selectors:
- Replace `DynamicModelSelectorV8` → `ModelConfigResolver`
- Replace `UnifiedModelSelector` → `ModelConfigResolver`
- Ensure proper constructor with Supabase client

Example:
```typescript
// OLD (Don't use)
const selector = new DynamicModelSelectorV8();
const model = await selector.selectOptimalModel(requirements);

// NEW (Correct)
const resolver = new ModelConfigResolver(supabaseClient, researcherService);
const config = await resolver.getModelConfiguration(role, language, size);
```
