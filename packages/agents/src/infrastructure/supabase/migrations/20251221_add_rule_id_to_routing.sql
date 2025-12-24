-- ================================================================================
-- Add rule_id to fix_routing_decisions table
-- Created: 2025-12-21 (Session 66)
--
-- Purpose: Track which rule triggered each routing decision for pattern analysis
-- ================================================================================

-- Add rule_id column to routing decisions
ALTER TABLE fix_routing_decisions
ADD COLUMN IF NOT EXISTS rule_id VARCHAR(200);

-- Add index for rule_id analysis
CREATE INDEX IF NOT EXISTS idx_routing_decisions_rule ON fix_routing_decisions(rule_id);

-- Comment
COMMENT ON COLUMN fix_routing_decisions.rule_id IS 'The semgrep/tool rule ID that triggered this fix decision';
