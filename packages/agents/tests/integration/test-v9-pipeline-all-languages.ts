/**
 * V9 Analysis Pipeline - All Languages Test
 *
 * Tests the V9AnalysisPipeline across all calibrated languages:
 * - Java (BASIC + PRO)
 * - TypeScript (BASIC + PRO)
 * - Python (BASIC + PRO)
 *
 * This validates that the unified pipeline works consistently
 * across all languages and tiers.
 */

import dotenv from 'dotenv';
dotenv.config();

import { V9AnalysisPipeline, SupportedLanguage, UserTier, PipelineResult } from '../../src/two-branch/services/v9-analysis-pipeline';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Test repositories for each language
const TEST_REPOS: Record<string, { repo: string; name: string }> = {
  java: {
    repo: 'spring-projects/spring-petclinic',
    name: 'Spring PetClinic'
  },
  typescript: {
    repo: 'gothinkster/node-express-realworld-example-app',
    name: 'RealWorld Express'
  },
  python: {
    repo: 'adeyosemanputra/pygoat',
    name: 'PyGoat'
  }
};

// Test configuration
const MAX_ISSUES = parseInt(process.env.MAX_ISSUES || '30', 10);
const OUTPUT_DIR = path.join(__dirname, 'test-outputs/pipeline-all-languages');
const SKIP_CLONE = process.env.SKIP_CLONE === 'true';

interface TestScenario {
  language: SupportedLanguage;
  tier: UserTier;
  repoPath?: string;
}

interface TestResult {
  scenario: TestScenario;
  success: boolean;
  totalIssues: number;
  fixedIssues: number;
  recommendedFixes: number;
  lspCodeActions: number;
  reportSize: number;
  duration: number;
  error?: string;
}

const results: TestResult[] = [];

async function cloneRepo(language: string): Promise<string> {
  const config = TEST_REPOS[language];
  const repoPath = `/tmp/v9-pipeline-test-${language}-${Date.now()}`;

  console.log(`   📦 Cloning ${config.name}...`);
  fs.mkdirSync(repoPath, { recursive: true });

  execSync(`git clone --depth 5 https://github.com/${config.repo} ${repoPath}`, {
    stdio: 'pipe',
    encoding: 'utf-8',
    timeout: 300000
  });

  return repoPath;
}

async function runScenario(scenario: TestScenario): Promise<TestResult> {
  const { language, tier } = scenario;
  const config = TEST_REPOS[language];
  const startTime = Date.now();

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`  ${language.toUpperCase()} - ${tier.toUpperCase()} TIER`);
  console.log(`  Repository: ${config.name}`);
  console.log(`${'═'.repeat(70)}`);

  let repoPath = scenario.repoPath;

  try {
    // Clone if needed
    if (!repoPath) {
      repoPath = await cloneRepo(language);
    }

    // Run pipeline
    console.log(`   🔄 Running V9 Analysis Pipeline...`);

    const pipeline = new V9AnalysisPipeline({
      repoPath,
      language: language as SupportedLanguage,
      userTier: tier,
      maxIssuesToFix: MAX_ISSUES,
      verbose: false,
      prMetadata: {
        prNumber: 1,
        prTitle: `${tier.toUpperCase()} Tier Test - ${config.name}`,
        repoUrl: `https://github.com/${config.repo}`,
        organizationName: config.repo.split('/')[0],
      },
      onProgress: (progress) => {
        if (progress.phase === 'orchestration' || progress.phase === 'fixing' || progress.phase === 'complete') {
          console.log(`   [${progress.phase}] ${progress.message}`);
        }
      },
    });

    const result = await pipeline.analyze();
    const duration = Date.now() - startTime;

    // Print results
    console.log(`\n   📊 Results:`);
    console.log(`      Total Issues:      ${result.summary.totalIssues}`);
    console.log(`      Fixed Issues:      ${result.summary.fixedIssues}`);
    console.log(`      Recommended Fixes: ${result.summary.recommendedFixes}`);
    console.log(`      LSP Code Actions:  ${result.lspData.codeActionCount}`);
    console.log(`      Issue Groups:      ${result.summary.issueGroups}`);
    console.log(`      Decision:          ${result.report.decision}`);
    console.log(`      Report Size:       ${(result.report.markdown.length / 1024).toFixed(1)} KB`);
    console.log(`      Duration:          ${(duration / 1000).toFixed(1)}s`);

    // Save report
    const reportDir = path.join(OUTPUT_DIR, language);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const reportPath = path.join(reportDir, `${tier}-tier-report.md`);
    fs.writeFileSync(reportPath, result.report.markdown);
    console.log(`   💾 Report saved: ${reportPath}`);

    // Save LSP data sample
    if (result.lspData.fixableIssues.length > 0) {
      const lspSamplePath = path.join(reportDir, `${tier}-tier-lsp-sample.json`);
      const sample = result.lspData.fixableIssues.slice(0, 5).map(i => ({
        rule: i.rule,
        file: i.file,
        line: i.line,
        severity: i.severity,
        hasCorrectedCode: !!i.fixSuggestion?.correctedCode,
        correctedCodePreview: i.fixSuggestion?.correctedCode?.substring(0, 100),
      }));
      fs.writeFileSync(lspSamplePath, JSON.stringify(sample, null, 2));
      console.log(`   💾 LSP sample saved: ${lspSamplePath}`);
    }

    // Cleanup
    if (!SKIP_CLONE && repoPath.startsWith('/tmp/')) {
      execSync(`rm -rf ${repoPath}`, { stdio: 'pipe' });
    }

    return {
      scenario,
      success: true,
      totalIssues: result.summary.totalIssues,
      fixedIssues: result.summary.fixedIssues,
      recommendedFixes: result.summary.recommendedFixes,
      lspCodeActions: result.lspData.codeActionCount,
      reportSize: result.report.markdown.length,
      duration,
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`   ❌ Error: ${error instanceof Error ? error.message : String(error)}`);

    // Cleanup on error
    if (repoPath && repoPath.startsWith('/tmp/') && fs.existsSync(repoPath)) {
      execSync(`rm -rf ${repoPath}`, { stdio: 'pipe' });
    }

    return {
      scenario,
      success: false,
      totalIssues: 0,
      fixedIssues: 0,
      recommendedFixes: 0,
      lspCodeActions: 0,
      reportSize: 0,
      duration,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function runAllTests() {
  const startTime = Date.now();

  console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║         V9 ANALYSIS PIPELINE - ALL LANGUAGES TEST                            ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Languages: Java, TypeScript, Python                                         ║
║  Tiers:     BASIC (recommendations), PRO (apply fixes)                       ║
║  Max Issues: ${MAX_ISSUES.toString().padEnd(64)}║
╚══════════════════════════════════════════════════════════════════════════════╝
`);

  // Define all test scenarios
  const scenarios: TestScenario[] = [
    { language: 'java', tier: 'basic' },
    { language: 'java', tier: 'pro' },
    { language: 'typescript', tier: 'basic' },
    { language: 'typescript', tier: 'pro' },
    { language: 'python', tier: 'basic' },
    { language: 'python', tier: 'pro' },
  ];

  // Run each scenario
  for (const scenario of scenarios) {
    const result = await runScenario(scenario);
    results.push(result);
  }

  // Print summary
  const totalTime = Date.now() - startTime;
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                         TEST RESULTS SUMMARY                                  ║
╠══════════════════════════════════════════════════════════════════════════════╣`);

  // Results table
  console.log(`║  Language    │ Tier   │ Issues │ Fixed │ LSP Actions │ Report   │ Status  ║`);
  console.log(`║──────────────┼────────┼────────┼───────┼─────────────┼──────────┼─────────║`);

  for (const r of results) {
    const lang = r.scenario.language.padEnd(12);
    const tier = r.scenario.tier.padEnd(6);
    const issues = r.totalIssues.toString().padEnd(6);
    const fixed = r.fixedIssues.toString().padEnd(5);
    const lsp = r.lspCodeActions.toString().padEnd(11);
    const report = `${(r.reportSize / 1024).toFixed(0)} KB`.padEnd(8);
    const status = r.success ? '✅ Pass ' : '❌ Fail ';
    console.log(`║  ${lang} │ ${tier} │ ${issues} │ ${fixed} │ ${lsp} │ ${report} │ ${status}║`);
  }

  console.log(`╠══════════════════════════════════════════════════════════════════════════════╣`);
  console.log(`║  Total Time: ${(totalTime / 1000).toFixed(1)}s                                                        ║`);
  console.log(`║  Results:    ${passed} passed, ${failed} failed                                           ║`);
  console.log(`║  Reports:    ${OUTPUT_DIR}                     ║`);
  console.log(`╚══════════════════════════════════════════════════════════════════════════════╝
`);

  // Key metrics comparison
  console.log(`📊 KEY METRICS COMPARISON:`);
  console.log(`\n   BASIC vs PRO tier comparison (LSP Code Actions):`);

  for (const lang of ['java', 'typescript', 'python']) {
    const basic = results.find(r => r.scenario.language === lang && r.scenario.tier === 'basic');
    const pro = results.find(r => r.scenario.language === lang && r.scenario.tier === 'pro');

    if (basic && pro) {
      console.log(`   ${lang.padEnd(12)}: BASIC=${basic.lspCodeActions.toString().padStart(3)} actions, PRO=${pro.lspCodeActions.toString().padStart(3)} actions, Fixed=${pro.fixedIssues}`);
    }
  }

  if (failed > 0) {
    console.log('\n❌ SOME TESTS FAILED');
    for (const r of results.filter(r => !r.success)) {
      console.log(`   - ${r.scenario.language} ${r.scenario.tier}: ${r.error}`);
    }
    process.exit(1);
  } else {
    console.log('\n✅ ALL TESTS PASSED');
  }
}

runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
