-- Migration: Update model_configurations table to support primary/fallback models
-- This migration adds support for 273 configurations (role/language/size combinations)
-- Each configuration has primary and fallback models

-- Step 1: Rename existing table to backup
ALTER TABLE model_configurations RENAME TO model_configurations_backup;

-- Step 2: Create new table with proper structure
CREATE TABLE model_configurations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Context identifiers
  role TEXT NOT NULL,
  language TEXT NOT NULL,
  size_category TEXT NOT NULL,
  
  -- Primary model
  primary_provider TEXT NOT NULL,
  primary_model TEXT NOT NULL,
  
  -- Fallback model
  fallback_provider TEXT NOT NULL,
  fallback_model TEXT NOT NULL,
  
  -- Context weights used for selection
  weights JSONB NOT NULL DEFAULT '{}',
  
  -- Min requirements for this context
  min_requirements JSONB DEFAULT '{}',
  
  -- Reasoning for why these models were selected
  reasoning TEXT[],
  
  -- Metadata
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by TEXT DEFAULT 'system',
  
  -- Ensure uniqueness per role/language/size combination
  CONSTRAINT unique_role_language_size UNIQUE (role, language, size_category)
);

-- Step 3: Create indexes for efficient queries
CREATE INDEX idx_model_configs_role ON model_configurations(role);
CREATE INDEX idx_model_configs_language ON model_configurations(language);
CREATE INDEX idx_model_configs_size ON model_configurations(size_category);
CREATE INDEX idx_model_configs_role_context ON model_configurations(role, language, size_category);

-- Step 4: Add comments for documentation
COMMENT ON TABLE model_configurations IS 'Stores primary and fallback model selections for each role/language/size context';
COMMENT ON COLUMN model_configurations.role IS 'Role: deepwiki, location_finder, orchestrator, researcher, educator, security, etc.';
COMMENT ON COLUMN model_configurations.language IS 'Programming language or "universal" for non-language-specific roles';
COMMENT ON COLUMN model_configurations.size_category IS 'Repository size: small, medium, large';
COMMENT ON COLUMN model_configurations.weights IS 'JSON object with quality, speed, cost, freshness, contextWindow weights';
COMMENT ON COLUMN model_configurations.min_requirements IS 'JSON object with minQuality, maxCost, minSpeed, etc.';
COMMENT ON COLUMN model_configurations.reasoning IS 'Array of reasons why these models were selected';

-- Step 5: Insert sample configuration (will be replaced by researcher)
INSERT INTO model_configurations (
  role, language, size_category,
  primary_provider, primary_model,
  fallback_provider, fallback_model,
  weights,
  min_requirements,
  reasoning
) VALUES (
  'deepwiki', 'typescript', 'large',
  'anthropic', 'claude-opus-4-1-20250805',
  'openai', 'gpt-4o-2024-11-20',
  '{"quality": 0.67, "speed": 0.04, "cost": 0.15, "freshness": 0.13, "contextWindow": 0.01}',
  '{"minQuality": 8.0, "minContextWindow": 128000}',
  ARRAY['Highest quality model for deep code analysis', 'Claude 4.1 Opus has best coding performance at 74.5% on SWE-bench']
);

-- Step 6: Grant permissions
GRANT ALL ON model_configurations TO authenticated;
GRANT ALL ON model_configurations TO service_role;

-- Step 7: Create function to get model configuration
CREATE OR REPLACE FUNCTION get_model_configuration(
  p_role TEXT,
  p_language TEXT,
  p_size_category TEXT
) RETURNS TABLE (
  primary_provider TEXT,
  primary_model TEXT,
  fallback_provider TEXT,
  fallback_model TEXT,
  weights JSONB,
  reasoning TEXT[]
) AS $$
BEGIN
  -- First try exact match
  RETURN QUERY
  SELECT 
    mc.primary_provider,
    mc.primary_model,
    mc.fallback_provider,
    mc.fallback_model,
    mc.weights,
    mc.reasoning
  FROM model_configurations mc
  WHERE mc.role = p_role 
    AND mc.language = p_language 
    AND mc.size_category = p_size_category;
  
  -- If no exact match and role is universal, try without language/size
  IF NOT FOUND AND p_role IN ('orchestrator', 'researcher', 'educator') THEN
    RETURN QUERY
    SELECT 
      mc.primary_provider,
      mc.primary_model,
      mc.fallback_provider,
      mc.fallback_model,
      mc.weights,
      mc.reasoning
    FROM model_configurations mc
    WHERE mc.role = p_role 
      AND mc.language = 'universal'
      AND mc.size_category = 'medium';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Create trigger to update last_updated
CREATE OR REPLACE FUNCTION update_model_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_model_configs_timestamp
BEFORE UPDATE ON model_configurations
FOR EACH ROW
EXECUTE FUNCTION update_model_config_timestamp();