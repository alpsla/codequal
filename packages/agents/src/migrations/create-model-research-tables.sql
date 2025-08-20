-- Migration: Create Model Research Tables
-- Purpose: Store quarterly AI model research results and configurations

-- 1. Model Research Results Table
CREATE TABLE IF NOT EXISTS model_research (
  id TEXT PRIMARY KEY,
  model_id TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL,
  quality_score INTEGER CHECK (quality_score >= 0 AND quality_score <= 100),
  speed_score INTEGER CHECK (speed_score >= 0 AND speed_score <= 100),
  price_score INTEGER CHECK (price_score >= 0 AND price_score <= 100),
  context_length INTEGER,
  specializations TEXT[],
  optimal_for JSONB,
  research_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  next_research_date TIMESTAMP WITH TIME ZONE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Model Research Metadata Table (singleton)
CREATE TABLE IF NOT EXISTS model_research_metadata (
  id TEXT PRIMARY KEY DEFAULT 'singleton',
  last_research_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  next_scheduled_research TIMESTAMP WITH TIME ZONE,
  total_models_researched INTEGER DEFAULT 0,
  research_version TEXT DEFAULT '1.0.0',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Context-Specific Model Research Table
CREATE TABLE IF NOT EXISTS model_context_research (
  id TEXT PRIMARY KEY,
  model_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  quality_score INTEGER CHECK (quality_score >= 0 AND quality_score <= 100),
  speed_score INTEGER CHECK (speed_score >= 0 AND speed_score <= 100),
  price_score INTEGER CHECK (price_score >= 0 AND price_score <= 100),
  context_length INTEGER,
  specializations TEXT[],
  optimal_for JSONB,
  context JSONB NOT NULL,
  research_type TEXT DEFAULT 'specific',
  research_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_model_research_provider ON model_research(provider);
CREATE INDEX IF NOT EXISTS idx_model_research_quality ON model_research(quality_score DESC);
CREATE INDEX IF NOT EXISTS idx_model_research_optimal_languages ON model_research USING GIN ((optimal_for->'languages'));
CREATE INDEX IF NOT EXISTS idx_model_research_optimal_sizes ON model_research USING GIN ((optimal_for->'repo_sizes'));

CREATE INDEX IF NOT EXISTS idx_context_research_expires ON model_context_research(expires_at);
CREATE INDEX IF NOT EXISTS idx_context_research_context ON model_context_research USING GIN (context);

-- Add update triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_model_research_updated_at
  BEFORE UPDATE ON model_research
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_model_research_metadata_updated_at
  BEFORE UPDATE ON model_research_metadata
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_model_context_research_updated_at
  BEFORE UPDATE ON model_context_research
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant appropriate permissions
GRANT ALL ON model_research TO service_role;
GRANT ALL ON model_research_metadata TO service_role;
GRANT ALL ON model_context_research TO service_role;

GRANT SELECT ON model_research TO anon, authenticated;
GRANT SELECT ON model_research_metadata TO anon, authenticated;
GRANT SELECT ON model_context_research TO anon, authenticated;