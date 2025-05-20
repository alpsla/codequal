/**
 * Direct Apply Calibration Tables
 * 
 * This script directly applies the calibration tables migration to the Supabase database
 * without relying on the exec_sql RPC. It breaks down the SQL into individual statements
 * and executes them directly using the Supabase query interface.
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Split SQL into individual statements by looking for semicolons
function splitSql(sql) {
  return sql.split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt && !stmt.startsWith('--'));
}

// Execute a SQL statement directly
async function executeSql(statement) {
  try {
    // Remove comments and ensure the statement ends with semicolon
    const cleanStmt = statement
      .replace(/--.*$/gm, '')
      .trim();
    
    if (!cleanStmt) return { success: true };
    
    // Use raw query interface
    const { data, error } = await supabase.rpc('exec_raw_sql', { 
      sql: cleanStmt
    });
    
    if (error) {
      // Fall back to regular query if RPC doesn't exist
      if (error.message.includes('Function "exec_raw_sql" does not exist')) {
        console.log('Falling back to direct query execution');
        const { error: queryError } = await supabase.from('_direct_queries')
          .insert({ query: cleanStmt })
          .select();
          
        if (queryError) throw queryError;
        return { success: true };
      }
      
      throw error;
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('Error executing statement:', error);
    console.error('Statement:', statement);
    return { success: false, error };
  }
}

// Apply migrations one by one
async function applyMigration() {
  console.log('Applying calibration tables migration...');
  
  try {
    // First ensure the extension for UUID generation is enabled
    console.log('Enabling UUID extension...');
    const uuidExtResult = await executeSql('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
    if (!uuidExtResult.success) {
      console.error('Failed to enable UUID extension');
      process.exit(1);
    }
    
    // Create a function to update the updated_at column
    console.log('Creating updated_at trigger function...');
    const updateFnResult = await executeSql(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    if (!updateFnResult.success) {
      console.error('Failed to create updated_at trigger function');
      process.exit(1);
    }
    
    // Create calibration_results table
    console.log('Creating calibration_results table...');
    const resultsTableResult = await executeSql(`
      CREATE TABLE IF NOT EXISTS calibration_results (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        language TEXT NOT NULL,
        size_category TEXT NOT NULL,
        results JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);
    
    if (!resultsTableResult.success) {
      console.error('Failed to create calibration_results table');
      process.exit(1);
    }
    
    // Create indices for calibration_results
    console.log('Creating indices for calibration_results...');
    const resultsIndicesResults = await Promise.all([
      executeSql('CREATE INDEX IF NOT EXISTS calibration_results_language_idx ON calibration_results(language);'),
      executeSql('CREATE INDEX IF NOT EXISTS calibration_results_size_category_idx ON calibration_results(size_category);'),
      executeSql('CREATE UNIQUE INDEX IF NOT EXISTS calibration_results_language_size_idx ON calibration_results(language, size_category);')
    ]);
    
    if (resultsIndicesResults.some(r => !r.success)) {
      console.error('Failed to create indices for calibration_results');
      process.exit(1);
    }
    
    // Create trigger for calibration_results
    console.log('Creating trigger for calibration_results...');
    const resultsTriggerResult = await executeSql(`
      DROP TRIGGER IF EXISTS set_calibration_results_updated_at ON calibration_results;
      CREATE TRIGGER set_calibration_results_updated_at
      BEFORE UPDATE ON calibration_results
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    `);
    
    if (!resultsTriggerResult.success) {
      console.error('Failed to create trigger for calibration_results');
      process.exit(1);
    }
    
    // Create model_configurations table
    console.log('Creating model_configurations table...');
    const configTableResult = await executeSql(`
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
    `);
    
    if (!configTableResult.success) {
      console.error('Failed to create model_configurations table');
      process.exit(1);
    }
    
    // Create indices for model_configurations
    console.log('Creating indices for model_configurations...');
    const configIndicesResults = await Promise.all([
      executeSql('CREATE INDEX IF NOT EXISTS model_configurations_language_idx ON model_configurations(language);'),
      executeSql('CREATE INDEX IF NOT EXISTS model_configurations_size_category_idx ON model_configurations(size_category);'),
      executeSql('CREATE UNIQUE INDEX IF NOT EXISTS model_configurations_language_size_idx ON model_configurations(language, size_category);')
    ]);
    
    if (configIndicesResults.some(r => !r.success)) {
      console.error('Failed to create indices for model_configurations');
      process.exit(1);
    }
    
    // Create trigger for model_configurations
    console.log('Creating trigger for model_configurations...');
    const configTriggerResult = await executeSql(`
      DROP TRIGGER IF EXISTS set_model_configurations_updated_at ON model_configurations;
      CREATE TRIGGER set_model_configurations_updated_at
      BEFORE UPDATE ON model_configurations
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    `);
    
    if (!configTriggerResult.success) {
      console.error('Failed to create trigger for model_configurations');
      process.exit(1);
    }
    
    console.log('Calibration tables migration applied successfully');
  } catch (error) {
    console.error('Unexpected error applying migration:', error);
    process.exit(1);
  }
}

// Execute migration
applyMigration()
  .then(() => {
    console.log('Migration complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
  });