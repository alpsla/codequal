#!/usr/bin/env ts-node

/**
 * Verify Supabase Connection Script
 *
 * This script verifies that Supabase connection is working before
 * deploying the CVE database schema.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('🔍 Verifying Supabase Connection...\n');

  // Check environment variables
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing required environment variables:');
    if (!supabaseUrl) console.error('   - SUPABASE_URL');
    if (!supabaseKey) console.error('   - SUPABASE_SERVICE_ROLE_KEY');
    console.error('\nPlease configure these in your .env file.');
    process.exit(1);
  }

  console.log('✅ Environment variables found');
  console.log(`   Supabase URL: ${supabaseUrl}`);
  console.log(`   Service Role Key: ${supabaseKey.substring(0, 20)}...`);
  console.log('');

  // Create client
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Test 1: Check if we can connect
  console.log('Test 1: Testing database connection...');
  try {
    const { data, error } = await supabase
      .from('model_configurations')  // Assuming this table exists from your previous setup
      .select('count')
      .limit(1);

    if (error) {
      console.error('❌ Connection test failed:', error.message);
      console.error('\nPossible issues:');
      console.error('1. Supabase project is not accessible');
      console.error('2. Service role key is incorrect');
      console.error('3. Network connection issue');
      process.exit(1);
    }

    console.log('✅ Database connection successful\n');
  } catch (err: any) {
    console.error('❌ Connection error:', err.message);
    process.exit(1);
  }

  // Test 2: Check if CVE tables already exist
  console.log('Test 2: Checking if CVE tables already exist...');
  try {
    const { data: cveCheck, error: cveError } = await supabase
      .from('cve_database')
      .select('count')
      .limit(1);

    if (cveError) {
      if (cveError.message.includes('does not exist')) {
        console.log('✅ CVE tables do not exist yet (as expected)');
        console.log('   Ready for migration deployment\n');
      } else {
        console.error('❌ Unexpected error:', cveError.message);
        process.exit(1);
      }
    } else {
      const { count } = await supabase
        .from('cve_database')
        .select('*', { count: 'exact', head: true });

      console.log('⚠️  CVE database table already exists!');
      console.log(`   Current record count: ${count || 0}`);
      console.log('   Migration can still be run (uses IF NOT EXISTS)\n');
    }
  } catch (err: any) {
    console.log('✅ CVE tables do not exist yet (as expected)');
    console.log('   Ready for migration deployment\n');
  }

  // Summary
  console.log('='.repeat(60));
  console.log('VERIFICATION COMPLETE');
  console.log('='.repeat(60));
  console.log('');
  console.log('Next Steps:');
  console.log('');
  console.log('1. Open Supabase Dashboard:');
  console.log(`   ${supabaseUrl.replace('https://', 'https://supabase.com/dashboard/project/')}`);
  console.log('');
  console.log('2. Navigate to SQL Editor → New Query');
  console.log('');
  console.log('3. Copy the SQL migration file:');
  console.log('   packages/agents/src/two-branch/scheduler/migrations/001_create_cve_tables.sql');
  console.log('');
  console.log('4. Paste and execute in Supabase SQL Editor');
  console.log('');
  console.log('5. Run initial data load:');
  console.log('   npx ts-node src/two-branch/scripts/initial-cve-load.ts');
  console.log('');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
