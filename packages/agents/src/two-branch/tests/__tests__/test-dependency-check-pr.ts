/**
 * Test Dependency-Check on PR Branch
 *
 * Tests that Dependency-Check finds CVEs on PR branch.
 * Uses Log4Shell test repository with vulnerable Log4j 2.14.1 (CVE-2021-44228).
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '/Users/alpinro/Code Prjects/codequal/packages/agents/.env' });

import { JavaToolOrchestrator } from '../../tools/java/java-tool-orchestrator';
import * as fs from 'fs';

const LOG4SHELL_REPO = '/tmp/log4shell-test';

async function testDependencyCheckOnPR() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  DEPENDENCY-CHECK PR TEST - Log4Shell CVE Detection');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log('Repository: /tmp/log4shell-test');
  console.log('PR Branch: pr-with-vulnerable-log4j');
  console.log('Vulnerability: CVE-2021-44228 (Log4Shell)');
  console.log('Expected: Dependency-Check should find Log4j 2.14.1 CVEs\n');

  if (!fs.existsSync(LOG4SHELL_REPO)) {
    console.error(`❌ Test repository not found: ${LOG4SHELL_REPO}`);
    process.exit(1);
  }

  try {
    console.log('🔧 Creating JavaToolOrchestrator with Dependency-Check enabled...\n');

    const orchestrator = new JavaToolOrchestrator({
      pmd: {
        enabled: false,  // Disable others to focus on Dependency-Check
        minimumPriority: 2,
        rulesets: [],
        parallel: 2,
        threads: 3,
        memory: '5g'
      },
      semgrep: {
        enabled: false,
        rulesets: [],
        parallel: 4,
        smartSelection: false,
        memory: '2g'
      },
      dependencyCheck: {
        enabled: true,
        failOnCVSS: 7.0,  // Log4Shell is 10.0 - should be detected
        timeout: 300,
        postgres: {
          enabled: true,
          connectionString: process.env.ORACLE_DEPCHECK_DB_URL || 'jdbc:postgresql://129.213.49.128:5432/nvd',
          dbUser: process.env.ORACLE_DEPCHECK_DB_USER || 'depcheck_scanner',
          dbPassword: process.env.ORACLE_DEPCHECK_DB_PASSWORD || '',
          dbDriver: process.env.ORACLE_DEPCHECK_JDBC_DRIVER || '/tmp/jdbc-drivers/postgresql-42.7.1.jar'
        }
      },
      checkstyle: {
        enabled: false,
        configFile: '/google_checks.xml',
        parallel: 2,
        memory: '3g',
        changedFilesOnly: false
      }
    });

    // Switch to PR branch first
    console.log('🔀 Switching to PR branch: pr-with-vulnerable-log4j\n');
    const { execSync } = require('child_process');
    execSync('git checkout pr-with-vulnerable-log4j', { cwd: LOG4SHELL_REPO, stdio: 'ignore' });

    console.log('🔍 Running Dependency-Check on PR branch...');
    console.log('This may take 30-60 seconds for CVE database lookup...\n');

    const startTime = Date.now();
    const result = await orchestrator.orchestrate(LOG4SHELL_REPO, 'pr');
    const duration = Date.now() - startTime;

    console.log(`\n✅ Analysis complete in ${Math.round(duration/1000)}s`);

    // Get Dependency-Check results
    const depCheckResult = result.toolResults.find(r => r.tool === 'Dependency-Check');

    if (!depCheckResult) {
      console.log('\n❌ FAILURE: Dependency-Check did not execute');
      process.exit(1);
    }

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('DEPENDENCY-CHECK RESULTS:');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log(`Success: ${depCheckResult.success}`);
    console.log(`Duration: ${depCheckResult.duration}ms`);
    console.log(`CVEs Found: ${depCheckResult.issues.length}`);

    if (depCheckResult.issues.length === 0) {
      console.log('\n❌ WARNING: Dependency-Check found 0 CVEs');
      console.log('Expected to find Log4Shell (CVE-2021-44228) in Log4j 2.14.1');
      console.log('\nPossible causes:');
      console.log('  1. CVE database not loaded (check Postgres connection)');
      console.log('  2. NVD_API_KEY not set');
      console.log('  3. Log4j dependencies not detected in pom.xml');
      console.log('  4. CVSS threshold too high (>10.0)');
      console.log('\nDebugging:');
      console.log('  - Check: cat /tmp/log4shell-test/pom.xml');
      console.log('  - Verify Log4j version is 2.14.1');
      console.log('  - Check Dependency-Check JSON output\n');
    } else {
      console.log('\n✅ SUCCESS: Dependency-Check found CVEs!\n');

      // Show all CVEs
      console.log('ALL CVEs DETECTED:\n');
      for (let i = 0; i < depCheckResult.issues.length; i++) {
        const issue = depCheckResult.issues[i];
        console.log(`${i + 1}. ${issue.cve || issue.rule}`);
        console.log(`   File: ${issue.file}`);
        console.log(`   Severity: ${issue.severity} (CVSS: ${issue.cvssScore})`);
        console.log(`   Message: ${issue.message?.substring(0, 80)}...`);
        console.log('');
      }

      // Check for Log4Shell specifically
      const log4shellIssue = depCheckResult.issues.find(i =>
        i.cve === 'CVE-2021-44228' || i.message?.includes('CVE-2021-44228')
      );

      if (log4shellIssue) {
        console.log('🎯 Log4Shell (CVE-2021-44228) DETECTED:');
        console.log('─'.repeat(55));
        console.log(`   CVSS Score: ${log4shellIssue.cvssScore} (CRITICAL)`);
        console.log(`   Severity: ${log4shellIssue.severity}`);
        console.log(`   Component: ${log4shellIssue.file}`);
        console.log('   ✅ Correctly identified the most critical vulnerability!\n');
      } else {
        console.log('⚠️  Log4Shell (CVE-2021-44228) not found in results');
        console.log('   Found other CVEs instead\n');
      }
    }

    // Validation
    console.log('═══════════════════════════════════════════════════════');
    console.log('VALIDATION:');
    console.log('═══════════════════════════════════════════════════════\n');

    const validations = {
      'Dependency-Check executed on PR branch': depCheckResult.success,
      'CVEs found': depCheckResult.issues.length > 0,
      'Log4Shell detected': depCheckResult.issues.some(i =>
        i.cve === 'CVE-2021-44228' || i.message?.includes('CVE-2021-44228')
      ),
      'CVSS scores present': depCheckResult.issues.some(i => i.cvssScore && i.cvssScore > 0),
      'All issues have required fields': depCheckResult.issues.every(i =>
        i.file && i.severity && i.message
      )
    };

    for (const [check, passed] of Object.entries(validations)) {
      const status = passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${status}: ${check}`);
    }

    console.log('\n');

    const allPassed = Object.values(validations).every(v => v);
    if (allPassed) {
      console.log('🎉 SUCCESS: Dependency-Check is working correctly!');
      console.log('✅ CVE detection validated on PR branch');
      console.log('✅ Log4Shell vulnerability correctly identified\n');
      process.exit(0);
    } else {
      console.log('❌ FAILURE: Some validations failed');
      console.log('Please review the failures above\n');
      process.exit(1);
    }

  } catch (error: any) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testDependencyCheckOnPR();
}

export { testDependencyCheckOnPR };
