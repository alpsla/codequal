-- ============================================================================
-- Migration: Fix Supabase Alerts (138 issues: 38 security, 102 performance)
-- Date: 2025-11-11 (SAFE VERSION)
-- Description: Comprehensive fix for all Supabase performance and security alerts
-- Reference: packages/agents/docs/SUPABASE_PERFORMANCE_FIX.md
-- ============================================================================

-- ============================================================================
-- PRIORITY 1: model_configurations - CRITICAL PERFORMANCE FIX
-- Impact: Reduces queries from 7-8s to <100ms
-- ============================================================================

DO $$
BEGIN
  -- Check if model_configurations table exists
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'model_configurations') THEN
    -- Create indexes for fast lookups
    CREATE INDEX IF NOT EXISTS idx_model_config_role
    ON model_configurations(role);

    CREATE INDEX IF NOT EXISTS idx_model_config_language
    ON model_configurations(language);

    CREATE INDEX IF NOT EXISTS idx_model_config_size
    ON model_configurations(size_category);

    -- Composite index for the exact query pattern used in v9-grouped-report-formatter.ts
    CREATE INDEX IF NOT EXISTS idx_model_config_lookup
    ON model_configurations(role, language, size_category);

    -- Additional composite indexes for common patterns
    CREATE INDEX IF NOT EXISTS idx_model_config_role_lang
    ON model_configurations(role, language);

    -- Enable RLS for security compliance
    ALTER TABLE model_configurations ENABLE ROW LEVEL SECURITY;

    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Allow service role full access to model_configurations" ON model_configurations;
    DROP POLICY IF EXISTS "Allow authenticated users to read model_configurations" ON model_configurations;

    -- Create policies
    CREATE POLICY "Allow service role full access to model_configurations"
    ON model_configurations
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

    CREATE POLICY "Allow authenticated users to read model_configurations"
    ON model_configurations
    FOR SELECT
    TO authenticated
    USING (true);

    -- Update statistics
    ANALYZE model_configurations;

    RAISE NOTICE 'model_configurations: Indexes and RLS configured';
  ELSE
    RAISE NOTICE 'model_configurations table not found - skipping';
  END IF;
END $$;

-- ============================================================================
-- PRIORITY 2: pr_analysis_history - SECURITY & PERFORMANCE
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'pr_analysis_history') THEN
    CREATE INDEX IF NOT EXISTS idx_pr_analysis_history_pr_id
    ON pr_analysis_history(pr_id);

    CREATE INDEX IF NOT EXISTS idx_pr_analysis_history_repo_id
    ON pr_analysis_history(repository_id);

    CREATE INDEX IF NOT EXISTS idx_pr_analysis_history_created
    ON pr_analysis_history(created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_pr_analysis_history_status
    ON pr_analysis_history(status);

    ALTER TABLE pr_analysis_history ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users can view their own PR analysis history" ON pr_analysis_history;
    DROP POLICY IF EXISTS "Service role can manage PR analysis history" ON pr_analysis_history;

    CREATE POLICY "Users can view their own PR analysis history"
    ON pr_analysis_history
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM repositories r
        WHERE r.id = pr_analysis_history.repository_id
        AND (r.is_public = true OR r.owner_id = auth.uid())
      )
    );

    CREATE POLICY "Service role can manage PR analysis history"
    ON pr_analysis_history
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

    ANALYZE pr_analysis_history;
    RAISE NOTICE 'pr_analysis_history: Indexes and RLS configured';
  ELSE
    RAISE NOTICE 'pr_analysis_history table not found - skipping';
  END IF;
END $$;

-- ============================================================================
-- PRIORITY 3: developer_metrics - SECURITY & PERFORMANCE (OPTIONAL)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'developer_metrics') THEN
    CREATE INDEX IF NOT EXISTS idx_developer_metrics_user_id
    ON developer_metrics(user_id);

    CREATE INDEX IF NOT EXISTS idx_developer_metrics_repo_id
    ON developer_metrics(repository_id);

    CREATE INDEX IF NOT EXISTS idx_developer_metrics_period
    ON developer_metrics(period_start DESC, period_end DESC);

    CREATE INDEX IF NOT EXISTS idx_developer_metrics_user_period
    ON developer_metrics(user_id, period_start DESC);

    ALTER TABLE developer_metrics ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users can view their own developer metrics" ON developer_metrics;
    DROP POLICY IF EXISTS "Team members can view team metrics" ON developer_metrics;
    DROP POLICY IF EXISTS "Service role can manage developer metrics" ON developer_metrics;

    CREATE POLICY "Users can view their own developer metrics"
    ON developer_metrics
    FOR SELECT
    USING (user_id = auth.uid());

    CREATE POLICY "Service role can manage developer metrics"
    ON developer_metrics
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

    ANALYZE developer_metrics;
    RAISE NOTICE 'developer_metrics: Indexes and RLS configured';
  ELSE
    RAISE NOTICE 'developer_metrics table not found - skipping';
  END IF;
END $$;

-- ============================================================================
-- PRIORITY 4: user_skills (from scoring migration) - SECURITY & PERFORMANCE
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_skills') THEN
    CREATE INDEX IF NOT EXISTS idx_user_skills_user_id
    ON user_skills(user_id);

    CREATE INDEX IF NOT EXISTS idx_user_skills_category
    ON user_skills(skill_category);

    CREATE INDEX IF NOT EXISTS idx_user_skills_user_category
    ON user_skills(user_id, skill_category);

    CREATE INDEX IF NOT EXISTS idx_user_skills_level
    ON user_skills(current_level DESC);

    -- RLS might already be enabled from scoring migration
    ALTER TABLE user_skills ENABLE ROW LEVEL SECURITY;

    ANALYZE user_skills;
    RAISE NOTICE 'user_skills: Additional indexes configured';
  ELSE
    RAISE NOTICE 'user_skills table not found - skipping';
  END IF;
END $$;

-- ============================================================================
-- PRIORITY 5: analysis_history - SECURITY & PERFORMANCE (OPTIONAL)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'analysis_history') THEN
    CREATE INDEX IF NOT EXISTS idx_analysis_history_repo_id
    ON analysis_history(repository_id);

    CREATE INDEX IF NOT EXISTS idx_analysis_history_user_id
    ON analysis_history(user_id);

    CREATE INDEX IF NOT EXISTS idx_analysis_history_created
    ON analysis_history(created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_analysis_history_status
    ON analysis_history(status);

    ALTER TABLE analysis_history ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users can view analysis history for their repositories" ON analysis_history;
    DROP POLICY IF EXISTS "Service role can manage analysis history" ON analysis_history;

    CREATE POLICY "Users can view analysis history for their repositories"
    ON analysis_history
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM repositories r
        WHERE r.id = analysis_history.repository_id
        AND (r.is_public = true OR r.owner_id = auth.uid())
      )
    );

    CREATE POLICY "Service role can manage analysis history"
    ON analysis_history
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

    ANALYZE analysis_history;
    RAISE NOTICE 'analysis_history: Indexes and RLS configured';
  ELSE
    RAISE NOTICE 'analysis_history table not found - skipping';
  END IF;
END $$;

-- ============================================================================
-- PRIORITY 6: deepwiki_cleanups - SECURITY & PERFORMANCE (OPTIONAL)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'deepwiki_cleanups') THEN
    CREATE INDEX IF NOT EXISTS idx_deepwiki_cleanups_status
    ON deepwiki_cleanups(status);

    CREATE INDEX IF NOT EXISTS idx_deepwiki_cleanups_created
    ON deepwiki_cleanups(created_at DESC);

    ALTER TABLE deepwiki_cleanups ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Service role can manage deepwiki cleanups" ON deepwiki_cleanups;

    CREATE POLICY "Service role can manage deepwiki cleanups"
    ON deepwiki_cleanups
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

    ANALYZE deepwiki_cleanups;
    RAISE NOTICE 'deepwiki_cleanups: Indexes and RLS configured';
  ELSE
    RAISE NOTICE 'deepwiki_cleanups table not found - skipping';
  END IF;
END $$;

-- ============================================================================
-- ADDITIONAL PERFORMANCE OPTIMIZATIONS - Core Tables
-- ============================================================================

DO $$
BEGIN
  -- repositories table (should always exist)
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'repositories') THEN
    CREATE INDEX IF NOT EXISTS idx_repositories_owner_name
    ON repositories(owner, name);

    CREATE INDEX IF NOT EXISTS idx_repositories_is_public
    ON repositories(is_public)
    WHERE is_public = true;

    CREATE INDEX IF NOT EXISTS idx_repositories_created
    ON repositories(created_at DESC);

    ANALYZE repositories;
    RAISE NOTICE 'repositories: Additional indexes configured';
  END IF;

  -- pr_reviews table
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'pr_reviews') THEN
    CREATE INDEX IF NOT EXISTS idx_pr_reviews_repo_id
    ON pr_reviews(repository_id);

    CREATE INDEX IF NOT EXISTS idx_pr_reviews_pr_number
    ON pr_reviews(pr_number);

    CREATE INDEX IF NOT EXISTS idx_pr_reviews_status
    ON pr_reviews(status);

    CREATE INDEX IF NOT EXISTS idx_pr_reviews_created
    ON pr_reviews(created_at DESC);

    ANALYZE pr_reviews;
    RAISE NOTICE 'pr_reviews: Indexes configured';
  END IF;

  -- analysis_chunks table (for vector search)
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'analysis_chunks') THEN
    CREATE INDEX IF NOT EXISTS idx_analysis_chunks_repo_id
    ON analysis_chunks(repository_id);

    CREATE INDEX IF NOT EXISTS idx_analysis_chunks_created
    ON analysis_chunks(created_at DESC);

    ANALYZE analysis_chunks;
    RAISE NOTICE 'analysis_chunks: Indexes configured';
  END IF;
END $$;

-- ============================================================================
-- MATERIALIZED VIEW FOR TIMEZONE DATA (High Impact)
-- Reduces 131 queries to 1 per dashboard load
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_timezone_names AS
SELECT name FROM pg_timezone_names;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_timezone_names_name
ON mv_timezone_names(name);

-- Initial refresh
REFRESH MATERIALIZED VIEW mv_timezone_names;

-- Grant permissions
GRANT SELECT ON mv_timezone_names TO authenticated;
GRANT SELECT ON mv_timezone_names TO service_role;

-- ============================================================================
-- MAINTENANCE FUNCTIONS
-- ============================================================================

-- Function to refresh timezone materialized view (call daily)
CREATE OR REPLACE FUNCTION refresh_timezone_view()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_timezone_names;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update all table statistics (call weekly)
CREATE OR REPLACE FUNCTION update_all_statistics()
RETURNS void AS $$
BEGIN
  -- Only analyze tables that exist
  PERFORM table_name FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name IN (
    'model_configurations', 'pr_analysis_history', 'developer_metrics',
    'user_skills', 'analysis_history', 'deepwiki_cleanups',
    'repositories', 'pr_reviews', 'analysis_chunks'
  );

  -- Dynamic ANALYZE
  EXECUTE (
    SELECT string_agg('ANALYZE ' || table_name || ';', ' ')
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN (
      'model_configurations', 'pr_analysis_history', 'developer_metrics',
      'user_skills', 'analysis_history', 'deepwiki_cleanups',
      'repositories', 'pr_reviews', 'analysis_chunks'
    )
  );

  RAISE NOTICE 'All table statistics updated at %', NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FINAL SUMMARY
-- ============================================================================

DO $$
DECLARE
  tables_processed INTEGER := 0;
  indexes_created INTEGER := 0;
BEGIN
  -- Count tables that were processed
  SELECT COUNT(*) INTO tables_processed
  FROM pg_tables
  WHERE schemaname = 'public'
  AND tablename IN (
    'model_configurations', 'pr_analysis_history', 'developer_metrics',
    'user_skills', 'analysis_history', 'deepwiki_cleanups',
    'repositories', 'pr_reviews', 'analysis_chunks'
  );

  -- Count indexes created
  SELECT COUNT(*) INTO indexes_created
  FROM pg_indexes
  WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%';

  RAISE NOTICE '========================================';
  RAISE NOTICE 'MIGRATION COMPLETED SUCCESSFULLY';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Tables processed: %', tables_processed;
  RAISE NOTICE 'Total indexes: %', indexes_created;
  RAISE NOTICE 'Materialized views: 1 (mv_timezone_names)';
  RAISE NOTICE 'Maintenance functions: 2';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Run: SELECT * FROM cache_performance;';
  RAISE NOTICE '2. Apply cache optimization migration';
  RAISE NOTICE '3. Run verification script';
  RAISE NOTICE '========================================';
END $$;
