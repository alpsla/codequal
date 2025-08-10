# Dynamic Model Selection Architecture

## Overview

As of January 2025, CodeQual has transitioned to a **truly dynamic model selection system** that contains **NO hardcoded model names or versions**. This system automatically adapts to new AI models as they become available in OpenRouter, ensuring we always use the most appropriate and cost-effective models for each task.

## Key Principles

### 1. No Hardcoded Models
- **Zero hardcoded model names**: No "gpt-4", "claude-3", etc. in the code
- **No version assumptions**: System doesn't assume specific versions exist
- **Provider agnostic**: Works with any provider in OpenRouter
- **Future-proof**: Automatically works with models that don't exist yet

### 2. Capability-Based Selection
Models are selected based on:
- **Version score** (35% weight): Higher versions preferred (2.5 > 2.0 > 1.5)
- **Tier indicators** (25% weight): Pro, Ultra, Flash, Mini, etc.
- **Context window** (20% weight): Larger context for complex tasks
- **Provider reputation** (10% weight): Anthropic, OpenAI, Google ranked higher
- **Cost efficiency** (10% weight): Balance between quality and price

### 3. Role-Based Requirements
Each role defines its requirements:
```typescript
interface RoleRequirements {
  role: string;
  description: string;
  repositorySize: 'small' | 'medium' | 'large' | 'enterprise';
  weights: {
    quality: number;  // 0-1
    speed: number;    // 0-1
    cost: number;     // 0-1
  };
  minContextWindow?: number;
  maxCostPerMillion?: number;
  requiresReasoning?: boolean;
  requiresCodeAnalysis?: boolean;
}
```

## Architecture Components

### 1. Dynamic Model Selector (`dynamic-model-selector.ts`)
Core service that:
- Fetches all available models from OpenRouter
- Filters by requirements (context, cost, capabilities)
- Scores models based on role weights
- Selects primary and fallback models
- Applies version penalties for outdated models

### 2. Enhanced Scheduler Service (`enhanced-scheduler-service.ts`)
Manages automated tasks:
- **Quarterly Research**: Complete model evaluation every 3 months
- **Weekly Freshness Check**: Validates models aren't outdated
- **Daily Cost Optimization**: Reviews usage costs and suggests optimizations

### 3. Model Version Sync
Synchronizes model configurations with Supabase:
- Stores selected models for each role
- Tracks usage statistics
- Maintains historical data
- Enables rollback if needed

## Selection Algorithm

### Version Scoring (Fixed January 2025)
```typescript
if (version >= 5) return 1.0;      // GPT-5, Claude 5
if (version >= 4.5) return 0.95;   // GPT-4.5
if (version >= 4) return 0.9;      // GPT-4, Claude 4.x
if (version >= 3.5) return 0.75;   // GPT-3.5
if (version >= 3) return 0.7;      // GPT-3
if (version >= 2.5) return 0.8;    // Gemini 2.5 (better than 2.0!)
if (version >= 2) return 0.6;      // Gemini 2.0
if (version >= 1.5) return 0.4;    // OLD - heavily penalized
```

### Weight-Based Differentiation
- **Quality-focused** (>60%): Favors newer versions, premium tiers
- **Cost-focused** (>60%): Prefers cheaper models, applies budget constraints
- **Speed-focused** (>60%): Selects Flash/Turbo variants, smaller contexts

### Outdated Model Penalty
Models with version < 2.0 receive 50% penalty when newer versions from the same provider exist.

## Example Configurations

### DeepWiki Roles

#### Small TypeScript Project
- Weights: Quality=40%, Speed=20%, Cost=40%
- Selected: `gemini-2.5-flash-lite` (cheap, capable)
- Fallback: `claude-haiku-4` (different provider)

#### Large Enterprise Java
- Weights: Quality=70%, Speed=10%, Cost=20%
- Selected: `gemini-2.5-pro` (high quality, good context)
- Fallback: `claude-opus-4.1` (premium backup)

#### C++ Gaming Engine
- Weights: Quality=80%, Speed=5%, Cost=15%
- Selected: `gemini-2.5-pro` (maximum quality)
- Fallback: `gpt-4.1-mini` (cost-effective backup)

## Migration from Old System

### Deprecated Components (Archived)
- `model-freshness-validator.ts` - Used hardcoded model lists
- `dynamic-freshness-validator.ts` - Had version assumptions
- `enhanced-researcher-service-dynamic.ts` - Partial dynamic implementation
- All test files with hardcoded model names

### New Production Components
```
packages/agents/src/standard/
├── services/
│   ├── dynamic-model-selector.ts       # Core selector
│   └── enhanced-scheduler-service.ts   # Automated updates
└── tests/
    └── model-selection/
        ├── test-deepwiki-5-configs.ts  # Configuration tests
        └── test-final-differentiation.ts # Differentiation tests
```

## Integration Guide for Agents

### 1. Import the Dynamic Selector
```typescript
import { DynamicModelSelector } from '@codequal/agents/standard/services/dynamic-model-selector';
```

### 2. Define Role Requirements
```typescript
const requirements = {
  role: 'your-agent-role',
  description: 'What your agent does',
  repositorySize: 'large',
  weights: {
    quality: 0.6,  // Adjust based on needs
    speed: 0.2,
    cost: 0.2
  },
  minContextWindow: 100000,
  requiresReasoning: true,
  requiresCodeAnalysis: true
};
```

### 3. Select Models
```typescript
const selector = new DynamicModelSelector(apiKey);
const { primary, fallback } = await selector.selectModelsForRole(requirements);
```

### 4. Use Selected Models
```typescript
// Use primary model for main operations
const response = await callModel(primary.id, prompt);

// Fallback on error
if (error) {
  const response = await callModel(fallback.id, prompt);
}
```

## Scheduling and Automation

### Cron Schedule
- **Quarterly Research**: `0 2 1 */3 *` (1st day every 3 months at 2 AM)
- **Weekly Freshness**: `0 3 * * 0` (Sundays at 3 AM)
- **Daily Cost Review**: `0 1 * * *` (Daily at 1 AM)

### Manual Triggers
```typescript
// Run specific task immediately
await enhancedScheduler.runTaskNow('quarterly-model-research');
```

## Benefits

1. **Future-Proof**: Works with any new models automatically
2. **Cost Optimized**: Selects cheapest viable option based on requirements
3. **Version Aware**: Always prefers newer versions (2.5 > 2.0 > 1.5)
4. **Provider Diverse**: Fallbacks from different providers for reliability
5. **Adaptive**: Adjusts to changing model landscape without code changes

## Monitoring and Observability

### Metrics Tracked
- Model selection frequency
- Cost per request by role
- Version distribution
- Provider diversity
- Fallback usage rate

### Alerts
- Outdated model detection
- High cost anomalies
- Selection failures
- API availability issues

## Next Steps

1. **Complete Agent Migration**: Update all agents to use dynamic selector
2. **Cost Dashboard**: Build visualization for model costs
3. **Performance Metrics**: Track response times by model
4. **A/B Testing**: Compare model performance for same tasks
5. **Custom Weights UI**: Allow users to adjust role weights

## Conclusion

The dynamic model selection system ensures CodeQual always uses the most appropriate AI models without requiring code updates. By focusing on capabilities rather than specific model names, the system automatically adapts to the evolving AI landscape while optimizing for quality, speed, and cost based on each role's specific requirements.