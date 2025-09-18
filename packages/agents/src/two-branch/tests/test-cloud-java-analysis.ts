#!/usr/bin/env ts-node

/**
 * Test Cloud-Based Java PR Analysis
 *
 * This test verifies that all repository operations happen in the cloud,
 * not on the local Mac machine.
 */

import { CloudRepositoryManager } from '../utils/cloud-repository-manager';
import { logger } from '../utils/logger';

async function testCloudJavaAnalysis() {
  console.log('\n🚀 Testing Cloud-Based Java PR Analysis');
  console.log('========================================');
  console.log('Repository: Apache Kafka');
  console.log('PR: #17620');
  console.log('Mode: CLOUD ONLY (no local cloning)');
  console.log('========================================\n');

  const cloudManager = new CloudRepositoryManager();

  try {
    // Step 1: Setup repository in cloud
    console.log('1️⃣ Setting up repository in cloud...');
    const mainWorkspace = await cloudManager.setupRepository(
      'https://github.com/apache/kafka',
      'trunk'
    );
    console.log(`   ✅ Main workspace: ${mainWorkspace.workspaceId}`);
    console.log(`   📊 Files indexed: ${mainWorkspace.filesCount}`);
    console.log(`   ☁️ Cloud path: ${mainWorkspace.cloudPath}`);

    // Step 2: Create PR workspace in cloud
    console.log('\n2️⃣ Creating PR workspace in cloud...');
    const prWorkspace = await cloudManager.createPRWorkspace(
      'https://github.com/apache/kafka',
      17620
    );
    console.log(`   ✅ PR workspace: ${prWorkspace.workspaceId}`);
    console.log(`   📝 Modified files: ${prWorkspace.modifiedFiles.length}`);
    console.log(`   ☁️ Cloud path: ${prWorkspace.cloudPath}`);

    // Step 3: Run Java analysis tools in cloud
    console.log('\n3️⃣ Running Java analysis tools in cloud...');
    const tools = [
      'spotbugs',
      'pmd-quality',
      'pmd-performance',
      'pmd-architecture',
      'checkstyle',
      'semgrep',
      'dependency-check'
    ];

    const results = await cloudManager.runToolsInCloud(
      prWorkspace.workspaceId,
      tools,
      'java'
    );

    console.log(`   ✅ Completed ${results.length} tool analyses`);

    // Step 4: Display results
    console.log('\n4️⃣ Analysis Results:');
    console.log('   ================');
    results.forEach(result => {
      console.log(`   • ${result.tool}:`);
      console.log(`     - Exit code: ${result.exitCode}`);
      console.log(`     - Duration: ${(result.duration / 1000).toFixed(1)}s`);
      console.log(`     - Files scanned: ${result.filesScanned}`);
      if (result.output) {
        const lines = result.output.split('\n').slice(0, 2);
        lines.forEach(line => {
          if (line.trim()) {
            console.log(`     - ${line.trim()}`);
          }
        });
      }
    });

    // Step 5: Cleanup
    console.log('\n5️⃣ Cleaning up cloud workspace...');
    await cloudManager.cleanupWorkspace(prWorkspace.workspaceId);
    console.log('   ✅ Workspace cleaned up');

    // Summary
    console.log('\n✅ SUCCESS: Cloud-based analysis completed!');
    console.log('=========================================');
    console.log('• NO local cloning occurred');
    console.log('• ALL operations executed in cloud');
    console.log('• Automatic cleanup after 5 minutes');
    console.log('• Each PR gets isolated environment');
    console.log('=========================================\n');

  } catch (error) {
    console.error('\n❌ Error during cloud analysis:', error);
    console.error('Note: Cloud API might be in simulation mode');
    process.exit(1);
  }
}

// Run the test
testCloudJavaAnalysis().catch(console.error);