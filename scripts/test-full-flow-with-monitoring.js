#!/usr/bin/env node

const fetch = require('node-fetch');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Configuration
const API_URL = 'http://localhost:3001';
const DASHBOARD_URL = 'http://localhost:3001/api/monitoring/repository/metrics';
const TEST_REPO = 'https://github.com/vercel/swr';
const TEST_PR = 3058; // A real PR from the repo

// Test user credentials
const TEST_USER = {
  email: 'monitor-test@example.com',
  password: 'testpassword123',
  name: 'Monitor Test User'
};

// Monitoring interval
let monitoringInterval;
const diskUsageHistory = [];

async function getJWTToken() {
  console.log('🔑 Getting JWT token...');
  
  // Try login first
  let response = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: TEST_USER.email,
      password: TEST_USER.password
    })
  });
  
  if (!response.ok) {
    // Create user if not exists
    console.log('Creating test user...');
    const signupResponse = await fetch(`${API_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(TEST_USER)
    });
    
    if (!signupResponse.ok) {
      throw new Error('Failed to create test user');
    }
    
    // Login again
    response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TEST_USER.email,
        password: TEST_USER.password
      })
    });
  }
  
  const data = await response.json();
  return data.token;
}

async function getDiskMetrics() {
  try {
    // Get metrics directly via kubectl
    const { stdout } = await execAsync(
      'kubectl exec -n codequal-dev deployment/deepwiki -- df -BG /root/.adalflow | tail -1'
    );
    const parts = stdout.trim().split(/\s+/);
    
    // Also get repository count
    const { stdout: repoCount } = await execAsync(
      'kubectl exec -n codequal-dev deployment/deepwiki -- find /root/.adalflow/repos -maxdepth 1 -type d 2>/dev/null | wc -l'
    );
    
    return {
      totalGB: parseInt(parts[1].replace('G', '')),
      usedGB: parseInt(parts[2].replace('G', '')),
      availableGB: parseInt(parts[3].replace('G', '')),
      percentUsed: parseInt(parts[4].replace('%', '')),
      repositoryCount: parseInt(repoCount.trim()) - 1,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Failed to get disk metrics:', error.message);
    return null;
  }
}

async function startMonitoring() {
  console.log('\n📊 Starting disk usage monitoring...');
  console.log('Time'.padEnd(12) + 'Used'.padEnd(8) + 'Percent'.padEnd(10) + 'Repos'.padEnd(8) + 'Stage');
  console.log('-'.repeat(50));
  
  // Monitor every 5 seconds
  monitoringInterval = setInterval(async () => {
    const metrics = await getDiskMetrics();
    if (metrics) {
      const time = new Date().toLocaleTimeString();
      const stage = getAnalysisStage(diskUsageHistory.length);
      
      console.log(
        time.padEnd(12) +
        `${metrics.usedGB}GB`.padEnd(8) +
        `${metrics.percentUsed}%`.padEnd(10) +
        metrics.repositoryCount.toString().padEnd(8) +
        stage
      );
      
      diskUsageHistory.push({ ...metrics, stage });
    }
  }, 5000);
  
  // Get initial reading
  const initial = await getDiskMetrics();
  if (initial) {
    diskUsageHistory.push({ ...initial, stage: 'Initial' });
    console.log(
      new Date().toLocaleTimeString().padEnd(12) +
      `${initial.usedGB}GB`.padEnd(8) +
      `${initial.percentUsed}%`.padEnd(10) +
      initial.repositoryCount.toString().padEnd(8) +
      'Initial'
    );
  }
}

function getAnalysisStage(count) {
  if (count < 10) return 'Starting...';
  if (count < 20) return 'DeepWiki Analysis';
  if (count < 40) return 'MCP Tools';
  if (count < 60) return 'Agent Analysis';
  if (count < 70) return 'Report Generation';
  return 'Cleanup';
}

async function triggerPRAnalysis(token) {
  console.log(`\n🚀 Triggering PR analysis for ${TEST_REPO} PR #${TEST_PR}...`);
  
  const response = await fetch(`${API_URL}/api/pr/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      repositoryUrl: TEST_REPO,
      prNumber: TEST_PR,
      analysisMode: 'comprehensive',
      enableExperimentalFeatures: false
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`PR analysis failed: ${error}`);
  }
  
  const result = await response.json();
  console.log('✅ Analysis triggered successfully');
  console.log(`   Analysis ID: ${result.analysisId}`);
  console.log(`   Status: ${result.status}`);
  
  return result;
}

function analyzeMetrics() {
  console.log('\n📈 Disk Usage Analysis:');
  console.log('='.repeat(50));
  
  // Find key stages
  const initial = diskUsageHistory[0];
  const maxUsage = diskUsageHistory.reduce((max, m) => m.usedGB > max.usedGB ? m : max);
  const final = diskUsageHistory[diskUsageHistory.length - 1];
  
  console.log(`\nInitial state:`);
  console.log(`  Disk usage: ${initial.usedGB}GB (${initial.percentUsed}%)`);
  console.log(`  Repositories: ${initial.repositoryCount}`);
  
  console.log(`\nPeak usage:`);
  console.log(`  Disk usage: ${maxUsage.usedGB}GB (${maxUsage.percentUsed}%)`);
  console.log(`  Repositories: ${maxUsage.repositoryCount}`);
  console.log(`  During stage: ${maxUsage.stage}`);
  
  console.log(`\nFinal state:`);
  console.log(`  Disk usage: ${final.usedGB}GB (${final.percentUsed}%)`);
  console.log(`  Repositories: ${final.repositoryCount}`);
  
  console.log(`\nAnalysis:`);
  const diskIncrease = maxUsage.usedGB - initial.usedGB;
  const repoIncrease = maxUsage.repositoryCount - initial.repositoryCount;
  const cleanupSuccess = final.usedGB <= initial.usedGB && final.repositoryCount <= initial.repositoryCount;
  
  console.log(`  Repository cloned: ${repoIncrease > 0 ? 'Yes' : 'No'}`);
  console.log(`  Disk usage increased by: ${diskIncrease}GB`);
  console.log(`  Cleanup successful: ${cleanupSuccess ? 'Yes' : 'No'}`);
  
  if (cleanupSuccess) {
    console.log('\n✅ SUCCESS: Full flow completed with proper cleanup!');
  } else {
    console.log('\n⚠️  WARNING: Cleanup may not have completed properly');
  }
  
  // Show monitoring dashboard URL
  console.log('\n📊 Dashboard Access:');
  console.log(`  URL: ${DASHBOARD_URL}`);
  console.log('  You can view real-time metrics in your browser');
}

async function runTest() {
  console.log('🔍 Full Flow Test with Disk Monitoring');
  console.log('=====================================\n');
  
  try {
    // Get JWT token
    const token = await getJWTToken();
    console.log('✅ Authentication successful\n');
    
    // Start monitoring
    await startMonitoring();
    
    // Wait a moment for initial readings
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Trigger PR analysis
    const analysisResult = await triggerPRAnalysis(token);
    
    // Monitor for 5 minutes (adjust as needed)
    console.log('\n⏳ Monitoring analysis progress (5 minutes)...\n');
    await new Promise(resolve => setTimeout(resolve, 300000)); // 5 minutes
    
    // Stop monitoring
    clearInterval(monitoringInterval);
    
    // Final metrics
    const finalMetrics = await getDiskMetrics();
    if (finalMetrics) {
      diskUsageHistory.push({ ...finalMetrics, stage: 'Complete' });
    }
    
    // Analyze results
    analyzeMetrics();
    
    // Check if we can access the dashboard
    console.log('\n🌐 Testing dashboard access...');
    try {
      const dashboardResponse = await fetch(DASHBOARD_URL, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (dashboardResponse.ok) {
        const metrics = await dashboardResponse.json();
        console.log('✅ Dashboard API is accessible');
        console.log(`   Current disk usage: ${metrics.disk.percentUsed}%`);
      } else {
        console.log('⚠️  Dashboard API returned:', dashboardResponse.status);
      }
    } catch (error) {
      console.log('⚠️  Could not access dashboard API:', error.message);
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    clearInterval(monitoringInterval);
  }
}

// Handle cleanup on exit
process.on('SIGINT', () => {
  console.log('\n\nStopping monitoring...');
  clearInterval(monitoringInterval);
  process.exit();
});

// Run the test
runTest();