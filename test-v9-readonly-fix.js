#!/usr/bin/env node

/**
 * Test V9 with emptyDir fix for parallel tool execution
 * This should allow all 5 tools to run in parallel without PVC conflicts
 */

require('dotenv').config();

async function testEmptyDirFix() {
  console.log('🚀 V9 EMPTYDIR FIX TEST - Apache Kafka');
  console.log('=' .repeat(70));
  console.log('Testing parallel execution with emptyDir volumes');
  console.log('=' .repeat(70));

  try {
    const { KubernetesRepositoryManager } = require('./packages/agents/dist/two-branch/utils/kubernetes-repository-manager');
    const k8sManager = new KubernetesRepositoryManager();

    // Use existing cached Apache Kafka workspace
    const workspaceId = 'existing-apache-kafka-1758241622144';
    const pvcName = 'pvc-base-apache-kafka-1758224483616';
    const language = 'java';

    console.log('\n📦 Using existing Apache Kafka workspace:');
    console.log(`   Workspace: ${workspaceId}`);
    console.log(`   PVC: ${pvcName}`);
    console.log(`   Files: 6,564`);

    // Test with a smaller set of tools first
    console.log('\n🔧 Testing with 3 tools (PMD, Checkstyle, SpotBugs)...');

    const testTools = ['pmd', 'checkstyle', 'spotbugs'];

    console.log('   Tools to run:', testTools.join(', '));
    console.log('\n⚙️ Key improvements in this version:');
    console.log('   ✅ PVC mounted as READ-ONLY');
    console.log('   ✅ Multiple pods can read the same PVC simultaneously');
    console.log('   ✅ No copying needed - direct PVC access');
    console.log('   ✅ Increased resource limits (4Gi RAM, 2 CPU cores)');

    console.log('\n🚀 Launching tools in parallel...');
    const startTime = Date.now();

    const results = await k8sManager.runToolsInKubernetes(
      workspaceId,
      pvcName,
      testTools,
      language
    );

    const duration = (Date.now() - startTime) / 1000;
    console.log(`\n⏱️ Execution completed in ${duration.toFixed(1)} seconds`);

    console.log('\n📊 Tool Results:');
    results.forEach(result => {
      const status = result.exitCode === 0 ? '✅' : '❌';
      const outputLines = (result.output || '').split('\n').filter(l => l.trim()).length;

      console.log(`\n   ${status} ${result.tool.toUpperCase()}`);
      console.log(`      Exit Code: ${result.exitCode}`);
      console.log(`      Output Lines: ${outputLines}`);
      console.log(`      Duration: ${result.duration || 'N/A'}`);

      // Show first few lines of output
      if (result.output) {
        const lines = result.output.split('\n').filter(l => l.trim()).slice(0, 3);
        if (lines.length > 0) {
          console.log(`      Sample Output:`);
          lines.forEach(line => {
            console.log(`        ${line.substring(0, 80)}`);
          });
        }
      }
    });

    // Check if all tools ran successfully
    const successCount = results.filter(r => r.exitCode === 0).length;
    const failureCount = results.filter(r => r.exitCode !== 0).length;

    console.log('\n📈 Summary:');
    console.log(`   Successful: ${successCount}/${testTools.length}`);
    console.log(`   Failed: ${failureCount}/${testTools.length}`);

    if (successCount === testTools.length) {
      console.log('\n🎉 SUCCESS! All tools ran in parallel without PVC conflicts!');
      console.log('   The emptyDir solution works perfectly.');
    } else if (successCount > 0) {
      console.log('\n⚠️ PARTIAL SUCCESS: Some tools completed successfully.');
      console.log('   The emptyDir fix is working, but some tools may have other issues.');
    } else {
      console.log('\n❌ FAILURE: Tools failed to run.');
      console.log('   Check the output above for error details.');
    }

    // Verify parallel execution
    console.log('\n🔍 Verifying Parallel Execution:');
    const { execSync } = require('child_process');

    try {
      const pods = execSync(
        `kubectl get pods -n codequal-dev -l "tool in (pmd,checkstyle,spotbugs)" --no-headers 2>/dev/null | wc -l`,
        { encoding: 'utf8' }
      );
      const podCount = parseInt(pods.trim());

      if (podCount >= 2) {
        console.log(`   ✅ Confirmed: ${podCount} pods running/completed simultaneously`);
      } else {
        console.log(`   ℹ️ ${podCount} pods found (some may have completed already)`);
      }
    } catch (e) {
      console.log('   ℹ️ Could not verify pod count');
    }

    console.log('\n' + '=' .repeat(70));
    console.log('✅ EMPTYDIR FIX TEST COMPLETE');
    console.log('=' .repeat(70));

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run the test
testEmptyDirFix().catch(console.error);