/**
 * Full Fix Flow Integration Test
 *
 * Tests the complete flow components work together:
 * 1. Scan issues correctly
 * 2. Route issues to appropriate fix tiers
 * 3. Pattern registry lookup works
 * 4. Fix verifier instantiation
 * 5. Unfixed issue handler works
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { JavaToolOrchestrator } from '../../src/two-branch/tools/java/java-tool-orchestrator';
import { FixRouter, IssueToFix } from '../../src/two-branch/fix-agent/fix-router';
import { createClient } from '@supabase/supabase-js';

const TEST_CONFIG = {
  testRepoUrl: 'https://github.com/spring-projects/spring-petclinic',
  language: 'java',
};

interface TestResult {
  step: string;
  status: 'pass' | 'fail' | 'skip';
  duration: number;
  details?: string;
}

async function runFullFlowTest(): Promise<void> {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║           FULL FIX FLOW INTEGRATION TEST                     ║');
  console.log('║           Scan → Route → Pattern → Verify                    ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const results: TestResult[] = [];
  const startTime = Date.now();
  const testDir = `/tmp/fix-flow-test-${Date.now()}`;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

  try {
    // ================================================================
    // STEP 1: Clone Repository
    // ================================================================
    console.log('=== STEP 1: Clone Repository ===');
    const step1Start = Date.now();

    try {
      if (fs.existsSync(testDir)) {
        execSync(`rm -rf ${testDir}`);
      }
      execSync(`git clone --depth 5 ${TEST_CONFIG.testRepoUrl} ${testDir}`, {
        stdio: 'pipe',
        timeout: 60000
      });
      results.push({
        step: 'Clone Repository',
        status: 'pass',
        duration: Date.now() - step1Start
      });
      console.log(`   ✅ Cloned in ${Date.now() - step1Start}ms\n`);
    } catch (error: any) {
      results.push({ step: 'Clone Repository', status: 'fail', duration: Date.now() - step1Start, details: error.message });
      throw error;
    }

    // ================================================================
    // STEP 2: Run Scan
    // ================================================================
    console.log('=== STEP 2: Run Scan ===');
    const step2Start = Date.now();

    let rawIssues: any[] = [];
    try {
      const orchestrator = new JavaToolOrchestrator();
      const result = await orchestrator.orchestrate(testDir, 'base');
      // Extract issues from all tool results
      rawIssues = result.toolResults.flatMap(tr => tr.issues || []);

      results.push({
        step: 'Run Scan',
        status: rawIssues.length > 0 ? 'pass' : 'fail',
        duration: Date.now() - step2Start,
        details: `Found ${rawIssues.length} issues`
      });
      console.log(`   ✅ Found ${rawIssues.length} issues in ${Date.now() - step2Start}ms\n`);
    } catch (error: any) {
      results.push({ step: 'Run Scan', status: 'fail', duration: Date.now() - step2Start, details: error.message });
      throw error;
    }

    // ================================================================
    // STEP 3: Convert to IssueToFix format
    // ================================================================
    console.log('=== STEP 3: Convert Issues ===');
    const step3Start = Date.now();

    const issuesToFix: IssueToFix[] = rawIssues.slice(0, 20).map((issue, idx) => ({
      id: `issue-${idx}`,
      ruleId: issue.rule || issue.ruleId || 'unknown',
      toolId: issue.tool || 'unknown',
      file: issue.file || 'unknown',
      line: issue.line || 1,
      column: issue.column,
      message: issue.message || issue.description || 'No message',
      severity: (issue.severity || 'medium') as 'critical' | 'high' | 'medium' | 'low',
      codeContext: issue.codeSnippet || issue.snippet || ''
    }));

    results.push({
      step: 'Convert Issues',
      status: 'pass',
      duration: Date.now() - step3Start,
      details: `Converted ${issuesToFix.length} issues`
    });
    console.log(`   ✅ Converted ${issuesToFix.length} issues in ${Date.now() - step3Start}ms\n`);

    // ================================================================
    // STEP 4: Route Issues with FixRouter
    // ================================================================
    console.log('=== STEP 4: Route Issues ===');
    const step4Start = Date.now();

    try {
      const router = new FixRouter();
      const routing = router.routeAndBatch(issuesToFix, { tier: 'pro' });

      results.push({
        step: 'Route Issues',
        status: 'pass',
        duration: Date.now() - step4Start,
        details: `T1:${routing.summary.tier1Count} T2:${routing.summary.tier2Count} T2.5:${routing.summary.tier2_5Count} T3:${routing.summary.tier3Count}`
      });

      console.log(`   Tier 1 (Native): ${routing.summary.tier1Count}`);
      console.log(`   Tier 2 (Dedicated): ${routing.summary.tier2Count}`);
      console.log(`   Tier 2.5 (Pattern/Cloud): ${routing.summary.tier2_5Count}`);
      console.log(`   Tier 3 (AI): ${routing.summary.tier3Count}`);
      console.log(`   Est. Cost: ${routing.summary.estimatedCost.toFixed(2)}¢`);
      console.log(`   ✅ Routed in ${Date.now() - step4Start}ms\n`);
    } catch (error: any) {
      results.push({ step: 'Route Issues', status: 'fail', duration: Date.now() - step4Start, details: error.message });
      throw error;
    }

    // ================================================================
    // STEP 5: Pattern Registry Lookup
    // ================================================================
    console.log('=== STEP 5: Pattern Registry ===');
    const step5Start = Date.now();

    if (supabase) {
      try {
        const ruleIds = [...new Set(issuesToFix.map(i => i.ruleId))];
        const { data: patterns, error } = await supabase
          .from('fix_patterns')
          .select('rule_id, tool, is_verified')
          .in('rule_id', ruleIds);

        const matched = patterns?.length || 0;
        results.push({
          step: 'Pattern Registry',
          status: 'pass',
          duration: Date.now() - step5Start,
          details: `${matched} patterns for ${ruleIds.length} rules`
        });
        console.log(`   ✅ Found ${matched} patterns for ${ruleIds.length} unique rules\n`);
      } catch (error: any) {
        results.push({ step: 'Pattern Registry', status: 'fail', duration: Date.now() - step5Start, details: error.message });
      }
    } else {
      results.push({ step: 'Pattern Registry', status: 'skip', duration: 0, details: 'Supabase not configured' });
      console.log(`   ⏭️ Skipped - Supabase not configured\n`);
    }

    // ================================================================
    // STEP 6: Test Fix Verifier
    // ================================================================
    console.log('=== STEP 6: Fix Verifier ===');
    const step6Start = Date.now();

    try {
      const { FixVerifier } = await import('../../src/two-branch/fix-branch/fix-verifier');
      const verifier = new FixVerifier({ workingDir: testDir });

      results.push({
        step: 'Fix Verifier',
        status: 'pass',
        duration: Date.now() - step6Start,
        details: 'Instantiated successfully'
      });
      console.log(`   ✅ Fix verifier ready in ${Date.now() - step6Start}ms\n`);
    } catch (error: any) {
      results.push({ step: 'Fix Verifier', status: 'fail', duration: Date.now() - step6Start, details: error.message });
    }

    // ================================================================
    // STEP 7: Test Unfixed Issue Handler
    // ================================================================
    console.log('=== STEP 7: Unfixed Handler ===');
    const step7Start = Date.now();

    try {
      const { UnfixedIssueHandler } = await import('../../src/two-branch/fix-branch/unfixed-issue-handler');
      const handler = new UnfixedIssueHandler();

      handler.recordUnfixed(
        { id: 'test-1', ruleId: 'test-rule', toolId: 'test', file: 'test.java', line: 1, message: 'Test', severity: 'medium' },
        'no_pattern_match',
        { attemptedTiers: ['tier1_native', 'tier2_dedicated'] }
      );

      const summary = handler.getSummary();
      const markdown = handler.generateMarkdown();

      results.push({
        step: 'Unfixed Handler',
        status: summary.total > 0 ? 'pass' : 'fail',
        duration: Date.now() - step7Start,
        details: `${summary.total} unfixed tracked`
      });
      console.log(`   ✅ Handler tracking ${summary.total} issues\n`);
    } catch (error: any) {
      results.push({ step: 'Unfixed Handler', status: 'fail', duration: Date.now() - step7Start, details: error.message });
    }

    // ================================================================
    // STEP 8: Test Fix Branch Generator (dry run)
    // ================================================================
    console.log('=== STEP 8: Fix Branch Generator ===');
    const step8Start = Date.now();

    try {
      const { FixBranchGenerator } = await import('../../src/two-branch/fix-branch/fix-branch-generator');
      const generator = new FixBranchGenerator({
        repoUrl: TEST_CONFIG.testRepoUrl,
        prNumber: 1,
        workingDir: testDir,
        currentBranch: 'main',
        dryRun: true
      });

      const collector = generator.getCollector();

      results.push({
        step: 'Fix Branch Generator',
        status: 'pass',
        duration: Date.now() - step8Start,
        details: 'Generator and collector ready'
      });
      console.log(`   ✅ Generator ready in ${Date.now() - step8Start}ms\n`);
    } catch (error: any) {
      results.push({ step: 'Fix Branch Generator', status: 'fail', duration: Date.now() - step8Start, details: error.message });
    }

  } finally {
    // Cleanup
    if (fs.existsSync(testDir)) {
      try { execSync(`rm -rf ${testDir}`); } catch { }
    }
  }

  // ================================================================
  // SUMMARY
  // ================================================================
  const totalDuration = Date.now() - startTime;
  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const skipped = results.filter(r => r.status === 'skip').length;

  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                    TEST SUMMARY                              ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');

  results.forEach(r => {
    const icon = r.status === 'pass' ? '✅' : r.status === 'fail' ? '❌' : '⏭️';
    const line = `${icon} ${r.step.padEnd(25)} ${(r.duration + 'ms').padStart(8)}`;
    console.log(`║ ${line.padEnd(61)}║`);
  });

  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║ PASSED: ${passed}  FAILED: ${failed}  SKIPPED: ${skipped}`.padEnd(63) + '║');
  console.log(`║ Total: ${(totalDuration / 1000).toFixed(1)}s`.padEnd(63) + '║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  if (failed > 0) {
    console.log('\n❌ SOME TESTS FAILED:');
    results.filter(r => r.status === 'fail').forEach(r => {
      console.log(`   - ${r.step}: ${r.details}`);
    });
    process.exit(1);
  } else {
    console.log('\n✅ ALL TESTS PASSED');
  }
}

runFullFlowTest().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
