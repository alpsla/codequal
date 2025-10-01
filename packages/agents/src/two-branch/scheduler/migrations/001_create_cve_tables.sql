-- CVE Database Tables for Dependency-Check Integration
-- Migration: 001_create_cve_tables
-- Purpose: Store NVD CVE data in Supabase for fast lookups during analysis

-- =============================================================================
-- CVE Database Cache Table
-- =============================================================================
CREATE TABLE IF NOT EXISTS cve_database (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- CVE Identity
  cve_id VARCHAR(20) NOT NULL UNIQUE,  -- CVE-2023-12345

  -- Severity Metrics
  cvss_v3_score DECIMAL(3,1),          -- 9.8
  cvss_v3_vector TEXT,                 -- CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H
  cvss_v2_score DECIMAL(3,1),          -- 7.5
  severity VARCHAR(20),                -- CRITICAL, HIGH, MEDIUM, LOW

  -- Classification
  cwe_id VARCHAR(20),                  -- CWE-79
  description TEXT NOT NULL,

  -- Affected Software (CPE Format)
  cpe_entries JSONB,                   -- Array of CPE 2.3 identifiers

  -- References and Resources
  reference_urls JSONB,                -- Array of reference URLs

  -- Temporal Metadata
  published_date TIMESTAMP,
  last_modified_date TIMESTAMP,

  -- Cache Management
  cached_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Data Validation
  CONSTRAINT cve_id_format CHECK (cve_id ~ '^CVE-\d{4}-\d{4,}$')
);

-- =============================================================================
-- Indexes for Performance Optimization
-- =============================================================================

-- Primary lookup by CVE ID (most common query)
CREATE INDEX IF NOT EXISTS idx_cve_id ON cve_database(cve_id);

-- Filter by severity
CREATE INDEX IF NOT EXISTS idx_severity ON cve_database(severity);

-- Sort by CVSS score (descending for "most critical" queries)
CREATE INDEX IF NOT EXISTS idx_cvss_score ON cve_database(cvss_v3_score DESC);

-- Search within CPE entries (GIN index for JSONB containment queries)
CREATE INDEX IF NOT EXISTS idx_cpe_entries ON cve_database USING GIN (cpe_entries);

-- Filter by publication date (for "recent vulnerabilities" queries)
CREATE INDEX IF NOT EXISTS idx_published_date ON cve_database(published_date DESC);

-- =============================================================================
-- Automatic Timestamp Update Trigger
-- =============================================================================

CREATE OR REPLACE FUNCTION update_cve_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS cve_updated_at_trigger ON cve_database;
CREATE TRIGGER cve_updated_at_trigger
  BEFORE UPDATE ON cve_database
  FOR EACH ROW
  EXECUTE FUNCTION update_cve_updated_at();

-- =============================================================================
-- CVE Update Log Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS cve_update_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Update Execution Details
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  status VARCHAR(20) NOT NULL,  -- SUCCESS, FAILED, IN_PROGRESS

  -- Metrics
  cves_added INTEGER DEFAULT 0,
  cves_updated INTEGER DEFAULT 0,
  cves_total INTEGER DEFAULT 0,
  duration_seconds INTEGER,

  -- NVD API Information
  nvd_last_modified_date TIMESTAMP,
  api_requests_made INTEGER,

  -- Error Tracking
  error_message TEXT,
  error_details JSONB,

  -- Execution Context
  triggered_by VARCHAR(50),     -- SCHEDULER, MANUAL, API
  server_info JSONB
);

-- Indexes for update log queries
CREATE INDEX IF NOT EXISTS idx_update_status ON cve_update_log(status);
CREATE INDEX IF NOT EXISTS idx_update_started ON cve_update_log(started_at DESC);

-- =============================================================================
-- Row Level Security (RLS) Policies
-- =============================================================================

-- Enable RLS on both tables
ALTER TABLE cve_database ENABLE ROW LEVEL SECURITY;
ALTER TABLE cve_update_log ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (for backend operations)
CREATE POLICY "Service role has full access to cve_database"
  ON cve_database
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role has full access to cve_update_log"
  ON cve_update_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated users can read CVE data (for frontend queries)
CREATE POLICY "Authenticated users can read cve_database"
  ON cve_database
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read cve_update_log"
  ON cve_update_log
  FOR SELECT
  TO authenticated
  USING (true);

-- =============================================================================
-- Helpful Views for Common Queries
-- =============================================================================

-- Recent critical vulnerabilities
CREATE OR REPLACE VIEW recent_critical_cves AS
SELECT
  cve_id,
  cvss_v3_score,
  severity,
  description,
  published_date,
  cpe_entries
FROM cve_database
WHERE severity IN ('CRITICAL', 'HIGH')
  AND published_date >= NOW() - INTERVAL '30 days'
ORDER BY cvss_v3_score DESC, published_date DESC;

-- Update statistics
CREATE OR REPLACE VIEW update_statistics AS
SELECT
  DATE(started_at) as update_date,
  COUNT(*) as total_updates,
  COUNT(*) FILTER (WHERE status = 'SUCCESS') as successful_updates,
  COUNT(*) FILTER (WHERE status = 'FAILED') as failed_updates,
  AVG(duration_seconds) FILTER (WHERE status = 'SUCCESS') as avg_duration_seconds,
  SUM(cves_added) as total_cves_added,
  SUM(cves_updated) as total_cves_updated
FROM cve_update_log
WHERE started_at >= NOW() - INTERVAL '90 days'
GROUP BY DATE(started_at)
ORDER BY update_date DESC;

-- =============================================================================
-- Grant Permissions
-- =============================================================================

GRANT SELECT ON recent_critical_cves TO authenticated;
GRANT SELECT ON update_statistics TO authenticated;

-- =============================================================================
-- Migration Complete
-- =============================================================================

COMMENT ON TABLE cve_database IS 'NVD CVE vulnerability cache for Dependency-Check analysis';
COMMENT ON TABLE cve_update_log IS 'Audit log of NVD database update operations';
COMMENT ON VIEW recent_critical_cves IS 'Critical/High severity CVEs from last 30 days';
COMMENT ON VIEW update_statistics IS 'Daily aggregated statistics of CVE update operations';
