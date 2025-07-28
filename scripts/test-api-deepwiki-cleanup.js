#!/usr/bin/env node

const fetch = require('node-fetch');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// First, get JWT token
async function getJWTToken() {
  console.log('🔑 Getting JWT token...');
  
  const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: 'test@example.com',
      password: 'testpassword123'
    })
  });
  
  if (!loginResponse.ok) {
    // Try to sign up first
    console.log('User not found, creating test user...');
    const signupResponse = await fetch('http://localhost:3001/api/auth/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'testpassword123',
        name: 'Test User'
      })
    });
    
    if (!signupResponse.ok) {
      throw new Error('Failed to create test user');
    }
    
    // Now login
    const retryLoginResponse = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'testpassword123'
      })
    });
    
    const data = await retryLoginResponse.json();
    return data.token;
  }
  
  const data = await loginResponse.json();
  return data.token;
}

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
  const { stdout } = await execAsync('kubectl exec -n codequal-dev deployment/deepwiki -- find /root/.adalflow/repos -maxdepth 1 -type d 2>/dev/null | wc -l');
  return parseInt(stdout.trim()) - 1;
}

async function getOldRepos(ageMinutes = 1440) {
  const { stdout } = await execAsync(
    `kubectl exec -n codequal-dev deployment/deepwiki -- find /root/.adalflow/repos -maxdepth 1 -type d -mmin +${ageMinutes} -not -path /root/.adalflow/repos 2>/dev/null | wc -l`
  );
  return parseInt(stdout.trim());
}

async function runTest() {
  console.log('🔍 DeepWiki API Cleanup Test');
  console.log('============================\n');
  
  try {
    // Get JWT token
    const token = await getJWTToken();
    console.log('✅ Got JWT token\n');
    
    // Get initial state
    console.log('📊 Initial state:');
    const before = await getDiskUsage();
    const analysesBefore = await getActiveAnalyses();
    const oldReposBefore = await getOldRepos(30);
    
    console.log(`   Disk: ${before.usedGB}GB/${before.totalGB}GB (${before.percentUsed}%)`);
    console.log(`   Active analyses: ${analysesBefore}`);
    console.log(`   Repos older than 30 min: ${oldReposBefore}`);
    
    // Trigger DeepWiki analysis
    console.log('\n🚀 Triggering DeepWiki analysis via API...');
    
    const response = await fetch('http://localhost:3001/api/scans/repository', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        repositoryUrl: 'https://github.com/vercel/swr',
        config: {
          analysisTools: ['deepwiki'],
          enableDeepAnalysis: true
        }
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API request failed: ${error}`);
    }
    
    const result = await response.json();
    console.log('✅ Analysis triggered:', result.scanId);
    
    // Monitor for 3 minutes
    console.log('\n⏳ Monitoring disk usage and cleanup (3 minutes)...');
    
    let cleanupDetected = false;
    let maxUsage = before.usedGB;
    
    for (let i = 0; i < 18; i++) { // Check every 10 seconds for 3 minutes
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
      if (oldRepos < oldReposBefore) {
        cleanupDetected = true;
        console.log('   🧹 Cleanup activity detected! Old repos reduced.');
      }
      
      // Also check if disk usage decreased significantly
      if (current.usedGB < before.usedGB - 0.5) { // 0.5GB decrease
        cleanupDetected = true;
        console.log('   🧹 Cleanup activity detected! Disk usage decreased.');
      }
    }
    
    // Final state
    console.log('\n📊 Final state:');
    const after = await getDiskUsage();
    const analysesAfter = await getActiveAnalyses();
    const oldReposAfter = await getOldRepos(30);
    
    console.log(`   Disk: ${after.usedGB}GB/${after.totalGB}GB (${after.percentUsed}%)`);
    console.log(`   Active analyses: ${analysesAfter}`);
    console.log(`   Repos older than 30 min: ${oldReposAfter}`);
    
    // Analysis
    console.log('\n📈 Summary:');
    console.log(`   Peak disk usage: ${maxUsage}GB`);
    console.log(`   Disk change: ${after.usedGB - before.usedGB}GB`);
    console.log(`   Analysis count change: ${analysesAfter - analysesBefore}`);
    console.log(`   Old repos cleaned: ${oldReposBefore - oldReposAfter}`);
    
    if (cleanupDetected) {
      console.log('\n✅ SUCCESS: Cleanup is working!');
      console.log('   The cleanup logic successfully removed old repositories after analysis.');
    } else if (after.percentUsed < 50 && oldReposAfter === 0) {
      console.log('\n✅ SUCCESS: System is healthy.');
      console.log('   No old repositories to clean and disk usage is low.');
    } else {
      console.log('\n⚠️  WARNING: No cleanup detected.');
      console.log('   The cleanup may not have been triggered. Check the implementation.');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
runTest();