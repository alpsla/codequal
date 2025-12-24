/**
 * TypeScript Pattern Calibration Script
 *
 * Runs the full fix flow on TypeScript repositories to populate Supabase with patterns:
 * SCAN -> GROUP -> CHECK PATTERNS -> FIXER TOOLS -> AI FALLBACK
 *
 * Key: Uses ScanFixExecutor with dryRun: false to store AI-generated patterns.
 *
 * Usage:
 *   TS_TEST_REPO=microsoft/TypeScript npx ts-node tests/integration/typescript/calibrate-typescript-patterns.ts
 */

import dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../../../.env') });
dotenv.config({ path: path.join(__dirname, '../../../../../.env') });

import { TypeScriptToolOrchestrator } from '../../../src/two-branch/tools/typescript';
import { ScanFixExecutor } from '../../../src/fix-agent/scan-fix-executor';
import { quickParallelFix } from '../../../src/fix-agent/parallel-ai-fixer';
import { execSync } from 'child_process';
import * as fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Default to a popular TypeScript project if no repo specified
const TEST_REPO = process.env.TS_TEST_REPO || 'microsoft/vscode';
const MAX_ISSUES_TO_PROCESS = parseInt(process.env.MAX_ISSUES || '50', 10);

interface PatternStats {
  total: number;
  byTool: Record<string, number>;
  tsRelated: number;
}

async function getPatternStats(): Promise<PatternStats> {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { count: total } = await supabase
    .from('fix_patterns')
    .select('*', { count: 'exact', head: true });

  const { data: patterns } = await supabase
    .from('fix_patterns')
    .select('tool, rule_id')
    .limit(1000);

  const tsTools = ['eslint', 'typescript', 'tsc', 'npm-audit', 'semgrep'];
  const byTool: Record<string, number> = {};
  let tsRelated = 0;

  for (const p of patterns || []) {
    byTool[p.tool] = (byTool[p.tool] || 0) + 1;
    if (tsTools.includes(p.tool) || p.rule_id?.includes('ts') || p.rule_id?.includes('typescript')) {
      tsRelated++;
    }
  }

  return {
    total: total || 0,
    byTool,
    tsRelated
  };
}

async function calibrateTypeScriptRepo(): Promise<void> {
  const startTime = Date.now();
  const repoUrl = `https://github.com/${TEST_REPO}`;
  const testDir = `/tmp/ts-calibrate-${Date.now()}`;
  const repoPath = `${testDir}/repo`;

  console.log(`
================================================================================
                      TYPESCRIPT PATTERN CALIBRATION
================================================================================
  Repository: ${TEST_REPO}
  Max Issues: ${MAX_ISSUES_TO_PROCESS}
  Mode: FULL FIX (AI fixer enabled, patterns saved to Supabase)
================================================================================
`);

  // Get pattern stats before
  const statsBefore = await getPatternStats();
  console.log('\n=== Pattern Stats BEFORE ===');
  console.log(`Total patterns: ${statsBefore.total}`);
  console.log(`TypeScript-related: ${statsBefore.tsRelated}`);
  console.log('By tool:', statsBefore.byTool);

  try {
    // Step 1: Clone repository
    console.log('\n=== Step 1: Clone Repository ===');
    fs.mkdirSync(testDir, { recursive: true });
    console.log(`Cloning ${repoUrl}...`);
    execSync(`git clone --depth 20 ${repoUrl} ${repoPath}`, {
      stdio: 'inherit',
      timeout: 120000
    });
    console.log('Clone complete.');

    // Step 2: Run TypeScript orchestrator
    console.log('\n=== Step 2: Run TypeScript Orchestrator ===');
    const orchestrator = new TypeScriptToolOrchestrator();
    const scanResult = await orchestrator.orchestrate(
      repoPath,
      'base',
      { analysisMode: 'standard', userTier: 'pro' }
    );

    console.log(`\nOrchestration complete:`);
    console.log(`  Duration: ${scanResult.duration}ms`);
    console.log(`  Tools run: ${scanResult.summary.toolsExecuted}`);
    console.log(`  Total issues: ${scanResult.summary.totalIssues}`);

    // Show issues by tool
    console.log('\nIssues by tool:');
    for (const result of scanResult.toolResults) {
      console.log(`  ${result.tool}: ${result.issues.length} issues`);
    }

    if (scanResult.summary.totalIssues === 0) {
      console.log('\nNo issues found - nothing to calibrate.');
      return;
    }

    // Step 3: Run ScanFixExecutor for pattern calibration
    console.log('\n=== Step 3: Run ScanFixExecutor (Pattern Calibration) ===');

    const allIssues = scanResult.toolResults.flatMap(r => r.issues);
    const issuesToProcess = allIssues.slice(0, MAX_ISSUES_TO_PROCESS);

    console.log(`Processing ${issuesToProcess.length} of ${allIssues.length} issues...`);

    // Convert to DetectedIssue format
    const detectedIssues = issuesToProcess.map((issue) => ({
      tool: issue.tool,
      rule: issue.rule,
      severity: issue.severity as any,
      message: issue.message,
      file: issue.file,
      line: issue.line,
      column: issue.column || 0,
      category: issue.category || 'code-quality'
    }));

    const executor = new ScanFixExecutor({
      workingDir: repoPath,
      language: 'typescript',
      outputMode: 'patch',
      dryRun: false,  // Save patterns to Supabase
      userTier: 'pro',
      autoApplyTiers: {
        tier1: true,
        tier2: true,
        tier3: true
      }
    });

    const fixResult = await executor.executeFixes(detectedIssues);

    console.log(`\nFix execution complete:`);
    console.log(`  Total processed: ${detectedIssues.length}`);
    console.log(`  Fixed: ${fixResult.summary.fixedIssues}`);
    console.log(`  Tier 1 (native): ${fixResult.summary.tier1Fixed}`);
    console.log(`  Tier 2 (fixer): ${fixResult.summary.tier2Fixed}`);
    let tier3Fixed = fixResult.summary.tier3Fixed;
    console.log(`  Tier 3 (AI): ${tier3Fixed}`);
    console.log(`  Skipped: ${fixResult.summary.skippedIssues}`);
    console.log(`  Failed: ${fixResult.summary.failedIssues}`);

    // AI Fallback for unfixed issues
    const unfixedCount = detectedIssues.length - fixResult.summary.fixedIssues;
    if (unfixedCount > 0) {
      console.log(`\n=== Step 4: AI Fallback for ${unfixedCount} unfixed issues ===`);

      const aiResult = await quickParallelFix(
        detectedIssues,
        repoPath,
        (msg) => console.log(`  ${msg}`)
      );

      console.log(`\n  AI Fallback Results:`);
      console.log(`  Patterns generated: ${aiResult.summary.fixedIssues}`);
      console.log(`  Failed: ${aiResult.summary.failedIssues}`);
      console.log(`  Skipped: ${aiResult.summary.skippedIssues}`);

      tier3Fixed += aiResult.summary.fixedIssues;
    }

    // Get pattern stats after
    const statsAfter = await getPatternStats();
    console.log('\n=== Pattern Stats AFTER ===');
    console.log(`Total patterns: ${statsAfter.total} (+${statsAfter.total - statsBefore.total})`);
    console.log(`TypeScript-related: ${statsAfter.tsRelated} (+${statsAfter.tsRelated - statsBefore.tsRelated})`);
    console.log('By tool:', statsAfter.byTool);

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n=== CALIBRATION COMPLETE ===`);
    console.log(`Total time: ${totalTime}s`);
    console.log(`New patterns added: ${statsAfter.total - statsBefore.total}`);

  } catch (error: any) {
    console.error('\nCalibration failed:', error.message);
    throw error;
  } finally {
    // Cleanup
    if (fs.existsSync(testDir)) {
      console.log('\nCleaning up...');
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  }
}

// Run if executed directly
calibrateTypeScriptRepo().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
