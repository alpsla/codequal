-- Service Health Events Table
-- Tracks service health metrics for monitoring and alerting
-- Used for Grafana dashboards and business service health tracking

CREATE TABLE IF NOT EXISTS service_health_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  service_name TEXT NOT NULL,
  status_code INTEGER,
  url TEXT,
  error_message TEXT,
  error_details JSONB,
  repository_url TEXT,
  pr_number INTEGER,
  analysis_id TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_service_health_events_event_type ON service_health_events(event_type);
CREATE INDEX IF NOT EXISTS idx_service_health_events_service_name ON service_health_events(service_name);
CREATE INDEX IF NOT EXISTS idx_service_health_events_status_code ON service_health_events(status_code);
CREATE INDEX IF NOT EXISTS idx_service_health_events_created_at ON service_health_events(created_at);
CREATE INDEX IF NOT EXISTS idx_service_health_events_repository_url ON service_health_events(repository_url);
CREATE INDEX IF NOT EXISTS idx_service_health_events_analysis_id ON service_health_events(analysis_id);

-- Composite index for common queries (service + event_type + date range)
CREATE INDEX IF NOT EXISTS idx_service_health_events_service_event_date 
  ON service_health_events(service_name, event_type, created_at);

-- Enable RLS
ALTER TABLE service_health_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Service role can manage all health events
CREATE POLICY "Service role can manage health events" ON service_health_events
  FOR ALL USING (auth.role() = 'service_role');

-- Function to clean up old events (keep last 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_service_health_events()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM service_health_events
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$;

-- View for dashboard queries: Service health summary
CREATE OR REPLACE VIEW service_health_summary AS
SELECT
  service_name,
  event_type,
  COUNT(*) as event_count,
  COUNT(CASE WHEN status_code = 404 THEN 1 END) as http_404_count,
  COUNT(CASE WHEN status_code >= 500 THEN 1 END) as http_5xx_count,
  COUNT(CASE WHEN error_message IS NOT NULL THEN 1 END) as error_count,
  MIN(created_at) as first_event,
  MAX(created_at) as last_event
FROM service_health_events
GROUP BY service_name, event_type;

-- View for dashboard queries: Recent failures (last 24 hours)
CREATE OR REPLACE VIEW recent_service_failures AS
SELECT
  id,
  event_type,
  service_name,
  status_code,
  url,
  error_message,
  repository_url,
  pr_number,
  analysis_id,
  created_at
FROM service_health_events
WHERE 
  (event_type LIKE '%failure%' OR event_type LIKE '%error%')
  AND created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- View for dashboard queries: Service availability (success rate)
CREATE OR REPLACE VIEW service_availability AS
SELECT
  service_name,
  COUNT(*) as total_events,
  COUNT(CASE WHEN event_type LIKE '%success%' THEN 1 END) as success_count,
  COUNT(CASE WHEN event_type LIKE '%failure%' OR event_type LIKE '%error%' THEN 1 END) as failure_count,
  ROUND(
    (COUNT(CASE WHEN event_type LIKE '%success%' THEN 1 END)::numeric / 
     NULLIF(COUNT(*), 0)::numeric) * 100, 
    2
  ) as success_rate_percent,
  ROUND(
    (COUNT(CASE WHEN event_type LIKE '%failure%' OR event_type LIKE '%error%' THEN 1 END)::numeric / 
     NULLIF(COUNT(*), 0)::numeric) * 100, 
    2
  ) as failure_rate_percent
FROM service_health_events
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY service_name;

