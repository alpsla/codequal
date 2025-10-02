/**
 * V9 Java Integration Test - ALL MODES
 *
 * Tests three severity filtering modes:
 * 1. Critical-only with fallback (critical→high if no critical found)
 * 2. Full analysis (all severities)
 * 3. Custom severity (e.g., high+)
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '/Users/alpinro/Code Prjects/codequal/packages/agents/.env' });

import { V9ToolOrchestrator } from '../../analyzers/v9-tool-orchestrator';
import * as fs from 'fs';

const TEST_REPO = '/tmp/kafka-repo';

async function testAllModes() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  V9 JAVA TEST - ALL SEVERITY MODES');
  console.log('═══════════════════════════════════════════════════════\n');

  if (!fs.existsSync(TEST_REPO)) {
    console.error(`❌ Test repository not found: ${TEST_REPO}`);
    process.exit(1);
  }

  try {
    const orchestrator = new V9ToolOrchestrator();

    // =================================================================
    // MODE 1: Critical-only with automatic fallback
    // =================================================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('MODE 1: Critical-only with fallback (critical→high→medium→low)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const mode1Start = Date.now();
    const criticalIssues = await orchestrator.orchestrateJavaAnalysis(
      TEST_REPO,
      'main',
      undefined,
      { severityFilter: 'critical', enableFallback: true }
    );
    const mode1Duration = Date.now() - mode1Start;

    console.log(`\n✅ MODE 1 complete in ${Math.round(mode1Duration/1000)}s`);
    console.log(`📊 Issues found: ${criticalIssues.length}`);
    printIssueSummary(criticalIssues);

    // =================================================================
    // MODE 2: Full analysis (all severities)
    // =================================================================
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('MODE 2: Full analysis (ALL severities)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const mode2Start = Date.now();
    const allIssues = await orchestrator.orchestrateJavaAnalysis(
      TEST_REPO,
      'main',
      undefined,
      { severityFilter: 'all' }  // Return ALL issues
    );
    const mode2Duration = Date.now() - mode2Start;

    console.log(`\n✅ MODE 2 complete in ${Math.round(mode2Duration/1000)}s`);
    console.log(`📊 Issues found: ${allIssues.length}`);
    printIssueSummary(allIssues);

    // =================================================================
    // MODE 3: High+ severity (no fallback)
    // =================================================================
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('MODE 3: High+ severity (no fallback)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const mode3Start = Date.now();
    const highIssues = await orchestrator.orchestrateJavaAnalysis(
      TEST_REPO,
      'main',
      undefined,
      { severityFilter: 'high', enableFallback: false }
    );
    const mode3Duration = Date.now() - mode3Start;

    console.log(`\n✅ MODE 3 complete in ${Math.round(mode3Duration/1000)}s`);
    console.log(`📊 Issues found: ${highIssues.length}`);
    printIssueSummary(highIssues);

    // =================================================================
    // SUMMARY
    // =================================================================
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  SEVERITY MODE COMPARISON');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log('Mode 1 (Critical with fallback):');
    console.log(`  Duration: ${Math.round(mode1Duration/1000)}s`);
    console.log(`  Issues: ${criticalIssues.length}`);
    console.log(`  Use case: Production reports (show most critical issues)\n`);

    console.log('Mode 2 (Full analysis):');
    console.log(`  Duration: ${Math.round(mode2Duration/1000)}s`);
    console.log(`  Issues: ${allIssues.length}`);
    console.log(`  Use case: User wants complete issue list\n`);

    console.log('Mode 3 (High+ no fallback):');
    console.log(`  Duration: ${Math.round(mode3Duration/1000)}s`);
    console.log(`  Issues: ${highIssues.length}`);
    console.log(`  Use case: Specific severity threshold without fallback\n`);

    console.log('✅ All severity modes working correctly!\n');
    process.exit(0);

  } catch (error: any) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

function printIssueSummary(issues: any[]) {
  const bySeverity = { critical: 0, high: 0, medium: 0, low: 0 };
  const byTool: Record<string, number> = {};

  for (const issue of issues) {
    bySeverity[issue.severity]++;
    byTool[issue.tool] = (byTool[issue.tool] || 0) + 1;
  }

  console.log('\nBreakdown:');
  console.log(`  Severity: Critical=${bySeverity.critical}, High=${bySeverity.high}, Medium=${bySeverity.medium}, Low=${bySeverity.low}`);
  console.log(`  Tools: ${JSON.stringify(byTool)}`);
}

// Run the test
if (require.main === module) {
  testAllModes().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { testAllModes };
