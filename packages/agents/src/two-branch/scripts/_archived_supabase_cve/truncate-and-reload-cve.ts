#!/usr/bin/env ts-node
/**
 * Truncate CVE Database and Reload with CPE Entries
 *
 * This script:
 * 1. Truncates the cve_database table
 * 2. Runs nvd-direct-download.ts to reload with CPE data
 *
 * Usage: npx ts-node src/two-branch/scripts/truncate-and-reload-cve.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { exec } from 'child_process';
import { promisify } from 'util';

dotenv.config();

const execAsync = promisify(exec);

async function truncateAndReload() {
  console.log('\n════════════════════════════════════════════════════════════');
  console.log('  CVE DATABASE RELOAD WITH CPE ENTRIES');
  console.log('════════════════════════════════════════════════════════════\n');

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Step 1: Get current count
  console.log('[1/4] Checking current CVE database state...');
  const { count: beforeCount } = await supabase
    .from('cve_database')
    .select('*', { count: 'exact', head: true });

  console.log(`   Current CVE count: ${(beforeCount || 0).toLocaleString()}`);

  // Check if CPE entries exist
  const { data: sampleCVE } = await supabase
    .from('cve_database')
    .select('cve_id, cpe_entries')
    .not('cpe_entries', 'is', null)
    .limit(1)
    .single();

  if (sampleCVE && sampleCVE.cpe_entries) {
    console.log(`   ⚠️  CPE entries already exist in database`);
    console.log(`   Sample: ${sampleCVE.cve_id} has ${sampleCVE.cpe_entries.length} CPE entries`);
    console.log(`   Skipping truncate - database already has CPE data\n`);
    return;
  }

  console.log(`   ⚠️  No CPE entries found - reload required\n`);

  // Step 2: Truncate table
  console.log('[2/4] Truncating cve_database table...');
  console.log('   Warning: This will delete all 312,138 CVEs');
  console.log('   They will be reloaded with CPE entries in the next step\n');

  const { error: truncateError } = await supabase
    .from('cve_database')
    .delete()
    .gte('cve_id', 'CVE-');

  if (truncateError) {
    console.error('   ❌ Truncate failed:', truncateError.message);
    throw truncateError;
  }

  const { count: afterCount } = await supabase
    .from('cve_database')
    .select('*', { count: 'exact', head: true });

  console.log(`   ✅ Table truncated: ${(beforeCount || 0).toLocaleString()} → ${(afterCount || 0).toLocaleString()} CVEs\n`);

  // Step 3: Reload with CPE data
  console.log('[3/4] Reloading CVE database with CPE entries...');
  console.log('   Running: npx tsx src/two-branch/scripts/nvd-direct-download.ts');
  console.log('   Expected duration: 15-25 minutes');
  console.log('   Processing ~2,000 CVEs every 6 seconds (NVD API rate limit)\n');

  const startTime = Date.now();

  try {
    const { stdout, stderr } = await execAsync(
      'npx tsx src/two-branch/scripts/nvd-direct-download.ts',
      {
        timeout: 30 * 60 * 1000, // 30 minutes timeout
        maxBuffer: 50 * 1024 * 1024 // 50MB buffer
      }
    );

    const duration = Math.round((Date.now() - startTime) / 1000 / 60);
    console.log(`\n   ✅ Reload completed in ${duration} minutes\n`);

    // Show last few lines of output
    const outputLines = stdout.split('\n').filter(line => line.trim());
    const lastLines = outputLines.slice(-5);
    console.log('   Last output lines:');
    lastLines.forEach(line => console.log(`     ${line}`));

  } catch (error: any) {
    console.error(`\n   ❌ Reload failed: ${error.message}`);
    throw error;
  }

  // Step 4: Verify CPE entries
  console.log('\n[4/4] Verifying CPE entries populated...');

  const { count: finalCount } = await supabase
    .from('cve_database')
    .select('*', { count: 'exact', head: true });

  const { data: verifyCVEs } = await supabase
    .from('cve_database')
    .select('cve_id, cpe_entries, severity')
    .not('cpe_entries', 'is', null)
    .limit(5);

  console.log(`   Final CVE count: ${(finalCount || 0).toLocaleString()}`);

  if (verifyCVEs && verifyCVEs.length > 0) {
    console.log(`   ✅ CPE entries verified (${verifyCVEs.length} samples):\n`);
    verifyCVEs.forEach((cve: any) => {
      console.log(`   ${cve.cve_id} - ${cve.severity}`);
      console.log(`     CPE entries: ${cve.cpe_entries.length} entries`);
      console.log(`     Sample: ${cve.cpe_entries[0] || 'N/A'}`);
      console.log();
    });
  } else {
    console.log(`   ⚠️  No CPE entries found after reload`);
  }

  console.log('════════════════════════════════════════════════════════════');
  console.log('  CVE DATABASE RELOAD COMPLETE');
  console.log('════════════════════════════════════════════════════════════\n');
}

truncateAndReload()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
