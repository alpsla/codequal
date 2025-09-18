#!/usr/bin/env node

/**
 * V9 Simple Test - Test with a smaller repository
 */

require('dotenv').config();

async function testSimpleRepo() {
  console.log('🚀 V9 SIMPLE TEST - Testing with smaller repo');
  console.log('=' .repeat(70));

  // Set environment for local tool processing
  process.env.USE_LOCAL_TOOLS = 'true';

  try {
    // Load components
    console.log('1️⃣ Loading components...');
    const { KubernetesRepositoryManager } = require('./packages/agents/dist/two-branch/utils/kubernetes-repository-manager');
    const { V9ToolOrchestrator } = require('./packages/agents/dist/two-branch/analyzers/v9-tool-orchestrator');

    const k8sManager = new KubernetesRepositoryManager();
    const orchestrator = new V9ToolOrchestrator();
    console.log('   ✅ Components loaded\n');

    // Use a smaller test repository
    const TEST_REPO = {
      repository: 'https://github.com/expressjs/express',
      prNumber: 5500, // Recent PR
      language: 'javascript'
    };

    // Step 1: Setup base repository with auto branch detection
    console.log('2️⃣ Setting up repository with auto branch detection...');
    const baseWorkspace = await k8sManager.setupRepository(
      TEST_REPO.repository,
      'auto', // Will detect 'master' for Express
      TEST_REPO.language
    );
    console.log(`   ✅ Base workspace ready: ${baseWorkspace.workspaceId}`);
    console.log(`   📁 PVC: ${baseWorkspace.pvcName}`);
    console.log(`   📊 Files: ${baseWorkspace.filesCount}\n`);

    // Step 2: Run JavaScript tools
    console.log('3️⃣ Running JavaScript analysis tools...');
    const tools = ['eslint'];
    const toolResults = await k8sManager.runToolsInKubernetes(
      tools,
      TEST_REPO.language,
      baseWorkspace.workspaceId,
      baseWorkspace.pvcName
    );

    console.log(`   ✅ Tool execution complete: ${toolResults.length} results`);
    toolResults.forEach(result => {
      console.log(`   Tool: ${result.tool}`);
      console.log(`     - Exit code: ${result.exitCode}`);
      console.log(`     - Duration: ${result.duration}ms`);
    });

    // Step 3: Get files
    const files = await k8sManager.getWorkspaceFiles(
      baseWorkspace.workspaceId,
      baseWorkspace.pvcName,
      '*.js'
    );
    console.log(`   📁 Found ${files.length} JavaScript files\n`);

    // Step 4: Process with orchestrator
    console.log('4️⃣ Processing results with V9 Orchestrator...');
    const orchestratorTools = tools.map(tool => ({
      name: tool,
      image: 'registry.digitalocean.com/codequal-registry/analyzer:lang-javascript-v4.8',
      command: tool,
      agent: 'CodeQualityAgent'
    }));

    const issues = await orchestrator.processExecutedToolResults(
      toolResults,
      'javascript',
      orchestratorTools,
      baseWorkspace.workspaceId,
      baseWorkspace.pvcName
    );

    console.log(`   ✅ Analysis complete: ${issues.length} issues found\n`);

    // Summary
    console.log('=' .repeat(70));
    console.log('📊 TEST SUMMARY');
    console.log('=' .repeat(70));
    console.log(`✅ Repository: ${TEST_REPO.repository}`);
    console.log(`✅ Branch detected: auto`);
    console.log(`✅ Files found: ${baseWorkspace.filesCount}`);
    console.log(`✅ Tools executed: ${toolResults.length}`);
    console.log(`✅ Issues found: ${issues.length}`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run test
testSimpleRepo();