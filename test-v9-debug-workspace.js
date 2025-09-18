#!/usr/bin/env node

/**
 * Debug test for V9 Kubernetes workspace
 * Verifies that repository clone and file listing work correctly
 */

require('dotenv').config();

async function debugWorkspace() {
  console.log('🔍 V9 WORKSPACE DEBUG TEST');
  console.log('=' .repeat(70));

  try {
    const { KubernetesRepositoryManager } = require('./packages/agents/dist/two-branch/utils/kubernetes-repository-manager');
    const k8sManager = new KubernetesRepositoryManager();

    // Simple test repo (smaller than Kafka)
    const TEST_REPO = {
      repository: 'https://github.com/apache/commons-lang',
      branch: 'master',
      language: 'java'
    };

    console.log('1️⃣ Setting up test repository...');
    console.log(`   Repo: ${TEST_REPO.repository}`);

    const workspace = await k8sManager.setupRepository(
      TEST_REPO.repository,
      TEST_REPO.branch,
      TEST_REPO.language
    );

    console.log(`   ✅ Workspace created: ${workspace.workspaceId}`);
    console.log(`   📁 PVC: ${workspace.pvcName}`);
    console.log(`   📊 Files count from setup: ${workspace.filesCount}`);

    // Now try to list files
    console.log('\n2️⃣ Getting workspace files...');
    const files = await k8sManager.getWorkspaceFiles(
      workspace.workspaceId,
      workspace.pvcName,
      '*.java'
    );

    console.log(`   📁 Found ${files.length} Java files`);

    if (files.length > 0) {
      console.log('\n   First 5 files:');
      files.slice(0, 5).forEach((file, i) => {
        console.log(`   ${i + 1}. ${file}`);
      });
    } else {
      console.log('   ⚠️ No files found - debugging needed');

      // Try to run a debug command directly
      const { exec } = require('child_process');
      const util = require('util');
      const execAsync = util.promisify(exec);

      console.log('\n3️⃣ Running debug commands...');

      // Check what's in the workspace
      const debugJob = `
apiVersion: batch/v1
kind: Job
metadata:
  name: debug-workspace-${Date.now()}
  namespace: codequal-dev
spec:
  ttlSecondsAfterFinished: 60
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: debug
        image: alpine:latest
        command: ["sh", "-c", "ls -la /workspace/ && echo '---REPO---' && ls -la /workspace/repo/ 2>/dev/null || echo 'No repo dir' && echo '---FIND---' && find /workspace -type d -maxdepth 3"]
        volumeMounts:
        - name: workspace
          mountPath: /workspace
      volumes:
      - name: workspace
        persistentVolumeClaim:
          claimName: ${workspace.pvcName}
`;

      const jobName = `debug-workspace-${Date.now()}`;
      await execAsync(`echo '${debugJob}' | kubectl apply -f -`);

      // Wait for job to complete
      await new Promise(resolve => setTimeout(resolve, 5000));

      const { stdout } = await execAsync(`kubectl logs job/${jobName} -n codequal-dev`);
      console.log('   Debug output:');
      console.log(stdout);
    }

    console.log('\n' + '=' .repeat(70));
    console.log('📊 DEBUG SUMMARY');
    console.log('=' .repeat(70));
    console.log(`✅ Workspace created: ${workspace.workspaceId}`);
    console.log(`📁 Files found: ${files.length}`);
    console.log(`${files.length > 0 ? '✅' : '❌'} File listing ${files.length > 0 ? 'working' : 'needs fix'}`);

  } catch (error) {
    console.error('❌ Debug test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the debug test
debugWorkspace().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});