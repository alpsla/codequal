/**
 * Integration Test: Full Java Analysis with All Tools
 *
 * Tests the complete Java tool orchestration including:
 * - PMD (code quality)
 * - Checkstyle (code style)
 * - Semgrep (security)
 * - Dependency-Check (CVE scanning with PostgreSQL backend)
 *
 * Repository: Apache Kafka (3,472 Java files)
 * PR: #17620
 *
 * Expected Results:
 * - PMD: ~2,383 issues (critical + high with priority filtering)
 * - Checkstyle: ~200+ style violations
 * - Semgrep: ~20 security issues
 * - Dependency-Check: 0-3 CVEs (depends on dependencies)
 */

import { JavaToolOrchestrator, JavaToolConfig } from '../../tools/java/java-tool-orchestrator';
import { logger } from '../../utils/logger';
import * as fs from 'fs/promises';
import * as path from 'path';

// ============================================================
// CONFIGURATION
// ============================================================

const TEST_CONFIG = {
  repoUrl: 'https://github.com/apache/kafka.git',
  repoPath: '/tmp/kafka-repo',
  mainBranch: 'trunk',
  prBranch: 'pull/17620/head',

  // PostgreSQL connection (Oracle Cloud)
  postgres: {
    enabled: true,
    connectionString: 'jdbc:postgresql://129.213.49.128:5432/depcheck',
    dbUser: 'depcheck_scanner',
    dbPassword: 'depcheck_scan_2025',
    dbDriver: '/tmp/jdbc-drivers/postgresql-42.7.1.jar'
  }
};

const TOOL_CONFIG: Partial<JavaToolConfig> = {
  // Core tools (always enabled)
  pmd: {
    enabled: true,
    minimumPriority: 2,  // Critical + High only
    rulesets: [
      'category/java/errorprone.xml',
      'category/java/bestpractices.xml'
    ],
    parallel: 2,
    threads: 3,
    memory: '5g'
  },

  checkstyle: {
    enabled: true,
    configFile: '/google_checks.xml',
    parallel: 2,
    memory: '3g',
    changedFilesOnly: true  // Only PR changed files
  },

  semgrep: {
    enabled: true,
    rulesets: ['p/security-audit', 'p/java'],
    parallel: 4,
    smartSelection: true,
    memory: '2g'
  },

  // Optional: Dependency-Check (enable for this test)
  dependencyCheck: {
    enabled: true,
    failOnCVSS: 7.0,  // HIGH and CRITICAL
    timeout: 300,  // 5 minutes
    postgres: TEST_CONFIG.postgres
  }
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

async function ensureRepo(repoUrl: string, repoPath: string): Promise<void> {
  try {
    await fs.access(repoPath);
    logger.info(`✅ Repository exists: ${repoPath}`);
  } catch {
    logger.info(`📥 Cloning repository: ${repoUrl}`);
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    await execAsync(`git clone ${repoUrl} ${repoPath}`);
    logger.info(`✅ Repository cloned`);
  }
}

async function checkoutBranch(repoPath: string, branch: string): Promise<void> {
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);

  logger.info(`🔄 Checking out branch: ${branch}`);
  await execAsync(`cd ${repoPath} && git fetch origin ${branch} && git checkout FETCH_HEAD`);
  logger.info(`✅ Checked out: ${branch}`);
}

async function getChangedFiles(repoPath: string, baseBranch: string): Promise<string[]> {
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);

  // Get diff between branches
  const { stdout } = await execAsync(
    `cd ${repoPath} && git diff --name-only origin/${baseBranch}...HEAD`
  );

  return stdout
    .split('\n')
    .filter((f: string) => f.trim().length > 0 && f.endsWith('.java'));
}

// ============================================================
// MAIN TEST
// ============================================================

async function runFullAnalysis() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Full Java Analysis Integration Test');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
  console.log('Repository:', TEST_CONFIG.repoUrl);
  console.log('Main Branch:', TEST_CONFIG.mainBranch);
  console.log('PR Branch:', TEST_CONFIG.prBranch);
  console.log('');
  console.log('Tools Enabled:');
  console.log('  ✅ PMD (Priority 1-2 only)');
  console.log('  ✅ Checkstyle (Changed files only)');
  console.log('  ✅ Semgrep (Security audit)');
  console.log('  ✅ Dependency-Check (PostgreSQL backend)');
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');

  const orchestrator = new JavaToolOrchestrator(TOOL_CONFIG);

  try {
    // ============================================================
    // STEP 1: Ensure repository exists
    // ============================================================
    console.log('📋 STEP 1: Preparing repository...');
    await ensureRepo(TEST_CONFIG.repoUrl, TEST_CONFIG.repoPath);

    // ============================================================
    // STEP 2: Analyze MAIN branch
    // ============================================================
    console.log('');
    console.log('📋 STEP 2: Analyzing MAIN branch...');
    await checkoutBranch(TEST_CONFIG.repoPath, TEST_CONFIG.mainBranch);

    const mainStartTime = Date.now();
    const mainResults = await orchestrator.orchestrate(
      TEST_CONFIG.repoPath,
      'main'
    );
    const mainDuration = Date.now() - mainStartTime;

    console.log('');
    console.log('✅ MAIN branch analysis complete');
    console.log(`   Duration: ${Math.round(mainDuration / 1000)}s`);
    console.log(`   Tools executed: ${mainResults.toolResults.length}`);
    console.log(`   Total issues: ${mainResults.summary.totalIssues}`);
    console.log(`   Critical: ${mainResults.summary.criticalIssues}`);
    console.log(`   High: ${mainResults.summary.highIssues}`);
    console.log('');

    // Show per-tool breakdown
    for (const toolResult of mainResults.toolResults) {
      console.log(`   ${toolResult.tool}:`);
      console.log(`     Success: ${toolResult.success}`);
      console.log(`     Duration: ${Math.round(toolResult.duration / 1000)}s`);
      console.log(`     Issues: ${toolResult.metadata.issuesFound}`);
    }

    // ============================================================
    // STEP 3: Analyze PR branch
    // ============================================================
    console.log('');
    console.log('📋 STEP 3: Analyzing PR branch...');
    await checkoutBranch(TEST_CONFIG.repoPath, TEST_CONFIG.prBranch);

    const changedFiles = await getChangedFiles(TEST_CONFIG.repoPath, TEST_CONFIG.mainBranch);
    console.log(`   Changed files: ${changedFiles.length} Java files`);

    const prStartTime = Date.now();
    const prResults = await orchestrator.orchestrate(
      TEST_CONFIG.repoPath,
      'pr',
      changedFiles
    );
    const prDuration = Date.now() - prStartTime;

    console.log('');
    console.log('✅ PR branch analysis complete');
    console.log(`   Duration: ${Math.round(prDuration / 1000)}s`);
    console.log(`   Tools executed: ${prResults.toolResults.length}`);
    console.log(`   Total issues: ${prResults.summary.totalIssues}`);
    console.log(`   Critical: ${prResults.summary.criticalIssues}`);
    console.log(`   High: ${prResults.summary.highIssues}`);
    console.log('');

    // Show per-tool breakdown
    for (const toolResult of prResults.toolResults) {
      console.log(`   ${toolResult.tool}:`);
      console.log(`     Success: ${toolResult.success}`);
      console.log(`     Duration: ${Math.round(toolResult.duration / 1000)}s`);
      console.log(`     Issues: ${toolResult.metadata.issuesFound}`);

      // Special handling for Dependency-Check
      if (toolResult.tool === 'Dependency-Check') {
        const cveIssues = toolResult.issues.filter(i => i.cve);
        console.log(`     CVEs found: ${cveIssues.length}`);
        if (cveIssues.length > 0) {
          console.log(`     Top CVEs:`);
          cveIssues.slice(0, 3).forEach(issue => {
            console.log(`       - ${issue.cve} (CVSS ${issue.cvssScore}): ${issue.file}`);
          });
        }
      }
    }

    // ============================================================
    // STEP 4: Summary
    // ============================================================
    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('  Test Summary');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    console.log(`Total Duration: ${Math.round((mainDuration + prDuration) / 1000)}s`);
    console.log(`Main Branch: ${Math.round(mainDuration / 1000)}s, ${mainResults.summary.totalIssues} issues`);
    console.log(`PR Branch: ${Math.round(prDuration / 1000)}s, ${prResults.summary.totalIssues} issues`);
    console.log('');

    // Validate Dependency-Check only ran on PR
    const mainDepCheck = mainResults.toolResults.find(t => t.tool === 'Dependency-Check');
    const prDepCheck = prResults.toolResults.find(t => t.tool === 'Dependency-Check');

    console.log('Dependency-Check Validation:');
    console.log(`  Main branch: ${mainDepCheck ? '❌ UNEXPECTED' : '✅ SKIPPED (correct)'}`);
    console.log(`  PR branch: ${prDepCheck ? '✅ EXECUTED (correct)' : '❌ MISSING'}`);
    console.log('');

    if (prDepCheck) {
      console.log(`  PostgreSQL backend: ${prDepCheck.success ? '✅ WORKING' : '❌ FAILED'}`);
      console.log(`  CVEs detected: ${prDepCheck.issues.length}`);
    }

    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ TEST COMPLETE');
    console.log('═══════════════════════════════════════════════════════');

  } catch (error: any) {
    console.error('');
    console.error('═══════════════════════════════════════════════════════');
    console.error('❌ TEST FAILED');
    console.error('═══════════════════════════════════════════════════════');
    console.error('');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  runFullAnalysis()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { runFullAnalysis };
