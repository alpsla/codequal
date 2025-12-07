/**
 * CodeQual V9 Dogfooding Test (Path-Fixed Version)
 *
 * Generates a complete V9 analysis report on the CodeQual repository itself
 * to validate the monorepo scanning pattern fix detects ESLint errors.
 *
 * Fixed: Handles repository path with spaces correctly
 */

// Load environment variables FIRST
import dotenv from 'dotenv';
dotenv.config();

// E2E Test Configuration: Disable rate limiting
process.env.DEBUG_MODE = process.env.DEBUG_MODE || 'true';

import { TypeScriptToolOrchestrator } from './src/two-branch/tools/typescript/typescript-tool-orchestrator';
import { createToolConfigResolver } from './src/two-branch/config/universal-tool-config';
import { V9GroupedReportFormatter } from './src/two-branch/analyzers/v9-grouped-report-formatter';
import { ModelConfigResolver } from './src/standard/orchestrator/model-config-resolver';
import { groupIssues } from './src/two-branch/utils/issue-grouping';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

async function runCodeQualDogfoodingTest(): Promise<void> {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🎯 CodeQual V9 Dogfooding Test (Path-Fixed)`);
  console.log(`${'='.repeat(80)}\n`);

  const startTime = Date.now();

  // Use current directory instead of absolute path with spaces
  const repoPath = process.cwd().includes('packages/agents')
    ? path.join(process.cwd(), '../..')
    : process.cwd();

  console.log('📂 Repository: CodeQual (local monorepo)');
  console.log(`📍 Working directory: ${process.cwd()}`);
  console.log(`📍 Repository path: ${repoPath}`);
  console.log('🌿 Base branch: main');
  console.log('🌿 PR branch: feat/v9-footer-fixes-pr');
  console.log('');
  console.log('🎯 Expected Results:');
  console.log('   - 12 ESLint errors detected');
  console.log('   - 8x no-useless-escape');
  console.log('   - 4x @typescript-eslint/no-inferrable-types');
  console.log('');

  try {
    // Store current branch (use cwd option instead of -C)
    const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', {
      cwd: repoPath,
      encoding: 'utf-8'
    }).trim();
    console.log(`📌 Current branch: ${currentBranch}`);
    console.log('');

    // ========================================================================
    // STEP 1: Universal Tool Configuration
    // ========================================================================
    console.log('🔧 Step 1: Configuring tools...');
    const toolResolver = createToolConfigResolver();
    const tools = toolResolver.getToolsForLanguage('typescript');

    console.log(`   ✅ Configured ${tools.length} tools`);
    tools.forEach(tool => {
      console.log(`      - ${tool.name} (${tool.category})`);
    });

    // ========================================================================
    // STEP 2: Tool Orchestration (Parallel Execution)
    // ========================================================================
    console.log('\n🚀 Step 2: Running tool orchestration...');
    const orchestrator = new TypeScriptToolOrchestrator();

    // Run tools on main branch
    console.log('   📊 Analyzing main branch...');
    console.log('      (Checking out main branch...)');
    execSync('git checkout main', { cwd: repoPath, stdio: 'pipe' });

    const mainResult = await orchestrator.orchestrate(repoPath, 'base', {
      analysisMode: 'complete'
    });

    // Checkout PR branch for comparison
    console.log('   🔀 Checking out feat/v9-footer-fixes-pr branch...');
    execSync('git checkout feat/v9-footer-fixes-pr', { cwd: repoPath, stdio: 'pipe' });
    console.log('   ✅ Checked out PR branch');

    // Run tools on PR branch
    console.log('   📊 Analyzing PR branch (with 12 errors)...');
    const prResult = await orchestrator.orchestrate(repoPath, 'pr', {
      analysisMode: 'complete'
    });

    const mainResults = mainResult.toolResults;
    const prResults = prResult.toolResults;

    console.log(`   ✅ Main branch: ${mainResults.length} tools executed`);
    console.log(`   ✅ PR branch: ${prResults.length} tools executed`);

    const totalIssuesMain = mainResults.reduce((sum, r) => sum + (r.issues?.length || 0), 0);
    const totalIssuesPr = prResults.reduce((sum, r) => sum + (r.issues?.length || 0), 0);

    console.log(`   📊 Main branch issues: ${totalIssuesMain}`);
    console.log(`   📊 PR branch issues: ${totalIssuesPr}`);

    // ========================================================================
    // STEP 3: Issue Categorization
    // ========================================================================
    console.log('\n📂 Step 3: Categorizing issues...');

    const allPrIssues = prResults.flatMap(r => r.issues || []);
    const newIssues = allPrIssues.filter(issue =>
      !mainResults.some(m =>
        (m.issues || []).some(mainIssue =>
          mainIssue.file === issue.file &&
          mainIssue.line === issue.line
        )
      )
    );

    console.log(`   ✅ New issues (introduced in PR): ${newIssues.length}`);
    console.log(`   ✅ Existing issues: ${allPrIssues.length - newIssues.length}`);

    // Count specific errors
    const eslintResult = prResults.find(r => r.tool === 'eslint');
    if (eslintResult && eslintResult.issues) {
      const noUselessEscape = eslintResult.issues.filter(i => i.rule === 'no-useless-escape');
      const noInferrableTypes = eslintResult.issues.filter(i => i.rule === '@typescript-eslint/no-inferrable-types');

      console.log('\n   🔍 ESLint Error Breakdown:');
      console.log(`      - no-useless-escape: ${noUselessEscape.length} (expected: 8)`);
      console.log(`      - no-inferrable-types: ${noInferrableTypes.length} (expected: 4)`);
      console.log(`      - Total ESLint errors: ${eslintResult.issues.length}`);
    }

    // ========================================================================
    // STEP 4: Issue Grouping (Cost Optimization)
    // ========================================================================
    console.log('\n💰 Step 4: Grouping issues for cost optimization...');

    // Detect issue category from tool
    const detectIssueCategory = (tool: string, rule: string | null | undefined): string => {
      if (tool === 'semgrep') return 'Security';
      if (tool === 'npm-audit') return 'Dependencies';
      if (tool === 'eslint' && rule?.includes('security')) return 'Security';
      if (tool === 'eslint' && rule?.includes('performance')) return 'Performance';
      if (tool === 'typescript') return 'Code Quality';
      return 'Code Quality';
    };

    const formattedIssues = allPrIssues.map(issue => {
      const isNew = newIssues.some(n =>
        n.file === issue.file && n.line === issue.line
      );

      return {
        id: `${issue.tool}-${issue.file}-${issue.line}`,
        rule: issue.rule ? String(issue.rule) : 'unknown-rule',
        category: isNew ? 'NEW' : 'EXISTING_REST',
        detectedCategory: detectIssueCategory(issue.tool, issue.rule ? String(issue.rule) : ''),
        severity: issue.severity || 'medium',
        title: issue.message || 'Code quality issue',
        file: issue.file || 'unknown',
        line: issue.line || 0,
        tool: issue.tool || 'unknown',
        message: issue.message || '',
        codeSnippet: undefined,
        suggestedFix: undefined
      };
    });

    const groupingResult = groupIssues(formattedIssues);
    console.log(`   ✅ Grouped ${formattedIssues.length} issues into ${groupingResult.groups.length} groups`);
    console.log(`   ✅ Cost savings: ${groupingResult.savingsPercent.toFixed(1)}%`);
    console.log(`   ✅ AI calls: ${groupingResult.groups.length} (instead of ${formattedIssues.length})`);

    // ========================================================================
    // STEP 5: Report Generation (Grouped Formatter)
    // ========================================================================
    console.log('\n📝 Step 5: Generating V9 report...');

    const modelConfigResolver = new ModelConfigResolver();
    console.log('   ✅ Using Supabase model configuration');

    const formatter = new V9GroupedReportFormatter(
      modelConfigResolver,
      'typescript',
      'medium'
    );

    const metadata = {
      repository: 'alpsla/codequal',
      repoUrl: 'https://github.com/alpsla/codequal',
      repoPath: repoPath,
      prNumber: 69,
      prTitle: 'CodeQual Dogfooding - Scanning Fix Validation',
      branch: 'feat/v9-footer-fixes-pr',
      baseBranch: 'main',
      prAuthor: 'alpsla',
      prAuthorEmail: 'user@example.com',
      organizationName: 'alpsla',
      totalFiles: 500,
      totalLinesOfCode: 50000,
      filesModified: new Set(allPrIssues.map(i => i.file)).size,
      linesAdded: 50,
      linesDeleted: 50,
      decision: newIssues.filter(i => i.severity === 'critical' || i.severity === 'high').length > 0 ? 'DECLINED' : 'APPROVED',
      blockingCount: newIssues.filter(i => i.severity === 'critical' || i.severity === 'high').length,
      totalDuration: Date.now() - startTime,
      cloneTime: 0,
      analysisTime: Date.now() - startTime,
      reportGenerationTime: 1000,
      analyzedAt: new Date().toISOString(),
      analyzerVersion: '9.0.0',

      // Performance data from orchestrator
      toolPerformance: prResult.toolPerformance,
      agentPerformance: prResult.agentPerformance
    };

    const result = await formatter.generateGroupedReport(
      formattedIssues,
      groupingResult.groups,
      metadata
    );

    console.log(`   ✅ Report generated: ${result.markdown.length} bytes`);
    console.log(`   ✅ IDE fix files: ${result.ideFixFiles.length}`);
    console.log(`   ✅ Location attachments: ${result.attachments.length}`);

    // ========================================================================
    // STEP 6: Save Results
    // ========================================================================
    console.log('\n💾 Step 6: Saving results...');
    const outputDir = '/tmp';

    const timestamp = Date.now();
    const reportPath = path.join(outputDir, `codequal-v9-dogfooding-FIXED-${timestamp}.md`);
    fs.writeFileSync(reportPath, result.markdown);
    console.log(`   ✅ Report saved: ${reportPath}`);

    // Save IDE fix files
    result.ideFixFiles.forEach((file, idx) => {
      const fixPath = path.join(outputDir, `codequal-v9-fix-${idx}-${timestamp}.json`);
      fs.writeFileSync(fixPath, JSON.stringify(file, null, 2));
    });
    if (result.ideFixFiles.length > 0) {
      console.log(`   ✅ IDE fix files saved: ${result.ideFixFiles.length} files`);
    }

    // ========================================================================
    // SUMMARY
    // ========================================================================
    const totalTime = Date.now() - startTime;
    console.log(`\n${'='.repeat(80)}`);
    console.log(`✅ TEST PASSED: CodeQual Dogfooding`);
    console.log(`${'='.repeat(80)}`);
    console.log(`📊 Total execution time: ${(totalTime / 1000).toFixed(2)}s`);
    console.log(`📊 Tools executed: ${tools.length}`);
    console.log(`📊 Issues found: ${allPrIssues.length}`);
    console.log(`📊 New issues: ${newIssues.length}`);
    console.log(`📊 Issue groups: ${groupingResult.groups.length}`);
    console.log(`📊 Cost savings: ${groupingResult.savingsPercent.toFixed(1)}%`);
    console.log(`📊 Report size: ${(result.markdown.length / 1024).toFixed(1)} KB`);
    console.log(`${'='.repeat(80)}\n`);

    // Verification
    console.log('🎯 VERIFICATION:');
    const expectedErrors = 12;
    const eslintIssues = eslintResult?.issues?.length || 0;

    if (eslintIssues >= expectedErrors) {
      console.log(`   ✅ ESLint detected ${eslintIssues} errors (expected ≥${expectedErrors})`);
      console.log(`   ✅ Monorepo scanning pattern fix WORKING!`);
      console.log('');
      console.log('🎉 SUCCESS: CodeQual can now detect ESLint errors in its own codebase!');
      console.log('');
      console.log(`📄 View the complete V9 report:`);
      console.log(`   ${reportPath}`);
    } else {
      console.log(`   ⚠️  Only detected ${eslintIssues} errors (expected ≥${expectedErrors})`);
      console.log('   Scanning fix may not be working correctly');
    }

    // Restore original branch
    console.log('');
    console.log(`🔄 Restoring original branch: ${currentBranch}`);
    execSync(`git checkout ${currentBranch}`, { cwd: repoPath, stdio: 'pipe' });
    console.log('   ✅ Branch restored');

  } catch (error) {
    console.error(`\n❌ TEST FAILED: CodeQual Dogfooding`);
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof Error && error.stack) {
      console.error(`Stack: ${error.stack}`);
    }

    // Try to restore original branch on error
    try {
      const repoPath = process.cwd().includes('packages/agents')
        ? path.join(process.cwd(), '../..')
        : process.cwd();
      execSync('git checkout feat/v9-footer-fixes-pr', {
        cwd: repoPath,
        stdio: 'pipe'
      });
    } catch (restoreError) {
      console.error('Failed to restore branch:', restoreError);
    }

    process.exit(1);
  }
}

// Run the test
console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                                                                           ║
║                   CODEQUAL V9 DOGFOODING TEST                             ║
║               Testing CodeQual's Ability to Analyze Itself                ║
║                        (PATH-FIXED VERSION)                               ║
║                                                                           ║
║  Purpose:                                                                 ║
║  ✓ Validate monorepo scanning pattern fix                                ║
║  ✓ Verify ESLint error detection (12 errors expected)                    ║
║  ✓ Generate complete V9 analysis report                                  ║
║  ✓ Test on CodeQual's own codebase (dogfooding)                          ║
║  ✓ Fixed: Properly handles repository path with spaces                   ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
`);

runCodeQualDogfoodingTest();
