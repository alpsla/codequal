/**
 * Model Configuration Database Schema
 * 
 * This file defines the Supabase SQL schema for model configurations
 * and calibration results. This should be executed using the Supabase CLI
 * or through the database UI.
 */

const createModelConfigurationsTable = `
CREATE TABLE IF NOT EXISTS model_configurations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  language TEXT NOT NULL,
  size_category TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  test_results JSONB NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  UNIQUE(language, size_category)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS model_configurations_lookup_idx 
ON model_configurations (language, size_category);

-- Create index for searching by provider
CREATE INDEX IF NOT EXISTS model_configurations_provider_idx 
ON model_configurations (provider);

-- Create index for sorting by update time
CREATE INDEX IF NOT EXISTS model_configurations_updated_idx 
ON model_configurations (updated_at DESC);

-- Add RLS policies
ALTER TABLE model_configurations ENABLE ROW LEVEL SECURITY;

-- Admin can do anything
CREATE POLICY admin_all ON model_configurations 
FOR ALL TO authenticated 
USING (auth.jwt() ->> 'role' = 'admin');

-- Regular users can read
CREATE POLICY user_read ON model_configurations 
FOR SELECT TO authenticated 
USING (TRUE);

-- Only services can insert/update
CREATE POLICY service_write ON model_configurations 
FOR INSERT TO authenticated 
USING (auth.jwt() ->> 'role' IN ('admin', 'service'));

CREATE POLICY service_update ON model_configurations 
FOR UPDATE TO authenticated 
USING (auth.jwt() ->> 'role' IN ('admin', 'service'));
`;

const createCalibrationResultsTable = `
CREATE TABLE IF NOT EXISTS calibration_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  language TEXT NOT NULL,
  size_category TEXT NOT NULL,
  results JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  repository_id TEXT,
  user_id UUID REFERENCES auth.users(id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS calibration_results_lookup_idx 
ON calibration_results (language, size_category);

-- Create index for searching by repository
CREATE INDEX IF NOT EXISTS calibration_results_repo_idx 
ON calibration_results (repository_id) 
WHERE repository_id IS NOT NULL;

-- Create index for sorting by creation time
CREATE INDEX IF NOT EXISTS calibration_results_created_idx 
ON calibration_results (created_at DESC);

-- Add RLS policies
ALTER TABLE calibration_results ENABLE ROW LEVEL SECURITY;

-- Admin can do anything
CREATE POLICY admin_all ON calibration_results 
FOR ALL TO authenticated 
USING (auth.jwt() ->> 'role' = 'admin');

-- Users can read all calibration results
CREATE POLICY user_read ON calibration_results 
FOR SELECT TO authenticated 
USING (TRUE);

-- Users can insert their own calibration results
CREATE POLICY user_insert ON calibration_results 
FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = user_id OR auth.jwt() ->> 'role' IN ('admin', 'service'));
`;

export const modelConfigurationMigration = `
-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

${createModelConfigurationsTable}

${createCalibrationResultsTable}
`;

/**
 * Helper function to get a migration runner
 * @param supabase Supabase client
 * @returns Migration runner function
 */
export function getModelConfigMigrationRunner(supabase: any) {
  return async function runMigration() {
    try {
      const { error } = await supabase.rpc('exec_sql', {
        sql_query: modelConfigurationMigration
      });
      
      if (error) {
        console.error('Migration error:', error);
        return { success: false, error };
      }
      
      return { success: true };
    } catch (error) {
      console.error('Unexpected migration error:', error);
      return { success: false, error };
    }
  };
}
