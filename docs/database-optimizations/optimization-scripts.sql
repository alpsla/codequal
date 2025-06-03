{
  `path`: `/Users/alpinro/Code Prjects/codequal/docs/database-optimizations/optimization-scripts-supabase.sql`,
  `content`: `-- Supabase Query Optimization Scripts - Fixed for Supabase Editor
-- Run these scripts in order to optimize database performance

-- =============================================================================
-- STEP 1: Create Timezone Cache Table
-- =============================================================================

-- Create the cached timezone table
CREATE TABLE IF NOT EXISTS public.cached_timezones (
  name text PRIMARY KEY,
  abbrev text,
  utc_offset interval,
  is_dst boolean,
  cached_at timestamp with time zone DEFAULT now()
);

-- Populate the cache initially
INSERT INTO public.cached_timezones (name, abbrev, utc_offset, is_dst)
SELECT name, abbrev, utc_offset, is_dst 
FROM pg_timezone_names
ON CONFLICT (name) DO UPDATE SET
  abbrev = EXCLUDED.abbrev,
  utc_offset = EXCLUDED.utc_offset,
  is_dst = EXCLUDED.is_dst,
  cached_at = now();

-- Create a function to get timezone with automatic cache refresh
CREATE OR REPLACE FUNCTION public.get_timezone_names()
RETURNS TABLE(name text, abbrev text, utc_offset interval, is_dst boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS '
BEGIN
  -- Check if cache is fresh (less than 24 hours old)
  IF EXISTS (
    SELECT 1 FROM cached_timezones 
    WHERE cached_at > now() - interval ''24 hours''
    LIMIT 1
  ) THEN
    RETURN QUERY SELECT c.name, c.abbrev, c.utc_offset, c.is_dst 
    FROM cached_timezones c
    ORDER BY c.name;
  ELSE
    -- Refresh cache if stale
    DELETE FROM cached_timezones;
    INSERT INTO cached_timezones (name, abbrev, utc_offset, is_dst)
    SELECT tz.name, tz.abbrev, tz.utc_offset, tz.is_dst 
    FROM pg_timezone_names tz;
    
    RETURN QUERY SELECT c.name, c.abbrev, c.utc_offset, c.is_dst 
    FROM cached_timezones c
    ORDER BY c.name;
  END IF;
END;
';

-- Grant appropriate permissions
GRANT SELECT ON public.cached_timezones TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_timezone_names() TO authenticated;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_cached_timezones_name ON public.cached_timezones(name);

-- =============================================================================
-- STEP 2: Create Query Performance Monitoring
-- =============================================================================

-- Create performance monitoring table
CREATE TABLE IF NOT EXISTS public.query_performance_log (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  query_hash text NOT NULL,
  query_pattern text,
  execution_time_ms float,
  calls_count int DEFAULT 1,
  total_time_ms float,
  avg_time_ms float GENERATED ALWAYS AS (total_time_ms / NULLIF(calls_count, 0)) STORED,
  last_executed timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- Create indexes for performance log
CREATE INDEX IF NOT EXISTS idx_query_performance_hash ON public.query_performance_log(query_hash);
CREATE INDEX IF NOT EXISTS idx_query_performance_avg_time ON public.query_performance_log(avg_time_ms DESC);
CREATE INDEX IF NOT EXISTS idx_query_performance_last_executed ON public.query_performance_log(last_executed DESC);

-- Function to log slow queries
CREATE OR REPLACE FUNCTION public.log_slow_query(
  p_query_text text,
  p_execution_time_ms float
) RETURNS void
LANGUAGE plpgsql
AS '
DECLARE
  v_query_hash text;
  v_query_pattern text;
BEGIN
  -- Only log queries slower than 100ms
  IF p_execution_time_ms < 100 THEN
    RETURN;
  END IF;
  
  -- Create hash of the query
  v_query_hash := md5(p_query_text);
  
  -- Extract query pattern (remove specific values)
  v_query_pattern := regexp_replace(
    regexp_replace(
      regexp_replace(p_query_text, ''\\$\\d+'', ''$?'', ''g''),  -- Replace parameters
      ''''[^'''']*'''', ''''?'''', ''g''  -- Replace string literals
    ),
    ''\\d+'', ''?'', ''g''  -- Replace numbers
  );
  
  INSERT INTO public.query_performance_log (
    query_hash,
    query_pattern,
    execution_time_ms,
    total_time_ms
  ) VALUES (
    v_query_hash,
    v_query_pattern,
    p_execution_time_ms,
    p_execution_time_ms
  )
  ON CONFLICT (query_hash) DO UPDATE SET
    calls_count = query_performance_log.calls_count + 1,
    total_time_ms = query_performance_log.total_time_ms + p_execution_time_ms,
    last_executed = now();
END;
';

-- Grant permissions
GRANT INSERT, UPDATE ON public.query_performance_log TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_slow_query(text, float) TO authenticated;

-- =============================================================================
-- STEP 3: Optimize Repository and Analysis Queries
-- =============================================================================

-- Add missing indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_repositories_platform_analyzed 
ON public.repositories(platform, last_analyzed_at DESC) 
WHERE platform IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_repositories_language 
ON public.repositories(primary_language) 
WHERE primary_language IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_analysis_chunks_repository_quality 
ON public.analysis_chunks(repository_id, quality_score DESC) 
WHERE quality_score IS NOT NULL;

-- Create composite index for PR reviews lookup
CREATE INDEX IF NOT EXISTS idx_pr_reviews_composite 
ON public.pr_reviews(repository_id, state, created_at DESC);

-- =============================================================================
-- STEP 4: Create Optimized Views for Common Queries
-- =============================================================================

-- Create a view for active repositories with recent analysis
CREATE OR REPLACE VIEW public.v_active_repositories AS
SELECT 
  r.id,
  r.owner,
  r.name,
  r.platform,
  r.primary_language,
  r.last_analyzed_at,
  r.analysis_count,
  r.size,
  COUNT(DISTINCT pr.id) AS open_prs,
  COUNT(DISTINCT ac.id) AS analysis_chunks_count
FROM public.repositories r
LEFT JOIN public.pr_reviews pr ON r.id = pr.repository_id AND pr.state = 'open'
LEFT JOIN public.analysis_chunks ac ON r.id = ac.repository_id
WHERE r.last_analyzed_at > now() - interval '30 days'
GROUP BY r.id;

-- Grant permissions
GRANT SELECT ON public.v_active_repositories TO authenticated;

-- =============================================================================
-- STEP 5: Clean Up and Maintenance Functions
-- =============================================================================

-- Function to clean up old performance logs
CREATE OR REPLACE FUNCTION public.cleanup_old_performance_logs()
RETURNS void
LANGUAGE plpgsql
AS '
BEGIN
  -- Delete logs older than 30 days with low impact
  DELETE FROM public.query_performance_log
  WHERE created_at < now() - interval ''30 days''
    AND avg_time_ms < 500
    AND calls_count < 10;
    
  -- Archive very slow queries for analysis
  INSERT INTO public.query_performance_log (
    query_hash,
    query_pattern,
    execution_time_ms,
    calls_count,
    total_time_ms,
    created_at
  )
  SELECT 
    ''ARCHIVE_'' || query_hash,
    ''ARCHIVED: '' || query_pattern,
    avg_time_ms,
    calls_count,
    total_time_ms,
    now()
  FROM public.query_performance_log
  WHERE created_at < now() - interval ''90 days''
    AND avg_time_ms > 1000
  ON CONFLICT (query_hash) DO NOTHING;
  
  -- Delete the original old slow queries
  DELETE FROM public.query_performance_log
  WHERE created_at < now() - interval ''90 days''
    AND query_hash NOT LIKE ''ARCHIVE_%'';
END;
';

-- =============================================================================
-- STEP 6: RLS Policies Update
-- =============================================================================

-- Enable RLS for new tables
ALTER TABLE public.cached_timezones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.query_performance_log ENABLE ROW LEVEL SECURITY;

-- Policy for cached_timezones (read-only for all authenticated users)
CREATE POLICY \"Timezones are viewable by authenticated users\" 
ON public.cached_timezones FOR SELECT 
TO authenticated 
USING (true);

-- Policy for query_performance_log (viewable by all authenticated users, but only system can insert)
CREATE POLICY \"Performance logs viewable by authenticated users\" 
ON public.query_performance_log FOR SELECT
TO authenticated 
USING (true);

-- Policy for system to insert/update performance logs
CREATE POLICY \"System can manage performance logs\"
ON public.query_performance_log FOR ALL
TO postgres
USING (true)
WITH CHECK (true);

-- =============================================================================
-- STEP 7: Quick Wins - Immediate Optimizations
-- =============================================================================

-- Analyze tables to update statistics
ANALYZE public.repositories;
ANALYZE public.pr_reviews;
ANALYZE public.analysis_chunks;
ANALYZE public.analysis_queue;
ANALYZE public.users;

-- Set appropriate table parameters for frequently accessed tables
ALTER TABLE public.repositories SET (fillfactor = 90);
ALTER TABLE public.pr_reviews SET (fillfactor = 85);
ALTER TABLE public.cached_timezones SET (fillfactor = 100);

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Check if optimizations are working
SELECT 
  'Timezone Cache' as optimization,
  COUNT(*) as records,
  MAX(cached_at) as last_updated
FROM public.cached_timezones;

-- Check slow queries (this will be empty initially)
SELECT 
  query_pattern,
  calls_count,
  avg_time_ms,
  total_time_ms,
  last_executed
FROM public.query_performance_log
ORDER BY avg_time_ms DESC
LIMIT 10;

-- Check index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
`
}