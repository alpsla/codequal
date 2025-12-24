/**
 * Parser Shadow Mode Test for Java
 *
 * Demonstrates how to use shadow mode to safely transition
 * from legacy inline parsing to EnhancedUniversalToolParser.
 *
 * Usage:
 *   npx ts-node tests/integration/java/test-parser-shadow-mode.ts
 */

import dotenv from 'dotenv';
dotenv.config();

import {
  EnhancedUniversalToolParser,
  ParserShadowMode,
  createShadowModeForOrchestrator
} from '../../../src/two-branch/parsers';

// Sample tool outputs for testing
const SAMPLE_OUTPUTS = {
  checkstyle: `<?xml version="1.0" encoding="UTF-8"?>
<checkstyle version="8.45.1">
  <file name="src/main/java/com/example/User.java">
    <error line="15" column="5" severity="warning" message="Missing a Javadoc comment." source="com.puppycrawl.tools.checkstyle.checks.javadoc.MissingJavadocMethodCheck"/>
    <error line="25" column="1" severity="error" message="Line is longer than 120 characters (found 145)." source="com.puppycrawl.tools.checkstyle.checks.sizes.LineLengthCheck"/>
  </file>
  <file name="src/main/java/com/example/Service.java">
    <error line="10" column="9" severity="warning" message="'if' construct must use '{}'s." source="com.puppycrawl.tools.checkstyle.checks.blocks.NeedBracesCheck"/>
  </file>
</checkstyle>`,

  eslint: [
    {
      filePath: '/project/src/components/App.tsx',
      messages: [
        {
          ruleId: 'no-unused-vars',
          severity: 2,
          message: "'useState' is defined but never used.",
          line: 1,
          column: 10,
          endLine: 1,
          endColumn: 18
        },
        {
          ruleId: 'react/jsx-key',
          severity: 1,
          message: 'Missing "key" prop for element in iterator',
          line: 15,
          column: 12
        }
      ],
      errorCount: 1,
      warningCount: 1
    }
  ],

  spotbugs: `<?xml version="1.0" encoding="UTF-8"?>
<BugCollection>
  <BugInstance type="NP_NULL_ON_SOME_PATH" priority="2" category="CORRECTNESS">
    <SourceLine sourcefile="UserService.java" start="45" end="45"/>
    <LongMessage>Possible null pointer dereference in method getUserById</LongMessage>
  </BugInstance>
  <BugInstance type="SQL_INJECTION" priority="1" category="SECURITY">
    <SourceLine sourcefile="DatabaseHelper.java" start="112" end="115"/>
    <LongMessage>This method constructs a SQL query using untrusted data</LongMessage>
  </BugInstance>
</BugCollection>`,

  semgrep: {
    results: [
      {
        check_id: 'java.security.sql-injection',
        path: 'src/main/java/com/example/Repository.java',
        start: { line: 42, col: 8 },
        end: { line: 42, col: 65 },
        extra: {
          message: 'SQL injection vulnerability detected',
          severity: 'ERROR',
          metadata: {
            category: 'security',
            cwe: 'CWE-89',
            owasp: 'A03:2021'
          }
        }
      }
    ]
  },

  ruff: [
    {
      code: 'E501',
      filename: 'app/models.py',
      location: { row: 15, column: 120 },
      end_location: { row: 15, column: 150 },
      message: 'Line too long (150 > 120)',
      fix: null
    },
    {
      code: 'S101',
      filename: 'tests/test_auth.py',
      location: { row: 25, column: 5 },
      end_location: { row: 25, column: 15 },
      message: "Use of 'assert' detected",
      fix: null
    }
  ],

  golangciLint: {
    Issues: [
      {
        FromLinter: 'errcheck',
        Text: 'Error return value is not checked',
        Pos: {
          Filename: 'handlers/user.go',
          Line: 45,
          Column: 12
        }
      },
      {
        FromLinter: 'gosec',
        Text: 'Potential hardcoded credentials',
        Severity: 'HIGH',
        Pos: {
          Filename: 'config/database.go',
          Line: 22,
          Column: 8
        }
      }
    ]
  }
};

/**
 * Legacy parser functions (simulating what orchestrators currently do)
 */
const legacyParsers = {
  checkstyle: (output: string) => {
    const issues: any[] = [];
    const fileRegex = /<file name="([^"]+)">([\s\S]*?)<\/file>/g;
    const errorRegex = /<error line="(\d+)" column="(\d+)" severity="(\w+)" message="([^"]+)"[^>]*\/>/g;

    let fileMatch;
    while ((fileMatch = fileRegex.exec(output)) !== null) {
      const filePath = fileMatch[1];
      const fileContent = fileMatch[2];

      let errorMatch;
      while ((errorMatch = errorRegex.exec(fileContent)) !== null) {
        issues.push({
          file: filePath,
          line: parseInt(errorMatch[1]),
          column: parseInt(errorMatch[2]),
          severity: errorMatch[3],
          message: errorMatch[4],
          type: 'quality',
          tool: 'checkstyle'
        });
      }
    }
    return issues;
  },

  eslint: (output: any[]) => {
    const issues: any[] = [];
    for (const file of output) {
      for (const msg of (file.messages || [])) {
        issues.push({
          file: file.filePath,
          line: msg.line,
          column: msg.column,
          severity: msg.severity === 2 ? 'high' : 'medium',
          message: msg.message,
          type: 'quality',
          ruleId: msg.ruleId,
          tool: 'eslint'
        });
      }
    }
    return issues;
  },

  semgrep: (output: any) => {
    return (output.results || []).map((r: any) => ({
      file: r.path,
      line: r.start?.line,
      column: r.start?.col,
      severity: r.extra?.severity === 'ERROR' ? 'high' : 'medium',
      message: r.extra?.message || r.check_id,
      type: 'security',
      ruleId: r.check_id,
      tool: 'semgrep'
    }));
  }
};

async function testEnhancedParser(): Promise<void> {
  console.log('\n=== Test 1: Enhanced Parser Direct Usage ===\n');

  const parser = new EnhancedUniversalToolParser();

  // Test checkstyle parsing
  console.log('Testing Checkstyle XML parsing...');
  const checkstyleResult = parser.parse('checkstyle', SAMPLE_OUTPUTS.checkstyle, { language: 'java' });
  console.log(`  Found ${checkstyleResult.issues.length} issues`);
  for (const issue of checkstyleResult.issues) {
    console.log(`    - ${issue.location.file}:${issue.location.line} [${issue.severity}] ${issue.title}`);
  }

  // Test ESLint parsing
  console.log('\nTesting ESLint JSON parsing...');
  const eslintResult = parser.parse('eslint', SAMPLE_OUTPUTS.eslint, { language: 'typescript' });
  console.log(`  Found ${eslintResult.issues.length} issues`);
  for (const issue of eslintResult.issues) {
    console.log(`    - ${issue.location.file}:${issue.location.line} [${issue.severity}] ${issue.title}`);
  }

  // Test SpotBugs parsing
  console.log('\nTesting SpotBugs XML parsing...');
  const spotbugsResult = parser.parse('spotbugs', SAMPLE_OUTPUTS.spotbugs, { language: 'java' });
  console.log(`  Found ${spotbugsResult.issues.length} issues`);
  for (const issue of spotbugsResult.issues) {
    console.log(`    - ${issue.location.file}:${issue.location.line} [${issue.type}/${issue.severity}] ${issue.title}`);
  }

  // Test Semgrep parsing
  console.log('\nTesting Semgrep JSON parsing...');
  const semgrepResult = parser.parse('semgrep', SAMPLE_OUTPUTS.semgrep, { language: 'java' });
  console.log(`  Found ${semgrepResult.issues.length} issues`);
  for (const issue of semgrepResult.issues) {
    console.log(`    - ${issue.location.file}:${issue.location.line} [${issue.type}/${issue.severity}] ${issue.title}`);
  }

  // Test Ruff parsing
  console.log('\nTesting Ruff JSON parsing...');
  const ruffResult = parser.parse('ruff', SAMPLE_OUTPUTS.ruff, { language: 'python' });
  console.log(`  Found ${ruffResult.issues.length} issues`);
  for (const issue of ruffResult.issues) {
    console.log(`    - ${issue.location.file}:${issue.location.line} [${issue.type}/${issue.severity}] ${issue.title}`);
  }

  // Test golangci-lint parsing
  console.log('\nTesting golangci-lint JSON parsing...');
  const golangciResult = parser.parse('golangci-lint', SAMPLE_OUTPUTS.golangciLint, { language: 'go' });
  console.log(`  Found ${golangciResult.issues.length} issues`);
  for (const issue of golangciResult.issues) {
    console.log(`    - ${issue.location.file}:${issue.location.line} [${issue.type}/${issue.severity}] ${issue.title}`);
  }
}

async function testShadowMode(): Promise<void> {
  console.log('\n=== Test 2: Shadow Mode Comparison ===\n');

  const shadowMode = createShadowModeForOrchestrator('java', {
    logComparisons: true,
    switchThreshold: 0.9
  });

  // Test checkstyle shadow mode
  console.log('Testing Checkstyle with shadow mode...');
  const checkstyleResult = shadowMode.compare(
    'checkstyle',
    SAMPLE_OUTPUTS.checkstyle,
    legacyParsers.checkstyle,
    { language: 'java' }
  );

  console.log(`  Using ${checkstyleResult.useEnhanced ? 'Enhanced' : 'Legacy'} parser`);
  console.log(`  Differences: ${checkstyleResult.differences.length}`);

  // Test ESLint shadow mode
  console.log('\nTesting ESLint with shadow mode...');
  const eslintResult = shadowMode.compare(
    'eslint',
    SAMPLE_OUTPUTS.eslint,
    legacyParsers.eslint,
    { language: 'typescript' }
  );

  console.log(`  Using ${eslintResult.useEnhanced ? 'Enhanced' : 'Legacy'} parser`);
  console.log(`  Differences: ${eslintResult.differences.length}`);

  // Test Semgrep shadow mode
  console.log('\nTesting Semgrep with shadow mode...');
  const semgrepResult = shadowMode.compare(
    'semgrep',
    SAMPLE_OUTPUTS.semgrep,
    legacyParsers.semgrep,
    { language: 'java' }
  );

  console.log(`  Using ${semgrepResult.useEnhanced ? 'Enhanced' : 'Legacy'} parser`);
  console.log(`  Differences: ${semgrepResult.differences.length}`);

  // Print summary
  console.log('\n=== Shadow Mode Summary ===\n');
  const summary = shadowMode.getSummary();
  console.log(`Total comparisons: ${summary.totalComparisons}`);
  console.log(`Overall match rate: ${(summary.overallMatchRate * 100).toFixed(1)}%`);
  console.log('\nBy tool:');
  for (const [tool, stats] of Object.entries(summary.byTool)) {
    console.log(`  ${tool}: ${(stats.avgMatchRate * 100).toFixed(1)}% match, using ${stats.usingEnhanced ? 'enhanced' : 'legacy'}`);
  }
}

async function testDifferenceDetection(): Promise<void> {
  console.log('\n=== Test 3: Difference Detection ===\n');

  const shadowMode = new ParserShadowMode({ logComparisons: false });

  // Create a legacy parser that intentionally differs
  const intentionallyDifferentParser = (output: any[]) => {
    // Return fewer issues and different severities
    return output.slice(0, 1).flatMap(file =>
      (file.messages || []).slice(0, 1).map((msg: any) => ({
        file: file.filePath,
        line: msg.line,
        severity: 'low',  // Intentionally different
        message: msg.message,
        type: 'bug',  // Intentionally different
        ruleId: msg.ruleId
      }))
    );
  };

  const result = shadowMode.compare(
    'eslint',
    SAMPLE_OUTPUTS.eslint,
    intentionallyDifferentParser,
    { language: 'typescript' }
  );

  console.log('Intentional difference test:');
  console.log(`  Enhanced found: ${result.enhanced.issues.length} issues`);
  console.log(`  Legacy found: ${result.legacy.issues.length} issues`);
  console.log(`  Differences detected: ${result.differences.length}`);

  for (const diff of result.differences) {
    console.log(`    - ${diff.type}: ${diff.details}`);
  }
}

async function main(): Promise<void> {
  console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                     PARSER SHADOW MODE TEST                                  ║
║  Testing EnhancedUniversalToolParser with shadow mode comparison             ║
╚══════════════════════════════════════════════════════════════════════════════╝
`);

  try {
    await testEnhancedParser();
    await testShadowMode();
    await testDifferenceDetection();

    console.log('\n✅ All parser shadow mode tests completed successfully!\n');
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
