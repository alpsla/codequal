/**
 * Enhanced Parser E2E Validation Test
 * 
 * Tests the EnhancedUniversalToolParser against real tool outputs
 * to validate the migration is working correctly in production scenarios.
 * 
 * Usage:
 *   npx ts-node tests/integration/test-enhanced-parser-e2e.ts
 */

import { EnhancedUniversalToolParser } from '../../src/two-branch/parsers/enhanced-universal-tool-parser';
import { 
  ParserValidationWrapper, 
  createParserValidationWrapper 
} from '../../src/two-branch/parsers/parser-validation-wrapper';

// ============================================================
// REAL-WORLD TOOL OUTPUTS (from actual tool runs)
// ============================================================

// PMD JSON output (from Spring PetClinic)
const REAL_PMD_OUTPUT = {
  files: [
    {
      filename: '/workspace/src/main/java/org/springframework/samples/petclinic/owner/OwnerController.java',
      violations: [
        {
          beginline: 45,
          endline: 45,
          begincolumn: 5,
          endcolumn: 50,
          rule: 'AtLeastOneConstructor',
          ruleset: 'Code Style',
          priority: 3,
          description: 'Each class should declare at least one constructor'
        },
        {
          beginline: 67,
          endline: 67,
          begincolumn: 12,
          endcolumn: 45,
          rule: 'LongVariable',
          ruleset: 'Code Style',
          priority: 3,
          description: 'Avoid excessively long variable names like ownerRepository'
        }
      ]
    },
    {
      filename: '/workspace/src/main/java/org/springframework/samples/petclinic/vet/VetController.java',
      violations: [
        {
          beginline: 30,
          endline: 30,
          begincolumn: 1,
          endcolumn: 80,
          rule: 'UnusedImports',
          ruleset: 'Best Practices',
          priority: 4,
          description: 'Avoid unused imports such as java.util.List'
        }
      ]
    }
  ]
};

// Golangci-lint JSON output (from a Go project)
const REAL_GOLANGCI_OUTPUT = {
  Issues: [
    {
      FromLinter: 'govet',
      Text: 'possible nil pointer dereference',
      Severity: 'error',
      Pos: {
        Filename: 'main.go',
        Line: 45,
        Column: 10
      }
    },
    {
      FromLinter: 'staticcheck',
      Text: 'SA1019: strings.Title is deprecated',
      Severity: 'warning',
      Pos: {
        Filename: 'utils/helper.go',
        Line: 23,
        Column: 5
      }
    },
    {
      FromLinter: 'gosec',
      Text: 'G401 (CWE-326): Use of weak cryptographic primitive',
      Severity: 'warning',
      Pos: {
        Filename: 'crypto/hash.go',
        Line: 15,
        Column: 8
      }
    }
  ]
};

// Clippy JSON output (from a Rust project)
const REAL_CLIPPY_OUTPUT = [
  {
    reason: 'compiler-message',
    message: {
      code: { code: 'clippy::unwrap_used' },
      level: 'warning',
      message: 'used `unwrap()` on a `Result` value',
      spans: [
        {
          file_name: 'src/main.rs',
          line_start: 25,
          line_end: 25,
          column_start: 10,
          column_end: 20,
          text: [{ text: '    result.unwrap()' }]
        }
      ],
      children: [
        { message: 'help: if you want to panic on the Err value, use `expect`' }
      ]
    }
  },
  {
    reason: 'compiler-message',
    message: {
      code: { code: 'clippy::needless_return' },
      level: 'warning',
      message: 'unneeded `return` statement',
      spans: [
        {
          file_name: 'src/lib.rs',
          line_start: 50,
          line_end: 50,
          column_start: 5,
          column_end: 15
        }
      ]
    }
  }
];

// RuboCop JSON output (from a Rails project)
const REAL_RUBOCOP_OUTPUT = {
  files: [
    {
      path: 'app/controllers/users_controller.rb',
      offenses: [
        {
          cop_name: 'Metrics/MethodLength',
          severity: 'convention',
          message: 'Method has too many lines. [25/10]',
          location: { line: 15, column: 3, last_line: 40, last_column: 5 },
          correctable: false
        },
        {
          cop_name: 'Style/StringLiterals',
          severity: 'convention',
          message: "Prefer single-quoted strings when you don't need interpolation",
          location: { line: 20, column: 10, last_line: 20, last_column: 25 },
          correctable: true
        }
      ]
    },
    {
      path: 'app/models/user.rb',
      offenses: [
        {
          cop_name: 'Rails/HasManyOrHasOneDependent',
          severity: 'warning',
          message: 'Specify a :dependent option.',
          location: { line: 5, column: 3 },
          correctable: false
        }
      ]
    }
  ]
};

// PHPStan JSON output
const REAL_PHPSTAN_OUTPUT = {
  totals: { file_errors: 3, errors: 0 },
  files: {
    '/var/www/app/Services/UserService.php': {
      errors: 0,
      messages: [
        {
          message: 'Method UserService::findUser() should return User but returns User|null.',
          line: 45,
          ignorable: true,
          identifier: 'return.type'
        },
        {
          message: 'Parameter #1 $id of method UserRepository::find() expects int, string given.',
          line: 52,
          ignorable: false,
          identifier: 'argument.type'
        }
      ]
    },
    '/var/www/app/Controllers/ApiController.php': {
      errors: 0,
      messages: [
        {
          message: 'Call to an undefined method Response::setData().',
          line: 30,
          ignorable: false,
          identifier: 'method.notFound'
        }
      ]
    }
  }
};

// Bandit JSON output
const REAL_BANDIT_OUTPUT = {
  results: [
    {
      test_id: 'B301',
      test_name: 'blacklist_imports',
      filename: '/app/utils/crypto.py',
      line_number: 5,
      col_offset: 0,
      issue_severity: 'HIGH',
      issue_text: 'Use of insecure MD2, MD4, MD5, or SHA1 hash function.',
      issue_cwe: { id: 327 },
      code: 'import hashlib\nmd5_hash = hashlib.md5(data)'
    },
    {
      test_id: 'B605',
      test_name: 'start_process_with_a_shell',
      filename: '/app/scripts/runner.py',
      line_number: 25,
      col_offset: 4,
      issue_severity: 'MEDIUM',
      issue_text: 'Starting a process with a shell: Possible injection',
      issue_cwe: { id: 78 }
    }
  ]
};

// ============================================================
// TEST UTILITIES
// ============================================================

interface TestResult {
  name: string;
  passed: boolean;
  issueCount: number;
  details: string;
}

const results: TestResult[] = [];

function runParserTest(name: string, tool: string, output: any, expectedMinIssues: number, language: string): void {
  try {
    const parser = new EnhancedUniversalToolParser();
    const result = parser.parse(tool, output, { language });
    
    const passed = result.issues.length >= expectedMinIssues;
    results.push({
      name,
      passed,
      issueCount: result.issues.length,
      details: passed 
        ? `Parsed ${result.issues.length} issues (expected >= ${expectedMinIssues})` 
        : `Only parsed ${result.issues.length} issues (expected >= ${expectedMinIssues})`
    });

    // Log first issue for verification
    if (result.issues.length > 0 && process.env.VERBOSE) {
      console.log(`  First issue: ${JSON.stringify(result.issues[0], null, 2)}`);
    }
  } catch (error: any) {
    results.push({
      name,
      passed: false,
      issueCount: 0,
      details: `Error: ${error.message}`
    });
  }
}

function runValidationTest(name: string, tool: string, output: any, language: string): void {
  try {
    const wrapper = createParserValidationWrapper({
      language,
      enabled: true,
      forceEnhancedAll: true,
      logResults: false
    });

    // Simulate legacy issues (empty for this test)
    const legacyIssues: any[] = [];
    const result = wrapper.validate(tool, output, legacyIssues);

    const passed = result.length > 0;
    results.push({
      name,
      passed,
      issueCount: result.length,
      details: passed
        ? `Validation returned ${result.length} enhanced issues`
        : 'Validation returned no issues'
    });

    // Verify RawIssue structure
    if (result.length > 0) {
      const issue = result[0];
      const hasValidStructure = 
        typeof issue.tool === 'string' &&
        typeof issue.file === 'string' &&
        typeof issue.line === 'number' &&
        typeof issue.severity === 'string' &&
        typeof issue.message === 'string';
      
      if (!hasValidStructure) {
        results[results.length - 1].passed = false;
        results[results.length - 1].details = 'Invalid RawIssue structure';
      }
    }
  } catch (error: any) {
    results.push({
      name,
      passed: false,
      issueCount: 0,
      details: `Error: ${error.message}`
    });
  }
}

// ============================================================
// RUN TESTS
// ============================================================

console.log('\n╔══════════════════════════════════════════════════════════════════════════════╗');
console.log('║           ENHANCED PARSER E2E VALIDATION TEST                                ║');
console.log('║    Testing against real-world tool outputs                                   ║');
console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');

// Java tools
console.log('📦 Testing Java tools...');
runParserTest('PMD real output parsing', 'pmd', REAL_PMD_OUTPUT, 3, 'java');
runValidationTest('PMD validation wrapper', 'pmd', REAL_PMD_OUTPUT, 'java');

// Go tools
console.log('📦 Testing Go tools...');
runParserTest('Golangci-lint real output parsing', 'golangci-lint', REAL_GOLANGCI_OUTPUT, 3, 'go');
runValidationTest('Golangci-lint validation wrapper', 'golangci-lint', REAL_GOLANGCI_OUTPUT, 'go');

// Rust tools
console.log('📦 Testing Rust tools...');
runParserTest('Clippy real output parsing', 'clippy', REAL_CLIPPY_OUTPUT, 2, 'rust');
runValidationTest('Clippy validation wrapper', 'clippy', REAL_CLIPPY_OUTPUT, 'rust');

// Ruby tools
console.log('📦 Testing Ruby tools...');
runParserTest('RuboCop real output parsing', 'rubocop', REAL_RUBOCOP_OUTPUT, 3, 'ruby');
runValidationTest('RuboCop validation wrapper', 'rubocop', REAL_RUBOCOP_OUTPUT, 'ruby');

// PHP tools
console.log('📦 Testing PHP tools...');
runParserTest('PHPStan real output parsing', 'phpstan', REAL_PHPSTAN_OUTPUT, 3, 'php');
runValidationTest('PHPStan validation wrapper', 'phpstan', REAL_PHPSTAN_OUTPUT, 'php');

// Python tools
console.log('📦 Testing Python tools...');
runParserTest('Bandit real output parsing', 'bandit', REAL_BANDIT_OUTPUT, 2, 'python');
runValidationTest('Bandit validation wrapper', 'bandit', REAL_BANDIT_OUTPUT, 'python');

// ============================================================
// RESULTS
// ============================================================

console.log('\n┌──────────────────────────────────────────────────────────────────────────────┐');
console.log('│                         E2E TEST RESULTS                                     │');
console.log('├──────────────────────────────────────────────────────────────────────────────┤');

let passed = 0;
let failed = 0;

for (const result of results) {
  const status = result.passed ? '✅ PASS' : '❌ FAIL';
  const issueInfo = result.issueCount > 0 ? `(${result.issueCount} issues)` : '';
  console.log(`│ ${status} │ ${result.name.padEnd(45)} ${issueInfo.padEnd(12)} │`);
  console.log(`│        │ ${result.details.substring(0, 60).padEnd(60)} │`);

  if (result.passed) passed++;
  else failed++;
}

console.log('├──────────────────────────────────────────────────────────────────────────────┤');
console.log(`│ TOTAL: ${passed} passed, ${failed} failed                                              │`);
console.log('└──────────────────────────────────────────────────────────────────────────────┘');

if (failed > 0) {
  console.log('\n⚠️  Some E2E tests failed. Review parser implementations.');
  process.exit(1);
} else {
  console.log('\n✅ All E2E tests passed! Enhanced parser handles real-world outputs correctly.');
  console.log('\n📊 Summary:');
  console.log('  • Java (PMD): ✓');
  console.log('  • Go (golangci-lint): ✓');
  console.log('  • Rust (Clippy): ✓');
  console.log('  • Ruby (RuboCop): ✓');
  console.log('  • PHP (PHPStan): ✓');
  console.log('  • Python (Bandit): ✓');
  process.exit(0);
}



