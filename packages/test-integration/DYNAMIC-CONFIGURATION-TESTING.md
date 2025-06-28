# Dynamic Configuration & Model Selection Testing

## Overview

CodeQual uses a sophisticated dynamic configuration system where:
- Models are NOT hardcoded - they're selected based on repository context
- The Researcher agent discovers new models when configurations are missing
- Configurations are updated quarterly to stay current with latest AI models
- The system self-adapts to new languages and frameworks

## Architecture Components

### 1. Agent Configuration Service
- Provides optimal agent configurations using Vector DB
- Triggers Researcher agent for missing configurations
- Implements progressive fallback strategies
- Quarterly scheduler for configuration updates

### 2. Researcher Agent
- Autonomous agent that searches the web for new AI models
- Evaluates models based on:
  - Repository language and framework compatibility
  - Performance benchmarks
  - Cost efficiency
  - Role-specific capabilities
- Updates configurations in Vector DB

### 3. Model Version Sync
- Maintains canonical model versions
- Tracks model capabilities and pricing
- Provides optimal selection based on context
- Self-upgrading system

### 4. Repository Model Selection Service
- Analyzes repository characteristics
- Selects appropriate model tier
- Considers analysis mode (quick/comprehensive/deep)
- Provides cost estimates

## Test Suites

### 1. Dynamic Configuration Test (`dynamic-configuration-test.ts`)

Tests the system's ability to handle missing configurations and trigger research.

**Run:**
```bash
npm run test:dynamic-config
```

**Scenarios tested:**
- **Unsupported Languages**: Rust WASM, Elixir, Q#, COBOL
- **Exotic Frameworks**: Phoenix LiveView, Quantum Computing
- **Missing Configurations**: Triggers Researcher agent
- **Fallback Strategies**: Progressive search in Vector DB
- **Quarterly Updates**: Simulates configuration refresh

**Key Metrics:**
- Researcher activation rate
- Fallback success rate
- Configuration coverage
- Model discovery time

### 2. Model Performance Baseline (`model-performance-baseline.ts`)

Establishes performance baselines for different model/context combinations.

**Run:**
```bash
npm run test:model-baseline
```

**Test Cases:**
- Small JavaScript with Express (quick mode)
- Large TypeScript with React/GraphQL (comprehensive)
- Python ML projects with PyTorch (deep analysis)
- Enterprise Java with Spring Boot
- Rust systems programming
- Go microservices

**Metrics Tracked:**
- Response time per model/agent
- Token usage (prompt vs completion)
- Cost per analysis
- Quality scores
- Success rates

### 3. System Baseline Test (`system-baseline-test.ts`)

Runs actual system components (not simulations) with real API calls.

**Run:**
```bash
npm run test:baseline:system
```

**⚠️ Warning**: Uses real API tokens and takes significant time.

## Running Tests

### Complete Baseline Suite
```bash
# Run all baseline tests
npm run test:baseline:all

# Individual tests
npm run test:dynamic-config    # Configuration handling
npm run test:model-baseline    # Model performance
npm run test:baseline:system   # Real system test
```

### Performance Monitoring
```bash
# Start real-time monitoring
npm run test:monitor

# In another terminal, run tests
npm run test:baseline:all
```

## Understanding Results

### Dynamic Configuration Report
```json
{
  "summary": {
    "totalScenarios": 5,
    "missingConfigurations": 3,
    "researcherActivations": 3,
    "fallbacksUsed": 2
  },
  "researcherPerformance": {
    "avgSearchTime": "4.2s",
    "modelsDiscovered": 15,
    "configurationsCreated": 3
  }
}
```

### Model Performance Baseline
```json
{
  "modelPerformance": {
    "anthropic/claude-3-opus": {
      "avgQuality": 0.92,
      "avgCost": 0.0234,
      "avgResponseTime": 1245
    },
    "openai/gpt-5": {
      "avgQuality": 0.89,
      "avgCost": 0.0198,
      "avgResponseTime": 1023
    }
  }
}
```

## Configuration Scenarios

### Scenario 1: New Language Support
When analyzing a Rust WASM project:
1. System checks Vector DB - no configuration found
2. Researcher agent activated
3. Searches: rust forums, WASM benchmarks, systems programming models
4. Finds suitable models (e.g., DeepSeek Coder v3)
5. Updates Vector DB with configuration
6. Returns optimal model selection

### Scenario 2: Fallback Strategy
When Researcher can't find specific configuration:
1. Progressive Vector DB search:
   - Same language, any framework
   - Same size category, any language
   - Same agent role, any context
   - Most general model available
2. Each fallback logged for analysis
3. Quarterly update will address gaps

### Scenario 3: Quarterly Update
Every 3 months:
1. Researcher scans all model providers
2. Checks for new model releases
3. Evaluates existing configurations
4. Updates deprecated models
5. Adds new high-performing models
6. Refreshes Vector DB

## Model Selection Logic

### Context Analysis
```typescript
{
  language: 'typescript',
  sizeCategory: 'large',
  complexity: 'high',
  frameworks: ['react', 'graphql'],
  analysisMode: 'comprehensive',
  agentRole: 'security'
}
```

### Selection Process
1. **Vector DB Query**: Find models matching context
2. **Capability Scoring**: Evaluate model capabilities for role
3. **Cost Optimization**: Balance quality vs cost
4. **Performance Check**: Ensure latency requirements
5. **Final Selection**: Return optimal model

### Model Tiers
- **Budget**: Haiku, Flash - for quick analysis
- **Standard**: Sonnet, GPT-4 - for comprehensive
- **Premium**: Opus, GPT-5 - for complex/critical
- **Enterprise**: Custom models - for specialized needs

## Performance Targets

### By Repository Size
| Size | Max Time | Max Cost | Min Quality |
|------|----------|----------|-------------|
| Small | 60s | $1.00 | 0.70 |
| Medium | 180s | $5.00 | 0.80 |
| Large | 300s | $10.00 | 0.85 |
| XLarge | 900s | $30.00 | 0.85 |

### By Analysis Mode
| Mode | Model Tier | Token Limit | Time Limit |
|------|------------|-------------|------------|
| Quick | Budget | 20K | 60s |
| Comprehensive | Standard | 100K | 300s |
| Deep | Premium | 300K | 900s |

## Troubleshooting

### Missing Configurations
- Check Vector DB connectivity
- Verify Researcher agent is running
- Review fallback strategies
- Check quarterly update status

### Poor Model Performance
- Review quality scores in baseline report
- Check if model is appropriate for context
- Verify model version is current
- Consider triggering manual research

### High Costs
- Analyze cost breakdown by model
- Check token usage patterns
- Review model tier selection
- Implement caching strategies

## Best Practices

1. **Regular Baseline Updates**
   - Run baseline tests weekly
   - Compare with previous results
   - Identify performance degradation

2. **Configuration Monitoring**
   - Track Researcher activations
   - Monitor fallback usage
   - Review quarterly update logs

3. **Cost Optimization**
   - Set cost alerts
   - Use appropriate model tiers
   - Cache Vector DB queries
   - Implement token limits

4. **Quality Assurance**
   - Monitor quality scores
   - A/B test new models
   - Gather user feedback
   - Adjust configurations

## Future Enhancements

1. **Self-Learning System**
   - Track actual performance vs predictions
   - Adjust model scores based on results
   - Automatic configuration optimization

2. **Regional Optimization**
   - Deploy models closer to users
   - Reduce latency for global teams
   - Cost optimization by region

3. **Custom Model Integration**
   - Support for private models
   - Fine-tuned models for specific domains
   - Hybrid cloud/on-premise deployment

4. **Advanced Metrics**
   - Semantic accuracy scoring
   - Domain-specific benchmarks
   - User satisfaction correlation