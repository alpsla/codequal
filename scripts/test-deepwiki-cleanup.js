const { exec } = require('child_process');
const { promisify } = require('util');
const fetch = require('node-fetch');
const execAsync = promisify(exec);

// Test repository URL (small repo for testing)
const TEST_REPO = 'https://github.com/vercel/swr';

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
  const { stdout } = await execAsync('kubectl exec -n codequal-dev deployment/deepwiki -- find /root/.adalflow -maxdepth 1 -type d | wc -l');
  return parseInt(stdout.trim()) - 1;
}

async function triggerDeepWikiAnalysis() {
  console.log(`\n🚀 Triggering DeepWiki analysis for ${TEST_REPO}...`);
  
  try {
    // Call the API to trigger analysis
    const response = await fetch('http://localhost:3001/api/scans/repository', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add auth header if needed
      },
      body: JSON.stringify({
        repositoryUrl: TEST_REPO,
        config: {
          analysisTools: ['deepwiki'],
          enableDeepAnalysis: true
        }
      })
    });
    
    const result = await response.json();
    console.log('API Response:', result);
    return result;
  } catch (error) {
    console.error('Failed to trigger analysis:', error.message);
    return null;
  }
}

async function monitorDiskUsageChange() {
  console.log('🔍 DeepWiki Cleanup Test');
  console.log('========================\n');
  
  // Step 1: Get initial disk usage
  console.log('📊 Initial disk usage:');
  const before = await getDiskUsage();
  const analysesBefore = await getActiveAnalyses();
  console.log(`   Total: ${before.totalGB}GB`);
  console.log(`   Used: ${before.usedGB}GB (${before.percentUsed}%)`);
  console.log(`   Available: ${before.availableGB}GB`);
  console.log(`   Active analyses: ${analysesBefore}`);
  
  // Step 2: Trigger DeepWiki analysis
  const analysisResult = await triggerDeepWikiAnalysis();
  
  if (!analysisResult) {
    console.log('\n❌ Failed to trigger analysis. Check if API is running.');
    return;
  }
  
  // Step 3: Wait for analysis to complete (monitor for 2 minutes)
  console.log('\n⏳ Monitoring disk usage during analysis...');
  
  let maxUsage = before.usedGB;
  let duringAnalysis = before;
  
  for (let i = 0; i < 12; i++) { // Check every 10 seconds for 2 minutes
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    const current = await getDiskUsage();
    const currentAnalyses = await getActiveAnalyses();
    
    if (current.usedGB > maxUsage) {
      maxUsage = current.usedGB;
      duringAnalysis = current;
    }
    
    console.log(`   [${new Date().toLocaleTimeString()}] Used: ${current.usedGB}GB (${current.percentUsed}%) | Active: ${currentAnalyses}`);
  }
  
  // Step 4: Check final disk usage after analysis
  console.log('\n📊 Final disk usage (after 2 minutes):');
  const after = await getDiskUsage();
  const analysesAfter = await getActiveAnalyses();
  console.log(`   Total: ${after.totalGB}GB`);
  console.log(`   Used: ${after.usedGB}GB (${after.percentUsed}%)`);
  console.log(`   Available: ${after.availableGB}GB`);
  console.log(`   Active analyses: ${analysesAfter}`);
  
  // Step 5: Analyze results
  console.log('\n📈 Analysis Summary:');
  console.log(`   Peak usage during analysis: ${maxUsage}GB (${duringAnalysis.percentUsed}%)`);
  console.log(`   Disk growth: ${after.usedGB - before.usedGB}GB`);
  console.log(`   Analyses change: ${analysesAfter - analysesBefore}`);
  
  if (after.usedGB > before.usedGB) {
    console.log('\n⚠️  WARNING: Disk usage increased after analysis!');
    console.log('   This suggests cleanup may not be working properly.');
  } else if (after.usedGB === before.usedGB) {
    console.log('\n✅ SUCCESS: Disk usage remained stable.');
    console.log('   Cleanup appears to be working correctly.');
  } else {
    console.log('\n✅ SUCCESS: Disk usage decreased.');
    console.log('   Old analyses were cleaned up.');
  }
}

// Run the test
monitorDiskUsageChange().catch(console.error);