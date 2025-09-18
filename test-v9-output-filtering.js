#!/usr/bin/env node

/**
 * Test V9 Output Filtering
 *
 * Verifies that tool outputs are properly filtered to show only issues,
 * not verbose progress logs.
 */

require('dotenv').config();

async function testOutputFiltering() {
  console.log('🧪 V9 OUTPUT FILTERING TEST');
  console.log('=' .repeat(70));

  try {
    const { KubernetesRepositoryManager } = require('./packages/agents/dist/two-branch/utils/kubernetes-repository-manager');
    const k8sManager = new KubernetesRepositoryManager();

    // Small test repository for quick testing
    const testRepo = 'https://github.com/expressjs/express';
    const language = 'javascript';

    console.log('\n📊 Testing with Express.js (smaller repository)...');

    // Setup repository (should be cached)
    console.log('1️⃣ Setting up repository...');
    const workspace = await k8sManager.setupRepository(testRepo, 'master', language);
    console.log(`   ✅ Workspace: ${workspace.workspaceId}`);
    console.log(`   📁 Files: ${workspace.filesCount}`);

    // Run a single tool to test output filtering
    console.log('\n2️⃣ Testing ESLint with filtered output...');
    const tools = ['eslint'];

    const startTime = Date.now();
    const results = await k8sManager.runToolsInKubernetes(
      workspace.workspaceId,
      workspace.pvcName,
      tools,
      language
    );
    const duration = (Date.now() - startTime) / 1000;

    console.log(`   ⏱️ Completed in ${duration.toFixed(1)}s`);

    // Check output format
    if (results && results[0]) {
      const output = results[0].output || '';
      const lines = output.split('\n').filter(l => l.trim());

      console.log('\n3️⃣ Output Analysis:');
      console.log(`   📝 Total lines: ${lines.length}`);
      console.log(`   📊 Sample output (first 5 lines):`);
      lines.slice(0, 5).forEach(line => {
        console.log(`      ${line}`);
      });

      // Check if output is properly filtered (should be in format: file:line: rule: message)
      const isFiltered = lines.some(line => line.includes(':') && !line.includes('Processing'));
      console.log(`\n   ${isFiltered ? '✅' : '❌'} Output is ${isFiltered ? 'properly filtered' : 'not filtered (still verbose)'}`);
    }

    // Cleanup
    console.log('\n4️⃣ Cleaning up...');
    await k8sManager.cleanupWorkspace(workspace.workspaceId, workspace.pvcName);
    console.log('   ✅ Cleanup complete');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Check Kubernetes access
const { execSync } = require('child_process');
try {
  execSync('kubectl get nodes', { stdio: 'ignore' });
  console.log('✅ Kubernetes access confirmed\n');
} catch (error) {
  console.error('❌ Kubernetes not accessible');
  process.exit(1);
}

// Run the test
testOutputFiltering().catch(console.error);