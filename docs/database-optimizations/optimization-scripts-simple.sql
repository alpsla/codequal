-- Supabase Query Optimization Scripts - Simplified Version
-- Run these scripts in order to optimize database performance

-- =============================================================================
-- STEP 1: Create Timezone Cache Table
-- =============================================================================

-- Drop existing objects if they exist (for clean installation)
DROP TABLE IF EXISTS public.cached_timezones CASCADE;
DROP FUNCTION IF EXISTS public.get_timezone_names() CASCADE;

-- Create the cached timezone table
CREATE TABLE public.cached_timezones (
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

-- Create index for faster lookups
CREATE INDEX idx_cached_timezones_name ON public.cached_timezones(name);

-- Grant permissions
GRANT SELECT ON public.cached_timezones TO authenticated;

-- Enable RLS
ALTER TABLE public.cached_timezones ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Timezones are viewable by authenticated users" 
ON public.cached_timezones FOR SELECT 
TO authenticated 
USING (true);

-- =============================================================================
-- STEP 2: Create Query Performance Monitoring Table (Simplified)
-- =============================================================================

-- Drop if exists
DROP TABLE IF EXISTS public.query_performance_log CASCADE;

-- Create performance monitoring table
CREATE TABLE public.query_performance_log (
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
CREATE INDEX idx_query_performance_hash ON public.query_performance_log(query_hash);
CREATE INDEX idx_query_performance_avg_time ON public.query_performance_log(avg_time_ms DESC);
CREATE INDEX idx_query_performance_last_executed ON public.query_performance_log(last_executed DESC);

-- Grant permissions
GRANT SELECT ON public.query_performance_log TO authenticated;
GRANT INSERT, UPDATE ON public.query_performance_log TO authenticated;

-- Enable RLS
ALTER TABLE public.query_performance_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Performance logs viewable by authenticated users" 
ON public.query_performance_log FOR SELECT
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can insert performance logs"
ON public.query_performance_log FOR INSERT
TO authenticated
WITH CHECK (true);

-- =============================================================================
-- STEP 3: Optimize Repository and Analysis Queries with Indexes
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
-- STEP 4: Create Optimized View for Active Repositories
-- =============================================================================

-- Drop if exists
DROP VIEW IF EXISTS public.v_active_repositories;

-- Create a view for active repositories with recent analysis
CREATE VIEW public.v_active_repositories AS
SELECT 
  r.id,
  r.owner,
  r.name,
  r.platform,
  r.primary_language,
  r.last_analyzed_at,
  r.analysis_count,
  r.size
FROM public.repositories r
WHERE r.last_analyzed_at > now() - interval '30 days'
  OR r.last_analyzed_at IS NULL;

-- Grant permissions
GRANT SELECT ON public.v_active_repositories TO authenticated;

-- =============================================================================
-- STEP 5: Optimize Table Storage
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
-- STEP 6: Create Simple Timezone Function (Separate Execution)
-- =============================================================================

-- Run this separately if needed:
/*
CREATE OR REPLACE FUNCTION public.get_timezone_names()
RETURNS TABLE(name text, abbrev text, utc_offset interval, is_dst boolean)
LANGUAGE sql
SECURITY DEFINER
AS $function$
  SELECT name, abbrev, utc_offset, is_dst 
  FROM public.cached_timezones 
  ORDER BY name;
$function$;

GRANT EXECUTE ON FUNCTION public.get_timezone_names() TO authenticated;
*/

-- =============================================================================
-- STEP 7: Create Simple Performance Log Function (Separate Execution)
-- =============================================================================

-- Run this separately if needed:
/*
CREATE OR REPLACE FUNCTION public.log_slow_query(
  p_query_text text,
  p_execution_time_ms float
) RETURNS void
LANGUAGE sql
AS $function$
  INSERT INTO public.query_performance_log (
    query_hash,
    query_pattern,
    execution_time_ms,
    total_time_ms
  ) VALUES (
    md5(p_query_text),
    p_query_text,
    p_execution_time_ms,
    p_execution_time_ms
  )
  ON CONFLICT (query_hash) DO UPDATE SET
    calls_count = query_performance_log.calls_count + 1,
    total_time_ms = query_performance_log.total_time_ms + EXCLUDED.execution_time_ms,
    last_executed = now();
$function$;

GRANT EXECUTE ON FUNCTION public.log_slow_query(text, float) TO authenticated;
*/

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Check if optimizations are working
SELECT 
  'Timezone Cache' as optimization,
  COUNT(*) as records,
  MAX(cached_at) as last_updated
FROM public.cached_timezones;

-- Check existing indexes
SELECT 
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('repositories', 'pr_reviews', 'analysis_chunks', 'cached_timezones', 'query_performance_log')
ORDER BY tablename, indexname;

-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('repositories', 'pr_reviews', 'analysis_chunks', 'users')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
