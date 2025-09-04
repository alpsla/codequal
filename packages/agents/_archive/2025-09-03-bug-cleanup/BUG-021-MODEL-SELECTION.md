# BUG-021: Dynamic Model Selection Broken - Hardcoded Fallback

## Priority: CRITICAL 🚨

## Problem
All reports show `google/gemini-2.5-flash` regardless of context, language, or requirements.

## Evidence
```typescript
// Line 36 in report-generator-v7-enhanced-complete.ts
const modelUsed = (comparison as any).aiAnalysis?.modelUsed || 
  (comparison as any).modelConfig?.model || 
  'google/gemini-2.5-flash'; // <-- HARDCODED FALLBACK
```

## Expected Behavior
- Dynamic selection based on:
  - Repository language
  - Repository size
  - Complexity requirements
  - Performance needs
- Should use models like Qwen for certain scenarios
- Context-aware selection through ModelSelector

## Root Causes
1. Tests bypass ComparisonAgent (see BUG-019)
2. ModelService not properly initialized
3. Hardcoded fallback masks the problem
4. No model diversity in codebase (no Qwen found)

## Missing Components
- Qwen models not configured
- Model selection history not persisted
- Supabase tables for tracking selections missing
- OpenRouter integration not properly configured

## Fix Required
1. Remove hardcoded fallback
2. Enforce ComparisonAgent usage
3. Properly initialize ModelService
4. Add Qwen and other models to selection pool
5. Implement proper model selection tracking

## Validation
- Different scenarios should select different models
- Small repos: Fast models (gemini-flash-lite)
- Large repos: Powerful models (gpt-4, claude)
- Security focus: Specialized security models
- Performance focus: Performance-optimized models

## Affected Systems
- Model selection service
- Report generation
- Cost optimization
- Performance metrics

## Success Criteria
- [ ] No hardcoded model fallbacks
- [ ] Dynamic selection working
- [ ] Multiple models in use
- [ ] Selection based on context
- [ ] Tracking in database