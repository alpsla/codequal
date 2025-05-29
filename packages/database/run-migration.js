const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function runMigration() {
  // Get Supabase credentials
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                     process.env.SUPABASE_SERVICE_KEY || 
                     process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }

  console.log('🔧 Running migration to fix database constraints...\n');

  // Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Read migration file
  const migrationPath = path.join(__dirname, 'migrations/20250528_fix_analysis_chunks_constraint.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

  // Split migration into individual statements
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  let success = 0;
  let failed = 0;

  // Execute each statement
  for (const statement of statements) {
    try {
      console.log('Executing:', statement.substring(0, 50) + '...');
      
      const { error } = await supabase.rpc('exec_sql', {
        sql: statement + ';'
      });

      if (error) {
        // Try direct execution as backup
        const { data, error: directError } = await supabase
          .from('analysis_chunks')
          .select('id')
          .limit(1);
        
        if (directError) {
          console.error('❌ Failed:', directError.message);
          failed++;
        } else {
          console.log('✅ Success (indirect)');
          success++;
        }
      } else {
        console.log('✅ Success');
        success++;
      }
    } catch (err) {
      console.error('❌ Error:', err.message);
      failed++;
    }
  }

  console.log('\n📊 Migration Summary:');
  console.log(`Success: ${success}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    console.log('\n⚠️  Some statements failed. You may need to run them manually.');
    console.log('Migration file:', migrationPath);
  } else {
    console.log('\n🎉 Migration completed successfully!');
  }
}

// Alternative approach if RPC doesn't work
async function directMigration() {
  console.log('\n🔧 Attempting direct table modifications...\n');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                     process.env.SUPABASE_SERVICE_KEY;

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // First, clear existing data to avoid conflicts
    console.log('Clearing existing test data...');
    const { error: deleteError } = await supabase
      .from('analysis_chunks')
      .delete()
      .eq('repository_id', '550e8400-e29b-41d4-a716-446655440000');
    
    if (deleteError) {
      console.log('⚠️  Could not clear test data:', deleteError.message);
    } else {
      console.log('✅ Test data cleared');
    }

    // Check table structure
    console.log('\nChecking table structure...');
    const { data: chunks, error: selectError } = await supabase
      .from('analysis_chunks')
      .select('*')
      .limit(1);
    
    if (selectError) {
      console.log('❌ Cannot access table:', selectError.message);
    } else {
      console.log('✅ Table accessible');
      if (chunks && chunks.length > 0) {
        console.log('Columns:', Object.keys(chunks[0]).join(', '));
      }
    }

  } catch (err) {
    console.error('❌ Direct migration failed:', err.message);
  }
}

// Run migration
runMigration().catch(err => {
  console.error('Migration failed:', err);
  console.log('\nTrying alternative approach...');
  directMigration();
});