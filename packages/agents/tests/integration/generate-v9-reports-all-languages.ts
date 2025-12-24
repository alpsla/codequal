#!/usr/bin/env npx ts-node
/**
 * V9 Multi-Language Report Generator (Two-Branch PR Comparison)
 *
 * Generates V9 markdown reports for all 7 supported languages:
 * - Go, Ruby, PHP, Python, TypeScript, Rust, C#/.NET
 *
 * Uses REAL PRs with proper two-branch comparison:
 * - Analyzes main/default branch
 * - Analyzes PR branch
 * - Categorizes issues as NEW, RESOLVED, EXISTING_MODIFIED, EXISTING_REST
 * - Fetches PR author from GitHub API
 *
 * Each report is saved to: tests/integration/{language}/v9-reports/
 *
 * IMPORTANT: Runs SEQUENTIALLY (not parallel) because each language test
 * uses 4 CPU cores for tool execution (semgrep --jobs=4)
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';
import * as https from 'https';

// Load environment
dotenv.config({ path: path.join(__dirname, '../../.env') });
process.env.DEBUG_MODE = 'true';

// Import orchestrators
import { GoToolOrchestrator } from '../../src/two-branch/tools/go';
import { RubyToolOrchestrator } from '../../src/two-branch/tools/ruby';
import { PHPToolOrchestrator } from '../../src/two-branch/tools/php';
import { PythonToolOrchestrator } from '../../src/two-branch/tools/python';
import { TypeScriptToolOrchestrator } from '../../src/two-branch/tools/typescript';
import { RustToolOrchestrator } from '../../src/two-branch/tools/rust';
import { DotnetToolOrchestrator } from '../../src/two-branch/tools/dotnet';
import { V9GroupedReportFormatter } from '../../src/two-branch/analyzers/v9-grouped-report-formatter';
import { groupIssues } from '../../src/two-branch/utils/issue-grouping';

interface LanguageConfig {
  name: string;
  language: string;
  repoUrl: string;
  prNumber: number;
  framework: string;
  orchestratorFactory: () => any;
}

// Test repositories with REAL PRs for each language
const LANGUAGE_CONFIGS: LanguageConfig[] = [
  {
    name: 'Go',
    language: 'go',
    repoUrl: 'https://github.com/gin-gonic/gin',
    prNumber: 4474,  // Feat: Add Http headers constants
    framework: 'gin',
    orchestratorFactory: () => new GoToolOrchestrator()
  },
  {
    name: 'Ruby',
    language: 'ruby',
    repoUrl: 'https://github.com/sinatra/sinatra',
    prNumber: 2132,  // Fix RDoc 6.16+ compatibility
    framework: 'sinatra',
    orchestratorFactory: () => new RubyToolOrchestrator()
  },
  {
    name: 'PHP',
    language: 'php',
    repoUrl: 'https://github.com/laravel/framework',
    prNumber: 58164,  // Fix unable to disable created_at
    framework: 'laravel',
    orchestratorFactory: () => new PHPToolOrchestrator()
  },
  {
    name: 'Python',
    language: 'python',
    repoUrl: 'https://github.com/psf/requests',
    prNumber: 7124,  // perf: use set instead of list
    framework: 'requests',
    orchestratorFactory: () => new PythonToolOrchestrator()
  },
  {
    name: 'TypeScript',
    language: 'typescript',
    repoUrl: 'https://github.com/expressjs/express',
    prNumber: 6947,  // fix: add type safety to res.location
    framework: 'express',
    orchestratorFactory: () => new TypeScriptToolOrchestrator()
  },
  {
    name: 'Rust',
    language: 'rust',
    repoUrl: 'https://github.com/tokio-rs/tokio',
    prNumber: 7777,  // macros: insert leading colon
    framework: 'tokio',
    orchestratorFactory: () => new RustToolOrchestrator()
  },
  {
    name: 'Dotnet',
    language: 'dotnet',
    repoUrl: 'https://github.com/dotnet/aspnetcore',
    prNumber: 64814,  // Ensure template files end with newline
    framework: 'aspnetcore',
    orchestratorFactory: () => new DotnetToolOrchestrator()
  }
];

function cloneRepository(repoUrl: string, targetPath: string): void {
  console.log(`   Cloning ${repoUrl}...`);
  if (fs.existsSync(targetPath)) {
    execSync(`rm -rf ${targetPath}`);
  }
  // Clone with more history for PR comparison
  execSync(`git clone --depth 50 ${repoUrl} ${targetPath}`, {
    stdio: 'pipe',
    encoding: 'utf-8'
  });
  console.log(`   Repository cloned to ${targetPath}`);
}

// Fetch PR metadata from GitHub API
async function fetchPRMetadata(repoUrl: string, prNumber: number): Promise<{
  author: string;
  authorEmail: string;
  title: string;
  baseBranch: string;
  headRef: string;
}> {
  const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (!match) {
    return { author: 'unknown', authorEmail: 'unknown@example.com', title: `PR #${prNumber}`, baseBranch: 'main', headRef: '' };
  }

  const [, owner, repo] = match;
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`;

  return new Promise((resolve) => {
    https.get(apiUrl, {
      headers: {
        'User-Agent': 'CodeQual-V9-Test',
        'Accept': 'application/vnd.github.v3+json'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const pr = JSON.parse(data);
          resolve({
            author: pr.user?.login || 'unknown',
            authorEmail: `${pr.user?.login || 'unknown'}@users.noreply.github.com`,
            title: pr.title || `PR #${prNumber}`,
            baseBranch: pr.base?.ref || 'main',
            headRef: pr.head?.ref || ''
          });
        } catch {
          resolve({ author: 'unknown', authorEmail: 'unknown@example.com', title: `PR #${prNumber}`, baseBranch: 'main', headRef: '' });
        }
      });
    }).on('error', () => {
      resolve({ author: 'unknown', authorEmail: 'unknown@example.com', title: `PR #${prNumber}`, baseBranch: 'main', headRef: '' });
    });
  });
}

function detectDefaultBranch(repoPath: string): string {
  try {
    const result = execSync(`git -C ${repoPath} symbolic-ref refs/remotes/origin/HEAD 2>/dev/null || echo "refs/remotes/origin/main"`, {
      encoding: 'utf-8'
    }).trim();
    return result.replace('refs/remotes/origin/', '');
  } catch {
    return 'main';
  }
}

async function generateReportForLanguage(config: LanguageConfig): Promise<string | null> {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Generating V9 Report: ${config.name} (PR #${config.prNumber})`);
  console.log(`${'='.repeat(80)}\n`);

  const startTime = Date.now();
  const repoPath = `/tmp/v9-report-${config.language}-${Date.now()}`;
  let reportPath: string | null = null;

  try {
    // Step 1: Clone repository
    console.log('Step 1: Cloning repository...');
    cloneRepository(config.repoUrl, repoPath);

    // Step 2: Fetch PR metadata
    console.log('\nStep 2: Fetching PR metadata from GitHub...');
    const prMetadata = await fetchPRMetadata(config.repoUrl, config.prNumber);
    console.log(`   Author: ${prMetadata.author}`);
    console.log(`   Title: ${prMetadata.title}`);
    console.log(`   Base: ${prMetadata.baseBranch}`);

    // Step 3: Detect default branch
    const defaultBranch = detectDefaultBranch(repoPath);
    console.log(`   Default branch: ${defaultBranch}`);

    // Step 4: Run tool orchestration on MAIN branch
    console.log('\nStep 3: Analyzing main branch...');
    const orchestrator = config.orchestratorFactory();

    const mainResult = await orchestrator.orchestrate(
      repoPath,
      'base',
      { analysisMode: 'standard', userTier: 'pro' }
    );

    const mainIssues = mainResult.toolResults.flatMap((r: any) => r.issues || []);
    console.log(`   Main branch issues: ${mainIssues.length}`);

    // Step 5: Checkout PR branch and analyze
    console.log('\nStep 4: Checking out PR branch...');
    const prBranchName = `pr-${config.prNumber}`;

    try {
      execSync(`git -C ${repoPath} fetch origin pull/${config.prNumber}/head:${prBranchName}`, { stdio: 'pipe' });
      execSync(`git -C ${repoPath} checkout ${prBranchName}`, { stdio: 'pipe' });
      console.log(`   Checked out PR #${config.prNumber}`);
    } catch (error) {
      console.log(`   Could not fetch PR #${config.prNumber} - using main branch only`);
      // Fall back to main branch analysis only
    }

    console.log('\nStep 5: Analyzing PR branch...');
    const prResult = await orchestrator.orchestrate(
      repoPath,
      'pr',
      { analysisMode: 'standard', userTier: 'pro' }
    );

    const prIssues = prResult.toolResults.flatMap((r: any) => r.issues || []);
    console.log(`   PR branch issues: ${prIssues.length}`);

    // Step 6: Get modified files
    let modifiedFiles: string[] = [];
    try {
      const diffOutput = execSync(`git -C ${repoPath} diff --name-only ${defaultBranch}...${prBranchName}`, { encoding: 'utf-8' });
      modifiedFiles = diffOutput.trim().split('\n').filter(f => f);
    } catch {
      modifiedFiles = [];
    }
    console.log(`   Modified files: ${modifiedFiles.length}`);

    // Step 7: Categorize issues (V9 two-branch comparison)
    console.log('\nStep 6: Categorizing issues (V9 two-branch)...');

    const normalizePath = (p: string) => p.replace(/^\/workspace\//, '').replace(/^workspace\//, '');
    const getSig = (i: any) => `${normalizePath(i.file)}:${i.line}:${i.rule || i.tool}`;

    const mainSigs = new Set(mainIssues.map(getSig));
    const prSigs = new Set(prIssues.map(getSig));
    const modifiedFilesSet = new Set(modifiedFiles);

    const categorizedIssues: any[] = [];

    // NEW: In PR but not in main
    const newIssues = prIssues.filter((i: any) => !mainSigs.has(getSig(i)));
    newIssues.forEach((issue: any) => {
      issue.category = 'NEW';
      categorizedIssues.push(issue);
    });

    // EXISTING_MODIFIED: In both, in modified files
    const existingModified = prIssues.filter((i: any) => {
      const normalizedFile = normalizePath(i.file);
      return mainSigs.has(getSig(i)) && modifiedFilesSet.has(normalizedFile);
    });
    existingModified.forEach((issue: any) => {
      issue.category = 'EXISTING_MODIFIED';
      categorizedIssues.push(issue);
    });

    // EXISTING_REST: In both, NOT in modified files
    const existingRest = prIssues.filter((i: any) => {
      const normalizedFile = normalizePath(i.file);
      return mainSigs.has(getSig(i)) && !modifiedFilesSet.has(normalizedFile);
    });
    existingRest.forEach((issue: any) => {
      issue.category = 'EXISTING_REST';
      categorizedIssues.push(issue);
    });

    // RESOLVED: In main but not in PR, file was modified
    const prFileExists = new Set(prIssues.map((i: any) => normalizePath(i.file)));
    const resolvedIssues = mainIssues.filter((i: any) => {
      const normalizedFile = normalizePath(i.file);
      return !prSigs.has(getSig(i)) && modifiedFilesSet.has(normalizedFile) && prFileExists.has(normalizedFile);
    });
    resolvedIssues.forEach((issue: any) => {
      issue.category = 'RESOLVED';
      categorizedIssues.push(issue);
    });

    console.log(`   NEW: ${newIssues.length}`);
    console.log(`   EXISTING_MODIFIED: ${existingModified.length}`);
    console.log(`   EXISTING_REST: ${existingRest.length}`);
    console.log(`   RESOLVED: ${resolvedIssues.length}`);

    // Step 8: Group and format issues
    console.log('\nStep 7: Grouping issues...');

    const detectIssueCategory = (tool: string, rule: string | null | undefined): string => {
      if (tool === 'semgrep' || tool === 'bandit' || tool === 'brakeman' || tool === 'gosec') return 'Security';
      if (tool === 'dependency-check' || tool === 'npm-audit' || tool === 'pip-audit' ||
          tool === 'bundler-audit' || tool === 'cargo-audit' || tool === 'govulncheck' ||
          tool === 'composer-audit') return 'Dependencies';
      if (tool === 'madge' || tool === 'pydeps' || tool === 'jdepend' || tool === 'packwerk') return 'Architecture';
      return 'Code Quality';
    };

    const formattedIssues = categorizedIssues.map((issue: any) => ({
      id: `${issue.tool}-${issue.file}-${issue.line}`,
      rule: issue.rule ? String(issue.rule) : 'unknown-rule',
      category: issue.category,
      detectedCategory: detectIssueCategory(issue.tool, issue.rule ? String(issue.rule) : ''),
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
    console.log(`   Grouped into ${groupingResult.groups.length} groups`);

    // Step 9: Generate V9 report
    console.log('\nStep 8: Generating V9 markdown report...');

    const formatter = new V9GroupedReportFormatter(
      null,  // patterns + rule descriptions only, no AI calls
      config.language as any,
      'medium'
    );

    const totalFiles = parseInt(execSync(`git -C ${repoPath} ls-files | wc -l`, { encoding: 'utf-8' }).trim()) || 0;

    const metadata = {
      repository: config.repoUrl.split('/').slice(-2).join('/'),
      repoUrl: config.repoUrl,
      repoPath: repoPath,
      prNumber: config.prNumber,
      prTitle: prMetadata.title,
      branch: prBranchName,
      baseBranch: defaultBranch,
      prAuthor: prMetadata.author,
      prAuthorEmail: prMetadata.authorEmail,
      organizationName: config.repoUrl.split('/')[3],
      totalFiles: totalFiles,
      totalLinesOfCode: 0,
      filesModified: modifiedFiles.length,
      linesAdded: 0,
      linesDeleted: 0,
      decision: newIssues.filter((i: any) => i.severity === 'critical' || i.severity === 'high').length > 0 ? 'DECLINED' : 'APPROVED',
      blockingCount: newIssues.filter((i: any) => i.severity === 'critical' || i.severity === 'high').length,
      totalDuration: Date.now() - startTime,
      cloneTime: 5000,
      analysisTime: Date.now() - startTime - 5000,
      reportGenerationTime: 1000,
      analyzedAt: new Date().toISOString(),
      analyzerVersion: '9.0.0',
      toolPerformance: prResult.toolPerformance || [],
      agentPerformance: prResult.agentPerformance || [],
      fixExecution: null
    };

    const result = await formatter.generateGroupedReport(
      formattedIssues,
      groupingResult.groups,
      metadata
    );

    console.log(`   Report generated: ${result.markdown.length} bytes`);

    // Step 10: Save report
    console.log('\nStep 9: Saving report...');

    const outputDir = path.join(__dirname, config.language, 'v9-reports');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const reportFilename = `${config.framework}-pr${config.prNumber}-${timestamp}.md`;
    reportPath = path.join(outputDir, reportFilename);

    fs.writeFileSync(reportPath, result.markdown);
    console.log(`   Report saved: ${reportPath}`);

    // Summary
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n${'='.repeat(80)}`);
    console.log(`COMPLETED: ${config.name} PR #${config.prNumber}`);
    console.log(`   Author: ${prMetadata.author}`);
    console.log(`   Total time: ${totalTime}s`);
    console.log(`   NEW issues: ${newIssues.length}`);
    console.log(`   RESOLVED: ${resolvedIssues.length}`);
    console.log(`   Report: ${reportPath}`);
    console.log(`${'='.repeat(80)}\n`);

    return reportPath;

  } catch (error: any) {
    console.error(`\nFAILED: ${config.name}`);
    console.error(`   Error: ${error.message}`);
    if (error.stack) {
      console.error(`   Stack: ${error.stack.substring(0, 500)}`);
    }
    return null;
  } finally {
    // Cleanup
    if (fs.existsSync(repoPath)) {
      execSync(`rm -rf ${repoPath}`);
    }
  }
}

async function main(): Promise<void> {
  console.log(`
================================================================================
         V9 MULTI-LANGUAGE REPORT GENERATOR (Two-Branch PR Comparison)
================================================================================
  Languages: ${LANGUAGE_CONFIGS.map(c => c.name).join(', ')}
  Mode: SEQUENTIAL (4 CPUs per language)
  Output: tests/integration/{language}/v9-reports/
  Features:
    - Real PR analysis (not baseline)
    - Two-branch comparison (main vs PR)
    - Git author from GitHub API
    - NEW/RESOLVED/EXISTING issue categorization
================================================================================
`);

  const results: { language: string; prNumber: number; reportPath: string | null; success: boolean }[] = [];
  const overallStartTime = Date.now();

  // Run SEQUENTIALLY (not parallel) - each uses 4 CPU cores
  for (const config of LANGUAGE_CONFIGS) {
    const reportPath = await generateReportForLanguage(config);
    results.push({
      language: config.name,
      prNumber: config.prNumber,
      reportPath,
      success: reportPath !== null
    });
  }

  // Final summary
  const totalTime = ((Date.now() - overallStartTime) / 1000).toFixed(2);
  const successCount = results.filter(r => r.success).length;

  console.log(`
================================================================================
                          FINAL SUMMARY
================================================================================
  Languages processed: ${results.length}
  Successful: ${successCount}
  Failed: ${results.length - successCount}
  Total time: ${totalTime}s
================================================================================

REPORT PATHS FOR MANUAL REVIEW:
`);

  for (const result of results) {
    const status = result.success ? 'OK' : 'FAIL';
    const pathDisplay = result.reportPath || 'FAILED';
    console.log(`  [${status}] ${result.language} PR #${result.prNumber}: ${pathDisplay}`);
  }

  console.log(`
================================================================================
`);

  if (successCount < results.length) {
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
