/**
 * V9 Analysis of CodeQual PR #69
 */
import dotenv from 'dotenv';
dotenv.config();

import { TypeScriptToolOrchestrator } from './src/two-branch/tools/typescript/typescript-tool-orchestrator';
import { V9GroupedReportFormatter } from './src/two-branch/analyzers/v9-grouped-report-formatter';
import { ModelConfigResolver } from './src/standard/orchestrator/model-config-resolver';
import { groupIssues } from './src/two-branch/utils/issue-grouping';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

async function analyzePR69() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║        V9 ANALYSIS: CodeQual PR #69                           ║');
  console.log('║        feat/v9-footer-fixes-pr                                ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  const repoPath = '/Users/alpinro/CodePrjects/codequal';
  const startTime = Date.now();

  try {
    // Step 1: Run tool orchestration on current branch
    console.log('🚀 Step 1: Running TypeScript tool orchestration...');
    const orchestrator = new TypeScriptToolOrchestrator();

    const result = await orchestrator.orchestrate(repoPath, 'pr', { analysisMode: 'complete' });

    const toolResults = result.toolResults || [];
    const allIssues = toolResults.flatMap(r => r.issues || []);
    console.log(`   ✅ Analysis complete: ${allIssues.length} issues found`);

    // Show breakdown by tool
    const byTool: Record<string, number> = {};
    toolResults.forEach((r: any) => {
      byTool[r.tool] = (r.issues?.length || 0);
    });
    console.log('   📊 By tool:');
    Object.entries(byTool).forEach(([tool, count]) => {
      console.log(`      - ${tool}: ${count}`);
    });

    // Step 2: Get PR-modified files for proper categorization
    console.log('\n📂 Step 2: Getting PR-modified files...');

    let modifiedFiles: Set<string>;
    try {
      const gitOutput = execSync('git diff --name-only main...HEAD', {
        cwd: repoPath,
        encoding: 'utf-8'
      });
      modifiedFiles = new Set(
        gitOutput.split('\n')
          .filter(f => f.trim())
          .map(f => f.replace('packages/agents/', '')) // Normalize paths
      );
      console.log(`   ✅ Found ${modifiedFiles.size} files modified in PR`);
    } catch (error) {
      console.log('   ⚠️ Could not get modified files, marking all as NEW');
      modifiedFiles = new Set(); // Empty = all will be NEW
    }

    // Step 3: Format issues with proper categorization
    console.log('\n📝 Step 3: Formatting issues...');

    const detectIssueCategory = (tool: string, rule: string | null | undefined): string => {
      if (tool === 'semgrep') return 'Security';
      if (tool === 'npm-audit') return 'Dependencies';
      if (tool === 'eslint' && rule?.includes('security')) return 'Security';
      if (tool === 'eslint' && rule?.includes('performance')) return 'Performance';
      if (tool === 'typescript') return 'Code Quality';
      return 'Code Quality';
    };

    // Check if a file was modified in the PR
    const isFileModified = (filePath: string): boolean => {
      // Normalize the file path for comparison
      const normalizedPath = filePath.replace(/^\/Users\/alpinro\/CodePrjects\/codequal\/packages\/agents\//, '');
      return modifiedFiles.has(normalizedPath) ||
             modifiedFiles.has(`packages/agents/${normalizedPath}`) ||
             Array.from(modifiedFiles).some(f => f.endsWith(normalizedPath) || normalizedPath.endsWith(f));
    };

    const formattedIssues = allIssues.map(issue => {
      const fileModified = isFileModified(issue.file || '');
      return {
        id: `${issue.tool}-${issue.file}-${issue.line}`,
        rule: issue.rule ? String(issue.rule) : 'unknown-rule',
        category: fileModified ? 'NEW' : 'EXISTING_REST', // NEW if in modified file
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

    // Show categorization breakdown
    const newCount = formattedIssues.filter(i => i.category === 'NEW').length;
    const existingCount = formattedIssues.filter(i => i.category === 'EXISTING_REST').length;
    console.log(`   ✅ Categorized: ${newCount} NEW, ${existingCount} EXISTING_REST`);

    console.log(`   ✅ Formatted ${formattedIssues.length} issues`);

    // Step 4: Group issues
    console.log('\n💰 Step 4: Grouping issues for cost optimization...');
    const groupingResult = groupIssues(formattedIssues);
    console.log(`   ✅ Grouped ${formattedIssues.length} issues into ${groupingResult.groups.length} groups`);
    console.log(`   ✅ Cost savings: ${groupingResult.savingsPercent.toFixed(1)}%`);

    // Step 5: Generate report
    console.log('\n📝 Step 5: Generating V9 report with AI enrichment...');
    const modelConfigResolver = new ModelConfigResolver();

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
      prTitle: 'feat: V9 footer fixes and ESLint improvements',
      branch: 'feat/v9-footer-fixes-pr',
      baseBranch: 'main',
      prAuthor: 'alpsla',
      prAuthorEmail: '[email protected]', // Actual git email
      organizationName: 'alpsla',
      totalFiles: 1133, // Actual file count
      totalLinesOfCode: 292479, // Actual line count
      filesModified: new Set(formattedIssues.map(i => i.file)).size,
      linesAdded: 100,
      linesDeleted: 50,
      decision: formattedIssues.filter(i => i.category === 'NEW' && (i.severity === 'critical' || i.severity === 'high')).length > 0 ? 'DECLINED' : 'APPROVED',
      blockingCount: formattedIssues.filter(i => i.category === 'NEW' && (i.severity === 'critical' || i.severity === 'high')).length,
      totalDuration: Date.now() - startTime,
      cloneTime: 0,
      analysisTime: Date.now() - startTime,
      reportGenerationTime: 1000,
      analyzedAt: new Date().toISOString(),
      analyzerVersion: '9.0.0',
      toolPerformance: result.toolPerformance,
      agentPerformance: result.agentPerformance
    };

    const report = await formatter.generateGroupedReport(
      formattedIssues,
      groupingResult.groups,
      metadata
    );

    // Step 5: Save report
    const outputDir = path.join(repoPath, 'packages/agents/test-outputs');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = Date.now();
    const reportPath = path.join(outputDir, `v9-codequal-pr69-${timestamp}.md`);
    fs.writeFileSync(reportPath, report.markdown);

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(`\n✅ Report saved: ${reportPath}`);
    console.log(`⏱️  Total time: ${duration}s`);
    console.log(`📊 Total issues: ${formattedIssues.length}`);
    console.log(`📄 Report size: ${(report.markdown.length / 1024).toFixed(1)} KB`);

    // Show severity breakdown
    const bySeverity: Record<string, number> = {};
    formattedIssues.forEach((issue: any) => {
      bySeverity[issue.severity || 'unknown'] = (bySeverity[issue.severity || 'unknown'] || 0) + 1;
    });
    console.log('\n📊 By severity:');
    Object.entries(bySeverity).sort((a, b) => b[1] - a[1]).forEach(([sev, count]) => {
      console.log(`   - ${sev}: ${count}`);
    });

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

analyzePR69().catch(console.error);
