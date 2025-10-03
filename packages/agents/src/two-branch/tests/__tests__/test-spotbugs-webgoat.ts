/**
 * Test SpotBugs on WebGoat with Compilation
 *
 * SpotBugs requires compiled bytecode (.class files) to work.
 * This test compiles WebGoat with Maven, then runs SpotBugs.
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '/Users/alpinro/Code Prjects/codequal/packages/agents/.env' });

import { JavaToolOrchestrator } from '../../tools/java/java-tool-orchestrator';
import * as fs from 'fs';

const WEBGOAT_REPO = '/tmp/WebGoat';

async function testSpotBugsWithCompilation() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  SPOTBUGS VALIDATION TEST - WebGoat (with compilation)');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log('Repository: OWASP WebGoat');
  console.log('Java Files: 370');
  console.log('Build: Maven (mvn compile)');
  console.log('Expected: SpotBugs should find bugs in compiled code\n');

  if (!fs.existsSync(WEBGOAT_REPO)) {
    console.error(`❌ Test repository not found: ${WEBGOAT_REPO}`);
    console.error('Please run: cd /tmp && git clone https://github.com/WebGoat/WebGoat.git');
    process.exit(1);
  }

  try {
    console.log('🔧 Creating JavaToolOrchestrator with SpotBugs enabled...\n');

    const orchestrator = new JavaToolOrchestrator({
      pmd: {
        enabled: false,  // Disable others to focus on SpotBugs
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
        enabled: false,
        failOnCVSS: 7.0,
        timeout: 300
      },
      checkstyle: {
        enabled: false,
        configFile: '/google_checks.xml',
        parallel: 2,
        memory: '3g',
        changedFilesOnly: false
      },
      spotbugs: {
        enabled: true,
        priority: 'high',  // Only high-priority bugs
        effort: 'default',
        buildCommand: 'cd /tmp/WebGoat && mvn clean compile -DskipTests -q',
        memory: '4g'
      }
    });

    console.log('🏗️  Compiling WebGoat with Maven...');
    console.log('This may take 2-3 minutes on first run...\n');

    const startTime = Date.now();
    const result = await orchestrator.orchestrate(WEBGOAT_REPO, 'main');
    const duration = Date.now() - startTime;

    console.log(`\n✅ Analysis complete in ${Math.round(duration/1000)}s`);

    // Get SpotBugs results
    const spotbugsResult = result.toolResults.find(r => r.tool === 'SpotBugs');

    if (!spotbugsResult) {
      console.log('\n❌ FAILURE: SpotBugs did not execute');
      process.exit(1);
    }

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('SPOTBUGS RESULTS:');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log(`Success: ${spotbugsResult.success}`);
    console.log(`Duration: ${spotbugsResult.duration}ms`);
    console.log(`Issues Found: ${spotbugsResult.issues.length}`);

    if (spotbugsResult.issues.length === 0) {
      console.log('\n⚠️  WARNING: SpotBugs found 0 issues');
      console.log('This could mean:');
      console.log('  1. WebGoat has very clean code (unlikely for vulnerable app)');
      console.log('  2. Compilation failed (check logs)');
      console.log('  3. SpotBugs only checking high-priority bugs');
      console.log('  4. XML parsing issue\n');
    } else {
      console.log('\n✅ SUCCESS: SpotBugs found issues!\n');

      // Show sample issues
      console.log('SAMPLE SPOTBUGS ISSUES (First 5):\n');
      for (let i = 0; i < Math.min(5, spotbugsResult.issues.length); i++) {
        const issue = spotbugsResult.issues[i];
        console.log(`${i + 1}. ${issue.rule}`);
        console.log(`   File: ${issue.file}:${issue.line}`);
        console.log(`   Severity: ${issue.severity}`);
        console.log(`   Category: ${issue.category}`);
        console.log(`   Message: ${issue.message}`);
        console.log('');
      }
    }

    // Validation
    console.log('═══════════════════════════════════════════════════════');
    console.log('VALIDATION:');
    console.log('═══════════════════════════════════════════════════════\n');

    const validations = {
      'SpotBugs executed': spotbugsResult.success,
      'Issues found': spotbugsResult.issues.length > 0,
      'All issues have required fields': spotbugsResult.issues.every(i =>
        i.file && i.line && i.severity && i.message
      )
    };

    for (const [check, passed] of Object.entries(validations)) {
      const status = passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${status}: ${check}`);
    }

    console.log('\n');

    const allPassed = Object.values(validations).every(v => v);
    if (allPassed) {
      console.log('🎉 SUCCESS: SpotBugs is working correctly!\n');
      process.exit(0);
    } else {
      console.log('❌ FAILURE: Some validations failed\n');
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
  testSpotBugsWithCompilation();
}

export { testSpotBugsWithCompilation };
