-- Grafana Queries for Supabase Data Source
-- These queries can be used in Grafana panels to visualize DeepWiki metrics

-- 1. Current Disk Usage Percentage
-- Use this in a Gauge panel
SELECT 
  NOW() as time,
  (disk_used_gb::float / disk_total_gb::float) * 100 as disk_usage_percent
FROM deepwiki_metrics
WHERE created_at >= NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC
LIMIT 1;

-- 2. Active Repositories Count
-- Use this in a Stat panel
SELECT 
  NOW() as time,
  active_repositories
FROM deepwiki_metrics
WHERE created_at >= NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC
LIMIT 1;

-- 3. Disk Usage Over Time
-- Use this in a Time Series panel
SELECT 
  created_at as time,
  (disk_used_gb::float / disk_total_gb::float) * 100 as disk_usage_percent,
  active_repositories
FROM deepwiki_metrics
WHERE created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at;

-- 4. Repository Analysis History
-- Use this in a Time Series or Bar chart
SELECT 
  DATE_TRUNC('hour', created_at) as time,
  COUNT(*) as repos_analyzed,
  SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
FROM analysis_history
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY 1
ORDER BY 1;

-- 5. Cleanup Statistics
-- Use this in a Stat panel
SELECT 
  SUM(CASE WHEN cleanup_status = 'success' THEN 1 ELSE 0 END) as cleanup_success,
  SUM(CASE WHEN cleanup_status = 'failed' THEN 1 ELSE 0 END) as cleanup_failed,
  MAX(cleanup_time) as last_cleanup
FROM deepwiki_cleanups
WHERE created_at >= NOW() - INTERVAL '24 hours';

-- 6. Available Disk Space
-- Use this in a Stat panel
SELECT 
  NOW() as time,
  disk_available_gb
FROM deepwiki_metrics
WHERE created_at >= NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC
LIMIT 1;

-- 7. Average Repository Size
-- Use this in a Stat panel
SELECT 
  AVG(repo_size_mb) as avg_repo_size_mb
FROM analysis_history
WHERE created_at >= NOW() - INTERVAL '7 days'
  AND repo_size_mb IS NOT NULL;

-- 8. Disk Space Distribution
-- Use this in a Pie Chart
SELECT 
  'Used' as metric,
  disk_used_gb as value
FROM deepwiki_metrics
WHERE created_at >= NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC
LIMIT 1
UNION ALL
SELECT 
  'Available' as metric,
  disk_available_gb as value
FROM deepwiki_metrics
WHERE created_at >= NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC
LIMIT 1;

-- 9. Alert Status
-- Use this in a Table panel
SELECT 
  NOW() as time,
  CASE 
    WHEN (disk_used_gb::float / disk_total_gb::float) * 100 >= 85 THEN 'CRITICAL'
    WHEN (disk_used_gb::float / disk_total_gb::float) * 100 >= 70 THEN 'WARNING'
    ELSE 'OK'
  END as status,
  (disk_used_gb::float / disk_total_gb::float) * 100 as disk_percent,
  'Disk Usage' as alert_name
FROM deepwiki_metrics
WHERE created_at >= NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC
LIMIT 1;