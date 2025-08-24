# CodeQual Monitoring - Quick Reference

## 🚀 Essential Commands

### Daily Operations
```bash
# Check system health
npm run metrics:check

# View today's summary
npm run metrics:summary --days 1

# Monitor real-time
npm run metrics:watch
```

### Cost Analysis
```bash
# Current costs
npm run metrics:costs

# Optimization opportunities
npm run optimize:recommend

# Simulate savings
npm run optimize:simulate <agent> <operation> <model>
```

### Reporting
```bash
# Generate optimization report
npm run optimize:report

# Export metrics
npm run metrics:summary --format csv > metrics.csv
```

## 📊 Key Metrics to Watch

| Metric | Good | Warning | Critical |
|--------|------|---------|----------|
| Success Rate | >95% | 85-95% | <85% |
| Avg Duration | <30s | 30-60s | >60s |
| Error Rate | <5% | 5-10% | >10% |
| Cost/Call | <$0.05 | $0.05-0.10 | >$0.10 |
| Retry Rate | <5% | 5-10% | >10% |

## 💰 Model Pricing Reference

| Model | Input (per 1K tokens) | Output (per 1K tokens) |
|-------|----------------------|------------------------|
| GPT-3.5 Turbo | $0.0005 | $0.0015 |
| GPT-4o-mini | $0.00015 | $0.0006 |
| GPT-4o | $0.005 | $0.015 |
| GPT-4 Turbo | $0.01 | $0.03 |
| GPT-4 | $0.03 | $0.06 |
| Claude-3 Haiku | $0.00025 | $0.00125 |
| Claude-3 Opus | $0.015 | $0.075 |

## 🎯 Optimization Decision Matrix

| Current Model | If Success >95% | If Success 85-95% | If Success <85% |
|--------------|-----------------|-------------------|-----------------|
| GPT-4 | → GPT-4o or 4-Turbo | → GPT-4-Turbo | Keep GPT-4 |
| GPT-4-Turbo | → GPT-4o | → GPT-4o-mini (test) | Keep or → GPT-4 |
| GPT-4o | → GPT-4o-mini | Test carefully | Keep GPT-4o |
| Claude Opus | → GPT-4o | → Claude Haiku (test) | Keep Opus |

## 🔍 Quick SQL Queries

### Last Hour Activity
```sql
SELECT agent_role, COUNT(*), AVG(cost), AVG(duration_ms/1000) as avg_sec
FROM agent_activity 
WHERE timestamp > EXTRACT(EPOCH FROM NOW() - INTERVAL '1 hour') * 1000
GROUP BY agent_role;
```

### Today's Costs
```sql
SELECT SUM(cost) as total_cost, 
       COUNT(*) as total_calls,
       AVG(cost) as avg_cost
FROM agent_activity 
WHERE timestamp > EXTRACT(EPOCH FROM CURRENT_DATE) * 1000;
```

### Failed Operations
```sql
SELECT agent_role, operation, error, COUNT(*)
FROM agent_activity 
WHERE success = false 
  AND timestamp > EXTRACT(EPOCH FROM NOW() - INTERVAL '24 hours') * 1000
GROUP BY agent_role, operation, error
ORDER BY COUNT(*) DESC;
```

### Model Performance
```sql
SELECT model_used,
       AVG(CASE WHEN success THEN 100 ELSE 0 END) as success_rate,
       AVG(duration_ms/1000) as avg_duration_sec,
       SUM(cost) as total_cost
FROM agent_activity
WHERE timestamp > EXTRACT(EPOCH FROM NOW() - INTERVAL '7 days') * 1000
GROUP BY model_used
ORDER BY total_cost DESC;
```

## 🚨 Alert Thresholds

```yaml
immediate_action:
  - error_rate > 20%
  - success_rate < 80%
  - cost_per_hour > $10
  - avg_duration > 120s

investigate:
  - error_rate > 10%
  - success_rate < 90%
  - cost_per_hour > $5
  - avg_duration > 60s
  - retry_rate > 10%

monitor:
  - error_rate > 5%
  - success_rate < 95%
  - cost_per_hour > $2
  - avg_duration > 30s
```

## 📈 Grafana Dashboard URLs

```bash
# Local Grafana
http://localhost:3000/d/codequal-performance   # Performance Dashboard
http://localhost:3000/d/model-optimization      # Model Optimization

# With specific time range
http://localhost:3000/d/codequal-performance?from=now-24h&to=now
http://localhost:3000/d/model-optimization?from=now-7d&to=now
```

## 🔧 Troubleshooting Commands

```bash
# Check database connection
npm run metrics:check

# View recent errors
npm run metrics:summary -- --filter errors

# Test specific agent
npm run optimize:analyze -- --agent deepwiki

# Clear old data (>30 days)
npm run metrics:cleanup

# Rebuild tracking
cd packages/agents && npm run build
```

## 📝 Environment Variables

```bash
# Required for tracking
SUPABASE_URL=             # Supabase project URL
SUPABASE_SERVICE_ROLE_KEY= # Service role key
REDIS_URL=                # Redis cache URL

# Optional
COST_TRACKING_ENABLED=true  # Enable/disable tracking
COST_ALERT_THRESHOLD=50     # Alert threshold in USD
LOG_LEVEL=info              # Logging verbosity
```

## 🎮 Keyboard Shortcuts (Grafana)

| Action | Shortcut |
|--------|----------|
| Toggle fullscreen | `f` |
| Refresh dashboard | `r` |
| Dashboard settings | `e` |
| Save dashboard | `Ctrl+S` |
| Search panels | `/` |
| Time range picker | `t` |
| Zoom out | `Ctrl+Z` |

## 📊 Performance Benchmarks

| Repository Size | Expected Duration | Token Range | Typical Cost |
|----------------|-------------------|-------------|--------------|
| Small (<1K LOC) | 10-30s | 500-2K | $0.01-0.05 |
| Medium (1-10K) | 30-60s | 2K-10K | $0.05-0.20 |
| Large (10-50K) | 60-180s | 10K-50K | $0.20-1.00 |
| Enterprise (>50K) | 180-300s | 50K+ | $1.00+ |

## 🔄 Model Migration Checklist

- [ ] Current success rate >90%?
- [ ] Tested on non-critical operations?
- [ ] Simulated cost impact?
- [ ] Backup configuration saved?
- [ ] Monitoring dashboard ready?
- [ ] Rollback plan prepared?
- [ ] Team notified?
- [ ] Documentation updated?

## 💡 Pro Tips

1. **Monitor After Changes**: Watch metrics for 24h after any model switch
2. **Start Small**: Test new models on small repos first
3. **Time-based Switching**: Use cheaper models during low-traffic hours
4. **Cache Aggressively**: Redis cache reduces API calls by 30-50%
5. **Batch Operations**: Group similar analyses to optimize model usage
6. **Regular Reviews**: Weekly optimization reviews save 20-40% on costs

## 📞 Quick Links

- [Full Documentation](./README.md)
- [Dashboard Setup](./dashboards/setup-guide.md)
- [Migration Guide](./MIGRATION_GUIDE.md)
- [Grafana](http://localhost:3000)
- [Supabase Dashboard](https://app.supabase.com)