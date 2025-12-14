/**
 * Multi-Framework Pattern Collection Test
 *
 * Scans 3 repositories per framework to build comprehensive pattern libraries.
 * Runs AI Fixer once per framework to test pattern learning pipeline.
 *
 * Frameworks: NestJS, Express, React, Spring Boot
 */

import dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { TypeScriptToolOrchestrator } from '../../src/two-branch/tools/typescript/typescript-tool-orchestrator';
import { classifyIssuesForFramework, type RawIssue } from '../../src/fix-agent/services/framework-issue-classifier';
import { ScanFixExecutor } from '../../src/fix-agent/scan-fix-executor';
import { execSync, spawn } from 'child_process';
import * as fs from 'fs';

// Framework configurations with 3 repos each
const FRAMEWORK_REPOS = {
  nestjs: [
    { url: 'https://github.com/nestjs/nest', name: 'nest-main' },
    { url: 'https://github.com/nestjs/nest-cli', name: 'nest-cli' },
    { url: 'https://github.com/nestjs/typescript-starter', name: 'nest-starter' },
  ],
  express: [
    { url: 'https://github.com/expressjs/express', name: 'express-main' },
    { url: 'https://github.com/expressjs/generator', name: 'express-generator' },
    { url: 'https://github.com/expressjs/body-parser', name: 'body-parser' },
    { url: 'https://github.com/expressjs/cors', name: 'cors' },
    { url: 'https://github.com/expressjs/session', name: 'session' },
  ],
  react: [
    { url: 'https://github.com/facebook/react', name: 'react-main' },
    { url: 'https://github.com/facebook/create-react-app', name: 'create-react-app' },
    { url: 'https://github.com/remix-run/react-router', name: 'react-router' },
  ],
};

const OUTPUT_DIR = path.join(__dirname, 'test-outputs', 'multi-framework-patterns');

interface ScanResult {
  framework: string;
  repo: string;
  totalIssues: number;
  fixableIssues: number;
  patternCoverage: number;
  rulesNeedingPatterns: string[];
  duration: number;
}

interface FrameworkSummary {
  framework: string;
  totalScanned: number;
  totalIssues: number;
  uniqueRules: Set<string>;
  patternCoverageAvg: number;
  aiFixerRun: boolean;
  newPatternsAdded: number;
}

async function scanRepository(
  framework: string,
  repoUrl: string,
  repoName: string
): Promise<ScanResult> {
  const startTime = Date.now();
  const testDir = `/tmp/test-${framework}-${repoName}-${Date.now()}`;
  const repoPath = `${testDir}/repo`;

  console.log(`\n  📦 Scanning: ${repoName}`);
  console.log(`     URL: ${repoUrl}`);

  try {
    // Clone repository
    fs.mkdirSync(testDir, { recursive: true });
    execSync(`git clone --depth 1 ${repoUrl} ${repoPath}`, {
      stdio: 'pipe',
      encoding: 'utf-8',
      timeout: 120000
    });

    // SESSION 45 PERFORMANCE FIX: Start npm install as background process
    // This allows other non-blocking setup to happen in parallel
    const npmInstallPromise = new Promise<void>((resolve) => {
      const npmProcess = spawn('sh', ['-c', 'npm install --legacy-peer-deps 2>/dev/null || yarn install 2>/dev/null || true'], {
        cwd: repoPath,
        stdio: 'pipe',
        detached: false
      });

      const timeout = setTimeout(() => {
        npmProcess.kill();
        resolve();
      }, 300000); // 5 minute timeout

      npmProcess.on('close', () => {
        clearTimeout(timeout);
        resolve();
      });

      npmProcess.on('error', () => {
        clearTimeout(timeout);
        resolve();
      });
    });
    console.log(`     📦 npm install started...`);

    // Wait for npm install - tools need dependencies to work properly
    await npmInstallPromise;
    console.log(`     ✅ Dependencies ready`);

    // Run analysis with all tools enabled
    // SESSION 45: dependency-check is fast (<8s) with PostgreSQL backend
    const orchestrator = new TypeScriptToolOrchestrator({
      eslint: { enabled: true, fix: false },
      typescript: { enabled: true, strict: false },
      semgrep: { enabled: true, config: 'auto' },
      npmAudit: { enabled: true, level: 'low', production: false },
      dependencyCheck: {
        enabled: true,  // Fast with PostgreSQL backend (<8s)
        failOnCVSS: 0,
        formats: ['JSON'],
        caching: { enabled: true, location: '/tmp/dc-cache' }
      },
    });

    const results = await orchestrator.orchestrate(repoPath, 'base', { userTier: 'pro' });
    const allIssues = results.toolResults?.flatMap(tr => tr.issues || []) || [];

    // Convert and classify
    const rawIssues: RawIssue[] = allIssues.map(issue => ({
      file: issue.file,
      line: issue.line,
      column: issue.column,
      rule: issue.rule,
      tool: issue.tool,
      message: issue.message,
      severity: issue.severity,
      category: 'NEW' as const
    }));

    const classification = classifyIssuesForFramework(
      rawIssues,
      framework as any,
      repoPath,
      true
    );

    // Find rules needing patterns
    const rulesNeedingPatterns = new Set<string>();
    for (const issue of classification.issues) {
      if (issue.disposition === 'ADD_TO_PATTERNS' ||
          (issue.disposition === 'FIX_NOW' && !issue.patternId)) {
        rulesNeedingPatterns.add(issue.ruleId || issue.rule);
      }
    }

    const duration = Date.now() - startTime;

    console.log(`     Issues: ${allIssues.length} total, ${classification.fixableIssues.length} fixable`);
    console.log(`     Coverage: ${classification.costAnalysis.savingsPercent.toFixed(1)}%`);
    console.log(`     New rules: ${rulesNeedingPatterns.size}`);
    console.log(`     Duration: ${(duration / 1000).toFixed(1)}s`);

    return {
      framework,
      repo: repoName,
      totalIssues: allIssues.length,
      fixableIssues: classification.fixableIssues.length,
      patternCoverage: classification.costAnalysis.savingsPercent,
      rulesNeedingPatterns: Array.from(rulesNeedingPatterns),
      duration
    };

  } catch (error: any) {
    console.log(`     ❌ Error: ${error.message.substring(0, 80)}`);
    return {
      framework,
      repo: repoName,
      totalIssues: 0,
      fixableIssues: 0,
      patternCoverage: 0,
      rulesNeedingPatterns: [],
      duration: Date.now() - startTime
    };
  } finally {
    // Cleanup
    try {
      execSync(`rm -rf ${testDir}`, { stdio: 'pipe' });
    } catch {
      // Ignore
    }
  }
}

async function runAIFixer(
  framework: string,
  repoUrl: string,
  repoName: string
): Promise<{ fixed: number; newPatterns: number; totalIssues: number }> {
  console.log(`\n  🤖 Running AI Fixer on ${repoName} (ALL issues)`);

  const testDir = `/tmp/test-ai-fixer-${framework}-${Date.now()}`;
  const repoPath = `${testDir}/repo`;

  try {
    // Clone
    fs.mkdirSync(testDir, { recursive: true });
    execSync(`git clone --depth 1 ${repoUrl} ${repoPath}`, {
      stdio: 'pipe',
      encoding: 'utf-8',
      timeout: 120000
    });

    // Install dependencies for full analysis
    const npmInstallPromise = new Promise<void>((resolve) => {
      const npmProcess = spawn('sh', ['-c', 'npm install --legacy-peer-deps 2>/dev/null || yarn install 2>/dev/null || true'], {
        cwd: repoPath,
        stdio: 'pipe',
        detached: false
      });

      const timeout = setTimeout(() => {
        npmProcess.kill();
        resolve();
      }, 300000);

      npmProcess.on('close', () => {
        clearTimeout(timeout);
        resolve();
      });

      npmProcess.on('error', () => {
        clearTimeout(timeout);
        resolve();
      });
    });
    console.log(`     📦 Installing dependencies...`);
    await npmInstallPromise;
    console.log(`     ✅ Dependencies ready`);

    // Quick scan to get issues - all tools enabled
    const orchestrator = new TypeScriptToolOrchestrator({
      eslint: { enabled: true, fix: false },
      typescript: { enabled: true, strict: false },
      semgrep: { enabled: true, config: 'auto' },
      npmAudit: { enabled: true, level: 'moderate', production: false },
    });

    const results = await orchestrator.orchestrate(repoPath, 'base', { userTier: 'pro' });
    const allIssues = results.toolResults?.flatMap(tr => tr.issues || []) || [];

    if (allIssues.length === 0) {
      console.log('     No issues found to fix');
      return { fixed: 0, newPatterns: 0, totalIssues: 0 };
    }

    // SESSION 44 FIX: Filter out environment issues before selecting issues to fix
    // These are TypeScript errors from missing npm install, not real code issues
    const ENV_ISSUE_RULES = ['TS2307', 'TS2580', 'TS2582', 'TS2305', 'TS2304'];
    const fixableIssues = allIssues.filter(issue => {
      // Filter out TypeScript environment issues
      if (issue.tool === 'typescript' && ENV_ISSUE_RULES.includes(issue.rule)) {
        return false;
      }
      return true;
    });

    console.log(`     Total: ${allIssues.length}, Fixable: ${fixableIssues.length} (filtered ${allIssues.length - fixableIssues.length} env issues)`);

    // SESSION 46: Process ALL fixable issues (no limit) to maximize pattern collection
    const issuesToFix = fixableIssues.map(issue => ({
      file: issue.file,
      line: issue.line,
      column: issue.column,
      rule: issue.rule,
      tool: issue.tool,
      message: issue.message,
      severity: issue.severity,
      category: 'NEW' as const,
    }));

    console.log(`     Processing ALL ${issuesToFix.length} issues with AI Fixer...`);

    // Run AI Fixer
    // SESSION 44 FIX: Changed dryRun to false to enable pattern saving to Supabase
    // With dryRun: true, AI fixes were verified but NEVER saved to patterns table
    // This was breaking the pattern flywheel - fixes worked but patterns never accumulated
    const fixExecutor = new ScanFixExecutor({
      workingDir: repoPath,
      language: 'typescript',
      outputMode: 'patch',
      dryRun: false,  // CRITICAL: Must be false to save patterns to Supabase!
      userTier: 'pro',
      fixWithReview: true,
    });

    const fixResults = await fixExecutor.executeFixes(issuesToFix);

    // Count Tier 3 AI fixes as potential new patterns
    const tier3Fixes = fixResults.summary.tier3Fixed || 0;

    console.log(`     ✅ Fixed: ${fixResults.summary.fixedIssues}/${issuesToFix.length}`);
    console.log(`     🤖 AI (Tier 3) fixes: ${tier3Fixes}`);

    return {
      fixed: fixResults.summary.fixedIssues,
      newPatterns: tier3Fixes,  // Each AI fix can become a pattern
      totalIssues: issuesToFix.length
    };

  } catch (error: any) {
    console.log(`     ❌ AI Fixer error: ${error.message.substring(0, 80)}`);
    return { fixed: 0, newPatterns: 0, totalIssues: 0 };
  } finally {
    try {
      execSync(`rm -rf ${testDir}`, { stdio: 'pipe' });
    } catch {
      // Ignore
    }
  }
}

async function main(): Promise<void> {
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║  MULTI-FRAMEWORK PATTERN COLLECTION TEST                             ║');
  console.log('╠══════════════════════════════════════════════════════════════════════╣');
  console.log('║  Scanning 3 repositories per framework                               ║');
  console.log('║  Running AI Fixer once per framework for pattern learning            ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
  console.log('');

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const allResults: ScanResult[] = [];
  const frameworkSummaries: FrameworkSummary[] = [];

  // Process each framework
  for (const [framework, repos] of Object.entries(FRAMEWORK_REPOS)) {
    console.log('');
    console.log('═'.repeat(70));
    console.log(`  ${framework.toUpperCase()} FRAMEWORK`);
    console.log('═'.repeat(70));

    const frameworkResults: ScanResult[] = [];
    const allRules = new Set<string>();

    // Scan all 3 repos
    for (const repo of repos) {
      const result = await scanRepository(framework, repo.url, repo.name);
      frameworkResults.push(result);
      allResults.push(result);
      result.rulesNeedingPatterns.forEach(r => allRules.add(r));
    }

    // SESSION 46: Run AI Fixer on ALL repos with issues (fix ALL issues)
    let totalFixed = 0;
    let totalNewPatterns = 0;
    const reposWithIssues = frameworkResults.filter(r => r.totalIssues > 0);

    for (const result of reposWithIssues) {
      const repoConfig = repos.find(r => r.name === result.repo);
      if (repoConfig) {
        const aiResult = await runAIFixer(framework, repoConfig.url, repoConfig.name);
        totalFixed += aiResult.fixed;
        totalNewPatterns += aiResult.newPatterns;
      }
    }
    const aiFixerResult = { fixed: totalFixed, newPatterns: totalNewPatterns };

    // Calculate framework summary
    const totalIssues = frameworkResults.reduce((sum, r) => sum + r.totalIssues, 0);
    const avgCoverage = frameworkResults.length > 0
      ? frameworkResults.reduce((sum, r) => sum + r.patternCoverage, 0) / frameworkResults.length
      : 0;

    frameworkSummaries.push({
      framework,
      totalScanned: repos.length,
      totalIssues,
      uniqueRules: allRules,
      patternCoverageAvg: avgCoverage,
      aiFixerRun: aiFixerResult.fixed > 0 || aiFixerResult.newPatterns > 0,
      newPatternsAdded: aiFixerResult.newPatterns
    });

    console.log('');
    console.log(`  📊 ${framework.toUpperCase()} Summary:`);
    console.log(`     Total issues found: ${totalIssues}`);
    console.log(`     Unique rules needing patterns: ${allRules.size}`);
    console.log(`     Average pattern coverage: ${avgCoverage.toFixed(1)}%`);
    console.log(`     AI Fixer fixes: ${aiFixerResult.fixed}`);
    console.log(`     New patterns learned: ${aiFixerResult.newPatterns}`);
  }

  // Final summary
  console.log('');
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║  FINAL SUMMARY                                                       ║');
  console.log('╠══════════════════════════════════════════════════════════════════════╣');

  for (const summary of frameworkSummaries) {
    console.log(`║  ${summary.framework.toUpperCase().padEnd(15)} Issues: ${summary.totalIssues.toString().padEnd(6)} Coverage: ${summary.patternCoverageAvg.toFixed(0)}%`.padEnd(68) + '  ║');
  }

  console.log('╠══════════════════════════════════════════════════════════════════════╣');

  const totalNewPatterns = frameworkSummaries.reduce((sum, s) => sum + s.newPatternsAdded, 0);
  console.log(`║  Total repositories scanned: ${allResults.length}`.padEnd(69) + '║');
  console.log(`║  Total issues found: ${allResults.reduce((sum, r) => sum + r.totalIssues, 0)}`.padEnd(69) + '║');
  console.log(`║  New patterns learned via AI: ${totalNewPatterns}`.padEnd(69) + '║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');

  // Save results
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  fs.writeFileSync(
    path.join(OUTPUT_DIR, `multi-framework-results-${timestamp}.json`),
    JSON.stringify({
      timestamp: new Date().toISOString(),
      results: allResults,
      summaries: frameworkSummaries.map(s => ({
        ...s,
        uniqueRules: Array.from(s.uniqueRules)
      }))
    }, null, 2)
  );

  console.log('');
  console.log(`Results saved to: ${OUTPUT_DIR}`);
}

// Run specific framework if provided as argument
const targetFramework = process.argv[2];

if (targetFramework && FRAMEWORK_REPOS[targetFramework as keyof typeof FRAMEWORK_REPOS]) {
  console.log(`Running for single framework: ${targetFramework}`);
  // Run just that framework
  const repos = FRAMEWORK_REPOS[targetFramework as keyof typeof FRAMEWORK_REPOS];
  (async () => {
    console.log(`\n═══ ${targetFramework.toUpperCase()} FRAMEWORK ═══\n`);

    // Scan all repos and collect results
    const scanResults: ScanResult[] = [];
    for (const repo of repos) {
      const result = await scanRepository(targetFramework, repo.url, repo.name);
      scanResults.push(result);
    }

    // SESSION 46: Run AI Fixer on ALL repos with issues (not just one)
    // This maximizes pattern collection and fix coverage
    const reposWithIssues = scanResults.filter(r => r.totalIssues > 0);

    let totalFixed = 0;
    let totalNewPatterns = 0;
    let totalProcessed = 0;

    if (reposWithIssues.length > 0) {
      console.log(`\n  🔧 Running AI Fixer on ${reposWithIssues.length} repos with issues...`);

      for (const scanResult of reposWithIssues) {
        const repoConfig = repos.find(r => r.name === scanResult.repo);
        if (repoConfig) {
          const aiResult = await runAIFixer(targetFramework, repoConfig.url, repoConfig.name);
          totalFixed += aiResult.fixed;
          totalNewPatterns += aiResult.newPatterns;
          totalProcessed += aiResult.totalIssues;
        }
      }

      console.log(`\n  🎯 AI Fixer Total Results: ${totalFixed}/${totalProcessed} fixed, ${totalNewPatterns} new patterns`);
    } else {
      console.log(`\n  ⚠️ No repos with issues found for AI Fixer`);
    }

    // Print summary
    const totalIssues = scanResults.reduce((sum, r) => sum + r.totalIssues, 0);
    console.log(`\n═══ ${targetFramework.toUpperCase()} SUMMARY ═══`);
    console.log(`  Total repos scanned: ${scanResults.length}`);
    console.log(`  Total issues found: ${totalIssues}`);
    console.log(`  Repos with issues: ${scanResults.filter(r => r.totalIssues > 0).length}`);
  })();
} else {
  main().catch(console.error);
}
