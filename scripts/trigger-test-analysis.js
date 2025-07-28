#!/usr/bin/env node

const { deepWikiApiManager } = require('../apps/api/dist/services/deepwiki-api-manager.js');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

console.log('[INFO] [deepwiki-api-manager] ModelVersionSync initialized');

async function simulateFullFlow() {
  console.log('\n🚀 Simulating Full PR Analysis Flow');
  console.log('=====================================\n');
  
  const repoUrl = 'https://github.com/vercel/swr';
  
  try {
    // Step 1: Clone repository manually (simulating DeepWiki)
    console.log('📥 Step 1: Cloning repository (simulating DeepWiki)...');
    await execAsync(
      `kubectl exec -n codequal-dev deployment/deepwiki -- bash -c "cd /root/.adalflow/repos && git clone ${repoUrl} 2>/dev/null || echo 'Already exists'"`
    );
    console.log('✅ Repository cloned\n');
    
    // Wait a bit to see it in monitoring
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Step 2: Simulate MCP tools accessing the repo
    console.log('🔧 Step 2: MCP Tools accessing cached files...');
    const cachedFiles = await deepWikiApiManager.getCachedRepositoryFiles(repoUrl, 'main');
    console.log(`✅ Retrieved ${cachedFiles.length} files from cache\n`);
    
    // Wait to simulate analysis
    console.log('⏳ Step 3: Simulating agent analysis (30 seconds)...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    console.log('✅ Analysis complete\n');
    
    // Step 4: Cleanup
    console.log('🧹 Step 4: Running cleanup...');
    await deepWikiApiManager.cleanupRepository(repoUrl);
    console.log('✅ Cleanup complete\n');
    
    // Final check
    const { stdout } = await execAsync(
      'kubectl exec -n codequal-dev deployment/deepwiki -- df -h /root/.adalflow | tail -1'
    );
    console.log('📊 Final disk state:', stdout.trim());
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

simulateFullFlow();