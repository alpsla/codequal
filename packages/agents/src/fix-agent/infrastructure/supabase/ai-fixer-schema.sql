-- ================================================================================
-- AI Fixer Schema - Database Tables for AI-Based Code Fixing
-- Generated: 2025-12-01
-- Updated: Idempotent version - safe to run multiple times
-- ================================================================================
--
-- Tables:
-- 1. ai_fixer_research - Stores quarterly AI fixer research results
-- 2. ai_fixer_recommendations - Current recommended weights for different use cases
--
-- Dependencies:
-- - model_configurations table (should already exist)
-- - tool-database-schema.sql (run first for update_updated_at_column function)
-- ================================================================================

-- =============================================================================
-- AI FIXER RESEARCH TABLE
-- Stores results from quarterly AI fixer weight configuration research
-- =============================================================================

CREATE TABLE IF NOT EXISTS ai_fixer_research (
  id VARCHAR(50) PRIMARY KEY,
  config_name VARCHAR(50) NOT NULL,
  weights JSONB NOT NULL,  -- {"quality": 0.70, "speed": 0.15, "cost": 0.10, "accuracy": 0.05}
  avg_fix_accuracy DECIMAL(5,4) NOT NULL CHECK (avg_fix_accuracy >= 0 AND avg_fix_accuracy <= 1),
  avg_compilation_rate DECIMAL(5,4) NOT NULL CHECK (avg_compilation_rate >= 0 AND avg_compilation_rate <= 1),
  avg_test_pass_rate DECIMAL(5,4) NOT NULL CHECK (avg_test_pass_rate >= 0 AND avg_test_pass_rate <= 1),
  avg_response_time INTEGER NOT NULL,  -- milliseconds
  avg_cost DECIMAL(10,6) NOT NULL,     -- $ per fix
  language_breakdown JSONB DEFAULT '{}',  -- Results per language
  research_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  next_research_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for ai_fixer_research (idempotent)
CREATE INDEX IF NOT EXISTS idx_ai_fixer_research_config ON ai_fixer_research(config_name);
CREATE INDEX IF NOT EXISTS idx_ai_fixer_research_date ON ai_fixer_research(research_date);

-- =============================================================================
-- AI FIXER RECOMMENDATIONS TABLE
-- Singleton table storing current recommended weights for each use case
-- =============================================================================

CREATE TABLE IF NOT EXISTS ai_fixer_recommendations (
  id VARCHAR(50) PRIMARY KEY DEFAULT 'current',
  recommendations JSONB NOT NULL,  -- {"production": "qualityFirst", "realtime": "speedFirst", ...}
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- TRIGGERS (idempotent - drop then create)
-- =============================================================================

-- Trigger for ai_fixer_research updated_at
DROP TRIGGER IF EXISTS update_ai_fixer_research_updated_at ON ai_fixer_research;
CREATE TRIGGER update_ai_fixer_research_updated_at
  BEFORE UPDATE ON ai_fixer_research
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for ai_fixer_recommendations updated_at
DROP TRIGGER IF EXISTS update_ai_fixer_recommendations_updated_at ON ai_fixer_recommendations;
CREATE TRIGGER update_ai_fixer_recommendations_updated_at
  BEFORE UPDATE ON ai_fixer_recommendations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) - Idempotent
-- =============================================================================

ALTER TABLE ai_fixer_research ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_fixer_recommendations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first
DROP POLICY IF EXISTS "Read access for authenticated users" ON ai_fixer_research;
DROP POLICY IF EXISTS "Read access for authenticated users" ON ai_fixer_recommendations;
DROP POLICY IF EXISTS "Service role full access" ON ai_fixer_research;
DROP POLICY IF EXISTS "Service role full access" ON ai_fixer_recommendations;

-- Read access for authenticated users
CREATE POLICY "Read access for authenticated users" ON ai_fixer_research
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Read access for authenticated users" ON ai_fixer_recommendations
  FOR SELECT USING (auth.role() = 'authenticated');

-- Service role full access
CREATE POLICY "Service role full access" ON ai_fixer_research
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON ai_fixer_recommendations
  FOR ALL USING (auth.role() = 'service_role');

-- =============================================================================
-- VIEWS (CREATE OR REPLACE is already idempotent)
-- =============================================================================

-- View: Current AI fixer recommendations with full config details
CREATE OR REPLACE VIEW v_ai_fixer_current_recommendations AS
SELECT
  r.id,
  r.recommendations,
  r.updated_at,
  (r.recommendations->>'production') AS production_config,
  (r.recommendations->>'realtime') AS realtime_config,
  (r.recommendations->>'bulk') AS bulk_config,
  (r.recommendations->>'critical') AS critical_config
FROM ai_fixer_recommendations r
WHERE r.id = 'current';

-- View: AI fixer research summary
CREATE OR REPLACE VIEW v_ai_fixer_research_summary AS
SELECT
  ar.config_name,
  ar.avg_fix_accuracy,
  ar.avg_compilation_rate,
  ar.avg_test_pass_rate,
  ar.avg_response_time,
  ar.avg_cost,
  ar.research_date,
  ar.next_research_date,
  (ar.next_research_date > NOW()) AS research_is_current
FROM ai_fixer_research ar
ORDER BY ar.research_date DESC;

-- =============================================================================
-- FUNCTIONS (CREATE OR REPLACE is already idempotent)
-- =============================================================================

-- Function: Get best weight config for a use case
CREATE OR REPLACE FUNCTION get_ai_fixer_weights(p_use_case VARCHAR(50))
RETURNS JSONB AS $$
DECLARE
  v_config_name VARCHAR(50);
  v_weights JSONB;
BEGIN
  -- Get recommended config name for this use case
  SELECT recommendations->>p_use_case INTO v_config_name
  FROM ai_fixer_recommendations
  WHERE id = 'current';

  -- If not found, use default
  IF v_config_name IS NULL THEN
    v_config_name := CASE p_use_case
      WHEN 'production' THEN 'qualityFirst'
      WHEN 'realtime' THEN 'speedFirst'
      WHEN 'bulk' THEN 'costFirst'
      WHEN 'critical' THEN 'accuracyFirst'
      ELSE 'qualityFirst'
    END;
  END IF;

  -- Get weights from research
  SELECT weights INTO v_weights
  FROM ai_fixer_research
  WHERE config_name = v_config_name
  ORDER BY research_date DESC
  LIMIT 1;

  -- If no research found, return default weights
  IF v_weights IS NULL THEN
    v_weights := CASE v_config_name
      WHEN 'qualityFirst' THEN '{"quality": 0.70, "speed": 0.15, "cost": 0.10, "accuracy": 0.05}'::jsonb
      WHEN 'speedFirst' THEN '{"quality": 0.25, "speed": 0.45, "cost": 0.20, "accuracy": 0.10}'::jsonb
      WHEN 'costFirst' THEN '{"quality": 0.30, "speed": 0.20, "cost": 0.40, "accuracy": 0.10}'::jsonb
      WHEN 'accuracyFirst' THEN '{"quality": 0.35, "speed": 0.10, "cost": 0.05, "accuracy": 0.50}'::jsonb
      ELSE '{"quality": 0.40, "speed": 0.25, "cost": 0.20, "accuracy": 0.15}'::jsonb
    END;
  END IF;

  RETURN v_weights;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE ai_fixer_research IS 'Stores quarterly AI fixer weight configuration research results from AIFixerResearcherService';
COMMENT ON TABLE ai_fixer_recommendations IS 'Singleton table with current recommended weight configs for each use case (production, realtime, bulk, critical)';
COMMENT ON VIEW v_ai_fixer_current_recommendations IS 'Current AI fixer recommendations for all use cases';
COMMENT ON VIEW v_ai_fixer_research_summary IS 'Summary of AI fixer research results ordered by date';
COMMENT ON FUNCTION get_ai_fixer_weights IS 'Get the best weight configuration for a specific use case';
