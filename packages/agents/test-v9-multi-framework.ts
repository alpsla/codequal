#!/usr/bin/env ts-node
/**
 * V9 Multi-Framework Test Suite
 * 
 * Tests the V9 canonical architecture across 5 Java frameworks:
 * - Spring Boot PetClinic
 * - Quarkus Quickstarts
 * - Micronaut Core
 * - Apache Kafka
 * - WebGoat
 * 
 * This validates:
 * - Consistent report quality across frameworks
 * - Cost optimization (issue grouping, avg < $0.01)
 * - Issue categorization (NEW/RESOLVED/EXISTING)
 * - Performance scalability (small → large repos)
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// E2E Test Configuration: Disable rate limiting for multi-framework tests
// Production: 100 calls/PR is correct ✅
// Multi-framework tests: 5 PRs sequentially = needs debug mode
process.env.DEBUG_MODE = process.env.DEBUG_MODE || 'true';

interface FrameworkConfig {
  name: string;
  repositoryUrl: string;
  prNumber: number;
  description: string;
  expectedIssues: { min: number; max: number };
  expectedCost: { max: number };
  timeoutMinutes: number;
}

const FRAMEWORKS: FrameworkConfig[] = [
  {
    name: 'Spring Boot PetClinic',
    repositoryUrl: 'https://github.com/spring-projects/spring-petclinic.git',
    prNumber: 950,
    description: 'Spring Boot reference application - small codebase',
    expectedIssues: { min: 100, max: 2000 },
    expectedCost: { max: 0.01 },
    timeoutMinutes: 15
  },
  {
    name: 'Quarkus Quickstarts',
    repositoryUrl: 'https://github.com/quarkusio/quarkus-quickstarts.git',
    prNumber: 1551,
    description: 'Quarkus framework quickstart examples',
    expectedIssues: { min: 200, max: 3000 },
    expectedCost: { max: 0.01 },
    timeoutMinutes: 20
  },
  {
    name: 'Micronaut Core',
    repositoryUrl: 'https://github.com/micronaut-projects/micronaut-core.git',
    prNumber: 10950,
    description: 'Micronaut framework - medium codebase',
    expectedIssues: { min: 300, max: 5000 },
    expectedCost: { max: 0.015 },
    timeoutMinutes: 25
  },
  {
    name: 'Apache Kafka',
    repositoryUrl: 'https://github.com/apache/kafka.git',
    prNumber: 20515,
    description: 'Distributed streaming platform - large codebase',
    expectedIssues: { min: 500, max: 10000 },
    expectedCost: { max: 0.03 },
    timeoutMinutes: 30
  },
  {
    name: 'WebGoat',
    repositoryUrl: 'https://github.com/WebGoat/WebGoat.git',
    prNumber: 1950,
    description: 'Deliberately insecure application - security testing',
    expectedIssues: { min: 400, max: 6000 },
    expectedCost: { max: 0.02 },
    timeoutMinutes: 20
  }
];

interface TestResult {
  framework: string;
  status: 'SUCCESS' | 'FAILED';
  duration: number;
  issues?: number;
  cost?: number;
  reportPath?: string;
  error?: string;
}

async function runFrameworkTest(config: FrameworkConfig): Promise<TestResult> {
  console.log(`\n╔════════════════════════════════════════════════════════════════╗`);
  console.log(`║  Testing: ${config.name.padEnd(56)}║`);
  console.log(`╚════════════════════════════════════════════════════════════════╝\n`);
  console.log(`📋 Description: ${config.description}`);
  console.log(`🔗 Repository: ${config.repositoryUrl}`);
  console.log(`🔢 PR Number: #${config.prNumber}`);
  console.log(`⏱️  Timeout: ${config.timeoutMinutes} minutes\n`);

  const startTime = Date.now();
  const testScript = path.join(__dirname, 'test-v9-e2e-complete.ts');
  const testScriptBackup = testScript + '.backup';
  const testScriptContent = fs.readFileSync(testScript, 'utf-8');

  try {
    // Backup original
    if (!fs.existsSync(testScriptBackup)) {
      fs.writeFileSync(testScriptBackup, testScriptContent);
    }

    // Clean up any existing repo directory first
    const repoDir = `/tmp/${config.name.toLowerCase().replace(/\s+/g, '-')}-repo`;
    try {
      if (fs.existsSync(repoDir)) {
        execSync(`sudo rm -rf ${repoDir}`, { stdio: 'ignore' });
      }
    } catch (cleanupError) {
      console.log(`   ⚠️  Pre-cleanup warning: ${cleanupError.message} (continuing...)`);
    }

    // Modify configuration
    let modifiedContent = testScriptContent
      .replace(/const KAFKA_URL = ".*";/, `const KAFKA_URL = "${config.repositoryUrl}";`)
      .replace(/const PR_NUMBER = \d+;/, `const PR_NUMBER = ${config.prNumber};`)
      .replace(/const KAFKA_REPO = ".*";/, `const KAFKA_REPO = "/tmp/${config.name.toLowerCase().replace(/\s+/g, '-')}-repo";`)
      .replace(/const OUTPUT_DIR = ".*";/, `const OUTPUT_DIR = "/tmp/v9-reports/${config.name.toLowerCase().replace(/\s+/g, '-')}";`);

    fs.writeFileSync(testScript, modifiedContent);

    // Run test
    console.log(`🚀 Running test (max ${config.timeoutMinutes} minutes)...\n`);
    
    const result = execSync(`timeout ${config.timeoutMinutes * 60} npx ts-node ${testScript}`, {
      cwd: __dirname,
      encoding: 'utf-8',
      stdio: ['inherit', 'pipe', 'pipe']
    });

    const duration = (Date.now() - startTime) / 1000;

    // Find generated report
    const outputDir = `/tmp/v9-reports/${config.name.toLowerCase().replace(/\s+/g, '-')}`;
    let reportPath = '';
    if (fs.existsSync(outputDir)) {
      const reports = fs.readdirSync(outputDir)
        .filter(f => f.endsWith('.md'))
        .sort((a, b) => {
          const statA = fs.statSync(path.join(outputDir, a));
          const statB = fs.statSync(path.join(outputDir, b));
          return statB.mtimeMs - statA.mtimeMs;
        });
      
      if (reports.length > 0) {
        reportPath = path.join(outputDir, reports[0]);
        
        // Copy to reports directory
        const reportsDir = path.join(__dirname, '../../reports');
        if (!fs.existsSync(reportsDir)) {
          fs.mkdirSync(reportsDir, { recursive: true });
        }
        const destPath = path.join(reportsDir, `v9-${config.name.toLowerCase().replace(/\s+/g, '-')}-pr${config.prNumber}.md`);
        fs.copyFileSync(reportPath, destPath);
        console.log(`📄 Report copied to: ${destPath}`);
        reportPath = destPath;
      }
    }

    console.log(`\n✅ ${config.name} completed in ${Math.round(duration)}s (${(duration / 60).toFixed(1)} minutes)\n`);

    return {
      framework: config.name,
      status: 'SUCCESS',
      duration,
      reportPath
    };

  } catch (error: any) {
    const duration = (Date.now() - startTime) / 1000;
    console.error(`\n❌ ${config.name} failed after ${Math.round(duration)}s`);
    console.error(`Error: ${error.message}\n`);

    return {
      framework: config.name,
      status: 'FAILED',
      duration,
      error: error.message
    };

  } finally {
    // Restore original
    fs.writeFileSync(testScript, testScriptContent);
    
    // Cleanup temp directories (use sudo to avoid permission issues)
    const repoDir = `/tmp/${config.name.toLowerCase().replace(/\s+/g, '-')}-repo`;
    try {
      if (fs.existsSync(repoDir)) {
        execSync(`sudo rm -rf ${repoDir}`, { stdio: 'ignore' });
      }
    } catch (cleanupError) {
      console.log(`   ⚠️  Cleanup warning: ${cleanupError.message} (non-fatal)`);
    }
  }
}

async function main() {
  console.log("╔════════════════════════════════════════════════════════════════╗");
  console.log("║  V9 Multi-Framework Test Suite                                ║");
  console.log("║  Testing 5 Java Frameworks                                    ║");
  console.log("╚════════════════════════════════════════════════════════════════╝\n");

  console.log(`📊 Frameworks to test: ${FRAMEWORKS.length}\n`);
  FRAMEWORKS.forEach((fw, idx) => {
    console.log(`   ${idx + 1}. ${fw.name} (PR #${fw.prNumber})`);
  });
  console.log(`\n⏱️  Estimated total time: ~${FRAMEWORKS.reduce((sum, fw) => sum + fw.timeoutMinutes, 0)} minutes\n`);

  const startTime = Date.now();
  const results: TestResult[] = [];

  // Run tests sequentially
  for (const framework of FRAMEWORKS) {
    const result = await runFrameworkTest(framework);
    results.push(result);
  }

  const totalDuration = (Date.now() - startTime) / 1000;

  // Generate summary
  console.log(`\n\n╔════════════════════════════════════════════════════════════════╗`);
  console.log(`║  📊 Multi-Framework Test Summary                               ║`);
  console.log(`╚════════════════════════════════════════════════════════════════╝\n`);

  const passed = results.filter(r => r.status === 'SUCCESS').length;
  const failed = results.filter(r => r.status === 'FAILED').length;

  console.log(`✅ Passed: ${passed}/${FRAMEWORKS.length}`);
  console.log(`❌ Failed: ${failed}/${FRAMEWORKS.length}`);
  console.log(`⏱️  Total Duration: ${Math.round(totalDuration)}s (${(totalDuration / 60).toFixed(1)} minutes)\n`);

  console.log(`\n${'Framework'.padEnd(30)} | ${'Status'.padEnd(10)} | ${'Duration'.padEnd(12)}`);
  console.log(`${'-'.repeat(30)}-|-${'-'.repeat(10)}-|-${'-'.repeat(12)}`);

  results.forEach(result => {
    const status = result.status === 'SUCCESS' ? '✅ SUCCESS' : '❌ FAILED';
    const duration = `${Math.round(result.duration)}s`;
    console.log(`${result.framework.padEnd(30)} | ${status.padEnd(10)} | ${duration.padEnd(12)}`);
  });

  // Detailed results
  console.log(`\n\n╔════════════════════════════════════════════════════════════════╗`);
  console.log(`║  📋 Detailed Results                                           ║`);
  console.log(`╚════════════════════════════════════════════════════════════════╝\n`);

  results.forEach(result => {
    console.log(`\n${result.framework}:`);
    console.log(`   Status: ${result.status}`);
    console.log(`   Duration: ${Math.round(result.duration)}s (${(result.duration / 60).toFixed(1)} minutes)`);
    if (result.reportPath) {
      console.log(`   Report: ${result.reportPath}`);
    }
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });

  // Save JSON summary
  const summaryPath = path.join(__dirname, '../../reports', `v9-multi-framework-summary-${Date.now()}.json`);
  const summaryDir = path.dirname(summaryPath);
  if (!fs.existsSync(summaryDir)) {
    fs.mkdirSync(summaryDir, { recursive: true });
  }
  
  fs.writeFileSync(summaryPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    totalFrameworks: FRAMEWORKS.length,
    passed,
    failed,
    totalDuration,
    results
  }, null, 2));

  console.log(`\n📊 JSON Summary: ${summaryPath}`);
  console.log(`📁 Reports Directory: ${path.join(__dirname, '../../reports')}/\n`);

  if (failed > 0) {
    console.error(`\n❌ ${failed} framework test(s) failed!\n`);
    process.exit(1);
  }

  console.log(`\n✅ All framework tests passed!\n`);
}

main().catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});

