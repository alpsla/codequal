-- Update the repositories table to add new fields
ALTER TABLE repositories
ADD COLUMN IF NOT EXISTS primary_language TEXT,
ADD COLUMN IF NOT EXISTS languages JSONB,
ADD COLUMN IF NOT EXISTS size BIGINT;

-- Update the pr_reviews table to add analysis_mode
ALTER TABLE pr_reviews
ADD COLUMN IF NOT EXISTS analysis_mode TEXT NOT NULL DEFAULT 'quick';

-- Create the repository_analysis table for caching repository analysis
CREATE TABLE IF NOT EXISTS repository_analysis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  analyzer TEXT NOT NULL,
  analysis_data JSONB NOT NULL,
  metadata JSONB,
  cached_until TIMESTAMP WITH TIME ZONE NOT NULL,
  execution_time_ms INTEGER,
  token_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create an index for faster repository analysis lookups
CREATE INDEX IF NOT EXISTS repository_analysis_repository_id_idx ON repository_analysis(repository_id);
CREATE INDEX IF NOT EXISTS repository_analysis_analyzer_idx ON repository_analysis(analyzer);
CREATE INDEX IF NOT EXISTS repository_analysis_cached_until_idx ON repository_analysis(cached_until);

-- Create the calibration_runs table for model calibration
CREATE TABLE IF NOT EXISTS calibration_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id TEXT NOT NULL UNIQUE,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  model_versions JSONB NOT NULL,
  metrics JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create the calibration_test_results table for test results
CREATE TABLE IF NOT EXISTS calibration_test_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id TEXT NOT NULL REFERENCES calibration_runs(run_id) ON DELETE CASCADE,
  repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  size TEXT NOT NULL,
  languages TEXT[] NOT NULL,
  architecture TEXT NOT NULL,
  results JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create an index for faster calibration test result lookups
CREATE INDEX IF NOT EXISTS calibration_test_results_run_id_idx ON calibration_test_results(run_id);
CREATE INDEX IF NOT EXISTS calibration_test_results_repository_id_idx ON calibration_test_results(repository_id);

-- Create a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for tables that need updated_at
CREATE TRIGGER set_repositories_updated_at
BEFORE UPDATE ON repositories
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_repository_analysis_updated_at
BEFORE UPDATE ON repository_analysis
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();