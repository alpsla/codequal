require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testQueries() {
  console.log('🧪 Testing Grafana queries...\n');
  
  // Query 1: Current Disk Usage (for Gauge)
  console.log('📊 Query 1: Current Disk Usage');
  console.log('Query: SELECT disk_usage_percent::float as value FROM deepwiki_metrics WHERE created_at >= NOW() - INTERVAL \'5 minutes\' ORDER BY created_at DESC LIMIT 1');
  
  const { data: gauge, error: gaugeError } = await supabase
    .from('deepwiki_metrics')
    .select('disk_usage_percent')
    .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })
    .limit(1);
  
  if (gaugeError) {
    console.log('❌ Error:', gaugeError);
  } else {
    console.log('✅ Result:', gauge);
  }
  
  // Query 2: All recent metrics
  console.log('\n📊 Query 2: All Recent Metrics (last hour)');
  const { data: allMetrics, error: allError } = await supabase
    .from('deepwiki_metrics')
    .select('*')
    .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false });
  
  if (allError) {
    console.log('❌ Error:', allError);
  } else {
    console.log('✅ Found', allMetrics.length, 'records');
    allMetrics.forEach(m => {
      console.log(`   ${new Date(m.created_at).toLocaleString()}: ${m.disk_usage_percent}%`);
    });
  }
  
  // Test simple query
  console.log('\n📊 Query 3: Simple test query');
  console.log('Query: SELECT disk_usage_percent FROM deepwiki_metrics ORDER BY created_at DESC LIMIT 1');
  const { data: simple, error: simpleError } = await supabase
    .from('deepwiki_metrics')
    .select('disk_usage_percent')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  if (simpleError) {
    console.log('❌ Error:', simpleError);
  } else {
    console.log('✅ Latest value:', simple.disk_usage_percent + '%');
  }
  
  // Test time series query format
  console.log('\n📊 Query 4: Time series format');
  const { data: timeSeries, error: tsError } = await supabase
    .from('deepwiki_metrics')
    .select('created_at, disk_usage_percent')
    .order('created_at', { ascending: true })
    .limit(10);
  
  if (tsError) {
    console.log('❌ Error:', tsError);
  } else {
    console.log('✅ Time series data:');
    timeSeries.forEach(m => {
      console.log(`   time: ${m.created_at}, value: ${m.disk_usage_percent}`);
    });
  }
}

testQueries();