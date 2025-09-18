# Web Analyzer Performance Monitoring Dashboard

## Current Configuration (Extended Timeouts)

| Operation | Previous Timeout | New Timeout | Increase |
|-----------|-----------------|-------------|----------|
| DOM Analysis | 30 seconds | 90 seconds | 3x |
| Selenium Generation | 45 seconds | 60 seconds | 1.33x |
| Overall Operation | 60 seconds | 60 seconds | - |

## Monitoring Features Implemented

### 1. Real-time Progress Tracking
- Progress logged every 10 seconds
- Percentage of timeout utilized
- Warning when 75% of timeout reached
- Checkpoint tracking for debugging

### 2. Performance Metrics Collection
```javascript
{
  "timestamp": "2025-09-10T15:30:00Z",
  "operation": "DOM analysis",
  "status": "success|timeout|error",
  "duration": 45000,
  "timeoutMs": 90000,
  "utilizationPercent": 50,
  "checkpoints": 4
}
```

### 3. Logging Levels

#### Success Logs
```
✅ [DOM Analysis] Completed successfully in 45000ms (50% of timeout used)
```

#### Progress Logs
```
📊 [DOM Analysis] Progress: 20000ms elapsed (22% of timeout)
```

#### Warning Logs
```
⚠️ [DOM Analysis] Approaching timeout - 15000ms remaining
```

#### Error Logs
```
❌ [DOM Analysis] TIMEOUT after 90000ms
   Checkpoints: [10s, 20s, 30s, 40s, 50s, 60s, 70s, 80s]
```

## Enabling Metrics Collection

### Environment Variable
```bash
export ENABLE_METRICS_LOGGING=true
```

### Output File
```
analysis-metrics.jsonl
```

## Sample Metrics Analysis

### Success Rate Calculation
```javascript
const metrics = fs.readFileSync('analysis-metrics.jsonl', 'utf8')
  .split('\n')
  .filter(Boolean)
  .map(JSON.parse);

const domMetrics = metrics.filter(m => m.operation === 'DOM analysis');
const successRate = domMetrics.filter(m => m.status === 'success').length / domMetrics.length * 100;
console.log(`DOM Analysis Success Rate: ${successRate}%`);
```

### Average Duration
```javascript
const avgDuration = domMetrics
  .filter(m => m.status === 'success')
  .reduce((sum, m) => sum + m.duration, 0) / domMetrics.length;
console.log(`Average DOM Analysis Time: ${avgDuration}ms`);
```

### Timeout Utilization
```javascript
const avgUtilization = domMetrics
  .filter(m => m.utilizationPercent)
  .reduce((sum, m) => sum + m.utilizationPercent, 0) / domMetrics.length;
console.log(`Average Timeout Utilization: ${avgUtilization}%`);
```

## Monitoring Dashboard Script

```javascript
// monitor-dashboard.js
const fs = require('fs');
const readline = require('readline');

async function analyzeMetrics() {
  const fileStream = fs.createReadStream('analysis-metrics.jsonl');
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  const stats = {
    dom: { success: 0, timeout: 0, error: 0, total: 0, durations: [] },
    selenium: { success: 0, timeout: 0, error: 0, total: 0, durations: [] }
  };

  for await (const line of rl) {
    if (!line) continue;
    const metric = JSON.parse(line);
    
    const category = metric.operation.includes('DOM') ? 'dom' : 'selenium';
    stats[category].total++;
    stats[category][metric.status]++;
    
    if (metric.duration) {
      stats[category].durations.push(metric.duration);
    }
  }

  // Display dashboard
  console.log('\n=== WEB ANALYZER PERFORMANCE DASHBOARD ===\n');
  
  for (const [name, data] of Object.entries(stats)) {
    if (data.total === 0) continue;
    
    console.log(`📊 ${name.toUpperCase()} ANALYSIS`);
    console.log(`   Total Runs: ${data.total}`);
    console.log(`   ✅ Success: ${data.success} (${(data.success/data.total*100).toFixed(1)}%)`);
    console.log(`   ⏱️ Timeouts: ${data.timeout} (${(data.timeout/data.total*100).toFixed(1)}%)`);
    console.log(`   ❌ Errors: ${data.error} (${(data.error/data.total*100).toFixed(1)}%)`);
    
    if (data.durations.length > 0) {
      const avg = data.durations.reduce((a, b) => a + b, 0) / data.durations.length;
      const max = Math.max(...data.durations);
      const min = Math.min(...data.durations);
      console.log(`   ⏱️ Avg Time: ${(avg/1000).toFixed(1)}s`);
      console.log(`   ⏱️ Min/Max: ${(min/1000).toFixed(1)}s / ${(max/1000).toFixed(1)}s`);
    }
    console.log();
  }
}

analyzeMetrics();
```

## Recommendations Based on Monitoring

### If Timeout Rate > 20%
- Consider further extending timeout
- Investigate specific pages causing timeouts
- Implement chunked/progressive analysis

### If Average Duration > 60s
- Implement caching for repeated analyses
- Use headless browser pooling
- Consider moving to worker threads

### If Error Rate > 10%
- Check for memory leaks
- Validate browser configuration
- Review error patterns in logs

## Alert Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| Timeout Rate | > 10% | > 25% |
| Error Rate | > 5% | > 15% |
| Avg Duration | > 60s | > 80s |
| Memory Usage | > 1GB | > 2GB |

## Integration with Monitoring Systems

### Prometheus Metrics
```javascript
// Add to analyzer
const promClient = require('prom-client');
const domAnalysisDuration = new promClient.Histogram({
  name: 'dom_analysis_duration_seconds',
  help: 'Duration of DOM analysis in seconds',
  labelNames: ['status']
});

// In logPerformanceMetrics
if (operation === 'DOM analysis') {
  domAnalysisDuration.labels(metrics.status).observe(metrics.duration / 1000);
}
```

### Grafana Dashboard Query
```sql
rate(dom_analysis_duration_seconds_sum[5m]) / 
rate(dom_analysis_duration_seconds_count[5m])
```

## Next Steps

1. **Collect baseline metrics** for 1 week
2. **Analyze patterns** to identify problem areas
3. **Optimize based on data** - not assumptions
4. **Consider architectural changes** if needed:
   - Browser pooling
   - Worker threads
   - Distributed processing
   - Progressive enhancement