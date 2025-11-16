/**
 * Test V9 Analysis on CodeQual Itself
 *
 * This script runs V9 TypeScript analysis on the CodeQual codebase to validate all fixes.
 */

// Load environment variables FIRST
import dotenv from 'dotenv';
dotenv.config();

process.env.DEBUG_MODE = process.env.DEBUG_MODE || 'true';

import { TypeScriptToolOrchestrator } from './src/two-branch/tools/typescript/typescript-tool-orchestrator';
import { createToolConfigResolver } from './src/two-branch/config/universal-tool-config';
import { V9GroupedReportFormatter } from './src/two-branch/analyzers/v9-grouped-report-formatter';
import { ModelConfigResolver } from './src/standard/orchestrator/model-config-resolver';
import { groupIssues } from './src/two-branch/utils/issue-grouping';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

async function testCodeQualItself() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                                                               ║');
  console.log('║            V9 ANALYSIS: CODEQUAL ITSELF                       ║');
  console.log('║                                                               ║');
  console.log('║  Testing all fixes on CodeQual TypeScript codebase           ║');
  console.log('║                                                               ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  const repoPath = '/Users/alpinro/Code Prjects/codequal';

  console.log('📁 Repository:', repoPath);
  console.log('📊 Language: TypeScript/JavaScript');
  console.log('🎯 Fixes to validate:');
  console.log('   1. Auto-fix coverage (dual rows)');
  console.log('   2. Google Search (not YouTube)');
  console.log('   3. ESLint timeout fix (< 5s)');
  console.log('   4. Test file filter');
  console.log('');

  // Step 1: Configure tools
  console.log('🔧 Step 1: Configuring TypeScript tools...');
  const toolConfig = createToolConfigResolver();
  const tools = toolConfig.getToolsForLanguage('typescript');
  console.log(`   ✅ Configured ${tools.length} tools: ${tools.map(t => t.name).join(', ')}`);

  // Step 2: Run orchestration on main branch
  console.log('\n🚀 Step 2: Running tool orchestration on main branch...');
  const orchestrator = new TypeScriptToolOrchestrator();

  try {
    const mainBranchResults = await orchestrator.orchestrate(repoPath, {
      branch: 'main',
      mode: 'complete' as any
    });

    console.log(`   ✅ Tools completed: ${mainBranchResults.results.length} tools`);
    console.log(`   📊 Total issues: ${mainBranchResults.results.reduce((sum, r) => sum + r.issues.length, 0)}`);

    // Show tool breakdown
    for (const result of mainBranchResults.results) {
      console.log(`      - ${result.toolName}: ${result.issues.length} issues in ${result.duration}s`);
    }

    // Step 3: Group issues
    console.log('\n💰 Step 3: Grouping issues for cost optimization...');
    const allIssues = mainBranchResults.results.flatMap(r => r.issues);
    const grouped = groupIssues(allIssues, 'alpsla/codequal');
    console.log(`   ✅ Grouped ${allIssues.length} issues into ${grouped.length} groups`);

    // Step 4: Generate report
    console.log('\n📝 Step 4: Generating V9 report...');
    const modelResolver = new ModelConfigResolver();
    await modelResolver.initialize();

    const formatter = new V9GroupedReportFormatter(modelResolver);
    const report = await formatter.generateGroupedReport({
      issues: allIssues,
      issueGroups: grouped,
      branchComparison: {
        newIssues: allIssues.filter(i => i.category === 'NEW'),
        resolvedIssues: [],
        existingIssues: allIssues.filter(i => i.category !== 'NEW')
      },
      metadata: {
        prNumber: 0,
        repository: 'alpsla/codequal',
        language: 'typescript',
        branch: 'main',
        baseBranch: 'main',
        analysisDate: new Date().toISOString(),
        analysisDuration: mainBranchResults.metadata.totalDuration || 0,
        toolsUsed: mainBranchResults.results.map(r => r.toolName),
        filesAnalyzed: 0
      },
      agentPerformance: {}
    });

    console.log(`   ✅ Report generated: ${(report.markdown.length / 1024).toFixed(1)} KB`);

    // Step 5: Save report
    console.log('\n💾 Step 5: Saving report...');
    const timestamp = Date.now();
    const outputDir = path.join(repoPath, 'packages/agents/test-outputs');
    const reportPath = path.join(outputDir, `v9-codequal-itself-${timestamp}.md`);

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(reportPath, report.markdown);
    console.log(`   ✅ Report saved: ${reportPath}`);

    // Save LSP and SARIF if present
    if (report.lspActions) {
      const lspPath = path.join(outputDir, `codequal-itself-lsp-actions-${timestamp}.json`);
      fs.writeFileSync(lspPath, JSON.stringify(report.lspActions, null, 2));
      console.log(`   ✅ LSP actions saved: ${lspPath}`);
    }

    if (report.sarifReport) {
      const sarifPath = path.join(outputDir, `codequal-itself-sarif-report-${timestamp}.json`);
      fs.writeFileSync(sarifPath, JSON.stringify(report.sarifReport, null, 2));
      console.log(`   ✅ SARIF report saved: ${sarifPath}`);
    }

    // Step 6: Verify fixes
    console.log('\n✅ Step 6: Verifying fixes in report...');
    console.log('   Checking for:');

    // Check for Google Search
    if (report.markdown.includes('google.com/search')) {
      console.log('   ✅ Google Search links (not YouTube)');
    } else if (report.markdown.includes('youtube.com')) {
      console.log('   ❌ Still using YouTube links!');
    } else {
      console.log('   ⚠️  No educational resources found');
    }

    // Check for dual auto-fix coverage
    if (report.markdown.includes('Auto-Fix Coverage (Blocking)') &&
        report.markdown.includes('Auto-Fix Coverage (All Issues)')) {
      console.log('   ✅ Dual auto-fix coverage rows present');
    } else if (report.markdown.includes('Auto-Fix Coverage')) {
      console.log('   ⚠️  Single auto-fix coverage row (should be dual)');
    } else {
      console.log('   ⚠️  No auto-fix coverage section found');
    }

    // Check ESLint performance
    const eslintResult = mainBranchResults.results.find(r => r.toolName === 'eslint');
    if (eslintResult) {
      if (parseFloat(eslintResult.duration as string) < 5) {
        console.log(`   ✅ ESLint completed fast: ${eslintResult.duration}s`);
      } else if (parseFloat(eslintResult.duration as string) > 60) {
        console.log(`   ❌ ESLint timeout: ${eslintResult.duration}s`);
      } else {
        console.log(`   ⚠️  ESLint slow: ${eslintResult.duration}s`);
      }
      console.log(`   📊 ESLint issues found: ${eslintResult.issues.length}`);
    }

    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                    ANALYSIS COMPLETE                          ║');
    console.log('╠═══════════════════════════════════════════════════════════════╣');
    console.log(`║  Total Issues: ${allIssues.length}`.padEnd(63) + '║');
    console.log(`║  Issue Groups: ${grouped.length}`.padEnd(63) + '║');
    console.log(`║  Report Path: ${path.basename(reportPath)}`.padEnd(63) + '║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  } catch (error) {
    console.error('\n❌ Error during analysis:', error);
    process.exit(1);
  }
}

// Run the test
testCodeQualItself().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
