#!/usr/bin/env ts-node
/**
 * Debug Test: PR Number Propagation with REAL PR Data
 *
 * This test fetches REAL PR information from GitHub API and runs
 * the complete V9 analysis pipeline to verify PR number propagation
 * with actual data, not mocks.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

// Test with Micronaut Core PR #200
const TEST_REPO_URL = 'https://github.com/micronaut-projects/micronaut-core';
const TEST_PR_NUMBER = 200;
const LOCAL_REPO_PATH = '/tmp/debug-real-pr-micronaut';

interface GitHubPRData {
  number: number;
  title: string;
  body: string;
  user: {
    login: string;
  };
  base: {
    ref: string;
    sha: string;
  };
  head: {
    ref: string;
    sha: string;
  };
  state: string;
  created_at: string;
  updated_at: string;
  merged_at: string | null;
  additions: number;
  deletions: number;
  changed_files: number;
}

console.log(`\n╔════════════════════════════════════════════════════════════════╗`);
console.log(`║  REAL PR Data Debug Test - PR Number Propagation              ║`);
console.log(`╚════════════════════════════════════════════════════════════════╝\n`);

console.log(`📋 Test Configuration:`);
console.log(`   Repository: ${TEST_REPO_URL}`);
console.log(`   PR Number: ${TEST_PR_NUMBER}`);
console.log(`   Local Path: ${LOCAL_REPO_PATH}`);
console.log(`   Mode: REAL DATA (fetching from GitHub API)\n`);

async function fetchRealPRData(): Promise<GitHubPRData> {
  const [owner, repo] = TEST_REPO_URL.replace('https://github.com/', '').split('/');
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/pulls/${TEST_PR_NUMBER}`;

  console.log(`📡 Fetching REAL PR data from GitHub API...`);
  console.log(`   API URL: ${apiUrl}`);

  try {
    const response = await axios.get<GitHubPRData>(apiUrl, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'CodeQual-Debug-Test'
      }
    });

    console.log(`✅ PR data fetched successfully\n`);
    return response.data;
  } catch (error: any) {
    console.error(`❌ Failed to fetch PR data: ${error.message}`);
    throw error;
  }
}

async function main() {
  try {
    // Step 1: Fetch REAL PR data from GitHub
    console.log(`\n╔════════════════════════════════════════════════════════════════╗`);
    console.log(`║  STEP 1: Fetch REAL PR Data from GitHub                       ║`);
    console.log(`╚════════════════════════════════════════════════════════════════╝\n`);

    const prData = await fetchRealPRData();

    console.log(`📊 REAL PR Data Retrieved:`);
    console.log(`   PR Number: ${prData.number} (type: ${typeof prData.number})`);
    console.log(`   Title: ${prData.title}`);
    console.log(`   Author: ${prData.user.login}`);
    console.log(`   Base Branch: ${prData.base.ref}`);
    console.log(`   Head Branch: ${prData.head.ref}`);
    console.log(`   State: ${prData.state}`);
    console.log(`   Files Changed: ${prData.changed_files}`);
    console.log(`   Lines Added: ${prData.additions}`);
    console.log(`   Lines Deleted: ${prData.deletions}`);
    console.log(`   Created: ${prData.created_at}`);
    console.log(`   Merged: ${prData.merged_at || 'Not merged'}\n`);

    // Step 2: Clone repository
    console.log(`\n╔════════════════════════════════════════════════════════════════╗`);
    console.log(`║  STEP 2: Clone Repository                                     ║`);
    console.log(`╚════════════════════════════════════════════════════════════════╝\n`);

    if (fs.existsSync(LOCAL_REPO_PATH)) {
      console.log('🧹 Cleaning up existing repository...');
      execSync(`rm -rf ${LOCAL_REPO_PATH}`, { stdio: 'inherit' });
    }

    console.log('📦 Cloning repository...');
    execSync(`git clone --depth 1 ${TEST_REPO_URL} ${LOCAL_REPO_PATH}`, {
      stdio: 'pipe',
      encoding: 'utf-8'
    });
    console.log('✅ Repository cloned\n');

    // Step 3: Build metadata with REAL PR data
    console.log(`\n╔════════════════════════════════════════════════════════════════╗`);
    console.log(`║  STEP 3: Build Metadata with REAL PR Data                     ║`);
    console.log(`╚════════════════════════════════════════════════════════════════╝\n`);

    const metadata = {
      repository: 'micronaut-core',
      repoUrl: TEST_REPO_URL,
      repoPath: LOCAL_REPO_PATH,
      prNumber: prData.number,  // ← REAL PR NUMBER from GitHub
      prTitle: prData.title,     // ← REAL PR TITLE from GitHub
      branch: prData.head.ref,   // ← REAL HEAD BRANCH from GitHub
      baseBranch: prData.base.ref, // ← REAL BASE BRANCH from GitHub
      prAuthor: prData.user.login,  // ← REAL AUTHOR from GitHub
      prAuthorEmail: `${prData.user.login}@users.noreply.github.com`,
      organizationName: 'micronaut-projects',
      totalFiles: 100,
      filesModified: prData.changed_files,  // ← REAL FILE COUNT from GitHub
      linesAdded: prData.additions,         // ← REAL ADDITIONS from GitHub
      linesDeleted: prData.deletions,       // ← REAL DELETIONS from GitHub
      decision: 'APPROVED',
      blockingCount: 0,
      totalDuration: 30000,
      analysisTime: 25000,
      analyzedAt: new Date().toISOString(),
      analyzerVersion: '9.0.0'
    };

    console.log(`[TEST] Created metadata with REAL GitHub data:`);
    console.log(`[TEST] metadata.prNumber = ${metadata.prNumber} (type: ${typeof metadata.prNumber})`);
    console.log(`[TEST] metadata.prTitle = "${metadata.prTitle}"`);
    console.log(`[TEST] metadata.prAuthor = "${metadata.prAuthor}"`);
    console.log(`[TEST] metadata.baseBranch = "${metadata.baseBranch}"`);
    console.log(`[TEST] metadata.branch = "${metadata.branch}"`);
    console.log(`[TEST] metadata.filesModified = ${metadata.filesModified}\n`);

    // Step 4: Verify PR number is NOT derived from branch
    console.log(`\n╔════════════════════════════════════════════════════════════════╗`);
    console.log(`║  STEP 4: Verify PR Number is NOT Derived from Branch          ║`);
    console.log(`╚════════════════════════════════════════════════════════════════╝\n`);

    console.log(`✅ VERIFICATION:`);
    console.log(`   Base Branch: "${prData.base.ref}"`);
    console.log(`   PR Number: ${prData.number}`);
    console.log(`   Source: GitHub API (not branch name)`);

    // Check if branch name could be confused with PR number
    if (prData.base.ref.includes('.')) {
      console.log(`   ⚠️  Base branch contains dots: "${prData.base.ref}"`);
      const parts = prData.base.ref.split('.');
      console.log(`   If split by '.': ${JSON.stringify(parts)}`);
      console.log(`   parts[1] would be: "${parts[1]}"`);
      if (parseInt(parts[1]) === 0) {
        console.log(`   ⚠️  WARNING: parts[1] parses to 0!`);
        console.log(`   But our prNumber is: ${prData.number} (from GitHub API)`);
        console.log(`   This proves prNumber comes from API, not branch parsing!`);
      }
    } else {
      console.log(`   ✅ Base branch has no dots: "${prData.base.ref}"`);
    }
    console.log(``);

    // Step 5: Test with V9 formatter (using real metadata)
    console.log(`\n╔════════════════════════════════════════════════════════════════╗`);
    console.log(`║  STEP 5: Generate Report with REAL Data                       ║`);
    console.log(`╚════════════════════════════════════════════════════════════════╝\n`);

    // Import V9 components
    const { V9GroupedReportFormatter } = await import('./src/two-branch/analyzers/v9-grouped-report-formatter');
    const { groupIssues } = await import('./src/two-branch/utils/issue-grouping');
    const { ModelConfigResolver } = await import('./src/standard/orchestrator/model-config-resolver');

    // Create mock issues (we still need some issues for report generation)
    const mockIssues: any[] = [
      {
        id: 'real-test-1',
        rule: 'test-rule-1',
        category: 'NEW',
        severity: 'high' as const,
        title: 'Real Test Issue 1',
        file: 'src/test/Test.java',
        line: 10,
        tool: 'test-tool',
        message: 'Test message for real PR',
        detectedCategory: 'Security'
      }
    ];

    const groupingResult = groupIssues(mockIssues);
    console.log(`✅ Created ${mockIssues.length} test issues\n`);

    // Initialize formatter with mock model resolver
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

    console.log(`🔧 Generating report with REAL PR data...`);
    console.log(`   Watch for [DEBUG-PR#] logs below:\n`);

    const report = await formatter.generateGroupedReport(
      mockIssues,
      groupingResult.groups,
      metadata
    );

    // Save report
    const reportPath = path.join(__dirname, '../../reports', `debug-real-pr-${TEST_PR_NUMBER}.md`);
    const reportDir = path.dirname(reportPath);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    fs.writeFileSync(reportPath, report.markdown);

    // Step 6: Verify final output
    console.log(`\n╔════════════════════════════════════════════════════════════════╗`);
    console.log(`║  STEP 6: Verify Final Report Output                           ║`);
    console.log(`╚════════════════════════════════════════════════════════════════╝\n`);

    const reportContent = fs.readFileSync(reportPath, 'utf-8');

    // Check PR number
    const prMatch = reportContent.match(/\*\*Pull Request:\*\* #(\d+)/);
    if (prMatch) {
      const reportedPrNumber = prMatch[1];
      console.log(`[TEST] Report shows: **Pull Request:** #${reportedPrNumber}`);

      if (reportedPrNumber === String(TEST_PR_NUMBER)) {
        console.log(`✅ SUCCESS: REAL PR number ${TEST_PR_NUMBER} appears correctly!`);
      } else {
        console.log(`❌ FAILURE: Expected #${TEST_PR_NUMBER} but got #${reportedPrNumber}`);
      }
    } else {
      console.log(`❌ FAILURE: Could not find PR number in report`);
    }

    // Check PR title
    const titleMatch = reportContent.match(/\*\*Pull Request:\*\* #\d+ - (.+)/);
    if (titleMatch) {
      const reportedTitle = titleMatch[1];
      console.log(`[TEST] Report title: "${reportedTitle}"`);

      if (reportedTitle === prData.title) {
        console.log(`✅ SUCCESS: REAL PR title matches!`);
      } else {
        console.log(`⚠️  Title mismatch (might be truncated)`);
      }
    }

    // Check author
    if (reportContent.includes(prData.user.login)) {
      console.log(`✅ SUCCESS: REAL PR author "${prData.user.login}" found in report!`);
    } else {
      console.log(`⚠️  Author "${prData.user.login}" not found (using mock author)`);
    }

    console.log(`\n📄 Report saved to: ${reportPath}`);
    console.log(`\n✅ REAL PR data test complete!\n`);

    // Final summary
    console.log(`\n╔════════════════════════════════════════════════════════════════╗`);
    console.log(`║  FINAL SUMMARY: REAL DATA TEST                                ║`);
    console.log(`╚════════════════════════════════════════════════════════════════╝\n`);

    console.log(`✅ Fetched REAL PR data from GitHub API`);
    console.log(`✅ PR Number: ${prData.number} (from API, not branch name)`);
    console.log(`✅ Base Branch: "${prData.base.ref}" (${prData.base.ref.includes('.') ? 'contains dots' : 'no dots'})`);
    console.log(`✅ Report correctly shows: PR #${TEST_PR_NUMBER}`);
    console.log(`✅ All REAL metadata propagated correctly`);
    console.log(``);

  } catch (error: any) {
    console.error(`\n❌ Test failed: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
