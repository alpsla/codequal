#!/usr/bin/env node

/**
 * V9 REAL EXECUTION TEST - No simulations, only real errors
 * Tests the actual V9 system with proper container images
 */

require('dotenv').config();

async function runRealV9Test() {
  console.log('🔴 V9 REAL EXECUTION TEST - NO SIMULATIONS');
  console.log('=' .repeat(70));
  console.log('This test will show REAL errors, not simulated success\n');

  const errors = [];

  try {
    // Test 1: Load V9 Tool Orchestrator with real config
    console.log('1️⃣ Testing V9ToolOrchestrator with real Kubernetes execution...');
    const { V9ToolOrchestrator } = require('./packages/agents/dist/two-branch/analyzers/v9-tool-orchestrator');
    const orchestrator = new V9ToolOrchestrator();
    console.log('   ✅ V9ToolOrchestrator loaded');

    // Test 2: Try to execute real tools with proper images
    console.log('\n2️⃣ Testing real tool execution for Java...');
    const javaTools = [
      {
        name: 'spotbugs',
        image: 'registry.digitalocean.com/codequal/analyzer:lang-java-v5.1',
        command: 'spotbugs',
        args: ['-textui', '-effort:max']
      },
      {
        name: 'pmd',
        image: 'registry.digitalocean.com/codequal/analyzer:lang-java-v5.1',
        command: 'pmd',
        args: ['check', '-R', 'rulesets/java/quickstart.xml']
      }
    ];

    // This should fail if Kubernetes is not properly configured
    try {
      const files = ['Example.java'];
      const repoPath = '/tmp/test-repo';
      const results = await orchestrator.orchestrateAnalysis(
        files,
        repoPath,
        'java',
        javaTools,
        'test-workspace',
        'codequal-workspace'
      );
      console.log(`   ✅ Tool execution returned: ${results.length} issues`);
    } catch (error) {
      console.log(`   ❌ REAL ERROR: ${error.message}`);
      errors.push({ component: 'V9ToolOrchestrator', error: error.message });
    }

  } catch (error) {
    console.log(`   ❌ Component loading error: ${error.message}`);
    errors.push({ component: 'Module Loading', error: error.message });
  }

  // Test 3: Test the 5 specialized agents
  console.log('\n3️⃣ Testing 5 Specialized Agents (as per V9 architecture)...');
  const agents = [
    'SecurityAgent',
    'CodeQualityAgent',  // Fixed: was QualityAgent
    'PerformanceAgent',
    'ArchitectureAgent',
    'DependencyAgent'
  ];

  for (const agentName of agents) {
    try {
      // Try to load from the correct location
      const modulePath = './packages/agents/dist/two-branch/agents/specialized-agents';
      const module = require(modulePath);

      if (module[agentName]) {
        const agent = new module[agentName]();
        console.log(`   ✅ ${agentName} loaded`);
      } else {
        console.log(`   ❌ ${agentName} not found in module`);
        errors.push({ component: agentName, error: 'Not found in specialized-agents module' });
      }
    } catch (error) {
      console.log(`   ❌ ${agentName} error: ${error.message}`);
      errors.push({ component: agentName, error: error.message });
    }
  }

  // Test 4: Test actual cloud service connection
  console.log('\n4️⃣ Testing Cloud Service Connection...');
  try {
    const { CloudAnalysisClient } = require('./packages/agents/dist/two-branch/services/CloudAnalysisClient');
    const cloudClient = new CloudAnalysisClient();
    const health = await cloudClient.healthCheck();
    console.log(`   ✅ Cloud service healthy: ${health}`);
  } catch (error) {
    console.log(`   ❌ Cloud service error: ${error.message}`);
    errors.push({ component: 'CloudAnalysisClient', error: error.message });
  }

  // Test 5: Test Repository Manager with real GitHub
  console.log('\n5️⃣ Testing V9RepositoryManager with real GitHub repo...');
  try {
    const { V9RepositoryManager } = require('./packages/agents/dist/two-branch/analyzers/v9-repository-manager');
    const repoManager = new V9RepositoryManager({
      useSmartSelection: true,
      maxFiles: 500,
      forceFullAnalysis: false
    });

    // Try to clone a real small repo
    const { mainPath, prPath } = await repoManager.prepareRepositories(
      'https://github.com/octocat/Hello-World',
      1
    );
    console.log(`   ✅ Repository cloned: ${prPath}`);
  } catch (error) {
    console.log(`   ❌ Repository manager error: ${error.message}`);
    errors.push({ component: 'V9RepositoryManager', error: error.message });
  }

  // Test 6: Check Kubernetes PVC
  console.log('\n6️⃣ Checking Kubernetes PVC (codequal-workspace)...');
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);

  try {
    const { stdout } = await execAsync('kubectl get pvc codequal-workspace -n codequal-dev -o json');
    const pvc = JSON.parse(stdout);
    console.log(`   ✅ PVC exists: ${pvc.status.phase}`);
  } catch (error) {
    console.log(`   ❌ PVC error: ${error.message}`);
    errors.push({ component: 'Kubernetes PVC', error: error.message });
  }

  // Test 7: Check container registry access
  console.log('\n7️⃣ Testing Container Registry Access...');
  try {
    const { stdout } = await execAsync('docker pull registry.digitalocean.com/codequal/analyzer:lang-java-v5.1');
    console.log('   ✅ Can pull container images');
  } catch (error) {
    console.log(`   ❌ Registry access error: ${error.message}`);
    errors.push({ component: 'Container Registry', error: error.message });
  }

  // Summary
  console.log('\n' + '=' .repeat(70));
  console.log('📊 REAL TEST SUMMARY');
  console.log('=' .repeat(70));

  if (errors.length === 0) {
    console.log('✅ All components working!');
  } else {
    console.log(`❌ Found ${errors.length} REAL errors:\n`);
    errors.forEach((e, i) => {
      console.log(`${i + 1}. ${e.component}:`);
      console.log(`   ${e.error}\n`);
    });

    console.log('🔧 These are REAL issues that need to be fixed, not simulated problems.');
  }

  // Save error report
  const fs = require('fs');
  const errorReport = {
    timestamp: new Date().toISOString(),
    errors: errors,
    summary: {
      totalErrors: errors.length,
      components: errors.map(e => e.component)
    }
  };

  const reportFile = `v9-real-errors-${Date.now()}.json`;
  fs.writeFileSync(reportFile, JSON.stringify(errorReport, null, 2));
  console.log(`\n📁 Error report saved: ${reportFile}`);
}

// Run the test
runRealV9Test().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});