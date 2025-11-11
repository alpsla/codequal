-- ============================================================================
-- CACHE OPTIMIZATION SECTION
-- Addresses Grafana alert: Low Cache Memory (Cache Hit Ratio)
-- ============================================================================

-- Check current cache hit ratio (should be > 95%)
DO $$
DECLARE
  cache_hit_ratio NUMERIC;
BEGIN
  SELECT
    sum(heap_blks_hit)::numeric /
    NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0) * 100
  INTO cache_hit_ratio
  FROM pg_statio_user_tables;

  RAISE NOTICE 'Current cache hit ratio: %% (target: >95%%)', ROUND(cache_hit_ratio, 2);

  IF cache_hit_ratio < 95 THEN
    RAISE WARNING 'Cache hit ratio is below optimal level. Running optimization...';
  END IF;
END $$;

-- ============================================================================
-- VACUUM and ANALYZE all tables to improve cache efficiency
-- ============================================================================

-- This removes dead tuples and updates statistics, improving cache usage
VACUUM ANALYZE model_configurations;
VACUUM ANALYZE pr_analysis_history;
VACUUM ANALYZE developer_metrics;
VACUUM ANALYZE skill_scores;
VACUUM ANALYZE analysis_history;
VACUUM ANALYZE deepwiki_cleanups;
VACUUM ANALYZE repositories;
VACUUM ANALYZE pr_reviews;
VACUUM ANALYZE analysis_chunks;
VACUUM ANALYZE user_skills;
VACUUM ANALYZE repository_scores;
VACUUM ANALYZE issue_tracking;

-- ============================================================================
-- Identify and fix table bloat (major cause of poor cache performance)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_table_bloat_info()
RETURNS TABLE (
  tablename TEXT,
  size_mb NUMERIC,
  bloat_mb NUMERIC,
  bloat_ratio NUMERIC,
  recommendation TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.tablename::TEXT,
    ROUND(pg_total_relation_size(t.schemaname||'.'||t.tablename) / 1024.0 / 1024.0, 2) as size_mb,
    ROUND((pg_total_relation_size(t.schemaname||'.'||t.tablename) * 0.2) / 1024.0 / 1024.0, 2) as estimated_bloat_mb,
    ROUND(20.0, 2) as estimated_bloat_ratio,
    CASE
      WHEN pg_total_relation_size(t.schemaname||'.'||t.tablename) > 100*1024*1024
      THEN 'Consider VACUUM FULL during maintenance window'
      ELSE 'Regular VACUUM sufficient'
    END as recommendation
  FROM pg_tables t
  WHERE t.schemaname = 'public'
  ORDER BY pg_total_relation_size(t.schemaname||'.'||t.tablename) DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- Run bloat check and log results
DO $$
DECLARE
  bloat_record RECORD;
BEGIN
  RAISE NOTICE 'Top 10 tables by size:';
  FOR bloat_record IN SELECT * FROM get_table_bloat_info() LOOP
    RAISE NOTICE 'Table: %, Size: %MB, Est. Bloat: %MB (%%%)',
      bloat_record.tablename,
      bloat_record.size_mb,
      bloat_record.bloat_mb,
      bloat_record.bloat_ratio;
  END LOOP;
END $$;

-- ============================================================================
-- Create cache monitoring view
-- ============================================================================

CREATE OR REPLACE VIEW cache_performance AS
SELECT
  -- Overall cache hit ratio
  ROUND(
    sum(heap_blks_hit)::numeric /
    NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0) * 100,
    2
  ) as overall_cache_hit_ratio_percent,

  -- Index cache hit ratio
  ROUND(
    sum(idx_blks_hit)::numeric /
    NULLIF(sum(idx_blks_hit) + sum(idx_blks_read), 0) * 100,
    2
  ) as index_cache_hit_ratio_percent,

  -- Total blocks read from disk (lower is better)
  sum(heap_blks_read) as total_heap_blocks_read_from_disk,
  sum(idx_blks_read) as total_index_blocks_read_from_disk,

  -- Total blocks served from cache (higher is better)
  sum(heap_blks_hit) as total_heap_blocks_from_cache,
  sum(idx_blks_hit) as total_index_blocks_from_cache
FROM pg_statio_user_tables;

-- Grant access to cache performance view
GRANT SELECT ON cache_performance TO authenticated;
GRANT SELECT ON cache_performance TO service_role;

-- ============================================================================
-- Create per-table cache statistics view
-- ============================================================================

CREATE OR REPLACE VIEW table_cache_stats AS
SELECT
  schemaname,
  relname as tablename,

  -- Table cache hit ratio
  ROUND(
    CASE
      WHEN (heap_blks_hit + heap_blks_read) > 0
      THEN (heap_blks_hit::numeric / (heap_blks_hit + heap_blks_read)) * 100
      ELSE 0
    END,
    2
  ) as table_cache_hit_ratio,

  -- Index cache hit ratio
  ROUND(
    CASE
      WHEN (idx_blks_hit + idx_blks_read) > 0
      THEN (idx_blks_hit::numeric / (idx_blks_hit + idx_blks_read)) * 100
      ELSE 0
    END,
    2
  ) as index_cache_hit_ratio,

  heap_blks_read as disk_reads,
  heap_blks_hit as cache_hits,
  idx_blks_read as index_disk_reads,
  idx_blks_hit as index_cache_hits,

  -- Size information
  ROUND(pg_total_relation_size(schemaname||'.'||relname) / 1024.0 / 1024.0, 2) as total_size_mb
FROM pg_statio_user_tables
WHERE schemaname = 'public'
ORDER BY (heap_blks_hit + heap_blks_read + idx_blks_hit + idx_blks_read) DESC;

GRANT SELECT ON table_cache_stats TO authenticated;
GRANT SELECT ON table_cache_stats TO service_role;

-- ============================================================================
-- Create function to recommend cache improvements
-- ============================================================================

CREATE OR REPLACE FUNCTION get_cache_recommendations()
RETURNS TABLE (
  issue TEXT,
  severity TEXT,
  recommendation TEXT,
  query TEXT
) AS $$
BEGIN
  -- Check overall cache hit ratio
  RETURN QUERY
  SELECT
    'Low overall cache hit ratio'::TEXT,
    CASE
      WHEN overall_cache_hit_ratio_percent < 85 THEN 'CRITICAL'
      WHEN overall_cache_hit_ratio_percent < 90 THEN 'HIGH'
      WHEN overall_cache_hit_ratio_percent < 95 THEN 'MEDIUM'
      ELSE 'LOW'
    END::TEXT,
    CASE
      WHEN overall_cache_hit_ratio_percent < 85 THEN
        'Immediate action required: Run VACUUM FULL, add missing indexes, increase shared_buffers'
      WHEN overall_cache_hit_ratio_percent < 90 THEN
        'Run VACUUM ANALYZE, verify indexes are being used, consider increasing shared_buffers'
      WHEN overall_cache_hit_ratio_percent < 95 THEN
        'Run ANALYZE, review slow queries, optimize table access patterns'
      ELSE
        'Cache performance is good, continue monitoring'
    END::TEXT,
    'SELECT * FROM cache_performance;'::TEXT
  FROM cache_performance
  WHERE overall_cache_hit_ratio_percent < 95;

  -- Check for tables with poor cache performance
  RETURN QUERY
  SELECT
    'Table with low cache hit ratio: ' || tablename::TEXT,
    CASE
      WHEN table_cache_hit_ratio < 85 THEN 'HIGH'
      WHEN table_cache_hit_ratio < 90 THEN 'MEDIUM'
      ELSE 'LOW'
    END::TEXT,
    'VACUUM ANALYZE ' || tablename || '; Consider adding indexes on frequently queried columns'::TEXT,
    'SELECT * FROM table_cache_stats WHERE tablename = ''' || tablename || ''';'::TEXT
  FROM table_cache_stats
  WHERE table_cache_hit_ratio < 90
  AND (heap_blks_hit + heap_blks_read) > 1000  -- Only report on tables with significant access
  LIMIT 5;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Create automated cache monitoring function
-- ============================================================================

CREATE OR REPLACE FUNCTION monitor_cache_performance()
RETURNS TABLE (
  metric TEXT,
  value NUMERIC,
  status TEXT,
  message TEXT
) AS $$
DECLARE
  overall_ratio NUMERIC;
  index_ratio NUMERIC;
BEGIN
  -- Get current ratios
  SELECT overall_cache_hit_ratio_percent, index_cache_hit_ratio_percent
  INTO overall_ratio, index_ratio
  FROM cache_performance;

  -- Overall cache hit ratio
  RETURN QUERY SELECT
    'Overall Cache Hit Ratio'::TEXT,
    overall_ratio,
    CASE
      WHEN overall_ratio >= 95 THEN 'GOOD'
      WHEN overall_ratio >= 90 THEN 'WARNING'
      ELSE 'CRITICAL'
    END::TEXT,
    CASE
      WHEN overall_ratio >= 95 THEN 'Cache performance is optimal'
      WHEN overall_ratio >= 90 THEN 'Cache performance needs improvement'
      ELSE 'Cache performance is poor - immediate action required'
    END::TEXT;

  -- Index cache hit ratio
  RETURN QUERY SELECT
    'Index Cache Hit Ratio'::TEXT,
    index_ratio,
    CASE
      WHEN index_ratio >= 95 THEN 'GOOD'
      WHEN index_ratio >= 90 THEN 'WARNING'
      ELSE 'CRITICAL'
    END::TEXT,
    CASE
      WHEN index_ratio >= 95 THEN 'Index cache performance is optimal'
      WHEN index_ratio >= 90 THEN 'Index cache performance needs improvement'
      ELSE 'Index cache performance is poor - check index usage'
    END::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Run initial cache performance check and log results
-- ============================================================================

DO $$
DECLARE
  monitor_record RECORD;
  rec_record RECORD;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'CACHE PERFORMANCE MONITORING';
  RAISE NOTICE '========================================';

  -- Show current performance
  FOR monitor_record IN SELECT * FROM monitor_cache_performance() LOOP
    RAISE NOTICE '% [%]: % (%%)',
      monitor_record.status,
      monitor_record.metric,
      monitor_record.value,
      monitor_record.message;
  END LOOP;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'CACHE RECOMMENDATIONS';
  RAISE NOTICE '========================================';

  -- Show recommendations
  FOR rec_record IN SELECT * FROM get_cache_recommendations() LOOP
    RAISE NOTICE '[%] %', rec_record.severity, rec_record.issue;
    RAISE NOTICE '  Recommendation: %', rec_record.recommendation;
    RAISE NOTICE '  Check with: %', rec_record.query;
  END LOOP;
END $$;

-- ============================================================================
-- Create maintenance function to improve cache performance
-- ============================================================================

CREATE OR REPLACE FUNCTION optimize_cache_performance()
RETURNS TEXT AS $$
DECLARE
  result TEXT := '';
BEGIN
  -- Run VACUUM ANALYZE on all major tables
  RAISE NOTICE 'Running VACUUM ANALYZE on all tables...';

  VACUUM ANALYZE model_configurations;
  VACUUM ANALYZE pr_analysis_history;
  VACUUM ANALYZE developer_metrics;
  VACUUM ANALYZE skill_scores;
  VACUUM ANALYZE analysis_history;
  VACUUM ANALYZE repositories;
  VACUUM ANALYZE pr_reviews;
  VACUUM ANALYZE analysis_chunks;

  result := 'Cache optimization completed. Run monitor_cache_performance() to check results.';
  RAISE NOTICE '%', result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Add to maintenance scheduler
-- ============================================================================

-- Note: Run this daily to maintain good cache performance
COMMENT ON FUNCTION optimize_cache_performance IS
  'Run daily via cron: SELECT optimize_cache_performance();';

COMMENT ON FUNCTION monitor_cache_performance IS
  'Check cache metrics: SELECT * FROM monitor_cache_performance();';

COMMENT ON VIEW cache_performance IS
  'Overall cache hit ratios: SELECT * FROM cache_performance;';

COMMENT ON VIEW table_cache_stats IS
  'Per-table cache statistics: SELECT * FROM table_cache_stats ORDER BY disk_reads DESC;';

-- ============================================================================
-- Final cache performance report
-- ============================================================================

DO $$
DECLARE
  final_ratio NUMERIC;
BEGIN
  SELECT overall_cache_hit_ratio_percent INTO final_ratio
  FROM cache_performance;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'CACHE OPTIMIZATION COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Final cache hit ratio: %%', ROUND(final_ratio, 2);

  IF final_ratio >= 95 THEN
    RAISE NOTICE 'Status: ✅ EXCELLENT - Cache performance is optimal';
  ELSIF final_ratio >= 90 THEN
    RAISE NOTICE 'Status: ⚠️  GOOD - Continue monitoring';
  ELSIF final_ratio >= 85 THEN
    RAISE NOTICE 'Status: ⚠️  WARNING - May need Supabase config adjustment';
  ELSE
    RAISE NOTICE 'Status: ❌ CRITICAL - Contact Supabase support to increase shared_buffers';
  END IF;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Monitoring queries:';
  RAISE NOTICE '  SELECT * FROM cache_performance;';
  RAISE NOTICE '  SELECT * FROM table_cache_stats;';
  RAISE NOTICE '  SELECT * FROM get_cache_recommendations();';
  RAISE NOTICE '  SELECT * FROM monitor_cache_performance();';
  RAISE NOTICE '========================================';
END $$;
