# CodeQual Monitoring & Analytics

Comprehensive monitoring, analytics, and optimization tools for the CodeQual analysis pipeline.

## 📊 Overview

The monitoring system provides real-time insights into:
- **Performance Metrics**: Execution times, success rates, retry patterns
- **Cost Analytics**: Model usage costs, agent-specific spending, optimization opportunities
- **Model Usage Patterns**: Which agents use which models, frequency, and combinations
- **Quality Metrics**: Error rates, confidence scores, validation statistics
- **Optimization Recommendations**: Data-driven suggestions for reducing costs

## 🚀 Quick Start

### 1. Initial Setup

```bash
# Check database connection
npm run metrics:check

# Verify data collection
npm run metrics:summary
```

### 2. View Current Metrics

```bash
# Summary of all metrics
npm run metrics:summary

# Agent-specific metrics
npm run metrics:agents

# Cost breakdown
npm run metrics:costs

# Real-time monitoring
npm run metrics:watch
```

### 3. Model Optimization

```bash
# Analyze usage patterns
npm run optimize:analyze

# Get optimization recommendations
npm run optimize:recommend

# Generate comprehensive report
npm run optimize:report
```

## 📁 Directory Structure

```
monitoring/
├── README.md                    # This file
├── services/                    # Core monitoring services
│   ├── metrics-collector.ts     # Data collection service
│   ├── real-time-monitor.ts     # Real-time monitoring
│   └── model-usage-analytics.ts # Model optimization analytics
├── cli/                         # Command-line tools
│   ├── metrics-cli.ts          # General metrics CLI
│   └── optimize-models.ts      # Model optimization CLI
├── scripts/                     # Utility scripts
│   └── check-metrics.ts        # Database connectivity check
└── dashboards/                  # Grafana dashboards
    ├── setup-guide.md          # Dashboard setup instructions
    └── schemas/                # Dashboard configurations
```

## 🎯 Features

### 1. Performance Monitoring

Track execution performance across all agents and operations:

```typescript
// Automatic tracking in DeepWiki API calls
await trackDeepWikiCall({
  agent: 'deepwiki',
  operation: 'analyze',
  repository: repositoryUrl,
  model: selectedModel,
  duration: executionTime,
  success: true,
  inputTokens: tokenCount,
  outputTokens: responseTokens
});
```

### 2. Cost Analytics

Monitor and analyze API costs:

- **Real-time cost tracking** per API call
- **Agent-level cost attribution**
- **Model-specific pricing calculations**
- **Monthly cost projections**

### 3. Model Usage Analytics

The `ModelUsageAnalyticsService` provides:

```typescript
// Get performance metrics by agent and operation
const metrics = await analytics.getModelPerformanceMetrics();

// Get usage patterns for each agent
const patterns = await analytics.getAgentModelUsagePatterns();

// Generate optimization recommendations
const recommendations = await analytics.generateOptimizationRecommendations();

// Analyze model combinations
const combinations = await analytics.getFrequentModelCombinations();
```

### 4. Optimization Recommendations

Data-driven recommendations for cost optimization:

```typescript
interface ModelOptimizationRecommendation {
  agent: string;
  operation: string;
  currentModel: string;
  recommendedModel: string;
  potentialSavings: number;
  savingsPercentage: number;
  qualityImpact: 'minimal' | 'moderate' | 'significant';
  reasoning: string[];
}
```

## 📈 Grafana Dashboards

### Available Dashboards

1. **CodeQual Performance Dashboard** (`codequal-dashboard-final.json`)
   - Overall system performance
   - Success rates and error tracking
   - Execution time analysis
   - Cost per report metrics

2. **Model Optimization Dashboard** (`model-optimization-dashboard.json`)
   - Model usage by agent
   - Cost per agent-model combination
   - Usage trends over time
   - Optimization recommendations

### Dashboard Setup

1. **Import Dashboard**:
   ```bash
   # Navigate to Grafana (http://localhost:3000)
   # Go to Dashboards → Import
   # Upload the JSON file from grafana/ directory
   ```

2. **Configure Datasource**:
   - Use PostgreSQL datasource
   - Point to Supabase database
   - Credentials from `.env` file

## 🔧 CLI Commands

### Metrics CLI

```bash
# View summary of all metrics
npm run metrics:summary

# Options:
#   --days <number>    Number of days to analyze (default: 7)
#   --format <format>  Output format: table, json, csv

# View agent-specific metrics
npm run metrics:agents

# View cost breakdown
npm run metrics:costs

# Real-time monitoring
npm run metrics:watch
```

### Model Optimization CLI

```bash
# Analyze current model usage
npm run optimize:analyze --days 30

# Get optimization recommendations
npm run optimize:recommend --output recommendations.md

# View usage patterns by agent
npm run optimize:patterns

# View model combinations
npm run optimize:combinations

# Generate comprehensive report
npm run optimize:report --output model-optimization-report.md

# Simulate model switch
npm run optimize:simulate <agent> <operation> <new-model>
# Example:
npm run optimize:simulate deepwiki analyze "openai/gpt-4o-mini"
```

## 📊 Database Schema

### agent_activity Table

```sql
CREATE TABLE agent_activity (
  id UUID PRIMARY KEY,
  timestamp BIGINT NOT NULL,
  agent_role TEXT NOT NULL,
  operation TEXT NOT NULL,
  repository_url TEXT,
  pr_number TEXT,
  language TEXT,
  repository_size TEXT,
  model_used TEXT NOT NULL,
  model_version TEXT,
  is_fallback BOOLEAN DEFAULT FALSE,
  input_tokens INTEGER,
  output_tokens INTEGER,
  duration_ms INTEGER,
  success BOOLEAN,
  error TEXT,
  retry_count INTEGER DEFAULT 0,
  cost DECIMAL(10, 6)
);

-- Indexes for performance
CREATE INDEX idx_agent_activity_timestamp ON agent_activity(timestamp);
CREATE INDEX idx_agent_activity_agent_role ON agent_activity(agent_role);
CREATE INDEX idx_agent_activity_model ON agent_activity(model_used);
```

## 🎯 Optimization Workflow

### 1. Baseline Analysis

```bash
# Get current state
npm run optimize:analyze --days 30

# Review patterns
npm run optimize:patterns
```

### 2. Identify Opportunities

```bash
# Get recommendations
npm run optimize:recommend

# Review model combinations
npm run optimize:combinations
```

### 3. Simulate Changes

```bash
# Test potential changes
npm run optimize:simulate deepwiki analyze "openai/gpt-4o-mini"
```

### 4. Implement Gradually

1. Start with **low-risk operations** (e.g., simple validations)
2. Test on **small repositories** first
3. Monitor **quality metrics** closely
4. Expand to **critical operations** after validation

### 5. Monitor Impact

- Check Grafana dashboards for performance changes
- Review error rates and success metrics
- Track cost savings realization
- Adjust as needed

## 🔍 Example: Cost Optimization Process

### Step 1: Identify High-Cost Operations

```bash
npm run optimize:analyze
```

Output:
```
deepwiki Agent:
  analyze → openai/gpt-4
    Calls: 150 | Success: 95.3%
    Avg Cost: $0.0850 | Total: $12.75
    Avg Tokens: 2500
```

### Step 2: Get Recommendations

```bash
npm run optimize:recommend
```

Output:
```
deepwiki - analyze
  Current: openai/gpt-4 → Recommended: openai/gpt-4o
  Savings: $8.50/month (66.7%)
  Quality Impact: minimal
  ✅ Safe to switch - minimal quality impact
```

### Step 3: Simulate Impact

```bash
npm run optimize:simulate deepwiki analyze "openai/gpt-4o"
```

Output:
```
Current Model: openai/gpt-4
  - Avg Cost/Call: $0.0850
  - Monthly Cost: $382.50

New Model: openai/gpt-4o
  - Avg Cost/Call: $0.0283
  - Monthly Cost: $127.50

💰 Potential Savings: $255.00/month (66.7%)
```

### Step 4: Implement Change

Update model configuration in your code or database:

```typescript
// In your agent configuration
const modelConfig = {
  deepwiki: {
    analyze: 'openai/gpt-4o', // Changed from gpt-4
    // ... other operations
  }
};
```

### Step 5: Monitor Results

```bash
# After 24 hours, check impact
npm run metrics:summary --days 1

# View in Grafana
npm run dashboard
```

## 📈 Metrics to Watch

### Performance Metrics
- **Success Rate**: Should remain >90%
- **Execution Time**: Monitor for degradation
- **Retry Rate**: Should stay low (<5%)
- **Error Rate**: Watch for increases

### Cost Metrics
- **Cost per Call**: Should decrease
- **Monthly Spend**: Track savings realization
- **Cost per Agent**: Monitor distribution
- **Token Usage**: Check for efficiency

### Quality Metrics
- **Confidence Scores**: Should remain stable
- **Validation Success**: Monitor accuracy
- **User Feedback**: Track satisfaction
- **Issue Detection Rate**: Should not decrease

## 🚨 Alerts & Thresholds

### Recommended Alert Thresholds

```yaml
performance:
  error_rate: > 10%
  success_rate: < 85%
  avg_duration: > 60s
  retry_rate: > 10%

costs:
  hourly_spend: > $5
  daily_spend: > $100
  cost_per_call: > $0.10
  
quality:
  confidence_score: < 70%
  validation_rate: < 80%
```

## 🔄 Data Retention

### Recommended Retention Policies

- **Raw Metrics**: 30 days (detailed)
- **Hourly Aggregates**: 90 days
- **Daily Aggregates**: 1 year
- **Monthly Summaries**: Indefinite

### Data Cleanup

```sql
-- Clean up old raw data (run monthly)
DELETE FROM agent_activity 
WHERE timestamp < EXTRACT(EPOCH FROM NOW() - INTERVAL '30 days') * 1000;

-- Create aggregates before cleanup
INSERT INTO agent_activity_daily
SELECT 
  DATE(to_timestamp(timestamp/1000)) as date,
  agent_role,
  model_used,
  COUNT(*) as call_count,
  SUM(cost) as total_cost,
  AVG(duration_ms) as avg_duration
FROM agent_activity
WHERE timestamp < EXTRACT(EPOCH FROM NOW() - INTERVAL '30 days') * 1000
GROUP BY date, agent_role, model_used;
```

## 🛠️ Troubleshooting

### Common Issues

1. **No Data in Dashboard**
   - Check database connection: `npm run metrics:check`
   - Verify tracking is enabled in `.env`
   - Ensure analyses are running

2. **Incorrect Cost Calculations**
   - Verify model pricing in `model-usage-analytics.ts`
   - Check token counting accuracy
   - Review cost calculation logic

3. **Missing Recommendations**
   - Need minimum 10 calls per operation
   - Ensure 7+ days of data available
   - Check model alternatives mapping

## 📚 API Reference

### TrackingData Interface

```typescript
interface TrackingData {
  agent: string;           // Agent role (e.g., 'deepwiki', 'comparison')
  operation: string;       // Operation name (e.g., 'analyze', 'compare')
  repository: string;      // Repository URL
  prNumber?: string;       // PR number if applicable
  language?: string;       // Primary language
  repositorySize?: 'small' | 'medium' | 'large' | 'enterprise';
  model: string;           // Model identifier
  modelVersion?: string;   // Model version
  isFallback?: boolean;    // Using fallback model
  inputTokens?: number;    // Input token count
  outputTokens?: number;   // Output token count
  duration: number;        // Execution time in ms
  success: boolean;        // Success status
  error?: string;         // Error message if failed
  retryCount?: number;    // Number of retries
  cost?: number;          // Calculated cost
}
```

### Analytics Service Methods

```typescript
class ModelUsageAnalyticsService {
  // Get performance metrics
  getModelPerformanceMetrics(
    startDate?: Date, 
    endDate?: Date
  ): Promise<ModelPerformanceMetrics[]>

  // Get usage patterns
  getAgentModelUsagePatterns(): Promise<AgentModelUsagePattern[]>

  // Generate recommendations
  generateOptimizationRecommendations(): Promise<ModelOptimizationRecommendation[]>

  // Get model combinations
  getFrequentModelCombinations(): Promise<ModelCombination[]>

  // Generate report
  generateCostOptimizationReport(): Promise<string>
}
```

## 🔗 Related Documentation

- [Grafana Dashboard Setup](./dashboards/setup-guide.md)
- [CodeQual Architecture](../../docs/architecture/ARCHITECTURE.md)
- [Agent Configuration](../../docs/agents/AGENT_CONFIG.md)
- [Cost Management Best Practices](../../docs/best-practices/COST_MANAGEMENT.md)

## 📝 License

Copyright © 2024 CodeQual Team. All rights reserved.