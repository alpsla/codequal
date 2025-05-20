-- Create the calibration_results table for storing calibration results by language and size
CREATE TABLE IF NOT EXISTS calibration_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  language TEXT NOT NULL,
  size_category TEXT NOT NULL,
  results JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create an index for faster calibration results lookups
CREATE INDEX IF NOT EXISTS calibration_results_language_idx ON calibration_results(language);
CREATE INDEX IF NOT EXISTS calibration_results_size_category_idx ON calibration_results(size_category);
CREATE UNIQUE INDEX IF NOT EXISTS calibration_results_language_size_idx ON calibration_results(language, size_category);

-- Create trigger for updating updated_at
CREATE TRIGGER set_calibration_results_updated_at
BEFORE UPDATE ON calibration_results
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create the model_configurations table for storing optimal model configurations
CREATE TABLE IF NOT EXISTS model_configurations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  language TEXT NOT NULL,
  size_category TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  test_results JSONB NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create an index for faster model configurations lookups
CREATE INDEX IF NOT EXISTS model_configurations_language_idx ON model_configurations(language);
CREATE INDEX IF NOT EXISTS model_configurations_size_category_idx ON model_configurations(size_category);
CREATE UNIQUE INDEX IF NOT EXISTS model_configurations_language_size_idx ON model_configurations(language, size_category);

-- Create trigger for updating updated_at
CREATE TRIGGER set_model_configurations_updated_at
BEFORE UPDATE ON model_configurations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();