/**
 * CodeQual Dogfooding Test - V9 Report Generation
 *
 * Tests CodeQual's ability to detect ESLint errors in its own codebase
 * after the monorepo scanning pattern fix.
 */

// Load environment variables FIRST
import dotenv from 'dotenv';
dotenv.config();

import { TypeScriptToolOrchestrator } from './src/two-branch/tools/typescript/typescript-tool-orchestrator';
import { V9IntegratedAnalyzer } from './src/two-branch/analyzers/v9-integrated-analyzer';
import * as path from 'path';
import * as fs from 'fs';

async function generateDogfoodingReport() {
  console.log('🎯 CodeQual Dogfooding Test - V9 Report Generation');
  console.log('==================================================');
  console.log('');
  console.log('📂 Repository: CodeQual (monorepo)');
  console.log('🌿 Branch: feat/v9-footer-fixes-pr');
  console.log('🔧 Scanning Fix: Applied (typescript-tool-parser.ts:77)');
  console.log('📋 Expected: 12 ESLint errors');
  console.log('   - 8x no-useless-escape');
  console.log('   - 4x @typescript-eslint/no-inferrable-types');
  console.log('');
  console.log('⏳ Running V9 analysis...');
  console.log('');

  const startTime = Date.now();

  try {
    // Repository path (current directory = packages/agents)
    const repoPath = path.join(__dirname, '../..');

    console.log(`📁 Analyzing repository at: ${repoPath}`);
    console.log('');

    // Create orchestrator
    const orchestrator = new TypeScriptToolOrchestrator();

    // Run tools on current branch
    console.log('🔍 Step 1: Running TypeScript tools...');
    const toolResults = await orchestrator.orchestrate(
      repoPath,
      'pr', // Analyze current/PR branch
      {
        analysisMode: 'complete'
      }
    );

    console.log(`✅ Tools completed in ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
    console.log('');

    // Find ESLint results
    const eslintResult = toolResults.toolResults.find(r => r.tool === 'eslint');

    if (eslintResult && eslintResult.issues) {
      const totalIssues = eslintResult.issues.length;

      console.log('📊 ESLint Results:');
      console.log(`   Total issues detected: ${totalIssues}`);
      console.log('');

      // Count specific violations
      const noUselessEscape = eslintResult.issues.filter(i =>
        i.rule === 'no-useless-escape'
      );
      const noInferrableTypes = eslintResult.issues.filter(i =>
        i.rule === '@typescript-eslint/no-inferrable-types'
      );

      console.log('📋 Issue Breakdown:');
      console.log(`   - no-useless-escape: ${noUselessEscape.length}`);
      console.log(`   - no-inferrable-types: ${noInferrableTypes.length}`);
      console.log(`   - other rules: ${totalIssues - noUselessEscape.length - noInferrableTypes.length}`);
      console.log('');

      // Verify detection
      const expectedTotal = 12;
      const expectedUselessEscape = 8;
      const expectedInferrable = 4;

      console.log('🎯 VERIFICATION:');
      console.log(`   Expected total: ${expectedTotal}`);
      console.log(`   Detected total: ${totalIssues} ${totalIssues >= expectedTotal ? '✅' : '❌'}`);
      console.log(`   Expected no-useless-escape: ${expectedUselessEscape}`);
      console.log(`   Detected: ${noUselessEscape.length} ${noUselessEscape.length >= expectedUselessEscape ? '✅' : '❌'}`);
      console.log(`   Expected no-inferrable-types: ${expectedInferrable}`);
      console.log(`   Detected: ${noInferrableTypes.length} ${noInferrableTypes.length >= expectedInferrable ? '✅' : '❌'}`);
      console.log('');

      // Now generate V9 report with these results
      console.log('🔍 Step 2: Generating V9 integrated report...');
      console.log('');

      const analyzer = new V9IntegratedAnalyzer();

      // Prepare data for V9 report
      const mainBranchData = {
        toolResults: [],
        metadata: {
          branch: 'main',
          timestamp: new Date().toISOString()
        }
      };

      const prBranchData = {
        toolResults: toolResults.toolResults,
        metadata: {
          branch: 'feat/v9-footer-fixes-pr',
          timestamp: new Date().toISOString()
        }
      };

      const prMetadata = {
        repoUrl: 'https://github.com/alpsla/codequal',
        prNumber: 69,
        title: 'CodeQual Dogfooding Test - Scanning Fix Validation',
        author: 'alpsla',
        baseBranch: 'main',
        prBranch: 'feat/v9-footer-fixes-pr'
      };

      // Generate the V9 report
      const report = await analyzer.generateIntegratedReport(
        mainBranchData,
        prBranchData,
        prMetadata
      );

      const duration = ((Date.now() - startTime) / 1000).toFixed(1);

      console.log('');
      console.log('📊 V9 REPORT GENERATED');
      console.log('=====================');
      console.log(`Duration: ${duration}s`);
      console.log('');

      // Save the report
      const reportPath = `/tmp/codequal-dogfooding-v9-${Date.now()}.md`;
      fs.writeFileSync(reportPath, report.markdown);

      console.log('📄 Report saved to:');
      console.log(`   ${reportPath}`);
      console.log('');

      // Extract key stats from report
      const totalIssuesMatch = report.markdown.match(/\*\*Total Issues\*\*:\s*(\d+)/);
      const reportTotalIssues = totalIssuesMatch ? parseInt(totalIssuesMatch[1]) : 0;

      console.log('📈 Report Summary:');
      console.log(`   Total Issues in Report: ${reportTotalIssues}`);
      console.log(`   Quality Score: ${report.qualityScore || 'N/A'}/100`);
      console.log(`   Decision: ${report.decision || 'N/A'}`);
      console.log('');

      if (totalIssues >= expectedTotal) {
        console.log('🎉 SUCCESS: CodeQual Dogfooding Test PASSED!');
        console.log('');
        console.log('✅ Verification Complete:');
        console.log('   - Scanning pattern fix WORKING ✅');
        console.log(`   - Detected ${totalIssues} issues (expected ${expectedTotal}) ✅`);
        console.log('   - Monorepo support VALIDATED ✅');
        console.log('   - V9 report generated ✅');
        console.log('');
        console.log('📋 Next Steps:');
        console.log('   1. Review the generated report');
        console.log('   2. Apply auto-fixes to clean the codebase');
        console.log('   3. Merge the scanning pattern fix');
        console.log('');
        console.log(`📥 View report: cat ${reportPath}`);
      } else {
        console.log('⚠️  PARTIAL SUCCESS: Some issues detected, but not all expected');
        console.log(`   Missing ${expectedTotal - totalIssues} issues`);
      }

    } else {
      console.log('❌ FAILED: ESLint executed but found 0 issues');
      console.log('   This suggests the scanning pattern fix may not be working');
      console.log('');
      console.log('🔍 Debugging Info:');
      console.log(`   - Tools executed: ${toolResults.toolResults.length}`);
      console.log(`   - ESLint found: ${eslintResult ? 'Yes' : 'No'}`);
      if (eslintResult) {
        console.log(`   - ESLint issues property: ${eslintResult.issues ? 'Exists' : 'Missing'}`);
      }
      process.exit(1);
    }

  } catch (error: any) {
    console.error('❌ Test failed with exception:');
    console.error(`   ${error.message}`);
    if (error.stack) {
      console.error('');
      console.error('Stack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run the test
generateDogfoodingReport();
