#!/usr/bin/env ts-node
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkCPE() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log('Searching for log4j CVEs in database...\n');

  // Search for any log4j related CVEs
  const { data: log4jCVEs, error: searchError } = await supabase
    .from('cve_database')
    .select('cve_id, cpe_entries, severity, cvss_v3_score, description')
    .ilike('description', '%log4j%')
    .limit(5);

  if (searchError) {
    console.log('Search Error:', searchError);
    return;
  }

  if (!log4jCVEs || log4jCVEs.length === 0) {
    console.log('No log4j CVEs found in database');
    console.log('\nSearching for ANY CVEs with CPE entries...');

    const { data: anyCVEs, error: anyError } = await supabase
      .from('cve_database')
      .select('cve_id, cpe_entries, severity')
      .not('cpe_entries', 'is', null)
      .limit(3);

    if (anyCVEs && anyCVEs.length > 0) {
      console.log(`\nFound ${anyCVEs.length} CVEs with CPE entries. Sample:\n`);
      anyCVEs.forEach((cve: any) => {
        console.log(`${cve.cve_id} - ${cve.severity}`);
        if (cve.cpe_entries && cve.cpe_entries.length > 0) {
          console.log(`  CPE entries (first 3):`);
          cve.cpe_entries.slice(0, 3).forEach((cpe: string, i: number) => {
            console.log(`    ${i + 1}. ${cpe}`);
          });
        }
        console.log();
      });
    }
  } else {
    console.log(`Found ${log4jCVEs.length} log4j-related CVEs\n`);

    log4jCVEs.forEach((cve: any) => {
      console.log(`${cve.cve_id} - ${cve.severity} (CVSS: ${cve.cvss_v3_score || 'N/A'})`);
      console.log(`  Description: ${cve.description.substring(0, 100)}...`);

      if (cve.cpe_entries && cve.cpe_entries.length > 0) {
        console.log(`  CPE entries (first 5):`);
        cve.cpe_entries.slice(0, 5).forEach((cpe: string, i: number) => {
          console.log(`    ${i + 1}. ${cpe}`);
        });
      } else {
        console.log('  No CPE entries');
      }
      console.log();
    });
  }
}

checkCPE()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
