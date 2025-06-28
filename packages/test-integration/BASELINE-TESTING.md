# CodeQual Baseline Performance Testing Guide

## Overview

This guide documents the baseline performance testing suite designed to establish performance benchmarks, monitor token usage, track costs, and identify system bottlenecks.

## Test Components

### 1. Baseline Performance Test (`baseline-performance-test.ts`)

Simulates full system execution to establish theoretical baselines for:
- Execution time across different repository sizes
- Token usage patterns
- Cost projections
- API call patterns
- Memory and CPU utilization

**Usage:**
```bash
npm run test:baseline
```

**Scenarios Tested:**
- Small Repository (Express.js) - Full execution
- Medium Repository (React) - Full execution  
- Large Repository (VSCode) - Full execution
- Quick Mode - Optimized execution
- Deep Analysis Mode - With educational content

### 2. System Baseline Test (`system-baseline-test.ts`)

Runs ACTUAL system components (not simulations) to establish real-world baselines.

**Usage:**
```bash
npm run test:baseline:system
```

**⚠️ Warning:** This test consumes real API tokens and may take 10-30 minutes.

**What it measures:**
- Real orchestrator execution time
- Actual token consumption by agents/tools
- True API response times
- Memory usage under load
- Cost per analysis

### 3. Performance Monitor (`performance-monitor.ts`)

Real-time monitoring dashboard that tracks:
- Token usage per component
- API rate limiting
- Cost accumulation
- Performance bottlenecks
- Memory/CPU usage

**Usage:**
```bash
npm run test:monitor
```

## Baseline Metrics

### Expected Performance Targets

| Repository Size | Analysis Mode | Max Time | Max Tokens | Max Cost |
|----------------|---------------|----------|------------|----------|
| Small          | Quick         | 60s      | 20,000     | $2.00    |
| Small          | Comprehensive | 180s     | 50,000     | $5.00    |
| Medium         | Comprehensive | 300s     | 100,000    | $10.00   |
| Large          | Comprehensive | 600s     | 200,000    | $20.00   |
| Any            | Deep          | 900s     | 300,000    | $30.00   |

### Token Usage Breakdown

**Typical token distribution:**
- Repository Analysis: 500-1,000 tokens
- PR Context Analysis: 1,000-2,000 tokens
- DeepWiki Analysis: 5,000-10,000 tokens (if fresh)
- Per Tool: 200-1,000 tokens
- Per Agent: 3,000-8,000 tokens
- Educational Content: 10,000-20,000 tokens
- Report Generation: 5,000-10,000 tokens

### Cost Model (Claude 3 Pricing)

| Model   | Input (per 1M tokens) | Output (per 1M tokens) |
|---------|----------------------|------------------------|
| Opus    | $15.00               | $75.00                 |
| Sonnet  | $3.00                | $15.00                 |
| Haiku   | $0.25                | $1.25                  |

## Running Baseline Tests

### 1. Initial Baseline Establishment

Run this when setting up the system or after major changes:

```bash
# Run simulated baseline test
npm run test:baseline

# Generate timestamped report
npm run test:baseline:report

# Run actual system test (requires API keys)
npm run test:baseline:system
```

### 2. Continuous Monitoring

For ongoing performance tracking:

```bash
# Start performance monitor
npm run test:monitor

# In another terminal, run your tests
npm run test:e2e
```

### 3. Analyzing Results

Baseline reports are saved to `packages/test-integration/reports/`:
- `baseline-{timestamp}.json` - Simulated baseline results
- `system-baseline-{timestamp}.json` - Real system results

Key metrics to track:
- **Execution Time Trends**: Are analyses getting slower?
- **Token Usage Growth**: Is token consumption increasing?
- **Cost Per Analysis**: Is it within acceptable limits?
- **API Rate Limits**: Are we hitting limits frequently?

## Performance Optimization Strategies

Based on baseline results, consider these optimizations:

### 1. Token Usage Reduction
- Use Claude 3 Haiku for initial analysis
- Implement prompt compression techniques
- Cache DeepWiki results aggressively
- Skip low-value agents for simple PRs

### 2. Execution Time Improvement
- Parallelize tool execution
- Implement agent result streaming
- Use quick mode for small PRs
- Skip agents based on PR content

### 3. Cost Optimization
- Set token limits per component
- Implement cost alerts at 80% of budget
- Use tiered model selection (Haiku → Sonnet → Opus)
- Batch similar analyses

### 4. Rate Limit Management
- Implement exponential backoff
- Queue requests during high load
- Distribute API calls across time
- Monitor rate limit headers

## Interpreting Performance Reports

### Baseline Report Structure
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "summary": {
    "averageExecutionTime": 245.5,
    "averageTokenUsage": 75000,
    "averageCost": 7.50,
    "totalApiCalls": 1250
  },
  "scenarios": {
    "baseline-small-full": {
      "executionTime": 165.2,
      "tokenUsage": {
        "total": 48500,
        "promptTokens": 18500,
        "completionTokens": 30000
      },
      "cost": {
        "total": 4.85,
        "breakdown": {
          "agents": 3.20,
          "tools": 0.65,
          "reporting": 1.00
        }
      }
    }
  },
  "recommendations": [
    "Implement parallel tool execution",
    "Use Haiku for initial analysis"
  ]
}
```

### Key Performance Indicators

1. **Token Efficiency**: Tokens per finding
   - Good: < 5,000 tokens/finding
   - Acceptable: 5,000-10,000 tokens/finding
   - Poor: > 10,000 tokens/finding

2. **Cost Efficiency**: Cost per 1,000 lines analyzed
   - Good: < $0.50/KLOC
   - Acceptable: $0.50-$1.00/KLOC
   - Poor: > $1.00/KLOC

3. **Time Efficiency**: Seconds per file
   - Good: < 5s/file
   - Acceptable: 5-10s/file
   - Poor: > 10s/file

## Bottleneck Identification

Common bottlenecks and solutions:

### 1. DeepWiki Analysis (>30s)
- **Solution**: Implement caching based on repository activity
- **Solution**: Pre-warm cache for popular repositories

### 2. Agent Analysis (>20s per agent)
- **Solution**: Optimize prompts to reduce token usage
- **Solution**: Parallelize independent agents
- **Solution**: Use streaming for large responses

### 3. Tool Execution (>10s per tool)
- **Solution**: Implement tool result caching
- **Solution**: Run tools in parallel
- **Solution**: Skip tools based on file types

### 4. Report Generation (>15s)
- **Solution**: Stream report sections as completed
- **Solution**: Pre-compile report templates
- **Solution**: Reduce token usage in summaries

## Continuous Improvement Process

1. **Weekly Reviews**: Analyze performance trends
2. **Monthly Baselines**: Re-run full baseline tests
3. **Quarterly Optimization**: Implement improvements based on data
4. **Alert Thresholds**: Set up alerts for:
   - Execution time > baseline + 50%
   - Cost > baseline + 30%
   - Token usage > baseline + 40%
   - Error rate > 5%

## Production Monitoring Setup

```javascript
// Example production monitoring integration
import { performanceMonitor } from '@codequal/test-integration';

// In your orchestrator
class ProductionOrchestrator {
  async analyzeRepository(config) {
    performanceMonitor.startSession(`PR-${config.prNumber}`);
    
    try {
      // Your analysis logic
      const result = await this.runAnalysis(config);
      
      // Log performance metrics
      const stats = performanceMonitor.getStatistics();
      logger.info('Analysis completed', {
        prNumber: config.prNumber,
        executionTime: stats.elapsed,
        tokenUsage: stats.tokens.total,
        cost: stats.cost.total
      });
      
      return result;
    } finally {
      // Generate report
      const report = performanceMonitor.generateReport();
      await this.savePerformanceReport(report);
    }
  }
}
```

## Troubleshooting

### High Token Usage
1. Check for verbose prompts
2. Verify response length limits
3. Look for retry loops
4. Analyze agent-specific usage

### Slow Execution
1. Check API response times
2. Verify parallel execution
3. Look for sequential bottlenecks
4. Analyze cache hit rates

### High Costs
1. Verify model selection logic
2. Check for unnecessary re-analysis
3. Validate caching effectiveness
4. Review token limits

## Conclusion

Regular baseline testing and performance monitoring are crucial for maintaining an efficient and cost-effective code analysis system. Use these tools to:

1. Establish initial performance baselines
2. Monitor ongoing performance
3. Identify optimization opportunities
4. Validate improvement efforts
5. Ensure system scalability

Remember: Performance optimization is an iterative process. Use data to drive decisions and continuously improve the system.