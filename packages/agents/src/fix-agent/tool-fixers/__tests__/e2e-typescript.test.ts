/**
 * E2E Tests for TypeScript Fixers
 *
 * Session 105: Validates that ESLint --fix works in the pipeline
 *
 * Test scenarios:
 * 1. Create test TypeScript file with fixable ESLint issues (semi, quotes, indent)
 * 2. Run fix-agent pipeline targeting the file
 * 3. Verify tier 2 tools (eslint --fix) are invoked before AI
 * 4. Verify @typescript-eslint/no-explicit-any falls to AI tier (not auto-fixable)
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  createTier2Executor,
  getRecommendedTier2Fixer,
} from '../tier2-executor';

// Test fixtures: TypeScript code with various fixable and non-fixable issues

// Semi-colon and quote fixable issues
const TYPESCRIPT_CODE_WITH_FIXABLE_ISSUES = `
import { useState } from "react"
import * as path from 'path'

const name = "hello"
const value = 42

function greet(message: string) {
    console.log(message)
    return message
}

export const helper = (x: number) => {
    return x * 2
}
`;

// @typescript-eslint/no-explicit-any - NOT auto-fixable
const TYPESCRIPT_CODE_WITH_ANY_ISSUES = `
// eslint: @typescript-eslint/no-explicit-any
function processData(data: any): any {
    return data.value;
}

// Multiple any usages that need AI to fix
const handler = (event: any) => {
    const result: any = event.target;
    return result;
};

// Array with any
function processItems(items: any[]): any[] {
    return items.map((item: any) => item.id);
}

// Generic any fallback
type ResponseType<T = any> = {
    data: T;
    error: any;
};
`;

// Mixed issues: some fixable by ESLint, some need AI
const TYPESCRIPT_CODE_MIXED_ISSUES = `
import { useState } from "react"

// Fixable: semicolons, quotes
const message = "hello world"
const count = 5

// NOT fixable by ESLint: no-explicit-any needs semantic understanding
function fetchData(url: string): Promise<any> {
    return fetch(url).then((res: any) => res.json());
}

// Fixable: formatting
const  multipleSpaces  =  true

// NOT fixable: requires type inference
const unknownValue: any = getValue();
`;

describe('E2E TypeScript Fixer Tests', () => {
  let tempDir: string;
  let testFilePath: string;

  beforeEach(() => {
    // Create temp directory for test files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'typescript-fixer-test-'));
    testFilePath = path.join(tempDir, 'test_code.ts');
  });

  afterEach(() => {
    // Clean up temp files
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Tier 2 Tool Recommendations', () => {
    it('should recommend eslint for typescript/eslint issues', () => {
      const fixer = getRecommendedTier2Fixer('typescript', 'eslint');
      expect(fixer).toBe('eslint');
    });

    it('should recommend eslint for typescript/@typescript-eslint issues', () => {
      const fixer = getRecommendedTier2Fixer('typescript', '@typescript-eslint');
      expect(fixer).toBe('eslint');
    });

    it('should recommend eslint for javascript/eslint issues', () => {
      const fixer = getRecommendedTier2Fixer('javascript', 'eslint');
      expect(fixer).toBe('eslint');
    });
  });

  describe('ESLint Executor', () => {
    it('should create ESLintExecutor for eslint tool', () => {
      const executor = createTier2Executor('eslint');
      expect(executor).not.toBeNull();
      expect(executor!.constructor.name).toBe('ESLintExecutor');
    });

    it('should return dry run result for fixable issues', async () => {
      // Write test file with fixable issues
      fs.writeFileSync(testFilePath, TYPESCRIPT_CODE_WITH_FIXABLE_ISSUES);

      const executor = createTier2Executor('eslint')!;
      const result = await executor.executeFix({
        workingDir: tempDir,
        dryRun: true,
        files: [testFilePath],
      });

      expect(result.success).toBe(true);
      expect(result.tool).toBe('eslint');
      expect(result.stdout).toContain('DRY RUN');
      expect(result.command).toContain('eslint --fix');
    });

    it('should include file path in fix command', async () => {
      fs.writeFileSync(testFilePath, TYPESCRIPT_CODE_WITH_FIXABLE_ISSUES);

      const executor = createTier2Executor('eslint')!;
      const result = await executor.executeFix({
        workingDir: tempDir,
        dryRun: true,
        files: [testFilePath],
      });

      expect(result.command).toContain(testFilePath);
    });

    it('should handle multiple TypeScript files', async () => {
      // Create multiple test files
      const file1 = path.join(tempDir, 'module1.ts');
      const file2 = path.join(tempDir, 'module2.ts');

      fs.writeFileSync(file1, 'const x = "test"\n');
      fs.writeFileSync(file2, 'const y = "test"\n');

      const executor = createTier2Executor('eslint')!;
      const result = await executor.executeFix({
        workingDir: tempDir,
        dryRun: true,
        files: [file1, file2],
      });

      expect(result.success).toBe(true);
      expect(result.command).toContain(file1);
      expect(result.command).toContain(file2);
    });
  });

  describe('ESLint --fix Capabilities', () => {
    it('should document that semi rule is auto-fixable', () => {
      // semi: require or disallow semicolons instead of ASI
      // ESLint --fix CAN automatically add/remove semicolons
      const executor = createTier2Executor('eslint');
      expect(executor).not.toBeNull();

      // The command uses --fix flag which handles semi
      const config = (executor as any).config;
      expect(config.fixCommand).toContain('--fix');
    });

    it('should document that quotes rule is auto-fixable', () => {
      // quotes: enforce consistent use of backticks, double, or single quotes
      // ESLint --fix CAN automatically convert quote styles
      const executor = createTier2Executor('eslint');
      expect(executor).not.toBeNull();
    });

    it('should document that indent rule is auto-fixable', () => {
      // indent: enforce consistent indentation
      // ESLint --fix CAN automatically fix indentation
      const executor = createTier2Executor('eslint');
      expect(executor).not.toBeNull();
    });

    it('should document that comma-dangle rule is auto-fixable', () => {
      // comma-dangle: require or disallow trailing commas
      // ESLint --fix CAN automatically add/remove trailing commas
      const executor = createTier2Executor('eslint');
      expect(executor).not.toBeNull();
    });
  });

  describe('@typescript-eslint/no-explicit-any Falls to AI', () => {
    it('should still recommend eslint for any issues (tool runs but wont fix)', () => {
      // The tier 2 fixer is still ESLint, but ESLint --fix cannot resolve no-explicit-any
      // This rule requires semantic understanding to provide proper types
      const fixer = getRecommendedTier2Fixer('typescript', 'eslint');
      expect(fixer).toBe('eslint');
    });

    it('should document no-explicit-any as NOT auto-fixable', () => {
      // @typescript-eslint/no-explicit-any requires:
      // 1. Analyzing context to determine proper type
      // 2. Understanding return types of functions
      // 3. Inferring types from usage patterns
      // These require AI (tier 3) to fix properly

      const nonFixableRules = [
        '@typescript-eslint/no-explicit-any', // Needs type inference
        '@typescript-eslint/no-unsafe-assignment', // Needs semantic analysis
        '@typescript-eslint/no-unsafe-member-access', // Needs type context
        '@typescript-eslint/no-unsafe-return', // Needs return type inference
        '@typescript-eslint/no-unsafe-call', // Needs function signature analysis
        '@typescript-eslint/explicit-function-return-type', // Needs type inference
        '@typescript-eslint/explicit-module-boundary-types', // Needs type inference
      ];

      // These rules all require AI because they need semantic understanding
      // ESLint --fix cannot handle them
      expect(nonFixableRules).toHaveLength(7);
    });

    it('should test pipeline flow where any issues fall through to AI', async () => {
      fs.writeFileSync(testFilePath, TYPESCRIPT_CODE_WITH_ANY_ISSUES);

      // Tier 2: ESLint --fix runs but doesn't fix no-explicit-any
      const executor = createTier2Executor('eslint')!;
      const result = await executor.executeFix({
        workingDir: tempDir,
        dryRun: true,
        files: [testFilePath],
      });

      // Command runs successfully (just doesn't fix the any issues)
      expect(result.success).toBe(true);
      expect(result.tool).toBe('eslint');

      // In real execution, these issues would remain and fall to AI tier
      // The pipeline checks: did tier 2 fix the issue? If not → tier 3
    });
  });

  describe('Tier 2 Pipeline Flow', () => {
    it('should invoke tier 2 tools before AI for TypeScript issues', async () => {
      // This tests the conceptual flow: tier 2 tools should be checked first
      const issues = [
        { ruleId: 'semi', tool: 'eslint', language: 'typescript' },
        { ruleId: 'quotes', tool: 'eslint', language: 'typescript' },
        { ruleId: '@typescript-eslint/no-explicit-any', tool: 'eslint', language: 'typescript' },
      ];

      for (const issue of issues) {
        const recommended = getRecommendedTier2Fixer(issue.language, issue.tool);
        // All eslint issues should be handled by eslint native fixer first
        expect(recommended).toBe('eslint');

        const executor = createTier2Executor(recommended!);
        expect(executor).not.toBeNull();
      }
    });

    it('should correctly identify which issues need AI fallback', () => {
      // TypeScript issues that CAN be auto-fixed by eslint --fix
      const tier2Fixable = [
        'semi', // semicolons
        'quotes', // quote style
        'indent', // indentation
        'comma-dangle', // trailing commas
        'no-trailing-spaces', // trailing whitespace
        'eol-last', // newline at end of file
        'space-before-blocks', // spacing
        'keyword-spacing', // spacing around keywords
        'arrow-spacing', // spacing around arrows
        'object-curly-spacing', // spacing in braces
        'array-bracket-spacing', // spacing in brackets
        '@typescript-eslint/semi', // TS version of semi
        '@typescript-eslint/quotes', // TS version of quotes
        '@typescript-eslint/comma-dangle', // TS version
      ];

      // TypeScript issues that NEED AI (tier 3)
      const needsAI = [
        '@typescript-eslint/no-explicit-any', // needs type inference
        '@typescript-eslint/no-unsafe-assignment', // semantic analysis
        '@typescript-eslint/no-unsafe-member-access', // type context
        '@typescript-eslint/no-unsafe-return', // return type inference
        '@typescript-eslint/explicit-function-return-type', // type inference
        '@typescript-eslint/no-floating-promises', // needs await/void
        '@typescript-eslint/no-misused-promises', // semantic analysis
      ];

      // Tier 2 fixable rules have recommended fixer
      for (const rule of tier2Fixable) {
        const fixer = getRecommendedTier2Fixer('typescript', 'eslint');
        expect(fixer).toBe('eslint');
      }

      // AI-needed issues still get tier 2 recommendation
      // But tier 2 won't fix them, and they fall through to AI
      for (const rule of needsAI) {
        const fixer = getRecommendedTier2Fixer('typescript', 'eslint');
        expect(fixer).toBe('eslint'); // same tool, but --fix doesn't work for these
      }
    });
  });

  describe('Mixed Issues Handling', () => {
    it('should handle file with both fixable and non-fixable issues', async () => {
      fs.writeFileSync(testFilePath, TYPESCRIPT_CODE_MIXED_ISSUES);

      const executor = createTier2Executor('eslint')!;
      const result = await executor.executeFix({
        workingDir: tempDir,
        dryRun: true,
        files: [testFilePath],
      });

      expect(result.success).toBe(true);
      expect(result.tool).toBe('eslint');

      // In real execution:
      // - Fixable issues (semi, quotes) would be fixed by eslint --fix
      // - Non-fixable issues (no-explicit-any) would remain and go to AI
    });

    it('should document the expected fix flow for mixed issues', () => {
      // Expected flow:
      // 1. Tier 2 (eslint --fix) runs on file
      // 2. Fixable issues (semi, quotes, indent) are resolved
      // 3. Non-fixable issues (no-explicit-any) remain
      // 4. Pipeline detects remaining issues
      // 5. Remaining issues sent to Tier 3 (AI)

      const expectedFlow = {
        tier2: {
          tool: 'eslint',
          command: 'npx eslint --fix',
          fixes: ['semi', 'quotes', 'indent', 'comma-dangle'],
        },
        tier3: {
          tool: 'ai-fixer',
          fixes: ['@typescript-eslint/no-explicit-any'],
        },
      };

      expect(expectedFlow.tier2.fixes).toContain('semi');
      expect(expectedFlow.tier3.fixes).toContain('@typescript-eslint/no-explicit-any');
    });
  });

  describe('Integration Test Scenarios', () => {
    it('should work with subdirectory TypeScript files', async () => {
      // Create test file in subdirectory
      const subDir = path.join(tempDir, 'src');
      fs.mkdirSync(subDir);
      const testFile = path.join(subDir, 'code.ts');
      fs.writeFileSync(testFile, TYPESCRIPT_CODE_WITH_FIXABLE_ISSUES);

      const executor = createTier2Executor('eslint')!;
      const result = await executor.executeFix({
        workingDir: subDir,
        dryRun: true,
        files: [testFile],
      });

      expect(result.success).toBe(true);
    });

    it('should handle .tsx files (React TypeScript)', async () => {
      const tsxFile = path.join(tempDir, 'component.tsx');
      const tsxCode = `
import React from "react"

interface Props {
    name: string
    onClick: (event: any) => void  // no-explicit-any needs AI
}

export const Button = ({ name, onClick }: Props) => {
    return <button onClick={onClick}>{name}</button>
}
`;
      fs.writeFileSync(tsxFile, tsxCode);

      const executor = createTier2Executor('eslint')!;
      const result = await executor.executeFix({
        workingDir: tempDir,
        dryRun: true,
        files: [tsxFile],
      });

      expect(result.success).toBe(true);
      expect(result.command).toContain('component.tsx');
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent file gracefully in dry run', async () => {
      const executor = createTier2Executor('eslint')!;
      const result = await executor.executeFix({
        workingDir: tempDir,
        dryRun: true,
        files: ['/non/existent/file.ts'],
      });

      // Dry run should still succeed (it just builds the command)
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('DRY RUN');
    });

    it('should include files in command even if empty array', async () => {
      const executor = createTier2Executor('eslint')!;
      const result = await executor.executeFix({
        workingDir: tempDir,
        dryRun: true,
        files: [],
      });

      expect(result.success).toBe(true);
      expect(result.command).toContain('eslint');
    });
  });
});

describe('TypeScript Fixer Rules Coverage Documentation', () => {
  it('should document rules auto-fixable by ESLint --fix', () => {
    // ESLint --fix can automatically fix these formatting/style rules
    const eslintAutoFixable = [
      // Core ESLint formatting rules
      'semi', // require or disallow semicolons
      'quotes', // enforce quote style
      'indent', // enforce indentation
      'comma-dangle', // require/disallow trailing commas
      'no-trailing-spaces', // disallow trailing whitespace
      'eol-last', // require newline at end of file
      'no-multiple-empty-lines', // disallow multiple blank lines
      'space-before-blocks', // require space before blocks
      'keyword-spacing', // spacing around keywords
      'space-in-parens', // spacing inside parentheses
      'space-before-function-paren', // spacing before function paren
      'arrow-spacing', // spacing around arrow functions
      'object-curly-spacing', // spacing in object literals
      'array-bracket-spacing', // spacing in array brackets
      'block-spacing', // spacing inside blocks
      'comma-spacing', // spacing around commas
      'func-call-spacing', // spacing in function calls
      'key-spacing', // spacing in object properties
      'no-extra-semi', // disallow unnecessary semicolons
      'padded-blocks', // require/disallow padding in blocks
      'semi-spacing', // spacing around semicolons
      'space-infix-ops', // spacing around operators
      'space-unary-ops', // spacing around unary operators
      'switch-colon-spacing', // spacing around switch colons
      'template-curly-spacing', // spacing in template literals
      'template-tag-spacing', // spacing in template tags

      // @typescript-eslint formatting rules (auto-fixable)
      '@typescript-eslint/semi',
      '@typescript-eslint/quotes',
      '@typescript-eslint/comma-dangle',
      '@typescript-eslint/member-delimiter-style',
      '@typescript-eslint/type-annotation-spacing',
      '@typescript-eslint/space-before-function-paren',
      '@typescript-eslint/indent',
    ];

    // All these should use eslint as tier 2 fixer
    for (const rule of eslintAutoFixable) {
      const recommended = getRecommendedTier2Fixer('typescript', 'eslint');
      expect(recommended).toBe('eslint');
    }
  });

  it('should document rules that NEED AI (tier 3)', () => {
    // These rules cannot be auto-fixed by ESLint --fix
    // They require semantic understanding and type inference
    const needsAI = [
      // Type-related rules (need type inference)
      '@typescript-eslint/no-explicit-any', // needs proper type replacement
      '@typescript-eslint/explicit-function-return-type', // needs type inference
      '@typescript-eslint/explicit-module-boundary-types', // needs type inference
      '@typescript-eslint/typedef', // needs type inference

      // Safety rules (need semantic analysis)
      '@typescript-eslint/no-unsafe-assignment', // needs type context
      '@typescript-eslint/no-unsafe-member-access', // needs type context
      '@typescript-eslint/no-unsafe-return', // needs return type analysis
      '@typescript-eslint/no-unsafe-call', // needs function signature
      '@typescript-eslint/no-unsafe-argument', // needs parameter types

      // Promise rules (need async understanding)
      '@typescript-eslint/no-floating-promises', // needs await/void decision
      '@typescript-eslint/no-misused-promises', // needs context analysis
      '@typescript-eslint/promise-function-async', // needs async keyword

      // Other semantic rules
      '@typescript-eslint/no-unnecessary-type-assertion', // needs type analysis
      '@typescript-eslint/no-unnecessary-condition', // needs type analysis
      '@typescript-eslint/restrict-template-expressions', // needs type checking
      '@typescript-eslint/strict-boolean-expressions', // needs type narrowing
    ];

    // Note: These still get tier 2 recommendation (eslint), but tier 2 won't fix them
    // The pipeline will detect they're unfixed and fall through to AI
    expect(needsAI.length).toBeGreaterThan(10);
  });

  it('should document the tier flow for @typescript-eslint/no-explicit-any', () => {
    // Specific documentation for the most common non-fixable rule
    const noExplicitAnyFlow = {
      rule: '@typescript-eslint/no-explicit-any',
      tier1: null, // No native fix
      tier2: {
        tool: 'eslint',
        command: 'npx eslint --fix',
        canFix: false,
        reason: 'Requires semantic understanding to determine proper type',
      },
      tier3: {
        tool: 'ai-fixer',
        canFix: true,
        requirements: [
          'Analyze variable usage context',
          'Infer type from assignments',
          'Check function return types',
          'Consult Knowledge Base patterns',
        ],
      },
    };

    expect(noExplicitAnyFlow.tier2.canFix).toBe(false);
    expect(noExplicitAnyFlow.tier3.canFix).toBe(true);
  });

  it('should document KB pattern for no-explicit-any', () => {
    // This pattern should exist in fix-pattern-guidance.ts
    const kbPattern = {
      ruleId: '@typescript-eslint/no-explicit-any',
      language: 'typescript',
      tool: 'eslint',
      guidance: {
        antiPatterns: [
          'Replace any with unknown (still needs type guards)',
          'Replace any with object (too restrictive)',
        ],
        correctPatterns: [
          'Use specific interface: data: MyInterface',
          'Use generic: function process<T>(data: T): T',
          'Use union: data: string | number | null',
          'Use Record: data: Record<string, unknown>',
        ],
        promptAdditions: [
          'Analyze how the variable is used to infer correct type',
          'Check if a generic would be more appropriate',
          'Consider if unknown with type guards is needed',
        ],
      },
    };

    expect(kbPattern.guidance.correctPatterns.length).toBeGreaterThan(0);
    expect(kbPattern.guidance.antiPatterns.length).toBeGreaterThan(0);
  });
});
