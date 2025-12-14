/**
 * V9 Python Full E2E Test - Tests ALL Recent Framework Changes
 *
 * This comprehensive test validates:
 * 1. Python tool orchestration (ruff, bandit, mypy, pip-audit, semgrep)
 * 2. Fix system integration (FixOrchestrator with pip-audit and semgrep fixers)
 * 3. Pattern reuse from Supabase
 * 4. V9 Report generation (testing BUG-102 fix)
 * 5. IDE fix file generation
 * 6. Auto-fixable count accuracy
 *
 * Uses PyGoat - OWASP's intentionally vulnerable Python application
 */

import dotenv from 'dotenv';
dotenv.config();

process.env.DEBUG_MODE = process.env.DEBUG_MODE || 'true';

import { PythonToolOrchestrator } from '../../../src/two-branch/tools/python/python-tool-orchestrator';
import { V9GroupedReportFormatter } from '../../../src/two-branch/analyzers/v9-grouped-report-formatter';
import { ModelConfigResolver } from '../../../src/standard/orchestrator/model-config-resolver';
import { ScanFixExecutor } from '../../../src/fix-agent/scan-fix-executor';
import { groupIssues } from '../../../src/two-branch/utils/issue-grouping';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Test configuration
const TEST_REPO = process.env.PYTHON_TEST_REPO || 'adeyosemanputra/pygoat';
const USER_TIER = (process.env.USER_TIER || 'basic') as 'basic' | 'pro';
const MAX_ISSUES_TO_FIX = parseInt(process.env.MAX_FIX_ISSUES || '20', 10);
const OUTPUT_DIR = path.join(__dirname, '../test-outputs');

interface TestResult {
  step: string;
  status: 'pass' | 'fail' | 'warn';
  details: string;
  duration?: number;
}

const results: TestResult[] = [];

function logResult(step: string, status: 'pass' | 'fail' | 'warn', details: string, duration?: number) {
  results.push({ step, status, details, duration });
  const icon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠️';
  const timeStr = duration ? ` (${(duration / 1000).toFixed(1)}s)` : '';
  console.log(`   ${icon} ${step}: ${details}${timeStr}`);
}

async function runFullE2ETest(): Promise<void> {
  const startTime = Date.now();
  const repoPath = `/tmp/test-v9-python-full-${Date.now()}`;
  const mainBranchPath = `/tmp/test-v9-python-main-${Date.now()}`;

  console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║           V9 PYTHON FULL E2E TEST - ALL FRAMEWORK CHANGES                    ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Repository: ${TEST_REPO.padEnd(62)}║
║  User Tier:  ${USER_TIER.padEnd(62)}║
║  Max Fixes:  ${MAX_ISSUES_TO_FIX.toString().padEnd(62)}║
╚══════════════════════════════════════════════════════════════════════════════╝
`);

  try {
    // ========== STEP 1: Clone Repository ==========
    console.log('\n📦 STEP 1: Clone Repository');
    const cloneStart = Date.now();

    fs.mkdirSync(repoPath, { recursive: true });
    execSync(`git clone --depth 10 https://github.com/${TEST_REPO} ${repoPath}`, {
      stdio: 'pipe',
      encoding: 'utf-8',
      timeout: 300000
    });

    // Create main branch copy for two-branch comparison
    execSync(`cp -r ${repoPath} ${mainBranchPath}`, { stdio: 'pipe' });
    const headCommit = execSync(`cd ${repoPath} && git rev-parse HEAD`, { encoding: 'utf-8' }).trim();
    const mainCommit = execSync(`cd ${repoPath} && git rev-parse HEAD~5 2>/dev/null || git rev-parse HEAD`, { encoding: 'utf-8' }).trim();
    execSync(`cd ${mainBranchPath} && git checkout ${mainCommit} 2>/dev/null || true`, { stdio: 'pipe' });

    logResult('Repository Clone', 'pass', `${TEST_REPO} cloned`, Date.now() - cloneStart);

    // ========== STEP 2: Run Python Tool Orchestration ==========
    console.log('\n🔍 STEP 2: Python Tool Orchestration');
    const orchestrateStart = Date.now();

    const orchestrator = new PythonToolOrchestrator();

    console.log('   📊 Scanning main branch...');
    const mainResult = await orchestrator.orchestrate(mainBranchPath, 'base', { analysisMode: 'complete' });

    console.log('   📊 Scanning PR branch...');
    const prResult = await orchestrator.orchestrate(repoPath, 'base', { analysisMode: 'complete' });

    const mainIssues = mainResult.toolResults?.flatMap(tr => tr.issues || []) || [];
    const prIssues = prResult.toolResults?.flatMap(tr => tr.issues || []) || [];

    logResult('Main Branch Scan', 'pass', `${mainIssues.length} issues found`);
    logResult('PR Branch Scan', 'pass', `${prIssues.length} issues found`, Date.now() - orchestrateStart);

    // Tool breakdown
    console.log('\n   📊 Issues by tool:');
    const byTool: Record<string, number> = {};
    for (const issue of prIssues) {
      byTool[issue.tool] = (byTool[issue.tool] || 0) + 1;
    }
    Object.entries(byTool)
      .sort((a, b) => b[1] - a[1])
      .forEach(([tool, count]) => {
        console.log(`      ${tool.padEnd(15)} ${count}`);
      });

    // Verify expected tools ran
    const expectedTools = ['ruff', 'bandit', 'mypy', 'pip-audit', 'semgrep'];
    const toolsRan = prResult.toolResults?.map(tr => tr.tool) || [];
    const missingTools = expectedTools.filter(t => !toolsRan.includes(t));

    if (missingTools.length > 0) {
      logResult('Tool Coverage', 'warn', `Missing: ${missingTools.join(', ')}`);
    } else {
      logResult('Tool Coverage', 'pass', `All ${expectedTools.length} tools executed`);
    }

    // ========== STEP 3: Issue Categorization ==========
    console.log('\n📂 STEP 3: Issue Categorization');

    // Create fingerprints for main branch issues
    const mainFingerprints = new Set(
      mainIssues.map(i => `${i.file}::${i.tool}::${i.rule || 'no-rule'}`)
    );

    const newIssues = prIssues.filter(i => {
      const fp = `${i.file}::${i.tool}::${i.rule || 'no-rule'}`;
      return !mainFingerprints.has(fp);
    });

    logResult('New Issues', 'pass', `${newIssues.length} NEW issues identified`);
    logResult('Existing Issues', 'pass', `${prIssues.length - newIssues.length} existing issues`);

    // ========== STEP 4: Test Fix System Integration ==========
    console.log('\n🔧 STEP 4: Fix System Integration');
    const fixStart = Date.now();

    // Prioritize fixable tools
    const toolPriority: Record<string, number> = {
      'ruff': 1, 'mypy': 2, 'semgrep': 3, 'pip-audit': 4, 'bandit': 5
    };

    const sortedIssues = [...prIssues].sort((a, b) =>
      (toolPriority[a.tool] || 99) - (toolPriority[b.tool] || 99)
    );

    const issuesToFix = sortedIssues.slice(0, MAX_ISSUES_TO_FIX).map(issue => ({
      file: issue.file,
      line: issue.line,
      column: issue.column || 1,
      rule: issue.rule || 'unknown',
      tool: issue.tool,
      message: issue.message,
      severity: issue.severity || 'medium',
      category: 'NEW' as const,
    }));

    console.log(`   🔧 Processing ${issuesToFix.length} issues through fix flow...`);

    const fixExecutor = new ScanFixExecutor({
      workingDir: repoPath,
      language: 'python',
      outputMode: 'patch',
      dryRun: USER_TIER === 'basic',  // BASIC = recommendations, PRO = apply
      userTier: USER_TIER,
      fixWithReview: true,
    });

    const fixResults = await fixExecutor.executeFixes(issuesToFix);

    logResult('Fix Execution', 'pass',
      `Fixed: ${fixResults.summary.fixedIssues}, ` +
      `Tier1: ${fixResults.summary.tier1Fixed || 0}, ` +
      `Tier2: ${fixResults.summary.tier2Fixed || 0}, ` +
      `Tier3: ${fixResults.summary.tier3Fixed || 0}`,
      Date.now() - fixStart
    );

    // Check pattern reuse
    const patternReused = fixResults.summary.tier2Fixed || 0;
    if (patternReused > 0) {
      logResult('Pattern Reuse', 'pass', `${patternReused} issues fixed via Supabase patterns (no AI cost)`);
    } else {
      logResult('Pattern Reuse', 'warn', 'No pattern reuse detected');
    }

    // ========== STEP 5: Issue Grouping ==========
    console.log('\n💰 STEP 5: Issue Grouping');

    const detectIssueCategory = (tool: string, rule?: string): string => {
      if (tool === 'bandit' || tool === 'semgrep') return 'Security';
      if (tool === 'ruff' && rule?.startsWith('S')) return 'Security';
      if (tool === 'safety' || tool === 'pip-audit') return 'Dependencies';
      if (tool === 'pylint' || tool === 'mypy' || tool === 'ruff') return 'Code Quality';
      return 'Code Quality';
    };

    const newFingerprints = new Set(
      newIssues.map(i => `${i.file}::${i.tool}::${i.rule || 'no-rule'}`)
    );

    // Create a map of fix results for merging into issues
    const fixMap = new Map<string, string>();
    if (fixResults.fixedButNeedsReview) {
      for (const fix of fixResults.fixedButNeedsReview) {
        const key = `${fix.file}::${fix.line}::${fix.rule}`;
        if (fix.correctedCode) {
          fixMap.set(key, fix.correctedCode);
        }
      }
    }
    console.log(`   📊 Fix map: ${fixMap.size} fixes with correctedCode available`);

    const formattedIssues = prIssues.map(issue => {
      const fixKey = `${issue.file}::${issue.line}::${issue.rule || 'unknown'}`;
      const correctedCode = fixMap.get(fixKey);

      return {
        id: `${issue.tool}-${issue.file}-${issue.line}`,
        rule: issue.rule ? String(issue.rule) : 'unknown-rule',
        category: newFingerprints.has(`${issue.file}::${issue.tool}::${issue.rule || 'no-rule'}`) ? 'NEW' : 'EXISTING_REST',
        detectedCategory: detectIssueCategory(issue.tool, issue.rule ? String(issue.rule) : undefined),
        severity: issue.severity || 'medium',
        title: issue.message || 'Code quality issue',
        file: issue.file || 'unknown',
        line: issue.line || 0,
        tool: issue.tool || 'unknown',
        message: issue.message || '',
        codeSnippet: undefined,
        suggestedFix: undefined,
        // Include fix suggestion with correctedCode from ScanFixExecutor (BASIC tier recommendations)
        fixSuggestion: correctedCode ? {
          fix: `Apply the recommended fix`,
          correctedCode: correctedCode,
          explanation: `Automatically generated fix for ${issue.rule || 'this issue'}`,
          bestPractices: []
        } : undefined
      };
    });

    const groupingResult = groupIssues(formattedIssues);
    logResult('Issue Grouping', 'pass',
      `${formattedIssues.length} issues → ${groupingResult.groups.length} groups (${groupingResult.savingsPercent.toFixed(1)}% savings)`
    );

    // ========== STEP 6: Generate V9 Report (Tests BUG-102) ==========
    console.log('\n📝 STEP 6: V9 Report Generation (Testing BUG-102 fix)');
    const reportStart = Date.now();

    // Use PRO tier for AI enrichment or null for BASIC ($0 cost)
    const modelConfigResolver = USER_TIER === 'pro' ? new ModelConfigResolver() : null;
    const formatter = new V9GroupedReportFormatter(modelConfigResolver, 'python', 'medium');

    const metadata = {
      repository: TEST_REPO,
      repoUrl: `https://github.com/${TEST_REPO}`,
      repoPath: repoPath,
      prNumber: 1,
      prTitle: `V9 Full E2E Test - ${TEST_REPO}`,
      branch: headCommit.substring(0, 8),
      baseBranch: mainCommit.substring(0, 8),
      prAuthor: 'test-user',
      prAuthorEmail: 'test@example.com',
      organizationName: TEST_REPO.split('/')[0],
      totalFiles: 0,  // Auto-calculated
      totalLinesOfCode: 0,  // Auto-calculated
      filesModified: 0,
      linesAdded: 0,
      linesDeleted: 0,
      decision: newIssues.filter(i => i.severity === 'critical' || i.severity === 'high').length > 0 ? 'DECLINED' : 'APPROVED',
      blockingCount: newIssues.filter(i => i.severity === 'critical' || i.severity === 'high').length,
      totalDuration: Date.now() - startTime,
      cloneTime: 5000,
      analysisTime: Date.now() - startTime - 5000,
      reportGenerationTime: 1000,
      analyzedAt: new Date().toISOString(),
      analyzerVersion: '9.0.0',
      toolPerformance: prResult.toolPerformance,
      agentPerformance: prResult.agentPerformance
    };

    try {
      const result = await formatter.generateGroupedReport(formattedIssues, groupingResult.groups, metadata);

      logResult('Report Generation', 'pass',
        `${(result.markdown.length / 1024).toFixed(1)}KB markdown generated`,
        Date.now() - reportStart
      );

      // ========== STEP 7: Verify IDE Fix Files ==========
      console.log('\n📁 STEP 7: IDE Fix Files');

      if (result.ideFixFiles && result.ideFixFiles.length > 0) {
        logResult('IDE Fix Files', 'pass', `${result.ideFixFiles.length} fix files generated`);

        // Save fix files
        const fixDir = path.join(OUTPUT_DIR, 'attachments');
        if (!fs.existsSync(fixDir)) {
          fs.mkdirSync(fixDir, { recursive: true });
        }

        for (const fixFile of result.ideFixFiles) {
          const filename = `python-${fixFile.groupId || 'unknown'}.json`;
          fs.writeFileSync(path.join(fixDir, filename), JSON.stringify(fixFile, null, 2));
        }
        logResult('Fix Files Saved', 'pass', `Saved to ${fixDir}`);
      } else {
        logResult('IDE Fix Files', 'warn', 'No fix files generated');
      }

      // ========== STEP 8: Verify Auto-Fixable Counts ==========
      console.log('\n🔢 STEP 8: Auto-Fixable Count Verification');

      // Count issues marked as auto-fixable in the report
      const autoFixableMarkers = (result.markdown.match(/Auto-fixable|auto-fix available/gi) || []).length;
      logResult('Auto-Fixable Markers', autoFixableMarkers > 0 ? 'pass' : 'warn',
        `${autoFixableMarkers} auto-fixable indicators in report`
      );

      // Save report
      if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
      }
      const reportPath = path.join(OUTPUT_DIR, 'python-v9-full-e2e-report.md');
      fs.writeFileSync(reportPath, result.markdown);
      logResult('Report Saved', 'pass', reportPath);

    } catch (error) {
      logResult('Report Generation', 'fail',
        `BUG-102 may still exist: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }

    // ========== SUMMARY ==========
    const totalTime = Date.now() - startTime;
    const passed = results.filter(r => r.status === 'pass').length;
    const failed = results.filter(r => r.status === 'fail').length;
    const warned = results.filter(r => r.status === 'warn').length;

    console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                           TEST RESULTS SUMMARY                                ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Repository:     ${TEST_REPO.padEnd(58)}║
║  Total Time:     ${(totalTime / 1000).toFixed(1)}s${' '.repeat(56)}║
║  Results:        ${passed} passed, ${failed} failed, ${warned} warnings${' '.repeat(38)}║
║                                                                              ║
║  Issues Found:   ${prIssues.length.toString().padEnd(58)}║
║  Issues Fixed:   ${fixResults.summary.fixedIssues.toString().padEnd(58)}║
║  Groups:         ${groupingResult.groups.length.toString().padEnd(58)}║
║  Pattern Reuse:  ${(fixResults.summary.tier2Fixed || 0).toString().padEnd(58)}║
╚══════════════════════════════════════════════════════════════════════════════╝
`);

    if (failed > 0) {
      console.log('\n❌ TEST FAILED - See errors above');
      process.exit(1);
    } else {
      console.log('\n✅ ALL TESTS PASSED');
    }

  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error);
    throw error;
  } finally {
    // Cleanup
    if (fs.existsSync(repoPath)) {
      execSync(`rm -rf ${repoPath}`, { stdio: 'pipe' });
    }
    if (fs.existsSync(mainBranchPath)) {
      execSync(`rm -rf ${mainBranchPath}`, { stdio: 'pipe' });
    }
  }
}

runFullE2ETest().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
