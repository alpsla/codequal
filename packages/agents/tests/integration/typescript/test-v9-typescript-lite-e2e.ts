/**
 * V9 TypeScript Lite E2E Test
 *
 * Tests the complete V9 analysis flow for TypeScript/JavaScript:
 * - BaseToolOrchestrator (universal foundation)
 * - TypeScriptToolOrchestrator (extends base, language-specific)
 * - Universal tool configuration
 *
 * Tools tested:
 * - ESLint (code quality and security linting)
 * - TypeScript compiler (type checking)
 * - npm audit (dependency vulnerabilities)
 * - Semgrep (pattern-based security scanning)
 */

import dotenv from 'dotenv';
dotenv.config();

process.env.DEBUG_MODE = process.env.DEBUG_MODE || 'true';

import { TypeScriptToolOrchestrator } from '../../../src/two-branch/tools/typescript';
import { createToolConfigResolver } from '../../../src/two-branch/config/universal-tool-config';
import { groupIssues } from '../../../src/two-branch/utils/issue-grouping';
import { execSync } from 'child_process';
import * as fs from 'fs';

interface TestScenario {
  name: string;
  repoUrl: string;
  prNumber: number;
  expectedToolCount?: number;
}

const TEST_SCENARIOS: TestScenario[] = [
  {
    name: 'Express.js Framework',
    repoUrl: 'https://github.com/expressjs/express',
    prNumber: 5500,
    expectedToolCount: 4
  }
];

function cloneRepository(repoUrl: string, targetPath: string): void {
  console.log(`   Cloning ${repoUrl}...`);
  if (fs.existsSync(targetPath)) {
    execSync(`rm -rf ${targetPath}`);
  }
  execSync(`git clone --depth 10 ${repoUrl} ${targetPath}`, {
    stdio: 'pipe',
    encoding: 'utf-8'
  });
  console.log(`   Repository cloned to ${targetPath}`);
}

async function runTypeScriptLiteE2ETest(scenario: TestScenario): Promise<void> {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Testing: ${scenario.name}`);
  console.log(`${'='.repeat(80)}\n`);

  const startTime = Date.now();
  const repoPath = `/tmp/test-repo-typescript-${Date.now()}`;

  try {
    console.log('Step 0: Cloning repository...');
    cloneRepository(scenario.repoUrl, repoPath);

    console.log('\nStep 1: Configuring tools...');
    const toolResolver = createToolConfigResolver();
    const tools = toolResolver.getToolsForLanguage('typescript');
    console.log(`   Configured ${tools.length} tools`);
    tools.forEach(tool => {
      console.log(`      - ${tool.name} (${tool.category})`);
    });

    console.log('\nStep 2: Running TypeScriptToolOrchestrator...');
    const orchestrator = new TypeScriptToolOrchestrator();

    // Run orchestrator on base branch (using default branch for testing)
    const orchestrationResult = await orchestrator.orchestrate(
      repoPath,
      'base',
      { analysisMode: 'standard', userTier: 'pro' }
    );

    console.log(`   Orchestration complete`);
    console.log(`      Duration: ${orchestrationResult.duration}ms`);
    console.log(`      Tools executed: ${orchestrationResult.summary.toolsExecuted}`);
    console.log(`      Total issues: ${orchestrationResult.summary.totalIssues}`);

    console.log('\nStep 3: Issues by tool...');
    for (const result of orchestrationResult.toolResults) {
      console.log(`      ${result.tool}: ${result.issues.length} issues`);
    }

    console.log('\nStep 4: Grouping issues...');
    const allIssues = orchestrationResult.toolResults.flatMap(r => r.issues);
    const groupedIssues = groupIssues(allIssues);
    console.log(`   Grouped into ${Object.keys(groupedIssues).length} categories`);

    console.log('\nStep 5: Generating report summary...');
    const toolsExecuted = orchestrationResult.toolResults.map(r => r.tool);

    const reportSummary = {
      repoUrl: scenario.repoUrl,
      prNumber: scenario.prNumber,
      language: 'typescript',
      framework: 'express',
      groupedIssues,
      toolResults: orchestrationResult.toolResults,
      analysisMetadata: {
        duration: orchestrationResult.duration,
        toolsExecuted,
        mode: 'standard',
        tier: 'pro'
      },
      summary: orchestrationResult.summary
    };

    const reportPath = `/tmp/typescript-v9-report-${Date.now()}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(reportSummary, null, 2));
    console.log(`   Report saved to: ${reportPath}`);

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n${'='.repeat(80)}`);
    console.log(`TEST PASSED: ${scenario.name}`);
    console.log(`   Total time: ${totalTime}s`);
    console.log(`   Issues found: ${orchestrationResult.summary.totalIssues}`);
    console.log(`   Tools executed: ${toolsExecuted.join(', ')}`);
    console.log(`${'='.repeat(80)}\n`);

  } catch (error: any) {
    console.error(`\nTEST FAILED: ${scenario.name}`);
    console.error(`   Error: ${error.message}`);
    throw error;
  } finally {
    if (fs.existsSync(repoPath)) {
      execSync(`rm -rf ${repoPath}`);
    }
  }
}

async function main(): Promise<void> {
  console.log(`
================================================================================
                      V9 TYPESCRIPT LITE E2E TEST
  Tools: ESLint, TypeScript compiler, npm audit, semgrep
================================================================================
`);

  for (const scenario of TEST_SCENARIOS) {
    await runTypeScriptLiteE2ETest(scenario);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
