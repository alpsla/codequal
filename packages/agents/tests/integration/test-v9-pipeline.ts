/**
 * V9 Analysis Pipeline Test
 *
 * Tests the unified V9AnalysisPipeline across different languages and tiers.
 * This is the canonical test for the pipeline - use this pattern for all languages.
 */

import dotenv from 'dotenv';
dotenv.config();

import { V9AnalysisPipeline, analyzeRepository } from '../../src/two-branch/services/v9-analysis-pipeline';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Test configuration
const PYTHON_REPO = process.env.PYTHON_TEST_REPO || 'adeyosemanputra/pygoat';
const USER_TIER = (process.env.USER_TIER || 'basic') as 'basic' | 'pro';
const MAX_ISSUES = parseInt(process.env.MAX_ISSUES || '20', 10);
const OUTPUT_DIR = path.join(__dirname, 'test-outputs');

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

async function testPipeline() {
  const startTime = Date.now();
  const repoPath = `/tmp/test-v9-pipeline-${Date.now()}`;

  console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║              V9 ANALYSIS PIPELINE TEST                                       ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Repository: ${PYTHON_REPO.padEnd(62)}║
║  User Tier:  ${USER_TIER.padEnd(62)}║
║  Max Issues: ${MAX_ISSUES.toString().padEnd(62)}║
╚══════════════════════════════════════════════════════════════════════════════╝
`);

  try {
    // ========== STEP 1: Clone Repository ==========
    console.log('\n📦 STEP 1: Clone Repository');
    const cloneStart = Date.now();

    fs.mkdirSync(repoPath, { recursive: true });
    execSync(`git clone --depth 10 https://github.com/${PYTHON_REPO} ${repoPath}`, {
      stdio: 'pipe',
      encoding: 'utf-8',
      timeout: 300000
    });

    logResult('Repository Clone', 'pass', `${PYTHON_REPO} cloned`, Date.now() - cloneStart);

    // ========== STEP 2: Run Pipeline ==========
    console.log('\n🔄 STEP 2: Run V9 Analysis Pipeline');
    const pipelineStart = Date.now();

    const pipeline = new V9AnalysisPipeline({
      repoPath,
      language: 'python',
      userTier: USER_TIER,
      maxIssuesToFix: MAX_ISSUES,
      verbose: true,
      prMetadata: {
        prNumber: 1,
        prTitle: 'Pipeline Test',
        repoUrl: `https://github.com/${PYTHON_REPO}`,
        organizationName: PYTHON_REPO.split('/')[0],
      },
      onProgress: (progress) => {
        console.log(`   [${progress.phase}] ${progress.message}`);
      },
    });

    const result = await pipeline.analyze();

    logResult('Pipeline Execution', 'pass',
      `${result.summary.totalIssues} issues, ${result.summary.recommendedFixes} fixes`,
      Date.now() - pipelineStart
    );

    // ========== STEP 3: Verify Results ==========
    console.log('\n📊 STEP 3: Verify Results');

    // Check issue count
    if (result.issues.length > 0) {
      logResult('Issues Found', 'pass', `${result.issues.length} issues detected`);
    } else {
      logResult('Issues Found', 'warn', 'No issues detected');
    }

    // Check fix recommendations (the key test!)
    if (result.lspData.codeActionCount > 0) {
      logResult('LSP Code Actions', 'pass',
        `${result.lspData.codeActionCount} issues with correctedCode (ready for IDE)`
      );
    } else if (result.summary.totalIssues > 0) {
      logResult('LSP Code Actions', 'warn',
        `0 issues with correctedCode - fix flow may not be generating recommendations`
      );
    }

    // Check groups
    if (result.groups.length > 0) {
      logResult('Issue Grouping', 'pass',
        `${result.summary.issueGroups} groups (cost optimization)`
      );
    }

    // Check report
    if (result.report.markdown.length > 1000) {
      logResult('Report Generation', 'pass',
        `${(result.report.markdown.length / 1024).toFixed(1)}KB report generated`
      );
    } else {
      logResult('Report Generation', 'warn', 'Report seems too short');
    }

    // ========== STEP 4: Print Summary ==========
    console.log('\n📋 PIPELINE RESULT SUMMARY:');
    console.log(`   Total Issues:      ${result.summary.totalIssues}`);
    console.log(`   New Issues:        ${result.summary.newIssues}`);
    console.log(`   Existing Issues:   ${result.summary.existingIssues}`);
    console.log(`   Fixed Issues:      ${result.summary.fixedIssues}`);
    console.log(`   Recommended Fixes: ${result.summary.recommendedFixes}`);
    console.log(`   Issue Groups:      ${result.summary.issueGroups}`);
    console.log(`   LSP Code Actions:  ${result.lspData.codeActionCount}`);
    console.log(`   Decision:          ${result.report.decision}`);
    console.log(`   Blocking Count:    ${result.report.blockingCount}`);

    // Print sample fix if available
    if (result.lspData.fixableIssues.length > 0) {
      const sample = result.lspData.fixableIssues[0];
      console.log('\n📝 SAMPLE FIX (first issue with correctedCode):');
      console.log(`   Rule: ${sample.rule}`);
      console.log(`   File: ${sample.file}:${sample.line}`);
      console.log(`   Code: ${sample.fixSuggestion?.correctedCode?.substring(0, 100)}...`);
    }

    // Save report
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
    const reportPath = path.join(OUTPUT_DIR, 'pipeline-test-report.md');
    fs.writeFileSync(reportPath, result.report.markdown);
    logResult('Report Saved', 'pass', reportPath);

    // ========== SUMMARY ==========
    const totalTime = Date.now() - startTime;
    const passed = results.filter(r => r.status === 'pass').length;
    const failed = results.filter(r => r.status === 'fail').length;
    const warned = results.filter(r => r.status === 'warn').length;

    console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                           TEST RESULTS SUMMARY                                ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Total Time:        ${(totalTime / 1000).toFixed(1)}s${' '.repeat(54)}║
║  Results:           ${passed} passed, ${failed} failed, ${warned} warnings${' '.repeat(33)}║
║  LSP Code Actions:  ${result.lspData.codeActionCount.toString().padEnd(55)}║
║  User Tier:         ${USER_TIER.padEnd(55)}║
╚══════════════════════════════════════════════════════════════════════════════╝
`);

    if (failed > 0) {
      console.log('\n❌ TEST FAILED');
      process.exit(1);
    } else {
      console.log('\n✅ TEST PASSED');
    }

  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error);
    throw error;
  } finally {
    // Cleanup
    if (fs.existsSync(repoPath)) {
      execSync(`rm -rf ${repoPath}`, { stdio: 'pipe' });
    }
  }
}

testPipeline().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
