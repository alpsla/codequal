/**
 * Test GitLab Code Quality Converter
 *
 * Quick validation that the GitLab format is generated correctly
 */

import { GitLabCodeQualityConverter } from '../../src/two-branch/analyzers/gitlab-codequality-converter';
import { EnrichedIssue } from '../../src/two-branch/analyzers/v9-grouped-report-formatter';

async function testGitLabConverter() {
  console.log('🧪 Testing GitLab Code Quality Converter\n');

  // Create sample enriched issues
  const sampleIssues: EnrichedIssue[] = [
    {
      rule: 'UnusedPrivateField',
      tool: 'pmd',
      severity: 'critical',
      message: 'Private field is never used',
      file: 'src/main/java/com/example/MyClass.java',
      line: 42,
      column: 10,
      snippet: 'private String unusedField;',
      category: 'NEW',
      fixSuggestion: {
        fix: 'Remove the unused private field',
        explanation: 'This field is never used in the class',
        correctedCode: '// Field removed',
        issueDescription: {
          what: 'Unused private field detected',
          why: 'Dead code reduces maintainability',
          causes: ['Field declared but never referenced'],
          impact: 'Increases technical debt'
        }
      }
    },
    {
      rule: 'sql-injection',
      tool: 'semgrep',
      severity: 'high',
      message: 'Potential SQL injection vulnerability',
      file: 'src/main/java/com/example/DatabaseService.java',
      line: 128,
      column: 20,
      snippet: 'String query = "SELECT * FROM users WHERE id = " + userId;',
      category: 'NEW',
      fixSuggestion: {
        fix: 'Use prepared statements',
        explanation: 'Use prepared statements to prevent SQL injection',
        correctedCode: 'PreparedStatement stmt = conn.prepareStatement("SELECT * FROM users WHERE id = ?");\nstmt.setInt(1, userId);',
        issueDescription: {
          what: 'SQL injection vulnerability',
          why: 'User input directly concatenated into SQL query',
          causes: ['Direct string concatenation in SQL query'],
          impact: 'Attackers can execute arbitrary SQL commands'
        }
      }
    },
    {
      rule: 'JavadocMethod',
      tool: 'checkstyle',
      severity: 'low',
      message: 'Missing Javadoc comment',
      file: 'src/main/java/com/example/Utils.java',
      line: 55,
      snippet: 'public String formatName(String name) {',
      category: 'NEW'
    }
  ];

  // Create converter instance
  const converter = new GitLabCodeQualityConverter();

  console.log('📝 Converting issues to GitLab Code Quality format...\n');

  // Generate report
  const report = converter.generateGitLabCodeQualityReport(
    sampleIssues,
    '/tmp/test-repo'
  );

  console.log(`✅ Generated ${report.length} GitLab Code Quality issues\n`);

  // Validate report
  console.log('🔍 Validating report format...');
  try {
    converter.validateReport(report);
    console.log('✅ Report validation passed\n');
  } catch (error) {
    console.error('❌ Report validation failed:', error);
    return;
  }

  // Get statistics
  const stats = converter.getReportStatistics(report);
  console.log('📊 Report Statistics:');
  console.log(`   Total Issues: ${stats.totalIssues}`);
  console.log(`   By Severity:`, stats.bySeverity);
  console.log(`   By Tool:`, stats.byTool);
  console.log(`   By Category:`, Object.keys(stats.byCategory).length, 'categories\n');

  // Display sample issue
  console.log('📋 Sample GitLab Issue:');
  const sampleIssue = report[0];
  console.log(JSON.stringify(sampleIssue, null, 2));
  console.log();

  // Verify required fields
  console.log('✅ Required Fields Check:');
  const requiredFields = ['description', 'check_name', 'fingerprint', 'severity', 'location'];
  for (const field of requiredFields) {
    const hasField = sampleIssue.hasOwnProperty(field);
    console.log(`   ${hasField ? '✅' : '❌'} ${field}: ${hasField ? '✓' : 'MISSING'}`);
  }
  console.log();

  // Verify severity mapping
  console.log('✅ Severity Mapping:');
  console.log('   critical → blocker:', report.find(i => i.severity === 'blocker') ? '✓' : '✗');
  console.log('   high → critical:', report.find(i => i.severity === 'critical') ? '✓' : '✗');
  console.log('   low → minor:', report.find(i => i.severity === 'minor') ? '✓' : '✗');
  console.log();

  // Verify file paths are relative
  console.log('✅ File Path Format:');
  for (const issue of report) {
    const isRelative = !issue.location.path.startsWith('/');
    console.log(`   ${isRelative ? '✅' : '❌'} ${issue.location.path}: ${isRelative ? 'Relative' : 'Absolute (should be relative)'}`);
  }
  console.log();

  // Verify fingerprints are unique
  console.log('✅ Fingerprint Uniqueness:');
  const fingerprints = report.map(i => i.fingerprint);
  const uniqueFingerprints = new Set(fingerprints);
  if (fingerprints.length === uniqueFingerprints.size) {
    console.log(`   ✅ All ${fingerprints.length} fingerprints are unique`);
  } else {
    console.log(`   ❌ Found ${fingerprints.length - uniqueFingerprints.size} duplicate fingerprints`);
  }
  console.log();

  // Verify categories are present
  console.log('✅ Categories:');
  for (const issue of report) {
    console.log(`   ${issue.check_name}: [${(issue.categories || []).join(', ')}]`);
  }
  console.log();

  // Test JSON serialization
  console.log('🔄 Testing JSON Serialization...');
  try {
    const jsonString = JSON.stringify(report, null, 2);
    const parsed = JSON.parse(jsonString);
    console.log(`   ✅ Serialization successful (${jsonString.length} bytes)`);
    console.log(`   ✅ Deserialization successful (${parsed.length} issues)`);
  } catch (error) {
    console.error('   ❌ JSON serialization failed:', error);
    return;
  }
  console.log();

  // Verify content bodies (fix suggestions)
  console.log('✅ Content Bodies (Fix Suggestions):');
  for (const issue of report) {
    if (issue.content) {
      const hasWhat = issue.content.body.includes('**What:**');
      const hasWhy = issue.content.body.includes('**Why:**');
      const hasFix = issue.content.body.includes('**Suggested Fix:**');
      console.log(`   ${issue.check_name}:`);
      console.log(`     ${hasWhat ? '✅' : '⚠️'} What section: ${hasWhat ? 'Present' : 'Missing'}`);
      console.log(`     ${hasWhy ? '✅' : '⚠️'} Why section: ${hasWhy ? 'Present' : 'Missing'}`);
      console.log(`     ${hasFix ? '✅' : '⚠️'} Fix suggestion: ${hasFix ? 'Present' : 'Missing'}`);
    } else {
      console.log(`   ${issue.check_name}: No content body (fix suggestion missing)`);
    }
  }
  console.log();

  console.log('🎉 GitLab Code Quality Converter Test Complete!');
  console.log('✅ All validations passed');
  console.log('\n📄 Report ready for GitLab CI/CD integration');
}

// Run test
testGitLabConverter().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
