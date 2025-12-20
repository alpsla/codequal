-- ================================================================================
-- Corgea Cost Tracking Schema
-- Created: 2025-12-20 (Session 63)
--
-- Purpose: Track Corgea subscription costs and usage to compare with AI-fixer
-- and make intelligent routing decisions.
--
-- Decision Logic:
-- - If Corgea effective_cost_per_fix < AI-fixer avg_cost → use Corgea
-- - If Corgea rate limited OR AI-fixer cheaper → use AI-fixer
-- ================================================================================

-- =============================================================================
-- CORGEA SUBSCRIPTION TABLE
-- Stores current subscription tier and billing info
-- =============================================================================

CREATE TABLE IF NOT EXISTS corgea_subscription (
  id VARCHAR(50) PRIMARY KEY DEFAULT 'current',

  -- Subscription details
  plan_name VARCHAR(50) NOT NULL DEFAULT 'growth',  -- starter, growth, scale, enterprise
  monthly_cost_cents INTEGER NOT NULL DEFAULT 2900,  -- $29.00 for Growth
  billing_cycle_start DATE NOT NULL DEFAULT CURRENT_DATE,
  billing_cycle_end DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '1 month'),

  -- Plan limits (estimated based on plan)
  estimated_monthly_fix_limit INTEGER DEFAULT 300,  -- Conservative estimate
  rate_limit_per_hour INTEGER DEFAULT 100,
  rate_limit_per_day INTEGER DEFAULT 1000,

  -- Current period usage
  fixes_this_period INTEGER DEFAULT 0,
  api_calls_this_period INTEGER DEFAULT 0,

  -- Calculated metrics (updated on each fix)
  effective_cost_per_fix_cents DECIMAL(10,2) DEFAULT 0,  -- monthly_cost / fixes

  -- Metadata
  api_key_last_4 VARCHAR(4),  -- Last 4 chars for identification
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- CORGEA USAGE LOG
-- Tracks individual fix requests for detailed analytics
-- =============================================================================

CREATE TABLE IF NOT EXISTS corgea_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Request context
  user_id VARCHAR(100),
  organization_id VARCHAR(100),
  repository_url TEXT,
  pr_number INTEGER,

  -- Fix details
  issue_count INTEGER NOT NULL DEFAULT 1,
  fixes_generated INTEGER NOT NULL DEFAULT 0,
  fixes_applied INTEGER NOT NULL DEFAULT 0,

  -- Cost tracking
  estimated_cost_cents DECIMAL(10,2),  -- Based on effective cost at time of request

  -- Performance
  response_time_ms INTEGER,
  from_cache BOOLEAN DEFAULT false,

  -- Status
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  rate_limited BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for usage log
CREATE INDEX IF NOT EXISTS idx_corgea_usage_created ON corgea_usage_log(created_at);
CREATE INDEX IF NOT EXISTS idx_corgea_usage_user ON corgea_usage_log(user_id);
CREATE INDEX IF NOT EXISTS idx_corgea_usage_org ON corgea_usage_log(organization_id);

-- =============================================================================
-- FIX COST COMPARISON VIEW
-- Real-time comparison between Corgea and AI-fixer costs
-- =============================================================================

CREATE OR REPLACE VIEW fix_cost_comparison AS
SELECT
  -- Corgea costs
  cs.plan_name AS corgea_plan,
  cs.monthly_cost_cents AS corgea_monthly_cents,
  cs.fixes_this_period AS corgea_fixes_used,
  cs.effective_cost_per_fix_cents AS corgea_cost_per_fix_cents,

  -- AI-fixer costs (from ai_fixer_research)
  COALESCE(afr.avg_cost * 100, 2.0) AS ai_fixer_cost_per_fix_cents,  -- Convert $ to cents, default 2 cents

  -- Decision
  CASE
    WHEN cs.effective_cost_per_fix_cents <= 0 THEN 'ai_fixer'  -- No Corgea data yet
    WHEN cs.effective_cost_per_fix_cents < COALESCE(afr.avg_cost * 100, 2.0) THEN 'corgea'
    ELSE 'ai_fixer'
  END AS recommended_source,

  -- Savings calculation
  ABS(cs.effective_cost_per_fix_cents - COALESCE(afr.avg_cost * 100, 2.0)) AS cost_difference_cents,

  -- Metadata
  NOW() AS calculated_at
FROM
  corgea_subscription cs
LEFT JOIN (
  SELECT avg_cost
  FROM ai_fixer_research
  ORDER BY research_date DESC
  LIMIT 1
) afr ON true
WHERE cs.id = 'current';

-- =============================================================================
-- FUNCTION: Update effective cost per fix
-- Called after each Corgea fix to recalculate
-- =============================================================================

CREATE OR REPLACE FUNCTION update_corgea_effective_cost()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the subscription table with new effective cost
  UPDATE corgea_subscription
  SET
    fixes_this_period = fixes_this_period + NEW.fixes_generated,
    api_calls_this_period = api_calls_this_period + 1,
    effective_cost_per_fix_cents = CASE
      WHEN (fixes_this_period + NEW.fixes_generated) > 0
      THEN monthly_cost_cents::DECIMAL / (fixes_this_period + NEW.fixes_generated)
      ELSE 0
    END,
    updated_at = NOW()
  WHERE id = 'current';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update effective cost
DROP TRIGGER IF EXISTS trigger_update_corgea_cost ON corgea_usage_log;
CREATE TRIGGER trigger_update_corgea_cost
  AFTER INSERT ON corgea_usage_log
  FOR EACH ROW
  WHEN (NEW.success = true AND NEW.fixes_generated > 0)
  EXECUTE FUNCTION update_corgea_effective_cost();

-- =============================================================================
-- FUNCTION: Reset billing period
-- Call at the start of each billing cycle
-- =============================================================================

CREATE OR REPLACE FUNCTION reset_corgea_billing_period()
RETURNS void AS $$
BEGIN
  UPDATE corgea_subscription
  SET
    fixes_this_period = 0,
    api_calls_this_period = 0,
    effective_cost_per_fix_cents = 0,
    billing_cycle_start = CURRENT_DATE,
    billing_cycle_end = CURRENT_DATE + INTERVAL '1 month',
    updated_at = NOW()
  WHERE id = 'current';
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- SEED DATA: Default Growth plan
-- =============================================================================

INSERT INTO corgea_subscription (id, plan_name, monthly_cost_cents, estimated_monthly_fix_limit)
VALUES ('current', 'growth', 2900, 300)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE corgea_subscription ENABLE ROW LEVEL SECURITY;
ALTER TABLE corgea_usage_log ENABLE ROW LEVEL SECURITY;

-- Service role has full access
DROP POLICY IF EXISTS "Service role full access subscription" ON corgea_subscription;
CREATE POLICY "Service role full access subscription" ON corgea_subscription
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access usage" ON corgea_usage_log;
CREATE POLICY "Service role full access usage" ON corgea_usage_log
  FOR ALL USING (auth.role() = 'service_role');

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE corgea_subscription IS 'Tracks Corgea subscription tier and calculates effective cost per fix';
COMMENT ON TABLE corgea_usage_log IS 'Logs individual Corgea fix requests for analytics and cost tracking';
COMMENT ON VIEW fix_cost_comparison IS 'Real-time comparison of Corgea vs AI-fixer costs for routing decisions';
