# DeepWiki Dynamic Model Selection Integration

## Overview

DeepWiki is fully integrated with CodeQual's dynamic model selection infrastructure, ensuring it always uses the most appropriate and up-to-date AI models for comprehensive repository analysis.

## Integration Architecture

```
┌─────────────────────────────────────────────────────┐
│                  DeepWiki API Manager                │
│                                                      │
│  1. getOptimalModel(repositoryUrl)                  │
│     ├─> ContextAwareModelSelector                   │
│     │    ├─> Vector DB Query (context-specific)     │
│     │    └─> Metadata: freshness, capabilities      │
│     │                                               │
│     ├─> ModelVersionSync (fallback)                 │
│     │    ├─> Database cache (5min TTL)              │
│     │    └─> Tags: ['deepwiki', 'comprehensive']    │
│     │                                               │
│     └─> Emergency Fallback                          │
│          └─> Recent models (< 6 months old)         │
└─────────────────────────────────────────────────────┘
```

## Key Components

### 1. ContextAwareModelSelector

Provides context-specific model selection based on:
- Repository characteristics (language, size, complexity)
- Analysis requirements (comprehensive, security-focused, etc.)
- Model freshness and capabilities

### 2. ModelVersionSync

Maintains synchronized model configurations:
- Caches models with 5-minute TTL
- Retrieves from database via `modelConfigStore`
- Ensures consistency across all services

### 3. ProductionResearcherService

Performs quarterly updates:
- Fetches latest models from OpenRouter
- Evaluates models with freshness scoring
- Updates Vector DB with new configurations

## Model Selection Criteria

### Freshness Scoring

```typescript
// Models are scored based on age:
- 0-1 months:   10/10 (Brand new)
- 1-3 months:   9/10  (Very fresh)
- 3-6 months:   8/10  (Fresh - optimal)
- 6-9 months:   7/10  (Mature)
- 9-12 months:  6/10  (Older)
- 12+ months:   4/10  (Too old)
```

### Role-Specific Configuration

DeepWiki uses the `comprehensive-analyzer` role with these weights:
- **Quality**: 0.40 (highest priority)
- **Context Window**: 0.25 (large documents)
- **Speed**: 0.20 (reasonable performance)
- **Cost**: 0.15 (cost-effective)

## Implementation Details

### 1. Model Request Flow

```typescript
// In deepwiki-api-manager.ts
private async getOptimalModel(repositoryUrl: string): Promise<{ primary: string; fallback: string[] }> {
  // 1. Try context-aware selection from Vector DB
  const modelConfig = await this.modelSelector.selectModelWithContext({
    role: 'comprehensive-analyzer',
    repositoryUrl,
    includeMetadata: true
  });
  
  // 2. Fallback to ModelVersionSync
  if (!modelConfig) {
    const models = await this.modelVersionSync.findOptimalModel({
      tags: ['deepwiki', 'comprehensive-analysis'],
      sizeCategory: 'large'
    }, undefined, true);
  }
  
  // 3. Emergency fallback with recent models
  return {
    primary: 'anthropic/claude-3.5-sonnet',
    fallback: ['openai/gpt-4-turbo-2024-04-09', 'google/gemini-1.5-pro']
  };
}
```

### 2. Model Fallback Handling

```typescript
// Automatic fallback on failure
try {
  apiResponse = await this.callDeepWikiApi(podName, repositoryUrl, prompt, selectedModel);
} catch (primaryError) {
  // Try each fallback model
  for (const fallbackModel of models.fallback) {
    try {
      apiResponse = await this.callDeepWikiApi(podName, repositoryUrl, prompt, fallbackModel);
      selectedModel = fallbackModel;
      break;
    } catch (fallbackError) {
      logger.warn(`Fallback model ${fallbackModel} failed`);
    }
  }
}
```

### 3. Metadata Tracking

Every analysis includes model metadata:
```typescript
result.metadata.model_used = selectedModel;
result.metadata.model_selection_reason = modelConfig.metadata.reasoning;
result.metadata.freshness_score = modelConfig.metadata.freshness_score;
```

## Configuration

### Environment Variables

```bash
# Enable Vector DB for model selection
VECTOR_DB_AVAILABLE=true

# Model selection cache
MODEL_CACHE_TTL=300  # 5 minutes

# Researcher update frequency
MODEL_UPDATE_FREQUENCY=quarterly
```

### Vector DB Schema

Model configurations are stored with:
```json
{
  "metadata": {
    "type": "model-configuration",
    "role": "comprehensive-analyzer",
    "primary_model": "anthropic/claude-3.5-sonnet",
    "fallback_models": ["openai/gpt-4-turbo-2024-04-09"],
    "last_updated": "2025-07-01T00:00:00Z",
    "freshness_score": 9.0,
    "capability_scores": {
      "quality": 9.5,
      "speed": 8.0,
      "cost_efficiency": 7.0
    }
  }
}
```

## Benefits

1. **Always Fresh**: Models never older than 6 months
2. **Context-Aware**: Optimized for specific repositories
3. **Reliable**: Multiple fallback options
4. **Cost-Effective**: Balances quality with cost
5. **Automatic Updates**: Quarterly research keeps models current

## Monitoring

Track model selection performance:
```bash
# Check current model selection
curl http://localhost:8001/admin/model-status

# View model usage statistics
curl http://localhost:8001/admin/model-usage

# Force model refresh
curl -X POST http://localhost:8001/admin/refresh-models
```

## Troubleshooting

### Model Selection Issues

1. **Old Model Selected**
   - Check Vector DB connectivity
   - Verify researcher service ran recently
   - Check model cache expiration

2. **Fallback Always Used**
   - Verify primary model availability
   - Check OpenRouter API limits
   - Review error logs for specific failures

3. **No Models Available**
   - Ensure Vector DB is accessible
   - Check database connectivity
   - Verify emergency fallbacks are configured

---

*Last Updated: July 24, 2025*