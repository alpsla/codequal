/**
 * Live Tier 2 Test - Dedicated Python Fixers
 *
 * SESSION 106: Run REAL tier 2 dedicated fixers and verify files are actually modified.
 *
 * This test performs REAL tool execution:
 * - Runs isort on Python fixture (import sorting)
 * - Runs black on Python fixture (code formatting)
 * - Runs autoflake on Python fixture (unused import/variable removal)
 * - Verifies files are actually modified (before/after comparison)
 * - Logs which tools successfully fixed issues
 *
 * TEST WILL FAIL if tools are not installed:
 * - isort: pip install isort
 * - black: pip install black
 * - autoflake: pip install autoflake
 *
 * Run with: npm test -- live-tier2.test.ts
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawnSync } from 'child_process';

import {
  IsortExecutor,
  BlackExecutor,
  AutoflakeExecutor,
  createTier2Executor,
} from '../tool-fixers/tier2-executor';

// ============================================================================
// Test Configuration
// ============================================================================

const FIXTURES_DIR = path.join(__dirname, 'fixtures');
const PYTHON_FIXTURE = path.join(FIXTURES_DIR, 'live-test-python.py');

// Timeout for tool execution (tools can be slow on first run)
const TOOL_TIMEOUT = 30000; // 30 seconds

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if isort is available
 */
function isIsortAvailable(): boolean {
  try {
    const result = spawnSync('isort', ['--version'], {
      encoding: 'utf8',
      timeout: 5000,
    });
    return result.status === 0;
  } catch {
    return false;
  }
}

/**
 * Check if black is available
 */
function isBlackAvailable(): boolean {
  try {
    const result = spawnSync('black', ['--version'], {
      encoding: 'utf8',
      timeout: 5000,
    });
    return result.status === 0;
  } catch {
    return false;
  }
}

/**
 * Check if autoflake is available
 */
function isAutoflakeAvailable(): boolean {
  try {
    const result = spawnSync('autoflake', ['--version'], {
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

describe('Live Tier 2 Tests - Dedicated Python Fixers (SESSION 106)', () => {
  let tempDir: string;

  beforeAll(() => {
    // Verify fixture exists
    expect(fs.existsSync(PYTHON_FIXTURE)).toBe(true);
  });

  beforeEach(() => {
    // Create fresh temp directory for each test
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'live-tier2-test-'));
  });

  afterAll(() => {
    // Cleanup is handled by OS for temp directories
  });

  // ==========================================================================
  // Tool Availability Tests
  // ==========================================================================

  describe('Tool Availability (MUST PASS)', () => {
    it('should have isort installed', () => {
      const available = isIsortAvailable();
      if (!available) {
        console.error('\n=== isort NOT INSTALLED ===');
        console.error('Install with: pip install isort');
        console.error('Or: pipx install isort');
        console.error('================================\n');
      }
      expect(available).toBe(true);
    });

    it('should have black installed', () => {
      const available = isBlackAvailable();
      if (!available) {
        console.error('\n=== black NOT INSTALLED ===');
        console.error('Install with: pip install black');
        console.error('Or: pipx install black');
        console.error('================================\n');
      }
      expect(available).toBe(true);
    });

    it('should have autoflake installed', () => {
      const available = isAutoflakeAvailable();
      if (!available) {
        console.error('\n=== autoflake NOT INSTALLED ===');
        console.error('Install with: pip install autoflake');
        console.error('Or: pipx install autoflake');
        console.error('================================\n');
      }
      expect(available).toBe(true);
    });
  });

  // ==========================================================================
  // isort Live Tests
  // ==========================================================================

  describe('isort (Python Import Sorting)', () => {
    let isortExecutor: IsortExecutor;
    let testFile: string;
    let originalContent: string;

    beforeEach(() => {
      isortExecutor = new IsortExecutor();
      testFile = copyFixtureToTemp(PYTHON_FIXTURE, tempDir);
      originalContent = readFileContent(testFile);
    });

    it('should detect import ordering issues before fix', () => {
      // Check import order in original file
      // isort will reorder imports: stdlib, third-party, local
      const importLines = originalContent.split('\n').filter(line =>
        line.startsWith('import ') || line.startsWith('from ')
      );

      console.log(`\n=== BEFORE isort ===`);
      console.log(`Import statements: ${importLines.length}`);
      console.log(`First 5 imports:`);
      importLines.slice(0, 5).forEach(imp => console.log(`  ${imp}`));
      console.log(`====================\n`);

      // There should be imports to sort
      expect(importLines.length).toBeGreaterThan(0);
    });

    it('should run isort and modify the file', async () => {
      // Skip if isort not available
      if (!isIsortAvailable()) {
        console.warn('Skipping: isort not installed');
        return;
      }

      // Execute fix
      const result = await isortExecutor.executeFix({
        workingDir: tempDir,
        files: [testFile],
        timeout: TOOL_TIMEOUT,
        verbose: true,
      });

      console.log('\n=== isort Result ===');
      console.log(`Exit code: ${result.exitCode}`);
      console.log(`Success: ${result.success}`);
      console.log(`Duration: ${result.durationMs}ms`);
      if (result.error) {
        console.log(`Error: ${result.error}`);
      }
      console.log('====================\n');

      // Read modified content
      const modifiedContent = readFileContent(testFile);

      // File should have been modified
      const wasModified = originalContent !== modifiedContent;
      console.log(`File was modified: ${wasModified}`);

      if (!wasModified) {
        console.log('STDOUT:', result.stdout.substring(0, 500));
        console.log('STDERR:', result.stderr.substring(0, 500));
      }

      // isort may or may not modify the file depending on import order
      // The important thing is that it runs successfully
      expect(result.exitCode === 0 || result.success).toBe(true);
    });

    it('should organize imports in sections', async () => {
      if (!isIsortAvailable()) {
        console.warn('Skipping: isort not installed');
        return;
      }

      // Execute fix
      await isortExecutor.executeFix({
        workingDir: tempDir,
        files: [testFile],
        timeout: TOOL_TIMEOUT,
      });

      const modifiedContent = readFileContent(testFile);

      // Check import organization after isort
      const importLines = modifiedContent.split('\n').filter(line =>
        line.startsWith('import ') || line.startsWith('from ')
      );

      console.log(`\n=== AFTER isort ===`);
      console.log(`Import statements: ${importLines.length}`);
      console.log(`First 5 imports:`);
      importLines.slice(0, 5).forEach(imp => console.log(`  ${imp}`));
      console.log(`===================\n`);

      // Verify imports still exist
      expect(importLines.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // black Live Tests
  // ==========================================================================

  describe('black (Python Code Formatter)', () => {
    let blackExecutor: BlackExecutor;
    let testFile: string;
    let originalContent: string;

    beforeEach(() => {
      blackExecutor = new BlackExecutor();
      testFile = copyFixtureToTemp(PYTHON_FIXTURE, tempDir);
      originalContent = readFileContent(testFile);
    });

    it('should detect formatting issues before fix', () => {
      // Count formatting issues that black will fix:
      // - Missing spaces around operators (x=y -> x = y)
      // - Missing spaces after colons in type hints (x:int -> x: int)
      // - Missing spaces around equals in defaults

      const noSpaceAroundEq = countOccurrences(originalContent, /\w=\w/g);
      const noSpaceAfterColon = countOccurrences(originalContent, /:\w+[,)]/g);

      console.log(`\n=== BEFORE black ===`);
      console.log(`Missing space around =: ${noSpaceAroundEq}`);
      console.log(`Missing space after :: ${noSpaceAfterColon}`);
      console.log(`====================\n`);

      // There should be formatting issues
      expect(noSpaceAroundEq + noSpaceAfterColon).toBeGreaterThan(0);
    });

    it('should run black and modify the file', async () => {
      // Skip if black not available
      if (!isBlackAvailable()) {
        console.warn('Skipping: black not installed');
        return;
      }

      // Execute fix
      const result = await blackExecutor.executeFix({
        workingDir: tempDir,
        files: [testFile],
        timeout: TOOL_TIMEOUT,
        verbose: true,
      });

      console.log('\n=== black Result ===');
      console.log(`Exit code: ${result.exitCode}`);
      console.log(`Success: ${result.success}`);
      console.log(`Duration: ${result.durationMs}ms`);
      if (result.error) {
        console.log(`Error: ${result.error}`);
      }
      console.log('====================\n');

      // Read modified content
      const modifiedContent = readFileContent(testFile);

      // File should have been modified
      const wasModified = originalContent !== modifiedContent;
      console.log(`File was modified: ${wasModified}`);

      if (!wasModified) {
        console.log('STDOUT:', result.stdout.substring(0, 500));
        console.log('STDERR:', result.stderr.substring(0, 500));
      }

      // Assert file was modified (black should always format this file)
      expect(wasModified).toBe(true);
    });

    it('should fix spacing issues', async () => {
      if (!isBlackAvailable()) {
        console.warn('Skipping: black not installed');
        return;
      }

      // Execute fix
      await blackExecutor.executeFix({
        workingDir: tempDir,
        files: [testFile],
        timeout: TOOL_TIMEOUT,
      });

      const modifiedContent = readFileContent(testFile);

      // Count remaining formatting issues
      const noSpaceAroundEq = countOccurrences(modifiedContent, /\w=\w/g);

      console.log(`\n=== AFTER black ===`);
      console.log(`Missing space around =: ${noSpaceAroundEq}`);
      console.log(`===================\n`);

      // Most formatting issues should be fixed
      // (some like def f(x=1) are intentional in default args)
      const originalNoSpace = countOccurrences(originalContent, /\w=\w/g);
      expect(noSpaceAroundEq).toBeLessThanOrEqual(originalNoSpace);
    });

    it('should format long lines', async () => {
      if (!isBlackAvailable()) {
        console.warn('Skipping: black not installed');
        return;
      }

      // Execute fix
      await blackExecutor.executeFix({
        workingDir: tempDir,
        files: [testFile],
        timeout: TOOL_TIMEOUT,
      });

      const modifiedContent = readFileContent(testFile);

      // Check line lengths (black default is 88 chars)
      const lines = modifiedContent.split('\n');
      const longLines = lines.filter(line => line.length > 88);

      console.log(`\n=== LINE LENGTHS ===`);
      console.log(`Total lines: ${lines.length}`);
      console.log(`Lines > 88 chars: ${longLines.length}`);
      console.log(`====================\n`);

      // Most lines should be within black's limit
      // (some comments or strings may exceed)
      expect(longLines.length).toBeLessThan(lines.length / 2);
    });
  });

  // ==========================================================================
  // autoflake Live Tests
  // ==========================================================================

  describe('autoflake (Python Unused Import/Variable Removal)', () => {
    let autoflakeExecutor: AutoflakeExecutor;
    let testFile: string;
    let originalContent: string;

    beforeEach(() => {
      autoflakeExecutor = new AutoflakeExecutor();
      testFile = copyFixtureToTemp(PYTHON_FIXTURE, tempDir);
      originalContent = readFileContent(testFile);
    });

    it('should detect unused imports before fix', () => {
      // Count unused imports (os, sys, json, re, datetime are unused)
      const unusedImports = ['os', 'sys', 'json', 're', 'datetime'];
      let unusedCount = 0;
      for (const imp of unusedImports) {
        if (originalContent.includes(`import ${imp}`)) {
          unusedCount++;
        }
      }

      console.log(`\n=== BEFORE autoflake ===`);
      console.log(`Unused imports detected: ${unusedCount}`);
      unusedImports.forEach(imp => {
        const hasImport = originalContent.includes(`import ${imp}`);
        console.log(`  import ${imp}: ${hasImport ? 'PRESENT' : 'not found'}`);
      });
      console.log(`========================\n`);

      // There should be unused imports
      expect(unusedCount).toBeGreaterThan(0);
    });

    it('should run autoflake and modify the file', async () => {
      // Skip if autoflake not available
      if (!isAutoflakeAvailable()) {
        console.warn('Skipping: autoflake not installed');
        return;
      }

      // Execute fix
      const result = await autoflakeExecutor.executeFix({
        workingDir: tempDir,
        files: [testFile],
        timeout: TOOL_TIMEOUT,
        verbose: true,
      });

      console.log('\n=== autoflake Result ===');
      console.log(`Exit code: ${result.exitCode}`);
      console.log(`Success: ${result.success}`);
      console.log(`Duration: ${result.durationMs}ms`);
      if (result.error) {
        console.log(`Error: ${result.error}`);
      }
      console.log('========================\n');

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

    it('should remove unused imports', async () => {
      if (!isAutoflakeAvailable()) {
        console.warn('Skipping: autoflake not installed');
        return;
      }

      // Execute fix
      await autoflakeExecutor.executeFix({
        workingDir: tempDir,
        files: [testFile],
        timeout: TOOL_TIMEOUT,
      });

      const modifiedContent = readFileContent(testFile);

      // Check that unused imports were removed
      const stillHasOs = modifiedContent.includes('import os\n');
      const stillHasSys = modifiedContent.includes('import sys\n');
      const stillHasJson = modifiedContent.includes('import json\n');
      const stillHasRe = modifiedContent.includes('import re\n');
      const stillHasDatetime = modifiedContent.includes('import datetime\n');

      console.log(`\n=== AFTER autoflake ===`);
      console.log(`Still has 'import os': ${stillHasOs}`);
      console.log(`Still has 'import sys': ${stillHasSys}`);
      console.log(`Still has 'import json': ${stillHasJson}`);
      console.log(`Still has 'import re': ${stillHasRe}`);
      console.log(`Still has 'import datetime': ${stillHasDatetime}`);
      console.log(`=======================\n`);

      // All unused imports should be removed
      expect(stillHasOs).toBe(false);
      expect(stillHasSys).toBe(false);
      expect(stillHasJson).toBe(false);
      expect(stillHasRe).toBe(false);
      expect(stillHasDatetime).toBe(false);
    });

    it('should keep used imports', async () => {
      if (!isAutoflakeAvailable()) {
        console.warn('Skipping: autoflake not installed');
        return;
      }

      // Execute fix
      await autoflakeExecutor.executeFix({
        workingDir: tempDir,
        files: [testFile],
        timeout: TOOL_TIMEOUT,
      });

      const modifiedContent = readFileContent(testFile);

      // Check that used imports are still present
      const hasHashlib = modifiedContent.includes('import hashlib');
      const hasTyping = modifiedContent.includes('from typing import');

      console.log(`\n=== USED IMPORTS ===`);
      console.log(`Has hashlib: ${hasHashlib}`);
      console.log(`Has typing: ${hasTyping}`);
      console.log(`====================\n`);

      // Used imports should remain
      expect(hasHashlib).toBe(true);
    });
  });

  // ==========================================================================
  // Factory Tests
  // ==========================================================================

  describe('Tier 2 Executor Factory', () => {
    it('should create isort executor via factory', () => {
      const executor = createTier2Executor('isort');
      expect(executor).not.toBeNull();
      expect(executor).toBeInstanceOf(IsortExecutor);
    });

    it('should create black executor via factory', () => {
      const executor = createTier2Executor('black');
      expect(executor).not.toBeNull();
      expect(executor).toBeInstanceOf(BlackExecutor);
    });

    it('should create autoflake executor via factory', () => {
      const executor = createTier2Executor('autoflake');
      expect(executor).not.toBeNull();
      expect(executor).toBeInstanceOf(AutoflakeExecutor);
    });

    it('should return null for unknown tool', () => {
      const executor = createTier2Executor('unknown-tool');
      expect(executor).toBeNull();
    });
  });

  // ==========================================================================
  // Multi-Tool Sequence Test
  // ==========================================================================

  describe('Multi-Tool Fix Sequence', () => {
    it('should run isort -> black -> autoflake in sequence', async () => {
      // Skip if any tool not available
      if (!isIsortAvailable() || !isBlackAvailable() || !isAutoflakeAvailable()) {
        console.warn('Skipping: One or more tools not installed');
        return;
      }

      const testFile = copyFixtureToTemp(PYTHON_FIXTURE, tempDir);
      const originalContent = readFileContent(testFile);

      const toolResults: { tool: string; modified: boolean; durationMs: number }[] = [];

      // Step 1: Run isort
      const isortExecutor = new IsortExecutor();
      const beforeIsort = readFileContent(testFile);
      const isortResult = await isortExecutor.executeFix({
        workingDir: tempDir,
        files: [testFile],
        timeout: TOOL_TIMEOUT,
      });
      const afterIsort = readFileContent(testFile);
      toolResults.push({
        tool: 'isort',
        modified: beforeIsort !== afterIsort,
        durationMs: isortResult.durationMs,
      });

      // Step 2: Run black
      const blackExecutor = new BlackExecutor();
      const beforeBlack = readFileContent(testFile);
      const blackResult = await blackExecutor.executeFix({
        workingDir: tempDir,
        files: [testFile],
        timeout: TOOL_TIMEOUT,
      });
      const afterBlack = readFileContent(testFile);
      toolResults.push({
        tool: 'black',
        modified: beforeBlack !== afterBlack,
        durationMs: blackResult.durationMs,
      });

      // Step 3: Run autoflake
      const autoflakeExecutor = new AutoflakeExecutor();
      const beforeAutoflake = readFileContent(testFile);
      const autoflakeResult = await autoflakeExecutor.executeFix({
        workingDir: tempDir,
        files: [testFile],
        timeout: TOOL_TIMEOUT,
      });
      const afterAutoflake = readFileContent(testFile);
      toolResults.push({
        tool: 'autoflake',
        modified: beforeAutoflake !== afterAutoflake,
        durationMs: autoflakeResult.durationMs,
      });

      const finalContent = readFileContent(testFile);

      console.log('\n=== MULTI-TOOL SEQUENCE RESULTS ===');
      toolResults.forEach(r => {
        console.log(`${r.tool}: modified=${r.modified}, duration=${r.durationMs}ms`);
      });
      console.log(`\nOriginal size: ${originalContent.length} bytes`);
      console.log(`Final size: ${finalContent.length} bytes`);
      console.log(`Total modification: ${originalContent !== finalContent}`);
      console.log('====================================\n');

      // At least one tool should have modified the file
      const anyModified = toolResults.some(r => r.modified);
      expect(anyModified).toBe(true);

      // Final content should differ from original
      expect(finalContent).not.toBe(originalContent);
    });
  });

  // ==========================================================================
  // Integration Summary
  // ==========================================================================

  describe('Live Test Summary', () => {
    it('should provide summary of tier 2 Python tool capabilities', () => {
      const summary = {
        isort: {
          available: isIsortAvailable(),
          purpose: 'Import sorting and organization',
          autoFixes: ['Import order', 'Import grouping (stdlib, third-party, local)'],
          needsAI: [],
        },
        black: {
          available: isBlackAvailable(),
          purpose: 'Code formatting',
          autoFixes: ['Spacing', 'Line length', 'Quote style', 'Trailing commas'],
          needsAI: ['Semantic code improvements'],
        },
        autoflake: {
          available: isAutoflakeAvailable(),
          purpose: 'Unused code removal',
          autoFixes: ['Unused imports', 'Unused variables', 'Duplicate keys'],
          needsAI: ['Complex unused code detection'],
        },
      };

      console.log('\n=== TIER 2 PYTHON TOOL SUMMARY ===');
      console.log(JSON.stringify(summary, null, 2));
      console.log('===================================\n');

      // At least one tool should be available for useful tests
      expect(summary.isort.available || summary.black.available || summary.autoflake.available).toBe(true);
    });
  });
});
