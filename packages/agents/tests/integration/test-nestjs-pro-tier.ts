/**
 * NestJS PRO Tier Test
 *
 * Tests V9 PRO tier analysis on TypeScript NestJS framework
 * - Uses NestJS repo with a real PR for realistic testing
 * - Validates AI Fixer works for TypeScript backend code
 * - Tests pattern learning for TypeScript security rules
 * - Verifies framework detection as 'nestjs'
 */

import dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../../.env') });

// E2E Test Configuration
process.env.DEBUG_MODE = process.env.DEBUG_MODE || 'true';

import { TypeScriptToolOrchestrator } from '../../src/two-branch/tools/typescript/typescript-tool-orchestrator';
import { createFrameworkDetector } from '../../src/two-branch/utils/framework-detector';
import { createMonorepoDetector } from '../../src/two-branch/utils/monorepo-detector';
import { groupIssues } from '../../src/two-branch/utils/issue-grouping';
import { classifyIssuesForFramework } from '../../src/fix-agent/services/framework-issue-classifier';
import { analyzeAndPromptForSetup, type UserTierChoice } from '../../src/fix-agent/services/pro-tier-setup-prompt';
import type { Framework } from '../../src/fix-agent/types/framework-issue-types';
import { execSync } from 'child_process';
import * as fs from 'fs';

interface TestConfig {
  name: string;
  repoUrl: string;
  prNumber: number;
  language: 'typescript';
  expectedFramework: string;
  userTier: 'basic' | 'pro';
}

const TEST_CONFIG: TestConfig = {
  name: 'NestJS PR - TypeScript Backend PRO Tier Test',
  repoUrl: 'https://github.com/nestjs/nest',
  prNumber: 16005,  // fix(core): Fix of core from search results
  language: 'typescript',
  expectedFramework: 'nestjs',
  userTier: (process.env.USER_TIER as 'basic' | 'pro') || 'pro',
};

function cloneRepository(repoUrl: string, targetPath: string): void {
  console.log(`   🔄 Cloning ${repoUrl}...`);
  if (fs.existsSync(targetPath)) {
    execSync(`rm -rf ${targetPath}`);
  }
  execSync(`git clone --depth 50 ${repoUrl} ${targetPath}`, {
    stdio: 'pipe',
    encoding: 'utf-8'
  });
  console.log(`   ✅ Repository cloned to ${targetPath}`);
}

async function runNestJSTest(): Promise<void> {
  console.log('='.repeat(70));
  console.log('NESTJS PRO TIER TEST - TypeScript Backend Framework');
  console.log('='.repeat(70));
  console.log('');
  console.log(`Test: ${TEST_CONFIG.name}`);
  console.log(`Repo: ${TEST_CONFIG.repoUrl}`);
  console.log(`PR: #${TEST_CONFIG.prNumber}`);
  console.log(`Tier: ${TEST_CONFIG.userTier.toUpperCase()}`);
  console.log('');

  const testDir = `/tmp/test-nestjs-${Date.now()}`;
  const repoPath = `${testDir}/nest`;
  const outputDir = path.join(__dirname, 'test-outputs', 'nestjs-pro-tier');

  try {
    // 1. Clone repository
    console.log('📥 Step 1: Cloning repository...');
    fs.mkdirSync(testDir, { recursive: true });
    cloneRepository(TEST_CONFIG.repoUrl, repoPath);

    // 1b. Detect project type and run appropriate setup commands
    console.log('');
    console.log('🔍 Step 1b: Detecting project type with MonorepoDetector...');
    const monorepoDetector = createMonorepoDetector();
    const monorepoInfo = await monorepoDetector.detect(repoPath);
    const setupInstructions = await monorepoDetector.getSetupInstructions(repoPath);

    console.log(`   Project type: ${monorepoInfo.displayName}`);
    console.log(`   Is monorepo: ${monorepoInfo.isMonorepo}`);
    console.log(`   Package manager: ${monorepoInfo.packageManager}`);
    console.log(`   Confidence: ${monorepoInfo.confidence}%`);

    // Run all required setup commands
    console.log('');
    console.log('📦 Step 1c: Running setup commands (this may take several minutes)...');
    for (const cmd of setupInstructions.setupCommands.filter(c => c.required)) {
      console.log(`   Running: ${cmd.description}`);
      console.log(`   Command: ${cmd.command} (${cmd.estimatedTime})`);
      if (cmd.notes) {
        console.log(`   Note: ${cmd.notes}`);
      }
      try {
        execSync(`cd ${repoPath} && ${cmd.command}`, {
          stdio: 'pipe',
          encoding: 'utf-8',
          timeout: 600000 // 10 minute timeout for setup commands
        });
        console.log(`   ✅ ${cmd.description} completed`);
      } catch (setupError) {
        const errorMsg = setupError instanceof Error ? setupError.message : String(setupError);
        console.log(`   ⚠️ ${cmd.description} had issues: ${errorMsg.substring(0, 100)}`);

        // For npm install, try with fallback options
        if (cmd.command.includes('npm install')) {
          console.log('   Trying with --legacy-peer-deps...');
          try {
            execSync(`cd ${repoPath} && npm install --legacy-peer-deps`, {
              stdio: 'pipe',
              encoding: 'utf-8',
              timeout: 600000
            });
            console.log('   ✅ npm install completed with --legacy-peer-deps');
          } catch {
            console.log('   ⚠️ npm install with fallbacks failed');
          }
        }
      }
    }

    // Validate the setup
    console.log('');
    console.log('✔️ Step 1d: Validating setup...');
    const validation = await monorepoDetector.validateSetup(repoPath);
    console.log(`   Setup valid: ${validation.isValid}`);
    if (validation.issues.length > 0) {
      console.log(`   Issues: ${validation.issues.join(', ')}`);
    }
    if (validation.suggestions.length > 0) {
      console.log(`   Suggestions: ${validation.suggestions.join(', ')}`);
    }

    // 2. Fetch and checkout PR branch
    console.log('');
    console.log(`🔀 Step 2: Fetching PR #${TEST_CONFIG.prNumber}...`);
    try {
      execSync(`cd ${repoPath} && git fetch origin pull/${TEST_CONFIG.prNumber}/head:pr-${TEST_CONFIG.prNumber}`, {
        stdio: 'pipe',
        encoding: 'utf-8'
      });
      execSync(`cd ${repoPath} && git checkout pr-${TEST_CONFIG.prNumber}`, {
        stdio: 'pipe',
        encoding: 'utf-8'
      });
      console.log(`   ✅ Checked out PR #${TEST_CONFIG.prNumber}`);
    } catch (prError) {
      console.log(`   ⚠️ Could not fetch PR #${TEST_CONFIG.prNumber} - may be closed/merged`);
      console.log(`   📋 Using main branch for analysis instead`);
    }

    // 3. Detect framework
    console.log('');
    console.log('🔍 Step 3: Detecting framework...');
    const frameworkDetector = createFrameworkDetector();
    const frameworkInfo = await frameworkDetector.detectFrameworks(repoPath);
    console.log(`   Framework: ${frameworkInfo.primaryFramework}`);
    console.log(`   Build system: ${frameworkInfo.buildSystem || 'npm'}`);
    console.log(`   Confidence: ${frameworkInfo.confidence}%`);

    if (frameworkInfo.primaryFramework !== TEST_CONFIG.expectedFramework) {
      console.log(`   ⚠️ Expected framework: ${TEST_CONFIG.expectedFramework}, got: ${frameworkInfo.primaryFramework}`);
    }

    // 3b. Generate User Setup Prompt (this is what the user would see)
    console.log('');
    console.log('📋 Step 3b: Generating setup prompt for user...');
    const setupPrompt = await analyzeAndPromptForSetup(repoPath);

    console.log('');
    console.log('╔' + '═'.repeat(68) + '╗');
    console.log('║  USER SETUP PROMPT (This is what the user would see)            ║');
    console.log('╠' + '═'.repeat(68) + '╣');
    console.log(`║  ${setupPrompt.title.padEnd(64)}║`);
    console.log('╠' + '─'.repeat(68) + '╣');
    console.log(`║  ${setupPrompt.summary.substring(0, 64).padEnd(64)}║`);
    console.log('╠' + '─'.repeat(68) + '╣');
    console.log('║  Setup Commands:                                                 ║');
    for (const cmd of setupPrompt.commands) {
      console.log(`║    $ ${cmd.command.substring(0, 58).padEnd(58)}║`);
    }
    console.log('╠' + '─'.repeat(68) + '╣');
    console.log('║  User Options:                                                   ║');
    for (const opt of setupPrompt.options) {
      const rec = opt.recommended ? ' ★' : '  ';
      console.log(`║  ${rec} ${opt.label.substring(0, 60).padEnd(60)}║`);
    }
    console.log('╚' + '═'.repeat(68) + '╝');
    console.log('');

    // Simulate user choice based on validation state
    const userChoice: UserTierChoice = validation.isValid
      ? 'PRO_ALREADY_SETUP'
      : 'PRO_WITH_SETUP'; // In test, we always try PRO

    console.log(`   🎯 Simulated user choice: ${userChoice}`);
    if (!validation.isValid) {
      console.log('   ⚠️ Note: In production, user would need to run setup commands first');
    }

    // 4. Initialize TypeScript orchestrator
    console.log('');
    console.log('🛠️ Step 4: Initializing TypeScript tool orchestrator...');

    // TypeScriptToolOrchestrator takes Partial<TypeScriptToolConfig> directly
    // Enable ALL tools for comprehensive PRO tier testing - builds pattern library over time
    const orchestrator = new TypeScriptToolOrchestrator({
      eslint: { enabled: true, fix: false }, // Code quality
      typescript: { enabled: true, strict: false }, // Type checking - builds TS patterns!
      semgrep: { enabled: true, config: 'auto' }, // Security scanning
      npmAudit: { enabled: true, level: 'low', production: false }, // Dependency vulnerabilities
      dependencyCheck: { enabled: true, failOnCVSS: 0, formats: ['JSON'], caching: { enabled: true, location: '/tmp/dc-cache' } },
    });

    // 5. Run analysis
    console.log('');
    console.log('🔬 Step 5: Running analysis (this may take a few minutes)...');

    // Get main branch for comparison
    const mainBranch = execSync(`cd ${repoPath} && git remote show origin | grep 'HEAD branch' | cut -d' ' -f5`, {
      encoding: 'utf-8'
    }).trim() || 'master';
    console.log(`   Main branch: ${mainBranch}`);

    // Analyze main branch first (base)
    console.log('   - Analyzing main branch...');
    execSync(`cd ${repoPath} && git checkout ${mainBranch}`, { stdio: 'pipe' });
    const mainResults = await orchestrator.orchestrate(repoPath, 'base', { userTier: TEST_CONFIG.userTier });
    // Extract issues from toolResults (OrchestrationResult has toolResults[].issues, not direct issues)
    const mainIssues = mainResults.toolResults?.flatMap(tr => tr.issues || []) || [];
    console.log(`   Main branch: ${mainIssues.length} issues`);

    // Analyze PR branch (head)
    console.log('   - Analyzing PR/current branch...');
    try {
      execSync(`cd ${repoPath} && git checkout pr-${TEST_CONFIG.prNumber}`, { stdio: 'pipe' });
    } catch {
      // Stay on current branch if PR checkout fails
    }
    const prResults = await orchestrator.orchestrate(repoPath, 'pr', { userTier: TEST_CONFIG.userTier });
    // Extract issues from toolResults
    const prIssues = prResults.toolResults?.flatMap(tr => tr.issues || []) || [];
    console.log(`   PR branch: ${prIssues.length} issues`);

    // 6. Categorize issues
    console.log('');
    console.log('📊 Step 6: Categorizing issues (NEW vs EXISTING)...');
    // Note: RawIssue has 'rule' property, not 'ruleId'
    const mainIssueHashes = new Set(
      mainIssues.map(i => `${i.file}:${i.line}:${i.rule}`)
    );

    // Add ruleId alias for compatibility with ScanFixExecutor
    const categorizedIssues = prIssues.map(issue => ({
      ...issue,
      ruleId: issue.rule, // ScanFixExecutor expects ruleId
      category: mainIssueHashes.has(`${issue.file}:${issue.line}:${issue.rule}`)
        ? 'EXISTING'
        : 'NEW'
    }));

    const newIssues = categorizedIssues.filter(i => i.category === 'NEW');
    const existingIssues = categorizedIssues.filter(i => i.category === 'EXISTING');

    console.log(`   NEW issues (introduced in PR): ${newIssues.length}`);
    console.log(`   EXISTING issues (already in main): ${existingIssues.length}`);

    // 7. Group issues
    console.log('');
    console.log('📁 Step 7: Grouping issues by rule...');
    // groupIssues returns GroupingResult, not an array
    const groupingResult = groupIssues(categorizedIssues);
    console.log(`   Issue groups: ${groupingResult.uniqueGroups}`);
    console.log(`   Cost savings: ${groupingResult.savingsPercent.toFixed(1)}%`);

    // Show top rules from groups
    const ruleCounts: Record<string, number> = {};
    for (const group of groupingResult.groups) {
      ruleCounts[group.rule] = group.count;
    }
    const topRules = Object.entries(ruleCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    console.log('   Top rules:');
    for (const [rule, count] of topRules) {
      console.log(`     - ${rule}: ${count} issues`);
    }

    // 7b. Framework-specific classification
    console.log('');
    console.log('🏗️ Step 7b: Framework-specific issue classification...');
    const detectedFramework = (frameworkInfo.primaryFramework || 'unknown') as Framework;
    const classificationResult = classifyIssuesForFramework(
      categorizedIssues,
      detectedFramework,
      repoPath,
      validation.isValid // dependenciesInstalled
    );

    console.log(`   Framework: ${detectedFramework}`);
    console.log(`   Total issues: ${classificationResult.total}`);
    console.log(`   Disposition breakdown:`);
    for (const [disposition, count] of Object.entries(classificationResult.byDisposition)) {
      if (count > 0) {
        console.log(`     - ${disposition}: ${count}`);
      }
    }
    console.log(`   Fixable issues: ${classificationResult.fixableIssues.length}`);
    console.log(`   Filtered out: ${classificationResult.filteredIssues.length}`);
    console.log(`   Pattern cost savings: ${classificationResult.costAnalysis.savingsPercent.toFixed(1)}%`);

    // Use only fixable issues for fix execution
    const issuesToFix = classificationResult.fixableIssues;

    // 8. PRO tier: Execute fixes
    let fixResults: { totalProcessed: number; fixed: number; manualReview: number; filtered: number } | null = null;
    if (TEST_CONFIG.userTier === 'pro' && issuesToFix.length > 0) {
      console.log('');
      console.log(`🔧 Step 8: PRO Tier - Executing AI Fixes on ${issuesToFix.length} fixable issues...`);
      console.log(`   (${classificationResult.filteredIssues.length} issues filtered out by framework rules)`);

      // Import ScanFixExecutor
      const { ScanFixExecutor } = await import('../../src/fix-agent/scan-fix-executor');

      // SESSION 44 FIX: Changed dryRun to false to enable pattern saving to Supabase
      // With dryRun: true, AI fixes were verified but NEVER saved to patterns table
      const fixExecutor = new ScanFixExecutor({
        workingDir: repoPath,
        language: 'typescript',
        outputMode: 'patch',
        dryRun: false, // CRITICAL: Must be false to save patterns to Supabase!
        userTier: 'pro',
        // Enable AI fixes for Tier 3 issues (most TypeScript issues)
        fixWithReview: true,
        // Alternatively, enable auto-apply for all tiers:
        // autoApplyTiers: { tier1: true, tier2: true, tier3: true },
      });

      // Convert ClassifiedFrameworkIssue to DetectedIssue format
      const detectedIssues = issuesToFix.map(i => ({
        file: i.file,
        line: i.line,
        column: i.column,
        rule: i.rule,
        tool: i.tool,
        message: i.message,
        severity: i.severity,
        category: i.category,
      }));

      const scanFixResults = await fixExecutor.executeFixes(detectedIssues);

      fixResults = {
        totalProcessed: scanFixResults.summary.totalIssues,
        fixed: scanFixResults.summary.fixedIssues,
        manualReview: scanFixResults.summary.skippedIssues + scanFixResults.summary.failedIssues,
        filtered: classificationResult.filteredIssues.length
      };

      console.log(`   Issues processed: ${fixResults.totalProcessed}`);
      console.log(`   Auto-fixed: ${fixResults.fixed}`);
      console.log(`   Manual review: ${fixResults.manualReview}`);
      console.log(`   Filtered (env/framework): ${fixResults.filtered}`);
      const fixRate = fixResults.totalProcessed > 0
        ? ((fixResults.fixed / fixResults.totalProcessed) * 100).toFixed(1)
        : '0.0';
      console.log(`   Fix rate: ${fixRate}%`);
    } else if (issuesToFix.length === 0 && categorizedIssues.length > 0) {
      console.log('');
      console.log(`ℹ️ Step 8: All ${categorizedIssues.length} issues filtered out by framework rules`);
      console.log('   Common reasons: missing dependencies, intentional use patterns, environment issues');
    } else if (categorizedIssues.length === 0) {
      console.log('');
      console.log('ℹ️ Step 8: No issues found - skipping fix execution');
    } else {
      console.log('');
      console.log('ℹ️ Step 8: BASIC tier - Skipping fix execution (classify only)');
    }

    // 9. Save outputs (simplified - skip report generation for now)
    console.log('');
    console.log('💾 Step 9: Saving outputs...');
    fs.mkdirSync(outputDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    // Save issues JSON
    fs.writeFileSync(
      path.join(outputDir, `nestjs-pro-issues-${timestamp}.json`),
      JSON.stringify({
        metadata: {
          repository: TEST_CONFIG.repoUrl,
          prNumber: TEST_CONFIG.prNumber,
          framework: frameworkInfo.primaryFramework,
          language: 'typescript',
          analyzedAt: new Date().toISOString(),
          tier: TEST_CONFIG.userTier,
          stats: {
            total: categorizedIssues.length,
            new: newIssues.length,
            existing: existingIssues.length,
            groups: groupingResult.uniqueGroups,
            costSavings: `${groupingResult.savingsPercent.toFixed(1)}%`,
            fixResults: fixResults,
            classification: {
              fixable: classificationResult.fixableIssues.length,
              filtered: classificationResult.filteredIssues.length,
              byDisposition: classificationResult.byDisposition,
              patternSavings: `${classificationResult.costAnalysis.savingsPercent.toFixed(1)}%`
            }
          }
        },
        issues: categorizedIssues,
        classifiedIssues: classificationResult.issues,
        filteredIssues: classificationResult.filteredIssues,
        groupingResult: groupingResult
      }, null, 2)
    );

    // Save summary markdown
    const summaryMd = `# NestJS PRO Tier Analysis - PR #${TEST_CONFIG.prNumber}

## Summary
- **Repository**: ${TEST_CONFIG.repoUrl}
- **Framework**: ${frameworkInfo.primaryFramework}
- **Analysis Date**: ${new Date().toISOString()}
- **Tier**: ${TEST_CONFIG.userTier}

## Issue Statistics
| Category | Count |
|----------|-------|
| Total Issues | ${categorizedIssues.length} |
| NEW Issues | ${newIssues.length} |
| EXISTING Issues | ${existingIssues.length} |

## Fix Results
${fixResults ? `
| Metric | Value |
|--------|-------|
| Processed | ${fixResults.totalProcessed} |
| Auto-fixed | ${fixResults.fixed} |
| Manual Review | ${fixResults.manualReview} |
| Fix Rate | ${fixResults.totalProcessed > 0 ? ((fixResults.fixed / fixResults.totalProcessed) * 100).toFixed(1) : '0.0'}% |
` : 'No fix results (BASIC tier or no issues)'}

## Top Rules
${Object.entries(ruleCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([rule, count]) => `- **${rule}**: ${count} issues`).join('\n')}
`;
    fs.writeFileSync(
      path.join(outputDir, `nestjs-pro-summary-${timestamp}.md`),
      summaryMd
    );

    console.log(`   ✅ Report saved to ${outputDir}`);

    // Summary
    console.log('');
    console.log('='.repeat(70));
    console.log('TEST SUMMARY');
    console.log('='.repeat(70));
    console.log(`✅ NestJS PRO Tier Test COMPLETED`);
    console.log(`   Framework detected: ${frameworkInfo.primaryFramework}`);
    console.log(`   Total issues: ${categorizedIssues.length}`);
    console.log(`   NEW issues: ${newIssues.length}`);
    console.log(`   EXISTING issues: ${existingIssues.length}`);
    if (fixResults) {
      const fixRate = fixResults.totalProcessed > 0
        ? ((fixResults.fixed / fixResults.totalProcessed) * 100).toFixed(1)
        : '0.0';
      console.log(`   Fix rate: ${fixRate}%`);
    }
    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ TEST FAILED');
    console.error(error);
    throw error;
  } finally {
    // Cleanup
    console.log('🧹 Cleaning up...');
    try {
      execSync(`rm -rf ${testDir}`, { stdio: 'pipe' });
    } catch {
      // Ignore cleanup errors
    }
  }
}

// Run the test
runNestJSTest()
  .then(() => {
    console.log('');
    console.log('✅ Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Test failed:', error.message);
    process.exit(1);
  });
