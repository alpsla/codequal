# Complete DeepWiki Monitoring Setup

## Overview
This guide sets up monitoring for DeepWiki disk usage with data stored in Supabase and displayed in Grafana.

## Step 1: Create Tables in Supabase

Run this SQL in your Supabase SQL editor:

```sql
-- Create tables for DeepWiki metrics
CREATE TABLE IF NOT EXISTS deepwiki_metrics (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  disk_total_gb INTEGER NOT NULL,
  disk_used_gb INTEGER NOT NULL,
  disk_available_gb INTEGER NOT NULL,
  disk_usage_percent INTEGER NOT NULL,
  active_repositories INTEGER DEFAULT 0,
  metadata JSONB
);

CREATE TABLE IF NOT EXISTS analysis_history (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  repository_url TEXT NOT NULL,
  repository_name TEXT NOT NULL,
  status TEXT CHECK (status IN ('started', 'completed', 'failed')),
  disk_usage_mb INTEGER,
  analysis_duration_seconds INTEGER,
  error_message TEXT,
  metadata JSONB
);

-- Create indexes
CREATE INDEX idx_deepwiki_metrics_created_at ON deepwiki_metrics(created_at DESC);
CREATE INDEX idx_analysis_history_created_at ON analysis_history(created_at DESC);
```

## Step 2: Start Metrics Collection

Add to your API startup code:

```typescript
import { metricsCollector } from './services/deepwiki-metrics-collector.js';

// Start collecting metrics every minute
metricsCollector.startCollection(60000);
```

## Step 3: Update Grafana Dashboard

### Panel 1: Current Disk Usage (Gauge)
```sql
SELECT 
  disk_usage_percent as value
FROM deepwiki_metrics
WHERE created_at >= NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC
LIMIT 1
```
- Format as: Table
- Visualization: Gauge
- Unit: percent
- Thresholds: 70 (yellow), 85 (red)

### Panel 2: Active Repositories (Stat)
```sql
SELECT 
  active_repositories as value
FROM deepwiki_metrics
WHERE created_at >= NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC
LIMIT 1
```
- Format as: Table
- Visualization: Stat

### Panel 3: Disk Usage Over Time (Time Series)
```sql
SELECT 
  created_at as time,
  disk_usage_percent as "Disk Usage %"
FROM deepwiki_metrics
WHERE $__timeFilter(created_at)
ORDER BY created_at
```
- Format as: Time series
- Visualization: Time series graph

### Panel 4: Repository Analysis History
```sql
SELECT 
  DATE_TRUNC('hour', created_at) as time,
  COUNT(*) as "Repos Analyzed"
FROM analysis_history
WHERE $__timeFilter(created_at)
  AND status = 'completed'
GROUP BY 1
ORDER BY 1
```
- Format as: Time series
- Visualization: Bar chart

### Panel 5: Available Space (Stat)
```sql
SELECT 
  disk_available_gb as value
FROM deepwiki_metrics
WHERE created_at >= NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC
LIMIT 1
```
- Format as: Table
- Visualization: Stat
- Unit: decgbytes

## Step 4: Set Up Alerts

In Grafana, create alert rules:

1. **Disk Usage Warning (70%)**
   - Query: Same as Panel 1
   - Condition: WHEN last() IS ABOVE 70
   - For: 5 minutes

2. **Disk Usage Critical (85%)**
   - Query: Same as Panel 1
   - Condition: WHEN last() IS ABOVE 85
   - For: 2 minutes

## Step 5: Integration Points

### When starting analysis:
```typescript
const analysisId = await metricsCollector.recordAnalysisStart(repositoryUrl);
```

### When analysis completes:
```typescript
await metricsCollector.recordAnalysisComplete(
  analysisId,
  true, // success
  diskUsageMb,
  durationSeconds
);
```

### After cleanup:
```typescript
await metricsCollector.recordCleanup(
  true, // success
  repositoriesCleaned,
  diskFreedMb
);
```

## Testing

1. Run a test collection:
```bash
npm run test:metrics-collection
```

2. Check Supabase for data:
```sql
SELECT * FROM deepwiki_metrics ORDER BY created_at DESC LIMIT 10;
```

3. Verify Grafana displays the data correctly

## Monitoring Flow

1. **Every minute**: Metrics collector queries K8s pod for disk usage
2. **Data stored**: Metrics saved to Supabase tables
3. **Grafana queries**: Dashboard pulls data from Supabase
4. **Alerts fire**: When thresholds exceeded
5. **Cleanup triggered**: When disk usage > 70%

This completes the monitoring setup with real data flow from pod → Supabase → Grafana.