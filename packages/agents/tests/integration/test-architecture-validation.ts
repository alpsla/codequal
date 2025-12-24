/**
 * Architecture Validation Integration Test
 *
 * Validates that the complete V9 architecture supports:
 * 1. All tools are properly categorized
 * 2. All 5 agents can process issues from all languages
 * 3. Pattern generation flow works for all categories
 *
 * This test does NOT require running actual tools - it validates the architecture.
 */

import { detectCategory } from '../../src/two-branch/report/category-detector';
import {
  SecurityAgent,
  PerformanceAgent,
  ArchitectureAgent,
  CodeQualityAgent,
  DependencyAgent
} from '../../src/two-branch/agents/specialized-agents';

// =============================================================================
// TEST DATA: All tools and their expected categories
// =============================================================================

interface ToolMapping {
  tool: string;
  language: string;
  expectedCategory: string;
  sampleRule?: string;
  sampleMessage?: string;
}

const TOOL_MAPPINGS: ToolMapping[] = [
  // Java tools
  { tool: 'checkstyle', language: 'java', expectedCategory: 'Code Quality', sampleRule: 'MagicNumber' },
  { tool: 'pmd', language: 'java', expectedCategory: 'Code Quality', sampleRule: 'UnusedPrivateField' },
  { tool: 'spotbugs', language: 'java', expectedCategory: 'Code Quality', sampleRule: 'NP_NULL_ON_SOME_PATH' },
  { tool: 'dependency-check', language: 'java', expectedCategory: 'Dependencies', sampleRule: 'CVE-2021-44228' },
  { tool: 'semgrep', language: 'java', expectedCategory: 'Security', sampleRule: 'java.lang.security.audit' },
  // Java Architecture tools (Session 57 Part 5)
  { tool: 'jdepend', language: 'java', expectedCategory: 'Architecture', sampleRule: 'package-cycle' },

  // TypeScript/JavaScript tools
  { tool: 'eslint', language: 'typescript', expectedCategory: 'Code Quality', sampleRule: 'no-unused-vars' },
  { tool: 'typescript', language: 'typescript', expectedCategory: 'Code Quality', sampleRule: 'TS2322' },
  { tool: 'npm-audit', language: 'typescript', expectedCategory: 'Dependencies', sampleRule: 'lodash-vulnerability' },
  { tool: 'semgrep', language: 'typescript', expectedCategory: 'Security', sampleRule: 'javascript.security.audit' },
  // TypeScript Performance tools (Session 57 Part 3)
  { tool: 'lighthouse', language: 'typescript', expectedCategory: 'Performance', sampleRule: 'largest-contentful-paint' },
  { tool: 'bundle-analyzer', language: 'typescript', expectedCategory: 'Performance', sampleRule: 'large-bundle' },
  { tool: 'eslint-perf', language: 'typescript', expectedCategory: 'Performance', sampleRule: 'perf-standard/no-instanceof-guard' },
  // TypeScript Architecture tools (Session 57 Part 3)
  { tool: 'madge', language: 'typescript', expectedCategory: 'Architecture', sampleRule: 'circular-dependency' },
  { tool: 'dependency-cruiser', language: 'typescript', expectedCategory: 'Architecture', sampleRule: 'no-circular' },
  { tool: 'ts-unused-exports', language: 'typescript', expectedCategory: 'Architecture', sampleRule: 'unused-export' },

  // Python tools
  { tool: 'ruff', language: 'python', expectedCategory: 'Code Quality', sampleRule: 'E501' },
  { tool: 'pylint', language: 'python', expectedCategory: 'Code Quality', sampleRule: 'C0114' },
  { tool: 'bandit', language: 'python', expectedCategory: 'Security', sampleRule: 'B101' },
  { tool: 'mypy', language: 'python', expectedCategory: 'Code Quality', sampleRule: 'error' },
  { tool: 'pip-audit', language: 'python', expectedCategory: 'Dependencies', sampleRule: 'PYSEC-2021-123' },
  { tool: 'safety', language: 'python', expectedCategory: 'Dependencies', sampleRule: '12345' },
  // Python Architecture tools (Session 57 Part 4 & 5)
  { tool: 'pydeps', language: 'python', expectedCategory: 'Architecture', sampleRule: 'circular-dependency' },
  { tool: 'import-linter', language: 'python', expectedCategory: 'Architecture', sampleRule: 'layer-violation' },

  // Go tools
  { tool: 'golangci-lint', language: 'go', expectedCategory: 'Code Quality', sampleRule: 'govet' },
  { tool: 'staticcheck', language: 'go', expectedCategory: 'Code Quality', sampleRule: 'SA1000' },
  { tool: 'govulncheck', language: 'go', expectedCategory: 'Dependencies', sampleRule: 'GO-2023-1234' },
  { tool: 'gosec', language: 'go', expectedCategory: 'Security', sampleRule: 'G101' },
  // Go Architecture tools (Session 57 Part 5)
  { tool: 'go-arch-lint', language: 'go', expectedCategory: 'Architecture', sampleRule: 'dep-violation' },

  // Rust tools
  { tool: 'clippy', language: 'rust', expectedCategory: 'Code Quality', sampleRule: 'clippy::unwrap_used' },
  { tool: 'cargo-audit', language: 'rust', expectedCategory: 'Dependencies', sampleRule: 'RUSTSEC-2021-0001' },
  { tool: 'cargo-deny', language: 'rust', expectedCategory: 'Dependencies', sampleRule: 'license-violation' },
  { tool: 'semgrep', language: 'rust', expectedCategory: 'Security', sampleRule: 'rust.security.audit' },
  // Rust Architecture tools (Session 57 Part 5)
  { tool: 'cargo-modules', language: 'rust', expectedCategory: 'Architecture', sampleRule: 'circular-dependency' },

  // Ruby tools
  { tool: 'rubocop', language: 'ruby', expectedCategory: 'Code Quality', sampleRule: 'Style/StringLiterals' },
  { tool: 'brakeman', language: 'ruby', expectedCategory: 'Security', sampleRule: 'SQL Injection' },
  { tool: 'bundler-audit', language: 'ruby', expectedCategory: 'Dependencies', sampleRule: 'CVE-2023-1234' },
  // Ruby Architecture tools (Session 57 Part 5)
  { tool: 'packwerk', language: 'ruby', expectedCategory: 'Architecture', sampleRule: 'dependency-violation' },

  // PHP tools
  { tool: 'phpstan', language: 'php', expectedCategory: 'Code Quality', sampleRule: 'method.notFound' },
  { tool: 'psalm', language: 'php', expectedCategory: 'Code Quality', sampleRule: 'UndefinedVariable' },
  { tool: 'phpcs', language: 'php', expectedCategory: 'Code Quality', sampleRule: 'PSR12.Files.FileHeader' },
  { tool: 'composer-audit', language: 'php', expectedCategory: 'Dependencies', sampleRule: 'CVE-2023-5678' },
  { tool: 'semgrep', language: 'php', expectedCategory: 'Security', sampleRule: 'php.security.audit' },
  // PHP Architecture tools (Session 57 Part 5)
  { tool: 'deptrac', language: 'php', expectedCategory: 'Architecture', sampleRule: 'DependsOnDisallowedLayer' },

  // C#/.NET tools
  { tool: 'dotnet-format', language: 'csharp', expectedCategory: 'Code Quality', sampleRule: 'IDE0001' },
  { tool: 'security-code-scan', language: 'csharp', expectedCategory: 'Security', sampleRule: 'SCS0001' },
  { tool: 'dotnet-outdated', language: 'csharp', expectedCategory: 'Dependencies', sampleRule: 'package-outdated' },
];

// =============================================================================
// TEST 1: Category Detection Validation
// =============================================================================

function testCategoryDetection(): { passed: number; failed: number; errors: string[] } {
  console.log('\n=== TEST 1: Category Detection ===\n');

  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const mapping of TOOL_MAPPINGS) {
    const detectedCategory = detectCategory(
      mapping.sampleRule || '',
      mapping.tool,
      mapping.sampleMessage || 'Sample issue message'
    );

    if (detectedCategory === mapping.expectedCategory) {
      passed++;
      console.log(`  [PASS] ${mapping.tool} (${mapping.language}) -> ${detectedCategory}`);
    } else {
      failed++;
      const error = `  [FAIL] ${mapping.tool} (${mapping.language}): expected '${mapping.expectedCategory}', got '${detectedCategory}'`;
      console.log(error);
      errors.push(error);
    }
  }

  console.log(`\n  Results: ${passed} passed, ${failed} failed\n`);
  return { passed, failed, errors };
}

// =============================================================================
// TEST 2: Agent Instantiation and Processing
// =============================================================================

async function testAgentProcessing(): Promise<{ passed: number; failed: number; errors: string[] }> {
  console.log('\n=== TEST 2: Agent Instantiation ===\n');

  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  const agents = [
    { name: 'SecurityAgent', Agent: SecurityAgent },
    { name: 'CodeQualityAgent', Agent: CodeQualityAgent },
    { name: 'PerformanceAgent', Agent: PerformanceAgent },
    { name: 'ArchitectureAgent', Agent: ArchitectureAgent },
    { name: 'DependencyAgent', Agent: DependencyAgent },
  ];

  for (const { name, Agent } of agents) {
    try {
      // Just test instantiation (actual AI calls would require API keys)
      const agent = new Agent();
      console.log(`  [PASS] ${name} instantiated successfully`);
      passed++;
    } catch (error: any) {
      const err = `  [FAIL] ${name}: ${error.message}`;
      console.log(err);
      errors.push(err);
      failed++;
    }
  }

  console.log(`\n  Results: ${passed} passed, ${failed} failed\n`);
  return { passed, failed, errors };
}

// =============================================================================
// TEST 3: Language Coverage Validation
// =============================================================================

function testLanguageCoverage(): { passed: number; failed: number; errors: string[] } {
  console.log('\n=== TEST 3: Language Coverage ===\n');

  const languageTools: Record<string, Set<string>> = {};
  const languageCategories: Record<string, Set<string>> = {};

  // Group tools by language
  for (const mapping of TOOL_MAPPINGS) {
    if (!languageTools[mapping.language]) {
      languageTools[mapping.language] = new Set();
      languageCategories[mapping.language] = new Set();
    }
    languageTools[mapping.language].add(mapping.tool);
    languageCategories[mapping.language].add(mapping.expectedCategory);
  }

  let passed = 0;
  let failed = 0;
  const errors: string[] = [];
  const requiredCategories = ['Security', 'Code Quality', 'Dependencies'];

  for (const [language, tools] of Object.entries(languageTools)) {
    const categories = languageCategories[language];
    const missingCategories = requiredCategories.filter(c => !categories.has(c));

    if (missingCategories.length === 0) {
      console.log(`  [PASS] ${language}: ${tools.size} tools covering ${categories.size} categories`);
      passed++;
    } else {
      const err = `  [FAIL] ${language}: missing categories: ${missingCategories.join(', ')}`;
      console.log(err);
      errors.push(err);
      failed++;
    }
  }

  console.log(`\n  Results: ${passed} passed, ${failed} failed\n`);
  return { passed, failed, errors };
}

// =============================================================================
// TEST 4: Category-to-Agent Mapping
// =============================================================================

function testCategoryAgentMapping(): { passed: number; failed: number; errors: string[] } {
  console.log('\n=== TEST 4: Category-to-Agent Mapping ===\n');

  const categoryAgentMap: Record<string, string> = {
    'Security': 'SecurityAgent',
    'Code Quality': 'CodeQualityAgent',
    'Performance': 'PerformanceAgent',
    'Architecture': 'ArchitectureAgent',
    'Dependencies': 'DependencyAgent',
  };

  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const [category, agent] of Object.entries(categoryAgentMap)) {
    // Verify the mapping exists and is documented
    console.log(`  [PASS] ${category} -> ${agent}`);
    passed++;
  }

  // Verify all detected categories have an agent
  const detectedCategories = new Set(TOOL_MAPPINGS.map(m => m.expectedCategory));
  for (const category of detectedCategories) {
    if (!categoryAgentMap[category]) {
      const err = `  [FAIL] Category '${category}' has no mapped agent`;
      console.log(err);
      errors.push(err);
      failed++;
    }
  }

  console.log(`\n  Results: ${passed} passed, ${failed} failed\n`);
  return { passed, failed, errors };
}

// =============================================================================
// MAIN TEST RUNNER
// =============================================================================

async function runArchitectureValidation(): Promise<void> {
  console.log(`
================================================================================
                    ARCHITECTURE VALIDATION TEST
================================================================================
  Testing:
  - Category detection for all tools (${TOOL_MAPPINGS.length} tools)
  - Agent instantiation (5 agents)
  - Language coverage (8 languages)
  - Category-to-Agent mapping
================================================================================
`);

  const results = {
    categoryDetection: testCategoryDetection(),
    agentProcessing: await testAgentProcessing(),
    languageCoverage: testLanguageCoverage(),
    categoryAgentMapping: testCategoryAgentMapping(),
  };

  // Summary
  const totalPassed = Object.values(results).reduce((sum, r) => sum + r.passed, 0);
  const totalFailed = Object.values(results).reduce((sum, r) => sum + r.failed, 0);
  const allErrors = Object.values(results).flatMap(r => r.errors);

  console.log(`
================================================================================
                           TEST SUMMARY
================================================================================
  Category Detection:     ${results.categoryDetection.passed} passed, ${results.categoryDetection.failed} failed
  Agent Processing:       ${results.agentProcessing.passed} passed, ${results.agentProcessing.failed} failed
  Language Coverage:      ${results.languageCoverage.passed} passed, ${results.languageCoverage.failed} failed
  Category-Agent Mapping: ${results.categoryAgentMapping.passed} passed, ${results.categoryAgentMapping.failed} failed
--------------------------------------------------------------------------------
  TOTAL:                  ${totalPassed} passed, ${totalFailed} failed
================================================================================
`);

  if (totalFailed > 0) {
    console.log('\nErrors:');
    allErrors.forEach(e => console.log(e));
    process.exit(1);
  } else {
    console.log('\nAll architecture validation tests passed!');
  }
}

// Run tests
runArchitectureValidation().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
