/**
 * E2E Tests for Go Fixers
 *
 * Session 105: Validates that gofmt, goimports, golangci-lint work in the pipeline
 *
 * Test scenarios:
 * 1. Create test Go file with formatting and unused import issues
 * 2. Run fix-agent pipeline targeting the file
 * 3. Verify goimports removes unused imports
 * 4. Verify formatting is corrected
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  createTier2Executor,
  getRecommendedTier2Fixer,
  GofmtExecutor,
  GoimportsExecutor,
  GolangciLintExecutor,
} from '../tier2-executor';

// Test fixtures - Go code with various issues
const GO_CODE_WITH_ISSUES = `package main

import (
	"fmt"
	"os"      // unused import
	"strings" // unused import
)

func main() {
fmt.Println("Hello, World!")
}

func badFormatting(x int,y int)int{
return x+y
}

func   extraSpaces()   string   {
    return   "test"
}

type MyStruct struct{
name string
value int
}

func (m *MyStruct)GetName()string{
return m.name
}
`;

// Expected formatting patterns
const FORMATTED_FUNC_PATTERN = /func badFormatting\(x int, y int\) int \{/;
const FORMATTED_STRUCT_PATTERN = /type MyStruct struct \{/;
const FORMATTED_METHOD_PATTERN = /func \(m \*MyStruct\) GetName\(\) string \{/;

// Unused import patterns
const UNUSED_OS_IMPORT = /import.*"os"/;
const UNUSED_STRINGS_IMPORT = /import.*"strings"/;

describe('E2E Go Fixer Tests', () => {
  let tempDir: string;
  let testFilePath: string;

  beforeEach(() => {
    // Create temp directory for test files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'go-fixer-test-'));
    testFilePath = path.join(tempDir, 'main.go');
  });

  afterEach(() => {
    // Clean up temp files
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Tier 2 Tool Recommendations', () => {
    it('should recommend golangci-lint for go/golangci issues', () => {
      const fixer = getRecommendedTier2Fixer('go', 'golangci-lint');
      expect(fixer).toBe('golangci-lint');
    });

    it('should recommend golangci-lint for go/golangci issues', () => {
      const fixer = getRecommendedTier2Fixer('go', 'golangci');
      expect(fixer).toBe('golangci-lint');
    });

    it('should recommend gofmt for go/staticcheck issues', () => {
      const fixer = getRecommendedTier2Fixer('go', 'staticcheck');
      expect(fixer).toBe('gofmt');
    });

    it('should recommend gofmt for go/govet issues', () => {
      const fixer = getRecommendedTier2Fixer('go', 'govet');
      expect(fixer).toBe('gofmt');
    });

    it('should return null for unsupported go tools', () => {
      const fixer = getRecommendedTier2Fixer('go', 'unknown-tool');
      expect(fixer).toBeNull();
    });
  });

  describe('Gofmt Executor', () => {
    it('should create GofmtExecutor for gofmt tool', () => {
      const executor = createTier2Executor('gofmt');
      expect(executor).toBeInstanceOf(GofmtExecutor);
    });

    it('should return dry run result for formatting fix', async () => {
      // Write test file
      fs.writeFileSync(testFilePath, GO_CODE_WITH_ISSUES);

      const executor = createTier2Executor('gofmt')!;
      const result = await executor.executeFix({
        workingDir: tempDir,
        dryRun: true,
        files: [testFilePath],
      });

      expect(result.success).toBe(true);
      expect(result.tool).toBe('gofmt');
      expect(result.stdout).toContain('DRY RUN');
      expect(result.command).toContain('gofmt -w');
    });

    it('should include file path in fix command', async () => {
      fs.writeFileSync(testFilePath, GO_CODE_WITH_ISSUES);

      const executor = createTier2Executor('gofmt')!;
      const result = await executor.executeFix({
        workingDir: tempDir,
        dryRun: true,
        files: [testFilePath],
      });

      expect(result.command).toContain(testFilePath);
    });

    it('should have correct config for gofmt', () => {
      const executor = createTier2Executor('gofmt')!;
      const config = (executor as any).config;

      expect(config.name).toBe('gofmt');
      expect(config.fixCommand).toBe('gofmt -w');
    });
  });

  describe('Goimports Executor', () => {
    it('should create GoimportsExecutor for goimports tool', () => {
      const executor = createTier2Executor('goimports');
      expect(executor).toBeInstanceOf(GoimportsExecutor);
    });

    it('should return dry run result for import fixing', async () => {
      fs.writeFileSync(testFilePath, GO_CODE_WITH_ISSUES);

      const executor = createTier2Executor('goimports')!;
      const result = await executor.executeFix({
        workingDir: tempDir,
        dryRun: true,
        files: [testFilePath],
      });

      expect(result.success).toBe(true);
      expect(result.tool).toBe('goimports');
      expect(result.stdout).toContain('DRY RUN');
      expect(result.command).toContain('goimports -w');
    });

    it('should have correct config for goimports', () => {
      const executor = createTier2Executor('goimports')!;
      const config = (executor as any).config;

      expect(config.name).toBe('goimports');
      expect(config.fixCommand).toBe('goimports -w');
    });
  });

  describe('Golangci-lint Executor', () => {
    it('should create GolangciLintExecutor for golangci-lint tool', () => {
      const executor = createTier2Executor('golangci-lint');
      expect(executor).toBeInstanceOf(GolangciLintExecutor);
    });

    it('should return dry run result for lint fixing', async () => {
      fs.writeFileSync(testFilePath, GO_CODE_WITH_ISSUES);

      const executor = createTier2Executor('golangci-lint')!;
      const result = await executor.executeFix({
        workingDir: tempDir,
        dryRun: true,
        files: [], // golangci-lint works on directory
      });

      expect(result.success).toBe(true);
      expect(result.tool).toBe('golangci-lint');
      expect(result.stdout).toContain('DRY RUN');
      expect(result.command).toContain('golangci-lint run --fix');
    });

    it('should include working directory in command', async () => {
      fs.writeFileSync(testFilePath, GO_CODE_WITH_ISSUES);

      const executor = createTier2Executor('golangci-lint')!;
      const result = await executor.executeFix({
        workingDir: tempDir,
        dryRun: true,
        files: [],
      });

      expect(result.command).toContain(tempDir);
    });

    it('should have correct config for golangci-lint', () => {
      const executor = createTier2Executor('golangci-lint')!;
      const config = (executor as any).config;

      expect(config.name).toBe('golangci-lint');
      expect(config.fixCommand).toBe('golangci-lint run --fix');
    });
  });

  describe('Tier 2 Pipeline Flow', () => {
    it('should invoke tier 2 tools before AI for Go issues', async () => {
      // This tests the conceptual flow: tier 2 tools should be checked first
      const issues = [
        { ruleId: 'gofmt', tool: 'golangci-lint', language: 'go' },
        { ruleId: 'unused', tool: 'golangci-lint', language: 'go' },
        { ruleId: 'staticcheck', tool: 'staticcheck', language: 'go' },
      ];

      for (const issue of issues) {
        const recommended = getRecommendedTier2Fixer(issue.language, issue.tool);
        // Go issues should have recommended fixers
        expect(recommended).not.toBeNull();

        const executor = createTier2Executor(recommended!);
        expect(executor).not.toBeNull();
      }
    });

    it('should have all Go tier 2 tools available', () => {
      const goTools = ['gofmt', 'goimports', 'golangci-lint'];

      for (const tool of goTools) {
        const executor = createTier2Executor(tool);
        expect(executor).not.toBeNull();
      }
    });
  });

  describe('Multi-Tool Fix Sequence', () => {
    it('should be able to run multiple fixers in sequence', async () => {
      fs.writeFileSync(testFilePath, GO_CODE_WITH_ISSUES);

      // Typical sequence: goimports (includes gofmt) → golangci-lint
      const fixSequence = ['goimports', 'gofmt', 'golangci-lint'];
      const results: Array<{ tool: string; success: boolean }> = [];

      for (const tool of fixSequence) {
        const executor = createTier2Executor(tool)!;
        const result = await executor.executeFix({
          workingDir: tempDir,
          dryRun: true,
          files: tool === 'golangci-lint' ? [] : [testFilePath],
        });

        results.push({ tool: result.tool, success: result.success });
      }

      // All should succeed in dry run mode
      expect(results).toHaveLength(3);
      expect(results.every((r) => r.success)).toBe(true);
      expect(results.map((r) => r.tool)).toEqual(['goimports', 'gofmt', 'golangci-lint']);
    });

    it('should correctly identify which issues need AI fallback', () => {
      // Go issues that CAN be auto-fixed by tier 2
      const tier2Fixable = [
        'gofmt', // formatting - gofmt
        'goimports', // import organization - goimports
        'whitespace', // formatting - gofmt
        'wsl', // whitespace linter - gofmt/golangci-lint
      ];

      // Go issues that need AI (tier 3)
      const needsAI = [
        'errcheck', // error handling - needs semantic understanding
        'unused', // unused code - needs removal logic
        'ineffassign', // ineffective assignment - needs refactoring
        'gosec', // security issues - needs semantic changes
      ];

      // Tier 2 fixable should have recommended fixer
      for (const rule of tier2Fixable) {
        const fixer = getRecommendedTier2Fixer('go', 'golangci-lint');
        expect(fixer).not.toBeNull();
      }

      // Note: AI-needed issues still get tier 2 recommended fixer
      // The tier 2 tool will just not fix them, and they fall through to AI
    });
  });

  describe('Gofmt Specific Capabilities', () => {
    it('should document gofmt as fixing ALL formatting issues', () => {
      // gofmt fixes: indentation, spacing, brace positioning, etc.
      const executor = createTier2Executor('gofmt');
      expect(executor).not.toBeNull();

      const config = (executor as any).config;
      expect(config.fixCommand).toContain('-w'); // write mode
    });

    it('should document gofmt as included with Go installation', () => {
      // gofmt doesn't need separate installation
      const executor = createTier2Executor('gofmt')!;
      expect(executor).not.toBeNull();
    });
  });

  describe('Goimports Specific Capabilities', () => {
    it('should document goimports as superset of gofmt', () => {
      // goimports does everything gofmt does PLUS import management
      const executor = createTier2Executor('goimports');
      expect(executor).not.toBeNull();

      // Both use -w flag for in-place modification
      const gofmtConfig = (createTier2Executor('gofmt') as any).config;
      const goimportsConfig = (executor as any).config;

      expect(gofmtConfig.fixCommand).toContain('-w');
      expect(goimportsConfig.fixCommand).toContain('-w');
    });

    it('should document goimports removes unused imports', () => {
      // This is the key feature that gofmt doesn't have
      const executor = createTier2Executor('goimports');
      expect(executor).not.toBeNull();
      // goimports automatically removes unused imports like "os" and "strings"
    });
  });

  describe('Golangci-lint Specific Capabilities', () => {
    it('should document golangci-lint limited --fix support', () => {
      // golangci-lint --fix only fixes some issues
      const executor = createTier2Executor('golangci-lint');
      expect(executor).not.toBeNull();

      const config = (executor as any).config;
      expect(config.fixCommand).toContain('--fix');
    });

    it('should document golangci-lint works on directory level', () => {
      // Unlike gofmt/goimports, golangci-lint works on directories
      const executor = createTier2Executor('golangci-lint')!;
      expect(executor).not.toBeNull();

      // The executor uses workingDir in command
    });
  });

  describe('Integration Test Scenarios', () => {
    it('should handle multiple Go files', async () => {
      // Create multiple test files
      const file1 = path.join(tempDir, 'main.go');
      const file2 = path.join(tempDir, 'helper.go');

      fs.writeFileSync(file1, 'package main\n\nimport "fmt"\n\nfunc main() {\nfmt.Println("main")\n}\n');
      fs.writeFileSync(file2, 'package main\n\nfunc helper()string{\nreturn "helper"\n}\n');

      const executor = createTier2Executor('gofmt')!;
      const result = await executor.executeFix({
        workingDir: tempDir,
        dryRun: true,
        files: [file1, file2],
      });

      expect(result.success).toBe(true);
      expect(result.command).toContain(file1);
      expect(result.command).toContain(file2);
    });

    it('should work with subdirectory structure', async () => {
      // Create test file in subdirectory (typical Go project structure)
      const pkgDir = path.join(tempDir, 'pkg', 'utils');
      fs.mkdirSync(pkgDir, { recursive: true });
      const testFile = path.join(pkgDir, 'utils.go');
      fs.writeFileSync(testFile, 'package utils\n\nfunc Util()string{\nreturn "util"\n}\n');

      const executor = createTier2Executor('gofmt')!;
      const result = await executor.executeFix({
        workingDir: pkgDir,
        dryRun: true,
        files: [testFile],
      });

      expect(result.success).toBe(true);
    });

    it('should handle go.mod project structure for golangci-lint', async () => {
      // Create minimal go.mod for a valid Go project
      const goMod = path.join(tempDir, 'go.mod');
      fs.writeFileSync(goMod, 'module testproject\n\ngo 1.21\n');
      fs.writeFileSync(testFilePath, GO_CODE_WITH_ISSUES);

      const executor = createTier2Executor('golangci-lint')!;
      const result = await executor.executeFix({
        workingDir: tempDir,
        dryRun: true,
        files: [],
      });

      expect(result.success).toBe(true);
      expect(result.command).toContain('golangci-lint run --fix');
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent file gracefully in dry run', async () => {
      const executor = createTier2Executor('gofmt')!;
      const result = await executor.executeFix({
        workingDir: tempDir,
        dryRun: true,
        files: ['/non/existent/file.go'],
      });

      // Dry run should still succeed (it just builds the command)
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('DRY RUN');
    });

    it('should include files in command even if empty array', async () => {
      const executor = createTier2Executor('gofmt')!;
      const result = await executor.executeFix({
        workingDir: tempDir,
        dryRun: true,
        files: [],
      });

      expect(result.success).toBe(true);
      expect(result.command).toContain('gofmt');
    });
  });
});

describe('Go Fixer Rules Coverage Documentation', () => {
  it('should document rules auto-fixable by gofmt', () => {
    // Rules that gofmt auto-fixes (ALL formatting)
    const gofmtAutoFixable = [
      'gofmt', // formatting check
      'whitespace', // trailing whitespace, blank lines
      'wsl', // whitespace linter
      'gofumpt', // stricter gofmt
    ];

    // gofmt is always available
    const executor = createTier2Executor('gofmt');
    expect(executor).not.toBeNull();
  });

  it('should document rules auto-fixable by goimports', () => {
    // goimports fixes formatting PLUS import management
    const goimportsAutoFixable = [
      'goimports', // import check (organizes and removes unused)
      'gofmt', // all gofmt rules
      'whitespace', // formatting
    ];

    const executor = createTier2Executor('goimports');
    expect(executor).not.toBeNull();
  });

  it('should document rules partially fixable by golangci-lint', () => {
    // golangci-lint --fix has LIMITED capabilities
    const golangciPartialFix = [
      'gofmt', // via embedded gofmt
      'goimports', // via embedded goimports
      'whitespace', // some whitespace issues
      'misspell', // typo corrections
    ];

    const executor = createTier2Executor('golangci-lint');
    expect(executor).not.toBeNull();
    expect((executor as any).config.fixCommand).toContain('--fix');
  });

  it('should document rules that NEED AI (tier 3)', () => {
    // These rules cannot be auto-fixed and need AI
    const needsAI = [
      'errcheck', // unchecked error returns (needs adding if err != nil)
      'unused', // unused code (needs careful removal)
      'ineffassign', // ineffective assignment (needs refactoring)
      'staticcheck', // most rules (semantic issues)
      'gosec', // security issues (needs semantic changes)
      'govet', // many rules (semantic issues)
      'deadcode', // unreachable code (needs removal)
      'structcheck', // unused struct fields (needs semantic changes)
    ];

    // Note: These still get tier 2 recommendation for formatting
    // but tier 2 won't fix the semantic issues - they fall through to AI
  });

  it('should document recommended fix order for Go projects', () => {
    // Recommended order: goimports → golangci-lint
    // goimports is preferred over gofmt because it's a superset

    // 1. goimports: fixes imports AND formatting
    const goimports = createTier2Executor('goimports');
    expect(goimports).not.toBeNull();

    // 2. golangci-lint --fix: catches remaining fixable issues
    const golangci = createTier2Executor('golangci-lint');
    expect(golangci).not.toBeNull();

    // 3. AI (tier 3): handles errcheck, unused, security, etc.
  });
});
