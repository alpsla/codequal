require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

async function runDeepWikiTest() {
  console.log('🚀 Running DeepWiki Test Analysis...\n');
  
  // Test repository - a small one for quick testing
  const testRepo = 'https://github.com/sindresorhus/is-docker';
  
  try {
    console.log('📊 Checking initial disk usage...');
    const { stdout: initialDisk } = await execAsync(
      'kubectl exec -n codequal-dev deployment/deepwiki -- df -h /root/.adalflow | tail -1'
    );
    console.log('Initial:', initialDisk.trim());
    
    console.log('\n🔍 Triggering DeepWiki analysis...');
    console.log('Repository:', testRepo);
    
    // Trigger analysis through DeepWiki API
    const { stdout: trigger } = await execAsync(
      `kubectl exec -n codequal-dev deployment/deepwiki -- ` +
      `curl -s -X POST http://localhost:8000/analyze ` +
      `-H "Content-Type: application/json" ` +
      `-d '{"repository_url": "${testRepo}", "branch": "main"}'`
    );
    
    console.log('Response:', trigger || 'Analysis triggered');
    
    // Wait a bit for analysis to start
    console.log('\n⏳ Waiting for analysis to start...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check disk usage after
    console.log('\n📊 Checking disk usage after analysis...');
    const { stdout: afterDisk } = await execAsync(
      'kubectl exec -n codequal-dev deployment/deepwiki -- df -h /root/.adalflow | tail -1'
    );
    console.log('After:', afterDisk.trim());
    
    // Check if repo was cloned
    console.log('\n📁 Checking cloned repositories...');
    const { stdout: repos } = await execAsync(
      'kubectl exec -n codequal-dev deployment/deepwiki -- ls -la /root/.adalflow/repos 2>/dev/null || echo "No repos directory"'
    );
    console.log(repos);
    
    // Trigger metrics collection
    console.log('\n💾 Collecting metrics...');
    await execAsync('node ' + __dirname + '/trigger-metrics-collection.js');
    
    console.log('\n✅ Test complete! Check Grafana dashboard for updated metrics.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Alternative: Simple disk usage simulation
async function simulateMetrics() {
  console.log('\n🎭 Simulating metrics changes...\n');
  
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  // Simulate increasing disk usage
  const scenarios = [
    { percent: 5, repos: 1, desc: 'Analysis started' },
    { percent: 15, repos: 1, desc: 'Repository cloned' },
    { percent: 25, repos: 1, desc: 'Analysis in progress' },
    { percent: 20, repos: 1, desc: 'Some cleanup done' },
    { percent: 10, repos: 0, desc: 'Full cleanup completed' }
  ];
  
  for (const scenario of scenarios) {
    console.log(`📊 ${scenario.desc}: ${scenario.percent}% disk, ${scenario.repos} repos`);
    
    const { error } = await supabase
      .from('deepwiki_metrics')
      .insert({
        disk_total_gb: 10,
        disk_used_gb: Math.round(scenario.percent / 10),
        disk_available_gb: 10 - Math.round(scenario.percent / 10),
        disk_usage_percent: scenario.percent,
        active_repositories: scenario.repos,
        metadata: { 
          source: 'simulation',
          scenario: scenario.desc 
        }
      });
    
    if (error) {
      console.error('Error:', error);
    }
    
    // Wait 2 seconds between entries
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Add an analysis record
  await supabase
    .from('analysis_history')
    .insert({
      repository_url: 'https://github.com/test/simulated-repo',
      repository_name: 'simulated-repo',
      status: 'completed',
      disk_usage_mb: 250,
      analysis_duration_seconds: 45
    });
  
  console.log('\n✅ Simulation complete! Refresh Grafana to see the changes.');
}

// Ask which test to run
console.log('Choose test mode:');
console.log('1. Real DeepWiki analysis (may take time)');
console.log('2. Simulate metrics (instant)');
console.log('\nPress 1 or 2...');

process.stdin.once('data', async (data) => {
  const choice = data.toString().trim();
  
  if (choice === '1') {
    await runDeepWikiTest();
  } else if (choice === '2') {
    await simulateMetrics();
  } else {
    console.log('Invalid choice');
  }
  
  process.exit();
});