#!/usr/bin/env ts-node

/**
 * Automated test runner for CodeQual system
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { spawn } from 'child_process';
import type { ChildProcess } from 'child_process';
import * as fs from 'fs/promises';

// Load environment variables
config({ path: resolve(__dirname, '../../.env') });

interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
}

const tests = [
  {
    name: 'System Health Check',
    script: 'test-system-health.ts',
    critical: true
  },
  {
    name: 'DeepWiki Integration',
    script: 'test-deepwiki-integration.ts',
    critical: false
  },
  {
    name: 'Check DeepWiki Config',
    script: 'check-deepwiki-config.ts',
    critical: false
  },
  {
    name: 'Test Analysis with Embeddings',
    script: 'test-analysis-with-embeddings.ts',
    critical: false
  },
  {
    name: 'Test Embedding Adapter',
    script: 'test-embedding-adapter.ts',
    critical: false
  }
];

async function runTest(testConfig: typeof tests[0]): Promise<TestResult> {
  const startTime = Date.now();
  const scriptPath = resolve(__dirname, testConfig.script);
  
  // Check if script exists
  try {
    await fs.access(scriptPath);
  } catch {
    return {
      name: testConfig.name,
      status: 'skipped',
      duration: 0,
      error: 'Script not found'
    };
  }
  
  return new Promise((resolvePromise) => {
    const child = spawn('npx', ['ts-node', scriptPath], {
      cwd: resolve(__dirname, '../..'),
      env: process.env,
      stdio: 'pipe'
    });
    
    let output = '';
    let errorOutput = '';
    
    child.stdout?.on('data', (data: Buffer) => {
      output += data.toString();
    });
    
    child.stderr?.on('data', (data: Buffer) => {
      errorOutput += data.toString();
    });
    
    child.on('close', (code: number | null) => {
      const duration = Date.now() - startTime;
      
      if (code === 0) {
        resolvePromise({
          name: testConfig.name,
          status: 'passed',
          duration
        });
      } else {
        resolvePromise({
          name: testConfig.name,
          status: 'failed',
          duration,
          error: errorOutput || output || `Exit code: ${code}`
        });
      }
    });
    
    // Timeout after 30 seconds
    setTimeout(() => {
      child.kill();
      resolvePromise({
        name: testConfig.name,
        status: 'failed',
        duration: 30000,
        error: 'Test timeout'
      });
    }, 30000);
  });
}

async function main() {
  console.log('🧪 CodeQual Automated Test Suite\n');
  console.log(`Running ${tests.length} test suites...\n`);
  
  const results: TestResult[] = [];
  let criticalFailure = false;
  
  for (const test of tests) {
    process.stdout.write(`Running ${test.name}... `);
    const result = await runTest(test);
    results.push(result);
    
    if (result.status === 'passed') {
      console.log(`✅ PASSED (${(result.duration / 1000).toFixed(2)}s)`);
    } else if (result.status === 'skipped') {
      console.log(`⏭️  SKIPPED`);
    } else {
      console.log(`❌ FAILED (${(result.duration / 1000).toFixed(2)}s)`);
      if (test.critical) {
        criticalFailure = true;
      }
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('TEST SUMMARY');
  console.log('='.repeat(50) + '\n');
  
  const passed = results.filter(r => r.status === 'passed').length;
  const failed = results.filter(r => r.status === 'failed').length;
  const skipped = results.filter(r => r.status === 'skipped').length;
  
  console.log(`Total Tests: ${results.length}`);
  console.log(`Passed: ${passed} 🟢`);
  console.log(`Failed: ${failed} 🔴`);
  console.log(`Skipped: ${skipped} 🟡`);
  console.log(`Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  
  // Show failures
  if (failed > 0) {
    console.log('\nFailed Tests:');
    results
      .filter(r => r.status === 'failed')
      .forEach(r => {
        console.log(`\n❌ ${r.name}`);
        if (r.error) {
          console.log(`   Error: ${r.error.split('\n')[0]}`);
        }
      });
  }
  
  // Generate report
  const reportPath = resolve(__dirname, '../../test-report.json');
  await fs.writeFile(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    results,
    summary: {
      total: results.length,
      passed,
      failed,
      skipped,
      successRate: (passed / (passed + failed)) * 100,
      criticalFailure
    }
  }, null, 2));
  
  console.log(`\nDetailed report saved to: ${reportPath}`);
  
  // Exit code
  if (criticalFailure) {
    console.log('\n⚠️  Critical test failure detected!');
    process.exit(1);
  } else if (failed > 0) {
    console.log('\n⚠️  Some tests failed');
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed!');
    process.exit(0);
  }
}

// Run tests
main().catch(error => {
  console.error('\n💥 Test runner failed:', error);
  process.exit(1);
});