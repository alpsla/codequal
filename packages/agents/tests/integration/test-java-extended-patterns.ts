/**
 * Java Extended Pattern Collection Test
 *
 * ENHANCED VERSION with ALL tools enabled:
 * - PMD: All 7 categories (bestpractices, errorprone, security, design, multithreading, performance, codestyle)
 * - Semgrep: Java security rules
 * - SpotBugs: Bytecode analysis (requires compilation)
 * - Dependency-Check: CVE scanning
 *
 * More repositories for comprehensive pattern coverage:
 * - Spring Boot ecosystem
 * - Quarkus
 * - Micronaut
 * - Apache Commons
 * - Google Guava examples
 */

import dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config({ path: path.join(__dirname, '../../../../.env') });

import { JavaToolOrchestrator } from '../../src/two-branch/tools/java/java-tool-orchestrator';
import { ScanFixExecutor } from '../../src/fix-agent/scan-fix-executor';
import { execSync } from 'child_process';
import * as fs from 'fs';

// Extended Java repositories for more pattern coverage
// canCompile: Only set to true for repos with simple Maven/Gradle build that work without extra setup
// SpotBugs requires compiled .class files - only enable for known-working builds
const JAVA_REPOS = {
  spring: [
    { url: 'https://github.com/spring-projects/spring-petclinic', name: 'spring-petclinic', canCompile: true }, // Maven, compiles reliably
    { url: 'https://github.com/spring-guides/gs-rest-service', name: 'gs-rest-service', canCompile: false }, // Nested structure
    { url: 'https://github.com/spring-guides/gs-accessing-data-jpa', name: 'gs-accessing-data-jpa', canCompile: false }, // Nested structure
  ],
  quarkus: [
    { url: 'https://github.com/quarkusio/quarkus-quickstarts', name: 'quarkus-quickstarts', canCompile: false },
  ],
  micronaut: [
    { url: 'https://github.com/micronaut-projects/micronaut-examples', name: 'micronaut-examples', canCompile: false },
  ],
  // Well-known Java projects with security/quality issues for pattern learning
  security: [
    { url: 'https://github.com/WebGoat/WebGoat', name: 'webgoat', canCompile: false }, // Complex multi-module
    { url: 'https://github.com/OWASP/benchmark', name: 'owasp-benchmark', canCompile: false }, // Requires setup
  ],
};

// ALL PMD rulesets for comprehensive coverage
const PMD_ALL_RULESETS = [
  'category/java/bestpractices.xml',
  'category/java/errorprone.xml',
  'category/java/security.xml',
  'category/java/design.xml',
  'category/java/multithreading.xml',
  'category/java/performance.xml',
  'category/java/codestyle.xml',
];

// Focused security rulesets (faster)
const PMD_SECURITY_RULESETS = [
  'category/java/bestpractices.xml',
  'category/java/errorprone.xml',
  'category/java/security.xml',
];

interface ScanResult {
  framework: string;
  repo: string;
  totalIssues: number;
  issuesByTool: Record<string, number>;
  duration: number;
  error?: string;
}

interface FixResult {
  fixed: number;
  newPatterns: number;
  totalIssues: number;
  reusedPatterns: number;
}

/**
 * Create orchestrator with all tools enabled
 */
function createFullOrchestrator(enableSpotBugs: boolean = false) {
  return new JavaToolOrchestrator({
    pmd: {
      enabled: true,
      rulesets: PMD_ALL_RULESETS,
      failOnViolation: false
    },
    semgrep: {
      enabled: true,
      config: 'p/java'  // Java-specific Semgrep rules
    },
    checkstyle: {
      enabled: true,
      configFile: '/sun_checks.xml'  // Standard Sun coding conventions
    },
    spotbugs: {
      enabled: enableSpotBugs,
      effort: 'default',
      reportLevel: 'medium'
    },
    dependencyCheck: {
      enabled: true,
      failOnCVSS: 0,
      formats: ['JSON'],
      caching: {
        enabled: true,
        location: '/tmp/dependency-check-cache'
      }
    },
  });
}

async function scanRepository(
  framework: string,
  repoUrl: string,
  repoName: string,
  canCompile: boolean
): Promise<ScanResult> {
  const startTime = Date.now();
  const testDir = `/tmp/test-java-ext-${framework}-${repoName}-${Date.now()}`;
  const repoPath = `${testDir}/repo`;

  console.log(`\n  📦 Scanning: ${repoName}`);
  console.log(`     URL: ${repoUrl}`);
  console.log(`     Tools: PMD (all 7 categories), Semgrep, Checkstyle, Dependency-Check${canCompile ? ', SpotBugs' : ''}`);

  try {
    // Clone repository
    fs.mkdirSync(testDir, { recursive: true });
    execSync(`git clone --depth 1 ${repoUrl} ${repoPath}`, {
      stdio: 'pipe',
      encoding: 'utf-8',
      timeout: 300000 // 5 min timeout for clone
    });

    // Initialize Java orchestrator with SpotBugs only if repo can compile
    const orchestrator = createFullOrchestrator(canCompile);

    // Run analysis with 'complete' mode to get all tools
    console.log(`     🔍 Running analysis (complete mode)...`);
    const results = await orchestrator.orchestrate(repoPath, 'base', {
      userTier: 'pro',
      analysisMode: 'complete' as any  // Complete mode enables all tools
    });

    const allIssues = results.toolResults?.flatMap(tr => tr.issues || []) || [];

    // Count issues by tool
    const issuesByTool: Record<string, number> = {};
    for (const issue of allIssues) {
      issuesByTool[issue.tool] = (issuesByTool[issue.tool] || 0) + 1;
    }

    const duration = (Date.now() - startTime) / 1000;

    console.log(`     Issues: ${allIssues.length} total`);
    Object.entries(issuesByTool).forEach(([tool, count]) => {
      console.log(`       - ${tool}: ${count}`);
    });
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
      issuesByTool,
      duration,
    };

  } catch (error: any) {
    console.log(`     ❌ Error: ${error.message.substring(0, 100)}`);

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
      issuesByTool: {},
      duration: (Date.now() - startTime) / 1000,
      error: error.message.substring(0, 100),
    };
  }
}

async function runAIFixer(
  framework: string,
  repoUrl: string,
  repoName: string,
  canCompile: boolean
): Promise<FixResult> {
  console.log(`\n  🤖 Running AI Fixer on ${repoName} (ALL issues)`);

  const testDir = `/tmp/test-ai-fixer-java-ext-${Date.now()}`;
  const repoPath = `${testDir}/repo`;

  try {
    // Clone
    fs.mkdirSync(testDir, { recursive: true });
    execSync(`git clone --depth 1 ${repoUrl} ${repoPath}`, {
      stdio: 'pipe',
      encoding: 'utf-8',
      timeout: 300000
    });

    // Run analysis with all tools
    const orchestrator = createFullOrchestrator(canCompile);
    const results = await orchestrator.orchestrate(repoPath, 'base', {
      userTier: 'pro',
      analysisMode: 'complete' as any
    });
    const allIssues = results.toolResults?.flatMap(tr => tr.issues || []) || [];

    if (allIssues.length === 0) {
      console.log('     No issues found to fix');
      return { fixed: 0, newPatterns: 0, totalIssues: 0, reusedPatterns: 0 };
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
    // Tier 1 = tool autofixes, Tier 2 = pattern database reuses
    const tier1Fixes = fixResults.summary.tier1Fixed || 0;
    const tier2Fixes = fixResults.summary.tier2Fixed || 0;
    const tier3Fixes = fixResults.summary.tier3Fixed || 0;
    const patternReuses = tier1Fixes + tier2Fixes; // Reuses from tools + pattern DB

    console.log(`     ✅ Fixed: ${fixResults.summary.fixedIssues}/${issuesToFix.length}`);
    console.log(`     🤖 AI (Tier 3) fixes: ${tier3Fixes}`);
    console.log(`     ♻️  Pattern reuses (T1+T2): ${patternReuses}`);

    // Cleanup
    try {
      execSync(`rm -rf ${testDir}`, { stdio: 'pipe' });
    } catch {
      // Ignore
    }

    return {
      fixed: fixResults.summary.fixedIssues,
      newPatterns: tier3Fixes,
      totalIssues: issuesToFix.length,
      reusedPatterns: patternReuses
    };

  } catch (error: any) {
    console.log(`     ❌ AI Fixer error: ${error.message.substring(0, 100)}`);

    // Cleanup on error
    try {
      execSync(`rm -rf ${testDir}`, { stdio: 'pipe' });
    } catch {
      // Ignore
    }

    return { fixed: 0, newPatterns: 0, totalIssues: 0, reusedPatterns: 0 };
  }
}

async function main(): Promise<void> {
  const targetFramework = process.argv[2] || 'all';
  const skipSpotBugs = process.argv.includes('--no-spotbugs');

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║  JAVA EXTENDED PATTERN COLLECTION TEST                               ║');
  console.log('╠══════════════════════════════════════════════════════════════════════╣');
  console.log(`║  Target: ${targetFramework.toUpperCase().padEnd(60)}║`);
  console.log('║  Mode: COMPLETE (All Tools)                                          ║');
  console.log('╠══════════════════════════════════════════════════════════════════════╣');
  console.log('║  Tools Enabled:                                                      ║');
  console.log('║    - PMD: bestpractices, errorprone, security, design,               ║');
  console.log('║           multithreading, performance, codestyle                     ║');
  console.log('║    - Semgrep: p/java (Java security rules)                           ║');
  console.log('║    - Checkstyle: sun_checks.xml (coding conventions)                 ║');
  console.log('║    - Dependency-Check: CVE scanning                                  ║');
  console.log(`║    - SpotBugs: ${skipSpotBugs ? 'DISABLED' : 'Enabled for compilable repos'.padEnd(53)}║`);
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
  console.log('');

  const frameworksToTest = targetFramework === 'all'
    ? Object.keys(JAVA_REPOS)
    : [targetFramework];

  let grandTotalIssues = 0;
  let grandTotalFixed = 0;
  let grandTotalPatterns = 0;
  let grandTotalReuses = 0;

  for (const framework of frameworksToTest) {
    const repos = JAVA_REPOS[framework as keyof typeof JAVA_REPOS];
    if (!repos) {
      console.log(`Unknown framework: ${framework}`);
      continue;
    }

    console.log(`\n${'═'.repeat(70)}`);
    console.log(`  ${framework.toUpperCase()} FRAMEWORK`);
    console.log(`${'═'.repeat(70)}`);

    const scanResults: ScanResult[] = [];

    // Scan all repositories
    for (const repo of repos) {
      const canCompile = !skipSpotBugs && repo.canCompile;
      const result = await scanRepository(framework, repo.url, repo.name, canCompile);
      scanResults.push(result);
    }

    // Run AI Fixer on ALL repos with issues
    const reposWithIssues = scanResults.filter(r => r.totalIssues > 0);

    let frameworkFixed = 0;
    let frameworkNewPatterns = 0;
    let frameworkProcessed = 0;
    let frameworkReuses = 0;

    if (reposWithIssues.length > 0) {
      console.log(`\n  🔧 Running AI Fixer on ${reposWithIssues.length} repos with issues...`);

      for (const scanResult of reposWithIssues) {
        const repoConfig = repos.find(r => r.name === scanResult.repo);
        if (repoConfig) {
          const canCompile = !skipSpotBugs && repoConfig.canCompile;
          const aiResult = await runAIFixer(framework, repoConfig.url, repoConfig.name, canCompile);
          frameworkFixed += aiResult.fixed;
          frameworkNewPatterns += aiResult.newPatterns;
          frameworkProcessed += aiResult.totalIssues;
          frameworkReuses += aiResult.reusedPatterns;
        }
      }

      console.log(`\n  🎯 ${framework.toUpperCase()} AI Fixer Results:`);
      console.log(`     Fixed: ${frameworkFixed}/${frameworkProcessed}`);
      console.log(`     New patterns: ${frameworkNewPatterns}`);
      console.log(`     Pattern reuses: ${frameworkReuses}`);
    }

    // Framework summary
    const totalIssues = scanResults.reduce((sum, r) => sum + r.totalIssues, 0);
    console.log(`\n  📊 ${framework.toUpperCase()} SUMMARY:`);
    console.log(`     Repos scanned: ${repos.length}`);
    console.log(`     Total issues: ${totalIssues}`);
    console.log(`     Fixed: ${frameworkFixed}`);

    grandTotalIssues += totalIssues;
    grandTotalFixed += frameworkFixed;
    grandTotalPatterns += frameworkNewPatterns;
    grandTotalReuses += frameworkReuses;
  }

  // Grand summary
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║  GRAND TOTAL                                                         ║');
  console.log('╠══════════════════════════════════════════════════════════════════════╣');
  console.log(`║  Total issues found:    ${grandTotalIssues.toString().padEnd(45)}║`);
  console.log(`║  Total fixed:           ${grandTotalFixed.toString().padEnd(45)}║`);
  console.log(`║  New patterns created:  ${grandTotalPatterns.toString().padEnd(45)}║`);
  console.log(`║  Pattern reuses:        ${grandTotalReuses.toString().padEnd(45)}║`);
  console.log('╠══════════════════════════════════════════════════════════════════════╣');
  console.log('║  TEST COMPLETE                                                       ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
}

// Run
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  });
