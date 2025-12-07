/**
 * Test CodeQual's ESLint Detection on Its Own Codebase (Dogfooding)
 *
 * This test runs CodeQual's TypeScript tools on the CodeQual repository itself
 * to verify the monorepo scanning pattern fix detects the 12 ESLint errors.
 */

// Load environment variables FIRST
import dotenv from 'dotenv';
dotenv.config();

import { TypeScriptToolOrchestrator } from './src/two-branch/tools/typescript/typescript-tool-orchestrator';
import * as path from 'path';

async function testCodeQualScanning() {
  console.log('🧪 CodeQual Self-Scanning Test (Dogfooding)');
  console.log('============================================');
  console.log('');
  console.log('📂 Repository: CodeQual (packages/agents)');
  console.log('🌿 Branch: feat/v9-footer-fixes-pr');
  console.log('🎯 Expected: 12 ESLint errors');
  console.log('   - 8x no-useless-escape errors');
  console.log('   - 4x @typescript-eslint/no-inferrable-types errors');
  console.log('');
  console.log('📍 Error locations:');
  console.log('   - src/two-branch/agents/specialized-agents.ts (4 errors)');
  console.log('   - src/two-branch/report/ai-enrichment.ts (4 errors)');
  console.log('   - src/two-branch/monitoring/service-health-tracker.ts');
  console.log('   - src/two-branch/tools/universal/semgrep-runner.ts');
  console.log('');
  console.log('⏳ Running ESLint with monorepo scanning patterns...');
  console.log('');

  const startTime = Date.now();

  try {
    // Repository path (current directory)
    const repoPath = path.join(__dirname, '../..');

    console.log(`📁 Analyzing repository at: ${repoPath}`);
    console.log('');

    // Create orchestrator
    const orchestrator = new TypeScriptToolOrchestrator();

    // Run only ESLint on current branch
    const result = await orchestrator.orchestrate(
      repoPath,
      'pr', // Analyze current/PR branch
      {
        analysisMode: 'complete'
      }
    );

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('');
    console.log('📊 RESULTS');
    console.log('==========');
    console.log('');

    if (result.success) {
      // Find ESLint results
      const eslintResult = result.toolResults.find(r => r.tool === 'eslint');

      if (eslintResult && eslintResult.issues && eslintResult.issues.length > 0) {
        const totalIssues = eslintResult.issues.length;

        console.log(`✅ ESLint executed successfully`);
        console.log(`📈 Total issues detected: ${totalIssues}`);
        console.log('');

        // Count specific rule violations
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

        // Show affected files
        const filesWithIssues = new Set(eslintResult.issues.map(i => i.file));
        console.log('📁 Files with issues:');
        filesWithIssues.forEach(file => {
          const fileIssues = eslintResult.issues.filter(i => i.file === file);
          const fileName = file.split('/').slice(-3).join('/'); // Show last 3 parts of path
          console.log(`   - ${fileName} (${fileIssues.length} issues)`);
        });
        console.log('');

        // Verification against expected counts
        const expectedTotal = 12;
        const expectedNoUselessEscape = 8;
        const expectedNoInferrable = 4;

        console.log('🎯 VERIFICATION:');
        const totalMatch = totalIssues >= expectedTotal;
        const uselessEscapeMatch = noUselessEscape.length >= expectedNoUselessEscape;
        const inferrableMatch = noInferrableTypes.length >= expectedNoInferrable;

        console.log(`   Total issues: ${totalIssues}/${expectedTotal} ${totalMatch ? '✅' : '❌'}`);
        console.log(`   no-useless-escape: ${noUselessEscape.length}/${expectedNoUselessEscape} ${uselessEscapeMatch ? '✅' : '❌'}`);
        console.log(`   no-inferrable-types: ${noInferrableTypes.length}/${expectedNoInferrable} ${inferrableMatch ? '✅' : '❌'}`);
        console.log('');

        console.log(`⏱️  Duration: ${duration}s`);
        console.log('');

        if (totalMatch && uselessEscapeMatch && inferrableMatch) {
          console.log('🎉 SUCCESS: CodeQual detected the ESLint errors!');
          console.log('✅ Monorepo scanning pattern fix is WORKING!');
          console.log('');
          console.log('📋 Summary:');
          console.log(`   - Scanning fix: VERIFIED ✅`);
          console.log(`   - Error detection: ${totalIssues} issues found ✅`);
          console.log(`   - Monorepo support: WORKING ✅`);
          console.log('');
          console.log('🚀 Next Steps:');
          console.log('   1. Fix the errors (manually or via CodeQual autofix)');
          console.log('   2. Verify CI/CD passes');
          console.log('   3. Merge the scanning pattern fix');
        } else {
          console.log('⚠️  PARTIAL SUCCESS: Some errors detected, but not all expected');
          if (!totalMatch) {
            console.log(`   Missing ${expectedTotal - totalIssues} issues`);
          }
          if (!uselessEscapeMatch) {
            console.log(`   Missing ${expectedNoUselessEscape - noUselessEscape.length} no-useless-escape errors`);
          }
          if (!inferrableMatch) {
            console.log(`   Missing ${expectedNoInferrable - noInferrableTypes.length} no-inferrable-types errors`);
          }
        }

      } else {
        console.log('❌ FAILED: ESLint ran but found 0 issues');
        console.log('   This suggests the scanning pattern fix did not work');
        console.log('');
        console.log('🔍 Debugging Info:');
        console.log(`   - Tools executed: ${result.toolResults.length}`);
        console.log(`   - ESLint found: ${eslintResult ? 'Yes' : 'No'}`);
        if (eslintResult) {
          console.log(`   - ESLint issues property: ${eslintResult.issues ? 'Exists' : 'Missing'}`);
        }
        process.exit(1);
      }

    } else {
      console.log('❌ FAILED: Tool execution failed');
      console.log(`   Error: ${result.summary || 'Unknown error'}`);
      console.log('');
      if (result.toolResults) {
        console.log('Tool Results:');
        result.toolResults.forEach(tr => {
          console.log(`   - ${tr.tool}: ${tr.success ? 'Success' : 'Failed'}`);
        });
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
testCodeQualScanning();
