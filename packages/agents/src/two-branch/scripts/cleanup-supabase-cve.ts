#!/usr/bin/env ts-node
/**
 * Cleanup Supabase CVE Database
 *
 * Truncates the cve_database table to free up storage.
 *
 * Reason: Switching to OWASP Dependency-Check instead of custom CVE matching.
 * The table has incomplete data (NULL cpe_entries) and is no longer needed.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

async function cleanupSupabaseCVE() {
  console.log('\n========================================');
  console.log('Supabase CVE Database Cleanup');
  console.log('========================================\n');

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Step 1: Check current state
  console.log('[1/3] Checking current CVE database state...');
  const { count: beforeCount, error: countError } = await supabase
    .from('cve_database')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('Error counting CVEs:', countError);
    process.exit(1);
  }

  console.log(`   Current CVE count: ${beforeCount?.toLocaleString()}`);

  if (!beforeCount || beforeCount === 0) {
    console.log('\n✅ Table is already empty. Nothing to clean up.');
    process.exit(0);
  }

  // Step 2: Estimate storage savings
  const estimatedStorageMB = Math.round((beforeCount * 1000) / (1024 * 1024)); // ~1KB per CVE
  console.log(`   Estimated storage to free: ~${estimatedStorageMB} MB\n`);

  // Step 3: Truncate table
  console.log('[2/3] Truncating cve_database table...');
  console.log(`   Warning: This will delete all ${beforeCount.toLocaleString()} CVE records`);
  console.log('   Reason: Switching to OWASP Dependency-Check for vulnerability detection\n');

  const { error: deleteError } = await supabase
    .from('cve_database')
    .delete()
    .gte('cve_id', 'CVE-'); // Delete all CVEs

  if (deleteError) {
    console.error('Error truncating table:', deleteError);
    process.exit(1);
  }

  console.log('   ✅ Table truncated successfully\n');

  // Step 4: Verify cleanup
  console.log('[3/3] Verifying cleanup...');
  const { count: afterCount } = await supabase
    .from('cve_database')
    .select('*', { count: 'exact', head: true });

  console.log(`   Final CVE count: ${afterCount || 0}`);

  if (afterCount === 0) {
    console.log('   ✅ Cleanup successful!\n');
  } else {
    console.log(`   ⚠️  Warning: ${afterCount} CVEs remaining\n`);
  }

  console.log('========================================');
  console.log('Cleanup Complete');
  console.log('========================================');
  console.log(`\nFreed: ~${estimatedStorageMB} MB`);
  console.log('Table schema preserved (can be used for future purposes)');
  console.log('\nNext Steps:');
  console.log('1. Deploy Dependency-Check pre-warming cron job');
  console.log('2. Integrate Dependency-Check into V9ToolOrchestrator');
  console.log('3. Archive unused CVE loading scripts\n');
}

cleanupSupabaseCVE().catch(console.error);
