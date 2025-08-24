-- Optimization Script for CodeQual Grafana Dashboard
-- Run this in your Supabase SQL editor to improve dashboard performance

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_agent_activity_timestamp 
ON agent_activity(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_agent_activity_agent_role 
ON agent_activity(agent_role);

CREATE INDEX IF NOT EXISTS idx_agent_activity_model_used 
ON agent_activity(model_used);

CREATE INDEX IF NOT EXISTS idx_agent_activity_success 
ON agent_activity(success);

CREATE INDEX IF NOT EXISTS idx_agent_activity_is_fallback 
ON agent_activity(is_fallback);

-- Composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_agent_activity_timestamp_agent 
ON agent_activity(timestamp DESC, agent_role);

-- Index for cost analysis
CREATE INDEX IF NOT EXISTS idx_agent_activity_cost 
ON agent_activity(cost) 
WHERE cost > 0;

-- Partial index for failed operations (useful for error analysis)
CREATE INDEX IF NOT EXISTS idx_agent_activity_failures 
ON agent_activity(timestamp DESC, agent_role, error) 
WHERE success = false;

-- Create a materialized view for hourly aggregates (optional, for faster dashboard)
CREATE MATERIALIZED VIEW IF NOT EXISTS agent_activity_hourly AS
SELECT 
  date_trunc('hour', to_timestamp(timestamp/1000)) as hour,
  agent_role,
  model_used,
  COUNT(*) as operations,
  SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful_ops,
  SUM(CASE WHEN is_fallback THEN 1 ELSE 0 END) as fallback_ops,
  AVG(duration_ms) as avg_duration,
  SUM(input_tokens) as total_input_tokens,
  SUM(output_tokens) as total_output_tokens,
  SUM(cost) as total_cost
FROM agent_activity
GROUP BY hour, agent_role, model_used;

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_agent_activity_hourly_hour 
ON agent_activity_hourly(hour DESC);

-- Refresh materialized view (run periodically, e.g., every hour)
-- You can set up a cron job in Supabase to do this automatically
REFRESH MATERIALIZED VIEW agent_activity_hourly;

-- Create a function to clean up old data (optional, for data retention)
CREATE OR REPLACE FUNCTION cleanup_old_agent_activity()
RETURNS void AS $$
BEGIN
  -- Delete records older than 90 days
  DELETE FROM agent_activity 
  WHERE timestamp < extract(epoch from now() - interval '90 days') * 1000;
  
  -- Refresh materialized view after cleanup
  REFRESH MATERIALIZED VIEW agent_activity_hourly;
END;
$$ LANGUAGE plpgsql;

-- Example: Create a weekly cleanup job (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-agent-activity', '0 2 * * 0', 'SELECT cleanup_old_agent_activity();');

-- Analyze tables to update statistics
ANALYZE agent_activity;

-- View index usage statistics
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE tablename = 'agent_activity'
ORDER BY idx_scan DESC;