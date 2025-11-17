/**
 * Test CodeQual's ability to detect ESLint errors in its own codebase
 * This tests the monorepo scanning pattern fix by running on packages/agents/
 */

import { TypeScriptToolOrchestrator } from './src/two-branch/tools/typescript/typescript-tool-orchestrator';
import * as path from 'path';

async function testCodeQualDetection() {
  console.log('🧪 Testing CodeQual ESLint Detection');
  console.log('=====================================');
  console.log('');
  console.log('📂 Repository: CodeQual (packages/agents)');
  console.log('🎯 Expected errors: 12 ESLint errors');
  console.log('   - 8 no-useless-escape errors');
  console.log('   - 4 @typescript-eslint/no-inferrable-types errors');
  console.log('');
  console.log('📍 Error locations:');
  console.log('   - packages/agents/src/two-branch/agents/specialized-agents.ts (4 errors)');
  console.log('   - packages/agents/src/two-branch/report/ai-enrichment.ts (4 errors)');
  console.log('   - packages/agents/src/two-branch/monitoring/service-health-tracker.ts');
  console.log('   - packages/agents/src/two-branch/tools/universal/semgrep-runner.ts');
  console.log('');
  console.log('⏳ Running ESLint with monorepo scanning patterns...');
  console.log('');

  try {
    const repoPath = path.join(__dirname, '../..');
    const orchestrator = new TypeScriptToolOrchestrator();

    // Run orchestrator on current branch
    const result = await orchestrator.orchestrate(
      repoPath,
      'current', // Use current branch
      {
        skipCache: true,
        tools: ['eslint'] // Only run ESLint for this test
      }
    );

    console.log('');
    console.log('📊 RESULTS');
    console.log('==========');
    console.log('');

    if (result.success) {
      const eslintResult = result.toolResults.find(r => r.toolName === 'eslint');
      
      if (eslintResult && eslintResult.issues) {
        const totalIssues = eslintResult.issues.length;
        
        console.log(`✅ ESLint executed successfully`);
        console.log(`📈 Total issues detected: ${totalIssues}`);
        console.log('');

        // Check for specific errors
        const noUselessEscape = eslintResult.issues.filter(i => 
          i.ruleId === 'no-useless-escape'
        );
        const noInferrableTypes = eslintResult.issues.filter(i => 
          i.ruleId === '@typescript-eslint/no-inferrable-types'
        );

        console.log('📋 Issue Breakdown:');
        console.log(`   - no-useless-escape: ${noUselessEscape.length}`);
        console.log(`   - no-inferrable-types: ${noInferrableTypes.length}`);
        console.log('');

        // Check files
        const filesWithIssues = new Set(eslintResult.issues.map(i => i.file));
        console.log('📁 Files with issues:');
        filesWithIssues.forEach(file => {
          const fileIssues = eslintResult.issues.filter(i => i.file === file);
          console.log(`   - ${file} (${fileIssues.length} issues)`);
        });
        console.log('');

        // Verification
        const expectedTotal = 12;
        const expectedNoUselessEscape = 8;
        const expectedNoInferrable = 4;

        console.log('🎯 VERIFICATION:');
        console.log(`   Total issues: ${totalIssues}/${expectedTotal} ${totalIssues >= expectedTotal ? '✅' : '❌'}`);
        console.log(`   no-useless-escape: ${noUselessEscape.length}/${expectedNoUselessEscape} ${noUselessEscape.length >= expectedNoUselessEscape ? '✅' : '❌'}`);
        console.log(`   no-inferrable-types: ${noInferrableTypes.length}/${expectedNoInferrable} ${noInferrableTypes.length >= expectedNoInferrable ? '✅' : '❌'}`);
        console.log('');

        if (totalIssues >= expectedTotal) {
          console.log('✅ SUCCESS: CodeQual detected the ESLint errors!');
          console.log('✅ Monorepo scanning pattern fix is WORKING!');
        } else {
          console.log('⚠️  PARTIAL: Some errors detected, but not all expected errors');
          console.log(`    Missing ${expectedTotal - totalIssues} errors`);
        }

      } else {
        console.log('❌ FAILED: ESLint ran but found 0 issues');
        console.log('   This suggests the scanning pattern fix did not work');
      }

    } else {
      console.log('❌ FAILED: Tool execution failed');
      console.log(`   Error: ${result.error || 'Unknown error'}`);
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

testCodeQualDetection();
