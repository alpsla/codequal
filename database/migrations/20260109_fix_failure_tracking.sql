-- SESSION 81: Fix Failure Tracking for Knowledge Base Learning Loop
-- Tracks fix failures to identify patterns that need guidance

-- Failure tracking table
CREATE TABLE IF NOT EXISTS fix_failure_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Issue identification
  rule_id VARCHAR(100) NOT NULL,
  language VARCHAR(50) NOT NULL,
  tool VARCHAR(50) NOT NULL DEFAULT 'any',

  -- Failure details
  failure_type VARCHAR(50) NOT NULL,  -- 'regression', 'validation_error', 'parse_error'
  regression_rules VARCHAR(100)[] DEFAULT '{}',  -- Rules that were triggered
  failure_message TEXT,

  -- Context for learning
  original_code TEXT,        -- The code that was being fixed
  attempted_fix TEXT,        -- The AI-generated fix that failed
  code_context TEXT,         -- Surrounding context

  -- Tracking
  failure_count INTEGER DEFAULT 1,
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),

  -- Review status
  review_status VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'reviewed', 'guidance_added', 'ignored'
  reviewed_by VARCHAR(100),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,

  -- Link to guidance if created
  guidance_id UUID REFERENCES fix_pattern_guidance(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for finding patterns needing review
CREATE INDEX IF NOT EXISTS idx_fix_failure_tracking_review
  ON fix_failure_tracking(review_status, failure_count DESC);

-- Index for rule lookup
CREATE INDEX IF NOT EXISTS idx_fix_failure_tracking_rule
  ON fix_failure_tracking(rule_id, language);

-- Compound index for deduplication
CREATE INDEX IF NOT EXISTS idx_fix_failure_tracking_dedup
  ON fix_failure_tracking(rule_id, language, tool, failure_type);

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION update_fix_failure_tracking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.last_seen_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS fix_failure_tracking_updated_at_trigger ON fix_failure_tracking;
CREATE TRIGGER fix_failure_tracking_updated_at_trigger
  BEFORE UPDATE ON fix_failure_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_fix_failure_tracking_updated_at();

-- View for patterns needing review (failed 3+ times)
CREATE OR REPLACE VIEW fix_failures_needing_review AS
SELECT
  id,
  rule_id,
  language,
  tool,
  failure_type,
  regression_rules,
  failure_count,
  first_seen_at,
  last_seen_at,
  review_status,
  CASE
    WHEN failure_count >= 10 THEN 'critical'
    WHEN failure_count >= 5 THEN 'high'
    WHEN failure_count >= 3 THEN 'medium'
    ELSE 'low'
  END as priority
FROM fix_failure_tracking
WHERE review_status = 'pending'
  AND failure_count >= 3
ORDER BY failure_count DESC, last_seen_at DESC;

-- Comments
COMMENT ON TABLE fix_failure_tracking IS 'Tracks AI fix failures for knowledge base learning loop';
COMMENT ON VIEW fix_failures_needing_review IS 'Patterns that have failed 3+ times and need human review';
COMMENT ON COLUMN fix_failure_tracking.review_status IS 'pending=needs review, reviewed=seen but no action, guidance_added=KB updated, ignored=known issue';
