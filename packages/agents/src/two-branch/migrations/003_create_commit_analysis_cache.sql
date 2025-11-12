-- Migration: Create commit_analysis_cache table
-- Purpose: Cache analysis results by commit SHA to avoid re-analyzing unchanged code
-- Created: 2025-11-12

-- Create commit_analysis_cache table
CREATE TABLE IF NOT EXISTS commit_analysis_cache (
  -- Primary key
  cache_key TEXT PRIMARY KEY,  -- Format: "{analysis_type}:{commit_sha}"

  -- Identifiers
  commit_sha TEXT NOT NULL,
  analysis_type TEXT NOT NULL CHECK (analysis_type IN ('pr_analysis', 'skill_scoring', 'app_scoring')),
  repository_url TEXT NOT NULL,
  pr_number INTEGER,

  -- Analysis result (JSONB for flexibility)
  result JSONB NOT NULL,

  -- Metadata
  analyzed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cache_version TEXT NOT NULL DEFAULT 'v9.0',

  -- Stats (for monitoring)
  duration TEXT,
  cost NUMERIC(10, 4),
  issue_count INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_commit_analysis_cache_commit_sha
  ON commit_analysis_cache(commit_sha);

CREATE INDEX IF NOT EXISTS idx_commit_analysis_cache_analysis_type
  ON commit_analysis_cache(analysis_type);

CREATE INDEX IF NOT EXISTS idx_commit_analysis_cache_analyzed_at
  ON commit_analysis_cache(analyzed_at);

CREATE INDEX IF NOT EXISTS idx_commit_analysis_cache_cache_version
  ON commit_analysis_cache(cache_version);

-- Create index for repository URL (for finding all analyses of a repo)
CREATE INDEX IF NOT EXISTS idx_commit_analysis_cache_repo_url
  ON commit_analysis_cache(repository_url);

-- Create composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_commit_analysis_cache_lookup
  ON commit_analysis_cache(commit_sha, analysis_type, cache_version);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_commit_analysis_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_commit_analysis_cache_updated_at
  BEFORE UPDATE ON commit_analysis_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_commit_analysis_cache_updated_at();

-- Comments for documentation
COMMENT ON TABLE commit_analysis_cache IS 'Caches analysis results by commit SHA to avoid re-analyzing unchanged code';
COMMENT ON COLUMN commit_analysis_cache.cache_key IS 'Unique cache key: {analysis_type}:{commit_sha}';
COMMENT ON COLUMN commit_analysis_cache.commit_sha IS 'Git commit SHA (40-character hex string)';
COMMENT ON COLUMN commit_analysis_cache.analysis_type IS 'Type of analysis: pr_analysis, skill_scoring, or app_scoring';
COMMENT ON COLUMN commit_analysis_cache.repository_url IS 'GitHub repository URL';
COMMENT ON COLUMN commit_analysis_cache.pr_number IS 'Pull request number (for pr_analysis type)';
COMMENT ON COLUMN commit_analysis_cache.result IS 'Full analysis result as JSON (can be report, score, or any structured data)';
COMMENT ON COLUMN commit_analysis_cache.analyzed_at IS 'When the analysis was performed';
COMMENT ON COLUMN commit_analysis_cache.cache_version IS 'Cache version for invalidation (e.g., v9.0, v9.1)';
COMMENT ON COLUMN commit_analysis_cache.duration IS 'Analysis duration (e.g., "2m 35s")';
COMMENT ON COLUMN commit_analysis_cache.cost IS 'Analysis cost in USD';
COMMENT ON COLUMN commit_analysis_cache.issue_count IS 'Total number of issues found';

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON commit_analysis_cache TO authenticated;
GRANT SELECT ON commit_analysis_cache TO anon;

-- Enable Row Level Security (RLS)
ALTER TABLE commit_analysis_cache ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow public read access to commit_analysis_cache"
  ON commit_analysis_cache
  FOR SELECT
  USING (true);

CREATE POLICY "Allow authenticated users to insert/update/delete commit_analysis_cache"
  ON commit_analysis_cache
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Create function to clean up expired cache entries (TTL: 30 days by default)
CREATE OR REPLACE FUNCTION cleanup_expired_commit_cache(ttl_days INTEGER DEFAULT 30)
RETURNS TABLE(deleted_count INTEGER) AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM commit_analysis_cache
  WHERE analyzed_at < NOW() - (ttl_days || ' days')::INTERVAL;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN QUERY SELECT v_deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_expired_commit_cache IS 'Deletes cache entries older than TTL (default 30 days)';

-- Create function to get cache statistics
CREATE OR REPLACE FUNCTION get_commit_cache_stats()
RETURNS TABLE(
  total_entries BIGINT,
  by_analysis_type JSONB,
  oldest_entry TIMESTAMPTZ,
  newest_entry TIMESTAMPTZ,
  avg_issue_count NUMERIC,
  total_cost NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) AS total_entries,
    jsonb_object_agg(analysis_type, count) AS by_analysis_type,
    MIN(analyzed_at) AS oldest_entry,
    MAX(analyzed_at) AS newest_entry,
    AVG(issue_count) AS avg_issue_count,
    SUM(cost) AS total_cost
  FROM (
    SELECT
      analysis_type,
      COUNT(*) AS count,
      analyzed_at,
      issue_count,
      cost
    FROM commit_analysis_cache
    GROUP BY analysis_type, analyzed_at, issue_count, cost
  ) subquery;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_commit_cache_stats IS 'Returns cache statistics (total entries, breakdown by type, date range, costs)';

-- Example queries for cache management:
--
-- 1. Get cache stats:
--    SELECT * FROM get_commit_cache_stats();
--
-- 2. Clean up expired entries (older than 30 days):
--    SELECT cleanup_expired_commit_cache(30);
--
-- 3. Find all cached analyses for a repository:
--    SELECT * FROM commit_analysis_cache
--    WHERE repository_url = 'https://github.com/org/repo'
--    ORDER BY analyzed_at DESC;
--
-- 4. Invalidate cache for a specific version:
--    DELETE FROM commit_analysis_cache WHERE cache_version = 'v9.0';
--
-- 5. Get all cache entries for a commit:
--    SELECT * FROM commit_analysis_cache
--    WHERE commit_sha = 'abc123...';
