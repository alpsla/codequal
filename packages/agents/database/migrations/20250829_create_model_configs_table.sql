-- Create model_configurations table for storing dynamic model selections
CREATE TABLE IF NOT EXISTS model_configurations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role VARCHAR(50) NOT NULL,
  language VARCHAR(50),
  size_category VARCHAR(20),
  primary_provider VARCHAR(100) NOT NULL,
  primary_model VARCHAR(200) NOT NULL,
  fallback_provider VARCHAR(100) NOT NULL,
  fallback_model VARCHAR(200) NOT NULL,
  weights JSONB NOT NULL,
  reasoning TEXT[] NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Add unique constraint for role/language/size combination
  UNIQUE(role, language, size_category)
);

-- Create indexes for better query performance
CREATE INDEX idx_model_configs_role ON model_configurations(role);
CREATE INDEX idx_model_configs_language ON model_configurations(language);
CREATE INDEX idx_model_configs_size ON model_configurations(size_category);
CREATE INDEX idx_model_configs_valid_until ON model_configurations(valid_until);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_model_configurations_updated_at 
  BEFORE UPDATE ON model_configurations 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment for table documentation
COMMENT ON TABLE model_configurations IS 'Stores dynamically discovered model configurations for each role/language/size combination';
COMMENT ON COLUMN model_configurations.weights IS 'JSON object containing quality, speed, cost, freshness, and contextWindow weights';
COMMENT ON COLUMN model_configurations.reasoning IS 'Array of strings explaining why this model was selected';
COMMENT ON COLUMN model_configurations.valid_until IS 'Timestamp when this configuration should be refreshed';