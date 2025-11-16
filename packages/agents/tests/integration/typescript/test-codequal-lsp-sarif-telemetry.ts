#!/usr/bin/env ts-node
/**
 * E2E Test: LSP/SARIF Auto-Fix + Fix Validation Telemetry
 * 
 * Tests:
 * 1. LSP/SARIF generation on CodeQual project (TypeScript)
 * 2. Fix validation cache (Redis) - First analysis stores, second compares
 * 3. Supabase telemetry storage
 * 4. File download and verification
 * 
 * Run on Oracle Cloud:
 *   ssh -i "/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-2025-10-07.key" opc@129.213.49.128
 *   cd ~/codequal/packages/agents
 *   set -a; [ -f .env ] && . ./.env; set +a
 *   npx ts-node tests/integration/typescript/test-codequal-lsp-sarif-telemetry.ts
 */

import * as dotenv from 'dotenv';
import * as pathModule from 'path';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

// Load environment variables
dotenv.config({ path: pathModule.join(__dirname, '../../.env') });

// Import after env loading
import { V9TypeScriptAnalyzer } from '../../../src/two-branch/analyzers/v9-typescript-analyzer';
import { V9RepositoryManager } from '../../../src/two-branch/services/v9-repository-manager';
import { V9ToolOrchestrator } from '../../../src/two-branch/analyzers/v9-tool-orchestrator';
import { V9IssueComparator } from '../../../src/two-branch/analyzers/v9-issue-comparator';
import { V9GroupedReportFormatter } from '../../../src/two-branch/analyzers/v9-grouped-report-formatter';
import { FixValidationCache, type CachedAnalysisForComparison } from '../../../src/two-branch/services/fix-validation-cache';
import { ModelConfigResolver } from '../../../src/standard/orchestrator/model-config-resolver';
import { detectDefaultBranch } from '../../../src/two-branch/utils/git-utils';

// Test configuration
const CODEQUAL_REPO = 'https://github.com/alpsla/codequal.git';
const TEST_PR_NUMBER = 1; // Use PR #1 for testing
const OUTPUT_DIR = '/tmp/v9-reports/codequal-test';
const REDIS_URL = process.env.REDIS_URL || 'redis://10.116.0.7:6379';
const REPO_PATH = '/tmp/codequal-repo';

interface TestResults {
  firstAnalysis: {
    success: boolean;
    totalIssues: number;
    issuesWithFixes: number;
    lspUrl?: string;
    sarifUrl?: string;
    manifestUrl?: string;
    duration: string;
  };
  secondAnalysis: {
    success: boolean;
    totalIssues: number;
    comparisonResult?: any;
    telemetryStored: boolean;
    duration: string;
  };
  fileVerification: {
    lspDownloaded: boolean;
    sarifDownloaded: boolean;
    lspValid: boolean;
    sarifValid: boolean;
    batchActionsFound: boolean;
  };
}

async function setupRepository(): Promise<{ baseBranch: string; prBranch: string }> {
  console.log('\n📁 Setting up repository...\n');

  // Clone or update repository
  if (!fs.existsSync(REPO_PATH)) {
    console.log('   Cloning CodeQual repository...');
    execSync(`git clone ${CODEQUAL_REPO} ${REPO_PATH}`, { stdio: 'inherit' });
  } else {
    console.log('   Updating existing repository...');
    execSync('git fetch origin', { cwd: REPO_PATH, stdio: 'inherit' });
  }

  const baseBranch = detectDefaultBranch(REPO_PATH);
  const prBranch = `pr-${TEST_PR_NUMBER}`;

  // Fetch PR branch if it doesn't exist
  try {
    execSync(`git rev-parse --verify ${prBranch}`, { cwd: REPO_PATH, stdio: 'ignore' });
    console.log(`   ✅ PR branch ${prBranch} exists`);
  } catch {
    console.log(`   Fetching PR branch ${prBranch}...`);
    execSync(`git fetch origin pull/${TEST_PR_NUMBER}/head:${prBranch}`, { 
      cwd: REPO_PATH, 
      stdio: 'inherit' 
    });
  }

  console.log(`   ✅ Repository ready (base: ${baseBranch}, PR: ${prBranch})\n`);

  return { baseBranch, prBranch };
}

async function runFirstAnalysis(
  baseBranch: string,
  prBranch: string
): Promise<TestResults['firstAnalysis']> {
  console.log('\n' + '='.repeat(80));
  console.log('📊 FIRST ANALYSIS: Generate LSP/SARIF + Store in Cache');
  console.log('='.repeat(80) + '\n');

  const startTime = Date.now();

  try {
    // Initialize components
    const repoManager = new V9RepositoryManager();
    const modelResolver = new ModelConfigResolver();
    const analyzer = new V9TypeScriptAnalyzer();
    const toolOrchestrator = new V9ToolOrchestrator();
    const issueComparator = new V9IssueComparator();
    const formatter = new V9GroupedReportFormatter();

    // Prepare repository
    await repoManager.prepareRepository(
      CODEQUAL_REPO,
      REPO_PATH,
      { base: baseBranch, pr: prBranch },
      { skipCache: false }
    );

    // Run tools on both branches
    console.log('🔧 Running tools on base branch...');
    const baseResults = await toolOrchestrator.orchestrate(
      REPO_PATH,
      baseBranch,
      'typescript',
      { analysisMode: 'standard' }
    );

    console.log('🔧 Running tools on PR branch...');
    const prResults = await toolOrchestrator.orchestrate(
      REPO_PATH,
      prBranch,
      'typescript',
      { analysisMode: 'standard' }
    );

    // Compare issues
    const categorized = issueComparator.compareIssues(
      baseResults.issues,
      prResults.issues,
      REPO_PATH,
      baseBranch,
      prBranch
    );

    const totalIssues = Object.values(categorized).flat().length;
    console.log(`\n📊 Found ${totalIssues} total issues`);

    // Generate report with LSP/SARIF
    console.log('\n📝 Generating report with LSP/SARIF formats...');
    const report = await formatter.generateReport({
      issues: Object.values(categorized).flat(),
      metadata: {
        repository: CODEQUAL_REPO,
        prNumber: TEST_PR_NUMBER,
        baseBranch,
        prBranch,
        analyzerVersion: '9.0.0',
        analyzedAt: new Date().toISOString()
      },
      repoPath: REPO_PATH
    });

    // Extract URLs from report
    const lspUrl = report.metadata?.lspUrl;
    const sarifUrl = report.metadata?.sarifUrl;
    const manifestUrl = report.metadata?.manifestUrl;

    const issuesWithFixes = Object.values(categorized)
      .flat()
      .filter((issue: any) => issue.fixSuggestion?.correctedCode).length;

    const duration = `${Math.floor((Date.now() - startTime) / 1000)}s`;

    console.log(`\n✅ First Analysis Complete`);
    console.log(`   • Total Issues: ${totalIssues}`);
    console.log(`   • Issues with Fixes: ${issuesWithFixes}`);
    console.log(`   • LSP URL: ${lspUrl || 'Not found'}`);
    console.log(`   • SARIF URL: ${sarifUrl || 'Not found'}`);
    console.log(`   • Duration: ${duration}`);

    // Store in cache for second analysis
    const cache = new FixValidationCache(REDIS_URL);
    const commitSha = execSync('git rev-parse HEAD', { cwd: REPO_PATH }).toString().trim();

    const cachedAnalysis: CachedAnalysisForComparison = {
      repositoryUrl: CODEQUAL_REPO,
      prNumber: TEST_PR_NUMBER,
      commitSha,
      analyzedAt: new Date().toISOString(),
      issues: Object.values(categorized).flat().map((issue: any) => ({
        id: `${issue.file}:${issue.line}:${issue.rule}`,
        file: issue.file,
        line: issue.line || 0,
        rule: issue.rule,
        severity: issue.severity,
        message: issue.message,
        fixSuggestion: issue.fixSuggestion ? {
          correctedCode: issue.fixSuggestion.correctedCode,
          issueDescription: issue.fixSuggestion.issueDescription
        } : undefined,
        codeSnippet: issue.snippet
      })),
      totalIssues,
      issuesWithFixes,
      language: 'typescript',
      tools: ['eslint', 'typescript', 'semgrep', 'npm-audit']
    };

    await cache.storeAnalysis(cachedAnalysis);
    console.log('✅ Analysis stored in Redis cache\n');

    return {
      success: true,
      totalIssues,
      issuesWithFixes,
      lspUrl,
      sarifUrl,
      manifestUrl,
      duration
    };

  } catch (error: any) {
    console.error(`❌ First Analysis Failed: ${error.message}`);
    console.error(error.stack);
    return {
      success: false,
      totalIssues: 0,
      issuesWithFixes: 0,
      duration: `${Math.floor((Date.now() - startTime) / 1000)}s`
    };
  }
}

async function runSecondAnalysis(
  baseBranch: string,
  prBranch: string
): Promise<TestResults['secondAnalysis']> {
  console.log('\n' + '='.repeat(80));
  console.log('📊 SECOND ANALYSIS: Compare with Cache + Store Telemetry');
  console.log('='.repeat(80) + '\n');

  const startTime = Date.now();
  const cache = new FixValidationCache(REDIS_URL);

  try {
    // Get previous analysis from cache
    const previous = await cache.getPreviousAnalysis(CODEQUAL_REPO, TEST_PR_NUMBER);

    if (!previous) {
      console.log('⚠️  No previous analysis found in cache');
      return {
        success: false,
        totalIssues: 0,
        telemetryStored: false,
        duration: `${Math.floor((Date.now() - startTime) / 1000)}s`
      };
    }

    console.log(`✅ Found previous analysis: ${previous.totalIssues} issues\n`);

    // Run new analysis (simplified - would use same flow as first)
    // For testing, we'll just compare with cached data
    const currentCommitSha = execSync('git rev-parse HEAD', { cwd: REPO_PATH }).toString().trim();

    // Simulate current analysis (in real scenario, would run full analysis)
    const currentAnalysis: CachedAnalysisForComparison = {
      ...previous,
      commitSha: currentCommitSha,
      analyzedAt: new Date().toISOString(),
      // Simulate some issues resolved
      totalIssues: Math.max(0, previous.totalIssues - 10),
      issues: previous.issues.slice(0, Math.max(0, previous.issues.length - 10))
    };

    // Compare analyses
    const comparison = cache.compareAnalyses(previous, currentAnalysis);

    console.log('\n📊 Comparison Results:');
    console.log(`   • Previous Issues: ${comparison.totalIssuesInPrevious}`);
    console.log(`   • Current Issues: ${comparison.totalIssuesInCurrent}`);
    console.log(`   • Resolved: ${comparison.issuesResolved}`);
    console.log(`   • New: ${comparison.issuesNew}`);
    console.log(`   • Remaining: ${comparison.issuesRemaining}`);
    console.log(`   • Fix Adoption:`);
    console.log(`     - Exact: ${comparison.fixAdoption.exact}`);
    console.log(`     - Modified: ${comparison.fixAdoption.modified}`);
    console.log(`     - Different: ${comparison.fixAdoption.different}`);
    console.log(`     - Not Fixed: ${comparison.fixAdoption.notFixed}`);

    // Store telemetry
    let telemetryStored = false;
    try {
      await cache.storeTelemetry(comparison, {
        repositoryUrl: CODEQUAL_REPO,
        prNumber: TEST_PR_NUMBER,
        commitShaPrevious: previous.commitSha,
        commitShaCurrent: currentAnalysis.commitSha,
        language: 'typescript',
        toolsUsed: ['eslint', 'typescript', 'semgrep', 'npm-audit'],
        analysisDurationPrevious: 'N/A',
        analysisDurationCurrent: `${Math.floor((Date.now() - startTime) / 1000)}s`
      });
      telemetryStored = true;
      console.log('\n✅ Telemetry stored in Supabase');
    } catch (error: any) {
      console.error(`\n⚠️  Telemetry storage failed: ${error.message}`);
    }

    // Replace cache with new analysis
    await cache.storeAnalysis(currentAnalysis);
    console.log('✅ Cache updated with new analysis\n');

    return {
      success: true,
      totalIssues: currentAnalysis.totalIssues,
      comparisonResult: comparison,
      telemetryStored,
      duration: `${Math.floor((Date.now() - startTime) / 1000)}s`
    };

  } catch (error: any) {
    console.error(`❌ Second Analysis Failed: ${error.message}`);
    return {
      success: false,
      totalIssues: 0,
      telemetryStored: false,
      duration: `${Math.floor((Date.now() - startTime) / 1000)}s`
    };
  }
}

async function downloadAndVerifyFiles(
  lspUrl?: string,
  sarifUrl?: string
): Promise<TestResults['fileVerification']> {
  console.log('\n' + '='.repeat(80));
  console.log('📥 DOWNLOAD & VERIFY: LSP/SARIF Files');
  console.log('='.repeat(80) + '\n');

  const results: TestResults['fileVerification'] = {
    lspDownloaded: false,
    sarifDownloaded: false,
    lspValid: false,
    sarifValid: false,
    batchActionsFound: false
  };

  if (!lspUrl || !sarifUrl) {
    console.log('⚠️  LSP/SARIF URLs not provided - skipping download');
    return results;
  }

  try {
    // Download LSP file
    console.log(`📥 Downloading LSP file from: ${lspUrl}`);
    const lspResponse = await fetch(lspUrl);
    if (lspResponse.ok) {
      const lspContent = await lspResponse.json();
      const lspPath = path.join(OUTPUT_DIR, 'codequal-lsp-actions.json');
      
      if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
      }
      
      fs.writeFileSync(lspPath, JSON.stringify(lspContent, null, 2));
      results.lspDownloaded = true;
      console.log(`✅ LSP file downloaded: ${lspPath}`);

      // Validate LSP structure
      if (Array.isArray(lspContent) && lspContent.length > 0) {
        const firstAction = lspContent[0];
        if (firstAction.title && firstAction.kind && firstAction.edit) {
          results.lspValid = true;
          console.log(`✅ LSP structure valid: ${lspContent.length} code actions`);

          // Check for batch actions
          const batchActions = lspContent.filter((action: any) => 
            action.title.includes('Apply All') || 
            action.title.includes('Apply Critical') ||
            action.title.includes('Apply High') ||
            action.title.includes('Apply Medium') ||
            action.title.includes('Apply Low')
          );
          if (batchActions.length > 0) {
            results.batchActionsFound = true;
            console.log(`✅ Batch actions found: ${batchActions.length}`);
            batchActions.forEach((action: any) => {
              console.log(`   • ${action.title}`);
            });
          }
        }
      }
    } else {
      console.error(`❌ LSP download failed: ${lspResponse.status} ${lspResponse.statusText}`);
    }

    // Download SARIF file
    console.log(`\n📥 Downloading SARIF file from: ${sarifUrl}`);
    const sarifResponse = await fetch(sarifUrl);
    if (sarifResponse.ok) {
      const sarifContent = await sarifResponse.json();
      const sarifPath = path.join(OUTPUT_DIR, 'codequal-sarif-report.json');
      
      fs.writeFileSync(sarifPath, JSON.stringify(sarifContent, null, 2));
      results.sarifDownloaded = true;
      console.log(`✅ SARIF file downloaded: ${sarifPath}`);

      // Validate SARIF structure
      if (sarifContent.version === '2.1.0' && 
          sarifContent.$schema && 
          sarifContent.runs && 
          sarifContent.runs.length > 0) {
        results.sarifValid = true;
        const run = sarifContent.runs[0];
        console.log(`✅ SARIF structure valid:`);
        console.log(`   • Version: ${sarifContent.version}`);
        console.log(`   • Tool: ${run.tool?.driver?.name || 'Unknown'}`);
        console.log(`   • Results: ${run.results?.length || 0}`);
        console.log(`   • Rules: ${run.tool?.driver?.rules?.length || 0}`);
      }
    } else {
      console.error(`❌ SARIF download failed: ${sarifResponse.status} ${sarifResponse.statusText}`);
    }

  } catch (error: any) {
    console.error(`❌ Download/Verification failed: ${error.message}`);
  }

  return results;
}

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 LSP/SARIF Auto-Fix + Fix Validation Telemetry E2E Test');
  console.log('='.repeat(80));
  console.log(`Repository: ${CODEQUAL_REPO}`);
  console.log(`PR Number: ${TEST_PR_NUMBER}`);
  console.log(`Output Dir: ${OUTPUT_DIR}`);
  console.log(`Redis URL: ${REDIS_URL}`);
  console.log('='.repeat(80) + '\n');

  // Check environment
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }

  const testResults: TestResults = {
    firstAnalysis: {
      success: false,
      totalIssues: 0,
      issuesWithFixes: 0,
      duration: '0s'
    },
    secondAnalysis: {
      success: false,
      totalIssues: 0,
      telemetryStored: false,
      duration: '0s'
    },
    fileVerification: {
      lspDownloaded: false,
      sarifDownloaded: false,
      lspValid: false,
      sarifValid: false,
      batchActionsFound: false
    }
  };

  try {
    // Setup repository
    const { baseBranch, prBranch } = await setupRepository();

    // Step 1: First Analysis
    testResults.firstAnalysis = await runFirstAnalysis(baseBranch, prBranch);

    if (!testResults.firstAnalysis.success) {
      throw new Error('First analysis failed');
    }

    // Step 2: Second Analysis (with comparison)
    testResults.secondAnalysis = await runSecondAnalysis(baseBranch, prBranch);

    // Step 3: Download and verify files
    if (testResults.firstAnalysis.lspUrl && testResults.firstAnalysis.sarifUrl) {
      testResults.fileVerification = await downloadAndVerifyFiles(
        testResults.firstAnalysis.lspUrl,
        testResults.firstAnalysis.sarifUrl
      );
    }

    // Print summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(80) + '\n');

    console.log('First Analysis:');
    console.log(`  ✅ Success: ${testResults.firstAnalysis.success}`);
    console.log(`  📊 Total Issues: ${testResults.firstAnalysis.totalIssues}`);
    console.log(`  🔧 Issues with Fixes: ${testResults.firstAnalysis.issuesWithFixes}`);
    console.log(`  ⏱️  Duration: ${testResults.firstAnalysis.duration}`);
    console.log(`  📄 LSP URL: ${testResults.firstAnalysis.lspUrl || 'Not found'}`);
    console.log(`  📄 SARIF URL: ${testResults.firstAnalysis.sarifUrl || 'Not found'}`);

    console.log('\nSecond Analysis (Telemetry):');
    console.log(`  ✅ Success: ${testResults.secondAnalysis.success}`);
    console.log(`  📊 Total Issues: ${testResults.secondAnalysis.totalIssues}`);
    console.log(`  💾 Telemetry Stored: ${testResults.secondAnalysis.telemetryStored ? '✅' : '❌'}`);

    console.log('\nFile Verification:');
    console.log(`  📥 LSP Downloaded: ${testResults.fileVerification.lspDownloaded ? '✅' : '❌'}`);
    console.log(`  📥 SARIF Downloaded: ${testResults.fileVerification.sarifDownloaded ? '✅' : '❌'}`);
    console.log(`  ✅ LSP Valid: ${testResults.fileVerification.lspValid ? '✅' : '❌'}`);
    console.log(`  ✅ SARIF Valid: ${testResults.fileVerification.sarifValid ? '✅' : '❌'}`);
    console.log(`  🎯 Batch Actions Found: ${testResults.fileVerification.batchActionsFound ? '✅' : '❌'}`);

    console.log('\n' + '='.repeat(80));
    if (testResults.firstAnalysis.success && 
        testResults.fileVerification.lspValid && 
        testResults.fileVerification.sarifValid &&
        testResults.secondAnalysis.telemetryStored) {
      console.log('✅ ALL TESTS PASSED');
    } else {
      console.log('⚠️  SOME TESTS FAILED - See details above');
    }
    console.log('='.repeat(80) + '\n');

    console.log('🎯 Next Steps:');
    console.log('  1. Download LSP file to local machine:');
    console.log(`     scp -i "keys/oracle/ssh-key-2025-10-07.key" opc@129.213.49.128:${OUTPUT_DIR}/codequal-lsp-actions.json ./`);
    console.log('  2. Open CodeQual project in Cursor IDE');
    console.log('  3. Press Cmd+. to open Quick Fix menu');
    console.log('  4. Verify "Apply All Fixes" appears at top');
    console.log('  5. Test applying fixes via batch actions');
    console.log('  6. Verify fixes are applied correctly\n');

  } catch (error: any) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
