/**
 * Corgea Integration Test
 *
 * Tests the Corgea AI Fixer integration:
 * - SARIF conversion
 * - API health check
 * - Fix generation (if API key is available)
 * - Subscription tier gating
 *
 * Run with:
 *   npx ts-node tests/integration/cloud-api/test-corgea-integration.ts
 *
 * For full API test, set CORGEA_API_KEY environment variable.
 *
 * @since Session 60
 */

import {
  CorgeaFixer,
  createCorgeaFixer,
  isCorgeaEnabled
} from '../../../src/two-branch/tools/cloud-api/corgea-fixer';

import {
  CloudAPIOrchestrator,
  getCloudAPIOrchestrator,
  executeCloudFixers,
  canCloudFixersHelp,
  SubscriptionTier
} from '../../../src/two-branch/tools/cloud-api/api-tool-orchestrator';

import {
  convertToSARIF,
  parseSARIF,
  SARIFReport
} from '../../../src/two-branch/tools/cloud-api/sarif-converter';

import { Issue } from '../../../src/two-branch/analyzers/v9-types';

// ============================================================
// TEST DATA
// ============================================================

const TEST_ISSUES: Issue[] = [
  {
    id: 'test-1',
    tool: 'semgrep',
    rule: 'javascript.express.security.audit.xss.direct-response-write',
    ruleId: 'javascript.express.security.audit.xss.direct-response-write',
    ruleName: 'Direct Response Write',
    severity: 'high',
    message: 'Detected direct write to response without proper encoding, which could lead to XSS.',
    file: 'src/api/handler.js',
    path: 'src/api/handler.js',
    line: 42,
    startLine: 42,
    column: 5,
    startColumn: 5,
    category: 'security',
    cwe: ['CWE-79'],
    owasp: ['A03:2021'],
    snippet: 'res.send(userInput);'
  },
  {
    id: 'test-2',
    tool: 'semgrep',
    rule: 'python.lang.security.audit.eval-used',
    ruleId: 'python.lang.security.audit.eval-used',
    ruleName: 'Eval Used',
    severity: 'critical',
    message: 'Use of eval() detected. This can lead to arbitrary code execution.',
    file: 'src/utils/parser.py',
    path: 'src/utils/parser.py',
    line: 15,
    startLine: 15,
    column: 1,
    startColumn: 1,
    category: 'security',
    cwe: ['CWE-95'],
    snippet: 'result = eval(user_expression)'
  },
  {
    id: 'test-3',
    tool: 'eslint',
    rule: 'no-unused-vars',
    ruleId: 'no-unused-vars',
    ruleName: 'No Unused Variables',
    severity: 'low',
    message: "'unusedVar' is defined but never used.",
    file: 'src/components/Button.tsx',
    path: 'src/components/Button.tsx',
    line: 8,
    startLine: 8,
    column: 7,
    startColumn: 7,
    category: 'code_quality'
  }
];

// ============================================================
// TEST FUNCTIONS
// ============================================================

async function testSARIFConversion(): Promise<boolean> {
  console.log('\n🧪 Test 1: SARIF Conversion');
  console.log('─'.repeat(50));

  try {
    // Convert issues to SARIF
    const sarif = convertToSARIF(TEST_ISSUES, {
      toolName: 'CodeQual',
      includeSnippets: true,
      includeMetadata: true
    });

    // Validate SARIF structure
    if (sarif.version !== '2.1.0') {
      console.log('❌ Invalid SARIF version');
      return false;
    }

    if (!sarif.runs || sarif.runs.length === 0) {
      console.log('❌ No runs in SARIF output');
      return false;
    }

    // Count results
    let totalResults = 0;
    for (const run of sarif.runs) {
      totalResults += run.results.length;
      console.log(`   Tool: ${run.tool.driver.name}, Results: ${run.results.length}`);
    }

    if (totalResults !== TEST_ISSUES.length) {
      console.log(`❌ Result count mismatch: ${totalResults} vs ${TEST_ISSUES.length}`);
      return false;
    }

    // Test round-trip (SARIF -> Issues)
    const parsedIssues = parseSARIF(sarif);
    if (parsedIssues.length !== TEST_ISSUES.length) {
      console.log(`❌ Round-trip count mismatch: ${parsedIssues.length} vs ${TEST_ISSUES.length}`);
      return false;
    }

    console.log(`✅ SARIF conversion successful (${totalResults} issues, ${sarif.runs.length} runs)`);
    console.log(`   Round-trip verified: ${parsedIssues.length} issues parsed back`);
    return true;

  } catch (error) {
    console.log(`❌ SARIF conversion failed: ${(error as Error).message}`);
    return false;
  }
}

async function testTierGating(): Promise<boolean> {
  console.log('\n🧪 Test 2: Subscription Tier Gating');
  console.log('─'.repeat(50));

  try {
    // Test BASIC tier - should not have cloud fixers
    const basicResult = canCloudFixersHelp(TEST_ISSUES, 'basic');
    if (basicResult.canHelp) {
      console.log('❌ BASIC tier should not have cloud fixers');
      return false;
    }
    console.log(`   BASIC tier: ${basicResult.reason}`);

    // Test PRO tier - should have cloud fixers (if configured)
    const proResult = canCloudFixersHelp(TEST_ISSUES, 'pro');
    if (isCorgeaEnabled()) {
      if (!proResult.canHelp) {
        console.log(`⚠️  PRO tier configured but can't help: ${proResult.reason}`);
      } else {
        console.log(`   PRO tier: ${proResult.reason} (${proResult.potentialFixes} potential fixes)`);
      }
    } else {
      console.log(`   PRO tier: Cloud fixers not configured (${proResult.reason})`);
    }

    // Test ENTERPRISE tier
    const enterpriseResult = canCloudFixersHelp(TEST_ISSUES, 'enterprise');
    console.log(`   ENTERPRISE tier: ${enterpriseResult.reason}`);

    console.log('✅ Tier gating logic working correctly');
    return true;

  } catch (error) {
    console.log(`❌ Tier gating test failed: ${(error as Error).message}`);
    return false;
  }
}

async function testOrchestratorSkipLogic(): Promise<boolean> {
  console.log('\n🧪 Test 3: Orchestrator Skip Logic');
  console.log('─'.repeat(50));

  try {
    const orchestrator = getCloudAPIOrchestrator();

    // Test with BASIC tier - should skip
    const basicResult = await orchestrator.execute({
      tier: 'basic',
      issues: TEST_ISSUES,
      language: 'javascript'
    });

    if (basicResult.executed) {
      console.log('❌ Should not execute for BASIC tier');
      return false;
    }
    console.log(`   BASIC tier skipped: ${basicResult.skipReason}`);

    // Test with empty issues - should skip
    const emptyResult = await orchestrator.execute({
      tier: 'pro',
      issues: [],
      language: 'javascript'
    });

    if (emptyResult.executed) {
      console.log('❌ Should not execute for empty issues');
      return false;
    }
    console.log(`   Empty issues skipped: ${emptyResult.skipReason}`);

    // Test with explicit skip
    const skipResult = await orchestrator.execute({
      tier: 'pro',
      issues: TEST_ISSUES,
      language: 'javascript',
      skipCloudTools: true
    });

    if (skipResult.executed) {
      console.log('❌ Should not execute when explicitly skipped');
      return false;
    }
    console.log(`   Explicit skip: ${skipResult.skipReason}`);

    console.log('✅ Orchestrator skip logic working correctly');
    return true;

  } catch (error) {
    console.log(`❌ Orchestrator skip test failed: ${(error as Error).message}`);
    return false;
  }
}

async function testCorgeaHealthCheck(): Promise<boolean> {
  console.log('\n🧪 Test 4: Corgea Health Check');
  console.log('─'.repeat(50));

  if (!isCorgeaEnabled()) {
    console.log('⏭️  Skipped: CORGEA_API_KEY not set');
    console.log('   To run this test, set CORGEA_API_KEY environment variable');
    return true; // Not a failure, just skipped
  }

  try {
    const fixer = createCorgeaFixer();
    if (!fixer) {
      console.log('❌ Failed to create Corgea fixer');
      return false;
    }

    const healthy = await fixer.checkHealth();
    if (healthy) {
      console.log('✅ Corgea API is healthy and credentials are valid');
    } else {
      console.log('❌ Corgea API health check failed');
      return false;
    }

    // Get rate limit info
    const rateLimitInfo = await fixer.getRateLimitStatus();
    console.log(`   Rate limit: ${rateLimitInfo.remaining}/${rateLimitInfo.limit} remaining`);

    return true;

  } catch (error) {
    console.log(`❌ Corgea health check failed: ${(error as Error).message}`);
    return false;
  }
}

async function testCorgeaFixGeneration(): Promise<boolean> {
  console.log('\n🧪 Test 5: Corgea Fix Generation');
  console.log('─'.repeat(50));

  if (!isCorgeaEnabled()) {
    console.log('⏭️  Skipped: CORGEA_API_KEY not set');
    return true; // Not a failure, just skipped
  }

  try {
    const fixer = createCorgeaFixer();
    if (!fixer) {
      console.log('❌ Failed to create Corgea fixer');
      return false;
    }

    console.log('   Submitting 3 test issues to Corgea...');
    console.log('   (This may take 30-120 seconds)');

    const startTime = Date.now();
    const result = await fixer.execute({
      issues: TEST_ISSUES,
      language: 'javascript',
      minSeverity: 'medium', // Skip low severity
      maxFixes: 5 // Limit for testing
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    if (result.success) {
      console.log(`✅ Fix generation completed in ${duration}s`);
      console.log(`   Generated ${result.fixes?.length || 0} fixes`);

      if (result.fixes && result.fixes.length > 0) {
        for (const fix of result.fixes) {
          console.log(`   - ${fix.file}:${fix.line} (confidence: ${fix.confidence}%)`);
        }
      }
    } else {
      console.log(`❌ Fix generation failed: ${result.error}`);
      return false;
    }

    return true;

  } catch (error) {
    console.log(`❌ Fix generation test failed: ${(error as Error).message}`);
    return false;
  }
}

// ============================================================
// MAIN TEST RUNNER
// ============================================================

async function runTests(): Promise<void> {
  console.log('═'.repeat(60));
  console.log(' CORGEA INTEGRATION TEST - Session 60');
  console.log('═'.repeat(60));
  console.log(`\nCorgea Configured: ${isCorgeaEnabled() ? 'YES' : 'NO'}`);

  const results: { name: string; passed: boolean }[] = [];

  // Run all tests
  results.push({ name: 'SARIF Conversion', passed: await testSARIFConversion() });
  results.push({ name: 'Tier Gating', passed: await testTierGating() });
  results.push({ name: 'Orchestrator Skip Logic', passed: await testOrchestratorSkipLogic() });
  results.push({ name: 'Corgea Health Check', passed: await testCorgeaHealthCheck() });

  // Only run fix generation if explicitly requested (takes time)
  if (process.env.RUN_FULL_TESTS === 'true') {
    results.push({ name: 'Corgea Fix Generation', passed: await testCorgeaFixGeneration() });
  } else {
    console.log('\n⏭️  Test 5: Corgea Fix Generation - Skipped (set RUN_FULL_TESTS=true to run)');
  }

  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log(' TEST SUMMARY');
  console.log('═'.repeat(60));

  let passed = 0;
  let failed = 0;

  for (const result of results) {
    const status = result.passed ? '✅' : '❌';
    console.log(`${status} ${result.name}`);
    if (result.passed) passed++;
    else failed++;
  }

  console.log('\n' + '─'.repeat(60));
  console.log(`Total: ${passed} passed, ${failed} failed`);
  console.log('═'.repeat(60));

  if (failed > 0) {
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('Test runner failed:', error);
  process.exit(1);
});
