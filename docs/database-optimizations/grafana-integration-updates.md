# Grafana Integration Updates with New Optimizations

## New Data Sources for Monitoring

### 1. Query Performance Dashboard

With the new `query_performance_log` table, you can create a comprehensive database performance dashboard:

```sql
-- Top Slow Queries Panel
SELECT 
  LEFT(query_pattern, 50) as query,
  calls_count,
  ROUND(avg_time_ms::numeric, 2) as avg_ms,
  ROUND(total_time_ms::numeric, 2) as total_ms,
  last_executed
FROM query_performance_log
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY avg_time_ms DESC
LIMIT 10;

-- Query Performance Over Time
SELECT 
  date_trunc('hour', last_executed) as time,
  COUNT(DISTINCT query_hash) as unique_queries,
  AVG(avg_time_ms) as avg_query_time,
  SUM(calls_count) as total_calls
FROM query_performance_log
WHERE last_executed > NOW() - INTERVAL '24 hours'
GROUP BY 1
ORDER BY 1;

-- Query Categories by Performance
SELECT 
  CASE 
    WHEN avg_time_ms < 100 THEN 'Fast (<100ms)'
    WHEN avg_time_ms < 500 THEN 'Medium (100-500ms)'
    WHEN avg_time_ms < 1000 THEN 'Slow (500-1000ms)'
    ELSE 'Very Slow (>1000ms)'
  END as performance_category,
  COUNT(*) as query_count,
  SUM(calls_count) as total_executions
FROM query_performance_log
GROUP BY 1
ORDER BY 1;
```

### 2. Cache Effectiveness Dashboard

Monitor the timezone cache and other caching strategies:

```sql
-- Timezone Cache Status
SELECT 
  COUNT(*) as cached_entries,
  MIN(cached_at) as oldest_entry,
  MAX(cached_at) as newest_entry,
  CASE 
    WHEN MAX(cached_at) > NOW() - INTERVAL '1 hour' THEN 'Fresh'
    WHEN MAX(cached_at) > NOW() - INTERVAL '12 hours' THEN 'Recent'
    WHEN MAX(cached_at) > NOW() - INTERVAL '24 hours' THEN 'Valid'
    ELSE 'Stale'
  END as cache_status
FROM cached_timezones;

-- Cache Hit Rate (requires application metrics)
-- This would come from your application's DatabaseMetadataCache stats
```

### 3. Repository Activity Dashboard

Using the new `v_active_repositories` view:

```sql
-- Active Repositories by Platform
SELECT 
  COALESCE(platform, 'Unknown') as platform,
  COUNT(*) as repo_count,
  AVG(analysis_count) as avg_analyses,
  MAX(last_analyzed_at) as most_recent_analysis
FROM v_active_repositories
GROUP BY platform
ORDER BY repo_count DESC;

-- Repository Analysis Trends
SELECT 
  date_trunc('day', last_analyzed_at) as day,
  COUNT(*) as repos_analyzed,
  AVG(size) as avg_repo_size
FROM v_active_repositories
WHERE last_analyzed_at IS NOT NULL
GROUP BY 1
ORDER BY 1 DESC
LIMIT 30;
```

## Enhanced Grafana Dashboard Configuration

### Dashboard 1: Database Performance Monitoring

```json
{
  "dashboard": {
    "title": "CodeQual Database Performance",
    "panels": [
      {
        "title": "Query Performance Distribution",
        "type": "piechart",
        "targets": [{
          "rawSql": "SELECT CASE WHEN avg_time_ms < 100 THEN 'Fast' WHEN avg_time_ms < 500 THEN 'Medium' WHEN avg_time_ms < 1000 THEN 'Slow' ELSE 'Very Slow' END as category, COUNT(*) FROM query_performance_log GROUP BY 1"
        }]
      },
      {
        "title": "Slow Query Timeline",
        "type": "timeseries",
        "targets": [{
          "rawSql": "SELECT last_executed as time, query_pattern, avg_time_ms FROM query_performance_log WHERE avg_time_ms > 500 ORDER BY last_executed DESC"
        }]
      },
      {
        "title": "Database Load Over Time",
        "type": "graph",
        "targets": [{
          "rawSql": "SELECT date_trunc('minute', last_executed) as time, SUM(calls_count) as queries_per_minute, AVG(avg_time_ms) as avg_response_time FROM query_performance_log WHERE last_executed > NOW() - INTERVAL '1 hour' GROUP BY 1"
        }]
      }
    ]
  }
}
```

### Dashboard 2: Cache and Optimization Metrics

```json
{
  "dashboard": {
    "title": "CodeQual Cache & Optimization Metrics",
    "panels": [
      {
        "title": "Cache Status",
        "type": "stat",
        "targets": [{
          "rawSql": "SELECT COUNT(*) as value, 'Cached Timezones' as name FROM cached_timezones UNION ALL SELECT COUNT(*) as value, 'Active Repositories' as name FROM v_active_repositories"
        }]
      },
      {
        "title": "Index Usage Statistics",
        "type": "table",
        "targets": [{
          "rawSql": "SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch FROM pg_stat_user_indexes WHERE schemaname = 'public' AND idx_scan > 0 ORDER BY idx_scan DESC LIMIT 20"
        }]
      }
    ]
  }
}
```

## New Alert Rules

### 1. Slow Query Alerts

```yaml
groups:
  - name: database_performance
    interval: 5m
    rules:
      - alert: SlowQueryDetected
        expr: |
          max(
            query_performance_log_avg_time_ms{job="postgresql"}
          ) > 1000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Slow query detected"
          description: "Query taking > 1s average: {{ $value }}ms"

      - alert: HighQueryVolume
        expr: |
          sum(rate(query_performance_log_calls_count[5m])) > 1000
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High query volume detected"
          description: "More than 1000 queries/second sustained"
```

### 2. Cache Health Alerts

```yaml
      - alert: TimezoneCacheStale
        expr: |
          (time() - max(cached_timezones_cached_at)) > 86400
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Timezone cache is stale"
          description: "Cache hasn't been updated in > 24 hours"
```

## Integration with Existing Security Dashboard

Update your existing security monitoring dashboard to include database performance:

```sql
-- Add to existing security events query
SELECT 
  'Database Performance' as category,
  COUNT(CASE WHEN avg_time_ms > 1000 THEN 1 END) as critical_events,
  COUNT(CASE WHEN avg_time_ms BETWEEN 500 AND 1000 THEN 1 END) as warning_events,
  COUNT(CASE WHEN avg_time_ms < 500 THEN 1 END) as normal_events
FROM query_performance_log
WHERE created_at > NOW() - INTERVAL '1 hour'

UNION ALL

-- Your existing security events query
SELECT 
  'Security Events' as category,
  COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_events,
  COUNT(CASE WHEN severity = 'medium' THEN 1 END) as warning_events,
  COUNT(CASE WHEN severity = 'low' THEN 1 END) as normal_events
FROM security_events
WHERE timestamp > NOW() - INTERVAL '1 hour';
```

## Application Metrics Integration

To fully leverage the optimizations, add these metrics from your application:

```typescript
// In your application, send these metrics to Grafana
export class GrafanaMetricsCollector {
  private statsD: StatsD;
  
  constructor(private dbService: OptimizedDatabaseService) {
    this.statsD = new StatsD({
      host: process.env.STATSD_HOST,
      port: 8125,
      prefix: 'codequal.db.'
    });
  }

  collectMetrics() {
    // Collect cache metrics every minute
    setInterval(() => {
      const stats = this.dbService.getStats();
      
      // Cache metrics
      this.statsD.gauge('cache.size', stats.cache.size);
      this.statsD.gauge('cache.entries', stats.cache.keys.length);
      
      // Deduplication metrics
      this.statsD.gauge('dedup.total_requests', stats.deduplication.total);
      this.statsD.gauge('dedup.deduplicated', stats.deduplication.deduplicated);
      this.statsD.gauge('dedup.hit_rate', parseFloat(stats.deduplication.hitRate));
    }, 60000);
  }
  
  // Track individual query performance
  async trackQuery(queryName: string, executeFn: () => Promise<any>) {
    const start = Date.now();
    try {
      const result = await executeFn();
      const duration = Date.now() - start;
      
      this.statsD.timing(`query.${queryName}`, duration);
      
      // Log slow queries to database
      if (duration > 100) {
        await this.dbService.monitor.logSlowQuery(queryName, duration);
      }
      
      return result;
    } catch (error) {
      this.statsD.increment(`query.${queryName}.error`);
      throw error;
    }
  }
}
```

## Grafana Variables for Dynamic Dashboards

```sql
-- Variable: $time_range
SELECT 
  '1 hour' as __text, '1h' as __value
UNION SELECT '6 hours', '6h'
UNION SELECT '24 hours', '24h'
UNION SELECT '7 days', '7d'
UNION SELECT '30 days', '30d';

-- Variable: $performance_threshold
SELECT 
  '100' as __text, 100 as __value
UNION SELECT '500', 500
UNION SELECT '1000', 1000
UNION SELECT '5000', 5000;

-- Variable: $table_name
SELECT DISTINCT 
  tablename as __text,
  tablename as __value
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename;
```

## Benefits of the New Integration

1. **Real-time Performance Monitoring**: Track slow queries as they happen
2. **Cache Effectiveness**: Monitor how well caching reduces database load
3. **Predictive Alerts**: Set up alerts before performance degrades
4. **Resource Optimization**: Identify which queries need optimization
5. **Holistic View**: Combine security, performance, and usage metrics

## Next Steps

1. Import the new dashboard configs to Grafana
2. Set up the alert rules
3. Configure your application to send metrics
4. Create a weekly performance review process
5. Use insights to further optimize slow queries
