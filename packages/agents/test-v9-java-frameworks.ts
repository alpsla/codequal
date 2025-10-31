#!/usr/bin/env ts-node
import * as dotenv from 'dotenv';
import * as pathModule from "path";
import * as fs from 'fs';

// Import V9PRAnalyzer service
const { V9PRAnalyzer } = require('./src/two-branch/services/v9-pr-analyzer');

dotenv.config({ path: pathModule.join(__dirname, '.env') });

// E2E Test Configuration: Disable rate limiting for multi-framework tests
// Production: 100 calls/PR is correct ✅
// Multi-framework tests: Multiple PRs sequentially = needs debug mode
process.env.DEBUG_MODE = process.env.DEBUG_MODE || 'true';

/**
 * V9 Multi-Framework Java Test Suite
 * 
 * Tests the V9PRAnalyzer service across multiple Java frameworks to validate:
 * - Consistent report quality across frameworks
 * - Tool execution reliability
 * - Issue categorization accuracy
 * - Performance metrics
 * 
 * Usage:
 * cd packages/agents
 * npx ts-node test-v9-java-frameworks.ts
 */

interface FrameworkTest {
  name: string;
  repositoryUrl: string;
  prNumber: number;
  description: string;
  expectedIssues: {
    min: number;
    max: number;
  };
  expectedCost?: {
    max: number; // Maximum acceptable cost in dollars
  };
  timeoutSeconds?: number;
}

const JAVA_FRAMEWORKS: FrameworkTest[] = [
  {
    name: 'Spring Boot PetClinic',
    repositoryUrl: 'https://github.com/spring-projects/spring-petclinic.git',
    prNumber: 950,
    description: 'Spring Boot reference application - small codebase',
    expectedIssues: { min: 100, max: 2000 },
    expectedCost: { max: 0.01 }, // Cost scales with groups (~20-30 groups → $0.006-0.009)
    timeoutSeconds: 900 // 15 minutes
  },
  {
    name: 'Quarkus Quickstarts',
    repositoryUrl: 'https://github.com/quarkusio/quarkus-quickstarts.git',
    prNumber: 1551,
    description: 'Quarkus framework quickstart examples',
    expectedIssues: { min: 200, max: 3000 },
    expectedCost: { max: 0.01 }, // Expected similar grouping patterns
    timeoutSeconds: 1200 // 20 minutes
  },
  {
    name: 'Micronaut Core',
    repositoryUrl: 'https://github.com/micronaut-projects/micronaut-core.git',
    prNumber: 10950,
    description: 'Micronaut framework - medium codebase',
    expectedIssues: { min: 300, max: 5000 },
    expectedCost: { max: 0.015 }, // More issues → more groups (30-40 groups)
    timeoutSeconds: 1500 // 25 minutes
  },
  {
    name: 'Apache Kafka',
    repositoryUrl: 'https://github.com/apache/kafka.git',
    prNumber: 20515,
    description: 'Distributed streaming platform - large codebase',
    expectedIssues: { min: 500, max: 10000 },
    expectedCost: { max: 0.03 }, // Large repo → more diverse groups (50-70 groups)
    timeoutSeconds: 1800 // 30 minutes
  },
  {
    name: 'WebGoat',
    repositoryUrl: 'https://github.com/WebGoat/WebGoat.git',
    prNumber: 1950,
    description: 'Deliberately insecure application - security testing',
    expectedIssues: { min: 400, max: 6000 },
    expectedCost: { max: 0.02 }, // High security diversity → more groups (40-60 groups)
    timeoutSeconds: 1200 // 20 minutes
  }
];

interface TestResult {
  framework: string;
  success: boolean;
  duration: number;
  cost?: number; // Actual cost in dollars
  issues: {
    total: number;
    new: number;
    resolved: number;
    existingModified: number;
    existingRest: number;
    blocking: number;
  };
  decision: string;
  reportPath: string;
  errors?: string[];
  warnings?: string[]; // For cost overruns or other non-fatal issues
}

async function runFrameworkTest(test: FrameworkTest): Promise<TestResult> {
  console.log(`\n╔════════════════════════════════════════════════════════════════╗`);
  console.log(`║  Testing: ${test.name.padEnd(56)}║`);
  console.log(`╚════════════════════════════════════════════════════════════════╝\n`);
  console.log(`📋 Description: ${test.description}`);
  console.log(`🔗 Repository: ${test.repositoryUrl}`);
  console.log(`🔢 PR Number: #${test.prNumber}`);
  console.log(`⏱️  Timeout: ${test.timeoutSeconds}s (${Math.round(test.timeoutSeconds / 60)} minutes)\n`);

  const startTime = Date.now();
  const analyzer = new V9PRAnalyzer();
  const errors: string[] = [];

  try {
    const result = await analyzer.analyzePR({
      repositoryUrl: test.repositoryUrl,
      prNumber: test.prNumber,
      language: 'java',
      analysisMode: 'complete',
      outputDir: `/tmp/v9-reports/${test.name.toLowerCase().replace(/\s+/g, '-')}`,
      repoDir: `/tmp/v9-test-${test.name.toLowerCase().replace(/\s+/g, '-')}`,
      logFile: `/tmp/v9-${test.name.toLowerCase().replace(/\s+/g, '-')}.log`,
      timeoutSeconds: test.timeoutSeconds
    });

    const duration = (Date.now() - startTime) / 1000;

    // Extract cost from result (if available)
    const actualCost = result.metadata?.costSavings?.withGrouping || 0;
    const warnings: string[] = [];

    // Validate results
    if (result.issues.total < test.expectedIssues.min) {
      errors.push(`Issue count too low: ${result.issues.total} < ${test.expectedIssues.min}`);
    }
    if (result.issues.total > test.expectedIssues.max) {
      errors.push(`Issue count too high: ${result.issues.total} > ${test.expectedIssues.max}`);
    }

    // Validate cost (warning only, not a failure)
    if (test.expectedCost && actualCost > test.expectedCost.max) {
      warnings.push(`Cost over budget: $${actualCost.toFixed(4)} > $${test.expectedCost.max.toFixed(4)} (${((actualCost / test.expectedCost.max - 1) * 100).toFixed(1)}% over)`);
    }

    // Copy report to consolidated location
    const consolidatedReportPath = pathModule.join(
      process.cwd(),
      'reports',
      `v9-${test.name.toLowerCase().replace(/\s+/g, '-')}-pr${test.prNumber}.md`
    );
    
    if (result.report.markdown) {
      fs.writeFileSync(consolidatedReportPath, result.report.markdown);
    }

    console.log(`\n✅ ${test.name} Test Complete!`);
    console.log(`   Duration: ${Math.round(duration)}s (${(duration / 60).toFixed(1)} minutes)`);
    console.log(`   Cost: $${actualCost.toFixed(4)}${test.expectedCost ? ` (budget: $${test.expectedCost.max.toFixed(4)})` : ''}`);
    console.log(`   Decision: ${result.decision}`);
    console.log(`   Total Issues: ${result.issues.total}`);
    console.log(`   NEW: ${result.issues.new} | RESOLVED: ${result.issues.resolved}`);
    console.log(`   EXISTING_MODIFIED: ${result.issues.existingModified} | EXISTING_REST: ${result.issues.existingRest}`);
    console.log(`   Blocking: ${result.issues.blocking.length}`);
    console.log(`   Report: ${consolidatedReportPath}`);

    if (warnings.length > 0) {
      console.log(`   ⚠️  Cost Warnings: ${warnings.join(', ')}`);
    }
    if (errors.length > 0) {
      console.log(`   ❌ Errors: ${errors.join(', ')}`);
    }

    return {
      framework: test.name,
      success: errors.length === 0,
      duration,
      cost: actualCost,
      issues: {
        total: result.issues.total,
        new: result.issues.new,
        resolved: result.issues.resolved,
        existingModified: result.issues.existingModified,
        existingRest: result.issues.existingRest,
        blocking: result.issues.blocking.length
      },
      decision: result.decision,
      reportPath: consolidatedReportPath,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    };

  } catch (error: any) {
    const duration = (Date.now() - startTime) / 1000;
    console.error(`\n❌ ${test.name} Test Failed!`);
    console.error(`   Error: ${error.message}`);
    console.error(`   Duration: ${Math.round(duration)}s`);

    return {
      framework: test.name,
      success: false,
      duration,
      issues: { total: 0, new: 0, resolved: 0, existingModified: 0, existingRest: 0, blocking: 0 },
      decision: 'ERROR',
      reportPath: '',
      errors: [error.message]
    };
  }
}

async function runAllFrameworkTests() {
  console.log("╔════════════════════════════════════════════════════════════════╗");
  console.log("║  V9 Multi-Framework Java Test Suite                           ║");
  console.log("║  Testing V9PRAnalyzer Service Across Java Frameworks          ║");
  console.log("╚════════════════════════════════════════════════════════════════╝\n");

  console.log(`📊 Total Frameworks to Test: ${JAVA_FRAMEWORKS.length}\n`);
  console.log(`Frameworks:`);
  JAVA_FRAMEWORKS.forEach((fw, idx) => {
    console.log(`   ${idx + 1}. ${fw.name} (PR #${fw.prNumber})`);
  });
  console.log(`\n⏱️  Estimated Total Time: ${Math.round(JAVA_FRAMEWORKS.reduce((sum, fw) => sum + (fw.timeoutSeconds || 1200), 0) / 60)} minutes\n`);

  const overallStartTime = Date.now();
  const results: TestResult[] = [];

  // Run tests sequentially to avoid resource contention
  for (const test of JAVA_FRAMEWORKS) {
    const result = await runFrameworkTest(test);
    results.push(result);
  }

  const overallDuration = (Date.now() - overallStartTime) / 1000;

  // Generate summary report
  console.log(`\n\n╔════════════════════════════════════════════════════════════════╗`);
  console.log(`║  📊 V9 Multi-Framework Test Summary                            ║`);
  console.log(`╚════════════════════════════════════════════════════════════════╝\n`);

  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const totalCost = results.reduce((sum, r) => sum + (r.cost || 0), 0);
  const avgCost = totalCost / results.length;

  console.log(`✅ Passed: ${passed}/${JAVA_FRAMEWORKS.length}`);
  console.log(`❌ Failed: ${failed}/${JAVA_FRAMEWORKS.length}`);
  console.log(`💰 Total Cost: $${totalCost.toFixed(4)} (avg: $${avgCost.toFixed(4)} per framework)`);
  console.log(`⏱️  Total Duration: ${Math.round(overallDuration)}s (${(overallDuration / 60).toFixed(1)} minutes)\n`);

  console.log(`\n${'Framework'.padEnd(30)} | ${'Status'.padEnd(8)} | ${'Duration'.padEnd(10)} | ${'Cost'.padEnd(10)} | ${'Issues'.padEnd(10)} | ${'Decision'.padEnd(10)}`);
  console.log(`${'-'.repeat(30)}-|-${'-'.repeat(8)}-|-${'-'.repeat(10)}-|-${'-'.repeat(10)}-|-${'-'.repeat(10)}-|-${'-'.repeat(10)}`);

  results.forEach(result => {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    const duration = `${Math.round(result.duration)}s`;
    const cost = result.cost ? `$${result.cost.toFixed(4)}` : 'N/A';
    const issues = result.issues.total.toString();
    console.log(
      `${result.framework.padEnd(30)} | ${status.padEnd(8)} | ${duration.padEnd(10)} | ${cost.padEnd(10)} | ${issues.padEnd(10)} | ${result.decision.padEnd(10)}`
    );
  });

  // Detailed breakdown
  console.log(`\n\n╔════════════════════════════════════════════════════════════════╗`);
  console.log(`║  📋 Detailed Issue Breakdown                                   ║`);
  console.log(`╚════════════════════════════════════════════════════════════════╝\n`);

  results.forEach(result => {
    if (result.success) {
      console.log(`\n${result.framework}:`);
      console.log(`   Duration: ${Math.round(result.duration)}s`);
      console.log(`   Cost: ${result.cost ? `$${result.cost.toFixed(4)}` : 'N/A'}`);
      console.log(`   Total Issues: ${result.issues.total}`);
      console.log(`   🆕 NEW: ${result.issues.new}`);
      console.log(`   ✅ RESOLVED: ${result.issues.resolved}`);
      console.log(`   ⚠️  EXISTING_MODIFIED: ${result.issues.existingModified}`);
      console.log(`   📝 EXISTING_REST: ${result.issues.existingRest}`);
      console.log(`   🚫 BLOCKING: ${result.issues.blocking}`);
      console.log(`   📄 Report: ${result.reportPath}`);
      if (result.warnings && result.warnings.length > 0) {
        console.log(`   ⚠️  Warnings: ${result.warnings.join(', ')}`);
      }
    } else {
      console.log(`\n${result.framework}: ❌ FAILED`);
      if (result.errors) {
        result.errors.forEach(err => console.log(`   Error: ${err}`));
      }
    }
  });

  // Save consolidated JSON report
  const jsonReportPath = pathModule.join(process.cwd(), 'reports', `v9-multi-framework-summary-${Date.now()}.json`);
  fs.writeFileSync(jsonReportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    totalFrameworks: JAVA_FRAMEWORKS.length,
    passed,
    failed,
    overallDuration,
    results
  }, null, 2));

  console.log(`\n\n✅ Test suite complete!`);
  console.log(`📊 JSON Summary: ${jsonReportPath}`);
  console.log(`📁 Reports Directory: ${pathModule.join(process.cwd(), 'reports')}/\n`);

  // Exit with error if any tests failed
  if (failed > 0) {
    console.error(`\n❌ ${failed} framework test(s) failed!\n`);
    process.exit(1);
  }

  console.log(`\n✅ All framework tests passed!\n`);
}

// Run the test suite
runAllFrameworkTests().catch(error => {
  console.error('\n❌ Test suite failed:');
  console.error('Error:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
});

