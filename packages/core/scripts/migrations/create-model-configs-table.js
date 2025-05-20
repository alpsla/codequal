#!/usr/bin/env node
/**
 * Create Model Configurations Table
 * 
 * This script creates the required 'model_configurations' table in Supabase
 * which is necessary for storing calibration results.
 * 
 * Usage: node migrations/create-model-configs-table.js
 */

const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

async function createModelConfigsTable() {
  console.log('Creating model_configurations table in Supabase...');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables must be set');
    process.exit(1);
  }

  // Create Supabase client
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    // Check if table already exists
    const { data, error: checkError } = await supabase
      .from('model_configurations')
      .select('*')
      .limit(1)
      .catch(() => ({ data: null, error: { message: 'Table does not exist' } }));

    if (!checkError) {
      console.log('Table model_configurations already exists. Skipping creation.');
      return;
    }

    // Create table using SQL
    const { error: createError } = await supabase.rpc('exec_sql', {
      query: `
        CREATE TABLE public.model_configurations (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          language TEXT NOT NULL,
          size_category TEXT NOT NULL,
          provider TEXT NOT NULL,
          model TEXT NOT NULL,
          test_results JSONB,
          notes TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(language, size_category)
        );
        
        CREATE TABLE public.calibration_results (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          results JSONB NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Create UUID extension if not exists
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
      `
    });

    if (createError) {
      console.error('Error creating tables:', createError.message);
      
      // Alternative approach using multiple statements if RPC fails
      console.log('Trying alternative approach...');
      
      // Check for UUID extension
      await supabase.rpc('exec_sql', {
        query: 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'
      });
      
      // Create model_configurations table
      await supabase.rpc('exec_sql', {
        query: `
          CREATE TABLE IF NOT EXISTS public.model_configurations (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            language TEXT NOT NULL,
            size_category TEXT NOT NULL,
            provider TEXT NOT NULL,
            model TEXT NOT NULL,
            test_results JSONB,
            notes TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(language, size_category)
          );
        `
      });
      
      // Create calibration_results table
      await supabase.rpc('exec_sql', {
        query: `
          CREATE TABLE IF NOT EXISTS public.calibration_results (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            results JSONB NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `
      });
      
      console.log('Tables created using alternative approach.');
    } else {
      console.log('Tables created successfully.');
    }
    
    // Insert initial data
    const { error: insertError } = await supabase
      .from('model_configurations')
      .insert([
        {
          language: 'typescript',
          size_category: 'small',
          provider: 'anthropic',
          model: 'claude-3-7-sonnet',
          test_results: {
            status: 'initial',
            lastTested: new Date().toISOString()
          },
          notes: 'Initial configuration'
        }
      ]);
      
    if (insertError) {
      console.error('Error inserting initial data:', insertError.message);
    } else {
      console.log('Initial data inserted successfully.');
    }
    
    console.log('Setup complete!');

  } catch (error) {
    console.error('Error during table creation:', error.message);
    process.exit(1);
  }
}

// Run the migration
createModelConfigsTable().catch(error => {
  console.error('Migration failed:', error);
  process.exit(1);
});
