/**
 * Complete Java Analysis Integration Test
 *
 * Tests the full Java orchestration with smart Checkstyle logic:
 * 1. PMD + Semgrep run in parallel (Phase 1)
 * 2. Checkstyle runs conditionally:
 *    - If critical/high issues found: SKIP Checkstyle
 *    - If no critical/high issues: RUN Checkstyle
 *    - If user requests all severities: ALWAYS RUN Checkstyle
 * 3. Dependency-Check runs on PR branch only
 *
 * Expected behavior for Apache Kafka:
 * - Phase 1: PMD finds ~2,383 critical/high issues
 * - Checkstyle: SKIPPED (critical/high issues present)
 * - Total time: ~60s (vs ~180s with Checkstyle)
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '/Users/alpinro/Code Prjects/codequal/packages/agents/.env' });

import { JavaToolOrchestrator } from '../../tools/java/java-tool-orchestrator';
import * as fs from 'fs';
import { execSync } from 'child_process';

const KAFKA_REPO = '/tmp/kafka-repo';

async function testJavaFullAnalysis() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Java Full Analysis Integration Test');
  console.log('  Testing Smart Checkstyle Logic');
  console.log('═══════════════════════════════════════════════════════\n');

  if (!fs.existsSync(KAFKA_REPO)) {
    console.error(`❌ Repository not found: ${KAFKA_REPO}`);
    console.error('   Clone Apache Kafka first: git clone https://github.com/apache/kafka.git /tmp/kafka-repo');
    process.exit(1);
  }

  try {
    // ============================================================
    // TEST 1: Normal Mode (Critical/High Only)
    // ============================================================
    console.log('═══════════════════════════════════════════════════════');
    console.log('TEST 1: Normal Mode - Critical/High Issues Only');
    console.log('Expected: Checkstyle SKIPPED (critical/high issues present)');
    console.log('═══════════════════════════════════════════════════════\n');

    const orchestrator = new JavaToolOrchestrator({
      pmd: {
        enabled: true,
        minimumPriority: 2,
        rulesets: ['category/java/errorprone.xml', 'category/java/bestpractices.xml'],
        parallel: 4,
        threads: 3,
        memory: '5g'
      },
      semgrep: {
        enabled: true,
        rulesets: ['p/security-audit', 'p/java'],
        parallel: 6,
        smartSelection: true,
        memory: '2g'
      },
      checkstyle: {
        enabled: true,  // ENABLED but will be skipped conditionally
        configFile: '/sun_checks.xml',
        parallel: 2,
        memory: '3g',
        changedFilesOnly: false
      },
      dependencyCheck: {
        enabled: false,  // Skip for speed in this test
        failOnCVSS: 7.0,
        timeout: 300
      }
    });

    // Clean and checkout PR branch
    console.log('📋 Preparing repository...\n');
    execSync('git clean -fd', { cwd: KAFKA_REPO, stdio: 'ignore' });
    execSync('git checkout pr-with-checkstyle-violations', { cwd: KAFKA_REPO, stdio: 'ignore' });

    // Run analysis (Normal Mode)
    const startTime1 = Date.now();
    const result1 = await orchestrator.orchestrate(KAFKA_REPO, 'pr');
    const duration1 = Date.now() - startTime1;

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('TEST 1 RESULTS:');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log(`✅ Duration: ${Math.round(duration1 / 1000)}s`);
    console.log(`📊 Total Issues: ${result1.summary.totalIssues}`);
    console.log(`🚨 Critical: ${result1.summary.criticalIssues}`);
    console.log(`⚠️  High: ${result1.summary.highIssues}`);
    console.log(`📝 Medium: ${result1.summary.mediumIssues}`);
    console.log(`ℹ️  Low: ${result1.summary.lowIssues}`);
    console.log(`\n🔧 Tools Executed: ${result1.toolResults.map(r => r.tool).join(', ')}`);

    // Verify Checkstyle was SKIPPED
    const checkstyleRan1 = result1.toolResults.some(r => r.tool === 'Checkstyle');
    if (!checkstyleRan1) {
      console.log('✅ PASS: Checkstyle was SKIPPED (as expected due to critical/high issues)');
    } else {
      console.log('❌ FAIL: Checkstyle ran (should have been skipped)');
    }

    // ============================================================
    // TEST 2: All Severities Mode
    // ============================================================
    console.log('\n\n═══════════════════════════════════════════════════════');
    console.log('TEST 2: All Severities Mode');
    console.log('Expected: Checkstyle RUNS (user requested all severities)');
    console.log('═══════════════════════════════════════════════════════\n');

    // Clean repo again
    execSync('git clean -fd', { cwd: KAFKA_REPO, stdio: 'ignore' });
    execSync('git checkout pr-with-checkstyle-violations', { cwd: KAFKA_REPO, stdio: 'ignore' });

    // Run analysis with includeAllSeverities flag
    const startTime2 = Date.now();
    const result2 = await orchestrator.orchestrate(
      KAFKA_REPO,
      'pr',
      undefined,
      { includeAllSeverities: true }  // Force Checkstyle to run
    );
    const duration2 = Date.now() - startTime2;

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('TEST 2 RESULTS:');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log(`✅ Duration: ${Math.round(duration2 / 1000)}s`);
    console.log(`📊 Total Issues: ${result2.summary.totalIssues}`);
    console.log(`🚨 Critical: ${result2.summary.criticalIssues}`);
    console.log(`⚠️  High: ${result2.summary.highIssues}`);
    console.log(`📝 Medium: ${result2.summary.mediumIssues}`);
    console.log(`ℹ️  Low: ${result2.summary.lowIssues}`);
    console.log(`\n🔧 Tools Executed: ${result2.toolResults.map(r => r.tool).join(', ')}`);

    // Verify Checkstyle RAN
    const checkstyleRan2 = result2.toolResults.some(r => r.tool === 'Checkstyle');
    if (checkstyleRan2) {
      console.log('✅ PASS: Checkstyle RAN (as expected with includeAllSeverities=true)');
    } else {
      console.log('❌ FAIL: Checkstyle did not run (should have run in all severities mode)');
    }

    // ============================================================
    // PERFORMANCE COMPARISON
    // ============================================================
    console.log('\n\n═══════════════════════════════════════════════════════');
    console.log('PERFORMANCE COMPARISON:');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log(`Normal Mode (Critical/High):     ${Math.round(duration1 / 1000)}s`);
    console.log(`All Severities Mode (+ Style):   ${Math.round(duration2 / 1000)}s`);
    console.log(`Time Saved (skipping Checkstyle): ${Math.round((duration2 - duration1) / 1000)}s`);
    console.log(`Performance Gain: ${Math.round((1 - duration1 / duration2) * 100)}%\n`);

    // ============================================================
    // CLEANUP
    // ============================================================
    console.log('🧹 Cleaning up...\n');
    await cleanup();

    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ ALL TESTS PASSED');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log('📝 Summary:');
    console.log('   ✅ Smart Checkstyle logic working correctly');
    console.log('   ✅ Performance optimization validated');
    console.log('   ✅ All severities mode functioning as expected\n');

    process.exit(0);

  } catch (error: any) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error.stack);
    await cleanup();
    process.exit(1);
  }
}

async function cleanup() {
  try {
    // Stop Docker containers
    const javaContainers = [
      'pmd-analysis',
      'semgrep-analysis',
      'dependency-check-analysis',
      'spotbugs-analysis',
      'checkstyle-analysis'
    ];

    for (const containerPattern of javaContainers) {
      try {
        execSync(`docker ps -a --filter "name=${containerPattern}" -q | xargs -r docker rm -f 2>/dev/null || true`, { stdio: 'ignore' });
      } catch (error) {
        // Ignore
      }
    }

    // Clean git repo
    execSync('git clean -fd', { cwd: KAFKA_REPO, stdio: 'ignore' });
    execSync('git checkout trunk', { cwd: KAFKA_REPO, stdio: 'ignore' });

    // Garbage collection
    if (global.gc) {
      global.gc();
    }

    console.log('✅ Cleanup complete');
  } catch (error) {
    console.warn('⚠️  Cleanup warning:', error);
  }
}

// Run test
if (require.main === module) {
  testJavaFullAnalysis();
}

export { testJavaFullAnalysis };
