#!/usr/bin/env node

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function getDiskUsage() {
  const { stdout } = await execAsync('kubectl exec -n codequal-dev deployment/deepwiki -- df -BG /root/.adalflow | tail -1');
  const parts = stdout.trim().split(/\s+/);
  return {
    totalGB: parseInt(parts[1].replace('G', '')),
    usedGB: parseInt(parts[2].replace('G', '')),
    availableGB: parseInt(parts[3].replace('G', '')),
    percentUsed: parseInt(parts[4].replace('%', ''))
  };
}

async function getActiveAnalyses() {
  const { stdout } = await execAsync('kubectl exec -n codequal-dev deployment/deepwiki -- find /root/.adalflow/repos -maxdepth 1 -type d | wc -l');
  return parseInt(stdout.trim()) - 1;
}

async function getOldRepos(ageMinutes = 1440) { // 24 hours default
  const { stdout } = await execAsync(
    `kubectl exec -n codequal-dev deployment/deepwiki -- find /root/.adalflow/repos -maxdepth 1 -type d -mmin +${ageMinutes} -not -path /root/.adalflow/repos | wc -l`
  );
  return parseInt(stdout.trim());
}

async function triggerDirectAnalysis() {
  console.log('🚀 Triggering DeepWiki analysis directly via kubectl...');
  
  const payload = {
    repo_url: 'https://github.com/vercel/swr',
    messages: [
      {
        role: 'user',
        content: 'Provide a comprehensive security and code quality analysis of this repository.'
      }
    ],
    stream: false,
    provider: 'openrouter',
    model: 'claude-3-5-sonnet-20241022',
    temperature: 0.2
  };

  try {
    const curlCommand = `curl -s -X POST http://localhost:8001/chat/completions/stream -H "Content-Type: application/json" -d '${JSON.stringify(payload).replace(/'/g, "'\"'\"'")}'`;
    
    const { stdout, stderr } = await execAsync(
      `kubectl exec -n codequal-dev deployment/deepwiki -- bash -c '${curlCommand}'`
    );
    
    if (stderr && !stderr.includes('warning')) {
      console.error('DeepWiki stderr:', stderr);
    }
    
    // Check if we got a response
    if (stdout) {
      const response = JSON.parse(stdout);
      if (response.choices && response.choices[0]) {
        console.log('✅ Analysis triggered successfully');
        return true;
      }
    }
  } catch (error) {
    console.error('Failed to trigger analysis:', error.message);
  }
  
  return false;
}

async function monitorCleanup() {
  console.log('🔍 DeepWiki Cleanup Verification Test');
  console.log('=====================================\n');
  
  // Step 1: Get initial state
  console.log('📊 Initial state:');
  const before = await getDiskUsage();
  const analysesBefore = await getActiveAnalyses();
  const oldReposBefore = await getOldRepos(30); // Check repos older than 30 minutes
  
  console.log(`   Disk: ${before.usedGB}GB/${before.totalGB}GB (${before.percentUsed}%)`)
  console.log(`   Active analyses: ${analysesBefore}`);
  console.log(`   Repos older than 30 min: ${oldReposBefore}`);
  
  // Step 2: Check if we need to trigger analysis based on disk usage
  if (before.percentUsed < 70) {
    console.log('\n⚠️  Disk usage is below 70%. Let\'s trigger some analyses to test cleanup...');
    
    // Trigger multiple analyses to increase disk usage
    for (let i = 0; i < 3; i++) {
      console.log(`\n🚀 Triggering analysis ${i+1}/3...`);
      await triggerDirectAnalysis();
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds between
    }
  }
  
  // Step 3: Monitor for cleanup activity
  console.log('\n⏳ Monitoring for cleanup activity (2 minutes)...');
  
  let cleanupDetected = false;
  let maxUsage = before.usedGB;
  
  for (let i = 0; i < 12; i++) { // Check every 10 seconds for 2 minutes
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    const current = await getDiskUsage();
    const currentAnalyses = await getActiveAnalyses();
    const oldRepos = await getOldRepos(30);
    
    console.log(`   [${new Date().toLocaleTimeString()}] Disk: ${current.usedGB}GB (${current.percentUsed}%) | Active: ${currentAnalyses} | Old repos: ${oldRepos}`);
    
    // Track max usage
    if (current.usedGB > maxUsage) {
      maxUsage = current.usedGB;
    }
    
    // Check if cleanup happened
    if (oldRepos < oldReposBefore || current.usedGB < before.usedGB) {
      cleanupDetected = true;
      console.log('   🧹 Cleanup activity detected!');
    }
  }
  
  // Step 4: Final analysis
  console.log('\n📊 Final state:');
  const after = await getDiskUsage();
  const analysesAfter = await getActiveAnalyses();
  const oldReposAfter = await getOldRepos(30);
  
  console.log(`   Disk: ${after.usedGB}GB/${after.totalGB}GB (${after.percentUsed}%)`);
  console.log(`   Active analyses: ${analysesAfter}`);
  console.log(`   Repos older than 30 min: ${oldReposAfter}`);
  
  console.log('\n📈 Summary:');
  console.log(`   Peak disk usage: ${maxUsage}GB`);
  console.log(`   Disk change: ${after.usedGB - before.usedGB}GB`);
  console.log(`   Old repos cleaned: ${oldReposBefore - oldReposAfter}`);
  
  if (cleanupDetected) {
    console.log('\n✅ SUCCESS: Cleanup is working!');
    console.log('   The cleanup logic successfully removed old repositories.');
  } else if (after.percentUsed < 50) {
    console.log('\n✅ SUCCESS: Disk usage is healthy.');
    console.log('   No cleanup needed as disk usage is below 50%.');
  } else {
    console.log('\n⚠️  WARNING: No cleanup detected.');
    console.log('   This might indicate an issue with the cleanup logic.');
  }
  
  // Step 5: Check cleanup thresholds
  console.log('\n🔍 Checking cleanup thresholds:');
  console.log('   >90% usage: Clean repos older than 30 minutes');
  console.log('   >70% usage: Clean repos older than 2 hours');
  console.log('   >50% usage: Clean repos older than 6 hours');
  console.log('   Default: Clean repos older than 24 hours');
  console.log(`   Current usage: ${after.percentUsed}%`);
  
  if (after.percentUsed > 90) {
    console.log('   ⚠️  CRITICAL: Should clean repos > 30 min old');
  } else if (after.percentUsed > 70) {
    console.log('   ⚠️  HIGH: Should clean repos > 2 hours old');
  } else if (after.percentUsed > 50) {
    console.log('   ⚠️  MODERATE: Should clean repos > 6 hours old');
  } else {
    console.log('   ✅ LOW: Standard 24-hour cleanup applies');
  }
}

// Run the test
monitorCleanup().catch(console.error);