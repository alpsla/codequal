-- ================================================================================
-- Unified Report System Schema
-- Created: 2025-12-24 (Session 66 - Backend Implementation)
--
-- Purpose: Complete schema for unified report generation system
-- Extends existing tables from 20251221_user_analytics_progress.sql
-- - Users base table
-- - Repositories and user-repository relationships
-- - Comprehensive analyses table
-- - Full JSON report storage
-- - XP transactions
-- ================================================================================

-- =============================================================================
-- USERS TABLE
-- Base user information (extends auth.users from Supabase)
-- =============================================================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity (may link to auth.users)
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  avatar_url TEXT,

  -- Subscription
  tier VARCHAR(20) DEFAULT 'basic' CHECK (tier IN ('basic', 'pro', 'enterprise')),
  tier_expires_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for email lookup
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- =============================================================================
-- REPOSITORIES TABLE
-- Tracks analyzed repositories
-- =============================================================================

CREATE TABLE IF NOT EXISTS repositories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Repository identity
  url VARCHAR(500) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  owner VARCHAR(255) NOT NULL,
  provider VARCHAR(50) NOT NULL CHECK (provider IN ('github', 'gitlab', 'bitbucket')),
  default_branch VARCHAR(100) DEFAULT 'main',

  -- Visibility
  is_private BOOLEAN DEFAULT FALSE,

  -- Aggregated stats
  total_analyses INTEGER DEFAULT 0,
  last_analysis_at TIMESTAMPTZ,
  average_score FLOAT,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for URL lookup
CREATE INDEX IF NOT EXISTS idx_repositories_url ON repositories (url);
CREATE INDEX IF NOT EXISTS idx_repositories_owner_name ON repositories (owner, name);

-- =============================================================================
-- USER_REPOSITORIES TABLE
-- Many-to-many relationship between users and repositories
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_repositories (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,

  -- Access level
  access_level VARCHAR(20) DEFAULT 'read' CHECK (access_level IN ('read', 'write', 'admin')),

  -- User preferences for this repo
  is_favorite BOOLEAN DEFAULT FALSE,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (user_id, repository_id)
);

-- Index for user's repositories
CREATE INDEX IF NOT EXISTS idx_user_repositories_user ON user_repositories (user_id);

-- =============================================================================
-- ANALYSES TABLE
-- Comprehensive analysis records (extends analysis_history)
-- =============================================================================

CREATE TABLE IF NOT EXISTS analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  user_id UUID NOT NULL REFERENCES users(id),
  repository_id UUID NOT NULL REFERENCES repositories(id),

  -- PR information
  pr_number INTEGER,
  pr_title TEXT,
  pr_author VARCHAR(255),
  source_branch VARCHAR(255),
  target_branch VARCHAR(255),

  -- Analysis configuration
  mode VARCHAR(20) NOT NULL CHECK (mode IN ('fast', 'standard', 'thorough', 'complete')),
  tier VARCHAR(20) NOT NULL CHECK (tier IN ('basic', 'pro')),

  -- Status tracking
  status VARCHAR(20) NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'cloning', 'analyzing', 'enriching', 'fixing', 'generating_report', 'completed', 'failed')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,

  -- Results
  score_before INTEGER CHECK (score_before >= 0 AND score_before <= 100),
  score_after INTEGER CHECK (score_after >= 0 AND score_after <= 100),
  grade CHAR(1) CHECK (grade IN ('A', 'B', 'C', 'D', 'F')),
  decision VARCHAR(20) CHECK (decision IN ('APPROVED', 'DECLINED')),

  -- Issue counts
  issues_found INTEGER DEFAULT 0,
  issues_fixed INTEGER DEFAULT 0,
  issues_remaining INTEGER DEFAULT 0,
  blocking_issues INTEGER DEFAULT 0,

  -- Detailed issue breakdown
  issues_by_severity JSONB DEFAULT '{"critical": 0, "high": 0, "medium": 0, "low": 0}',
  issues_by_category JSONB DEFAULT '{"security": 0, "code_quality": 0, "performance": 0, "architecture": 0, "dependencies": 0}',
  issues_by_status JSONB DEFAULT '{"new": 0, "existing": 0, "resolved": 0}',

  -- Cost tracking
  api_cost FLOAT DEFAULT 0,
  tokens_used INTEGER DEFAULT 0,

  -- Duration breakdown
  duration_total_ms INTEGER,
  duration_cloning_ms INTEGER,
  duration_scanning_ms INTEGER,
  duration_comparison_ms INTEGER,
  duration_enrichment_ms INTEGER,
  duration_fixing_ms INTEGER,
  duration_reporting_ms INTEGER,

  -- Report reference
  report_id UUID,
  report_url TEXT,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for analyses
CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON analyses (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analyses_repository_id ON analyses (repository_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analyses_status ON analyses (status) WHERE status NOT IN ('completed', 'failed');
CREATE UNIQUE INDEX IF NOT EXISTS idx_analyses_repo_pr ON analyses (repository_id, pr_number) WHERE pr_number IS NOT NULL;

-- =============================================================================
-- REPORTS TABLE
-- Full JSON report storage
-- =============================================================================

CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationship
  analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,

  -- Report version
  version VARCHAR(20) NOT NULL DEFAULT '2.0',
  tier VARCHAR(20) NOT NULL CHECK (tier IN ('basic', 'pro')),

  -- Full report content (JSON)
  content JSONB NOT NULL,

  -- Generation timestamp
  generated_at TIMESTAMPTZ NOT NULL,

  -- Storage metrics
  file_size_bytes INTEGER,

  -- Export URLs (Supabase storage)
  markdown_url TEXT,
  html_url TEXT,
  pdf_url TEXT,
  sarif_url TEXT,
  json_url TEXT,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for report lookup
CREATE INDEX IF NOT EXISTS idx_reports_analysis_id ON reports (analysis_id);

-- =============================================================================
-- XP_TRANSACTIONS TABLE
-- Track XP earnings for gamification
-- =============================================================================

CREATE TABLE IF NOT EXISTS xp_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User reference
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- XP details
  amount INTEGER NOT NULL,
  reason VARCHAR(100) NOT NULL,
  description TEXT,

  -- Context
  analysis_id UUID REFERENCES analyses(id) ON DELETE SET NULL,
  achievement_id TEXT,  -- Reference to achievement that triggered XP

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for XP transactions
CREATE INDEX IF NOT EXISTS idx_xp_transactions_user ON xp_transactions (user_id, created_at DESC);

-- =============================================================================
-- EXTENDED USER_PREFERENCES
-- Add missing columns to existing user_preferences table
-- =============================================================================

-- Add columns if they don't exist (using DO block for conditional ALTER)
DO $$
BEGIN
  -- History display count
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'user_preferences' AND column_name = 'history_display_count') THEN
    ALTER TABLE user_preferences ADD COLUMN history_display_count INTEGER DEFAULT 5;
  END IF;

  -- Output method defaults
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'user_preferences' AND column_name = 'default_output_method') THEN
    ALTER TABLE user_preferences ADD COLUMN default_output_method VARCHAR(50) DEFAULT 'commit';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'user_preferences' AND column_name = 'default_commit_style') THEN
    ALTER TABLE user_preferences ADD COLUMN default_commit_style VARCHAR(50) DEFAULT 'single';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'user_preferences' AND column_name = 'default_fix_scope') THEN
    ALTER TABLE user_preferences ADD COLUMN default_fix_scope VARCHAR(50) DEFAULT 'recommended';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'user_preferences' AND column_name = 'commit_message_template') THEN
    ALTER TABLE user_preferences ADD COLUMN commit_message_template TEXT DEFAULT 'fix: CodeQual auto-fixes ({count} issues)';
  END IF;

  -- Review settings
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'user_preferences' AND column_name = 'review_confidence_threshold') THEN
    ALTER TABLE user_preferences ADD COLUMN review_confidence_threshold INTEGER DEFAULT 80;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'user_preferences' AND column_name = 'always_review_security') THEN
    ALTER TABLE user_preferences ADD COLUMN always_review_security BOOLEAN DEFAULT TRUE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'user_preferences' AND column_name = 'always_review_dependencies') THEN
    ALTER TABLE user_preferences ADD COLUMN always_review_dependencies BOOLEAN DEFAULT TRUE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'user_preferences' AND column_name = 'always_review_performance') THEN
    ALTER TABLE user_preferences ADD COLUMN always_review_performance BOOLEAN DEFAULT TRUE;
  END IF;

  -- Display settings
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'user_preferences' AND column_name = 'hourly_rate') THEN
    ALTER TABLE user_preferences ADD COLUMN hourly_rate INTEGER DEFAULT 150;
  END IF;
END $$;

-- =============================================================================
-- EXTENDED USER_SKILLS
-- Create user_skills table if not exists or extend skill_scores
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_skills (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

  -- Level and XP
  level INTEGER DEFAULT 1,
  total_xp INTEGER DEFAULT 0,

  -- Category scores (0-100)
  security_score INTEGER DEFAULT 50 CHECK (security_score >= 0 AND security_score <= 100),
  code_quality_score INTEGER DEFAULT 50 CHECK (code_quality_score >= 0 AND code_quality_score <= 100),
  dependencies_score INTEGER DEFAULT 50 CHECK (dependencies_score >= 0 AND dependencies_score <= 100),
  performance_score INTEGER DEFAULT 50 CHECK (performance_score >= 0 AND performance_score <= 100),
  architecture_score INTEGER DEFAULT 50 CHECK (architecture_score >= 0 AND architecture_score <= 100),

  -- Lifetime stats
  issues_fixed_total INTEGER DEFAULT 0,
  analyses_completed INTEGER DEFAULT 0,
  patterns_contributed INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Function to get or create a repository
CREATE OR REPLACE FUNCTION get_or_create_repository(
  p_url TEXT,
  p_name TEXT,
  p_owner TEXT,
  p_provider TEXT DEFAULT 'github'
)
RETURNS UUID AS $$
DECLARE
  v_repo_id UUID;
BEGIN
  -- Try to find existing repository
  SELECT id INTO v_repo_id FROM repositories WHERE url = p_url;

  IF NOT FOUND THEN
    -- Create new repository
    INSERT INTO repositories (url, name, owner, provider)
    VALUES (p_url, p_name, p_owner, p_provider)
    RETURNING id INTO v_repo_id;
  END IF;

  RETURN v_repo_id;
END;
$$ LANGUAGE plpgsql;

-- Function to record an analysis with full details
CREATE OR REPLACE FUNCTION record_full_analysis(
  p_user_id UUID,
  p_repository_id UUID,
  p_pr_number INTEGER,
  p_pr_title TEXT,
  p_mode TEXT,
  p_tier TEXT,
  p_score_before INTEGER,
  p_score_after INTEGER,
  p_decision TEXT,
  p_issues_found INTEGER,
  p_issues_fixed INTEGER,
  p_duration_ms INTEGER
)
RETURNS UUID AS $$
DECLARE
  v_analysis_id UUID;
  v_grade CHAR(1);
BEGIN
  -- Calculate grade from final score
  v_grade := CASE
    WHEN p_score_after >= 90 THEN 'A'
    WHEN p_score_after >= 80 THEN 'B'
    WHEN p_score_after >= 70 THEN 'C'
    WHEN p_score_after >= 60 THEN 'D'
    ELSE 'F'
  END;

  -- Insert analysis record
  INSERT INTO analyses (
    user_id, repository_id, pr_number, pr_title,
    mode, tier, status, started_at, completed_at,
    score_before, score_after, grade, decision,
    issues_found, issues_fixed, issues_remaining,
    duration_total_ms
  )
  VALUES (
    p_user_id, p_repository_id, p_pr_number, p_pr_title,
    p_mode, p_tier, 'completed', NOW() - (p_duration_ms || ' milliseconds')::INTERVAL, NOW(),
    p_score_before, p_score_after, v_grade, p_decision,
    p_issues_found, p_issues_fixed, p_issues_found - p_issues_fixed,
    p_duration_ms
  )
  RETURNING id INTO v_analysis_id;

  -- Update repository stats
  UPDATE repositories
  SET
    total_analyses = total_analyses + 1,
    last_analysis_at = NOW(),
    average_score = (
      SELECT AVG(score_after)
      FROM analyses
      WHERE repository_id = p_repository_id AND status = 'completed'
    )
  WHERE id = p_repository_id;

  -- Update user skills
  UPDATE user_skills
  SET
    analyses_completed = analyses_completed + 1,
    issues_fixed_total = issues_fixed_total + p_issues_fixed,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  RETURN v_analysis_id;
END;
$$ LANGUAGE plpgsql;

-- Function to store a report
CREATE OR REPLACE FUNCTION store_report(
  p_analysis_id UUID,
  p_tier TEXT,
  p_content JSONB
)
RETURNS UUID AS $$
DECLARE
  v_report_id UUID;
BEGIN
  INSERT INTO reports (analysis_id, tier, content, generated_at, file_size_bytes)
  VALUES (
    p_analysis_id,
    p_tier,
    p_content,
    NOW(),
    octet_length(p_content::TEXT)
  )
  RETURNING id INTO v_report_id;

  -- Update analysis with report reference
  UPDATE analyses SET report_id = v_report_id WHERE id = p_analysis_id;

  RETURN v_report_id;
END;
$$ LANGUAGE plpgsql;

-- Function to award XP
CREATE OR REPLACE FUNCTION award_xp(
  p_user_id UUID,
  p_amount INTEGER,
  p_reason TEXT,
  p_description TEXT DEFAULT NULL,
  p_analysis_id UUID DEFAULT NULL,
  p_achievement_id TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  -- Record transaction
  INSERT INTO xp_transactions (user_id, amount, reason, description, analysis_id, achievement_id)
  VALUES (p_user_id, p_amount, p_reason, p_description, p_analysis_id, p_achievement_id);

  -- Update user total XP
  UPDATE user_skills
  SET
    total_xp = total_xp + p_amount,
    level = GREATEST(1, FLOOR(SQRT(total_xp + p_amount) / 10)::INTEGER),
    updated_at = NOW()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get user's analysis history for a repository
CREATE OR REPLACE FUNCTION get_repository_history(
  p_user_id UUID,
  p_repository_id UUID,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  pr_number INTEGER,
  pr_title TEXT,
  timestamp TIMESTAMPTZ,
  score_before INTEGER,
  score_after INTEGER,
  grade CHAR(1),
  issues_fixed INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.pr_number,
    a.pr_title,
    a.completed_at AS timestamp,
    a.score_before,
    a.score_after,
    a.grade,
    a.issues_fixed
  FROM analyses a
  WHERE a.user_id = p_user_id
    AND a.repository_id = p_repository_id
    AND a.status = 'completed'
  ORDER BY a.completed_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- =============================================================================
-- VIEWS
-- =============================================================================

-- View: Repository history with trend
CREATE OR REPLACE VIEW repository_history_view AS
SELECT
  a.repository_id,
  a.user_id,
  a.id AS analysis_id,
  a.pr_number,
  a.pr_title,
  a.completed_at AS timestamp,
  a.score_before,
  a.score_after,
  a.grade,
  a.tier,
  a.issues_found,
  a.issues_fixed,
  a.report_url,
  LAG(a.score_after) OVER (
    PARTITION BY a.repository_id, a.user_id
    ORDER BY a.completed_at
  ) AS previous_score
FROM analyses a
WHERE a.status = 'completed'
ORDER BY a.completed_at DESC;

-- View: User skill summary
CREATE OR REPLACE VIEW user_skill_summary AS
SELECT
  u.id AS user_id,
  u.email,
  u.tier,
  COALESCE(s.level, 1) AS level,
  COALESCE(s.total_xp, 0) AS total_xp,
  COALESCE(s.security_score, 50) AS security_score,
  COALESCE(s.code_quality_score, 50) AS code_quality_score,
  COALESCE(s.dependencies_score, 50) AS dependencies_score,
  COALESCE(s.performance_score, 50) AS performance_score,
  COALESCE(s.architecture_score, 50) AS architecture_score,
  COALESCE(s.issues_fixed_total, 0) AS issues_fixed_total,
  COALESCE(s.analyses_completed, 0) AS analyses_completed,
  COALESCE(s.patterns_contributed, 0) AS patterns_contributed,
  (SELECT COUNT(*) FROM user_achievements ua WHERE ua.user_id = u.id) AS achievements_count
FROM users u
LEFT JOIN user_skills s ON u.id = s.user_id;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_skills ENABLE ROW LEVEL SECURITY;

-- Service role has full access
CREATE POLICY "Service role full access users" ON users
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access repositories" ON repositories
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access user_repositories" ON user_repositories
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access analyses" ON analyses
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access reports" ON reports
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access xp_transactions" ON xp_transactions
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access user_skills" ON user_skills
  FOR ALL USING (auth.role() = 'service_role');

-- Users can read their own data
CREATE POLICY "Read own user data" ON users
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Read repositories" ON repositories
  FOR SELECT USING (true);  -- Repositories are public metadata

CREATE POLICY "Read own user_repositories" ON user_repositories
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Read own analyses" ON analyses
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Read own reports" ON reports
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM analyses a WHERE a.id = reports.analysis_id AND a.user_id = auth.uid())
  );

CREATE POLICY "Read own xp_transactions" ON xp_transactions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Manage own user_skills" ON user_skills
  FOR ALL USING (user_id = auth.uid());

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE users IS 'Base user information for CodeQual';
COMMENT ON TABLE repositories IS 'Tracked repositories for analysis';
COMMENT ON TABLE user_repositories IS 'User-repository access relationships';
COMMENT ON TABLE analyses IS 'Comprehensive analysis records';
COMMENT ON TABLE reports IS 'Full JSON report storage';
COMMENT ON TABLE xp_transactions IS 'XP earning history for gamification';
COMMENT ON TABLE user_skills IS 'User skill levels and category scores';
