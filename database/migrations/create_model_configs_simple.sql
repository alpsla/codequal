-- Simple migration to create model_configs table
-- Run this in Supabase SQL Editor

-- Drop table if exists (for development)
DROP TABLE IF EXISTS model_configs CASCADE;

-- Create the model_configs table
CREATE TABLE model_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role TEXT NOT NULL,
  language TEXT,
  repository_size TEXT,
  complexity TEXT,
  primary_model TEXT NOT NULL,
  primary_version TEXT,
  primary_cost_per_1k_input DECIMAL(10, 6),
  primary_cost_per_1k_output DECIMAL(10, 6),
  fallback_model TEXT,
  fallback_version TEXT,
  fallback_cost_per_1k_input DECIMAL(10, 6),
  fallback_cost_per_1k_output DECIMAL(10, 6),
  performance_score DECIMAL(3, 2) DEFAULT 0.50,
  usage_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  last_used TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_model_configs_role ON model_configs(role);
CREATE INDEX idx_model_configs_active ON model_configs(is_active);

-- Insert initial data
INSERT INTO model_configs (role, primary_model, primary_cost_per_1k_input, primary_cost_per_1k_output, performance_score)
VALUES 
  ('deepwiki', 'openai/gpt-4o', 0.0025, 0.01, 0.85),
  ('orchestrator', 'openai/gpt-4o-mini', 0.00015, 0.0006, 0.75),
  ('researcher', 'openai/gpt-4o', 0.0025, 0.01, 0.90),
  ('educator', 'openai/gpt-4o-mini', 0.00015, 0.0006, 0.70),
  ('report-generator', 'openai/gpt-4o', 0.0025, 0.01, 0.85);

-- Grant permissions
GRANT ALL ON model_configs TO authenticated;
GRANT ALL ON model_configs TO service_role;