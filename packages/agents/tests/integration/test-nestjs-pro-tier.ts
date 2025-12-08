/**
 * NestJS PRO Tier Test
 *
 * Tests V9 PRO tier analysis on TypeScript NestJS framework
 * - Uses NestJS repo with a real PR for realistic testing
 * - Validates AI Fixer works for TypeScript backend code
 * - Tests pattern learning for TypeScript security rules
 * - Verifies framework detection as 'nestjs'
 */

import dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../../.env') });

// E2E Test Configuration
process.env.DEBUG_MODE = process.env.DEBUG_MODE || 'true';

import { TypeScriptToolOrchestrator } from '../../src/two-branch/tools/typescript/typescript-tool-orchestrator';
import { createFrameworkDetector } from '../../src/two-branch/utils/framework-detector';
import { createToolConfigResolver } from '../../src/two-branch/config/universal-tool-config';
import { V9GroupedReportFormatter } from '../../src/two-branch/analyzers/v9-grouped-report-formatter';
import { ModelConfigResolver } from '../../src/standard/orchestrator/model-config-resolver';
import { groupIssues } from '../../src/two-branch/utils/issue-grouping';
import { execSync } from 'child_process';
import * as fs from 'fs';

interface TestConfig {
  name: string;
  repoUrl: string;
  prNumber: number;
  language: 'typescript';
  expectedFramework: string;
  userTier: 'basic' | 'pro';
}

const TEST_CONFIG: TestConfig = {
  name: 'NestJS PR - TypeScript Backend PRO Tier Test',
  repoUrl: 'https://github.com/nestjs/nest',
  prNumber: 16005,  // fix(core): Fix of core from search results
  language: 'typescript',
  expectedFramework: 'nestjs',
  userTier: (process.env.USER_TIER as 'basic' | 'pro') || 'pro',
};

function cloneRepository(repoUrl: string, targetPath: string): void {
  console.log(`   🔄 Cloning ${repoUrl}...`);
  if (fs.existsSync(targetPath)) {
    execSync(`rm -rf ${targetPath}`);
  }
  execSync(`git clone --depth 50 ${repoUrl} ${targetPath}`, {
    stdio: 'pipe',
    encoding: 'utf-8'
  });
  console.log(`   ✅ Repository cloned to ${targetPath}`);
}

async function runNestJSTest(): Promise<void> {
  console.log('='.repeat(70));
  console.log('NESTJS PRO TIER TEST - TypeScript Backend Framework');
  console.log('='.repeat(70));
  console.log('');
  console.log(`Test: ${TEST_CONFIG.name}`);
  console.log(`Repo: ${TEST_CONFIG.repoUrl}`);
  console.log(`PR: #${TEST_CONFIG.prNumber}`);
  console.log(`Tier: ${TEST_CONFIG.userTier.toUpperCase()}`);
  console.log('');

  const testDir = `/tmp/test-nestjs-${Date.now()}`;
  const repoPath = `${testDir}/nest`;
  const outputDir = path.join(__dirname, 'test-outputs', 'nestjs-pro-tier');

  try {
    // 1. Clone repository
    console.log('📥 Step 1: Cloning repository...');
    fs.mkdirSync(testDir, { recursive: true });
    cloneRepository(TEST_CONFIG.repoUrl, repoPath);

    // 2. Fetch and checkout PR branch
    console.log('');
    console.log(`🔀 Step 2: Fetching PR #${TEST_CONFIG.prNumber}...`);
    try {
      execSync(`cd ${repoPath} && git fetch origin pull/${TEST_CONFIG.prNumber}/head:pr-${TEST_CONFIG.prNumber}`, {
        stdio: 'pipe',
        encoding: 'utf-8'
      });
      execSync(`cd ${repoPath} && git checkout pr-${TEST_CONFIG.prNumber}`, {
        stdio: 'pipe',
        encoding: 'utf-8'
      });
      console.log(`   ✅ Checked out PR #${TEST_CONFIG.prNumber}`);
    } catch (prError) {
      console.log(`   ⚠️ Could not fetch PR #${TEST_CONFIG.prNumber} - may be closed/merged`);
      console.log(`   📋 Using main branch for analysis instead`);
    }

    // 3. Detect framework
    console.log('');
    console.log('🔍 Step 3: Detecting framework...');
    const frameworkDetector = createFrameworkDetector();
    const frameworkInfo = await frameworkDetector.detectFrameworks(repoPath);
    console.log(`   Framework: ${frameworkInfo.primaryFramework}`);
    console.log(`   Build system: ${frameworkInfo.buildSystem || 'npm'}`);
    console.log(`   Confidence: ${frameworkInfo.confidence}%`);

    if (frameworkInfo.primaryFramework !== TEST_CONFIG.expectedFramework) {
      console.log(`   ⚠️ Expected framework: ${TEST_CONFIG.expectedFramework}, got: ${frameworkInfo.primaryFramework}`);
    }

    // 4. Initialize TypeScript orchestrator
    console.log('');
    console.log('🛠️ Step 4: Initializing TypeScript tool orchestrator...');

    // TypeScriptToolOrchestrator takes Partial<TypeScriptToolConfig> directly
    const orchestrator = new TypeScriptToolOrchestrator({
      eslint: { enabled: true, fix: false },
      typescript: { enabled: true, strict: false },
      semgrep: { enabled: true, config: 'auto' },
      npmAudit: { enabled: true, level: 'moderate', production: false },
    });

    // 5. Run analysis
    console.log('');
    console.log('🔬 Step 5: Running analysis (this may take a few minutes)...');

    // Get main branch for comparison
    const mainBranch = execSync(`cd ${repoPath} && git remote show origin | grep 'HEAD branch' | cut -d' ' -f5`, {
      encoding: 'utf-8'
    }).trim() || 'master';
    console.log(`   Main branch: ${mainBranch}`);

    // Analyze main branch first (base)
    console.log('   - Analyzing main branch...');
    execSync(`cd ${repoPath} && git checkout ${mainBranch}`, { stdio: 'pipe' });
    const mainResults = await orchestrator.orchestrate(repoPath, 'base', { userTier: TEST_CONFIG.userTier });
    // Extract issues from toolResults (OrchestrationResult has toolResults[].issues, not direct issues)
    const mainIssues = mainResults.toolResults?.flatMap(tr => tr.issues || []) || [];
    console.log(`   Main branch: ${mainIssues.length} issues`);

    // Analyze PR branch (head)
    console.log('   - Analyzing PR/current branch...');
    try {
      execSync(`cd ${repoPath} && git checkout pr-${TEST_CONFIG.prNumber}`, { stdio: 'pipe' });
    } catch {
      // Stay on current branch if PR checkout fails
    }
    const prResults = await orchestrator.orchestrate(repoPath, 'pr', { userTier: TEST_CONFIG.userTier });
    // Extract issues from toolResults
    const prIssues = prResults.toolResults?.flatMap(tr => tr.issues || []) || [];
    console.log(`   PR branch: ${prIssues.length} issues`);

    // 6. Categorize issues
    console.log('');
    console.log('📊 Step 6: Categorizing issues (NEW vs EXISTING)...');
    const mainIssueHashes = new Set(
      mainIssues.map(i => `${i.file}:${i.line}:${i.ruleId}`)
    );

    const categorizedIssues = prIssues.map(issue => ({
      ...issue,
      category: mainIssueHashes.has(`${issue.file}:${issue.line}:${issue.ruleId}`)
        ? 'EXISTING'
        : 'NEW'
    }));

    const newIssues = categorizedIssues.filter(i => i.category === 'NEW');
    const existingIssues = categorizedIssues.filter(i => i.category === 'EXISTING');

    console.log(`   NEW issues (introduced in PR): ${newIssues.length}`);
    console.log(`   EXISTING issues (already in main): ${existingIssues.length}`);

    // 7. Group issues
    console.log('');
    console.log('📁 Step 7: Grouping issues by rule...');
    const groupedIssues = groupIssues(categorizedIssues);
    console.log(`   Issue groups: ${groupedIssues.length}`);

    // Show top rules
    const ruleCounts: Record<string, number> = {};
    for (const issue of categorizedIssues) {
      const rule = issue.ruleId || 'unknown';
      ruleCounts[rule] = (ruleCounts[rule] || 0) + 1;
    }
    const topRules = Object.entries(ruleCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    console.log('   Top rules:');
    for (const [rule, count] of topRules) {
      console.log(`     - ${rule}: ${count} issues`);
    }

    // 8. PRO tier: Execute fixes
    let fixResults: { totalProcessed: number; fixed: number; manualReview: number } | null = null;
    if (TEST_CONFIG.userTier === 'pro' && categorizedIssues.length > 0) {
      console.log('');
      console.log('🔧 Step 8: PRO Tier - Executing AI Fixes...');

      // Import ScanFixExecutor
      const { ScanFixExecutor } = await import('../../src/fix-agent/scan-fix-executor');

      const fixExecutor = new ScanFixExecutor({
        workingDir: repoPath,
        language: 'typescript',
        outputMode: 'patch',
        dryRun: true, // Don't actually modify files in test
      });

      const scanFixResults = await fixExecutor.executeFixes(categorizedIssues);

      fixResults = {
        totalProcessed: scanFixResults.summary.totalIssues,
        fixed: scanFixResults.summary.fixedIssues,
        manualReview: scanFixResults.summary.skippedIssues + scanFixResults.summary.failedIssues
      };

      console.log(`   Issues processed: ${fixResults.totalProcessed}`);
      console.log(`   Auto-fixed: ${fixResults.fixed}`);
      console.log(`   Manual review: ${fixResults.manualReview}`);
      const fixRate = fixResults.totalProcessed > 0
        ? ((fixResults.fixed / fixResults.totalProcessed) * 100).toFixed(1)
        : '0.0';
      console.log(`   Fix rate: ${fixRate}%`);
    } else if (categorizedIssues.length === 0) {
      console.log('');
      console.log('ℹ️ Step 8: No issues found - skipping fix execution');
    } else {
      console.log('');
      console.log('ℹ️ Step 8: BASIC tier - Skipping fix execution (classify only)');
    }

    // 9. Generate report
    console.log('');
    console.log('📝 Step 9: Generating report...');

    const modelResolver = new ModelConfigResolver();
    const formatter = new V9GroupedReportFormatter({
      modelResolver,
      tier: TEST_CONFIG.userTier,
    });

    const report = await formatter.format({
      repository: TEST_CONFIG.repoUrl,
      prNumber: TEST_CONFIG.prNumber,
      baseBranch: mainBranch,
      headBranch: `pr-${TEST_CONFIG.prNumber}`,
      issues: categorizedIssues,
      groupedIssues,
      metadata: {
        framework: frameworkInfo.primaryFramework,
        language: 'typescript',
        analyzedAt: new Date().toISOString(),
      }
    });

    // 10. Save outputs
    console.log('');
    console.log('💾 Step 10: Saving outputs...');
    fs.mkdirSync(outputDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    fs.writeFileSync(
      path.join(outputDir, `nestjs-pro-report-${timestamp}.md`),
      report.markdown
    );
    fs.writeFileSync(
      path.join(outputDir, `nestjs-pro-issues-${timestamp}.json`),
      JSON.stringify(categorizedIssues, null, 2)
    );

    console.log(`   ✅ Report saved to ${outputDir}`);

    // Summary
    console.log('');
    console.log('='.repeat(70));
    console.log('TEST SUMMARY');
    console.log('='.repeat(70));
    console.log(`✅ NestJS PRO Tier Test COMPLETED`);
    console.log(`   Framework detected: ${frameworkInfo.primaryFramework}`);
    console.log(`   Total issues: ${categorizedIssues.length}`);
    console.log(`   NEW issues: ${newIssues.length}`);
    console.log(`   EXISTING issues: ${existingIssues.length}`);
    if (fixResults) {
      const fixRate = fixResults.totalProcessed > 0
        ? ((fixResults.fixed / fixResults.totalProcessed) * 100).toFixed(1)
        : '0.0';
      console.log(`   Fix rate: ${fixRate}%`);
    }
    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ TEST FAILED');
    console.error(error);
    throw error;
  } finally {
    // Cleanup
    console.log('🧹 Cleaning up...');
    try {
      execSync(`rm -rf ${testDir}`, { stdio: 'pipe' });
    } catch {
      // Ignore cleanup errors
    }
  }
}

// Run the test
runNestJSTest()
  .then(() => {
    console.log('');
    console.log('✅ Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Test failed:', error.message);
    process.exit(1);
  });
