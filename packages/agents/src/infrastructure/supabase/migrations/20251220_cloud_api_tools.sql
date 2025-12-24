-- ============================================================================
-- Cloud API Tools Migration - Session 60
-- Date: 2025-12-20
-- Purpose: Add support for cloud-based API tools (Corgea, Aikido, etc.)
-- ============================================================================

-- ============================================================================
-- SCHEMA UPDATES: Add tool_type column to distinguish CLI vs API tools
-- ============================================================================

-- Add tool_type column to validator_tools
ALTER TABLE validator_tools ADD COLUMN IF NOT EXISTS
  tool_type VARCHAR(20) DEFAULT 'cli' CHECK (tool_type IN ('cli', 'api', 'hybrid'));

-- Add tool_type column to fixer_tools
ALTER TABLE fixer_tools ADD COLUMN IF NOT EXISTS
  tool_type VARCHAR(20) DEFAULT 'cli' CHECK (tool_type IN ('cli', 'api', 'hybrid'));

-- Add API configuration column for API tools
ALTER TABLE validator_tools ADD COLUMN IF NOT EXISTS
  api_config JSONB;

ALTER TABLE fixer_tools ADD COLUMN IF NOT EXISTS
  api_config JSONB;

-- Add subscription tier requirement column
ALTER TABLE fixer_tools ADD COLUMN IF NOT EXISTS
  min_tier VARCHAR(20) DEFAULT 'basic' CHECK (min_tier IN ('basic', 'pro', 'enterprise'));

-- ============================================================================
-- CORGEA FIXER (Tier 2.5 - Cloud API Fixer)
-- ============================================================================

INSERT INTO fixer_tools (
  tool_id,
  name,
  description,
  languages,
  tool_type,
  api_config,
  categories,
  min_tier,
  execution_order
)
VALUES (
  'corgea',
  'Corgea AI Fixer',
  'AI-powered code fix generation. Analyzes vulnerabilities and generates context-aware fixes with explanations.',
  ARRAY['java', 'typescript', 'javascript', 'python', 'go', 'ruby', 'csharp'],
  'api',
  '{
    "baseUrl": "https://www.corgea.app/api/v1",
    "authType": "bearer",
    "endpoints": {
      "verify": "/verify",
      "uploadScan": "/scan-upload",
      "uploadCode": "/code-upload",
      "getIssues": "/scan/{scan_id}/issues"
    },
    "inputFormats": ["sarif", "semgrep", "snyk", "checkmarx", "codeql"],
    "outputFormat": "json",
    "maxWaitTimeMs": 120000,
    "pollIntervalMs": 5000
  }',
  ARRAY['security', 'bugs', 'code_quality', 'vulnerability'],
  'pro',  -- Requires PRO tier
  250     -- After Tier 2 fixers (200), before AI-only (300)
)
ON CONFLICT (tool_id) DO UPDATE SET
  description = EXCLUDED.description,
  languages = EXCLUDED.languages,
  tool_type = EXCLUDED.tool_type,
  api_config = EXCLUDED.api_config,
  categories = EXCLUDED.categories,
  min_tier = EXCLUDED.min_tier,
  execution_order = EXCLUDED.execution_order,
  updated_at = NOW();

-- ============================================================================
-- RULE TO FIXER MAPPINGS FOR CORGEA
-- Corgea handles security issues from multiple scanners
-- ============================================================================

-- Semgrep security rules -> Corgea
INSERT INTO rule_to_fixer_mappings (
  validator_tool_id,
  rule_id,
  rule_pattern,
  fixer_tool_id,
  confidence,
  issue_type,
  safe_for_auto_apply,
  notes
)
VALUES
  ('semgrep', 'security.*', '.*security.*', 'corgea', 75, 'security', false,
   'Corgea generates AI fixes for Semgrep security findings'),
  ('semgrep', 'java.*injection', '.*injection.*', 'corgea', 80, 'security', false,
   'Corgea handles injection vulnerabilities with context-aware fixes'),
  ('semgrep', 'javascript.*xss', '.*xss.*', 'corgea', 80, 'security', false,
   'Corgea generates XSS fixes with proper encoding'),
  ('semgrep', 'python.*security', '.*security.*', 'corgea', 75, 'security', false,
   'Corgea handles Python security issues')
ON CONFLICT (validator_tool_id, rule_id) DO UPDATE SET
  fixer_tool_id = EXCLUDED.fixer_tool_id,
  confidence = EXCLUDED.confidence,
  notes = EXCLUDED.notes,
  updated_at = NOW();

-- ESLint security rules -> Corgea
INSERT INTO rule_to_fixer_mappings (
  validator_tool_id,
  rule_id,
  rule_pattern,
  fixer_tool_id,
  confidence,
  issue_type,
  safe_for_auto_apply,
  notes
)
VALUES
  ('eslint', 'security/*', 'security/.*', 'corgea', 70, 'security', false,
   'Corgea handles ESLint security plugin findings'),
  ('eslint', 'no-eval', 'no-eval', 'corgea', 85, 'security', false,
   'Corgea replaces dangerous eval with safe alternatives')
ON CONFLICT (validator_tool_id, rule_id) DO UPDATE SET
  fixer_tool_id = EXCLUDED.fixer_tool_id,
  confidence = EXCLUDED.confidence,
  notes = EXCLUDED.notes,
  updated_at = NOW();

-- SpotBugs security rules -> Corgea
INSERT INTO rule_to_fixer_mappings (
  validator_tool_id,
  rule_id,
  rule_pattern,
  fixer_tool_id,
  confidence,
  issue_type,
  safe_for_auto_apply,
  notes
)
VALUES
  ('spotbugs', 'SQL_INJECTION*', 'SQL_INJECTION.*', 'corgea', 80, 'security', false,
   'Corgea generates parameterized query fixes'),
  ('spotbugs', 'PATH_TRAVERSAL*', 'PATH_TRAVERSAL.*', 'corgea', 80, 'security', false,
   'Corgea adds path canonicalization and validation'),
  ('spotbugs', 'XSS*', 'XSS.*', 'corgea', 75, 'security', false,
   'Corgea generates proper output encoding')
ON CONFLICT (validator_tool_id, rule_id) DO UPDATE SET
  fixer_tool_id = EXCLUDED.fixer_tool_id,
  confidence = EXCLUDED.confidence,
  notes = EXCLUDED.notes,
  updated_at = NOW();

-- Gitleaks secrets -> Corgea (recommendation only, secrets must be rotated)
INSERT INTO rule_to_fixer_mappings (
  validator_tool_id,
  rule_id,
  rule_pattern,
  fixer_tool_id,
  confidence,
  issue_type,
  safe_for_auto_apply,
  notes
)
VALUES
  ('gitleaks', 'generic-api-key', '.*', 'corgea', 60, 'secrets', false,
   'Corgea suggests environment variable usage, but secrets must be rotated manually')
ON CONFLICT (validator_tool_id, rule_id) DO UPDATE SET
  fixer_tool_id = EXCLUDED.fixer_tool_id,
  confidence = EXCLUDED.confidence,
  notes = EXCLUDED.notes,
  updated_at = NOW();

-- ============================================================================
-- SUBSCRIPTION TIERS TABLE (for reference)
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscription_tiers (
  tier_id VARCHAR(20) PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  description TEXT,
  cloud_fixers_enabled BOOLEAN DEFAULT false,
  max_fixes_per_analysis INTEGER DEFAULT 0,
  max_monthly_fixes INTEGER DEFAULT 0,
  priority_queue BOOLEAN DEFAULT false,
  price_monthly_usd DECIMAL(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert tier definitions
INSERT INTO subscription_tiers (tier_id, name, description, cloud_fixers_enabled, max_fixes_per_analysis, max_monthly_fixes, priority_queue, price_monthly_usd)
VALUES
  ('basic', 'Basic', 'Free tier with CLI tools only', false, 0, 0, false, 0),
  ('pro', 'Pro', 'Professional tier with cloud AI fixers', true, 50, 500, false, 49.00),
  ('enterprise', 'Enterprise', 'Unlimited cloud AI fixers with priority queue', true, 200, -1, true, 199.00)
ON CONFLICT (tier_id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  cloud_fixers_enabled = EXCLUDED.cloud_fixers_enabled,
  max_fixes_per_analysis = EXCLUDED.max_fixes_per_analysis,
  max_monthly_fixes = EXCLUDED.max_monthly_fixes,
  priority_queue = EXCLUDED.priority_queue,
  price_monthly_usd = EXCLUDED.price_monthly_usd,
  updated_at = NOW();

-- ============================================================================
-- CLOUD API USAGE TRACKING (for billing and rate limiting)
-- ============================================================================

CREATE TABLE IF NOT EXISTS cloud_api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  tool_id VARCHAR(50) REFERENCES fixer_tools(tool_id),
  tier_id VARCHAR(20) REFERENCES subscription_tiers(tier_id),
  fixes_generated INTEGER DEFAULT 0,
  api_calls INTEGER DEFAULT 0,
  duration_ms INTEGER DEFAULT 0,
  success BOOLEAN DEFAULT true,
  error_code VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for usage queries
CREATE INDEX IF NOT EXISTS idx_cloud_api_usage_user_date
  ON cloud_api_usage(user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_cloud_api_usage_tool
  ON cloud_api_usage(tool_id, created_at);

-- ============================================================================
-- HELPER VIEWS
-- ============================================================================

-- View to get fixer with tier requirements
CREATE OR REPLACE VIEW v_fixers_with_tiers AS
SELECT
  f.tool_id,
  f.name,
  f.tool_type,
  f.min_tier,
  f.languages,
  f.categories,
  f.execution_order,
  st.cloud_fixers_enabled,
  st.max_fixes_per_analysis
FROM fixer_tools f
LEFT JOIN subscription_tiers st ON st.tier_id = f.min_tier;

-- View to get user's monthly usage
CREATE OR REPLACE VIEW v_user_monthly_usage AS
SELECT
  user_id,
  DATE_TRUNC('month', created_at) AS month,
  SUM(fixes_generated) AS total_fixes,
  SUM(api_calls) AS total_api_calls,
  COUNT(*) AS total_requests
FROM cloud_api_usage
WHERE created_at >= DATE_TRUNC('month', NOW())
GROUP BY user_id, DATE_TRUNC('month', created_at);

-- ============================================================================
-- FUNCTION: Check if user can use cloud fixer
-- ============================================================================

CREATE OR REPLACE FUNCTION can_use_cloud_fixer(
  p_user_id UUID,
  p_tier_id VARCHAR(20),
  p_requested_fixes INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_tier RECORD;
  v_monthly_usage INTEGER;
  v_result JSONB;
BEGIN
  -- Get tier limits
  SELECT * INTO v_tier FROM subscription_tiers WHERE tier_id = p_tier_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'Invalid subscription tier'
    );
  END IF;

  -- Check if cloud fixers are enabled for tier
  IF NOT v_tier.cloud_fixers_enabled THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'Cloud fixers not available on ' || p_tier_id || ' tier',
      'upgrade_to', 'pro'
    );
  END IF;

  -- Check per-analysis limit
  IF v_tier.max_fixes_per_analysis > 0 AND p_requested_fixes > v_tier.max_fixes_per_analysis THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'Exceeds per-analysis limit of ' || v_tier.max_fixes_per_analysis,
      'limit', v_tier.max_fixes_per_analysis
    );
  END IF;

  -- Check monthly limit (skip if unlimited = -1)
  IF v_tier.max_monthly_fixes > 0 THEN
    SELECT COALESCE(SUM(fixes_generated), 0) INTO v_monthly_usage
    FROM cloud_api_usage
    WHERE user_id = p_user_id
      AND created_at >= DATE_TRUNC('month', NOW());

    IF (v_monthly_usage + p_requested_fixes) > v_tier.max_monthly_fixes THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'Monthly limit reached',
        'used', v_monthly_usage,
        'limit', v_tier.max_monthly_fixes,
        'resets_at', DATE_TRUNC('month', NOW()) + INTERVAL '1 month'
      );
    END IF;
  END IF;

  -- All checks passed
  RETURN jsonb_build_object(
    'allowed', true,
    'remaining_this_analysis', v_tier.max_fixes_per_analysis - p_requested_fixes,
    'remaining_this_month', CASE
      WHEN v_tier.max_monthly_fixes = -1 THEN NULL  -- Unlimited
      ELSE v_tier.max_monthly_fixes - COALESCE(v_monthly_usage, 0) - p_requested_fixes
    END
  );
END;
$$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify Corgea fixer was added
-- SELECT tool_id, name, tool_type, min_tier, api_config->>'baseUrl' as api_url
-- FROM fixer_tools
-- WHERE tool_id = 'corgea';

-- Verify rule mappings
-- SELECT validator_tool_id, rule_id, fixer_tool_id, confidence
-- FROM rule_to_fixer_mappings
-- WHERE fixer_tool_id = 'corgea';

-- Verify subscription tiers
-- SELECT * FROM subscription_tiers;
