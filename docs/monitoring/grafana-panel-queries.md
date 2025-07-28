# Grafana Panel Queries for PostgreSQL/Supabase

## Panel 1: Current Disk Usage (Gauge)
```sql
SELECT 
  NOW() as time,
  (disk_used_gb::float / disk_total_gb::float) * 100 as value
FROM deepwiki_metrics
WHERE created_at >= NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC
LIMIT 1
```

## Panel 2: Active Repositories (Stat)
```sql
SELECT 
  NOW() as time,
  active_repositories as value
FROM deepwiki_metrics
WHERE created_at >= NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC
LIMIT 1
```

## Panel 3: Repos Analyzed (Stat)
```sql
SELECT 
  COUNT(*) as value
FROM analysis_history
WHERE created_at >= NOW() - INTERVAL '24 hours'
  AND status = 'completed'
```

## Panel 4: Available Space (Stat)
```sql
SELECT 
  NOW() as time,
  disk_available_gb as value
FROM deepwiki_metrics
WHERE created_at >= NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC
LIMIT 1
```

## Panel 5: Disk Usage Over Time (Time Series)
```sql
SELECT 
  created_at as time,
  (disk_used_gb::float / disk_total_gb::float) * 100 as "Disk Usage %"
FROM deepwiki_metrics
WHERE created_at >= $__timeFrom()
  AND created_at <= $__timeTo()
ORDER BY created_at
```

## Panel 6: Repository Count Over Time (Time Series)
```sql
SELECT 
  created_at as time,
  active_repositories as "Repositories"
FROM deepwiki_metrics
WHERE created_at >= $__timeFrom()
  AND created_at <= $__timeTo()
ORDER BY created_at
```

## If the tables don't exist yet, use these test queries:

### Test Query 1: Simple Value
```sql
SELECT 
  NOW() as time,
  25.5 as value
```

### Test Query 2: Time Series
```sql
SELECT 
  generate_series(
    NOW() - INTERVAL '6 hours',
    NOW(),
    INTERVAL '15 minutes'
  ) as time,
  20 + random() * 10 as value
```