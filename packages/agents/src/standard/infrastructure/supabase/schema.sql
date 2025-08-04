-- Developer Skills Table
CREATE TABLE IF NOT EXISTS developer_skills (
  user_id TEXT PRIMARY KEY,  -- Changed to use user_id as primary key
  username TEXT NOT NULL,
  email TEXT,
  team_id TEXT,
  overall_score NUMERIC(5,2) DEFAULT 50.00,
  category_scores JSONB DEFAULT '{"security": 50, "performance": 50, "codeQuality": 50, "architecture": 50, "dependencies": 50}'::jsonb,
  level JSONB DEFAULT '{"current": "D", "numeric": 50, "title": "Beginner"}'::jsonb,
  trend JSONB DEFAULT '{"direction": "stable", "change": 0, "period": "new"}'::jsonb,
  total_prs INTEGER DEFAULT 0,
  issues_fixed JSONB DEFAULT '{"critical": 0, "high": 0, "medium": 0, "low": 0}'::jsonb,
  issues_introduced JSONB DEFAULT '{"critical": 0, "high": 0, "medium": 0, "low": 0}'::jsonb,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  archived BOOLEAN DEFAULT FALSE,
  archived_at TIMESTAMPTZ
);

-- Create indexes separately
CREATE INDEX IF NOT EXISTS idx_developer_skills_team_id ON developer_skills(team_id);
CREATE INDEX IF NOT EXISTS idx_developer_skills_overall_score ON developer_skills(overall_score DESC);
CREATE INDEX IF NOT EXISTS idx_developer_skills_archived ON developer_skills(archived);

-- Skill History Table (for tracking changes over time)
CREATE TABLE IF NOT EXISTS skill_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  pr_id TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  previous_score NUMERIC(5,2) NOT NULL,
  new_score NUMERIC(5,2) NOT NULL,
  score_change NUMERIC(5,2) GENERATED ALWAYS AS (new_score - previous_score) STORED,
  adjustments JSONB DEFAULT '[]'::jsonb,
  category_changes JSONB DEFAULT '{}'::jsonb,
  pr_metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Foreign key
  FOREIGN KEY (user_id) REFERENCES developer_skills(user_id) ON DELETE CASCADE,
  
  -- Indexes
  INDEX idx_skill_history_user_id ON skill_history(user_id),
  INDEX idx_skill_history_pr_id ON skill_history(pr_id),
  INDEX idx_skill_history_timestamp ON skill_history(timestamp DESC)
);

-- Teams Table
CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team Score Snapshots (for tracking team performance over time)
CREATE TABLE IF NOT EXISTS team_score_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id TEXT NOT NULL,
  snapshot_date DATE DEFAULT CURRENT_DATE,
  average_score NUMERIC(5,2) NOT NULL,
  member_count INTEGER NOT NULL,
  category_averages JSONB DEFAULT '{}'::jsonb,
  top_performers JSONB DEFAULT '[]'::jsonb,
  needs_improvement JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Foreign key
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  
  -- Unique constraint to ensure one snapshot per day per team
  UNIQUE(team_id, snapshot_date),
  
  -- Indexes
  INDEX idx_team_snapshots_team_id ON team_score_snapshots(team_id),
  INDEX idx_team_snapshots_date ON team_score_snapshots(snapshot_date DESC)
);

-- Function to update developer scores with proper handling
CREATE OR REPLACE FUNCTION update_developer_score(
  p_user_id TEXT,
  p_pr_id TEXT,
  p_new_score NUMERIC,
  p_category_changes JSONB,
  p_adjustments JSONB,
  p_issues_fixed JSONB,
  p_issues_introduced JSONB
) RETURNS VOID AS $$
DECLARE
  v_previous_score NUMERIC;
  v_existing_record BOOLEAN;
BEGIN
  -- Check if developer exists
  SELECT overall_score INTO v_previous_score
  FROM developer_skills
  WHERE user_id = p_user_id;
  
  v_existing_record := FOUND;
  
  IF v_existing_record THEN
    -- Update existing developer
    UPDATE developer_skills
    SET 
      overall_score = p_new_score,
      category_scores = category_scores || p_category_changes,
      level = jsonb_build_object(
        'current', CASE
          WHEN p_new_score >= 95 THEN 'A+'
          WHEN p_new_score >= 90 THEN 'A'
          WHEN p_new_score >= 85 THEN 'A-'
          WHEN p_new_score >= 80 THEN 'B+'
          WHEN p_new_score >= 75 THEN 'B'
          WHEN p_new_score >= 70 THEN 'B-'
          WHEN p_new_score >= 65 THEN 'C+'
          WHEN p_new_score >= 60 THEN 'C'
          WHEN p_new_score >= 50 THEN 'D'
          ELSE 'F'
        END,
        'numeric', p_new_score,
        'title', CASE
          WHEN p_new_score >= 90 THEN 'Expert'
          WHEN p_new_score >= 80 THEN 'Senior'
          WHEN p_new_score >= 70 THEN 'Experienced'
          WHEN p_new_score >= 60 THEN 'Competent'
          WHEN p_new_score >= 50 THEN 'Junior'
          ELSE 'Beginner'
        END
      ),
      trend = jsonb_build_object(
        'direction', CASE
          WHEN p_new_score > v_previous_score THEN 'up'
          WHEN p_new_score < v_previous_score THEN 'down'
          ELSE 'stable'
        END,
        'change', p_new_score - v_previous_score,
        'period', 'recent'
      ),
      total_prs = total_prs + 1,
      issues_fixed = issues_fixed || p_issues_fixed,
      issues_introduced = issues_introduced || p_issues_introduced,
      last_updated = NOW()
    WHERE user_id = p_user_id;
  ELSE
    -- Insert new developer with initial score
    v_previous_score := 50.00; -- Base score for new developers
    
    INSERT INTO developer_skills (
      user_id,
      username,
      overall_score,
      category_scores,
      level,
      trend,
      total_prs,
      issues_fixed,
      issues_introduced
    ) VALUES (
      p_user_id,
      p_user_id, -- Username would be updated separately
      p_new_score,
      p_category_changes,
      jsonb_build_object(
        'current', CASE
          WHEN p_new_score >= 95 THEN 'A+'
          WHEN p_new_score >= 90 THEN 'A'
          WHEN p_new_score >= 85 THEN 'A-'
          WHEN p_new_score >= 80 THEN 'B+'
          WHEN p_new_score >= 75 THEN 'B'
          WHEN p_new_score >= 70 THEN 'B-'
          WHEN p_new_score >= 65 THEN 'C+'
          WHEN p_new_score >= 60 THEN 'C'
          WHEN p_new_score >= 50 THEN 'D'
          ELSE 'F'
        END,
        'numeric', p_new_score,
        'title', CASE
          WHEN p_new_score >= 90 THEN 'Expert'
          WHEN p_new_score >= 80 THEN 'Senior'
          WHEN p_new_score >= 70 THEN 'Experienced'
          WHEN p_new_score >= 60 THEN 'Competent'
          WHEN p_new_score >= 50 THEN 'Junior'
          ELSE 'Beginner'
        END
      ),
      jsonb_build_object(
        'direction', 'new',
        'change', 0,
        'period', 'first_pr'
      ),
      1,
      p_issues_fixed,
      p_issues_introduced
    );
  END IF;
  
  -- Insert history record
  INSERT INTO skill_history (
    user_id,
    pr_id,
    previous_score,
    new_score,
    adjustments,
    category_changes
  ) VALUES (
    p_user_id,
    p_pr_id,
    v_previous_score,
    p_new_score,
    p_adjustments,
    p_category_changes
  );
END;
$$ LANGUAGE plpgsql;

-- Row Level Security (RLS)
ALTER TABLE developer_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_score_snapshots ENABLE ROW LEVEL SECURITY;

-- Policies for service role (full access)
CREATE POLICY "Service role has full access to developer_skills" ON developer_skills
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role has full access to skill_history" ON skill_history
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role has full access to teams" ON teams
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role has full access to team_score_snapshots" ON team_score_snapshots
  FOR ALL TO service_role USING (true) WITH CHECK (true);