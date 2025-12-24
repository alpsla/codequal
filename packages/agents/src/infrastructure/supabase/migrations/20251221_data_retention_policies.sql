-- ================================================================================
-- Data Retention Policies Schema
-- Created: 2025-12-21 (Session 66)
--
-- Purpose: Configure and enforce data retention across all tables
-- - Configurable retention periods per data type
-- - Automatic cleanup functions
-- - Retention audit logging
-- ================================================================================

-- =============================================================================
-- DATA RETENTION POLICIES TABLE
-- Configurable retention periods for each data type
-- =============================================================================

CREATE TABLE IF NOT EXISTS data_retention_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Data type identification
  data_type TEXT NOT NULL UNIQUE,
  table_name TEXT NOT NULL,

  -- Retention configuration
  retention_type TEXT NOT NULL CHECK (retention_type IN ('days', 'count', 'forever')),
  retention_value INTEGER,  -- Days or count, NULL for 'forever'

  -- Cleanup configuration
  cleanup_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  last_cleanup_at TIMESTAMPTZ,
  next_cleanup_at TIMESTAMPTZ,
  cleanup_interval_hours INTEGER DEFAULT 24,

  -- Statistics
  total_cleaned INTEGER DEFAULT 0,
  last_cleanup_count INTEGER DEFAULT 0,

  -- Metadata
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- RETENTION AUDIT LOG
-- Tracks all cleanup operations for compliance
-- =============================================================================

CREATE TABLE IF NOT EXISTS retention_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Cleanup context
  data_type TEXT NOT NULL,
  table_name TEXT NOT NULL,

  -- Cleanup results
  records_deleted INTEGER NOT NULL DEFAULT 0,
  cleanup_reason TEXT,  -- 'scheduled', 'manual', 'on_insert'
  cleanup_criteria TEXT,  -- Description of what was cleaned

  -- Performance
  duration_ms INTEGER,

  -- Metadata
  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for audit log queries
CREATE INDEX IF NOT EXISTS idx_retention_audit_executed
  ON retention_audit_log (executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_retention_audit_data_type
  ON retention_audit_log (data_type, executed_at DESC);

-- =============================================================================
-- SEED DEFAULT RETENTION POLICIES
-- =============================================================================

INSERT INTO data_retention_policies (data_type, table_name, retention_type, retention_value, description)
VALUES
  -- Analysis history: Keep last 5 PRs per user (count-based)
  ('analysis_history', 'analysis_history', 'count', 5,
   'Keep only the last 5 PR analyses per user'),

  -- Skill scores: 3 months (90 days)
  ('skill_scores', 'skill_scores', 'days', 90,
   'Keep skill progression data for 3 months'),

  -- Pattern usage stats: 6 months (180 days)
  ('pattern_usage_stats', 'pattern_usage_stats', 'days', 180,
   'Keep pattern usage statistics for 6 months'),

  -- Community impact metrics: 12 months (365 days)
  ('community_impact_metrics', 'community_impact_metrics', 'days', 365,
   'Keep community impact aggregations for 12 months'),

  -- User achievements: Forever
  ('user_achievements', 'user_achievements', 'forever', NULL,
   'Keep achievement records permanently'),

  -- User preferences: Forever
  ('user_preferences', 'user_preferences', 'forever', NULL,
   'Keep user preferences permanently'),

  -- Pattern contributions: Forever
  ('pattern_contributions', 'pattern_contributions', 'forever', NULL,
   'Keep pattern contribution records permanently'),

  -- Corgea usage log: 90 days
  ('corgea_usage_log', 'corgea_usage_log', 'days', 90,
   'Keep Corgea usage logs for 90 days'),

  -- Fix patterns: Forever (core data)
  ('fix_patterns', 'fix_patterns', 'forever', NULL,
   'Keep fix patterns permanently - core registry data'),

  -- Retention audit log: 365 days
  ('retention_audit_log', 'retention_audit_log', 'days', 365,
   'Keep retention audit logs for 12 months')

ON CONFLICT (data_type) DO NOTHING;

-- =============================================================================
-- CLEANUP FUNCTIONS
-- =============================================================================

-- Function: Cleanup analysis history (count-based, 5 per user)
CREATE OR REPLACE FUNCTION cleanup_analysis_history()
RETURNS INTEGER AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  WITH to_delete AS (
    SELECT id FROM (
      SELECT id, user_id,
             ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY analysis_date DESC) as rn
      FROM analysis_history
    ) ranked
    WHERE rn > 5
  )
  DELETE FROM analysis_history
  WHERE id IN (SELECT id FROM to_delete);

  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  -- Log the cleanup
  IF v_deleted > 0 THEN
    INSERT INTO retention_audit_log (data_type, table_name, records_deleted, cleanup_reason, cleanup_criteria)
    VALUES ('analysis_history', 'analysis_history', v_deleted, 'scheduled', 'Keep last 5 per user');
  END IF;

  -- Update policy stats
  UPDATE data_retention_policies
  SET last_cleanup_at = NOW(),
      next_cleanup_at = NOW() + (cleanup_interval_hours || ' hours')::INTERVAL,
      total_cleaned = total_cleaned + v_deleted,
      last_cleanup_count = v_deleted,
      updated_at = NOW()
  WHERE data_type = 'analysis_history';

  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql;

-- Function: Cleanup days-based tables
CREATE OR REPLACE FUNCTION cleanup_by_days(
  p_table_name TEXT,
  p_date_column TEXT,
  p_days INTEGER
)
RETURNS INTEGER AS $$
DECLARE
  v_deleted INTEGER;
  v_sql TEXT;
BEGIN
  -- Build and execute dynamic SQL
  v_sql := format(
    'DELETE FROM %I WHERE %I < NOW() - INTERVAL ''%s days''',
    p_table_name, p_date_column, p_days
  );

  EXECUTE v_sql;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  -- Log the cleanup
  IF v_deleted > 0 THEN
    INSERT INTO retention_audit_log (data_type, table_name, records_deleted, cleanup_reason, cleanup_criteria)
    VALUES (p_table_name, p_table_name, v_deleted, 'scheduled', format('Older than %s days', p_days));
  END IF;

  -- Update policy stats
  UPDATE data_retention_policies
  SET last_cleanup_at = NOW(),
      next_cleanup_at = NOW() + (cleanup_interval_hours || ' hours')::INTERVAL,
      total_cleaned = total_cleaned + v_deleted,
      last_cleanup_count = v_deleted,
      updated_at = NOW()
  WHERE table_name = p_table_name;

  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql;

-- Function: Master cleanup that runs all policies
CREATE OR REPLACE FUNCTION run_all_retention_cleanups()
RETURNS TABLE (
  data_type TEXT,
  records_deleted INTEGER
) AS $$
DECLARE
  v_policy RECORD;
  v_deleted INTEGER;
BEGIN
  FOR v_policy IN
    SELECT * FROM data_retention_policies
    WHERE cleanup_enabled = TRUE
      AND retention_type != 'forever'
      AND (next_cleanup_at IS NULL OR next_cleanup_at <= NOW())
  LOOP
    v_deleted := 0;

    IF v_policy.retention_type = 'count' AND v_policy.table_name = 'analysis_history' THEN
      v_deleted := cleanup_analysis_history();

    ELSIF v_policy.retention_type = 'days' THEN
      -- Determine date column based on table
      CASE v_policy.table_name
        WHEN 'skill_scores' THEN
          v_deleted := cleanup_by_days(v_policy.table_name, 'date', v_policy.retention_value);
        WHEN 'pattern_usage_stats' THEN
          v_deleted := cleanup_by_days(v_policy.table_name, 'last_used_at', v_policy.retention_value);
        WHEN 'community_impact_metrics' THEN
          v_deleted := cleanup_by_days(v_policy.table_name, 'month', v_policy.retention_value);
        WHEN 'corgea_usage_log' THEN
          v_deleted := cleanup_by_days(v_policy.table_name, 'created_at', v_policy.retention_value);
        WHEN 'retention_audit_log' THEN
          v_deleted := cleanup_by_days(v_policy.table_name, 'executed_at', v_policy.retention_value);
        ELSE
          v_deleted := cleanup_by_days(v_policy.table_name, 'created_at', v_policy.retention_value);
      END CASE;
    END IF;

    data_type := v_policy.data_type;
    records_deleted := v_deleted;
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function: Get retention policy summary
CREATE OR REPLACE FUNCTION get_retention_summary()
RETURNS TABLE (
  data_type TEXT,
  table_name TEXT,
  retention_rule TEXT,
  last_cleanup TIMESTAMPTZ,
  next_cleanup TIMESTAMPTZ,
  total_cleaned BIGINT,
  cleanup_enabled BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    drp.data_type,
    drp.table_name,
    CASE drp.retention_type
      WHEN 'days' THEN format('%s days', drp.retention_value)
      WHEN 'count' THEN format('Last %s per user', drp.retention_value)
      WHEN 'forever' THEN 'Forever'
    END AS retention_rule,
    drp.last_cleanup_at,
    drp.next_cleanup_at,
    drp.total_cleaned::BIGINT,
    drp.cleanup_enabled
  FROM data_retention_policies drp
  ORDER BY drp.data_type;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function: Update retention policy
CREATE OR REPLACE FUNCTION update_retention_policy(
  p_data_type TEXT,
  p_retention_value INTEGER,
  p_cleanup_enabled BOOLEAN DEFAULT TRUE
)
RETURNS VOID AS $$
BEGIN
  UPDATE data_retention_policies
  SET retention_value = p_retention_value,
      cleanup_enabled = p_cleanup_enabled,
      updated_at = NOW()
  WHERE data_type = p_data_type;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown data type: %', p_data_type;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- VIEWS
-- =============================================================================

-- View: Data retention dashboard
CREATE OR REPLACE VIEW retention_dashboard AS
SELECT
  drp.data_type,
  drp.table_name,
  drp.retention_type,
  drp.retention_value,
  drp.cleanup_enabled,
  drp.last_cleanup_at,
  drp.next_cleanup_at,
  drp.total_cleaned,
  drp.last_cleanup_count,
  CASE
    WHEN drp.next_cleanup_at IS NULL THEN 'never_run'
    WHEN drp.next_cleanup_at <= NOW() THEN 'due'
    ELSE 'scheduled'
  END AS status
FROM data_retention_policies drp
ORDER BY
  CASE WHEN drp.next_cleanup_at <= NOW() THEN 0 ELSE 1 END,
  drp.next_cleanup_at;

-- View: Recent cleanup activity
CREATE OR REPLACE VIEW recent_cleanup_activity AS
SELECT
  ral.data_type,
  ral.records_deleted,
  ral.cleanup_reason,
  ral.cleanup_criteria,
  ral.duration_ms,
  ral.executed_at,
  ral.executed_at::DATE AS cleanup_date
FROM retention_audit_log ral
WHERE ral.executed_at > NOW() - INTERVAL '30 days'
ORDER BY ral.executed_at DESC;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE data_retention_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE retention_audit_log ENABLE ROW LEVEL SECURITY;

-- Service role has full access
CREATE POLICY "Service role full access policies" ON data_retention_policies
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access audit" ON retention_audit_log
  FOR ALL USING (auth.role() = 'service_role');

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE data_retention_policies IS 'Configurable data retention policies for all tables';
COMMENT ON TABLE retention_audit_log IS 'Audit trail of all retention cleanup operations';
COMMENT ON FUNCTION cleanup_analysis_history IS 'Cleans up analysis history keeping last 5 per user';
COMMENT ON FUNCTION cleanup_by_days IS 'Generic cleanup function for days-based retention';
COMMENT ON FUNCTION run_all_retention_cleanups IS 'Master function that executes all due retention cleanups';
COMMENT ON FUNCTION get_retention_summary IS 'Returns summary of all retention policies and their status';
COMMENT ON FUNCTION update_retention_policy IS 'Updates retention configuration for a data type';
