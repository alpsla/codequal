/**
 * Java Multi-Repository Pattern Collection Test
 *
 * Scans multiple Java repositories to build comprehensive pattern libraries.
 * Runs AI Fixer on ALL issues to maximize pattern learning.
 *
 * Frameworks: Spring Boot, Quarkus, Micronaut
 */

import dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config({ path: path.join(__dirname, '../../../../.env') });

import { JavaToolOrchestrator } from '../../src/two-branch/tools/java/java-tool-orchestrator';
import { ScanFixExecutor } from '../../src/fix-agent/scan-fix-executor';
import { execSync, spawn } from 'child_process';
import * as fs from 'fs';

// Java Framework configurations with multiple repos each
const JAVA_REPOS = {
  spring: [
    { url: 'https://github.com/spring-projects/spring-petclinic', name: 'spring-petclinic' },
    { url: 'https://github.com/spring-projects/spring-authorization-server', name: 'spring-auth-server' },
    { url: 'https://github.com/spring-projects/spring-data-examples', name: 'spring-data-examples' },
  ],
  quarkus: [
    { url: 'https://github.com/quarkusio/quarkus-quickstarts', name: 'quarkus-quickstarts' },
  ],
  micronaut: [
    { url: 'https://github.com/micronaut-projects/micronaut-examples', name: 'micronaut-examples' },
  ],
};

const OUTPUT_DIR = path.join(__dirname, 'test-outputs', 'java-pattern-collection');

interface ScanResult {
  framework: string;
  repo: string;
  totalIssues: number;
  fixableIssues: number;
  duration: number;
}

async function scanRepository(
  framework: string,
  repoUrl: string,
  repoName: string
): Promise<ScanResult> {
  const startTime = Date.now();
  const testDir = `/tmp/test-java-${framework}-${repoName}-${Date.now()}`;
  const repoPath = `${testDir}/repo`;

  console.log(`\n  📦 Scanning: ${repoName}`);
  console.log(`     URL: ${repoUrl}`);

  try {
    // Clone repository
    fs.mkdirSync(testDir, { recursive: true });
    execSync(`git clone --depth 1 ${repoUrl} ${repoPath}`, {
      stdio: 'pipe',
      encoding: 'utf-8',
      timeout: 180000 // 3 min timeout for clone
    });

    // Initialize Java orchestrator
    const orchestrator = new JavaToolOrchestrator({
      pmd: { enabled: true, rulesets: ['category/java/bestpractices.xml', 'category/java/errorprone.xml'], failOnViolation: false },
      semgrep: { enabled: true, config: 'auto' },
      dependencyCheck: { enabled: true, failOnCVSS: 0, formats: ['JSON'], caching: { enabled: true, location: '/tmp/dependency-check-cache' } },
    });

    // Run analysis
    console.log(`     🔍 Running analysis...`);
    const results = await orchestrator.orchestrate(repoPath, 'base', { userTier: 'pro' });
    const allIssues = results.toolResults?.flatMap(tr => tr.issues || []) || [];

    const duration = (Date.now() - startTime) / 1000;

    console.log(`     Issues: ${allIssues.length} total`);
    console.log(`     Duration: ${duration.toFixed(1)}s`);

    // Cleanup
    try {
      execSync(`rm -rf ${testDir}`, { stdio: 'pipe' });
    } catch {
      // Ignore cleanup errors
    }

    return {
      framework,
      repo: repoName,
      totalIssues: allIssues.length,
      fixableIssues: allIssues.length,
      duration,
    };

  } catch (error: any) {
    console.log(`     ❌ Error: ${error.message.substring(0, 80)}`);

    // Cleanup on error
    try {
      execSync(`rm -rf ${testDir}`, { stdio: 'pipe' });
    } catch {
      // Ignore
    }

    return {
      framework,
      repo: repoName,
      totalIssues: 0,
      fixableIssues: 0,
      duration: (Date.now() - startTime) / 1000,
    };
  }
}

async function runAIFixer(
  framework: string,
  repoUrl: string,
  repoName: string
): Promise<{ fixed: number; newPatterns: number; totalIssues: number }> {
  console.log(`\n  🤖 Running AI Fixer on ${repoName} (ALL issues)`);

  const testDir = `/tmp/test-ai-fixer-java-${Date.now()}`;
  const repoPath = `${testDir}/repo`;

  try {
    // Clone
    fs.mkdirSync(testDir, { recursive: true });
    execSync(`git clone --depth 1 ${repoUrl} ${repoPath}`, {
      stdio: 'pipe',
      encoding: 'utf-8',
      timeout: 180000
    });

    // Run analysis
    const orchestrator = new JavaToolOrchestrator({
      pmd: { enabled: true, rulesets: ['category/java/bestpractices.xml', 'category/java/errorprone.xml'], failOnViolation: false },
      semgrep: { enabled: true, config: 'auto' },
      dependencyCheck: { enabled: true, failOnCVSS: 0, formats: ['JSON'], caching: { enabled: true, location: '/tmp/dependency-check-cache' } },
    });

    const results = await orchestrator.orchestrate(repoPath, 'base', { userTier: 'pro' });
    const allIssues = results.toolResults?.flatMap(tr => tr.issues || []) || [];

    if (allIssues.length === 0) {
      console.log('     No issues found to fix');
      return { fixed: 0, newPatterns: 0, totalIssues: 0 };
    }

    // Map issues to the format expected by ScanFixExecutor
    const issuesToFix = allIssues.map(issue => ({
      file: issue.file,
      line: issue.line,
      column: issue.column,
      rule: issue.rule,
      tool: issue.tool,
      message: issue.message,
      severity: issue.severity,
      category: 'NEW' as const,
    }));

    console.log(`     Total: ${allIssues.length}, Processing ALL issues...`);

    // Run AI Fixer with dryRun: false to save patterns
    const fixExecutor = new ScanFixExecutor({
      workingDir: repoPath,
      language: 'java',
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

    // Cleanup
    try {
      execSync(`rm -rf ${testDir}`, { stdio: 'pipe' });
    } catch {
      // Ignore
    }

    return {
      fixed: fixResults.summary.fixedIssues,
      newPatterns: tier3Fixes,
      totalIssues: issuesToFix.length
    };

  } catch (error: any) {
    console.log(`     ❌ AI Fixer error: ${error.message.substring(0, 80)}`);

    // Cleanup on error
    try {
      execSync(`rm -rf ${testDir}`, { stdio: 'pipe' });
    } catch {
      // Ignore
    }

    return { fixed: 0, newPatterns: 0, totalIssues: 0 };
  }
}

async function main(): Promise<void> {
  const targetFramework = process.argv[2] || 'all';

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║  JAVA PATTERN COLLECTION TEST                                        ║');
  console.log('╠══════════════════════════════════════════════════════════════════════╣');
  console.log(`║  Target: ${targetFramework.toUpperCase().padEnd(60)}║`);
  console.log('║  Mode: Scan + AI Fix ALL issues                                      ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
  console.log('');

  const frameworksToTest = targetFramework === 'all'
    ? Object.keys(JAVA_REPOS)
    : [targetFramework];

  for (const framework of frameworksToTest) {
    const repos = JAVA_REPOS[framework as keyof typeof JAVA_REPOS];
    if (!repos) {
      console.log(`Unknown framework: ${framework}`);
      continue;
    }

    console.log(`\n═══ ${framework.toUpperCase()} FRAMEWORK ═══`);

    const scanResults: ScanResult[] = [];

    // Scan all repositories
    for (const repo of repos) {
      const result = await scanRepository(framework, repo.url, repo.name);
      scanResults.push(result);
    }

    // Run AI Fixer on ALL repos with issues
    const reposWithIssues = scanResults.filter(r => r.totalIssues > 0);

    let totalFixed = 0;
    let totalNewPatterns = 0;
    let totalProcessed = 0;

    if (reposWithIssues.length > 0) {
      console.log(`\n  🔧 Running AI Fixer on ${reposWithIssues.length} repos with issues...`);

      for (const scanResult of reposWithIssues) {
        const repoConfig = repos.find(r => r.name === scanResult.repo);
        if (repoConfig) {
          const aiResult = await runAIFixer(framework, repoConfig.url, repoConfig.name);
          totalFixed += aiResult.fixed;
          totalNewPatterns += aiResult.newPatterns;
          totalProcessed += aiResult.totalIssues;
        }
      }

      console.log(`\n  🎯 AI Fixer Total Results: ${totalFixed}/${totalProcessed} fixed, ${totalNewPatterns} new patterns`);
    }

    // Framework summary
    console.log(`\n═══ ${framework.toUpperCase()} SUMMARY ═══`);
    console.log(`  Total repos scanned: ${repos.length}`);
    console.log(`  Total issues found: ${scanResults.reduce((sum, r) => sum + r.totalIssues, 0)}`);
    console.log(`  Repos with issues: ${reposWithIssues.length}`);
  }

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║  TEST COMPLETE                                                        ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
}

// Run
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  });
