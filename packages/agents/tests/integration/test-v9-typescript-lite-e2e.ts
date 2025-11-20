/**
 * V9 TypeScript Lite E2E Test
 *
 * Tests the complete V9 analysis flow for TypeScript/JavaScript:
 * - BaseToolOrchestrator (universal foundation)
 * - TypeScriptToolOrchestrator (extends base, language-specific)
 * - Universal tool configuration
 * - V9 Report Compiler service
 * - Grouped report formatter
 *
 * Follows same pattern as test-v9-lite-e2e.ts (Java)
 */

// Load environment variables FIRST
import dotenv from 'dotenv';
dotenv.config();

// E2E Test Configuration: Disable rate limiting
process.env.DEBUG_MODE = process.env.DEBUG_MODE || 'true';

import { TypeScriptToolOrchestrator } from '../../src/two-branch/tools/typescript/typescript-tool-orchestrator';
import { createToolConfigResolver } from '../../src/two-branch/config/universal-tool-config';
import { V9GroupedReportFormatter } from '../../src/two-branch/analyzers/v9-grouped-report-formatter';
import { ModelConfigResolver } from '../../src/standard/orchestrator/model-config-resolver';
import { groupIssues } from '../../src/two-branch/utils/issue-grouping';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface TestScenario {
  name: string;
  repoUrl: string;
  prNumber: number;
  expectedToolCount?: number;
}

const TEST_SCENARIOS: TestScenario[] = [
  {
    name: 'CodeQual PR #69 - V9 Footer Fixes',
    repoUrl: 'https://github.com/alpsla/codequal',
    prNumber: 69,
    expectedToolCount: 3  // eslint, semgrep, npm-audit
  }
];

/**
 * Helper function to clone a repository
 */
function cloneRepository(repoUrl: string, targetPath: string): void {
  console.log(`   🔄 Cloning ${repoUrl}...`);

  // Remove if exists
  if (fs.existsSync(targetPath)) {
    execSync(`rm -rf ${targetPath}`);
  }

  // Clone with depth 10 (as specified in requirements)
  execSync(`git clone --depth 10 ${repoUrl} ${targetPath}`, {
    stdio: 'pipe',
    encoding: 'utf-8'
  });

  console.log(`   ✅ Repository cloned to ${targetPath}`);
}

async function runTypeScriptLiteE2ETest(scenario: TestScenario): Promise<void> {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🧪 Testing: ${scenario.name}`);
  console.log(`${'='.repeat(80)}\n`);

  const startTime = Date.now();
  const repoPath = `/tmp/test-repo-${Date.now()}`;

  try {
    // ========================================================================
    // STEP 0: Clone Repository
    // ========================================================================
    console.log('📦 Step 0: Cloning repository...');
    cloneRepository(scenario.repoUrl, repoPath);

    // ========================================================================
    // STEP 1: Universal Tool Configuration
    // ========================================================================
    console.log('\n🔧 Step 1: Configuring tools...');
    const toolResolver = createToolConfigResolver();
    const tools = toolResolver.getToolsForLanguage('typescript');

    console.log(`   ✅ Configured ${tools.length} tools`);
    tools.forEach(tool => {
      console.log(`      - ${tool.name} (${tool.category})`);
    });

    if (scenario.expectedToolCount && tools.length !== scenario.expectedToolCount) {
      console.warn(`   ⚠️  Expected ${scenario.expectedToolCount} tools, got ${tools.length}`);
    }

    // ========================================================================
    // STEP 2: Tool Orchestration (BaseToolOrchestrator + TypeScriptToolOrchestrator)
    // ========================================================================
    console.log('\n🚀 Step 2: Running tool orchestration (parallel execution)...');
    const orchestrator = new TypeScriptToolOrchestrator();

    // Run tools on main/base branch
    console.log('   📊 Analyzing main branch...');
    const mainResult = await orchestrator.orchestrate(repoPath, 'base', { analysisMode: 'complete' });

    // Checkout PR branch for comparison
    console.log(`   🔀 Checking out PR #${scenario.prNumber}...`);
    let prCheckoutSuccess = false;
    try {
      execSync(`git -C ${repoPath} fetch origin pull/${scenario.prNumber}/head:pr-${scenario.prNumber}`, { stdio: 'pipe' });
      execSync(`git -C ${repoPath} checkout pr-${scenario.prNumber}`, { stdio: 'pipe' });
      console.log(`   ✅ Checked out PR branch`);
      prCheckoutSuccess = true;
    } catch (error) {
      console.log(`   ⚠️  Could not checkout PR #${scenario.prNumber}`);
      console.log(`   ℹ️  This test requires a valid PR number`);
      throw new Error(`PR checkout failed for ${scenario.repoUrl}/pull/${scenario.prNumber}`);
    }

    // Run tools on PR branch (only if checkout succeeded)
    console.log('   📊 Analyzing PR branch...');
    const prResult = await orchestrator.orchestrate(repoPath, 'pr', { analysisMode: 'complete' });

    const mainResults = mainResult.toolResults;
    const prResults = prResult.toolResults;

    console.log(`   ✅ Main branch: ${mainResults.length} tools executed`);
    console.log(`   ✅ PR branch: ${prResults.length} tools executed`);

    const totalIssuesMain = mainResults.reduce((sum, r) => sum + (r.issues?.length || 0), 0);
    const totalIssuesPr = prResults.reduce((sum, r) => sum + (r.issues?.length || 0), 0);

    console.log(`   📊 Main branch issues: ${totalIssuesMain}`);
    console.log(`   📊 PR branch issues: ${totalIssuesPr}`);

    // ========================================================================
    // STEP 3: Issue Categorization
    // ========================================================================
    console.log('\n📂 Step 3: Categorizing issues...');

    // NEW-BUG DEBUG: Check prResults structure
    console.log(`\n[NEW-BUG] ====== prResults DEBUG ======`);
    console.log(`[NEW-BUG] prResults.length: ${prResults.length}`);
    prResults.forEach((result, index) => {
      console.log(`[NEW-BUG] prResults[${index}]:`);
      console.log(`[NEW-BUG]   - tool: ${result.tool}`);
      console.log(`[NEW-BUG]   - issues property exists: ${result.issues !== undefined}`);
      console.log(`[NEW-BUG]   - issues length: ${result.issues?.length || 0}`);
      console.log(`[NEW-BUG]   - parsedIssues property exists: ${(result as any).parsedIssues !== undefined}`);
      console.log(`[NEW-BUG]   - parsedIssues length: ${(result as any).parsedIssues?.length || 0}`);
      console.log(`[NEW-BUG]   - All properties: ${Object.keys(result).join(', ')}`);
    });
    console.log(`[NEW-BUG] ===============================\n`);

    const allPrIssues = prResults.flatMap(r => r.issues || []);
    const newIssues = allPrIssues.filter(issue =>
      !mainResults.some(m =>
        (m.issues || []).some(mainIssue =>
          mainIssue.file === issue.file &&
          mainIssue.line === issue.line
        )
      )
    );

    console.log(`   ✅ New issues (introduced in PR): ${newIssues.length}`);
    console.log(`   ✅ Existing issues: ${allPrIssues.length - newIssues.length}`);

    // ========================================================================
    // STEP 4: Issue Grouping (Cost Optimization)
    // ========================================================================
    console.log('\n💰 Step 4: Grouping issues for cost optimization...');

    // Detect issue category from tool
    const detectIssueCategory = (tool: string, rule: string | null | undefined): string => {
      if (tool === 'semgrep') return 'Security';
      if (tool === 'npm-audit') return 'Dependencies';
      if (tool === 'eslint' && rule?.includes('security')) return 'Security';
      if (tool === 'eslint' && rule?.includes('performance')) return 'Performance';
      if (tool === 'typescript') return 'Code Quality';
      return 'Code Quality';
    };

    const formattedIssues = allPrIssues.map(issue => {
      const isNew = newIssues.some(n =>
        n.file === issue.file && n.line === issue.line
      );

      return {
        id: `${issue.tool}-${issue.file}-${issue.line}`,
        rule: issue.rule ? String(issue.rule) : 'unknown-rule',
        category: isNew ? 'NEW' : 'EXISTING_REST',
        detectedCategory: detectIssueCategory(issue.tool, issue.rule ? String(issue.rule) : ''),
        severity: issue.severity || 'medium',
        title: issue.message || 'Code quality issue',
        file: issue.file || 'unknown',
        line: issue.line || 0,
        tool: issue.tool || 'unknown',
        message: issue.message || '',
        codeSnippet: undefined,
        suggestedFix: undefined
      };
    });

    const groupingResult = groupIssues(formattedIssues);
    console.log(`   ✅ Grouped ${formattedIssues.length} issues into ${groupingResult.groups.length} groups`);
    console.log(`   ✅ Cost savings: ${groupingResult.savingsPercent.toFixed(1)}%`);
    console.log(`   ✅ AI calls: ${groupingResult.groups.length} (instead of ${formattedIssues.length})`);

    // ========================================================================
    // STEP 5: Report Generation (Grouped Formatter)
    // ========================================================================
    console.log('\n📝 Step 5: Generating report...');

    const modelConfigResolver = new ModelConfigResolver();
    console.log('   ✅ Using Supabase model configuration');

    const formatter = new V9GroupedReportFormatter(
      modelConfigResolver,
      'typescript',
      'medium'
    );

    // Fetch real PR data from GitHub API
    console.log(`\n📡 Fetching real PR data from GitHub API...`);

    let prData;
    let repoStats;

    try {
      console.log('[Test] Importing GitHub API client...');
      const { GitHubAPIClient } = await import('../../src/two-branch/utils/github-api-client');
      console.log('[Test] ✅ GitHub API client imported successfully');

      const githubClient = new GitHubAPIClient();
      console.log('[Test] ✅ GitHub API client instantiated');

      console.log('[Test] Fetching PR data...');
      prData = await githubClient.fetchPRData(scenario.repoUrl, scenario.prNumber);
      console.log('[Test] Fetching repo stats...');
      repoStats = await githubClient.fetchRepoStats(scenario.repoUrl);

      console.log(`   ✅ PR Author: ${prData.author.login}`);
      console.log(`   ✅ File Changes: +${prData.stats.additions} -${prData.stats.deletions}`);
    } catch (error: any) {
      console.error(`   ❌ GitHub API error: ${error.message}`);
      console.error(`   ❌ Error stack: ${error.stack}`);
      console.warn(`   ⚠️  Using fallback data`);

      // Fallback to defaults
      prData = {
        author: { login: 'unknown', email: 'unknown@example.com' },
        stats: { additions: 0, deletions: 0, changedFiles: 0 },
        repository: { fullName: scenario.repoUrl.split('/').slice(-2).join('/'), owner: '', name: '' },
        pr: { number: scenario.prNumber, title: `PR #${scenario.prNumber}`, baseBranch: 'main', headBranch: `pr-${scenario.prNumber}` }
      };
      repoStats = { totalFiles: 0, totalLinesOfCode: 0 };
    }

    const metadata = {
      repository: prData.repository.fullName,
      repoUrl: scenario.repoUrl,
      repoPath: repoPath,
      prNumber: scenario.prNumber,
      prTitle: prData.pr.title,
      branch: prData.pr.headBranch,
      baseBranch: prData.pr.baseBranch,
      prAuthor: prData.author.login,
      prAuthorEmail: prData.author.email,
      organizationName: prData.repository.owner,
      totalFiles: repoStats.totalFiles || new Set(allPrIssues.map(i => i.file)).size,
      totalLinesOfCode: repoStats.totalLinesOfCode || allPrIssues.length * 50, // Rough estimate
      filesModified: new Set(allPrIssues.map(i => i.file)).size,
      linesAdded: prData.stats.additions || 500,
      linesDeleted: prData.stats.deletions || 200,
      decision: newIssues.filter(i => i.severity === 'critical' || i.severity === 'high').length > 0 ? 'DECLINED' : 'APPROVED',
      blockingCount: newIssues.filter(i => i.severity === 'critical' || i.severity === 'high').length,
      totalDuration: Date.now() - startTime,
      cloneTime: 5000,
      analysisTime: Date.now() - startTime - 5000,
      reportGenerationTime: 1000,
      analyzedAt: new Date().toISOString(),
      analyzerVersion: '9.0.0',

      // Performance data from orchestrator
      toolPerformance: prResult.toolPerformance,
      agentPerformance: prResult.agentPerformance
    };

    const result = await formatter.generateGroupedReport(
      formattedIssues,
      groupingResult.groups,
      metadata
    );

    console.log(`   ✅ Report generated: ${result.markdown.length} bytes`);
    console.log(`   ✅ IDE fix files: ${result.ideFixFiles.length}`);
    console.log(`   ✅ Location attachments: ${result.attachments.length}`);

    // ========================================================================
    // STEP 6: Save Results
    // ========================================================================
    console.log('\n💾 Step 6: Saving results...');
    const outputDir = path.join(__dirname, '../../test-outputs');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = Date.now();
    const reportPath = path.join(outputDir, `v9-typescript-lite-${scenario.name.toLowerCase().replace(/\s+/g, '-')}-${timestamp}.md`);
    fs.writeFileSync(reportPath, result.markdown);
    console.log(`   ✅ Report saved: ${reportPath}`);

    // Save IDE fix files
    result.ideFixFiles.forEach((file, idx) => {
      const fixPath = path.join(outputDir, `v9-typescript-fix-${idx}-${timestamp}.json`);
      fs.writeFileSync(fixPath, JSON.stringify(file, null, 2));
    });
    console.log(`   ✅ IDE fix files saved: ${result.ideFixFiles.length} files`);

    // ========================================================================
    // SUMMARY
    // ========================================================================
    const totalTime = Date.now() - startTime;
    console.log(`\n${'='.repeat(80)}`);
    console.log(`✅ TEST PASSED: ${scenario.name}`);
    console.log(`${'='.repeat(80)}`);
    console.log(`📊 Total execution time: ${(totalTime / 1000).toFixed(2)}s`);
    console.log(`📊 Tools executed: ${tools.length}`);
    console.log(`📊 Issues found: ${allPrIssues.length}`);
    console.log(`📊 New issues: ${newIssues.length}`);
    console.log(`📊 Issue groups: ${groupingResult.groups.length}`);
    console.log(`📊 Cost savings: ${groupingResult.savingsPercent.toFixed(1)}%`);
    console.log(`📊 Report size: ${(result.markdown.length / 1024).toFixed(1)} KB`);
    console.log(`📊 Parallel execution speedup: ${prResult.summary.toolsExecuted} tools in parallel`);
    console.log(`${'='.repeat(80)}\n`);

  } catch (error) {
    console.error(`\n❌ TEST FAILED: ${scenario.name}`);
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof Error && error.stack) {
      console.error(`Stack: ${error.stack}`);
    }
    throw error;
  } finally {
    // Cleanup: remove cloned repository
    if (fs.existsSync(repoPath)) {
      console.log(`\n🧹 Cleaning up: ${repoPath}`);
      execSync(`rm -rf ${repoPath}`);
    }
  }
}

async function main(): Promise<void> {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                                                                           ║
║                V9 TYPESCRIPT LITE E2E TEST SUITE                          ║
║                   Testing Parallel Tool Execution                         ║
║                                                                           ║
║  Components Tested:                                                       ║
║  ✓ BaseToolOrchestrator (parallel execution)                             ║
║  ✓ TypeScriptToolOrchestrator (4 tools in parallel)                      ║
║  ✓ Universal Tool Configuration                                           ║
║  ✓ Issue Grouping & Cost Optimization                                     ║
║  ✓ Grouped Report Generation                                              ║
║  ✓ Double Clone Fix (single clone + fetch)                                ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
`);

  const overallStartTime = Date.now();
  let passedTests = 0;
  let failedTests = 0;

  for (const scenario of TEST_SCENARIOS) {
    try {
      await runTypeScriptLiteE2ETest(scenario);
      passedTests++;
    } catch (error) {
      failedTests++;
      console.error(`Failed to run test for ${scenario.name}:`, error);
    }
  }

  const totalTime = Date.now() - overallStartTime;

  console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                           FINAL SUMMARY                                   ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  Total Tests: ${TEST_SCENARIOS.length}                                                         ║
║  Passed: ${passedTests}                                                              ║
║  Failed: ${failedTests}                                                              ║
║  Total Time: ${(totalTime / 1000).toFixed(2)}s                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
`);

  if (failedTests > 0) {
    process.exit(1);
  }
}

// Run the test suite
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});



