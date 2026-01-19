/**
 * Tier 2 Executor Tests
 *
 * Session 103: Tests for native fixer executors
 * Session 104: Added tests for clang-tidy, dotnet-format, Sorald
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import {
  createTier2Executor,
  getTier2ToolNames,
  getRecommendedTier2Fixer,
  getInstallInstructions,
  ESLintExecutor,
  RuffExecutor,
  GofmtExecutor,
  GoimportsExecutor,
  GoogleJavaFormatExecutor,
  AutoflakeExecutor,
  BlackExecutor,
  IsortExecutor,
  ClangTidyExecutor,
  ClangFormatExecutor,
  DotnetFormatExecutor,
  SoraldExecutor,
} from '../tier2-executor';

describe('Tier2Executor', () => {
  describe('createTier2Executor', () => {
    it('should create executor for known tools', () => {
      const toolNames = getTier2ToolNames();
      for (const tool of toolNames) {
        const executor = createTier2Executor(tool);
        expect(executor).not.toBeNull();
      }
    });

    it('should return null for unknown tools', () => {
      const executor = createTier2Executor('unknown-tool');
      expect(executor).toBeNull();
    });

    it('should create ESLintExecutor', () => {
      const executor = createTier2Executor('eslint');
      expect(executor).toBeInstanceOf(ESLintExecutor);
    });

    it('should create RuffExecutor', () => {
      const executor = createTier2Executor('ruff');
      expect(executor).toBeInstanceOf(RuffExecutor);
    });

    it('should create RuffExecutor with unsafe fixes', () => {
      const executor = createTier2Executor('ruff-unsafe');
      expect(executor).toBeInstanceOf(RuffExecutor);
    });

    it('should create GofmtExecutor', () => {
      const executor = createTier2Executor('gofmt');
      expect(executor).toBeInstanceOf(GofmtExecutor);
    });

    it('should create GoimportsExecutor', () => {
      const executor = createTier2Executor('goimports');
      expect(executor).toBeInstanceOf(GoimportsExecutor);
    });

    it('should create GoogleJavaFormatExecutor', () => {
      const executor = createTier2Executor('google-java-format');
      expect(executor).toBeInstanceOf(GoogleJavaFormatExecutor);
    });

    it('should create Python tool executors', () => {
      expect(createTier2Executor('autoflake')).toBeInstanceOf(AutoflakeExecutor);
      expect(createTier2Executor('black')).toBeInstanceOf(BlackExecutor);
      expect(createTier2Executor('isort')).toBeInstanceOf(IsortExecutor);
    });

    // Session 104: Tests for newly validated tools
    it('should create ClangTidyExecutor', () => {
      const executor = createTier2Executor('clang-tidy');
      expect(executor).toBeInstanceOf(ClangTidyExecutor);
    });

    it('should create ClangFormatExecutor', () => {
      const executor = createTier2Executor('clang-format');
      expect(executor).toBeInstanceOf(ClangFormatExecutor);
    });

    it('should create DotnetFormatExecutor', () => {
      const executor = createTier2Executor('dotnet-format');
      expect(executor).toBeInstanceOf(DotnetFormatExecutor);
    });

    it('should create SoraldExecutor', () => {
      const executor = createTier2Executor('sorald');
      expect(executor).toBeInstanceOf(SoraldExecutor);
    });
  });

  describe('getTier2ToolNames', () => {
    it('should return all tool names', () => {
      const names = getTier2ToolNames();
      expect(names).toContain('eslint');
      expect(names).toContain('ruff');
      expect(names).toContain('gofmt');
      expect(names).toContain('goimports');
      expect(names).toContain('google-java-format');
      expect(names).toContain('autoflake');
      expect(names).toContain('black');
      expect(names).toContain('isort');
    });

    it('should include Session 102 additions', () => {
      const names = getTier2ToolNames();
      expect(names).toContain('eslint');
      expect(names).toContain('ruff');
      expect(names).toContain('ruff-unsafe');
      expect(names).toContain('golangci-lint');
    });
  });

  describe('getRecommendedTier2Fixer', () => {
    it('should return eslint for typescript/eslint', () => {
      expect(getRecommendedTier2Fixer('typescript', 'eslint')).toBe('eslint');
      expect(getRecommendedTier2Fixer('typescript', '@typescript-eslint')).toBe('eslint');
    });

    it('should return ruff for python/ruff', () => {
      expect(getRecommendedTier2Fixer('python', 'ruff')).toBe('ruff');
    });

    it('should return autoflake for python/flake8', () => {
      expect(getRecommendedTier2Fixer('python', 'flake8')).toBe('autoflake');
    });

    it('should return golangci-lint for go/golangci-lint', () => {
      expect(getRecommendedTier2Fixer('go', 'golangci-lint')).toBe('golangci-lint');
    });

    it('should return null for java/pmd (no native fix)', () => {
      expect(getRecommendedTier2Fixer('java', 'pmd')).toBeNull();
    });

    it('should return google-java-format for java/checkstyle', () => {
      expect(getRecommendedTier2Fixer('java', 'checkstyle')).toBe('google-java-format');
    });

    it('should return null for unknown language', () => {
      expect(getRecommendedTier2Fixer('unknown', 'tool')).toBeNull();
    });

    it('should be case-insensitive', () => {
      expect(getRecommendedTier2Fixer('PYTHON', 'RUFF')).toBe('ruff');
      expect(getRecommendedTier2Fixer('TypeScript', 'ESLint')).toBe('eslint');
    });
  });

  describe('getInstallInstructions', () => {
    it('should return install instructions for known tools', () => {
      expect(getInstallInstructions('autoflake')).toBe('pipx install autoflake');
      expect(getInstallInstructions('goimports')).toContain('go install');
      expect(getInstallInstructions('google-java-format')).toContain('brew install');
    });

    it('should return null for unknown tools', () => {
      expect(getInstallInstructions('unknown-tool')).toBeNull();
    });

    it('should have instructions for all Session 102/103 tools', () => {
      const toolsWithInstructions = [
        'autoflake', 'pyupgrade', 'isort', 'black', 'ruff',
        'gofmt', 'goimports', 'golangci-lint',
        'google-java-format', 'sorald',
        'clang-format', 'clang-tidy',
        'dotnet-format', 'eslint'
      ];

      for (const tool of toolsWithInstructions) {
        const instructions = getInstallInstructions(tool);
        expect(instructions).not.toBeNull();
      }
    });
  });

  describe('Executor dry run', () => {
    it('should return dry run result for ESLint', async () => {
      const executor = createTier2Executor('eslint')!;
      const result = await executor.executeFix({
        workingDir: '/tmp',
        dryRun: true,
        files: ['test.ts'],
      });

      expect(result.success).toBe(true);
      expect(result.tool).toBe('eslint');
      expect(result.stdout).toContain('DRY RUN');
    });

    it('should return dry run result for Ruff', async () => {
      const executor = createTier2Executor('ruff')!;
      const result = await executor.executeFix({
        workingDir: '/tmp',
        dryRun: true,
        files: ['test.py'],
      });

      expect(result.success).toBe(true);
      expect(result.tool).toBe('ruff');
      expect(result.stdout).toContain('DRY RUN');
    });

    it('should return dry run result for gofmt', async () => {
      const executor = createTier2Executor('gofmt')!;
      const result = await executor.executeFix({
        workingDir: '/tmp',
        dryRun: true,
        files: ['test.go'],
      });

      expect(result.success).toBe(true);
      expect(result.tool).toBe('gofmt');
    });

    // Session 104: Dry run tests for newly validated tools
    it('should return dry run result for clang-tidy', async () => {
      const executor = createTier2Executor('clang-tidy')!;
      const result = await executor.executeFix({
        workingDir: '/tmp',
        dryRun: true,
        files: ['test.cpp'],
      });

      expect(result.success).toBe(true);
      expect(result.tool).toBe('clang-tidy');
      expect(result.stdout).toContain('DRY RUN');
    });

    it('should return dry run result for clang-format', async () => {
      const executor = createTier2Executor('clang-format')!;
      const result = await executor.executeFix({
        workingDir: '/tmp',
        dryRun: true,
        files: ['test.cpp'],
      });

      expect(result.success).toBe(true);
      expect(result.tool).toBe('clang-format');
      expect(result.stdout).toContain('DRY RUN');
    });

    it('should return dry run result for dotnet-format', async () => {
      const executor = createTier2Executor('dotnet-format')!;
      const result = await executor.executeFix({
        workingDir: '/tmp/dotnet-test',
        dryRun: true,
        files: [],
      });

      expect(result.success).toBe(true);
      expect(result.tool).toBe('dotnet-format');
      expect(result.stdout).toContain('DRY RUN');
    });

    it('should return dry run result for sorald', async () => {
      const executor = createTier2Executor('sorald')!;
      const result = await executor.executeFix({
        workingDir: '/tmp/java-test',
        dryRun: true,
        files: [],
      });

      expect(result.success).toBe(true);
      expect(result.tool).toBe('sorald');
      expect(result.stdout).toContain('DRY RUN');
    });
  });
});

describe('Tier2 Rules Coverage', () => {
  it('should document rules that can be fixed natively', () => {
    // Python rules fixable by ruff
    const ruffFixableRules = ['F632', 'F401', 'E711', 'E712'];
    for (const rule of ruffFixableRules) {
      // These rules have native fix support
      expect(getRecommendedTier2Fixer('python', 'ruff')).toBe('ruff');
    }
  });

  it('should document rules that need AI (tier 3)', () => {
    // Java PMD rules - no native fix
    const pmdRulesNeedingAI = [
      'UselessParentheses',
      'AvoidDollarSigns',
      'UnnecessaryAnnotationValueElement',
      'UseUtilityClass'
    ];

    // PMD has no auto-fix capability
    expect(getRecommendedTier2Fixer('java', 'pmd')).toBeNull();
  });

  it('should document TypeScript rules needing AI', () => {
    // @typescript-eslint/no-explicit-any is NOT auto-fixable
    // The recommendation returns 'eslint' but eslint cannot fix this rule
    expect(getRecommendedTier2Fixer('typescript', 'eslint')).toBe('eslint');
    // Note: no-explicit-any still needs AI even with eslint --fix
  });
});

// Session 104: Additional rules coverage
describe('Session 104 Tool Capabilities', () => {
  describe('clang-tidy modernize checks', () => {
    it('should document fixable modernize rules', () => {
      // clang-tidy modernize-* rules that can auto-fix
      const fixableModernizeRules = [
        'modernize-use-nullptr',      // 0 -> nullptr
        'modernize-use-override',     // adds override keyword
        'modernize-use-equals-default', // {} -> = default
        'modernize-use-trailing-return-type', // int main() -> auto main() -> int
      ];

      // All these should be handled by clang-tidy
      const executor = createTier2Executor('clang-tidy');
      expect(executor).not.toBeNull();
    });
  });

  describe('Sorald SonarQube rules', () => {
    it('should document Sorald-fixable SonarQube rules', () => {
      // Sorald can fix these SonarQube rules
      const soraldFixableRules = [
        'S1068', // Unused private fields
        'S1132', // String literal on left of equals
        'S1155', // Use isEmpty() instead of size()==0
        'S1481', // Unused local variables
        'S1860', // Synchronization on strings
        'S2095', // Resources should be closed
        'S2142', // InterruptedException handling
        'S2755', // XXE vulnerability
      ];

      const executor = createTier2Executor('sorald');
      expect(executor).not.toBeNull();
    });
  });

  describe('dotnet-format capabilities', () => {
    it('should handle C# formatting', () => {
      // dotnet-format fixes formatting issues
      const executor = createTier2Executor('dotnet-format');
      expect(executor).not.toBeNull();
    });
  });

  describe('getTier2ToolNames includes Session 104 tools', () => {
    it('should include clang-tidy, dotnet-format, sorald', () => {
      const names = getTier2ToolNames();
      expect(names).toContain('clang-tidy');
      expect(names).toContain('clang-format');
      expect(names).toContain('dotnet-format');
      expect(names).toContain('sorald');
    });
  });
});
