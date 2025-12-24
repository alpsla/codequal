-- ================================================================================
-- Fix Routing Configuration Schema
-- Created: 2025-12-20 (Session 63)
--
-- Purpose: Allow manual/automatic routing between Corgea and AI-fixer
--
-- Modes:
-- - 'manual': User explicitly selects preferred source (for data gathering phase)
-- - 'automatic': System selects cheapest source based on cost comparison
--
-- Use Cases:
-- 1. Start with manual mode to test both systems and gather data
-- 2. Analyze which Corgea tier makes sense based on volume
-- 3. Switch to automatic mode for cost-optimized routing
-- ================================================================================

-- =============================================================================
-- FIX ROUTING CONFIGURATION TABLE
-- Stores current routing mode and preferences
-- =============================================================================

CREATE TABLE IF NOT EXISTS fix_routing_config (
  id VARCHAR(50) PRIMARY KEY DEFAULT 'current',

  -- Routing mode
  routing_mode VARCHAR(20) NOT NULL DEFAULT 'manual',  -- 'manual' | 'automatic'

  -- Manual mode settings
  manual_preferred_source VARCHAR(20) DEFAULT 'ai_fixer',  -- 'corgea' | 'ai_fixer'
  manual_reason TEXT,  -- Why this source is preferred (for documentation)

  -- Automatic mode settings (future use)
  auto_prefer_corgea_for_security BOOLEAN DEFAULT true,
  auto_fallback_on_rate_limit BOOLEAN DEFAULT true,
  auto_cost_threshold_cents DECIMAL(10,2) DEFAULT 0,  -- Min savings to switch (0 = any savings)

  -- Data collection tracking
  data_collection_started_at TIMESTAMP WITH TIME ZONE,
  data_collection_target_fixes INTEGER DEFAULT 100,  -- Target fixes before switching to auto

  -- Metadata
  last_mode_change_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_mode_change_by VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- ROUTING DECISION LOG
-- Tracks routing decisions for analysis
-- =============================================================================

CREATE TABLE IF NOT EXISTS fix_routing_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Decision context
  routing_mode VARCHAR(20) NOT NULL,  -- Mode at time of decision
  selected_source VARCHAR(20) NOT NULL,  -- What was actually used

  -- Why this source was selected
  decision_reason TEXT,
  was_fallback BOOLEAN DEFAULT false,
  fallback_reason TEXT,

  -- Cost data at time of decision
  corgea_cost_cents DECIMAL(10,2),
  ai_fixer_cost_cents DECIMAL(10,2),
  cost_savings_cents DECIMAL(10,2),

  -- Issue context
  issue_severity VARCHAR(20),
  issue_category VARCHAR(50),
  language VARCHAR(50),

  -- Outcome (updated after fix completes)
  fix_successful BOOLEAN,
  fix_confidence INTEGER,
  actual_cost_cents DECIMAL(10,2),

  -- Metadata
  user_id VARCHAR(100),
  organization_id VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for routing decisions
CREATE INDEX IF NOT EXISTS idx_routing_decisions_created ON fix_routing_decisions(created_at);
CREATE INDEX IF NOT EXISTS idx_routing_decisions_mode ON fix_routing_decisions(routing_mode);
CREATE INDEX IF NOT EXISTS idx_routing_decisions_source ON fix_routing_decisions(selected_source);

-- =============================================================================
-- UPDATED FIX COST COMPARISON VIEW
-- Now includes routing mode information
-- =============================================================================

-- Drop existing view to allow column changes
DROP VIEW IF EXISTS fix_cost_comparison;

CREATE VIEW fix_cost_comparison AS
SELECT
  -- Corgea costs
  cs.plan_name AS corgea_plan,
  cs.monthly_cost_cents AS corgea_monthly_cents,
  cs.fixes_this_period AS corgea_fixes_used,
  cs.effective_cost_per_fix_cents AS corgea_cost_per_fix_cents,

  -- AI-fixer costs (from ai_fixer_research)
  COALESCE(afr.avg_cost * 100, 2.0) AS ai_fixer_cost_per_fix_cents,

  -- Routing configuration
  frc.routing_mode,
  frc.manual_preferred_source,

  -- Decision (respects manual override)
  CASE
    WHEN frc.routing_mode = 'manual' THEN frc.manual_preferred_source
    WHEN cs.effective_cost_per_fix_cents <= 0 THEN 'ai_fixer'  -- No Corgea data yet
    WHEN cs.effective_cost_per_fix_cents < COALESCE(afr.avg_cost * 100, 2.0) THEN 'corgea'
    ELSE 'ai_fixer'
  END AS recommended_source,

  -- Cost difference
  ABS(cs.effective_cost_per_fix_cents - COALESCE(afr.avg_cost * 100, 2.0)) AS cost_difference_cents,

  -- Data collection progress
  frc.data_collection_target_fixes,
  (SELECT COUNT(*) FROM fix_routing_decisions WHERE created_at > frc.data_collection_started_at) AS decisions_since_collection_start,

  -- Metadata
  NOW() AS calculated_at
FROM
  corgea_subscription cs
CROSS JOIN fix_routing_config frc
LEFT JOIN (
  SELECT avg_cost
  FROM ai_fixer_research
  ORDER BY research_date DESC
  LIMIT 1
) afr ON true
WHERE cs.id = 'current' AND frc.id = 'current';

-- =============================================================================
-- FUNCTION: Switch Routing Mode
-- Safe way to switch between manual and automatic modes
-- =============================================================================

CREATE OR REPLACE FUNCTION switch_routing_mode(
  new_mode VARCHAR(20),
  preferred_source VARCHAR(20) DEFAULT NULL,
  change_reason TEXT DEFAULT NULL,
  changed_by VARCHAR(100) DEFAULT 'system'
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  previous_mode VARCHAR(20),
  new_routing_mode VARCHAR(20)
) AS $$
DECLARE
  prev_mode VARCHAR(20);
BEGIN
  -- Validate mode
  IF new_mode NOT IN ('manual', 'automatic') THEN
    RETURN QUERY SELECT false, 'Invalid mode. Use "manual" or "automatic"', NULL::VARCHAR, NULL::VARCHAR;
    RETURN;
  END IF;

  -- Get current mode
  SELECT routing_mode INTO prev_mode FROM fix_routing_config WHERE id = 'current';

  -- Update configuration
  UPDATE fix_routing_config
  SET
    routing_mode = new_mode,
    manual_preferred_source = COALESCE(preferred_source, manual_preferred_source),
    manual_reason = COALESCE(change_reason, manual_reason),
    last_mode_change_at = NOW(),
    last_mode_change_by = changed_by,
    updated_at = NOW(),
    -- Start data collection if switching to manual
    data_collection_started_at = CASE
      WHEN new_mode = 'manual' AND prev_mode != 'manual' THEN NOW()
      ELSE data_collection_started_at
    END
  WHERE id = 'current';

  RETURN QUERY SELECT
    true,
    'Routing mode switched from ' || COALESCE(prev_mode, 'none') || ' to ' || new_mode,
    prev_mode,
    new_mode;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- FUNCTION: Get Routing Recommendation
-- Returns the recommended source based on current configuration
-- =============================================================================

CREATE OR REPLACE FUNCTION get_routing_recommendation(
  issue_severity VARCHAR(20) DEFAULT 'medium',
  issue_category VARCHAR(50) DEFAULT 'general'
)
RETURNS TABLE (
  source VARCHAR(20),
  reason TEXT,
  estimated_cost_cents DECIMAL(10,2),
  mode VARCHAR(20),
  is_fallback BOOLEAN
) AS $$
DECLARE
  config RECORD;
  corgea_cost DECIMAL(10,2);
  ai_fixer_cost DECIMAL(10,2);
BEGIN
  -- Get current configuration
  SELECT * INTO config FROM fix_cost_comparison LIMIT 1;

  corgea_cost := config.corgea_cost_per_fix_cents;
  ai_fixer_cost := config.ai_fixer_cost_per_fix_cents;

  -- Manual mode: return preferred source
  IF config.routing_mode = 'manual' THEN
    IF config.manual_preferred_source = 'corgea' THEN
      RETURN QUERY SELECT
        'corgea'::VARCHAR,
        'Manual mode: Corgea selected for data collection'::TEXT,
        corgea_cost,
        'manual'::VARCHAR,
        false;
    ELSE
      RETURN QUERY SELECT
        'ai_fixer'::VARCHAR,
        'Manual mode: AI-fixer selected for data collection'::TEXT,
        ai_fixer_cost,
        'manual'::VARCHAR,
        false;
    END IF;
    RETURN;
  END IF;

  -- Automatic mode: select based on cost and rules

  -- Security preference for Corgea
  IF config.auto_prefer_corgea_for_security AND issue_category = 'security' AND issue_severity IN ('critical', 'high') THEN
    RETURN QUERY SELECT
      'corgea'::VARCHAR,
      'Automatic mode: Corgea preferred for high-severity security issues'::TEXT,
      corgea_cost,
      'automatic'::VARCHAR,
      false;
    RETURN;
  END IF;

  -- Cost-based selection
  IF corgea_cost > 0 AND corgea_cost < ai_fixer_cost THEN
    RETURN QUERY SELECT
      'corgea'::VARCHAR,
      format('Automatic mode: Corgea cheaper (%.2f¢ vs %.2f¢)', corgea_cost, ai_fixer_cost)::TEXT,
      corgea_cost,
      'automatic'::VARCHAR,
      false;
  ELSE
    RETURN QUERY SELECT
      'ai_fixer'::VARCHAR,
      format('Automatic mode: AI-fixer cheaper or default (%.2f¢ vs %.2f¢)', ai_fixer_cost, corgea_cost)::TEXT,
      ai_fixer_cost,
      'automatic'::VARCHAR,
      false;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- SEED DATA: Default to manual mode with AI-fixer
-- =============================================================================

INSERT INTO fix_routing_config (
  id,
  routing_mode,
  manual_preferred_source,
  manual_reason,
  data_collection_started_at,
  data_collection_target_fixes,
  notes
)
VALUES (
  'current',
  'manual',
  'ai_fixer',
  'Initial setup - collecting data to determine optimal Corgea tier',
  NOW(),
  100,
  'Start with AI-fixer to establish baseline costs. Switch sources manually to test Corgea. After ~100 fixes from each, analyze data and decide on Corgea tier.'
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE fix_routing_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE fix_routing_decisions ENABLE ROW LEVEL SECURITY;

-- Service role has full access
DROP POLICY IF EXISTS "Service role full access routing_config" ON fix_routing_config;
CREATE POLICY "Service role full access routing_config" ON fix_routing_config
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access routing_decisions" ON fix_routing_decisions;
CREATE POLICY "Service role full access routing_decisions" ON fix_routing_decisions
  FOR ALL USING (auth.role() = 'service_role');

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE fix_routing_config IS 'Configuration for manual/automatic routing between Corgea and AI-fixer';
COMMENT ON TABLE fix_routing_decisions IS 'Log of routing decisions for analysis and optimization';
COMMENT ON FUNCTION switch_routing_mode IS 'Safely switch between manual and automatic routing modes';
COMMENT ON FUNCTION get_routing_recommendation IS 'Get routing recommendation based on current configuration and issue context';
