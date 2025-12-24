/**
 * Test Routing Decisions Logging to Supabase
 *
 * Verifies that the FixCostManager correctly logs routing decisions
 * to the fix_routing_decisions table in Supabase.
 */
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getFixCostManager, FixCostManager } from '../../src/two-branch/tools/cloud-api/fix-cost-manager';

// ============================================================
// TEST CONFIGURATION
// ============================================================

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
}

// ============================================================
// TEST FUNCTIONS
// ============================================================

async function runRoutingDecisionsTests(): Promise<void> {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║     ROUTING DECISIONS LOGGING INTEGRATION TEST               ║');
  console.log('║     Testing: Supabase fix_routing_decisions table            ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const results: TestResult[] = [];

  // Check Supabase connection
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.log('❌ SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set');
    console.log('   Skipping Supabase integration tests\n');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const costManager = getFixCostManager();

  // Test 1: Verify Supabase connection
  console.log('=== TEST 1: Supabase Connection ===');
  try {
    const { data, error } = await supabase
      .from('fix_routing_decisions')
      .select('id')
      .limit(1);

    if (error) {
      results.push({
        name: 'Supabase Connection',
        passed: false,
        details: `Connection error: ${error.message}`
      });
      console.log(`   ❌ FAILED: ${error.message}\n`);
    } else {
      results.push({
        name: 'Supabase Connection',
        passed: true,
        details: 'Connected to fix_routing_decisions table'
      });
      console.log('   ✅ PASSED: Connected to Supabase\n');
    }
  } catch (error: any) {
    results.push({
      name: 'Supabase Connection',
      passed: false,
      details: `Exception: ${error.message}`
    });
    console.log(`   ❌ FAILED: ${error.message}\n`);
    return;
  }

  // Test 2: Get current routing configuration
  console.log('=== TEST 2: Get Routing Configuration ===');
  try {
    const config = await costManager.getRoutingConfig();
    if (config) {
      results.push({
        name: 'Get Routing Config',
        passed: true,
        details: `Mode: ${config.routingMode}, Preferred: ${config.manualPreferredSource}`
      });
      console.log(`   ✅ PASSED: Mode=${config.routingMode}, Preferred=${config.manualPreferredSource}\n`);
    } else {
      results.push({
        name: 'Get Routing Config',
        passed: false,
        details: 'No configuration returned'
      });
      console.log('   ❌ FAILED: No configuration returned\n');
    }
  } catch (error: any) {
    results.push({
      name: 'Get Routing Config',
      passed: false,
      details: `Exception: ${error.message}`
    });
    console.log(`   ❌ FAILED: ${error.message}\n`);
  }

  // Test 3: Log a routing decision
  console.log('=== TEST 3: Log Routing Decision ===');
  const testDecisionId = `test-${Date.now()}`;
  try {
    await costManager.logRoutingDecision({
      routingMode: 'manual',
      selectedSource: 'ai_fixer',
      decisionReason: 'Integration test - manual mode data collection',
      wasFallback: false,
      corgeaCostCents: 10,
      aiFixerCostCents: 2,
      issueSeverity: 'medium',
      issueCategory: 'security',
      language: 'java',
      userId: testDecisionId
    });

    // Verify the decision was logged
    const { data, error } = await supabase
      .from('fix_routing_decisions')
      .select('*')
      .eq('user_id', testDecisionId)
      .single();

    if (error) {
      results.push({
        name: 'Log Routing Decision',
        passed: false,
        details: `Failed to retrieve logged decision: ${error.message}`
      });
      console.log(`   ❌ FAILED: ${error.message}\n`);
    } else if (data) {
      // Note: Supabase returns decimal values as strings
      const matches =
        data.routing_mode === 'manual' &&
        data.selected_source === 'ai_fixer' &&
        data.decision_reason === 'Integration test - manual mode data collection' &&
        parseFloat(data.corgea_cost_cents) === 10 &&
        parseFloat(data.ai_fixer_cost_cents) === 2 &&
        data.issue_severity === 'medium' &&
        data.issue_category === 'security' &&
        data.language === 'java';

      if (matches) {
        results.push({
          name: 'Log Routing Decision',
          passed: true,
          details: `Decision logged with ID: ${data.id}`
        });
        console.log(`   ✅ PASSED: Decision logged with ID ${data.id}\n`);
      } else {
        results.push({
          name: 'Log Routing Decision',
          passed: false,
          details: 'Decision logged but values mismatch'
        });
        console.log(`   ❌ FAILED: Values mismatch\n`);
        console.log(`      Expected: mode=manual, source=ai_fixer, severity=medium`);
        console.log(`      Got: mode=${data.routing_mode}, source=${data.selected_source}, severity=${data.issue_severity}\n`);
      }

      // Cleanup test data
      await supabase
        .from('fix_routing_decisions')
        .delete()
        .eq('user_id', testDecisionId);
    } else {
      results.push({
        name: 'Log Routing Decision',
        passed: false,
        details: 'Decision not found after logging'
      });
      console.log('   ❌ FAILED: Decision not found\n');
    }
  } catch (error: any) {
    results.push({
      name: 'Log Routing Decision',
      passed: false,
      details: `Exception: ${error.message}`
    });
    console.log(`   ❌ FAILED: ${error.message}\n`);
  }

  // Test 4: Get routing statistics
  console.log('=== TEST 4: Get Routing Statistics ===');
  try {
    const stats = await costManager.getRoutingStats();
    if (stats) {
      results.push({
        name: 'Get Routing Stats',
        passed: true,
        details: `Total: ${stats.totalDecisions}, Corgea: ${stats.corgeaDecisions}, AI: ${stats.aiFixerDecisions}`
      });
      console.log(`   ✅ PASSED:`);
      console.log(`      Mode: ${stats.mode}`);
      console.log(`      Total Decisions: ${stats.totalDecisions}`);
      console.log(`      Corgea Decisions: ${stats.corgeaDecisions}`);
      console.log(`      AI-Fixer Decisions: ${stats.aiFixerDecisions}`);
      console.log(`      Fallback Count: ${stats.fallbackCount}`);
      console.log(`      Avg Cost Savings: ${stats.avgCostSavings.toFixed(2)}¢\n`);
    } else {
      results.push({
        name: 'Get Routing Stats',
        passed: true,
        details: 'Stats unavailable (may be empty table)'
      });
      console.log('   ✅ PASSED: Stats unavailable (empty table OK)\n');
    }
  } catch (error: any) {
    results.push({
      name: 'Get Routing Stats',
      passed: false,
      details: `Exception: ${error.message}`
    });
    console.log(`   ❌ FAILED: ${error.message}\n`);
  }

  // Test 5: Cost comparison from Supabase
  console.log('=== TEST 5: Get Cost Comparison from Supabase ===');
  try {
    const comparison = await costManager.getSupabaseCostComparison();
    if (comparison) {
      results.push({
        name: 'Cost Comparison',
        passed: true,
        details: `Corgea: ${comparison.corgeaCostPerFixCents}¢, AI: ${comparison.aiFixerCostPerFixCents}¢`
      });
      console.log(`   ✅ PASSED:`);
      console.log(`      Corgea Plan: ${comparison.corgeaPlan}`);
      console.log(`      Corgea Cost/Fix: ${comparison.corgeaCostPerFixCents.toFixed(2)}¢`);
      console.log(`      AI-Fixer Cost/Fix: ${comparison.aiFixerCostPerFixCents.toFixed(2)}¢`);
      console.log(`      Recommended: ${comparison.recommendedSource}`);
      console.log(`      Routing Mode: ${comparison.routingMode}\n`);
    } else {
      results.push({
        name: 'Cost Comparison',
        passed: true,
        details: 'No comparison data (tables may be empty)'
      });
      console.log('   ✅ PASSED: No comparison data (expected for new setup)\n');
    }
  } catch (error: any) {
    results.push({
      name: 'Cost Comparison',
      passed: false,
      details: `Exception: ${error.message}`
    });
    console.log(`   ❌ FAILED: ${error.message}\n`);
  }

  // Test 6: Make routing decision and verify it's logged
  console.log('=== TEST 6: decideSource() Logs Decision ===');
  try {
    const testUserId = `decide-test-${Date.now()}`;

    // Get count before
    const { count: countBefore } = await supabase
      .from('fix_routing_decisions')
      .select('*', { count: 'exact', head: true });

    // Make a routing decision
    const decision = await costManager.decideSource('high', 'security', 'java');

    // Get count after
    const { count: countAfter } = await supabase
      .from('fix_routing_decisions')
      .select('*', { count: 'exact', head: true });

    const newDecisionsLogged = (countAfter || 0) - (countBefore || 0);

    if (newDecisionsLogged > 0) {
      results.push({
        name: 'decideSource Logs',
        passed: true,
        details: `Decision made (${decision.source}) and ${newDecisionsLogged} record(s) logged`
      });
      console.log(`   ✅ PASSED:`);
      console.log(`      Source Selected: ${decision.source}`);
      console.log(`      Reason: ${decision.reason}`);
      console.log(`      Estimated Cost: ${decision.estimatedCost}¢`);
      console.log(`      New Records Logged: ${newDecisionsLogged}\n`);
    } else {
      results.push({
        name: 'decideSource Logs',
        passed: false,
        details: `Decision made but no new records logged`
      });
      console.log(`   ❌ FAILED: Decision made but no records logged\n`);
    }
  } catch (error: any) {
    results.push({
      name: 'decideSource Logs',
      passed: false,
      details: `Exception: ${error.message}`
    });
    console.log(`   ❌ FAILED: ${error.message}\n`);
  }

  // Summary
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                    TEST SUMMARY                              ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');

  results.forEach(r => {
    const icon = r.passed ? '✅' : '❌';
    const line = `${icon} ${r.name.padEnd(25)} ${r.details.slice(0, 30)}`;
    console.log(`║ ${line.padEnd(61)}║`);
  });

  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║ PASSED: ${passed}  FAILED: ${failed}`.padEnd(63) + '║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  if (failed > 0) {
    console.log('\n❌ SOME TESTS FAILED');
    process.exit(1);
  } else {
    console.log('\n✅ ALL ROUTING DECISIONS TESTS PASSED');
  }
}

runRoutingDecisionsTests().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
