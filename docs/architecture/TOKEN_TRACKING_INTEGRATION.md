# Token Tracking Integration

## Overview

The CodeQual system now includes comprehensive token tracking for all AI model executions. This tracks token usage and costs across all agents, including primary and fallback model usage.

## Architecture

### 1. Token Usage Extraction Layer

**Location:** `/packages/agents/src/services/token-usage-extractor.ts`

- **DynamicTokenUsageExtractor**: Automatically detects and extracts token usage from any AI provider response
- Supports: OpenAI, Anthropic, Google, Cohere, and more
- Extensible for new providers via `TokenUsageExtractor` interface
- No hardcoded model detection - works with any model dynamically

### 2. Model Token Tracker

**Location:** `/packages/agents/src/services/model-token-tracker.ts`

- Tracks token usage per analysis, agent, and model
- Integrates with Vector DB for real-time pricing
- Stores tracking data in Vector DB for historical analysis
- Provides detailed usage summaries and reports

### 3. Token Usage Aggregator

**Location:** `/apps/api/src/services/token-usage-aggregator.ts`

- Aggregates token usage across all agents in an analysis
- Provides breakdown by agent role and model
- Tracks fallback model usage separately
- Formats data for reporting

### 4. Integration Points

#### BaseAgent Enhancement
All agents inherit token extraction capability:
```typescript
protected extractTokenUsage(response: any): TokenUsage | null
protected addTokenUsage(result: AnalysisResult, response: any): AnalysisResult
```

#### EnhancedMultiAgentExecutor
- Initializes ModelTokenTracker with ModelVersionSync
- Tracks usage after each agent execution
- Handles both primary and fallback model tracking
- Provides token summary after execution

#### ResultOrchestrator
- Aggregates token usage via TokenUsageAggregator
- Adds token usage to analysis metadata
- Provides cost breakdown in final results

## Data Flow

```
API Response (any provider)
    ↓
DynamicTokenUsageExtractor.extractTokenUsage()
    ↓
Agent.addTokenUsage() [adds to AnalysisResult]
    ↓
EnhancedMultiAgentExecutor.executeAgentWithTimeout()
    ↓
ModelTokenTracker.trackUsage() [stores in Vector DB]
    ↓
TokenUsageAggregator.aggregateUsage()
    ↓
ResultOrchestrator metadata.tokenUsage
```

## Token Usage in Results

The token usage data appears in the analysis results under `metadata.tokenUsage`:

```json
{
  "metadata": {
    "tokenUsage": {
      "totalTokens": 45678,
      "totalCost": 0.1234,
      "byAgent": {
        "security": {
          "tokens": 12345,
          "cost": 0.0345,
          "model": "anthropic/claude-3-opus",
          "provider": "openrouter",
          "executionCount": 1,
          "fallbackUsed": false
        }
      },
      "byModel": {
        "anthropic/claude-3-opus": {
          "tokens": 30000,
          "cost": 0.0900,
          "executions": 2
        }
      },
      "fallbackUsage": {
        "totalFallbacks": 1,
        "fallbackCost": 0.0234,
        "fallbackTokens": 7890
      }
    }
  }
}
```

## Benefits

1. **Cost Visibility**: Real-time tracking of AI costs per analysis
2. **Model Optimization**: Identify which models are most cost-effective
3. **Fallback Monitoring**: Track when and why fallback models are used
4. **Budget Management**: Set limits and monitor usage trends
5. **Dynamic Support**: Works with any model through OpenRouter

## Future Enhancements

1. **Budget Alerts**: Notify when approaching cost thresholds
2. **Usage Analytics**: Dashboard for token usage trends
3. **Model Recommendations**: Suggest more cost-effective models based on usage patterns
4. **Rate Limiting**: Implement token-based rate limiting per user/organization