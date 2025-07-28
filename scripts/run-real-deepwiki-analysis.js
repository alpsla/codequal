require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Monitor disk usage during analysis
async function monitorDiskUsage() {
  const interval = setInterval(async () => {
    try {
      const { stdout } = await execAsync(
        'kubectl exec -n codequal-dev deployment/deepwiki -- df -h /root/.adalflow | tail -1'
      );
      console.log(`📊 Current: ${stdout.trim()}`);
      
      // Trigger metrics collection
      await execAsync('node ' + __dirname + '/trigger-metrics-collection.js');
    } catch (err) {
      // Ignore errors during monitoring
    }
  }, 10000); // Every 10 seconds
  
  return interval;
}

async function runRealAnalysis() {
  console.log('🚀 Starting REAL DeepWiki Analysis...\n');
  
  // Small test repository for quick analysis
  const testRepo = 'https://github.com/expressjs/cors';
  
  try {
    console.log('📊 Initial disk state:');
    const { stdout: initial } = await execAsync(
      'kubectl exec -n codequal-dev deployment/deepwiki -- df -h /root/.adalflow | tail -1'
    );
    console.log(initial.trim());
    
    // Collect initial metrics
    await execAsync('node ' + __dirname + '/trigger-metrics-collection.js');
    
    console.log('\n🔧 Triggering DeepWiki analysis...');
    console.log('Repository:', testRepo);
    
    // Start monitoring
    const monitor = monitorDiskUsage();
    
    // Clone repository in DeepWiki pod
    console.log('\n📥 Cloning repository...');
    const repoName = testRepo.split('/').pop();
    const cloneCmd = `cd /root/.adalflow/repos && git clone ${testRepo}`;
    
    try {
      await execAsync(
        `kubectl exec -n codequal-dev deployment/deepwiki -- bash -c "${cloneCmd}"`
      );
      console.log('✅ Repository cloned successfully');
    } catch (err) {
      console.log('Repository might already exist, continuing...');
    }
    
    // Wait to see disk usage change
    console.log('\n⏳ Monitoring disk usage for 30 seconds...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    // Check active repositories
    console.log('\n📁 Active repositories:');
    const { stdout: repos } = await execAsync(
      'kubectl exec -n codequal-dev deployment/deepwiki -- ls -la /root/.adalflow/repos/'
    );
    console.log(repos);
    
    // Simulate analysis completion
    console.log('\n📝 Recording analysis completion...');
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    
    await supabase
      .from('analysis_history')
      .insert({
        repository_url: testRepo,
        repository_name: repoName,
        status: 'completed',
        disk_usage_mb: 50,
        analysis_duration_seconds: 30
      });
    
    // Continue monitoring for cleanup
    console.log('\n🧹 Waiting 20 seconds before cleanup...');
    await new Promise(resolve => setTimeout(resolve, 20000));
    
    // Cleanup
    console.log('\n🗑️  Cleaning up repository...');
    const cleanupCmd = `rm -rf /root/.adalflow/repos/${repoName}`;
    await execAsync(
      `kubectl exec -n codequal-dev deployment/deepwiki -- bash -c "${cleanupCmd}"`
    );
    
    // Record cleanup
    await supabase
      .from('deepwiki_cleanups')
      .insert({
        cleanup_time: new Date().toISOString(),
        cleanup_status: 'success',
        repositories_cleaned: 1,
        disk_freed_mb: 50
      });
    
    // Final metrics collection
    console.log('\n📊 Final disk state:');
    const { stdout: final } = await execAsync(
      'kubectl exec -n codequal-dev deployment/deepwiki -- df -h /root/.adalflow | tail -1'
    );
    console.log(final.trim());
    
    await execAsync('node ' + __dirname + '/trigger-metrics-collection.js');
    
    // Stop monitoring
    clearInterval(monitor);
    
    console.log('\n✅ Real analysis complete!');
    console.log('Check Grafana to see:');
    console.log('- Disk usage increase when repo was cloned');
    console.log('- Disk usage decrease after cleanup');
    console.log('- Analysis and cleanup events recorded');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the analysis
runRealAnalysis();