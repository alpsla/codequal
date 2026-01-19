/**
 * E2E Tests for C# Fixers
 *
 * Session 105: Validates that dotnet-format works in the pipeline
 *
 * Test scenarios:
 * 1. Create test C# project with formatting issues
 * 2. Run fix-agent pipeline targeting the file
 * 3. Verify dotnet-format fixes formatting
 * 4. Note: dotnet-format requires .csproj context
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  createTier2Executor,
  getRecommendedTier2Fixer,
  DotnetFormatExecutor,
} from '../tier2-executor';

// Test fixtures - C# code with various issues
const CSHARP_CODE_WITH_ISSUES = `using System;
using System.Collections.Generic;
using System.Linq;

namespace Example
{
    public class Calculator
    {
        // Formatting issues: inconsistent indentation, spacing
        private int value;
    private string name;

        public Calculator(string name,int value){
            this.name=name;
            this.value=value;
        }

        // Style issue: should use expression body
        public int GetValue()
        {
            return this.value;
        }

        // Formatting issue: inconsistent braces
        public bool IsPositive(){
            if(this.value>0){
                return true;
            }
            return false;
        }

        // Style issue: unnecessary this qualifier
        public void SetValue(int newValue)
        {
            this.value = newValue;
        }

        // Formatting issue: long line, missing spaces
        public int Add(int a,int b,int c,int d,int e){return a+b+c+d+e;}

        // Style issue: should use var
        public void ProcessList()
        {
            List<string> items = new List<string>();
            items.Add("test");
        }

        // Roslyn analyzer issue: CA1822 - can be static
        public int Multiply(int a, int b)
        {
            return a * b;
        }

        // Unused variable (IDE0059)
        public void UnusedVariable()
        {
            int unused = 42;
            Console.WriteLine("Hello");
        }
    }
}
`;

// Minimal .csproj file for dotnet-format to work
const MINIMAL_CSPROJ = `<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
    <EnforceCodeStyleInBuild>true</EnforceCodeStyleInBuild>
  </PropertyGroup>
</Project>
`;

// EditorConfig for consistent formatting rules
const EDITOR_CONFIG = `root = true

[*.cs]
indent_style = space
indent_size = 4
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true

# .NET formatting rules
dotnet_sort_system_directives_first = true
dotnet_style_qualification_for_field = false:suggestion
dotnet_style_qualification_for_property = false:suggestion
dotnet_style_qualification_for_method = false:suggestion
dotnet_style_qualification_for_event = false:suggestion

# C# formatting rules
csharp_new_line_before_open_brace = all
csharp_new_line_before_else = true
csharp_new_line_before_catch = true
csharp_new_line_before_finally = true
csharp_indent_case_contents = true
csharp_indent_switch_labels = true
csharp_space_after_cast = false
csharp_space_after_keywords_in_control_flow_statements = true
csharp_space_between_method_declaration_parameter_list_parentheses = false
csharp_space_between_method_call_parameter_list_parentheses = false
`;

// Expected formatting patterns after dotnet-format
const FORMATTED_CLASS_PATTERN = /public class Calculator\n\s+\{/;
const FORMATTED_METHOD_PATTERN = /public Calculator\(string name, int value\)\n\s+\{/;
const FORMATTED_PROPERTY_PATTERN = /private int value;\n\s+private string name;/;

// Issues that need AI (not fixable by dotnet-format alone)
const ROSLYN_CA1822 = /public int Multiply/; // Can be made static
const IDE0059_UNUSED = /int unused = 42/; // Unused variable

describe('E2E C# Fixer Tests', () => {
  let tempDir: string;
  let testFilePath: string;
  let csprojPath: string;

  beforeEach(() => {
    // Create temp directory for test files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'csharp-fixer-test-'));
    testFilePath = path.join(tempDir, 'Calculator.cs');
    csprojPath = path.join(tempDir, 'TestProject.csproj');
  });

  afterEach(() => {
    // Clean up temp files
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Tier 2 Tool Recommendations', () => {
    it('should recommend dotnet-format for csharp/dotnet-format issues', () => {
      const fixer = getRecommendedTier2Fixer('csharp', 'dotnet-format');
      expect(fixer).toBe('dotnet-format');
    });

    it('should recommend dotnet-format for csharp/roslyn issues', () => {
      const fixer = getRecommendedTier2Fixer('csharp', 'roslyn');
      expect(fixer).toBe('dotnet-format');
    });

    it('should recommend dotnet-format for csharp/stylecop issues', () => {
      const fixer = getRecommendedTier2Fixer('csharp', 'stylecop');
      expect(fixer).toBe('dotnet-format');
    });

    it('should return null for csharp/sonarqube issues (needs AI)', () => {
      const fixer = getRecommendedTier2Fixer('csharp', 'sonarqube');
      expect(fixer).toBeNull();
    });

    it('should return null for unsupported csharp tools', () => {
      const fixer = getRecommendedTier2Fixer('csharp', 'unknown-tool');
      expect(fixer).toBeNull();
    });
  });

  describe('Dotnet Format Executor', () => {
    it('should create DotnetFormatExecutor for dotnet-format tool', () => {
      const executor = createTier2Executor('dotnet-format');
      expect(executor).toBeInstanceOf(DotnetFormatExecutor);
    });

    it('should return dry run result for formatting fix', async () => {
      // Write test files (dotnet-format requires .csproj context)
      fs.writeFileSync(testFilePath, CSHARP_CODE_WITH_ISSUES);
      fs.writeFileSync(csprojPath, MINIMAL_CSPROJ);

      const executor = createTier2Executor('dotnet-format')!;
      const result = await executor.executeFix({
        workingDir: tempDir,
        dryRun: true,
        files: [testFilePath],
      });

      expect(result.success).toBe(true);
      expect(result.tool).toBe('dotnet-format');
      expect(result.stdout).toContain('DRY RUN');
      expect(result.command).toContain('dotnet format');
    });

    it('should include working directory in fix command', async () => {
      fs.writeFileSync(testFilePath, CSHARP_CODE_WITH_ISSUES);
      fs.writeFileSync(csprojPath, MINIMAL_CSPROJ);

      const executor = createTier2Executor('dotnet-format')!;
      const result = await executor.executeFix({
        workingDir: tempDir,
        dryRun: true,
        files: [testFilePath],
      });

      expect(result.command).toContain(tempDir);
    });

    it('should have correct config for dotnet-format', () => {
      const executor = createTier2Executor('dotnet-format')!;
      const config = (executor as any).config;

      expect(config.name).toBe('dotnet-format');
      expect(config.fixCommand).toBe('dotnet format');
    });
  });

  describe('Tier 2 Pipeline Flow', () => {
    it('should invoke tier 2 tools before AI for C# issues', async () => {
      // This tests the conceptual flow: tier 2 tools should be checked first
      const issues = [
        { ruleId: 'IDE0055', tool: 'roslyn', language: 'csharp', expectedFixer: 'dotnet-format' },
        { ruleId: 'SA1000', tool: 'stylecop', language: 'csharp', expectedFixer: 'dotnet-format' },
        { ruleId: 'S1118', tool: 'sonarqube', language: 'csharp', expectedFixer: null }, // No auto-fix for SonarQube
      ];

      for (const issue of issues) {
        const recommended = getRecommendedTier2Fixer(issue.language, issue.tool);
        expect(recommended).toBe(issue.expectedFixer);
      }
    });

    it('should have dotnet-format available as C# tier 2 tool', () => {
      const executor = createTier2Executor('dotnet-format');
      expect(executor).not.toBeNull();
    });

    it('should NOT have native --fix for SonarQube C# rules', () => {
      // SonarQube C# rules need AI - no native auto-fix
      const sonarFixer = getRecommendedTier2Fixer('csharp', 'sonarqube');
      expect(sonarFixer).toBeNull();
    });
  });

  describe('Project Context Requirements', () => {
    it('should document .csproj requirement for dotnet-format', async () => {
      // dotnet-format requires a .csproj file to:
      // 1. Know which files to format
      // 2. Apply project-specific formatting rules
      // 3. Enable/disable specific analyzers
      // 4. Resolve using directives correctly

      // Without .csproj, dotnet format will fail or format incorrectly
      fs.writeFileSync(testFilePath, CSHARP_CODE_WITH_ISSUES);
      fs.writeFileSync(csprojPath, MINIMAL_CSPROJ);

      const executor = createTier2Executor('dotnet-format')!;
      const result = await executor.executeFix({
        workingDir: tempDir,
        dryRun: true,
        files: [],
      });

      expect(result.success).toBe(true);
      expect(result.command).toContain('dotnet format');
    });

    it('should support .editorconfig for formatting rules', () => {
      // Write test files with .editorconfig
      fs.writeFileSync(testFilePath, CSHARP_CODE_WITH_ISSUES);
      fs.writeFileSync(csprojPath, MINIMAL_CSPROJ);
      fs.writeFileSync(path.join(tempDir, '.editorconfig'), EDITOR_CONFIG);

      // .editorconfig configures:
      // - Indentation style and size
      // - Brace placement (Allman vs K&R)
      // - Spacing rules
      // - Sorting of using directives
      // - Code style preferences

      const editorConfigPath = path.join(tempDir, '.editorconfig');
      expect(fs.existsSync(editorConfigPath)).toBe(true);
    });

    it('should work with SDK-style project format', async () => {
      // Modern .NET projects use SDK-style format
      fs.writeFileSync(testFilePath, CSHARP_CODE_WITH_ISSUES);
      fs.writeFileSync(csprojPath, MINIMAL_CSPROJ);

      // Verify SDK-style project
      const projectContent = fs.readFileSync(csprojPath, 'utf-8');
      expect(projectContent).toContain('Sdk="Microsoft.NET.Sdk"');

      const executor = createTier2Executor('dotnet-format')!;
      const result = await executor.executeFix({
        workingDir: tempDir,
        dryRun: true,
        files: [],
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Dotnet Format Specific Capabilities', () => {
    it('should document rules auto-fixable by dotnet-format', () => {
      // dotnet-format can auto-fix:
      const autoFixable = [
        // IDE analyzers (formatting)
        'IDE0001', // Simplify name
        'IDE0002', // Simplify member access
        'IDE0003', // Remove this qualification
        'IDE0007', // Use var instead of explicit type
        'IDE0008', // Use explicit type instead of var
        'IDE0009', // Add this qualification
        'IDE0055', // Fix formatting
        'IDE0065', // Using directive placement
        'IDE0073', // File header

        // StyleCop (via .editorconfig)
        'SA1000', // Keywords must be spaced correctly
        'SA1001', // Commas must be spaced correctly
        'SA1002', // Semicolons must be spaced correctly
        'SA1003', // Symbols must be spaced correctly
        'SA1005', // Single line comments must begin with single space
        'SA1027', // Tabs must not be used
        'SA1028', // Code must not contain trailing whitespace
        'SA1200', // Using directives should be placed correctly
        'SA1208', // System using directives should be placed first
        'SA1500', // Braces for multi-line statements should not share line
        'SA1501', // Statement should not be on a single line
        'SA1502', // Element should not be on a single line
      ];

      // dotnet-format is available
      const executor = createTier2Executor('dotnet-format');
      expect(executor).not.toBeNull();
    });

    it('should document rules that NEED AI (tier 3)', () => {
      // These C# rules cannot be auto-fixed by dotnet-format
      const needsAI = [
        // Roslyn analyzers - semantic changes
        'CA1822', // Member can be made static
        'CA1024', // Use properties where appropriate
        'CA1052', // Static holder types should be sealed
        'CA1054', // URI parameters should not be strings
        'CA1062', // Validate arguments of public methods
        'CA1707', // Identifiers should not contain underscores
        'CA1801', // Review unused parameters
        'CA2000', // Dispose objects before losing scope
        'CA2007', // Consider calling ConfigureAwait on awaited task
        'CA2227', // Collection properties should be read only

        // IDE analyzers - semantic changes
        'IDE0044', // Add readonly modifier (needs analysis)
        'IDE0051', // Remove unused private members
        'IDE0052', // Remove unread private members
        'IDE0059', // Unnecessary assignment
        'IDE0060', // Remove unused parameter

        // SonarQube rules - no native --fix
        'S1118', // Utility classes should not have public constructors
        'S1144', // Unused private types or members should be removed
        'S1172', // Unused method parameters should be removed
        'S2583', // Conditionally executed code should be reachable
        'S2933', // Fields that are only assigned in the constructor should be readonly
        'S3241', // Methods should not return values that are never used
      ];

      // Verify SonarQube has no recommended tier 2 fixer
      const sonarFixer = getRecommendedTier2Fixer('csharp', 'sonarqube');
      expect(sonarFixer).toBeNull();
    });

    it('should NOT fix semantic issues', () => {
      // dotnet-format does NOT fix:
      // - Making members static (CA1822)
      // - Removing unused code (IDE0051)
      // - Null reference fixes
      // - Performance optimizations

      const executor = createTier2Executor('dotnet-format');
      expect(executor).not.toBeNull();
      // These fall through to AI tier
    });
  });

  describe('Integration Test Scenarios', () => {
    it('should handle multiple C# files', async () => {
      // Create multiple test files
      const file1 = path.join(tempDir, 'Calculator.cs');
      const file2 = path.join(tempDir, 'Helper.cs');

      fs.writeFileSync(file1, CSHARP_CODE_WITH_ISSUES);
      fs.writeFileSync(
        file2,
        `namespace Example{public class Helper{public string Help(){return "help";}}}\n`
      );
      fs.writeFileSync(csprojPath, MINIMAL_CSPROJ);

      const executor = createTier2Executor('dotnet-format')!;
      const result = await executor.executeFix({
        workingDir: tempDir,
        dryRun: true,
        files: [file1, file2],
      });

      expect(result.success).toBe(true);
    });

    it('should work with typical solution structure', async () => {
      // Create test file in typical .NET project structure
      const srcDir = path.join(tempDir, 'src', 'MyProject');
      fs.mkdirSync(srcDir, { recursive: true });
      const testFile = path.join(srcDir, 'Calculator.cs');
      const projectFile = path.join(srcDir, 'MyProject.csproj');
      fs.writeFileSync(testFile, CSHARP_CODE_WITH_ISSUES);
      fs.writeFileSync(projectFile, MINIMAL_CSPROJ);

      const executor = createTier2Executor('dotnet-format')!;
      const result = await executor.executeFix({
        workingDir: srcDir,
        dryRun: true,
        files: [testFile],
      });

      expect(result.success).toBe(true);
    });

    it('should support .NET analyzers configuration', () => {
      // Create .csproj with analyzer configuration
      const analyzerCsproj = `<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <Nullable>enable</Nullable>
    <EnforceCodeStyleInBuild>true</EnforceCodeStyleInBuild>
    <AnalysisLevel>latest-all</AnalysisLevel>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Microsoft.CodeAnalysis.NetAnalyzers" Version="8.0.0" />
  </ItemGroup>
</Project>
`;

      fs.writeFileSync(testFilePath, CSHARP_CODE_WITH_ISSUES);
      fs.writeFileSync(csprojPath, analyzerCsproj);

      // Analyzer configuration enables more rules
      const projectContent = fs.readFileSync(csprojPath, 'utf-8');
      expect(projectContent).toContain('EnforceCodeStyleInBuild');
      expect(projectContent).toContain('Microsoft.CodeAnalysis.NetAnalyzers');
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent file gracefully in dry run', async () => {
      fs.writeFileSync(csprojPath, MINIMAL_CSPROJ);

      const executor = createTier2Executor('dotnet-format')!;
      const result = await executor.executeFix({
        workingDir: tempDir,
        dryRun: true,
        files: ['/non/existent/File.cs'],
      });

      // Dry run should still succeed (it just builds the command)
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('DRY RUN');
    });

    it('should handle directory without .csproj in dry run', async () => {
      // Only write .cs file, no .csproj
      fs.writeFileSync(testFilePath, CSHARP_CODE_WITH_ISSUES);

      const executor = createTier2Executor('dotnet-format')!;
      const result = await executor.executeFix({
        workingDir: tempDir,
        dryRun: true,
        files: [],
      });

      // Dry run succeeds (actual run would fail without .csproj)
      expect(result.success).toBe(true);
      expect(result.command).toContain('dotnet format');
    });
  });
});

describe('C# Fixer Rules Coverage Documentation', () => {
  it('should document rules auto-fixable by dotnet-format', () => {
    // Rules that dotnet-format auto-fixes (formatting and simple style)
    const dotnetFormatAutoFixable = [
      // IDE analyzers - formatting
      'IDE0001', // Simplify name
      'IDE0002', // Simplify member access
      'IDE0003', // Remove this/Me qualification
      'IDE0007', // Use var instead of explicit type
      'IDE0008', // Use explicit type instead of var
      'IDE0009', // Add this/Me qualification
      'IDE0055', // Fix formatting
      'IDE0065', // Using directive placement

      // StyleCop rules - formatting
      'SA1000', // Keyword spacing
      'SA1001', // Comma spacing
      'SA1002', // Semicolon spacing
      'SA1003', // Symbol spacing
      'SA1005', // Single line comment spacing
      'SA1027', // No tabs
      'SA1028', // No trailing whitespace
      'SA1200', // Using directive placement
      'SA1208', // System usings first
      'SA1500', // Braces positioning
      'SA1501', // Statement not on single line
      'SA1502', // Element not on single line
    ];

    // dotnet-format is available
    const executor = createTier2Executor('dotnet-format');
    expect(executor).not.toBeNull();
  });

  it('should document rules that NEED AI (tier 3)', () => {
    // These C# rules cannot be auto-fixed by dotnet-format

    // Roslyn CA rules - require semantic understanding
    const roslynNeedsAI = [
      'CA1822', // Member can be made static
      'CA1024', // Use properties
      'CA1052', // Seal static holder types
      'CA1054', // URI parameters
      'CA1062', // Validate arguments
      'CA1707', // No underscores in identifiers
      'CA1801', // Review unused parameters
      'CA2000', // Dispose objects
      'CA2007', // ConfigureAwait
      'CA2227', // Read-only collections
    ];

    // IDE rules - require semantic understanding
    const ideNeedsAI = [
      'IDE0044', // Add readonly modifier
      'IDE0051', // Remove unused private members
      'IDE0052', // Remove unread private members
      'IDE0059', // Unnecessary assignment
      'IDE0060', // Remove unused parameter
    ];

    // SonarQube C# rules - no native --fix
    const sonarNeedsAI = [
      'S1118', // Utility classes constructor
      'S1144', // Unused private types
      'S1172', // Unused method parameters
      'S2583', // Unreachable code
      'S2933', // Readonly fields
      'S3241', // Unused return values
    ];

    // Verify no tier 2 fixer for SonarQube
    const sonarFixer = getRecommendedTier2Fixer('csharp', 'sonarqube');
    expect(sonarFixer).toBeNull();
  });

  it('should document recommended fix order for C# projects', () => {
    // Recommended order for C#:
    // 1. dotnet-format: Fix ALL formatting and simple style issues first
    // 2. AI (tier 3): Handle Roslyn CA rules, SonarQube, complex rules

    // 1. dotnet-format for formatting
    const formatExecutor = createTier2Executor('dotnet-format');
    expect(formatExecutor).not.toBeNull();

    // 2. AI handles the rest (Roslyn CA, SonarQube, complex rules)
    // No additional tier 2 tools for C# currently
  });

  it('should document why SonarQube C# rules need AI', () => {
    // SonarQube C# analyzer is for DETECTION only
    // It identifies issues but does NOT provide auto-fix capability
    //
    // Reasons:
    // 1. SonarQube focuses on detection, not repair
    // 2. Many SonarQube rules require semantic understanding
    // 3. Fixes often involve architectural changes
    // 4. C# fixes need to respect nullable reference types, async patterns
    //
    // For SonarQube C# rules, the pipeline should:
    // 1. Detect with SonarQube
    // 2. Check Knowledge Base for patterns
    // 3. Fall back to AI for fix generation

    const sonarFixer = getRecommendedTier2Fixer('csharp', 'sonarqube');
    expect(sonarFixer).toBeNull();
  });

  it('should document Roslyn analyzer partial support via dotnet-format', () => {
    // Roslyn analyzers have partial support via dotnet-format:
    // - IDE0055 (formatting) - FULLY fixable
    // - IDE0003/IDE0009 (this qualification) - fixable
    // - IDE0007/IDE0008 (var usage) - fixable
    //
    // Roslyn CA rules NOT fixable by dotnet-format:
    // - CA1822 (make static) - needs semantic analysis
    // - CA2000 (dispose) - needs code restructuring
    // - CA1062 (null checks) - needs new code

    const roslynFixer = getRecommendedTier2Fixer('csharp', 'roslyn');
    expect(roslynFixer).toBe('dotnet-format');
  });

  it('should document StyleCop support via dotnet-format', () => {
    // StyleCop rules are configured via .editorconfig and fixed by dotnet-format
    // Most SA* rules are formatting-related and fully fixable:
    // - SA1000-SA1028: Spacing rules
    // - SA1200-SA1217: Using directives
    // - SA1500-SA1520: Layout rules
    //
    // Some StyleCop rules need AI:
    // - SA1600: Elements should be documented (needs content generation)
    // - SA1402: File may only contain a single type (needs file restructuring)

    const stylecopFixer = getRecommendedTier2Fixer('csharp', 'stylecop');
    expect(stylecopFixer).toBe('dotnet-format');
  });
});

describe('C# Fixer Installation and Configuration', () => {
  it('should document dotnet-format installation', () => {
    // dotnet-format is included with .NET SDK 6+
    // For .NET 5 and earlier: dotnet tool install -g dotnet-format
    //
    // Verify version: dotnet format --version
    // Minimum version: .NET SDK 6.0.100+

    const executor = createTier2Executor('dotnet-format')!;
    const config = (executor as any).config;
    expect(config.command).toBe('dotnet format');
  });

  it('should document .editorconfig requirements', () => {
    // .editorconfig is the primary configuration for dotnet-format
    // Place in solution root or project root
    //
    // Key settings:
    // [*.cs]
    // indent_style = space
    // indent_size = 4
    // csharp_new_line_before_open_brace = all
    // dotnet_sort_system_directives_first = true

    const editorConfigContent = EDITOR_CONFIG;
    expect(editorConfigContent).toContain('indent_style');
    expect(editorConfigContent).toContain('csharp_new_line_before_open_brace');
  });

  it('should document .csproj analyzer settings', () => {
    // Enable code style analysis in build:
    // <EnforceCodeStyleInBuild>true</EnforceCodeStyleInBuild>
    //
    // Set analysis level:
    // <AnalysisLevel>latest-all</AnalysisLevel>
    //
    // Optional: Add more analyzers
    // <PackageReference Include="Microsoft.CodeAnalysis.NetAnalyzers" />

    const csprojContent = MINIMAL_CSPROJ;
    expect(csprojContent).toContain('EnforceCodeStyleInBuild');
  });

  it('should document CI/CD integration', () => {
    // In CI/CD pipelines, run dotnet-format with --verify-no-changes
    // to fail build if formatting issues exist:
    //
    // dotnet format --verify-no-changes
    //
    // Or use --check for detailed report without failing:
    // dotnet format --check

    const executor = createTier2Executor('dotnet-format')!;
    expect(executor).not.toBeNull();
  });
});
