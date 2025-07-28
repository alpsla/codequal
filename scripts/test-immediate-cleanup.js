#!/usr/bin/env node

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function triggerDeepWikiClone() {
  console.log('🔄 Triggering repository clone on DeepWiki...');
  
  // Clone a test repository directly on DeepWiki
  const cloneCommand = `cd /root/.adalflow/repos && git clone https://github.com/vercel/swr.git`;
  
  try {
    await execAsync(`kubectl exec -n codequal-dev deployment/deepwiki -- bash -c "${cloneCommand}"`);
    console.log('✅ Repository cloned successfully');
    return true;
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('⚠️  Repository already exists');
      return true;
    }
    console.error('Failed to clone:', error.message);
    return false;
  }
}

async function getRepoStatus() {
  const { stdout: repos } = await execAsync(
    'kubectl exec -n codequal-dev deployment/deepwiki -- ls -la /root/.adalflow/repos 2>/dev/null || echo "No repos directory"'
  );
  
  const { stdout: usage } = await execAsync(
    'kubectl exec -n codequal-dev deployment/deepwiki -- df -h /root/.adalflow | tail -1'
  );
  
  return { repos, usage: usage.trim() };
}

async function test() {
  console.log('🔍 Testing Immediate Cleanup After Analysis');
  console.log('===========================================\n');
  
  // Show initial state
  console.log('📊 Initial state:');
  const before = await getRepoStatus();
  console.log('Disk usage:', before.usage);
  console.log('Repositories:\n', before.repos);
  
  // Clone a repo to simulate DeepWiki analysis
  await triggerDeepWikiClone();
  
  // Check state after clone
  console.log('\n📊 After clone (before cleanup):');
  const afterClone = await getRepoStatus();
  console.log('Disk usage:', afterClone.usage);
  console.log('Repositories:\n', afterClone.repos);
  
  // Now run the cleanup via our API
  console.log('\n🧹 Running cleanup via API...');
  
  const { deepWikiApiManager } = require('../apps/api/dist/services/deepwiki-api-manager.js');
  
  try {
    // Use mock mode to test just the cleanup
    process.env.USE_DEEPWIKI_MOCK = 'true';
    const result = await deepWikiApiManager.analyzeRepository('https://github.com/vercel/swr');
    console.log('✅ Analysis completed (mock mode), cleanup should have run');
  } catch (error) {
    console.error('Analysis error:', error.message);
  }
  
  // Wait a moment for cleanup to complete
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Check final state
  console.log('\n📊 Final state (after cleanup):');
  const after = await getRepoStatus();
  console.log('Disk usage:', after.usage);
  console.log('Repositories:\n', after.repos);
  
  // Verify cleanup
  if (!after.repos.includes('swr')) {
    console.log('\n✅ SUCCESS: Repository was cleaned up immediately after analysis!');
  } else {
    console.log('\n⚠️  WARNING: Repository still exists after analysis');
  }
}

// Initialize and run
console.log('[INFO] [deepwiki-api-manager] ModelVersionSync initialized');
test().catch(console.error);