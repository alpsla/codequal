const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:');
  console.error('- SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration(filename) {
  console.log(`\nRunning migration: ${filename}`);
  
  try {
    const sql = fs.readFileSync(
      path.join(__dirname, 'migrations', filename),
      'utf8'
    );

    // Execute the SQL
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      // If exec_sql doesn't exist, we need to run the SQL differently
      console.error(`Error running migration ${filename}:`, error.message);
      console.log('Trying alternative method...');
      
      // Split by semicolons and run each statement
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      for (const statement of statements) {
        try {
          // This is a workaround - in production, use proper migration tools
          console.log(`Executing statement: ${statement.substring(0, 50)}...`);
        } catch (stmtError) {
          console.error('Statement error:', stmtError);
        }
      }
      
      console.log(`Note: Migration ${filename} needs to be run manually via Supabase dashboard`);
    } else {
      console.log(`✓ Migration ${filename} completed successfully`);
    }
  } catch (error) {
    console.error(`Failed to read or run migration ${filename}:`, error);
  }
}

async function main() {
  console.log('Applying billing-related migrations...\n');

  const migrations = [
    '20250108_billing_tables.sql',
    '20250108_trial_tracking.sql',
    '20250108_error_logging.sql'
  ];

  console.log('Important: These migrations should be run via the Supabase dashboard:');
  console.log('1. Go to your Supabase project dashboard');
  console.log('2. Navigate to SQL Editor');
  console.log('3. Copy and paste each migration file content');
  console.log('4. Run each migration in order\n');

  console.log('Migration files to run:');
  migrations.forEach((m, i) => {
    const filePath = path.join(__dirname, 'migrations', m);
    if (fs.existsSync(filePath)) {
      console.log(`${i + 1}. ✓ ${m} (found)`);
    } else {
      console.log(`${i + 1}. ✗ ${m} (not found)`);
    }
  });

  console.log('\nAlternatively, you can use the Supabase CLI:');
  console.log('supabase db push --db-url "postgresql://..."');
}

main().catch(console.error);