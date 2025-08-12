# AI Location Finder - Dynamic Model Configuration Strategy

## Overview
The AI Location Finder now uses **dynamic model selection** based on real-time evaluation of available models. No hardcoded models are used.

## Model Selection Criteria

### Context-Aware Selection
Models are dynamically selected based on:

1. **Programming Language** - Optimal models for each language are determined at runtime
2. **File Size** - Models with appropriate context windows are selected dynamically
3. **Complexity** - More capable models are chosen for complex patterns
4. **Issue Type** - Specialized models are selected based on issue characteristics

### Dynamic Evaluation Process

```yaml
selection_process:
  1_discovery:
    - Query OpenRouter for available models
    - Check web for latest model releases
    - Filter for models less than 3 months old
  
  2_evaluation:
    - Score models on quality (0-10)
    - Score models on speed (0-10)
    - Score models on cost effectiveness (0-10)
    - Score models on freshness (0-10)
    - Calculate context window scores
  
  3_context_weighting:
    - Apply language-specific weight adjustments
    - Apply size-specific weight adjustments
    - Apply task-specific weight adjustments
  
  4_selection:
    - Use AI selector for final model choice
    - Consider diversity across contexts
    - Select primary and fallback models
```

## Weight Profiles

### Location Finding Tasks
```yaml
weights:
  quality: 0.65      # Highest - Must find exact locations
  speed: 0.05        # Low - Can take time for accuracy
  cost: 0.15         # Moderate - Worth paying for precision
  freshness: 0.15    # Consistent across all tasks
  contextWindow: 0.00
```

### Dynamic Adjustments

#### By Repository Size
- **Small repos**: +20% speed, +25% cost importance, -20% quality
- **Medium repos**: Use base weights
- **Large repos**: +25% quality, -15% speed, -10% cost

#### By Language Complexity
- **Systems languages** (Rust, C, C++): +15% quality requirement
- **Dynamic languages** (Python, JS): +10% quality for type inference
- **Concurrent languages** (Go, Java): +10% quality for concurrency

## Configuration Storage

All model configurations are stored in Supabase with metadata:
- Language context
- Repository size
- Selection timestamp
- Performance metrics
- Usage statistics

## Automatic Updates

The system automatically:
1. Discovers new models as they're released
2. Re-evaluates models quarterly
3. Updates configurations based on performance
4. Maintains diversity across different contexts

## Benefits of Dynamic Selection

1. **Always Current**: Uses the latest available models
2. **Context Optimized**: Best model for each specific situation
3. **Cost Efficient**: Balances quality with cost based on needs
4. **Future Proof**: Automatically adapts to new models
5. **No Maintenance**: No manual updates needed

## Implementation

The dynamic selection is implemented in:
- `packages/agents/src/model-selection/unified-model-selector.ts`
- `packages/agents/src/model-selection/ai-model-selector.ts`
- `packages/agents/src/model-selection/dynamic-model-evaluator.ts`

## Monitoring

Model selection performance is tracked:
- Selection latency
- Model performance metrics
- Cost tracking
- Error rates
- User satisfaction scores

---

*Note: This configuration is automatically maintained by the system. No manual updates are required.*