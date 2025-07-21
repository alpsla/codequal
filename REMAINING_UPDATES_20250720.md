# Remaining Updates for Complete Model Migration

## Summary
While we've successfully stored 400 configurations in Vector DB and removed many hardcoded models, there are still a few updates needed to complete the migration.

## 1. Complete DeepWikiClient Migration

### What's Done ✅
```typescript
// Added model selector parameter
constructor(baseUrl: string, logger: Logger, modelSelector?: any)

// Made recommendModelConfig async and dynamic
async recommendModelConfig(language: string, sizeBytes: number): Promise<ModelConfig<DeepWikiProvider>>
```

### What's Needed ❌
1. Remove the MODEL_CONFIGS constant completely
2. Update all methods that use MODEL_CONFIGS to use the model selector
3. Update factory methods that create DeepWikiClient instances to pass modelSelector

### Example Implementation
```typescript
// In the factory or initialization code
import { ContextAwareModelSelector } from '@codequal/agents/model-selection';

const modelSelector = new ContextAwareModelSelector(modelVersionSync, vectorStorage);
const deepWikiClient = new DeepWikiClient(baseUrl, logger, modelSelector);
```

## 2. Replace Static Model Provider Files

### Current State
These files have hardcoded model definitions:
- `/packages/core/src/services/model-selection/providers/OpenAIModelProvider.ts`
- `/packages/core/src/services/model-selection/providers/AnthropicModelProvider.ts`
- `/packages/core/src/services/model-selection/providers/GoogleModelProvider.ts`

### Solution
Use the `DynamicModelProvider.ts` we created:
```typescript
import { createDynamicProviders } from './providers/DynamicModelProvider';

// Replace static providers with dynamic ones
const providers = createDynamicProviders(logger);
```

## 3. Update Agent Factory Methods

### Example Updates Needed
```typescript
// Before
const agent = new SecurityAgent(modelSync);

// After
const agent = new SecurityAgent(modelSync, vectorStorage);
```

## 4. Files with Old Model References

### Active Files to Review
These files contain old model references but are still in use:
- `/docs/openrouter-deepwiki-issue.md` - Documentation about specific issues
- `/packages/core/scripts/calibration/*` - Calibration scripts with test data
- Test files - Expected to have example models

### Decision Needed
- Keep historical references in documentation for context?
- Update test files to use current models?
- Archive calibration results from old models?

## Quick Checklist

- [ ] Remove MODEL_CONFIGS from DeepWikiClient.ts
- [ ] Update all DeepWikiClient instantiations to pass modelSelector
- [ ] Replace static provider files with DynamicModelProvider
- [ ] Update agent factories to pass VectorStorageService
- [ ] Review and update remaining files with old model references
- [ ] Test that all agents use dynamic model selection
- [ ] Verify no hardcoded models remain in production code

## Benefits Once Complete

1. **Zero Hardcoded Models** - Everything dynamic from Vector DB
2. **Automatic Updates** - Quarterly researcher updates all models
3. **Context Awareness** - Each agent gets optimal model for their context
4. **Easy Maintenance** - Add new models without code changes
5. **Cost Optimization** - Automatic selection of most cost-effective models

## Estimated Effort
- 2-4 hours to complete all remaining updates
- Most changes are mechanical (passing parameters)
- Main complexity is testing all agents still work correctly