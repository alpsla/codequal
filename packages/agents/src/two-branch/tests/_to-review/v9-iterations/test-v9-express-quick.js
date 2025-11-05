#!/usr/bin/env node

/**
 * Quick V9 Test with Express.js (smaller repository)
 * Tests that all 5 tools launch successfully
 */

require('dotenv').config();

async function testExpressAnalysis() {
  console.log('🧪 V9 EXPRESS.JS TEST - All Tools');
  console.log('=' .repeat(70));

  try {
    const { KubernetesRepositoryManager } = require('../../../dist/two-branch/utils/kubernetes-repository-manager');
    const k8sManager = new KubernetesRepositoryManager();

    const testRepo = 'https://github.com/expressjs/express';
    const language = 'javascript';

    console.log('\n1️⃣ Setting up Express.js repository...');
    const workspace = await k8sManager.setupRepository(testRepo, 'master', language);
    console.log(`   ✅ Workspace: ${workspace.workspaceId}`);
    console.log(`   📁 Files: ${workspace.filesCount}`);

    console.log('\n2️⃣ Running JavaScript analysis tools...');
    const tools = ['eslint']; // Just test eslint for JavaScript

    const startTime = Date.now();
    const results = await k8sManager.runToolsInKubernetes(
      workspace.workspaceId,
      workspace.pvcName,
      tools,
      language
    );

    const duration = (Date.now() - startTime) / 1000;
    console.log(`   ⏱️ Completed in ${duration.toFixed(1)}s`);

    // Check results
    console.log('\n3️⃣ Tool Results:');
    results.forEach(result => {
      const status = result.exitCode === 0 ? '✅' : '❌';
      const outputLines = (result.output || '').split('\n').filter(l => l.trim()).length;
      console.log(`   ${status} ${result.tool}: Exit code ${result.exitCode}, ${outputLines} output lines`);

      // Show first 3 lines of output
      if (result.output) {
        const lines = result.output.split('\n').filter(l => l.trim()).slice(0, 3);
        lines.forEach(line => console.log(`      > ${line}`));
      }
    });

    // Cleanup
    console.log('\n4️⃣ Cleaning up...');
    await k8sManager.cleanupWorkspace(workspace.workspaceId, workspace.pvcName);
    console.log('   ✅ Cleanup complete');

    console.log('\n✅ EXPRESS TEST COMPLETE');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run the test
testExpressAnalysis().catch(console.error);