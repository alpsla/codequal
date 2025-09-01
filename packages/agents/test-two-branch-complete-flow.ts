#!/usr/bin/env npx ts-node

/**
 * Test the complete Two-Branch Analysis System
 * NO DeepWiki dependencies - Pure MCP tools + Specialized Agents
 */

import { MCPBasedOrchestrator } from './src/two-branch/orchestrators/mcp-based-orchestrator';

async function testCompleteTwoBranchFlow() {
  console.log('🚀 Testing Complete Two-Branch Analysis System');
  console.log('=' .repeat(50));
  
  // Test configuration
  const testConfig = {
    repoUrl: 'https://github.com/sindresorhus/ky',
    prNumber: 700,
    // Using mock mode for quick testing
    useMockData: true
  };

  try {
    // Initialize orchestrator
    const orchestrator = new MCPBasedOrchestrator({
      parallel: true,
      includeEducator: true,
      trackSkills: true
    });

    console.log('\n📋 Test Configuration:');
    console.log(`  Repository: ${testConfig.repoUrl}`);
    console.log(`  PR Number: ${testConfig.prNumber}`);
    console.log(`  Mock Mode: ${testConfig.useMockData}`);
    
    console.log('\n🔄 Starting PR Analysis...\n');

    // Run the complete analysis
    const startTime = Date.now();
    const result = await orchestrator.analyzePullRequest(
      testConfig.repoUrl,
      testConfig.prNumber
    );
    const duration = Date.now() - startTime;

    // Display results
    console.log('\n✅ Analysis Complete!');
    console.log('=' .repeat(50));
    
    console.log('\n📊 Summary:');
    console.log(`  Total Issues: ${result.comparison.summary.totalIssues}`);
    console.log(`  New Issues (Critical): ${result.comparison.newIssues.inDiffLines.filter(i => ['critical', 'high'].includes(i.severity)).length}`);
    console.log(`  Resolved Issues: ${result.comparison.resolvedIssues.length}`);
    console.log(`  Existing Issues: ${result.comparison.existingIssues.length}`);
    
    console.log('\n🎯 Decision:');
    console.log(`  Recommendation: ${result.comparison.summary.recommendation.severity.toUpperCase()}`);
    console.log(`  Message: ${result.comparison.summary.recommendation.message}`);
    
    if (result.comparison.summary.recommendation.reasoning.length > 0) {
      console.log('\n  Reasoning:');
      result.comparison.summary.recommendation.reasoning.forEach(r => {
        console.log(`    • ${r}`);
      });
    }

    console.log('\n🛠️ Tools Used:');
    console.log(`  Main Branch: ${result.mainBranch.metadata.toolsRun.join(', ')}`);
    console.log(`  PR Branch: ${result.prBranch.metadata.toolsRun.join(', ')}`);
    
    console.log('\n📚 Educational Content:');
    if (result.educationalContent) {
      console.log(`  Generated: Yes`);
      console.log(`  Topics: ${result.educationalContent.topics?.length || 0}`);
      console.log(`  Resources: ${result.educationalContent.resources?.length || 0}`);
    } else {
      console.log(`  Generated: No`);
    }

    console.log('\n🎓 Skill Impact:');
    if (result.skillImpact) {
      console.log(`  Security: ${result.skillImpact.security || 'N/A'}`);
      console.log(`  Code Quality: ${result.skillImpact.codeQuality || 'N/A'}`);
      console.log(`  Performance: ${result.skillImpact.performance || 'N/A'}`);
    } else {
      console.log(`  Not tracked`);
    }

    console.log('\n⏱️ Performance:');
    console.log(`  Total Duration: ${duration}ms`);
    console.log(`  Main Branch Analysis: ${result.mainBranch.metadata.executionTime}ms`);
    console.log(`  PR Branch Analysis: ${result.prBranch.metadata.executionTime}ms`);
    
    // Save report if needed
    if (result.finalReport) {
      const fs = require('fs').promises;
      const reportPath = `./test-reports/two-branch-report-${Date.now()}.html`;
      await fs.writeFile(reportPath, result.finalReport.html);
      console.log(`\n📄 Report saved to: ${reportPath}`);
    }

    console.log('\n✨ Test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testCompleteTwoBranchFlow()
    .then(() => {
      console.log('\n👍 All tests passed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Fatal error:', error);
      process.exit(1);
    });
}

export { testCompleteTwoBranchFlow };