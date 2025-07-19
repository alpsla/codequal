#!/usr/bin/env node

/**
 * Apply Database Fixes Script
 * Safely applies security and performance fixes to the Supabase database
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../apps/api/.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials in environment variables');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Color helpers
const green = (text) => `\x1b[32m${text}\x1b[0m`;
const red = (text) => `\x1b[31m${text}\x1b[0m`;
const yellow = (text) => `\x1b[33m${text}\x1b[0m`;
const blue = (text) => `\x1b[34m${text}\x1b[0m`;

/**
 * Execute SQL statements one by one
 */
async function executeSQLStatements(statements) {
  const results = {
    successful: 0,
    failed: 0,
    errors: []
  };

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i].trim();
    
    // Skip empty statements or comments
    if (!statement || statement.startsWith('--')) {
      continue;
    }

    try {
      // Show progress
      process.stdout.write(`\rExecuting statement ${i + 1}/${statements.length}...`);
      
      // Execute the statement
      const { error } = await supabase.rpc('exec_sql', { sql: statement });
      
      if (error) {
        results.failed++;
        results.errors.push({
          statement: statement.substring(0, 100) + '...',
          error: error.message
        });
      } else {
        results.successful++;
      }
    } catch (err) {
      results.failed++;
      results.errors.push({
        statement: statement.substring(0, 100) + '...',
        error: err.message
      });
    }
  }

  console.log('\n'); // New line after progress
  return results;
}

/**
 * Apply security fixes (RLS)
 */
async function applySecurityFixes() {
  console.log(blue('\n🔒 Applying Security Fixes...\n'));
  
  const securitySQL = `
    -- Enable RLS on all public tables
    DO $$
    DECLARE
      r RECORD;
    BEGIN
      FOR r IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND rowsecurity = false
      LOOP
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' ENABLE ROW LEVEL SECURITY';
        RAISE NOTICE 'Enabled RLS on table: %', r.tablename;
      END LOOP;
    END $$;
  `;

  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql: securitySQL });
    
    if (error) {
      console.log(red('❌ Failed to enable RLS:'), error.message);
      return false;
    }
    
    console.log(green('✅ RLS enabled on all public tables'));
    
    // Check how many tables now have RLS
    const checkSQL = `
      SELECT COUNT(*) as rls_enabled 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND rowsecurity = true
    `;
    
    const { data: checkData } = await supabase.rpc('exec_sql', { sql: checkSQL });
    if (checkData && checkData[0]) {
      console.log(green(`   Tables with RLS: ${checkData[0].rls_enabled}`));
    }
    
    return true;
  } catch (err) {
    console.log(red('❌ Error applying security fixes:'), err.message);
    return false;
  }
}

/**
 * Apply performance fixes (indexes)
 */
async function applyPerformanceFixes() {
  console.log(blue('\n⚡ Applying Performance Fixes...\n'));
  
  // Read the comprehensive fixes SQL file
  const sqlPath = path.resolve(__dirname, '../apps/api/database-comprehensive-fixes.sql');
  const sqlContent = await fs.readFile(sqlPath, 'utf8');
  
  // Extract only the CREATE INDEX statements
  const indexStatements = sqlContent
    .split('\n')
    .filter(line => line.trim().startsWith('CREATE INDEX'))
    .map(statement => {
      // Find the complete statement
      let fullStatement = statement;
      const lines = sqlContent.split('\n');
      const startIndex = lines.indexOf(statement);
      
      for (let i = startIndex; i < lines.length; i++) {
        if (lines[i].includes(';')) {
          fullStatement = lines.slice(startIndex, i + 1).join(' ');
          break;
        }
      }
      
      return fullStatement;
    });

  console.log(`Found ${indexStatements.length} index statements to execute`);
  
  const results = await executeSQLStatements(indexStatements);
  
  console.log(green(`✅ Successfully created ${results.successful} indexes`));
  
  if (results.failed > 0) {
    console.log(yellow(`⚠️  Failed to create ${results.failed} indexes`));
    results.errors.forEach(err => {
      console.log(red(`   - ${err.statement}`));
      console.log(`     Error: ${err.error}`);
    });
  }
  
  return results.successful > 0;
}

/**
 * Verify fixes were applied
 */
async function verifyFixes() {
  console.log(blue('\n🔍 Verifying Fixes...\n'));
  
  // Check security status
  const securityCheckSQL = `
    SELECT 
      COUNT(*) FILTER (WHERE rowsecurity = true) as with_rls,
      COUNT(*) FILTER (WHERE rowsecurity = false) as without_rls,
      COUNT(*) as total_tables
    FROM pg_tables 
    WHERE schemaname = 'public'
  `;
  
  const { data: securityData } = await supabase.rpc('exec_sql', { sql: securityCheckSQL });
  
  if (securityData && securityData[0]) {
    const { with_rls, without_rls, total_tables } = securityData[0];
    console.log('Security Status:');
    console.log(`  Tables with RLS: ${green(with_rls)} / ${total_tables}`);
    console.log(`  Tables without RLS: ${without_rls > 0 ? red(without_rls) : green(without_rls)}`);
  }
  
  // Check index count
  const indexCheckSQL = `
    SELECT COUNT(*) as index_count 
    FROM pg_indexes 
    WHERE schemaname = 'public'
  `;
  
  const { data: indexData } = await supabase.rpc('exec_sql', { sql: indexCheckSQL });
  
  if (indexData && indexData[0]) {
    console.log(`\nPerformance Status:`);
    console.log(`  Total indexes: ${green(indexData[0].index_count)}`);
  }
  
  return true;
}

/**
 * Main execution
 */
async function main() {
  console.log(blue('🚀 CodeQual Database Fix Application\n'));
  console.log('This script will apply security and performance fixes to your database.');
  console.log(yellow('⚠️  Make sure you have a backup before proceeding!\n'));
  
  // Check if exec_sql function exists
  const checkFunctionSQL = `
    SELECT EXISTS (
      SELECT 1 
      FROM pg_proc 
      WHERE proname = 'exec_sql'
    ) as function_exists
  `;
  
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql: 'SELECT 1' });
    
    if (error && error.message.includes('not exist')) {
      console.log(yellow('⚠️  exec_sql function not found. Creating it...'));
      
      // Create the exec_sql function
      const createFunctionSQL = `
        CREATE OR REPLACE FUNCTION exec_sql(sql text)
        RETURNS json
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        DECLARE
          result json;
        BEGIN
          EXECUTE sql;
          RETURN '{"success": true}'::json;
        EXCEPTION
          WHEN OTHERS THEN
            RETURN json_build_object('error', SQLERRM);
        END;
        $$;
      `;
      
      // This might fail too, but worth trying
      console.log(red('❌ Cannot create exec_sql function via API.'));
      console.log('Please create it manually in Supabase SQL Editor first.');
      process.exit(1);
    }
  } catch (err) {
    console.log(red('❌ Cannot connect to database or exec_sql not available'));
    console.log('Please ensure the exec_sql function exists in your database.');
    process.exit(1);
  }
  
  // Apply fixes
  console.log('Starting fix application...\n');
  
  const securitySuccess = await applySecurityFixes();
  const performanceSuccess = await applyPerformanceFixes();
  
  // Verify
  await verifyFixes();
  
  // Summary
  console.log(blue('\n📊 Summary\n'));
  console.log(`Security fixes: ${securitySuccess ? green('✅ Applied') : red('❌ Failed')}`);
  console.log(`Performance fixes: ${performanceSuccess ? green('✅ Applied') : red('❌ Failed')}`);
  
  if (securitySuccess && performanceSuccess) {
    console.log(green('\n✅ All fixes applied successfully!'));
    console.log('\nNext steps:');
    console.log('1. Monitor query performance in Supabase dashboard');
    console.log('2. Run the E2E test suite to verify functionality');
    console.log('3. Check application logs for any permission issues');
  } else {
    console.log(yellow('\n⚠️  Some fixes failed to apply.'));
    console.log('Please check the Supabase SQL Editor and apply remaining fixes manually.');
  }
}

// Run the script
main().catch(console.error);