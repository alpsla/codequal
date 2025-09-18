#!/usr/bin/env node

/**
 * SIMPLE V9 TEST RUNNER - Direct test using existing components
 */

require('dotenv').config();

async function runV9Analysis() {
  console.log('🚀 V9 SIMPLE TEST RUNNER');
  console.log('=' .repeat(50));

  try {
    // Use the existing V9 components
    const { V9ToolOrchestrator } = require('./packages/agents/dist/two-branch/analyzers/v9-tool-orchestrator');
    const { V9RepositoryManager } = require('./packages/agents/dist/two-branch/analyzers/v9-repository-manager');
    const { SmartFileSelector } = require('./packages/agents/dist/two-branch/utils/smart-file-selector');

    const config = {
      repository: 'apache/kafka',
      prNumber: 17620,
      owner: 'apache',
      repo: 'kafka',
      mainBranch: 'trunk',
      prBranch: 'pr-17620'
    };

    console.log('📋 Configuration:', config);

    // 1. Repository Management
    console.log('\n1️⃣ Initializing Repository Manager...');
    const repoManager = new V9RepositoryManager(config);
    const repoInfo = await repoManager.prepare();
    console.log('   ✅ Repository ready:', repoInfo.path);

    // 2. File Selection
    console.log('\n2️⃣ Selecting files for analysis...');
    const fileSelector = new SmartFileSelector();
    const files = await fileSelector.selectFiles(repoInfo.path, {
      maxFiles: 500,
      includeTests: false
    });
    console.log(`   ✅ Selected ${files.length} files`);

    // 3. Tool Execution
    console.log('\n3️⃣ Running tools on both branches...');
    const toolOrchestrator = new V9ToolOrchestrator(config);

    // Run on main branch
    console.log('   Running on main branch...');
    const mainResults = await toolOrchestrator.runTools('main', files);
    console.log(`   ✅ Main branch: ${mainResults.issues?.length || 0} issues`);

    // Run on PR branch
    console.log('   Running on PR branch...');
    const prResults = await toolOrchestrator.runTools('pr', files);
    console.log(`   ✅ PR branch: ${prResults.issues?.length || 0} issues`);

    // 4. Calculate metrics
    console.log('\n4️⃣ Calculating metrics...');
    const newIssues = prResults.issues?.filter(prIssue =>
      !mainResults.issues?.some(mainIssue =>
        mainIssue.file === prIssue.file &&
        mainIssue.line === prIssue.line &&
        mainIssue.message === prIssue.message
      )
    ) || [];

    const resolvedIssues = mainResults.issues?.filter(mainIssue =>
      !prResults.issues?.some(prIssue =>
        mainIssue.file === prIssue.file &&
        mainIssue.line === prIssue.line &&
        mainIssue.message === prIssue.message
      )
    ) || [];

    console.log(`   📊 NEW issues: ${newIssues.length}`);
    console.log(`   📊 RESOLVED issues: ${resolvedIssues.length}`);
    console.log(`   📊 Total PR issues: ${prResults.issues?.length || 0}`);

    // 5. Decision
    const criticalCount = newIssues.filter(i => i.severity === 'critical').length;
    const highCount = newIssues.filter(i => i.severity === 'high').length;
    const blocked = criticalCount > 0 || highCount > 2;

    console.log('\n' + '=' .repeat(50));
    console.log(blocked ? '🚫 PR BLOCKED' : '✅ PR APPROVED');
    console.log('=' .repeat(50));

    // Save summary
    const summary = {
      repository: config.repository,
      prNumber: config.prNumber,
      timestamp: new Date().toISOString(),
      metrics: {
        newIssues: newIssues.length,
        resolvedIssues: resolvedIssues.length,
        totalPrIssues: prResults.issues?.length || 0,
        criticalCount,
        highCount
      },
      decision: blocked ? 'BLOCKED' : 'APPROVED',
      filesAnalyzed: files.length
    };

    const fs = require('fs');
    const summaryFile = `v9-test-summary-${Date.now()}.json`;
    fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
    console.log(`\n📁 Summary saved: ${summaryFile}`);

    return summary;

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runV9Analysis().then(() => {
    console.log('\n✅ Test completed successfully!');
    process.exit(0);
  }).catch(error => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
}

module.exports = { runV9Analysis };