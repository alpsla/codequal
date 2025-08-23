# DeepWiki Analysis Monitoring Guide

## Overview
The DeepWiki analysis system includes comprehensive monitoring to track iteration counts, memory usage, and performance metrics across all PR analyses.

## Key Features

### 1. Iteration Monitoring
- **Tracks average iterations per PR analysis**
- Minimum 3 iterations enforced for stability
- Maximum 10 iterations to prevent infinite loops
- Stability detection: Stops when no new issues found for 2 consecutive iterations

### 2. Memory Optimization
- **Automatic memory cleanup between iterations**
- Truncates large responses (>50KB) after processing
- Clears large objects when memory exceeds 80% of 1GB threshold
- Forces garbage collection when memory is high
- Post-analysis cleanup of all iteration data

### 3. Performance Metrics
- Duration tracking per iteration and total analysis
- Memory usage monitoring (before/after analysis)
- Cache hit rate tracking
- Success/failure rate statistics

## Metrics Collected

### Per-Analysis Metrics
```typescript
{
  repositoryUrl: string;      // Repository being analyzed
  prNumber?: string;          // PR number if analyzing a PR
  iterations: number;         // Number of iterations performed
  duration: number;          // Total duration in milliseconds
  memoryUsed: number;        // Memory consumed in bytes
  cacheHit: boolean;         // Whether cache was used
  issuesFound: number;       // Number of issues discovered
  timestamp: Date;           // When analysis occurred
  success: boolean;          // Whether analysis succeeded
  error?: string;           // Error message if failed
}
```

### Aggregated Metrics
```typescript
{
  totalAnalyses: number;       // Total analyses performed
  averageIterations: number;   // Average iterations across all analyses
  minIterations: number;       // Minimum iterations observed
  maxIterations: number;       // Maximum iterations observed
  averageDuration: number;     // Average analysis duration
  averageMemoryUsed: number;   // Average memory consumption
  cacheHitRate: number;        // Percentage of cache hits
  successRate: number;         // Percentage of successful analyses
  averageIssuesFound: number;  // Average issues per analysis
}
```

## Testing the Monitoring

### Run Monitoring Test
```bash
# With mock data (fast)
USE_DEEPWIKI_MOCK=true npx ts-node test-monitoring.ts

# With real DeepWiki (requires setup)
USE_DEEPWIKI_MOCK=false \
DEEPWIKI_API_URL=http://localhost:8001 \
DEEPWIKI_API_KEY=dw-key-e48329b6c05b4a36a18d65af21ac3c2f \
npx ts-node test-monitoring.ts
```

### View Metrics in Logs
The analyzer logs iteration statistics in real-time:
```
[AdaptiveAnalyzer] Iteration 1: Completeness 45%, Gaps: 12 (3 critical)
[AdaptiveAnalyzer] Iteration 2: Completeness 72%, Gaps: 6 (1 critical)
[AdaptiveAnalyzer] Iteration 3: Completeness 89%, Gaps: 2 (0 critical)
[AdaptiveAnalyzer] Analysis complete - Average iterations across all analyses: 3.67
```

### Monitor Memory Usage
Memory optimization logs appear when thresholds are exceeded:
```
[AdaptiveAnalyzer] High memory usage at iteration 4, cleaning up previous iteration data
[AnalysisMonitor] Performing post-analysis memory cleanup
```

## Configuration

### Memory Thresholds
Located in `analysis-monitor.ts`:
```typescript
// Memory threshold (default: 1GB)
private static readonly MEMORY_THRESHOLD = 1024 * 1024 * 1024;

// Trigger cleanup at 80% of threshold
if (totalUsed > MemoryOptimizer.MEMORY_THRESHOLD * 0.8)
```

### Iteration Limits
Located in `analysis-schema.ts`:
```typescript
maxIterations: z.number().min(3).max(10).default(3)
```

### Metrics Storage
- **In-Memory**: Last 100 analyses kept in memory
- **Disk**: All metrics persisted to `/tmp/codequal-metrics/analysis-metrics.jsonl`
- **Flush Interval**: Every 60 seconds

## Monitoring Dashboard (Future)

### Planned Features
1. **Real-time Dashboard**
   - Live iteration counts
   - Memory usage graphs
   - Success rate trends

2. **Historical Analysis**
   - Iteration patterns by repository complexity
   - Performance regression detection
   - Memory usage optimization opportunities

3. **Alerts**
   - High memory usage warnings
   - Excessive iteration alerts
   - Low success rate notifications

## Performance Benchmarks

### Expected Iteration Counts by Repository Size

| Repository Type | Expected Iterations | Typical Duration |
|----------------|-------------------|------------------|
| Small (<100 files) | 3 | 30-60s |
| Medium (100-500 files) | 3-5 | 60-120s |
| Large (500-1000 files) | 4-7 | 120-300s |
| Very Large (>1000 files) | 5-10 | 300-600s |

### Memory Usage Guidelines

| Analysis Phase | Expected Memory | Action if Exceeded |
|---------------|-----------------|-------------------|
| Initial | <200MB | Normal |
| Per Iteration | +50-100MB | Monitor |
| Peak (Large Repo) | 600-800MB | Cleanup triggered |
| Critical | >800MB | Force GC, truncate |

## Troubleshooting

### High Iteration Count
If average iterations exceed 7:
1. Check gap detection logic
2. Verify DeepWiki response quality
3. Review stability detection settings

### Memory Issues
If memory consistently exceeds threshold:
1. Reduce response size limits
2. Increase truncation threshold
3. Enable more aggressive cleanup

### Low Success Rate
If success rate drops below 80%:
1. Check DeepWiki availability
2. Review timeout settings
3. Verify network connectivity

## Best Practices

1. **Monitor Regularly**
   - Check average iterations weekly
   - Review memory trends daily
   - Track success rates per deployment

2. **Optimize Based on Data**
   - Adjust iteration limits based on actual usage
   - Fine-tune memory thresholds for your environment
   - Cache frequently analyzed repositories

3. **Act on Alerts**
   - Investigate repos with high iteration counts
   - Address memory leaks promptly
   - Fix failing analyses quickly

## Integration with Existing Tools

### Prometheus Metrics (Planned)
```typescript
// Export metrics for Prometheus
codequal_deepwiki_iterations_total
codequal_deepwiki_duration_seconds
codequal_deepwiki_memory_bytes
codequal_deepwiki_success_rate
```

### Grafana Dashboards (Planned)
- Iteration trends over time
- Memory usage patterns
- Success rate by repository
- Performance comparison across versions

## Summary

The monitoring system provides comprehensive visibility into the DeepWiki analysis process, enabling:
- **Performance optimization** through iteration tracking
- **Resource management** via memory monitoring
- **Quality assurance** with success rate metrics
- **Continuous improvement** based on aggregated data

This monitoring is essential for maintaining a stable, efficient, and scalable code analysis system.