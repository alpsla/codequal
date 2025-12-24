/**
 * Go Pattern Calibration Script
 *
 * Runs the full fix flow on Go repositories to populate Supabase with patterns:
 * SCAN -> GROUP -> CHECK PATTERNS -> FIXER TOOLS -> AI FALLBACK
 *
 * Key: Uses ScanFixExecutor with dryRun: false to store AI-generated patterns.
 *
 * Usage:
 *   GO_TEST_REPO=gin-gonic/gin npx ts-node tests/integration/go/calibrate-go-patterns.ts
 */

import dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../../../.env') });
dotenv.config({ path: path.join(__dirname, '../../../../../.env') });

import { GoToolOrchestrator } from '../../../src/two-branch/tools/go';
import { ScanFixExecutor } from '../../../src/fix-agent/scan-fix-executor';
import { quickParallelFix } from '../../../src/fix-agent/parallel-ai-fixer';
import { execSync } from 'child_process';
import * as fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Default to gin if no repo specified
const TEST_REPO = process.env.GO_TEST_REPO || 'gin-gonic/gin';
const MAX_ISSUES_TO_PROCESS = parseInt(process.env.MAX_ISSUES || '50', 10);

interface PatternStats {
  total: number;
  byTool: Record<string, number>;
  goRelated: number;
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

  const goTools = ['golangci-lint', 'staticcheck', 'govulncheck', 'gosec', 'semgrep'];
  const byTool: Record<string, number> = {};
  let goRelated = 0;

  for (const p of patterns || []) {
    byTool[p.tool] = (byTool[p.tool] || 0) + 1;
    if (goTools.includes(p.tool) || p.rule_id?.includes('go') || p.rule_id?.includes('Go')) {
      goRelated++;
    }
  }

  return {
    total: total || 0,
    byTool,
    goRelated
  };
}

async function calibrateGoRepo(): Promise<void> {
  const startTime = Date.now();
  const repoUrl = `https://github.com/${TEST_REPO}`;
  const testDir = `/tmp/go-calibrate-${Date.now()}`;
  const repoPath = `${testDir}/repo`;

  console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                         GO PATTERN CALIBRATION                               ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Repository: ${TEST_REPO.padEnd(62)}║
║  Max Issues: ${MAX_ISSUES_TO_PROCESS.toString().padEnd(62)}║
║  Mode: FULL FIX (AI fixer enabled, patterns saved to Supabase)               ║
╚══════════════════════════════════════════════════════════════════════════════╝
`);

  // Get initial pattern stats
  console.log('\n📊 Initial Pattern Stats:');
  const initialStats = await getPatternStats();
  console.log(`   Total patterns: ${initialStats.total}`);
  console.log(`   Go-related patterns: ${initialStats.goRelated}`);
  console.log(`   By tool:`, initialStats.byTool);

  try {
    // Clone repo
    console.log('\n📦 Step 1: Cloning repository...');
    fs.mkdirSync(testDir, { recursive: true });
    execSync(`git clone --depth 20 ${repoUrl} ${repoPath}`, {
      stdio: 'pipe',
      encoding: 'utf-8'
    });
    console.log(`   ✅ Cloned to ${repoPath}`);

    // Run Go orchestrator
    console.log('\n🔍 Step 2: Running Go analysis...');
    const orchestrator = new GoToolOrchestrator();

    // Use 'base' branch for calibration (analyzing the default branch of the repo)
    const orchestrationResult = await orchestrator.orchestrate(repoPath, 'base', {
      analysisMode: 'standard',
      includeAllSeverities: true
    });

    console.log(`   ✅ Analysis complete`);
    console.log(`      Duration: ${orchestrationResult.duration}ms`);
    console.log(`      Total issues: ${orchestrationResult.summary?.totalIssues || 0}`);

    // Show issues by tool
    console.log('\n📋 Issues by tool:');
    for (const result of orchestrationResult.toolResults) {
      console.log(`   ${result.tool}: ${result.issues.length} issues`);
    }

    // Limit issues for processing
    const allIssues = orchestrationResult.toolResults.flatMap(r => r.issues);
    const issuesToProcess = allIssues.slice(0, MAX_ISSUES_TO_PROCESS);

    console.log(`\n🔧 Step 3: Processing ${issuesToProcess.length} issues for fixes...`);

    // Initialize ScanFixExecutor with current API
    // CRITICAL: userTier must be 'pro' for patterns to be saved to Supabase
    const fixExecutor = new ScanFixExecutor({
      workingDir: repoPath,
      language: 'go',
      outputMode: 'patch',  // Generate patches, don't modify files
      dryRun: false,        // Save patterns to Supabase
      userTier: 'pro',      // Required for pattern saving
      verbose: true,        // Enable verbose logging
      autoApplyTiers: {
        tier1: true,
        tier2: true,
        tier3: true         // Enable AI fixes for pattern generation
      },
      onProgress: (update) => {
        console.log(`   [${update.phase}] ${update.message}${update.tool ? ` (${update.tool})` : ''}`);
      }
    });

    // Convert RawIssue to DetectedIssue format expected by ScanFixExecutor
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

    // Debug: Log first few issues to see their structure
    console.log(`\n   📋 Sample issues (first 3):`);
    for (let i = 0; i < Math.min(3, detectedIssues.length); i++) {
      const issue = detectedIssues[i];
      console.log(`      [${i+1}] tool=${issue.tool}, rule=${issue.rule}, severity=${issue.severity}`);
      console.log(`          file=${issue.file}:${issue.line}`);
    }

    // Execute fixes in bulk
    console.log(`\n   Processing ${detectedIssues.length} issues in bulk...`);
    const fixResult = await fixExecutor.executeFixes(detectedIssues);

    // Extract statistics from result
    const fixedCount = fixResult.summary.fixedIssues;
    const tier1Fixed = fixResult.summary.tier1Fixed;
    const tier2Fixed = fixResult.summary.tier2Fixed;
    let tier3Fixed = fixResult.summary.tier3Fixed;

    console.log(`   ✅ Fixed: ${fixedCount} issues`);
    console.log(`   🔧 Tier 1 (native): ${tier1Fixed}`);
    console.log(`   🔨 Tier 2 (fixer): ${tier2Fixed}`);
    console.log(`   🤖 Tier 3 (AI): ${tier3Fixed}`);
    console.log(`   ⏭️  Skipped: ${fixResult.summary.skippedIssues}`);
    console.log(`   ❌ Failed: ${fixResult.summary.failedIssues}`);

    // Step 4: AI Fallback for unfixed issues (CALIBRATION SPECIFIC)
    // Uses parallel AI fixer to generate patterns for all issues
    const unfixedCount = detectedIssues.length - fixedCount;
    if (unfixedCount > 0) {
      console.log(`\n🤖 Step 4: AI Fallback for ${unfixedCount} unfixed issues...`);

      // Use parallel AI fixer for efficiency
      const aiResult = await quickParallelFix(
        detectedIssues,
        repoPath,
        (msg) => console.log(`   ${msg}`)
      );

      console.log(`\n   AI Fallback Results:`);
      console.log(`   ✅ Patterns generated: ${aiResult.summary.fixedIssues}`);
      console.log(`   ❌ Failed: ${aiResult.summary.failedIssues}`);
      console.log(`   ⏭️  Skipped: ${aiResult.summary.skippedIssues}`);

      // Update totals
      tier3Fixed += aiResult.summary.fixedIssues;
    }

    // Get final pattern stats
    console.log('\n📊 Final Pattern Stats:');
    const finalStats = await getPatternStats();
    console.log(`   Total patterns: ${finalStats.total} (${finalStats.total - initialStats.total > 0 ? '+' : ''}${finalStats.total - initialStats.total})`);
    console.log(`   Go-related patterns: ${finalStats.goRelated} (${finalStats.goRelated - initialStats.goRelated > 0 ? '+' : ''}${finalStats.goRelated - initialStats.goRelated})`);

    // Summary
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                          CALIBRATION COMPLETE                                ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Repository: ${TEST_REPO.padEnd(62)}║
║  Total time: ${(totalTime + 's').padEnd(62)}║
║  Issues processed: ${issuesToProcess.length.toString().padEnd(56)}║
║  Issues fixed: ${fixedCount.toString().padEnd(60)}║
║  Tier 1 (native fix): ${tier1Fixed.toString().padEnd(53)}║
║  Tier 2 (fixer tool): ${tier2Fixed.toString().padEnd(53)}║
║  Tier 3 (AI generated): ${tier3Fixed.toString().padEnd(51)}║
║  New patterns created: ${(finalStats.total - initialStats.total).toString().padEnd(52)}║
╚══════════════════════════════════════════════════════════════════════════════╝
`);

  } catch (error: any) {
    console.error(`\n❌ Calibration failed: ${error.message}`);
    console.error(error.stack);
    throw error;
  } finally {
    // Cleanup
    if (fs.existsSync(testDir)) {
      execSync(`rm -rf ${testDir}`);
    }
  }
}

// Main execution
calibrateGoRepo().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
