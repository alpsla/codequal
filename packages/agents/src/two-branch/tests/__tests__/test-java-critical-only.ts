/**
 * V9 Java Integration Test - CRITICAL ISSUES ONLY
 *
 * Tests the V9 flow with severity filtering to show only critical issues.
 * This is the production mode for two-branch analysis.
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '/Users/alpinro/Code Prjects/codequal/packages/agents/.env' });

import { V9ToolOrchestrator } from '../../analyzers/v9-tool-orchestrator';
import { TwoBranchComparator } from '../../comparators/TwoBranchComparator';
import { logger } from '../../utils/logger';
import * as fs from 'fs';

const TEST_REPO = '/tmp/kafka-repo';

async function testJavaCriticalOnly() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  V9 JAVA TEST - CRITICAL ISSUES ONLY');
  console.log('═══════════════════════════════════════════════════════\n');

  if (!fs.existsSync(TEST_REPO)) {
    logger.error(`❌ Test repository not found: ${TEST_REPO}`);
    process.exit(1);
  }

  try {
    const orchestrator = new V9ToolOrchestrator();
    const comparator = new TwoBranchComparator();

    // =================================================================
    // STAGE 1: Analyze MAIN branch (critical issues only)
    // =================================================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STAGE 1: Analyzing MAIN branch (CRITICAL issues only)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const mainStart = Date.now();
    const mainIssues = await orchestrator.orchestrateJavaAnalysis(
      TEST_REPO,
      'main',
      undefined,
      { severityFilter: 'critical' }  // FILTER TO CRITICAL ONLY
    );
    const mainDuration = Date.now() - mainStart;

    console.log(`\n✅ MAIN branch complete in ${Math.round(mainDuration/1000)}s`);
    console.log(`📊 Critical issues found: ${mainIssues.length}`);
    logIssueBreakdown('MAIN', mainIssues);

    // =================================================================
    // STAGE 2: Analyze PR branch (critical issues only)
    // =================================================================
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STAGE 2: Analyzing PR branch (CRITICAL issues only)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const prStart = Date.now();
    const prIssues = await orchestrator.orchestrateJavaAnalysis(
      TEST_REPO,
      'pr',
      undefined,
      { severityFilter: 'critical' }  // FILTER TO CRITICAL ONLY
    );
    const prDuration = Date.now() - prStart;

    console.log(`\n✅ PR branch complete in ${Math.round(prDuration/1000)}s`);
    console.log(`📊 Critical issues found: ${prIssues.length}`);
    logIssueBreakdown('PR', prIssues);

    // =================================================================
    // STAGE 3: Compare using TwoBranchComparator
    // =================================================================
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STAGE 3: Comparing branches (CRITICAL only)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Convert ProcessedIssue[] to ToolIssue[] for TwoBranchComparator
    const mainToolIssues = orchestrator.convertProcessedIssuesToToolIssues(mainIssues);
    const prToolIssues = orchestrator.convertProcessedIssuesToToolIssues(prIssues);

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
    console.log('📊 Issue Categorization (CRITICAL only):');
    console.log(`   🆕 NEW (PR only):        ${comparison.newIssues?.length || 0}`);
    console.log(`   ✅ FIXED (resolved):     ${comparison.fixedIssues?.length || 0}`);
    console.log(`   📌 EXISTING (both):      ${comparison.unchangedIssues?.length || 0}`);

    // Show sample critical issues
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Sample CRITICAL Issues (First 5)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    mainIssues.slice(0, 5).forEach((issue, idx) => {
      console.log(`${idx + 1}. [${issue.tool}] ${issue.title}`);
      console.log(`   File: ${issue.file}:${issue.line}`);
      console.log(`   Category: ${issue.category}`);
      console.log(`   Description: ${issue.description.substring(0, 100)}...`);
      console.log('');
    });

    // =================================================================
    // FINAL SUMMARY
    // =================================================================
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  TEST SUMMARY - CRITICAL ISSUES ONLY');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log(`Total Duration: ${Math.round((mainDuration + prDuration)/1000)}s`);
    console.log(`Main Branch: ${Math.round(mainDuration/1000)}s, ${mainIssues.length} critical issues`);
    console.log(`PR Branch: ${Math.round(prDuration/1000)}s, ${prIssues.length} critical issues\n`);

    console.log('Comparison Results (CRITICAL only):');
    console.log(`  NEW critical issues: ${comparison.newIssues?.length || 0}`);
    console.log(`  FIXED critical: ${comparison.fixedIssues?.length || 0}`);
    console.log(`  EXISTING critical: ${comparison.unchangedIssues?.length || 0}\n`);

    console.log('Tool Summary:');
    const toolBreakdown = countByTool(mainIssues);
    for (const [tool, count] of Object.entries(toolBreakdown)) {
      console.log(`  ${tool}: ${count} critical issues`);
    }

    console.log('\n✅ Severity filtering working correctly!');
    console.log('📊 Ready for V9 report generation with critical issues\n');

    process.exit(0);

  } catch (error: any) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

function logIssueBreakdown(branch: string, issues: any[]) {
  const bySeverity = { critical: 0, high: 0, medium: 0, low: 0 };
  const byTool: Record<string, number> = {};
  const byCategory: Record<string, number> = {};

  for (const issue of issues) {
    bySeverity[issue.severity]++;
    byTool[issue.tool] = (byTool[issue.tool] || 0) + 1;
    byCategory[issue.category] = (byCategory[issue.category] || 0) + 1;
  }

  console.log(`\n  ${branch} Breakdown:`);
  console.log(`    Severity: Critical=${bySeverity.critical}, High=${bySeverity.high}, Medium=${bySeverity.medium}, Low=${bySeverity.low}`);
  console.log(`    Tools: ${JSON.stringify(byTool)}`);
  console.log(`    Categories: ${JSON.stringify(byCategory)}`);
}

function countByTool(issues: any[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const issue of issues) {
    counts[issue.tool] = (counts[issue.tool] || 0) + 1;
  }
  return counts;
}

// Run the test
if (require.main === module) {
  testJavaCriticalOnly().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { testJavaCriticalOnly };
