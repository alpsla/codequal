/**
 * Live Tier 1 Test - Native Fix Commands
 *
 * SESSION 106: Run REAL tier 1 fixes and verify files are actually modified.
 *
 * This test performs REAL tool execution:
 * - Runs ESLint --fix on TypeScript fixture
 * - Runs Ruff --fix on Python fixture
 * - Verifies files are actually modified (before/after comparison)
 * - Asserts that fixable issues are resolved
 *
 * TEST WILL FAIL if tools are not installed:
 * - ESLint: npm install -g eslint or npx eslint
 * - Ruff: pip install ruff
 *
 * Run with: npm test -- live-tier1.test.ts
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync, spawnSync } from 'child_process';

import {
  ESLintExecutor,
  RuffExecutor,
  createTier1Executor,
} from '../tool-fixers/tier1-executor';

// ============================================================================
// Test Configuration
// ============================================================================

const FIXTURES_DIR = path.join(__dirname, 'fixtures');
const PYTHON_FIXTURE = path.join(FIXTURES_DIR, 'live-test-python.py');
const TS_FIXTURE = path.join(FIXTURES_DIR, 'live-test-typescript.ts');

// Timeout for tool execution (tools can be slow on first run)
const TOOL_TIMEOUT = 30000; // 30 seconds

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a command is available in PATH
 */
function isCommandAvailable(command: string): boolean {
  try {
    const result = spawnSync('which', [command], { encoding: 'utf8' });
    return result.status === 0;
  } catch {
    return false;
  }
}

/**
 * Check if ESLint is available (via npx or global)
 */
function isESLintAvailable(): boolean {
  try {
    const result = spawnSync('npx', ['eslint', '--version'], {
      encoding: 'utf8',
      timeout: 10000,
    });
    return result.status === 0;
  } catch {
    return false;
  }
}

/**
 * Check if Ruff is available
 */
function isRuffAvailable(): boolean {
  try {
    const result = spawnSync('ruff', ['--version'], {
      encoding: 'utf8',
      timeout: 5000,
    });
    return result.status === 0;
  } catch {
    return false;
  }
}

/**
 * Copy fixture to temp directory for isolated testing
 */
function copyFixtureToTemp(fixturePath: string, tempDir: string): string {
  const fileName = path.basename(fixturePath);
  const destPath = path.join(tempDir, fileName);
  fs.copyFileSync(fixturePath, destPath);
  return destPath;
}

/**
 * Read file content
 */
function readFileContent(filePath: string): string {
  return fs.readFileSync(filePath, 'utf8');
}

/**
 * Count occurrences of a pattern in text
 */
function countOccurrences(text: string, pattern: RegExp): number {
  const matches = text.match(pattern);
  return matches ? matches.length : 0;
}

// ============================================================================
// Test Suite
// ============================================================================

describe('Live Tier 1 Tests - Native Fix Commands (SESSION 106)', () => {
  let tempDir: string;

  beforeAll(() => {
    // Verify fixtures exist
    expect(fs.existsSync(PYTHON_FIXTURE)).toBe(true);
    expect(fs.existsSync(TS_FIXTURE)).toBe(true);
  });

  beforeEach(() => {
    // Create fresh temp directory for each test
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'live-tier1-test-'));
  });

  afterAll(() => {
    // Cleanup is handled by OS for temp directories
  });

  // ==========================================================================
  // Tool Availability Tests
  // ==========================================================================

  describe('Tool Availability (MUST PASS)', () => {
    it('should have ESLint installed', () => {
      const available = isESLintAvailable();
      if (!available) {
        console.error('\n=== ESLint NOT INSTALLED ===');
        console.error('Install with: npm install -g eslint');
        console.error('Or: npm install eslint (in project)');
        console.error('================================\n');
      }
      expect(available).toBe(true);
    });

    it('should have Ruff installed', () => {
      const available = isRuffAvailable();
      if (!available) {
        console.error('\n=== Ruff NOT INSTALLED ===');
        console.error('Install with: pip install ruff');
        console.error('Or: pipx install ruff');
        console.error('================================\n');
      }
      expect(available).toBe(true);
    });
  });

  // ==========================================================================
  // ESLint Live Tests
  // ==========================================================================

  describe('ESLint --fix (TypeScript)', () => {
    let eslintExecutor: ESLintExecutor;
    let testFile: string;
    let originalContent: string;

    beforeEach(() => {
      eslintExecutor = new ESLintExecutor();
      testFile = copyFixtureToTemp(TS_FIXTURE, tempDir);
      originalContent = readFileContent(testFile);

      // Create minimal ESLint config for the test
      const eslintConfig = {
        root: true,
        parser: '@typescript-eslint/parser',
        plugins: ['@typescript-eslint'],
        rules: {
          'semi': ['error', 'always'],
          'quotes': ['error', 'single'],
          'comma-dangle': ['error', 'always-multiline'],
        },
      };
      fs.writeFileSync(
        path.join(tempDir, '.eslintrc.json'),
        JSON.stringify(eslintConfig, null, 2)
      );

      // Install parser temporarily (needed for ESLint)
      try {
        execSync('npm install --no-save @typescript-eslint/parser @typescript-eslint/eslint-plugin', {
          cwd: tempDir,
          stdio: 'pipe',
          timeout: 60000,
        });
      } catch {
        // Parser may already be available globally
      }
    });

    it('should detect issues in TypeScript fixture before fix', () => {
      // Count issues that ESLint can fix:
      // - Missing semicolons (semi)
      // - Double quotes instead of single (quotes)

      // Count missing semicolons (lines ending without ; that should have one)
      const missingSemi = countOccurrences(
        originalContent,
        /const \w+ = ["'][^"']+["']$/gm
      );

      // Count double quotes (should be single)
      const doubleQuotes = countOccurrences(originalContent, /= "/g);

      console.log(`\n=== BEFORE FIX ===`);
      console.log(`Missing semicolons: ~${missingSemi}`);
      console.log(`Double quotes: ${doubleQuotes}`);
      console.log(`==================\n`);

      // There should be fixable issues
      expect(missingSemi + doubleQuotes).toBeGreaterThan(0);
    });

    it('should run ESLint --fix and modify the file', async () => {
      // Skip if ESLint not available
      if (!isESLintAvailable()) {
        console.warn('Skipping: ESLint not installed');
        return;
      }

      // Execute fix
      const result = await eslintExecutor.executeFix({
        workingDir: tempDir,
        files: [testFile],
        timeout: TOOL_TIMEOUT,
        verbose: true,
      });

      console.log('\n=== ESLint Result ===');
      console.log(`Exit code: ${result.exitCode}`);
      console.log(`Success: ${result.success}`);
      console.log(`Duration: ${result.durationMs}ms`);
      if (result.error) {
        console.log(`Error: ${result.error}`);
      }
      console.log('=====================\n');

      // Read modified content
      const modifiedContent = readFileContent(testFile);

      // File should have been modified
      const wasModified = originalContent !== modifiedContent;
      console.log(`File was modified: ${wasModified}`);

      if (!wasModified) {
        console.log('STDOUT:', result.stdout.substring(0, 500));
        console.log('STDERR:', result.stderr.substring(0, 500));
      }

      // Assert file was modified
      expect(wasModified).toBe(true);
    });

    it('should fix semicolon issues', async () => {
      if (!isESLintAvailable()) {
        console.warn('Skipping: ESLint not installed');
        return;
      }

      // Execute fix
      await eslintExecutor.executeFix({
        workingDir: tempDir,
        files: [testFile],
        timeout: TOOL_TIMEOUT,
      });

      const modifiedContent = readFileContent(testFile);

      // Check that semicolons were added
      // Lines like `const APP_NAME = "TestApp"` should now have semicolons
      const linesWithSemi = countOccurrences(modifiedContent, /= ['"][^'"]+['"];$/gm);

      console.log(`Lines with semicolons after fix: ${linesWithSemi}`);

      // Should have semicolons now
      expect(linesWithSemi).toBeGreaterThan(0);
    });

    it('should fix quote style issues', async () => {
      if (!isESLintAvailable()) {
        console.warn('Skipping: ESLint not installed');
        return;
      }

      // Execute fix
      await eslintExecutor.executeFix({
        workingDir: tempDir,
        files: [testFile],
        timeout: TOOL_TIMEOUT,
      });

      const modifiedContent = readFileContent(testFile);

      // Count remaining double quotes in string assignments (should be single now)
      const remainingDoubleQuotes = countOccurrences(modifiedContent, /= "/g);
      const singleQuotes = countOccurrences(modifiedContent, /= '/g);

      console.log(`\n=== AFTER FIX ===`);
      console.log(`Double quotes: ${remainingDoubleQuotes}`);
      console.log(`Single quotes: ${singleQuotes}`);
      console.log(`=================\n`);

      // Single quotes should be more prevalent after fix
      expect(singleQuotes).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Ruff Live Tests
  // ==========================================================================

  describe('Ruff --fix (Python)', () => {
    let ruffExecutor: RuffExecutor;
    let testFile: string;
    let originalContent: string;

    beforeEach(() => {
      ruffExecutor = new RuffExecutor();
      testFile = copyFixtureToTemp(PYTHON_FIXTURE, tempDir);
      originalContent = readFileContent(testFile);

      // Create ruff config to select rules we want to fix
      const ruffToml = `
[lint]
select = ["F401", "F632", "E711", "E712"]
fixable = ["F401", "F632", "E711", "E712"]
unfixable = []
`;
      fs.writeFileSync(path.join(tempDir, 'ruff.toml'), ruffToml.trim());
    });

    it('should detect issues in Python fixture before fix', () => {
      // Count issues that Ruff can fix:
      // - F401: Unused imports
      // - F632: `is` comparison with literal

      // Count unused imports (os, sys, json, re, datetime are unused)
      const unusedImports = ['os', 'sys', 'json', 're', 'datetime'];
      let unusedCount = 0;
      for (const imp of unusedImports) {
        if (originalContent.includes(`import ${imp}`)) {
          unusedCount++;
        }
      }

      // Count `is "string"` comparisons (F632)
      const isLiteralComparisons = countOccurrences(originalContent, / is ["']/g);

      console.log(`\n=== BEFORE FIX ===`);
      console.log(`Unused imports: ${unusedCount}`);
      console.log(`"is" with literal: ${isLiteralComparisons}`);
      console.log(`==================\n`);

      // There should be fixable issues
      expect(unusedCount + isLiteralComparisons).toBeGreaterThan(0);
    });

    it('should run Ruff --fix and modify the file', async () => {
      // Skip if Ruff not available
      if (!isRuffAvailable()) {
        console.warn('Skipping: Ruff not installed');
        return;
      }

      // Execute fix
      const result = await ruffExecutor.executeFix({
        workingDir: tempDir,
        files: [testFile],
        timeout: TOOL_TIMEOUT,
        verbose: true,
      });

      console.log('\n=== Ruff Result ===');
      console.log(`Exit code: ${result.exitCode}`);
      console.log(`Success: ${result.success}`);
      console.log(`Duration: ${result.durationMs}ms`);
      if (result.error) {
        console.log(`Error: ${result.error}`);
      }
      console.log('===================\n');

      // Read modified content
      const modifiedContent = readFileContent(testFile);

      // File should have been modified
      const wasModified = originalContent !== modifiedContent;
      console.log(`File was modified: ${wasModified}`);

      if (!wasModified) {
        console.log('STDOUT:', result.stdout.substring(0, 500));
        console.log('STDERR:', result.stderr.substring(0, 500));
      }

      // Assert file was modified
      expect(wasModified).toBe(true);
    });

    it('should remove unused imports (F401)', async () => {
      if (!isRuffAvailable()) {
        console.warn('Skipping: Ruff not installed');
        return;
      }

      // Execute fix
      await ruffExecutor.executeFix({
        workingDir: tempDir,
        files: [testFile],
        timeout: TOOL_TIMEOUT,
      });

      const modifiedContent = readFileContent(testFile);

      // Check that unused imports were removed
      const stillHasOs = modifiedContent.includes('import os\n');
      const stillHasSys = modifiedContent.includes('import sys\n');
      const stillHasJson = modifiedContent.includes('import json\n');

      console.log(`\n=== AFTER FIX (unused imports) ===`);
      console.log(`Still has 'import os': ${stillHasOs}`);
      console.log(`Still has 'import sys': ${stillHasSys}`);
      console.log(`Still has 'import json': ${stillHasJson}`);
      console.log(`==================================\n`);

      // At least one unused import should be removed
      expect(stillHasOs || stillHasSys || stillHasJson).toBe(false);
    });

    it('should fix "is" with literal comparisons (F632)', async () => {
      if (!isRuffAvailable()) {
        console.warn('Skipping: Ruff not installed');
        return;
      }

      // Execute fix
      await ruffExecutor.executeFix({
        workingDir: tempDir,
        files: [testFile],
        timeout: TOOL_TIMEOUT,
      });

      const modifiedContent = readFileContent(testFile);

      // Count remaining `is "string"` comparisons
      const remainingIsLiteral = countOccurrences(modifiedContent, / is ["']/g);

      // Count `== "string"` comparisons (should increase)
      const eqLiteral = countOccurrences(modifiedContent, / == ["']/g);

      console.log(`\n=== AFTER FIX (is literal) ===`);
      console.log(`Remaining "is" with literal: ${remainingIsLiteral}`);
      console.log(`"==" with literal: ${eqLiteral}`);
      console.log(`==============================\n`);

      // F632 issues should be fixed (is -> ==)
      expect(remainingIsLiteral).toBeLessThan(
        countOccurrences(originalContent, / is ["']/g)
      );
    });

    it('should run Ruff with --unsafe-fixes for E711/E712', async () => {
      if (!isRuffAvailable()) {
        console.warn('Skipping: Ruff not installed');
        return;
      }

      // Create a modified executor that uses --unsafe-fixes
      const unsafeRuffResult = await new Promise<{
        success: boolean;
        modifiedContent: string;
      }>((resolve) => {
        const { spawn } = require('child_process');
        const child = spawn('ruff', ['check', '--fix', '--unsafe-fixes', testFile], {
          cwd: tempDir,
        });

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (data: Buffer) => {
          stdout += data.toString();
        });
        child.stderr.on('data', (data: Buffer) => {
          stderr += data.toString();
        });

        child.on('close', (code: number) => {
          const modifiedContent = readFileContent(testFile);
          resolve({
            success: code === 0 || modifiedContent !== originalContent,
            modifiedContent,
          });
        });
      });

      // Check E711 fix: `== None` should become `is None`
      const originalEqNone = countOccurrences(originalContent, /== None/g);
      const modifiedIsNone = countOccurrences(unsafeRuffResult.modifiedContent, /is None/g);

      // Check E712 fix: `== True` should become just condition check
      const originalEqTrue = countOccurrences(originalContent, /== True/g);
      const modifiedEqTrue = countOccurrences(unsafeRuffResult.modifiedContent, /== True/g);

      console.log(`\n=== UNSAFE FIXES (E711/E712) ===`);
      console.log(`Original "== None": ${originalEqNone}`);
      console.log(`Modified "is None": ${modifiedIsNone}`);
      console.log(`Original "== True": ${originalEqTrue}`);
      console.log(`Modified "== True": ${modifiedEqTrue}`);
      console.log(`================================\n`);

      // E711: At least some `== None` should become `is None`
      // E712: `== True/False` should be reduced
      const e711Fixed = modifiedIsNone > countOccurrences(originalContent, /is None/g);
      const e712Fixed = modifiedEqTrue < originalEqTrue;

      expect(e711Fixed || e712Fixed).toBe(true);
    });
  });

  // ==========================================================================
  // Factory Tests
  // ==========================================================================

  describe('Tier 1 Executor Factory', () => {
    it('should create ESLint executor via factory', () => {
      const executor = createTier1Executor('eslint');
      expect(executor).not.toBeNull();
      expect(executor).toBeInstanceOf(ESLintExecutor);
    });

    it('should create Ruff executor via factory', () => {
      const executor = createTier1Executor('ruff');
      expect(executor).not.toBeNull();
      expect(executor).toBeInstanceOf(RuffExecutor);
    });

    it('should return null for unknown tool', () => {
      const executor = createTier1Executor('unknown-tool');
      expect(executor).toBeNull();
    });
  });

  // ==========================================================================
  // Integration Summary
  // ==========================================================================

  describe('Live Test Summary', () => {
    it('should provide summary of tier 1 tool capabilities', () => {
      const summary = {
        eslint: {
          available: isESLintAvailable(),
          autoFixable: ['semi', 'quotes', 'comma-dangle', 'indent', 'no-trailing-spaces'],
          needsAI: ['@typescript-eslint/no-explicit-any', '@typescript-eslint/no-unused-vars'],
        },
        ruff: {
          available: isRuffAvailable(),
          autoFixable: ['F401', 'F632', 'E711 (unsafe)', 'E712 (unsafe)'],
          needsAI: ['E402', 'C901', 'N802', 'N806'],
        },
      };

      console.log('\n=== TIER 1 TOOL SUMMARY ===');
      console.log(JSON.stringify(summary, null, 2));
      console.log('============================\n');

      // At least one tool should be available for useful tests
      expect(summary.eslint.available || summary.ruff.available).toBe(true);
    });
  });
});
