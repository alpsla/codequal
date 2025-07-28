const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

async function collectMetrics() {
  try {
    console.log('📊 Collecting DeepWiki metrics...');
    
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
    
    console.log('📈 Current Metrics:');
    console.log(`   Disk Usage: ${percentUsed}% (${usedGB}GB / ${totalGB}GB)`);
    console.log(`   Available: ${availableGB}GB`);
    console.log(`   Active Repos: ${repoCount}`);
    
    return {
      disk_total_gb: totalGB,
      disk_used_gb: usedGB,
      disk_available_gb: availableGB,
      disk_usage_percent: percentUsed,
      active_repositories: repoCount
    };
    
  } catch (error) {
    console.error('❌ Failed to collect metrics:', error.message);
    throw error;
  }
}

// Run collection
collectMetrics()
  .then(metrics => {
    console.log('\n✅ Metrics collected successfully!');
    console.log('📝 Now these should be stored in Supabase by the API service');
  })
  .catch(err => {
    console.error('Failed:', err);
    process.exit(1);
  });