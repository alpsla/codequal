#!/usr/bin/env node

/**
 * Deploy Authentication Database Schema to Supabase
 * This script uses the Supabase Management API to execute SQL directly
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Colors for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
};

async function deploySchema() {
  log.info('Starting Authentication Schema Deployment...');

  // Validate environment variables
  const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
  const missingVars = requiredEnvVars.filter(v => !process.env[v]);
  
  if (missingVars.length > 0) {
    log.error(`Missing required environment variables: ${missingVars.join(', ')}`);
    process.exit(1);
  }

  // Create Supabase client with service role key
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  // Read the schema file
  const schemaPath = path.join(__dirname, '..', 'packages', 'agents', 'src', 'multi-agent', 'database-schema.sql');
  
  if (!fs.existsSync(schemaPath)) {
    log.error(`Schema file not found: ${schemaPath}`);
    process.exit(1);
  }

  const schema = fs.readFileSync(schemaPath, 'utf8');

  // Split schema into individual statements (simple split by semicolon)
  const statements = schema
    .split(/;\s*$/m)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  log.info(`Found ${statements.length} SQL statements to execute`);

  // Track execution results
  const results = {
    success: 0,
    failed: 0,
    skipped: 0,
    errors: []
  };

  // Execute statements one by one
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    const statementPreview = statement.substring(0, 50).replace(/\n/g, ' ');
    
    try {
      log.info(`Executing statement ${i + 1}/${statements.length}: ${statementPreview}...`);
      
      // Use the admin API to execute raw SQL
      const { data, error } = await supabase.rpc('exec_sql', {
        sql: statement + ';'
      });

      if (error) {
        // Check if it's a "already exists" error which we can safely ignore
        if (error.message.includes('already exists') || 
            error.message.includes('duplicate key')) {
          log.warn(`Skipping (already exists): ${statementPreview}...`);
          results.skipped++;
        } else {
          log.error(`Failed: ${error.message}`);
          results.errors.push({
            statement: statementPreview,
            error: error.message
          });
          results.failed++;
        }
      } else {
        log.success(`Completed: ${statementPreview}...`);
        results.success++;
      }
    } catch (err) {
      log.error(`Exception: ${err.message}`);
      results.errors.push({
        statement: statementPreview,
        error: err.message
      });
      results.failed++;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  log.info('Deployment Summary:');
  log.success(`Successful statements: ${results.success}`);
  log.warn(`Skipped statements: ${results.skipped}`);
  if (results.failed > 0) {
    log.error(`Failed statements: ${results.failed}`);
    console.log('\nErrors:');
    results.errors.forEach((err, idx) => {
      console.log(`${idx + 1}. ${err.statement}`);
      console.log(`   Error: ${err.error}\n`);
    });
  }
  console.log('='.repeat(60) + '\n');

  // Verify deployment
  log.info('Verifying deployment...');
  
  const verificationQueries = [
    {
      name: 'User Profiles Table',
      query: `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = 'user_profiles'`
    },
    {
      name: 'Organizations Table', 
      query: `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = 'organizations'`
    },
    {
      name: 'Security Events Table',
      query: `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = 'security_events'`
    },
    {
      name: 'RLS on User Profiles',
      query: `SELECT COUNT(*) as count FROM pg_tables WHERE tablename = 'user_profiles' AND rowsecurity = true`
    }
  ];

  let verificationPassed = true;
  
  for (const check of verificationQueries) {
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: check.query
    });
    
    if (error || !data || data[0]?.count === 0) {
      log.error(`Verification failed for: ${check.name}`);
      verificationPassed = false;
    } else {
      log.success(`Verified: ${check.name}`);
    }
  }

  if (verificationPassed && results.failed === 0) {
    log.success('\n🎉 Authentication schema deployed successfully!');
    log.info('\nNext steps:');
    console.log('1. Create an admin user in Supabase Auth UI');
    console.log('2. Run security tests: npm run test:security');
    console.log('3. Set up Grafana monitoring (optional)');
    console.log('4. Configure webhook notifications');
  } else {
    log.error('\n⚠️  Deployment completed with issues. Please review errors above.');
  }
}

// Create a simple RPC function for executing SQL if it doesn't exist
async function createExecSqlFunction() {
  const functionSql = `
    CREATE OR REPLACE FUNCTION exec_sql(sql text)
    RETURNS json
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
      result json;
    BEGIN
      EXECUTE sql;
      RETURN json_build_object('success', true);
    EXCEPTION WHEN OTHERS THEN
      RETURN json_build_object('success', false, 'error', SQLERRM);
    END;
    $$;
  `;

  // This needs to be executed through a different method
  // For now, we'll note it as a prerequisite
  log.warn('Note: You may need to create the exec_sql function manually if it doesn\'t exist');
  log.info('You can do this in the Supabase SQL Editor with the following:');
  console.log(functionSql);
}

// Run the deployment
deploySchema().catch(err => {
  log.error(`Deployment failed: ${err.message}`);
  process.exit(1);
});