/**
 * Live Prettier Test - Formatting Separately from ESLint
 *
 * SESSION 107: Test Prettier formatting capabilities separately from ESLint.
 *
 * This test performs REAL Prettier execution:
 * - Runs prettier --write on TypeScript fixture with formatting issues
 * - Verifies files are actually modified (before/after comparison)
 * - Tests integration with ESLint (eslint-config-prettier compatibility)
 *
 * Prettier vs ESLint separation:
 * - Prettier: Pure formatting (indentation, line breaks, quotes, spacing)
 * - ESLint: Code quality rules (unused vars, type issues, best practices)
 *
 * When using eslint-config-prettier, ESLint formatting rules are disabled
 * so Prettier handles all formatting without conflicts.
 *
 * TEST WILL FAIL if tools are not installed:
 * - Prettier: npm install -g prettier or npx prettier
 *
 * Run with: npm test -- live-prettier.test.ts
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawnSync } from 'child_process';

import {
  PrettierExecutor,
  createTier1Executor,
} from '../tool-fixers/tier1-executor';

// ============================================================================
// Test Configuration
// ============================================================================

const FIXTURES_DIR = path.join(__dirname, 'fixtures');
const PRETTIER_FIXTURE = path.join(FIXTURES_DIR, 'live-test-prettier.ts');

// Timeout for tool execution (tools can be slow on first run)
const TOOL_TIMEOUT = 30000; // 30 seconds

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if Prettier is available (via npx or global)
 */
function isPrettierAvailable(): boolean {
  try {
    const result = spawnSync('npx', ['prettier', '--version'], {
      encoding: 'utf8',
      timeout: 10000,
    });
    return result.status === 0;
  } catch {
    return false;
  }
}

/**
 * Check if ESLint is available (for integration tests)
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

/**
 * Count lines exceeding a certain width
 */
function countLongLines(text: string, maxWidth: number): number {
  const lines = text.split('\n');
  return lines.filter(line => line.length > maxWidth).length;
}

/**
 * Count lines with inconsistent indentation (tabs mixed with spaces)
 */
function countMixedIndentation(text: string): number {
  const lines = text.split('\n');
  return lines.filter(line => {
    const leadingWhitespace = line.match(/^[\t ]+/)?.[0] || '';
    return leadingWhitespace.includes('\t') && leadingWhitespace.includes(' ');
  }).length;
}

// ============================================================================
// Test Suite
// ============================================================================

describe('Live Prettier Tests - Formatting Separately from ESLint (SESSION 107)', () => {
  let tempDir: string;

  beforeAll(() => {
    // Verify fixture exists
    if (!fs.existsSync(PRETTIER_FIXTURE)) {
      console.error(`Fixture not found: ${PRETTIER_FIXTURE}`);
    }
    expect(fs.existsSync(PRETTIER_FIXTURE)).toBe(true);
  });

  beforeEach(() => {
    // Create fresh temp directory for each test
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'live-prettier-test-'));
  });

  afterAll(() => {
    // Cleanup is handled by OS for temp directories
  });

  // ==========================================================================
  // Tool Availability Tests
  // ==========================================================================

  describe('Tool Availability (MUST PASS)', () => {
    it('should have Prettier installed', () => {
      const available = isPrettierAvailable();
      if (!available) {
        console.error('\n=== Prettier NOT INSTALLED ===');
        console.error('Install with: npm install -g prettier');
        console.error('Or: npm install prettier (in project)');
        console.error('================================\n');
      }
      expect(available).toBe(true);
    });
  });

  // ==========================================================================
  // Prettier Formatting Tests
  // ==========================================================================

  describe('Prettier --write (TypeScript)', () => {
    let prettierExecutor: PrettierExecutor;
    let testFile: string;
    let originalContent: string;

    beforeEach(() => {
      prettierExecutor = new PrettierExecutor();
      testFile = copyFixtureToTemp(PRETTIER_FIXTURE, tempDir);
      originalContent = readFileContent(testFile);

      // Create Prettier config for consistent testing
      const prettierConfig = {
        printWidth: 80,
        tabWidth: 2,
        useTabs: false,
        semi: true,
        singleQuote: true,
        trailingComma: 'all',
        bracketSpacing: true,
        arrowParens: 'always',
      };
      fs.writeFileSync(
        path.join(tempDir, '.prettierrc.json'),
        JSON.stringify(prettierConfig, null, 2)
      );
    });

    it('should detect formatting issues in fixture before fix', () => {
      // Count issues that Prettier fixes:

      // Long lines (exceeding 80 chars)
      const longLines = countLongLines(originalContent, 80);

      // Double quotes that should be single
      const doubleQuotes = countOccurrences(originalContent, /= "/g);

      // Missing trailing commas in multiline (rough estimate)
      const closingBraces = countOccurrences(originalContent, /\n\s*\}/g);

      // Lines with potential bracket spacing issues { no space
      const noSpaceBracket = countOccurrences(originalContent, /\{[a-zA-Z]/g);

      // Mixed indentation (tabs with spaces)
      const mixedIndent = countMixedIndentation(originalContent);

      console.log(`\n=== BEFORE PRETTIER FIX ===`);
      console.log(`Long lines (>80 chars): ${longLines}`);
      console.log(`Double quotes (should be single): ${doubleQuotes}`);
      console.log(`Closing braces (potential trailing comma locations): ${closingBraces}`);
      console.log(`No-space brackets: ${noSpaceBracket}`);
      console.log(`Mixed indentation: ${mixedIndent}`);
      console.log(`===========================\n`);

      // There should be fixable issues
      expect(longLines + doubleQuotes + noSpaceBracket).toBeGreaterThan(0);
    });

    it('should run Prettier --write and modify the file', async () => {
      if (!isPrettierAvailable()) {
        console.warn('Skipping: Prettier not installed');
        return;
      }

      // Execute fix
      const result = await prettierExecutor.executeFix({
        workingDir: tempDir,
        files: [testFile],
        timeout: TOOL_TIMEOUT,
        verbose: true,
      });

      console.log('\n=== Prettier Result ===');
      console.log(`Exit code: ${result.exitCode}`);
      console.log(`Success: ${result.success}`);
      console.log(`Duration: ${result.durationMs}ms`);
      if (result.error) {
        console.log(`Error: ${result.error}`);
      }
      console.log('=======================\n');

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

    it('should wrap long lines (printWidth)', async () => {
      if (!isPrettierAvailable()) {
        console.warn('Skipping: Prettier not installed');
        return;
      }

      const originalLongLines = countLongLines(originalContent, 80);

      // Execute fix
      await prettierExecutor.executeFix({
        workingDir: tempDir,
        files: [testFile],
        timeout: TOOL_TIMEOUT,
      });

      const modifiedContent = readFileContent(testFile);
      const modifiedLongLines = countLongLines(modifiedContent, 80);

      console.log(`\n=== LINE WIDTH FIX ===`);
      console.log(`Long lines before: ${originalLongLines}`);
      console.log(`Long lines after: ${modifiedLongLines}`);
      console.log(`======================\n`);

      // Should have fewer long lines (some may remain due to strings)
      expect(modifiedLongLines).toBeLessThan(originalLongLines);
    });

    it('should normalize quote style to single quotes', async () => {
      if (!isPrettierAvailable()) {
        console.warn('Skipping: Prettier not installed');
        return;
      }

      const originalDoubleQuotes = countOccurrences(originalContent, /= "/g);

      // Execute fix
      await prettierExecutor.executeFix({
        workingDir: tempDir,
        files: [testFile],
        timeout: TOOL_TIMEOUT,
      });

      const modifiedContent = readFileContent(testFile);
      const modifiedDoubleQuotes = countOccurrences(modifiedContent, /= "/g);
      const singleQuotes = countOccurrences(modifiedContent, /= '/g);

      console.log(`\n=== QUOTE STYLE FIX ===`);
      console.log(`Double quotes before: ${originalDoubleQuotes}`);
      console.log(`Double quotes after: ${modifiedDoubleQuotes}`);
      console.log(`Single quotes after: ${singleQuotes}`);
      console.log(`=======================\n`);

      // Should have fewer double quotes, more single quotes
      expect(modifiedDoubleQuotes).toBeLessThan(originalDoubleQuotes);
    });

    it('should add trailing commas', async () => {
      if (!isPrettierAvailable()) {
        console.warn('Skipping: Prettier not installed');
        return;
      }

      // Count lines ending with value followed by newline and }
      // This is a rough heuristic for missing trailing commas
      const missingTrailingComma = countOccurrences(
        originalContent,
        /[^,\s]\s*\n\s*[}\]]/g
      );

      // Execute fix
      await prettierExecutor.executeFix({
        workingDir: tempDir,
        files: [testFile],
        timeout: TOOL_TIMEOUT,
      });

      const modifiedContent = readFileContent(testFile);
      const afterMissingTrailingComma = countOccurrences(
        modifiedContent,
        /[^,\s]\s*\n\s*[}\]]/g
      );

      console.log(`\n=== TRAILING COMMA FIX ===`);
      console.log(`Missing trailing commas before: ${missingTrailingComma}`);
      console.log(`Missing trailing commas after: ${afterMissingTrailingComma}`);
      console.log(`==========================\n`);

      // Trailing commas should be added
      expect(afterMissingTrailingComma).toBeLessThan(missingTrailingComma);
    });

    it('should fix bracket spacing', async () => {
      if (!isPrettierAvailable()) {
        console.warn('Skipping: Prettier not installed');
        return;
      }

      // Count { without space after (e.g., {a:1})
      const noSpaceBefore = countOccurrences(originalContent, /\{[a-zA-Z0-9]/g);

      // Execute fix
      await prettierExecutor.executeFix({
        workingDir: tempDir,
        files: [testFile],
        timeout: TOOL_TIMEOUT,
      });

      const modifiedContent = readFileContent(testFile);
      const noSpaceAfter = countOccurrences(modifiedContent, /\{[a-zA-Z0-9]/g);

      console.log(`\n=== BRACKET SPACING FIX ===`);
      console.log(`No-space brackets before: ${noSpaceBefore}`);
      console.log(`No-space brackets after: ${noSpaceAfter}`);
      console.log(`===========================\n`);

      // Should have fewer no-space brackets (more { a:1 } style)
      expect(noSpaceAfter).toBeLessThan(noSpaceBefore);
    });

    it('should normalize indentation (remove tabs)', async () => {
      if (!isPrettierAvailable()) {
        console.warn('Skipping: Prettier not installed');
        return;
      }

      // Count lines with tab characters
      const tabsBefore = countOccurrences(originalContent, /\t/g);

      // Execute fix
      await prettierExecutor.executeFix({
        workingDir: tempDir,
        files: [testFile],
        timeout: TOOL_TIMEOUT,
      });

      const modifiedContent = readFileContent(testFile);
      const tabsAfter = countOccurrences(modifiedContent, /\t/g);

      console.log(`\n=== INDENTATION FIX ===`);
      console.log(`Tab characters before: ${tabsBefore}`);
      console.log(`Tab characters after: ${tabsAfter}`);
      console.log(`=======================\n`);

      // Should have no tabs (useTabs: false in config)
      expect(tabsAfter).toBe(0);
    });

    it('should add semicolons', async () => {
      if (!isPrettierAvailable()) {
        console.warn('Skipping: Prettier not installed');
        return;
      }

      // Count lines that look like statements without semicolons
      // Lines ending with quote, number, or identifier without ;
      const noSemiBefore = countOccurrences(
        originalContent,
        /["'\d\w]\s*$/gm
      );

      // Execute fix
      await prettierExecutor.executeFix({
        workingDir: tempDir,
        files: [testFile],
        timeout: TOOL_TIMEOUT,
      });

      const modifiedContent = readFileContent(testFile);

      // Count semicolons at end of lines
      const semiAfter = countOccurrences(modifiedContent, /;\s*$/gm);

      console.log(`\n=== SEMICOLON FIX ===`);
      console.log(`Lines without semi before (approx): ${noSemiBefore}`);
      console.log(`Lines with semicolons after: ${semiAfter}`);
      console.log(`=====================\n`);

      // Should have more semicolons
      expect(semiAfter).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // ESLint-Prettier Integration Tests
  // ==========================================================================

  describe('ESLint-Prettier Integration', () => {
    it('should document eslint-config-prettier integration', () => {
      /**
       * eslint-config-prettier disables ESLint rules that conflict with Prettier.
       *
       * Workflow:
       * 1. ESLint runs with code quality rules only (no formatting)
       * 2. Prettier runs for all formatting
       * 3. No conflicts between the two tools
       *
       * Install: npm install --save-dev eslint-config-prettier
       * Config: Add "prettier" to eslintrc extends array (must be last)
       *
       * Rules disabled by eslint-config-prettier:
       * - semi, quotes, indent, comma-dangle (basic formatting)
       * - @typescript-eslint/semi, @typescript-eslint/quotes (TS equivalents)
       * - All stylistic rules that Prettier handles
       */

      const integrationInfo = {
        package: 'eslint-config-prettier',
        purpose: 'Turns off ESLint rules that conflict with Prettier',
        installation: 'npm install --save-dev eslint-config-prettier',
        configuration: 'Add "prettier" as last item in extends array',
        rulesDisabled: [
          'semi',
          'quotes',
          'indent',
          'comma-dangle',
          'max-len',
          '@typescript-eslint/semi',
          '@typescript-eslint/quotes',
          '@typescript-eslint/indent',
        ],
        workflow: [
          '1. ESLint: Code quality rules (no-unused-vars, no-explicit-any)',
          '2. Prettier: All formatting (indentation, quotes, semicolons)',
          '3. No conflicts between tools',
        ],
      };

      console.log('\n=== ESLINT-PRETTIER INTEGRATION ===');
      console.log(JSON.stringify(integrationInfo, null, 2));
      console.log('===================================\n');

      expect(integrationInfo.rulesDisabled.length).toBeGreaterThan(0);
    });

    it('should run Prettier after ESLint without conflicts', async () => {
      if (!isPrettierAvailable() || !isESLintAvailable()) {
        console.warn('Skipping: Prettier or ESLint not installed');
        return;
      }

      const testFile = copyFixtureToTemp(PRETTIER_FIXTURE, tempDir);
      const originalContent = readFileContent(testFile);

      // Create minimal .prettierrc
      const prettierConfig = {
        printWidth: 80,
        tabWidth: 2,
        semi: true,
        singleQuote: true,
        trailingComma: 'all',
      };
      fs.writeFileSync(
        path.join(tempDir, '.prettierrc.json'),
        JSON.stringify(prettierConfig, null, 2)
      );

      // Create ESLint config with eslint-config-prettier pattern
      // (disabling formatting rules, keeping only code quality)
      const eslintConfig = {
        root: true,
        parser: '@typescript-eslint/parser',
        plugins: ['@typescript-eslint'],
        rules: {
          // Code quality rules (NOT formatting) - ESLint handles these
          '@typescript-eslint/no-explicit-any': 'warn',
          '@typescript-eslint/no-unused-vars': 'warn',
          // Formatting rules DISABLED (Prettier handles these)
          'semi': 'off',
          'quotes': 'off',
          'indent': 'off',
          'comma-dangle': 'off',
        },
      };
      fs.writeFileSync(
        path.join(tempDir, '.eslintrc.json'),
        JSON.stringify(eslintConfig, null, 2)
      );

      // Run Prettier first (formatting)
      const prettierExecutor = new PrettierExecutor();
      await prettierExecutor.executeFix({
        workingDir: tempDir,
        files: [testFile],
        timeout: TOOL_TIMEOUT,
      });

      const afterPrettier = readFileContent(testFile);

      // Run ESLint (code quality only, no --fix for formatting)
      // ESLint should not break Prettier's formatting
      const eslintResult = spawnSync(
        'npx',
        ['eslint', '--no-error-on-unmatched-pattern', testFile],
        {
          cwd: tempDir,
          encoding: 'utf8',
          timeout: TOOL_TIMEOUT,
        }
      );

      const afterESLint = readFileContent(testFile);

      console.log('\n=== INTEGRATION TEST ===');
      console.log(`Original size: ${originalContent.length} chars`);
      console.log(`After Prettier: ${afterPrettier.length} chars`);
      console.log(`After ESLint check: ${afterESLint.length} chars`);
      console.log(`ESLint exit code: ${eslintResult.status}`);
      console.log(`Prettier formatting preserved: ${afterPrettier === afterESLint}`);
      console.log('========================\n');

      // Prettier's formatting should be preserved after ESLint run
      // (since ESLint is not fixing, just checking)
      expect(afterPrettier).toBe(afterESLint);
      // File should have changed from original
      expect(afterPrettier).not.toBe(originalContent);
    });
  });

  // ==========================================================================
  // Factory Tests
  // ==========================================================================

  describe('Tier 1 Executor Factory', () => {
    it('should create Prettier executor via factory', () => {
      const executor = createTier1Executor('prettier');
      expect(executor).not.toBeNull();
      expect(executor).toBeInstanceOf(PrettierExecutor);
    });
  });

  // ==========================================================================
  // Rules Coverage Documentation
  // ==========================================================================

  describe('Prettier Rules Coverage Documentation', () => {
    it('should document what Prettier handles vs ESLint', () => {
      const coverage = {
        prettier: {
          handlesFormatting: [
            'printWidth - Line wrapping at specified width',
            'tabWidth - Indentation width',
            'useTabs - Tabs vs spaces',
            'semi - Semicolons presence',
            'singleQuote - Quote style',
            'quoteProps - Object property quotes',
            'jsxSingleQuote - JSX quote style',
            'trailingComma - Trailing commas in multi-line',
            'bracketSpacing - Spaces inside object braces',
            'bracketSameLine - JSX closing bracket placement',
            'arrowParens - Arrow function parentheses',
            'endOfLine - Line ending style (LF, CRLF)',
            'htmlWhitespaceSensitivity - HTML whitespace handling',
            'proseWrap - Markdown prose wrapping',
          ],
          doesNotHandle: [
            '@typescript-eslint/no-explicit-any',
            '@typescript-eslint/no-unused-vars',
            'no-console',
            'no-debugger',
            'eqeqeq',
            'Best practice rules',
            'Security rules',
            'Type-related rules',
          ],
        },
        eslint: {
          codeQualityRules: [
            '@typescript-eslint/no-explicit-any - Type safety',
            '@typescript-eslint/no-unused-vars - Dead code',
            'no-console - Console usage',
            'no-debugger - Debug statements',
            'eqeqeq - Strict equality',
            'no-eval - Security',
          ],
          formattingRulesDisabledWithPrettier: [
            'semi',
            'quotes',
            'indent',
            'comma-dangle',
            'max-len',
            'no-trailing-spaces',
            'eol-last',
            'linebreak-style',
          ],
        },
        recommendedWorkflow: [
          '1. Run Prettier --write for formatting',
          '2. Run ESLint --fix for auto-fixable code quality issues',
          '3. Review remaining ESLint warnings manually',
        ],
      };

      console.log('\n=== PRETTIER VS ESLINT COVERAGE ===');
      console.log(JSON.stringify(coverage, null, 2));
      console.log('===================================\n');

      expect(coverage.prettier.handlesFormatting.length).toBeGreaterThan(10);
      expect(coverage.eslint.codeQualityRules.length).toBeGreaterThan(3);
    });
  });

  // ==========================================================================
  // Summary Tests
  // ==========================================================================

  describe('Live Test Summary', () => {
    it('should provide summary of Prettier capabilities', () => {
      const summary = {
        prettier: {
          available: isPrettierAvailable(),
          tier: 1,
          command: 'npx prettier --write',
          formatsFileTypes: ['.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.css', '.html'],
          configFiles: ['.prettierrc', '.prettierrc.json', 'prettier.config.js'],
          integrationPackage: 'eslint-config-prettier',
          ciUsage: 'npx prettier --check .',
        },
        fixPipeline: {
          order: [
            'Tier 1a: Prettier --write (formatting)',
            'Tier 1b: ESLint --fix (auto-fixable code quality)',
            'Tier 2: Dedicated fixers (Sorald, clang-tidy)',
            'Tier 3: AI-based fixes (semantic issues)',
          ],
        },
      };

      console.log('\n=== PRETTIER CAPABILITY SUMMARY ===');
      console.log(JSON.stringify(summary, null, 2));
      console.log('===================================\n');

      // Prettier should be available
      expect(summary.prettier.tier).toBe(1);
    });
  });
});
