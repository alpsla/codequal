/**
 * Test Semgrep on WebGoat - Intentionally Vulnerable Java Application
 *
 * WebGoat is OWASP's deliberately insecure app for security training.
 * Semgrep SHOULD find many security issues here.
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '/Users/alpinro/Code Prjects/codequal/packages/agents/.env' });

import { V9ToolOrchestrator } from '../../analyzers/v9-tool-orchestrator';

const WEBGOAT_REPO = '/tmp/WebGoat';

async function testSemgrepOnVulnerableRepo() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  SEMGREP VALIDATION TEST - WebGoat (Vulnerable App)');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log('Repository: OWASP WebGoat (intentionally vulnerable)');
  console.log('Java Files: 370');
  console.log('Expected: Security issues SHOULD be found\n');

  try {
    const orchestrator = new V9ToolOrchestrator();

    console.log('🔍 Running Java analysis with ALL severities...\n');

    const startTime = Date.now();
    const issues = await orchestrator.orchestrateJavaAnalysis(
      WEBGOAT_REPO,
      'main',
      undefined,
      { severityFilter: 'all' }  // Get ALL issues to see everything
    );
    const duration = Date.now() - startTime;

    console.log(`\n✅ Analysis complete in ${Math.round(duration/1000)}s`);
    console.log(`📊 Total issues found: ${issues.length}\n`);

    // Break down by tool
    const byTool: Record<string, number> = {};
    const bySeverity: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };

    for (const issue of issues) {
      byTool[issue.tool] = (byTool[issue.tool] || 0) + 1;
      bySeverity[issue.severity]++;
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('BREAKDOWN BY TOOL:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    for (const [tool, count] of Object.entries(byTool)) {
      console.log(`${tool}: ${count} issues`);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('BREAKDOWN BY SEVERITY:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log(`Critical: ${bySeverity.critical}`);
    console.log(`High: ${bySeverity.high}`);
    console.log(`Medium: ${bySeverity.medium}`);
    console.log(`Low: ${bySeverity.low}`);

    // Show Semgrep issues specifically
    const semgrepIssues = issues.filter(i => i.tool === 'Semgrep');

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`SEMGREP ISSUES: ${semgrepIssues.length}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (semgrepIssues.length === 0) {
      console.log('❌ WARNING: No Semgrep issues found on VULNERABLE repository!');
      console.log('   This suggests Semgrep may not be detecting issues correctly.\n');
    } else {
      console.log(`✅ SUCCESS: Semgrep found ${semgrepIssues.length} security issues\n`);

      // Show first 3 Semgrep issues to validate format
      console.log('SAMPLE SEMGREP ISSUES (First 3):\n');

      for (let i = 0; i < Math.min(3, semgrepIssues.length); i++) {
        const issue = semgrepIssues[i];
        console.log(`${i + 1}. ${issue.title || issue.category}`);
        console.log(`   File: ${issue.file}:${issue.line}`);
        console.log(`   Severity: ${issue.severity}`);
        console.log(`   Category: ${issue.category}`);
        console.log(`   Description: ${(issue.description || '').substring(0, 100)}...`);

        // Validate all required fields
        const requiredFields = {
          'Title': issue.title,
          'Description': issue.description,
          'Severity': issue.severity,
          'File': issue.file,
          'Line': issue.line,
          'Code Snippet': issue.codeSnippet,
          'Suggestion': issue.suggestion
        };

        console.log('   Required Fields:');
        for (const [field, value] of Object.entries(requiredFields)) {
          const status = value ? '✅' : '❌';
          console.log(`     ${status} ${field}: ${value ? 'Present' : 'MISSING'}`);
        }
        console.log('');
      }
    }

    console.log('═══════════════════════════════════════════════════════');
    console.log('VALIDATION RESULTS:');
    console.log('═══════════════════════════════════════════════════════\n');

    const validations = {
      'Semgrep executed': issues.some(i => i.tool === 'Semgrep' || i.tool === 'PMD'),
      'Security issues found': semgrepIssues.length > 0,
      'Issues have all required fields': semgrepIssues.length > 0 && semgrepIssues.every(i =>
        i.title && i.description && i.severity && i.file && i.line
      ),
      'Code snippets present': semgrepIssues.length > 0 && semgrepIssues.some(i => i.codeSnippet),
      'Suggestions present': semgrepIssues.length > 0 && semgrepIssues.some(i => i.suggestion)
    };

    for (const [check, passed] of Object.entries(validations)) {
      const status = passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${status}: ${check}`);
    }

    console.log('\n═══════════════════════════════════════════════════════\n');

    if (!validations['Security issues found']) {
      console.log('⚠️  RECOMMENDATION: Investigate why Semgrep found 0 issues');
      console.log('   Possible causes:');
      console.log('   1. Semgrep configuration incorrect');
      console.log('   2. Rulesets not detecting these vulnerability types');
      console.log('   3. Docker container issue');
      console.log('   4. Repository structure not as expected\n');
    }

    process.exit(validations['Security issues found'] ? 0 : 1);

  } catch (error: any) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testSemgrepOnVulnerableRepo();
}

export { testSemgrepOnVulnerableRepo };
