require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function cleanupTestData() {
  console.log('🧹 Cleaning up test data from Supabase...\n');
  
  // Show current data before cleanup
  console.log('📊 Current data:');
  const { data: metrics } = await supabase
    .from('deepwiki_metrics')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);
  
  console.log(`Found ${metrics?.length || 0} metrics entries`);
  
  // Clean up test data (keep only real metrics)
  console.log('\n🗑️  Removing test/simulation data...');
  
  // Delete simulated metrics
  const { error: metricsError, count: metricsCount } = await supabase
    .from('deepwiki_metrics')
    .delete()
    .or('metadata->source.eq.simulation,metadata->source.eq.manual_trigger')
    .select('*', { count: 'exact', head: true });
  
  if (metricsError) {
    console.error('Error cleaning metrics:', metricsError);
  } else {
    console.log(`✅ Removed ${metricsCount || 0} test metric entries`);
  }
  
  // Delete test analysis history
  const { error: analysisError, count: analysisCount } = await supabase
    .from('analysis_history')
    .delete()
    .or('repository_name.eq.repo1,repository_name.eq.repo2,repository_name.eq.repo3,repository_name.eq.simulated-repo')
    .select('*', { count: 'exact', head: true });
  
  if (analysisError) {
    console.error('Error cleaning analysis history:', analysisError);
  } else {
    console.log(`✅ Removed ${analysisCount || 0} test analysis entries`);
  }
  
  // Show remaining data
  console.log('\n📊 Remaining real data:');
  const { data: remaining } = await supabase
    .from('deepwiki_metrics')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (remaining && remaining.length > 0) {
    console.log(`${remaining.length} real metrics entries remain`);
  } else {
    console.log('No data remaining - ready for real analysis!');
  }
  
  console.log('\n✅ Cleanup complete!');
}

cleanupTestData();