-- Migration: Create skill tracking tables
-- This migration adds tables for tracking developer skills based on PR analysis

-- Create skill categories table
CREATE TABLE IF NOT EXISTS skill_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  parent_id UUID REFERENCES skill_categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default skill categories
INSERT INTO skill_categories (name, description) VALUES 
  ('security', 'Security best practices and vulnerability prevention'),
  ('codeQuality', 'Code maintainability, readability, and standards'),
  ('architecture', 'System design, patterns, and architectural decisions'),
  ('performance', 'Performance optimization and efficiency'),
  ('dependency', 'Dependency management and security')
ON CONFLICT (name) DO NOTHING;

-- Create developer skills table
CREATE TABLE IF NOT EXISTS developer_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES skill_categories(id) ON DELETE CASCADE,
  level INTEGER NOT NULL CHECK (level >= 1 AND level <= 10),
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, category_id)
);

-- Create skill history table
CREATE TABLE IF NOT EXISTS skill_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID NOT NULL REFERENCES developer_skills(id) ON DELETE CASCADE,
  level INTEGER NOT NULL CHECK (level >= 1 AND level <= 10),
  evidence_type TEXT NOT NULL,
  evidence_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_developer_skills_user_id ON developer_skills(user_id);
CREATE INDEX idx_developer_skills_category_id ON developer_skills(category_id);
CREATE INDEX idx_skill_history_skill_id ON skill_history(skill_id);
CREATE INDEX idx_skill_history_created_at ON skill_history(created_at DESC);

-- Enable Row Level Security
ALTER TABLE skill_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE developer_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for skill_categories (public read)
CREATE POLICY "Everyone can view skill categories" ON skill_categories
  FOR SELECT
  USING (true);

-- Create RLS policies for developer_skills
CREATE POLICY "Users can view own skills" ON developer_skills
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own skills" ON developer_skills
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own skills" ON developer_skills
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for skill_history
CREATE POLICY "Users can view own skill history" ON skill_history
  FOR SELECT
  USING (
    skill_id IN (
      SELECT id FROM developer_skills 
      WHERE user_id = auth.uid()
    )
  );

-- Create function to update last_updated timestamp
CREATE OR REPLACE FUNCTION update_developer_skills_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for last_updated
CREATE TRIGGER developer_skills_updated_at
  BEFORE UPDATE ON developer_skills
  FOR EACH ROW
  EXECUTE FUNCTION update_developer_skills_updated_at();

-- Create view for user skills with category names
CREATE OR REPLACE VIEW user_skills_overview AS
SELECT 
  ds.id,
  ds.user_id,
  ds.category_id,
  sc.name as category_name,
  sc.description as category_description,
  ds.level,
  ds.last_updated,
  ds.created_at,
  (
    SELECT COUNT(*)
    FROM skill_history sh
    WHERE sh.skill_id = ds.id
  ) as history_count,
  (
    SELECT json_build_object(
      'latest_level', sh.level,
      'evidence_type', sh.evidence_type,
      'evidence_id', sh.evidence_id,
      'timestamp', sh.created_at
    )
    FROM skill_history sh
    WHERE sh.skill_id = ds.id
    ORDER BY sh.created_at DESC
    LIMIT 1
  ) as latest_update
FROM developer_skills ds
JOIN skill_categories sc ON ds.category_id = sc.id;

-- Grant permissions on the view
GRANT SELECT ON user_skills_overview TO authenticated;

-- Create function to initialize user skills
CREATE OR REPLACE FUNCTION initialize_user_skills(p_user_id UUID)
RETURNS void AS $$
DECLARE
  category RECORD;
BEGIN
  -- Insert initial skill entries for all categories
  FOR category IN SELECT id FROM skill_categories WHERE parent_id IS NULL
  LOOP
    INSERT INTO developer_skills (user_id, category_id, level)
    VALUES (p_user_id, category.id, 3) -- Start at level 3 (beginner)
    ON CONFLICT (user_id, category_id) DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get skill recommendations
CREATE OR REPLACE FUNCTION get_skill_recommendations(p_user_id UUID)
RETURNS TABLE (
  category_name TEXT,
  current_level INTEGER,
  recommendation TEXT,
  priority TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sc.name,
    ds.level,
    CASE 
      WHEN ds.level < 4 THEN 'Build foundational knowledge through structured learning'
      WHEN ds.level BETWEEN 4 AND 6 THEN 'Practice with real-world projects and code reviews'
      WHEN ds.level BETWEEN 7 AND 8 THEN 'Deepen expertise through advanced techniques'
      ELSE 'Consider mentoring others to solidify mastery'
    END as recommendation,
    CASE 
      WHEN ds.level < 4 THEN 'high'
      WHEN ds.level BETWEEN 4 AND 6 THEN 'medium'
      ELSE 'low'
    END as priority
  FROM developer_skills ds
  JOIN skill_categories sc ON ds.category_id = sc.id
  WHERE ds.user_id = p_user_id
  ORDER BY ds.level ASC, sc.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON TABLE skill_categories IS 'Defines skill categories for developer competencies';
COMMENT ON TABLE developer_skills IS 'Tracks individual developer skill levels';
COMMENT ON TABLE skill_history IS 'Historical record of skill level changes';
COMMENT ON COLUMN developer_skills.level IS 'Skill level from 1 (novice) to 10 (expert)';
COMMENT ON COLUMN skill_history.evidence_type IS 'Type of evidence: pr_analysis, educational_engagement, etc.';
COMMENT ON COLUMN skill_history.evidence_id IS 'Reference to the evidence source (PR number, content ID, etc.)';