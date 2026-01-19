/**
 * Tier 2 Executor Tests
 *
 * Session 103: Tests for native fixer executors
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
