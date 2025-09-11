require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMetrics() {
  console.log('🔍 Checking Supabase tables...\n');
  
  // 1. Check deepwiki_metrics table
  console.log('📊 DeepWiki Metrics (last 5 entries):');
  const { data: metrics, error: metricsError } = await supabase
    .from('deepwiki_metrics')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (metricsError) {
    console.error('Error fetching metrics:', metricsError.message);
  } else if (!metrics || metrics.length === 0) {
    console.log('   No metrics data found yet');
  } else {
    metrics.forEach(m => {
      console.log(`   ${new Date(m.created_at).toLocaleString()}: ${m.disk_usage_percent}% usage, ${m.active_repositories} repos`);
    });
  }
  
  // 2. Check analysis_history table
  console.log('\n📈 Analysis History (last 5 entries):');
  const { data: analyses, error: analysisError } = await supabase
    .from('analysis_history')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (analysisError) {
    console.error('Error fetching analysis history:', analysisError.message);
  } else if (!analyses || analyses.length === 0) {
    console.log('   No analysis history found yet');
  } else {
    analyses.forEach(a => {
      console.log(`   ${new Date(a.created_at).toLocaleString()}: ${a.repository_name} - ${a.status}`);
    });
  }
  
  // 3. Check deepwiki_cleanups table
  console.log('\n🧹 Cleanup History (last 5 entries):');
  const { data: cleanups, error: cleanupError } = await supabase
    .from('deepwiki_cleanups')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (cleanupError) {
    console.error('Error fetching cleanup history:', cleanupError.message);
  } else if (!cleanups || cleanups.length === 0) {
    console.log('   No cleanup history found yet');
  } else {
    cleanups.forEach(c => {
      console.log(`   ${new Date(c.created_at).toLocaleString()}: ${c.cleanup_status} - ${c.repositories_cleaned} repos cleaned`);
    });
  }
  
  console.log('\n✅ Check complete!');
}

// Run the check
checkMetrics().catch(console.error);