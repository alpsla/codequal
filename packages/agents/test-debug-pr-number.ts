#!/usr/bin/env ts-node
/**
 * Debug Test: PR Number Propagation
 *
 * This test runs the lite E2E test with Spring Boot only
 * and shows detailed debug logs for PR number propagation
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { V9GroupedReportFormatter } from './src/two-branch/analyzers/v9-grouped-report-formatter';
import { ModelConfigResolver } from './src/standard/orchestrator/model-config-resolver';
import { groupIssues } from './src/two-branch/utils/issue-grouping';

const TEST_PR_NUMBER = 200;
const TEST_REPO = 'https://github.com/micronaut-projects/micronaut-core';
const LOCAL_REPO_PATH = '/tmp/debug-pr-test-micronaut';

console.log(`\n╔════════════════════════════════════════════════════════════════╗`);
console.log(`║  PR Number Propagation Debug Test                             ║`);
console.log(`╚════════════════════════════════════════════════════════════════╝\n`);

console.log(`📋 Test Configuration:`);
console.log(`   Repository: ${TEST_REPO}`);
console.log(`   PR Number: ${TEST_PR_NUMBER}`);
console.log(`   Local Path: ${LOCAL_REPO_PATH}\n`);

async function main() {
  try {
    // Clean up any existing repo
    if (fs.existsSync(LOCAL_REPO_PATH)) {
      console.log('🧹 Cleaning up existing repository...');
      execSync(`rm -rf ${LOCAL_REPO_PATH}`, { stdio: 'inherit' });
    }

    // Clone repository
    console.log('📦 Cloning repository...');
    execSync(`git clone --depth 1 ${TEST_REPO} ${LOCAL_REPO_PATH}`, {
      stdio: 'pipe',
      encoding: 'utf-8'
    });
    console.log('✅ Repository cloned\n');

    // Create mock issues for testing
    console.log('🔨 Creating mock issues for testing...');
    const mockIssues: any[] = [
      {
        id: 'test-1',
        rule: 'test-rule-1',
        category: 'NEW',
        severity: 'high' as const,
        title: 'Test Issue 1',
        file: 'src/test/Test.java',
        line: 10,
        tool: 'test-tool',
        message: 'Test message 1',
        detectedCategory: 'Security'
      },
      {
        id: 'test-2',
        rule: 'test-rule-2',
        category: 'NEW',
        severity: 'medium' as const,
        title: 'Test Issue 2',
        file: 'src/test/Test.java',
        line: 20,
        tool: 'test-tool',
        message: 'Test message 2',
        detectedCategory: 'Quality'
      }
    ];

    const groupingResult = groupIssues(mockIssues);
    console.log(`✅ Created ${mockIssues.length} mock issues in ${groupingResult.groups.length} groups\n`);

    // Initialize formatter
    console.log('🔧 Initializing formatter...');
    let modelConfigResolver;
    try {
      modelConfigResolver = new ModelConfigResolver();
    } catch (error) {
      console.log('⚠️  Using mock model resolver');
      modelConfigResolver = {
        async getModelForAgent(agentType: string) {
          return 'gemini-2.0-flash-exp';
        }
      } as any;
    }

    const formatter = new V9GroupedReportFormatter(
      modelConfigResolver,
      'java',
      'small'
    );
    console.log('✅ Formatter initialized\n');

    // Build metadata with PR number
    console.log(`\n╔════════════════════════════════════════════════════════════════╗`);
    console.log(`║  BUILDING METADATA WITH PR NUMBER                              ║`);
    console.log(`╚════════════════════════════════════════════════════════════════╝\n`);

    const metadata = {
      repository: 'micronaut-core',
      repoUrl: TEST_REPO,
      repoPath: LOCAL_REPO_PATH,
      prNumber: TEST_PR_NUMBER,  // ← THIS IS THE KEY VALUE WE'RE TRACKING
      prTitle: `PR #${TEST_PR_NUMBER}`,
      branch: `pr-${TEST_PR_NUMBER}`,
      baseBranch: 'main',
      prAuthor: 'test-user',
      prAuthorEmail: 'test@example.com',
      organizationName: 'micronaut-projects',
      totalFiles: 100,
      filesModified: 10,
      linesAdded: 50,
      linesDeleted: 20,
      decision: 'APPROVED',
      blockingCount: 0,
      totalDuration: 30000,
      analysisTime: 25000,
      analyzedAt: new Date().toISOString(),
      analyzerVersion: '9.0.0'
    };

    console.log(`[TEST] Created metadata object:`);
    console.log(`[TEST] metadata.prNumber = ${metadata.prNumber} (type: ${typeof metadata.prNumber})\n`);

    // Generate report - this will trigger all the debug logs
    console.log(`\n╔════════════════════════════════════════════════════════════════╗`);
    console.log(`║  GENERATING REPORT (watch for DEBUG-PR# logs)                  ║`);
    console.log(`╚════════════════════════════════════════════════════════════════╝\n`);

    const report = await formatter.generateGroupedReport(
      mockIssues,
      groupingResult.groups,
      metadata
    );

    // Save report
    const reportPath = path.join(__dirname, '../../reports', `debug-pr-number-micronaut-test.md`);
    const reportDir = path.dirname(reportPath);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    fs.writeFileSync(reportPath, report.markdown);

    console.log(`\n╔════════════════════════════════════════════════════════════════╗`);
    console.log(`║  CHECKING REPORT OUTPUT                                        ║`);
    console.log(`╚════════════════════════════════════════════════════════════════╝\n`);

    // Check what PR number appears in the report
    const reportContent = fs.readFileSync(reportPath, 'utf-8');
    const prMatch = reportContent.match(/\*\*Pull Request:\*\* #(\d+)/);

    if (prMatch) {
      const reportedPrNumber = prMatch[1];
      console.log(`[TEST] Report shows: **Pull Request:** #${reportedPrNumber}`);

      if (reportedPrNumber === String(TEST_PR_NUMBER)) {
        console.log(`✅ SUCCESS: PR number ${TEST_PR_NUMBER} appears correctly in report!`);
      } else {
        console.log(`❌ FAILURE: Expected #${TEST_PR_NUMBER} but got #${reportedPrNumber}`);
      }
    } else {
      console.log(`❌ FAILURE: Could not find PR number in report`);
    }

    console.log(`\n📄 Report saved to: ${reportPath}`);
    console.log(`\n✅ Debug test complete!\n`);

  } catch (error: any) {
    console.error(`\n❌ Test failed: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
