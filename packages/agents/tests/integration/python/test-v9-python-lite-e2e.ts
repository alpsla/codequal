/**
 * V9 Python Lite E2E Test
 *
 * Tests the complete V9 analysis flow for Python:
 * - BaseToolOrchestrator (universal foundation)
 * - PythonToolOrchestrator (extends base, language-specific)
 * - Universal tool configuration
 * - V9 Report Compiler service
 * - Grouped report formatter
 *
 * Follows same pattern as test-v9-lite-e2e.ts (Java) and test-v9-typescript-lite-e2e.ts
 */

// Load environment variables FIRST
import dotenv from 'dotenv';
dotenv.config();

process.env.DEBUG_MODE = process.env.DEBUG_MODE || 'true';

import { PythonToolOrchestrator } from '../../../src/two-branch/tools/python/python-tool-orchestrator';
import { createToolConfigResolver } from '../../../src/two-branch/config/universal-tool-config';
import { V9GroupedReportFormatter } from '../../../src/two-branch/analyzers/v9-grouped-report-formatter';
import { ModelConfigResolver } from '../../../src/standard/orchestrator/model-config-resolver';
import { groupIssues } from '../../../src/two-branch/utils/issue-grouping';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface TestScenario {
  name: string;
  repoUrl: string;
  prNumber: number;
  expectedToolCount?: number;
}

const TEST_SCENARIOS: TestScenario[] = [
  {
    name: 'Flask',
    repoUrl: 'https://github.com/pallets/flask',
    prNumber: 5000,
    expectedToolCount: 5
  }
];

function cloneRepository(repoUrl: string, targetPath: string): void {
  console.log(`   🔄 Cloning ${repoUrl}...`);
  
  if (fs.existsSync(targetPath)) {
    execSync(`rm -rf ${targetPath}`);
  }
  
  execSync(`git clone --depth 10 ${repoUrl} ${targetPath}`, { 
    stdio: 'pipe',
    encoding: 'utf-8'
  });
  
  console.log(`   ✅ Repository cloned to ${targetPath}`);
}

async function runPythonLiteE2ETest(scenario: TestScenario): Promise<void> {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🧪 Testing: ${scenario.name}`);
  console.log(`${'='.repeat(80)}\n`);

  const startTime = Date.now();
  const repoPath = `/tmp/test-repo-${Date.now()}`;

  try {
    console.log('📦 Step 0: Cloning repository...');
    cloneRepository(scenario.repoUrl, repoPath);

    console.log('\n🔧 Step 1: Configuring tools...');
    const toolResolver = createToolConfigResolver();
    const tools = toolResolver.getToolsForLanguage('python');
    
    console.log(`   ✅ Configured ${tools.length} tools`);
    tools.forEach(tool => {
      console.log(`      - ${tool.name} (${tool.category})`);
    });

    console.log('\n🚀 Step 2: Running tool orchestration (parallel execution)...');
    const orchestrator = new PythonToolOrchestrator();
    
    console.log('   📊 Analyzing main branch...');
    const mainResult = await orchestrator.orchestrate(repoPath, 'base', { analysisMode: 'complete' });
    
    console.log(`   🔀 Checking out PR #${scenario.prNumber}...`);
    try {
      execSync(`git -C ${repoPath} fetch origin pull/${scenario.prNumber}/head:pr-${scenario.prNumber}`, { stdio: 'pipe' });
      execSync(`git -C ${repoPath} checkout pr-${scenario.prNumber}`, { stdio: 'pipe' });
      console.log(`   ✅ Checked out PR branch`);
    } catch (error) {
      console.log(`   ⚠️  Could not checkout PR #${scenario.prNumber}, using main branch`);
    }
    
    console.log('   📊 Analyzing PR branch...');
    const prResult = await orchestrator.orchestrate(repoPath, 'pr', { analysisMode: 'complete' });
    
    const mainResults = mainResult.toolResults;
    const prResults = prResult.toolResults;
    
    console.log(`   ✅ Main branch: ${mainResults.length} tools executed`);
    console.log(`   ✅ PR branch: ${prResults.length} tools executed`);

    const totalIssuesMain = mainResults.reduce((sum, r) => sum + (r.issues?.length || 0), 0);
    const totalIssuesPr = prResults.reduce((sum, r) => sum + (r.issues?.length || 0), 0);
    
    console.log(`   📊 Main branch issues: ${totalIssuesMain}`);
    console.log(`   📊 PR branch issues: ${totalIssuesPr}`);

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

    console.log('\n💰 Step 4: Grouping issues for cost optimization...');

    const detectIssueCategory = (tool: string): string => {
      if (tool === 'bandit' || tool === 'semgrep') return 'Security';
      if (tool === 'safety') return 'Dependencies';
      if (tool === 'pylint' || tool === 'mypy') return 'Code Quality';
      return 'Code Quality';
    };

    const formattedIssues = allPrIssues.map(issue => ({
      id: `${issue.tool}-${issue.file}-${issue.line}`,
      rule: issue.rule ? String(issue.rule) : 'unknown-rule',
      category: newIssues.some(n => n.file === issue.file && n.line === issue.line) ? 'NEW' : 'EXISTING_REST',
      detectedCategory: detectIssueCategory(issue.tool),
      severity: issue.severity || 'medium',
      title: issue.message || 'Code quality issue',
      file: issue.file || 'unknown',
      line: issue.line || 0,
      tool: issue.tool || 'unknown',
      message: issue.message || '',
      codeSnippet: undefined,
      suggestedFix: undefined
    }));

    const groupingResult = groupIssues(formattedIssues);
    console.log(`   ✅ Grouped ${formattedIssues.length} issues into ${groupingResult.groups.length} groups`);
    console.log(`   ✅ Cost savings: ${groupingResult.savingsPercent.toFixed(1)}%`);

    console.log('\n📝 Step 5: Generating report...');
    
    const modelConfigResolver = new ModelConfigResolver();
    const formatter = new V9GroupedReportFormatter(modelConfigResolver, 'python', 'medium');

    const metadata = {
      repository: scenario.repoUrl.split('/').slice(-2).join('/'),
      repoUrl: scenario.repoUrl,
      repoPath: repoPath,
      prNumber: scenario.prNumber,
      prTitle: `PR #${scenario.prNumber}`,
      branch: `pr-${scenario.prNumber}`,
      baseBranch: 'main',
      prAuthor: 'test-user',
      prAuthorEmail: 'test@example.com',
      organizationName: scenario.repoUrl.split('/')[3],
      totalFiles: 100,
      totalLinesOfCode: 10000,
      filesModified: new Set(allPrIssues.map(i => i.file)).size,
      linesAdded: 500,
      linesDeleted: 200,
      decision: newIssues.filter(i => i.severity === 'critical' || i.severity === 'high').length > 0 ? 'DECLINED' : 'APPROVED',
      blockingCount: newIssues.filter(i => i.severity === 'critical' || i.severity === 'high').length,
      totalDuration: Date.now() - startTime,
      cloneTime: 5000,
      analysisTime: Date.now() - startTime - 5000,
      reportGenerationTime: 1000,
      analyzedAt: new Date().toISOString(),
      analyzerVersion: '9.0.0',
      toolPerformance: prResult.toolPerformance,
      agentPerformance: prResult.agentPerformance
    };

    const result = await formatter.generateGroupedReport(formattedIssues, groupingResult.groups, metadata);

    console.log(`   ✅ Report generated: ${result.markdown.length} bytes`);
    console.log(`   ✅ IDE fix files: ${result.ideFixFiles.length}`);

    const totalTime = Date.now() - startTime;
    console.log(`\n${'='.repeat(80)}`);
    console.log(`✅ TEST PASSED: ${scenario.name}`);
    console.log(`${'='.repeat(80)}`);
    console.log(`📊 Total execution time: ${(totalTime / 1000).toFixed(2)}s`);
    console.log(`📊 Tools executed: ${tools.length}`);
    console.log(`📊 Issues found: ${allPrIssues.length}`);
    console.log(`📊 Parallel execution: ${prResult.summary.toolsExecuted} tools`);
    console.log(`${'='.repeat(80)}\n`);

  } catch (error) {
    console.error(`\n❌ TEST FAILED: ${scenario.name}`);
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  } finally {
    if (fs.existsSync(repoPath)) {
      execSync(`rm -rf ${repoPath}`);
    }
  }
}

async function main(): Promise<void> {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                V9 PYTHON LITE E2E TEST SUITE                              ║
║                   Testing Parallel Tool Execution                         ║
╚═══════════════════════════════════════════════════════════════════════════╝
`);

  const overallStartTime = Date.now();
  let passedTests = 0;
  let failedTests = 0;

  for (const scenario of TEST_SCENARIOS) {
    try {
      await runPythonLiteE2ETest(scenario);
      passedTests++;
    } catch (error) {
      failedTests++;
      console.error(`Failed: ${scenario.name}`);
    }
  }

  const totalTime = Date.now() - overallStartTime;
  console.log(`\nTotal: ${passedTests}/${TEST_SCENARIOS.length} passed in ${(totalTime / 1000).toFixed(2)}s`);

  if (failedTests > 0) {
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});



