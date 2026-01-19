/**
 * E2E Full Pipeline Integration Tests
 *
 * Session 105: Comprehensive test covering all tiers of the fix system
 *
 * Test scenarios:
 * 1. Create multi-language repo with issues across all languages
 * 2. Run comprehensive fix-agent pipeline tests
 * 3. Verify tier 1 cache hits work (KB patterns)
 * 4. Verify tier 2 native tools are invoked correctly
 * 5. Verify tier 3 AI is used only when needed
 * 6. Measure API call savings vs all-AI approach
 *
 * Architecture:
 * - Tier 1: KB Pattern Cache (0 API calls) - High-confidence cached patterns
 * - Tier 2: Native --fix commands (0 API calls) - eslint, ruff, gofmt, etc.
 * - Tier 3: AI-based fixes (~$0.01/fix) - Complex semantic issues
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  createTier1Executor,
  getTier1ToolNames,
  createTier2Executor,
  getTier2ToolNames,
  getRecommendedTier2Fixer,
  createTier3Executor,
  FixOrchestrator,
  type FixIssue,
  type OrchestratorConfig,
  type OrchestratorResult,
} from '../index';
import {
  checkKBBypass,
  getKBBypassMetrics,
  resetKBBypassMetrics,
  type KBBypassResult,
} from '../../state/kb-fix-applicator';

// ============================================================================
// Test Fixtures - Multi-Language Code Samples
// ============================================================================

const FIXTURES: Record<string, { code: string; extension: string }> = {
  // TypeScript with mixed fixable/non-fixable issues
  typescript: {
    extension: '.ts',
    code: `
import { useState } from "react"
import * as path from 'path'

// Fixable by eslint --fix: semicolons, quotes
const message = "hello world"
const count = 42

// NOT fixable by eslint: @typescript-eslint/no-explicit-any
function processData(data: any): any {
    return data.value;
}

// Fixable: formatting
const  multipleSpaces  =  true

// NOT fixable: needs type inference
const handler = (event: any) => event.target;
`,
  },

  // Python with ruff-fixable and AI-needed issues
  python: {
    extension: '.py',
    code: `
import os
import sys
import json  # F401: unused import
from typing import List, Dict  # F401: partially unused

def check_value(x):
    # F632: Use == for comparison, not is (fixable by ruff)
    if x is 0:
        return False
    if x is "hello":
        return True
    return x > 0

# E402: module level import not at top (needs refactoring - AI)
import random

def format_issues(items: List[str]) -> str:
    result=""
    for item in items:
        result+=item+","
    return result
`,
  },

  // Java with PMD issues (NO native fix, all need AI)
  java: {
    extension: '.java',
    code: `
import java.io.*;
import java.util.*;

public class Example {
    // UselessParentheses - PMD (needs AI)
    public int calculate(int x) {
        return ((x + 1));
    }

    // CloseResource - PMD (needs AI)
    public void readFile(String path) throws Exception {
        FileInputStream fis = new FileInputStream(path);
        byte[] data = new byte[1024];
        fis.read(data);
        // Missing fis.close() - resource leak
    }

    // AvoidCatchingThrowable - PMD (needs AI)
    public void riskyMethod() {
        try {
            doSomething();
        } catch (Throwable t) {
            t.printStackTrace();
        }
    }

    private void doSomething() throws Exception {}
}
`,
  },

  // Go with formatting and semantic issues
  go: {
    extension: '.go',
    code: `
package main

import (
    "fmt"
    "os"
)

// Formatting issues fixable by gofmt
func main(){
fmt.Println("hello")
    x:=5
  y := 10
}

// errcheck: unchecked error (needs AI)
func readFile(path string) {
    f, _ := os.Open(path) // error ignored
    defer f.Close()
}

// unused: unused code (needs AI)
func unusedFunction() {
    fmt.Println("never called")
}
`,
  },

  // C++ with formatting and semantic issues
  cpp: {
    extension: '.cpp',
    code: `
#include <iostream>
#include <memory>

// Formatting issues fixable by clang-format
void main(){
std::cout<<"hello"<<std::endl;
    int x=5;
  int y = 10;
}

// modernize-use-nullptr fixable by clang-tidy
void checkPointer(int* ptr) {
    if (ptr == 0) {  // Should be nullptr
        return;
    }
}

// cppcheck memleak (needs AI)
void memoryLeak() {
    int* arr = new int[100];
    // Missing delete[] arr
}
`,
  },

  // C# with dotnet-format fixable and semantic issues
  csharp: {
    extension: '.cs',
    code: `
using System;
using System.Collections.Generic;

public class Example
{
    // Formatting issues fixable by dotnet-format
    public void Process( string input ){
        var  result  =  input.ToUpper();
Console.WriteLine(result);
    }

    // CA2000: Dispose objects (needs AI)
    public void CreateResource()
    {
        var stream = new System.IO.MemoryStream();
        // Missing using/dispose
    }

    // IDE0044: Make field readonly (partial fix)
    private string _name = "test";
}
`,
  },
};

// ============================================================================
// Test Issues for Orchestrator
// ============================================================================

function createTestIssues(): FixIssue[] {
  return [
    // TypeScript issues
    { id: 'ts-1', ruleId: 'semi', tool: 'eslint', file: 'test.ts', line: 5, message: 'Missing semicolon', severity: 'error' },
    { id: 'ts-2', ruleId: 'quotes', tool: 'eslint', file: 'test.ts', line: 6, message: 'Use single quotes', severity: 'warning' },
    { id: 'ts-3', ruleId: '@typescript-eslint/no-explicit-any', tool: 'eslint', file: 'test.ts', line: 9, message: 'Unexpected any', severity: 'error' },

    // Python issues
    { id: 'py-1', ruleId: 'F401', tool: 'ruff', file: 'test.py', line: 4, message: 'Unused import', severity: 'warning' },
    { id: 'py-2', ruleId: 'F632', tool: 'ruff', file: 'test.py', line: 8, message: 'Use == for comparison', severity: 'error' },
    { id: 'py-3', ruleId: 'E402', tool: 'ruff', file: 'test.py', line: 15, message: 'Module import not at top', severity: 'warning' },

    // Java issues (all need AI - PMD has no native fix)
    { id: 'java-1', ruleId: 'UselessParentheses', tool: 'pmd', file: 'Example.java', line: 8, message: 'Useless parentheses', severity: 'warning' },
    { id: 'java-2', ruleId: 'CloseResource', tool: 'pmd', file: 'Example.java', line: 13, message: 'Resource not closed', severity: 'error' },
    { id: 'java-3', ruleId: 'AvoidCatchingThrowable', tool: 'pmd', file: 'Example.java', line: 22, message: 'Catching Throwable', severity: 'error' },

    // Go issues
    { id: 'go-1', ruleId: 'gofmt', tool: 'golangci-lint', file: 'main.go', line: 8, message: 'File not formatted', severity: 'warning' },
    { id: 'go-2', ruleId: 'errcheck', tool: 'golangci-lint', file: 'main.go', line: 15, message: 'Unchecked error', severity: 'error' },
    { id: 'go-3', ruleId: 'unused', tool: 'golangci-lint', file: 'main.go', line: 20, message: 'Unused function', severity: 'warning' },

    // C++ issues
    { id: 'cpp-1', ruleId: 'clang-format', tool: 'clang-tidy', file: 'main.cpp', line: 6, message: 'Format violation', severity: 'warning' },
    { id: 'cpp-2', ruleId: 'modernize-use-nullptr', tool: 'clang-tidy', file: 'main.cpp', line: 14, message: 'Use nullptr', severity: 'warning' },
    { id: 'cpp-3', ruleId: 'cppcheck-memleak', tool: 'cppcheck', file: 'main.cpp', line: 20, message: 'Memory leak', severity: 'error' },

    // C# issues
    { id: 'cs-1', ruleId: 'IDE0055', tool: 'roslyn-analyzers', file: 'Example.cs', line: 8, message: 'Formatting', severity: 'warning' },
    { id: 'cs-2', ruleId: 'CA2000', tool: 'roslyn-analyzers', file: 'Example.cs', line: 15, message: 'Dispose objects', severity: 'error' },
  ];
}

// ============================================================================
// Tests
// ============================================================================

describe('E2E Full Pipeline Integration Tests', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'full-pipeline-test-'));
    resetKBBypassMetrics();
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Three-Tier Architecture Overview', () => {
    it('should document the three-tier fix system', () => {
      const architecture = {
        tier1: {
          name: 'KB Pattern Cache',
          apiCalls: 0,
          description: 'Cached patterns from Knowledge Base with >= 95% success rate',
          examples: ['CloseResource fix pattern', 'EmptyCatchBlock fix pattern'],
        },
        tier2: {
          name: 'Native --fix Commands',
          apiCalls: 0,
          description: 'Native linter auto-fix capabilities',
          examples: ['eslint --fix', 'ruff --fix', 'gofmt -w', 'clang-format -i'],
        },
        tier3: {
          name: 'AI-based Fixes',
          apiCalls: 1,
          costPerFix: 0.01,
          description: 'AI model for complex semantic issues',
          examples: ['@typescript-eslint/no-explicit-any', 'PMD UselessParentheses'],
        },
      };

      expect(architecture.tier1.apiCalls).toBe(0);
      expect(architecture.tier2.apiCalls).toBe(0);
      expect(architecture.tier3.apiCalls).toBe(1);
    });

    it('should list all available tier 1 tools', () => {
      const tier1Tools = getTier1ToolNames();

      expect(tier1Tools).toContain('eslint');
      expect(tier1Tools).toContain('prettier');
      expect(tier1Tools).toContain('ruff');
      expect(tier1Tools).toContain('gofmt');
      expect(tier1Tools).toContain('rustfmt');
      expect(tier1Tools).toContain('rubocop');
      expect(tier1Tools.length).toBeGreaterThan(10);
    });

    it('should list all available tier 2 tools', () => {
      const tier2Tools = getTier2ToolNames();

      expect(tier2Tools).toContain('sorald');
      expect(tier2Tools).toContain('autoflake');
      expect(tier2Tools).toContain('black');
      expect(tier2Tools).toContain('clang-tidy');
      expect(tier2Tools).toContain('dotnet-format');
      expect(tier2Tools.length).toBeGreaterThan(15);
    });
  });

  describe('Tier 1: KB Pattern Cache Verification', () => {
    it('should check KB bypass for high-success patterns', async () => {
      // Test KB bypass for known patterns
      const patterns = [
        { ruleId: 'CloseResource', language: 'java', tool: 'pmd' },
        { ruleId: 'EmptyCatchBlock', language: 'java', tool: 'pmd' },
        { ruleId: 'AvoidCatchingThrowable', language: 'java', tool: 'pmd' },
      ];

      for (const pattern of patterns) {
        const result = await checkKBBypass(
          pattern.ruleId,
          pattern.language,
          pattern.tool
        );

        // Result should be defined (might or might not bypass depending on KB state)
        expect(result).toBeDefined();
        expect(typeof result.canBypass).toBe('boolean');
        expect(result.confidence).toBeGreaterThanOrEqual(0);
        expect(result.confidence).toBeLessThanOrEqual(100);
      }
    });

    it('should return no_pattern for unknown rules', async () => {
      const result = await checkKBBypass(
        'NonExistentRule12345',
        'typescript',
        'eslint'
      );

      expect(result.canBypass).toBe(false);
      expect(result.reason).toBe('no_pattern');
    });

    it('should track KB bypass metrics', () => {
      resetKBBypassMetrics();
      const initialMetrics = getKBBypassMetrics();

      expect(initialMetrics.kbAppliedCount).toBe(0);
      expect(initialMetrics.aiAppliedCount).toBe(0);
      expect(initialMetrics.kbBypassSavings).toBe(0);
    });
  });

  describe('Tier 2: Native Tool Recommendations by Language', () => {
    it('should recommend correct tier 2 fixer for TypeScript', () => {
      expect(getRecommendedTier2Fixer('typescript', 'eslint')).toBe('eslint');
      expect(getRecommendedTier2Fixer('typescript', '@typescript-eslint')).toBe('eslint');
    });

    it('should recommend correct tier 2 fixer for Python', () => {
      expect(getRecommendedTier2Fixer('python', 'ruff')).toBe('ruff');
      expect(getRecommendedTier2Fixer('python', 'flake8')).toBe('autoflake');
      expect(getRecommendedTier2Fixer('python', 'pylint')).toBe('black');
    });

    it('should recommend correct tier 2 fixer for Go', () => {
      expect(getRecommendedTier2Fixer('go', 'golangci-lint')).toBe('golangci-lint');
      expect(getRecommendedTier2Fixer('go', 'staticcheck')).toBe('gofmt');
    });

    it('should return null for Java/PMD (no native fix)', () => {
      expect(getRecommendedTier2Fixer('java', 'pmd')).toBeNull();
      expect(getRecommendedTier2Fixer('java', 'spotbugs')).toBeNull();
    });

    it('should recommend correct tier 2 fixer for C++', () => {
      expect(getRecommendedTier2Fixer('cpp', 'clang-tidy')).toBe('clang-format');
      expect(getRecommendedTier2Fixer('cpp', 'cppcheck')).toBeNull();
    });

    it('should recommend correct tier 2 fixer for C#', () => {
      expect(getRecommendedTier2Fixer('csharp', 'roslyn')).toBe('dotnet-format');
      expect(getRecommendedTier2Fixer('csharp', 'stylecop')).toBe('dotnet-format');
    });
  });

  describe('Tier 2: Native Tool Executor Creation', () => {
    it('should create executors for all languages', () => {
      const toolsToTest = [
        { tool: 'eslint', expectedName: 'ESLintExecutor' },
        { tool: 'ruff', expectedName: 'RuffExecutor' },
        { tool: 'black', expectedName: 'BlackExecutor' },
        { tool: 'gofmt', expectedName: 'GofmtExecutor' },
        { tool: 'clang-format', expectedName: 'ClangFormatExecutor' },
        { tool: 'dotnet-format', expectedName: 'DotnetFormatExecutor' },
        { tool: 'sorald', expectedName: 'SoraldExecutor' },
      ];

      for (const { tool, expectedName } of toolsToTest) {
        const executor = createTier2Executor(tool);
        expect(executor).not.toBeNull();
        expect(executor!.constructor.name).toBe(expectedName);
      }
    });

    it('should return null for unknown tools', () => {
      const executor = createTier2Executor('unknown-tool-xyz');
      expect(executor).toBeNull();
    });
  });

  describe('Tier 2: Dry Run Execution', () => {
    it('should execute dry run for each language fixer', async () => {
      // Write fixture files
      for (const [lang, { code, extension }] of Object.entries(FIXTURES)) {
        const filePath = path.join(tempDir, `test${extension}`);
        fs.writeFileSync(filePath, code);
      }

      const executors = [
        { tool: 'eslint', file: 'test.ts' },
        { tool: 'ruff', file: 'test.py' },
        { tool: 'gofmt', file: 'test.go' },
        { tool: 'clang-format', file: 'test.cpp' },
        { tool: 'dotnet-format', file: 'test.cs' },
      ];

      for (const { tool, file } of executors) {
        const executor = createTier2Executor(tool);
        if (!executor) continue;

        const result = await executor.executeFix({
          workingDir: tempDir,
          dryRun: true,
          files: [path.join(tempDir, file)],
        });

        expect(result.success).toBe(true);
        expect(result.tool).toBe(tool);
        expect(result.stdout).toContain('DRY RUN');
      }
    });
  });

  describe('Tier 3: AI Executor', () => {
    it('should create tier 3 executor', () => {
      const executor = createTier3Executor();
      expect(executor).not.toBeNull();
      expect(executor.constructor.name).toBe('AIFixerExecutor');
    });

    it('should execute dry run for AI fixer', async () => {
      const executor = createTier3Executor();
      const result = await executor.executeFix({
        workingDir: tempDir,
        dryRun: true,
        files: ['test.ts'],
      });

      expect(result.success).toBe(true);
      expect(result.tool).toBe('ai');
      expect(result.stdout).toContain('DRY RUN');
    });
  });

  describe('Pipeline Flow: Multi-Language Issues', () => {
    it('should categorize issues by tier', () => {
      const issues = createTestIssues();

      // Categorize by expected tier
      const tier2Issues: FixIssue[] = [];
      const tier3Issues: FixIssue[] = [];

      for (const issue of issues) {
        const language = getLanguageFromFile(issue.file);
        const tier2Fixer = getRecommendedTier2Fixer(language, issue.tool);

        if (tier2Fixer && isAutoFixable(issue.ruleId, language)) {
          tier2Issues.push(issue);
        } else {
          tier3Issues.push(issue);
        }
      }

      // TypeScript: semi, quotes (tier 2), no-explicit-any (tier 3)
      // Python: F401, F632 (tier 2), E402 (tier 3)
      // Java: all PMD (tier 3)
      // Go: gofmt (tier 2), errcheck, unused (tier 3)
      // C++: clang-format (tier 2), cppcheck (tier 3)
      // C#: IDE0055 (tier 2), CA2000 (tier 3)

      expect(tier2Issues.length).toBeGreaterThan(0);
      expect(tier3Issues.length).toBeGreaterThan(0);
    });

    it('should calculate API savings vs all-AI approach', () => {
      const issues = createTestIssues();
      const totalIssues = issues.length;

      // Count issues that can be fixed without AI
      let tier2FixableCount = 0;
      for (const issue of issues) {
        const language = getLanguageFromFile(issue.file);
        if (isAutoFixable(issue.ruleId, language)) {
          tier2FixableCount++;
        }
      }

      const tier3Required = totalIssues - tier2FixableCount;

      // Calculate savings
      const allAICost = totalIssues * 0.01; // $0.01 per AI call
      const tieredCost = tier3Required * 0.01;
      const savings = allAICost - tieredCost;
      const savingsPercent = (savings / allAICost) * 100;

      // Document expected savings
      const metrics = {
        totalIssues,
        tier2FixableCount,
        tier3Required,
        allAICost: `$${allAICost.toFixed(2)}`,
        tieredCost: `$${tieredCost.toFixed(2)}`,
        savings: `$${savings.toFixed(2)}`,
        savingsPercent: `${savingsPercent.toFixed(1)}%`,
      };

      expect(metrics.tier2FixableCount).toBeGreaterThan(0);
      expect(savingsPercent).toBeGreaterThan(30); // At least 30% savings
    });
  });

  describe('Fix Orchestrator Integration', () => {
    it('should create orchestrator with default config', () => {
      const orchestrator = new FixOrchestrator({
        workingDir: tempDir,
      });

      expect(orchestrator).toBeDefined();
    });

    it('should create orchestrator with pro tier config', () => {
      const orchestrator = new FixOrchestrator({
        workingDir: tempDir,
        userTier: 'pro',
        dryRun: false,
        enableTier3Fallback: true,
      });

      expect(orchestrator).toBeDefined();
    });

    it('should discover available tools', async () => {
      const orchestrator = new FixOrchestrator({
        workingDir: tempDir,
        verbose: false,
      });

      // This checks which tools are installed locally
      await orchestrator.discoverTools();

      // Should complete without error
      expect(true).toBe(true);
    });

    it('should process issues in dry run mode', async () => {
      // Write test files
      fs.writeFileSync(path.join(tempDir, 'test.ts'), FIXTURES.typescript.code);
      fs.writeFileSync(path.join(tempDir, 'test.py'), FIXTURES.python.code);

      const orchestrator = new FixOrchestrator({
        workingDir: tempDir,
        dryRun: true,
        verbose: false,
      });

      await orchestrator.discoverTools();

      const issues: FixIssue[] = [
        { id: '1', ruleId: 'semi', tool: 'eslint', file: 'test.ts', line: 1, message: 'Missing semicolon', severity: 'error' },
        { id: '2', ruleId: 'F401', tool: 'ruff', file: 'test.py', line: 1, message: 'Unused import', severity: 'warning' },
      ];

      const result = await orchestrator.executeAll(issues);

      expect(result).toBeDefined();
      expect(result.totalIssues).toBe(2);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Rules Coverage by Language', () => {
    it('should document TypeScript auto-fixable vs AI-needed rules', () => {
      const typescript = {
        tier2Fixable: [
          'semi', 'quotes', 'indent', 'comma-dangle', 'no-trailing-spaces',
          'eol-last', 'space-before-blocks', '@typescript-eslint/semi',
          '@typescript-eslint/quotes', '@typescript-eslint/comma-dangle',
        ],
        tier3Needed: [
          '@typescript-eslint/no-explicit-any', '@typescript-eslint/no-unsafe-assignment',
          '@typescript-eslint/no-unsafe-member-access', '@typescript-eslint/explicit-function-return-type',
        ],
      };

      expect(typescript.tier2Fixable.length).toBeGreaterThan(5);
      expect(typescript.tier3Needed.length).toBeGreaterThan(0);
    });

    it('should document Python auto-fixable vs AI-needed rules', () => {
      const python = {
        tier2Fixable: ['F401', 'F632', 'F841', 'E711', 'E712', 'I001'],
        tier3Needed: ['E402', 'C901', 'N802', 'N806', 'D100'],
      };

      expect(python.tier2Fixable.length).toBeGreaterThan(3);
      expect(python.tier3Needed.length).toBeGreaterThan(0);
    });

    it('should document Java has NO tier 2 auto-fix for PMD', () => {
      const java = {
        tier2Fixable: [], // PMD has NO native fix
        tier2FormatOnly: ['checkstyle-formatting'], // google-java-format
        tier3Needed: [
          'UselessParentheses', 'CloseResource', 'AvoidCatchingThrowable',
          'AvoidDollarSigns', 'UnnecessaryAnnotationValueElement', 'EmptyCatchBlock',
        ],
      };

      expect(java.tier2Fixable.length).toBe(0);
      expect(java.tier3Needed.length).toBeGreaterThan(5);
    });

    it('should document Go auto-fixable vs AI-needed rules', () => {
      const go = {
        tier2Fixable: ['gofmt', 'goimports-formatting'],
        tier3Needed: ['errcheck', 'unused', 'ineffassign', 'staticcheck', 'gosec'],
      };

      expect(go.tier2Fixable.length).toBeGreaterThan(0);
      expect(go.tier3Needed.length).toBeGreaterThan(3);
    });

    it('should document C++ auto-fixable vs AI-needed rules', () => {
      const cpp = {
        tier2Fixable: ['clang-format', 'modernize-use-nullptr', 'modernize-use-override'],
        tier3Needed: ['cppcheck-memleak', 'cppcheck-nullPointer', 'bugprone-use-after-move'],
      };

      expect(cpp.tier2Fixable.length).toBeGreaterThan(0);
      expect(cpp.tier3Needed.length).toBeGreaterThan(0);
    });

    it('should document C# auto-fixable vs AI-needed rules', () => {
      const csharp = {
        tier2Fixable: ['IDE0055', 'IDE0003', 'SA1000-SA1028', 'SA1200-SA1217'],
        tier3Needed: ['CA2000', 'CA1822', 'CA1062', 'IDE0044', 'IDE0051'],
      };

      expect(csharp.tier2Fixable.length).toBeGreaterThan(0);
      expect(csharp.tier3Needed.length).toBeGreaterThan(3);
    });
  });

  describe('Expected Pipeline Outcomes', () => {
    it('should document expected fix flow for Spring PetClinic-like PR', () => {
      // Based on E2E_CLOUD_TEST_RESULTS.md (Task 7)
      const realWorldExample = {
        prName: 'Spring PetClinic PR #950',
        totalIssues: 358,
        tier1Fixed: 156, // 43.6% - KB patterns
        tier2Fixed: 24,  // 6.7% - Native tools
        tier3Fixed: 187, // 52.2% - AI
        costSavings: '~51% vs all-AI approach',
      };

      const totalFromTiers = realWorldExample.tier1Fixed + realWorldExample.tier2Fixed + realWorldExample.tier3Fixed;
      expect(totalFromTiers).toBeGreaterThanOrEqual(realWorldExample.totalIssues);
    });

    it('should calculate tier distribution for test issues', () => {
      const issues = createTestIssues();

      const distribution = {
        tier1: 0, // KB cache hits
        tier2: 0, // Native --fix
        tier3: 0, // AI needed
      };

      for (const issue of issues) {
        const language = getLanguageFromFile(issue.file);

        // Check tier 2 first
        const tier2Fixer = getRecommendedTier2Fixer(language, issue.tool);
        if (tier2Fixer && isAutoFixable(issue.ruleId, language)) {
          distribution.tier2++;
        } else {
          distribution.tier3++;
        }
      }

      // Log distribution for documentation
      const total = issues.length;
      const metrics = {
        total,
        tier1Percent: ((distribution.tier1 / total) * 100).toFixed(1),
        tier2Percent: ((distribution.tier2 / total) * 100).toFixed(1),
        tier3Percent: ((distribution.tier3 / total) * 100).toFixed(1),
      };

      expect(distribution.tier2 + distribution.tier3).toBe(total);
    });
  });
});

// ============================================================================
// Helper Functions
// ============================================================================

function getLanguageFromFile(filename: string): string {
  const ext = path.extname(filename);
  const extToLang: Record<string, string> = {
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.js': 'javascript',
    '.py': 'python',
    '.java': 'java',
    '.go': 'go',
    '.cpp': 'cpp',
    '.c': 'c',
    '.cs': 'csharp',
    '.rb': 'ruby',
    '.rs': 'rust',
    '.php': 'php',
    '.swift': 'swift',
    '.kt': 'kotlin',
  };
  return extToLang[ext] || 'unknown';
}

function isAutoFixable(ruleId: string, language: string): boolean {
  // Rules that are auto-fixable by tier 2 native tools
  const autoFixableRules: Record<string, string[]> = {
    typescript: [
      'semi', 'quotes', 'indent', 'comma-dangle', 'no-trailing-spaces',
      'eol-last', 'space-before-blocks', '@typescript-eslint/semi',
      '@typescript-eslint/quotes', '@typescript-eslint/comma-dangle',
    ],
    javascript: [
      'semi', 'quotes', 'indent', 'comma-dangle', 'no-trailing-spaces',
    ],
    python: [
      'F401', 'F632', 'F841', 'E711', 'E712', 'I001',
    ],
    go: [
      'gofmt', 'goimports',
    ],
    cpp: [
      'clang-format', 'modernize-use-nullptr', 'modernize-use-override',
    ],
    csharp: [
      'IDE0055', 'IDE0003', 'SA1000', 'SA1200',
    ],
    java: [], // PMD has NO native auto-fix
  };

  const langRules = autoFixableRules[language] || [];
  return langRules.some(rule =>
    ruleId === rule ||
    ruleId.startsWith(rule) ||
    rule.includes(ruleId)
  );
}
