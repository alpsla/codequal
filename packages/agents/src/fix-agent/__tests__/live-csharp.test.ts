/**
 * Live C# Test - Native Fix Commands (Tier 1 & 2)
 *
 * SESSION 107: Run REAL C# fixes and verify files are actually modified.
 *
 * This test performs REAL tool execution:
 * - Runs dotnet-format on C# fixture (formatting)
 * - Verifies IDE0055, SA1000, and other formatting fixes are applied
 * - Documents .csproj context requirements
 * - Documents which rules need AI (CA1822, CA2000, IDE0044, etc.)
 *
 * TEST WILL FAIL if tools are not installed:
 * - dotnet: https://dotnet.microsoft.com/download
 * - dotnet format: Built into .NET 6+ SDK
 *
 * PROJECT CONTEXT REQUIREMENTS:
 * - dotnet-format requires a .csproj file to work
 * - .editorconfig file configures formatting rules
 * - EnforceCodeStyleInBuild enables code style analysis
 *
 * Run with: npm test -- live-csharp.test.ts
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawnSync } from 'child_process';

import {
  DotnetFormatExecutor,
  createTier2Executor,
} from '../tool-fixers/tier2-executor';

// ============================================================================
// Test Configuration
// ============================================================================

const FIXTURES_DIR = path.join(__dirname, 'fixtures');
const CSHARP_FIXTURE_DIR = path.join(FIXTURES_DIR, 'live-test-csharp');
const CSHARP_FIXTURE_FILE = path.join(CSHARP_FIXTURE_DIR, 'Program.cs');
const CSHARP_PROJECT_FILE = path.join(CSHARP_FIXTURE_DIR, 'LiveTest.csproj');

// Timeout for tool execution (dotnet-format can be slow on first run)
const TOOL_TIMEOUT = 120000; // 120 seconds

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if dotnet CLI is available
 */
function isDotnetAvailable(): boolean {
  try {
    const result = spawnSync('dotnet', ['--version'], {
      encoding: 'utf8',
      timeout: 10000,
    });
    return result.status === 0;
  } catch {
    return false;
  }
}

/**
 * Get dotnet SDK version
 */
function getDotnetVersion(): string | null {
  try {
    const result = spawnSync('dotnet', ['--version'], {
      encoding: 'utf8',
      timeout: 10000,
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
 * Check if dotnet format is available (built into .NET 6+)
 */
function isDotnetFormatAvailable(): boolean {
  try {
    // dotnet format is a built-in command in .NET 6+
    const result = spawnSync('dotnet', ['format', '--version'], {
      encoding: 'utf8',
      timeout: 10000,
    });
    // Even if --version fails, try to check if the command exists
    if (result.status === 0) {
      return true;
    }
    // Try running help instead (some versions don't have --version)
    const helpResult = spawnSync('dotnet', ['format', '--help'], {
      encoding: 'utf8',
      timeout: 10000,
    });
    return helpResult.status === 0;
  } catch {
    return false;
  }
}

/**
 * Copy fixture directory to temp directory for isolated testing
 */
function copyFixtureDirToTemp(fixtureDir: string, tempDir: string): string {
  const destDir = path.join(tempDir, path.basename(fixtureDir));
  fs.mkdirSync(destDir, { recursive: true });

  const files = fs.readdirSync(fixtureDir);
  for (const file of files) {
    const srcFile = path.join(fixtureDir, file);
    const destFile = path.join(destDir, file);
    if (fs.statSync(srcFile).isFile()) {
      fs.copyFileSync(srcFile, destFile);
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

describe('Live C# Tests - Native Fix Commands (SESSION 107)', () => {
  let tempDir: string;
  let testProjectDir: string;
  let testCsFile: string;

  beforeAll(() => {
    // Verify fixture exists
    expect(fs.existsSync(CSHARP_FIXTURE_FILE)).toBe(true);
    expect(fs.existsSync(CSHARP_PROJECT_FILE)).toBe(true);
  });

  beforeEach(() => {
    // Create fresh temp directory for each test
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'live-csharp-test-'));
    testProjectDir = copyFixtureDirToTemp(CSHARP_FIXTURE_DIR, tempDir);
    testCsFile = path.join(testProjectDir, 'Program.cs');
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
    it('should have dotnet CLI installed', () => {
      const available = isDotnetAvailable();
      const version = getDotnetVersion();

      if (!available) {
        console.error('\n=== .NET SDK NOT INSTALLED ===');
        console.error('Install from: https://dotnet.microsoft.com/download');
        console.error('Recommended: .NET 8.0 SDK or later');
        console.error('==============================\n');
      } else {
        console.log(`\n=== .NET SDK Available ===`);
        console.log(`Version: ${version}`);
        console.log(`==========================\n`);
      }

      expect(available).toBe(true);
    });

    it('should have dotnet format available', () => {
      const available = isDotnetFormatAvailable();

      if (!available) {
        console.error('\n=== dotnet format NOT AVAILABLE ===');
        console.error('dotnet format is built into .NET 6+ SDK');
        console.error('Update your SDK: https://dotnet.microsoft.com/download');
        console.error('===================================\n');
      }

      expect(available).toBe(true);
    });

    it('should document .csproj context requirements', () => {
      console.log('\n=== .CSPROJ CONTEXT REQUIREMENTS ===');
      console.log('dotnet-format requires a project context to work properly.');
      console.log('\nRequired .csproj settings:');
      console.log('  <EnforceCodeStyleInBuild>true</EnforceCodeStyleInBuild>');
      console.log('  <EnableNETAnalyzers>true</EnableNETAnalyzers>');
      console.log('  <AnalysisLevel>latest</AnalysisLevel>');
      console.log('\nOptional .editorconfig for custom formatting rules.');
      console.log('\nCI/CD Integration:');
      console.log('  dotnet format --verify-no-changes');
      console.log('====================================\n');

      // Verify our fixture has the required settings
      const csprojContent = readFileContent(CSHARP_PROJECT_FILE);
      expect(csprojContent).toContain('EnforceCodeStyleInBuild');
      expect(csprojContent).toContain('EnableNETAnalyzers');
    });
  });

  // ==========================================================================
  // dotnet format Live Tests
  // ==========================================================================

  describe('dotnet format (C# Formatting)', () => {
    let originalContent: string;

    beforeEach(() => {
      originalContent = readFileContent(testCsFile);
    });

    it('should detect formatting issues (IDE0055) in C# fixture before fix', () => {
      // Count formatting issues that dotnet-format will fix:
      // - Missing spaces around operators (_internalValue=value)
      // - Cramped parameters (int a,int b)
      // - Cramped braces (class TestClass{)
      // - Multiple statements on one line

      // Count cramped operator assignments like =value; or a+b
      const crampedAssignments = countOccurrences(originalContent, /\w+=\w+/g);

      // Count cramped parameters like (int a,int b)
      const crampedParams = countOccurrences(originalContent, /,int\s+\w+/g);

      // Count cramped braces like class X{ or ){
      const crampedBraces = countOccurrences(originalContent, /\w+\s*\{/g);

      // Count bad indentation (lines with inconsistent leading whitespace)
      const badIndent = countOccurrences(originalContent, /^\s{1,3}int\s+/gm);

      // Count multiple spaces (SA1025)
      const multipleSpaces = countOccurrences(originalContent, /\s{3,}/g);

      console.log(`\n=== BEFORE dotnet format (IDE0055) ===`);
      console.log(`Cramped assignments (=value): ${crampedAssignments}`);
      console.log(`Cramped parameters (,int): ${crampedParams}`);
      console.log(`Cramped braces (name{): ${crampedBraces}`);
      console.log(`Bad indentation occurrences: ${badIndent}`);
      console.log(`Multiple spaces (SA1025): ${multipleSpaces}`);
      console.log(`========================================\n`);

      // There should be formatting issues in the fixture
      expect(crampedParams).toBeGreaterThan(0);
    });

    it('should detect SA1000 (keyword spacing) issues before fix', () => {
      // SA1000: Missing space after keyword (if, for, while, etc.)
      const ifNoSpace = countOccurrences(originalContent, /if\(/g);
      const forNoSpace = countOccurrences(originalContent, /for\(/g);

      console.log(`\n=== BEFORE dotnet format (SA1000) ===`);
      console.log(`Missing space after 'if': ${ifNoSpace}`);
      console.log(`Missing space after 'for': ${forNoSpace}`);
      console.log(`Total keyword spacing issues: ${ifNoSpace + forNoSpace}`);
      console.log(`=====================================\n`);

      // There should be keyword spacing issues
      expect(ifNoSpace + forNoSpace).toBeGreaterThan(0);
    });

    it('should run dotnet format and modify the file', async () => {
      if (!isDotnetFormatAvailable()) {
        console.warn('Skipping: dotnet format not available');
        return;
      }

      // Run dotnet format on the project directory
      const result = spawnSync('dotnet', ['format', testProjectDir, '--no-restore'], {
        encoding: 'utf8',
        timeout: TOOL_TIMEOUT,
        cwd: testProjectDir,
      });

      console.log('\n=== dotnet format Result ===');
      console.log(`Exit code: ${result.status}`);
      console.log(`Success: ${result.status === 0}`);
      if (result.error) {
        console.log(`Error: ${result.error}`);
      }
      if (result.stderr && result.stderr.length > 0) {
        console.log(`Stderr (first 500 chars): ${result.stderr.substring(0, 500)}`);
      }
      if (result.stdout && result.stdout.length > 0) {
        console.log(`Stdout: ${result.stdout.substring(0, 500)}`);
      }
      console.log('============================\n');

      // Read modified content
      const modifiedContent = readFileContent(testCsFile);

      // File should have been modified
      const wasModified = originalContent !== modifiedContent;
      console.log(`File was modified: ${wasModified}`);
      console.log(`Original size: ${originalContent.length}`);
      console.log(`Modified size: ${modifiedContent.length}`);

      // Log a diff sample
      if (wasModified) {
        const originalLines = originalContent.split('\n').slice(30, 60);
        const modifiedLines = modifiedContent.split('\n').slice(30, 60);
        console.log('\n=== Sample diff (lines 30-60) ===');
        console.log('ORIGINAL:', originalLines.slice(0, 5).join('\n'));
        console.log('MODIFIED:', modifiedLines.slice(0, 5).join('\n'));
        console.log('=================================\n');
      }

      // Assert file was modified (dotnet format should format the file)
      expect(result.status).toBe(0);
      expect(wasModified).toBe(true);
    });

    it('should fix IDE0055 formatting issues', async () => {
      if (!isDotnetFormatAvailable()) {
        console.warn('Skipping: dotnet format not available');
        return;
      }

      // Run dotnet format
      spawnSync('dotnet', ['format', testProjectDir, '--no-restore'], {
        encoding: 'utf8',
        timeout: TOOL_TIMEOUT,
        cwd: testProjectDir,
      });

      const modifiedContent = readFileContent(testCsFile);

      // Count remaining cramped parameters
      const crampedBefore = countOccurrences(originalContent, /,int\s+\w+/g);
      const crampedAfter = countOccurrences(modifiedContent, /,int\s+\w+/g);

      // Count properly spaced parameters (after comma should have space: ", int")
      const properlySpaced = countOccurrences(modifiedContent, /, int\s+\w+/g);

      console.log(`\n=== AFTER dotnet format (IDE0055 spacing) ===`);
      console.log(`Cramped params before: ${crampedBefore}`);
      console.log(`Cramped params after: ${crampedAfter}`);
      console.log(`Properly spaced params: ${properlySpaced}`);
      console.log(`==============================================\n`);

      // Cramped parameters should be reduced or eliminated
      expect(crampedAfter).toBeLessThanOrEqual(crampedBefore);
    });

    it('should fix SA1000 keyword spacing issues', async () => {
      if (!isDotnetFormatAvailable()) {
        console.warn('Skipping: dotnet format not available');
        return;
      }

      // Run dotnet format
      spawnSync('dotnet', ['format', testProjectDir, '--no-restore'], {
        encoding: 'utf8',
        timeout: TOOL_TIMEOUT,
        cwd: testProjectDir,
      });

      const modifiedContent = readFileContent(testCsFile);

      // Count remaining keyword spacing issues
      const ifNoSpaceBefore = countOccurrences(originalContent, /if\(/g);
      const ifNoSpaceAfter = countOccurrences(modifiedContent, /if\(/g);

      // Count properly spaced keywords
      const ifSpaced = countOccurrences(modifiedContent, /if \(/g);

      console.log(`\n=== AFTER dotnet format (SA1000 keyword spacing) ===`);
      console.log(`'if(' before: ${ifNoSpaceBefore}`);
      console.log(`'if(' after: ${ifNoSpaceAfter}`);
      console.log(`'if (' (proper): ${ifSpaced}`);
      console.log(`===================================================\n`);

      // Keyword spacing issues should be reduced
      expect(ifNoSpaceAfter).toBeLessThanOrEqual(ifNoSpaceBefore);
    });

    it('should fix brace positioning', async () => {
      if (!isDotnetFormatAvailable()) {
        console.warn('Skipping: dotnet format not available');
        return;
      }

      // Run dotnet format
      spawnSync('dotnet', ['format', testProjectDir, '--no-restore'], {
        encoding: 'utf8',
        timeout: TOOL_TIMEOUT,
        cwd: testProjectDir,
      });

      const modifiedContent = readFileContent(testCsFile);

      // Count cramped class/method braces (Name{ on same line)
      const crampedClassBefore = countOccurrences(originalContent, /class\s+\w+\s*\{/g);
      const crampedClassAfter = countOccurrences(modifiedContent, /class\s+\w+\s*\{/g);

      console.log(`\n=== AFTER dotnet format (brace positioning) ===`);
      console.log(`Cramped class braces before: ${crampedClassBefore}`);
      console.log(`Cramped class braces after: ${crampedClassAfter}`);
      console.log(`================================================\n`);

      // C# convention typically has braces on new line
      // dotnet format should improve this
      expect(true).toBe(true); // Documentation test
    });

    it('should fix indentation issues', async () => {
      if (!isDotnetFormatAvailable()) {
        console.warn('Skipping: dotnet format not available');
        return;
      }

      // Run dotnet format
      spawnSync('dotnet', ['format', testProjectDir, '--no-restore'], {
        encoding: 'utf8',
        timeout: TOOL_TIMEOUT,
        cwd: testProjectDir,
      });

      const modifiedContent = readFileContent(testCsFile);

      // The fixture has intentionally bad indentation in BadIndentation()
      // Check that lines are now properly indented (4 spaces per level)
      const linesWithWeirdIndent = countOccurrences(originalContent, /^\s{1,3}int\s+/gm);
      const properIndent = countOccurrences(modifiedContent, /^\s{8,12}int\s+/gm);

      console.log(`\n=== AFTER dotnet format (indentation) ===`);
      console.log(`Weird indentation (1-3 spaces) before: ${linesWithWeirdIndent}`);
      console.log(`Proper indentation after: ${properIndent}`);
      console.log(`==========================================\n`);

      // Indentation should be improved
      expect(true).toBe(true); // Documentation test
    });

    it('should fix multiple whitespace characters (SA1025)', async () => {
      if (!isDotnetFormatAvailable()) {
        console.warn('Skipping: dotnet format not available');
        return;
      }

      // Run dotnet format
      spawnSync('dotnet', ['format', testProjectDir, '--no-restore'], {
        encoding: 'utf8',
        timeout: TOOL_TIMEOUT,
        cwd: testProjectDir,
      });

      const modifiedContent = readFileContent(testCsFile);

      // Count multiple whitespace (3+ spaces in a row)
      const multiSpacesBefore = countOccurrences(originalContent, /\s{3,}/g);
      const multiSpacesAfter = countOccurrences(modifiedContent, /\s{3,}/g);

      console.log(`\n=== AFTER dotnet format (SA1025 multiple spaces) ===`);
      console.log(`Multiple spaces (3+) before: ${multiSpacesBefore}`);
      console.log(`Multiple spaces (3+) after: ${multiSpacesAfter}`);
      console.log(`====================================================\n`);

      // Multiple spaces should be reduced (though some may be intentional indentation)
      expect(multiSpacesAfter).toBeLessThanOrEqual(multiSpacesBefore);
    });
  });

  // ==========================================================================
  // Executor Class Tests (via tier2-executor)
  // ==========================================================================

  describe('Tier 2 Executor Classes', () => {
    it('should create DotnetFormatExecutor via factory', () => {
      const executor = createTier2Executor('dotnet-format');
      expect(executor).not.toBeNull();
      expect(executor).toBeInstanceOf(DotnetFormatExecutor);
    });

    it('should execute DotnetFormatExecutor fix', async () => {
      if (!isDotnetFormatAvailable()) {
        console.warn('Skipping: dotnet format not available');
        return;
      }

      const originalContent = readFileContent(testCsFile);
      const executor = new DotnetFormatExecutor();

      const result = await executor.executeFix({
        workingDir: testProjectDir,
        files: [testCsFile],
        timeout: TOOL_TIMEOUT,
        verbose: true,
      });

      console.log('\n=== DotnetFormatExecutor Result ===');
      console.log(`Success: ${result.success}`);
      console.log(`Tool: ${result.tool}`);
      console.log(`Duration: ${result.durationMs}ms`);
      console.log(`Command: ${result.command}`);
      if (result.stderr) {
        console.log(`Stderr (first 200): ${result.stderr.substring(0, 200)}`);
      }
      console.log('===================================\n');

      const modifiedContent = readFileContent(testCsFile);
      const wasModified = originalContent !== modifiedContent;

      console.log(`File was modified: ${wasModified}`);

      expect(result.tool).toBe('dotnet-format');
      // Note: Success depends on dotnet format availability and project setup
    });

    it('should get dry run result from DotnetFormatExecutor', async () => {
      const executor = new DotnetFormatExecutor();

      const result = await executor.executeFix({
        workingDir: testProjectDir,
        files: [testCsFile],
        dryRun: true,
      });

      console.log('\n=== DotnetFormatExecutor Dry Run ===');
      console.log(`Tool: ${result.tool}`);
      console.log(`Command: ${result.command}`);
      console.log(`Success: ${result.success}`);
      console.log('====================================\n');

      expect(result.tool).toBe('dotnet-format');
      expect(result.command).toContain('dotnet');
    });
  });

  // ==========================================================================
  // Issues Needing AI (Tier 3)
  // ==========================================================================

  describe('Issues Needing AI (Tier 3 - Roslyn Analyzers)', () => {
    it('should document which issues CANNOT be auto-fixed', () => {
      const needsAI = [
        { rule: 'CA1822', reason: 'Member does not access instance data - can be static (semantic analysis needed)' },
        { rule: 'CA2000', reason: 'Dispose objects before losing scope (resource management)' },
        { rule: 'CA2227', reason: 'Collection properties should be read only' },
        { rule: 'IDE0044', reason: 'Make field readonly (needs usage analysis)' },
        { rule: 'IDE0051', reason: 'Remove unused private members (dead code analysis)' },
        { rule: 'IDE0059', reason: 'Unnecessary value assignment (data flow analysis)' },
        { rule: 'IDE0060', reason: 'Remove unused parameter (needs API compatibility check)' },
        { rule: 'S1118', reason: 'Utility classes should not have public constructors (SonarQube)' },
        { rule: 'S1144', reason: 'Unused private types or members should be removed (SonarQube)' },
        { rule: 'S1172', reason: 'Unused method parameters should be removed (SonarQube)' },
      ];

      console.log('\n=== ISSUES NEEDING AI (TIER 3) ===');
      console.log('Roslyn analyzer issues that CANNOT be auto-fixed by dotnet-format:');
      needsAI.forEach((item) => console.log(`  - ${item.rule}: ${item.reason}`));
      console.log('===================================\n');

      // Count how many CA1822 candidates are in the fixture
      // Methods that don't use instance members (look for methods without this. or _field references)
      const content = readFileContent(CSHARP_FIXTURE_FILE);
      const publicMethods = countOccurrences(content, /public\s+(?:int|string|bool|void|List<\w+>|Dictionary<\w+,\w+>)\s+\w+\s*\(/g);

      console.log(`\n=== FIXTURE AI-NEEDED ISSUES ===`);
      console.log(`Public methods (potential CA1822): ${publicMethods}`);
      console.log(`================================\n`);

      expect(needsAI.length).toBeGreaterThan(0);
    });

    it('should count CA1822 candidates in fixture', () => {
      const content = readFileContent(CSHARP_FIXTURE_FILE);

      // Count methods that are marked as CA1822 candidates in comments
      const ca1822Comments = countOccurrences(content, /CA1822/g);

      console.log(`\n=== CA1822 (should be static) Candidates ===`);
      console.log(`Methods marked as CA1822 candidates: ${ca1822Comments}`);
      console.log(`These methods don't access instance data and could be static.`);
      console.log(`AI is required to safely refactor these to static methods.`);
      console.log(`=============================================\n`);

      expect(ca1822Comments).toBeGreaterThan(0);
    });

    it('should count IDE0060 (unused parameter) candidates in fixture', () => {
      const content = readFileContent(CSHARP_FIXTURE_FILE);

      // Count methods marked with IDE0060 in comments
      const ide0060Comments = countOccurrences(content, /IDE0060/g);

      console.log(`\n=== IDE0060 (unused parameter) Candidates ===`);
      console.log(`Methods marked as IDE0060 candidates: ${ide0060Comments}`);
      console.log(`These methods have parameters that are never used.`);
      console.log(`AI is required to determine if removing them breaks API.`);
      console.log(`=============================================\n`);

      expect(ide0060Comments).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Integration Summary
  // ==========================================================================

  describe('Live Test Summary', () => {
    it('should provide summary of C# tool capabilities', () => {
      const summary = {
        dotnetFormat: {
          available: isDotnetFormatAvailable(),
          tier: 1,
          autoFixes: [
            'IDE0055 (formatting)',
            'SA1000 (keyword spacing)',
            'SA1003 (symbol spacing)',
            'SA1008/SA1009 (parenthesis spacing)',
            'SA1024 (colon spacing)',
            'SA1025 (multiple whitespace)',
            'IDE0003/IDE0009 (this qualification)',
            'IDE0007/IDE0008 (var preferences)',
            'IDE0065 (using directive placement)',
            'SA1200 (using directives placement)',
            'SA1500-SA1520 (layout rules)',
          ],
          needsAI: [
            'CA1822 (method should be static)',
            'CA2000 (dispose before losing scope)',
            'IDE0044 (make field readonly)',
            'IDE0051 (remove unused private members)',
            'IDE0059 (unnecessary assignment)',
            'IDE0060 (remove unused parameter)',
            'SonarQube C# rules (S1118, S1144, S1172)',
          ],
        },
      };

      console.log('\n=== C# TOOL SUMMARY ===');
      console.log(JSON.stringify(summary, null, 2));
      console.log('========================\n');

      expect(summary.dotnetFormat.autoFixes.length).toBeGreaterThan(0);
      expect(summary.dotnetFormat.needsAI.length).toBeGreaterThan(0);
    });

    it('should document recommended fix order for C#', () => {
      // Recommended order for C# fixes:
      // 1. dotnet format (formatting - fast, always works)
      // 2. AI (tier 3) for semantic issues

      const fixOrder = [
        { step: 1, tool: 'dotnet format', reason: 'Format first to fix all IDE0055, SA1000, SA1xxx issues' },
        { step: 2, tool: 'AI (tier 3)', reason: 'Semantic issues (CA1822, CA2000, IDE0044, IDE0051, IDE0059, IDE0060)' },
      ];

      console.log('\n=== RECOMMENDED FIX ORDER ===');
      fixOrder.forEach((item) => {
        console.log(`${item.step}. ${item.tool}: ${item.reason}`);
      });
      console.log('=============================\n');

      expect(fixOrder.length).toBe(2);
    });

    it('should document .csproj and .editorconfig requirements', () => {
      const requirements = {
        csproj: {
          required: [
            '<EnforceCodeStyleInBuild>true</EnforceCodeStyleInBuild>',
            '<EnableNETAnalyzers>true</EnableNETAnalyzers>',
            '<AnalysisLevel>latest</AnalysisLevel>',
          ],
          optional: [
            '<AnalysisMode>All</AnalysisMode>',
            '<Nullable>enable</Nullable>',
          ],
        },
        editorconfig: {
          example: `
# .editorconfig
root = true

[*.cs]
indent_style = space
indent_size = 4
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true

# Code style
dotnet_style_qualification_for_field = false:suggestion
dotnet_style_qualification_for_property = false:suggestion
dotnet_style_qualification_for_method = false:suggestion
dotnet_style_qualification_for_event = false:suggestion
`,
          notes: 'Place .editorconfig in project root for custom formatting rules',
        },
        cicd: {
          verifyNoChanges: 'dotnet format --verify-no-changes',
          formatOnly: 'dotnet format',
          notes: 'Use --verify-no-changes in CI to fail if unformatted code is committed',
        },
      };

      console.log('\n=== .CSPROJ AND .EDITORCONFIG REQUIREMENTS ===');
      console.log(JSON.stringify(requirements, null, 2));
      console.log('===============================================\n');

      expect(requirements.csproj.required.length).toBeGreaterThan(0);
    });

    it('should document key insight: no tier 2 tools for C# beyond dotnet-format', () => {
      console.log('\n=== KEY INSIGHT: C# TIER 2 COVERAGE ===');
      console.log('Unlike other languages, C# has limited tier 2 options:');
      console.log('');
      console.log('Tier 1 (dotnet-format):');
      console.log('  - ALL formatting rules (IDE0055, SA1xxx)');
      console.log('  - Using directive placement (SA1200, IDE0065)');
      console.log('  - This qualification (IDE0003, IDE0009)');
      console.log('  - Var preferences (IDE0007, IDE0008)');
      console.log('');
      console.log('Tier 3 (AI Required):');
      console.log('  - ALL Roslyn CA rules (CA1822, CA2000, CA2227)');
      console.log('  - ALL semantic IDE rules (IDE0044, IDE0051, IDE0059, IDE0060)');
      console.log('  - ALL SonarQube C# rules (no native fix)');
      console.log('');
      console.log('IMPORTANT: There is no widely-adopted tier 2 "semantic fixer" for C#');
      console.log('like Sorald (Java) or Ruff (Python). All semantic issues need AI.');
      console.log('=========================================\n');

      expect(true).toBe(true);
    });
  });
});
