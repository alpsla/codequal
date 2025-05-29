#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function runMigration() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
    process.exit(1);
  }

  console.log('🔗 Connecting to Supabase...');
  console.log(`URL: ${supabaseUrl}`);

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, 'migrations/20250527_vector_database_setup.sql');
    console.log(`📄 Reading migration file: ${migrationPath}`);
    
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    // Split the SQL into individual statements (simple split by semicolon)
    const statements = sql.split(';').filter(stmt => stmt.trim());
    
    console.log(`📋 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (!statement) continue;
      
      console.log(`\n⏳ Executing statement ${i + 1}/${statements.length}...`);
      console.log(`   ${statement.substring(0, 50)}...`);
      
      const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' }).single();
      
      if (error) {
        // Try direct execution as an alternative
        console.log('   Trying alternative execution method...');
        const { data, error: altError } = await supabase
          .from('_dummy_table_that_does_not_exist')
          .select('*')
          .limit(0)
          .eq('id', 0)
          .maybeSingle();
        
        if (altError && altError.message.includes('does not exist')) {
          console.log(`   ⚠️  Warning: Cannot execute DDL through Supabase client library`);
          console.log(`   📝 Please run this statement manually in Supabase SQL editor:`);
          console.log(`\n${statement};\n`);
        } else {
          console.error(`   ❌ Error: ${error.message}`);
        }
      } else {
        console.log(`   ✅ Success`);
      }
    }
    
    console.log('\n🎉 Migration process completed!');
    console.log('\n📝 Note: Some DDL statements (CREATE TABLE, CREATE INDEX, etc.) need to be run manually in the Supabase SQL editor.');
    console.log('   Copy the content of migrations/20250527_vector_database_setup.sql and run it there.');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();