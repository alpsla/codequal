-- Create tables for DeepWiki metrics in Supabase

-- Main metrics table
CREATE TABLE IF NOT EXISTS deepwiki_metrics (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  disk_total_gb INTEGER NOT NULL,
  disk_used_gb INTEGER NOT NULL,
  disk_available_gb INTEGER NOT NULL,
  disk_usage_percent INTEGER NOT NULL,
  active_repositories INTEGER DEFAULT 0,
  metadata JSONB
);

-- Analysis history table
CREATE TABLE IF NOT EXISTS analysis_history (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  repository_url TEXT NOT NULL,
  repository_name TEXT NOT NULL,
  status TEXT CHECK (status IN ('started', 'completed', 'failed')),
  disk_usage_mb INTEGER,
  analysis_duration_seconds INTEGER,
  error_message TEXT,
  metadata JSONB
);

-- Cleanup history table
CREATE TABLE IF NOT EXISTS deepwiki_cleanups (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  cleanup_time TIMESTAMP WITH TIME ZONE,
  cleanup_status TEXT CHECK (cleanup_status IN ('success', 'failed')),
  repositories_cleaned INTEGER DEFAULT 0,
  disk_freed_mb INTEGER,
  error_message TEXT
);

-- Create indexes for better query performance
CREATE INDEX idx_deepwiki_metrics_created_at ON deepwiki_metrics(created_at DESC);
CREATE INDEX idx_analysis_history_created_at ON analysis_history(created_at DESC);
CREATE INDEX idx_analysis_history_status ON analysis_history(status);

-- Insert some test data to verify Grafana connection
INSERT INTO deepwiki_metrics (
  disk_total_gb, 
  disk_used_gb, 
  disk_available_gb, 
  disk_usage_percent, 
  active_repositories
) VALUES 
  (10, 2, 8, 20, 3),
  (10, 3, 7, 30, 5),
  (10, 4, 6, 40, 8);

-- Insert test analysis history
INSERT INTO analysis_history (
  repository_url,
  repository_name,
  status,
  disk_usage_mb,
  analysis_duration_seconds
) VALUES 
  ('https://github.com/test/repo1', 'repo1', 'completed', 150, 45),
  ('https://github.com/test/repo2', 'repo2', 'completed', 200, 60),
  ('https://github.com/test/repo3', 'repo3', 'failed', 0, 10);