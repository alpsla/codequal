-- Migration: Create fix_telemetry table for tracking fix adoption
-- Purpose: Store metrics from consecutive PR analysis comparisons
-- Created: 2025-11-12

-- Create fix_telemetry table
CREATE TABLE IF NOT EXISTS fix_telemetry (
  id SERIAL PRIMARY KEY,

  -- PR identifiers
  repository_url TEXT NOT NULL,
  pr_number INTEGER NOT NULL,
  commit_sha_previous TEXT NOT NULL,
  commit_sha_current TEXT NOT NULL,

  -- Issue counts
  total_issues_previous INTEGER NOT NULL,
  total_issues_current INTEGER NOT NULL,
  issues_resolved INTEGER NOT NULL DEFAULT 0,
  issues_new INTEGER NOT NULL DEFAULT 0,
  issues_remaining INTEGER NOT NULL DEFAULT 0,

  -- Fix adoption breakdown
  fixes_exact INTEGER NOT NULL DEFAULT 0,        -- Used our fix exactly
  fixes_modified INTEGER NOT NULL DEFAULT 0,     -- Used our fix with tweaks
  fixes_different INTEGER NOT NULL DEFAULT 0,    -- Used different fix approach
  fixes_not_fixed INTEGER NOT NULL DEFAULT 0,    -- Issue still present

  -- Calculated metrics
  fix_adoption_rate NUMERIC(5, 2),  -- Percentage (0-100)
  resolution_rate NUMERIC(5, 2),    -- Percentage of issues resolved (0-100)

  -- Metadata
  language TEXT,
  tools_used TEXT[],

  -- Analysis duration (optional)
  analysis_duration_previous TEXT,
  analysis_duration_current TEXT,

  -- Timestamps
  analyzed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_fix_telemetry_repo_url
  ON fix_telemetry(repository_url);

CREATE INDEX IF NOT EXISTS idx_fix_telemetry_pr_number
  ON fix_telemetry(pr_number);

CREATE INDEX IF NOT EXISTS idx_fix_telemetry_analyzed_at
  ON fix_telemetry(analyzed_at);

CREATE INDEX IF NOT EXISTS idx_fix_telemetry_language
  ON fix_telemetry(language);

CREATE INDEX IF NOT EXISTS idx_fix_telemetry_repo_pr
  ON fix_telemetry(repository_url, pr_number);

-- Create composite index for trend queries
CREATE INDEX IF NOT EXISTS idx_fix_telemetry_time_language
  ON fix_telemetry(analyzed_at, language);

-- Create function to calculate metrics automatically
CREATE OR REPLACE FUNCTION calculate_fix_metrics()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate fix adoption rate
  -- (fixes_exact + fixes_modified) / issues_resolved * 100
  IF NEW.issues_resolved > 0 THEN
    NEW.fix_adoption_rate := ROUND(
      ((NEW.fixes_exact + NEW.fixes_modified)::NUMERIC / NEW.issues_resolved) * 100,
      2
    );
  ELSE
    NEW.fix_adoption_rate := 0;
  END IF;

  -- Calculate resolution rate
  -- issues_resolved / total_issues_previous * 100
  IF NEW.total_issues_previous > 0 THEN
    NEW.resolution_rate := ROUND(
      (NEW.issues_resolved::NUMERIC / NEW.total_issues_previous) * 100,
      2
    );
  ELSE
    NEW.resolution_rate := 0;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-calculate metrics
CREATE TRIGGER trigger_calculate_fix_metrics
  BEFORE INSERT OR UPDATE ON fix_telemetry
  FOR EACH ROW
  EXECUTE FUNCTION calculate_fix_metrics();

-- Comments for documentation
COMMENT ON TABLE fix_telemetry IS 'Tracks fix adoption metrics from consecutive PR analysis comparisons';
COMMENT ON COLUMN fix_telemetry.repository_url IS 'GitHub repository URL';
COMMENT ON COLUMN fix_telemetry.pr_number IS 'Pull request number';
COMMENT ON COLUMN fix_telemetry.commit_sha_previous IS 'Previous analysis commit SHA';
COMMENT ON COLUMN fix_telemetry.commit_sha_current IS 'Current analysis commit SHA';
COMMENT ON COLUMN fix_telemetry.total_issues_previous IS 'Total issues in previous analysis';
COMMENT ON COLUMN fix_telemetry.total_issues_current IS 'Total issues in current analysis';
COMMENT ON COLUMN fix_telemetry.issues_resolved IS 'Issues present in previous but not in current';
COMMENT ON COLUMN fix_telemetry.issues_new IS 'Issues present in current but not in previous';
COMMENT ON COLUMN fix_telemetry.issues_remaining IS 'Issues present in both analyses';
COMMENT ON COLUMN fix_telemetry.fixes_exact IS 'Count of issues fixed using our exact recommendation';
COMMENT ON COLUMN fix_telemetry.fixes_modified IS 'Count of issues fixed using our recommendation with modifications';
COMMENT ON COLUMN fix_telemetry.fixes_different IS 'Count of issues fixed using a different approach';
COMMENT ON COLUMN fix_telemetry.fixes_not_fixed IS 'Count of issues still present (not fixed)';
COMMENT ON COLUMN fix_telemetry.fix_adoption_rate IS 'Percentage of resolved issues that used our recommendations';
COMMENT ON COLUMN fix_telemetry.resolution_rate IS 'Percentage of previous issues that were resolved';

-- Grant permissions
GRANT SELECT, INSERT ON fix_telemetry TO authenticated;
GRANT SELECT ON fix_telemetry TO anon;

-- Enable Row Level Security (RLS)
ALTER TABLE fix_telemetry ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow public read access to fix_telemetry"
  ON fix_telemetry
  FOR SELECT
  USING (true);

CREATE POLICY "Allow authenticated users to insert fix_telemetry"
  ON fix_telemetry
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- =============================================================================
-- Analytics Functions
-- =============================================================================

-- Function: Get overall fix adoption stats
CREATE OR REPLACE FUNCTION get_fix_adoption_stats(
  days_back INTEGER DEFAULT 30
)
RETURNS TABLE(
  total_comparisons BIGINT,
  total_issues_resolved BIGINT,
  total_with_our_fixes BIGINT,
  avg_adoption_rate NUMERIC,
  avg_resolution_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_comparisons,
    SUM(issues_resolved)::BIGINT as total_issues_resolved,
    SUM(fixes_exact + fixes_modified)::BIGINT as total_with_our_fixes,
    ROUND(AVG(fix_adoption_rate), 2) as avg_adoption_rate,
    ROUND(AVG(resolution_rate), 2) as avg_resolution_rate
  FROM fix_telemetry
  WHERE analyzed_at > NOW() - (days_back || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_fix_adoption_stats IS 'Get overall fix adoption statistics for the last N days';

-- Function: Get fix adoption by language
CREATE OR REPLACE FUNCTION get_fix_adoption_by_language(
  days_back INTEGER DEFAULT 30
)
RETURNS TABLE(
  language TEXT,
  comparisons BIGINT,
  issues_resolved BIGINT,
  avg_adoption_rate NUMERIC,
  avg_resolution_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ft.language,
    COUNT(*)::BIGINT as comparisons,
    SUM(ft.issues_resolved)::BIGINT as issues_resolved,
    ROUND(AVG(ft.fix_adoption_rate), 2) as avg_adoption_rate,
    ROUND(AVG(ft.resolution_rate), 2) as avg_resolution_rate
  FROM fix_telemetry ft
  WHERE ft.analyzed_at > NOW() - (days_back || ' days')::INTERVAL
    AND ft.language IS NOT NULL
  GROUP BY ft.language
  ORDER BY avg_adoption_rate DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_fix_adoption_by_language IS 'Get fix adoption statistics broken down by programming language';

-- Function: Get trend over time
CREATE OR REPLACE FUNCTION get_fix_adoption_trend(
  weeks_back INTEGER DEFAULT 12
)
RETURNS TABLE(
  week TIMESTAMPTZ,
  comparisons BIGINT,
  issues_resolved BIGINT,
  avg_adoption_rate NUMERIC,
  avg_resolution_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE_TRUNC('week', analyzed_at) as week,
    COUNT(*)::BIGINT as comparisons,
    SUM(issues_resolved)::BIGINT as issues_resolved,
    ROUND(AVG(fix_adoption_rate), 2) as avg_adoption_rate,
    ROUND(AVG(resolution_rate), 2) as avg_resolution_rate
  FROM fix_telemetry
  WHERE analyzed_at > NOW() - (weeks_back || ' weeks')::INTERVAL
  GROUP BY week
  ORDER BY week DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_fix_adoption_trend IS 'Get fix adoption trend over the last N weeks';

-- Function: Get top repositories by fix adoption
CREATE OR REPLACE FUNCTION get_top_repos_by_fix_adoption(
  limit_count INTEGER DEFAULT 10,
  days_back INTEGER DEFAULT 30
)
RETURNS TABLE(
  repository_url TEXT,
  comparisons BIGINT,
  total_issues_resolved BIGINT,
  avg_adoption_rate NUMERIC,
  avg_resolution_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ft.repository_url,
    COUNT(*)::BIGINT as comparisons,
    SUM(ft.issues_resolved)::BIGINT as total_issues_resolved,
    ROUND(AVG(ft.fix_adoption_rate), 2) as avg_adoption_rate,
    ROUND(AVG(ft.resolution_rate), 2) as avg_resolution_rate
  FROM fix_telemetry ft
  WHERE ft.analyzed_at > NOW() - (days_back || ' days')::INTERVAL
  GROUP BY ft.repository_url
  HAVING COUNT(*) >= 2  -- At least 2 comparisons
  ORDER BY avg_adoption_rate DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_top_repos_by_fix_adoption IS 'Get top repositories by fix adoption rate';

-- =============================================================================
-- Example Queries
-- =============================================================================

-- Get overall stats for last 30 days
-- SELECT * FROM get_fix_adoption_stats(30);

-- Get stats by language
-- SELECT * FROM get_fix_adoption_by_language(30);

-- Get 12-week trend
-- SELECT * FROM get_fix_adoption_trend(12);

-- Get top 10 repositories
-- SELECT * FROM get_top_repos_by_fix_adoption(10, 30);

-- Get all metrics for a specific PR
-- SELECT * FROM fix_telemetry
-- WHERE repository_url = 'https://github.com/org/repo'
--   AND pr_number = 123
-- ORDER BY analyzed_at DESC;

-- Get recent high-adoption comparisons
-- SELECT
--   repository_url,
--   pr_number,
--   issues_resolved,
--   fix_adoption_rate,
--   resolution_rate,
--   analyzed_at
-- FROM fix_telemetry
-- WHERE analyzed_at > NOW() - INTERVAL '7 days'
--   AND fix_adoption_rate > 80
-- ORDER BY fix_adoption_rate DESC
-- LIMIT 20;
