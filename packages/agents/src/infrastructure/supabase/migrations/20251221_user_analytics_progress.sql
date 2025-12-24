-- ================================================================================
-- User Analytics & Progress Tracking Schema
-- Created: 2025-12-21 (Session 66)
--
-- Purpose: Track user progress, skill development, and achievements
-- - Analysis history (last 5 PRs per user)
-- - Skill progression (3 month retention)
-- - Achievement system with style preferences
-- - User preferences (anonymous contributions, achievement style)
-- ================================================================================

-- =============================================================================
-- ANALYSIS HISTORY TABLE
-- Stores historical analysis data (5 PR retention per user)
-- =============================================================================

CREATE TABLE IF NOT EXISTS analysis_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User/Org identification
  user_id UUID NOT NULL,
  org_id UUID,

  -- PR context
  pr_number INTEGER NOT NULL,
  repository TEXT NOT NULL,

  -- Analysis results
  analysis_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  decision TEXT CHECK (decision IN ('APPROVED', 'DECLINED')),

  -- Issue metrics
  issues_found INTEGER NOT NULL DEFAULT 0,
  issues_fixed INTEGER NOT NULL DEFAULT 0,
  issues_by_severity JSONB DEFAULT '{}',  -- {"critical": 0, "high": 2, "medium": 5, "low": 10}
  issues_by_category JSONB DEFAULT '{}',  -- {"security": 2, "quality": 8, "performance": 3}

  -- Value metrics
  time_saved_minutes FLOAT NOT NULL DEFAULT 0,
  cost_saved_dollars FLOAT NOT NULL DEFAULT 0,

  -- Fix statistics
  auto_fix_rate FLOAT CHECK (auto_fix_rate >= 0 AND auto_fix_rate <= 100),
  patterns_used INTEGER DEFAULT 0,
  ai_fixes_generated INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for analysis history
CREATE INDEX IF NOT EXISTS idx_analysis_history_user
  ON analysis_history (user_id, analysis_date DESC);
CREATE INDEX IF NOT EXISTS idx_analysis_history_org
  ON analysis_history (org_id, analysis_date DESC);
CREATE INDEX IF NOT EXISTS idx_analysis_history_repo
  ON analysis_history (repository, analysis_date DESC);

-- =============================================================================
-- SKILL SCORES TABLE
-- Tracks skill progression over time (3 month retention)
-- =============================================================================

CREATE TABLE IF NOT EXISTS skill_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User identification
  user_id UUID NOT NULL,

  -- Date (one record per day per user)
  date DATE NOT NULL,

  -- Skill scores (0-100)
  security_score INTEGER CHECK (security_score >= 0 AND security_score <= 100),
  code_quality_score INTEGER CHECK (code_quality_score >= 0 AND code_quality_score <= 100),
  performance_score INTEGER CHECK (performance_score >= 0 AND performance_score <= 100),
  architecture_score INTEGER CHECK (architecture_score >= 0 AND architecture_score <= 100),
  dependency_score INTEGER CHECK (dependency_score >= 0 AND dependency_score <= 100),
  overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),

  -- Trend indicators
  security_trend INTEGER DEFAULT 0,       -- Change from previous record
  quality_trend INTEGER DEFAULT 0,
  performance_trend INTEGER DEFAULT 0,
  architecture_trend INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One score per user per day
  CONSTRAINT unique_user_date UNIQUE (user_id, date)
);

-- Indexes for skill scores
CREATE INDEX IF NOT EXISTS idx_skill_scores_user_date
  ON skill_scores (user_id, date DESC);

-- =============================================================================
-- ACHIEVEMENT DEFINITIONS TABLE
-- Master list of all possible achievements
-- =============================================================================

CREATE TABLE IF NOT EXISTS achievement_definitions (
  id TEXT PRIMARY KEY,  -- e.g., 'security-guardian', 'speed-demon'

  -- Display info
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT,            -- Emoji or icon class

  -- Classification
  category TEXT NOT NULL CHECK (category IN ('security', 'quality', 'performance', 'architecture', 'community', 'milestone')),
  tier TEXT NOT NULL CHECK (tier IN ('common', 'rare', 'epic', 'legendary')),

  -- Unlock criteria (JSON for flexibility)
  criteria JSONB NOT NULL,  -- {"type": "consecutive_clean_prs", "count": 10}

  -- Style variants
  professional_text TEXT,   -- "Certified Security Specialist"
  gamified_text TEXT,       -- "You've vanquished 50 security demons!"

  -- XP and progression
  xp_value INTEGER DEFAULT 100,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- USER ACHIEVEMENTS TABLE
-- Tracks achievements unlocked by users
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User identification
  user_id UUID NOT NULL,

  -- Achievement reference
  achievement_id TEXT NOT NULL REFERENCES achievement_definitions(id),

  -- Unlock context
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  pr_number INTEGER,        -- PR that triggered the unlock
  repository TEXT,          -- Repository context

  -- Progress tracking (for progressive achievements)
  progress INTEGER DEFAULT 100,    -- 100 = fully unlocked
  progress_max INTEGER DEFAULT 100,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One achievement per user (can't unlock same achievement twice)
  CONSTRAINT unique_user_achievement UNIQUE (user_id, achievement_id)
);

-- Indexes for user achievements
CREATE INDEX IF NOT EXISTS idx_user_achievements_user
  ON user_achievements (user_id, unlocked_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement
  ON user_achievements (achievement_id);

-- =============================================================================
-- USER PREFERENCES TABLE
-- Stores user display and privacy preferences
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User identification
  user_id UUID NOT NULL UNIQUE,

  -- Privacy preferences
  anonymous_contributions BOOLEAN NOT NULL DEFAULT FALSE,
  show_on_leaderboard BOOLEAN NOT NULL DEFAULT TRUE,

  -- Display preferences
  achievement_style TEXT NOT NULL DEFAULT 'professional'
    CHECK (achievement_style IN ('professional', 'gamified')),
  show_team_comparison BOOLEAN NOT NULL DEFAULT TRUE,
  show_xp_progress BOOLEAN NOT NULL DEFAULT TRUE,

  -- Notification preferences
  email_achievements BOOLEAN NOT NULL DEFAULT TRUE,
  email_weekly_summary BOOLEAN NOT NULL DEFAULT TRUE,

  -- Tier context (for display customization)
  current_tier TEXT DEFAULT 'basic' CHECK (current_tier IN ('basic', 'pro', 'enterprise')),

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for preferences lookup
CREATE INDEX IF NOT EXISTS idx_user_preferences_user
  ON user_preferences (user_id);

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Function to record an analysis (enforces 5 PR limit)
CREATE OR REPLACE FUNCTION record_analysis(
  p_user_id UUID,
  p_org_id UUID,
  p_pr_number INTEGER,
  p_repository TEXT,
  p_score INTEGER,
  p_decision TEXT,
  p_issues_found INTEGER,
  p_issues_fixed INTEGER,
  p_time_saved_minutes FLOAT,
  p_cost_saved_dollars FLOAT
)
RETURNS UUID AS $$
DECLARE
  v_analysis_id UUID;
BEGIN
  -- Insert new analysis
  INSERT INTO analysis_history (
    user_id, org_id, pr_number, repository, score, decision,
    issues_found, issues_fixed, time_saved_minutes, cost_saved_dollars
  )
  VALUES (
    p_user_id, p_org_id, p_pr_number, p_repository, p_score, p_decision,
    p_issues_found, p_issues_fixed, p_time_saved_minutes, p_cost_saved_dollars
  )
  RETURNING id INTO v_analysis_id;

  -- Cleanup: Keep only last 5 PRs per user
  DELETE FROM analysis_history
  WHERE user_id = p_user_id
    AND id NOT IN (
      SELECT id FROM analysis_history
      WHERE user_id = p_user_id
      ORDER BY analysis_date DESC
      LIMIT 5
    );

  RETURN v_analysis_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update skill scores with trend calculation
CREATE OR REPLACE FUNCTION update_skill_scores(
  p_user_id UUID,
  p_security INTEGER,
  p_quality INTEGER,
  p_performance INTEGER,
  p_architecture INTEGER,
  p_dependency INTEGER
)
RETURNS VOID AS $$
DECLARE
  v_prev RECORD;
  v_overall INTEGER;
BEGIN
  -- Calculate overall as weighted average
  v_overall := (
    p_security * 0.25 +
    p_quality * 0.25 +
    p_performance * 0.20 +
    p_architecture * 0.15 +
    p_dependency * 0.15
  )::INTEGER;

  -- Get previous scores for trend calculation
  SELECT * INTO v_prev
  FROM skill_scores
  WHERE user_id = p_user_id
  ORDER BY date DESC
  LIMIT 1;

  -- Insert or update today's scores
  INSERT INTO skill_scores (
    user_id, date,
    security_score, code_quality_score, performance_score,
    architecture_score, dependency_score, overall_score,
    security_trend, quality_trend, performance_trend, architecture_trend
  )
  VALUES (
    p_user_id, CURRENT_DATE,
    p_security, p_quality, p_performance, p_architecture, p_dependency, v_overall,
    COALESCE(p_security - v_prev.security_score, 0),
    COALESCE(p_quality - v_prev.code_quality_score, 0),
    COALESCE(p_performance - v_prev.performance_score, 0),
    COALESCE(p_architecture - v_prev.architecture_score, 0)
  )
  ON CONFLICT (user_id, date) DO UPDATE SET
    security_score = EXCLUDED.security_score,
    code_quality_score = EXCLUDED.code_quality_score,
    performance_score = EXCLUDED.performance_score,
    architecture_score = EXCLUDED.architecture_score,
    dependency_score = EXCLUDED.dependency_score,
    overall_score = EXCLUDED.overall_score,
    security_trend = EXCLUDED.security_trend,
    quality_trend = EXCLUDED.quality_trend,
    performance_trend = EXCLUDED.performance_trend,
    architecture_trend = EXCLUDED.architecture_trend;
END;
$$ LANGUAGE plpgsql;

-- Function to unlock an achievement
CREATE OR REPLACE FUNCTION unlock_achievement(
  p_user_id UUID,
  p_achievement_id TEXT,
  p_pr_number INTEGER DEFAULT NULL,
  p_repository TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  -- Check if already unlocked
  SELECT EXISTS(
    SELECT 1 FROM user_achievements
    WHERE user_id = p_user_id AND achievement_id = p_achievement_id
  ) INTO v_exists;

  IF v_exists THEN
    RETURN FALSE;  -- Already unlocked
  END IF;

  -- Unlock the achievement
  INSERT INTO user_achievements (
    user_id, achievement_id, pr_number, repository
  )
  VALUES (
    p_user_id, p_achievement_id, p_pr_number, p_repository
  );

  RETURN TRUE;  -- Newly unlocked
END;
$$ LANGUAGE plpgsql;

-- Function to get user progress summary
CREATE OR REPLACE FUNCTION get_user_progress_summary(p_user_id UUID)
RETURNS TABLE (
  total_analyses BIGINT,
  avg_score NUMERIC,
  total_issues_fixed BIGINT,
  total_time_saved_hours NUMERIC,
  total_cost_saved NUMERIC,
  achievement_count BIGINT,
  total_xp BIGINT,
  current_tier TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM analysis_history WHERE user_id = p_user_id)::BIGINT,
    (SELECT ROUND(AVG(score)::NUMERIC, 1) FROM analysis_history WHERE user_id = p_user_id),
    (SELECT COALESCE(SUM(issues_fixed), 0) FROM analysis_history WHERE user_id = p_user_id)::BIGINT,
    (SELECT ROUND(COALESCE(SUM(time_saved_minutes), 0) / 60.0, 1) FROM analysis_history WHERE user_id = p_user_id),
    (SELECT ROUND(COALESCE(SUM(cost_saved_dollars), 0)::NUMERIC, 2) FROM analysis_history WHERE user_id = p_user_id),
    (SELECT COUNT(*) FROM user_achievements WHERE user_id = p_user_id)::BIGINT,
    (SELECT COALESCE(SUM(ad.xp_value), 0)
     FROM user_achievements ua
     JOIN achievement_definitions ad ON ad.id = ua.achievement_id
     WHERE ua.user_id = p_user_id)::BIGINT,
    (SELECT COALESCE(up.current_tier, 'basic') FROM user_preferences up WHERE up.user_id = p_user_id);
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get or create user preferences
CREATE OR REPLACE FUNCTION get_or_create_user_preferences(p_user_id UUID)
RETURNS user_preferences AS $$
DECLARE
  v_prefs user_preferences;
BEGIN
  SELECT * INTO v_prefs FROM user_preferences WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    INSERT INTO user_preferences (user_id)
    VALUES (p_user_id)
    RETURNING * INTO v_prefs;
  END IF;

  RETURN v_prefs;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- VIEWS
-- =============================================================================

-- View: User progress over last 5 PRs
CREATE OR REPLACE VIEW user_progress_trend AS
SELECT
  ah.user_id,
  ah.analysis_date,
  ah.pr_number,
  ah.repository,
  ah.score,
  ah.issues_found,
  ah.issues_fixed,
  ah.time_saved_minutes,
  LAG(ah.score) OVER (PARTITION BY ah.user_id ORDER BY ah.analysis_date) AS prev_score,
  ah.score - LAG(ah.score) OVER (PARTITION BY ah.user_id ORDER BY ah.analysis_date) AS score_change
FROM analysis_history ah
ORDER BY ah.user_id, ah.analysis_date DESC;

-- View: Achievement leaderboard
CREATE OR REPLACE VIEW achievement_leaderboard AS
SELECT
  ua.user_id,
  COUNT(ua.id) AS achievement_count,
  SUM(ad.xp_value) AS total_xp,
  COUNT(*) FILTER (WHERE ad.tier = 'legendary') AS legendary_count,
  COUNT(*) FILTER (WHERE ad.tier = 'epic') AS epic_count,
  ROW_NUMBER() OVER (ORDER BY SUM(ad.xp_value) DESC) AS rank
FROM user_achievements ua
JOIN achievement_definitions ad ON ad.id = ua.achievement_id
GROUP BY ua.user_id
ORDER BY total_xp DESC;

-- =============================================================================
-- SEED ACHIEVEMENT DEFINITIONS
-- =============================================================================

INSERT INTO achievement_definitions (id, name, description, category, tier, criteria, professional_text, gamified_text, xp_value)
VALUES
  -- Security achievements
  ('security-guardian', 'Security Guardian', 'Maintain zero security vulnerabilities across 10 consecutive PRs', 'security', 'rare',
   '{"type": "consecutive_clean_prs", "category": "security", "count": 10}'::JSONB,
   'Certified Security Specialist - Maintained flawless security standards across 10 consecutive reviews',
   'You''ve vanquished 50 security demons! +100 XP | Unlocked: Shadow Shield ability',
   100),

  ('first-blood', 'First Security Fix', 'Fix your first security vulnerability', 'security', 'common',
   '{"type": "first_fix", "category": "security"}'::JSONB,
   'Security Awareness - Successfully addressed first security concern',
   'First Blood! You''ve slain your first security beast! +25 XP',
   25),

  ('vulnerability-hunter', 'Vulnerability Hunter', 'Fix 50 security vulnerabilities', 'security', 'epic',
   '{"type": "total_fixes", "category": "security", "count": 50}'::JSONB,
   'Senior Security Analyst - Remediated 50 security vulnerabilities',
   'Master Hunter! 50 vulnerabilities eliminated! +200 XP | Next: Legendary Defender (100)',
   200),

  -- Quality achievements
  ('quality-champion', 'Quality Champion', 'Achieve 90+ score on 5 consecutive PRs', 'quality', 'rare',
   '{"type": "consecutive_high_score", "threshold": 90, "count": 5}'::JSONB,
   'Code Quality Expert - Maintained excellence across 5 consecutive reviews',
   'Quality Champion! 5 perfect runs! +100 XP',
   100),

  ('zero-issues', 'Flawless Code', 'Submit a PR with zero issues found', 'quality', 'rare',
   '{"type": "zero_issues_pr"}'::JSONB,
   'Perfect Review - Submitted flawless code with no issues detected',
   'Flawless Victory! A perfect PR! +75 XP',
   75),

  -- Performance achievements
  ('speed-demon', 'Speed Demon', 'Fix 20 issues in under 60 seconds', 'performance', 'epic',
   '{"type": "fast_fixes", "count": 20, "time_limit_seconds": 60}'::JSONB,
   'Rapid Response Certified - Demonstrated exceptional fix velocity',
   'Speed Demon! 20 fixes in a flash! +200 XP | Next: Legendary Fixer (30 issues)',
   200),

  -- Community achievements
  ('community-helper', 'Community Helper', 'Have your patterns used by 10 other developers', 'community', 'rare',
   '{"type": "pattern_users", "count": 10}'::JSONB,
   'Community Contributor - Patterns adopted by 10 fellow developers',
   'Community Hero! Your patterns helped 10 devs! +100 XP',
   100),

  ('pattern-master', 'Pattern Master', 'Contribute 25 fix patterns', 'community', 'epic',
   '{"type": "patterns_contributed", "count": 25}'::JSONB,
   'Pattern Engineering Expert - Contributed 25 reusable fix patterns',
   'Pattern Master! 25 patterns created! +200 XP',
   200),

  -- Milestone achievements
  ('early-adopter', 'Early Adopter', 'Complete first analysis', 'milestone', 'common',
   '{"type": "first_analysis"}'::JSONB,
   'CodeQual Onboarded - Successfully completed first code analysis',
   'Welcome to CodeQual! First analysis complete! +10 XP',
   10),

  ('centurion', 'Centurion', 'Complete 100 analyses', 'milestone', 'legendary',
   '{"type": "total_analyses", "count": 100}'::JSONB,
   'Veteran Analyst - Completed 100 code reviews with CodeQual',
   'LEGENDARY: Centurion! 100 battles won! +500 XP',
   500)

ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE analysis_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievement_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Service role has full access
CREATE POLICY "Service role full access analysis" ON analysis_history
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access skills" ON skill_scores
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access achievements" ON achievement_definitions
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access user_achievements" ON user_achievements
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access preferences" ON user_preferences
  FOR ALL USING (auth.role() = 'service_role');

-- Everyone can read achievement definitions
CREATE POLICY "Public read achievement definitions" ON achievement_definitions
  FOR SELECT USING (true);

-- Users can read their own data
CREATE POLICY "Read own analysis history" ON analysis_history
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Read own skill scores" ON skill_scores
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Read own achievements" ON user_achievements
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Manage own preferences" ON user_preferences
  FOR ALL USING (user_id = auth.uid());

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE analysis_history IS 'Stores last 5 PR analyses per user for progress tracking';
COMMENT ON TABLE skill_scores IS 'Daily skill progression scores (3 month retention)';
COMMENT ON TABLE achievement_definitions IS 'Master list of all possible achievements';
COMMENT ON TABLE user_achievements IS 'Tracks achievements unlocked by each user';
COMMENT ON TABLE user_preferences IS 'User display and privacy preferences';
COMMENT ON FUNCTION record_analysis IS 'Records an analysis and enforces 5 PR retention limit';
COMMENT ON FUNCTION update_skill_scores IS 'Updates skill scores with automatic trend calculation';
COMMENT ON FUNCTION unlock_achievement IS 'Unlocks an achievement for a user (idempotent)';
