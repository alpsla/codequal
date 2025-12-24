/**
 * Test Performance Tools Integration
 *
 * Verifies that the static performance analysis tools work correctly
 * for Python, Java, and Go languages.
 */

import * as path from 'path';
import * as fs from 'fs';

const TEST_DIR = '/tmp/perf-test';

async function testPythonPerformance(): Promise<{ success: boolean; issues: number; details: string[] }> {
  console.log('\n📦 Testing Python Performance Runner...');

  try {
    const { PythonPerformanceRunner } = await import('../../src/two-branch/tools/python/performance-runner');
    const runner = new PythonPerformanceRunner();

    const issues = await runner.runAll(path.join(TEST_DIR, 'python'));

    const details = issues.map(i => `  - [${i.rule}] ${i.file}:${i.line} - ${i.message.substring(0, 60)}...`);

    console.log(`   Found ${issues.length} performance issues`);
    details.slice(0, 5).forEach(d => console.log(d));
    if (details.length > 5) {
      console.log(`   ... and ${details.length - 5} more`);
    }

    return {
      success: issues.length > 0,
      issues: issues.length,
      details
    };
  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`);
    return { success: false, issues: 0, details: [error.message] };
  }
}

async function testJavaPerformance(): Promise<{ success: boolean; issues: number; details: string[] }> {
  console.log('\n📦 Testing Java Performance Runner...');

  try {
    const { JavaPerformanceRunner } = await import('../../src/two-branch/tools/java/performance-runner');
    const runner = new JavaPerformanceRunner();

    const issues = await runner.runAll(path.join(TEST_DIR, 'java'));

    const details = issues.map(i => `  - [${i.rule}] ${i.file}:${i.line} - ${i.message.substring(0, 60)}...`);

    console.log(`   Found ${issues.length} performance issues`);
    details.slice(0, 5).forEach(d => console.log(d));
    if (details.length > 5) {
      console.log(`   ... and ${details.length - 5} more`);
    }

    return {
      success: issues.length > 0,
      issues: issues.length,
      details
    };
  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`);
    return { success: false, issues: 0, details: [error.message] };
  }
}

async function testGoPerformance(): Promise<{ success: boolean; issues: number; details: string[] }> {
  console.log('\n📦 Testing Go Performance Runner...');

  try {
    const { GoPerformanceRunner } = await import('../../src/two-branch/tools/go/performance-runner');
    const runner = new GoPerformanceRunner();

    const issues = await runner.runAll(path.join(TEST_DIR, 'go'));

    const details = issues.map(i => `  - [${i.rule}] ${i.file}:${i.line} - ${i.message.substring(0, 60)}...`);

    console.log(`   Found ${issues.length} performance issues`);
    details.slice(0, 5).forEach(d => console.log(d));
    if (details.length > 5) {
      console.log(`   ... and ${details.length - 5} more`);
    }

    return {
      success: issues.length > 0,
      issues: issues.length,
      details
    };
  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`);
    return { success: false, issues: 0, details: [error.message] };
  }
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║     PERFORMANCE TOOLS INTEGRATION TEST                       ║');
  console.log('║                                                              ║');
  console.log('║  Testing static performance analysis for:                    ║');
  console.log('║  - Python: Ruff PERF, Radon, memory patterns                 ║');
  console.log('║  - Java: PMD Perf, memory patterns                           ║');
  console.log('║  - Go: staticcheck, golangci-lint, memory patterns           ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  // Verify test files exist
  if (!fs.existsSync(path.join(TEST_DIR, 'python', 'perf_issues.py'))) {
    console.error('❌ Test files not found. Please run the file creation first.');
    process.exit(1);
  }

  const results: Record<string, { success: boolean; issues: number }> = {};

  // Test Python
  const pythonResult = await testPythonPerformance();
  results['Python'] = pythonResult;

  // Test Java
  const javaResult = await testJavaPerformance();
  results['Java'] = javaResult;

  // Test Go
  const goResult = await testGoPerformance();
  results['Go'] = goResult;

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('                    TEST SUMMARY');
  console.log('='.repeat(60));

  let allPassed = true;
  for (const [lang, result] of Object.entries(results)) {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${lang}: ${result.issues} issues found`);
    if (!result.success) allPassed = false;
  }

  console.log('='.repeat(60));

  if (allPassed) {
    console.log('🎉 ALL TESTS PASSED: Performance tools integration verified!');
  } else {
    console.log('⚠️  SOME TESTS FAILED: Check output above for details');
    console.log('   Note: Some tools may not be installed (Ruff, PMD, staticcheck)');
    console.log('   Memory pattern detection should still find issues.');
  }

  console.log('='.repeat(60));
}

main().catch(console.error);
