# Orchestrator E2E Testing Guide

## Overview

The orchestrator E2E tests validate the complete PR analysis workflow with dynamic model selection using OpenRouter. These tests ensure proper integration between all components including:

- Dynamic model selection based on repository context
- OpenRouter API integration for model routing
- Researcher agent activation for missing configurations
- Cost tracking from stored model configurations
- Token usage tracking per agent/model combination

## Key Features

### 1. Dynamic Model Selection
- Models are selected based on repository language, size, and analysis mode
- Uses `ModelVersionSync` and `RepositoryModelSelectionService`
- Tracks which models were actually selected for each agent

### 2. OpenRouter Integration
- All model calls go through OpenRouter API
- Tracks API responses and extracts model information
- Costs are calculated from stored model configurations

### 3. Researcher Agent Activation
- Automatically activates when model configurations are missing
- Tracks activation reasons and targets
- Tests scenarios with unsupported languages

### 4. Comprehensive Tracking
- **Token Usage**: Tracks input/output tokens per model/agent
- **Model Selection Events**: Records all model selection decisions
- **Performance Metrics**: Measures execution time by phase
- **Cost Analysis**: Calculates costs using stored pricing data

## Running the Tests

### Prerequisites

1. Set up environment variables in `.env`:
```bash
# Required
OPENROUTER_API_KEY=your-openrouter-api-key
GITHUB_TOKEN=your-github-token
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional (for direct provider access)
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
GOOGLE_API_KEY=your-google-api-key
```

### Test Commands

```bash
# Run all E2E test scenarios
npm run test:orchestrator-e2e

# Test token usage tracking
npm run test:orchestrator-e2e:tracking

# Test model selection logic
npm run test:orchestrator-e2e:model-selection

# Run model selection scenarios
npm run test:model-scenarios

# Test specific PR
npm run test:orchestrator-e2e:custom -- https://github.com/owner/repo 123
```

## Test Scenarios

### Default Scenarios

1. **Small Security Fix** - Tests quick analysis mode with minimal agents
2. **Medium React Feature** - Tests comprehensive analysis with standard agents
3. **Large TypeScript Refactor** - Tests deep analysis with all agents
4. **Model Selection Test - Missing Config** - Tests researcher agent activation for Elixir

### Model Selection Scenarios

The `model-selection-scenarios.ts` file includes specific tests for:

1. **Language/Size Combinations** - Tests all language and size permutations
2. **Researcher Activation** - Tests scenarios that trigger researcher agent
3. **Cost Tracking** - Validates cost calculations from model configs
4. **Fallback Selection** - Tests behavior when primary models are unavailable

## Understanding the Output

### Performance Report

After running tests, a JSON report is generated in `packages/test-integration/reports/` containing:

```json
{
  "summary": {
    "totalScenarios": 4,
    "successfulScenarios": 4,
    "totalDuration": 120000,
    "totalCost": 0.2456,
    "totalTokens": 85000
  },
  "scenarios": [{
    "name": "Small Security Fix",
    "modelSelections": [{
      "agentType": "security",
      "selectedModel": "openai/gpt-4o",
      "provider": "openrouter",
      "reason": "optimal for small repositories"
    }],
    "dynamicModelStats": {
      "totalSelections": 2,
      "providersUsed": ["openrouter"],
      "fallbackCount": 0
    }
  }]
}
```

### Console Output

During execution, you'll see:
- Model selection decisions with reasons
- Token usage per agent
- Cost breakdowns by provider
- Researcher agent activations
- Performance metrics by phase

## Debugging

### Enable Debug Logging

Set environment variable:
```bash
DEBUG=codequal:* npm run test:orchestrator-e2e
```

### Common Issues

1. **Missing API Keys**
   - Ensure OPENROUTER_API_KEY is set
   - Check other provider keys if using direct access

2. **Model Selection Failures**
   - Check if model configurations exist for the language
   - Verify ModelVersionSync has the model registered

3. **Cost Calculation Errors**
   - Ensure model has pricing information in CANONICAL_MODEL_VERSIONS
   - Check if model key format matches (provider/model)

## Extending the Tests

### Adding New Scenarios

Add to `TEST_SCENARIOS` array in `orchestrator-e2e-test.ts`:

```typescript
{
  name: 'Your Test Name',
  repositoryUrl: 'https://github.com/owner/repo',
  prNumber: 123,
  analysisMode: 'comprehensive',
  expectedAgents: ['security', 'architecture'],
  description: 'Test description'
}
```

### Adding Model Tracking

To track new model providers, add parsing logic in `setupTokenTracking()`:

```typescript
if (logStr.includes('YourProvider')) {
  this.parseYourProviderUsage(logStr);
}
```

### Custom Assertions

Add validation logic in `validateResult()` to check specific conditions:

```typescript
// Check for specific model usage
const securityModel = this.modelSelectionEvents.find(
  e => e.agentType === 'security'
)?.selectedModel;

if (expectedModel && securityModel !== expectedModel) {
  throw new Error(`Expected ${expectedModel}, got ${securityModel}`);
}
```

## Integration with CI/CD

The tests can be integrated into CI/CD pipelines:

```yaml
# GitHub Actions example
- name: Run Orchestrator E2E Tests
  env:
    OPENROUTER_API_KEY: ${{ secrets.OPENROUTER_API_KEY }}
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  run: |
    npm run test:orchestrator-e2e
    npm run test:model-scenarios
```

## Cost Optimization

To minimize costs during testing:

1. Use small repositories for quick tests
2. Limit the number of scenarios
3. Use mock responses for development
4. Track costs and set budget alerts

## Recommended Test Execution Order

When running E2E tests for the first time or validating the system, follow this progression to efficiently validate functionality while minimizing costs:

### Phase 1: Basic Validation (Low Cost)
Start with these tests to ensure basic connectivity and configuration:

```bash
# 1. Test token tracking and basic orchestrator functionality
npm run test:orchestrator-e2e:tracking -w @codequal/test-integration

# 2. Test model selection logic without making API calls
npm run test:orchestrator-e2e:model-selection -w @codequal/test-integration
```

### Phase 2: Model Selection Scenarios (Medium Cost)
Test dynamic model selection and researcher activation:

```bash
# 3. Run model selection scenarios (includes researcher activation tests)
npm run test:model-scenarios -w @codequal/test-integration
```

### Phase 3: Full E2E Scenarios (Higher Cost)
Run complete PR analysis scenarios:

```bash
# 4. Run all default E2E scenarios
npm run test:orchestrator-e2e -w @codequal/test-integration

# 5. Test specific PRs (optional)
npm run test:orchestrator-e2e:custom -w @codequal/test-integration -- https://github.com/owner/repo 123
```

### Phase 4: Performance Baseline (Highest Cost)
Establish performance baselines with comprehensive tests:

```bash
# 6. Run baseline performance tests
npm run test:baseline -w @codequal/test-integration

# 7. Run comprehensive PR scenarios
npm run test:pr-scenarios -w @codequal/test-integration
```

### Quick Validation Script
For a quick system validation, run this sequence:

```bash
# Quick validation (runs phases 1 & 2 only)
npm run test:orchestrator-e2e:tracking -w @codequal/test-integration && \
npm run test:orchestrator-e2e:model-selection -w @codequal/test-integration && \
npm run test:model-scenarios -w @codequal/test-integration
```

This order ensures you validate core functionality before running expensive full scenarios, helping identify configuration issues early and minimize API costs.

## Future Enhancements

1. **Parallel Execution** - Run scenarios in parallel to reduce total time
2. **Mock Mode** - Add mock responses for development without API calls
3. **Performance Baselines** - Compare performance across runs
4. **Visual Reports** - Generate HTML reports with charts
5. **Automated PR Comments** - Post test results as PR comments