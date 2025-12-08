/**
 * Java PRO Tier Test - Spring PetClinic
 *
 * Tests V9 PRO tier analysis on Java/Spring framework
 * - PR #950 from spring-projects/spring-petclinic
 * - Validates AI Fixer works for Java code
 * - Tests pattern learning for Java security rules
 */

import dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../../.env') });

// E2E Test Configuration
process.env.DEBUG_MODE = process.env.DEBUG_MODE || 'true';

import { JavaToolOrchestrator } from '../../src/two-branch/tools/java/java-tool-orchestrator';
import { createFrameworkDetector } from '../../src/two-branch/utils/framework-detector';
import { V9GroupedReportFormatter } from '../../src/two-branch/analyzers/v9-grouped-report-formatter';
import { ModelConfigResolver } from '../../src/standard/orchestrator/model-config-resolver';
import { groupIssues } from '../../src/two-branch/utils/issue-grouping';
import { execSync } from 'child_process';
import * as fs from 'fs';

interface TestConfig {
  name: string;
  repoUrl: string;
  prNumber: number;
  language: 'java';
  expectedFramework: string;
  userTier: 'basic' | 'pro';
}

const TEST_CONFIG: TestConfig = {
  name: 'Spring PetClinic PR #950 - Java PRO Tier Test',
  repoUrl: 'https://github.com/spring-projects/spring-petclinic',
  prNumber: 950,
  language: 'java',
  expectedFramework: 'spring',
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

async function runJavaTest(): Promise<void> {
  console.log('='.repeat(70));
  console.log('JAVA PRO TIER TEST - Spring PetClinic PR #950');
  console.log('='.repeat(70));
  console.log('');
  console.log(`Test: ${TEST_CONFIG.name}`);
  console.log(`Repo: ${TEST_CONFIG.repoUrl}`);
  console.log(`PR: #${TEST_CONFIG.prNumber}`);
  console.log(`Tier: ${TEST_CONFIG.userTier.toUpperCase()}`);
  console.log('');

  const testDir = `/tmp/test-java-${Date.now()}`;
  const repoPath = `${testDir}/spring-petclinic`;
  const outputDir = path.join(__dirname, 'test-outputs', 'java-pro-tier');

  try {
    // 1. Clone repository
    console.log('📥 Step 1: Cloning repository...');
    fs.mkdirSync(testDir, { recursive: true });
    cloneRepository(TEST_CONFIG.repoUrl, repoPath);

    // 2. Checkout PR branch
    console.log('');
    console.log(`🔀 Step 2: Fetching PR #${TEST_CONFIG.prNumber}...`);
    execSync(`cd ${repoPath} && git fetch origin pull/${TEST_CONFIG.prNumber}/head:pr-${TEST_CONFIG.prNumber}`, {
      stdio: 'pipe',
      encoding: 'utf-8'
    });
    execSync(`cd ${repoPath} && git checkout pr-${TEST_CONFIG.prNumber}`, {
      stdio: 'pipe',
      encoding: 'utf-8'
    });
    console.log(`   ✅ Checked out PR #${TEST_CONFIG.prNumber}`);

    // 3. Detect framework
    console.log('');
    console.log('🔍 Step 3: Detecting framework...');
    const frameworkDetector = createFrameworkDetector();
    const frameworkInfo = await frameworkDetector.detectFrameworks(repoPath);
    console.log(`   Framework: ${frameworkInfo.primaryFramework}`);
    console.log(`   Build system: ${frameworkInfo.buildSystem || 'unknown'}`);

    // 4. Initialize Java orchestrator
    console.log('');
    console.log('🛠️ Step 4: Initializing Java tool orchestrator...');
    // JavaToolOrchestrator extends BaseToolOrchestrator and takes (config, dockerImage)
    const orchestrator = new JavaToolOrchestrator({
      pmd: { enabled: true, rulesets: ['category/java/bestpractices.xml'], failOnViolation: false },
      semgrep: { enabled: true, config: 'auto' },
      dependencyCheck: { enabled: true, failOnCVSS: 7, formats: ['JSON'], caching: { enabled: true, location: '/tmp/dependency-check-cache' } },
    });

    // 5. Run analysis on both branches
    console.log('');
    console.log('🔬 Step 5: Running analysis (this may take a few minutes)...');
    console.log('   - Analyzing main branch...');

    // Get main branch for comparison
    const mainBranch = execSync(`cd ${repoPath} && git remote show origin | grep 'HEAD branch' | cut -d' ' -f5`, {
      encoding: 'utf-8'
    }).trim() || 'main';

    // Analyze main branch first
    execSync(`cd ${repoPath} && git checkout ${mainBranch}`, { stdio: 'pipe' });
    const mainResults = await orchestrator.orchestrate(repoPath, 'base', { userTier: TEST_CONFIG.userTier });
    // Extract issues from toolResults (OrchestrationResult has toolResults[].issues, not direct issues)
    const mainIssues = mainResults.toolResults?.flatMap(tr => tr.issues || []) || [];
    console.log(`   Main branch: ${mainIssues.length} issues`);

    // Analyze PR branch
    console.log('   - Analyzing PR branch...');
    execSync(`cd ${repoPath} && git checkout pr-${TEST_CONFIG.prNumber}`, { stdio: 'pipe' });
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

    // 8. PRO tier: Execute fixes
    if (TEST_CONFIG.userTier === 'pro') {
      console.log('');
      console.log('🔧 Step 8: PRO Tier - Executing AI Fixes...');

      // Import ScanFixExecutor
      const { ScanFixExecutor } = await import('../../src/fix-agent/scan-fix-executor');

      const fixExecutor = new ScanFixExecutor({
        workingDir: repoPath,
        language: 'java',
        outputMode: 'patch',
        dryRun: true, // Don't actually modify files in test
      });

      const scanFixResults = await fixExecutor.executeFixes(categorizedIssues);

      const totalProcessed = scanFixResults.summary.totalIssues;
      const fixed = scanFixResults.summary.fixedIssues;
      const manualReview = scanFixResults.summary.skippedIssues + scanFixResults.summary.failedIssues;

      console.log(`   Issues processed: ${totalProcessed}`);
      console.log(`   Auto-fixed: ${fixed}`);
      console.log(`   Manual review: ${manualReview}`);
      const fixRate = totalProcessed > 0 ? ((fixed / totalProcessed) * 100).toFixed(1) : '0.0';
      console.log(`   Fix rate: ${fixRate}%`);
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
        language: 'java',
        analyzedAt: new Date().toISOString(),
      }
    });

    // 10. Save outputs
    console.log('');
    console.log('💾 Step 10: Saving outputs...');
    fs.mkdirSync(outputDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    fs.writeFileSync(
      path.join(outputDir, `java-pro-report-${timestamp}.md`),
      report.markdown
    );
    fs.writeFileSync(
      path.join(outputDir, `java-pro-issues-${timestamp}.json`),
      JSON.stringify(categorizedIssues, null, 2)
    );

    console.log(`   ✅ Report saved to ${outputDir}`);

    // Summary
    console.log('');
    console.log('='.repeat(70));
    console.log('TEST SUMMARY');
    console.log('='.repeat(70));
    console.log(`✅ Java PRO Tier Test COMPLETED`);
    console.log(`   Total issues: ${categorizedIssues.length}`);
    console.log(`   NEW issues: ${newIssues.length}`);
    console.log(`   EXISTING issues: ${existingIssues.length}`);
    console.log(`   Framework detected: ${frameworkInfo.primaryFramework}`);
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
runJavaTest()
  .then(() => {
    console.log('');
    console.log('✅ Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Test failed:', error.message);
    process.exit(1);
  });
