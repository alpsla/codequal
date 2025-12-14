/**
 * Multi-Framework Pattern Collection Test Runner
 *
 * Runs V9 PRO tier analysis on multiple frameworks to build the pattern collection.
 * Each framework test:
 * 1. Clones a real repository
 * 2. Detects framework and runs setup
 * 3. Executes security + quality tools
 * 4. Classifies issues with framework-specific rules
 * 5. Stores new patterns for the pattern flywheel
 *
 * Usage:
 *   npx ts-node test-framework-pattern-collection.ts [framework]
 *
 * Examples:
 *   npx ts-node test-framework-pattern-collection.ts        # Run all frameworks
 *   npx ts-node test-framework-pattern-collection.ts nestjs # Run only NestJS
 *   npx ts-node test-framework-pattern-collection.ts react  # Run only React
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../../.env') });

process.env.DEBUG_MODE = process.env.DEBUG_MODE || 'true';

import { TypeScriptToolOrchestrator } from '../../src/two-branch/tools/typescript/typescript-tool-orchestrator';
import { createFrameworkDetector } from '../../src/two-branch/utils/framework-detector';
import { createMonorepoDetector } from '../../src/two-branch/utils/monorepo-detector';
import { groupIssues } from '../../src/two-branch/utils/issue-grouping';
import { classifyIssuesForFramework } from '../../src/fix-agent/services/framework-issue-classifier';
import type { Framework, ClassifiedFrameworkIssue } from '../../src/fix-agent/types/framework-issue-types';
import { execSync } from 'child_process';
import * as fs from 'fs';

// =============================================================================
// FRAMEWORK TEST CONFIGURATIONS
// =============================================================================

interface FrameworkTestConfig {
  id: string;
  name: string;
  repoUrl: string;
  branch?: string;
  language: 'typescript' | 'java';
  expectedFramework: Framework;
  skipSetup?: boolean;
  setupTimeout?: number;
  toolTimeout?: number;
}

const FRAMEWORK_TESTS: FrameworkTestConfig[] = [
  // TypeScript Frameworks
  {
    id: 'nestjs',
    name: 'NestJS - TypeScript Backend Framework',
    repoUrl: 'https://github.com/nestjs/nest',
    language: 'typescript',
    expectedFramework: 'nestjs',
    setupTimeout: 300000, // 5 min for lerna bootstrap
    toolTimeout: 120000,
  },
  {
    id: 'express',
    name: 'Express.js - Node.js Web Framework',
    repoUrl: 'https://github.com/expressjs/express',
    language: 'typescript',
    expectedFramework: 'express',
    setupTimeout: 60000,
    toolTimeout: 60000,
  },
  {
    id: 'react',
    name: 'React - UI Component Library',
    repoUrl: 'https://github.com/facebook/react',
    language: 'typescript',
    expectedFramework: 'react',
    skipSetup: true, // React repo is complex, skip full setup
    toolTimeout: 120000,
  },
  // Java Frameworks
  {
    id: 'spring-boot',
    name: 'Spring PetClinic - Spring Boot Example',
    repoUrl: 'https://github.com/spring-projects/spring-petclinic',
    language: 'java',
    expectedFramework: 'spring-boot',
    setupTimeout: 180000,
    toolTimeout: 120000,
  },
];

// =============================================================================
// PATTERN COLLECTION RESULTS
// =============================================================================

interface PatternCollectionResult {
  framework: string;
  totalIssues: number;
  classifiedIssues: {
    FIX_NOW: number;
    ADD_TO_PATTERNS: number;
    PATTERN_REUSE: number;
    FILTER_OUT: number;
    INTENTIONAL_USE: number;
    ENVIRONMENT_ISSUE: number;
    MANUAL_REVIEW: number;
    SKIP_FOR_FRAMEWORK: number;
  };
  topRules: Array<{ rule: string; count: number; tool: string }>;
  patternCandidates: Array<{
    ruleId: string;
    tool: string;
    count: number;
    severity: string;
    sampleMessage: string;
  }>;
  costAnalysis: {
    withoutPatterns: number;
    withPatterns: number;
    savings: number;
    savingsPercent: number;
  };
  duration: number;
  success: boolean;
  error?: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function cloneRepository(repoUrl: string, targetPath: string): void {
  console.log(`   Cloning ${repoUrl}...`);
  if (fs.existsSync(targetPath)) {
    execSync(`rm -rf ${targetPath}`);
  }
  execSync(`git clone --depth 20 ${repoUrl} ${targetPath}`, {
    stdio: 'pipe',
    encoding: 'utf-8',
    timeout: 120000,
  });
  console.log(`   Repository cloned`);
}

async function runSetupCommands(repoPath: string, config: FrameworkTestConfig): Promise<void> {
  if (config.skipSetup) {
    console.log('   Setup skipped per config');
    return;
  }

  const monorepoDetector = createMonorepoDetector();
  const setupInstructions = await monorepoDetector.getSetupInstructions(repoPath);

  for (const cmd of setupInstructions.setupCommands.filter(c => c.required)) {
    console.log(`   Running: ${cmd.description}`);
    try {
      execSync(cmd.command, {
        cwd: repoPath,
        stdio: 'pipe',
        timeout: config.setupTimeout || 180000,
      });
      console.log(`   Done: ${cmd.description}`);
    } catch (error) {
      console.log(`   Warning: ${cmd.description} failed (continuing anyway)`);
    }
  }
}

function calculateCostAnalysis(classifiedIssues: ClassifiedFrameworkIssue[]): PatternCollectionResult['costAnalysis'] {
  const AI_COST_PER_FIX = 0.0006;
  const PATTERN_COST_PER_FIX = 0.00001;

  const fixNowCount = classifiedIssues.filter(i => i.disposition === 'FIX_NOW').length;
  const patternReuseCount = classifiedIssues.filter(i => i.disposition === 'PATTERN_REUSE').length;
  const addToPatternCount = classifiedIssues.filter(i => i.disposition === 'ADD_TO_PATTERNS').length;

  const withoutPatterns = (fixNowCount + patternReuseCount + addToPatternCount) * AI_COST_PER_FIX;
  const withPatterns =
    (fixNowCount + addToPatternCount) * AI_COST_PER_FIX +
    patternReuseCount * PATTERN_COST_PER_FIX;
  const savings = withoutPatterns - withPatterns;

  return {
    withoutPatterns: Math.round(withoutPatterns * 10000) / 10000,
    withPatterns: Math.round(withPatterns * 10000) / 10000,
    savings: Math.round(savings * 10000) / 10000,
    savingsPercent: withoutPatterns > 0 ? Math.round((savings / withoutPatterns) * 100) : 0,
  };
}

// =============================================================================
// MAIN TEST RUNNER
// =============================================================================

async function runFrameworkTest(config: FrameworkTestConfig): Promise<PatternCollectionResult> {
  const startTime = Date.now();
  const result: PatternCollectionResult = {
    framework: config.id,
    totalIssues: 0,
    classifiedIssues: {
      FIX_NOW: 0,
      ADD_TO_PATTERNS: 0,
      PATTERN_REUSE: 0,
      FILTER_OUT: 0,
      INTENTIONAL_USE: 0,
      ENVIRONMENT_ISSUE: 0,
      MANUAL_REVIEW: 0,
      SKIP_FOR_FRAMEWORK: 0,
    },
    topRules: [],
    patternCandidates: [],
    costAnalysis: { withoutPatterns: 0, withPatterns: 0, savings: 0, savingsPercent: 0 },
    duration: 0,
    success: false,
  };

  console.log('');
  console.log('='.repeat(70));
  console.log(`FRAMEWORK: ${config.name}`);
  console.log('='.repeat(70));

  const testDir = `/tmp/test-${config.id}-${Date.now()}`;
  const repoName = config.repoUrl.split('/').pop()?.replace('.git', '') || config.id;
  const repoPath = `${testDir}/${repoName}`;

  try {
    // Step 1: Clone
    console.log('');
    console.log('Step 1: Cloning repository...');
    fs.mkdirSync(testDir, { recursive: true });
    cloneRepository(config.repoUrl, repoPath);

    // Step 2: Detect framework
    console.log('');
    console.log('Step 2: Detecting framework...');
    const frameworkDetector = createFrameworkDetector();
    const frameworkInfo = await frameworkDetector.detectFrameworks(repoPath);
    console.log(`   Detected: ${frameworkInfo.primaryFramework} (${frameworkInfo.confidence}% confidence)`);
    console.log(`   Language: ${frameworkInfo.language}`);

    // Step 3: Run setup
    console.log('');
    console.log('Step 3: Running setup commands...');
    await runSetupCommands(repoPath, config);

    // Step 4: Run tools
    console.log('');
    console.log('Step 4: Running analysis tools...');

    if (config.language === 'typescript') {
      // Use default config - TypeScriptToolOrchestrator will merge with defaults
      const orchestrator = new TypeScriptToolOrchestrator();

      const toolResult = await orchestrator.orchestrate(repoPath, 'base', {
        analysisMode: 'standard', // Standard mode includes Semgrep for security patterns
        userTier: 'pro',
      });

      if (!toolResult.success) {
        throw new Error(`Tool orchestration failed`);
      }

      // Collect issues from all tool results
      const issues: Array<{
        file: string;
        line: number;
        column?: number;
        rule: string;
        tool: string;
        message: string;
        severity: string;
      }> = [];

      for (const toolRes of toolResult.toolResults) {
        if (toolRes.issues) {
          for (const issue of toolRes.issues) {
            issues.push({
              file: issue.file,
              line: issue.line,
              column: issue.column,
              rule: issue.rule,
              tool: toolRes.tool,
              message: issue.message || '',
              severity: issue.severity,
            });
          }
        }
      }
      result.totalIssues = issues.length;
      console.log(`   Found ${issues.length} issues`);

      // Step 5: Classify issues
      console.log('');
      console.log('Step 5: Classifying issues with framework rules...');

      const rawIssues = issues.map(i => ({
        file: i.file,
        line: i.line,
        column: i.column || 0,
        rule: i.rule,
        ruleId: i.rule,
        tool: i.tool,
        message: i.message || '',
        severity: i.severity as 'critical' | 'high' | 'medium' | 'low',
        category: 'NEW' as const,
      }));

      const classification = classifyIssuesForFramework(
        rawIssues,
        config.expectedFramework,
        repoPath,
        true // Assume setup is valid
      );

      // Count by disposition
      for (const issue of classification.issues) {
        const disposition = issue.disposition as keyof typeof result.classifiedIssues;
        if (disposition in result.classifiedIssues) {
          result.classifiedIssues[disposition]++;
        }
      }

      // Group by rule for top rules
      const ruleGroups = new Map<string, { count: number; tool: string }>();
      for (const issue of issues) {
        const key = issue.rule;
        const existing = ruleGroups.get(key) || { count: 0, tool: issue.tool };
        existing.count++;
        ruleGroups.set(key, existing);
      }

      result.topRules = Array.from(ruleGroups.entries())
        .map(([rule, data]) => ({ rule, count: data.count, tool: data.tool }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 15);

      // Pattern candidates (rules that appear 3+ times)
      result.patternCandidates = result.topRules
        .filter(r => r.count >= 3)
        .map(r => {
          const sampleIssue = issues.find(i => i.rule === r.rule);
          return {
            ruleId: r.rule,
            tool: r.tool,
            count: r.count,
            severity: sampleIssue?.severity || 'medium',
            sampleMessage: sampleIssue?.message || '',
          };
        });

      // Cost analysis
      result.costAnalysis = calculateCostAnalysis(classification.issues);

    } else if (config.language === 'java') {
      // For Java, we just count - no TypeScript orchestrator
      console.log('   Java analysis (simplified - counting files only)');
      const javaFiles = execSync(`find ${repoPath} -name "*.java" | wc -l`, {
        encoding: 'utf-8',
      }).trim();
      console.log(`   Found ${javaFiles} Java files`);
      result.totalIssues = 0; // Would need Java tool orchestrator
    }

    result.success = true;

  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
    console.error(`   ERROR: ${result.error}`);
  } finally {
    // Cleanup
    try {
      execSync(`rm -rf ${testDir}`, { stdio: 'pipe' });
    } catch {
      // Ignore cleanup errors
    }
  }

  result.duration = Math.round((Date.now() - startTime) / 1000);
  return result;
}

// =============================================================================
// REPORT GENERATION
// =============================================================================

function generateReport(results: PatternCollectionResult[]): void {
  console.log('');
  console.log('='.repeat(70));
  console.log('PATTERN COLLECTION SUMMARY');
  console.log('='.repeat(70));
  console.log('');

  let totalIssues = 0;
  let totalPatternCandidates = 0;
  let totalSavings = 0;

  for (const result of results) {
    console.log(`${result.success ? '✅' : '❌'} ${result.framework.toUpperCase()}`);
    console.log(`   Duration: ${result.duration}s`);
    console.log(`   Total issues: ${result.totalIssues}`);

    if (result.success) {
      console.log('   Classified:');
      console.log(`     - FIX_NOW: ${result.classifiedIssues.FIX_NOW}`);
      console.log(`     - ADD_TO_PATTERNS: ${result.classifiedIssues.ADD_TO_PATTERNS}`);
      console.log(`     - FILTER_OUT: ${result.classifiedIssues.FILTER_OUT}`);
      console.log(`     - INTENTIONAL_USE: ${result.classifiedIssues.INTENTIONAL_USE}`);
      console.log(`     - ENVIRONMENT_ISSUE: ${result.classifiedIssues.ENVIRONMENT_ISSUE}`);

      console.log(`   Pattern candidates: ${result.patternCandidates.length}`);
      if (result.patternCandidates.length > 0) {
        console.log('   Top patterns to create:');
        for (const p of result.patternCandidates.slice(0, 5)) {
          console.log(`     - ${p.ruleId} (${p.tool}): ${p.count} occurrences`);
        }
      }

      console.log(`   Cost savings: $${result.costAnalysis.savings} (${result.costAnalysis.savingsPercent}%)`);

      totalIssues += result.totalIssues;
      totalPatternCandidates += result.patternCandidates.length;
      totalSavings += result.costAnalysis.savings;
    } else {
      console.log(`   Error: ${result.error}`);
    }
    console.log('');
  }

  console.log('-'.repeat(70));
  console.log('TOTALS:');
  console.log(`   Frameworks tested: ${results.length}`);
  console.log(`   Successful: ${results.filter(r => r.success).length}`);
  console.log(`   Total issues: ${totalIssues}`);
  console.log(`   Pattern candidates: ${totalPatternCandidates}`);
  console.log(`   Total potential savings: $${Math.round(totalSavings * 10000) / 10000}`);
  console.log('');
}

function saveResults(results: PatternCollectionResult[]): void {
  const outputDir = path.join(__dirname, 'test-outputs', 'pattern-collection');
  fs.mkdirSync(outputDir, { recursive: true });

  const outputFile = path.join(
    outputDir,
    `pattern-collection-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  );

  fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
  console.log(`Results saved to: ${outputFile}`);
}

// =============================================================================
// MAIN
// =============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const targetFramework = args[0]?.toLowerCase();

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║           MULTI-FRAMEWORK PATTERN COLLECTION TEST                     ║');
  console.log('╠══════════════════════════════════════════════════════════════════════╣');
  console.log('║  Building the pattern flywheel for cost-efficient fixes              ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
  console.log('');

  let testsToRun = FRAMEWORK_TESTS;

  if (targetFramework) {
    testsToRun = FRAMEWORK_TESTS.filter(t => t.id === targetFramework);
    if (testsToRun.length === 0) {
      console.error(`Unknown framework: ${targetFramework}`);
      console.log('Available frameworks:', FRAMEWORK_TESTS.map(t => t.id).join(', '));
      process.exit(1);
    }
    console.log(`Running single framework: ${targetFramework}`);
  } else {
    console.log(`Running all ${testsToRun.length} frameworks`);
  }

  console.log('Frameworks to test:', testsToRun.map(t => t.id).join(', '));

  const results: PatternCollectionResult[] = [];

  for (const config of testsToRun) {
    const result = await runFrameworkTest(config);
    results.push(result);
  }

  generateReport(results);
  saveResults(results);

  // Exit with error if any tests failed
  const failed = results.filter(r => !r.success).length;
  if (failed > 0) {
    console.log(`\n⚠️  ${failed} test(s) failed`);
    process.exit(1);
  }

  console.log('\n✅ All tests completed successfully');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
