# Getting Started with CodeQual Monitoring

Welcome to CodeQual's monitoring and analytics system! This guide will help you set up comprehensive monitoring for your code analysis pipeline.

## 🎯 What You'll Get

After setup, you'll have:
- **Real-time performance monitoring** of all analyses
- **Cost tracking** for every API call
- **Model optimization insights** to reduce costs
- **Quality metrics** to ensure analysis accuracy
- **Grafana dashboards** for visualization

## 📋 Prerequisites

Before starting, ensure you have:
1. CodeQual installed and configured
2. Supabase account with database access
3. Grafana instance (local or cloud)
4. At least one successful analysis run

## 🚀 Quick Setup (5 minutes)

### Step 1: Verify Environment

Your `.env` file should include:
```bash
# Supabase (for metrics storage)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# Optional but recommended
REDIS_URL=redis://localhost:6379  # For caching
```

### Step 2: Test Connection

```bash
# Verify everything is connected
npm run metrics:check
```

You should see:
```
✅ Connected to Supabase successfully
✅ Agent activity table found
✅ Tracking is enabled
```

### Step 3: Run Your First Analysis

```bash
# Analyze a small repository to generate data
npm run analyze -- --repo https://github.com/sindresorhus/ky --pr 700
```

### Step 4: View Your Metrics

```bash
# See the results
npm run metrics:summary
```

## 📊 Setting Up Dashboards

### Option 1: Quick Local Setup

1. Start Grafana:
   ```bash
   docker run -d -p 3000:3000 grafana/grafana
   ```

2. Open http://localhost:3000 (admin/admin)

3. Add PostgreSQL datasource:
   - Go to Configuration → Data Sources → Add
   - Choose PostgreSQL
   - Enter your Supabase connection details

4. Import dashboards:
   - Go to Dashboards → Import
   - Upload `grafana/codequal-dashboard-final.json`
   - Upload `grafana/model-optimization-dashboard.json`

### Option 2: Cloud Grafana

Use Grafana Cloud free tier:
1. Sign up at https://grafana.com/
2. Follow same datasource and import steps

## 💰 Understanding Costs

### View Current Costs
```bash
# See cost breakdown
npm run metrics:costs
```

### Find Optimization Opportunities
```bash
# Get AI-powered recommendations
npm run optimize:recommend
```

Example output:
```
💡 Found 3 optimization opportunities!
💰 Total Potential Monthly Savings: $255.00

deepwiki - analyze
  Current: openai/gpt-4 → Recommended: openai/gpt-4o
  Savings: $170.00/month (66.7%)
  Quality Impact: minimal
  ✅ Safe to switch - minimal quality impact
```

### Simulate Before Switching
```bash
# Test impact of model change
npm run optimize:simulate deepwiki analyze "openai/gpt-4o"
```

## 🔍 Model Optimization Workflow

### Step 1: Analyze Current Usage
```bash
# See what models each agent is using
npm run optimize:patterns

# Example output:
📈 Analyzing usage patterns...

deepwiki Agent:

  Most Used Models:
    openai/gpt-4              ████████████████ 80.0% (120 calls)
    openai/gpt-4-turbo        ████ 20.0% (30 calls)

  Top Operations:
    analyze                   120 calls | Model: openai/gpt-4
    extract_context          30 calls | Model: openai/gpt-4-turbo

  Recent Trend:
    2025-01: 45 calls, $67.50
    2025-02: 52 calls, $78.00
    2025-03: 73 calls, $109.50
```

### Step 2: Review Model Combinations
```bash
# See which models work together
npm run optimize:combinations

# Example output:
🔗 Analyzing model combinations...

[openai/gpt-4 + openai/gpt-4o + openai/gpt-4o-mini]
  Used 45 times | Total Cost: $127.50
  Agents: deepwiki, comparison, orchestrator

[openai/gpt-4-turbo + claude-3-haiku]
  Used 28 times | Total Cost: $42.00
  Agents: educator, researcher
```

### Step 3: Get Detailed Analysis
```bash
# Analyze last 7 days for trends
npm run optimize:analyze --days 7

# Example output:
🔍 Analyzing model usage patterns...

📊 Model Performance Summary (Last 7 days)

deepwiki Agent:
  analyze → openai/gpt-4
    Calls: 28 | Success: 96.4%
    Avg Cost: $0.2100 | Total: $5.88
    Avg Tokens: 7000

comparison Agent:
  compare → openai/gpt-4o
    Calls: 56 | Success: 98.2%
    Avg Cost: $0.0375 | Total: $2.10
    Avg Tokens: 2500
```

### Step 4: Test Optimizations
```bash
# Simulate switching deepwiki to cheaper model
npm run optimize:simulate deepwiki analyze "openai/gpt-4o"

# Example output:
🔮 Simulating model switch for deepwiki - analyze...

📊 Simulation Results:

Current Model: openai/gpt-4
  - Avg Cost/Call: $0.2100
  - Monthly Cost: $252.00
  - Success Rate: 96.4%

New Model: openai/gpt-4o
  - Avg Cost/Call: $0.0700
  - Monthly Cost: $84.00

💰 Potential Savings: $168.00/month (66.7%)

⚠️ Note: This simulation assumes:
  - Same token usage patterns
  - Similar success rates
  - No change in retry behavior

Actual results may vary. Test thoroughly before switching.
```

### Step 5: Generate Comprehensive Report
```bash
# Create full optimization report
npm run optimize:report --output my-optimization-plan.md

# Report includes:
# - Executive summary with total savings potential
# - Detailed analysis of each agent's usage
# - Prioritized recommendations
# - Implementation roadmap
# - Risk assessment
```

## 📊 Real-World Optimization Example

Here's a complete example of optimizing costs for a production system:

### Initial State
```bash
# Check current monthly costs
npm run metrics:costs

Current Monthly Costs:
  deepwiki: $450.00 (openai/gpt-4)
  comparison: $120.00 (openai/gpt-4)
  orchestrator: $30.00 (openai/gpt-4o)
  educator: $85.00 (claude-3-opus)
  Total: $685.00/month
```

### Analysis Phase
```bash
# Get recommendations
npm run optimize:recommend

Recommendations:
1. deepwiki: Switch to openai/gpt-4o (save $300/month)
2. comparison: Switch to openai/gpt-4o-mini for simple comparisons (save $60/month)
3. educator: Switch to openai/gpt-4-turbo (save $40/month)
Total Potential Savings: $400/month (58%)
```

### Testing Phase
```bash
# Test on non-critical operations first
export USE_OPTIMIZED_MODELS=true
export OPTIMIZED_MODELS_CONFIG=./test-models.json

# Run test analyses
npm run analyze -- --repo https://github.com/sindresorhus/is-odd --pr 10

# Monitor quality metrics
npm run metrics:summary --filter quality
```

### Gradual Rollout
```javascript
// test-models.json - Start with 10% of traffic
{
  "rollout": {
    "deepwiki": {
      "percentage": 10,
      "oldModel": "openai/gpt-4",
      "newModel": "openai/gpt-4o"
    }
  }
}

// After 1 week, if quality maintained, increase to 50%
// After 2 weeks at 50%, go to 100%
```

### Monitoring After Change
```bash
# Daily monitoring script
#!/bin/bash
echo "📊 Daily Model Performance Check"
npm run optimize:analyze --days 1
npm run metrics:summary --filter errors --days 1

# Alert if success rate drops below 95%
SUCCESS_RATE=$(npm run metrics:summary --format json | jq '.successRate')
if (( $(echo "$SUCCESS_RATE < 95" | bc -l) )); then
  echo "⚠️ ALERT: Success rate dropped below 95%"
  # Send notification
fi
```

## 🎯 What to Monitor

### Key Metrics

| Metric | What it Means | Target |
|--------|--------------|--------|
| **Success Rate** | % of successful analyses | >95% |
| **Avg Duration** | Time per analysis | <30s for small repos |
| **Cost per Call** | Average API cost | <$0.05 |
| **Error Rate** | % of failed calls | <5% |

### Daily Routine

Start your day by checking:
```bash
# Morning health check
npm run metrics:summary --days 1
```

End of day review:
```bash
# Daily cost review
npm run metrics:costs --days 1
```

## 📈 Optimization Strategy

### Week 1: Establish Baseline
- Run normal analyses
- Let data accumulate
- No changes yet

### Week 2: Analyze Patterns
```bash
# See what models are being used
npm run optimize:patterns

# Check for inefficiencies
npm run optimize:analyze
```

### Week 3: Test Optimizations
```bash
# Get recommendations
npm run optimize:recommend

# Test on non-critical repos first
```

### Week 4: Implement & Save
- Apply recommended changes
- Monitor quality metrics
- Track cost savings

## 🔔 Setting Up Alerts

### Cost Alerts
Monitor spending:
```sql
-- Add to Grafana alert
SELECT SUM(cost) as hourly_cost
FROM agent_activity
WHERE timestamp > EXTRACT(EPOCH FROM NOW() - INTERVAL '1 hour') * 1000
-- Alert if > $5/hour
```

### Performance Alerts
Track degradation:
```sql
-- Alert on slow performance
SELECT AVG(duration_ms) as avg_duration
FROM agent_activity
WHERE timestamp > EXTRACT(EPOCH FROM NOW() - INTERVAL '1 hour') * 1000
-- Alert if > 60000ms (1 minute)
```

## 📊 Understanding Your Data

### What Gets Tracked

Every API call records:
- **Who**: Which agent (deepwiki, comparison, etc.)
- **What**: Operation performed
- **When**: Timestamp
- **Where**: Repository analyzed
- **How Much**: Tokens used, cost incurred
- **How Long**: Execution duration
- **Result**: Success/failure

### Using the Data

Find expensive operations:
```bash
npm run optimize:analyze
```

Track improvement:
```bash
# Before optimization
npm run metrics:costs > costs-before.txt

# After optimization
npm run metrics:costs > costs-after.txt

# Compare
diff costs-before.txt costs-after.txt
```

## 🚀 Advanced Features

### Real-time Monitoring
```bash
# Watch metrics update live
npm run metrics:watch
```

### Export for Analysis
```bash
# Export to CSV
npm run metrics:summary --format csv > metrics.csv

# Export to JSON
npm run metrics:summary --format json > metrics.json
```

### Generate Reports
```bash
# Comprehensive optimization report
npm run optimize:report --output optimization-report.md
```

## 💡 Best Practices

### 1. Start Small
- Begin with one repository
- Establish baseline metrics
- Gradually expand coverage

### 2. Monitor Regularly
- Daily cost checks
- Weekly optimization reviews
- Monthly trend analysis

### 3. Test Changes
- Always simulate first
- Test on small repos
- Monitor quality impact

### 4. Document Decisions
- Record why you switched models
- Track quality impacts
- Share savings with team

## 🆘 Troubleshooting

### No Data Showing
```bash
# Check if tracking is working
npm run metrics:check

# Run a test analysis
npm run analyze -- --repo https://github.com/sindresorhus/is-odd
```

### High Costs
```bash
# Find the culprit
npm run optimize:analyze --days 1

# Get immediate recommendations
npm run optimize:recommend
```

### Slow Performance
```bash
# Check agent performance
npm run metrics:agents

# Look for bottlenecks
npm run metrics:summary --filter slow
```

## 📚 Next Steps

1. **Set up dashboards** - Visualize your data
2. **Configure alerts** - Get notified of issues
3. **Run for a week** - Establish baselines
4. **Optimize models** - Start saving money
5. **Share results** - Show ROI to stakeholders

## 🎉 You're Ready!

You now have:
- ✅ Monitoring configured
- ✅ Tracking enabled
- ✅ Dashboards ready
- ✅ Optimization tools available

Start analyzing and optimizing! Every analysis makes your system smarter and more cost-effective.

## 📞 Need Help?

- Check the [Full Documentation](./README.md)
- Review [Quick Reference](./QUICK_REFERENCE.md)
- See [Dashboard Setup](./dashboards/setup-guide.md)

Happy monitoring! 🚀