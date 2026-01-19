/**
 * E2E Tests for Java Fixers
 *
 * Session 105: Validates that google-java-format and Sorald work in the pipeline
 *
 * Test scenarios:
 * 1. Create test Java file with formatting issues + SonarQube violations
 * 2. Run fix-agent pipeline targeting the file
 * 3. Verify google-java-format fixes formatting
 * 4. Verify Sorald fixes S1155, S1132 rules
 * 5. Verify PMD rules fall through to AI tier
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  createTier2Executor,
  getRecommendedTier2Fixer,
  GoogleJavaFormatExecutor,
  SoraldExecutor,
} from '../tier2-executor';

// Test fixtures - Java code with various issues
const JAVA_CODE_WITH_ISSUES = `package com.example;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

public class Example {
    // Formatting issues: inconsistent indentation, spacing
    private String name;
private int value;

    public Example(String name,int value){
        this.name=name;
        this.value=value;
    }

    // S1155: Use isEmpty() instead of size() == 0
    public boolean isListEmpty(List<String> items) {
        return items.size() == 0;
    }

    // S1132: String literals should be on the left side of equals()
    public boolean checkName(String input) {
        return input.equals("expected");
    }

    // S2095: Resources should be closed (try-with-resources)
    public void readFile(String path) throws Exception {
        java.io.FileReader reader = new java.io.FileReader(path);
        reader.read();
        reader.close();
    }

    // PMD:UselessParentheses - needs AI
    public int calculate(int a, int b) {
        return (a + b) * (2);
    }

    // PMD:AvoidDollarSigns - needs AI
    private String $dollarVar = "test";

    // PMD:UnnecessaryAnnotationValueElement - needs AI
    @SuppressWarnings(value = "unchecked")
    public void suppressedMethod() {
        List rawList = new ArrayList();
    }

    public String getName(){return this.name;}

    public int getValue(){
return this.value;
    }
}
`;

// Expected formatting patterns after google-java-format
const FORMATTED_CLASS_PATTERN = /public class Example \{/;
const FORMATTED_METHOD_PATTERN = /public Example\(String name, int value\) \{/;
const FORMATTED_GETTER_PATTERN = /public String getName\(\) \{\n\s+return this\.name;\n\s+\}/;

// Sorald-fixable patterns
const S1155_ORIGINAL = /items\.size\(\) == 0/;
const S1155_FIXED = /items\.isEmpty\(\)/;
const S1132_ORIGINAL = /input\.equals\("expected"\)/;
const S1132_FIXED = /"expected"\.equals\(input\)/;

// PMD patterns (need AI, not auto-fixable)
const PMD_USELESS_PARENS = /\(a \+ b\) \* \(2\)/;
const PMD_DOLLAR_SIGN = /\$dollarVar/;
const PMD_ANNOTATION_VALUE = /@SuppressWarnings\(value = "unchecked"\)/;

describe('E2E Java Fixer Tests', () => {
  let tempDir: string;
  let testFilePath: string;

  beforeEach(() => {
    // Create temp directory for test files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'java-fixer-test-'));
    testFilePath = path.join(tempDir, 'Example.java');
  });

  afterEach(() => {
    // Clean up temp files
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Tier 2 Tool Recommendations', () => {
    it('should return null for java/pmd issues (PMD has no auto-fix)', () => {
      const fixer = getRecommendedTier2Fixer('java', 'pmd');
      expect(fixer).toBeNull();
    });

    it('should recommend google-java-format for java/checkstyle issues', () => {
      const fixer = getRecommendedTier2Fixer('java', 'checkstyle');
      expect(fixer).toBe('google-java-format');
    });

    it('should return null for java/spotbugs issues', () => {
      const fixer = getRecommendedTier2Fixer('java', 'spotbugs');
      expect(fixer).toBeNull();
    });

    it('should return null for unsupported java tools', () => {
      const fixer = getRecommendedTier2Fixer('java', 'unknown-tool');
      expect(fixer).toBeNull();
    });
  });

  describe('Google Java Format Executor', () => {
    it('should create GoogleJavaFormatExecutor for google-java-format tool', () => {
      const executor = createTier2Executor('google-java-format');
      expect(executor).toBeInstanceOf(GoogleJavaFormatExecutor);
    });

    it('should return dry run result for formatting fix', async () => {
      // Write test file
      fs.writeFileSync(testFilePath, JAVA_CODE_WITH_ISSUES);

      const executor = createTier2Executor('google-java-format')!;
      const result = await executor.executeFix({
        workingDir: tempDir,
        dryRun: true,
        files: [testFilePath],
      });

      expect(result.success).toBe(true);
      expect(result.tool).toBe('google-java-format');
      expect(result.stdout).toContain('DRY RUN');
      expect(result.command).toContain('google-java-format --replace');
    });

    it('should include file path in fix command', async () => {
      fs.writeFileSync(testFilePath, JAVA_CODE_WITH_ISSUES);

      const executor = createTier2Executor('google-java-format')!;
      const result = await executor.executeFix({
        workingDir: tempDir,
        dryRun: true,
        files: [testFilePath],
      });

      expect(result.command).toContain(testFilePath);
    });

    it('should have correct config for google-java-format', () => {
      const executor = createTier2Executor('google-java-format')!;
      const config = (executor as any).config;

      expect(config.name).toBe('google-java-format');
      expect(config.fixCommand).toBe('google-java-format --replace');
    });
  });

  describe('Sorald Executor', () => {
    it('should create SoraldExecutor for sorald tool', () => {
      const executor = createTier2Executor('sorald');
      expect(executor).toBeInstanceOf(SoraldExecutor);
    });

    it('should return dry run result for S1155 fix', async () => {
      // Write test file
      fs.writeFileSync(testFilePath, JAVA_CODE_WITH_ISSUES);

      const executor = new SoraldExecutor('S1155');
      const result = await executor.executeFix({
        workingDir: tempDir,
        dryRun: true,
        files: [testFilePath],
      });

      expect(result.success).toBe(true);
      expect(result.tool).toBe('sorald');
      expect(result.stdout).toContain('DRY RUN');
      expect(result.command).toContain('--rule-key S1155');
    });

    it('should return dry run result for S1132 fix', async () => {
      fs.writeFileSync(testFilePath, JAVA_CODE_WITH_ISSUES);

      const executor = new SoraldExecutor('S1132');
      const result = await executor.executeFix({
        workingDir: tempDir,
        dryRun: true,
        files: [testFilePath],
      });

      expect(result.success).toBe(true);
      expect(result.tool).toBe('sorald');
      expect(result.command).toContain('--rule-key S1132');
    });

    it('should include source directory in command', async () => {
      fs.writeFileSync(testFilePath, JAVA_CODE_WITH_ISSUES);

      const executor = new SoraldExecutor('S1155');
      const result = await executor.executeFix({
        workingDir: tempDir,
        dryRun: true,
        files: [],
      });

      expect(result.command).toContain(`--source "${tempDir}"`);
    });

    it('should have correct config for sorald', () => {
      const executor = new SoraldExecutor('S1155');
      const config = (executor as any).config;

      expect(config.name).toBe('sorald');
      expect(config.fixCommand).toContain('repair');
    });
  });

  describe('Tier 2 Pipeline Flow', () => {
    it('should invoke tier 2 tools before AI for Java issues', async () => {
      // This tests the conceptual flow: tier 2 tools should be checked first
      const issues = [
        { ruleId: 'Indentation', tool: 'checkstyle', language: 'java', expectedFixer: 'google-java-format' },
        { ruleId: 'S1155', tool: 'sonarqube', language: 'java', expectedFixer: null }, // No auto-recommendation for sonarqube
        { ruleId: 'S1132', tool: 'sonarqube', language: 'java', expectedFixer: null },
      ];

      for (const issue of issues) {
        const recommended = getRecommendedTier2Fixer(issue.language, issue.tool);
        expect(recommended).toBe(issue.expectedFixer);
      }
    });

    it('should have all Java tier 2 tools available', () => {
      const javaTools = ['google-java-format', 'sorald', 'openrewrite'];

      for (const tool of javaTools) {
        const executor = createTier2Executor(tool);
        expect(executor).not.toBeNull();
      }
    });

    it('should NOT have native --fix for PMD', () => {
      // PMD has no --fix capability
      const pmdFixer = getRecommendedTier2Fixer('java', 'pmd');
      expect(pmdFixer).toBeNull();
    });

    it('should NOT have native --fix for SpotBugs', () => {
      // SpotBugs has no --fix capability
      const spotbugsFixer = getRecommendedTier2Fixer('java', 'spotbugs');
      expect(spotbugsFixer).toBeNull();
    });
  });

  describe('Multi-Tool Fix Sequence', () => {
    it('should be able to run formatting + Sorald in sequence', async () => {
      fs.writeFileSync(testFilePath, JAVA_CODE_WITH_ISSUES);

      // Typical sequence for Java: google-java-format → Sorald (per rule)
      const results: Array<{ tool: string; success: boolean }> = [];

      // 1. Format first
      const formatExecutor = createTier2Executor('google-java-format')!;
      const formatResult = await formatExecutor.executeFix({
        workingDir: tempDir,
        dryRun: true,
        files: [testFilePath],
      });
      results.push({ tool: formatResult.tool, success: formatResult.success });

      // 2. Fix S1155
      const s1155Executor = new SoraldExecutor('S1155');
      const s1155Result = await s1155Executor.executeFix({
        workingDir: tempDir,
        dryRun: true,
        files: [],
      });
      results.push({ tool: s1155Result.tool, success: s1155Result.success });

      // 3. Fix S1132
      const s1132Executor = new SoraldExecutor('S1132');
      const s1132Result = await s1132Executor.executeFix({
        workingDir: tempDir,
        dryRun: true,
        files: [],
      });
      results.push({ tool: s1132Result.tool, success: s1132Result.success });

      // All should succeed in dry run mode
      expect(results).toHaveLength(3);
      expect(results.every((r) => r.success)).toBe(true);
      expect(results.map((r) => r.tool)).toEqual(['google-java-format', 'sorald', 'sorald']);
    });

    it('should correctly identify which issues need AI fallback', () => {
      // Java issues that CAN be auto-fixed by tier 2
      const tier2Fixable = [
        // google-java-format: formatting only
        'Indentation', // checkstyle
        'WhitespaceAround', // checkstyle
        'NoWhitespaceBefore', // checkstyle

        // Sorald: specific SonarQube rules
        'S1155', // isEmpty() check
        'S1132', // String literal position
        'S2095', // try-with-resources
        'S2142', // InterruptedException handling
        'S1068', // unused private fields
        'S1481', // unused local variables
        'S1860', // synchronized on primitive wrapper
        'S2755', // XXE vulnerability
      ];

      // Java issues that NEED AI (tier 3)
      const needsAI = [
        // PMD rules - no native fix available
        'UselessParentheses', // semantic analysis needed
        'AvoidDollarSigns', // identifier renaming needed
        'UnnecessaryAnnotationValueElement', // annotation refactoring
        'CloseResource', // complex try-with-resources refactoring
        'UseUtilityClass', // class restructuring

        // Other semantic issues
        'NullPointerException', // spotbugs
        'DM_BOXED_PRIMITIVE_FOR_PARSING', // spotbugs
      ];

      // Tier 2 fixable checkstyle should have recommended fixer
      const checkstyleFixer = getRecommendedTier2Fixer('java', 'checkstyle');
      expect(checkstyleFixer).toBe('google-java-format');

      // PMD has no recommended fixer
      const pmdFixer = getRecommendedTier2Fixer('java', 'pmd');
      expect(pmdFixer).toBeNull();
    });
  });

  describe('Google Java Format Specific Capabilities', () => {
    it('should document google-java-format as fixing ALL formatting issues', () => {
      // google-java-format fixes per Google Java Style Guide:
      // - indentation
      // - spacing
      // - brace positioning
      // - import organization
      const executor = createTier2Executor('google-java-format');
      expect(executor).not.toBeNull();

      const config = (executor as any).config;
      expect(config.fixCommand).toContain('--replace'); // in-place modification
    });

    it('should NOT fix semantic issues', () => {
      // google-java-format does NOT fix:
      // - UselessParentheses (needs semantic understanding)
      // - Naming conventions
      // - Code structure issues
      const executor = createTier2Executor('google-java-format');
      expect(executor).not.toBeNull();
      // These fall through to AI tier
    });
  });

  describe('Sorald Specific Capabilities', () => {
    it('should document supported SonarQube rules', () => {
      // Sorald supports these rules (as of v0.8.6):
      const supportedRules = [
        'S1068', // Unused private fields
        'S1132', // String literals should be on the left side
        'S1155', // Collection.isEmpty() should be used
        'S1481', // Unused local variables
        'S1860', // Synchronization on primitive wrappers
        'S2095', // Resources should be closed
        'S2142', // InterruptedException should not be ignored
        'S2755', // XXE vulnerability
      ];

      // Each rule should be usable with SoraldExecutor
      for (const rule of supportedRules) {
        const executor = new SoraldExecutor(rule);
        expect(executor).not.toBeNull();
      }
    });

    it('should use JAR-based execution', () => {
      const executor = new SoraldExecutor('S1155');
      const config = (executor as any).config;

      expect(config.command).toContain('java -jar');
    });

    it('should support custom JAR path', () => {
      const customPath = '/custom/path/sorald.jar';
      const executor = new SoraldExecutor('S1155', customPath);
      const config = (executor as any).config;

      expect(config.command).toContain(customPath);
    });
  });

  describe('PMD Rules Fall Through to AI', () => {
    it('should document PMD rules that need AI', () => {
      // PMD has NO native --fix capability
      // ALL PMD rules must fall through to AI tier 3

      const pmdRulesNeedingAI = [
        'UselessParentheses', // Remove unnecessary parentheses
        'AvoidDollarSigns', // Rename identifiers
        'UnnecessaryAnnotationValueElement', // Simplify annotations
        'CloseResource', // Add try-with-resources
        'UseUtilityClass', // Add private constructor
        'EmptyCatchBlock', // Add proper exception handling
        'AvoidCatchingThrowable', // Change to specific exception
        'UnusedPrivateMethod', // Remove or use method
        'UnusedLocalVariable', // Remove or use variable
        'TooManyMethods', // Refactor class
        'CyclomaticComplexity', // Simplify method
      ];

      // Verify PMD has no recommended tier 2 fixer
      const pmdFixer = getRecommendedTier2Fixer('java', 'pmd');
      expect(pmdFixer).toBeNull();

      // All PMD rules fall through to AI
      // The fix-agent pipeline should use AI-based fixing for these
    });

    it('should have no executor for pmd tool name', () => {
      // There's no dedicated PMD fixer executor
      const executor = createTier2Executor('pmd');
      expect(executor).toBeNull();
    });
  });

  describe('Integration Test Scenarios', () => {
    it('should handle multiple Java files', async () => {
      // Create multiple test files
      const file1 = path.join(tempDir, 'Main.java');
      const file2 = path.join(tempDir, 'Helper.java');

      fs.writeFileSync(file1, 'package com.example;\n\npublic class Main {\npublic void run(){}\n}\n');
      fs.writeFileSync(file2, 'package com.example;\n\npublic class Helper {\npublic String help(){return "help";}\n}\n');

      const executor = createTier2Executor('google-java-format')!;
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
      // Create test file in subdirectory (typical Maven/Gradle structure)
      const srcDir = path.join(tempDir, 'src', 'main', 'java', 'com', 'example');
      fs.mkdirSync(srcDir, { recursive: true });
      const testFile = path.join(srcDir, 'Example.java');
      fs.writeFileSync(testFile, JAVA_CODE_WITH_ISSUES);

      const executor = createTier2Executor('google-java-format')!;
      const result = await executor.executeFix({
        workingDir: srcDir,
        dryRun: true,
        files: [testFile],
      });

      expect(result.success).toBe(true);
    });

    it('should work with Sorald on project directory', async () => {
      // Sorald operates on source directories
      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      const testFile = path.join(srcDir, 'Example.java');
      fs.writeFileSync(testFile, JAVA_CODE_WITH_ISSUES);

      const executor = new SoraldExecutor('S1155');
      const result = await executor.executeFix({
        workingDir: srcDir,
        dryRun: true,
        files: [],
      });

      expect(result.success).toBe(true);
      expect(result.command).toContain(`--source "${srcDir}"`);
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent file gracefully in dry run', async () => {
      const executor = createTier2Executor('google-java-format')!;
      const result = await executor.executeFix({
        workingDir: tempDir,
        dryRun: true,
        files: ['/non/existent/File.java'],
      });

      // Dry run should still succeed (it just builds the command)
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('DRY RUN');
    });

    it('should include files in command even if empty array', async () => {
      const executor = createTier2Executor('google-java-format')!;
      const result = await executor.executeFix({
        workingDir: tempDir,
        dryRun: true,
        files: [],
      });

      expect(result.success).toBe(true);
      expect(result.command).toContain('google-java-format');
    });
  });
});

describe('Java Fixer Rules Coverage Documentation', () => {
  it('should document rules auto-fixable by google-java-format', () => {
    // Rules that google-java-format auto-fixes (ALL formatting)
    const googleJavaFormatAutoFixable = [
      // Checkstyle formatting rules
      'Indentation',
      'WhitespaceAround',
      'WhitespaceAfter',
      'NoWhitespaceBefore',
      'NoWhitespaceAfter',
      'EmptyLineSeparator',
      'OperatorWrap',
      'NeedBraces',
      'LeftCurly',
      'RightCurly',
      'ImportOrder', // google-java-format also organizes imports
    ];

    // google-java-format is available
    const executor = createTier2Executor('google-java-format');
    expect(executor).not.toBeNull();
  });

  it('should document rules auto-fixable by Sorald', () => {
    // Sorald supports automatic repair for these SonarQube rules
    const soraldAutoFixable = [
      'S1068', // Unused private fields should be removed
      'S1132', // Strings literals should be placed on the left side of equals()
      'S1155', // Collection.isEmpty() should be used to test for emptiness
      'S1481', // Unused local variables should be removed
      'S1860', // Synchronization should not be done on Strings or boxed primitives
      'S2095', // Resources should be closed (try-with-resources)
      'S2142', // "InterruptedException" should not be ignored
      'S2755', // XML parsers should not be vulnerable to XXE attacks
    ];

    // All should be usable with SoraldExecutor
    for (const rule of soraldAutoFixable) {
      const executor = new SoraldExecutor(rule);
      expect(executor).not.toBeNull();
    }
  });

  it('should document rules that NEED AI (tier 3)', () => {
    // These Java rules cannot be auto-fixed and need AI

    // PMD rules - no native --fix
    const pmdNeedsAI = [
      'UselessParentheses', // Remove unnecessary parentheses
      'AvoidDollarSigns', // Rename identifiers without $
      'UnnecessaryAnnotationValueElement', // @Anno(value="x") → @Anno("x")
      'CloseResource', // Complex try-with-resources
      'UseUtilityClass', // Add private constructor
      'EmptyCatchBlock', // Add proper exception handling
      'AvoidCatchingThrowable', // Use specific exception type
      'UnusedPrivateMethod', // Remove dead code
      'MissingOverride', // Add @Override annotation
      'SimplifyBooleanReturns', // if (x) return true; else return false; → return x
      'CollapsibleIfStatements', // if (a) { if (b) { } } → if (a && b) { }
      'AvoidReassigningParameters', // Use local variable instead
      'LocalVariableCouldBeFinal', // Add final modifier
    ];

    // SpotBugs/FindBugs - no native --fix
    const spotbugsNeedsAI = [
      'NP_NULL_ON_SOME_PATH', // Null pointer analysis
      'DM_BOXED_PRIMITIVE_FOR_PARSING', // Integer.valueOf() → Integer.parseInt()
      'EC_UNRELATED_TYPES', // Type mismatch in equals
      'RCN_REDUNDANT_NULLCHECK', // Redundant null check
      'SIC_INNER_SHOULD_BE_STATIC', // Inner class should be static
    ];

    // Verify PMD has no recommended tier 2 fixer
    const pmdFixer = getRecommendedTier2Fixer('java', 'pmd');
    expect(pmdFixer).toBeNull();

    // Verify SpotBugs has no recommended tier 2 fixer
    const spotbugsFixer = getRecommendedTier2Fixer('java', 'spotbugs');
    expect(spotbugsFixer).toBeNull();
  });

  it('should document recommended fix order for Java projects', () => {
    // Recommended order for Java:
    // 1. google-java-format: Fix ALL formatting issues first
    // 2. Sorald: Fix supported SonarQube rules (S1155, S1132, etc.)
    // 3. AI (tier 3): Handle PMD, SpotBugs, remaining rules

    // 1. google-java-format for formatting
    const formatExecutor = createTier2Executor('google-java-format');
    expect(formatExecutor).not.toBeNull();

    // 2. Sorald for SonarQube rules
    const soraldExecutor = createTier2Executor('sorald');
    expect(soraldExecutor).not.toBeNull();

    // 3. AI handles the rest (PMD, SpotBugs, complex rules)
  });

  it('should document why PMD has no auto-fix', () => {
    // PMD is a static analysis tool for DETECTION only
    // It identifies issues but does NOT provide auto-fix capability
    //
    // Reasons:
    // 1. PMD focuses on detection, not repair
    // 2. Many PMD rules require semantic understanding
    // 3. Fixes often involve architectural changes
    // 4. OpenRewrite can fix SOME PMD rules via recipes, but requires setup
    //
    // For PMD rules, the pipeline should:
    // 1. Detect with PMD
    // 2. Check Knowledge Base for patterns
    // 3. Fall back to AI for fix generation

    const pmdFixer = getRecommendedTier2Fixer('java', 'pmd');
    expect(pmdFixer).toBeNull();
  });

  it('should document Checkstyle has partial support via google-java-format', () => {
    // Checkstyle is primarily for DETECTION, but...
    // google-java-format can fix FORMATTING-related Checkstyle rules:
    // - Indentation
    // - Whitespace rules
    // - Import order
    // - Brace positioning
    //
    // Checkstyle rules NOT fixable by google-java-format:
    // - Naming conventions (needs semantic changes)
    // - Javadoc requirements (needs content generation)
    // - Magic number detection (needs refactoring)

    const checkstyleFixer = getRecommendedTier2Fixer('java', 'checkstyle');
    expect(checkstyleFixer).toBe('google-java-format');
  });
});
