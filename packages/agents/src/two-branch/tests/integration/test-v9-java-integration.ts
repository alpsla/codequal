/**
 * V9 Java Integration Test
 *
 * Tests the COMPLETE V9 flow with Java:
 * 1. V9ToolOrchestrator.orchestrateJavaAnalysis() on MAIN branch
 * 2. V9ToolOrchestrator.orchestrateJavaAnalysis() on PR branch
 * 3. TwoBranchComparator categorizes issues
 * 4. Results ready for report generation
 *
 * This validates the Java integration into the existing V9 infrastructure.
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '/Users/alpinro/Code Prjects/codequal/packages/agents/.env' });

import { V9ToolOrchestrator } from '../../analyzers/v9-tool-orchestrator';
import { TwoBranchComparator } from '../../comparators/TwoBranchComparator';
import { logger } from '../../utils/logger';
import * as fs from 'fs';

const TEST_REPO = '/tmp/kafka-repo';

async function testV9JavaIntegration() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  V9 JAVA INTEGRATION TEST');
  console.log('═══════════════════════════════════════════════════════\n');

  // Verify repository exists
  if (!fs.existsSync(TEST_REPO)) {
    logger.error(`❌ Test repository not found: ${TEST_REPO}`);
    logger.info('Please clone Apache Kafka first:');
    logger.info('  cd /tmp && git clone https://github.com/apache/kafka.git kafka-repo');
    process.exit(1);
  }

  try {
    const orchestrator = new V9ToolOrchestrator();
    const comparator = new TwoBranchComparator();

    // =================================================================
    // STAGE 1: Analyze MAIN branch using V9ToolOrchestrator
    // =================================================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STAGE 1: Analyzing MAIN branch via V9ToolOrchestrator');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const mainStart = Date.now();
    const mainIssues = await orchestrator.orchestrateJavaAnalysis(
      TEST_REPO,
      'main'
    );
    const mainDuration = Date.now() - mainStart;

    console.log(`\n✅ MAIN branch complete in ${Math.round(mainDuration/1000)}s`);
    console.log(`📊 Issues found: ${mainIssues.length}`);
    logIssueBreakdown('MAIN', mainIssues);

    // =================================================================
    // STAGE 2: Analyze PR branch using V9ToolOrchestrator
    // =================================================================
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STAGE 2: Analyzing PR branch via V9ToolOrchestrator');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const prStart = Date.now();
    const prIssues = await orchestrator.orchestrateJavaAnalysis(
      TEST_REPO,
      'pr'
    );
    const prDuration = Date.now() - prStart;

    console.log(`\n✅ PR branch complete in ${Math.round(prDuration/1000)}s`);
    console.log(`📊 Issues found: ${prIssues.length}`);
    logIssueBreakdown('PR', prIssues);

    // =================================================================
    // STAGE 3: Compare using TwoBranchComparator
    // =================================================================
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STAGE 3: Comparing branches via TwoBranchComparator');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Convert ProcessedIssue[] to ToolIssue[] for TwoBranchComparator
    const mainToolIssues = orchestrator.convertProcessedIssuesToToolIssues(mainIssues);
    const prToolIssues = orchestrator.convertProcessedIssuesToToolIssues(prIssues);

    // Wrap issues in AnalysisResult format expected by comparator
    const mainResult = {
      issues: mainToolIssues,
      metrics: { totalIssues: mainToolIssues.length },
      repository: { path: TEST_REPO, branch: 'main' }
    };

    const prResult = {
      issues: prToolIssues,
      metrics: { totalIssues: prToolIssues.length },
      repository: { path: TEST_REPO, branch: 'pr' }
    };

    const comparison = await comparator.compareAnalyses(
      mainResult as any,
      prResult as any
    );

    console.log('✅ Comparison complete\n');
    console.log('📊 Issue Categorization:');
    console.log(`   🆕 NEW (PR only):        ${comparison.newIssues?.length || 0}`);
    console.log(`   ✅ FIXED (resolved):     ${comparison.fixedIssues?.length || 0}`);
    console.log(`   📌 EXISTING (both):      ${comparison.unchangedIssues?.length || 0}`);

    // =================================================================
    // STAGE 4: Validate results
    // =================================================================
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STAGE 4: Validating V9 Integration');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const validations = {
      javaToolsExecuted: mainIssues.length > 0 && prIssues.length > 0,
      formatConversion: mainIssues.every(i =>
        i.id && i.severity && i.category && i.file && i.line && i.tool && i.agent
      ),
      comparatorWorking: comparison.newIssues !== undefined,
      issuesCategorized: (comparison.newIssues?.length || 0) +
                         (comparison.fixedIssues?.length || 0) +
                         (comparison.unchangedIssues?.length || 0) > 0
    };

    console.log('Validation Results:');
    console.log(`  ✅ JavaToolOrchestrator executed: ${validations.javaToolsExecuted ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  ✅ Format conversion correct: ${validations.formatConversion ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  ✅ TwoBranchComparator working: ${validations.comparatorWorking ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  ✅ Issues categorized: ${validations.issuesCategorized ? '✅ PASS' : '❌ FAIL'}`);

    const allValid = Object.values(validations).every(v => v === true);

    // =================================================================
    // FINAL SUMMARY
    // =================================================================
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  TEST SUMMARY');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log(`Total Duration: ${Math.round((mainDuration + prDuration)/1000)}s`);
    console.log(`Main Branch: ${Math.round(mainDuration/1000)}s, ${mainIssues.length} issues`);
    console.log(`PR Branch: ${Math.round(prDuration/1000)}s, ${prIssues.length} issues\n`);

    console.log('Comparison Results:');
    console.log(`  NEW issues: ${comparison.newIssues?.length || 0}`);
    console.log(`  FIXED: ${comparison.fixedIssues?.length || 0}`);
    console.log(`  EXISTING: ${comparison.unchangedIssues?.length || 0}\n`);

    console.log('V9 Infrastructure Status:');
    console.log('  ✅ V9ToolOrchestrator.orchestrateJavaAnalysis()');
    console.log('  ✅ JavaToolOrchestrator integration');
    console.log('  ✅ ProcessedIssue format conversion');
    console.log('  ✅ TwoBranchComparator integration');
    console.log('  ✅ Issue categorization (NEW/RESOLVED/EXISTING)');

    if (allValid) {
      console.log('\n═══════════════════════════════════════════════════════');
      console.log('✅ ALL TESTS PASSED - V9 Java Integration Complete!');
      console.log('═══════════════════════════════════════════════════════\n');
      process.exit(0);
    } else {
      console.log('\n═══════════════════════════════════════════════════════');
      console.log('❌ SOME TESTS FAILED - Review validation results');
      console.log('═══════════════════════════════════════════════════════\n');
      process.exit(1);
    }

  } catch (error: any) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

function logIssueBreakdown(branch: string, issues: any[]) {
  const bySeverity = { critical: 0, high: 0, medium: 0, low: 0 };
  const byTool: Record<string, number> = {};
  const byAgent: Record<string, number> = {};
  const byCategory: Record<string, number> = {};

  for (const issue of issues) {
    bySeverity[issue.severity]++;
    byTool[issue.tool] = (byTool[issue.tool] || 0) + 1;
    byAgent[issue.agent] = (byAgent[issue.agent] || 0) + 1;
    byCategory[issue.category] = (byCategory[issue.category] || 0) + 1;
  }

  console.log(`\n  ${branch} Breakdown:`);
  console.log(`    Severity: Critical=${bySeverity.critical}, High=${bySeverity.high}, Medium=${bySeverity.medium}, Low=${bySeverity.low}`);
  console.log(`    Tools: ${JSON.stringify(byTool)}`);
  console.log(`    Agents: ${JSON.stringify(byAgent)}`);
  console.log(`    Categories: ${JSON.stringify(byCategory)}`);
}

// Run the test
if (require.main === module) {
  testV9JavaIntegration().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { testV9JavaIntegration };
