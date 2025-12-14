/**
 * CodeQL Performance Comparison Test
 *
 * Compares fast (security) vs extended (security-extended) CodeQL configurations
 * on the CodeQual repository using Docker on ARM64.
 *
 * Usage:
 *   npx ts-node --transpile-only tests/integration/test-codeql-comparison.ts
 */

import * as path from 'path';
import { CodeQLRunner, runCodeQLFast, runCodeQLExtended, isCodeQLAvailable } from '../../src/two-branch/tools/universal/codeql-runner';

const TEST_WORKSPACE = path.resolve(__dirname, '../../..');  // codequal root

interface TestResult {
  mode: string;
  duration: number;
  issueCount: number;
  issuesBySeverity: Record<string, number>;
  success: boolean;
  error?: string;
}

async function runTest(mode: 'fast' | 'extended'): Promise<TestResult> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Starting CodeQL ${mode.toUpperCase()} test...`);
  console.log(`${'='.repeat(60)}\n`);

  const startTime = Date.now();

  try {
    let issues;

    if (mode === 'fast') {
      issues = await runCodeQLFast(TEST_WORKSPACE, 'typescript');
    } else {
      issues = await runCodeQLExtended(TEST_WORKSPACE, 'typescript');
    }

    const duration = (Date.now() - startTime) / 1000;

    // Count by severity
    const issuesBySeverity: Record<string, number> = {};
    for (const issue of issues) {
      issuesBySeverity[issue.severity] = (issuesBySeverity[issue.severity] || 0) + 1;
    }

    console.log(`\n✅ ${mode.toUpperCase()} test completed in ${duration.toFixed(1)}s`);
    console.log(`   Issues found: ${issues.length}`);
    console.log(`   By severity: ${JSON.stringify(issuesBySeverity)}`);

    // Show sample issues
    if (issues.length > 0) {
      console.log(`\n   Sample issues:`);
      for (const issue of issues.slice(0, 3)) {
        console.log(`   - ${issue.file}:${issue.line} [${issue.severity}] ${issue.message.substring(0, 60)}...`);
      }
    }

    return {
      mode,
      duration,
      issueCount: issues.length,
      issuesBySeverity,
      success: true
    };

  } catch (error: any) {
    const duration = (Date.now() - startTime) / 1000;
    console.log(`\n❌ ${mode.toUpperCase()} test failed after ${duration.toFixed(1)}s`);
    console.log(`   Error: ${error.message}`);

    return {
      mode,
      duration,
      issueCount: 0,
      issuesBySeverity: {},
      success: false,
      error: error.message
    };
  }
}

async function main() {
  console.log('═'.repeat(60));
  console.log('CodeQL Performance Comparison Test');
  console.log('═'.repeat(60));
  console.log(`\nWorkspace: ${TEST_WORKSPACE}`);
  console.log(`Language: TypeScript`);

  // Check if CodeQL is available
  console.log('\nChecking CodeQL availability...');
  const available = await isCodeQLAvailable();

  if (!available) {
    console.error('❌ CodeQL not available. On ARM64, ensure Docker image exists.');
    console.error('   Run: docker images | grep codeql-runner');
    process.exit(1);
  }

  console.log('✅ CodeQL is available');

  // Run fast test
  const fastResult = await runTest('fast');

  // Run extended test
  const extendedResult = await runTest('extended');

  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log('COMPARISON SUMMARY');
  console.log('═'.repeat(60));

  console.log(`\n                    FAST         EXTENDED`);
  console.log(`Duration:           ${fastResult.duration.toFixed(1)}s         ${extendedResult.duration.toFixed(1)}s`);
  console.log(`Issues Found:       ${fastResult.issueCount}            ${extendedResult.issueCount}`);
  console.log(`Success:            ${fastResult.success ? '✅' : '❌'}            ${extendedResult.success ? '✅' : '❌'}`);

  if (fastResult.success && extendedResult.success) {
    const timeDiff = extendedResult.duration - fastResult.duration;
    const issueDiff = extendedResult.issueCount - fastResult.issueCount;

    console.log(`\nAnalysis:`);
    console.log(`- Extended is ${(timeDiff / fastResult.duration * 100).toFixed(0)}% slower (${timeDiff.toFixed(1)}s more)`);
    console.log(`- Extended found ${issueDiff >= 0 ? '+' : ''}${issueDiff} issues`);

    if (issueDiff > 0) {
      console.log(`- Extended provides ${((issueDiff / Math.max(fastResult.issueCount, 1)) * 100).toFixed(0)}% more coverage`);
    }
  }

  console.log('\n' + '═'.repeat(60));
}

main().catch(console.error);
