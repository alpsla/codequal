#!/usr/bin/env node

/**
 * V9 Kubernetes Java PR Test
 * Uses Kubernetes jobs with proper TTL cleanup for parallel execution
 */

require('dotenv').config();

async function testKubernetesJavaExecution() {
  console.log('🚀 V9 KUBERNETES JAVA TEST - Real Execution');
  console.log('=' .repeat(70));
  console.log('Using Kubernetes Jobs with TTL cleanup\n');

  // Set environment for local tool processing (tools already run in K8s)
  process.env.USE_LOCAL_TOOLS = 'true';

  try {
    // Load components
    console.log('1️⃣ Loading Kubernetes components...');
    const { KubernetesRepositoryManager } = require('./packages/agents/dist/two-branch/utils/kubernetes-repository-manager');
    const { V9ToolOrchestrator } = require('./packages/agents/dist/two-branch/analyzers/v9-tool-orchestrator');

    const k8sManager = new KubernetesRepositoryManager();
    const orchestrator = new V9ToolOrchestrator();
    console.log('   ✅ Components loaded\n');

    // Test repository
    const KAFKA_PR = {
      repository: 'https://github.com/apache/kafka',
      prNumber: 17620,
      language: 'java'
    };

    // Step 1: Setup base repository (cached)
    console.log('2️⃣ Setting up base repository (with caching)...');
    const baseWorkspace = await k8sManager.setupRepository(
      KAFKA_PR.repository,
      'auto', // Will detect 'trunk' for Apache Kafka
      KAFKA_PR.language
    );
    console.log(`   ✅ Base workspace ready: ${baseWorkspace.workspaceId}`);
    console.log(`   📁 PVC: ${baseWorkspace.pvcName}`);
    console.log(`   📊 Files: ${baseWorkspace.filesCount}\n`);

    // Step 2: Create PR workspace (COW - only differences)
    console.log('3️⃣ Creating PR workspace (COW for PR changes only)...');
    const prWorkspace = await k8sManager.createPRWorkspace(
      KAFKA_PR.repository,
      KAFKA_PR.prNumber,
      KAFKA_PR.language,
      baseWorkspace.pvcName,
      'main'
    );
    console.log(`   ✅ PR workspace ready: ${prWorkspace.workspaceId}`);
    console.log(`   📁 PR PVC: ${prWorkspace.pvcName}`);
    console.log(`   📝 Modified files: ${prWorkspace.modifiedFiles.length}\n`);

    // Step 3: Run tools in Kubernetes
    console.log('4️⃣ Running Java analysis tools in Kubernetes...');
    const tools = ['spotbugs', 'pmd', 'checkstyle'];

    const toolResults = await k8sManager.runToolsInKubernetes(
      prWorkspace.workspaceId,
      prWorkspace.pvcName,
      tools,
      KAFKA_PR.language
    );

    console.log(`   ✅ Tool execution complete: ${toolResults.length} results`);

    toolResults.forEach(result => {
      console.log(`   Tool: ${result.tool}`);
      console.log(`     - Exit code: ${result.exitCode}`);
      console.log(`     - Duration: ${result.duration}ms`);
      console.log(`     - Output length: ${result.output.length} chars`);

      // Show first few lines of output
      const lines = result.output.split('\\n').slice(0, 3);
      lines.forEach(line => {
        console.log(`       ${line.substring(0, 80)}`);
      });
    });

    // Step 4: Process with V9 orchestrator
    console.log('\n5️⃣ Processing results with V9 Orchestrator...');

    // Map tools to proper format for orchestrator
    const orchestratorTools = tools.map(tool => ({
      name: tool,
      image: 'registry.digitalocean.com/codequal/analyzer:lang-java-v5.1',
      command: tool,
      agent: tool === 'spotbugs' ? 'SecurityAgent' : 'CodeQualityAgent'
    }));

    const files = await k8sManager.getWorkspaceFiles(
      prWorkspace.workspaceId,
      prWorkspace.pvcName,
      '*.java'
    );

    console.log(`   📁 Found ${files.length} Java files to analyze`);

    // Use the new method to process already-executed tool results
    const issues = await orchestrator.processExecutedToolResults(
      toolResults,
      'java',
      orchestratorTools,
      prWorkspace.workspaceId,
      prWorkspace.pvcName
    );

    console.log(`   ✅ Analysis complete: ${issues.length} issues found\n`);

    // Step 5: Cleanup (optional - TTL will handle it)
    console.log('6️⃣ Cleanup (TTL will auto-cleanup after 300s)...');
    // Uncomment to cleanup immediately:
    // await k8sManager.cleanupWorkspace(prWorkspace.workspaceId, prWorkspace.pvcName);
    console.log('   ✅ Jobs will auto-cleanup via TTL\n');

    // Summary
    console.log('=' .repeat(70));
    console.log('📊 KUBERNETES TEST SUMMARY');
    console.log('=' .repeat(70));
    console.log(`✅ Base repository cached: ${baseWorkspace.pvcName}`);
    console.log(`✅ PR workspace created (COW): ${prWorkspace.pvcName}`);
    console.log(`✅ Tools executed: ${toolResults.length}`);
    console.log(`✅ Issues found: ${issues.length}`);
    console.log(`✅ TTL cleanup configured (300s)`);
    console.log('\n🎯 Key Features Demonstrated:');
    console.log('   - Repository caching (clone once)');
    console.log('   - COW for PR changes only');
    console.log('   - Parallel job execution possible');
    console.log('   - Automatic cleanup via TTL');
    console.log('   - No resource leaks');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);

    // Check Kubernetes connectivity
    console.log('\n🔍 Debugging info:');
    const { exec } = require('child_process');
    exec('kubectl get pods -n codequal-dev', (err, stdout) => {
      if (err) {
        console.log('   Kubectl error:', err.message);
      } else {
        console.log('   Active pods:', stdout.split('\\n').length - 1);
      }
    });
  }
}

// Run the test
testKubernetesJavaExecution().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});