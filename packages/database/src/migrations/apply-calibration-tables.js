/**
 * Apply calibration tables migration
 * 
 * This script applies the calibration tables migration to the database.
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

// Read migration file
const migrationFile = path.resolve(__dirname, 'add-calibration-results.sql');
const sql = fs.readFileSync(migrationFile, 'utf8');

// Apply migration
async function applyMigration() {
  console.log('Applying calibration tables migration...');
  
  try {
    // Execute SQL
    const { error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.error('Error applying migration:', error);
      process.exit(1);
    }
    
    console.log('Calibration tables migration applied successfully');
  } catch (error) {
    console.error('Unexpected error applying migration:', error);
    process.exit(1);
  }
}

// Execute migration
applyMigration();