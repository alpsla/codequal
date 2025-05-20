import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';
import { getSupabase } from '../supabase/client';
import { createLogger } from '../shims/core-types';

// Load environment variables from .env file
config();

async function applyMigrations() {
  const supabase = getSupabase();
  const logger = createLogger('Migrations');
  
  try {
    logger.info('Starting database migrations...');
    
    // Read the migration SQL
    const migrationPath = path.join(__dirname, 'create_tables.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');
    
    // Execute the SQL
    const { error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.error('Error applying migrations:', error);
      process.exit(1);
    }
    
    logger.info('Migrations applied successfully!');
  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  }
}

// Execute if called directly
if (require.main === module) {
  applyMigrations().catch(err => {
    console.error('Failed to apply migrations:', err);
    process.exit(1);
  });
}

export default applyMigrations;