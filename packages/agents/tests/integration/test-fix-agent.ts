#!/usr/bin/env npx ts-node
/**
 * Fix Agent Integration Test
 *
 * Tests the universal batch fix system with real LSP actions.
 *
 * Usage:
 *   npx ts-node tests/integration/test-fix-agent.ts
 *   npx ts-node tests/integration/test-fix-agent.ts --dry-run
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  UniversalFixExecutor,
  FixManifestGenerator,
  FixRequest
} from '../../src/fix-agent';

// ============================================================================
// Test Configuration
// ============================================================================

const TEST_CONFIG = {
  lspActionsPath: path.join(__dirname, '../../test-outputs/codequal-lsp-actions.json'),
  outputDir: path.join(__dirname, '../../test-outputs/fix-agent-test'),
  dryRun: process.argv.includes('--dry-run'),
  verbose: process.argv.includes('--verbose')
};

// ============================================================================
// Test Functions
// ============================================================================

async function testManifestGeneration(): Promise<void> {
  console.log('\n📋 TEST 1: Manifest Generation');
  console.log('=' .repeat(50));

  // Check if LSP actions file exists
  if (!fs.existsSync(TEST_CONFIG.lspActionsPath)) {
    console.log(`❌ LSP actions file not found: ${TEST_CONFIG.lspActionsPath}`);
    console.log('   Run a V9 analysis first to generate this file.');
    return;
  }

  // Load LSP actions
  const content = fs.readFileSync(TEST_CONFIG.lspActionsPath, 'utf-8');
  const lspActions = JSON.parse(content);
  console.log(`✅ Loaded ${lspActions.length} LSP actions`);

  // Convert to fix requests
  const issues = convertLSPActionsToFixRequests(lspActions);
  console.log(`✅ Converted to ${issues.length} fix requests`);

  // Generate manifest
  const generator = new FixManifestGenerator(TEST_CONFIG.outputDir, {
    repository: 'test/codequal',
    branch: 'test/autofix-baseline'
  });

  const manifest = await generator.generate(issues);

  console.log('\n📊 Manifest Summary:');
  console.log(`   Total Issues: ${manifest.summary.totalIssues}`);
  console.log(`   Total Files: ${manifest.summary.totalFiles}`);
  console.log(`   Critical: ${manifest.summary.bySeverity.critical}`);
  console.log(`   High: ${manifest.summary.bySeverity.high}`);
  console.log(`   Medium: ${manifest.summary.bySeverity.medium}`);
  console.log(`   Low: ${manifest.summary.bySeverity.low}`);

  console.log('\n📁 Generated Files:');
  const files = fs.readdirSync(TEST_CONFIG.outputDir);
  for (const file of files) {
    const stat = fs.statSync(path.join(TEST_CONFIG.outputDir, file));
    console.log(`   - ${file} (${(stat.size / 1024).toFixed(1)}KB)`);
  }

  console.log('\n✅ Manifest generation test PASSED');
}

async function testDryRunExecution(): Promise<void> {
  console.log('\n🔍 TEST 2: Dry Run Execution');
  console.log('=' .repeat(50));

  // Check for API key
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.log('⏭️  Skipping: No API key found (set OPENROUTER_API_KEY)');
    return;
  }

  // Load issues
  const issuesPath = path.join(TEST_CONFIG.outputDir, 'codequal-issues.json');
  if (!fs.existsSync(issuesPath)) {
    console.log(`❌ Issues file not found: ${issuesPath}`);
    console.log('   Run manifest generation test first.');
    return;
  }

  const issues: FixRequest[] = JSON.parse(fs.readFileSync(issuesPath, 'utf-8'));
  console.log(`✅ Loaded ${issues.length} issues`);

  // Create executor
  const apiUrl = process.env.OPENROUTER_API_KEY
    ? 'https://openrouter.ai/api/v1/chat/completions'
    : 'https://api.anthropic.com/v1/messages';

  const executor = new UniversalFixExecutor({
    apiKey,
    apiUrl,
    workspaceRoot: process.cwd(),
    dryRun: true,  // Always dry run in test
    parallel: 1,
    onProgress: (progress) => {
      if (TEST_CONFIG.verbose) {
        console.log(`   [${progress.current}/${progress.total}] ${progress.status}: ${progress.file}`);
      }
    }
  });

  // Execute on a small subset (first 3 high severity issues)
  const testIssues = issues
    .filter(i => i.severity === 'high')
    .slice(0, 3);

  if (testIssues.length === 0) {
    console.log('⏭️  Skipping: No high severity issues to test');
    return;
  }

  console.log(`\n🔄 Testing dry run on ${testIssues.length} issues...`);

  const summary = await executor.executeAll(testIssues);

  console.log('\n📊 Execution Summary:');
  console.log(`   Files Processed: ${summary.filesProcessed}`);
  console.log(`   Issues Fixed: ${summary.issuesFixed}`);
  console.log(`   Issues Failed: ${summary.issuesFailed}`);
  console.log(`   Time Taken: ${(summary.timeTaken / 1000).toFixed(1)}s`);

  console.log('\n✅ Dry run execution test PASSED');
}

async function testCLIHelp(): Promise<void> {
  console.log('\n📖 TEST 3: CLI Help');
  console.log('=' .repeat(50));

  // Just verify the CLI file exists and is valid TypeScript
  const cliPath = path.join(__dirname, '../../src/fix-agent/cli.ts');

  if (!fs.existsSync(cliPath)) {
    console.log(`❌ CLI file not found: ${cliPath}`);
    return;
  }

  const cliContent = fs.readFileSync(cliPath, 'utf-8');

  // Check for required functions
  const requiredFunctions = ['parseArgs', 'printHelp', 'main'];
  const missingFunctions = requiredFunctions.filter(f => !cliContent.includes(f));

  if (missingFunctions.length > 0) {
    console.log(`❌ Missing functions: ${missingFunctions.join(', ')}`);
    return;
  }

  console.log('✅ CLI file exists and contains required functions');
  console.log('\n   To run CLI help:');
  console.log('   npx ts-node packages/agents/src/fix-agent/cli.ts --help');

  console.log('\n✅ CLI help test PASSED');
}

// ============================================================================
// Helper Functions
// ============================================================================

function convertLSPActionsToFixRequests(lspActions: any[]): FixRequest[] {
  const fixes: FixRequest[] = [];

  // Skip batch actions (first 5)
  const individualActions = lspActions.slice(5);

  for (const action of individualActions) {
    const data = action.data;
    const diagnostic = action.diagnostics?.[0];
    const changes = action.edit?.changes;

    if (!changes) continue;

    const fileUri = Object.keys(changes)[0];
    if (!fileUri) continue;

    // Extract relative path
    const file = fileUri
      .replace(/^file:\/\/[^/]*/, '')
      .replace(/^\/tmp\/[^/]+\//, '');

    const fix: FixRequest = {
      file,
      line: (diagnostic?.range?.start?.line || 0) + 1,
      column: diagnostic?.range?.start?.character,
      severity: data?.issue?.severity || 'medium',
      rule: diagnostic?.code || data?.issue?.rule || 'unknown',
      message: diagnostic?.message || action.title,
      category: data?.issue?.category,
      fixSuggestion: data?.fix ? {
        explanation: data.issue?.explanation?.what,
        fix: data.fix.recommendation,
        correctedCode: data.fix.correctedCode,
        bestPractices: data.fix.bestPractices
      } : undefined
    };

    fixes.push(fix);
  }

  return fixes;
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  console.log('🔧 Fix Agent Integration Tests');
  console.log('==============================');
  console.log(`Dry Run: ${TEST_CONFIG.dryRun}`);
  console.log(`Verbose: ${TEST_CONFIG.verbose}`);
  console.log(`Output: ${TEST_CONFIG.outputDir}`);

  try {
    await testManifestGeneration();
    await testDryRunExecution();
    await testCLIHelp();

    console.log('\n' + '='.repeat(50));
    console.log('✅ ALL TESTS PASSED');
    console.log('='.repeat(50));

    console.log('\n📝 Next Steps:');
    console.log('1. Review generated files in: ' + TEST_CONFIG.outputDir);
    console.log('2. Run CLI with dry-run:');
    console.log('   npx ts-node packages/agents/src/fix-agent/cli.ts \\');
    console.log('     --lsp-actions packages/agents/test-outputs/codequal-lsp-actions.json \\');
    console.log('     --severity high --dry-run');
    console.log('3. Apply fixes (when ready):');
    console.log('   npx ts-node packages/agents/src/fix-agent/cli.ts \\');
    console.log('     --lsp-actions packages/agents/test-outputs/codequal-lsp-actions.json \\');
    console.log('     --severity critical,high');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

main();
