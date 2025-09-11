require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function cleanupAllTestData() {
  console.log('🧹 Cleaning ALL test data from Supabase...\n');
  
  // Delete ALL data from tables to start fresh
  console.log('🗑️  Clearing all tables for fresh start...');
  
  // Clear deepwiki_metrics
  const { error: metricsError } = await supabase
    .from('deepwiki_metrics')
    .delete()
    .neq('id', 0); // Delete all rows
  
  if (metricsError) {
    console.error('Error cleaning metrics:', metricsError);
  } else {
    console.log('✅ Cleared deepwiki_metrics table');
  }
  
  // Clear analysis_history
  const { error: analysisError } = await supabase
    .from('analysis_history')
    .delete()
    .neq('id', 0); // Delete all rows
  
  if (analysisError) {
    console.error('Error cleaning analysis history:', analysisError);
  } else {
    console.log('✅ Cleared analysis_history table');
  }
  
  // Clear deepwiki_cleanups
  const { error: cleanupError } = await supabase
    .from('deepwiki_cleanups')
    .delete()
    .neq('id', 0); // Delete all rows
  
  if (cleanupError) {
    console.error('Error cleaning cleanups:', cleanupError);
  } else {
    console.log('✅ Cleared deepwiki_cleanups table');
  }
  
  console.log('\n✅ All test data cleared! Ready for real analysis.');
}

cleanupAllTestData();