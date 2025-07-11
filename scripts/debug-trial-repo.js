require('dotenv').config({ path: './apps/api/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugTrialRepo() {
  console.log('\n=== Debug Trial Repository Table ===\n');

  try {
    // Check all trial repository records
    const { data: allRecords, error } = await supabase
      .from('user_trial_repository')
      .select('*');

    if (error) {
      console.error('Error fetching data:', error);
      return;
    }

    console.log(`Found ${allRecords?.length || 0} trial repository records:\n`);

    if (allRecords && allRecords.length > 0) {
      allRecords.forEach((record, idx) => {
        console.log(`Record ${idx + 1}:`);
        console.log(`  ID: ${record.id}`);
        console.log(`  User ID: ${record.user_id}`);
        console.log(`  Repository: ${record.repository_url}`);
        console.log(`  Created: ${record.created_at ? new Date(record.created_at).toLocaleString() : 'N/A'}`);
        console.log('');
      });
    }

    // Check for duplicate user_ids
    const userCounts = {};
    allRecords?.forEach(record => {
      userCounts[record.user_id] = (userCounts[record.user_id] || 0) + 1;
    });

    const duplicates = Object.entries(userCounts).filter(([_, count]) => count > 1);
    if (duplicates.length > 0) {
      console.log('\n⚠️  WARNING: Found users with multiple trial repositories:');
      duplicates.forEach(([userId, count]) => {
        console.log(`  User ${userId}: ${count} repositories`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

debugTrialRepo().then(() => process.exit(0));