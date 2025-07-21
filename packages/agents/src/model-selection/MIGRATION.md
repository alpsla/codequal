# Model Selector Migration Guide

## Overview

The CodeQual codebase has been updated to use a unified model selector that supports all agent roles. This replaces the previous fragmented approach where each agent had its own model selector implementation.

## What Changed

### Before (Fragmented Approach)
- `DeepWikiModelSelector` - Used by DeepWiki agents
- `ResearcherModelSelector` - Used by Researcher agents
- `ModelVersionSync` - Different scoring logic
- Each implementation had different weights and logic

### After (Unified Approach)
- `UnifiedModelSelector` - Single implementation for all roles
- Consistent scoring logic with role-specific weights
- Enhanced selection rules with ROI analysis
- Support for all agent roles (deepwiki, researcher, security, etc.)

## Migration Steps

### 1. Update Imports

#### DeepWiki Migration
```typescript
// Before
import { 
  DeepWikiModelSelector, 
  createDeepWikiModelSelector 
} from '@codequal/agents/deepwiki/deepwiki-model-selector';

// After
import { 
  UnifiedModelSelector,
  createUnifiedModelSelector,
  createDeepWikiModelSelector // Compatibility export
} from '@codequal/agents/model-selection/unified-model-selector';
```

#### Researcher Migration
```typescript
// Before
import { 
  ResearcherSelectionResult,
  scoreModelsForResearcher 
} from '@codequal/agents/researcher/final/researcher-model-selector';

// After
import { 
  UnifiedModelSelection as ResearcherSelectionResult,
  createUnifiedModelSelector
} from '@codequal/agents/model-selection/unified-model-selector';
```

### 2. Update Usage

#### DeepWiki Usage
```typescript
// Before
const selector = createDeepWikiModelSelector(modelVersionSync, vectorStorage);
const selection = await selector.selectModel(repositoryContext);

// After (Option 1 - Direct)
const selector = createUnifiedModelSelector(modelVersionSync, vectorStorage);
const selection = await selector.selectModel('deepwiki', repositoryContext);

// After (Option 2 - Compatibility)
const selector = createDeepWikiModelSelector(modelVersionSync, vectorStorage);
const selection = await selector.selectModel('deepwiki', repositoryContext);
```

#### Researcher Usage
```typescript
// Before
const models = scoreModelsForResearcher(availableModels);
const selection = selectBestResearcherModel(models);

// After
const selector = createUnifiedModelSelector(modelVersionSync);
const selection = await selector.selectModel('researcher');
```

### 3. Role-Specific Weights

The unified selector supports all agent roles with optimized weights:

```typescript
export const ROLE_SCORING_PROFILES = {
  deepwiki: { quality: 0.50, cost: 0.30, speed: 0.20 },
  researcher: { quality: 0.50, cost: 0.35, speed: 0.15 },
  security: { quality: 0.60, cost: 0.20, speed: 0.20 },
  architecture: { quality: 0.60, cost: 0.25, speed: 0.15 },
  performance: { quality: 0.40, cost: 0.30, speed: 0.30 },
  code_quality: { quality: 0.45, cost: 0.35, speed: 0.20 },
  dependencies: { quality: 0.35, cost: 0.45, speed: 0.20 },
  documentation: { quality: 0.30, cost: 0.50, speed: 0.20 },
  testing: { quality: 0.35, cost: 0.45, speed: 0.20 },
  translator: { quality: 0.40, cost: 0.30, speed: 0.30 }
};
```

### 4. Enhanced Features

The unified selector includes new features:

1. **ROI Analysis**: Minimum 1.5x improvement per dollar spent
2. **Stability Penalties**: 10-30% score reduction for preview/beta models
3. **Context-Aware Selection**: Adjusts based on repository size and complexity
4. **Validation**: Built-in selection validation with warnings

### 5. Type Compatibility

The unified selector provides type aliases for backward compatibility:

```typescript
// These types are aliased to unified types
export type DeepWikiModelSelector = UnifiedModelSelector;
export type ResearcherModelSelector = UnifiedModelSelector;
export type DeepWikiModelSelection = UnifiedModelSelection;
export type ResearcherSelectionResult = UnifiedModelSelection;
```

## Benefits of Migration

1. **Consistency**: Single source of truth for model selection logic
2. **Maintainability**: One implementation to update and test
3. **Flexibility**: Easy to add new roles or adjust weights
4. **Performance**: Shared caching and optimization
5. **Features**: Access to enhanced selection rules and validation

## Deprecation Timeline

- **Phase 1** (Current): Old selectors marked as deprecated with migration guide
- **Phase 2** (Q2 2025): Console warnings when using deprecated selectors
- **Phase 3** (Q3 2025): Remove deprecated implementations

## Support

For questions or issues during migration:
1. Check the unified selector source code for detailed documentation
2. Review the test files for usage examples
3. Contact the platform team for assistance

## Example: Complete Migration

```typescript
// Old DeepWiki implementation
import { DeepWikiModelSelector } from './deepwiki-model-selector';

class DeepWikiManager {
  private modelSelector: DeepWikiModelSelector;
  
  constructor() {
    this.modelSelector = new DeepWikiModelSelector(modelSync, vectorDb);
  }
  
  async analyzeRepository(context: RepositoryContext) {
    const selection = await this.modelSelector.selectModel(context);
    // Use selection...
  }
}

// New unified implementation
import { UnifiedModelSelector } from '../model-selection/unified-model-selector';

class DeepWikiManager {
  private modelSelector: UnifiedModelSelector;
  
  constructor() {
    this.modelSelector = new UnifiedModelSelector(modelSync, vectorDb);
  }
  
  async analyzeRepository(context: RepositoryContext) {
    const selection = await this.modelSelector.selectModel('deepwiki', context);
    // Use selection... (same interface)
  }
}
```