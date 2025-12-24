/**
 * Fix Verifier Re-Scan Integration Test
 *
 * Tests that the FixVerifier correctly:
 * 1. Re-scans fixed files
 * 2. Detects resolved issues
 * 3. Detects regressions (new issues)
 * 4. Correctly marks fixes as verified/failed
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { FixVerifier, ToolScannerCallback } from '../../src/two-branch/fix-branch/fix-verifier';
import { CategorizedFix, FixTier, FixConfidenceCategory } from '../../src/two-branch/fix-branch/fix-categorizer';

// ============================================================
// TEST CONFIGURATION
// ============================================================

interface TestCase {
  name: string;
  description: string;
  fix: CategorizedFix;
  scannerReturns: Array<{
    ruleId: string;
    line: number;
    message: string;
    severity: string;
  }>;
  expectedVerified: boolean;
  expectedIssueResolved: boolean;
  expectedRegressionsFound: boolean;
}

// ============================================================
// MOCK SCANNER IMPLEMENTATION
// ============================================================

function createMockScanner(
  returnValues: Map<string, Array<{
    ruleId: string;
    line: number;
    message: string;
    severity: string;
  }>>
): ToolScannerCallback {
  return async (tool: string, file: string, workingDir: string) => {
    const key = `${file}::${tool}`;
    return returnValues.get(key) || [];
  };
}

// ============================================================
// TEST CASES
// ============================================================

// Helper function to create CategorizedFix objects
function createFix(overrides: Partial<CategorizedFix> & { ruleId: string; file: string; line: number; tool: string }): CategorizedFix {
  return {
    id: `fix-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    tier: 'tier3_pattern' as FixTier,
    originalCode: 'original code here',
    fixedCode: 'fixed code here',
    explanation: 'Fix explanation',
    confidence: 90,
    category: 'security',
    severity: 'high',
    confidenceCategory: FixConfidenceCategory.AUTO_APPLY,
    needsReview: false,
    ...overrides
  };
}

const TEST_CASES: TestCase[] = [
  {
    name: 'Successful Fix - Issue Resolved',
    description: 'Fix resolved the issue and no regressions',
    fix: createFix({
      ruleId: 'java.lang.security.audit.sqli.tainted-sql-string',
      file: 'src/UserService.java',
      line: 25,
      tool: 'semgrep',
      fixedCode: 'PreparedStatement ps = conn.prepareStatement("SELECT * FROM users WHERE id = ?");',
      category: 'security',
      severity: 'high',
      confidence: 90
    }),
    scannerReturns: [], // No issues found after fix
    expectedVerified: true,
    expectedIssueResolved: true,
    expectedRegressionsFound: false
  },
  {
    name: 'Failed Fix - Issue Still Present',
    description: 'The original issue is still detected after the fix',
    fix: createFix({
      ruleId: 'java.lang.security.audit.sqli.tainted-sql-string',
      file: 'src/UserService.java',
      line: 25,
      tool: 'semgrep',
      category: 'security',
      severity: 'high',
      confidence: 90
    }),
    scannerReturns: [
      {
        ruleId: 'java.lang.security.audit.sqli.tainted-sql-string',
        line: 25,
        message: 'SQL Injection vulnerability',
        severity: 'high'
      }
    ],
    expectedVerified: false,
    expectedIssueResolved: false,
    expectedRegressionsFound: false
  },
  {
    name: 'Fix With Regression - New Issue Introduced',
    description: 'Fix resolved original issue but introduced a new one',
    fix: createFix({
      ruleId: 'java.lang.security.audit.sqli.tainted-sql-string',
      file: 'src/UserService.java',
      line: 25,
      tool: 'semgrep',
      category: 'security',
      severity: 'high',
      confidence: 90
    }),
    scannerReturns: [
      {
        ruleId: 'java.lang.security.hardcoded-credentials',
        line: 27, // Near the fix line
        message: 'Hardcoded password detected',
        severity: 'medium'
      }
    ],
    expectedVerified: false,
    expectedIssueResolved: true,
    expectedRegressionsFound: true
  },
  {
    name: 'Line Drift - Issue Resolved at Different Line',
    description: 'Original issue at line 25, scanner shows line 24 is clean',
    fix: createFix({
      ruleId: 'pmd.EmptyCatchBlock',
      file: 'src/ExceptionHandler.java',
      line: 50,
      tool: 'pmd',
      category: 'quality',
      severity: 'medium',
      confidence: 80
    }),
    scannerReturns: [], // Issue resolved
    expectedVerified: true,
    expectedIssueResolved: true,
    expectedRegressionsFound: false
  },
  {
    name: 'Minor Regression Allowed',
    description: 'Fix resolved issue but introduced minor formatting issue (allowed)',
    fix: createFix({
      ruleId: 'java.lang.security.audit.sqli.tainted-sql-string',
      file: 'src/UserService.java',
      line: 25,
      tool: 'semgrep',
      category: 'security',
      severity: 'high',
      confidence: 90
    }),
    scannerReturns: [
      {
        ruleId: 'indent', // Minor rule
        line: 26,
        message: 'Incorrect indentation',
        severity: 'low'
      }
    ],
    expectedVerified: true, // Minor regressions allowed
    expectedIssueResolved: true,
    expectedRegressionsFound: false
  }
];

// ============================================================
// TEST RUNNER
// ============================================================

async function runFixVerifierTests(): Promise<void> {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║         FIX VERIFIER RE-SCAN INTEGRATION TEST                ║');
  console.log('║         Testing: Issue Resolution & Regression Detection     ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  let passed = 0;
  let failed = 0;

  for (const testCase of TEST_CASES) {
    console.log(`\n=== TEST: ${testCase.name} ===`);
    console.log(`Description: ${testCase.description}`);

    try {
      // Set up mock scanner
      const scannerReturns = new Map<string, typeof testCase.scannerReturns>();
      const key = `${testCase.fix.file}::${testCase.fix.tool}`;
      scannerReturns.set(key, testCase.scannerReturns);

      // Create verifier with allowMinorRegressions for the minor test
      const verifier = new FixVerifier({
        workingDir: '/tmp/test-verifier',
        allowMinorRegressions: testCase.name.includes('Minor')
      });
      verifier.registerScanner(createMockScanner(scannerReturns));

      // Run verification
      const result = await verifier.verifyBatch([testCase.fix]);

      // Check results
      const verificationResult = result.results[0];

      const verifiedMatch = verificationResult.verified === testCase.expectedVerified;
      const resolvedMatch = verificationResult.issueResolved === testCase.expectedIssueResolved;
      const regressionsMatch = verificationResult.regressionsFound === testCase.expectedRegressionsFound;

      const allPassed = verifiedMatch && resolvedMatch && regressionsMatch;

      if (allPassed) {
        console.log(`   ✅ PASSED`);
        console.log(`      Verified: ${verificationResult.verified} (expected: ${testCase.expectedVerified})`);
        console.log(`      Issue Resolved: ${verificationResult.issueResolved} (expected: ${testCase.expectedIssueResolved})`);
        console.log(`      Regressions: ${verificationResult.regressionsFound} (expected: ${testCase.expectedRegressionsFound})`);
        passed++;
      } else {
        console.log(`   ❌ FAILED`);
        console.log(`      Verified: ${verificationResult.verified} (expected: ${testCase.expectedVerified}) ${verifiedMatch ? '✓' : '✗'}`);
        console.log(`      Issue Resolved: ${verificationResult.issueResolved} (expected: ${testCase.expectedIssueResolved}) ${resolvedMatch ? '✓' : '✗'}`);
        console.log(`      Regressions: ${verificationResult.regressionsFound} (expected: ${testCase.expectedRegressionsFound}) ${regressionsMatch ? '✓' : '✗'}`);
        if (verificationResult.newIssues && verificationResult.newIssues.length > 0) {
          console.log(`      New Issues: ${JSON.stringify(verificationResult.newIssues)}`);
        }
        failed++;
      }
    } catch (error: any) {
      console.log(`   ❌ ERROR: ${error.message}`);
      failed++;
    }
  }

  // Test batch verification
  console.log('\n\n=== BATCH VERIFICATION TEST ===');
  try {
    const scannerReturns = new Map<string, Array<{
      ruleId: string;
      line: number;
      message: string;
      severity: string;
    }>>();

    // Set up mixed results
    scannerReturns.set('src/File1.java::semgrep', []); // Resolved
    scannerReturns.set('src/File2.java::pmd', [
      { ruleId: 'pmd.EmptyCatchBlock', line: 10, message: 'Empty catch', severity: 'medium' }
    ]); // Not resolved
    scannerReturns.set('src/File3.java::semgrep', []); // Resolved

    const batchFixes: CategorizedFix[] = [
      createFix({ ruleId: 'sqli', file: 'src/File1.java', line: 25, tool: 'semgrep', category: 'security', severity: 'high', confidence: 90 }),
      createFix({ ruleId: 'pmd.EmptyCatchBlock', file: 'src/File2.java', line: 10, tool: 'pmd', category: 'quality', severity: 'medium', confidence: 80 }),
      createFix({ ruleId: 'xss', file: 'src/File3.java', line: 50, tool: 'semgrep', category: 'security', severity: 'high', confidence: 90 })
    ];

    const verifier = new FixVerifier({ workingDir: '/tmp/test-verifier' });
    verifier.registerScanner(createMockScanner(scannerReturns));

    const result = await verifier.verifyBatch(batchFixes);

    const batchPassed =
      result.summary.totalVerified === 3 &&
      result.summary.passed === 2 &&
      result.summary.failed === 1 &&
      result.verifiedFixes.length === 2 &&
      result.failedFixes.length === 1;

    if (batchPassed) {
      console.log('   ✅ PASSED');
      console.log(`      Total: ${result.summary.totalVerified}`);
      console.log(`      Passed: ${result.summary.passed}`);
      console.log(`      Failed: ${result.summary.failed}`);
      console.log(`      Regressions: ${result.summary.regressions}`);
      console.log(`      Time: ${result.summary.totalTime}ms`);
      passed++;
    } else {
      console.log('   ❌ FAILED');
      console.log(`      Summary: ${JSON.stringify(result.summary)}`);
      failed++;
    }
  } catch (error: any) {
    console.log(`   ❌ ERROR: ${error.message}`);
    failed++;
  }

  // Summary
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║                    TEST SUMMARY                              ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║ PASSED: ${passed}  FAILED: ${failed}`.padEnd(63) + '║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('\n✅ ALL FIX VERIFIER TESTS PASSED');
  }
}

runFixVerifierTests().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
