require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function addFinalCleanup() {
  console.log('🧹 Adding deep cleanup metric...');
  
  const { error } = await supabase
    .from('deepwiki_metrics')
    .insert({
      disk_total_gb: 10,
      disk_used_gb: 1,  // Round to 1GB
      disk_available_gb: 9,
      disk_usage_percent: 3,
      active_repositories: 0,
      metadata: { 
        source: 'simulation',
        scenario: 'Deep cleanup - all caches cleared' 
      }
    });
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('✅ Added metric showing return to baseline 3%');
  }
  
  // Also record this as a cleanup event
  await supabase
    .from('deepwiki_cleanups')
    .insert({
      cleanup_time: new Date().toISOString(),
      cleanup_status: 'success',
      repositories_cleaned: 1,
      disk_freed_mb: 700,  // Freed 700MB to go from 10% to 3%
      error_message: null
    });
  
  console.log('✅ Cleanup event recorded');
}

addFinalCleanup();