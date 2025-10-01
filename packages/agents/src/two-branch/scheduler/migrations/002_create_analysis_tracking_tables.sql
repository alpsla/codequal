-- Migration 002: Analysis Tracking Tables
-- Created: 2025-10-01
-- Purpose: Tables for tracking analysis requests, CVE updates, and scheduler jobs

-- ============================================================
-- TABLE 1: Analysis Requests Queue
-- ============================================================

CREATE TABLE IF NOT EXISTS analysis_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  repository_url VARCHAR(500) NOT NULL,
  branch VARCHAR(100) NOT NULL,
  pr_number INTEGER,

  -- Status tracking
  status VARCHAR(20) NOT NULL CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED')),

  -- Timestamps
  requested_at TIMESTAMP NOT NULL DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,

  -- Results
  results JSONB,  -- Analysis results when completed
  error_message TEXT,
  error_details JSONB,

  -- Metadata
  metadata JSONB,  -- Additional request metadata
  requested_by VARCHAR(100),  -- User or system that requested
  priority INTEGER DEFAULT 5,  -- 1=highest, 10=lowest

  -- Performance tracking
  duration_seconds INTEGER,
  tool_durations JSONB,  -- Per-tool execution times

  -- Indexes
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for analysis_requests
CREATE INDEX idx_analysis_requests_status ON analysis_requests(status);
CREATE INDEX idx_analysis_requests_requested_at ON analysis_requests(requested_at DESC);
CREATE INDEX idx_analysis_requests_repository ON analysis_requests(repository_url);
CREATE INDEX idx_analysis_requests_priority ON analysis_requests(priority, requested_at);

-- ============================================================
-- TABLE 2: CVE Update Log
-- ============================================================

CREATE TABLE IF NOT EXISTS cve_update_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Execution tracking
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP,
  status VARCHAR(20) NOT NULL CHECK (status IN ('IN_PROGRESS', 'SUCCESS', 'FAILED')),
  triggered_by VARCHAR(50) NOT NULL,  -- SCHEDULER, MANUAL, API

  -- Update metrics
  cves_added INTEGER DEFAULT 0,
  cves_updated INTEGER DEFAULT 0,
  cves_total INTEGER DEFAULT 0,
  api_requests_made INTEGER DEFAULT 0,
  duration_seconds INTEGER,

  -- NVD tracking
  nvd_last_modified_date TIMESTAMP,
  nvd_api_version VARCHAR(10) DEFAULT '2.0',

  -- Error handling
  error_message TEXT,
  error_details JSONB,

  -- Server information
  server_info JSONB,  -- Docker image, Node version, etc.

  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for cve_update_log
CREATE INDEX idx_cve_update_log_started_at ON cve_update_log(started_at DESC);
CREATE INDEX idx_cve_update_log_status ON cve_update_log(status);

-- ============================================================
-- TABLE 3: Scheduler Job History
-- ============================================================

CREATE TABLE IF NOT EXISTS scheduler_job_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Job identification
  job_id VARCHAR(100) NOT NULL,  -- e.g., 'daily-cve-update', 'quarterly-model-research'
  job_name VARCHAR(200) NOT NULL,
  job_type VARCHAR(50) NOT NULL,  -- CVE_UPDATE, MODEL_RESEARCH, COST_OPTIMIZATION, etc.

  -- Execution tracking
  scheduled_time TIMESTAMP NOT NULL,
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  status VARCHAR(20) NOT NULL CHECK (status IN ('RUNNING', 'COMPLETED', 'FAILED', 'SKIPPED')),

  -- Results
  results JSONB,
  error_message TEXT,
  error_details JSONB,

  -- Performance
  duration_seconds INTEGER,

  -- Metadata
  metadata JSONB,

  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for scheduler_job_history
CREATE INDEX idx_scheduler_job_history_job_id ON scheduler_job_history(job_id, started_at DESC);
CREATE INDEX idx_scheduler_job_history_status ON scheduler_job_history(status);
CREATE INDEX idx_scheduler_job_history_started_at ON scheduler_job_history(started_at DESC);

-- ============================================================
-- TABLE 4: Dependency Scan Cache
-- ============================================================

CREATE TABLE IF NOT EXISTS dependency_scan_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Repository identification
  repository_url VARCHAR(500) NOT NULL,
  branch VARCHAR(100) NOT NULL,
  commit_sha VARCHAR(40) NOT NULL,

  -- Dependency file hash (to detect changes)
  dependency_file_hash VARCHAR(64) NOT NULL,  -- SHA-256 of pom.xml or package.json

  -- Scan results
  dependencies JSONB NOT NULL,  -- Array of dependencies
  vulnerabilities JSONB NOT NULL,  -- Array of found vulnerabilities
  total_dependencies INTEGER NOT NULL,
  total_vulnerabilities INTEGER NOT NULL,

  -- Severity breakdown
  critical_count INTEGER DEFAULT 0,
  high_count INTEGER DEFAULT 0,
  medium_count INTEGER DEFAULT 0,
  low_count INTEGER DEFAULT 0,

  -- Cache metadata
  scanned_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),

  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for dependency_scan_cache
CREATE INDEX idx_dependency_scan_cache_repo_branch ON dependency_scan_cache(repository_url, branch, commit_sha);
CREATE INDEX idx_dependency_scan_cache_hash ON dependency_scan_cache(dependency_file_hash);
CREATE INDEX idx_dependency_scan_cache_expires ON dependency_scan_cache(expires_at);

-- ============================================================
-- FUNCTIONS: Auto-update timestamps
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for analysis_requests
CREATE TRIGGER update_analysis_requests_updated_at
BEFORE UPDATE ON analysis_requests
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE analysis_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE cve_update_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduler_job_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE dependency_scan_cache ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role full access" ON analysis_requests
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON cve_update_log
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON scheduler_job_history
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON dependency_scan_cache
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- CLEANUP POLICIES
-- ============================================================

-- Auto-cleanup old dependency scan cache entries (older than expires_at)
CREATE OR REPLACE FUNCTION cleanup_expired_dependency_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM dependency_scan_cache
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup (requires pg_cron extension)
-- Run daily at 3 AM
-- SELECT cron.schedule('cleanup-dependency-cache', '0 3 * * *', 'SELECT cleanup_expired_dependency_cache()');

-- ============================================================
-- INITIAL DATA
-- ============================================================

-- Insert initial scheduler job record (for tracking)
INSERT INTO scheduler_job_history (job_id, job_name, job_type, scheduled_time, started_at, status, results)
VALUES (
  'system-init',
  'System Initialization',
  'SYSTEM',
  NOW(),
  NOW(),
  'COMPLETED',
  '{"message": "Analysis tracking tables created successfully"}'::JSONB
) ON CONFLICT DO NOTHING;

-- ============================================================
-- COMMENTS
-- ============================================================

COMMENT ON TABLE analysis_requests IS 'Queue for tracking code analysis requests from main to completion';
COMMENT ON TABLE cve_update_log IS 'Audit log for CVE database update operations';
COMMENT ON TABLE scheduler_job_history IS 'Historical record of all scheduled job executions';
COMMENT ON TABLE dependency_scan_cache IS 'Cache for dependency scan results to avoid re-scanning unchanged files';

COMMENT ON COLUMN analysis_requests.priority IS '1=highest priority, 10=lowest priority, default=5';
COMMENT ON COLUMN cve_update_log.triggered_by IS 'SCHEDULER for cron jobs, MANUAL for script execution, API for programmatic triggers';
COMMENT ON COLUMN dependency_scan_cache.dependency_file_hash IS 'SHA-256 hash of dependency manifest file (pom.xml, package.json, etc.)';
COMMENT ON COLUMN dependency_scan_cache.expires_at IS 'Cache expiration time (default: 7 days from scan)';
