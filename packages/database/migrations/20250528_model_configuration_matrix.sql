-- Model Configuration Matrix Migration
-- Creates tables for the Dynamic Model Configuration Matrix system

-- Create language enum for better performance and type safety
CREATE TYPE supported_language AS ENUM (
  'javascript', 'typescript', 'python', 'java', 'csharp', 'cpp', 'go', 'rust', 'kotlin', 'swift',
  'php', 'ruby', 'html', 'css', 'vue', 'react', 'angular',
  'r', 'julia', 'matlab', 'scala',
  'c', 'objectivec', 'assembly', 'perl', 'bash', 'powershell',
  'dart', 'elixir', 'clojure', 'haskell', 'erlang', 'nim', 'zig',
  'sql', 'graphql', 'yaml', 'json', 'xml', 'toml',
  'lua', 'solidity', 'vhdl', 'terraform', 'dockerfile',
  'multi'
);

-- Create the main configuration matrix table
CREATE TABLE model_configuration_matrix (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Parameter combination (unique key)
  config_id TEXT UNIQUE NOT NULL,
  
  -- Individual parameters with proper types
  speed TEXT NOT NULL CHECK (speed IN ('fast', 'medium', 'slow')),
  complexity TEXT NOT NULL CHECK (complexity IN ('simple', 'moderate', 'complex')),
  language supported_language NOT NULL,
  repo_size TEXT NOT NULL CHECK (repo_size IN ('small', 'medium', 'large', 'enterprise')),
  cost_sensitivity TEXT NOT NULL CHECK (cost_sensitivity IN ('low', 'medium', 'high')),
  quality_requirement TEXT NOT NULL CHECK (quality_requirement IN ('basic', 'good', 'excellent', 'perfect')),
  analysis_type TEXT NOT NULL CHECK (analysis_type IN ('pr_review', 'architecture', 'security', 'performance', 'documentation')),
  
  -- Features as JSONB
  features JSONB,
  
  -- Selected model configuration
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  model_path TEXT NOT NULL,
  
  -- Model parameters
  temperature DECIMAL(3, 2),
  top_p DECIMAL(3, 2),
  top_k INTEGER,
  max_tokens INTEGER,
  stream_response BOOLEAN DEFAULT TRUE,
  include_thinking BOOLEAN DEFAULT FALSE,
  use_cache BOOLEAN DEFAULT TRUE,
  
  -- Expected metrics
  expected_response_time_ms INTEGER,
  expected_cost_per_1k DECIMAL(10, 6),
  expected_quality_score DECIMAL(3, 2),
  
  -- Fallback models (array of model paths)
  fallback_models TEXT[],
  
  -- Language-specific settings
  language_specific_hints JSONB, -- e.g., {"useTypeScript": true, "syntaxVersion": "ES2022"}
  
  -- Tracking
  generated_at TIMESTAMP DEFAULT NOW(),
  last_validated TIMESTAMP DEFAULT NOW(),
  usage_count INTEGER DEFAULT 0,
  actual_avg_response_time_ms INTEGER,
  actual_success_rate DECIMAL(5, 2),
  
  -- Performance tracking
  last_used_at TIMESTAMP,
  total_successful_calls INTEGER DEFAULT 0,
  total_failed_calls INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for fast lookup
CREATE INDEX idx_full_params ON model_configuration_matrix (speed, complexity, language, repo_size, cost_sensitivity, quality_requirement, analysis_type);
CREATE INDEX idx_language_type ON model_configuration_matrix (language, analysis_type);
CREATE INDEX idx_usage ON model_configuration_matrix (usage_count DESC);
CREATE INDEX idx_performance ON model_configuration_matrix (actual_success_rate DESC NULLS LAST, actual_avg_response_time_ms ASC NULLS LAST);
CREATE INDEX idx_config_id ON model_configuration_matrix (config_id);
CREATE INDEX idx_provider_model ON model_configuration_matrix (provider, model);

-- Create language groups for easier querying and optimization
CREATE TABLE language_groups (
  language supported_language PRIMARY KEY,
  group_name TEXT NOT NULL,
  is_web_language BOOLEAN DEFAULT FALSE,
  is_system_language BOOLEAN DEFAULT FALSE,
  is_data_language BOOLEAN DEFAULT FALSE,
  is_functional BOOLEAN DEFAULT FALSE,
  is_compiled BOOLEAN DEFAULT FALSE,
  typical_use_cases TEXT[],
  context_window_preference TEXT CHECK (context_window_preference IN ('small', 'medium', 'large', 'extra_large')),
  reasoning_benefit BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Populate language groups with characteristics
INSERT INTO language_groups (language, group_name, is_web_language, is_compiled, is_functional, reasoning_benefit, context_window_preference, typical_use_cases) VALUES
  ('javascript', 'web', true, false, false, false, 'medium', ARRAY['frontend', 'backend', 'fullstack']),
  ('typescript', 'web', true, false, false, true, 'medium', ARRAY['frontend', 'backend', 'enterprise']),
  ('python', 'general', false, false, false, false, 'medium', ARRAY['data', 'ml', 'backend', 'scripting']),
  ('java', 'enterprise', false, true, false, true, 'large', ARRAY['enterprise', 'backend', 'android']),
  ('csharp', 'enterprise', false, true, false, true, 'large', ARRAY['enterprise', 'backend', 'desktop']),
  ('rust', 'system', false, true, false, true, 'medium', ARRAY['system', 'performance', 'safety']),
  ('go', 'backend', false, true, false, false, 'medium', ARRAY['microservices', 'cloud', 'concurrent']),
  ('cpp', 'system', false, true, false, true, 'large', ARRAY['system', 'performance', 'embedded']),
  ('swift', 'mobile', false, true, false, false, 'medium', ARRAY['ios', 'macos', 'mobile']),
  ('kotlin', 'mobile', false, true, false, false, 'medium', ARRAY['android', 'backend', 'mobile']),
  ('php', 'web', true, false, false, false, 'medium', ARRAY['web', 'backend', 'cms']),
  ('ruby', 'web', true, false, false, false, 'medium', ARRAY['web', 'backend', 'scripting']),
  ('scala', 'data', false, true, true, true, 'large', ARRAY['data', 'functional', 'jvm']),
  ('r', 'data', false, false, true, false, 'medium', ARRAY['statistics', 'data', 'research']),
  ('julia', 'data', false, false, false, false, 'medium', ARRAY['scientific', 'performance', 'ml']),
  ('haskell', 'functional', false, true, true, true, 'medium', ARRAY['functional', 'academic', 'research']),
  ('clojure', 'functional', false, false, true, true, 'medium', ARRAY['functional', 'jvm', 'data']),
  ('elixir', 'functional', false, false, true, false, 'medium', ARRAY['concurrent', 'web', 'erlang']),
  ('c', 'system', false, true, false, false, 'small', ARRAY['system', 'embedded', 'kernel']),
  ('assembly', 'system', false, true, false, true, 'small', ARRAY['system', 'embedded', 'optimization']),
  ('html', 'web', true, false, false, false, 'small', ARRAY['markup', 'web', 'frontend']),
  ('css', 'web', true, false, false, false, 'small', ARRAY['styling', 'web', 'frontend']),
  ('sql', 'database', false, false, false, false, 'medium', ARRAY['database', 'query', 'data']),
  ('bash', 'scripting', false, false, false, false, 'small', ARRAY['scripting', 'automation', 'system']),
  ('powershell', 'scripting', false, false, false, false, 'small', ARRAY['scripting', 'windows', 'automation']),
  ('terraform', 'infrastructure', false, false, false, false, 'medium', ARRAY['infrastructure', 'cloud', 'devops']),
  ('dockerfile', 'infrastructure', false, false, false, false, 'small', ARRAY['containers', 'devops', 'deployment']),
  ('yaml', 'config', false, false, false, false, 'small', ARRAY['configuration', 'devops', 'markup']),
  ('json', 'config', false, false, false, false, 'small', ARRAY['data', 'api', 'configuration']),
  ('multi', 'mixed', false, false, false, true, 'large', ARRAY['polyglot', 'complex', 'enterprise']);

-- Create a simplified lookup view for common operations
CREATE VIEW model_config_lookup AS
SELECT 
  config_id,
  language,
  analysis_type,
  provider || '/' || model as model_full_path,
  temperature,
  top_p,
  max_tokens,
  expected_response_time_ms,
  expected_cost_per_1k,
  fallback_models,
  usage_count,
  actual_success_rate
FROM model_configuration_matrix
ORDER BY usage_count DESC, actual_success_rate DESC NULLS LAST;

-- Create a view for language statistics
CREATE VIEW language_config_stats AS
SELECT 
  lg.language,
  lg.group_name,
  COUNT(mcm.id) as total_configs,
  AVG(mcm.actual_success_rate) as avg_success_rate,
  AVG(mcm.actual_avg_response_time_ms) as avg_response_time,
  SUM(mcm.usage_count) as total_usage
FROM language_groups lg
LEFT JOIN model_configuration_matrix mcm ON lg.language = mcm.language
GROUP BY lg.language, lg.group_name
ORDER BY total_usage DESC NULLS LAST;

-- Create function to update usage statistics
CREATE OR REPLACE FUNCTION update_config_usage(
  p_config_id TEXT,
  p_success BOOLEAN,
  p_response_time_ms INTEGER
) RETURNS VOID AS $$
BEGIN
  UPDATE model_configuration_matrix 
  SET 
    usage_count = usage_count + 1,
    last_used_at = NOW(),
    total_successful_calls = total_successful_calls + CASE WHEN p_success THEN 1 ELSE 0 END,
    total_failed_calls = total_failed_calls + CASE WHEN p_success THEN 0 ELSE 1 END,
    actual_avg_response_time_ms = CASE 
      WHEN actual_avg_response_time_ms IS NULL THEN p_response_time_ms
      ELSE (actual_avg_response_time_ms * (usage_count - 1) + p_response_time_ms) / usage_count
    END,
    actual_success_rate = CASE
      WHEN total_successful_calls + total_failed_calls > 0 
      THEN (total_successful_calls + CASE WHEN p_success THEN 1 ELSE 0 END)::DECIMAL / 
           (total_successful_calls + total_failed_calls + 1) * 100
      ELSE CASE WHEN p_success THEN 100.0 ELSE 0.0 END
    END,
    updated_at = NOW()
  WHERE config_id = p_config_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to get configuration by parameters
CREATE OR REPLACE FUNCTION get_model_config(
  p_speed TEXT,
  p_complexity TEXT,
  p_language TEXT,
  p_repo_size TEXT,
  p_cost_sensitivity TEXT,
  p_quality_requirement TEXT,
  p_analysis_type TEXT
) RETURNS TABLE (
  config_id TEXT,
  provider TEXT,
  model TEXT,
  model_path TEXT,
  temperature DECIMAL,
  top_p DECIMAL,
  max_tokens INTEGER,
  fallback_models TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mcm.config_id,
    mcm.provider,
    mcm.model,
    mcm.model_path,
    mcm.temperature,
    mcm.top_p,
    mcm.max_tokens,
    mcm.fallback_models
  FROM model_configuration_matrix mcm
  WHERE 
    mcm.speed = p_speed AND
    mcm.complexity = p_complexity AND
    mcm.language = p_language::supported_language AND
    mcm.repo_size = p_repo_size AND
    mcm.cost_sensitivity = p_cost_sensitivity AND
    mcm.quality_requirement = p_quality_requirement AND
    mcm.analysis_type = p_analysis_type
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Add table comments for documentation
COMMENT ON TABLE model_configuration_matrix IS 'Pre-computed optimal model configurations for all parameter combinations';
COMMENT ON TABLE language_groups IS 'Language categorization and characteristics for optimization';
COMMENT ON FUNCTION update_config_usage IS 'Updates usage statistics and performance metrics for a configuration';
COMMENT ON FUNCTION get_model_config IS 'Retrieves model configuration for given analysis parameters';