-- Migration: Add issue resolution tracking for skill points
-- This migration adds tables to track when repository issues are fixed by users or teammates

-- Create issue resolution tracking table
CREATE TABLE IF NOT EXISTS issue_resolutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository TEXT NOT NULL,
  issue_id TEXT NOT NULL,
  issue_category TEXT NOT NULL,
  issue_severity TEXT NOT NULL CHECK (issue_severity IN ('critical', 'high', 'medium', 'low')),
  resolved_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resolved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  pr_number INTEGER,
  skill_points_awarded DECIMAL(4,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(repository, issue_id)
);

-- Create table to track active degradations
CREATE TABLE IF NOT EXISTS skill_degradations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  repository TEXT NOT NULL,
  issue_id TEXT NOT NULL,
  issue_category TEXT NOT NULL,
  issue_severity TEXT NOT NULL CHECK (issue_severity IN ('critical', 'high', 'medium', 'low')),
  degradation_points DECIMAL(4,2) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  deactivated_at TIMESTAMPTZ,
  deactivation_reason TEXT, -- 'resolved_by_user', 'resolved_by_teammate'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, repository, issue_id)
);

-- Create indexes
CREATE INDEX idx_issue_resolutions_repository ON issue_resolutions(repository);
CREATE INDEX idx_issue_resolutions_resolved_by ON issue_resolutions(resolved_by_user_id);
CREATE INDEX idx_issue_resolutions_resolved_at ON issue_resolutions(resolved_at DESC);
CREATE INDEX idx_skill_degradations_user_id ON skill_degradations(user_id);
CREATE INDEX idx_skill_degradations_active ON skill_degradations(is_active) WHERE is_active = true;
CREATE INDEX idx_skill_degradations_repository ON skill_degradations(repository);

-- Enable Row Level Security
ALTER TABLE issue_resolutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_degradations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for issue_resolutions
CREATE POLICY "Users can view resolutions in their repositories" ON issue_resolutions
  FOR SELECT
  USING (
    repository IN (
      SELECT DISTINCT repository 
      FROM pull_requests 
      WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "System can insert resolutions" ON issue_resolutions
  FOR INSERT
  WITH CHECK (true); -- Only backend service will insert

-- Create RLS policies for skill_degradations
CREATE POLICY "Users can view own degradations" ON skill_degradations
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can manage degradations" ON skill_degradations
  FOR ALL
  USING (true)
  WITH CHECK (true); -- Only backend service will manage

-- Function to handle issue resolution
CREATE OR REPLACE FUNCTION handle_issue_resolution(
  p_repository TEXT,
  p_issue_id TEXT,
  p_issue_category TEXT,
  p_issue_severity TEXT,
  p_resolved_by_user_id UUID,
  p_pr_number INTEGER DEFAULT NULL
)
RETURNS DECIMAL AS $$
DECLARE
  v_skill_points DECIMAL(4,2);
  v_degradation RECORD;
BEGIN
  -- Calculate skill points based on severity
  v_skill_points := CASE p_issue_severity
    WHEN 'critical' THEN 2.0
    WHEN 'high' THEN 1.5
    WHEN 'medium' THEN 0.8
    WHEN 'low' THEN 0.3
    ELSE 0
  END;

  -- Insert resolution record
  INSERT INTO issue_resolutions (
    repository, issue_id, issue_category, issue_severity,
    resolved_by_user_id, pr_number, skill_points_awarded
  ) VALUES (
    p_repository, p_issue_id, p_issue_category, p_issue_severity,
    p_resolved_by_user_id, p_pr_number, v_skill_points
  )
  ON CONFLICT (repository, issue_id) DO UPDATE
  SET 
    resolved_by_user_id = EXCLUDED.resolved_by_user_id,
    resolved_at = NOW(),
    pr_number = EXCLUDED.pr_number,
    skill_points_awarded = EXCLUDED.skill_points_awarded;

  -- Deactivate all degradations for this issue
  FOR v_degradation IN 
    SELECT * FROM skill_degradations 
    WHERE repository = p_repository 
    AND issue_id = p_issue_id 
    AND is_active = true
  LOOP
    UPDATE skill_degradations
    SET 
      is_active = false,
      deactivated_at = NOW(),
      deactivation_reason = CASE 
        WHEN v_degradation.user_id = p_resolved_by_user_id THEN 'resolved_by_user'
        ELSE 'resolved_by_teammate'
      END
    WHERE id = v_degradation.id;
  END LOOP;

  RETURN v_skill_points;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to apply degradation for unresolved issues
CREATE OR REPLACE FUNCTION apply_issue_degradation(
  p_user_id UUID,
  p_repository TEXT,
  p_issue_id TEXT,
  p_issue_category TEXT,
  p_issue_severity TEXT
)
RETURNS DECIMAL AS $$
DECLARE
  v_degradation_points DECIMAL(4,2);
BEGIN
  -- Calculate degradation based on severity
  v_degradation_points := CASE p_issue_severity
    WHEN 'critical' THEN 0.5
    WHEN 'high' THEN 0.3
    WHEN 'medium' THEN 0.15
    WHEN 'low' THEN 0.1
    ELSE 0
  END;

  -- Insert or update degradation record
  INSERT INTO skill_degradations (
    user_id, repository, issue_id, issue_category, 
    issue_severity, degradation_points
  ) VALUES (
    p_user_id, p_repository, p_issue_id, p_issue_category,
    p_issue_severity, v_degradation_points
  )
  ON CONFLICT (user_id, repository, issue_id) 
  DO UPDATE SET
    is_active = true,
    degradation_points = EXCLUDED.degradation_points
  WHERE skill_degradations.is_active = false; -- Reactivate if previously deactivated

  RETURN v_degradation_points;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get active degradations for a user
CREATE OR REPLACE FUNCTION get_active_degradations(p_user_id UUID)
RETURNS TABLE (
  repository TEXT,
  issue_count BIGINT,
  total_degradation DECIMAL,
  by_severity JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sd.repository,
    COUNT(*) as issue_count,
    SUM(sd.degradation_points) as total_degradation,
    jsonb_object_agg(
      sd.issue_severity, 
      json_build_object(
        'count', COUNT(*),
        'degradation', SUM(sd.degradation_points)
      )
    ) as by_severity
  FROM skill_degradations sd
  WHERE sd.user_id = p_user_id
  AND sd.is_active = true
  GROUP BY sd.repository;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get resolution history for a user
CREATE OR REPLACE FUNCTION get_resolution_history(p_user_id UUID, p_days INTEGER DEFAULT 90)
RETURNS TABLE (
  repository TEXT,
  resolutions BIGINT,
  skill_points_earned DECIMAL,
  by_severity JSONB,
  recent_resolutions JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ir.repository,
    COUNT(*) as resolutions,
    SUM(ir.skill_points_awarded) as skill_points_earned,
    jsonb_object_agg(
      ir.issue_severity,
      json_build_object(
        'count', COUNT(*),
        'points', SUM(ir.skill_points_awarded)
      )
    ) as by_severity,
    jsonb_agg(
      json_build_object(
        'issue_id', ir.issue_id,
        'category', ir.issue_category,
        'severity', ir.issue_severity,
        'resolved_at', ir.resolved_at,
        'pr_number', ir.pr_number,
        'points', ir.skill_points_awarded
      ) ORDER BY ir.resolved_at DESC
    ) FILTER (WHERE ir.resolved_at > NOW() - INTERVAL '7 days') as recent_resolutions
  FROM issue_resolutions ir
  WHERE ir.resolved_by_user_id = p_user_id
  AND ir.resolved_at > NOW() - (p_days || ' days')::INTERVAL
  GROUP BY ir.repository;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON TABLE issue_resolutions IS 'Tracks when repository issues are resolved by developers';
COMMENT ON TABLE skill_degradations IS 'Tracks active skill degradations due to unresolved repository issues';
COMMENT ON COLUMN issue_resolutions.skill_points_awarded IS 'Skill points awarded for fixing this issue';
COMMENT ON COLUMN skill_degradations.degradation_points IS 'Skill points deducted while issue remains unresolved';
COMMENT ON COLUMN skill_degradations.deactivation_reason IS 'Why the degradation was deactivated: resolved_by_user or resolved_by_teammate';
COMMENT ON FUNCTION handle_issue_resolution IS 'Handles issue resolution, awards points, and deactivates degradations';
COMMENT ON FUNCTION apply_issue_degradation IS 'Applies skill degradation for unresolved issues';
COMMENT ON FUNCTION get_active_degradations IS 'Gets all active skill degradations for a user';
COMMENT ON FUNCTION get_resolution_history IS 'Gets issue resolution history and points earned by a user';