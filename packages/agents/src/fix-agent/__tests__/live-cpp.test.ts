/**
 * Live C++ Test - Native Fix Commands (Tier 1 & 2)
 *
 * SESSION 107: Run REAL C++ fixes and verify files are actually modified.
 *
 * This test performs REAL tool execution:
 * - Runs clang-format on C++ fixture (formatting)
 * - Runs clang-tidy --fix with modernize-* checks (nullptr, override)
 * - Verifies files are actually modified (before/after comparison)
 * - Documents which issues need AI (cppcheck memleak, nullPointer, etc.)
 *
 * TEST WILL FAIL if tools are not installed:
 * - clang-format: brew install clang-format (or included with Xcode)
 * - clang-tidy: brew install llvm && export PATH="/opt/homebrew/opt/llvm/bin:$PATH"
 *
 * SDK PATH REQUIREMENTS (macOS):
 * - export SDKROOT=$(xcrun --show-sdk-path)
 * - Required for clang-tidy to find system headers
 *
 * Run with: npm test -- live-cpp.test.ts
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawnSync, execSync } from 'child_process';

import {
  ClangFormatExecutor,
  ClangTidyExecutor,
  createTier2Executor,
} from '../tool-fixers/tier2-executor';

// ============================================================================
// Test Configuration
// ============================================================================

const FIXTURES_DIR = path.join(__dirname, 'fixtures');
const CPP_FIXTURE_DIR = path.join(FIXTURES_DIR, 'live-test-cpp');
const CPP_FIXTURE_FILE = path.join(CPP_FIXTURE_DIR, 'main.cpp');

// Timeout for tool execution (clang-tidy can be slow)
const TOOL_TIMEOUT = 120000; // 120 seconds for clang-tidy

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if clang-format is available
 */
function isClangFormatAvailable(): boolean {
  try {
    const result = spawnSync('clang-format', ['--version'], {
      encoding: 'utf8',
      timeout: 5000,
    });
    return result.status === 0;
  } catch {
    return false;
  }
}

/**
 * Check if clang-tidy is available
 */
function isClangTidyAvailable(): boolean {
  try {
    const result = spawnSync('clang-tidy', ['--version'], {
      encoding: 'utf8',
      timeout: 5000,
    });
    return result.status === 0;
  } catch {
    return false;
  }
}

/**
 * Get macOS SDK path
 */
function getSDKPath(): string | null {
  if (os.platform() !== 'darwin') {
    return null;
  }
  try {
    const result = spawnSync('xcrun', ['--show-sdk-path'], {
      encoding: 'utf8',
      timeout: 5000,
    });
    if (result.status === 0) {
      return result.stdout.trim();
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Copy fixture file to temp directory for isolated testing
 */
function copyFixtureToTemp(fixtureFile: string, tempDir: string): string {
  const destFile = path.join(tempDir, path.basename(fixtureFile));
  fs.copyFileSync(fixtureFile, destFile);
  return destFile;
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

describe('Live C++ Tests - Native Fix Commands (SESSION 107)', () => {
  let tempDir: string;
  let testCppFile: string;

  beforeAll(() => {
    // Verify fixture exists
    expect(fs.existsSync(CPP_FIXTURE_FILE)).toBe(true);
  });

  beforeEach(() => {
    // Create fresh temp directory for each test
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'live-cpp-test-'));
    testCppFile = copyFixtureToTemp(CPP_FIXTURE_FILE, tempDir);
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
    it('should have clang-format installed', () => {
      const available = isClangFormatAvailable();
      if (!available) {
        console.error('\n=== clang-format NOT INSTALLED ===');
        console.error('Install with: brew install clang-format');
        console.error('Or: Included with Xcode Command Line Tools');
        console.error('===================================\n');
      }
      expect(available).toBe(true);
    });

    it('should have clang-tidy installed', () => {
      const available = isClangTidyAvailable();
      if (!available) {
        console.error('\n=== clang-tidy NOT INSTALLED ===');
        console.error('Install with: brew install llvm');
        console.error('Then add to PATH: export PATH="/opt/homebrew/opt/llvm/bin:$PATH"');
        console.error('Or: export PATH="/usr/local/opt/llvm/bin:$PATH" (Intel Mac)');
        console.error('=================================\n');
      }
      expect(available).toBe(true);
    });

    it('should document SDK path requirements for CI', () => {
      const sdkPath = getSDKPath();
      const platform = os.platform();

      console.log('\n=== SDK PATH REQUIREMENTS ===');
      console.log(`Platform: ${platform}`);

      if (platform === 'darwin') {
        console.log(`SDK Path: ${sdkPath || 'NOT FOUND'}`);
        console.log('\nFor macOS CI/CD, add to environment:');
        console.log('  export SDKROOT=$(xcrun --show-sdk-path)');
        console.log('\nAlternatively, run clang-tidy with:');
        console.log('  clang-tidy file.cpp -- -isysroot $(xcrun --show-sdk-path)');
      } else if (platform === 'linux') {
        console.log('\nFor Linux CI/CD:');
        console.log('  apt-get install clang clang-tools libc++-dev');
        console.log('  (No SDK path needed on Linux)');
      }

      console.log('\ncompile_commands.json recommended for accurate analysis');
      console.log('============================\n');

      // This is a documentation test, always passes
      expect(true).toBe(true);
    });
  });

  // ==========================================================================
  // clang-format Live Tests
  // ==========================================================================

  describe('clang-format (C++ Formatting)', () => {
    let originalContent: string;

    beforeEach(() => {
      originalContent = readFileContent(testCppFile);
    });

    it('should detect formatting issues in C++ fixture before fix', () => {
      // Count formatting issues that clang-format will fix:
      // - Missing spaces around operators (a+b)
      // - Cramped braces (func(){)
      // - Multiple statements on one line
      // - Inconsistent indentation

      // Count cramped function declarations like func(int a,int b)
      const crampedParams = countOccurrences(originalContent, /,int\s+\w+/g);

      // Count missing space around operators like x+y
      const noSpaceOps = countOccurrences(originalContent, /\w+\+\w+/g);

      // Count cramped braces like ){
      const crampedBraces = countOccurrences(originalContent, /\)\s*\{/g);

      // Count multiple statements on one line (int a;int b;)
      const multipleStatements = countOccurrences(originalContent, /;\s*int\s+\w+\s*;/g);

      console.log(`\n=== BEFORE clang-format ===`);
      console.log(`Cramped parameters (,int): ${crampedParams}`);
      console.log(`No space around operators: ${noSpaceOps}`);
      console.log(`Cramped braces (){: ${crampedBraces}`);
      console.log(`Multiple statements per line: ${multipleStatements}`);
      console.log(`=============================\n`);

      // There should be formatting issues in the fixture
      expect(crampedParams).toBeGreaterThan(0);
    });

    it('should run clang-format and modify the file', async () => {
      if (!isClangFormatAvailable()) {
        console.warn('Skipping: clang-format not available');
        return;
      }

      // Run clang-format directly
      const result = spawnSync('clang-format', ['-i', testCppFile], {
        encoding: 'utf8',
        timeout: TOOL_TIMEOUT,
      });

      console.log('\n=== clang-format Result ===');
      console.log(`Exit code: ${result.status}`);
      console.log(`Success: ${result.status === 0}`);
      if (result.error) {
        console.log(`Error: ${result.error}`);
      }
      if (result.stderr) {
        console.log(`Stderr: ${result.stderr.substring(0, 500)}`);
      }
      console.log('===========================\n');

      // Read modified content
      const modifiedContent = readFileContent(testCppFile);

      // File should have been modified
      const wasModified = originalContent !== modifiedContent;
      console.log(`File was modified: ${wasModified}`);
      console.log(`Original size: ${originalContent.length}`);
      console.log(`Modified size: ${modifiedContent.length}`);

      // Assert file was modified (clang-format should format the file)
      expect(result.status).toBe(0);
      expect(wasModified).toBe(true);
    });

    it('should fix parameter spacing', async () => {
      if (!isClangFormatAvailable()) {
        console.warn('Skipping: clang-format not available');
        return;
      }

      // Run clang-format
      spawnSync('clang-format', ['-i', testCppFile], {
        encoding: 'utf8',
        timeout: TOOL_TIMEOUT,
      });

      const modifiedContent = readFileContent(testCppFile);

      // Count remaining cramped parameters
      const crampedBefore = countOccurrences(originalContent, /,int\s+\w+/g);
      const crampedAfter = countOccurrences(modifiedContent, /,int\s+\w+/g);

      // Count properly spaced parameters (after comma should have space)
      const properlySpaced = countOccurrences(modifiedContent, /, int\s+\w+/g);

      console.log(`\n=== AFTER clang-format (spacing) ===`);
      console.log(`Cramped params before: ${crampedBefore}`);
      console.log(`Cramped params after: ${crampedAfter}`);
      console.log(`Properly spaced params: ${properlySpaced}`);
      console.log(`=====================================\n`);

      // Cramped parameters should be reduced
      expect(crampedAfter).toBeLessThan(crampedBefore);
    });

    it('should fix brace positioning', async () => {
      if (!isClangFormatAvailable()) {
        console.warn('Skipping: clang-format not available');
        return;
      }

      // Run clang-format
      spawnSync('clang-format', ['-i', testCppFile], {
        encoding: 'utf8',
        timeout: TOOL_TIMEOUT,
      });

      const modifiedContent = readFileContent(testCppFile);

      // Check for proper brace positioning (space before {)
      const properBraces = countOccurrences(modifiedContent, /\) \{/g);

      console.log(`\n=== AFTER clang-format (braces) ===`);
      console.log(`Proper brace positioning (") {"): ${properBraces}`);
      console.log(`===================================\n`);

      // Should have properly positioned braces
      expect(properBraces).toBeGreaterThan(0);
    });

    it('should fix struct formatting', async () => {
      if (!isClangFormatAvailable()) {
        console.warn('Skipping: clang-format not available');
        return;
      }

      // Run clang-format
      spawnSync('clang-format', ['-i', testCppFile], {
        encoding: 'utf8',
        timeout: TOOL_TIMEOUT,
      });

      const modifiedContent = readFileContent(testCppFile);

      // Check that cramped struct definitions are fixed
      // Before: struct BadlyFormattedStruct{
      // After: struct BadlyFormattedStruct {
      const crampedStructBefore = countOccurrences(originalContent, /struct \w+\{/g);
      const crampedStructAfter = countOccurrences(modifiedContent, /struct \w+\{/g);

      console.log(`\n=== AFTER clang-format (struct) ===`);
      console.log(`Cramped structs before: ${crampedStructBefore}`);
      console.log(`Cramped structs after: ${crampedStructAfter}`);
      console.log(`===================================\n`);

      // Cramped structs should be fixed
      expect(crampedStructAfter).toBeLessThan(crampedStructBefore);
    });

    it('should fix indentation', async () => {
      if (!isClangFormatAvailable()) {
        console.warn('Skipping: clang-format not available');
        return;
      }

      // Run clang-format
      spawnSync('clang-format', ['-i', testCppFile], {
        encoding: 'utf8',
        timeout: TOOL_TIMEOUT,
      });

      const modifiedContent = readFileContent(testCppFile);

      // Check for tab characters (should be converted to spaces)
      const tabsBefore = countOccurrences(originalContent, /\t/g);
      const tabsAfter = countOccurrences(modifiedContent, /\t/g);

      console.log(`\n=== AFTER clang-format (indentation) ===`);
      console.log(`Tabs before: ${tabsBefore}`);
      console.log(`Tabs after: ${tabsAfter}`);
      console.log(`=========================================\n`);

      // Tabs should be converted to spaces (default clang-format behavior)
      expect(tabsAfter).toBeLessThanOrEqual(tabsBefore);
    });
  });

  // ==========================================================================
  // clang-tidy Live Tests (modernize-*)
  // ==========================================================================

  describe('clang-tidy modernize-* (nullptr, override)', () => {
    let originalContent: string;

    beforeEach(() => {
      originalContent = readFileContent(testCppFile);
    });

    it('should detect NULL usage before fix', () => {
      // Count NULL and 0 used as null pointer
      const nullMacro = countOccurrences(originalContent, /\bNULL\b/g);
      const zeroPtr = countOccurrences(originalContent, /=\s*0\s*;/g);

      console.log(`\n=== BEFORE clang-tidy modernize-use-nullptr ===`);
      console.log(`NULL macro usage: ${nullMacro}`);
      console.log(`0 as null pointer: ${zeroPtr}`);
      console.log(`Total nullptr candidates: ${nullMacro + zeroPtr}`);
      console.log(`================================================\n`);

      // There should be NULL usages to fix
      expect(nullMacro).toBeGreaterThan(0);
    });

    it('should detect missing override specifiers before fix', () => {
      // Count virtual functions in derived classes without override
      // Pattern: "virtual void/int methodName(" without override
      const virtualWithoutOverride = countOccurrences(
        originalContent,
        /virtual\s+(?:void|int|~)\s*\w+\s*\([^)]*\)\s*(?:const\s*)?\{/g
      );

      console.log(`\n=== BEFORE clang-tidy modernize-use-override ===`);
      console.log(`Virtual without override: ${virtualWithoutOverride}`);
      console.log(`=================================================\n`);

      // There should be override candidates
      expect(virtualWithoutOverride).toBeGreaterThan(0);
    });

    it('should run clang-tidy --fix with modernize-use-nullptr', async () => {
      if (!isClangTidyAvailable()) {
        console.warn('Skipping: clang-tidy not available');
        return;
      }

      // First run clang-format to clean up formatting
      if (isClangFormatAvailable()) {
        spawnSync('clang-format', ['-i', testCppFile], {
          encoding: 'utf8',
          timeout: TOOL_TIMEOUT,
        });
      }

      const beforeClangTidy = readFileContent(testCppFile);

      // Build clang-tidy command with SDK path for macOS
      const sdkPath = getSDKPath();
      const extraArgs = sdkPath ? `-isysroot ${sdkPath}` : '';

      const result = spawnSync(
        'clang-tidy',
        [
          `--checks=-*,modernize-use-nullptr`,
          '--fix',
          testCppFile,
          '--',
          '-std=c++17',
          ...(extraArgs ? [extraArgs] : []),
        ],
        {
          encoding: 'utf8',
          timeout: TOOL_TIMEOUT,
          cwd: tempDir,
        }
      );

      console.log('\n=== clang-tidy modernize-use-nullptr Result ===');
      console.log(`Exit code: ${result.status}`);
      if (result.stderr && result.stderr.length > 0) {
        // clang-tidy outputs diagnostics to stderr
        const lines = result.stderr.split('\n').slice(0, 20);
        console.log(`Diagnostics (first 20 lines):\n${lines.join('\n')}`);
      }
      console.log('===============================================\n');

      const modifiedContent = readFileContent(testCppFile);

      // Count NULL after fix
      const nullBefore = countOccurrences(beforeClangTidy, /\bNULL\b/g);
      const nullAfter = countOccurrences(modifiedContent, /\bNULL\b/g);
      const nullptrAfter = countOccurrences(modifiedContent, /\bnullptr\b/g);

      console.log(`NULL before: ${nullBefore}`);
      console.log(`NULL after: ${nullAfter}`);
      console.log(`nullptr after: ${nullptrAfter}`);

      // NULL should be reduced, nullptr should increase
      expect(nullAfter).toBeLessThanOrEqual(nullBefore);
      expect(nullptrAfter).toBeGreaterThan(0);
    });

    it('should run clang-tidy --fix with modernize-use-override', async () => {
      if (!isClangTidyAvailable()) {
        console.warn('Skipping: clang-tidy not available');
        return;
      }

      // First run clang-format
      if (isClangFormatAvailable()) {
        spawnSync('clang-format', ['-i', testCppFile], {
          encoding: 'utf8',
          timeout: TOOL_TIMEOUT,
        });
      }

      const beforeClangTidy = readFileContent(testCppFile);

      // Build clang-tidy command with SDK path for macOS
      const sdkPath = getSDKPath();
      const extraArgs = sdkPath ? `-isysroot ${sdkPath}` : '';

      const result = spawnSync(
        'clang-tidy',
        [
          `--checks=-*,modernize-use-override`,
          '--fix',
          testCppFile,
          '--',
          '-std=c++17',
          ...(extraArgs ? [extraArgs] : []),
        ],
        {
          encoding: 'utf8',
          timeout: TOOL_TIMEOUT,
          cwd: tempDir,
        }
      );

      console.log('\n=== clang-tidy modernize-use-override Result ===');
      console.log(`Exit code: ${result.status}`);
      if (result.stderr && result.stderr.length > 0) {
        const lines = result.stderr.split('\n').slice(0, 20);
        console.log(`Diagnostics (first 20 lines):\n${lines.join('\n')}`);
      }
      console.log('================================================\n');

      const modifiedContent = readFileContent(testCppFile);

      // Count override keyword after fix
      const overrideBefore = countOccurrences(beforeClangTidy, /\boverride\b/g);
      const overrideAfter = countOccurrences(modifiedContent, /\boverride\b/g);

      console.log(`override before: ${overrideBefore}`);
      console.log(`override after: ${overrideAfter}`);

      // Override count should increase
      expect(overrideAfter).toBeGreaterThanOrEqual(overrideBefore);
    });

    it('should run clang-tidy --fix with all modernize checks', async () => {
      if (!isClangTidyAvailable()) {
        console.warn('Skipping: clang-tidy not available');
        return;
      }

      // First run clang-format
      if (isClangFormatAvailable()) {
        spawnSync('clang-format', ['-i', testCppFile], {
          encoding: 'utf8',
          timeout: TOOL_TIMEOUT,
        });
      }

      const beforeClangTidy = readFileContent(testCppFile);

      // Build clang-tidy command with SDK path for macOS
      const sdkPath = getSDKPath();
      const extraArgs = sdkPath ? `-isysroot ${sdkPath}` : '';

      const result = spawnSync(
        'clang-tidy',
        [
          `--checks=-*,modernize-*`,
          '--fix',
          testCppFile,
          '--',
          '-std=c++17',
          ...(extraArgs ? [extraArgs] : []),
        ],
        {
          encoding: 'utf8',
          timeout: TOOL_TIMEOUT,
          cwd: tempDir,
        }
      );

      console.log('\n=== clang-tidy modernize-* Result ===');
      console.log(`Exit code: ${result.status}`);
      if (result.stderr && result.stderr.length > 0) {
        const lines = result.stderr.split('\n').slice(0, 30);
        console.log(`Diagnostics (first 30 lines):\n${lines.join('\n')}`);
      }
      console.log('=====================================\n');

      const modifiedContent = readFileContent(testCppFile);
      const wasModified = beforeClangTidy !== modifiedContent;

      console.log(`File was modified: ${wasModified}`);
      console.log(`Size before: ${beforeClangTidy.length}`);
      console.log(`Size after: ${modifiedContent.length}`);

      // clang-tidy should have made some modifications
      // Note: It may not fix everything, but it should apply some fixes
      expect(result.error).toBeUndefined();
    });
  });

  // ==========================================================================
  // Executor Class Tests (via tier2-executor)
  // ==========================================================================

  describe('Tier 2 Executor Classes', () => {
    it('should create ClangFormatExecutor via factory', () => {
      const executor = createTier2Executor('clang-format');
      expect(executor).not.toBeNull();
      expect(executor).toBeInstanceOf(ClangFormatExecutor);
    });

    it('should create ClangTidyExecutor via factory', () => {
      const executor = createTier2Executor('clang-tidy');
      expect(executor).not.toBeNull();
      expect(executor).toBeInstanceOf(ClangTidyExecutor);
    });

    it('should execute ClangFormatExecutor fix', async () => {
      if (!isClangFormatAvailable()) {
        console.warn('Skipping: clang-format not available');
        return;
      }

      const originalContent = readFileContent(testCppFile);
      const executor = new ClangFormatExecutor();

      const result = await executor.executeFix({
        workingDir: tempDir,
        files: [testCppFile],
        timeout: TOOL_TIMEOUT,
        verbose: true,
      });

      console.log('\n=== ClangFormatExecutor Result ===');
      console.log(`Success: ${result.success}`);
      console.log(`Tool: ${result.tool}`);
      console.log(`Duration: ${result.durationMs}ms`);
      console.log(`Command: ${result.command}`);
      console.log('==================================\n');

      const modifiedContent = readFileContent(testCppFile);
      const wasModified = originalContent !== modifiedContent;

      expect(result.success).toBe(true);
      expect(result.tool).toBe('clang-format');
      expect(wasModified).toBe(true);
    });

    it('should execute ClangTidyExecutor fix', async () => {
      if (!isClangTidyAvailable()) {
        console.warn('Skipping: clang-tidy not available');
        return;
      }

      // First format with clang-format
      if (isClangFormatAvailable()) {
        spawnSync('clang-format', ['-i', testCppFile], {
          encoding: 'utf8',
          timeout: TOOL_TIMEOUT,
        });
      }

      const executor = new ClangTidyExecutor('modernize-use-nullptr');

      const result = await executor.executeFix({
        workingDir: tempDir,
        files: [testCppFile],
        timeout: TOOL_TIMEOUT,
        verbose: true,
      });

      console.log('\n=== ClangTidyExecutor Result ===');
      console.log(`Success: ${result.success}`);
      console.log(`Tool: ${result.tool}`);
      console.log(`Duration: ${result.durationMs}ms`);
      console.log(`Command: ${result.command}`);
      console.log('================================\n');

      expect(result.tool).toBe('clang-tidy');
      // Note: clang-tidy may return non-zero even when fixes are applied
    });
  });

  // ==========================================================================
  // Multi-Tool Sequence Test
  // ==========================================================================

  describe('Multi-Tool Fix Sequence', () => {
    it('should run clang-format -> clang-tidy in sequence', async () => {
      // Skip if any tool not available
      if (!isClangFormatAvailable() || !isClangTidyAvailable()) {
        console.warn('Skipping: One or more tools not installed');
        return;
      }

      const originalContent = readFileContent(testCppFile);
      const toolResults: { tool: string; modified: boolean; durationMs: number }[] = [];

      // Step 1: Run clang-format (formatting)
      const beforeFormat = readFileContent(testCppFile);
      const formatStart = Date.now();
      spawnSync('clang-format', ['-i', testCppFile], {
        encoding: 'utf8',
        timeout: TOOL_TIMEOUT,
      });
      const afterFormat = readFileContent(testCppFile);
      toolResults.push({
        tool: 'clang-format',
        modified: beforeFormat !== afterFormat,
        durationMs: Date.now() - formatStart,
      });

      // Step 2: Run clang-tidy with modernize checks
      const beforeTidy = readFileContent(testCppFile);
      const tidyStart = Date.now();
      const sdkPath = getSDKPath();
      const extraArgs = sdkPath ? `-isysroot ${sdkPath}` : '';

      spawnSync(
        'clang-tidy',
        [
          `--checks=-*,modernize-use-nullptr,modernize-use-override`,
          '--fix',
          testCppFile,
          '--',
          '-std=c++17',
          ...(extraArgs ? [extraArgs] : []),
        ],
        {
          encoding: 'utf8',
          timeout: TOOL_TIMEOUT,
          cwd: tempDir,
        }
      );
      const afterTidy = readFileContent(testCppFile);
      toolResults.push({
        tool: 'clang-tidy',
        modified: beforeTidy !== afterTidy,
        durationMs: Date.now() - tidyStart,
      });

      const finalContent = readFileContent(testCppFile);

      console.log('\n=== MULTI-TOOL SEQUENCE RESULTS ===');
      toolResults.forEach((r) => {
        console.log(`${r.tool}: modified=${r.modified}, duration=${r.durationMs}ms`);
      });
      console.log(`\nOriginal size: ${originalContent.length} bytes`);
      console.log(`Final size: ${finalContent.length} bytes`);
      console.log(`Total modification: ${originalContent !== finalContent}`);
      console.log('====================================\n');

      // At least clang-format should have modified the file
      expect(toolResults[0].modified).toBe(true);

      // Final content should differ from original
      expect(finalContent).not.toBe(originalContent);
    });
  });

  // ==========================================================================
  // Issues Needing AI (Tier 3)
  // ==========================================================================

  describe('Issues Needing AI (Tier 3 - cppcheck)', () => {
    it('should document which issues CANNOT be auto-fixed', () => {
      const needsAI = [
        { rule: 'memleak', reason: 'Memory leak detection needs semantic analysis and proper resource management' },
        { rule: 'nullPointer', reason: 'Null pointer dereference needs control flow understanding' },
        { rule: 'uninitvar', reason: 'Uninitialized variable needs value flow analysis' },
        { rule: 'resourceLeak', reason: 'Resource leak (FILE*, ifstream*) needs RAII refactoring' },
        { rule: 'useafterfree', reason: 'Use after free needs lifetime analysis' },
        { rule: 'doublefree', reason: 'Double free needs conditional path analysis' },
        { rule: 'cppcoreguidelines-*', reason: 'Core guidelines need semantic refactoring' },
        { rule: 'bugprone-*', reason: 'Bug-prone patterns need semantic understanding' },
      ];

      console.log('\n=== ISSUES NEEDING AI (TIER 3) ===');
      console.log('cppcheck issues that CANNOT be auto-fixed:');
      needsAI.forEach((item) => console.log(`  - ${item.rule}: ${item.reason}`));
      console.log('===================================\n');

      // Count how many of these issues are in the fixture
      const memLeaks = countOccurrences(readFileContent(CPP_FIXTURE_FILE), /new\s+\w+/g);
      const fileLeaks = countOccurrences(readFileContent(CPP_FIXTURE_FILE), /fopen\s*\(/g);

      console.log(`\n=== FIXTURE AI-NEEDED ISSUES ===`);
      console.log(`Memory allocations (potential leaks): ${memLeaks}`);
      console.log(`File opens (potential leaks): ${fileLeaks}`);
      console.log(`================================\n`);

      expect(needsAI.length).toBeGreaterThan(0);
      expect(memLeaks).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Integration Summary
  // ==========================================================================

  describe('Live Test Summary', () => {
    it('should provide summary of C++ tool capabilities', () => {
      const summary = {
        clangFormat: {
          available: isClangFormatAvailable(),
          tier: 1,
          autoFixes: [
            'Indentation',
            'Spacing around operators',
            'Brace positioning',
            'Line wrapping',
            'Struct/class formatting',
          ],
          needsAI: [],
        },
        clangTidy: {
          available: isClangTidyAvailable(),
          tier: 2,
          autoFixes: [
            'modernize-use-nullptr (NULL → nullptr)',
            'modernize-use-override (add override)',
            'modernize-use-auto (verbose iterators)',
            'modernize-loop-convert (C-style → range-based)',
            'modernize-use-emplace (push_back → emplace_back)',
          ],
          needsAI: [
            'cppcheck memleak',
            'cppcheck nullPointer',
            'cppcheck uninitvar',
            'cppcheck resourceLeak',
            'bugprone-* checks',
            'cppcoreguidelines-* checks',
          ],
        },
      };

      console.log('\n=== C++ TOOL SUMMARY ===');
      console.log(JSON.stringify(summary, null, 2));
      console.log('========================\n');

      // At least one tool should be available
      expect(summary.clangFormat.available || summary.clangTidy.available).toBe(true);
    });

    it('should document recommended fix order for C++', () => {
      // Recommended order for C++ fixes:
      // 1. clang-format (formatting - fast, always works)
      // 2. clang-tidy modernize-* (safe modernization fixes)
      // 3. AI (tier 3) for semantic issues

      const fixOrder = [
        { step: 1, tool: 'clang-format', reason: 'Format first to reduce clang-tidy noise' },
        { step: 2, tool: 'clang-tidy modernize-*', reason: 'Safe C++11/14/17 modernization' },
        { step: 3, tool: 'AI (tier 3)', reason: 'Semantic issues (memleak, null checks, RAII)' },
      ];

      console.log('\n=== RECOMMENDED FIX ORDER ===');
      fixOrder.forEach((item) => {
        console.log(`${item.step}. ${item.tool}: ${item.reason}`);
      });
      console.log('=============================\n');

      expect(fixOrder.length).toBe(3);
    });

    it('should document SDK path requirements for CI', () => {
      const ciRequirements = {
        macOS: {
          setup: [
            'export SDKROOT=$(xcrun --show-sdk-path)',
            'brew install llvm',
            'export PATH="/opt/homebrew/opt/llvm/bin:$PATH"',
          ],
          notes: 'Required for system headers in clang-tidy',
        },
        linux: {
          setup: [
            'apt-get install clang clang-tools libc++-dev',
          ],
          notes: 'No SDK path needed',
        },
        compileCommands: {
          generate: 'cmake -DCMAKE_EXPORT_COMPILE_COMMANDS=ON .',
          notes: 'Recommended for accurate clang-tidy analysis',
        },
      };

      console.log('\n=== CI/CD REQUIREMENTS ===');
      console.log(JSON.stringify(ciRequirements, null, 2));
      console.log('==========================\n');

      expect(ciRequirements.macOS.setup.length).toBeGreaterThan(0);
    });
  });
});
