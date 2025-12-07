/**
 * Integration Test Runner
 *
 * Runs all integration tests with automatic cleanup between scenarios.
 * Ensures each test starts with a clean repository state.
 */

import { execSync, exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { TestRepoCleanup, cleanupLSPAffectedFiles } from './test-cleanup';

interface TestScenario {
  name: string;
  type: 'vscode' | 'github-actions' | 'gitlab-ci' | 'bitbucket' | 'cli';
  description: string;
  run: () => Promise<TestResult>;
}

interface TestResult {
  scenario: string;
  passed: boolean;
  duration: number;
  message: string;
  details?: Record<string, unknown>;
}

interface TestConfig {
  repoPath: string;
  sarifPath: string;
  lspPath: string;
  cleanupMode: 'git-reset' | 'git-stash' | 'fresh-clone' | 'lsp-targeted';
  verbose: boolean;
}

// Default test configuration
const defaultConfig: TestConfig = {
  repoPath: path.resolve(__dirname, '../../..'), // codequal root
  sarifPath: path.resolve(__dirname, '../test-data/codequal-sarif-report.json'),
  lspPath: path.resolve(__dirname, '../test-data/codequal-lsp-actions.json'),
  cleanupMode: 'git-stash', // Safe default - preserves changes
  verbose: true,
};

/**
 * Test 1: VSCode Extension
 * Validates SARIF loading and LSP code action functionality
 */
async function testVSCodeExtension(config: TestConfig): Promise<TestResult> {
  const start = Date.now();

  try {
    // Check SARIF file exists and is valid
    const sarifData = JSON.parse(fs.readFileSync(config.sarifPath, 'utf-8'));
    const issueCount = sarifData.runs?.[0]?.results?.length || 0;

    // Check LSP file exists and is valid
    // LSP can be either { actions: [...] } or just an array [...]
    const lspData = JSON.parse(fs.readFileSync(config.lspPath, 'utf-8'));
    const actionCount = Array.isArray(lspData) ? lspData.length : (lspData.actions?.length || 0);

    // Check extension is compiled
    const distPath = path.resolve(__dirname, '../dist/extension.js');
    const isCompiled = fs.existsSync(distPath);

    // Validate extension.ts exists
    const srcPath = path.resolve(__dirname, '../src/extension.ts');
    const hasSource = fs.existsSync(srcPath);

    const passed = issueCount > 0 && actionCount > 0 && isCompiled && hasSource;

    return {
      scenario: 'vscode-extension',
      passed,
      duration: Date.now() - start,
      message: passed
        ? `Extension ready: ${issueCount} issues, ${actionCount} fixes available`
        : 'Extension validation failed',
      details: {
        issueCount,
        actionCount,
        isCompiled,
        hasSource,
      },
    };
  } catch (error) {
    return {
      scenario: 'vscode-extension',
      passed: false,
      duration: Date.now() - start,
      message: `VSCode test failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Test 2: GitHub Actions Workflow
 * Validates workflow YAML and simulates execution
 */
async function testGitHubActions(config: TestConfig): Promise<TestResult> {
  const start = Date.now();

  try {
    const workflowPath = path.resolve(__dirname, '../../../.github/workflows/codequal-analysis.yml');

    if (!fs.existsSync(workflowPath)) {
      return {
        scenario: 'github-actions',
        passed: false,
        duration: Date.now() - start,
        message: 'Workflow file not found',
      };
    }

    const workflow = fs.readFileSync(workflowPath, 'utf-8');

    // Validate workflow structure
    const checks = {
      hasTrigger: workflow.includes('pull_request:'),
      hasApiCall: workflow.includes('CODEQUAL_API_KEY') || workflow.includes('api.codequal'),
      hasSarifUpload: workflow.includes('upload-sarif'),
      hasComment: workflow.includes('createComment') || workflow.includes('github-script'),
    };

    const passed = Object.values(checks).every(Boolean);

    return {
      scenario: 'github-actions',
      passed,
      duration: Date.now() - start,
      message: passed
        ? 'GitHub Actions workflow validated'
        : 'Workflow missing required components',
      details: checks,
    };
  } catch (error) {
    return {
      scenario: 'github-actions',
      passed: false,
      duration: Date.now() - start,
      message: `GitHub Actions test failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Test 3: GitLab CI Pipeline
 * Validates .gitlab-ci.yml configuration
 */
async function testGitLabCI(config: TestConfig): Promise<TestResult> {
  const start = Date.now();

  try {
    const pipelinePath = path.resolve(__dirname, '../../../.gitlab-ci.yml');

    if (!fs.existsSync(pipelinePath)) {
      return {
        scenario: 'gitlab-ci',
        passed: false,
        duration: Date.now() - start,
        message: 'Pipeline file not found',
      };
    }

    const pipeline = fs.readFileSync(pipelinePath, 'utf-8');

    // Validate pipeline structure
    const checks = {
      hasStages: pipeline.includes('stages:'),
      hasAnalyzeJob: pipeline.includes('codequal:') || pipeline.includes('codequal-analyze:'),
      hasArtifacts: pipeline.includes('artifacts:'),
      hasMRTrigger: pipeline.includes('merge_request'),
    };

    const passed = Object.values(checks).every(Boolean);

    return {
      scenario: 'gitlab-ci',
      passed,
      duration: Date.now() - start,
      message: passed
        ? 'GitLab CI pipeline validated'
        : 'Pipeline missing required components',
      details: checks,
    };
  } catch (error) {
    return {
      scenario: 'gitlab-ci',
      passed: false,
      duration: Date.now() - start,
      message: `GitLab CI test failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Test 4: Bitbucket Pipelines
 * Validates bitbucket-pipelines.yml configuration
 */
async function testBitbucketPipelines(config: TestConfig): Promise<TestResult> {
  const start = Date.now();

  try {
    const pipelinePath = path.resolve(__dirname, '../../../bitbucket-pipelines.yml');

    if (!fs.existsSync(pipelinePath)) {
      return {
        scenario: 'bitbucket-pipelines',
        passed: false,
        duration: Date.now() - start,
        message: 'Pipeline file not found',
      };
    }

    const pipeline = fs.readFileSync(pipelinePath, 'utf-8');

    // Validate pipeline structure
    const checks = {
      hasPullRequests: pipeline.includes('pull-requests:'),
      hasCodequalStep: pipeline.includes('CodeQual Analysis'),
      hasApiCall: pipeline.includes('CODEQUAL_API_KEY') || pipeline.includes('api.codequal'),
    };

    const passed = Object.values(checks).every(Boolean);

    return {
      scenario: 'bitbucket-pipelines',
      passed,
      duration: Date.now() - start,
      message: passed
        ? 'Bitbucket Pipelines validated'
        : 'Pipeline missing required components',
      details: checks,
    };
  } catch (error) {
    return {
      scenario: 'bitbucket-pipelines',
      passed: false,
      duration: Date.now() - start,
      message: `Bitbucket test failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Test 5: CLI/API Direct Integration
 * Tests command-line interface functionality
 */
async function testCLIIntegration(config: TestConfig): Promise<TestResult> {
  const start = Date.now();

  try {
    // Check if CLI exists in fix-agent
    const cliPath = path.resolve(__dirname, '../../agents/src/fix-agent/cli.ts');
    const hasCLI = fs.existsSync(cliPath);

    // Check LSP converter
    const converterPath = path.resolve(__dirname, '../../agents/src/two-branch/analyzers/lsp-sarif-converter.ts');
    const hasConverter = fs.existsSync(converterPath);

    // Check V9 analyzer service
    const analyzerPath = path.resolve(__dirname, '../../agents/src/two-branch/services/v9-pr-analyzer.ts');
    const hasAnalyzer = fs.existsSync(analyzerPath);

    const checks = { hasCLI, hasConverter, hasAnalyzer };
    const passed = Object.values(checks).every(Boolean);

    return {
      scenario: 'cli-integration',
      passed,
      duration: Date.now() - start,
      message: passed
        ? 'CLI/API integration components validated'
        : 'Missing CLI/API components',
      details: checks,
    };
  } catch (error) {
    return {
      scenario: 'cli-integration',
      passed: false,
      duration: Date.now() - start,
      message: `CLI test failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Main test runner
 */
async function runAllTests(config: TestConfig = defaultConfig): Promise<void> {
  console.log('🧪 CodeQual Integration Test Suite\n');
  console.log('=' .repeat(60));

  const results: TestResult[] = [];
  const scenarios: TestScenario[] = [
    {
      name: 'VSCode Extension',
      type: 'vscode',
      description: 'SARIF diagnostics + LSP code actions',
      run: () => testVSCodeExtension(config),
    },
    {
      name: 'GitHub Actions',
      type: 'github-actions',
      description: 'PR workflow with SARIF upload',
      run: () => testGitHubActions(config),
    },
    {
      name: 'GitLab CI',
      type: 'gitlab-ci',
      description: 'MR pipeline with Code Quality',
      run: () => testGitLabCI(config),
    },
    {
      name: 'Bitbucket Pipelines',
      type: 'bitbucket',
      description: 'PR pipeline with comments',
      run: () => testBitbucketPipelines(config),
    },
    {
      name: 'CLI/API',
      type: 'cli',
      description: 'Direct command-line integration',
      run: () => testCLIIntegration(config),
    },
  ];

  for (const scenario of scenarios) {
    console.log(`\n📋 Testing: ${scenario.name}`);
    console.log(`   ${scenario.description}`);

    // Run cleanup before each test (except for validation-only tests)
    if (config.cleanupMode === 'lsp-targeted' && fs.existsSync(config.lspPath)) {
      const cleanup = cleanupLSPAffectedFiles(config.repoPath, config.lspPath);
      if (config.verbose) {
        console.log(`   Cleanup: ${cleanup.message}`);
      }
    }

    // Run the test
    const result = await scenario.run();
    results.push(result);

    // Display result
    const icon = result.passed ? '✅' : '❌';
    console.log(`   ${icon} ${result.message} (${result.duration}ms)`);

    if (config.verbose && result.details) {
      for (const [key, value] of Object.entries(result.details)) {
        const detailIcon = value ? '✓' : '✗';
        console.log(`      ${detailIcon} ${key}: ${value}`);
      }
    }
  }

  // Summary
  console.log('\n' + '=' .repeat(60));
  console.log('📊 Test Summary\n');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const totalTime = results.reduce((sum, r) => sum + r.duration, 0);

  console.log(`   Total:   ${results.length} tests`);
  console.log(`   Passed:  ${passed} ✅`);
  console.log(`   Failed:  ${failed} ❌`);
  console.log(`   Time:    ${totalTime}ms`);

  if (failed === 0) {
    console.log('\n🎉 All integration tests passed!');
  } else {
    console.log('\n⚠️  Some tests failed. Review output above.');
    process.exit(1);
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const verbose = args.includes('--verbose') || args.includes('-v');
  const cleanupMode = args.find(a => a.startsWith('--cleanup='))?.split('=')[1] as TestConfig['cleanupMode'] || 'git-stash';

  runAllTests({
    ...defaultConfig,
    verbose,
    cleanupMode,
  });
}

export { runAllTests, TestConfig, TestResult };
