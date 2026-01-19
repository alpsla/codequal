/**
 * Live Go Test - Native Fix Commands (Tier 1 & 2)
 *
 * SESSION 107: Run REAL Go fixes and verify files are actually modified.
 *
 * This test performs REAL tool execution:
 * - Runs gofmt on Go fixture (formatting)
 * - Runs goimports on Go fixture (unused imports + formatting)
 * - Runs golangci-lint --fix on Go fixture (limited auto-fixes)
 * - Verifies files are actually modified (before/after comparison)
 * - Documents which issues need AI (errcheck, staticcheck)
 *
 * TEST WILL FAIL if tools are not installed:
 * - gofmt: Included with Go (go install)
 * - goimports: go install golang.org/x/tools/cmd/goimports@latest
 * - golangci-lint: https://golangci-lint.run/usage/install/
 *
 * Run with: npm test -- live-go.test.ts
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawnSync, execSync } from 'child_process';

import {
  GofmtExecutor,
  GoimportsExecutor,
  GolangciLintExecutor,
  createTier2Executor,
} from '../tool-fixers/tier2-executor';

// ============================================================================
// Test Configuration
// ============================================================================

const FIXTURES_DIR = path.join(__dirname, 'fixtures');
const GO_FIXTURE_DIR = path.join(FIXTURES_DIR, 'live-test-go');
const GO_FIXTURE_FILE = path.join(GO_FIXTURE_DIR, 'main.go');
const GO_MOD_FILE = path.join(GO_FIXTURE_DIR, 'go.mod');

// Timeout for tool execution (tools can be slow on first run)
const TOOL_TIMEOUT = 60000; // 60 seconds for golangci-lint

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if gofmt is available (comes with Go)
 */
function isGofmtAvailable(): boolean {
  try {
    const result = spawnSync('gofmt', ['-h'], {
      encoding: 'utf8',
      timeout: 5000,
    });
    // gofmt -h exits with code 2 but means it's available
    return result.error === undefined;
  } catch {
    return false;
  }
}

/**
 * Check if goimports is available in PATH (for executor classes that use command name)
 */
function isGoimportsInPath(): boolean {
  const result = spawnSync('which', ['goimports'], { encoding: 'utf8', timeout: 5000 });
  return result.status === 0 && Boolean(result.stdout.trim());
}

/**
 * Get the goimports command (may be in ~/go/bin/)
 */
function getGoimportsCommand(): string | null {
  // Try PATH first
  if (isGoimportsInPath()) {
    return 'goimports';
  }

  // Try ~/go/bin/goimports
  const goPath = path.join(os.homedir(), 'go', 'bin', 'goimports');
  if (fs.existsSync(goPath)) {
    return goPath;
  }

  return null;
}

/**
 * Check if goimports is available (in PATH or ~/go/bin/)
 */
function isGoimportsAvailable(): boolean {
  return getGoimportsCommand() !== null;
}

/**
 * Check if golangci-lint is available
 */
function isGolangciLintAvailable(): boolean {
  try {
    const result = spawnSync('golangci-lint', ['--version'], {
      encoding: 'utf8',
      timeout: 5000,
    });
    return result.status === 0;
  } catch {
    return false;
  }
}

/**
 * Copy entire fixture directory to temp for isolated testing
 */
function copyFixtureDirToTemp(fixtureDir: string, tempDir: string): string {
  const destDir = path.join(tempDir, 'live-test-go');
  fs.mkdirSync(destDir, { recursive: true });

  // Copy all files from fixture directory
  const files = fs.readdirSync(fixtureDir);
  for (const file of files) {
    const srcPath = path.join(fixtureDir, file);
    const destPath = path.join(destDir, file);
    if (fs.statSync(srcPath).isFile()) {
      fs.copyFileSync(srcPath, destPath);
    }
  }

  return destDir;
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

describe('Live Go Tests - Native Fix Commands (SESSION 107)', () => {
  let tempDir: string;
  let tempGoDir: string;
  let testMainGo: string;

  beforeAll(() => {
    // Verify fixtures exist
    expect(fs.existsSync(GO_FIXTURE_FILE)).toBe(true);
    expect(fs.existsSync(GO_MOD_FILE)).toBe(true);
  });

  beforeEach(() => {
    // Create fresh temp directory for each test
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'live-go-test-'));
    tempGoDir = copyFixtureDirToTemp(GO_FIXTURE_DIR, tempDir);
    testMainGo = path.join(tempGoDir, 'main.go');
  });

  afterEach(() => {
    // Clean up temp files
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  // ==========================================================================
  // Tool Availability Tests
  // ==========================================================================

  describe('Tool Availability (MUST PASS)', () => {
    it('should have gofmt installed (comes with Go)', () => {
      const available = isGofmtAvailable();
      if (!available) {
        console.error('\n=== gofmt NOT AVAILABLE ===');
        console.error('gofmt is included with Go installation');
        console.error('Install Go: https://golang.org/doc/install');
        console.error('================================\n');
      }
      expect(available).toBe(true);
    });

    it('should have goimports installed', () => {
      const available = isGoimportsAvailable();
      if (!available) {
        console.error('\n=== goimports NOT INSTALLED ===');
        console.error('Install with: go install golang.org/x/tools/cmd/goimports@latest');
        console.error('=================================\n');
      }
      // goimports is recommended but not strictly required
      expect(available).toBe(true);
    });

    it('should have golangci-lint installed', () => {
      const available = isGolangciLintAvailable();
      if (!available) {
        console.error('\n=== golangci-lint NOT INSTALLED ===');
        console.error('Install: https://golangci-lint.run/usage/install/');
        console.error('brew install golangci-lint');
        console.error('====================================\n');
      }
      expect(available).toBe(true);
    });
  });

  // ==========================================================================
  // gofmt Live Tests
  // ==========================================================================

  describe('gofmt (Go Formatting)', () => {
    let originalContent: string;

    beforeEach(() => {
      originalContent = readFileContent(testMainGo);
    });

    it('should detect formatting issues in Go fixture before fix', () => {
      // Count formatting issues that gofmt will fix:
      // - Missing spaces around operators (x+y -> x + y)
      // - Missing spaces after commas (x,y -> x, y)
      // - Bad brace placement ({on same line)
      // - Inconsistent indentation

      // Count cramped function declarations like func name(a,b)
      const crampedParams = countOccurrences(originalContent, /\w,\w/g);

      // Count missing space around operators like x+y
      const noSpaceOps = countOccurrences(originalContent, /\w\+\w/g);

      // Count cramped braces like )int{ or struct{
      const crampedBraces = countOccurrences(originalContent, /\)\w+\{/g);

      console.log(`\n=== BEFORE gofmt ===`);
      console.log(`Cramped parameters: ${crampedParams}`);
      console.log(`No space around +: ${noSpaceOps}`);
      console.log(`Cramped braces: ${crampedBraces}`);
      console.log(`Total formatting issues: ${crampedParams + noSpaceOps + crampedBraces}`);
      console.log(`====================\n`);

      // There should be formatting issues in the fixture
      expect(crampedParams + noSpaceOps + crampedBraces).toBeGreaterThan(0);
    });

    it('should run gofmt and modify the file', async () => {
      if (!isGofmtAvailable()) {
        console.warn('Skipping: gofmt not available');
        return;
      }

      // Run gofmt directly
      const result = spawnSync('gofmt', ['-w', testMainGo], {
        encoding: 'utf8',
        timeout: TOOL_TIMEOUT,
      });

      console.log('\n=== gofmt Result ===');
      console.log(`Exit code: ${result.status}`);
      console.log(`Success: ${result.status === 0}`);
      if (result.error) {
        console.log(`Error: ${result.error}`);
      }
      if (result.stderr) {
        console.log(`Stderr: ${result.stderr.substring(0, 500)}`);
      }
      console.log('====================\n');

      // Read modified content
      const modifiedContent = readFileContent(testMainGo);

      // File should have been modified
      const wasModified = originalContent !== modifiedContent;
      console.log(`File was modified: ${wasModified}`);
      console.log(`Original size: ${originalContent.length}`);
      console.log(`Modified size: ${modifiedContent.length}`);

      // Assert file was modified (gofmt should format the file)
      expect(wasModified).toBe(true);
    });

    it('should fix parameter spacing', async () => {
      if (!isGofmtAvailable()) {
        console.warn('Skipping: gofmt not available');
        return;
      }

      // Run gofmt
      spawnSync('gofmt', ['-w', testMainGo], {
        encoding: 'utf8',
        timeout: TOOL_TIMEOUT,
      });

      const modifiedContent = readFileContent(testMainGo);

      // Count remaining cramped parameters (a,b should become a, b)
      const remainingCrampedParams = countOccurrences(modifiedContent, /\([a-z] int,[a-z] int\)/g);

      // Count properly spaced parameters
      const properlySpaced = countOccurrences(modifiedContent, /\([a-z] int, [a-z] int\)/g);

      console.log(`\n=== AFTER gofmt (spacing) ===`);
      console.log(`Remaining cramped: ${remainingCrampedParams}`);
      console.log(`Properly spaced: ${properlySpaced}`);
      console.log(`=============================\n`);

      // Parameters should be properly spaced after gofmt
      expect(properlySpaced).toBeGreaterThan(0);
      expect(remainingCrampedParams).toBe(0);
    });

    it('should fix brace positioning', async () => {
      if (!isGofmtAvailable()) {
        console.warn('Skipping: gofmt not available');
        return;
      }

      // Run gofmt
      spawnSync('gofmt', ['-w', testMainGo], {
        encoding: 'utf8',
        timeout: TOOL_TIMEOUT,
      });

      const modifiedContent = readFileContent(testMainGo);

      // Count proper function declarations with space before brace
      const properBraces = countOccurrences(modifiedContent, /\) (int|string|bool|error|\*\w+|\w+) \{/g);

      console.log(`\n=== AFTER gofmt (braces) ===`);
      console.log(`Proper brace positioning: ${properBraces}`);
      console.log(`============================\n`);

      // Should have properly positioned braces
      expect(properBraces).toBeGreaterThan(0);
    });

    it('should fix struct formatting', async () => {
      if (!isGofmtAvailable()) {
        console.warn('Skipping: gofmt not available');
        return;
      }

      // Run gofmt
      spawnSync('gofmt', ['-w', testMainGo], {
        encoding: 'utf8',
        timeout: TOOL_TIMEOUT,
      });

      const modifiedContent = readFileContent(testMainGo);

      // Properly formatted struct has "struct {"
      const properStructDef = countOccurrences(modifiedContent, /type \w+ struct \{/g);

      console.log(`\n=== AFTER gofmt (struct) ===`);
      console.log(`Properly formatted structs: ${properStructDef}`);
      console.log(`============================\n`);

      // Should have properly formatted struct
      expect(properStructDef).toBeGreaterThanOrEqual(1);
    });
  });

  // ==========================================================================
  // goimports Live Tests
  // ==========================================================================

  describe('goimports (Unused Imports + Formatting)', () => {
    let originalContent: string;

    beforeEach(() => {
      originalContent = readFileContent(testMainGo);
    });

    it('should detect unused imports in Go fixture before fix', () => {
      // Check for unused imports mentioned in fixture comments:
      // regexp, sync, time are unused (ioutil IS used in fetchURL)
      const unusedImports = ['regexp', 'sync', 'time'];
      let unusedCount = 0;

      for (const imp of unusedImports) {
        if (originalContent.includes(`"${imp}"`)) {
          unusedCount++;
        }
      }

      console.log(`\n=== BEFORE goimports ===`);
      console.log(`Unused imports detected: ${unusedCount}`);
      for (const imp of unusedImports) {
        const hasImport = originalContent.includes(`"${imp}"`);
        console.log(`  "${imp}": ${hasImport ? 'PRESENT' : 'not found'}`);
      }
      console.log(`========================\n`);

      // There should be unused imports
      expect(unusedCount).toBeGreaterThan(0);
    });

    it('should run goimports and modify the file', async () => {
      const goimportsCmd = getGoimportsCommand();
      if (!goimportsCmd) {
        console.warn('Skipping: goimports not installed');
        return;
      }

      // Run goimports directly
      const result = spawnSync(goimportsCmd, ['-w', testMainGo], {
        encoding: 'utf8',
        timeout: TOOL_TIMEOUT,
      });

      console.log('\n=== goimports Result ===');
      console.log(`Exit code: ${result.status}`);
      console.log(`Success: ${result.status === 0}`);
      if (result.error) {
        console.log(`Error: ${result.error}`);
      }
      if (result.stderr) {
        console.log(`Stderr: ${result.stderr.substring(0, 500)}`);
      }
      console.log('========================\n');

      // Read modified content
      const modifiedContent = readFileContent(testMainGo);

      // File should have been modified
      const wasModified = originalContent !== modifiedContent;
      console.log(`File was modified: ${wasModified}`);
      console.log(`Original size: ${originalContent.length}`);
      console.log(`Modified size: ${modifiedContent.length}`);

      // Assert file was modified
      expect(wasModified).toBe(true);
    });

    it('should remove unused imports', async () => {
      const goimportsCmd = getGoimportsCommand();
      if (!goimportsCmd) {
        console.warn('Skipping: goimports not installed');
        return;
      }

      // Run goimports
      spawnSync(goimportsCmd, ['-w', testMainGo], {
        encoding: 'utf8',
        timeout: TOOL_TIMEOUT,
      });

      const modifiedContent = readFileContent(testMainGo);

      // Check that unused imports were removed
      // Note: ioutil IS used in fetchURL, so it should NOT be removed
      const stillHasIoutil = modifiedContent.includes('"io/ioutil"');
      const stillHasRegexp = modifiedContent.includes('"regexp"');
      const stillHasSync = modifiedContent.includes('"sync"');
      const stillHasTime = modifiedContent.includes('"time"');

      console.log(`\n=== AFTER goimports (unused imports) ===`);
      console.log(`Still has "io/ioutil": ${stillHasIoutil} (expected: true - it's used)`);
      console.log(`Still has "regexp": ${stillHasRegexp}`);
      console.log(`Still has "sync": ${stillHasSync}`);
      console.log(`Still has "time": ${stillHasTime}`);
      console.log(`=========================================\n`);

      // Truly unused imports should be removed (regexp, sync, time)
      // ioutil IS used so it stays
      expect(stillHasRegexp).toBe(false);
      expect(stillHasSync).toBe(false);
      expect(stillHasTime).toBe(false);
    });

    it('should keep used imports', async () => {
      const goimportsCmd = getGoimportsCommand();
      if (!goimportsCmd) {
        console.warn('Skipping: goimports not installed');
        return;
      }

      // Run goimports
      spawnSync(goimportsCmd, ['-w', testMainGo], {
        encoding: 'utf8',
        timeout: TOOL_TIMEOUT,
      });

      const modifiedContent = readFileContent(testMainGo);

      // Check that used imports are still present
      const hasFmt = modifiedContent.includes('"fmt"');
      const hasOs = modifiedContent.includes('"os"');
      const hasJson = modifiedContent.includes('"encoding/json"');
      const hasHttp = modifiedContent.includes('"net/http"');
      const hasStrings = modifiedContent.includes('"strings"');

      console.log(`\n=== USED IMPORTS ===`);
      console.log(`Has "fmt": ${hasFmt}`);
      console.log(`Has "os": ${hasOs}`);
      console.log(`Has "encoding/json": ${hasJson}`);
      console.log(`Has "net/http": ${hasHttp}`);
      console.log(`Has "strings": ${hasStrings}`);
      console.log(`====================\n`);

      // Used imports should remain
      expect(hasFmt).toBe(true);
      expect(hasOs).toBe(true);
      expect(hasJson).toBe(true);
    });

    it('should also fix formatting (superset of gofmt)', async () => {
      const goimportsCmd = getGoimportsCommand();
      if (!goimportsCmd) {
        console.warn('Skipping: goimports not installed');
        return;
      }

      // Run goimports
      spawnSync(goimportsCmd, ['-w', testMainGo], {
        encoding: 'utf8',
        timeout: TOOL_TIMEOUT,
      });

      const modifiedContent = readFileContent(testMainGo);

      // Check that formatting is also fixed (goimports includes gofmt)
      const crampedParams = countOccurrences(modifiedContent, /\([a-z] int,[a-z] int\)/g);
      const properlySpaced = countOccurrences(modifiedContent, /\([a-z] int, [a-z] int\)/g);

      console.log(`\n=== goimports formatting ===`);
      console.log(`Cramped params (should be 0): ${crampedParams}`);
      console.log(`Properly spaced: ${properlySpaced}`);
      console.log(`============================\n`);

      // goimports should fix formatting too
      expect(crampedParams).toBe(0);
    });
  });

  // ==========================================================================
  // golangci-lint Live Tests
  // ==========================================================================

  describe('golangci-lint --fix (Limited Auto-Fix)', () => {
    let originalContent: string;

    beforeEach(() => {
      originalContent = readFileContent(testMainGo);
    });

    it('should detect misspellings in comments', () => {
      // The fixture has intentional typos in comments:
      // functon, coment, shoud, algoritm, calcualtes, aproximate
      // Recieve, proccess, acordingly

      const typos = [
        'functon',
        'coment',
        'shoud',
        'algoritm',
        'calcualtes',
        'aproximate',
        'Recieve',
        'proccess',
        'acordingly',
      ];

      let typoCount = 0;
      for (const typo of typos) {
        if (originalContent.includes(typo)) {
          typoCount++;
        }
      }

      console.log(`\n=== BEFORE golangci-lint ===`);
      console.log(`Typos in comments: ${typoCount}`);
      for (const typo of typos) {
        const hasTypo = originalContent.includes(typo);
        console.log(`  "${typo}": ${hasTypo ? 'PRESENT' : 'not found'}`);
      }
      console.log(`============================\n`);

      // There should be typos
      expect(typoCount).toBeGreaterThan(0);
    });

    it('should run golangci-lint --fix (limited auto-fix)', async () => {
      if (!isGolangciLintAvailable()) {
        console.warn('Skipping: golangci-lint not installed');
        return;
      }

      // First run gofmt to fix formatting (golangci-lint works better on formatted code)
      if (isGofmtAvailable()) {
        spawnSync('gofmt', ['-w', testMainGo], { encoding: 'utf8', timeout: TOOL_TIMEOUT });
      }

      // Get content before golangci-lint
      const beforeGolangci = readFileContent(testMainGo);

      // Run golangci-lint with misspell enabled
      const result = spawnSync(
        'golangci-lint',
        ['run', '--fix', '--enable', 'misspell', '--enable', 'whitespace', '.'],
        {
          cwd: tempGoDir,
          encoding: 'utf8',
          timeout: TOOL_TIMEOUT,
        }
      );

      console.log('\n=== golangci-lint --fix Result ===');
      console.log(`Exit code: ${result.status}`);
      // Note: golangci-lint returns non-zero if there are unfixable issues
      console.log(`Has stdout: ${result.stdout?.length > 0}`);
      if (result.stderr && result.stderr.length > 0) {
        console.log(`Stderr (first 500 chars): ${result.stderr.substring(0, 500)}`);
      }
      console.log('==================================\n');

      // Read modified content
      const modifiedContent = readFileContent(testMainGo);

      // Check if file was modified
      const wasModified = beforeGolangci !== modifiedContent;
      console.log(`File was modified by golangci-lint: ${wasModified}`);

      // golangci-lint may or may not modify (depends on which linters are enabled and fixable)
      // We just verify it ran successfully
      expect(result.error).toBeUndefined();
    });

    it('should document which issues golangci-lint CAN auto-fix', () => {
      // golangci-lint --fix can auto-fix SOME issues:
      const canAutoFix = [
        'misspell', // typos in comments/strings
        'whitespace', // trailing whitespace
        'gofmt', // formatting (via embedded gofmt)
        'goimports', // imports (via embedded goimports)
        'wsl', // whitespace linting
      ];

      console.log('\n=== golangci-lint AUTO-FIXABLE ===');
      console.log('These issues CAN be auto-fixed:');
      canAutoFix.forEach((issue) => console.log(`  - ${issue}`));
      console.log('===================================\n');

      // This is documentation-only test
      expect(canAutoFix.length).toBeGreaterThan(0);
    });

    it('should document which issues need AI (NOT auto-fixable)', () => {
      // These issues CANNOT be auto-fixed by golangci-lint:
      const needsAI = [
        { rule: 'errcheck', reason: 'Needs to add if err != nil checks' },
        { rule: 'staticcheck (SA4006)', reason: 'Ineffective assignment needs refactoring' },
        { rule: 'unused', reason: 'Unused variables need semantic removal' },
        { rule: 'gosec', reason: 'Security issues need context-aware fixes' },
        { rule: 'govet', reason: 'Most issues need semantic changes' },
        { rule: 'ineffassign', reason: 'Needs understanding of variable usage' },
        { rule: 'deadcode', reason: 'Dead code removal needs analysis' },
      ];

      console.log('\n=== ISSUES NEEDING AI (TIER 3) ===');
      console.log('These issues CANNOT be auto-fixed:');
      needsAI.forEach((item) => console.log(`  - ${item.rule}: ${item.reason}`));
      console.log('===================================\n');

      // Count how many of these issues are in the fixture
      const errcheckIssues = countOccurrences(originalContent, /_, _ :?= /g) +
        countOccurrences(originalContent, /\w+\.\w+\([^)]*\)\s*\/\/ errcheck/g);

      console.log(`\n=== FIXTURE AI-NEEDED ISSUES ===`);
      console.log(`Unchecked errors (errcheck): ${errcheckIssues}`);
      console.log(`================================\n`);

      expect(needsAI.length).toBeGreaterThan(0);
      expect(errcheckIssues).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Executor Class Tests (via tier2-executor)
  // ==========================================================================

  describe('Tier 2 Executor Classes', () => {
    it('should create GofmtExecutor via factory', () => {
      const executor = createTier2Executor('gofmt');
      expect(executor).not.toBeNull();
      expect(executor).toBeInstanceOf(GofmtExecutor);
    });

    it('should create GoimportsExecutor via factory', () => {
      const executor = createTier2Executor('goimports');
      expect(executor).not.toBeNull();
      expect(executor).toBeInstanceOf(GoimportsExecutor);
    });

    it('should create GolangciLintExecutor via factory', () => {
      const executor = createTier2Executor('golangci-lint');
      expect(executor).not.toBeNull();
      expect(executor).toBeInstanceOf(GolangciLintExecutor);
    });

    it('should execute GofmtExecutor fix', async () => {
      if (!isGofmtAvailable()) {
        console.warn('Skipping: gofmt not available');
        return;
      }

      const originalContent = readFileContent(testMainGo);
      const executor = new GofmtExecutor();

      const result = await executor.executeFix({
        workingDir: tempGoDir,
        files: [testMainGo],
        timeout: TOOL_TIMEOUT,
        verbose: true,
      });

      console.log('\n=== GofmtExecutor Result ===');
      console.log(`Success: ${result.success}`);
      console.log(`Tool: ${result.tool}`);
      console.log(`Duration: ${result.durationMs}ms`);
      console.log(`Command: ${result.command}`);
      console.log('============================\n');

      const modifiedContent = readFileContent(testMainGo);
      const wasModified = originalContent !== modifiedContent;

      expect(result.success).toBe(true);
      expect(result.tool).toBe('gofmt');
      expect(wasModified).toBe(true);
    });

    it('should execute GoimportsExecutor fix', async () => {
      // GoimportsExecutor uses 'goimports' command which must be in PATH
      if (!isGoimportsInPath()) {
        console.warn('Skipping: goimports not in PATH (required for executor class)');
        console.warn('Add ~/go/bin to PATH or symlink goimports to /usr/local/bin');
        return;
      }

      const originalContent = readFileContent(testMainGo);
      const executor = new GoimportsExecutor();

      const result = await executor.executeFix({
        workingDir: tempGoDir,
        files: [testMainGo],
        timeout: TOOL_TIMEOUT,
        verbose: true,
      });

      console.log('\n=== GoimportsExecutor Result ===');
      console.log(`Success: ${result.success}`);
      console.log(`Tool: ${result.tool}`);
      console.log(`Duration: ${result.durationMs}ms`);
      console.log(`Command: ${result.command}`);
      console.log('================================\n');

      const modifiedContent = readFileContent(testMainGo);
      const wasModified = originalContent !== modifiedContent;

      expect(result.success).toBe(true);
      expect(result.tool).toBe('goimports');
      expect(wasModified).toBe(true);
    });
  });

  // ==========================================================================
  // Multi-Tool Sequence Test
  // ==========================================================================

  describe('Multi-Tool Fix Sequence', () => {
    it('should run goimports -> golangci-lint in sequence', async () => {
      // Skip if any tool not available
      const goimportsCmd = getGoimportsCommand();
      if (!goimportsCmd || !isGolangciLintAvailable()) {
        console.warn('Skipping: One or more tools not installed');
        return;
      }

      const originalContent = readFileContent(testMainGo);
      const toolResults: { tool: string; modified: boolean; durationMs: number }[] = [];

      // Step 1: Run goimports (includes gofmt formatting + unused import removal)
      const beforeGoimports = readFileContent(testMainGo);
      const goimportsStart = Date.now();
      spawnSync(goimportsCmd, ['-w', testMainGo], { encoding: 'utf8', timeout: TOOL_TIMEOUT });
      const afterGoimports = readFileContent(testMainGo);
      toolResults.push({
        tool: 'goimports',
        modified: beforeGoimports !== afterGoimports,
        durationMs: Date.now() - goimportsStart,
      });

      // Step 2: Run golangci-lint --fix (catches remaining fixable issues)
      const beforeGolangci = readFileContent(testMainGo);
      const golangciStart = Date.now();
      spawnSync(
        'golangci-lint',
        ['run', '--fix', '--enable', 'misspell', '.'],
        { cwd: tempGoDir, encoding: 'utf8', timeout: TOOL_TIMEOUT }
      );
      const afterGolangci = readFileContent(testMainGo);
      toolResults.push({
        tool: 'golangci-lint',
        modified: beforeGolangci !== afterGolangci,
        durationMs: Date.now() - golangciStart,
      });

      const finalContent = readFileContent(testMainGo);

      console.log('\n=== MULTI-TOOL SEQUENCE RESULTS ===');
      toolResults.forEach((r) => {
        console.log(`${r.tool}: modified=${r.modified}, duration=${r.durationMs}ms`);
      });
      console.log(`\nOriginal size: ${originalContent.length} bytes`);
      console.log(`Final size: ${finalContent.length} bytes`);
      console.log(`Total modification: ${originalContent !== finalContent}`);
      console.log('====================================\n');

      // At least goimports should have modified the file
      expect(toolResults[0].modified).toBe(true);

      // Final content should differ from original
      expect(finalContent).not.toBe(originalContent);
    });
  });

  // ==========================================================================
  // Integration Summary
  // ==========================================================================

  describe('Live Test Summary', () => {
    it('should provide summary of Go tool capabilities', () => {
      const summary = {
        gofmt: {
          available: isGofmtAvailable(),
          tier: 1,
          autoFixes: [
            'Indentation',
            'Spacing around operators',
            'Spacing after commas',
            'Brace positioning',
            'Struct formatting',
          ],
          needsAI: [],
        },
        goimports: {
          available: isGoimportsAvailable(),
          tier: 2,
          autoFixes: [
            'All gofmt fixes (superset)',
            'Unused import removal',
            'Import organization/grouping',
          ],
          needsAI: [],
        },
        golangciLint: {
          available: isGolangciLintAvailable(),
          tier: 2,
          autoFixes: [
            'misspell (typos in comments)',
            'whitespace (trailing whitespace)',
            'Embedded gofmt/goimports',
          ],
          needsAI: [
            'errcheck (unchecked errors)',
            'staticcheck (semantic issues)',
            'unused (unused code)',
            'ineffassign (ineffective assignment)',
            'gosec (security issues)',
            'govet (most rules)',
          ],
        },
      };

      console.log('\n=== GO TOOL SUMMARY ===');
      console.log(JSON.stringify(summary, null, 2));
      console.log('========================\n');

      // At least gofmt should be available (comes with Go)
      expect(summary.gofmt.available).toBe(true);
    });

    it('should document recommended fix order for Go', () => {
      // Recommended order for Go fixes:
      // 1. goimports (preferred over gofmt - it's a superset)
      // 2. golangci-lint --fix (limited additional fixes)
      // 3. AI (tier 3) for semantic issues

      const fixOrder = [
        { step: 1, tool: 'goimports', reason: 'Superset of gofmt + import management' },
        { step: 2, tool: 'golangci-lint --fix', reason: 'Additional auto-fixes (misspell, whitespace)' },
        { step: 3, tool: 'AI (tier 3)', reason: 'Semantic issues (errcheck, staticcheck, unused)' },
      ];

      console.log('\n=== RECOMMENDED FIX ORDER ===');
      fixOrder.forEach((item) => {
        console.log(`${item.step}. ${item.tool}: ${item.reason}`);
      });
      console.log('=============================\n');

      expect(fixOrder.length).toBe(3);
    });
  });
});
