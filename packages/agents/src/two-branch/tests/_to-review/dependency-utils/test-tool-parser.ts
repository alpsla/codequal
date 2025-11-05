/**
 * Test Tool Output Parser
 * Tests the parser with real tool outputs captured from our tests
 */

import { ToolOutputParser } from '../utils/tool-output-parser';
import * as fs from 'fs';

// Sample outputs from our testing
const sampleOutputs = {
  pmd: `
./clients/src/main/java/org/apache/kafka/common/requests/ApiVersionsResponse.java:297:	AvoidFieldNameMatchingMethodName:	Field 'data' has the same name as a method
./clients/src/main/java/org/apache/kafka/common/requests/ApiVersionsResponse.java:348:	UnusedPrivateMethod:	Avoid unused private methods such as 'setErrorIfAbsent(short,Errors)'.
./core/src/main/java/kafka/server/KafkaServer.java:123:	NullAssignment:	Avoid assigning null to a field
  `,

  checkstyle: `
Starting audit...
[WARN] /workspace/./repo/tools/src/main/java/org/apache/kafka/tools/PrintVersionAndExitAction.java:17:1: 'package' should be separated from previous line. [EmptyLineSeparator]
[ERROR] /workspace/./repo/tools/src/main/java/org/apache/kafka/tools/PrintVersionAndExitAction.java:22:1: Extra separation in import group before 'net.sourceforge.argparse4j.inf.Argument' [CustomImportOrder]
[WARN] /workspace/./repo/tools/src/main/java/org/apache/kafka/tools/TransactionalMessageCopier.java:60:1: Import statement for 'net.sourceforge.argparse4j.impl.Arguments.store' is in the wrong order. [CustomImportOrder]
Audit done.
  `,

  semgrepJson: `
{
  "results": [
    {
      "check_id": "java.lang.security.audit.dangerous-exec",
      "path": "src/main/java/com/example/VulnerableCode.java",
      "start": {"line": 45, "col": 12},
      "extra": {
        "message": "Dangerous use of user input in system command",
        "severity": "high"
      }
    }
  ]
}
  `,

  semgrepText: `
src/main/java/com/example/SecurityIssue.java
  ruleid: java.lang.security.injection.tainted-sql
  Message: SQL injection vulnerability detected
  Line 123: String query = "SELECT * FROM users WHERE id = " + userId;
  `,

  checkstyleNoIssues: `
Starting audit...
Audit done.
  `,

  pmdNoIssues: `
Processing started
Dec 21, 2025 3:15:22 AM
0 violations found
  `
};

async function testParser() {
  const parser = new ToolOutputParser();

  console.log('🧪 Testing Tool Output Parser\n');
  console.log('=' .repeat(50));

  // Test PMD parsing
  console.log('\n📋 Testing PMD Parser:');
  const pmdIssues = parser.parse('pmd', sampleOutputs.pmd);
  console.log(`Found ${pmdIssues.length} issues`);
  pmdIssues.forEach(issue => {
    console.log(`  - ${issue.file}:${issue.line} [${issue.severity}] ${issue.rule}`);
  });

  // Test Checkstyle parsing
  console.log('\n📋 Testing Checkstyle Parser:');
  const checkstyleIssues = parser.parse('checkstyle', sampleOutputs.checkstyle);
  console.log(`Found ${checkstyleIssues.length} issues`);
  checkstyleIssues.forEach(issue => {
    console.log(`  - ${issue.file}:${issue.line}:${issue.column} [${issue.severity}] ${issue.rule}`);
  });

  // Test Semgrep JSON parsing
  console.log('\n📋 Testing Semgrep JSON Parser:');
  const semgrepJsonIssues = parser.parse('semgrep', sampleOutputs.semgrepJson);
  console.log(`Found ${semgrepJsonIssues.length} issues`);
  semgrepJsonIssues.forEach(issue => {
    console.log(`  - ${issue.file}:${issue.line} [${issue.severity}] ${issue.rule}`);
  });

  // Test Semgrep text parsing
  console.log('\n📋 Testing Semgrep Text Parser:');
  const semgrepTextIssues = parser.parse('semgrep', sampleOutputs.semgrepText);
  console.log(`Found ${semgrepTextIssues.length} issues`);
  semgrepTextIssues.forEach(issue => {
    console.log(`  - ${issue.file}:${issue.line} [${issue.severity}] ${issue.rule}`);
  });

  // Test clean code scenarios
  console.log('\n📋 Testing Clean Code (0 issues):');
  const checkstyleClean = parser.parse('checkstyle', sampleOutputs.checkstyleNoIssues);
  console.log(`Checkstyle clean: ${checkstyleClean.length} issues (expected: 0)`);

  const pmdClean = parser.parse('pmd', sampleOutputs.pmdNoIssues);
  console.log(`PMD clean: ${pmdClean.length} issues (expected: 0)`);

  // Test with real files if available
  console.log('\n📋 Testing with real output files (if available):');

  const realFiles = [
    { path: '/tmp/checkstyle_optimized_output.log', tool: 'checkstyle' },
    { path: '/tmp/semgrep_optimized_output.log', tool: 'semgrep' },
    { path: '/tmp/pmd_output.log', tool: 'pmd' }
  ];

  for (const { path, tool } of realFiles) {
    if (fs.existsSync(path)) {
      const content = fs.readFileSync(path, 'utf-8');
      const issues = parser.parse(tool, content);
      console.log(`  - ${tool}: ${issues.length} issues found in ${path}`);

      // Show first 3 issues as examples
      if (issues.length > 0) {
        console.log(`    Sample issues:`);
        issues.slice(0, 3).forEach(issue => {
          console.log(`      • ${issue.file}:${issue.line} [${issue.severity}] ${issue.message?.substring(0, 50)}...`);
        });
      }
    } else {
      console.log(`  - ${path} not found (skipping)`);
    }
  }

  // Test combining and deduplication
  console.log('\n📋 Testing Issue Combination and Deduplication:');
  const allIssues = new Map([
    ['pmd', pmdIssues],
    ['checkstyle', checkstyleIssues],
    ['semgrep', [...semgrepJsonIssues, ...semgrepTextIssues]]
  ]);

  const combined = ToolOutputParser.combineIssues(allIssues);
  console.log(`Total unique issues: ${combined.length}`);
  console.log(`Critical: ${combined.filter(i => i.severity === 'critical').length}`);
  console.log(`High: ${combined.filter(i => i.severity === 'high').length}`);
  console.log(`Medium: ${combined.filter(i => i.severity === 'medium').length}`);
  console.log(`Low: ${combined.filter(i => i.severity === 'low').length}`);

  console.log('\n✅ Parser test complete!');

  // Return summary for validation
  return {
    pmd: pmdIssues.length,
    checkstyle: checkstyleIssues.length,
    semgrep: semgrepJsonIssues.length + semgrepTextIssues.length,
    cleanCode: checkstyleClean.length + pmdClean.length,
    combined: combined.length
  };
}

// Run the test if executed directly
if (require.main === module) {
  testParser().then(summary => {
    console.log('\n📊 Summary:', summary);

    // Validate expectations
    const passed =
      summary.pmd === 3 &&
      summary.checkstyle === 3 &&
      summary.semgrep === 2 &&
      summary.cleanCode === 0;

    if (passed) {
      console.log('✅ All tests passed!');
      process.exit(0);
    } else {
      console.log('❌ Some tests failed - check the output');
      process.exit(1);
    }
  }).catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
}

export { testParser };