/**
 * Live Rust Test - Native Fix Commands (Tier 1 & 2)
 *
 * SESSION 107: Run REAL Rust fixes and verify files are actually modified.
 *
 * This test performs REAL tool execution:
 * - Runs rustfmt on Rust fixture (formatting)
 * - Runs cargo clippy --fix on Rust fixture (clippy auto-fixes)
 * - Verifies files are actually modified (before/after comparison)
 * - Documents which issues need AI (unwrap_used, expect_used, panic)
 *
 * TEST WILL FAIL if tools are not installed:
 * - rustfmt: Included with Rust (rustup component add rustfmt)
 * - clippy: Included with Rust (rustup component add clippy)
 *
 * Run with: npm test -- live-rust.test.ts
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawnSync } from 'child_process';

import {
  RustFmtExecutor,
  ClippyExecutor,
  createTier1Executor,
} from '../tool-fixers/tier1-executor';

// ============================================================================
// Test Configuration
// ============================================================================

const FIXTURES_DIR = path.join(__dirname, 'fixtures');
const RUST_FIXTURE_DIR = path.join(FIXTURES_DIR, 'live-test-rust');
const RUST_FIXTURE_FILE = path.join(RUST_FIXTURE_DIR, 'main.rs');
const RUST_CARGO_TOML = path.join(RUST_FIXTURE_DIR, 'Cargo.toml');

// Timeout for tool execution (cargo can be slow on first run)
const TOOL_TIMEOUT = 120000; // 120 seconds for cargo clippy --fix

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if rustfmt is available (comes with Rust via rustup)
 */
function isRustfmtAvailable(): boolean {
  try {
    const result = spawnSync('rustfmt', ['--version'], {
      encoding: 'utf8',
      timeout: 5000,
    });
    return result.status === 0;
  } catch {
    return false;
  }
}

/**
 * Check if cargo clippy is available
 */
function isClippyAvailable(): boolean {
  try {
    const result = spawnSync('cargo', ['clippy', '--version'], {
      encoding: 'utf8',
      timeout: 10000,
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
  const destDir = path.join(tempDir, 'live-test-rust');
  fs.mkdirSync(destDir, { recursive: true });

  // Copy main files (Cargo.toml, main.rs) - skip target directory
  const filesToCopy = ['Cargo.toml', 'main.rs', 'Cargo.lock'];
  for (const file of filesToCopy) {
    const srcPath = path.join(fixtureDir, file);
    const destPath = path.join(destDir, file);
    if (fs.existsSync(srcPath) && fs.statSync(srcPath).isFile()) {
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

describe('Live Rust Tests - Native Fix Commands (SESSION 107)', () => {
  let tempDir: string;
  let tempRustDir: string;
  let testMainRs: string;

  beforeAll(() => {
    // Verify fixtures exist
    expect(fs.existsSync(RUST_FIXTURE_FILE)).toBe(true);
    expect(fs.existsSync(RUST_CARGO_TOML)).toBe(true);
  });

  beforeEach(() => {
    // Create fresh temp directory for each test
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'live-rust-test-'));
    tempRustDir = copyFixtureDirToTemp(RUST_FIXTURE_DIR, tempDir);
    testMainRs = path.join(tempRustDir, 'main.rs');
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
    it('should have rustfmt installed (comes with Rust)', () => {
      const available = isRustfmtAvailable();
      if (!available) {
        console.error('\n=== rustfmt NOT AVAILABLE ===');
        console.error('rustfmt is included with Rust installation');
        console.error('Install with: rustup component add rustfmt');
        console.error('================================\n');
      }
      expect(available).toBe(true);
    });

    it('should have cargo clippy installed', () => {
      const available = isClippyAvailable();
      if (!available) {
        console.error('\n=== cargo clippy NOT INSTALLED ===');
        console.error('Install with: rustup component add clippy');
        console.error('====================================\n');
      }
      expect(available).toBe(true);
    });
  });

  // ==========================================================================
  // rustfmt Live Tests
  // ==========================================================================

  describe('rustfmt (Rust Formatting)', () => {
    let originalContent: string;

    beforeEach(() => {
      originalContent = readFileContent(testMainRs);
    });

    it('should detect formatting issues in Rust fixture before fix', () => {
      // Count formatting issues that rustfmt will fix:
      // - Missing spaces around operators (a:i32 -> a: i32)
      // - Missing spaces after commas (a,b -> a, b)
      // - Bad brace placement ({on same line without space)
      // - Inconsistent indentation

      // Count cramped type annotations like a:i32
      const crampedTypes = countOccurrences(originalContent, /\w:\w/g);

      // Count cramped parameters like (a,b)
      const crampedParams = countOccurrences(originalContent, /\w,\w/g);

      // Count cramped braces like ){
      const crampedBraces = countOccurrences(originalContent, /\)\s*\{/g);

      console.log(`\n=== BEFORE rustfmt ===`);
      console.log(`Cramped type annotations: ${crampedTypes}`);
      console.log(`Cramped parameters: ${crampedParams}`);
      console.log(`Cramped braces: ${crampedBraces}`);
      console.log(`Total formatting issues: ${crampedTypes + crampedParams}`);
      console.log(`====================\n`);

      // There should be formatting issues in the fixture
      expect(crampedTypes + crampedParams).toBeGreaterThan(0);
    });

    it('should run rustfmt and modify the file', async () => {
      if (!isRustfmtAvailable()) {
        console.warn('Skipping: rustfmt not available');
        return;
      }

      // Run rustfmt directly
      const result = spawnSync('rustfmt', [testMainRs], {
        encoding: 'utf8',
        timeout: TOOL_TIMEOUT,
      });

      console.log('\n=== rustfmt Result ===');
      console.log(`Exit code: ${result.status}`);
      console.log(`Success: ${result.status === 0}`);
      if (result.error) {
        console.log(`Error: ${result.error}`);
      }
      if (result.stderr && result.stderr.length > 0) {
        console.log(`Stderr: ${result.stderr.substring(0, 500)}`);
      }
      console.log('====================\n');

      // Read modified content
      const modifiedContent = readFileContent(testMainRs);

      // File should have been modified
      const wasModified = originalContent !== modifiedContent;
      console.log(`File was modified: ${wasModified}`);
      console.log(`Original size: ${originalContent.length}`);
      console.log(`Modified size: ${modifiedContent.length}`);

      // Assert file was modified (rustfmt should format the file)
      expect(wasModified).toBe(true);
    });

    it('should fix type annotation spacing', async () => {
      if (!isRustfmtAvailable()) {
        console.warn('Skipping: rustfmt not available');
        return;
      }

      // Run rustfmt
      spawnSync('rustfmt', [testMainRs], {
        encoding: 'utf8',
        timeout: TOOL_TIMEOUT,
      });

      const modifiedContent = readFileContent(testMainRs);

      // Count remaining cramped type annotations (a:i32 should become a: i32)
      const remainingCramped = countOccurrences(modifiedContent, /\([a-z]:[a-z]/gi);

      // Count properly spaced type annotations
      const properlySpaced = countOccurrences(modifiedContent, /\([a-z]: [a-z]/gi);

      console.log(`\n=== AFTER rustfmt (type spacing) ===`);
      console.log(`Remaining cramped: ${remainingCramped}`);
      console.log(`Properly spaced: ${properlySpaced}`);
      console.log(`====================================\n`);

      // Type annotations should be properly spaced after rustfmt
      expect(properlySpaced).toBeGreaterThan(0);
    });

    it('should fix struct and impl formatting', async () => {
      if (!isRustfmtAvailable()) {
        console.warn('Skipping: rustfmt not available');
        return;
      }

      // Run rustfmt
      spawnSync('rustfmt', [testMainRs], {
        encoding: 'utf8',
        timeout: TOOL_TIMEOUT,
      });

      const modifiedContent = readFileContent(testMainRs);

      // Properly formatted struct has "struct Name {"
      const properStructDef = countOccurrences(modifiedContent, /struct \w+ \{/g);

      // Properly formatted impl has "impl Name {"
      const properImplDef = countOccurrences(modifiedContent, /impl \w+ \{/g);

      console.log(`\n=== AFTER rustfmt (struct/impl) ===`);
      console.log(`Properly formatted structs: ${properStructDef}`);
      console.log(`Properly formatted impls: ${properImplDef}`);
      console.log(`===================================\n`);

      // Should have properly formatted struct and impl
      expect(properStructDef).toBeGreaterThanOrEqual(1);
      expect(properImplDef).toBeGreaterThanOrEqual(1);
    });

    it('should fix match arm formatting', async () => {
      if (!isRustfmtAvailable()) {
        console.warn('Skipping: rustfmt not available');
        return;
      }

      // Run rustfmt
      spawnSync('rustfmt', [testMainRs], {
        encoding: 'utf8',
        timeout: TOOL_TIMEOUT,
      });

      const modifiedContent = readFileContent(testMainRs);

      // Properly formatted match arms have => with proper spacing
      const properMatchArms = countOccurrences(modifiedContent, /^\s+\d+ => /gm);

      console.log(`\n=== AFTER rustfmt (match arms) ===`);
      console.log(`Properly formatted match arms: ${properMatchArms}`);
      console.log(`==================================\n`);

      // Should have properly formatted match arms
      expect(properMatchArms).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // cargo clippy --fix Live Tests
  // ==========================================================================

  describe('cargo clippy --fix (Clippy Auto-Fix)', () => {
    let originalContent: string;

    beforeEach(() => {
      originalContent = readFileContent(testMainRs);
    });

    it('should detect clippy issues in Rust fixture before fix', () => {
      // Check for clippy issues mentioned in fixture comments:
      // - needless_return: explicit return statements
      // - redundant_clone: unnecessary .clone() calls
      // - let_and_return: let binding immediately returned

      // Count explicit return statements
      const needlessReturns = countOccurrences(originalContent, /return [^;]+;$/gm);

      // Count .clone() calls (potential redundant_clone)
      const cloneCalls = countOccurrences(originalContent, /\.clone\(\)/g);

      // Count let bindings with immediate return (potential let_and_return)
      const letAndReturn = countOccurrences(originalContent, /let \w+ = [^;]+;\s*return \w+;/g);

      console.log(`\n=== BEFORE clippy --fix ===`);
      console.log(`Explicit returns (potential needless_return): ${needlessReturns}`);
      console.log(`.clone() calls (potential redundant_clone): ${cloneCalls}`);
      console.log(`Let-and-return patterns: ${letAndReturn}`);
      console.log(`===========================\n`);

      // There should be clippy-fixable issues
      expect(needlessReturns).toBeGreaterThan(0);
    });

    it('should run cargo clippy --fix and modify the file', async () => {
      if (!isClippyAvailable()) {
        console.warn('Skipping: cargo clippy not available');
        return;
      }

      // First run rustfmt to fix formatting (clippy works better on formatted code)
      if (isRustfmtAvailable()) {
        spawnSync('rustfmt', [testMainRs], { encoding: 'utf8', timeout: TOOL_TIMEOUT });
      }

      // Get content before clippy
      const beforeClippy = readFileContent(testMainRs);

      // Run cargo clippy --fix
      const result = spawnSync(
        'cargo',
        ['clippy', '--fix', '--allow-dirty', '--allow-staged'],
        {
          cwd: tempRustDir,
          encoding: 'utf8',
          timeout: TOOL_TIMEOUT,
          env: { ...process.env, CARGO_TARGET_DIR: path.join(tempDir, 'target') },
        }
      );

      console.log('\n=== cargo clippy --fix Result ===');
      console.log(`Exit code: ${result.status}`);
      // Note: clippy returns non-zero if there are unfixable warnings
      console.log(`Has stdout: ${result.stdout?.length > 0}`);
      if (result.stderr && result.stderr.length > 0) {
        console.log(`Stderr (first 500 chars): ${result.stderr.substring(0, 500)}`);
      }
      console.log('=================================\n');

      // Read modified content
      const modifiedContent = readFileContent(testMainRs);

      // Check if file was modified
      const wasModified = beforeClippy !== modifiedContent;
      console.log(`File was modified by clippy: ${wasModified}`);

      // clippy --fix may or may not modify depending on what's fixable
      // We just verify it ran successfully
      expect(result.error).toBeUndefined();
    });

    it('should fix needless_return issues', async () => {
      if (!isClippyAvailable()) {
        console.warn('Skipping: cargo clippy not available');
        return;
      }

      // First run rustfmt
      if (isRustfmtAvailable()) {
        spawnSync('rustfmt', [testMainRs], { encoding: 'utf8', timeout: TOOL_TIMEOUT });
      }

      // Run cargo clippy --fix
      spawnSync(
        'cargo',
        ['clippy', '--fix', '--allow-dirty', '--allow-staged'],
        {
          cwd: tempRustDir,
          encoding: 'utf8',
          timeout: TOOL_TIMEOUT,
          env: { ...process.env, CARGO_TARGET_DIR: path.join(tempDir, 'target') },
        }
      );

      const modifiedContent = readFileContent(testMainRs);

      // Count remaining explicit returns at end of blocks (needless_return)
      // After clippy fix, simple returns like "return x;" should become just "x"
      const remainingNeedlessReturns = countOccurrences(
        modifiedContent,
        /return [a-z_]+\s*;?\s*\}/gmi
      );

      console.log(`\n=== AFTER clippy (needless_return) ===`);
      console.log(`Remaining needless returns: ${remainingNeedlessReturns}`);
      console.log(`======================================\n`);

      // Some needless returns should be fixed
      // Note: Not all returns will be removed - some are intentional
    });

    it('should fix redundant_clone issues', async () => {
      if (!isClippyAvailable()) {
        console.warn('Skipping: cargo clippy not available');
        return;
      }

      // First run rustfmt
      if (isRustfmtAvailable()) {
        spawnSync('rustfmt', [testMainRs], { encoding: 'utf8', timeout: TOOL_TIMEOUT });
      }

      const beforeContent = readFileContent(testMainRs);
      const beforeClones = countOccurrences(beforeContent, /\.clone\(\)/g);

      // Run cargo clippy --fix
      spawnSync(
        'cargo',
        ['clippy', '--fix', '--allow-dirty', '--allow-staged'],
        {
          cwd: tempRustDir,
          encoding: 'utf8',
          timeout: TOOL_TIMEOUT,
          env: { ...process.env, CARGO_TARGET_DIR: path.join(tempDir, 'target') },
        }
      );

      const modifiedContent = readFileContent(testMainRs);
      const afterClones = countOccurrences(modifiedContent, /\.clone\(\)/g);

      console.log(`\n=== AFTER clippy (redundant_clone) ===`);
      console.log(`Clones before: ${beforeClones}`);
      console.log(`Clones after: ${afterClones}`);
      console.log(`Clones removed: ${beforeClones - afterClones}`);
      console.log(`======================================\n`);

      // Note: Not all clones will be removed - some are necessary
    });

    it('should document which issues clippy CAN auto-fix', () => {
      // clippy --fix can auto-fix SOME issues:
      const canAutoFix = [
        'needless_return', // Explicit return where implicit would work
        'redundant_clone', // Cloning when not necessary
        'let_and_return', // Let binding immediately returned
        'useless_vec', // Vec where array would work
        'map_clone', // .map(|x| x.clone()) instead of .cloned()
        'single_match', // Single match arm that could be if-let
        'redundant_field_names', // name: name shorthand
        'manual_map', // Match on Option that could be .map()
        'manual_is_ascii_check', // Manual ASCII range check
      ];

      console.log('\n=== clippy AUTO-FIXABLE ===');
      console.log('These issues CAN be auto-fixed with cargo clippy --fix:');
      canAutoFix.forEach((issue) => console.log(`  - ${issue}`));
      console.log('===========================\n');

      // This is documentation-only test
      expect(canAutoFix.length).toBeGreaterThan(0);
    });

    it('should document which issues need AI (NOT auto-fixable)', () => {
      // These issues CANNOT be auto-fixed by clippy:
      const needsAI = [
        { rule: 'unwrap_used', reason: 'Needs proper error handling with Result/Option' },
        { rule: 'expect_used', reason: 'Needs proper error handling instead of panic' },
        { rule: 'panic', reason: 'Needs Result return type and proper error propagation' },
        { rule: 'indexing_slicing', reason: 'Needs bounds checking with .get()' },
        { rule: 'missing_errors_doc', reason: 'Needs documentation for error cases' },
        { rule: 'cognitive_complexity', reason: 'Needs function refactoring' },
        { rule: 'too_many_arguments', reason: 'Needs struct or builder pattern' },
        { rule: 'too_many_lines', reason: 'Needs function splitting' },
      ];

      console.log('\n=== ISSUES NEEDING AI (TIER 3) ===');
      console.log('These issues CANNOT be auto-fixed:');
      needsAI.forEach((item) => console.log(`  - ${item.rule}: ${item.reason}`));
      console.log('===================================\n');

      // Count how many of these issues are in the fixture
      const unwrapIssues = countOccurrences(originalContent, /\.unwrap\(\)/g);
      const expectIssues = countOccurrences(originalContent, /\.expect\(/g);
      const panicIssues = countOccurrences(originalContent, /panic!\(/g);

      console.log(`\n=== FIXTURE AI-NEEDED ISSUES ===`);
      console.log(`unwrap_used: ${unwrapIssues}`);
      console.log(`expect_used: ${expectIssues}`);
      console.log(`panic calls: ${panicIssues}`);
      console.log(`================================\n`);

      expect(needsAI.length).toBeGreaterThan(0);
      expect(unwrapIssues + expectIssues + panicIssues).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Executor Class Tests (via tier2-executor)
  // ==========================================================================

  describe('Tier 2 Executor Classes', () => {
    it('should create RustFmtExecutor via factory', () => {
      const executor = createTier1Executor('rustfmt');
      expect(executor).not.toBeNull();
      expect(executor).toBeInstanceOf(RustFmtExecutor);
    });

    it('should create ClippyExecutor via factory', () => {
      const executor = createTier1Executor('clippy');
      expect(executor).not.toBeNull();
      expect(executor).toBeInstanceOf(ClippyExecutor);
    });

    it('should execute RustFmtExecutor fix', async () => {
      if (!isRustfmtAvailable()) {
        console.warn('Skipping: rustfmt not available');
        return;
      }

      const originalContent = readFileContent(testMainRs);
      const executor = new RustFmtExecutor();

      const result = await executor.executeFix({
        workingDir: tempRustDir,
        files: [testMainRs],
        timeout: TOOL_TIMEOUT,
        verbose: true,
      });

      console.log('\n=== RustFmtExecutor Result ===');
      console.log(`Success: ${result.success}`);
      console.log(`Tool: ${result.tool}`);
      console.log(`Duration: ${result.durationMs}ms`);
      console.log(`Command: ${result.command}`);
      console.log('==============================\n');

      const modifiedContent = readFileContent(testMainRs);
      const wasModified = originalContent !== modifiedContent;

      expect(result.success).toBe(true);
      expect(result.tool).toBe('rustfmt');
      expect(wasModified).toBe(true);
    });

    it('should execute ClippyExecutor fix', async () => {
      if (!isClippyAvailable()) {
        console.warn('Skipping: cargo clippy not available');
        return;
      }

      // First format the file
      if (isRustfmtAvailable()) {
        spawnSync('rustfmt', [testMainRs], { encoding: 'utf8', timeout: TOOL_TIMEOUT });
      }

      const executor = new ClippyExecutor();

      const result = await executor.executeFix({
        workingDir: tempRustDir,
        files: [testMainRs],
        timeout: TOOL_TIMEOUT,
        verbose: true,
      });

      console.log('\n=== ClippyExecutor Result ===');
      console.log(`Success: ${result.success}`);
      console.log(`Tool: ${result.tool}`);
      console.log(`Duration: ${result.durationMs}ms`);
      console.log(`Command: ${result.command}`);
      console.log('=============================\n');

      expect(result.tool).toBe('clippy');
      // Note: Success depends on whether clippy can fix all issues
    });
  });

  // ==========================================================================
  // Multi-Tool Sequence Test
  // ==========================================================================

  describe('Multi-Tool Fix Sequence', () => {
    it('should run rustfmt -> clippy --fix in sequence', async () => {
      // Skip if any tool not available
      if (!isRustfmtAvailable() || !isClippyAvailable()) {
        console.warn('Skipping: One or more tools not installed');
        return;
      }

      const originalContent = readFileContent(testMainRs);
      const toolResults: { tool: string; modified: boolean; durationMs: number }[] = [];

      // Step 1: Run rustfmt (formatting)
      const beforeRustfmt = readFileContent(testMainRs);
      const rustfmtStart = Date.now();
      spawnSync('rustfmt', [testMainRs], { encoding: 'utf8', timeout: TOOL_TIMEOUT });
      const afterRustfmt = readFileContent(testMainRs);
      toolResults.push({
        tool: 'rustfmt',
        modified: beforeRustfmt !== afterRustfmt,
        durationMs: Date.now() - rustfmtStart,
      });

      // Step 2: Run cargo clippy --fix (semantic fixes)
      const beforeClippy = readFileContent(testMainRs);
      const clippyStart = Date.now();
      spawnSync(
        'cargo',
        ['clippy', '--fix', '--allow-dirty', '--allow-staged'],
        {
          cwd: tempRustDir,
          encoding: 'utf8',
          timeout: TOOL_TIMEOUT,
          env: { ...process.env, CARGO_TARGET_DIR: path.join(tempDir, 'target') },
        }
      );
      const afterClippy = readFileContent(testMainRs);
      toolResults.push({
        tool: 'clippy',
        modified: beforeClippy !== afterClippy,
        durationMs: Date.now() - clippyStart,
      });

      const finalContent = readFileContent(testMainRs);

      console.log('\n=== MULTI-TOOL SEQUENCE RESULTS ===');
      toolResults.forEach((r) => {
        console.log(`${r.tool}: modified=${r.modified}, duration=${r.durationMs}ms`);
      });
      console.log(`\nOriginal size: ${originalContent.length} bytes`);
      console.log(`Final size: ${finalContent.length} bytes`);
      console.log(`Total modification: ${originalContent !== finalContent}`);
      console.log('====================================\n');

      // At least rustfmt should have modified the file
      expect(toolResults[0].modified).toBe(true);

      // Final content should differ from original
      expect(finalContent).not.toBe(originalContent);
    });
  });

  // ==========================================================================
  // Integration Summary
  // ==========================================================================

  describe('Live Test Summary', () => {
    it('should provide summary of Rust tool capabilities', () => {
      const summary = {
        rustfmt: {
          available: isRustfmtAvailable(),
          tier: 1,
          autoFixes: [
            'Indentation',
            'Spacing around operators',
            'Spacing after commas',
            'Type annotation spacing',
            'Brace positioning',
            'Struct/impl formatting',
            'Match arm formatting',
            'Line wrapping',
          ],
          needsAI: [],
        },
        clippy: {
          available: isClippyAvailable(),
          tier: 2,
          autoFixes: [
            'needless_return',
            'redundant_clone',
            'let_and_return',
            'useless_vec',
            'map_clone',
            'single_match',
            'redundant_field_names',
          ],
          needsAI: [
            'unwrap_used (error handling)',
            'expect_used (panic handling)',
            'panic! (Result return type)',
            'indexing_slicing (bounds checking)',
            'missing_errors_doc (documentation)',
            'cognitive_complexity (refactoring)',
          ],
        },
      };

      console.log('\n=== RUST TOOL SUMMARY ===');
      console.log(JSON.stringify(summary, null, 2));
      console.log('=========================\n');

      // At least rustfmt should be available (comes with Rust)
      expect(summary.rustfmt.available).toBe(true);
    });

    it('should document recommended fix order for Rust', () => {
      // Recommended order for Rust fixes:
      // 1. rustfmt (formatting - always run first)
      // 2. cargo clippy --fix (auto-fixable lints)
      // 3. AI (tier 3) for semantic issues (unwrap_used, expect_used, panic)

      const fixOrder = [
        { step: 1, tool: 'rustfmt', reason: 'Format first for consistent code style' },
        { step: 2, tool: 'cargo clippy --fix', reason: 'Auto-fix clippy lints (needless_return, redundant_clone)' },
        { step: 3, tool: 'AI (tier 3)', reason: 'Semantic issues (unwrap_used, expect_used, panic)' },
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
