import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkTables() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log('Checking Supabase tables...\n');

  // Check cve_database
  const { count: cveCount, error: cveError } = await supabase
    .from('cve_database')
    .select('*', { count: 'exact', head: true });

  if (cveError) {
    console.log('❌ cve_database: NOT FOUND');
    console.log('   Deploy: src/two-branch/scheduler/migrations/001_create_cve_tables.sql');
  } else {
    console.log(`✅ cve_database: ${cveCount?.toLocaleString() || 0} CVEs`);
  }

  // Check analysis_requests
  const { error: arError } = await supabase
    .from('analysis_requests')
    .select('*', { count: 'exact', head: true });

  if (arError) {
    console.log('❌ analysis_requests: NOT FOUND');
    console.log('   Deploy: src/two-branch/scheduler/migrations/002_create_analysis_tracking_tables.sql');
  } else {
    console.log('✅ analysis_requests: EXISTS');
  }

  // Check cve_update_log
  const { error: culError } = await supabase
    .from('cve_update_log')
    .select('*', { count: 'exact', head: true });

  if (culError) {
    console.log('❌ cve_update_log: NOT FOUND');
  } else {
    console.log('✅ cve_update_log: EXISTS');
  }

  process.exit(arError || culError ? 1 : 0);
}

checkTables();
