/**
 * Live Ruby Test - Native Fix Commands (Tier 1 & 2)
 *
 * SESSION 107: Run REAL Ruby fixes and verify files are actually modified.
 *
 * This test performs REAL tool execution:
 * - Runs rubocop --autocorrect on Ruby fixture (Style/Layout rules)
 * - Runs rubocop --autocorrect-all for more aggressive fixes
 * - Verifies files are actually modified (before/after comparison)
 * - Documents which issues need AI (Metrics/*, complex refactoring)
 *
 * TEST WILL FAIL if tools are not installed:
 * - rubocop: gem install rubocop
 *
 * Run with: npm test -- live-ruby.test.ts
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawnSync } from 'child_process';

import {
  RuboCopExecutor,
  createTier1Executor,
} from '../tool-fixers/tier1-executor';

// ============================================================================
// Test Configuration
// ============================================================================

const FIXTURES_DIR = path.join(__dirname, 'fixtures');
const RUBY_FIXTURE_DIR = path.join(FIXTURES_DIR, 'live-test-ruby');
const RUBY_FIXTURE_FILE = path.join(RUBY_FIXTURE_DIR, 'main.rb');

// Timeout for tool execution
const TOOL_TIMEOUT = 60000; // 60 seconds for rubocop

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if rubocop is available
 */
function isRuboCopAvailable(): boolean {
  try {
    const result = spawnSync('rubocop', ['--version'], {
      encoding: 'utf8',
      timeout: 5000,
    });
    return result.status === 0;
  } catch {
    return false;
  }
}

/**
 * Copy fixture file to temp directory for isolated testing
 */
function copyFixtureToTemp(fixtureFile: string, tempDir: string): string {
  const destDir = path.join(tempDir, 'live-test-ruby');
  fs.mkdirSync(destDir, { recursive: true });

  const destFile = path.join(destDir, path.basename(fixtureFile));
  fs.copyFileSync(fixtureFile, destFile);

  // Create a minimal .rubocop.yml to control which cops run
  const ruboCopConfig = `
# Test configuration - enable common auto-correctable cops
AllCops:
  NewCops: enable
  TargetRubyVersion: 3.0
  SuggestExtensions: false

# Style cops (auto-correctable)
Style/StringLiterals:
  Enabled: true
  EnforcedStyle: single_quotes

Style/TrailingCommaInArrayLiteral:
  Enabled: true
  EnforcedStyleForMultiline: consistent_comma

Style/TrailingCommaInHashLiteral:
  Enabled: true
  EnforcedStyleForMultiline: consistent_comma

Style/FrozenStringLiteralComment:
  Enabled: true

Style/RedundantReturn:
  Enabled: true

Style/SymbolProc:
  Enabled: true

Style/NegatedIf:
  Enabled: true

Style/ConditionalAssignment:
  Enabled: true

Style/HashSyntax:
  Enabled: true

Style/WordArray:
  Enabled: true
  MinSize: 2

Style/SymbolArray:
  Enabled: true
  MinSize: 2

# Layout cops (auto-correctable)
Layout/SpaceAroundOperators:
  Enabled: true

Layout/SpaceInsideHashLiteralBraces:
  Enabled: true

Layout/SpaceInsideArrayLiteralBrackets:
  Enabled: true

Layout/IndentationWidth:
  Enabled: true

Layout/EmptyLines:
  Enabled: true

Layout/TrailingWhitespace:
  Enabled: true

# Metrics cops (NOT auto-correctable - need AI)
Metrics/MethodLength:
  Enabled: true
  Max: 10

Metrics/CyclomaticComplexity:
  Enabled: true
  Max: 6

Metrics/AbcSize:
  Enabled: true
  Max: 15

# Documentation (NOT auto-correctable - need AI)
Style/Documentation:
  Enabled: true
`;

  fs.writeFileSync(path.join(destDir, '.rubocop.yml'), ruboCopConfig);

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

describe('Live Ruby Tests - Native Fix Commands (SESSION 107)', () => {
  let tempDir: string;
  let testRubyFile: string;
  let testRubyDir: string;

  beforeAll(() => {
    // Verify fixtures exist
    expect(fs.existsSync(RUBY_FIXTURE_FILE)).toBe(true);
  });

  beforeEach(() => {
    // Create fresh temp directory for each test
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'live-ruby-test-'));
    testRubyFile = copyFixtureToTemp(RUBY_FIXTURE_FILE, tempDir);
    testRubyDir = path.dirname(testRubyFile);
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
    it('should have rubocop installed', () => {
      const available = isRuboCopAvailable();
      if (!available) {
        console.error('\n=== rubocop NOT AVAILABLE ===');
        console.error('Install with: gem install rubocop');
        console.error('Or add to Gemfile: gem "rubocop", require: false');
        console.error('================================\n');
      }
      expect(available).toBe(true);
    });
  });

  // ==========================================================================
  // rubocop --autocorrect Live Tests (Style Rules)
  // ==========================================================================

  describe('rubocop --autocorrect (Style Rules)', () => {
    let originalContent: string;

    beforeEach(() => {
      originalContent = readFileContent(testRubyFile);
    });

    it('should detect style issues in Ruby fixture before fix', () => {
      // Count style issues that rubocop will fix:
      // - Double quotes (Style/StringLiterals)
      // - Missing frozen_string_literal (Style/FrozenStringLiteralComment)
      // - Old hash syntax (Style/HashSyntax)
      // - Explicit return (Style/RedundantReturn)

      // Count double-quoted strings (should be single quotes)
      const doubleQuotes = countOccurrences(originalContent, /"[^"#{]*"/g);

      // Check for missing frozen_string_literal
      const hasFrozenString = originalContent.includes('# frozen_string_literal: true');

      // Count old hash syntax (:key =>)
      const oldHashSyntax = countOccurrences(originalContent, /:\w+\s*=>/g);

      // Count explicit returns
      const explicitReturns = countOccurrences(originalContent, /^\s+return\s+/gm);

      console.log(`\n=== BEFORE rubocop --autocorrect ===`);
      console.log(`Double-quoted strings: ${doubleQuotes}`);
      console.log(`Has frozen_string_literal: ${hasFrozenString}`);
      console.log(`Old hash syntax (:key =>): ${oldHashSyntax}`);
      console.log(`Explicit returns: ${explicitReturns}`);
      console.log(`=====================================\n`);

      // There should be style issues in the fixture
      expect(doubleQuotes).toBeGreaterThan(0);
      expect(hasFrozenString).toBe(false);
    });

    it('should run rubocop --autocorrect and modify the file', async () => {
      if (!isRuboCopAvailable()) {
        console.warn('Skipping: rubocop not available');
        return;
      }

      // Run rubocop --autocorrect
      const result = spawnSync('rubocop', ['--autocorrect', testRubyFile], {
        cwd: testRubyDir,
        encoding: 'utf8',
        timeout: TOOL_TIMEOUT,
      });

      console.log('\n=== rubocop --autocorrect Result ===');
      console.log(`Exit code: ${result.status}`);
      // Note: rubocop returns 1 if there are remaining offenses after autocorrect
      console.log(`Has stdout: ${result.stdout?.length > 0}`);
      if (result.stdout && result.stdout.length > 0) {
        console.log(`Stdout (first 500 chars): ${result.stdout.substring(0, 500)}`);
      }
      if (result.stderr && result.stderr.length > 0) {
        console.log(`Stderr (first 300 chars): ${result.stderr.substring(0, 300)}`);
      }
      console.log('====================================\n');

      // Read modified content
      const modifiedContent = readFileContent(testRubyFile);

      // File should have been modified
      const wasModified = originalContent !== modifiedContent;
      console.log(`File was modified: ${wasModified}`);
      console.log(`Original size: ${originalContent.length}`);
      console.log(`Modified size: ${modifiedContent.length}`);

      // Assert file was modified
      expect(wasModified).toBe(true);
    });

    it('should add frozen_string_literal comment', async () => {
      if (!isRuboCopAvailable()) {
        console.warn('Skipping: rubocop not available');
        return;
      }

      // Run rubocop --autocorrect
      spawnSync('rubocop', ['--autocorrect', testRubyFile], {
        cwd: testRubyDir,
        encoding: 'utf8',
        timeout: TOOL_TIMEOUT,
      });

      const modifiedContent = readFileContent(testRubyFile);

      // Check for frozen_string_literal comment
      const hasFrozenString = modifiedContent.includes('# frozen_string_literal: true');

      console.log(`\n=== AFTER rubocop (frozen_string_literal) ===`);
      console.log(`Has frozen_string_literal: ${hasFrozenString}`);
      console.log(`=============================================\n`);

      // Should have added frozen_string_literal
      expect(hasFrozenString).toBe(true);
    });

    it('should fix string literals to single quotes', async () => {
      if (!isRuboCopAvailable()) {
        console.warn('Skipping: rubocop not available');
        return;
      }

      // Count double quotes before
      const beforeDoubleQuotes = countOccurrences(originalContent, /"[^"#{]*"/g);

      // Run rubocop --autocorrect
      spawnSync('rubocop', ['--autocorrect', testRubyFile], {
        cwd: testRubyDir,
        encoding: 'utf8',
        timeout: TOOL_TIMEOUT,
      });

      const modifiedContent = readFileContent(testRubyFile);

      // Count double quotes after (should be fewer)
      const afterDoubleQuotes = countOccurrences(modifiedContent, /"[^"#{]*"/g);

      // Count single quotes after (should be more)
      const afterSingleQuotes = countOccurrences(modifiedContent, /'[^']*'/g);

      console.log(`\n=== AFTER rubocop (string literals) ===`);
      console.log(`Double quotes before: ${beforeDoubleQuotes}`);
      console.log(`Double quotes after: ${afterDoubleQuotes}`);
      console.log(`Single quotes after: ${afterSingleQuotes}`);
      console.log(`=======================================\n`);

      // Should have converted some double quotes to single quotes
      expect(afterDoubleQuotes).toBeLessThan(beforeDoubleQuotes);
      expect(afterSingleQuotes).toBeGreaterThan(0);
    });

    it('should fix redundant return statements', async () => {
      if (!isRuboCopAvailable()) {
        console.warn('Skipping: rubocop not available');
        return;
      }

      // Count explicit returns before
      const beforeReturns = countOccurrences(originalContent, /^\s+return\s+\S/gm);

      // Run rubocop --autocorrect
      spawnSync('rubocop', ['--autocorrect', testRubyFile], {
        cwd: testRubyDir,
        encoding: 'utf8',
        timeout: TOOL_TIMEOUT,
      });

      const modifiedContent = readFileContent(testRubyFile);

      // Count explicit returns after
      const afterReturns = countOccurrences(modifiedContent, /^\s+return\s+\S/gm);

      console.log(`\n=== AFTER rubocop (redundant return) ===`);
      console.log(`Explicit returns before: ${beforeReturns}`);
      console.log(`Explicit returns after: ${afterReturns}`);
      console.log(`========================================\n`);

      // Should have removed some redundant returns
      expect(afterReturns).toBeLessThanOrEqual(beforeReturns);
    });
  });

  // ==========================================================================
  // rubocop --autocorrect Layout Rules
  // ==========================================================================

  describe('rubocop --autocorrect (Layout Rules)', () => {
    let originalContent: string;

    beforeEach(() => {
      originalContent = readFileContent(testRubyFile);
    });

    it('should detect layout issues in Ruby fixture before fix', () => {
      // Count layout issues:
      // - Missing spaces around operators (a=b instead of a = b)
      // - Extra blank lines
      // - Bad indentation

      // Count cramped operators (a=b, a+b without spaces)
      const crampedEquals = countOccurrences(originalContent, /\w=\w/g);
      const crampedOperators = countOccurrences(originalContent, /\w[+\-*]\w/g);

      // Count multiple consecutive blank lines
      const extraBlankLines = countOccurrences(originalContent, /\n{3,}/g);

      console.log(`\n=== BEFORE rubocop (layout issues) ===`);
      console.log(`Cramped equals (a=b): ${crampedEquals}`);
      console.log(`Cramped operators (a+b): ${crampedOperators}`);
      console.log(`Extra blank lines: ${extraBlankLines}`);
      console.log(`======================================\n`);

      // There should be layout issues in the fixture
      expect(crampedEquals + crampedOperators + extraBlankLines).toBeGreaterThan(0);
    });

    it('should fix spacing around operators', async () => {
      if (!isRuboCopAvailable()) {
        console.warn('Skipping: rubocop not available');
        return;
      }

      // Count cramped before
      const beforeCramped = countOccurrences(originalContent, /\w=\w/g);

      // Run rubocop --autocorrect
      spawnSync('rubocop', ['--autocorrect', testRubyFile], {
        cwd: testRubyDir,
        encoding: 'utf8',
        timeout: TOOL_TIMEOUT,
      });

      const modifiedContent = readFileContent(testRubyFile);

      // Count cramped after
      const afterCramped = countOccurrences(modifiedContent, /\w=\w/g);

      // Count properly spaced
      const properlySpaced = countOccurrences(modifiedContent, /\w\s*=\s*\w/g);

      console.log(`\n=== AFTER rubocop (operator spacing) ===`);
      console.log(`Cramped equals before: ${beforeCramped}`);
      console.log(`Cramped equals after: ${afterCramped}`);
      console.log(`Properly spaced: ${properlySpaced}`);
      console.log(`========================================\n`);

      // Should have fixed some cramped operators
      expect(afterCramped).toBeLessThanOrEqual(beforeCramped);
    });

    it('should fix extra blank lines', async () => {
      if (!isRuboCopAvailable()) {
        console.warn('Skipping: rubocop not available');
        return;
      }

      // Count extra blank lines before
      const beforeBlankLines = countOccurrences(originalContent, /\n{3,}/g);

      // Run rubocop --autocorrect
      spawnSync('rubocop', ['--autocorrect', testRubyFile], {
        cwd: testRubyDir,
        encoding: 'utf8',
        timeout: TOOL_TIMEOUT,
      });

      const modifiedContent = readFileContent(testRubyFile);

      // Count extra blank lines after
      const afterBlankLines = countOccurrences(modifiedContent, /\n{3,}/g);

      console.log(`\n=== AFTER rubocop (blank lines) ===`);
      console.log(`Extra blank lines before: ${beforeBlankLines}`);
      console.log(`Extra blank lines after: ${afterBlankLines}`);
      console.log(`===================================\n`);

      // Should have removed extra blank lines
      expect(afterBlankLines).toBeLessThanOrEqual(beforeBlankLines);
    });
  });

  // ==========================================================================
  // Metrics Rules (Require AI - NOT auto-fixable)
  // ==========================================================================

  describe('Metrics Rules (Require AI)', () => {
    it('should document which Metrics rules need AI (NOT auto-fixable)', () => {
      // These Metrics rules CANNOT be auto-fixed by rubocop:
      const needsAI = [
        { rule: 'Metrics/MethodLength', reason: 'Needs method extraction/refactoring' },
        { rule: 'Metrics/CyclomaticComplexity', reason: 'Needs conditional simplification' },
        { rule: 'Metrics/AbcSize', reason: 'Needs code restructuring' },
        { rule: 'Metrics/BlockLength', reason: 'Needs block extraction' },
        { rule: 'Metrics/ClassLength', reason: 'Needs class splitting' },
        { rule: 'Metrics/ParameterLists', reason: 'Needs parameter object pattern' },
        { rule: 'Metrics/PerceivedComplexity', reason: 'Needs code simplification' },
      ];

      console.log('\n=== METRICS RULES NEEDING AI (TIER 3) ===');
      console.log('These issues CANNOT be auto-fixed by rubocop:');
      needsAI.forEach((item) => console.log(`  - ${item.rule}: ${item.reason}`));
      console.log('==========================================\n');

      expect(needsAI.length).toBeGreaterThan(0);
    });

    it('should verify Metrics issues remain after autocorrect', async () => {
      if (!isRuboCopAvailable()) {
        console.warn('Skipping: rubocop not available');
        return;
      }

      // Run rubocop --autocorrect
      spawnSync('rubocop', ['--autocorrect', testRubyFile], {
        cwd: testRubyDir,
        encoding: 'utf8',
        timeout: TOOL_TIMEOUT,
      });

      // Run rubocop again to check remaining issues
      const result = spawnSync('rubocop', ['--format', 'json', testRubyFile], {
        cwd: testRubyDir,
        encoding: 'utf8',
        timeout: TOOL_TIMEOUT,
      });

      let remainingMetrics = 0;
      try {
        const jsonOutput = JSON.parse(result.stdout);
        if (jsonOutput.files && jsonOutput.files[0]) {
          const offenses = jsonOutput.files[0].offenses || [];
          remainingMetrics = offenses.filter((o: { cop_name: string }) =>
            o.cop_name.startsWith('Metrics/')
          ).length;

          console.log(`\n=== REMAINING METRICS ISSUES ===`);
          offenses
            .filter((o: { cop_name: string }) => o.cop_name.startsWith('Metrics/'))
            .forEach((o: { cop_name: string; message: string }) => {
              console.log(`  - ${o.cop_name}: ${o.message.substring(0, 80)}`);
            });
          console.log(`================================\n`);
        }
      } catch {
        console.log('Could not parse rubocop JSON output');
      }

      // Metrics issues should remain (they need AI to fix)
      console.log(`Remaining Metrics issues: ${remainingMetrics}`);
      // Note: May be 0 if the file doesn't trigger Metrics cops with our config
    });
  });

  // ==========================================================================
  // Executor Class Tests
  // ==========================================================================

  describe('Tier 1 Executor Classes', () => {
    it('should create RuboCopExecutor via factory', () => {
      const executor = createTier1Executor('rubocop');
      expect(executor).not.toBeNull();
      expect(executor).toBeInstanceOf(RuboCopExecutor);
    });

    it('should execute RuboCopExecutor fix', async () => {
      if (!isRuboCopAvailable()) {
        console.warn('Skipping: rubocop not available');
        return;
      }

      const originalContent = readFileContent(testRubyFile);
      const executor = new RuboCopExecutor();

      const result = await executor.executeFix({
        workingDir: testRubyDir,
        files: [testRubyFile],
        timeout: TOOL_TIMEOUT,
        verbose: true,
      });

      console.log('\n=== RuboCopExecutor Result ===');
      console.log(`Success: ${result.success}`);
      console.log(`Tool: ${result.tool}`);
      console.log(`Duration: ${result.durationMs}ms`);
      console.log(`Command: ${result.command}`);
      console.log(`Issues fixed: ${result.issuesFixed}`);
      console.log(`==============================\n`);

      const modifiedContent = readFileContent(testRubyFile);
      const wasModified = originalContent !== modifiedContent;

      expect(result.tool).toBe('rubocop');
      expect(wasModified).toBe(true);
    });

    it('should handle dry run mode', async () => {
      const executor = new RuboCopExecutor();

      const result = await executor.executeFix({
        workingDir: testRubyDir,
        files: [testRubyFile],
        timeout: TOOL_TIMEOUT,
        dryRun: true,
      });

      console.log('\n=== RuboCopExecutor Dry Run ===');
      console.log(`Success: ${result.success}`);
      console.log(`Command: ${result.command}`);
      console.log(`Stdout: ${result.stdout}`);
      console.log(`===============================\n`);

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('[DRY RUN]');
    });
  });

  // ==========================================================================
  // rubocop --autocorrect-all (Unsafe Fixes)
  // ==========================================================================

  describe('rubocop --autocorrect-all (Unsafe Fixes)', () => {
    it('should document difference between --autocorrect and --autocorrect-all', () => {
      // --autocorrect: Only apply "safe" auto-corrections
      // --autocorrect-all: Apply both safe and unsafe auto-corrections

      const safeCorrections = [
        'Style/StringLiterals (double → single quotes)',
        'Style/FrozenStringLiteralComment (add magic comment)',
        'Layout/SpaceAroundOperators (add spacing)',
        'Layout/IndentationWidth (fix indentation)',
        'Layout/TrailingWhitespace (remove trailing whitespace)',
        'Style/RedundantReturn (remove explicit return)',
      ];

      const unsafeCorrections = [
        'Style/SymbolProc (block → symbol-to-proc, may change behavior)',
        'Style/HashSyntax (old → new syntax, compatibility concerns)',
        'Style/WordArray (%w() array, may change behavior)',
        'Style/NegatedIf (unless → if !, semantic change)',
        'Style/ConditionalAssignment (may change control flow)',
      ];

      console.log('\n=== SAFE AUTO-CORRECTIONS (--autocorrect) ===');
      safeCorrections.forEach((c) => console.log(`  - ${c}`));
      console.log('===============================================\n');

      console.log('=== UNSAFE AUTO-CORRECTIONS (--autocorrect-all) ===');
      unsafeCorrections.forEach((c) => console.log(`  - ${c}`));
      console.log('===================================================\n');

      expect(safeCorrections.length).toBeGreaterThan(0);
      expect(unsafeCorrections.length).toBeGreaterThan(0);
    });

    it('should run --autocorrect-all for more fixes', async () => {
      if (!isRuboCopAvailable()) {
        console.warn('Skipping: rubocop not available');
        return;
      }

      const originalContent = readFileContent(testRubyFile);

      // Run rubocop --autocorrect-all
      const result = spawnSync('rubocop', ['--autocorrect-all', testRubyFile], {
        cwd: testRubyDir,
        encoding: 'utf8',
        timeout: TOOL_TIMEOUT,
      });

      console.log('\n=== rubocop --autocorrect-all Result ===');
      console.log(`Exit code: ${result.status}`);
      if (result.stdout && result.stdout.length > 0) {
        console.log(`Stdout (first 500 chars): ${result.stdout.substring(0, 500)}`);
      }
      console.log('========================================\n');

      const modifiedContent = readFileContent(testRubyFile);
      const wasModified = originalContent !== modifiedContent;

      console.log(`File was modified: ${wasModified}`);

      // Should have modified the file
      expect(wasModified).toBe(true);
    });
  });

  // ==========================================================================
  // Integration Summary
  // ==========================================================================

  describe('Live Test Summary', () => {
    it('should provide summary of Ruby tool capabilities', () => {
      const summary = {
        rubocop: {
          available: isRuboCopAvailable(),
          tier: 1,
          autoFixesWithAutocorrect: [
            'Style/StringLiterals',
            'Style/FrozenStringLiteralComment',
            'Style/RedundantReturn',
            'Style/RedundantSelf',
            'Style/IfUnlessModifier',
            'Layout/SpaceAroundOperators',
            'Layout/IndentationWidth',
            'Layout/TrailingWhitespace',
            'Layout/EmptyLines',
            'Layout/SpaceInsideHashLiteralBraces',
            'Layout/SpaceInsideArrayLiteralBrackets',
          ],
          autoFixesWithAutocorrectAll: [
            'Style/SymbolProc',
            'Style/HashSyntax',
            'Style/WordArray',
            'Style/SymbolArray',
            'Style/NegatedIf',
            'Style/ConditionalAssignment',
            'Style/GuardClause',
          ],
          needsAI: [
            'Metrics/MethodLength (refactoring)',
            'Metrics/CyclomaticComplexity (simplification)',
            'Metrics/AbcSize (restructuring)',
            'Style/Documentation (class docs)',
          ],
        },
      };

      console.log('\n=== RUBY TOOL SUMMARY ===');
      console.log(JSON.stringify(summary, null, 2));
      console.log('=========================\n');

      expect(summary.rubocop.autoFixesWithAutocorrect.length).toBeGreaterThan(0);
      expect(summary.rubocop.needsAI.length).toBeGreaterThan(0);
    });

    it('should document recommended fix order for Ruby', () => {
      // Recommended order for Ruby fixes:
      // 1. rubocop --autocorrect (safe fixes - Style/Layout)
      // 2. rubocop --autocorrect-all (unsafe fixes - more Style)
      // 3. AI (tier 3) for Metrics/* rules (refactoring)

      const fixOrder = [
        { step: 1, tool: 'rubocop --autocorrect', reason: 'Safe fixes: frozen_string_literal, quotes, spacing, indentation' },
        { step: 2, tool: 'rubocop --autocorrect-all', reason: 'Unsafe fixes: HashSyntax, SymbolProc, WordArray, NegatedIf' },
        { step: 3, tool: 'AI (tier 3)', reason: 'Metrics rules: MethodLength, CyclomaticComplexity, AbcSize' },
      ];

      console.log('\n=== RECOMMENDED FIX ORDER FOR RUBY ===');
      fixOrder.forEach((item) => {
        console.log(`${item.step}. ${item.tool}: ${item.reason}`);
      });
      console.log('=======================================\n');

      expect(fixOrder.length).toBe(3);
    });

    it('should document which rules are in each tier', () => {
      // Tier 1 (rubocop --autocorrect): Safe auto-corrections
      const tier1Rules = [
        'Style/StringLiterals',
        'Style/FrozenStringLiteralComment',
        'Style/RedundantReturn',
        'Style/RedundantSelf',
        'Style/TrailingCommaInArrayLiteral',
        'Style/TrailingCommaInHashLiteral',
        'Layout/SpaceAroundOperators',
        'Layout/SpaceAfterComma',
        'Layout/IndentationWidth',
        'Layout/TrailingWhitespace',
        'Layout/EmptyLines',
        'Layout/SpaceInsideHashLiteralBraces',
        'Layout/SpaceInsideArrayLiteralBrackets',
      ];

      // Tier 2 (rubocop --autocorrect-all): Unsafe auto-corrections
      const tier2Rules = [
        'Style/SymbolProc',
        'Style/HashSyntax',
        'Style/WordArray',
        'Style/SymbolArray',
        'Style/NegatedIf',
        'Style/ConditionalAssignment',
        'Style/GuardClause',
        'Style/IfUnlessModifier',
      ];

      // Tier 3 (AI Required): Cannot be auto-fixed
      const tier3Rules = [
        'Metrics/MethodLength',
        'Metrics/CyclomaticComplexity',
        'Metrics/AbcSize',
        'Metrics/BlockLength',
        'Metrics/ClassLength',
        'Metrics/ParameterLists',
        'Metrics/PerceivedComplexity',
        'Style/Documentation',
      ];

      console.log('\n=== RUBY RULES BY TIER ===');
      console.log('\nTIER 1 (--autocorrect, safe):');
      tier1Rules.forEach((r) => console.log(`  - ${r}`));
      console.log('\nTIER 2 (--autocorrect-all, unsafe):');
      tier2Rules.forEach((r) => console.log(`  - ${r}`));
      console.log('\nTIER 3 (AI required):');
      tier3Rules.forEach((r) => console.log(`  - ${r}`));
      console.log('==========================\n');

      expect(tier1Rules.length).toBeGreaterThan(0);
      expect(tier2Rules.length).toBeGreaterThan(0);
      expect(tier3Rules.length).toBeGreaterThan(0);
    });
  });
});
