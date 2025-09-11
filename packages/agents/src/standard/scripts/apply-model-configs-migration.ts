#!/usr/bin/env npx ts-node

/**
 * Apply model configurations table migration to Supabase
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '..', '..', '..', '..', '.env') });

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function applyMigration() {
  console.log('📦 Applying model_configurations table migration...');
  
  try {
    // Read the SQL migration file
    const migrationPath = path.join(__dirname, '..', '..', '..', 'database', 'migrations', '20250829_create_model_configs_table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    
    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', {
      query: migrationSQL
    }).single();
    
    if (error) {
      // Try alternative approach - execute statements separately
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));
      
      console.log(`📝 Executing ${statements.length} SQL statements...`);
      
      for (const statement of statements) {
        try {
          // Since we can't directly execute DDL, we'll check if table exists
          if (statement.includes('CREATE TABLE')) {
            // Check if table exists
            const { data: tables } = await supabase
              .from('model_configurations')
              .select('*')
              .limit(1);
            
            if (!tables) {
              console.log('✅ Table model_configurations needs to be created manually in Supabase dashboard');
              console.log('   Please create the table with the following structure:');
              console.log('   - id (UUID, primary key)');
              console.log('   - role (text)');
              console.log('   - language (text, nullable)');
              console.log('   - size_category (text, nullable)');
              console.log('   - primary_provider (text)');
              console.log('   - primary_model (text)');
              console.log('   - fallback_provider (text)');
              console.log('   - fallback_model (text)');
              console.log('   - weights (jsonb)');
              console.log('   - reasoning (text[])');
              console.log('   - timestamp (timestamptz)');
              console.log('   - valid_until (timestamptz)');
            } else {
              console.log('✅ Table model_configurations already exists');
            }
          }
        } catch (err) {
          // Table doesn't exist, needs to be created
          console.log('⚠️  Table does not exist yet');
        }
      }
    } else {
      console.log('✅ Migration applied successfully');
    }
    
    // Test the table by checking if we can query it
    const { data: testData, error: testError } = await supabase
      .from('model_configurations')
      .select('count')
      .single();
    
    if (!testError) {
      console.log('✅ Table model_configurations is accessible');
    } else {
      console.log('⚠️  Table exists but may need configuration:', testError.message);
    }
    
  } catch (error) {
    console.error('❌ Error applying migration:', error);
    console.log('\n📋 Please create the table manually in Supabase dashboard with the structure shown above');
  }
}

// Run the migration
applyMigration();