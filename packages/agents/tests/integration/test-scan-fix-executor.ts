/**
 * Test: Scan-Time Fix Executor Integration
 *
 * Tests the ScanFixExecutor to verify that fixes are applied during scan.
 * This validates the "Fix During Scan" mode - the PRIMARY fix delivery mechanism.
 *
 * Test Scenarios:
 * 1. Tier 1 fixes (ESLint --fix, Prettier --write) - Style fixes
 * 2. Tier 2 fixes (autoflake, isort, black) - Python fixes
 * 3. Full pipeline integration with V9 report
 *
 * Usage:
 *   npx ts-node tests/integration/test-scan-fix-executor.ts
 */

import dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';

// Load environment
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Import fix executor
import {
  ScanFixExecutor,
  executeScanFixes,
  executeScanFixesWithPatch,
  type DetectedIssue,
  type ScanFixResult,
} from '../../src/fix-agent/scan-fix-executor';

// ============================================================================
// TEST SETUP
// ============================================================================

interface TestScenario {
  name: string;
  language: 'typescript' | 'python' | 'java' | 'go';
  issues: DetectedIssue[];
  expectedTier1Fixes: number;
  expectedTier2Fixes: number;
}

// Create a temp directory for testing
function createTempDir(testName: string): string {
  const tempDir = path.join('/tmp', `scan-fix-test-${testName}-${Date.now()}`);
  fs.mkdirSync(tempDir, { recursive: true });
  return tempDir;
}

// Clean up temp directory
function cleanupTempDir(tempDir: string): void {
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

// Initialize git repo in temp dir
function initGitRepo(tempDir: string): void {
  execSync('git init', { cwd: tempDir, stdio: 'pipe' });
  execSync('git config user.email "test@example.com"', { cwd: tempDir, stdio: 'pipe' });
  execSync('git config user.name "Test User"', { cwd: tempDir, stdio: 'pipe' });
}

// ============================================================================
// TEST SCENARIOS
// ============================================================================

/**
 * TypeScript Test: ESLint + Prettier fixes
 */
async function testTypeScriptFixes(): Promise<void> {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 TEST: TypeScript Tier 1 Fixes (ESLint + Prettier)');
  console.log('='.repeat(80) + '\n');

  const tempDir = createTempDir('typescript');

  try {
    // Setup: Create test file with issues
    const testFile = path.join(tempDir, 'test.ts');
    const testContent = `
// File with ESLint issues
const unused_var = 42;  // unused variable
const   badly_formatted   =   "test"  ;  // formatting issues

function test(param) {
  console.log('debug');  // no-console
  return "result";
}
`;
    fs.writeFileSync(testFile, testContent);

    // Create minimal ESLint config
    const eslintConfig = {
      "extends": ["eslint:recommended"],
      "parser": "@typescript-eslint/parser",
      "env": { "node": true, "es6": true },
      "rules": {
        "no-unused-vars": "error",
        "no-console": "warn"
      }
    };
    fs.writeFileSync(path.join(tempDir, '.eslintrc.json'), JSON.stringify(eslintConfig, null, 2));

    // Create Prettier config
    fs.writeFileSync(path.join(tempDir, '.prettierrc'), JSON.stringify({ semi: true, singleQuote: true }));

    // Create package.json
    const packageJson = {
      "name": "test-project",
      "version": "1.0.0",
      "devDependencies": {
        "eslint": "^8.0.0",
        "@typescript-eslint/parser": "^6.0.0",
        "prettier": "^3.0.0"
      }
    };
    fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify(packageJson, null, 2));

    // Initialize git (needed for patch generation)
    initGitRepo(tempDir);
    execSync('git add .', { cwd: tempDir, stdio: 'pipe' });
    execSync('git commit -m "Initial commit"', { cwd: tempDir, stdio: 'pipe' });

    // Install dependencies
    console.log('📦 Installing dependencies...');
    try {
      execSync('npm install --ignore-scripts', { cwd: tempDir, stdio: 'pipe' });
      console.log('   ✅ Dependencies installed');
    } catch (error) {
      console.log('   ⚠️  npm install failed - continuing with system tools');
    }

    // Create detected issues (simulating tool detection)
    const issues: DetectedIssue[] = [
      {
        file: 'test.ts',
        line: 3,
        rule: 'no-unused-vars',
        tool: 'eslint',
        message: "'unused_var' is defined but never used",
        severity: 'error',
      },
      {
        file: 'test.ts',
        line: 7,
        rule: 'no-console',
        tool: 'eslint',
        message: "Unexpected console statement",
        severity: 'warning',
      },
      {
        file: 'test.ts',
        line: 4,
        rule: 'prettier/prettier',
        tool: 'prettier',
        message: "Replace `··badly_formatted···=···\"test\"··;` with `badly_formatted·=·'test';`",
        severity: 'warning',
      },
    ];

    // Execute fixes
    console.log('\n🔧 Executing fixes...');
    const result = await executeScanFixes(issues, tempDir, 'typescript', {
      dryRun: false,
      verbose: true,
      autoApplyTiers: {
        tier1: true,
        tier2: true,
        tier3: false,
      },
      onProgress: (update) => {
        console.log(`   [${update.phase}] ${update.message}`);
      },
    });

    // Report results
    console.log('\n📊 Results:');
    console.log(`   Total issues: ${result.summary.totalIssues}`);
    console.log(`   Fixed: ${result.summary.fixedIssues}`);
    console.log(`   Failed: ${result.summary.failedIssues}`);
    console.log(`   Skipped: ${result.summary.skippedIssues}`);
    console.log(`   Tier 1 fixed: ${result.summary.tier1Fixed}`);
    console.log(`   Tier 2 fixed: ${result.summary.tier2Fixed}`);
    console.log(`   Tier 3 fixed: ${result.summary.tier3Fixed}`);
    console.log(`   Duration: ${result.durationMs}ms`);

    if (result.modifiedFiles.length > 0) {
      console.log(`   Modified files: ${result.modifiedFiles.join(', ')}`);
    }

    if (result.manualReviewRequired.length > 0) {
      console.log(`\n⚠️  Manual Review Required:`);
      result.manualReviewRequired.forEach(issue => {
        console.log(`   - ${issue.file}:${issue.line} - ${issue.rule}: ${issue.reason}`);
      });
    }

    // Verify file was modified
    const modifiedContent = fs.readFileSync(testFile, 'utf-8');
    console.log(`\n📄 Modified file content (first 500 chars):`);
    console.log(modifiedContent.substring(0, 500));

    // Test passed/failed
    if (result.success) {
      console.log('\n✅ TEST PASSED: TypeScript fixes executed successfully');
    } else {
      console.log('\n❌ TEST FAILED: Some fixes could not be applied');
    }

  } finally {
    cleanupTempDir(tempDir);
  }
}

/**
 * Python Test: Ruff + autoflake + black fixes
 */
async function testPythonFixes(): Promise<void> {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 TEST: Python Tier 1 & Tier 2 Fixes (Ruff + autoflake + black)');
  console.log('='.repeat(80) + '\n');

  const tempDir = createTempDir('python');

  try {
    // Setup: Create test file with issues
    const testFile = path.join(tempDir, 'test.py');
    const testContent = `
import os
import sys  # unused import
import json  # unused import

def test_function( ):
    unused_var = 42
    print("debug")
    return "result"

x=1+2  # formatting issue
`;
    fs.writeFileSync(testFile, testContent);

    // Initialize git
    initGitRepo(tempDir);
    execSync('git add .', { cwd: tempDir, stdio: 'pipe' });
    execSync('git commit -m "Initial commit"', { cwd: tempDir, stdio: 'pipe' });

    // Create detected issues
    const issues: DetectedIssue[] = [
      {
        file: 'test.py',
        line: 3,
        rule: 'F401',
        tool: 'ruff',
        message: "'sys' imported but unused",
        severity: 'warning',
      },
      {
        file: 'test.py',
        line: 4,
        rule: 'F401',
        tool: 'ruff',
        message: "'json' imported but unused",
        severity: 'warning',
      },
      {
        file: 'test.py',
        line: 7,
        rule: 'F841',
        tool: 'ruff',
        message: "Local variable 'unused_var' is assigned to but never used",
        severity: 'warning',
      },
      {
        file: 'test.py',
        line: 11,
        rule: 'E225',
        tool: 'ruff',
        message: "Missing whitespace around operator",
        severity: 'warning',
      },
    ];

    // Execute fixes
    console.log('\n🔧 Executing fixes...');
    const result = await executeScanFixes(issues, tempDir, 'python', {
      dryRun: false,
      verbose: true,
      autoApplyTiers: {
        tier1: true,
        tier2: true,
        tier3: false,
      },
      onProgress: (update) => {
        console.log(`   [${update.phase}] ${update.message}`);
      },
    });

    // Report results
    console.log('\n📊 Results:');
    console.log(`   Total issues: ${result.summary.totalIssues}`);
    console.log(`   Fixed: ${result.summary.fixedIssues}`);
    console.log(`   Failed: ${result.summary.failedIssues}`);
    console.log(`   Skipped: ${result.summary.skippedIssues}`);
    console.log(`   Duration: ${result.durationMs}ms`);

    // Verify file was modified
    const modifiedContent = fs.readFileSync(testFile, 'utf-8');
    console.log(`\n📄 Modified file content:`);
    console.log(modifiedContent);

    // Test passed/failed
    if (result.success) {
      console.log('\n✅ TEST PASSED: Python fixes executed successfully');
    } else {
      console.log('\n❌ TEST FAILED: Some fixes could not be applied');
    }

  } finally {
    cleanupTempDir(tempDir);
  }
}

/**
 * Patch Generation Test
 */
async function testPatchGeneration(): Promise<void> {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 TEST: Patch Generation');
  console.log('='.repeat(80) + '\n');

  const tempDir = createTempDir('patch');

  try {
    // Setup: Create test file
    const testFile = path.join(tempDir, 'test.ts');
    fs.writeFileSync(testFile, `const unused = 42;\nconsole.log("test");\n`);

    // Initialize git with initial commit
    initGitRepo(tempDir);
    execSync('git add .', { cwd: tempDir, stdio: 'pipe' });
    execSync('git commit -m "Initial commit"', { cwd: tempDir, stdio: 'pipe' });

    // Execute fixes with patch generation
    const issues: DetectedIssue[] = [{
      file: 'test.ts',
      line: 1,
      rule: 'no-unused-vars',
      tool: 'eslint',
      message: "'unused' is defined but never used",
      severity: 'error',
    }];

    const result = await executeScanFixesWithPatch(issues, tempDir, 'typescript', {
      verbose: true,
    });

    console.log('\n📊 Results:');
    console.log(`   Fixed: ${result.summary.fixedIssues}`);

    if (result.patchFile) {
      console.log(`   Patch file: ${result.patchFile}`);
      if (fs.existsSync(result.patchFile)) {
        const patchContent = fs.readFileSync(result.patchFile, 'utf-8');
        console.log(`\n📄 Patch content:`);
        console.log(patchContent.substring(0, 500));
        console.log('\n✅ TEST PASSED: Patch file generated successfully');
      }
    } else {
      console.log('\n⚠️  No patch file generated (no fixes applied)');
    }

  } finally {
    cleanupTempDir(tempDir);
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main(): Promise<void> {
  console.log('\n' + '═'.repeat(80));
  console.log('  SCAN-TIME FIX EXECUTOR INTEGRATION TESTS');
  console.log('═'.repeat(80) + '\n');

  console.log('These tests verify the "Fix During Scan" mode - the PRIMARY fix delivery mechanism.');
  console.log('Fixes are applied directly during analysis, not recommended for IDE application.\n');

  // Check for required tools
  console.log('🔍 Checking for required tools...\n');
  const tools = ['eslint', 'prettier', 'ruff', 'black', 'autoflake'];
  for (const tool of tools) {
    try {
      execSync(`which ${tool}`, { stdio: 'pipe' });
      console.log(`   ✅ ${tool} installed`);
    } catch {
      console.log(`   ⚠️  ${tool} not found (some tests may skip)`);
    }
  }

  try {
    // Run tests
    await testTypeScriptFixes();
    await testPythonFixes();
    await testPatchGeneration();

    console.log('\n' + '═'.repeat(80));
    console.log('  ALL TESTS COMPLETED');
    console.log('═'.repeat(80) + '\n');

  } catch (error) {
    console.error('\n❌ Test execution failed:', error);
    process.exit(1);
  }
}

main();
