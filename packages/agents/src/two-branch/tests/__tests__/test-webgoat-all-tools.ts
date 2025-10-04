#!/usr/bin/env ts-node

/**
 * WebGoat All Tools Test - Validates ALL 5 Java tools find issues
 *
 * Repository: WebGoat (OWASP intentionally vulnerable web application)
 * Purpose: Ensure every tool (PMD, Semgrep, Checkstyle, Dependency-Check, SpotBugs) finds at least 1 issue
 *
 * Expected Results:
 * - PMD: 50+ code quality issues
 * - Semgrep: 20+ security issues (SQL injection, XSS, etc.)
 * - Checkstyle: 30+ style violations
 * - Dependency-Check: 10+ CVEs (Log4Shell, Spring vulnerabilities)
 * - SpotBugs: 15+ bug patterns (null pointers, resource leaks)
 */

import { JavaToolOrchestrator } from '../../tools/java/java-tool-orchestrator';
import * as fs from 'fs';
import * as path from 'path';

async function testWebGoatAllTools() {
  const startTime = Date.now();
  const repoPath = '/tmp/webgoat-repo';

  console.log('═══════════════════════════════════════════════════════');
  console.log('  WEBGOAT ALL TOOLS TEST - Validation Suite');
  console.log('═══════════════════════════════════════════════════════\n');

  // Verify WebGoat repo exists
  if (!fs.existsSync(repoPath)) {
    console.error('❌ WebGoat repository not found at', repoPath);
    console.error('   Run: git clone https://github.com/WebGoat/WebGoat.git', repoPath);
    process.exit(1);
  }

  console.log('📁 Repository:', repoPath);
  console.log('🔧 Mode: ALL ISSUES (not just critical/high)');
  console.log('🎯 Goal: Validate all 5 tools find at least 1 issue\n');

  // Enable all tools
  process.env.ENABLE_SPOTBUGS = 'true';
  process.env.NODE_ENV = 'test';

  console.log('🚀 Running ALL 5 Java tools...\n');

  try {
    const orchestrator = new JavaToolOrchestrator();

    const results = await orchestrator.orchestrate(
      repoPath,
      'main',
      undefined,
      { includeAllSeverities: true }  // Get ALL issues, not just critical/high
    );

    const duration = Math.round((Date.now() - startTime) / 1000);

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  RESULTS - ALL TOOLS');
    console.log('═══════════════════════════════════════════════════════\n');

    // Parse results
    const toolResults = {
      pmd: {
        issues: results.issues?.filter((i: any) => i.tool === 'pmd') || [],
        duration: results.metadata?.toolResults?.find((t: any) => t.tool === 'pmd')?.duration || 0
      },
      semgrep: {
        issues: results.issues?.filter((i: any) => i.tool === 'semgrep') || [],
        duration: results.metadata?.toolResults?.find((t: any) => t.tool === 'semgrep')?.duration || 0
      },
      checkstyle: {
        issues: results.issues?.filter((i: any) => i.tool === 'checkstyle') || [],
        duration: results.metadata?.toolResults?.find((t: any) => t.tool === 'checkstyle')?.duration || 0
      },
      dependencyCheck: {
        issues: results.issues?.filter((i: any) => i.tool === 'dependency-check') || [],
        duration: results.metadata?.toolResults?.find((t: any) => t.tool === 'dependency-check')?.duration || 0
      },
      spotbugs: {
        issues: results.issues?.filter((i: any) => i.tool === 'spotbugs') || [],
        duration: results.metadata?.toolResults?.find((t: any) => t.tool === 'spotbugs')?.duration || 0
      }
    };

    // Validation
    const validation = {
      pmd: toolResults.pmd.issues.length > 0,
      semgrep: toolResults.semgrep.issues.length > 0,
      checkstyle: toolResults.checkstyle.issues.length > 0,
      dependencyCheck: toolResults.dependencyCheck.issues.length > 0,
      spotbugs: toolResults.spotbugs.issues.length > 0
    };

    // Display results
    console.log('Tool Results:\n');
    console.log(`✅ PMD:`);
    console.log(`   Issues: ${toolResults.pmd.issues.length} ${validation.pmd ? '✅' : '❌ FAILED'}`);
    console.log(`   Duration: ${Math.round(toolResults.pmd.duration / 1000)}s`);
    if (toolResults.pmd.issues.length > 0) {
      const sampleIssues = toolResults.pmd.issues.slice(0, 3);
      console.log(`   Sample: ${sampleIssues.map((i: any) => i.rule).join(', ')}`);
    }
    console.log('');

    console.log(`✅ Semgrep:`);
    console.log(`   Issues: ${toolResults.semgrep.issues.length} ${validation.semgrep ? '✅' : '❌ FAILED'}`);
    console.log(`   Duration: ${Math.round(toolResults.semgrep.duration / 1000)}s`);
    if (toolResults.semgrep.issues.length > 0) {
      const sampleIssues = toolResults.semgrep.issues.slice(0, 3);
      console.log(`   Sample: ${sampleIssues.map((i: any) => i.rule).join(', ')}`);
    }
    console.log('');

    console.log(`✅ Checkstyle:`);
    console.log(`   Issues: ${toolResults.checkstyle.issues.length} ${validation.checkstyle ? '✅' : '❌ FAILED'}`);
    console.log(`   Duration: ${Math.round(toolResults.checkstyle.duration / 1000)}s`);
    if (toolResults.checkstyle.issues.length > 0) {
      const sampleIssues = toolResults.checkstyle.issues.slice(0, 3);
      console.log(`   Sample: ${sampleIssues.map((i: any) => i.rule).join(', ')}`);
    }
    console.log('');

    console.log(`✅ Dependency-Check:`);
    console.log(`   Issues: ${toolResults.dependencyCheck.issues.length} ${validation.dependencyCheck ? '✅' : '❌ FAILED'}`);
    console.log(`   Duration: ${Math.round(toolResults.dependencyCheck.duration / 1000)}s`);
    if (toolResults.dependencyCheck.issues.length > 0) {
      const sampleCVEs = toolResults.dependencyCheck.issues.slice(0, 3);
      console.log(`   Sample: ${sampleCVEs.map((i: any) => i.rule || i.message).join(', ')}`);
    }
    console.log('');

    console.log(`✅ SpotBugs:`);
    console.log(`   Issues: ${toolResults.spotbugs.issues.length} ${validation.spotbugs ? '✅' : '❌ FAILED'}`);
    console.log(`   Duration: ${Math.round(toolResults.spotbugs.duration / 1000)}s`);
    if (toolResults.spotbugs.issues.length > 0) {
      const sampleIssues = toolResults.spotbugs.issues.slice(0, 3);
      console.log(`   Sample: ${sampleIssues.map((i: any) => i.rule).join(', ')}`);
    }
    console.log('');

    // Summary
    const allPassed = Object.values(validation).every(v => v === true);
    const passedCount = Object.values(validation).filter(v => v === true).length;

    console.log('═══════════════════════════════════════════════════════');
    console.log('  VALIDATION SUMMARY');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log(`Total Duration: ${duration}s`);
    console.log(`Tools Passed: ${passedCount}/5`);
    console.log(`Total Issues Found: ${results.issues?.length || 0}\n`);

    if (allPassed) {
      console.log('✅ SUCCESS: ALL 5 TOOLS VALIDATED');
      console.log('   Every tool found at least 1 issue');
      console.log('   Ready for production use');
    } else {
      console.log('❌ FAILURE: Some tools did not find issues');
      console.log('\nFailed Tools:');
      Object.entries(validation).forEach(([tool, passed]) => {
        if (!passed) {
          console.log(`   ❌ ${tool}`);
        }
      });
      console.log('\nReview tool configuration and test repository');
    }

    console.log('\n═══════════════════════════════════════════════════════\n');

    // Save detailed report
    const reportPath = path.join(__dirname, '../../../reports/webgoat-all-tools-validation.md');
    const reportDir = path.dirname(reportPath);

    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const report = `# WebGoat All Tools Validation Report

**Date:** ${new Date().toISOString()}
**Repository:** WebGoat (OWASP)
**Duration:** ${duration}s
**Status:** ${allPassed ? '✅ ALL PASSED' : '❌ SOME FAILED'}

## Results

| Tool | Issues | Duration | Status | Sample Issues |
|------|--------|----------|--------|---------------|
| PMD | ${toolResults.pmd.issues.length} | ${Math.round(toolResults.pmd.duration / 1000)}s | ${validation.pmd ? '✅' : '❌'} | ${toolResults.pmd.issues.slice(0, 3).map((i: any) => i.rule).join(', ')} |
| Semgrep | ${toolResults.semgrep.issues.length} | ${Math.round(toolResults.semgrep.duration / 1000)}s | ${validation.semgrep ? '✅' : '❌'} | ${toolResults.semgrep.issues.slice(0, 3).map((i: any) => i.rule).join(', ')} |
| Checkstyle | ${toolResults.checkstyle.issues.length} | ${Math.round(toolResults.checkstyle.duration / 1000)}s | ${validation.checkstyle ? '✅' : '❌'} | ${toolResults.checkstyle.issues.slice(0, 3).map((i: any) => i.rule).join(', ')} |
| Dependency-Check | ${toolResults.dependencyCheck.issues.length} | ${Math.round(toolResults.dependencyCheck.duration / 1000)}s | ${validation.dependencyCheck ? '✅' : '❌'} | ${toolResults.dependencyCheck.issues.slice(0, 3).map((i: any) => i.rule || i.message).join(', ')} |
| SpotBugs | ${toolResults.spotbugs.issues.length} | ${Math.round(toolResults.spotbugs.duration / 1000)}s | ${validation.spotbugs ? '✅' : '❌'} | ${toolResults.spotbugs.issues.slice(0, 3).map((i: any) => i.rule).join(', ')} |

## Conclusion

${allPassed
  ? '✅ All 5 tools validated successfully. Each tool found at least 1 issue in the WebGoat repository. Production ready!'
  : '❌ Some tools did not find issues. Review tool configuration and test repository.'}

**Total Issues Found:** ${results.issues?.length || 0}
**Tools Passed:** ${passedCount}/5
`;

    fs.writeFileSync(reportPath, report);
    console.log(`📄 Detailed report saved: ${reportPath}\n`);

    process.exit(allPassed ? 0 : 1);

  } catch (error) {
    console.error('\n❌ Test failed with error:');
    console.error(error);
    process.exit(1);
  }
}

// Run the test
testWebGoatAllTools();
