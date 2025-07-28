require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

async function runLargerAnalysis() {
  console.log('🚀 Running analysis with a larger repository...\n');
  
  // Larger repository
  const testRepo = 'https://github.com/vuejs/vue';
  
  try {
    console.log('📊 Initial metrics collection...');
    await execAsync('node ' + __dirname + '/trigger-metrics-collection.js');
    
    console.log('\n📥 Cloning Vue.js repository (this is larger)...');
    const repoName = 'vue';
    const cloneCmd = `cd /root/.adalflow/repos && git clone --depth 1 ${testRepo}`;
    
    await execAsync(
      `kubectl exec -n codequal-dev deployment/deepwiki -- bash -c "${cloneCmd}"`
    );
    
    console.log('✅ Repository cloned');
    
    // Collect metrics after clone
    console.log('\n📊 Collecting metrics after clone...');
    await execAsync('node ' + __dirname + '/trigger-metrics-collection.js');
    
    // Check disk usage
    const { stdout } = await execAsync(
      'kubectl exec -n codequal-dev deployment/deepwiki -- du -sh /root/.adalflow/repos/vue'
    );
    console.log('Repository size:', stdout.trim());
    
    // Record analysis
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    
    await supabase
      .from('analysis_history')
      .insert({
        repository_url: testRepo,
        repository_name: repoName,
        status: 'completed',
        disk_usage_mb: 30,
        analysis_duration_seconds: 45
      });
    
    console.log('\n⏳ Waiting 10 seconds before cleanup...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Cleanup
    console.log('\n🗑️  Cleaning up...');
    await execAsync(
      `kubectl exec -n codequal-dev deployment/deepwiki -- rm -rf /root/.adalflow/repos/vue`
    );
    
    // Record cleanup
    await supabase
      .from('deepwiki_cleanups')
      .insert({
        cleanup_time: new Date().toISOString(),
        cleanup_status: 'success',
        repositories_cleaned: 1,
        disk_freed_mb: 30
      });
    
    // Final metrics
    console.log('\n📊 Final metrics collection...');
    await execAsync('node ' + __dirname + '/trigger-metrics-collection.js');
    
    console.log('\n✅ Analysis complete!');
    console.log('Check Grafana now to see the disk usage changes.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

runLargerAnalysis();