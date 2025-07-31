-- Repository Tracking Tables for Supabase
-- This script creates tables needed for tracking repository issues over time

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS repository_trends CASCADE;
DROP TABLE IF EXISTS repository_issues CASCADE;

-- Repository Issues History
CREATE TABLE repository_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_url TEXT NOT NULL,
  issue_id TEXT NOT NULL,
  first_seen TIMESTAMP WITH TIME ZONE NOT NULL,
  last_seen TIMESTAMP WITH TIME ZONE NOT NULL,
  occurrences INTEGER DEFAULT 1,
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  category TEXT NOT NULL,
  title TEXT,
  description TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'recurring')),
  resolution_attempts INTEGER DEFAULT 0,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(repository_url, issue_id)
);

-- Repository Trends
CREATE TABLE repository_trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_url TEXT NOT NULL,
  date DATE NOT NULL,
  total_issues INTEGER NOT NULL,
  critical_issues INTEGER DEFAULT 0,
  high_issues INTEGER DEFAULT 0,
  resolved_issues INTEGER DEFAULT 0,
  recurring_issues INTEGER DEFAULT 0,
  new_issues INTEGER DEFAULT 0,
  overall_score INTEGER,
  technical_debt NUMERIC(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(repository_url, date)
);

-- Create indexes for performance
CREATE INDEX idx_repository_issues_url ON repository_issues(repository_url);
CREATE INDEX idx_repository_issues_status ON repository_issues(status);
CREATE INDEX idx_repository_issues_severity ON repository_issues(severity);
CREATE INDEX idx_repository_issues_last_seen ON repository_issues(last_seen DESC);
CREATE INDEX idx_repository_trends_url_date ON repository_trends(repository_url, date DESC);

-- Enable Row Level Security
ALTER TABLE repository_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE repository_trends ENABLE ROW LEVEL SECURITY;

-- RLS Policies for repository_issues
CREATE POLICY "Allow authenticated users to read repository issues"
  ON repository_issues
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow service role to manage repository issues"
  ON repository_issues
  FOR ALL
  TO service_role
  USING (true);

-- RLS Policies for repository_trends
CREATE POLICY "Allow authenticated users to read repository trends"
  ON repository_trends
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow service role to manage repository trends"
  ON repository_trends
  FOR ALL
  TO service_role
  USING (true);

-- Create update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_repository_issues_updated_at
  BEFORE UPDATE ON repository_issues
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

-- Sample queries for testing

-- Get all active issues for a repository
-- SELECT * FROM repository_issues 
-- WHERE repository_url = 'https://github.com/test-org/test-repo' 
-- AND status = 'active'
-- ORDER BY severity, last_seen DESC;

-- Get repository trend for the last 30 days
-- SELECT * FROM repository_trends
-- WHERE repository_url = 'https://github.com/test-org/test-repo'
-- AND date >= CURRENT_DATE - INTERVAL '30 days'
-- ORDER BY date DESC;

-- Get recurring issues
-- SELECT * FROM repository_issues
-- WHERE repository_url = 'https://github.com/test-org/test-repo'
-- AND status = 'recurring'
-- ORDER BY occurrences DESC;