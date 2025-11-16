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

-- ============================================================
-- SERVICE HEALTH TRACKING QUERIES
-- ============================================================
-- See service-health-tracking.md for detailed documentation

-- 10. Service Availability (Success Rate)
-- Use this in a Stat or Gauge panel
SELECT 
  service_name,
  ROUND(
    (COUNT(CASE WHEN event_type LIKE '%success%' THEN 1 END)::numeric / 
     NULLIF(COUNT(*), 0)::numeric) * 100, 
    2
  ) as success_rate_percent
FROM service_health_events
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY service_name;

-- 11. Recent Failures (Last 24 Hours)
-- Use this in a Table panel
SELECT 
  created_at as time,
  service_name,
  event_type,
  status_code,
  error_message,
  url
FROM service_health_events
WHERE 
  (event_type LIKE '%failure%' OR event_type LIKE '%error%')
  AND created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 50;

-- 12. 404 Errors by Service
-- Use this in a Bar chart
SELECT
  service_name,
  COUNT(*) as error_count
FROM service_health_events
WHERE 
  status_code = 404
  AND created_at >= NOW() - INTERVAL '24 hours'
GROUP BY service_name
ORDER BY error_count DESC;

-- 13. Upload Success Rate Over Time
-- Use this in a Time Series panel
SELECT
  DATE_TRUNC('hour', created_at) as time,
  service_name,
  COUNT(CASE WHEN event_type = 'upload_success' THEN 1 END) as uploads_success,
  COUNT(CASE WHEN event_type = 'upload_failure' THEN 1 END) as uploads_failed
FROM service_health_events
WHERE 
  event_type IN ('upload_success', 'upload_failure')
  AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY 1, 2
ORDER BY 1, 2;

-- 14. Service Availability Dashboard (Using View)
-- Use this in Stat panels
SELECT * FROM service_availability
ORDER BY failure_rate_percent DESC;

-- 15. Recent Service Failures (Using View)
-- Use this in a Table panel
SELECT * FROM recent_service_failures
LIMIT 50;