-- System Alerts Table for Model Selection Fallback Monitoring
-- Created: October 6, 2025
-- Purpose: Track OpenRouter key failures and emergency fallback activations

CREATE TABLE IF NOT EXISTS system_alerts (
  -- Primary identifier
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Alert classification
  alert_type TEXT NOT NULL,              -- 'openrouter_key_rotation' or 'emergency_fallback_activated'
  severity TEXT NOT NULL,                -- 'warning' or 'critical'
  component TEXT NOT NULL,               -- 'ModelConfigResolver'

  -- Context information
  context JSONB,                         -- { role, language, size_category }
  metadata JSONB,                        -- Additional context-specific data
  message TEXT NOT NULL,                 -- Human-readable message

  -- Timestamps
  timestamp TIMESTAMP NOT NULL,          -- When the alert event occurred
  created_at TIMESTAMP DEFAULT NOW(),    -- When the alert was created in DB
  resolved_at TIMESTAMP,                 -- When the alert was resolved

  -- Resolution tracking
  resolved BOOLEAN DEFAULT false,        -- Whether the issue is resolved
  resolved_by TEXT,                      -- Who/what resolved it (email or 'system')
  resolution_notes TEXT                  -- Additional notes about resolution
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_system_alerts_severity
  ON system_alerts(severity);

CREATE INDEX IF NOT EXISTS idx_system_alerts_resolved
  ON system_alerts(resolved);

CREATE INDEX IF NOT EXISTS idx_system_alerts_alert_type
  ON system_alerts(alert_type);

CREATE INDEX IF NOT EXISTS idx_system_alerts_timestamp
  ON system_alerts(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_system_alerts_component
  ON system_alerts(component);

-- Composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_system_alerts_severity_resolved_timestamp
  ON system_alerts(severity, resolved, timestamp DESC);

-- Comment on table
COMMENT ON TABLE system_alerts IS
  'Tracks system alerts for model selection fallback monitoring. ' ||
  'Level 1 (warning): OpenRouter key rotation. ' ||
  'Level 2 (critical): Emergency fallback activation.';

-- Example queries for monitoring

-- 1. Get all unresolved critical alerts
-- SELECT * FROM system_alerts
-- WHERE severity = 'critical' AND resolved = false
-- ORDER BY timestamp DESC;

-- 2. Count alerts by type in last 24 hours
-- SELECT alert_type, COUNT(*)
-- FROM system_alerts
-- WHERE timestamp > NOW() - INTERVAL '24 hours'
-- GROUP BY alert_type;

-- 3. Calculate MTTR (Mean Time To Resolution)
-- SELECT alert_type,
--   AVG(EXTRACT(EPOCH FROM (resolved_at - timestamp))) / 60 as avg_minutes
-- FROM system_alerts
-- WHERE resolved = true AND resolved_at IS NOT NULL
-- GROUP BY alert_type;
