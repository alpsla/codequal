-- ================================================================================
-- Pattern Contribution Tracking Schema
-- Created: 2025-12-21 (Session 66)
--
-- Purpose: Track pattern contributions for community impact and tier differentiation
-- - Enables "You helped X developers" messaging for PRO users
-- - Powers community leaderboards and recognition
-- - Supports anonymous contribution option
-- ================================================================================

-- =============================================================================
-- PATTERN CONTRIBUTIONS TABLE
-- Tracks which user/org contributed each pattern
-- =============================================================================

CREATE TABLE IF NOT EXISTS pattern_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Reference to the pattern
  pattern_id UUID NOT NULL REFERENCES fix_patterns(id) ON DELETE CASCADE,

  -- Contributor identification
  contributor_user_id UUID,
  contributor_org_id UUID,

  -- Privacy preference
  is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,

  -- Contribution context
  contributed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source_pr TEXT,                    -- PR that generated this pattern (e.g., "PR #123")
  source_repo TEXT,                  -- Repository URL
  language TEXT,                     -- Programming language

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure one contribution record per pattern
  CONSTRAINT unique_pattern_contribution UNIQUE (pattern_id)
);

-- Indexes for contribution lookups
CREATE INDEX IF NOT EXISTS idx_pattern_contributions_user
  ON pattern_contributions (contributor_user_id);
CREATE INDEX IF NOT EXISTS idx_pattern_contributions_org
  ON pattern_contributions (contributor_org_id);
CREATE INDEX IF NOT EXISTS idx_pattern_contributions_language
  ON pattern_contributions (language);
CREATE INDEX IF NOT EXISTS idx_pattern_contributions_contributed_at
  ON pattern_contributions (contributed_at DESC);

-- =============================================================================
-- PATTERN USAGE STATS TABLE
-- Tracks when patterns are used by other users
-- =============================================================================

CREATE TABLE IF NOT EXISTS pattern_usage_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Reference to the pattern
  pattern_id UUID NOT NULL REFERENCES fix_patterns(id) ON DELETE CASCADE,

  -- Who used this pattern
  used_by_user_id UUID,
  used_by_org_id UUID,

  -- Usage metrics
  usage_count INTEGER NOT NULL DEFAULT 1,
  time_saved_minutes FLOAT NOT NULL DEFAULT 5.0,  -- Estimated time saved per use

  -- Tracking
  first_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One record per pattern+user combination
  CONSTRAINT unique_pattern_user_usage UNIQUE (pattern_id, used_by_user_id)
);

-- Indexes for usage lookups
CREATE INDEX IF NOT EXISTS idx_pattern_usage_pattern
  ON pattern_usage_stats (pattern_id);
CREATE INDEX IF NOT EXISTS idx_pattern_usage_user
  ON pattern_usage_stats (used_by_user_id);
CREATE INDEX IF NOT EXISTS idx_pattern_usage_org
  ON pattern_usage_stats (used_by_org_id);
CREATE INDEX IF NOT EXISTS idx_pattern_usage_last_used
  ON pattern_usage_stats (last_used_at DESC);

-- =============================================================================
-- COMMUNITY IMPACT METRICS TABLE
-- Aggregated monthly metrics for community impact reporting
-- =============================================================================

CREATE TABLE IF NOT EXISTS community_impact_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User/Org identification (one of these should be set)
  user_id UUID,
  org_id UUID,

  -- Time period (monthly aggregation)
  month DATE NOT NULL,  -- First day of the month

  -- Contribution metrics
  patterns_contributed INTEGER NOT NULL DEFAULT 0,
  users_helped INTEGER NOT NULL DEFAULT 0,         -- Unique users who used their patterns
  total_time_saved_hours FLOAT NOT NULL DEFAULT 0, -- Sum of time saved across all usages

  -- Recognition metrics
  top_pattern_id UUID REFERENCES fix_patterns(id), -- Most-used pattern this month
  community_rank INTEGER,                          -- Rank among all contributors

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One record per user/org per month
  CONSTRAINT unique_user_month UNIQUE (user_id, month),
  CONSTRAINT unique_org_month UNIQUE (org_id, month),
  CONSTRAINT check_user_or_org CHECK (user_id IS NOT NULL OR org_id IS NOT NULL)
);

-- Indexes for metrics lookups
CREATE INDEX IF NOT EXISTS idx_community_impact_user_month
  ON community_impact_metrics (user_id, month DESC);
CREATE INDEX IF NOT EXISTS idx_community_impact_org_month
  ON community_impact_metrics (org_id, month DESC);
CREATE INDEX IF NOT EXISTS idx_community_impact_rank
  ON community_impact_metrics (month, community_rank);

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Function to record a pattern contribution
CREATE OR REPLACE FUNCTION record_pattern_contribution(
  p_pattern_id UUID,
  p_user_id UUID,
  p_org_id UUID,
  p_source_pr TEXT,
  p_source_repo TEXT,
  p_language TEXT,
  p_is_anonymous BOOLEAN DEFAULT FALSE
)
RETURNS UUID AS $$
DECLARE
  v_contribution_id UUID;
BEGIN
  INSERT INTO pattern_contributions (
    pattern_id,
    contributor_user_id,
    contributor_org_id,
    source_pr,
    source_repo,
    language,
    is_anonymous
  )
  VALUES (
    p_pattern_id,
    p_user_id,
    p_org_id,
    p_source_pr,
    p_source_repo,
    p_language,
    p_is_anonymous
  )
  ON CONFLICT (pattern_id) DO UPDATE SET
    contributor_user_id = COALESCE(EXCLUDED.contributor_user_id, pattern_contributions.contributor_user_id),
    contributor_org_id = COALESCE(EXCLUDED.contributor_org_id, pattern_contributions.contributor_org_id)
  RETURNING id INTO v_contribution_id;

  RETURN v_contribution_id;
END;
$$ LANGUAGE plpgsql;

-- Function to record pattern usage
CREATE OR REPLACE FUNCTION record_pattern_usage(
  p_pattern_id UUID,
  p_user_id UUID,
  p_org_id UUID,
  p_time_saved_minutes FLOAT DEFAULT 5.0
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO pattern_usage_stats (
    pattern_id,
    used_by_user_id,
    used_by_org_id,
    usage_count,
    time_saved_minutes,
    first_used_at,
    last_used_at
  )
  VALUES (
    p_pattern_id,
    p_user_id,
    p_org_id,
    1,
    p_time_saved_minutes,
    NOW(),
    NOW()
  )
  ON CONFLICT (pattern_id, used_by_user_id) DO UPDATE SET
    usage_count = pattern_usage_stats.usage_count + 1,
    time_saved_minutes = pattern_usage_stats.time_saved_minutes + EXCLUDED.time_saved_minutes,
    last_used_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to get user's community impact
CREATE OR REPLACE FUNCTION get_user_community_impact(p_user_id UUID)
RETURNS TABLE (
  patterns_contributed BIGINT,
  users_helped BIGINT,
  total_time_saved_hours FLOAT,
  total_usage_count BIGINT,
  top_pattern_name TEXT,
  top_pattern_uses BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH user_patterns AS (
    SELECT pc.pattern_id
    FROM pattern_contributions pc
    WHERE pc.contributor_user_id = p_user_id
  ),
  usage_stats AS (
    SELECT
      COUNT(DISTINCT pus.used_by_user_id) AS unique_users,
      SUM(pus.usage_count) AS total_uses,
      SUM(pus.time_saved_minutes) / 60.0 AS hours_saved
    FROM pattern_usage_stats pus
    WHERE pus.pattern_id IN (SELECT pattern_id FROM user_patterns)
      AND pus.used_by_user_id != p_user_id  -- Exclude self-usage
  ),
  top_pattern AS (
    SELECT
      fp.name,
      SUM(pus.usage_count) AS uses
    FROM pattern_usage_stats pus
    JOIN fix_patterns fp ON fp.id = pus.pattern_id
    WHERE pus.pattern_id IN (SELECT pattern_id FROM user_patterns)
      AND pus.used_by_user_id != p_user_id
    GROUP BY fp.id, fp.name
    ORDER BY uses DESC
    LIMIT 1
  )
  SELECT
    (SELECT COUNT(*) FROM user_patterns)::BIGINT AS patterns_contributed,
    COALESCE(us.unique_users, 0)::BIGINT AS users_helped,
    COALESCE(us.hours_saved, 0) AS total_time_saved_hours,
    COALESCE(us.total_uses, 0)::BIGINT AS total_usage_count,
    tp.name AS top_pattern_name,
    COALESCE(tp.uses, 0)::BIGINT AS top_pattern_uses
  FROM usage_stats us
  LEFT JOIN top_pattern tp ON true;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to update monthly community impact metrics
CREATE OR REPLACE FUNCTION update_community_impact_metrics(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_month DATE := date_trunc('month', CURRENT_DATE)::DATE;
  v_impact RECORD;
BEGIN
  -- Get current impact
  SELECT * INTO v_impact FROM get_user_community_impact(p_user_id);

  -- Upsert monthly metrics
  INSERT INTO community_impact_metrics (
    user_id,
    month,
    patterns_contributed,
    users_helped,
    total_time_saved_hours
  )
  VALUES (
    p_user_id,
    v_month,
    v_impact.patterns_contributed,
    v_impact.users_helped,
    v_impact.total_time_saved_hours
  )
  ON CONFLICT (user_id, month) DO UPDATE SET
    patterns_contributed = EXCLUDED.patterns_contributed,
    users_helped = EXCLUDED.users_helped,
    total_time_saved_hours = EXCLUDED.total_time_saved_hours,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- VIEWS
-- =============================================================================

-- View: Community leaderboard (this month)
CREATE OR REPLACE VIEW community_leaderboard AS
SELECT
  cim.user_id,
  cim.patterns_contributed,
  cim.users_helped,
  cim.total_time_saved_hours,
  ROW_NUMBER() OVER (ORDER BY cim.users_helped DESC, cim.patterns_contributed DESC) AS rank
FROM community_impact_metrics cim
WHERE cim.month = date_trunc('month', CURRENT_DATE)::DATE
  AND cim.user_id IS NOT NULL
ORDER BY rank;

-- View: Pattern contribution summary
CREATE OR REPLACE VIEW pattern_contribution_summary AS
SELECT
  pc.contributor_user_id,
  pc.contributor_org_id,
  pc.language,
  COUNT(*) AS pattern_count,
  SUM(fp.apply_count) AS total_applications,
  AVG(fp.confidence) AS avg_confidence
FROM pattern_contributions pc
JOIN fix_patterns fp ON fp.id = pc.pattern_id
WHERE fp.status = 'active'
GROUP BY pc.contributor_user_id, pc.contributor_org_id, pc.language;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE pattern_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pattern_usage_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_impact_metrics ENABLE ROW LEVEL SECURITY;

-- Service role has full access
CREATE POLICY "Service role full access contributions" ON pattern_contributions
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access usage" ON pattern_usage_stats
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access metrics" ON community_impact_metrics
  FOR ALL USING (auth.role() = 'service_role');

-- Users can read non-anonymous contributions
CREATE POLICY "Read non-anonymous contributions" ON pattern_contributions
  FOR SELECT USING (is_anonymous = FALSE OR contributor_user_id = auth.uid());

-- Users can read their own usage stats
CREATE POLICY "Read own usage stats" ON pattern_usage_stats
  FOR SELECT USING (used_by_user_id = auth.uid());

-- Users can read their own impact metrics
CREATE POLICY "Read own impact metrics" ON community_impact_metrics
  FOR SELECT USING (user_id = auth.uid());

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE pattern_contributions IS 'Tracks which users/orgs contributed each fix pattern for community impact metrics';
COMMENT ON TABLE pattern_usage_stats IS 'Tracks when patterns are used by other users to measure community value';
COMMENT ON TABLE community_impact_metrics IS 'Monthly aggregated community impact metrics for each user/org';
COMMENT ON FUNCTION record_pattern_contribution IS 'Records a new pattern contribution, linking it to the contributing user/org';
COMMENT ON FUNCTION record_pattern_usage IS 'Records pattern usage, incrementing counters and updating time saved';
COMMENT ON FUNCTION get_user_community_impact IS 'Returns aggregated community impact stats for a user';
