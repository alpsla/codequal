require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { exec } = require('child_process');
const { promisify } = require('util');
const { createClient } = require('@supabase/supabase-js');

const execAsync = promisify(exec);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function collectAndStore() {
  console.log('🚀 Collecting metrics from DeepWiki pod...');
  
  try {
    // Get disk usage
    const { stdout: diskInfo } = await execAsync(
      'kubectl exec -n codequal-dev deployment/deepwiki -- df -BG /root/.adalflow | tail -1'
    );
    
    const parts = diskInfo.trim().split(/\s+/);
    const totalGB = parseInt(parts[1].replace('G', ''));
    const usedGB = parseInt(parts[2].replace('G', ''));
    const availableGB = parseInt(parts[3].replace('G', ''));
    const percentUsed = parseInt(parts[4].replace('%', ''));
    
    // Get repository count
    const { stdout: repoList } = await execAsync(
      'kubectl exec -n codequal-dev deployment/deepwiki -- ls -la /root/.adalflow/repos 2>/dev/null || echo ""'
    );
    
    const repoCount = Math.max(0, (repoList.match(/^d/gm) || []).length - 2);
    
    console.log('📊 Current metrics:');
    console.log(`   Disk: ${percentUsed}% (${usedGB}GB / ${totalGB}GB)`);
    console.log(`   Repos: ${repoCount}`);
    
    // Store in Supabase
    console.log('\n💾 Storing in Supabase...');
    const { data, error } = await supabase
      .from('deepwiki_metrics')
      .insert({
        disk_total_gb: totalGB,
        disk_used_gb: usedGB,
        disk_available_gb: availableGB,
        disk_usage_percent: percentUsed,
        active_repositories: repoCount,
        metadata: {
          source: 'manual_trigger',
          timestamp: new Date().toISOString()
        }
      })
      .select();
    
    if (error) {
      console.error('❌ Error storing metrics:', error);
    } else {
      console.log('✅ Metrics stored successfully!');
      console.log('   ID:', data[0].id);
      console.log('   Created:', new Date(data[0].created_at).toLocaleString());
    }
    
  } catch (error) {
    console.error('❌ Failed:', error.message);
  }
}

collectAndStore();