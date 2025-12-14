/**
 * Generate Python V9 Report for Review
 *
 * This script runs the Python V9 analysis and saves the full report to a file
 * for template compliance review.
 *
 * SESSION 51: Implements proper TWO-BRANCH analysis:
 * - Main branch (older commit) = baseline with EXISTING issues
 * - PR branch (HEAD) = current state with NEW + EXISTING issues
 *
 * Output: tests/integration/test-outputs/python-v9-report-review.md
 */

import dotenv from 'dotenv';
dotenv.config();

process.env.DEBUG_MODE = process.env.DEBUG_MODE || 'true';

import { PythonToolOrchestrator } from '../../../src/two-branch/tools/python/python-tool-orchestrator';
import { createToolConfigResolver } from '../../../src/two-branch/config/universal-tool-config';
import { V9GroupedReportFormatter } from '../../../src/two-branch/analyzers/v9-grouped-report-formatter';
import { ModelConfigResolver } from '../../../src/standard/orchestrator/model-config-resolver';
import { V9RepositoryManager } from '../../../src/two-branch/services/v9-repository-manager';
import { groupIssues } from '../../../src/two-branch/utils/issue-grouping';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const OUTPUT_DIR = path.join(__dirname, '../test-outputs');
const REPORT_FILE = path.join(OUTPUT_DIR, 'python-v9-report-review.md');
const JSON_FILE = path.join(OUTPUT_DIR, 'python-v9-report-data.json');

// Number of commits back to use as "main branch" baseline
const COMMITS_BACK_FOR_MAIN = 5;

// Configuration for real PR testing (set via env vars)
// Example: PYTHON_TEST_REPO=pallets/flask PYTHON_TEST_PR=5432
const TEST_REPO = process.env.PYTHON_TEST_REPO || 'adeyosemanputra/pygoat';
const TEST_PR = process.env.PYTHON_TEST_PR ? parseInt(process.env.PYTHON_TEST_PR, 10) : null;

async function generatePythonReport(): Promise<void> {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║        PYTHON V9 REPORT GENERATION - TWO-BRANCH ANALYSIS                  ║
╚═══════════════════════════════════════════════════════════════════════════╝
`);

  const startTime = Date.now();
  const repoPath = `/tmp/test-repo-python-review-${Date.now()}`;
  const mainBranchPath = `/tmp/test-repo-python-main-${Date.now()}`;

  try {
    // Ensure output directory exists
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    // Clone repository with enough history for two-branch comparison
    // SESSION 51: Clone with sufficient depth to checkout older commits
    // SESSION 53: Now uses TEST_REPO env var for calibration across multiple repos
    const repoUrl = `https://github.com/${TEST_REPO}`;
    console.log(`📦 Step 1: Cloning ${TEST_REPO} repository...`);

    // Clean up any existing repos
    if (fs.existsSync(repoPath)) {
      execSync(`rm -rf ${repoPath}`);
    }
    if (fs.existsSync(mainBranchPath)) {
      execSync(`rm -rf ${mainBranchPath}`);
    }

    // Clone with enough depth for commit history
    execSync(`git clone --depth ${COMMITS_BACK_FOR_MAIN + 5} ${repoUrl} ${repoPath}`, {
      stdio: 'pipe',
      encoding: 'utf-8'
    });
    console.log(`   ✅ Repository cloned (${TEST_REPO})`);

    // Get commit hashes for two-branch comparison
    console.log('\n📊 Step 1.5: Setting up two-branch comparison...');
    const headCommit = execSync(`cd ${repoPath} && git rev-parse HEAD`, { encoding: 'utf-8' }).trim();
    const mainCommit = execSync(`cd ${repoPath} && git rev-parse HEAD~${COMMITS_BACK_FOR_MAIN}`, { encoding: 'utf-8' }).trim();
    console.log(`   📌 PR Branch (HEAD):  ${headCommit.substring(0, 8)}`);
    console.log(`   📌 Main Branch:       ${mainCommit.substring(0, 8)} (HEAD~${COMMITS_BACK_FOR_MAIN})`);

    // SESSION 52: Use common V9RepositoryManager for author extraction
    const repoManager = new V9RepositoryManager();
    const commitMetadata = repoManager.getCommitMetadata(repoPath, 'HEAD');
    console.log(`   👤 Author: ${commitMetadata.authorName} <${commitMetadata.authorEmail}>`);

    // Create a second copy for main branch analysis
    execSync(`cp -r ${repoPath} ${mainBranchPath}`, { stdio: 'pipe' });
    execSync(`cd ${mainBranchPath} && git checkout ${mainCommit}`, { stdio: 'pipe' });
    console.log('   ✅ Two-branch setup complete');

    // Configure tools
    console.log('\n🔧 Step 2: Configuring Python tools...');
    const toolResolver = createToolConfigResolver();
    const tools = toolResolver.getToolsForLanguage('python');
    console.log(`   ✅ Configured ${tools.length} tools:`);
    tools.forEach(tool => {
      console.log(`      - ${tool.name} (${tool.category})`);
    });

    // Run orchestration on BOTH branches
    console.log('\n🚀 Step 3: Running tool orchestration on BOTH branches...');
    const orchestrator = new PythonToolOrchestrator();

    // SESSION 52: Two-branch analysis using commit comparison
    // Note: We use 'base' for both since we're comparing commits on same branch (not a real PR)
    // The 'pr' type expects an actual PR branch, not HEAD on master
    const prNumber = 1;  // Simulated PR number

    // Scan MAIN branch (baseline - older commit HEAD~5)
    console.log('   📊 Scanning MAIN branch (baseline HEAD~5)...');
    const mainResult = await orchestrator.orchestrate(mainBranchPath, 'base', { analysisMode: 'complete' });

    // Scan PR branch (HEAD - current state) - use 'base' since we're on master
    console.log('   📊 Scanning PR branch (current HEAD)...');
    const prResult = await orchestrator.orchestrate(repoPath, 'base', { analysisMode: 'complete' });

    const mainResults = mainResult.toolResults;
    const prResults = prResult.toolResults;

    console.log(`   ✅ Main branch: ${mainResults.length} tools, ${mainResults.reduce((s, r) => s + (r.issues?.length || 0), 0)} issues`);
    console.log(`   ✅ PR branch: ${prResults.length} tools, ${prResults.reduce((s, r) => s + (r.issues?.length || 0), 0)} issues`);

    // Categorize issues - IMPROVED MATCHING
    // SESSION 52: Fixed issue matching - use file + rule + tool (not exact line)
    // Line numbers shift between commits, so exact line matching causes false "NEW"
    console.log('\n📂 Step 4: Categorizing issues...');
    const allPrIssues = prResults.flatMap(r => r.issues || []);
    const allMainIssues = mainResults.flatMap(r => r.issues || []);

    // Create a set of "issue fingerprints" from main branch for faster lookup
    const mainIssueFingerprints = new Set(
      allMainIssues.map(issue => `${issue.file}::${issue.tool}::${issue.rule || 'no-rule'}`)
    );

    // Issue is NEW if its fingerprint doesn't exist in main branch
    const newIssues = allPrIssues.filter(issue => {
      const fingerprint = `${issue.file}::${issue.tool}::${issue.rule || 'no-rule'}`;
      return !mainIssueFingerprints.has(fingerprint);
    });

    console.log(`   📊 Main branch issues: ${allMainIssues.length}`);
    console.log(`   📊 PR branch issues: ${allPrIssues.length}`);
    console.log(`   ✅ New issues: ${newIssues.length}`);
    console.log(`   ✅ Existing issues: ${allPrIssues.length - newIssues.length}`);

    // Group issues
    console.log('\n💰 Step 5: Grouping issues...');
    // SESSION 51: Updated to include new tools (ruff, pip-audit)
    const detectIssueCategory = (tool: string, rule?: string): string => {
      // Security tools
      if (tool === 'bandit' || tool === 'semgrep') return 'Security';
      // Ruff S* rules are security-related (flake8-bandit equivalent)
      if (tool === 'ruff' && rule && rule.startsWith('S')) return 'Security';
      // Dependency vulnerability tools
      if (tool === 'safety' || tool === 'pip-audit') return 'Dependencies';
      // Code quality tools
      if (tool === 'pylint' || tool === 'mypy' || tool === 'ruff') return 'Code Quality';
      return 'Code Quality';
    };

    // SESSION 52: Use fingerprint-based categorization for consistency
    const newIssueFingerprints = new Set(
      newIssues.map(issue => `${issue.file}::${issue.tool}::${issue.rule || 'no-rule'}`)
    );

    const formattedIssues = allPrIssues.map(issue => ({
      id: `${issue.tool}-${issue.file}-${issue.line}`,
      rule: issue.rule ? String(issue.rule) : 'unknown-rule',
      category: newIssueFingerprints.has(`${issue.file}::${issue.tool}::${issue.rule || 'no-rule'}`) ? 'NEW' : 'EXISTING_REST',
      detectedCategory: detectIssueCategory(issue.tool, issue.rule ? String(issue.rule) : undefined),
      severity: issue.severity || 'medium',
      title: issue.message || 'Code quality issue',
      file: issue.file || 'unknown',
      line: issue.line || 0,
      tool: issue.tool || 'unknown',
      message: issue.message || '',
      codeSnippet: undefined,
      suggestedFix: undefined
    }));

    const groupingResult = groupIssues(formattedIssues);
    console.log(`   ✅ Created ${groupingResult.groups.length} groups`);
    console.log(`   ✅ Cost savings: ${groupingResult.savingsPercent.toFixed(1)}%`);

    // Generate report
    console.log('\n📝 Step 6: Generating V9 report...');

    // SESSION 53 FIX: Tier-based AI enrichment
    // - BASIC tier (default): Use rule descriptions only ($0 cost)
    // - PRO tier: Use AI enrichment for custom fixes (~$1.50 cost)
    const usePROTier = process.env.USE_PRO_TIER === 'true';
    const modelConfigResolver = usePROTier ? new ModelConfigResolver() : null;

    console.log(`   💰 Tier: ${usePROTier ? 'PRO (AI enrichment enabled)' : 'BASIC (rule descriptions only, $0 cost)'}`);

    const formatter = new V9GroupedReportFormatter(modelConfigResolver, 'python', 'medium');

    // SESSION 51: Show detailed breakdown
    const existingCount = allPrIssues.length - newIssues.length;
    console.log(`\n   📋 ISSUE BREAKDOWN:`);
    console.log(`      🆕 NEW issues (in PR, not in main): ${newIssues.length}`);
    console.log(`      📁 EXISTING issues (in both branches): ${existingCount}`);
    console.log(`      📊 Total PR issues: ${allPrIssues.length}`);

    // BUG-095 FIX: Repo stats are now calculated by V9GroupedReportFormatter.calculateRepoStats()
    // Pass 0 values as placeholders - the formatter will calculate real values from repoPath
    console.log('   📊 Repository stats will be calculated by formatter...');

    const metadata = {
      repository: TEST_REPO,
      repoUrl: repoUrl,
      repoPath: repoPath,  // Required for BUG-095 auto-calculation
      prNumber: prNumber,
      prTitle: `Security Analysis - Commits ${mainCommit.substring(0, 8)} to ${headCommit.substring(0, 8)}`,
      branch: headCommit.substring(0, 8),
      baseBranch: mainCommit.substring(0, 8),
      prAuthor: commitMetadata.authorName,
      prAuthorEmail: commitMetadata.authorEmail,
      organizationName: 'OWASP',
      // BUG-095: Pass 0 to trigger auto-calculation in formatter
      totalFiles: 0,
      totalLinesOfCode: 0,
      filesModified: 0,
      linesAdded: 0,
      linesDeleted: 0,
      decision: newIssues.filter(i => i.severity === 'critical' || i.severity === 'high').length > 0 ? 'DECLINED' : 'APPROVED',
      blockingCount: newIssues.filter(i => i.severity === 'critical' || i.severity === 'high').length,
      totalDuration: Date.now() - startTime,
      cloneTime: 5000,  // Approximate, actual clone time tracked elsewhere
      analysisTime: Date.now() - startTime - 5000,
      reportGenerationTime: 1000,
      analyzedAt: new Date().toISOString(),
      analyzerVersion: '9.0.0',
      toolPerformance: prResult.toolPerformance,
      agentPerformance: prResult.agentPerformance
    };

    const result = await formatter.generateGroupedReport(formattedIssues, groupingResult.groups, metadata);

    // Save report to file
    console.log('\n💾 Step 7: Saving report...');
    fs.writeFileSync(REPORT_FILE, result.markdown, 'utf-8');
    console.log(`   ✅ Markdown report saved: ${REPORT_FILE}`);

    // Save JSON data for reference
    const jsonData = {
      metadata,
      issues: formattedIssues,
      groups: groupingResult.groups,
      ideFixFiles: result.ideFixFiles,
      toolResults: prResults.map(r => ({
        tool: r.tool,
        issueCount: r.issues?.length || 0,
        duration: r.duration
      }))
    };
    fs.writeFileSync(JSON_FILE, JSON.stringify(jsonData, null, 2), 'utf-8');
    console.log(`   ✅ JSON data saved: ${JSON_FILE}`);

    // Summary
    const totalTime = Date.now() - startTime;
    console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                           REPORT GENERATION COMPLETE                       ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  Report File:     ${REPORT_FILE.padEnd(55)}║
║  Report Size:     ${(result.markdown.length / 1024).toFixed(1).padEnd(52)}KB ║
║  Total Issues:    ${formattedIssues.length.toString().padEnd(55)}║
║  Issue Groups:    ${groupingResult.groups.length.toString().padEnd(55)}║
║  IDE Fix Files:   ${result.ideFixFiles.length.toString().padEnd(55)}║
║  Generation Time: ${(totalTime / 1000).toFixed(2).padEnd(52)}s ║
╚═══════════════════════════════════════════════════════════════════════════╝

To review the report:
  cat ${REPORT_FILE}

Or open in your editor:
  code ${REPORT_FILE}
`);

  } catch (error) {
    console.error('\n❌ Report generation failed:', error);
    throw error;
  } finally {
    // Cleanup both repo copies
    if (fs.existsSync(repoPath)) {
      execSync(`rm -rf ${repoPath}`);
    }
    if (fs.existsSync(mainBranchPath)) {
      execSync(`rm -rf ${mainBranchPath}`);
    }
  }
}

generatePythonReport().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
