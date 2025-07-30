-- Migration: Add comprehensive scoring and skill tracking system
-- Date: 2025-07-30
-- Description: Implements repository scoring history, issue aging tracking, and user skill progression

-- Repository scoring history table
CREATE TABLE IF NOT EXISTS repository_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  analysis_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  overall_score NUMERIC(5,2) NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  
  -- Role-based scores
  security_score NUMERIC(5,2) NOT NULL CHECK (security_score >= 0 AND security_score <= 100),
  performance_score NUMERIC(5,2) NOT NULL CHECK (performance_score >= 0 AND performance_score <= 100),
  quality_score NUMERIC(5,2) NOT NULL CHECK (quality_score >= 0 AND quality_score <= 100),
  architecture_score NUMERIC(5,2) NOT NULL CHECK (architecture_score >= 0 AND architecture_score <= 100),
  dependencies_score NUMERIC(5,2) NOT NULL CHECK (dependencies_score >= 0 AND dependencies_score <= 100),
  documentation_score NUMERIC(5,2) NOT NULL CHECK (documentation_score >= 0 AND documentation_score <= 100),
  
  -- Score breakdown
  base_score NUMERIC(5,2) NOT NULL,
  aging_penalty NUMERIC(5,2) NOT NULL DEFAULT 0,
  improvement_bonus NUMERIC(5,2) NOT NULL DEFAULT 0,
  
  -- Context
  commit_sha TEXT NOT NULL,
  pr_number INTEGER,
  branch_name TEXT,
  health_status TEXT NOT NULL CHECK (health_status IN ('excellent', 'good', 'fair', 'poor', 'critical')),
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Issue tracking for aging calculations
CREATE TABLE IF NOT EXISTS issue_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  issue_id TEXT NOT NULL, -- e.g., "SEC-001"
  issue_hash TEXT NOT NULL, -- Hash of issue details for deduplication
  
  -- Issue details
  title TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  category TEXT NOT NULL CHECK (category IN ('security', 'performance', 'quality', 'architecture', 'dependencies', 'documentation')),
  file_path TEXT NOT NULL,
  line_number INTEGER,
  
  -- Tracking
  first_detected TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  last_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  fixed_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'fixed', 'moved', 'suppressed')),
  
  -- Aging
  age_days INTEGER GENERATED ALWAYS AS (
    CASE 
      WHEN status = 'active' THEN EXTRACT(DAY FROM NOW() - first_detected)::INTEGER
      ELSE EXTRACT(DAY FROM COALESCE(fixed_at, last_seen) - first_detected)::INTEGER
    END
  ) STORED,
  
  -- Impact
  score_impact NUMERIC(5,2) NOT NULL DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(repository_id, issue_hash)
);

-- Score trends for analysis
CREATE TABLE IF NOT EXISTS score_trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  period TEXT NOT NULL CHECK (period IN ('daily', 'weekly', 'monthly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Trend data
  average_score NUMERIC(5,2) NOT NULL,
  score_change NUMERIC(5,2) NOT NULL,
  trend_direction TEXT NOT NULL CHECK (trend_direction IN ('improving', 'declining', 'stable')),
  
  -- Category trends
  category_trends JSONB NOT NULL DEFAULT '{}',
  
  -- Context
  total_issues_fixed INTEGER NOT NULL DEFAULT 0,
  total_issues_introduced INTEGER NOT NULL DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(repository_id, period, period_start)
);

-- User skill tracking
CREATE TABLE IF NOT EXISTS user_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_category TEXT NOT NULL CHECK (skill_category IN ('security', 'performance', 'quality', 'architecture', 'dependencies', 'documentation')),
  
  -- Skill levels
  current_level NUMERIC(5,2) NOT NULL DEFAULT 50 CHECK (current_level >= 0 AND current_level <= 100),
  previous_level NUMERIC(5,2) DEFAULT 50,
  peak_level NUMERIC(5,2) DEFAULT 50,
  
  -- Statistics
  total_issues_fixed INTEGER NOT NULL DEFAULT 0,
  total_issues_introduced INTEGER NOT NULL DEFAULT 0,
  critical_issues_fixed INTEGER NOT NULL DEFAULT 0,
  average_fix_time_hours NUMERIC(10,2),
  last_activity TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, skill_category)
);

-- Skill history for progression tracking
CREATE TABLE IF NOT EXISTS user_skill_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_category TEXT NOT NULL,
  
  -- Skill change
  previous_level NUMERIC(5,2) NOT NULL,
  new_level NUMERIC(5,2) NOT NULL,
  level_change NUMERIC(5,2) NOT NULL,
  change_reason TEXT NOT NULL,
  
  -- Context
  pr_number INTEGER,
  repository_id UUID REFERENCES repositories(id),
  issues_fixed_count INTEGER NOT NULL DEFAULT 0,
  issues_introduced_count INTEGER NOT NULL DEFAULT 0,
  complexity_score NUMERIC(5,2),
  
  -- Metadata
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Team skill aggregation
CREATE TABLE IF NOT EXISTS team_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  repository_id UUID REFERENCES repositories(id) ON DELETE CASCADE,
  skill_category TEXT NOT NULL,
  
  -- Team metrics
  average_level NUMERIC(5,2) NOT NULL,
  min_level NUMERIC(5,2) NOT NULL,
  max_level NUMERIC(5,2) NOT NULL,
  std_deviation NUMERIC(5,2),
  
  -- Top performers
  top_performer_id UUID REFERENCES users(id),
  expert_count INTEGER NOT NULL DEFAULT 0, -- Users with 80+ skill
  
  -- Gaps
  has_gap BOOLEAN NOT NULL DEFAULT FALSE, -- Average < 60
  gap_severity TEXT CHECK (gap_severity IN ('critical', 'high', 'medium', 'low')),
  
  -- Metadata
  member_count INTEGER NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(team_id, repository_id, skill_category, recorded_at)
);

-- Skill milestones and achievements
CREATE TABLE IF NOT EXISTS skill_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  milestone_type TEXT NOT NULL,
  milestone_category TEXT NOT NULL,
  
  -- Achievement details
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  achieved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Context
  pr_number INTEGER,
  repository_id UUID REFERENCES repositories(id),
  skill_level_at_achievement NUMERIC(5,2),
  
  -- Metadata
  rarity TEXT CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
  points_awarded INTEGER DEFAULT 0,
  
  UNIQUE(user_id, milestone_type, milestone_category)
);

-- Team skill trends over time
CREATE TABLE IF NOT EXISTS team_skill_trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  period TEXT NOT NULL CHECK (period IN ('daily', 'weekly', 'monthly')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  -- Overall metrics
  overall_trend TEXT NOT NULL CHECK (overall_trend IN ('improving', 'declining', 'stable')),
  overall_change NUMERIC(5,2) NOT NULL,
  
  -- Category-specific trends (JSONB for flexibility)
  skill_trends JSONB NOT NULL DEFAULT '{}',
  /* Example structure:
  {
    "security": {
      "start_average": 65.5,
      "end_average": 72.3,
      "change": 6.8,
      "trend": "improving",
      "top_improvers": [
        {"user_id": "uuid", "improvement": 15.0}
      ],
      "struggling_members": [
        {"user_id": "uuid", "decline": 5.0}
      ]
    }
  }
  */
  
  -- Insights
  recommendations TEXT[] DEFAULT '{}',
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(team_id, period, start_date)
);

-- Team skill snapshots for historical tracking
CREATE TABLE IF NOT EXISTS team_skill_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  
  -- Member skills at this point in time
  member_skills JSONB NOT NULL,
  /* Example structure:
  [
    {
      "user_id": "uuid",
      "skills": {
        "security": 75,
        "performance": 80,
        "quality": 65
      }
    }
  ]
  */
  
  -- Aggregated metrics
  member_count INTEGER NOT NULL,
  skill_averages JSONB NOT NULL,
  skill_gaps TEXT[] DEFAULT '{}',
  skill_strengths TEXT[] DEFAULT '{}',
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(team_id, snapshot_date)
);

-- Indexes for performance
CREATE INDEX idx_repository_scores_repo_date ON repository_scores(repository_id, analysis_date DESC);
CREATE INDEX idx_repository_scores_date ON repository_scores(analysis_date DESC);
CREATE INDEX idx_issue_tracking_repo_status ON issue_tracking(repository_id, status);
CREATE INDEX idx_issue_tracking_age ON issue_tracking(repository_id, age_days) WHERE status = 'active';
CREATE INDEX idx_score_trends_repo_period ON score_trends(repository_id, period, period_start DESC);
CREATE INDEX idx_user_skills_user_category ON user_skills(user_id, skill_category);
CREATE INDEX idx_user_skills_level ON user_skills(skill_category, current_level DESC);
CREATE INDEX idx_user_skill_history_user_date ON user_skill_history(user_id, recorded_at DESC);
CREATE INDEX idx_team_skills_team_date ON team_skills(team_id, recorded_at DESC);
CREATE INDEX idx_skill_milestones_user ON skill_milestones(user_id, achieved_at DESC);
CREATE INDEX idx_team_skill_trends_team_period ON team_skill_trends(team_id, period, start_date DESC);
CREATE INDEX idx_team_skill_snapshots_team_date ON team_skill_snapshots(team_id, snapshot_date DESC);

-- Row Level Security
ALTER TABLE repository_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_skill_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_skill_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_skill_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies (users can see their own data and public repository data)
CREATE POLICY "Users can view repository scores" ON repository_scores
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM repositories r
      WHERE r.id = repository_scores.repository_id
      AND (r.is_public = true OR r.owner_id = auth.uid())
    )
  );

CREATE POLICY "Users can view their own skills" ON user_skills
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can view their own skill history" ON user_skill_history
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can view their team skills" ON team_skills
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_skills.team_id
      AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their own milestones" ON skill_milestones
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can view their team trends" ON team_skill_trends
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_skill_trends.team_id
      AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their team snapshots" ON team_skill_snapshots
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_skill_snapshots.team_id
      AND tm.user_id = auth.uid()
    )
  );

-- Functions for automatic updates
CREATE OR REPLACE FUNCTION update_user_skill_from_history()
RETURNS TRIGGER AS $$
BEGIN
  -- Update or insert the current skill level
  INSERT INTO user_skills (
    user_id, 
    skill_category, 
    current_level, 
    previous_level,
    total_issues_fixed,
    total_issues_introduced,
    last_activity
  )
  VALUES (
    NEW.user_id,
    NEW.skill_category,
    NEW.new_level,
    NEW.previous_level,
    NEW.issues_fixed_count,
    NEW.issues_introduced_count,
    NEW.recorded_at
  )
  ON CONFLICT (user_id, skill_category)
  DO UPDATE SET
    previous_level = user_skills.current_level,
    current_level = NEW.new_level,
    peak_level = GREATEST(user_skills.peak_level, NEW.new_level),
    total_issues_fixed = user_skills.total_issues_fixed + NEW.issues_fixed_count,
    total_issues_introduced = user_skills.total_issues_introduced + NEW.issues_introduced_count,
    last_activity = NEW.recorded_at,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_skill
AFTER INSERT ON user_skill_history
FOR EACH ROW
EXECUTE FUNCTION update_user_skill_from_history();

-- Function to calculate score trends
CREATE OR REPLACE FUNCTION calculate_score_trends(
  p_repository_id UUID,
  p_period TEXT
)
RETURNS VOID AS $$
DECLARE
  v_period_start DATE;
  v_period_end DATE;
  v_avg_score NUMERIC;
  v_prev_avg_score NUMERIC;
  v_score_change NUMERIC;
  v_trend_direction TEXT;
BEGIN
  -- Determine period boundaries
  CASE p_period
    WHEN 'daily' THEN
      v_period_end := CURRENT_DATE;
      v_period_start := v_period_end;
    WHEN 'weekly' THEN
      v_period_end := CURRENT_DATE;
      v_period_start := v_period_end - INTERVAL '6 days';
    WHEN 'monthly' THEN
      v_period_end := CURRENT_DATE;
      v_period_start := DATE_TRUNC('month', v_period_end);
  END CASE;
  
  -- Calculate average score for period
  SELECT AVG(overall_score) INTO v_avg_score
  FROM repository_scores
  WHERE repository_id = p_repository_id
    AND analysis_date >= v_period_start
    AND analysis_date <= v_period_end + INTERVAL '1 day';
  
  -- Get previous period average
  SELECT AVG(overall_score) INTO v_prev_avg_score
  FROM repository_scores
  WHERE repository_id = p_repository_id
    AND analysis_date >= v_period_start - INTERVAL '1 ' || p_period
    AND analysis_date < v_period_start;
  
  -- Calculate change and direction
  v_score_change := COALESCE(v_avg_score - v_prev_avg_score, 0);
  v_trend_direction := CASE
    WHEN v_score_change > 2 THEN 'improving'
    WHEN v_score_change < -2 THEN 'declining'
    ELSE 'stable'
  END;
  
  -- Insert or update trend
  INSERT INTO score_trends (
    repository_id,
    period,
    period_start,
    period_end,
    average_score,
    score_change,
    trend_direction
  )
  VALUES (
    p_repository_id,
    p_period,
    v_period_start,
    v_period_end,
    COALESCE(v_avg_score, 0),
    v_score_change,
    v_trend_direction
  )
  ON CONFLICT (repository_id, period, period_start)
  DO UPDATE SET
    average_score = EXCLUDED.average_score,
    score_change = EXCLUDED.score_change,
    trend_direction = EXCLUDED.trend_direction;
END;
$$ LANGUAGE plpgsql;

-- Function to create team skill snapshots
CREATE OR REPLACE FUNCTION create_team_skill_snapshot(
  p_team_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_member_skills JSONB;
  v_skill_averages JSONB;
  v_skill_gaps TEXT[];
  v_skill_strengths TEXT[];
  v_member_count INTEGER;
BEGIN
  -- Gather current member skills
  SELECT 
    COUNT(*),
    jsonb_agg(
      jsonb_build_object(
        'user_id', tm.user_id,
        'skills', (
          SELECT jsonb_object_agg(skill_category, current_level)
          FROM user_skills us
          WHERE us.user_id = tm.user_id
        )
      )
    )
  INTO v_member_count, v_member_skills
  FROM team_members tm
  WHERE tm.team_id = p_team_id
    AND tm.is_active = true;
  
  -- Calculate averages and identify gaps/strengths
  WITH skill_stats AS (
    SELECT 
      skill_category,
      AVG((member_skill->>'current_level')::numeric) as avg_level
    FROM team_members tm
    JOIN user_skills us ON us.user_id = tm.user_id
    WHERE tm.team_id = p_team_id
      AND tm.is_active = true
    GROUP BY skill_category
  )
  SELECT 
    jsonb_object_agg(skill_category, round(avg_level, 2)),
    array_agg(skill_category) FILTER (WHERE avg_level < 60),
    array_agg(skill_category) FILTER (WHERE avg_level >= 75)
  INTO v_skill_averages, v_skill_gaps, v_skill_strengths
  FROM skill_stats;
  
  -- Insert snapshot
  INSERT INTO team_skill_snapshots (
    team_id,
    snapshot_date,
    member_skills,
    member_count,
    skill_averages,
    skill_gaps,
    skill_strengths
  )
  VALUES (
    p_team_id,
    CURRENT_DATE,
    v_member_skills,
    v_member_count,
    COALESCE(v_skill_averages, '{}'::jsonb),
    COALESCE(v_skill_gaps, '{}'::text[]),
    COALESCE(v_skill_strengths, '{}'::text[])
  )
  ON CONFLICT (team_id, snapshot_date) 
  DO UPDATE SET
    member_skills = EXCLUDED.member_skills,
    member_count = EXCLUDED.member_count,
    skill_averages = EXCLUDED.skill_averages,
    skill_gaps = EXCLUDED.skill_gaps,
    skill_strengths = EXCLUDED.skill_strengths,
    created_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE repository_scores IS 'Historical tracking of repository quality scores with role-based breakdowns';
COMMENT ON TABLE issue_tracking IS 'Tracks individual issues over time including aging for penalty calculations';
COMMENT ON TABLE score_trends IS 'Aggregated score trends over different time periods';
COMMENT ON TABLE user_skills IS 'Current skill levels for users across different categories';
COMMENT ON TABLE user_skill_history IS 'Historical record of skill changes tied to specific PRs';
COMMENT ON TABLE team_skills IS 'Team-level skill aggregations for gap analysis';
COMMENT ON TABLE skill_milestones IS 'Achievement tracking for gamification and recognition';
COMMENT ON TABLE team_skill_trends IS 'Team skill trends over time with top performers and struggling members';
COMMENT ON TABLE team_skill_snapshots IS 'Point-in-time snapshots of team skills for historical analysis';