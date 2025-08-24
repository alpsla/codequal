-- Migration: Create model_configs table for monitoring system
-- Date: 2025-08-24
-- Description: Creates the model_configs table used by the dynamic agent cost tracker 
-- and smart agent tracker services for runtime model configuration and metrics tracking.

-- Create the model_configs table
CREATE TABLE IF NOT EXISTS model_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Agent context
  role TEXT NOT NULL CHECK (role IN (
    'orchestrator', 'researcher', 'deepwiki', 'comparator', 
    'location-validator', 'educator', 'report-generator'
  )),
  language TEXT, -- Programming language (optional)
  repository_size TEXT CHECK (repository_size IN ('small', 'medium', 'large', 'enterprise')),
  complexity TEXT CHECK (complexity IN ('low', 'medium', 'high')),
  
  -- Primary model configuration
  primary_model TEXT NOT NULL,
  primary_version TEXT NOT NULL,
  primary_cost_per_1m_input DECIMAL(10,6) NOT NULL DEFAULT 0,
  primary_cost_per_1m_output DECIMAL(10,6) NOT NULL DEFAULT 0,
  
  -- Fallback model configuration (optional)
  fallback_model TEXT,
  fallback_version TEXT,
  fallback_cost_per_1m_input DECIMAL(10,6) DEFAULT 0,
  fallback_cost_per_1m_output DECIMAL(10,6) DEFAULT 0,
  
  -- Performance tracking
  performance_score DECIMAL(5,2) DEFAULT 0 CHECK (performance_score >= 0 AND performance_score <= 100),
  usage_count INTEGER DEFAULT 0 CHECK (usage_count >= 0),
  success_count INTEGER DEFAULT 0 CHECK (success_count >= 0),
  
  -- Status tracking
  is_active BOOLEAN DEFAULT true,
  last_used TIMESTAMP WITH TIME ZONE,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by TEXT DEFAULT 'system' CHECK (updated_by IN ('researcher', 'manual', 'orchestrator', 'system')),
  
  -- Additional metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Ensure we don't have duplicate active configs for the same context
  CONSTRAINT unique_active_config UNIQUE (role, language, repository_size, complexity) 
    DEFERRABLE INITIALLY DEFERRED
);

-- Create indexes for efficient queries
CREATE INDEX idx_model_configs_role ON model_configs(role);
CREATE INDEX idx_model_configs_language ON model_configs(language) WHERE language IS NOT NULL;
CREATE INDEX idx_model_configs_size ON model_configs(repository_size) WHERE repository_size IS NOT NULL;
CREATE INDEX idx_model_configs_complexity ON model_configs(complexity) WHERE complexity IS NOT NULL;
CREATE INDEX idx_model_configs_active ON model_configs(is_active) WHERE is_active = true;
CREATE INDEX idx_model_configs_performance ON model_configs(performance_score DESC, last_updated DESC);

-- Composite indexes for common queries
CREATE INDEX idx_model_configs_lookup ON model_configs(role, is_active, language, repository_size, complexity);
CREATE INDEX idx_model_configs_recent_usage ON model_configs(last_used DESC NULLS LAST) WHERE is_active = true;

-- Add table and column comments
COMMENT ON TABLE model_configs IS 'Runtime model configurations for agent monitoring system with performance tracking';
COMMENT ON COLUMN model_configs.role IS 'Agent role: orchestrator, researcher, deepwiki, comparator, location-validator, educator, report-generator';
COMMENT ON COLUMN model_configs.language IS 'Programming language context (optional)';
COMMENT ON COLUMN model_configs.repository_size IS 'Repository size category: small, medium, large, enterprise';
COMMENT ON COLUMN model_configs.complexity IS 'Analysis complexity level: low, medium, high';
COMMENT ON COLUMN model_configs.primary_model IS 'Primary model identifier (e.g., claude-opus-4-1, gpt-4o-2024-11-20)';
COMMENT ON COLUMN model_configs.primary_version IS 'Primary model version';
COMMENT ON COLUMN model_configs.primary_cost_per_1m_input IS 'Cost per 1M input tokens for primary model';
COMMENT ON COLUMN model_configs.primary_cost_per_1m_output IS 'Cost per 1M output tokens for primary model';
COMMENT ON COLUMN model_configs.performance_score IS 'Success rate percentage (0-100) based on usage tracking';
COMMENT ON COLUMN model_configs.usage_count IS 'Total number of times this config has been used';
COMMENT ON COLUMN model_configs.success_count IS 'Number of successful operations using this config';
COMMENT ON COLUMN model_configs.is_active IS 'Whether this configuration is currently active and available for selection';
COMMENT ON COLUMN model_configs.metadata IS 'Additional metadata as JSON object';

-- Create function to update performance score
CREATE OR REPLACE FUNCTION update_model_config_performance(
  config_id UUID,
  operation_success BOOLEAN
) RETURNS VOID AS $$
BEGIN
  UPDATE model_configs 
  SET 
    usage_count = usage_count + 1,
    success_count = CASE WHEN operation_success THEN success_count + 1 ELSE success_count END,
    performance_score = (
      CASE WHEN operation_success THEN success_count + 1 ELSE success_count END
    )::DECIMAL / (usage_count + 1) * 100,
    last_used = NOW(),
    last_updated = NOW()
  WHERE id = config_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to get best model config for context
CREATE OR REPLACE FUNCTION get_best_model_config(
  p_role TEXT,
  p_language TEXT DEFAULT NULL,
  p_repository_size TEXT DEFAULT NULL,
  p_complexity TEXT DEFAULT NULL
) RETURNS TABLE (
  id UUID,
  primary_model TEXT,
  primary_version TEXT,
  primary_cost_per_1m_input DECIMAL,
  primary_cost_per_1m_output DECIMAL,
  fallback_model TEXT,
  fallback_version TEXT,
  fallback_cost_per_1m_input DECIMAL,
  fallback_cost_per_1m_output DECIMAL,
  performance_score DECIMAL,
  metadata JSONB
) AS $$
BEGIN
  -- First try exact match
  RETURN QUERY
  SELECT 
    mc.id,
    mc.primary_model,
    mc.primary_version,
    mc.primary_cost_per_1m_input,
    mc.primary_cost_per_1m_output,
    mc.fallback_model,
    mc.fallback_version,
    mc.fallback_cost_per_1m_input,
    mc.fallback_cost_per_1m_output,
    mc.performance_score,
    mc.metadata
  FROM model_configs mc
  WHERE mc.role = p_role 
    AND mc.is_active = true
    AND (mc.language = p_language OR mc.language IS NULL OR p_language IS NULL)
    AND (mc.repository_size = p_repository_size OR mc.repository_size IS NULL OR p_repository_size IS NULL)
    AND (mc.complexity = p_complexity OR mc.complexity IS NULL OR p_complexity IS NULL)
  ORDER BY 
    -- Prioritize exact matches
    CASE WHEN mc.language = p_language THEN 0 ELSE 1 END,
    CASE WHEN mc.repository_size = p_repository_size THEN 0 ELSE 1 END,
    CASE WHEN mc.complexity = p_complexity THEN 0 ELSE 1 END,
    -- Then by performance
    mc.performance_score DESC,
    mc.last_updated DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create trigger to automatically update last_updated timestamp
CREATE OR REPLACE FUNCTION trigger_set_last_updated()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_model_configs_last_updated
  BEFORE UPDATE ON model_configs
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_last_updated();

-- Insert some initial configurations for common use cases
INSERT INTO model_configs (
  role, language, repository_size, complexity,
  primary_model, primary_version,
  primary_cost_per_1m_input, primary_cost_per_1m_output,
  fallback_model, fallback_version,
  fallback_cost_per_1m_input, fallback_cost_per_1m_output,
  performance_score, is_active, updated_by
) VALUES 
-- DeepWiki configurations
('deepwiki', 'typescript', 'large', 'high', 
 'claude-opus-4-1-20250805', '4.1', 15.0, 75.0,
 'gpt-4o-2024-11-20', '2024-11-20', 2.5, 10.0,
 85.0, true, 'system'),

('deepwiki', 'javascript', 'medium', 'medium',
 'gpt-4o-2024-11-20', '2024-11-20', 2.5, 10.0,
 'claude-sonnet-3-5-20241022', '3.5', 3.0, 15.0,
 80.0, true, 'system'),

('deepwiki', null, 'small', 'low',
 'claude-sonnet-3-5-20241022', '3.5', 3.0, 15.0,
 'gpt-4o-mini-2024-07-18', 'mini', 0.15, 0.60,
 75.0, true, 'system'),

-- Orchestrator configurations
('orchestrator', null, null, null,
 'gpt-4o-2024-11-20', '2024-11-20', 2.5, 10.0,
 'claude-sonnet-3-5-20241022', '3.5', 3.0, 15.0,
 90.0, true, 'system'),

-- Researcher configurations  
('researcher', null, null, null,
 'claude-opus-4-1-20250805', '4.1', 15.0, 75.0,
 'gpt-4o-2024-11-20', '2024-11-20', 2.5, 10.0,
 88.0, true, 'system'),

-- Educator configurations
('educator', null, null, null,
 'claude-sonnet-3-5-20241022', '3.5', 3.0, 15.0,
 'gpt-4o-2024-11-20', '2024-11-20', 2.5, 10.0,
 82.0, true, 'system'),

-- Report generator configurations  
('report-generator', null, null, null,
 'gpt-4o-2024-11-20', '2024-11-20', 2.5, 10.0,
 'claude-sonnet-3-5-20241022', '3.5', 3.0, 15.0,
 85.0, true, 'system');

-- Grant permissions
GRANT ALL ON model_configs TO authenticated;
GRANT ALL ON model_configs TO service_role;
GRANT EXECUTE ON FUNCTION update_model_config_performance(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION update_model_config_performance(UUID, BOOLEAN) TO service_role;
GRANT EXECUTE ON FUNCTION get_best_model_config(TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_best_model_config(TEXT, TEXT, TEXT, TEXT) TO service_role;

-- Update table statistics for query optimization
ANALYZE model_configs;